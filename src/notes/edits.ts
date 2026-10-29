// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The changes of the Markdown text when an answer is saved, added or deleted,
 * when a note is added or deleted, when it gets a color, and when the text
 * view of the side view saves its whole text
 * ([R-EDIT-002](../../docs/requirements.md#r-edit-002) to
 * [R-EDIT-005](../../docs/requirements.md#r-edit-005)). Each function returns
 * one edit of the lines of the text, or the problem that prevents it. The
 * module uses no API of VS Code.
 *
 * A change of a note writes the lines of its definition anew, in the form of
 * [syntax.ts](syntax.ts). It is written only when markdown-it reads the
 * changed text as the same note with the expected answers. So a text that
 * would start another answer or end the note early never reaches the file.
 */

import { colorNames } from './colors';
import { doctypeEdit, type Version } from './doctype';
import { before, findNotes, type Note, type Position, type Range, read, type Reading, same, type TextBlock } from './notes';
import { type AnswerText, type Header, markerText, newLabel, noteLines, referenceText, usedLabels } from './syntax';

/** Edit replaces the text between two positions of the lines of a text. Its text has `\n` as line breaks. */
export interface Edit {
  start: Position;
  end: Position;
  text: string;
}

/**
 * Problem is the reason why a change cannot be written: `empty` for an answer without a text, `structure` for a text
 * that markdown-it would not read back as the same note, `place` for a new note outside the text of a paragraph, a
 * heading, a list or a table, `signIn` for a new note or answer without a GitHub sign-in
 * ([R-GEN-006](../../docs/requirements.md#r-gen-006)), `missing` for a note that the document no longer holds, and
 * `noText` for a new note without highlighted text, `format` for a document whose comment of the format names a newer version than the extension knows
 * ([R-NOTE-007](../../docs/requirements.md#r-note-007)), and `text` for a text of the text view that is not the
 * definition of the same note.
 */
export type Problem =
  | { kind: 'empty' }
  | { kind: 'structure' }
  | { kind: 'text'; label: string }
  | { kind: 'place' }
  | { kind: 'noText' }
  | { kind: 'signIn' }
  | { kind: 'missing' }
  | { kind: 'changed' }
  | { kind: 'format'; format: Version };

/** Result is an edit, or the problem that prevents it. */
export type Result = { edit: Edit } | { problem: Problem };

/** Fields are the author and the date of a new answer ([R-NOTE-002](../../docs/requirements.md#r-note-002)). */
export type Fields = Header;

/**
 * withPrefix puts the prefix of a note before each further line of its definition, so that the definition stays in
 * its block quote or list item. An empty line gets the prefix without its trailing spaces.
 * @param text - The lines of the definition.
 * @param prefix - The prefix of the further lines.
 */
export const withPrefix = (text: readonly string[], prefix: string): string[] =>
  text.map((line, index) => (index === 0 ? line : line === '' ? prefix.trimEnd() : prefix + line));

/**
 * applyEdit returns the lines of a text after an edit.
 * @param lines - The lines of the text.
 * @param edit - The edit.
 */
export function applyEdit(lines: readonly string[], edit: Edit): string[] {
  const head = lines[edit.start.line].slice(0, edit.start.character);
  const tail = lines[edit.end.line].slice(edit.end.character);
  return [...lines.slice(0, edit.start.line), ...`${head}${edit.text}${tail}`.split('\n'), ...lines.slice(edit.end.line + 1)];
}

/** Edits are the edits of one change of a text, which refer to its lines before the change and do not overlap. */
export interface Edits {
  edits: Edit[];
  /**
   * shift returns the place of a position of the text after the edit of the extension once the comment of the format
   * is written too, for a position after the comment.
   */
  shift: (position: Position) => Position;
}

/**
 * withDoctype returns the edit of a change of the extension together with the change of the comment that marks a
 * text with notes ([R-NOTE-007](../../docs/requirements.md#r-note-007)): the comment at the top of a text that has
 * notes after the change, written anew when it differs, and removed from a text without notes. Both edits refer to
 * the lines before the change, as VS Code applies the edits of one workspace edit; edits that would overlap become one.
 * @param lines - The lines of the text.
 * @param edit - The edit of the change.
 */
export function withDoctype(lines: readonly string[], edit: Edit): Edits {
  const top = doctypeEdit(lines, findNotes(applyEdit(lines, edit)).length > 0);
  if (!top) {
    return { edits: [edit], shift: (position) => position };
  }
  const shift = (position: Position): Position => (before(position, top.end) ? position : { line: position.line + top.lines, character: position.character });
  const change: Edit = { start: top.start, end: top.end, text: top.text };
  if (same(top.start, top.end) && same(top.start, edit.start)) {
    return { edits: [{ start: edit.start, end: edit.end, text: top.text + edit.text }], shift };
  }
  const [first, second] = before(edit.start, top.start) ? [edit, change] : [change, edit];
  if (before(second.start, first.end)) {
    // The edits would overlap: one edit writes the text after both.
    return { edits: [editBetween(lines, applyEdit(applyEdit(lines, second), first))], shift };
  }
  return { edits: [first, second], shift };
}

/**
 * editBetween returns one edit that turns the lines of a text into other lines: it replaces the lines between the
 * lines that both texts share at their start and at their end.
 * @param old - The lines of the text.
 * @param next - The lines of the changed text.
 */
export function editBetween(old: readonly string[], next: readonly string[]): Edit {
  let first = 0;
  while (first < old.length && first < next.length && old[first] === next[first]) {
    first++;
  }
  let oldEnd = old.length;
  let nextEnd = next.length;
  while (oldEnd > first && nextEnd > first && old[oldEnd - 1] === next[nextEnd - 1]) {
    oldEnd--;
    nextEnd--;
  }
  const text = next.slice(first, nextEnd).join('\n');
  if (oldEnd > first && nextEnd > first) {
    return { start: { line: first, character: 0 }, end: { line: oldEnd - 1, character: old[oldEnd - 1].length }, text };
  }
  if (oldEnd > first) {
    // Only lines go: with their line breaks, or with the line break before them at the end of the text.
    return oldEnd < old.length
      ? { start: { line: first, character: 0 }, end: { line: oldEnd, character: 0 }, text: '' }
      : { start: { line: first - 1, character: old[first - 1].length }, end: { line: oldEnd - 1, character: old[oldEnd - 1].length }, text: '' };
  }
  if (nextEnd === first) {
    // The texts are the same.
    return { start: { line: 0, character: 0 }, end: { line: 0, character: 0 }, text: '' };
  }
  return first < old.length
    ? { start: { line: first, character: 0 }, end: { line: first, character: 0 }, text: `${text}\n` }
    : { start: { line: first - 1, character: old[first - 1].length }, end: { line: first - 1, character: old[first - 1].length }, text: `\n${text}` };
}

/**
 * answersOf returns the headers and the bodies of the answers of a note.
 * @param note - The note.
 */
const answersOf = (note: Note): Required<AnswerText>[] => note.answers.map(({ author, date, body, depth }) => ({ author, date, body, depth }));

/**
 * subtreeEnd returns the index after the last reply in the tree below an answer: after its replies, their replies, and
 * so on.
 * @param answers - The answers in the order of the text.
 * @param index - The index of the answer.
 */
function subtreeEnd(answers: readonly Required<AnswerText>[], index: number): number {
  let end = index + 1;
  while (end < answers.length && answers[end].depth > answers[index].depth) {
    end++;
  }
  return end;
}

/**
 * readsBack tells whether a text has the note of a label with the expected answers and with a reference.
 * @param lines - The lines of the text.
 * @param label - The label of the note.
 * @param answers - The expected answers.
 */
function readsBack(lines: readonly string[], label: string, answers: readonly AnswerText[]): boolean {
  const note = findNotes(lines).find((candidate) => candidate.label === label && !candidate.duplicate);
  return (
    note !== undefined &&
    note.answers.length === answers.length &&
    note.answers.every(
      (answer, index) =>
        answer.body === answers[index].body && answer.author === answers[index].author && answer.date === answers[index].date && answer.depth === (answers[index].depth ?? (index === 0 ? 0 : 1)),
    )
  );
}

/**
 * rewrite returns the edit that gives a note new answers, if markdown-it reads the result as the note with these
 * answers.
 * @param lines - The lines of the Markdown text.
 * @param note - The note.
 * @param answers - The new answers, at least one.
 */
function rewrite(lines: readonly string[], note: Note, answers: readonly AnswerText[]): Result {
  const written = withPrefix(noteLines(note.label, answers), note.prefix);
  const next = [...lines.slice(0, note.start.line), lines[note.start.line].slice(0, note.start.character) + written[0], ...written.slice(1), ...lines.slice(note.end.line + 1)];
  return readsBack(next, note.label, answers) ? { edit: editBetween(lines, next) } : { problem: { kind: 'structure' } };
}

/**
 * replaceAnswer returns the edit that gives an answer of a note a new body
 * ([R-EDIT-002](../../docs/requirements.md#r-edit-002)). The header of the answer keeps its author; a changed body
 * gets the date of the save, when there is one, and an unchanged body keeps its date (Hannes, 2026-10-28: a change of
 * the text changes the date). The other answers keep their texts.
 * @param lines - The lines of the Markdown text.
 * @param note - The note.
 * @param index - The index of the answer.
 * @param body - The new body, as normalizeBody returns it.
 * @param date - The date of the save, as formatDate writes it, or undefined to keep the date.
 */
export function replaceAnswer(lines: readonly string[], note: Note, index: number, body: string, date?: string): Result {
  if (body === '') {
    return { problem: { kind: 'empty' } };
  }
  const answers = answersOf(note);
  const changed = answers[index].body !== body;
  answers[index] = { ...answers[index], body, date: changed && date !== undefined ? date : answers[index].date };
  return rewrite(lines, note, answers);
}

/**
 * appendAnswer returns the edit that adds a reply to an answer of a note, with the header of the fields
 * ([R-EDIT-005](../../docs/requirements.md#r-edit-005)): after the last reply in the tree below that answer, one level
 * deeper ([R-NOTE-004](../../docs/requirements.md#r-note-004)). A reply to the first answer is a reply to the note.
 * @param lines - The lines of the Markdown text.
 * @param note - The note.
 * @param body - The body, as normalizeBody returns it.
 * @param fields - The author and the date.
 * @param parent - The index of the answer that the reply replies to.
 */
export function appendAnswer(lines: readonly string[], note: Note, body: string, fields: Fields, parent = 0): Result {
  if (body === '') {
    return { problem: { kind: 'empty' } };
  }
  const answers = answersOf(note);
  if (parent < 0 || parent >= answers.length) {
    return { problem: { kind: 'missing' } };
  }
  answers.splice(subtreeEnd(answers, parent), 0, { author: fields.author, date: fields.date, body, depth: answers[parent].depth + 1 });
  return rewrite(lines, note, answers);
}

/**
 * deleteAnswer returns the edit that removes an answer from the thread of a note
 * ([R-EDIT-004](../../docs/requirements.md#r-edit-004)). Its replies stay: they move up one level and reply to the
 * answer that the removed answer replied to. After the first answer, its first reply becomes the first answer, and its
 * other replies reply to it. The only answer of a note goes with the whole note.
 * @param lines - The lines of the Markdown text.
 * @param note - The note.
 * @param index - The index of the answer.
 */
export function deleteAnswer(lines: readonly string[], note: Note, index: number): Result {
  if (note.answers.length === 1) {
    return { edit: deleteNote(lines, note) };
  }
  const answers = answersOf(note);
  // The replies below the answer move up, and after the first answer only the tree below its first reply.
  const end = subtreeEnd(answers, index === 0 ? 1 : index);
  for (let other = index + 1; other < end; other++) {
    answers[other].depth--;
  }
  answers.splice(index, 1);
  return rewrite(lines, note, answers);
}

/** Span is a part of a line of text, by the column of its first character and the column after its last one. */
interface Span {
  start: number;
  end: number;
  /** code tells whether the span is a code span, in which a start marker shows as text. */
  code: boolean;
}

/**
 * spansOf returns the code spans and the links of a line, in which a reference breaks on GitHub.
 * @param line - The line.
 */
function spansOf(line: string): Span[] {
  const code = [...line.matchAll(/(`+)[^]*?(?<!`)\1(?!`)/g)].map((match): Span => ({ start: match.index, end: match.index + match[0].length, code: true }));
  const links = [...line.matchAll(/!?\[[^\]]*\](?:\([^)]*\)|\[[^\]]*\])/g)].map((match): Span => ({ start: match.index, end: match.index + match[0].length, code: false }));
  return [...code, ...links];
}

/**
 * blockAt returns the text block that holds a position: on a line of a table row, the cell that starts last before
 * the position.
 * @param blocks - The text blocks of the text.
 * @param position - The position.
 */
function blockAt(blocks: readonly TextBlock[], position: Position): TextBlock | undefined {
  const candidates = blocks.filter((block) => block.starts.has(position.line));
  return candidates.filter((block) => block.starts.get(position.line)!.character <= position.character).at(-1) ?? candidates[0];
}

/** Place is the place of a new note: its start marker, its reference, and the line before which its definition goes. */
export interface Place {
  /** marker is the position of the start marker. */
  marker: Position;
  /** reference is the position of the reference, the end of the selection. */
  reference: Position;
  /** line is the index of the line before which the definition goes, in the text before the change. */
  line: number;
}

/**
 * definitionLine returns the line before which the definition of a new note goes: after the outermost block that holds
 * its reference, such as the whole list, the table or the block quote, and among the notes of that block in the order
 * of their references.
 * @param reading - The reading of the text.
 * @param block - The text block of the reference.
 * @param reference - The position of the reference.
 */
function definitionLine(reading: Reading, block: TextBlock, reference: Position): number {
  const siblings = reading.notes
    .filter((note) => note.reference && note.reference.start.line >= block.outerStart && note.reference.start.line < block.outerEnd && note.start.line >= block.outerEnd)
    .sort((a, b) => a.start.line - b.start.line);
  const later = siblings.find((note) => !before(note.reference!.start, reference));
  if (later) {
    return later.start.line;
  }
  const last = siblings.at(-1);
  return last ? last.end.line + 1 : block.outerEnd;
}

/**
 * placeFor returns the place of a new note for a range of a Markdown text, when the range is in the text of a
 * paragraph, a heading or a table cell ([R-NOTE-006](../../docs/requirements.md#r-note-006)). The highlight belongs
 * to one block, the block of its end. A range without text has no place: every new note highlights text (Hannes,
 * 2026-10-28: "there shall be no way to add a note without highlighting text"). The reference
 * never stands in a code span or a link: it moves after it. Every note has a start marker (Hannes, 2026-10-28: "there
 * should never be a note without a start marker"), also at the start of a line: `<wbr>` before its comment keeps the
 * comment from starting a block of HTML, which would end the paragraph.
 * @param lines - The lines of the Markdown text.
 * @param range - The range, for example the selection of the text editor.
 * @param reading - The reading of the text.
 */
export function placeFor(lines: readonly string[], range: Range, reading: Reading = read(lines)): Place | undefined {
  const blocks = reading.blocks;
  let { start, end } = range;
  if (same(start, end)) {
    return undefined;
  }
  // A selection of whole lines ends at the start of the next line, which belongs to the line before.
  const endLineBlock = blockAt(blocks, end);
  if (end.line > start.line && (!endLineBlock || end.character <= endLineBlock.starts.get(end.line)!.character)) {
    let previous = end.line - 1;
    while (previous > start.line && !blocks.some((block) => block.ends.has(previous))) {
      previous--;
    }
    const block = blockAt(blocks, { line: previous, character: Number.MAX_SAFE_INTEGER });
    if (!block) {
      return undefined;
    }
    end = block.ends.get(previous)!;
  }
  const block = blockAt(blocks, end);
  if (!block) {
    return undefined;
  }
  // The selection ends in the text of its line, and never in a code span or a link.
  const lineEnd = block.ends.get(end.line)!;
  const lineStart = block.starts.get(end.line)!;
  end = { line: end.line, character: Math.min(Math.max(end.character, lineStart.character), lineEnd.character) };
  for (const span of spansOf(lines[end.line])) {
    if (span.start < end.character && end.character < span.end) {
      end = { line: end.line, character: span.end };
    }
  }
  // The selection starts in the block of its end, in the text of its line, and never in a code span. A selection that
  // holds no text of its block, such as a line break only, keeps its start and gets no place.
  if (blockAt(blocks, start) !== block || (before(end, start) && !same(end, start))) {
    start = block.starts.get(block.first)!;
  } else {
    const startLine = block.starts.get(start.line)!;
    if (start.character < startLine.character) {
      start = startLine;
    }
    if (start.character >= block.ends.get(start.line)!.character && start.line < end.line) {
      start = block.starts.get(start.line + 1) ?? start;
    }
    for (const span of spansOf(lines[start.line])) {
      if (span.code && span.start < start.character && start.character < span.end) {
        start = { line: start.line, character: span.start };
      }
    }
  }
  if (!before(start, end) || same(start, end)) {
    return undefined;
  }
  return { marker: start, reference: end, line: definitionLine(reading, block, end) };
}

/**
 * highlightFor returns the place of a new note for a selection that starts and ends in the same block of text, which the
 * hover of the selection offers ([R-EDIT-003](../../docs/requirements.md#r-edit-003)), or undefined. The highlight of the
 * note goes from the start marker to the reference of the place. "Add Note" also takes a selection over several blocks,
 * for the text of the last block.
 * @param lines - The lines of the Markdown text.
 * @param range - The selection.
 * @param reading - The reading of the lines.
 */
export function highlightFor(lines: readonly string[], range: Range, reading: Reading = read(lines)): Place | undefined {
  const place = placeFor(lines, range, reading);
  const block = place && blockAt(reading.blocks, place.reference);
  return block && blockAt(reading.blocks, range.start) === block ? place : undefined;
}

/**
 * insertNote returns the edit that adds a note for a range of the text, with the header of the fields
 * ([R-EDIT-003](../../docs/requirements.md#r-edit-003)), and the label and the position of the new note: the start
 * marker and the reference in the text, and the definition after the block, with a blank line before and after it
 * ([R-NOTE-006](../../docs/requirements.md#r-note-006)).
 * @param lines - The lines of the Markdown text.
 * @param range - The range that the note belongs to, for example the selection of the text editor.
 * @param body - The body, as normalizeBody returns it.
 * @param fields - The author and the date.
 * @param random - Returns a random number from 0 to below 1, for the label.
 * @param color - The name of the color of the note, or undefined for the default color.
 */
export function insertNote(lines: readonly string[], range: Range, body: string, fields: Fields, random?: () => number, color?: string): Result & { label?: string; start?: Position } {
  if (body === '') {
    return { problem: { kind: 'empty' } };
  }
  if (same(range.start, range.end)) {
    return { problem: { kind: 'noText' } };
  }
  const place = placeFor(lines, range);
  if (!place) {
    return { problem: { kind: 'place' } };
  }
  const label = newLabel(usedLabels(lines), random);
  const next = [...lines];
  const parts = [
    { position: place.reference, text: referenceText(label) },
    { position: place.marker, text: markerText(label, color) },
  ].sort((a, b) => (before(a.position, b.position) ? (same(a.position, b.position) ? 0 : 1) : -1));
  // The later part goes first, so that the position of the earlier one stays; at the same position the marker goes before the reference.
  for (const { position, text } of parts) {
    const line = next[position.line];
    next[position.line] = line.slice(0, position.character) + text + line.slice(position.character);
  }
  const definition = noteLines(label, [{ ...fields, body }]);
  const blankBefore = place.line > 0 && next[place.line - 1].trim() !== '';
  const blankAfter = place.line < next.length && next[place.line].trim() !== '';
  next.splice(place.line, 0, ...(blankBefore ? [''] : []), ...definition, ...(blankAfter ? [''] : []));
  const start = { line: place.line + (blankBefore ? 1 : 0), character: 0 };
  const written = findNotes(next).find((note) => note.label === label);
  if (!readsBack(next, label, [{ ...fields, body }]) || !written?.reference) {
    return { problem: { kind: 'structure' } };
  }
  return { edit: editBetween(lines, next), label, start };
}

/**
 * deleteNote returns the edit that removes a note from the text: its definition with one blank line next to it, and
 * its reference and its start marker ([R-EDIT-004](../../docs/requirements.md#r-edit-004)).
 * @param lines - The lines of the Markdown text.
 * @param note - The note.
 */
export function deleteNote(lines: readonly string[], note: Note): Edit {
  const next = [...lines];
  const parts = [note.reference, note.marker].filter((part): part is Range => part !== undefined).sort((a, b) => (before(a.start, b.start) ? 1 : -1));
  for (const part of parts) {
    const line = next[part.start.line];
    next[part.start.line] = line.slice(0, part.start.character) + line.slice(part.end.character);
  }
  const at = note.start.line;
  next.splice(at, note.end.line - at + 1);
  const blank = (index: number): boolean => index >= next.length || next[index].trim() === '' || /^[ \t>]*$/.test(next[index]);
  if (at > 0 && blank(at - 1) && blank(at)) {
    next.splice(at - 1, 1);
  }
  return editBetween(lines, next);
}

/**
 * colorNote returns the edit that gives a note a color: the name of the color in its start marker, or no name for the
 * default color (Hannes, 2026-10-28: "notes can be colored in the notes editor, by default they get all the same
 * color"). The marker gets `<wbr>` when it has none, and a note without a start marker gets one at the start of its
 * highlight.
 * @param lines - The lines of the Markdown text.
 * @param note - The note.
 * @param color - The name of the color, or undefined for the default color.
 */
export function colorNote(lines: readonly string[], note: Note, color: string | undefined): Result {
  if (!note.selection) {
    return { problem: { kind: 'missing' } };
  }
  const next = [...lines];
  const { start, end } = note.marker ?? { start: note.selection.start, end: note.selection.start };
  const line = next[start.line];
  next[start.line] = line.slice(0, start.character) + markerText(note.label, color) + line.slice(end.character);
  const written = findNotes(next).find((candidate) => candidate.label === note.label && !candidate.duplicate);
  const expected = color === colorNames[0] ? undefined : color;
  return written?.marker && written.color === expected ? { edit: editBetween(lines, next) } : { problem: { kind: 'structure' } };
}

/**
 * replaceNoteText returns the edit that gives a note the text of the text view of the side view: the lines of its
 * definition as the file holds them, without the prefix of its block quotes and list items (Hannes, 2026-10-28: "the
 * text editor view of the notes toggles the complete note in the side view in a text view"). The text must stay the
 * definition of the same note: it starts with the label and the header, ends where the note ends, and adds or removes
 * no other note.
 * @param lines - The lines of the Markdown text.
 * @param note - The note.
 * @param text - The text, with `\n` or `\r\n` as line breaks.
 */
export function replaceNoteText(lines: readonly string[], note: Note, text: string): Result {
  const own = text.replace(/\r\n?/g, '\n').replace(/\s+$/, '').split('\n');
  if (own.join('').trim() === '') {
    return { problem: { kind: 'empty' } };
  }
  const written = withPrefix(own, note.prefix);
  const next = [...lines.slice(0, note.start.line), lines[note.start.line].slice(0, note.start.character) + written[0], ...written.slice(1), ...lines.slice(note.end.line + 1)];
  const count = findNotes(lines).length;
  const notes = findNotes(next);
  const changed = notes.find((candidate) => candidate.label === note.label && !candidate.duplicate);
  const fits = changed !== undefined && changed.start.line === note.start.line && changed.end.line === note.start.line + written.length - 1 && notes.length === count;
  return fits ? { edit: editBetween(lines, next) } : { problem: { kind: 'text', label: note.label } };
}
