// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the places of the highlights in the text editor, at which the side view puts their threads
 * (R-SIDE-007, decision 14): the rows of the visible ranges, also between folds and inside a wrapped line, the number
 * of columns that the visible text gives, and the rows above and below the visible rows without the hidden lines.
 */

import { describe, expect, test } from 'vitest';
import { columnsOf, type EditorLayout, fallbackColumns, placesOf, rowStarts, type Span } from './editorLayout';

/**
 * span returns a span from the line and the character of its start to those of its end.
 * @param startLine - The line of the start.
 * @param startCharacter - The character of the start.
 * @param endLine - The line of the end.
 * @param endCharacter - The character of the end.
 */
const span = (startLine: number, startCharacter: number, endLine: number, endCharacter: number): Span => ({
  start: { line: startLine, character: startCharacter },
  end: { line: endLine, character: endCharacter },
});

/**
 * layoutOf returns the layout of an editor of rows of 20 pixels, with the text 10 pixels below the top of the view.
 * @param ranges - The visible ranges.
 * @param lineCount - The number of lines of the text.
 * @param changes - Other values of the layout.
 */
const layoutOf = (ranges: Span[], lineCount: number, changes: Partial<EditorLayout> = {}): EditorLayout => ({
  ranges,
  lineHeight: 20,
  top: 10,
  height: 200,
  wrap: Infinity,
  lineCount,
  ...changes,
});

/**
 * placeOf returns the place of one highlight, without hidden lines outside the visible ranges.
 * @param layout - The layout.
 * @param lineAt - Returns the text of a line.
 * @param columns - The number of columns of a row.
 * @param highlight - The highlight.
 * @param hidden - The hidden lines.
 */
const placeOf = (layout: EditorLayout, lineAt: (line: number) => string, columns: number, highlight: Span, hidden: readonly number[] = []) =>
  placesOf(layout, lineAt, columns, [highlight], (line) => hidden.includes(line))[0];

/** short holds 30 lines of 10 characters. */
const short = Array.from({ length: 30 }, (_, index) => `line ${String(index).padStart(5, '0')}`);
const shortAt = (line: number): string => short[line];

describe('the rows without wrapped lines', () => {
  test('give the place of each line from the first visible line', () => {
    const layout = layoutOf([span(5, 0, 14, 10)], 30);
    expect(placeOf(layout, shortAt, Infinity, span(5, 2, 5, 8))).toEqual([10, 30]);
    expect(placeOf(layout, shortAt, Infinity, span(7, 0, 8, 4))).toEqual([50, 90]);
  });

  test('skip the lines of a fold, and place a highlight in a fold on the row of the fold', () => {
    const layout = layoutOf([span(0, 0, 2, 10), span(9, 0, 15, 10)], 30);
    // Line 9 is the fourth row: lines 3 to 8 are in the fold of line 2.
    expect(placeOf(layout, shortAt, Infinity, span(9, 0, 9, 4))).toEqual([70, 90]);
    expect(placeOf(layout, shortAt, Infinity, span(5, 0, 5, 4))).toEqual([50, 70]);
  });

  test('count the rows above and below the visible rows for a highlight outside them, without the hidden lines', () => {
    const layout = layoutOf([span(5, 0, 14, 10)], 30);
    expect(placeOf(layout, shortAt, Infinity, span(2, 0, 6, 4))).toEqual([-50, 50]);
    expect(placeOf(layout, shortAt, Infinity, span(13, 0, 20, 4))).toEqual([170, 330]);
    expect(placeOf(layout, shortAt, Infinity, span(1, 0, 3, 4))).toEqual([-70, -10]);
    expect(placeOf(layout, shortAt, Infinity, span(16, 0, 18, 4))).toEqual([230, 290]);
    // The lines of collapsed notes take no row.
    expect(placeOf(layout, shortAt, Infinity, span(18, 0, 18, 4), [16, 17])).toEqual([230, 250]);
    expect(placeOf(layout, shortAt, Infinity, span(1, 0, 1, 4), [3, 4])).toEqual([-30, -10]);
  });

  test('give no place without visible ranges, and the row of its place to a point', () => {
    expect(placeOf(layoutOf([], 30), shortAt, Infinity, span(2, 0, 2, 4))).toBeUndefined();
    expect(placeOf(layoutOf([span(5, 0, 14, 10)], 30), shortAt, Infinity, span(7, 10, 7, 10))).toEqual([50, 70]);
  });
});

