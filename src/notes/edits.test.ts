// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the changes of the Markdown text when an answer is saved
 * (R-EDIT-002), when a note is added (R-EDIT-003), when an answer or a note is
 * deleted (R-EDIT-004), when an answer is added (R-EDIT-005), and that a text
 * that a note must not hold never reaches the file (R-NOTE-003).
 */

import { describe, expect, test } from 'vitest';
import { appendAnswer, applyEdit, deleteAnswer, deleteNote, insertNote, replaceAnswer, type Result, withPrefix } from './edits';
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
const after = (text: string[], result: Result): string | object => ('edit' in result ? applyEdit(text, result.edit).join('\n') : result.problem);

/**
 * only returns the one note of a text.
 * @param text - The lines of the text.
 */
const only = (text: string[]) => {
  const notes = findNotes(text);
  expect(notes).toHaveLength(1);
  return notes[0];
};

/** thread is a Markdown text with a note of two answers. */
const thread = lines('Text\n\n<!-- note\n---\nauthor: A\ndate: 2026-10-28\n---\nFirst.\n\n---\nauthor: B\n---\nSecond.\n-->\n\nMore.\n');

test('withPrefix puts the prefix before each further line, without trailing spaces on an empty line', () => {
  expect(withPrefix('<!-- note\nA\n\nB\n-->', '> ')).toBe('<!-- note\n> A\n>\n> B\n> -->');
});

test('applyEdit replaces the text between two positions', () => {
  expect(applyEdit(['abc', 'def'], { start: { line: 0, character: 1 }, end: { line: 1, character: 2 }, text: 'X\nY' })).toEqual(['aX', 'Yf']);
});

describe('replaceAnswer', () => {
  test('writes the new body and keeps the front matter with its author and date', () => {
    const text = lines('Text\n\n<!-- note\n---\nauthor: A\ndate: 2026-10-28\n---\nOld text.\n-->\n\nMore.\n');
    expect(after(text, replaceAnswer(text, only(text), 0, 'New **text**.\n\nSecond paragraph.'))).toBe(
      'Text\n\n<!-- note\n---\nauthor: A\ndate: 2026-10-28\n---\nNew **text**.\n\nSecond paragraph.\n-->\n\nMore.\n',
    );
  });

  test('changes the lines of one answer of a thread, and keeps the lines of the others', () => {
    expect(after(thread, replaceAnswer(thread, only(thread), 0, 'One'))).toBe(
      'Text\n\n<!-- note\n---\nauthor: A\ndate: 2026-10-28\n---\nOne\n\n---\nauthor: B\n---\nSecond.\n-->\n\nMore.\n',
    );
    expect(after(thread, replaceAnswer(thread, only(thread), 1, 'Two\nlines'))).toBe(
      'Text\n\n<!-- note\n---\nauthor: A\ndate: 2026-10-28\n---\nFirst.\n\n---\nauthor: B\n---\nTwo\nlines\n-->\n\nMore.\n',
    );
  });

  test('keeps a note in a block quote and in a list item in its container', () => {
    const quote = lines('> <!-- note\n> Old\n> -->\n');
    expect(after(quote, replaceAnswer(quote, only(quote), 0, 'One\n\nTwo'))).toBe('> <!-- note\n> One\n>\n> Two\n> -->\n');
    const item = lines('- Item\n\n  <!-- note\n  Old\n  -->\n');
    expect(after(item, replaceAnswer(item, only(item), 0, 'New'))).toBe('- Item\n\n  <!-- note\n  New\n  -->\n');
  });

  test('writes a note in a paragraph and an inline note in their places', () => {
    const text = lines('A sentence <!-- note\nOld\n--> and more.\n');
    expect(after(text, replaceAnswer(text, only(text), 0, 'New text'))).toBe('A sentence <!-- note\nNew text\n--> and more.\n');
    const inline = lines('One\n<!-- note inline\n---\nauthor: A\n---\nOld\n-->\nTwo\n');
    expect(after(inline, replaceAnswer(inline, only(inline), 0, 'New\n\nwith a blank line'))).toBe('One\n<!-- note inline\n---\nauthor: A\n---\nNew\n\nwith a blank line\n-->\nTwo\n');
  });

  test('puts `-->` on a line of its own when the body ended on its line', () => {
    const text = lines('<!-- note\nOld -->\n');
    expect(after(text, replaceAnswer(text, only(text), 0, 'New'))).toBe('<!-- note\nNew\n-->\n');
  });

  test('refuses a text with another comment, or with the end of a comment (R-NOTE-003)', () => {
    const text = lines('<!-- note\nOld\n-->\n');
    expect(replaceAnswer(text, only(text), 0, 'A <!-- comment -->')).toEqual({ problem: { kind: 'nested', text: '<!--' } });
    expect(replaceAnswer(text, only(text), 0, 'An end --> here')).toEqual({ problem: { kind: 'nested', text: '-->' } });
    expect(replaceAnswer(text, only(text), 0, 'An end --!> here')).toEqual({ problem: { kind: 'nested', text: '--!>' } });
  });

  test('refuses a text that would change the Markdown around a note in a paragraph, or start another answer', () => {
    const text = lines('A sentence <!-- note\nOld\n--> and more.\n');
    expect(replaceAnswer(text, only(text), 0, 'One\n\nTwo')).toEqual({ problem: { kind: 'structure' } });
    expect(replaceAnswer(thread, only(thread), 0, 'One\n---\nauthor: C\n---\nTwo')).toEqual({ problem: { kind: 'structure' } });
  });
});

