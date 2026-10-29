// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the text of the slash commands of the text editor
 * (R-EDIT-008): the typed command, the sentence that `/todo` highlights, the
 * date and the time, and the label and the definition of the footnote of
 * `/footnote` (R-FOOT-003), with the places where its reference can stand.
 */

import { describe, expect, test } from 'vitest';
import { referenceAllowed } from './edits';
import { dateText, footnoteDefinition, nextFootnoteLabel, sentenceBefore, timeText, typedAt } from './slash';

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

describe('the footnote of /footnote', () => {
  test('the label is the next free number (R-FOOT-003)', () => {
    expect(nextFootnoteLabel(['Text[^1] and[^3] and[^note-7k2q].', '', '[^own]: x'])).toBe('4');
    expect(nextFootnoteLabel(['No footnote.'])).toBe('1');
  });

  test('the definition goes after the last definition of a standard footnote, or at the end of the text, with a blank line before it', () => {
    expect(footnoteDefinition(['# T', '', 'Text[^1].', ''], '1')).toEqual({ at: { line: 2, character: 9 }, text: '\n\n[^1]: ', cursor: { line: 4, character: 6 } });
    expect(footnoteDefinition(['Text[^2] more.', '', '[^1]: One.', '', '    Second paragraph.', '', 'Later text.'], '2')).toEqual({
      at: { line: 4, character: 21 },
      text: '\n\n[^2]: ',
      cursor: { line: 6, character: 6 },
    });
    // A line right after the definition goes on with it, and the text after the place keeps its blank line.
    expect(footnoteDefinition(['[^1]: One.', 'lazy line', 'Text.'], '2')).toEqual({ at: { line: 2, character: 5 }, text: '\n\n[^2]: ', cursor: { line: 4, character: 6 } });
    expect(footnoteDefinition(['[^1]: One.', '', 'Text[^2].'], '2')).toEqual({ at: { line: 0, character: 10 }, text: '\n\n[^2]: ', cursor: { line: 2, character: 6 } });
    // The definition of a note is no standard footnote.
    expect(footnoteDefinition(['Text[^1].', '', '[^note-7k2q]: **a** · 2026-10-28 10:15Z', '', '    x'], '1')).toEqual({ at: { line: 4, character: 5 }, text: '\n\n[^1]: ', cursor: { line: 6, character: 6 } });
    expect(footnoteDefinition([''], '1')).toEqual({ at: { line: 0, character: 0 }, text: '[^1]: ', cursor: { line: 0, character: 6 } });
  });

  test('a reference stands in the text of a block, and not in a code span, a code block, a link or a marker of a note', () => {
    const line = 'Text with `code` and [a link](x) here.';
    expect(referenceAllowed([line], { line: 0, character: 9 })).toBe(true);
    expect(referenceAllowed([line], { line: 0, character: line.length })).toBe(true);
    expect(referenceAllowed([line], { line: 0, character: 12 })).toBe(false);
    expect(referenceAllowed([line], { line: 0, character: 24 })).toBe(false);
    expect(referenceAllowed(['```', 'code', '```'], { line: 1, character: 2 })).toBe(false);
    expect(referenceAllowed([''], { line: 0, character: 0 })).toBe(false);
    const note = ['The <wbr><!--[note-7k2q-->text[^note-7k2q].', '', '[^note-7k2q]: **a** · 2026-10-28 10:15Z', '', '    x'];
    expect(referenceAllowed(note, { line: 0, character: 12 })).toBe(false);
    expect(referenceAllowed(note, { line: 0, character: 33 })).toBe(false);
    expect(referenceAllowed(note, { line: 0, character: 3 })).toBe(true);
  });
});