/** long holds lines of 250 characters and empty lines, one after the other. */
const long = Array.from({ length: 40 }, (_, index) => (index % 2 === 0 ? 'x'.repeat(250) : ''));
const longAt = (line: number): string => long[line];

describe('the rows of wrapped lines', () => {
  test('count the rows of each line with the columns of the editor', () => {
    // At 100 columns, each long line has three rows: line 2 starts at the fifth row.
    const layout = layoutOf([span(0, 0, 4, 100)], 40, { wrap: 100 });
    expect(placeOf(layout, longAt, 100, span(2, 0, 2, 10))).toEqual([90, 110]);
    // The highlight from character 120 to 230 of line 2 takes its second and third row.
    expect(placeOf(layout, longAt, 100, span(2, 120, 2, 230))).toEqual([110, 150]);
  });

  test('start at the first visible row inside a wrapped line, half of the free height lower', () => {
    // The editor shows line 0 from character 100, its second row; its eight rows leave 40 pixels free.
    const layout = layoutOf([span(0, 100, 4, 100)], 40, { wrap: 100 });
    expect(placeOf(layout, longAt, 100, span(0, 150, 0, 160))).toEqual([20, 40]);
    expect(placeOf(layout, longAt, 100, span(2, 0, 2, 10))).toEqual([80, 100]);
    // The first row of line 0 is above the visible rows.
    expect(placeOf(layout, longAt, 100, span(0, 10, 0, 50))).toEqual([0, 20]);
    // Below the visible rows, line 4 has two more rows, and line 6 starts after the row of line 5.
    expect(placeOf(layout, longAt, 100, span(6, 0, 6, 10))).toEqual([240, 260]);
  });

  test('break a row before a word that no longer fits, inside a word longer than a row, and keep the indentation', () => {
    expect(rowStarts('aaa bbb ccc', 7)).toEqual([0, 8]);
    expect(rowStarts('    aaa bbb ccc', 10)).toEqual([0, 8, 12]);
    expect(rowStarts('abcdefghij', 4)).toEqual([0, 4, 8]);
    expect(rowStarts('aaa bbb ccc', Infinity)).toEqual([0]);
    // The editor wraps the text of the document: the hidden start marker takes its characters.
    expect(rowStarts('aaa <!--[note-aaaa-->bbb ccc', 24)).toEqual([0, 25]);
    expect(rowStarts('aaa <!--[note-aaaa-->bbb ccc', 20)).toEqual([0, 4, 25]);
  });

  test('find the columns at which the visible text fills the height of the editor', () => {
    // 13 rows of 20 pixels: lines 0 to 5 at 100 columns have 3 + 1 + 3 + 1 + 3 + 1 rows, and line 6 its first row.
    const layout = layoutOf([span(0, 0, 6, 100)], 40, { wrap: undefined, height: 260 });
    expect(columnsOf(layout, longAt, undefined)).toBe(100);
    expect(columnsOf({ ...layout, bound: 80 }, longAt, undefined)).toBe(80);
  });

  test('keep the earlier columns while the end of the text is visible', () => {
    const end = layoutOf([span(30, 0, 39, 0)], 40, { wrap: undefined });
    expect(columnsOf(end, longAt, 120)).toBe(120);
    expect(columnsOf(end, longAt, undefined)).toBe(fallbackColumns);
  });

  test('give no wrap when more lines show than the height has rows, and the column of the setting', () => {
    expect(columnsOf(layoutOf([span(0, 0, 20, 0)], 30, { wrap: undefined }), shortAt, undefined)).toBe(Infinity);
    expect(columnsOf(layoutOf([span(0, 0, 4, 0)], 40, { wrap: 80 }), longAt, undefined)).toBe(80);
  });

  test('count the characters of the hidden markers and references of the notes, as the editor wraps them', () => {
    const text = ['<!--[note-aaaa-->' + 'y'.repeat(80) + '[^note-aaaa]', 'next'];
    const layout = layoutOf([span(0, 0, 1, 4)], 2, { wrap: 100 });
    expect(placeOf(layout, (line) => text[line], 100, span(1, 0, 1, 4))).toEqual([50, 70]);
  });
});
