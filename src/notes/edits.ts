// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The changes of the Markdown text when an answer is saved, added or deleted,
 * and when a note is added or deleted
 * ([R-EDIT-002](../../docs/requirements.md#r-edit-002) to
 * [R-EDIT-005](../../docs/requirements.md#r-edit-005)). Each function returns
 * one edit of the lines of the text, or the problem that prevents it. The
 * module uses no API of VS Code.
 *
 * A change touches only the lines of its answer in the comment of the note.
 * It is written only when markdown-it reads the changed text as the same note
 * with the expected answers: the same place, the same kind, and the same front
 * matter and body of each answer. So a text that would end the comment early,
 * open another comment ([R-NOTE-003](../../docs/requirements.md#r-note-003)),
 * start another answer or change the Markdown around the note, for example a
 * blank line in a note inside the text of a line, never reaches the file.
 */

import { findNotes, insertionFor, nextSelectionId, type Note, type Position, type Range, selectionPlaceFor } from './notes';
import { type Answer, answerLines, bodyProblem, commentEnd, commentStart, commentText, type Fields, frontMatterLines, markerText, selectionField, selectionOf } from './syntax';

/** Edit replaces the text between two positions of the lines of a text. Its text has `\n` as line breaks. */
export interface Edit {
  start: Position;
  end: Position;
  text: string;
}

/**
 * Problem is the reason why an answer cannot be written: `nested` for a text with a forbidden text, `structure` for a
 * text that markdown-it would not read back as the same note, `signIn` for a new note or answer without a GitHub
 * sign-in ([R-GEN-006](../../docs/requirements.md#r-gen-006)), and `missing` for a note that the document no longer
 * holds.
 */
export type Problem = { kind: 'nested'; text: string } | { kind: 'structure' } | { kind: 'signIn' } | { kind: 'missing' };

/** Result is an edit, or the problem that prevents it. */
export type Result = { edit: Edit } | { problem: Problem };

/** Expected is the front matter and the body of an answer that a changed text must hold. */
interface Expected {
  frontMatter: readonly string[] | undefined;
  body: string;
}

/**
 * withPrefix puts the prefix of a note before each further line of its comment, so that the comment stays in its
 * block quote or list item. An empty line gets the prefix without its trailing spaces.
 * @param text - The comment, with `\n` as line breaks.
 * @param prefix - The prefix of the further lines.
 */
export function withPrefix(text: string, prefix: string): string {
  return text
    .split('\n')
    .map((line, index) => (index === 0 ? line : line === '' ? prefix.trimEnd() : prefix + line))
    .join('\n');
}

/**
 * applyEdit returns the lines of a text after an edit.
 * @param lines - The lines of the text.
 * @param edit - The edit.
 */
export function applyEdit(lines: readonly string[], edit: Edit): string[] {
  const before = lines[edit.start.line].slice(0, edit.start.character);
  const after = lines[edit.end.line].slice(edit.end.character);
  return [...lines.slice(0, edit.start.line), ...`${before}${edit.text}${after}`.split('\n'), ...lines.slice(edit.end.line + 1)];
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
  return first < old.length
    ? { start: { line: first, character: 0 }, end: { line: first, character: 0 }, text: `${text}\n` }
    : { start: { line: first - 1, character: old[first - 1].length }, end: { line: first - 1, character: old[first - 1].length }, text: `\n${text}` };
}

/**
 * sameLines tells whether two front matters have the same lines, apart from the white space around each line.
 * @param a - The lines of one front matter, or undefined.
 * @param b - The lines of the other, or undefined.
 */
const sameLines = (a: readonly string[] | undefined, b: readonly string[] | undefined): boolean =>
  a?.map((line) => line.trim()).join('\n') === b?.map((line) => line.trim()).join('\n');

/**
 * readsBack tells whether the text after an edit has a note of a kind at a position with the expected answers.
 * @param lines - The lines of the text after the edit.
 * @param start - The position of the note.
 * @param kind - The kind of the note.
 * @param answers - The expected answers.
 */
function readsBack(lines: readonly string[], start: Position, kind: Note['kind'], answers: readonly Expected[]): boolean {
  const note = findNotes(lines).find((candidate) => candidate.start.line === start.line && candidate.start.character === start.character);
  return (
    note !== undefined &&
    note.kind === kind &&
    note.answers.length === answers.length &&
    note.answers.every((answer, index) => answer.body === answers[index].body && sameLines(answer.frontMatter?.lines, answers[index].frontMatter))
  );
}

/**
 * expectedOf returns the front matter and the body of the answers of a note.
 * @param answers - The answers.
 */
const expectedOf = (answers: readonly Answer[]): Expected[] => answers.map((answer) => ({ frontMatter: answer.frontMatter?.lines, body: answer.body }));

/**
 * check returns the problem of a body, or undefined.
 * @param body - The body.
 */
function check(body: string): Problem | undefined {
  const forbidden = bodyProblem(body);
  return forbidden ? { kind: 'nested', text: forbidden } : undefined;
}

/**
 * rewrite returns the edit that gives the comment of a note new lines of its text, if markdown-it reads the result as
 * the note with the expected answers.
 * @param lines - The lines of the Markdown text.
 * @param note - The note.
 * @param textLines - The new lines of the text of the comment, between `<!--` and `-->`.
 * @param answers - The expected answers.
 */
function rewrite(lines: readonly string[], note: Note, textLines: readonly string[], answers: readonly Expected[]): Result {
  const edit = { start: note.start, end: note.end, text: withPrefix(`${commentStart}${textLines.join('\n')}${commentEnd}`, note.prefix) };
  return readsBack(applyEdit(lines, edit), note.start, note.kind, answers) ? { edit } : { problem: { kind: 'structure' } };
}

/**
 * closing returns the lines of the text of a comment from a line to `-->`. When the line is past the last line, the
 * last line held the end of a body before `-->`; `-->` then gets a line of its own.
 * @param textLines - The lines of the text of the comment.
 * @param line - The index of the line.
 */
const closing = (textLines: readonly string[], line: number): string[] => (line >= textLines.length ? [''] : textLines.slice(line));

/**
 * replaceAnswer returns the edit that gives an answer of a note a new body
 * ([R-EDIT-002](../../docs/requirements.md#r-edit-002)). The front matter of the answer stays as it is, with its
 * author and date, and the other answers keep their lines.
 * @param lines - The lines of the Markdown text.
 * @param note - The note.
 * @param index - The index of the answer.
 * @param body - The new body, as normalizeBody returns it.
 */
export function replaceAnswer(lines: readonly string[], note: Note, index: number, body: string): Result {
  const problem = check(body);
  if (problem) {
    return { problem };
  }
  const answer = note.answers[index];
  const textLines = note.text.split('\n');
  const changed = [...textLines.slice(0, answer.start), ...answerLines(answer.frontMatter?.lines, body), ...closing(textLines, answer.end)];
  const answers = expectedOf(note.answers);
  answers[index] = { frontMatter: answer.frontMatter?.lines, body };
  return rewrite(lines, note, changed, answers);
}

/**
 * appendAnswer returns the edit that adds an answer at the end of the thread of a note, with a front matter of the
 * fields ([R-EDIT-005](../../docs/requirements.md#r-edit-005)).
 * @param lines - The lines of the Markdown text.
 * @param note - The note.
 * @param body - The body, as normalizeBody returns it.
 * @param fields - The fields of the front matter.
 */
export function appendAnswer(lines: readonly string[], note: Note, body: string, fields: Fields): Result {
  const problem = check(body);
  if (problem) {
    return { problem };
  }
  const frontMatter = frontMatterLines(fields);
  const last = note.answers[note.answers.length - 1];
  const textLines = note.text.split('\n');
  const head = textLines.slice(0, last.end);
  if (last.end >= textLines.length) {
    // The body ended on the line of `-->`, which now ends after the body.
    head[head.length - 1] = head[head.length - 1].trimEnd();
  }
  const changed = [...head, ...answerLines(frontMatter, body), ...closing(textLines, last.end)];
  return rewrite(lines, note, changed, [...expectedOf(note.answers), { frontMatter, body }]);
}

/**
 * deleteAnswer returns the edit that removes an answer from the thread of a note
 * ([R-EDIT-004](../../docs/requirements.md#r-edit-004)). The only answer of a note goes with the whole note.
 * @param lines - The lines of the Markdown text.
 * @param note - The note.
 * @param index - The index of the answer.
 */
export function deleteAnswer(lines: readonly string[], note: Note, index: number): Result {
  if (note.answers.length === 1) {
    return { edit: deleteNote(lines, note) };
  }
  const answer = note.answers[index];
  const next = note.answers[index + 1];
  const textLines = note.text.split('\n');
  const rest = next ? textLines.slice(next.start) : closing(textLines, answer.end);
  const answers = expectedOf(note.answers.filter((_, other) => other !== index));
  const id = selectionOf(note);
  if (index === 0 && next && id) {
    // The selection of the note moves into the front matter of the answer that becomes the first one.
    const field = `${selectionField}: ${id}`;
    const frontMatter = next.frontMatter ? [...next.frontMatter.lines.slice(0, -1), field, next.frontMatter.lines.at(-1)!] : ['---', field, '---'];
    rest.splice(0, next.frontMatter?.lines.length ?? 0, ...frontMatter);
    answers[0] = { ...answers[0], frontMatter };
  }
  return rewrite(lines, note, [...textLines.slice(0, answer.start), ...rest], answers);
}

/**
 * insertNote returns the edit that adds a note for a range of the text, with a front matter of the fields
 * ([R-EDIT-003](../../docs/requirements.md#r-edit-003)), and the position of the new note. In the text of a paragraph
 * or a heading, the note gets a selection ([R-NOTE-006](../../docs/requirements.md#r-note-006)): the markers of the
 * range, or a point at the end of the line for an empty range, and the note after the block, so that no Markdown
 * viewer shows a break in the paragraph. Elsewhere it is a block note after the block of the line.
 * @param lines - The lines of the Markdown text.
 * @param range - The range that the note belongs to, for example the selection of the text editor.
 * @param body - The body, as normalizeBody returns it.
 * @param fields - The fields of the front matter.
 */
export function insertNote(lines: readonly string[], range: Range, body: string, fields: Fields): Result & { start?: Position } {
  const problem = check(body);
  if (problem) {
    return { problem };
  }
  // A new note is always a block note: an inline note on lines of its own ends the paragraph in other viewers.
  const kind = 'block';
  const selection = selectionPlaceFor(lines, range);
  const id = selection ? nextSelectionId(lines) : undefined;
  const place = selection ?? { ...insertionFor(lines, Math.min(Math.max(range.start.line, 0), lines.length - 1)), markers: [] };
  const frontMatter = frontMatterLines(id ? { ...fields, selection: id } : fields);
  const next = [...lines];
  for (const { kind: marker, position } of [...place.markers].reverse()) {
    const line = next[position.line];
    next[position.line] = line.slice(0, position.character) + markerText(marker, id!) + line.slice(position.character);
  }
  const comment = place.prefix + withPrefix(commentText(kind, frontMatter, body), place.prefix);
  next.splice(place.line, 0, ...comment.split('\n'));
  const start = { line: place.line, character: place.prefix.length };
  const written = findNotes(next).find((note) => note.start.line === start.line && note.start.character === start.character);
  if (!readsBack(next, start, kind, [{ frontMatter, body }]) || (id && written?.selection?.id !== id)) {
    return { problem: { kind: 'structure' } };
  }
  return { edit: editBetween(lines, next), start };
}

/**
 * deleteNote returns the edit that removes a note and the markers of its selection from the text
 * ([R-EDIT-004](../../docs/requirements.md#r-edit-004)). A note on lines of its own loses its lines, and between two blank lines one of them; another note loses its comment
 * and one space before it, so that no two spaces stay.
 * @param lines - The lines of the Markdown text.
 * @param note - The note.
 */
export function deleteNote(lines: readonly string[], note: Note): Edit {
  if (!note.selection) {
    return deleteComment(lines, note);
  }
  // The markers of the selection go with the note; they have no line of their own.
  const next = [...lines];
  const markers = [...note.selection.markers].sort((a, b) => b.start.line - a.start.line || b.start.character - a.start.character);
  for (const marker of markers) {
    const line = next[marker.start.line];
    next[marker.start.line] = line.slice(0, marker.start.character) + line.slice(marker.end.character);
  }
  const shift = (position: Position): Position => ({
    line: position.line,
    character:
      position.character -
      markers.filter((marker) => marker.start.line === position.line && marker.end.character <= position.character).reduce((sum, marker) => sum + marker.end.character - marker.start.character, 0),
  });
  const shifted = { ...note, start: shift(note.start), end: shift(note.end) };
  return editBetween(lines, applyEdit(next, deleteComment(next, shifted)));
}

/**
 * deleteComment returns the edit that removes the comment of a note from the text.
 * @param lines - The lines of the Markdown text.
 * @param note - The note.
 */
function deleteComment(lines: readonly string[], note: Note): Edit {
  const before = lines[note.start.line].slice(0, note.start.character);
  const after = lines[note.end.line].slice(note.end.character);
  if (note.place === 'block' && /^[ \t>]*$/.test(before) && after.trim() === '') {
    if (note.end.line + 1 < lines.length) {
      const blank = (index: number): boolean => index < 0 || /^[ \t>]*$/.test(lines[index]);
      // Between two blank lines, the note also takes the blank line after it, so that one blank line stays.
      const end = blank(note.start.line - 1) && note.end.line + 2 < lines.length && blank(note.end.line + 1) ? note.end.line + 2 : note.end.line + 1;
      return { start: { line: note.start.line, character: 0 }, end: { line: end, character: 0 }, text: '' };
    }
    if (note.start.line > 0) {
      const previous = note.start.line - 1;
      return { start: { line: previous, character: lines[previous].length }, end: { line: note.end.line, character: lines[note.end.line].length }, text: '' };
    }
    return { start: { line: 0, character: 0 }, end: { line: note.end.line, character: lines[note.end.line].length }, text: '' };
  }
  const space = before.endsWith(' ') && (after === '' || after.startsWith(' ')) ? 1 : 0;
  return { start: { line: note.start.line, character: note.start.character - space }, end: note.end, text: '' };
}