describe('appendAnswer', () => {
  test('adds an answer with its front matter at the end of the thread (R-EDIT-005)', () => {
    expect(after(thread, appendAnswer(thread, only(thread), 'Third.', { author: 'C', date: '2026-10-29T08:00+01:00' }))).toBe(
      'Text\n\n<!-- note\n---\nauthor: A\ndate: 2026-10-28\n---\nFirst.\n\n---\nauthor: B\n---\nSecond.\n---\nauthor: C\ndate: 2026-10-29T08:00+01:00\n---\nThird.\n-->\n\nMore.\n',
    );
    const changed = lines(after(thread, appendAnswer(thread, only(thread), 'Third.', { author: 'C' })) as string);
    expect(only(changed).answers.map((answer) => [answer.author, answer.body])).toEqual([
      ['A', 'First.'],
      ['B', 'Second.'],
      ['C', 'Third.'],
    ]);
  });

  test('adds an answer to an inline note in a block quote, and after a body that ends on the line of `-->`', () => {
    const quote = lines('> One\n> <!-- note inline\n> First\n> -->\n> Two\n');
    expect(after(quote, appendAnswer(quote, only(quote), 'Second', { author: 'B' }))).toBe('> One\n> <!-- note inline\n> First\n> ---\n> author: B\n> ---\n> Second\n> -->\n> Two\n');
    const end = lines('<!-- note\nFirst -->\n');
    expect(after(end, appendAnswer(end, only(end), 'Second', { author: 'B' }))).toBe('<!-- note\nFirst\n---\nauthor: B\n---\nSecond\n-->\n');
  });

  test('refuses a text with another comment, and an answer that a note in the text of a line cannot hold', () => {
    expect(appendAnswer(thread, only(thread), 'A <!-- b', { author: 'C' })).toEqual({ problem: { kind: 'nested', text: '<!--' } });
    // A front matter in a paragraph turns its first line into a heading.
    const text = lines('A sentence <!-- note\nOld\n--> and more.\n');
    expect(appendAnswer(text, only(text), 'New', { author: 'C' })).toEqual({ problem: { kind: 'structure' } });
  });
});

