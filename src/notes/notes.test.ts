// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check where the extension finds the notes of a Markdown text
 * (R-NOTE-001): on lines of their own and in paragraphs, the inline notes on
 * lines of their own (R-NOTE-005), in block quotes and list items with the
 * prefixes of their lines, and nowhere that the Markdown preview shows a
 * comment as text or not at all. They also check the place and the kind of a
 * new note (R-EDIT-003).
 */

import { describe, expect, test } from 'vitest';
import { findNotes, insertionFor } from './notes';

/**
 * lines returns the lines of a text.
 * @param text - The text.
 */
const lines = (text: string): string[] => text.split('\n');

describe('findNotes', () => {
  test('finds a note on lines of its own, with its positions, its front matter and its body', () => {
    const text = lines('# Title\n\n<!-- note\n---\nauthor: A\ndate: 2026-10-28\n---\nThe **text**.\n-->\n\nA paragraph.\n');
    const notes = findNotes(text);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({
      kind: 'block',
      place: 'block',
      start: { line: 2, character: 0 },
      end: { line: 8, character: 3 },
      answers: [{ author: 'A', date: '2026-10-28', body: 'The **text**.', start: 1, bodyLine: 5, end: 6 }],
      prefix: '',
      nested: false,
    });
    expect(notes[0].text).toBe(' note\n---\nauthor: A\ndate: 2026-10-28\n---\nThe **text**.\n');
  });

  test('finds a note in a paragraph, at its column', () => {
    const notes = findNotes(lines('A sentence <!-- note\nThe note.\n--> and more.\n'));
    expect(notes).toMatchObject([{ place: 'inline', start: { line: 0, character: 11 }, end: { line: 2, character: 3 }, answers: [{ body: 'The note.' }] }]);
  });

  test('finds an inline note on lines of its own between two lines of a paragraph (R-NOTE-005)', () => {
    const notes = findNotes(lines('Version 2.0 comes out.\n<!-- note inline\n---\nauthor: hannes\n---\nWhich day?\n-->\nThe beta starts before.\n'));
    expect(notes).toMatchObject([
      { kind: 'inline', place: 'block', start: { line: 1, character: 0 }, end: { line: 6, character: 3 }, answers: [{ author: 'hannes', body: 'Which day?' }], prefix: '' },
    ]);
    expect(notes[0].text).toBe(' note inline\n---\nauthor: hannes\n---\nWhich day?\n');
    expect(findNotes(lines('> One\n> <!-- note inline\n> Text\n> -->\n> Two\n'))).toMatchObject([
      { kind: 'inline', place: 'block', start: { line: 1, character: 2 }, end: { line: 3, character: 5 }, prefix: '> ' },
    ]);
    expect(findNotes(lines('- One\n  <!-- note inline\n  Text\n  -->  more\n'))).toMatchObject([
      { kind: 'inline', start: { line: 1, character: 2 }, end: { line: 3, character: 5 }, prefix: '  ' },
    ]);
  });

  test('finds the answers of a thread', () => {
    const [note] = findNotes(lines('<!-- note\n---\nauthor: A\n---\nOne\n---\nauthor: B\n---\nTwo\n-->\n'));
    expect(note.answers.map((answer) => [answer.author, answer.body, answer.start])).toEqual([
      ['A', 'One', 1],
      ['B', 'Two', 5],
    ]);
  });

  test('finds several notes of one block and of one paragraph', () => {
    const block = findNotes(lines('<!-- note\nOne\n-->\n<!-- note\nTwo\n-->\n'));
    expect(block.map((note) => [note.answers[0].body, note.start.line])).toEqual([
      ['One', 0],
      ['Two', 3],
    ]);
    const inline = findNotes(lines('Text <!-- note\nOne\n--> text <!-- note\nTwo\n--> end\n'));
    expect(inline.map((note) => [note.answers[0].body, note.start])).toEqual([
      ['One', { line: 0, character: 5 }],
      ['Two', { line: 2, character: 9 }],
    ]);
  });

  test('finds a note in a block quote and in a list item, with the prefix of its further lines', () => {
    expect(findNotes(lines('> Quote\n>\n> <!-- note\n> Text\n> -->\n'))).toMatchObject([
      { place: 'block', start: { line: 2, character: 2 }, end: { line: 4, character: 5 }, answers: [{ body: 'Text' }], prefix: '> ' },
    ]);
    expect(findNotes(lines('- Item\n\n  <!-- note\n  Text\n  -->\n'))).toMatchObject([
      { place: 'block', start: { line: 2, character: 2 }, end: { line: 4, character: 5 }, answers: [{ body: 'Text' }], prefix: '  ' },
    ]);
    expect(findNotes(lines('1. Item <!-- note\n   Text\n   -->\n'))).toMatchObject([
      { place: 'inline', start: { line: 0, character: 8 }, end: { line: 2, character: 6 }, answers: [{ body: 'Text' }], prefix: '   ' },
    ]);
    expect(findNotes(lines('> - Item\n>\n>   <!-- note\n>   Text\n>   -->\n'))).toMatchObject([{ start: { line: 2, character: 4 }, prefix: '>   ' }]);
  });

  test('leaves out every comment that is no note', () => {
    expect(findNotes(lines('<!-- a comment -->\n\nText <!-- other -->\n\n<!-- TODO\nnote\n-->\n'))).toEqual([]);
  });

  test('leaves out a comment that the preview shows as text or does not show as Markdown', () => {
    const texts = [
      // Code: a fence, an indented block and a code span.
      '```\n<!-- note\nText\n-->\n```\n',
      '    <!-- note\n    Text\n    -->\n',
      'A `<!-- note\nText\n-->` span.\n',
      // The front matter of the document.
      '---\ntitle: <!-- note\nText\n-->\n---\n',
      // An HTML block with other HTML, and a comment that does not end.
      '<div>\n<!-- note\nText\n-->\n</div>\n',
      '<!-- note\nText\n',
      // A table cell has one line.
      '| a | b |\n| - | - |\n| <!-- note --> | c |\n',
    ];
    for (const text of texts) {
      expect(findNotes(lines(text)), text).toEqual([]);
    }
  });

  test('finds the positions in a text with tabs and trailing spaces', () => {
    expect(findNotes(lines('\t<!-- note\nText  \n-->  \n'))).toEqual([]);
    expect(findNotes(lines('<!-- note  \nText  \n  -->  \n'))).toMatchObject([{ start: { line: 0, character: 0 }, end: { line: 2, character: 5 } }]);
  });

  test('marks a note that holds the start of another comment (R-NOTE-003)', () => {
    expect(findNotes(lines('<!-- note\nText <!-- inner\n-->\n'))).toMatchObject([{ nested: true }]);
  });
});

