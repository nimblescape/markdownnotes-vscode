// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The folds of the collapsed notes in the text editor
 * ([R-TEXT-005](../../docs/requirements.md#r-text-005)). A collapsed note
 * vanishes: the editor folds its lines, and the blank lines before it, into
 * the last line of text before the note, so that this line stays and the note
 * does not. An inline note never ends a paragraph
 * ([R-NOTE-005](../../docs/requirements.md#r-note-005)), so its fold also takes
 * the blank lines after it when a line of text follows them. Notes with only
 * blank lines between them share one fold.
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
 * The front matter of each answer has a fold of its own inside the fold of
 * the note: while it is collapsed, the editor shows its first line as one
 * rendered line with the author and the date (Hannes, 2026-10-28).
 */

import type { Note } from './notes';
import { type Answer, displayDate } from './syntax';

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
 * no heading, list item, block quote, fence, table row, thematic break, setext underline, HTML or end of a comment.
 * @param line - The line.
 */
export const isText = (line: string): boolean =>
  !isBlank(line) && !/^\s*(#{1,6}(\s|$)|[-*+](\s|$)|\d{1,9}[.)](\s|$)|>|`{3}|~{3}|<|\||([-*_=]\s*){3,}$)/.test(line) && !line.trimEnd().endsWith('-->');

/**
 * foldsOf returns the folds of the notes on lines of their own of a text. A note in the text of a line has no fold,
 * because the fold would hide the text of its lines.
 * @param lines - The lines of the text.
 * @param notes - The notes of the text, in the order of the text.
 */
export function foldsOf(lines: readonly string[], notes: readonly Note[]): Fold[] {
  const folds: Fold[] = [];
  let previous: Note | undefined;
  for (const note of notes) {
    if (note.place !== 'block') {
      previous = undefined;
      continue;
    }
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
 * follows the blank lines and the fold would otherwise leave a blank line too many. That is the case for an inline note
 * before a line of text, and for each note whose fold starts on a blank line or on the note itself, because the line of
 * the start then already stands for the blank lines. When a text follows `-->` on its line, the fold ends before that
 * line.
 * @param lines - The lines of the text.
 * @param note - The note.
 * @param onText - Whether the fold starts on a line of text.
 */
function endOf(lines: readonly string[], note: Note, onText: boolean): number {
  if (!isBlank(lines[note.end.line].slice(note.end.character))) {
    // A text after `-->` stays visible.
    return note.end.line - 1;
  }
  let next = note.end.line + 1;
  while (next < lines.length && isBlank(lines[next])) {
    next++;
  }
  if (next === lines.length) {
    return note.end.line;
  }
  return (note.kind === 'inline' && isText(lines[next])) || !onText ? next - 1 : note.end.line;
}

/**
 * foldOf returns the fold that holds a note.
 * @param folds - The folds of the text.
 * @param note - The note.
 */
export const foldOf = (folds: readonly Fold[], note: Note): Fold | undefined => folds.find((fold) => fold.notes.includes(note));

/** Header is the front matter of one answer, which folds into its first line, the rendered header of the answer. */
export interface Header {
  /** start is the index of the line of the opening `---`. */
  start: number;
  /** end is the index of the line of the closing `---`. */
  end: number;
  /** text is the rendered header: the author and the date of the answer. */
  text: string;
  /** key tells the header apart from the other headers of the text, also after lines before it changed. */
  key: string;
}

/**
 * headerText returns the rendered header of an answer: its author and its date, for example `hannes · 2026-10-28 10:15`.
 * @param answer - The answer.
 */
export const headerText = (answer: Answer): string => [answer.author, answer.date && displayDate(answer.date)].filter(Boolean).join(' · ') || 'Note';

/**
 * headersOf returns the front matters of the answers of the notes of a text. A note that holds another comment has
 * none, because its answers are uncertain.
 * @param notes - The notes of the text, in the order of the text.
 */
export function headersOf(notes: readonly Note[]): Header[] {
  const seen = new Map<string, number>();
  return notes.flatMap((note) =>
    note.nested
      ? []
      : note.answers.flatMap((answer) => {
          const lines = answer.frontMatter?.lines;
          if (!lines || lines.length < 2) {
            return [];
          }
          const content = lines.join('\n');
          const count = (seen.get(content) ?? 0) + 1;
          seen.set(content, count);
          const start = note.start.line + answer.start;
          return [{ start, end: start + lines.length - 1, text: headerText(answer), key: `${content}#${count}` }];
        }),
  );
}
