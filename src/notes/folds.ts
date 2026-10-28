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
 * takes the blank lines after the note, so that one blank line stays where
 * the text had one.
 *
 * The Markdown extension of VS Code folds headings, lists, block quotes, code
 * blocks and blocks of HTML from their first line. VS Code keeps only one of
 * two folds that start on the same line, so a fold of a note starts only on a
 * line of the text of a paragraph, or else on the first blank line before the
 * note, or on the first line of the note itself. The module uses no API of
 * VS Code.
 *
 * The header of each answer shows as one rendered line with the author and
 * the date in the local time of the reader
 * ([R-TEXT-007](../../docs/requirements.md#r-text-007)).
 */

import type { Note } from './notes';
import { displayDate } from './syntax';

/** Fold is the lines that one or more collapsed notes fold into the first of them. */
export interface Fold {
  /** start is the index of the line that stays visible while the fold is collapsed. */
  start: number;
  /** end is the index of the last line of the fold. */
  end: number;
  /** notes are the notes of the fold, at least one. */
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
 * no heading, list item, block quote, fence, table row, thematic break, setext underline, HTML or line of a note.
 * @param line - The line.
 */
export const isText = (line: string): boolean => !isBlank(line) && !/^\s*(#{1,6}(\s|$)|[-*+](\s|$)|\d{1,9}[.)](\s|$)|>|`{3}|~{3}|<|\||\[\^|([-*_=]\s*){3,}$)/.test(line);

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
      last.end = endOf(lines, note, isText(lines[last.start]));
      last.notes.push(note);
    } else {
      const onText = line >= 0 && isText(lines[line]);
      const start = onText ? line : line + 1 < note.start.line ? line + 1 : note.start.line;
      folds.push({ start, end: endOf(lines, note, onText), notes: [note], hidesFirst: start === note.start.line });
    }
    previous = note;
  }
  return folds.filter((fold) => fold.end > fold.start);
}

/**
 * endOf returns the last line of the fold of a note: the line of its end, or the last blank line after it when a line
 * follows the blank lines and the fold starts on a blank line or on the note itself, because the line of the start
 * then already stands for the blank lines.
 * @param lines - The lines of the text.
 * @param note - The note.
 * @param onText - Whether the fold starts on a line of text.
 */
function endOf(lines: readonly string[], note: Note, onText: boolean): number {
  let next = note.end.line + 1;
  while (next < lines.length && isBlank(lines[next])) {
    next++;
  }
  if (next === lines.length) {
    return note.end.line;
  }
  return onText ? note.end.line : next - 1;
}

/**
 * foldOf returns the fold that holds a note.
 * @param folds - The folds of the text.
 * @param note - The note.
 */
export const foldOf = (folds: readonly Fold[], note: Note): Fold | undefined => folds.find((fold) => fold.notes.includes(note));

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
 * example `hannes · 2026-10-28 10:15`.
 * @param answer - The author and the date of the answer.
 */
export const headerText = (answer: { author: string; date: string }): string => `${answer.author} · ${displayDate(answer.date)}`;

/**
 * headersOf returns the header lines of the answers of the notes of a text.
 * @param lines - The lines of the text.
 * @param notes - The notes of the text, in the order of the text.
 */
export function headersOf(lines: readonly string[], notes: readonly Note[]): Header[] {
  return notes.flatMap((note) =>
    note.answers.map((answer) => {
      const line = note.start.line + answer.start;
      const text = lines[line] ?? '';
      const quote = /^[ \t>]*?>[ \t]?/.exec(text.slice(note.start.character));
      const start = answer.start === 0 || !quote ? note.start.character : note.start.character + quote[0].length;
      return { line, start, end: text.trimEnd().length, text: headerText(answer), date: answer.date };
    }),
  );
}
