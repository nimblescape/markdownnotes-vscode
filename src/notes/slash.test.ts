// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the text of the slash commands of the text editor
 * (R-EDIT-008): the typed command, the sentence that `/todo` highlights, the
 * date and the time. The footnote of `/footnote` (R-FOOT-003) is in
 * footnotes.test.ts.
 */

import { describe, expect, test } from 'vitest';
import { dateText, sentenceBefore, timeText, typedAt } from './slash';

/**
 * sentence returns the text of the sentence before the end of a line, or undefined.
 * @param lines - The lines of the text.
 * @param line - The line of the position.
 * @param character - The column of the position, else the end of the line.
 */
const sentence = (lines: string[], line = lines.length - 1, character = lines[line].length): string | undefined => {
  const range = sentenceBefore(lines, { line, character });
  if (!range) {
    return undefined;
  }
  const text = lines.slice(range.start.line, range.end.line + 1);
  text[text.length - 1] = text[text.length - 1].slice(0, range.end.character);
  text[0] = text[0].slice(range.start.character);
  return text.join('\n');
};

describe('typedAt', () => {
  test('a slash at the start of a line or after a space, with the small letters after it, is a typed command', () => {
    expect(typedAt('Fix it /to', 10)).toEqual({ slash: 7, start: 6, word: 'to' });
    expect(typedAt('Fix it   /', 10)).toEqual({ slash: 9, start: 6, word: '' });
    expect(typedAt('a /todo b', 7)).toEqual({ slash: 2, start: 1, word: 'todo' });
    expect(typedAt('/da', 3)).toEqual({ slash: 0, start: 0, word: 'da' });
    // The spaces at the start of a line indent it, and stay.
    expect(typedAt('  /', 3)).toEqual({ slash: 2, start: 2, word: '' });
    expect(typedAt('and/or', 4)).toBeUndefined();
    expect(typedAt('see /To', 7)).toBeUndefined();
    expect(typedAt('see /to more', 12)).toBeUndefined();
  });
});

describe('sentenceBefore', () => {
  test('the sentence before the position starts after the end of the sentence before it, or at the start of the block', () => {
    expect(sentence(['Fix the bug. Write the tests /todo'], 0, 28)).toBe('Write the tests');
    expect(sentence(['Write the tests'])).toBe('Write the tests');
    expect(sentence(['One! Two? Three.'])).toBe('Three.');
    expect(sentence(['He said “Go.” Then he went.  '])).toBe('Then he went.');
    expect(sentence(['A source.[^1] The next one'])).toBe('The next one');
    expect(sentence(['Version 1.5 is out'])).toBe('Version 1.5 is out');
  });

  test('a sentence goes over the lines of its paragraph, and never into the block before it', () => {
    expect(sentence(['First sentence. Second', 'goes on here'])).toBe('Second\ngoes on here');
    expect(sentence(['First sentence.', 'Second one'])).toBe('Second one');
    expect(sentence(['First sentence.   ', '', 'Second one'])).toBe('Second one');
    expect(sentence(['# Title', 'The text'])).toBe('The text');
  });

  test('the block starts after the marker of a list item, a heading or a quote', () => {
    expect(sentence(['- Item one. Item two'])).toBe('Item two');
    expect(sentence(['- Only item'])).toBe('Only item');
    expect(sentence(['# Title here'])).toBe('Title here');
    expect(sentence(['> A quote'])).toBe('A quote');
  });

  test('outside a block of text, and without text before the position, there is no sentence', () => {
    expect(sentence([''], 0, 0)).toBeUndefined();
    expect(sentence(['```', 'code', '```'], 1)).toBeUndefined();
    expect(sentence(['Text', '', 'More'], 2, 0)).toBeUndefined();
  });
});

describe('the date and the time', () => {
  test('/date writes the local date and /time the local date and time in minutes', () => {
    const now = new Date(2026, 9, 29, 9, 5, 42);
    expect(dateText(now)).toBe('2026-10-29');
    expect(timeText(now)).toBe('2026-10-29 09:05');
    expect(timeText(new Date(2026, 0, 2, 19, 29))).toBe('2026-01-02 19:29');
  });
});
