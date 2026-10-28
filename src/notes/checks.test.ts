// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the warnings of the notes of a Markdown text (R-TEXT-008): each form that GitHub or another
 * Markdown viewer shows differently from the extension gets one, and a note in the form that the extension writes
 * gets none.
 */

import { describe, expect, test } from 'vitest';
import { checksOf } from './checks';
import { readNotes } from './notes';

/**
 * checks returns the line and the start of the message of each check of a text.
 * @param text - The Markdown text.
 */
const checks = (text: string): [number, string, string][] => {
  const lines = text.split('\n');
  return checksOf(lines, readNotes(lines)).map((check) => [check.range.start.line, check.severity, check.message.split(/[,.:]/)[0]]);
};

/** header is the header of a first answer. */
const header = '**hannes** · 2026-10-28 10:15+01:00';

describe('checksOf', () => {
  test('a note in the form that the extension writes has no warning', () => {
    expect(checks(`The <!--[note-aaaa-->text[^note-aaaa].\n\n[^note-aaaa]: ${header}\n\n    Body.\n\n    > **anna** · 2026-10-28 11:02+01:00\n    >\n    > Answer.\n\nNext.`)).toEqual([]);
  });

  test('warns at a definition without blank lines around it and at lines of a note without four spaces', () => {
    // The line without indentation is a lazy line of the paragraph of the note, and the heading ends the note.
    expect(checks(`Text[^note-aaaa].\n[^note-aaaa]: ${header}\n    Body.\nlazy line\n# Next`)).toEqual([
      [1, 'warning', 'Put a blank line before the note'],
      [3, 'warning', 'Put a blank line after the note'],
      [3, 'information', 'Indent each line of a note by four spaces'],
    ]);
  });

  test('warns at a second label, at a note without a reference, at a reference without a note, and at a note in a block quote', () => {
    expect(checks(`Text[^note-aaaa] and[^note-zzzz].\n\n[^note-aaaa]: ${header}\n\n[^note-aaaa]: ${header}\n\n> [^note-bbbb]: ${header}\n`)).toEqual([
      [0, 'warning', 'The file has no note note-zzzz'],
      [4, 'warning', 'Another note of the file has the label note-aaaa'],
      [6, 'warning', 'No reference [^note-bbbb] names this note'],
      [6, 'warning', 'GitHub does not show a footnote in a block quote'],
    ]);
  });

  test('warns at a reference in a link, in a heading and in a note, and at a start marker at the start of a line', () => {
    const text = [
      '# Plan[^note-aaaa]',
      '',
      'See [the plan[^note-bbbb]](plan.md).',
      '',
      '<!--[note-cccc-->Text[^note-cccc].',
      '',
      `[^note-aaaa]: ${header}`,
      '',
      '    See[^note-bbbb].',
      '',
      `[^note-bbbb]: ${header}`,
      '',
      `[^note-cccc]: ${header}`,
    ].join('\n');
    expect(checks(text)).toEqual([
      [0, 'information', 'A reference in a heading changes the anchor of the heading on GitHub'],
      [2, 'warning', 'A reference in the text of a link breaks the link on GitHub'],
      [4, 'warning', 'A start marker at the start of a line ends the paragraph'],
      [8, 'warning', 'A note holds no note'],
      // The start marker made the line of the reference an HTML block.
      [12, 'warning', 'No reference [^note-cccc] names this note'],
    ]);
  });
});
