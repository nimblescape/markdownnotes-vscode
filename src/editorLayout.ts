// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The place of a passage in the text editor, which the side view needs for the start of the funnel of the selected
 * note ([R-SIDE-007](../docs/requirements.md#r-side-007); decision 12 of Hannes, 2026-10-28: "the funnel shall stick
 * to the position of the selected item so when the text scrolls it directs to the selected item"). The API of VS Code
 * gives no pixels of a text editor, only its visible ranges: from the first to the last row that the editor shows
 * completely, also inside a wrapped line, with one range for each part between folds. The module counts the rows of
 * these ranges, so that the place is exact without wrapped lines, apart from the part of a row that the editor
 * scrolled out at the top. The editor wraps a line at its width by default, which the API does not give either: the
 * module wraps the lines by words, as the editor does with the text of the document, also with the characters of the
 * hidden markers, and finds the number of columns for which the rows of the visible text fill the height of the
 * editor, so that the place of a wrapped line is an estimate. The module uses no API of VS Code.
 */

import { hiddenText, visibleWidth } from './format/format';

/** Position is a place in a text: the index of its line and of its character in the line, from 0. */
export interface Position {
  line: number;
  character: number;
}

/** Span is a part of a text from its start to its end. */
export interface Span {
  start: Position;
  end: Position;
}

/** EditorLayout is what the extension knows of the layout of a text editor. */
export interface EditorLayout {
  /** ranges are the visible ranges of the editor, in the order of the text. */
  ranges: readonly Span[];
  /** lineHeight is the height of a row in pixels. */
  lineHeight: number;
  /** top is the top of the text of the editor in pixels from the top of the side view. */
  top: number;
  /** height is the height of the text of the editor in pixels, an estimate from the height of the side view. */
  height: number;
  /**
   * wrap is the column at which the editor wraps its lines: Infinity when it does not wrap them, undefined when it
   * wraps them at its width.
   */
  wrap: number | undefined;
  /** bound is the largest column of a row while the editor wraps at its width, for the setting `bounded`. */
  bound?: number;
  /** lineCount is the number of lines of the text. */
  lineCount: number;
}

/** fallbackColumns is the number of columns of an editor that wraps at its width when the visible text gives none. */
export const fallbackColumns = 100;

/** pieces matches the words of a line, each with the spaces after it, and the spaces at the start of the line. */
const pieces = /\S+\s*|\s+/g;

/**
 * widthOf returns the width of a text in columns for the wrapping of the text editor. The editor wraps the text of the
 * document, so the hidden start markers and references of the notes take their characters, although they do not show.
 * @param text - The text.
 */
const widthOf = (text: string): number => visibleWidth(text) + (text.match(hiddenText) ?? []).reduce((sum, hidden) => sum + hidden.length, 0);

/**
 * rowStarts returns the characters at which the rows of a line start when the editor wraps it at a number of columns:
 * the editor breaks a row before a word that no longer fits, and inside a word that is longer than a row, and a
 * wrapped row has the indentation of the line, as with the default of the setting `editor.wrappingIndent`. The hidden
 * start markers and references take their characters.
 * @param text - The text of the line.
 * @param columns - The number of columns of a row, or Infinity.
 */
export function rowStarts(text: string, columns: number): number[] {
  const starts = [0];
  if (!Number.isFinite(columns)) {
    return starts;
  }
  const leading = widthOf(/^\s*/.exec(text)![0]);
  const indent = leading < columns / 2 ? leading : 0;
  let used = 0;
  for (const match of text.matchAll(pieces)) {
    const word = match[0].trimEnd();
    let width = widthOf(word);
    let index = match.index;
    if (used > indent && used + width > columns) {
      starts.push(index);
      used = indent;
    }
    // A word longer than a row fills rows of its own.
    while (used + width > columns && width > 0) {
      const room = Math.max(columns - used, 1);
      let taken = 0;
      let next = index;
      while (next < index + word.length && taken < room) {
        taken += widthOf(word.slice(next - match.index, next - match.index + 1));
        next += 1;
      }
      starts.push(next);
      width -= taken;
      index = next;
      used = indent;
    }
    used += width + widthOf(match[0].slice(word.length));
  }
  return starts;
}

/**
 * rowOf returns the index of the row of a line that holds a character, from the starts of its rows.
 * @param starts - The characters at which the rows start.
 * @param character - The character.
 */
const rowOf = (starts: readonly number[], character: number): number => {
  let row = 0;
  while (row + 1 < starts.length && starts[row + 1] <= character) {
    row += 1;
  }
  return row;
};

/** VisibleLine is a line of a visible range: its index, the starts of its rows, and its first and last visible row. */
interface VisibleLine {
  line: number;
  starts: number[];
  first: number;
  last: number;
}

/**
 * visibleLines returns the lines of the visible ranges with their rows at a number of columns.
 * @param layout - The layout.
 * @param lineAt - Returns the text of a line.
 * @param columns - The number of columns of a row.
 */
function visibleLines(layout: EditorLayout, lineAt: (line: number) => string, columns: number): VisibleLine[] {
  const lines: VisibleLine[] = [];
  for (const { start, end } of layout.ranges) {
    for (let line = start.line; line <= end.line; line++) {
      const starts = rowStarts(lineAt(line), columns);
      const first = line === start.line ? rowOf(starts, start.character) : 0;
      // The end of a range is the end of its last visible row, which is the start of the next row.
      const last = line === end.line ? Math.max(rowOf(starts, Math.max(end.character - 1, 0)), first) : starts.length - 1;
      lines.push({ line, starts, first, last });
    }
  }
  return lines;
}

/**
 * countOf returns the number of rows of visible lines.
 * @param lines - The visible lines.
 */
const countOf = (lines: readonly VisibleLine[]): number => lines.reduce((sum, line) => sum + line.last - line.first + 1, 0);

/**
 * columnsOf returns the number of columns of a row of the editor: the column of the setting, Infinity when the editor
 * does not wrap, and else the smallest number for which the rows of the visible text fit into the height of the editor.
 * While the end of the text is visible, the rows need not fill the editor, so the number is the earlier estimate.
 * @param layout - The layout.
 * @param lineAt - Returns the text of a line.
 * @param earlier - The earlier estimate of the editor, or undefined.
 */
export function columnsOf(layout: EditorLayout, lineAt: (line: number) => string, earlier: number | undefined): number {
  if (layout.wrap !== undefined) {
    return layout.wrap;
  }
  const bounded = (columns: number): number => Math.min(columns, layout.bound ?? Infinity);
  const last = layout.ranges.at(-1);
  if (!last || (last.end.line >= layout.lineCount - 1 && last.end.character >= lineAt(last.end.line).length)) {
    return bounded(earlier ?? fallbackColumns);
  }
  const rows = Math.max(Math.floor(layout.height / layout.lineHeight), 1);
  const count = (columns: number): number => countOf(visibleLines(layout, lineAt, columns));
  // More lines than rows: the estimate of the height is too small, and no line wraps.
  if (count(Infinity) > rows) {
    return bounded(Infinity);
  }
  let widest = 1;
  for (const { start, end } of layout.ranges) {
    for (let line = start.line; line <= end.line; line++) {
      widest = Math.max(widest, widthOf(lineAt(line)) + 1);
    }
  }
  let low = 2;
  let high = widest;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (count(middle) <= rows) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }
  return bounded(low);
}

/** Row is the row of a position among the rows that the editor shows, or the side of the rows where it lies. */
type Row = number | 'above' | 'below';

/**
 * rowAt returns the row of a position: its index from the top of the editor, or the side where it lies outside the
 * visible rows. A position in a fold is on the row of the fold.
 * @param lines - The visible lines.
 * @param position - The position.
 * @param end - Whether the position ends a passage, so that its row is the row of the character before it.
 */
function rowAt(lines: readonly VisibleLine[], position: Position, end: boolean): Row {
  let row = 0;
  for (const [index, line] of lines.entries()) {
    if (position.line < line.line) {
      return index === 0 ? 'above' : row - 1;
    }
    if (position.line === line.line) {
      const at = rowOf(line.starts, end ? Math.max(position.character - 1, 0) : position.character);
      if (at < line.first) {
        return index === 0 ? 'above' : row;
      }
      if (at > line.last) {
        return index === lines.length - 1 ? 'below' : row + line.last - line.first;
      }
      return row + at - line.first;
    }
    row += line.last - line.first + 1;
  }
  return 'below';
}

/**
 * placeOf returns the top and the bottom of the rows of a passage in pixels from the top of the side view, cut to the
 * rows that the editor shows, or undefined when the editor shows no row of it. Below the top of a text that the editor
 * scrolled, the first visible row starts half of the free height of the editor lower, as an estimate.
 * @param layout - The layout.
 * @param lineAt - Returns the text of a line.
 * @param columns - The number of columns of a row, from columnsOf.
 * @param passage - The passage.
 */
export function placeOf(layout: EditorLayout, lineAt: (line: number) => string, columns: number, passage: Span): [number, number] | undefined {
  const lines = visibleLines(layout, lineAt, columns);
  const point = passage.start.line === passage.end.line && passage.start.character === passage.end.character;
  const first = rowAt(lines, passage.start, false);
  const last = rowAt(lines, passage.end, !point);
  if (first === 'below' || last === 'above') {
    return undefined;
  }
  const start = layout.ranges[0]?.start;
  const scrolled = start !== undefined && (start.line > 0 || start.character > 0);
  const free = layout.height - countOf(lines) * layout.lineHeight;
  const top = layout.top + (scrolled && free > 0 ? Math.min(free, layout.lineHeight) / 2 : 0);
  const bottom = layout.top + layout.height;
  const from = first === 'above' ? layout.top : Math.min(top + first * layout.lineHeight, bottom);
  const to = last === 'below' ? bottom : Math.min(top + (last + 1) * layout.lineHeight, bottom);
  return from < to ? [from, to] : undefined;
}
