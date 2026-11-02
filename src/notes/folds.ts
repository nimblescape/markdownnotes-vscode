// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The folds of the collapsed notes in the text editor
 * ([R-TEXT-005](../../docs/requirements.md#r-text-005)). A collapsed note
 * vanishes: the editor folds the lines of its definition, and the blank lines
 * before it, into the last line of text before the note, so that this line
 * stays and the note does not. Notes with only blank lines between them share
 * one fold.
 *
 * A fold that starts on a blank line, or on the first line of the note, also
 * takes the blank lines after the note, so that the blank lines before the
 * note stay where the text had them.
 *
 * The Markdown extension of VS Code folds the section of each heading, each
 * list item, block quote, table, code block and block of HTML: from the first
 * line of the block to its last line, without one blank line at its end, and
 * a fold of one line is no fold. VS Code keeps only one of two folds that
 * start on the same line, and drops a fold that starts inside another fold
 * and ends after it. So a fold of a note starts on the last line of a
 * paragraph at the start of the lines, or on a list item of one line at the
 * start of a line with one blank line after it, or else on the last blank line
 * before the note, or on the first line of the note itself; and it never takes
 * the last blank line before a heading, which ends the section of a heading
 * before it. The module uses no API of VS Code.
 *
 * The header of each answer shows as one rendered line with the author and
 * the date in the local time of the reader
 * ([R-TEXT-007](../../docs/requirements.md#r-text-007)).
 */

import { findDoctype } from './doctype';
import { firstLineOf, type Note } from './notes';
import { displayDate } from './syntax';

/** Fold is the lines that one or more collapsed notes fold into the first of them. */
export interface Fold {
  /** start is the index of the line that stays visible while the fold is collapsed. */
  start: number;
  /** end is the index of the last line of the fold. */
  end: number;
  /** notes are the notes of the fold, at least one, or none for the fold of the comment of the format of the notes. */
  notes: Note[];
  /** hidesFirst tells whether the first line of the fold is the first line of a note, which the editor hides then. */
  hidesFirst: boolean;
}

/**
 * isBlank tells whether a line holds only spaces and tabs.
 * @param line - The line.
 */
const isBlank = (line: string): boolean => line.trim() === '';

/**
 * isText tells whether a line is a line of the text of a paragraph, on which no fold of the Markdown extension starts:
 * no heading, list item, block quote, fence, table row, thematic break, setext underline, HTML or line of a note. A
 * line that starts with the start marker of a note is text: its `<wbr>` starts no block of HTML.
 * @param line - The line.
 */
export const isText = (line: string): boolean =>
  !isBlank(line) && !/^\s*(#{1,6}(\s|$)|[-*+](\s|$)|\d{1,9}[.)](\s|$)|>|`{3}|~{3}|<(?!wbr><!--\[note-)|\||\[\^|([-*_=]\s*){3,}$)/.test(line);

/**
 * isHeading tells whether a heading starts on a line: a heading with `#`, or the text of a heading whose line of `=` or
 * `-` follows the text.
 * @param lines - The lines of the text.
 * @param line - The index of the line.
 */
function isHeading(lines: readonly string[], line: number): boolean {
  if (/^ {0,3}#{1,6}(\s|$)/.test(lines[line])) {
    return true;
  }
  const underline = /^ {0,3}(=+|-+)[ \t]*$/;
  let next = line;
  while (next < lines.length && isText(lines[next]) && !underline.test(lines[next])) {
    next++;
  }
  return next > line && next < lines.length && underline.test(lines[next]);
}

/**
 * startsFold tells whether the fold of a note can start on the last line of the block before the note, so that this
 * line stays visible: the last line of a paragraph whose lines are text at the start of the lines, which no fold of
 * the Markdown extension holds, or a list item of one line at the start of a line with one blank line after it, whose
 * fold of the Markdown extension loses this blank line and so holds one line, which VS Code does not fold.
 * @param lines - The lines of the text.
 * @param line - The index of the last line of the block.
 * @param note - The note after the block.
 */
function startsFold(lines: readonly string[], line: number, note: Note): boolean {
  if (/^([-*+]|\d{1,9}[.)])[ \t]+\S/.test(lines[line])) {
    return line + 2 === note.start.line;
  }
  for (let first = line; first >= 0 && !isBlank(lines[first]); first--) {
    if (!isText(lines[first]) || /^\s/.test(lines[first])) {
      return false;
    }
  }
  return true;
}

/**
 * foldsOf returns the folds of the notes of a text.
 * @param lines - The lines of the text.
 * @param notes - The notes of the text, in the order of the text.
 */
export function foldsOf(lines: readonly string[], notes: readonly Note[]): Fold[] {
  const folds: Fold[] = [];
  let previous: Note | undefined;
  for (const note of notes) {
    const last = folds.at(-1);
    let line = note.start.line - 1;
    while (line >= 0 && isBlank(lines[line])) {
      line--;
    }
    if (last && previous && line === previous.end.line) {
      // The note follows another note with only blank lines between them.
      last.end = endOf(lines, note, !last.hidesFirst && !isBlank(lines[last.start]));
      last.notes.push(note);
    } else {
      const onText = line >= 0 && startsFold(lines, line, note);
      const start = onText ? line : line + 1 < note.start.line ? note.start.line - 1 : note.start.line;
      folds.push({ start, end: endOf(lines, note, onText), notes: [note], hidesFirst: start === note.start.line });
    }
    previous = note;
  }
  // The comment of the format at the top of the file folds into its first line (R-NOTE-007).
  const doctype = findDoctype(lines);
  if (doctype && !folds.some((fold) => fold.start <= doctype.end && doctype.start <= fold.end)) {
    folds.push({ start: doctype.start, end: doctype.end, notes: [], hidesFirst: false });
    folds.sort((a, b) => a.start - b.start);
  }
  return folds.filter((fold) => fold.end > fold.start);
}

/**
 * endOf returns the last line of the fold of a note: the line of its end, or the last blank line after it when a line
 * follows the blank lines and the fold starts on a blank line or on the note itself, because the line of the start
 * then already stands for the blank lines. Before a heading, the fold leaves the last blank line, which the fold of
 * the section of a heading before the note does not hold.
 * @param lines - The lines of the text.
 * @param note - The note.
 * @param onText - Whether the fold starts on a line of text.
 */
function endOf(lines: readonly string[], note: Note, onText: boolean): number {
  let next = note.end.line + 1;
  while (next < lines.length && isBlank(lines[next])) {
    next++;
  }
  if (onText || next === lines.length) {
    return note.end.line;
  }
  return isHeading(lines, next) ? Math.max(note.end.line, next - 2) : next - 1;
}

/** Header is the header line of one answer, which shows as a rendered line. */
export interface Header {
  /** line is the index of the line of the header. */
  line: number;
  /** start is the column of the first character of the header: the `[` of the definition, or the text after the `>` of an answer. */
  start: number;
  /** end is the column after the last character of the header. */
  end: number;
  /** text is the rendered header: the author and the date in the local time of the reader. */
  text: string;
  /** date is the date as written, in the local time of the author. */
  date: string;
}

/**
 * headerText returns the rendered header of an answer: its author and its date in the local time of the reader, for
 * example `hannes · 2026-10-28 10:15`, and the state of a todo note ([R-NOTE-008](../../docs/requirements.md#r-note-008)).
 * @param answer - The author, the date and the state of the answer.
 */
export const headerText = (answer: { author: string; date: string; todo?: string }): string => `${answer.author} · ${displayDate(answer.date)}${answer.todo ? ` · ${answer.todo}` : ''}`;

/**
 * headersOf returns the header lines of the answers of the notes of a text.
 * @param lines - The lines of the text.
 * @param notes - The notes of the text, in the order of the text.
 */
export function headersOf(lines: readonly string[], notes: readonly Note[]): Header[] {
  return notes.flatMap((note) =>
    note.answers.map((answer) => {
      const line = firstLineOf(note) + answer.start;
      const text = lines[line] ?? '';
      const quote = /^[ \t>]*?>[ \t]?/.exec(text.slice(note.start.character));
      const start = answer.start === 0 || !quote ? note.start.character : note.start.character + quote[0].length;
      return { line, start, end: text.trimEnd().length, text: headerText(answer), date: answer.date };
    }),
  );
}
