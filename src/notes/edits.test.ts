// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the changes of the Markdown text when a note is saved
 * (R-EDIT-002), added (R-EDIT-003) or deleted (R-EDIT-004), and that a text
 * that a note must not hold never reaches the file (R-NOTE-003).
 */

import { describe, expect, test } from 'vitest';
import { applyEdit, deleteNote, insertNote, replaceBody, withPrefix } from './edits';
import { findNotes } from './notes';

/**
 * lines returns the lines of a text.
 * @param text - The text.
 */
const lines = (text: string): string[] => text.split('\n');

/**
 * after returns the text after the edit of a result, or the problem of the result.
 * @param text - The lines of the text.
 * @param result - The result.
 */
const after = (text: string[], result: ReturnType<typeof replaceBody>): string | object =>
  'edit' in result ? applyEdit(text, result.edit).join('\n') : result.problem;

/**
 * only returns the one note of a text.
 * @param text - The lines of the text.
 */
const only = (text: string[]) => {
  const notes = findNotes(text);
  expect(notes).toHaveLength(1);
  return notes[0];
};

test('withPrefix puts the prefix before each further line, without trailing spaces on an empty line', () => {
  expect(withPrefix('<!-- note\nA\n\nB\n-->', '> ')).toBe('<!-- note\n> A\n>\n> B\n> -->');
});

test('applyEdit replaces the text between two positions', () => {
  expect(applyEdit(['abc', 'def'], { start: { line: 0, character: 1 }, end: { line: 1, character: 2 }, text: 'X\nY' })).toEqual(['aX', 'Yf']);
});

describe('replaceBody', () => {
  test('writes the new body and keeps the front matter with its author and date', () => {
    const text = lines('Text\n\n<!-- note\n---\nauthor: A\ndate: 2026-10-28\n---\nOld text.\n-->\n\nMore.\n');
    expect(after(text, replaceBody(text, only(text), 'New **text**.\n\nSecond paragraph.'))).toBe(
      'Text\n\n<!-- note\n---\nauthor: A\ndate: 2026-10-28\n---\nNew **text**.\n\nSecond paragraph.\n-->\n\nMore.\n',
    );
  });

  test('keeps a note in a block quote and in a list item in its container', () => {
    const quote = lines('> <!-- note\n> Old\n> -->\n');
    expect(after(quote, replaceBody(quote, only(quote), 'One\n\nTwo'))).toBe('> <!-- note\n> One\n>\n> Two\n> -->\n');
    const item = lines('- Item\n\n  <!-- note\n  Old\n  -->\n');
    expect(after(item, replaceBody(item, only(item), 'New'))).toBe('- Item\n\n  <!-- note\n  New\n  -->\n');
  });

  test('writes a note in a paragraph in its place', () => {
    const text = lines('A sentence <!-- note\nOld\n--> and more.\n');
    expect(after(text, replaceBody(text, only(text), 'New text'))).toBe('A sentence <!-- note\nNew text\n--> and more.\n');
  });

  test('refuses a text with another comment, or with the end of a comment (R-NOTE-003)', () => {
    const text = lines('<!-- note\nOld\n-->\n');
    expect(replaceBody(text, only(text), 'A <!-- comment -->')).toEqual({ problem: { kind: 'nested', text: '<!--' } });
    expect(replaceBody(text, only(text), 'An end --> here')).toEqual({ problem: { kind: 'nested', text: '-->' } });
    expect(replaceBody(text, only(text), 'An end --!> here')).toEqual({ problem: { kind: 'nested', text: '--!>' } });
  });

  test('refuses a text that would change the Markdown around a note in a paragraph', () => {
    const text = lines('A sentence <!-- note\nOld\n--> and more.\n');
    expect(replaceBody(text, only(text), 'One\n\nTwo')).toEqual({ problem: { kind: 'structure' } });
  });
});

