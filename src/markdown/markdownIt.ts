// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The markdown-it plugin of the built-in Markdown preview. A note is a
 * footnote of the Markdown text ([R-NOTE-001](../../docs/requirements.md#r-note-001)).
 * The preview never shows the text of a note, and shows no icon and no
 * callout of it (Hannes, 2026-10-28: "we completely drop the callouts on
 * hover view", "we completely drop the callout icons in the preview view");
 * the side view shows the notes ([R-PREV-001](../../docs/requirements.md#r-prev-001)).
 * The preview shows the highlight of each note, the text from its start
 * marker to its reference ([R-NOTE-006](../../docs/requirements.md#r-note-006)):
 * the start marker and the first reference of a note become two empty
 * elements at the start and the end of the highlight, which the script of the
 * preview ([media/markdownPreview.js](../../media/markdownPreview.js)) paints
 * in the color of the note, the color that the start marker names. The end of
 * a highlight holds the link to the extension, which selects the note in the
 * side view for a click on the highlight
 * ([R-PREV-003](../../docs/requirements.md#r-prev-003)).
 *
 * The page also holds the link of the button "Add Note" of the script, which
 * adds a note to the text that the user selects in the preview
 * ([R-PREV-008](../../docs/requirements.md#r-prev-008)): a hidden element at
 * the end of the page.
 *
 * The plugin adds the rules of the notes ([syntax.ts](../notes/syntax.ts)),
 * which take the notes before the rules of footnotes of other plugins, and a
 * core rule after the rules of markdown-it and of the other plugins. The core
 * rule takes the tokens of each note out of the tokens of the document, and
 * turns the first reference and the start marker of each note into the end and
 * the start of its highlight. A note at a point, whose start marker stands
 * directly before its reference, has no highlight and shows nothing. The notes
 * never show as footnotes, and every other footnote keeps the output of its
 * plugin ([R-PREV-004](../../docs/requirements.md#r-prev-004)).
 *
 * The preview parses a document once for each version and renders it again for
 * each change of a setting, without the document in the environment of the
 * parsing. So the core rule does the same for every document, and the render
 * rules read the setting `showHighlights`
 * ([R-PREV-005](../../docs/requirements.md#r-prev-005)), the selected note
 * and the links of the document from the environment of the rendering.
 */

import type MarkdownIt from 'markdown-it';
import type { StateCore, Token } from 'markdown-it';
import { colorIndexOf } from '../notes/colors';
import { textParents } from '../notes/notes';
import { addNoteRules, type InlineMeta, markerType, noteCloseType, type NoteMeta, noteOpenType, referenceText, referenceType } from '../notes/syntax';

/** noteClass is the start of the classes of the elements of the notes in the preview. */
export const noteClass = 'nimblescape-note';

/** edgeTokenType is the type of the inline token of the start or the end of a highlight: an empty element. */
const edgeTokenType = 'nimblescape_note_edge';

/** pageTokenType is the type of the block token at the end of the page that holds the link of "Add Note": a hidden element. */
const pageTokenType = 'nimblescape_note_page';

/** PreviewSettings are the settings of the extension that change the preview. */
export interface PreviewSettings {
  /**
   * showHighlights shows the highlights of the notes ([R-PREV-005](../../docs/requirements.md#r-prev-005)): while the
   * setting is on. Without it, only the highlight of the selected note shows, and the highlight under the pointer.
   */
  showHighlights: boolean;
}

/** PreviewOptions give the plugin the settings and the links of the document that the preview renders. */
export interface PreviewOptions {
  /**
   * settingsOf returns the settings for the environment of a rendering, which names its document.
   * @param env - The environment of the rendering.
   */
  settingsOf(env: unknown): PreviewSettings;
  /**
   * linkOf returns the link that selects a note of the rendered document in the side view, or undefined without a
   * document.
   * @param env - The environment of the rendering.
   * @param line - The index of the first line of the note in the document.
   */
  linkOf(env: unknown, line: number): string | undefined;
  /**
   * selectedOf returns the label of the selected note of the rendered document, whose highlight the preview shows with
   * a strong highlight and a frame, and the number of a request to scroll to it, or undefined without a document.
   * @param env - The environment of the rendering.
   */
  selectedOf?(env: unknown): { label: string | undefined; reveal: number | undefined } | undefined;
  /**
   * deselectLinkOf returns the link that deselects the selected note of the rendered document, for a click on the text
   * outside its highlight ([R-PREV-003](../../docs/requirements.md#r-prev-003)), or undefined without a document.
   * @param env - The environment of the rendering.
   */
  deselectLinkOf?(env: unknown): string | undefined;
  /**
   * sourceOf returns the text that the preview renders in place of a text, and the line in the text of each line of
   * that text, or undefined to render the text: the preview of the clean editing view renders the text of its file with
   * the notes, and its lines stay those of the view, for the scroll of the preview with the view
   * ([R-TEXT-009](../../docs/requirements.md#r-text-009)). The preview parses a text without its document, so the
   * text names the view.
   * @param text - The text that the preview parses.
   */
  sourceOf?(text: string): { text: string; lines: readonly number[] } | undefined;
  /**
   * addLinkOf returns the link that adds a note to the text that the user selects in the preview of the rendered
   * document ([R-PREV-008](../../docs/requirements.md#r-prev-008)), or undefined for a rendering that can have no
   * notes.
   * @param env - The environment of the rendering.
   */
  addLinkOf?(env: unknown): string | undefined;
}

/** PreviewNote is what the preview needs of a note: its label, its color, the ID of its highlight, and the line of its definition. */
interface PreviewNote {
  label: string;
  /** color is the name of the color of the note, or undefined for the default color. */
  color: string | undefined;
  /** id is the ID of the highlight, which its start and its end name. */
  id: string;
  /** line is the index of the first line of the definition in the document. */
  line: number;
  /** referenced tells whether the text holds a reference of the note before. */
  referenced: boolean;
}

/** EdgeMeta is the meta of the token of the start or the end of a highlight. */
interface EdgeMeta {
  note: PreviewNote;
  edge: 'start' | 'end';
}

/** counts holds the number of notes of each parsing, by its environment, for the IDs of the highlights. */
const counts = new WeakMap<object, number>();

/** noEnvironment stands for the environment of a parsing without one. */
const noEnvironment = {};

/**
 * nextId returns a new ID of a highlight of a parsing. The IDs count for each environment of a parsing, so each ID is
 * unique in the page.
 * @param env - The environment of the parsing.
 */
function nextId(env: unknown): string {
  const key = typeof env === 'object' && env !== null ? env : noEnvironment;
  const count = (counts.get(key) ?? 0) + 1;
  counts.set(key, count);
  return `${noteClass}-${count}`;
}

/**
 * highlightsInText turns the references of notes in the text of a block into the ends of their highlights, and their start
 * markers into the starts. The first reference of a note ends its highlight: from its start marker, or from the start of
 * the block without one. A start marker directly before the reference makes a point, without a highlight. Every further
 * reference of a note and every other start marker show nothing.
 * @param inline - The inline token of the block.
 * @param notes - The notes of the document, by their labels.
 */
function highlightsInText(inline: Token, notes: ReadonlyMap<string, PreviewNote>): void {
  const children = inline.children ?? [];
  const edges = new Set<Token>();
  children.forEach((child, index) => {
    const meta = child.meta as InlineMeta;
    const note = child.type === referenceType ? notes.get(meta.label) : undefined;
    if (!note || note.referenced) {
      return;
    }
    note.referenced = true;
    const marker = children.slice(0, index).find((candidate) => candidate.type === markerType && (candidate.meta as InlineMeta).label === meta.label);
    if (marker !== undefined && (marker.meta as InlineMeta).end === meta.start) {
      return;
    }
    if (marker) {
      // The start marker holds the color of the note.
      note.color = (marker.meta as InlineMeta).color;
      marker.type = edgeTokenType;
      marker.meta = { note, edge: 'start' } satisfies EdgeMeta;
      edges.add(marker);
    }
    child.type = edgeTokenType;
    child.meta = { note, edge: 'end' } satisfies EdgeMeta;
    edges.add(child);
  });
  // The other references and start markers show nothing.
  inline.children = children.filter((child) => (child.type !== markerType && child.type !== referenceType) || edges.has(child));
}

/**
 * transform is the core rule of the plugin: it takes the notes out of the tokens of a document, and turns their
 * references and start markers into the ends and the starts of their highlights.
 * @param state - The state of the core rule.
 */
function transform(state: StateCore): void {
  const notes = new Map<string, PreviewNote>();
  const output: Token[] = [];
  const tokens = state.tokens;
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type !== noteOpenType) {
      output.push(token);
      continue;
    }
    const meta = token.meta as NoteMeta;
    if (!meta.duplicate) {
      notes.set(meta.label, { label: meta.label, color: undefined, id: nextId(state.env), line: token.map?.[0] ?? 0, referenced: false });
    }
    // The tokens of the note leave the tokens of the document: the preview never shows the text of a note.
    while (index + 1 < tokens.length && !(tokens[index + 1].type === noteCloseType && tokens[index + 1].level === token.level)) {
      index++;
    }
    index++;
  }
  output.forEach((token, index) => {
    if (token.type === 'inline' && textParents.has(output[index - 1]?.type)) {
      highlightsInText(token, notes);
    }
  });
  state.tokens = output;
}

/**
 * edgeHtml returns the HTML of the start or the end of the highlight of a note: an empty element with the ID of the
 * highlight. The end holds the attributes that the script of the preview reads: `data-color` with the number of the color
 * of the note, `data-note` with its label, `data-href` with the link that selects it in the side view, `data-hidden`
 * while the setting showHighlights is off, and for the selected note `data-selected`, with a request to scroll to it
 * `data-reveal` with its number, and `data-deselect` with the link that deselects it.
 * @param md - The markdown-it instance.
 * @param meta - The note and the edge.
 * @param env - The environment of the rendering.
 * @param options - The settings and the links of the rendered document.
 */
function edgeHtml(md: MarkdownIt, { note, edge }: EdgeMeta, env: unknown, options: PreviewOptions): string {
  const start = `<span class="${noteClass}-edge" data-selection="${note.id}" data-edge="${edge}"`;
  if (edge === 'start') {
    return `${start}></span>`;
  }
  const escape = md.utils.escapeHtml;
  const link = options.linkOf(env, note.line);
  const selected = options.selectedOf?.(env);
  const deselect = options.deselectLinkOf?.(env);
  const chosen =
    selected?.label === note.label
      ? ` data-selected="true"${selected.reveal === undefined ? '' : ` data-reveal="${selected.reveal}"`}${deselect === undefined ? '' : ` data-deselect="${escape(deselect)}"`}`
      : '';
  const hidden = options.settingsOf(env).showHighlights ? '' : ' data-hidden="true"';
  return `${start} data-color="${colorIndexOf(note) + 1}" data-note="${escape(note.label)}"${link === undefined ? '' : ` data-href="${escape(link)}"`}${hidden}${chosen}></span>`;
}

/**
 * extendMarkdownIt adds the notes to a markdown-it instance of the Markdown preview.
 * @param md - The markdown-it instance.
 * @param options - The settings and the links of the rendered document.
 * @returns The same instance.
 */
export function extendMarkdownIt(md: MarkdownIt, options: PreviewOptions): MarkdownIt {
  addNoteRules(md);
  md.core.ruler.before('normalize', 'nimblescape_source', (state) => {
    const source = options.sourceOf?.(state.src);
    if (source) {
      state.src = source.text;
    }
    if (typeof state.env === 'object' && state.env !== null) {
      (state.env as { nimblescapeLines?: readonly number[] }).nimblescapeLines = source?.lines;
    }
  });
  md.core.ruler.push('nimblescape_notes', transform);
  if (options.addLinkOf) {
    md.core.ruler.push('nimblescape_page', (state) => {
      const page = new state.Token(pageTokenType, '', 0);
      page.block = true;
      state.tokens.push(page);
    });
  }
  // The lines of the tokens of the text of a file name the lines of its clean editing view, after the notes took theirs.
  md.core.ruler.push('nimblescape_lines', (state) => {
    const lines = (state.env as { nimblescapeLines?: readonly number[] }).nimblescapeLines;
    if (lines) {
      const lineOf = (line: number): number => lines[Math.min(line, lines.length - 1)] ?? line;
      for (const token of state.tokens) {
        if (token.map) {
          token.map = [lineOf(token.map[0]), Math.max(lineOf(token.map[0]), lineOf(token.map[1]))];
        }
      }
    }
  });
  md.renderer.rules[edgeTokenType] = (tokens, index, _options, env) => edgeHtml(md, tokens[index].meta as EdgeMeta, env, options);
  md.renderer.rules[pageTokenType] = (_tokens, _index, _options, env) => {
    const link = options.addLinkOf?.(env);
    return link === undefined ? '' : `<div class="${noteClass}-page" data-add="${md.utils.escapeHtml(link)}" hidden></div>\n`;
  };
  // A reference that the core rule did not reach, such as one in the body of a note that the side view renders, shows
  // as written, and a start marker nothing.
  md.renderer.rules[referenceType] = (tokens, index) => md.utils.escapeHtml(referenceText((tokens[index].meta as InlineMeta).label));
  md.renderer.rules[markerType] = () => '';
  md.renderer.rules[noteOpenType] = () => '';
  md.renderer.rules[noteCloseType] = () => '';
  return md;
}
