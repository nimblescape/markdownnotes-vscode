// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the folds of the collapsed notes (R-TEXT-005): which line stays visible, and which lines the fold
 * takes, so that a collapsed note vanishes without a paragraph break. They also check the header lines of the answers,
 * which show as rendered lines (R-TEXT-007). The tests run in the zone Europe/Vienna (vitest.config.mts).
 */

import { describe, expect, test } from 'vitest';
import { doctypeLines } from './doctype';
import { foldsOf, headersOf, isText } from './folds';
import { findNotes } from './notes';

/**
 * folds returns the first and the last line of each fold of a text, and whether the fold hides its first line.
 * @param text - The Markdown text.
 */
const folds = (text: string) => {
  const lines = text.split('\n');
  return foldsOf(lines, findNotes(lines)).map(({ start, end, notes, hidesFirst }) => ({ start, end, notes: notes.length, hidesFirst }));
};

/** header is the header of a first answer. */
const header = '**hannes** · 2026-10-28 10:15+01:00';

describe('the folds of the notes', () => {
  test('a note after a paragraph folds into the last line of the paragraph and keeps the blank lines after it', () => {
    expect(folds(`One[^note-aaaa]\ntwo.\n\n[^note-aaaa]: ${header}\n\n    A\n\nNext.\n`)).toEqual([{ start: 1, end: 5, notes: 1, hidesFirst: false }]);
    expect(folds(`Text[^note-aaaa].\n\n[^note-aaaa]: ${header}\n\n    A\n`)).toEqual([{ start: 0, end: 4, notes: 1, hidesFirst: false }]);
  });

  test('after a line where a fold of the Markdown extension starts, the fold starts on the first blank line, or on the note', () => {
    expect(folds(`- Item[^note-aaaa]\n\n[^note-aaaa]: ${header}\n\n    A\n\nNext.\n`)).toEqual([{ start: 1, end: 5, notes: 1, hidesFirst: false }]);
    expect(folds(`# Title[^note-aaaa]\n[^note-aaaa]: ${header}\n\nNext.`)).toEqual([{ start: 1, end: 2, notes: 1, hidesFirst: true }]);
    expect(folds(`[^note-aaaa]: ${header}\n\n    A\n\n\nText[^note-aaaa].\n`)).toEqual([{ start: 0, end: 4, notes: 1, hidesFirst: true }]);
  });

  test('notes with only blank lines between them share one fold, which takes all answers', () => {
    const text = [
      'One[^note-aaaa] two[^note-bbbb].',
      '',
      `[^note-aaaa]: ${header}`,
      '',
      '    A',
      '',
      `[^note-bbbb]: ${header}`,
      '',
      '    B',
      '',
      '    > **anna** · 2026-10-28 11:02+01:00',
      '    >',
      '    > C',
      '',
      'Next.',
    ].join('\n');
    expect(folds(text)).toEqual([{ start: 0, end: 12, notes: 2, hidesFirst: false }]);
  });

  test('the comment of the format of the notes folds into its first line, before the folds of the notes (R-NOTE-007)', () => {
    const text = [...doctypeLines, '', 'Text[^note-aaaa].', '', '[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00', '', '    Body.', ''];
    const end = doctypeLines.length - 1;
    expect(foldsOf(text, findNotes(text)).map(({ start, end: last, notes }) => [start, last, notes.length])).toEqual([
      [0, end, 0],
      [end + 2, end + 6, 1],
    ]);
  });

  test('a line of text is no heading, list item, block quote, fence, table row, thematic break, HTML or definition of a footnote', () => {
    for (const line of ['Text', '  continued text', '*emphasis*', '2025; Singla et al., 2025).', 'Text[^note-aaaa].']) {
      expect(isText(line), line).toBe(true);
    }
    for (const line of ['', '  ', '# Title', '- item', '* item', '1. item', '2) item', '> quote', '```js', '~~~', '| a |', '---', '***', '===', '<div>', '[^note-aaaa]: x', '  [^1]: x']) {
      expect(isText(line), line).toBe(false);
    }
  });
});

describe('the header lines', () => {
  test('each answer has a header line with the author and the date in the local time of the reader', () => {
    const lines = ['Text[^note-aaaa].', '', `[^note-aaaa]: ${header}`, '', '    A', '', '    > **anna** · 2026-10-28 10:02Z', '    >', '    > B'];
    expect(headersOf(lines, findNotes(lines))).toEqual([
      { line: 2, start: 0, end: 49, text: 'hannes · 2026-10-28 10:15', date: '2026-10-28 10:15+01:00' },
      { line: 6, start: 6, end: 34, text: 'anna · 2026-10-28 11:02', date: '2026-10-28 10:02Z' },
    ]);
  });
});
