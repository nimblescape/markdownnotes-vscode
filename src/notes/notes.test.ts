// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check where the extension finds the notes of a Markdown text
 * (R-NOTE-001): the definitions on lines of their own, also in block quotes
 * and list items with the prefixes of their lines, the references and the
 * start markers that make their selections (R-NOTE-006), and nowhere that the
 * Markdown preview shows a reference as text. Every other footnote is no
 * note.
 */

import { describe, expect, test } from 'vitest';
import { findNotes, read } from './notes';

/**
 * lines returns the lines of a text.
 * @param text - The text.
 */
const lines = (text: string): string[] => text.split('\n');

/** header is the header of a first answer. */
const header = '**hannes** · 2026-10-28 10:15+01:00';

describe('findNotes', () => {
  test('finds a note with its definition, its answers, its reference and its selection', () => {
    const text = lines(
      [
        '# Title',
        '',
        'The agents <!--[note-7k2q-->change the work[^note-7k2q] of teams.',
        '',
        `[^note-7k2q]: ${header}`,
        '',
        '    Which teams?',
        '',
        '    > **anna** · 2026-10-28 11:02+01:00',
        '    >',
        '    > The teams of the plan.',
        '',
        'A paragraph.',
        '',
      ].join('\n'),
    );
    const notes = findNotes(text);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({
      label: 'note-7k2q',
      start: { line: 4, character: 0 },
      end: { line: 10, character: 28 },
      prefix: '',
      answers: [
        { author: 'hannes', body: 'Which teams?', start: 0, end: 3 },
        { author: 'anna', body: 'The teams of the plan.', start: 4, end: 7 },
      ],
      reference: { start: { line: 2, character: 43 }, end: { line: 2, character: 55 } },
      marker: { start: { line: 2, character: 11 }, end: { line: 2, character: 28 } },
      selection: {
        start: { line: 2, character: 28 },
        end: { line: 2, character: 43 },
        markers: [
          { kind: 'open', start: { line: 2, character: 11 }, end: { line: 2, character: 28 } },
          { kind: 'close', start: { line: 2, character: 43 }, end: { line: 2, character: 55 } },
        ],
      },
      inHeading: false,
      inLink: false,
      duplicate: false,
    });
  });

  test('a reference without a start marker selects from the start of its block, and a marker before the reference is a point', () => {
    const text = lines(
      ['  The agents change[^note-aaaa] the work<!--[note-bbbb-->[^note-bbbb].', '', `[^note-aaaa]: ${header}`, '', `[^note-bbbb]: ${header}`, ''].join('\n'),
    );
    const [first, second] = findNotes(text);
    expect(first.selection).toEqual({
      start: { line: 0, character: 2 },
      end: { line: 0, character: 19 },
      markers: [{ kind: 'close', start: { line: 0, character: 19 }, end: { line: 0, character: 31 } }],
    });
    expect(second.selection).toEqual({
      start: { line: 0, character: 57 },
      end: { line: 0, character: 57 },
      markers: [{ kind: 'point', start: { line: 0, character: 40 }, end: { line: 0, character: 69 } }],
    });
  });

  test('finds a note in a list item and in a block quote with the prefixes of their lines', () => {
    const text = lines(['- Item[^note-aaaa]', '', `  [^note-aaaa]: ${header}`, '', '      Text.', '', `> [^note-bbbb]: ${header}`, '>', '>     Quoted.'].join('\n'));
    const notes = findNotes(text);
    expect(notes.map(({ start, prefix, answers }) => ({ start, prefix, body: answers[0].body }))).toEqual([
      { start: { line: 2, character: 2 }, prefix: '  ', body: 'Text.' },
      { start: { line: 6, character: 2 }, prefix: '> ', body: 'Quoted.' },
    ]);
    expect(notes[1].reference).toBeUndefined();
  });

  test('finds no note in a code block, and keeps every other footnote', () => {
    const text = lines(['Text[^1].', '', '```', `[^note-aaaa]: ${header}`, '```', '', `    [^note-bbbb]: ${header}`, '', '[^1]: A footnote.', '', `[^note-cccc]: Not a header.`].join('\n'));
    expect(findNotes(text)).toEqual([]);
  });

  test('a note in a code span is no reference, and a reference in a heading, a link or a table cell is one', () => {
    const text = lines(
      [
        '# Plan[^note-aaaa]',
        '',
        'See [the plan[^note-bbbb]](plan.md) and `[^note-cccc]`.',
        '',
        '| A | B[^note-dddd] |',
        '| - | - |',
        '',
        ...['aaaa', 'bbbb', 'cccc', 'dddd'].flatMap((label) => [`[^note-${label}]: ${header}`, '']),
      ].join('\n'),
    );
    const notes = findNotes(text);
    expect(notes.map((note) => [note.label, note.reference?.start, note.inHeading, note.inLink])).toEqual([
      ['note-aaaa', { line: 0, character: 6 }, true, false],
      ['note-bbbb', { line: 2, character: 13 }, false, true],
      ['note-cccc', undefined, false, false],
      ['note-dddd', { line: 4, character: 7 }, false, false],
    ]);
  });

  test('a second definition with the same label is a duplicate', () => {
    const text = lines(['Text[^note-aaaa].', '', `[^note-aaaa]: ${header}`, '', `[^note-aaaa]: ${header}`].join('\n'));
    expect(findNotes(text).map((note) => note.duplicate)).toEqual([false, true]);
  });

  test('a definition directly after a paragraph ends the paragraph, and a paragraph after it without a blank line belongs to the note', () => {
    const text = lines(['Text[^note-aaaa].', `[^note-aaaa]: ${header}`, '', '    Body.', 'Lazy line.', '', 'Next paragraph.'].join('\n'));
    const [note] = findNotes(text);
    expect(note.start.line).toBe(1);
    expect(note.end.line).toBe(4);
    expect(note.answers[0].body).toBe('Body.\nLazy line.');
  });

  test('read finds the start markers at the start of a line, which make the line an HTML block', () => {
    const reading = read(lines(['<!--[note-aaaa-->Text[^note-aaaa].', '', `[^note-aaaa]: ${header}`].join('\n')));
    expect(reading.markersInHtml).toEqual([{ line: 0, character: 0 }]);
    expect(reading.notes[0].reference).toBeUndefined();
  });
});
