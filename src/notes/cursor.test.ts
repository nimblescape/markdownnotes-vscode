// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the cursor at the hidden markers of the selections
 * (R-NOTE-006) and at the header lines (R-TEXT-007): the step over a marker
 * and over markers that follow each other, the lines where the cursor does
 * not stay, and the part of the text that Backspace and Delete, also for a
 * word, delete next to a marker, without a part of a marker or of a header
 * line.
 */

import { describe, expect, test } from 'vitest';
import { across, deletion, locksLine, offLines, outside, type Span, spansOf } from './cursor';
import { findNotes } from './notes';

/** text is a line with the start marker of a note (columns 4 to 20) and its reference (columns 25 to 37). */
const text = ['One <!--[note-aaaa-->two [^note-aaaa]', '', '[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00', '', '    Body.', ''];

/** spans are the places of the markers of the text. */
const spans: Span[] = spansOf(findNotes(text)[0].selection!.markers);

/**
 * at returns a position.
 * @param line - The line.
 * @param character - The column.
 */
const at = (line: number, character: number) => ({ line, character });

describe('the cursor', () => {
  test('knows the places of the start marker and the reference', () => {
    expect(spans).toEqual([
      { line: 0, start: 4, end: 21 },
      { line: 0, start: 25, end: 37 },
    ]);
  });

  test('steps across markers that follow each other directly', () => {
    const chain: Span[] = [
      { line: 0, start: 2, end: 5 },
      { line: 0, start: 5, end: 9 },
    ];
    expect(across(chain, 0, 2, 'right')).toBe(9);
    expect(across(chain, 0, 9, 'left')).toBe(2);
    expect(across(chain, 0, 1, 'right')).toBe(1);
    expect(across(chain, 1, 2, 'right')).toBe(2);
  });

  test('inside a marker goes to its edge in the direction of the move, or to the nearer edge after a click', () => {
    expect(outside(spans, at(0, 5), at(0, 4))).toEqual(at(0, 21));
    expect(outside(spans, at(0, 20), at(0, 21))).toEqual(at(0, 4));
    expect(outside(spans, at(0, 6))).toEqual(at(0, 4));
    expect(outside(spans, at(0, 18), at(3, 0))).toEqual(at(0, 21));
    expect(outside(spans, at(0, 22), at(0, 21))).toEqual(at(0, 22));
  });

  test('does not stay on a blocked line, and goes below after a move down and above after a move up', () => {
    const blocked = new Set([2]);
    expect(offLines(blocked, text, at(2, 5), at(1, 0))).toEqual(at(3, 0));
    expect(offLines(blocked, text, at(2, 5))).toEqual(at(3, 0));
    expect(offLines(blocked, text, at(2, 5), at(4, 0))).toEqual(at(1, 0));
    expect(offLines(new Set([4, 5]), text, at(4, 1), at(3, 0))).toEqual(at(3, 0));
    expect(offLines(blocked, text, at(1, 0))).toEqual(at(1, 0));
  });
});

describe('Backspace and Delete', () => {
  test('next to a marker delete the character on the other side of it', () => {
    expect(deletion(text, spans, at(0, 21), 'left', false)).toEqual({ start: at(0, 3), end: at(0, 4) });
    expect(deletion(text, spans, at(0, 4), 'right', false)).toEqual({ start: at(0, 21), end: at(0, 22) });
    // A key that is not next to a marker does what it always does.
    expect(deletion(text, spans, at(0, 2), 'left', false)).toBeUndefined();
  });

  test('for a word delete the word and the spaces before it, never a part of another marker', () => {
    expect(deletion(text, spans, at(0, 21), 'left', true)).toEqual({ start: at(0, 0), end: at(0, 4) });
    expect(deletion(text, spans, at(0, 4), 'right', true)).toEqual({ start: at(0, 21), end: at(0, 24) });
    expect(deletion(text, spans, at(0, 37), 'left', true)).toEqual({ start: at(0, 21), end: at(0, 25) });
  });

  test('delete a character of two code units as one', () => {
    const line = ['a😀<!--[note-aaaa-->b[^note-aaaa]', '', '[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00', '', '    Body.'];
    const marks = spansOf(findNotes(line)[0].selection!.markers);
    expect(deletion(line, marks, at(0, 20), 'left', false)).toEqual({ start: at(0, 1), end: at(0, 3) });
  });

  test('at the start or the end of a line delete the line break, but never join a line with a header line', () => {
    const marked = ['Text', '<!--[note-aaaa-->more[^note-aaaa]', '', '[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00', '', '    Body.'];
    // The syntax puts no marker at the start of a line, but the editor does not rely on it.
    const marks: Span[] = [{ line: 1, start: 0, end: 17 }];
    expect(deletion(marked, marks, at(1, 17), 'left', false)).toEqual({ start: at(0, 4), end: at(1, 0) });
    const headers = new Set([3]);
    expect(locksLine(headers, marked, at(4, 0), 'left')).toBe(true);
    expect(locksLine(headers, marked, at(2, 0), 'right')).toBe(true);
    expect(locksLine(headers, marked, at(1, 0), 'right')).toBe(false);
    expect(deletion(marked, marks, at(4, 0), 'left', false, headers)).toEqual({ start: at(4, 0), end: at(4, 0) });
    expect(deletion(marked, marks, at(2, 0), 'right', true, headers)).toEqual({ start: at(2, 0), end: at(2, 0) });
  });
});