describe('insertionFor', () => {
  const text = lines('# Title\n\nFirst line\nsecond line\n\n> Quote\n> more\n\n- Item\n  more\n\n---\n\n```\ncode\n```\n');

  test('puts an inline note after a line of a paragraph, with the prefix of the paragraph', () => {
    expect(insertionFor(text, 2)).toEqual({ line: 3, prefix: '', kind: 'inline' });
    expect(insertionFor(text, 3)).toEqual({ line: 4, prefix: '', kind: 'inline' });
    expect(insertionFor(text, 5)).toEqual({ line: 6, prefix: '> ', kind: 'inline' });
    expect(insertionFor(text, 6)).toEqual({ line: 7, prefix: '> ', kind: 'inline' });
    expect(insertionFor(text, 8)).toEqual({ line: 9, prefix: '  ', kind: 'inline' });
  });

  test('puts an inline note after a heading and after an inline note, and a block note after another block', () => {
    expect(insertionFor(text, 0)).toEqual({ line: 1, prefix: '', kind: 'inline' });
    expect(insertionFor(lines('Title\n=====\n'), 0)).toEqual({ line: 2, prefix: '', kind: 'inline' });
    expect(insertionFor(lines('One\n<!-- note inline\nText\n-->\nTwo\n'), 2)).toEqual({ line: 4, prefix: '', kind: 'inline' });
    expect(insertionFor(text, 11)).toEqual({ line: 12, prefix: '', kind: 'block' });
    expect(insertionFor(text, 14)).toEqual({ line: 16, prefix: '', kind: 'block' });
    expect(insertionFor(lines('<!-- note\nText\n-->\n'), 1)).toEqual({ line: 3, prefix: '', kind: 'block' });
  });

  test('on a line outside every block, puts a block note after the block before the line, or at the start', () => {
    expect(insertionFor(text, 4)).toEqual({ line: 4, prefix: '', kind: 'block' });
    expect(insertionFor(lines('\n\nText\n'), 0)).toEqual({ line: 0, prefix: '', kind: 'block' });
  });

  test('puts it after the front matter of the document without a prefix', () => {
    expect(insertionFor(lines('---\ntitle: A\n---\nText\n'), 1)).toEqual({ line: 3, prefix: '', kind: 'block' });
  });
});
