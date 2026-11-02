// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * Tests of the text without notes ([R-HIDE-004](../../docs/requirements.md#r-hide-004)): no note, no marker and no
 * comment of the format in both forms, the rest of the text as it is, and the same rendering as the Markdown preview,
 * which leaves the notes out.
 */

import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
import { describe, expect, test } from 'vitest';
import { extendMarkdownIt, noteClass } from '../markdown/markdownIt';
import { doctypeLines } from './doctype';
import { applyEdit, convertForm } from './edits';
import { stripNotes } from './strip';

/**
 * paper is a file with a front matter, the comment of the format, notes in a paragraph and in a list item, a standard
 * footnote, a comment of the author, an anchor of a table and a code block that shows the form of a note.
 */
const paper = [
  '---',
  'title: Paper',
  '---',
  ...doctypeLines,
  '',
  '# Title',
  '',
  'The text[^note-aaaa] of the page and <wbr><!--[note-bbbb green-->a highlight[^note-bbbb] here.[^1]',
  '',
  '[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00',
  '',
  '    The **text** of the note.',
  '',
  '    > **bob** · 2026-10-28 11:00+01:00',
  '    >',
  '    > An answer.',
  '',
  '[^note-bbbb]: **carl** · 2026-10-28 12:00Z',
  '',
  '    Inline',
  '',
  '<!-- a comment of the author -->',
  '',
  '- item <wbr><!--[note-cccc-->one[^note-cccc]',
  '',
  '  [^note-cccc]: **ann** · 2026-10-28 10:15+01:00',
  '',
  '      In a list.',
  '',
  '- item two',
  '',
  'Table 1: People<a id="tab-people"></a>',
  '',
  '| A | B |',
  '| --- | --- |',
  '| 1 | 2 |',
  '',
  '```markdown',
  'An example <wbr><!--[note-dddd-->in code[^note-dddd].',
  '```',
  '',
  '[^1]: A standard footnote.',
  '',
];

/** stripped is the text of paper without its notes. */
const stripped = [
  '---',
  'title: Paper',
  '---',
  '# Title',
  '',
  'The text of the page and a highlight here.[^1]',
  '',
  '<!-- a comment of the author -->',
  '',
  '- item one',
  '',
  '- item two',
  '',
  'Table 1: People<a id="tab-people"></a>',
  '',
  '| A | B |',
  '| --- | --- |',
  '| 1 | 2 |',
  '',
  '```markdown',
  'An example <wbr><!--[note-dddd-->in code[^note-dddd].',
  '```',
  '',
  '[^1]: A standard footnote.',
  '',
];

/**
 * hiddenOf returns the lines of a text with its notes in the hidden form.
 * @param lines - The lines of the text.
 */
const hiddenOf = (lines: readonly string[]): string[] => {
  const result = convertForm(lines, true);
  if (!('edit' in result)) {
    throw new Error('no conversion');
  }
  return applyEdit(lines, result.edit);
};

describe('the text without notes (R-HIDE-004)', () => {
  test('leaves out the notes, their markers and the comment of the format, and keeps the rest of the text', () => {
    expect(stripNotes(paper)).toEqual(stripped);
  });

  test('gives the same text for the notes in the hidden form', () => {
    const hidden = hiddenOf(paper);
    expect(hidden.join('\n')).toContain('<!--note-bbbb]-->');
    expect(stripNotes(hidden)).toEqual(stripped);
  });

  test('leaves out a note without a reference and a second note of a label, and keeps a text without notes as it is', () => {
    const lines = ['Text.', '', '[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00', '', '    Lost.', '', 'More.', ''];
    expect(stripNotes(lines)).toEqual(['Text.', '', 'More.', '']);
    const twice = ['Text[^note-aaaa].', '', '[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00', '', '    One.', '', '[^note-aaaa]: **bob** · 2026-10-28 11:00+01:00', '', '    Two.', '', 'More.', ''];
    expect(stripNotes(twice)).toEqual(['Text.', '', 'More.', '']);
    const plain = ['# Plain', '', 'Text with a footnote.[^1]', '', '[^1]: The footnote.', ''];
    expect(stripNotes(plain)).toEqual(plain);
  });

  test('leaves out a note at the end of the file with the blank lines before it', () => {
    expect(stripNotes(['Text[^note-aaaa].', '', '[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00', '', '    Last.'])).toEqual(['Text.']);
  });

  test('reads no text whose comment of the format names a higher major version', () => {
    const newer = [doctypeLines[0].replace(/v\d+\.\d+\.\d+/, 'v9.0.0'), ...doctypeLines.slice(1), '', 'Text[^note-aaaa].', '', '[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00', ''];
    expect(stripNotes(newer)).toBeUndefined();
  });

  test('renders as the Markdown preview, which leaves the notes out', () => {
    const preview = extendMarkdownIt(new MarkdownIt({ html: true }).use(footnote), { settingsOf: () => ({ showHighlights: true }), linkOf: () => undefined });
    const plain = new MarkdownIt({ html: true }).use(footnote);
    // The preview marks the start and the end of each highlight with an empty element, and keeps the comment of the
    // format as a comment of the page, which shows nothing.
    const edges = new RegExp(`<span class="${noteClass}-edge"[^>]*></span>`, 'g');
    const doctype = /<!-- nimblescape-markdownnotes [^]*?-->\n/;
    for (const lines of [paper, hiddenOf(paper)]) {
      const shown = preview.render(lines.join('\n')).replace(edges, '').replace(doctype, '');
      expect(shown).not.toContain('note-aaaa');
      expect(plain.render(stripNotes(lines)!.join('\n'))).toBe(shown);
    }
  });
});
