// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The plugin of Notes for the editor of rendered Markdown of nimblescape Markdown
 * ([the plugins of Notes](https://github.com/nimblescape/markdown/blob/main/docs/plugins.md#r-notes-001)), the editor of a
 * whole file ([R-TEXT-009](../../docs/requirements.md#r-text-009)). It reads the notes with the markdown-it rules of the
 * extension ([src/notes/syntax.ts](../notes/syntax.ts)) and shows the text without their markup, as the clean editing
 * view does:
 *
 * - The start marker and the reference of a note (or its end marker in the hidden form) are hidden nodes in the line of
 *   the text, which keep their text byte for byte. The text between them is the highlight of the note, in its color.
 * - The definition of a note and the comment of the format are hidden blocks, which keep their lines byte for byte. The
 *   side view of the extension shows and edits the notes.
 * - The guard keeps every note at its text: a deleted text never deletes a note, and a highlight whose whole text goes
 *   becomes a point. Text typed at the start or the end of a highlight stays outside of it; text that replaces the
 *   first or the last word of a highlight stays in it. A paragraph break inside a highlight ends the highlight before
 *   the break, and the definition of the note moves after the block of its reference; two joined paragraphs take the
 *   definitions of the first one after the joined block. Changes from outside, Undo and Redo pass the guard.
 *
 * In the renderer, for example in the pages, the notes are removed: their markup has no output.
 *
 * The module uses no API of VS Code, so that the editor on a web page can use it too.
 */

import { Extension, Node, type Editor } from '@tiptap/core';
import { joinBackward, joinForward } from '@tiptap/pm/commands';
import { isHistoryTransaction } from '@tiptap/pm/history';
import type { Node as PmNode, NodeType, ResolvedPos } from '@tiptap/pm/model';
import { EditorState, Plugin, PluginKey, Selection, TextSelection, type Transaction } from '@tiptap/pm/state';
import { Mapping } from '@tiptap/pm/transform';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type MarkdownIt from 'markdown-it';
import type { StateCore, Token } from 'markdown-it';
import { outsideChange, type MarkdownPlugin, type PluginEditor, type ThreadMarker } from '@nimblescape/markdowneditor';
import { colorIndexOf, colorNames, noteColors } from '../notes/colors';
import { findDoctype } from '../notes/doctype';
import {
  addNoteRules,
  displayDate,
  endMarkerText,
  hiddenClose,
  hiddenLines,
  hiddenOpen,
  type InlineMeta,
  markerText,
  markerType,
  newLabel,
  noteCloseType,
  noteLines,
  type NoteMeta,
  noteOpenType,
  readNote,
  referenceText,
  referenceType,
  type TodoState,
  unescapeHidden,
  usedLabels,
} from '../notes/syntax';

/** pluginName is the name of the plugin, the first part of the full names of its commands, for example `notes.select`. */
export const pluginName = 'notes';

/** definitionType is the type of the token of the whole definition of a note, which the plugin makes of its tokens. */
export const definitionType = 'nimblescape_note_definition';

/** formatType is the type of the token of the comment of the format at the top of a file with notes. */
export const formatType = 'nimblescape_notes_format';

/** The names of the nodes of the plugin. */
export const nodeNames = { marker: 'noteMarker', reference: 'noteReference', hidden: 'notesHidden' } as const;

/** notesWrite is the meta of a transaction in which the plugin writes notes itself, which the guard lets pass. */
export const notesWrite = 'nimblescapeNotesWrite';

/**
 * stripPrefix removes the prefix of the block quotes and list items around a definition from a line, as the first line
 * of the definition has it before its label, so that the text of the definition is the text of its lines inside them.
 * @param line - The line.
 * @param prefix - The prefix of the first line.
 */
function stripPrefix(line: string, prefix: string): string {
  if (prefix === '' || line.startsWith(prefix)) {
    return line.slice(prefix.length);
  }
  const bare = prefix.trimEnd();
  return line.startsWith(bare) ? line.slice(bare.length) : line;
}

/**
 * linesText returns the text of lines of the source of a parsing, without their prefix.
 * @param source - The source of the parsing.
 * @param map - The lines, from the first to the line after the last.
 * @param start - The text of the first line where the definition starts, for its prefix.
 */
function linesText(source: string, map: readonly [number, number], start: RegExp): string {
  const lines = source.split('\n').slice(map[0], map[1]);
  const prefix = lines.length > 0 ? lines[0].slice(0, Math.max(lines[0].search(start), 0)) : '';
  return lines.map((line) => stripPrefix(line, prefix)).join('\n');
}

/**
 * collapseRule is the core rule that makes one token of each definition of a note, with the text of its lines and the
 * meta of the note, so that the editor keeps the definition as one hidden block, and one token of the comment of the
 * format. It runs after the block rules, before the inline rules.
 * @param state - The state of the core rule.
 */
function collapseRule(state: StateCore): void {
  const tokens: Token[] = [];
  for (let index = 0; index < state.tokens.length; index++) {
    const token = state.tokens[index];
    if (token.type === noteOpenType && token.map) {
      let close = index + 1;
      while (close < state.tokens.length && !(state.tokens[close].type === noteCloseType && state.tokens[close].level === token.level)) {
        close++;
      }
      const meta = token.meta as NoteMeta;
      const definition = new state.Token(definitionType, '', 0);
      definition.block = true;
      definition.level = token.level;
      definition.map = token.map;
      definition.meta = meta;
      definition.content = linesText(state.src, token.map, meta.hidden ? /<!--/ : /\[\^/);
      tokens.push(definition);
      index = close;
      continue;
    }
    if (token.type === 'html_block' && token.level === 0 && findDoctype(token.content.split('\n'))?.start === 0) {
      const format = new state.Token(formatType, '', 0);
      format.block = true;
      format.map = token.map;
      format.content = token.content.replace(/\n$/, '');
      tokens.push(format);
      continue;
    }
    tokens.push(token);
  }
  state.tokens = tokens;
}

/**
 * extendMarkdownIt adds the rules of the notes to the markdown-it of the editor and of the renderer, and removes the
 * notes from the output of the renderer.
 * @param md - The markdown-it.
 */
export function extendMarkdownIt(md: MarkdownIt): MarkdownIt {
  addNoteRules(md);
  md.core.ruler.after('block', 'nimblescape_notes_collapse', collapseRule);
  for (const type of [markerType, referenceType, definitionType, formatType]) {
    md.renderer.rules[type] = () => '';
  }
  return md;
}

/** NoteMarker is the start marker of a note in the line of its text: hidden, with its text as the file has it. */
const NoteMarker = Node.create({
  name: nodeNames.marker,
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,
  addAttributes: () => ({
    label: { default: '', rendered: false },
    color: { default: null, rendered: false },
    text: { default: '', rendered: false },
  }),
  parseHTML: () => [],
  renderHTML: ({ node }) => ['span', { class: 'nsmd-note-marker', 'data-note': node.attrs.label as string }],
  renderText: () => '',
});

/** NoteReference is the reference of a note, or its end marker in the hidden form, in the line of its text: hidden. */
const NoteReference = Node.create({
  name: nodeNames.reference,
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,
  addAttributes: () => ({ label: { default: '', rendered: false }, hidden: { default: false, rendered: false } }),
  parseHTML: () => [],
  renderHTML: ({ node }) => ['span', { class: 'nsmd-note-reference', 'data-note': node.attrs.label as string }],
  renderText: () => '',
});

/** NotesHidden is the definition of a note or the comment of the format: a hidden block with its lines as the file has them. */
const NotesHidden = Node.create({
  name: nodeNames.hidden,
  group: 'block',
  atom: true,
  selectable: false,
  addAttributes: () => ({
    kind: { default: 'note', rendered: false },
    label: { default: '', rendered: false },
    text: { default: '', rendered: false },
  }),
  parseHTML: () => [],
  renderHTML: ({ node }) => ['div', { class: 'nsmd-notes-hidden', 'data-kind': node.attrs.kind as string, 'data-note': node.attrs.label as string }],
  renderText: () => '',
});

/** Part is a node of a note in a document, with its position. */
interface Part {
  readonly node: PmNode;
  readonly pos: number;
}

/** NoteParts are the nodes of the notes of a document, by the labels of the notes; the first node of each label counts. */
export interface NoteParts {
  readonly markers: Map<string, Part>;
  readonly references: Map<string, Part>;
  readonly definitions: Map<string, Part>;
  readonly formats: Part[];
}

/** partsCache holds the parts of each document, which are the same for the same document. */
const partsCache = new WeakMap<PmNode, NoteParts>();

/**
 * partsOf returns the nodes of the notes of a document.
 * @param doc - The document.
 */
export function partsOf(doc: PmNode): NoteParts {
  const cached = partsCache.get(doc);
  if (cached) {
    return cached;
  }
  const parts: NoteParts = { markers: new Map(), references: new Map(), definitions: new Map(), formats: [] };
  doc.descendants((node, pos) => {
    const label = node.attrs.label as string;
    const add = (map: Map<string, Part>) => {
      if (!map.has(label)) {
        map.set(label, { node, pos });
      }
    };
    if (node.type.name === nodeNames.marker) {
      add(parts.markers);
    } else if (node.type.name === nodeNames.reference) {
      add(parts.references);
    } else if (node.type.name === nodeNames.hidden) {
      if (node.attrs.kind === 'format') {
        parts.formats.push({ node, pos });
      } else {
        add(parts.definitions);
      }
    }
    return !node.isTextblock || node.childCount > 0;
  });
  partsCache.set(doc, parts);
  return parts;
}

/** NoteRange is the highlight of a note: the positions of its start marker and its reference. */
export interface NoteRange {
  readonly label: string;
  /** marker is the position of the start marker; the highlight starts after it. */
  readonly marker: number;
  /** reference is the position of the reference; the highlight ends before it. */
  readonly reference: number;
  /** color is the index of the color of the note in noteColors. */
  readonly color: number;
}

/**
 * noteRanges returns the highlights of the notes of a document, in the order of their start markers.
 * @param doc - The document.
 */
export function noteRanges(doc: PmNode): NoteRange[] {
  const { markers, references } = partsOf(doc);
  const ranges: NoteRange[] = [];
  for (const [label, marker] of markers) {
    const reference = references.get(label);
    if (reference && reference.pos > marker.pos) {
      ranges.push({ label, marker: marker.pos, reference: reference.pos, color: colorIndexOf({ color: (marker.node.attrs.color as string | null) ?? undefined }) });
    }
  }
  return ranges.sort((a, b) => a.marker - b.marker);
}

/**
 * noteAt returns the label of the innermost note whose highlight holds a position, or undefined.
 * @param doc - The document.
 * @param pos - The position.
 */
export function noteAt(doc: PmNode, pos: number): string | undefined {
  let found: NoteRange | undefined;
  for (const range of noteRanges(doc)) {
    if (range.marker < pos && pos <= range.reference && (!found || range.marker >= found.marker)) {
      found = range;
    }
  }
  return found?.label;
}

/** HighlightState is the state of the highlights: whether they show, the selected note, and the decorations. */
interface HighlightState {
  readonly show: boolean;
  readonly selected: string | undefined;
  readonly decorations: DecorationSet;
}

/** highlightKey is the key of the plugin of the highlights. Its meta `{ show }` or `{ selected }` changes them. */
export const highlightKey = new PluginKey<HighlightState>('nimblescapeNotesHighlights');

/**
 * decorationsOf returns the highlights of the notes of a document: in their colors, the selected note strong and the
 * other notes faint, and a point for a highlight without text. While the highlights are hidden, only the selected note
 * shows.
 * @param doc - The document.
 * @param show - Whether the highlights show.
 * @param selected - The label of the selected note.
 */
function decorationsOf(doc: PmNode, show: boolean, selected: string | undefined): DecorationSet {
  const decorations: Decoration[] = [];
  for (const range of noteRanges(doc)) {
    const look = selected === undefined ? 'shown' : selected === range.label ? 'strong' : 'faint';
    if (!show && look !== 'strong') {
      continue;
    }
    const attrs = { class: `nsmd-note nsmd-note-${range.color} nsmd-note-${look}`, 'data-note': range.label };
    if (range.marker + 1 < range.reference) {
      decorations.push(Decoration.inline(range.marker + 1, range.reference, attrs));
    } else {
      decorations.push(
        Decoration.widget(
          range.marker + 1,
          () => {
            const point = document.createElement('span');
            point.className = `nsmd-note-point nsmd-note-${range.color} nsmd-note-${look}`;
            point.dataset.note = range.label;
            return point;
          },
          { key: `${range.label}-${look}`, side: -1 },
        ),
      );
    }
  }
  return DecorationSet.create(doc, decorations);
}

/** Highlights shows the highlights of the notes. */
const Highlights = Extension.create({
  name: 'notesHighlights',
  addProseMirrorPlugins: () => [
    new Plugin<HighlightState>({
      key: highlightKey,
      state: {
        init: (_config, state) => ({ show: true, selected: undefined, decorations: decorationsOf(state.doc, true, undefined) }),
        apply: (tr, value, _old, state) => {
          const meta = tr.getMeta(highlightKey) as { show?: boolean; selected?: string } | undefined;
          if (!tr.docChanged && !meta) {
            return value;
          }
          const show = meta?.show ?? value.show;
          const selected = meta && 'selected' in meta ? meta.selected : value.selected;
          return { show, selected, decorations: decorationsOf(state.doc, show, selected) };
        },
      },
      props: { decorations: (state) => highlightKey.getState(state)?.decorations },
    }),
  ],
});

/**
 * insideKey is the key of the place where typed text stays in a highlight, although it stands at its end: the end of a
 * text that replaced the last word of the highlight, while the user types there.
 */
const insideKey = new PluginKey<number | undefined>('nimblescapeNotesInside');

/**
 * isUserEdit returns true for a transaction of the user that changes the document: no change from outside, no Undo or
 * Redo, and no write of the plugin.
 * @param tr - The transaction.
 */
const isUserEdit = (tr: Transaction): boolean => tr.docChanged && tr.getMeta(outsideChange) !== true && !isHistoryTransaction(tr) && tr.getMeta(notesWrite) !== true;

/**
 * inlinePosition returns a position near a position where a node of the line can stand, or undefined.
 * @param tr - The transaction.
 * @param pos - The position.
 * @param type - The type of the node.
 */
function inlinePosition(tr: Transaction, pos: number, type: NodeType): number | undefined {
  const fits = (at: number) => {
    const $at = tr.doc.resolve(at);
    return $at.parent.inlineContent && $at.parent.canReplaceWith($at.index(), $at.index(), type);
  };
  const clamped = Math.max(0, Math.min(pos, tr.doc.content.size));
  if (fits(clamped)) {
    return clamped;
  }
  const near = Selection.near(tr.doc.resolve(clamped), -1);
  return near instanceof TextSelection && fits(near.from) ? near.from : undefined;
}

/**
 * blockAfter returns the position after the top-level block that holds a position, after the hidden blocks that follow
 * it, where a definition goes.
 * @param doc - The document.
 * @param pos - The position.
 */
function blockAfter(doc: PmNode, pos: number): number {
  const $pos = doc.resolve(Math.max(0, Math.min(pos, doc.content.size)));
  if ($pos.depth === 0) {
    return $pos.pos;
  }
  let after = $pos.after(1);
  for (let index = $pos.index(0) + 1; index < doc.childCount && doc.child(index).type.name === nodeNames.hidden; index++) {
    after += doc.child(index).nodeSize;
  }
  return after;
}

/**
 * topIndex returns the index of the top-level block that holds a position.
 * @param doc - The document.
 * @param pos - The position.
 */
const topIndex = (doc: PmNode, pos: number): number => doc.resolve(pos).index(0);

/**
 * follows returns true when a definition stands after the top-level block of a position, with only hidden blocks
 * between them.
 * @param doc - The document.
 * @param definition - The position of the definition.
 * @param pos - The position, for example of the reference of the note.
 */
function follows(doc: PmNode, definition: number, pos: number): boolean {
  const own = topIndex(doc, definition);
  const block = topIndex(doc, pos);
  if (own <= block) {
    return false;
  }
  for (let index = block + 1; index < own; index++) {
    if (doc.child(index).type.name !== nodeNames.hidden) {
      return false;
    }
  }
  return true;
}

/**
 * onlyMarkersAfter returns true when only start markers follow a position in its textblock.
 * @param $pos - The resolved position of a start marker.
 */
function onlyMarkersAfter($pos: ResolvedPos): boolean {
  for (let index = $pos.index() + 1; index < $pos.parent.childCount; index++) {
    if ($pos.parent.child(index).type.name !== nodeNames.marker) {
      return false;
    }
  }
  return true;
}

/**
 * guardedEdit returns the transaction that keeps the notes after the edits of the user, or null when every note stays
 * as it is. It puts back each start marker and reference that an edit deleted, at the place of the deleted text, and
 * each definition after the block of its reference. A highlight that a paragraph break split ends before the break, and
 * its definition moves after the block of its reference.
 * @param transactions - The transactions of the edit.
 * @param before - The state before them.
 * @param after - The state after them.
 */
export function guardedEdit(transactions: readonly Transaction[], before: EditorState, after: EditorState): Transaction | null {
  if (!transactions.some((tr) => tr.docChanged) || !transactions.every((tr) => !tr.docChanged || isUserEdit(tr))) {
    return null;
  }
  const old = partsOf(before.doc);
  const now = partsOf(after.doc);
  const mapping = new Mapping();
  transactions.forEach((tr) => mapping.appendMapping(tr.mapping));
  const tr = after.tr;
  let changed = false;

  // The start markers go to the start of the deleted text, and the references to its end, so that a text that replaces
  // the first or the last word of a highlight stays in it.
  for (const [label, part] of old.markers) {
    if (!now.markers.has(label)) {
      const at = inlinePosition(tr, tr.mapping.map(mapping.map(part.pos, -1), -1), part.node.type);
      if (at !== undefined) {
        tr.insert(at, part.node.type.create(part.node.attrs));
        changed = true;
      }
    }
  }
  let inside = false;
  for (const [label, part] of old.references) {
    if (!now.references.has(label)) {
      const at = inlinePosition(tr, tr.mapping.map(mapping.map(part.pos + 1, 1), 1), part.node.type);
      if (at !== undefined) {
        tr.insert(at, part.node.type.create(part.node.attrs));
        changed = true;
        inside ||= after.selection.empty && at === tr.mapping.map(after.selection.head, -1);
      }
    }
  }

  // A paragraph break inside a highlight ends the highlight before the break. A break directly after the start marker
  // is a break before the highlight, so the start marker moves after the break.
  const moved = new Set<string>();
  for (const label of partsOf(tr.doc).markers.keys()) {
    const parts = partsOf(tr.doc);
    const marker = parts.markers.get(label)!;
    const reference = parts.references.get(label);
    const oldMarker = old.markers.get(label);
    const oldReference = old.references.get(label);
    if (!reference || !oldMarker || !oldReference || reference.pos < marker.pos) {
      continue;
    }
    const $marker = tr.doc.resolve(marker.pos);
    const $reference = tr.doc.resolve(reference.pos);
    const wasOneBlock = before.doc.resolve(oldMarker.pos).parent === before.doc.resolve(oldReference.pos).parent;
    if (!wasOneBlock || $marker.parent === $reference.parent) {
      continue;
    }
    if (onlyMarkersAfter($marker)) {
      tr.delete(marker.pos, marker.pos + 1);
      // The reference stands after the start marker, so it moved back by the size of the marker.
      tr.insert(tr.doc.resolve(reference.pos - 1).start(), marker.node.type.create(marker.node.attrs));
    } else {
      tr.delete(reference.pos, reference.pos + 1);
      tr.insert($marker.end(), reference.node.type.create(reference.node.attrs));
      moved.add(label);
    }
    changed = true;
  }

  // Each definition that an edit deleted, and each definition of a split highlight, goes after the block of its
  // reference.
  for (const [label, part] of old.definitions) {
    const lost = !now.definitions.has(label);
    if (!lost && !moved.has(label)) {
      continue;
    }
    const parts = partsOf(tr.doc);
    const existing = parts.definitions.get(label);
    const anchor = parts.references.get(label) ?? parts.markers.get(label);
    if (existing && anchor && follows(tr.doc, existing.pos, anchor.pos)) {
      continue;
    }
    const node = existing?.node ?? part.node;
    if (existing) {
      tr.delete(existing.pos, existing.pos + existing.node.nodeSize);
    }
    const placed = partsOf(tr.doc);
    const target = placed.references.get(label) ?? placed.markers.get(label);
    tr.insert(blockAfter(tr.doc, target ? target.pos : tr.mapping.map(mapping.map(part.pos, -1), -1)), node.type.create(node.attrs));
    changed = true;
  }
  if (old.formats.length > 0 && now.formats.length === 0) {
    const first = tr.doc.firstChild?.type.name === 'frontMatter' ? tr.doc.firstChild.nodeSize : 0;
    old.formats.forEach((part) => tr.insert(first, part.node.type.create(part.node.attrs)));
    changed = true;
  }
  if (!changed) {
    return null;
  }
  // A start marker or a reference that goes back at the cursor stands after it, so that text typed after a replaced
  // last word stays in the highlight.
  if (after.selection.empty) {
    tr.setSelection(TextSelection.create(tr.doc, tr.mapping.map(after.selection.head, -1)));
  }
  if (inside) {
    tr.setMeta(insideKey, { at: tr.selection.head });
  }
  return tr.setMeta(notesWrite, true);
}

/**
 * joinOverHidden returns the command that joins a textblock with the textblock before it (backward) or after it
 * (forward) over the hidden blocks between them, the definitions of the notes of the first one, which then follow the
 * joined block. Without hidden blocks between them, or when the other block is no textblock, the command does nothing.
 * @param direction - -1 for Backspace at the start of a textblock, 1 for Delete at its end.
 */
function joinOverHidden(direction: -1 | 1) {
  return ({ editor }: { editor: Editor }): boolean => {
    const { state, view } = editor;
    const { $from, empty } = state.selection;
    if (!empty || !$from.parent.isTextblock || $from.depth < 1) {
      return false;
    }
    if (direction < 0 ? $from.parentOffset !== 0 : $from.parentOffset !== $from.parent.content.size) {
      return false;
    }
    const depth = $from.depth - 1;
    const container = $from.node(depth);
    const index = $from.index(depth);
    let other = index + direction;
    let size = 0;
    while (other >= 0 && other < container.childCount && container.child(other).type.name === nodeNames.hidden) {
      size += container.child(other).nodeSize;
      other += direction;
    }
    if (size === 0 || other < 0 || other >= container.childCount || !container.child(other).isTextblock) {
      return false;
    }
    const from = direction < 0 ? $from.before() - size : $from.after();
    const hidden = state.doc.slice(from, from + size).content;
    const tr = state.tr.delete(from, from + size);
    tr.setSelection(TextSelection.create(tr.doc, tr.mapping.map(state.selection.from)));
    let joined: Transaction | undefined;
    const plain = EditorState.create({ schema: state.schema, doc: tr.doc, selection: tr.selection });
    if (!(direction < 0 ? joinBackward : joinForward)(plain, (join) => (joined = join)) || !joined) {
      return false;
    }
    joined.steps.forEach((step) => tr.step(step));
    const cursor = joined.selection.from;
    const $cursor = tr.doc.resolve(cursor);
    tr.insert($cursor.after(), hidden);
    tr.setSelection(TextSelection.create(tr.doc, cursor)).setMeta(notesWrite, true).scrollIntoView();
    view.dispatch(tr);
    return true;
  };
}

/** isInlineMarkup returns true for a start marker or a reference of a note. */
const isInlineMarkup = (node: PmNode | null | undefined): boolean => node?.type.name === nodeNames.marker || node?.type.name === nodeNames.reference;

/**
 * jumpOverMarkup returns the command that moves the cursor over the start markers and references next to it, before
 * Backspace (backward) or Delete (forward) deletes a character, so that the key deletes the character beyond them and no
 * hidden markup. The command moves the cursor and leaves the key to the next command.
 * @param direction - -1 for Backspace, 1 for Delete.
 */
function jumpOverMarkup(direction: -1 | 1) {
  return ({ editor }: { editor: Editor }): boolean => {
    const { state, view } = editor;
    const { empty, from } = state.selection;
    const next = (pos: number) => (direction < 0 ? state.doc.resolve(pos).nodeBefore : state.doc.resolve(pos).nodeAfter);
    if (!empty || !isInlineMarkup(next(from))) {
      return false;
    }
    let at = from;
    while (isInlineMarkup(next(at))) {
      at += direction;
    }
    view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, at)));
    return false;
  };
}

/**
 * edgeInsert returns the position where typed text goes so that text typed at the start or the end of a highlight stays
 * outside of it: before the start markers before the cursor, or after the references after it. It returns undefined
 * when the text stays at the cursor.
 * @param doc - The document.
 * @param pos - The position of the cursor.
 */
export function edgeInsert(doc: PmNode, pos: number): number | undefined {
  const $pos = doc.resolve(pos);
  let at = pos;
  if ($pos.nodeBefore?.type.name === nodeNames.marker) {
    while (doc.resolve(at).nodeBefore?.type.name === nodeNames.marker) {
      at--;
    }
    return at;
  }
  if ($pos.nodeAfter?.type.name === nodeNames.reference) {
    while (doc.resolve(at).nodeAfter?.type.name === nodeNames.reference) {
      at++;
    }
    return at;
  }
  return undefined;
}

/** Guard keeps every note at its text while the user edits (see the comment of the module). */
const Guard = Extension.create({
  name: 'notesGuard',
  priority: 1000,
  addKeyboardShortcuts: () => ({
    Backspace: (props) => joinOverHidden(-1)(props) || jumpOverMarkup(-1)(props),
    Delete: (props) => joinOverHidden(1)(props) || jumpOverMarkup(1)(props),
  }),
  addProseMirrorPlugins: () => [
    new Plugin<number | undefined>({
      key: insideKey,
      state: {
        init: (): number | undefined => undefined,
        apply: (tr, value: number | undefined): number | undefined => {
          const meta = tr.getMeta(insideKey) as { at: number | undefined } | undefined;
          if (meta) {
            return meta.at;
          }
          if (value === undefined || !tr.selection.empty) {
            return undefined;
          }
          // The place stays while the user types there: it moves with the typed text and goes with a move of the cursor.
          const mapped = tr.mapping.map(value, 1);
          return tr.selection.head === mapped ? mapped : undefined;
        },
      },
      appendTransaction: (transactions, before, after) => guardedEdit(transactions, before, after),
      props: {
        handleTextInput: (view, from, to, text) => {
          const { state } = view;
          if (from !== to) {
            // Text that replaces the last word of a highlight stays in it, also the letters typed after it.
            const tr = state.tr.insertText(text, from, to);
            const cursor = tr.mapping.map(to);
            const atEnd = tr.doc.resolve(cursor).nodeAfter?.type.name === nodeNames.reference;
            view.dispatch(tr.setMeta(insideKey, { at: atEnd ? cursor : undefined }).scrollIntoView());
            return true;
          }
          const at = insideKey.getState(state) === from ? undefined : edgeInsert(state.doc, from);
          if (at === undefined) {
            return false;
          }
          const tr = state.tr.insertText(text, at);
          view.dispatch(tr.setSelection(TextSelection.create(tr.doc, at + text.length)).scrollIntoView());
          return true;
        },
      },
    }),
  ],
});

/**
 * definitionLines returns the lines of the definition of a note in the visible form, from the text of its hidden block.
 * @param text - The text of the block.
 */
export function definitionLines(text: string): string[] {
  const lines = text.split('\n');
  return lines[0]?.trimEnd() === hiddenOpen && lines.at(-1)?.trimEnd() === hiddenClose ? lines.slice(1, -1).map(unescapeHidden) : lines;
}

/** AddNote are the fields of a new note of the command `notes.addNote`. */
export interface AddNote {
  /** label is the label of the note; the default is a new random label. */
  readonly label?: string;
  /** color is the name of its color; the default is the first color. */
  readonly color?: string;
  readonly author: string;
  /** date is the date of its header, for example `2026-10-28 10:15+01:00`. */
  readonly date: string;
  readonly body?: string;
  readonly todo?: TodoState;
  /** hidden writes the note in the hidden form. */
  readonly hidden?: boolean;
}

/**
 * addNote adds a note to the selected text of the editor: the start marker before it, the reference after it, and the
 * definition after the top-level block of the reference. The selected text must be in one textblock.
 * @param editor - The editor.
 * @param fields - The fields of the note.
 * @returns The label of the note, or undefined when the selection cannot have a note.
 */
export function addNote(editor: PluginEditor, fields: AddNote): string | undefined {
  const { state, view } = editor.tiptap;
  const { from, to, $from, $to } = state.selection;
  const schema = state.schema;
  if (from === to || $from.parent !== $to.parent || !$from.parent.inlineContent || $from.parent.type.spec.code) {
    return undefined;
  }
  const label = fields.label ?? newLabel(usedLabels(editor.getMarkdown().split('\n')));
  const color = fields.color && (colorNames as readonly string[]).includes(fields.color) ? fields.color : undefined;
  const hidden = Boolean(fields.hidden);
  const lines = noteLines(label, [{ author: fields.author, date: fields.date, body: fields.body ?? '', ...(fields.todo ? { todo: fields.todo } : {}) }]);
  const tr = state.tr;
  tr.insert(to, schema.nodes[nodeNames.reference].create({ label, hidden }));
  tr.insert(from, schema.nodes[nodeNames.marker].create({ label, color: color ?? null, text: markerText(label, color) }));
  const definition = schema.nodes[nodeNames.hidden].create({ kind: 'note', label, text: (hidden ? hiddenLines(lines) : lines).join('\n') });
  tr.insert(blockAfter(tr.doc, tr.mapping.map(to, 1)), definition);
  view.dispatch(tr.setMeta(notesWrite, true).setMeta(highlightKey, { selected: label }));
  return label;
}

/**
 * threadsOf returns the threads of the notes of a document for the icons beside the text
 * ([threads beside the text](https://github.com/nimblescape/markdown/blob/main/docs/editor.md#r-gen-014)), with the
 * number of answers.
 * @param doc - The document.
 */
function threadsOf(doc: PmNode): ThreadMarker[] {
  const { definitions } = partsOf(doc);
  return noteRanges(doc).map((range) => {
    const note = readNote(definitionLines((definitions.get(range.label)?.node.attrs.text as string | undefined) ?? ''));
    const author = note?.answers[0]?.author;
    return { id: range.label, from: range.marker, to: range.reference + 1, kind: 'note', count: note?.answers.length ?? 0, label: author ? `Note of ${author}` : 'Note' };
  });
}

/**
 * openThread shows the answers of a note in the panel beside the text, on a web page: the author, the date and the
 * text of each answer.
 * @param thread - The thread.
 * @param panel - The panel.
 * @param editor - The editor.
 */
function openThread(thread: ThreadMarker, panel: HTMLElement, editor: PluginEditor): void {
  const definition = partsOf(editor.tiptap.state.doc).definitions.get(thread.id);
  const note = readNote(definitionLines((definition?.node.attrs.text as string | undefined) ?? ''));
  const list = document.createElement('div');
  list.className = 'nsmd-note-thread';
  for (const answer of note?.answers ?? []) {
    const item = document.createElement('div');
    item.className = 'nsmd-note-answer';
    item.style.setProperty('--nsmd-note-depth', String(answer.depth));
    const header = document.createElement('div');
    header.className = 'nsmd-note-answer-header';
    header.textContent = `${answer.author} · ${displayDate(answer.date)}${answer.todo ? ` · ${answer.todo}` : ''}`;
    const body = document.createElement('div');
    body.className = 'nsmd-note-answer-body';
    body.textContent = answer.body;
    item.append(header, body);
    list.append(item);
  }
  panel.append(list);
}

/** dimAlpha is the alpha of the line under a faint highlight, as in the text editor of the extension. */
const dimAlpha = '66';

/** styles are the styles of the plugin: hidden markup, and the highlights in the styles of the text editor. */
export const styles = [
  '.nsmd-notes-hidden { display: none; }',
  ...noteColors.flatMap((color, index) => [
    `.nsmd-note-${index}.nsmd-note-shown { background-color: ${color}47; text-decoration: underline 2px ${color}; text-underline-offset: 3px; }`,
    `.nsmd-note-${index}.nsmd-note-faint { background-color: ${color}1f; text-decoration: underline 1px ${color}${dimAlpha}; text-underline-offset: 3px; }`,
    `.nsmd-note-${index}.nsmd-note-strong { background-color: ${color}73; outline: 1px solid ${color}; border-radius: 3px; }`,
    `.nsmd-note-point.nsmd-note-${index} { border-left: 2px solid ${color}; }`,
  ]),
  '.nsmd-note-point { display: inline-block; height: 1em; vertical-align: text-bottom; margin: 0 1px; }',
  '.nsmd-note-answer { margin-left: calc(var(--nsmd-note-depth, 0) * 12px); padding: 4px 0; }',
  '.nsmd-note-answer-header { font-weight: 600; }',
  '.nsmd-note-answer-body { white-space: pre-wrap; }',
].join('\n');

/**
 * selectNote selects a note: its highlight shows strong and the other highlights faint; without a label, no note is
 * selected.
 * @param editor - The editor.
 * @param label - The label of the note, or undefined.
 */
export function selectNote(editor: PluginEditor, label: string | undefined): void {
  const { view } = editor.tiptap;
  view.dispatch(view.state.tr.setMeta(highlightKey, { selected: label }));
}

/**
 * showHighlights shows or hides the highlights of the notes; the highlight of the selected note always shows.
 * @param editor - The editor.
 * @param show - Whether the highlights show.
 */
export function showHighlights(editor: PluginEditor, show: boolean): void {
  const { view } = editor.tiptap;
  view.dispatch(view.state.tr.setMeta(highlightKey, { show }));
}

/**
 * notesPlugin is the plugin of Notes for the editor. Its commands are `notes.select` with the label of a note or
 * nothing, `notes.showHighlights` with true or false, and `notes.addNote` with the fields of a new note (AddNote).
 */
export const notesPlugin: MarkdownPlugin = {
  name: pluginName,
  apiVersion: 1,
  extendMarkdownIt,
  styles,
  nodes: [NoteMarker, NoteReference, NotesHidden, Highlights, Guard],
  fromMarkdown: {
    [markerType]: {
      node: nodeNames.marker,
      getAttrs: (token) => {
        const meta = token.meta as InlineMeta;
        return { label: meta.label, color: meta.color ?? null, text: token.content };
      },
    },
    [referenceType]: {
      node: nodeNames.reference,
      getAttrs: (token) => {
        const meta = token.meta as InlineMeta;
        return { label: meta.label, hidden: Boolean(meta.hidden) };
      },
    },
    [definitionType]: { node: nodeNames.hidden, getAttrs: (token) => ({ kind: 'note', label: (token.meta as NoteMeta).label, text: token.content }) },
    [formatType]: { node: nodeNames.hidden, getAttrs: (token) => ({ kind: 'format', label: '', text: token.content }) },
  },
  toMarkdown: {
    nodes: {
      [nodeNames.marker]: (state, node) => {
        state.text((node.attrs.text as string) || markerText(node.attrs.label as string, (node.attrs.color as string | null) ?? undefined), false);
      },
      [nodeNames.reference]: (state, node) => {
        const label = node.attrs.label as string;
        state.text(node.attrs.hidden ? endMarkerText(label) : referenceText(label), false);
      },
      [nodeNames.hidden]: (state, node) => {
        state.text(node.attrs.text as string, false);
        state.closeBlock(node);
      },
    },
  },
  commands: {
    select: (editor, label) => {
      selectNote(editor, typeof label === 'string' ? label : undefined);
      return true;
    },
    showHighlights: (editor, show) => {
      showHighlights(editor, show !== false);
      return true;
    },
    addNote: (editor, fields) => addNote(editor, fields as AddNote) !== undefined,
  },
  threads: { find: threadsOf, open: openThread },
};
