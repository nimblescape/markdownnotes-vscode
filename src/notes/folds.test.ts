// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the folds of the collapsed notes (R-TEXT-005): which line stays visible, and which lines the fold
 * takes, so that a collapsed note vanishes without a paragraph break.
 */

import { describe, expect, test } from 'vitest';
import { foldsOf, isText } from './folds';
import { findNotes } from './notes';

/**
 * folds returns the first and the last line of each fold of a text, and whether the fold hides its first line.
 * @param text - The Markdown text.
 */
const folds = (text: string) => {
  const lines = text.split('\n');
  return foldsOf(lines, findNotes(lines)).map(({ start, end, notes, hidesFirst }) => ({ start, end, notes: notes.length, hidesFirst }));
};

describe('the folds of the notes', () => {
  test('an inline note between two lines of a paragraph folds into the line before it', () => {
    expect(folds('One\n<!-- note inline\nA\n-->\nTwo\n')).toEqual([{ start: 0, end: 3, notes: 1, hidesFirst: false }]);
  });

  test('an inline note between two paragraphs also takes the blank lines around it, so that no paragraph break stays', () => {
    const text = 'Mit Hilfe von Agentic AI.\n\n<!-- note inline\n\n---\ndate: 2026-10-28\nauthor: Claude\n---\n[Shao](x.pdf)\n\n# Text\n-->\n\nAls Folge.\n';
    expect(folds(text)).toEqual([{ start: 0, end: 12, notes: 1, hidesFirst: false }]);
  });

  test('a block note takes the blank lines before it and keeps the blank lines after it', () => {
    expect(folds('One\n\n<!-- note\nA\n-->\n\nTwo\n')).toEqual([{ start: 0, end: 4, notes: 1, hidesFirst: false }]);
    // Before a heading, the fold of an inline note keeps the blank line.
    expect(folds('One\n\n<!-- note inline\nA\n-->\n\n# Two\n')).toEqual([{ start: 0, end: 4, notes: 1, hidesFirst: false }]);
  });

  test('after a line where a fold of the Markdown extension starts, the fold starts on the first blank line, or on the note', () => {
    expect(folds('# Title\n\n<!-- note\nA\n-->\n')).toEqual([{ start: 1, end: 4, notes: 1, hidesFirst: false }]);
    expect(folds('# Title\n<!-- note\nA\n-->\n')).toEqual([{ start: 1, end: 3, notes: 1, hidesFirst: true }]);
    expect(folds('<!-- note\nA\n-->\nText\n')).toEqual([{ start: 0, end: 2, notes: 1, hidesFirst: true }]);
    expect(folds('- item\n<!-- note\nA\n-->\n')).toEqual([{ start: 1, end: 3, notes: 1, hidesFirst: true }]);
  });

  test('a fold that starts on a blank line or on the note takes the blank lines after the note, so that one blank line stays', () => {
    expect(folds('# Title\n\n<!-- note\nA\n-->\n\nText\n')).toEqual([{ start: 1, end: 5, notes: 1, hidesFirst: false }]);
    expect(folds('<!-- note\nA\n-->\n\n\nText\n')).toEqual([{ start: 0, end: 4, notes: 1, hidesFirst: true }]);
    expect(folds('- item\n\n<!-- note inline\nA\n-->\n\n## Next\n')).toEqual([{ start: 1, end: 5, notes: 1, hidesFirst: false }]);
  });

  test('notes with only blank lines between them share one fold', () => {
    expect(folds('One\n<!-- note inline\nA\n-->\n\n<!-- note inline\nB\n-->\nTwo\n')).toEqual([{ start: 0, end: 7, notes: 2, hidesFirst: false }]);
  });

  test('a note in the text of a line has no fold, and a text after the end of a note stays visible', () => {
    expect(folds('A sentence <!-- note\nFirst\n--> and more.\n')).toEqual([]);
    expect(folds('One\n<!-- note inline\nA\nB\n-->  and two\n')).toEqual([{ start: 0, end: 3, notes: 1, hidesFirst: false }]);
  });

  test('a line of text is no heading, list item, block quote, fence, table row, thematic break, HTML or end of a comment', () => {
    for (const line of ['Text', '  continued text', '*emphasis*', '2025; Singla et al., 2025).']) {
      expect(isText(line), line).toBe(true);
    }
    for (const line of ['', '  ', '# Title', '- item', '* item', '1. item', '2) item', '> quote', '```js', '~~~', '| a |', '---', '***', '===', '<div>', 'x -->']) {
      expect(isText(line), line).toBe(false);
    }
  });
});
