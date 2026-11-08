// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the generated parts of a Markdown file, which the clean editing view keeps read-only (R-TEXT-009,
 * decision 74): the numbers of the captions, the texts of the references, the code blocks of the listings and the
 * values of the front matter in the text, and the edits that keep them.
 */

import { describe, expect, test } from 'vitest';
import { findGenerated, type GeneratedPart, keepsGenerated } from './generated';

/** paper is a file with each kind of generated part. */
const paper = [
  '---',
  'title: A study',
  '---',
  '',
  '# <wbr><!--{title}-->A study<!--{/title}-->',
  '',
  '## Methods',
  '',
  'Table 1: Grades<a id="tab-grades"></a>',
  '',
  '| Grade | Count |',
  '| --- | --- |',
  '| 1 | 3 |',
  '',
  'See [Table 1](#tab-grades), [Chapter 1](#methods), [Step 4](#methods) and `[Table 9](#tab-grades)`.',
  '',
  'Listing 1: [Reading](../src/fields.ts)',
  '',
  '<!-- listing: ../src/fields.ts -->',
  '',
  '```ts',
  'const a = 1;',
  '```',
  '',
  'The <wbr><!--{author}-->old<!--{/author}--> stays.',
].join('\n');

/** texts returns the text of each part, a block as its lines. */
function texts(text: string, parts: readonly GeneratedPart[]): string[] {
  const lines = text.split('\n');
  return parts.map((part) => ('first' in part ? lines.slice(part.first, part.last + 1).join('\n') : lines[part.line].slice(part.start, part.end)));
}

describe('findGenerated', () => {
  test('finds the numbers of the captions, the texts of the references, the code of the listings and the values of the keys of the front matter', () => {
    expect(texts(paper, findGenerated(paper.split('\n')))).toEqual(['1', '1', 'Table 1', 'Chapter 1', '```ts\nconst a = 1;\n```', 'A study']);
  });

  test('leaves out a caption without a number, a link without a target, and a caption that is no figure', () => {
    const text = ['Figure: Without a number', '', '![A cat](cat.png)', '', 'Table 2: No table follows', '', 'See [Table 3](#tab-gone).'].join('\n');
    expect(findGenerated(text.split('\n'))).toEqual([]);
  });

  test('finds the number of a caption in a quote', () => {
    const text = ['> Abbildung 12: Ein Bild', '>', '> ![Bild](bild.png)'].join('\n');
    expect(texts(text, findGenerated(text.split('\n')))).toEqual(['12']);
  });
});

describe('keepsGenerated', () => {
  const parts = findGenerated(paper.split('\n'));
  /** edit returns whether an edit that replaces a text of the paper keeps the generated parts. */
  const edit = (from: string, to: string): boolean => {
    const start = paper.indexOf(from);
    expect(start).toBeGreaterThanOrEqual(0);
    return keepsGenerated(paper, paper.slice(0, start) + to + paper.slice(start + from.length), parts);
  };
  /** insert returns whether text typed before a text of the paper keeps the generated parts. */
  const insert = (before: string, text: string): boolean => edit(before, text + before);

  test('keeps an edit outside the parts, also next to them', () => {
    expect(edit('Grades', 'Noten')).toBe(true);
    expect(edit('Table 1: Grades', 'Tabelle 1: Grades')).toBe(true);
    expect(edit('See ', 'Look at ')).toBe(true);
    expect(edit('[Table 1](#tab-grades)', '[Table 1](#tab-other)')).toBe(true);
    expect(insert('[Table 1]', '(')).toBe(true);
    expect(edit('`[Table 9](#tab-grades)`', '`[Table 8](#tab-grades)`')).toBe(true);
    expect(edit('stays.', 'goes.')).toBe(true);
  });

  test('takes back text typed into a part, and a change of a piece of it', () => {
    expect(edit('Table 1:', 'Table 2:')).toBe(false);
    expect(edit('Table 1:', 'Table 12:')).toBe(false);
    expect(edit('Table 1:', 'Table :')).toBe(false);
    expect(edit('[Table 1]', '[Tables 1]')).toBe(false);
    expect(edit('[Table 1]', '[Table 1 ]')).toBe(false);
    expect(edit('[Chapter 1]', '[Chapter 2]')).toBe(false);
    expect(edit('const a = 1;', 'const a = 2;')).toBe(false);
    expect(edit('A study<!--{/title}', 'B study<!--{/title}')).toBe(false);
  });

  test('takes back text typed at the edge of a part of a line, and keeps it where the same text can stand outside', () => {
    expect(edit('Table 1:', 'Table 21:')).toBe(false);
    expect(edit('[Table 1]', '[A Table 1]')).toBe(false);
    expect(insert('[Table 1]', '[')).toBe(true);
    expect(edit('[Table 1]', '[Table 1]]')).toBe(true);
    expect(edit('Table 1:', 'Table  1:')).toBe(true);
    expect(edit('Table 1:', 'Table 1::')).toBe(true);
    expect(edit('<wbr><!--{title}-->', 'Title: <wbr><!--{title}-->')).toBe(true);
    expect(edit('<!--{/title}-->', '<!--{/title}--> (draft)')).toBe(true);
    expect(edit('Table 1:', 'Tabelle 1:')).toBe(true);
    expect(edit('Table 1:', '1:')).toBe(true);
  });

  test('keeps a change that takes a whole part with text around it, and the deletion of a whole block', () => {
    expect(edit('See [Table 1](#tab-grades), ', 'See ')).toBe(true);
    expect(edit('Table 1: Grades', 'Figure: Grades')).toBe(true);
    expect(edit('Table 1:', 'Table:')).toBe(true);
    expect(edit('```ts\nconst a = 1;\n```', '')).toBe(true);
    expect(edit('Table 1:', 'Table 2:') || edit('[Table 1]', '[Table 2]')).toBe(false);
  });

  test('keeps whole lines before and after a block, and takes back text typed into its first or its last line', () => {
    expect(edit('```ts\n', 'Before\n```ts\n')).toBe(true);
    expect(edit('= 1;\n```', '= 1;\n```\nAfter')).toBe(true);
    expect(edit('```ts\n', 'x```ts\n')).toBe(false);
    expect(edit('= 1;\n```', '= 1;\n```x')).toBe(false);
    expect(edit('-->\n\n```ts', '-->\n\n\n```ts')).toBe(true);
    expect(edit('\n\n```ts', '```ts')).toBe(false);
  });

  test('keeps each edit of a file without generated parts', () => {
    expect(keepsGenerated('A text', 'A new text', [])).toBe(true);
  });
});
