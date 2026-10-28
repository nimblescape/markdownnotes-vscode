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

import { findNotes, insertionFor, type Note, type Position } from './notes';
import { type Answer, answerLines, bodyProblem, commentEnd, commentStart, commentText, type Fields, frontMatterLines } from './syntax';

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
  const changed = [...textLines.slice(0, answer.start), ...(next ? textLines.slice(next.start) : closing(textLines, answer.end))];
  return rewrite(lines, note, changed, expectedOf(note.answers.filter((_, other) => other !== index)));
}

/**
 * insertNote returns the edit that adds a note for a line, with a front matter of the fields
 * ([R-EDIT-003](../../docs/requirements.md#r-edit-003)), and the position of the new note: an inline note after a
 * line of a paragraph, a block note after another block.
 * @param lines - The lines of the Markdown text.
 * @param line - The index of the line that the note belongs to.
 * @param body - The body, as normalizeBody returns it.
 * @param fields - The fields of the front matter.
 */
export function insertNote(lines: readonly string[], line: number, body: string, fields: Fields): Result & { start?: Position } {
  const frontMatter = frontMatterLines(fields);
  const problem = check(body);
  if (problem) {
    return { problem };
  }
  const place = insertionFor(lines, Math.min(Math.max(line, 0), lines.length - 1));
  const comment = place.prefix + withPrefix(commentText(place.kind, frontMatter, body), place.prefix);
  let edit: Edit;
  let start: Position;
  if (place.line < lines.length) {
    edit = { start: { line: place.line, character: 0 }, end: { line: place.line, character: 0 }, text: `${comment}\n` };
    start = { line: place.line, character: place.prefix.length };
  } else {
    // After the last line: a text without a line break at its end gets one before the note.
    const last = lines.length - 1;
    edit = { start: { line: last, character: lines[last].length }, end: { line: last, character: lines[last].length }, text: `\n${comment}` };
    start = { line: lines.length, character: place.prefix.length };
  }
  return readsBack(applyEdit(lines, edit), start, place.kind, [{ frontMatter, body }]) ? { edit, start } : { problem: { kind: 'structure' } };
}

/**
 * deleteNote returns the edit that removes a note from the text ([R-EDIT-004](../../docs/requirements.md#r-edit-004)).
 * A note on lines of its own loses its lines, and between two blank lines one of them; another note loses its comment
 * and one space before it, so that no two spaces stay.
 * @param lines - The lines of the Markdown text.
 * @param note - The note.
 */
export function deleteNote(lines: readonly string[], note: Note): Edit {
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
