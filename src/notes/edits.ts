// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The changes of the Markdown text when a note is saved, added or deleted
 * ([R-EDIT-002](../../docs/requirements.md#r-edit-002) to
 * [R-EDIT-004](../../docs/requirements.md#r-edit-004)). Each function returns
 * one edit of the lines of the text, or the problem that prevents it. The
 * module uses no API of VS Code.
 *
 * A note is written back only when markdown-it reads the changed text as the
 * same note: the same place, the same front matter and the same body. So a
 * text that would end the comment early, open another comment
 * ([R-NOTE-003](../../docs/requirements.md#r-note-003)) or change the Markdown
 * around the note, for example a blank line in a note inside a paragraph,
 * never reaches the file.
 */

import { findNotes, insertionFor, type Note, type Position } from './notes';
import { bodyProblem, commentText, type Fields, frontMatterLines } from './syntax';

/** Edit replaces the text between two positions of the lines of a text. Its text has `\n` as line breaks. */
export interface Edit {
  start: Position;
  end: Position;
  text: string;
}

/**
 * Problem is the reason why a note cannot be written: `nested` for a text with a forbidden text, `structure` for a
 * text that markdown-it would not read back as the same note.
 */
export type Problem = { kind: 'nested'; text: string } | { kind: 'structure' };

/** Result is an edit, or the problem that prevents it. */
export type Result = { edit: Edit } | { problem: Problem };

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
 * readsBack tells whether the text after an edit has a note at a position with a front matter and a body.
 * @param lines - The lines of the text after the edit.
 * @param start - The position of the note.
 * @param frontMatter - The lines of its front matter, or undefined.
 * @param body - Its body.
 */
function readsBack(lines: readonly string[], start: Position, frontMatter: readonly string[] | undefined, body: string): boolean {
  const note = findNotes(lines).find((candidate) => candidate.start.line === start.line && candidate.start.character === start.character);
  const read = note?.frontMatter?.lines.map((line) => line.trim()).join('\n');
  return note !== undefined && note.body === body && read === frontMatter?.map((line) => line.trim()).join('\n');
}

/**
 * check returns the problem of a body, or undefined.
 * @param body - The body.
 */
function check(body: string): Problem | undefined {
  const forbidden = bodyProblem(body);
  return forbidden ? { kind: 'nested', text: forbidden } : undefined;
}

/**
 * replaceBody returns the edit that gives a note a new body
 * ([R-EDIT-002](../../docs/requirements.md#r-edit-002)). The front matter stays as it is, with its author and date.
 * @param lines - The lines of the Markdown text.
 * @param note - The note.
 * @param body - The new body, as normalizeBody returns it.
 */
export function replaceBody(lines: readonly string[], note: Note, body: string): Result {
  const frontMatter = note.frontMatter?.lines;
  const problem = check(body);
  if (problem) {
    return { problem };
  }
  const edit = { start: note.start, end: note.end, text: withPrefix(commentText(frontMatter, body), note.prefix) };
  return readsBack(applyEdit(lines, edit), note.start, frontMatter, body) ? { edit } : { problem: { kind: 'structure' } };
}

/**
 * insertNote returns the edit that adds a note for a line, with a front matter of the fields
 * ([R-EDIT-003](../../docs/requirements.md#r-edit-003)), and the position of the new note.
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
  const comment = place.prefix + withPrefix(commentText(frontMatter, body), place.prefix);
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
  return readsBack(applyEdit(lines, edit), start, frontMatter, body) ? { edit, start } : { problem: { kind: 'structure' } };
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