describe('deleteAnswer', () => {
  test('removes one answer of a thread, and keeps the others (R-EDIT-004)', () => {
    expect(after(thread, deleteAnswer(thread, only(thread), 0))).toBe('Text\n\n<!-- note\n---\nauthor: B\n---\nSecond.\n-->\n\nMore.\n');
    expect(after(thread, deleteAnswer(thread, only(thread), 1))).toBe('Text\n\n<!-- note\n---\nauthor: A\ndate: 2026-10-28\n---\nFirst.\n\n-->\n\nMore.\n');
  });

  test('removes the whole note with its only answer', () => {
    const text = lines('Text\n\n<!-- note\nA\n-->\n\nMore.\n');
    expect(after(text, deleteAnswer(text, only(text), 0))).toBe('Text\n\nMore.\n');
  });
});

/**
 * at returns an empty range at a position.
 * @param line - The index of the line.
 * @param character - The index of the character.
 */
const at = (line: number, character = 0) => ({ start: { line, character }, end: { line, character } });

/**
 * span returns a range of a text.
 * @param startLine - The index of the line of the start.
 * @param startCharacter - The index of the character of the start.
 * @param endLine - The index of the line of the end.
 * @param endCharacter - The index of the character after the end.
 */
const span = (startLine: number, startCharacter: number, endLine: number, endCharacter: number) => ({
  start: { line: startLine, character: startCharacter },
  end: { line: endLine, character: endCharacter },
});

/**
 * selected returns the text of the selection of the one note of a text, without the markers in it.
 * @param text - The text.
 */
function selected(text: string): string | undefined {
  const all = lines(text);
  const selection = findNotes(all)[0]?.selection;
  if (!selection) {
    return undefined;
  }
  const { start, end } = selection;
  const part = start.line === end.line ? all[start.line].slice(start.character, end.character) : [all[start.line].slice(start.character), ...all.slice(start.line + 1, end.line), all[end.line].slice(0, end.character)].join('\n');
  return part.replace(/<!--\[?a\d+\]?-->/g, '');
}

