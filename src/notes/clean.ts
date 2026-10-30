// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The clean text of a Markdown file with notes, for the clean editing view
 * ([R-TEXT-009](../../docs/requirements.md#r-text-009)). Hannes, 2026-10-29: "all notes markup must not
 * have effects on the editing, the editor must behave as if there was no notes
 * markup at all in the document". VS Code counts every character of a line
 * for the line breaks and the cursor, also a hidden one, so the text editor
 * edits a text without the markup: without the start markers, the references,
 * the definitions of the notes, the comment of the format, the anchors of the
 * figures and tables ([R-XREF-001](../../docs/requirements.md#r-xref-001)), the
 * markers of the values of the front matter
 * ([R-XREF-004](../../docs/requirements.md#r-xref-004)), and the blocks
 * that other extensions hide through the API of the extension
 * ([R-GEN-012](../../docs/requirements.md#r-gen-012)), such as the database of
 * the sources of nimblescape Markdown Paper at the end of a file. While the side
 * view shows the standard footnotes, the definitions of those that have a
 * reference are left out too, as the definitions of the notes (Hannes,
 * 2026-10-29: "the definition can even be hidden, same as for the note, it
 * does not make sense to show it"); their references stay. This module
 * makes that text from the text of the file, and turns each edit of the clean
 * text into an edit of the file that keeps every note at its text. The module
 * uses no API of VS Code.
 *
 * An edit keeps every hidden part of the file: deleted text never deletes a
 * note, and a note goes away only with its button in the side view. Text typed
 * at the edge of a highlight stays outside the highlight. Each edit of the
 * file is checked: the clean text of the new file must be the clean text with
 * the edit, so that the two texts never drift apart.
 */

import { findDoctype, frontMatterEnd } from './doctype';
import { findFields } from './fields';
import { anchorsOf } from './figures';
import { firstReferences, readFootnotes } from './footnotes';
import { type Note, type Range, read, readNotes } from './notes';

/**
 * HiddenKind is the kind of a hidden part of the file: the start marker and the reference of a note, the anchor of a
 * figure, a table or a section, and the start and the end marker of a value of the front matter are in a line of text;
 * the definition of a note, the definition of a standard footnote, the comment of the format and a block of another
 * extension are whole lines.
 */
export type HiddenKind = 'marker' | 'reference' | 'anchor' | 'fieldStart' | 'fieldEnd' | 'definition' | 'footnote' | 'doctype' | 'block';

/** Block is a block of whole lines of a file that another extension hides, from its first to its last line. */
export interface Block {
  first: number;
  last: number;
}

/**
 * BlockFinder returns the blocks of the lines of a file that the clean text leaves out for other extensions: blocks
 * that belong at the end of the file, such as a database of sources.
 */
export type BlockFinder = (lines: readonly string[]) => readonly Block[];

/**
 * Options are the choices of a projection: whether, and which, definitions of standard footnotes it leaves out, and the
 * blocks of other extensions.
 */
export interface Options {
  /** footnotes leaves out the definitions of the standard footnotes that have a reference, which the side view shows. */
  footnotes?: boolean;
  /**
   * only leaves out only the definitions of the standard footnotes of these labels: an edit of the clean text hides no
   * definition that the clean text shows, for example one that the user types there.
   */
  only?: readonly string[];
  /** blocks finds the blocks that other extensions hide. */
  blocks?: BlockFinder;
}

/** Hidden is a part of the file that the clean text leaves out, from its start to its end, as offsets in the file. */
export interface Hidden {
  kind: HiddenKind;
  start: number;
  end: number;
}

/** Highlight is the highlight of a note in the clean text, from its start to its end, as offsets in the clean text. */
export interface Highlight {
  label: string;
  color?: string;
  start: number;
  end: number;
}

/** Projection is the text of a file, its clean text and the hidden parts between them. */
export interface Projection {
  /** text is the text of the file. */
  text: string;
  /** clean is the text without the hidden parts. */
  clean: string;
  /** hidden are the hidden parts, in the order of the file; parts that overlap are one part. */
  hidden: Hidden[];
  /** at is the offset of each hidden part in the clean text, by its index. */
  at: number[];
  /** highlights are the highlights of the notes in the clean text. */
  highlights: Highlight[];
  /** options are the options of the projection. */
  options: Options;
  /** footnotes are the labels of the standard footnotes whose definitions the clean text leaves out. */
  footnotes: string[];
}

/**
 * editOptions returns the options of the projection of a file after an edit of its clean text: the edit hides no
 * definition of a standard footnote that the clean text shows.
 * @param projection - The projection of the file before the edit.
 */
export const editOptions = ({ options, footnotes }: Projection): Options => ({
  ...(options.footnotes ? { footnotes: true, only: footnotes } : {}),
  ...(options.blocks ? { blocks: options.blocks } : {}),
});

/**
 * lineStarts returns the offset of the first character of each line of a text.
 * @param text - The text.
 */
const lineStarts = (text: string): number[] => {
  const starts = [0];
  for (let index = text.indexOf('\n'); index >= 0; index = text.indexOf('\n', index + 1)) {
    starts.push(index + 1);
  }
  return starts;
};

/**
 * mergedKind returns the kind of two hidden parts that overlap and so become one: the comment of the format, else a
 * block of another extension, else the definitions of standard footnotes when both are such, else definitions.
 * @param a - The kind of the first part.
 * @param b - The kind of the second part.
 */
const mergedKind = (a: HiddenKind, b: HiddenKind): HiddenKind =>
  a === 'doctype' || b === 'doctype' ? 'doctype' : a === 'block' || b === 'block' ? 'block' : a === 'footnote' && b === 'footnote' ? 'footnote' : 'definition';

/**
 * blocksOf returns the blocks of the lines of a file that other extensions hide, in the order of the file: only blocks
 * of whole lines inside the file, and none of an extension whose finder fails.
 * @param lines - The lines of the file.
 * @param finder - Finds the blocks.
 */
const blocksOf = (lines: readonly string[], finder: BlockFinder | undefined): Block[] => {
  let found: readonly Block[] = [];
  try {
    found = finder?.(lines) ?? [];
  } catch {
    found = [];
  }
  return found
    .filter(({ first, last }) => Number.isInteger(first) && Number.isInteger(last) && 0 <= first && first <= last && last < lines.length)
    .map(({ first, last }) => ({ first, last }))
    .sort((a, b) => a.first - b.first);
};

/**
 * project returns the clean text of the text of a file: without the start markers, the references and the definitions
 * of its notes, without the comment of the format, the anchors of the figures and tables, and the blocks of other
 * extensions; with the option
 * `footnotes`, also without the definitions of the standard footnotes that have a reference. A definition goes with one blank line after it, so that the blocks
 * around it keep one blank line between them; at the end of the file it goes with the blank lines before it. Only a
 * note or a footnote with a reference is hidden: the other parts of the form of a note, and a definition without a
 * reference, stay in the text, where the user sees them.
 * @param text - The text of the file.
 * @param options - The options of the projection.
 */
export function project(text: string, options: Options = {}): Projection {
  const lines = text.split('\n');
  const starts = lineStarts(text);
  const offset = (position: { line: number; character: number }): number => starts[position.line] + position.character;
  const lineEnd = (line: number): number => starts[line] + lines[line].length;
  const reading = readNotes(lines);
  const notes = reading.notes.filter((note): note is Note & { reference: Range } => note.reference !== undefined && !note.duplicate);
  const doctype = findDoctype(lines);
  const blocks = blocksOf(lines, options.blocks);
  const footnotes = options.footnotes
    ? readFootnotes(lines, reading.blocks.length > 0 ? reading : undefined).filter((footnote) => footnote.references.length > 0 && (!options.only || options.only.includes(footnote.label)))
    : [];
  /** wholes are the lines of the definitions, of the comment of the format and of the blocks, which the clean text leaves out. */
  const wholes = [
    ...notes.map((note) => [note.start.line, note.end.line]),
    ...footnotes.map(({ definition }) => [definition.first, definition.last]),
    ...(doctype ? [[doctype.start, doctype.end]] : []),
    ...blocks.map(({ first, last }) => [first, last]),
  ];
  /** blank tells whether a line is blank or left out, so that definitions that follow each other go as one. */
  const blank = (line: number): boolean => lines[line].trim() === '' || wholes.some(([first, last]) => first <= line && line <= last);
  /** block returns the hidden part of whole lines, from the first to the last line. */
  const block = (kind: HiddenKind, first: number, last: number): Hidden => {
    let next = last + 1;
    while (next < lines.length && blank(next)) {
      next++;
    }
    if (next < lines.length) {
      // A block follows: the lines go with one blank line after them.
      return { kind, start: starts[first], end: starts[lines[last + 1].trim() === '' ? last + 2 : last + 1] };
    }
    let previous = first - 1;
    while (previous >= 0 && blank(previous)) {
      previous--;
    }
    // At the end of the file: the lines go with the line break and the blank lines before them.
    return previous >= 0 ? { kind, start: lineEnd(previous), end: lineEnd(last) } : { kind, start: 0, end: next < lines.length ? starts[last + 1] : lineEnd(last) };
  };
  const parts: Hidden[] = [];
  const highlights: { label: string; color?: string; start: number; end: number }[] = [];
  for (const note of notes) {
    if (note.marker) {
      parts.push({ kind: 'marker', start: offset(note.marker.start), end: offset(note.marker.end) });
    }
    parts.push({ kind: 'reference', start: offset(note.reference.start), end: offset(note.reference.end) });
    parts.push(block('definition', note.start.line, note.end.line));
    if (note.selection) {
      highlights.push({ label: note.label, color: note.color, start: offset(note.selection.start), end: offset(note.selection.end) });
    }
  }
  for (const { definition } of footnotes) {
    parts.push(block('footnote', definition.first, definition.last));
  }
  for (const anchor of anchorsOf(lines)) {
    parts.push({ kind: 'anchor', start: starts[anchor.line] + anchor.start, end: starts[anchor.line] + anchor.end });
  }
  for (const field of findFields(lines)) {
    parts.push({ kind: 'fieldStart', start: starts[field.line] + field.start, end: starts[field.line] + field.valueStart });
    parts.push({ kind: 'fieldEnd', start: starts[field.line] + field.valueEnd, end: starts[field.line] + field.end });
  }
  if (doctype) {
    parts.push(block('doctype', doctype.start, doctype.end));
  }
  for (const { first, last } of blocks) {
    parts.push(block('block', first, last));
  }
  parts.sort((a, b) => a.start - b.start || a.end - b.end);
  const hidden: Hidden[] = [];
  for (const part of parts) {
    const last = hidden.at(-1);
    if (last && part.start < last.end) {
      last.end = Math.max(last.end, part.end);
      last.kind = mergedKind(last.kind, part.kind);
    } else {
      hidden.push({ ...part });
    }
  }
  const at: number[] = [];
  let clean = '';
  let from = 0;
  for (const part of hidden) {
    clean += text.slice(from, part.start);
    at.push(clean.length);
    from = part.end;
  }
  clean += text.slice(from);
  const projection: Projection = { text, clean, hidden, at, highlights: [], options, footnotes: footnotes.map((footnote) => footnote.label) };
  projection.highlights = highlights.map((highlight) => ({ ...highlight, start: toClean(projection, highlight.start), end: toClean(projection, highlight.end) }));
  return projection;
}

/**
 * toClean returns the offset in the clean text of an offset in the file; an offset in a hidden part is the place of
 * the part.
 * @param projection - The projection of the file.
 * @param offset - The offset in the file.
 */
export function toClean(projection: Projection, offset: number): number {
  let removed = 0;
  for (const part of projection.hidden) {
    if (part.end <= offset) {
      removed += part.end - part.start;
    } else if (part.start < offset) {
      return part.start - removed;
    } else {
      break;
    }
  }
  return offset - removed;
}

/**
 * cleanLines returns the line in the clean text of each line of the file: the line of the place of its start. A line
 * of a definition goes to the line where the definition stood.
 * @param projection - The projection of the file.
 */
export function cleanLines(projection: Projection): number[] {
  const breaks = lineStarts(projection.clean);
  return lineStarts(projection.text).map((start) => {
    const offset = toClean(projection, start);
    let low = 0;
    let high = breaks.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (breaks[middle] <= offset) {
        low = middle;
      } else {
        high = middle - 1;
      }
    }
    return low;
  });
}

/**
 * runAt returns the indexes of the hidden parts at an offset of the clean text, which follow each other directly in the
 * file.
 * @param projection - The projection of the file.
 * @param offset - The offset in the clean text.
 */
const runAt = (projection: Projection, offset: number): number[] => projection.at.flatMap((at, index) => (at === offset ? [index] : []));

/**
 * beforeRun returns the offset in the file of an offset of the clean text, before the hidden parts there.
 * @param projection - The projection of the file.
 * @param offset - The offset in the clean text.
 */
const beforeRun = (projection: Projection, offset: number): number => {
  let removed = 0;
  projection.hidden.forEach((part, index) => {
    if (projection.at[index] < offset) {
      removed += part.end - part.start;
    }
  });
  return offset + removed;
};

/**
 * afterRun returns the offset in the file of an offset of the clean text, after the hidden parts there.
 * @param projection - The projection of the file.
 * @param offset - The offset in the clean text.
 */
const afterRun = (projection: Projection, offset: number): number =>
  runAt(projection, offset).reduce((end, index) => end + projection.hidden[index].end - projection.hidden[index].start, beforeRun(projection, offset));

/** Result is the new text of a file for an edit of its clean text, and how the edit found it. */
export interface Result {
  text: string;
  /**
   * way is `direct` when the hidden parts stay where they are, `rebuilt` when the file was written anew from the clean
   * text with the edit, with each note at its text and its definition after the block of its reference, and `none` when
   * no way keeps the clean text, for example after an edit that opens a code block or a comment before the notes: then
   * the caller takes the new file and writes its clean text anew.
   */
  way: 'direct' | 'rebuilt' | 'none';
}

/**
 * applyClean returns the new text of a file for an edit of its clean text: the text from `start` to `end` of the clean
 * text becomes `insert`. The visible characters of that part go, and the hidden parts in it stay. Typed text goes
 * before the first start marker, anchor or start marker of a value of the front matter there, so that it stays out of a
 * highlight or a value that starts there and of one that ends
 * there; the new text of a replacement goes after the hidden parts at its start and before the hidden parts at its
 * end, so that it stays in a highlight whose text it replaces. New text goes before the blocks of other extensions,
 * which belong at the end of the file. Typed text that continues the text of a highlight at
 * its end (`continues`) goes before the hidden parts there, so that it stays in the highlight: VS Code types over a
 * selection as a replacement with the first letter and an insertion of each next letter. When that place changes the
 * clean text otherwise, for example in the text of a definition at the end of the
 * file, the next places in both directions are tried. When no place keeps the clean text, because a definition would
 * stand in a line of text or a paragraph break would split a highlight, the file is written anew from the clean text
 * with the edit ([rebuild](#rebuild)).
 * @param projection - The projection of the file.
 * @param start - The offset of the start of the edit in the clean text.
 * @param end - The offset of the end of the edit in the clean text.
 * @param insert - The new text.
 * @param continues - Whether the edit continues text that the edit before typed at the end of a highlight.
 */
export function applyClean(projection: Projection, start: number, end: number, insert: string, continues = false): Result {
  const { text, hidden } = projection;
  const expected = projection.clean.slice(0, start) + insert + projection.clean.slice(end);
  const kept = projection.at.flatMap((at, index) => (at >= start && at <= end ? [hidden[index]] : []));
  const prefix = text.slice(0, beforeRun(projection, start));
  const suffix = text.slice(afterRun(projection, end));
  const pieces = kept.map((part) => text.slice(part.start, part.end));
  const firstMarker = kept.findIndex((part) => part.kind === 'marker' || part.kind === 'anchor' || part.kind === 'fieldStart');
  const firstBlock = kept.findIndex((part) => part.kind === 'block');
  // A replacement takes the place of the old text: after the parts at its start and before the parts at its end.
  const natural = end > start ? projection.at.filter((at) => at === start).length : continues ? 0 : firstMarker < 0 ? kept.length : firstMarker;
  // New text stays before the blocks of other extensions, which belong at the end of the file.
  const preferred = firstBlock < 0 ? natural : Math.min(natural, firstBlock);
  const places = [...Array(kept.length + 1).keys()].sort((a, b) => Math.abs(a - preferred) - Math.abs(b - preferred) || a - b);
  const options = editOptions(projection);
  for (const place of places) {
    const candidate = prefix + pieces.slice(0, place).join('') + insert + pieces.slice(place).join('') + suffix;
    if (project(candidate, options).clean === expected) {
      return { text: candidate, way: 'direct' };
    }
  }
  const rebuilt = rebuild(projection, start, end, insert);
  if (rebuilt !== undefined && project(rebuilt, options).clean === expected) {
    return { text: rebuilt, way: 'rebuilt' };
  }
  return { text: prefix + pieces.slice(0, preferred).join('') + insert + pieces.slice(preferred).join('') + suffix, way: 'none' };
}

/**
 * moved returns the offset in the clean text with an edit of an offset of a start marker or a reference before it. The
 * typed text of an insertion at the edge of a highlight stays outside of it; a replacement inside a highlight, also of
 * its last word, stays in it.
 * @param offset - The offset in the clean text before the edit.
 * @param kind - The kind of the part at the offset.
 * @param start - The start of the edit.
 * @param end - The end of the edit.
 * @param length - The length of the new text.
 */
const moved = (offset: number, kind: 'marker' | 'reference', start: number, end: number, length: number): number => {
  // A reference at the start of the edit stays before the new text, and so does a start marker there for a replacement.
  if (offset < start || (offset === start && (kind === 'reference' || end > start))) {
    return offset;
  }
  if (offset > end) {
    return offset + length - (end - start);
  }
  // In the edit: a start marker goes after the new text, a reference after it when the edit ends at the reference.
  return kind === 'marker' || (offset === end && end > start) ? start + length : start;
};

/**
 * rebuild returns the text of a file written anew from its clean text with an edit: the start marker and the reference
 * of each note at their places in the new clean text, a highlight that a paragraph break splits ending before the
 * break, and the definitions of the notes after the outermost block of their references, in the order of the
 * references, and then the hidden definitions of the standard footnotes after the outermost block of their first
 * references; the anchors of the figures and tables stay at their text; the comment of the format stays at its place
 * at the top, and the blocks of other extensions go to the end of the file, in their order. A highlight whose text the edit replaces
 * becomes the new text; one whose text the edit deletes becomes a point, which the checks report.
 * @param projection - The projection of the file.
 * @param start - The offset of the start of the edit in the clean text.
 * @param end - The offset of the end of the edit in the clean text.
 * @param insert - The new text.
 */
export function rebuild(projection: Projection, start: number, end: number, insert: string): string | undefined {
  const lines = projection.text.split('\n');
  const starts = lineStarts(projection.text);
  const offset = (position: { line: number; character: number }): number => starts[position.line] + position.character;
  const clean = projection.clean.slice(0, start) + insert + projection.clean.slice(end);
  // At one place: the references of other notes, the start marker and the reference of a point, then the start markers.
  const inline: { at: number; order: number; text: string }[] = [];
  const definitions = new Map<string, string>();
  for (const note of readNotes(lines).notes) {
    if (!note.reference || note.duplicate) {
      continue;
    }
    const reference = toClean(projection, offset(note.reference.start));
    const marker = note.marker ? toClean(projection, offset(note.marker.start)) : undefined;
    let close = moved(reference, 'reference', start, end, insert.length);
    let open = marker === undefined ? undefined : moved(marker, 'marker', start, end, insert.length);
    if (open !== undefined && open >= close) {
      // The edit took the whole text of the highlight: the new text becomes the highlight, or it is a point.
      open = start;
      close = marker! >= start && reference <= end ? start + insert.length : start;
    }
    // A highlight ends before a paragraph break in it, because its start marker and its reference share one block.
    const split = open === undefined ? null : /\n[ \t]*\n/.exec(clean.slice(open, close));
    if (open !== undefined && split) {
      close = open + split.index;
    }
    const point = open === close;
    inline.push({ at: close, order: point ? 2 : 0, text: projection.text.slice(offset(note.reference.start), offset(note.reference.end)) });
    if (open !== undefined) {
      inline.push({ at: open, order: point ? 1 : 3, text: projection.text.slice(offset(note.marker!.start), offset(note.marker!.end)) });
    }
    definitions.set(note.label, lines.slice(note.start.line, note.end.line + 1).join('\n'));
  }
  for (const anchor of anchorsOf(lines)) {
    // An anchor stays after the references and the start markers at its place.
    const at = moved(toClean(projection, starts[anchor.line] + anchor.start), 'reference', start, end, insert.length);
    inline.push({ at, order: 4, text: lines[anchor.line].slice(anchor.start, anchor.end) });
  }
  for (const field of findFields(lines)) {
    // The markers of a value move as the start marker and the reference of a note; an empty value keeps its order.
    const open = moved(toClean(projection, starts[field.line] + field.start), 'marker', start, end, insert.length);
    const close = Math.max(open, moved(toClean(projection, starts[field.line] + field.valueEnd), 'reference', start, end, insert.length));
    const empty = open === close;
    inline.push({ at: open, order: empty ? 1 : 3, text: lines[field.line].slice(field.start, field.valueStart) });
    inline.push({ at: close, order: empty ? 2 : 0, text: lines[field.line].slice(field.valueEnd, field.end) });
  }
  const footnotes = new Map<string, string>();
  if (projection.footnotes.length > 0) {
    for (const footnote of readFootnotes(lines)) {
      if (projection.footnotes.includes(footnote.label)) {
        footnotes.set(footnote.label, lines.slice(footnote.definition.first, footnote.definition.last + 1).join('\n'));
      }
    }
  }
  // From the end of the text: a part written at the place of another one stands before it.
  inline.sort((a, b) => b.at - a.at || b.order - a.order);
  let text = clean;
  for (const part of inline) {
    text = text.slice(0, part.at) + part.text + text.slice(part.at);
  }
  const doctype = findDoctype(lines);
  const output = text.split('\n');
  // The definitions after the outermost block of their references, from the last block to the first.
  const reading = read(output);
  const groups = new Map<number, string[]>();
  const references = [
    ...reading.references.map((reference) => ({ reference, definitions })),
    ...firstReferences(output, reading).map((reference) => ({ reference, definitions: footnotes })),
  ];
  for (const { reference, definitions: from } of references) {
    const definition = from.get(reference.label);
    const block = reading.blocks.find((candidate) => candidate.first <= reference.start.line && reference.start.line <= candidate.last);
    if (definition === undefined || !block) {
      continue;
    }
    from.delete(reference.label);
    // The map of a list can hold the blank lines after it.
    let line = block.outerEnd;
    while (line - 1 > block.last && output[line - 1].trim() === '') {
      line--;
    }
    groups.set(line, [...(groups.get(line) ?? []), definition]);
  }
  if (definitions.size > 0 || footnotes.size > 0) {
    return undefined;
  }
  // Each definition with a blank line after it, which the clean text leaves out with it: after the blank line that ends
  // the block, or directly after the block when the next block follows without one, as a definition can follow a
  // paragraph.
  for (const [line, group] of [...groups].sort((a, b) => b[0] - a[0])) {
    const block = group.flatMap((definition) => [definition, '']);
    if (line >= output.length) {
      output.push('', ...block.slice(0, -1));
    } else {
      output.splice(output[line].trim() === '' ? line + 1 : line, 0, ...block);
    }
  }
  const blocks = blocksOf(lines, projection.options.blocks);
  if (blocks.length > 0) {
    // The blocks go to the end of the file, before the blank lines there, each with a blank line before it.
    let end = output.length;
    while (end > 0 && output[end - 1].trim() === '') {
      end--;
    }
    output.splice(end, 0, ...blocks.flatMap(({ first, last }, index) => [...(end > 0 || index > 0 ? [''] : []), ...lines.slice(first, last + 1)]));
  }
  if (doctype) {
    output.splice(frontMatterEnd(output), 0, ...lines.slice(doctype.start, doctype.end + 1), '');
  }
  return output.join('\n');
}

/**
 * endsHighlight returns whether a highlight with text ends at an offset of the clean text.
 * @param projection - The projection of the file.
 * @param offset - The offset in the clean text.
 */
export const endsHighlight = (projection: Projection, offset: number): boolean =>
  projection.highlights.some((highlight) => highlight.end === offset && highlight.start < offset);

/**
 * labelsOf returns the labels of the notes of a text that have a reference.
 * @param text - The text of a file.
 */
export const labelsOf = (text: string): string[] =>
  readNotes(text.split('\n'))
    .notes.filter((note) => note.reference && !note.duplicate)
    .map((note) => note.label)
    .sort();