describe('insertNote', () => {
  test('adds a note after the block of the line, with the fields as front matter', () => {
    const text = lines('# Title\n\nFirst line\nsecond line\n\nLast.\n');
    const result = insertNote(text, 2, 'A **note**.', { author: 'A', date: '2026-10-28T10:15+01:00' });
    expect(result).toMatchObject({ start: { line: 4, character: 0 } });
    expect(after(text, result)).toBe(
      '# Title\n\nFirst line\nsecond line\n<!-- note\n---\nauthor: A\ndate: 2026-10-28T10:15+01:00\n---\nA **note**.\n-->\n\nLast.\n',
    );
    // The paragraph stays one paragraph, and the note is found at its start.
    const changed = lines(after(text, result) as string);
    expect(findNotes(changed)).toMatchObject([{ start: { line: 4, character: 0 }, author: 'A', body: 'A **note**.' }]);
  });

  test('adds a note without a front matter when no field has a value', () => {
    const text = lines('Text\n');
    expect(after(text, insertNote(text, 0, 'Note', { author: undefined, date: '' }))).toBe('Text\n<!-- note\nNote\n-->\n');
  });

  test('adds a note in a block quote and in a list item with the prefix of the block', () => {
    const quote = lines('> Quote\n');
    expect(after(quote, insertNote(quote, 0, 'One\n\nTwo', {}))).toBe('> Quote\n> <!-- note\n> One\n>\n> Two\n> -->\n');
    const item = lines('- Item\n  more\n');
    const result = insertNote(item, 1, 'Note', {});
    expect(result).toMatchObject({ start: { line: 2, character: 2 } });
    expect(after(item, result)).toBe('- Item\n  more\n  <!-- note\n  Note\n  -->\n');
  });

  test('adds a note after the last line of a text without a line break at its end', () => {
    const text = lines('Text');
    const result = insertNote(text, 0, 'Note', {});
    expect(result).toMatchObject({ start: { line: 1, character: 0 } });
    expect(after(text, result)).toBe('Text\n<!-- note\nNote\n-->');
  });

  test('refuses a text with another comment (R-NOTE-003)', () => {
    expect(insertNote(lines('Text\n'), 0, 'A <!-- b', {})).toEqual({ problem: { kind: 'nested', text: '<!--' } });
  });
});

describe('deleteNote', () => {
  test('removes a note on lines of its own with its lines, and keeps one blank line between the blocks around it', () => {
    const text = lines('Text\n\n<!-- note\nA\n-->\n\nMore.\n');
    expect(applyEdit(text, deleteNote(text, only(text))).join('\n')).toBe('Text\n\nMore.\n');
    const close = lines('Text\n<!-- note\nA\n-->\n\nMore.\n');
    expect(applyEdit(close, deleteNote(close, only(close))).join('\n')).toBe('Text\n\nMore.\n');
    const top = lines('<!-- note\nA\n-->\n\nMore.\n');
    expect(applyEdit(top, deleteNote(top, only(top))).join('\n')).toBe('More.\n');
  });

  test('removes a note at the end of a text without a line break, with the line break before it', () => {
    const text = lines('Text\n<!-- note\nA\n-->');
    expect(applyEdit(text, deleteNote(text, only(text))).join('\n')).toBe('Text');
    const alone = lines('<!-- note\nA\n-->');
    expect(applyEdit(alone, deleteNote(alone, only(alone))).join('\n')).toBe('');
  });

  test('removes a note in a block quote with its lines', () => {
    const text = lines('> Quote\n> <!-- note\n> A\n> -->\n');
    expect(applyEdit(text, deleteNote(text, only(text))).join('\n')).toBe('> Quote\n');
  });

  test('removes a note in a paragraph with one space before it', () => {
    const text = lines('A sentence <!-- note\nA\n--> and more.\n');
    expect(applyEdit(text, deleteNote(text, only(text))).join('\n')).toBe('A sentence and more.\n');
    const end = lines('A sentence <!-- note\nA\n-->\n');
    expect(applyEdit(end, deleteNote(end, only(end))).join('\n')).toBe('A sentence\n');
  });
});