describe('insertNote', () => {
  test('marks a point at the end of a line of a paragraph and adds the note after the paragraph, with the fields as front matter (R-NOTE-006)', () => {
    const text = lines('# Title\n\nFirst line\nsecond line\n\nLast.\n');
    const result = insertNote(text, at(2), 'A **note**.', { author: 'A', date: '2026-10-28T10:15+01:00' });
    expect(result).toMatchObject({ start: { line: 4, character: 0 } });
    expect(after(text, result)).toBe(
      '# Title\n\nFirst line<!--[a1]-->\nsecond line\n<!-- note\n---\nauthor: A\ndate: 2026-10-28T10:15+01:00\nselection: a1\n---\nA **note**.\n-->\n\nLast.\n',
    );
    const changed = lines(after(text, result) as string);
    expect(findNotes(changed)).toMatchObject([
      { kind: 'block', start: { line: 4, character: 0 }, answers: [{ author: 'A', body: 'A **note**.' }], selection: { id: 'a1', start: { line: 2, character: 10 }, end: { line: 2, character: 10 } } },
    ]);
  });

  test('marks an exact selection in a line with an opening and a closing marker (R-NOTE-006)', () => {
    const text = lines('The agents change the work of teams in three ways.\n\nNext.\n');
    const result = after(text, insertNote(text, span(0, 11, 0, 35), 'Which?', { author: 'A' }));
    expect(result).toBe('The agents <!--[a1-->change the work of teams<!--a1]--> in three ways.\n<!-- note\n---\nauthor: A\nselection: a1\n---\nWhich?\n-->\n\nNext.\n');
    expect(selected(result as string)).toBe('change the work of teams');
  });

  test('never writes a marker at the start of a line, so that no viewer ends the paragraph there (R-NOTE-006)', () => {
    // At the start of a paragraph, the selection has no opening marker and starts at the start of its block.
    const first = lines('The agents change the work.\n');
    const atStart = after(first, insertNote(first, span(0, 0, 0, 10), 'Who?', {})) as string;
    expect(atStart.split('\n')[0]).toBe('The agents<!--a1]--> change the work.');
    expect(selected(atStart)).toBe('The agents');
    // At the start of a later line, the opening marker goes to the end of the line before.
    const two = lines('One line\ntwo line\n');
    const later = after(two, insertNote(two, span(1, 0, 1, 3), 'Note', {})) as string;
    expect(later.split('\n').slice(0, 2)).toEqual(['One line<!--[a1-->', 'two<!--a1]--> line']);
    expect(selected(later)).toBe('\ntwo');
    // A selection of whole lines ends at the end of its last line.
    const whole = lines('One\nTwo\n\nNext\n');
    expect((after(whole, insertNote(whole, span(0, 0, 1, 0), 'Note', {})) as string).split('\n')[0]).toBe('One<!--a1]-->');
  });

  test('takes the next free ID, and marks a selection over two paragraphs with the note after the second one', () => {
    const text = lines('First <!--[a1]--> paragraph.\n<!-- note\n---\nselection: a1\n---\nOld\n-->\n\nSecond paragraph.\n');
    const result = after(text, insertNote(text, span(0, 0, 8, 6), 'New', {})) as string;
    expect(result).toContain('Second<!--a2]--> paragraph.\n<!-- note\n---\nselection: a2\n---\nNew\n-->');
  });

  test('adds a block note after another block, and a note without a front matter when no field has a value', () => {
    const text = lines('```\ncode\n```\n');
    expect(after(text, insertNote(text, at(1), 'Note', { author: undefined, date: '' }))).toBe('```\ncode\n```\n<!-- note\nNote\n-->\n');
  });

  test('adds a note in a block quote and in a list item with the prefix of the block', () => {
    const quote = lines('> Quote\n');
    expect(after(quote, insertNote(quote, at(0), 'One\n\nTwo', {}))).toBe('> Quote<!--[a1]-->\n> <!-- note\n> ---\n> selection: a1\n> ---\n> One\n>\n> Two\n> -->\n');
    const item = lines('- Item\n  more\n');
    const result = insertNote(item, at(1), 'Note', {});
    expect(result).toMatchObject({ start: { line: 2, character: 2 } });
    expect(after(item, result)).toBe('- Item\n  more<!--[a1]-->\n  <!-- note\n  ---\n  selection: a1\n  ---\n  Note\n  -->\n');
  });

  test('adds a note after the last line of a text without a line break at its end', () => {
    const text = lines('Text');
    const result = insertNote(text, at(0), 'Note', {});
    expect(result).toMatchObject({ start: { line: 1, character: 0 } });
    expect(after(text, result)).toBe('Text<!--[a1]-->\n<!-- note\n---\nselection: a1\n---\nNote\n-->');
  });

  test('refuses a text with another comment (R-NOTE-003)', () => {
    expect(insertNote(lines('Text\n'), at(0), 'A <!-- b', {})).toEqual({ problem: { kind: 'nested', text: '<!--' } });
  });
});

describe('selections', () => {
  test('deleting a note removes the markers of its selection, and deleting its first answer keeps the selection', () => {
    const text = lines('The agents <!--[a1-->change the work<!--a1]--> of teams.\n<!-- note\n---\nauthor: A\nselection: a1\n---\nOne\n---\nauthor: B\n---\nTwo\n-->\n\nNext.\n');
    expect(applyEdit(text, deleteNote(text, only(text))).join('\n')).toBe('The agents change the work of teams.\n\nNext.\n');
    const kept = after(text, deleteAnswer(text, only(text), 0)) as string;
    expect(kept).toContain('<!-- note\n---\nauthor: B\nselection: a1\n---\nTwo\n-->');
    expect(selected(kept)).toBe('change the work');
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

  test('removes an inline note on lines of its own with its lines, so that the paragraph is whole again', () => {
    const text = lines('One\n<!-- note inline\nA\n-->\nTwo\n');
    expect(applyEdit(text, deleteNote(text, only(text))).join('\n')).toBe('One\nTwo\n');
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
