// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the clean text of a file with notes for the clean editing
 * view ([R-TEXT-009](../../docs/requirements.md#r-text-009)): the text without the start markers, the
 * references, the definitions and the comment of the format, the highlights in
 * it, and the edits of the file for the edits of the clean text: typed text at
 * the edge of a highlight stays outside, deleted text never deletes a note, a
 * paragraph break ends a highlight, and random edits keep the clean text and
 * every note.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, test } from 'vitest';
import { applyClean, cleanLines, endsHighlight, labelsOf, project } from './clean';

/** example is the example of the notes in the documents, with the comment of the format and three notes. */
const example = fs.readFileSync(path.resolve(__dirname, '../../docs/example.md'), 'utf8');

/** text is a short file with two notes in one paragraph and a paragraph after their definitions. */
const text = [
  'The agents <wbr><!--[note-7k2q green-->change the work[^note-7k2q] of <wbr><!--[note-m3x8-->teams[^note-m3x8] in three ways.',
  '',
  '[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00',
  '',
  '    Which three ways?',
  '',
  '[^note-m3x8]: **anna** · 2026-10-28 11:02+01:00',
  '',
  '    All teams?',
  '',
  'The next paragraph.',
  '',
].join('\n');

/**
 * edit returns the new file and the new clean text for an edit of the clean text at a text of it.
 * @param file - The text of the file.
 * @param at - The text of the clean text where the edit starts, or its offset.
 * @param length - The number of characters that the edit replaces.
 * @param insert - The new text.
 * @param after - Whether the edit starts after the text of at.
 */
const edit = (file: string, at: string, length: number, insert: string, after = false) => {
  const projection = project(file);
  const start = projection.clean.indexOf(at) + (after ? at.length : 0);
  const result = applyClean(projection, start, start + length, insert);
  return { ...result, clean: project(result.text).clean, expected: projection.clean.slice(0, start) + insert + projection.clean.slice(start + length) };
};

describe('the clean text', () => {
  test('has no start marker, reference, definition or comment of the format, and keeps one blank line between the blocks', () => {
    expect(project(text).clean).toBe('The agents change the work of teams in three ways.\n\nThe next paragraph.\n');
    const clean = project(example).clean;
    expect(clean).not.toMatch(/<wbr>|<!--\[note-|\[\^note-|nimblescape-markdown-notes v/);
    // Other footnotes stay in the text.
    expect(clean).toContain('[^1]');
  });

  test('has the highlights of the notes at their text', () => {
    const projection = project(text);
    expect(projection.highlights.map((highlight) => [highlight.label, highlight.color, projection.clean.slice(highlight.start, highlight.end)])).toEqual([
      ['note-7k2q', 'green', 'change the work'],
      ['note-m3x8', undefined, 'teams'],
    ]);
  });

  test('names the line in the clean text of each line of the file, for the Markdown preview', () => {
    // The definitions go to the line of the blank line where they stood, and the paragraph after them moves up.
    expect(cleanLines(project(text))).toEqual([0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3]);
  });

  test('leaves out the definitions at the end of the file with the blank lines before them', () => {
    const file = 'One <wbr><!--[note-7k2q-->two[^note-7k2q].\n\n[^note-7k2q]: **ann** · 2026-10-28 10:15+01:00\n\n    Body.\n';
    expect(project(file).clean).toBe('One two.\n');
  });
});

describe('an edit of the clean text', () => {
  test('types text at the end of a highlight after its reference, and at its start before its start marker', () => {
    expect(edit(text, 'change the work', 0, ' and more', true).text).toContain('change the work[^note-7k2q] and more of');
    expect(edit(text, 'teams', 0, 'all ').text).toContain('of all <wbr><!--[note-m3x8-->teams[^note-m3x8]');
  });

  test('types text inside a highlight into it, and a replacement of its first or last word stays in it', () => {
    expect(edit(text, 'work', 0, 'whole ').text).toContain('change the whole work[^note-7k2q]');
    expect(edit(text, 'change', 6, 'alter').text).toContain('<!--[note-7k2q green-->alter the work[^note-7k2q]');
    expect(edit(text, 'work', 4, 'job').text).toContain('change the job[^note-7k2q]');
    expect(edit(text, 'teams', 5, 'groups').text).toContain('<!--[note-m3x8-->groups[^note-m3x8]');
  });

  test('keeps the next letters in a highlight when they continue text typed at its end, as VS Code types over a selection', () => {
    // VS Code types "job" over "work" as a replacement with "j" and the insertions of "o" and "b".
    let file = edit(text, 'work', 4, 'j').text;
    let at = project(file).clean.indexOf('j') + 1;
    expect(endsHighlight(project(file), at)).toBe(true);
    for (const letter of ['o', 'b']) {
      file = applyClean(project(file), at, at, letter, true).text;
      at++;
    }
    expect(file).toContain('change the job[^note-7k2q] of');
    // Without the letters before, typed text at the end of a highlight stays outside.
    expect(applyClean(project(file), at, at, 's').text).toContain('change the job[^note-7k2q]s of');
  });

  test('keeps the notes when it deletes their text: a highlight without text is a point', () => {
    const result = edit(text, 'change the work of teams', 'change the work of teams'.length, '');
    expect(result.clean).toBe(result.expected);
    expect(labelsOf(result.text)).toEqual(['note-7k2q', 'note-m3x8']);
  });

  test('ends a highlight before a paragraph break in it, and puts its definition after its block', () => {
    const result = edit(text, 'change the', 0, '\n\n', true);
    expect(result.clean).toBe(result.expected);
    expect(result.way).toBe('rebuilt');
    expect(result.text).toContain('change the[^note-7k2q]\n\n[^note-7k2q]:');
    expect(labelsOf(result.text)).toEqual(['note-7k2q', 'note-m3x8']);
  });

  test('joins a paragraph to the paragraph before its definitions, and moves the definitions after the joined block', () => {
    const projection = project(text);
    const start = projection.clean.indexOf('\n\nThe next');
    const result = applyClean(projection, start, start + 2, ' ');
    expect(project(result.text).clean).toBe('The agents change the work of teams in three ways. The next paragraph.\n');
    expect(labelsOf(result.text)).toEqual(['note-7k2q', 'note-m3x8']);
  });

  test('types at the start of the file after the comment of the format', () => {
    const result = edit(example, '', 0, 'Draft. ');
    expect(result.clean).toBe(result.expected);
    expect(result.text.startsWith('<!-- nimblescape-markdown-notes v1.0.0')).toBe(true);
  });

  test('keeps the clean text and every note for random edits, except an edit that makes the notes part of a comment or a code block', () => {
    let seed = 7;
    const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
    const labels = labelsOf(example);
    let kept = 0;
    let lost = 0;
    for (let round = 0; round < 60; round++) {
      let file = example;
      for (let step = 0; step < 12; step++) {
        const projection = project(file);
        // Most edits start at a hidden part, where the mapping has a choice.
        const start = random() < 0.6 ? pick(projection.at) : Math.floor(random() * (projection.clean.length + 1));
        const length = pick([0, 0, 1, 5, 40]);
        const end = Math.min(projection.clean.length, start + length);
        const insert = pick(['', 'x', ' ', 'word', '\n', '\n\n', 'pasted\n\nparagraph']);
        const result = applyClean(projection, start, end, insert);
        const opensBlock = /-->|<!--|```/.test(projection.clean.slice(Math.max(0, start - 3), end + 3));
        if (result.way !== 'none') {
          expect(project(result.text).clean).toBe(projection.clean.slice(0, start) + insert + projection.clean.slice(end));
          kept++;
          file = result.text;
        } else {
          expect(opensBlock, JSON.stringify({ start, end, insert, around: projection.clean.slice(start - 30, end + 30) })).toBe(true);
        }
      }
      lost += labelsOf(file).join() === labels.join() ? 0 : 1;
    }
    expect(lost).toBe(0);
    expect(kept).toBeGreaterThan(700);
  });
});
