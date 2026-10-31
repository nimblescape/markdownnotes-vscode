// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the values of the front matter in the text (R-XREF-004): the keys that the front matter of YAML
 * and of TOML gives, the fields between their markers, and the values that the formatter writes into them.
 */

import { describe, expect, test } from 'vitest';
import { fieldMarkers, fillFields, findFields, readFields } from './fields';

/** paper is a paper with a front matter of YAML and fields in its text, in code and in a note. */
const paper = [
  '---',
  'title: "A paper: the plan"',
  "subtitle: 'It''s new'",
  'date: 2026-10-30 # the day of the draft',
  'author:',
  '  name: Hannes Stauss',
  '  affiliation: PHT',
  'keywords: [notes, papers]',
  'tags:',
  '- one',
  '- two',
  'abstract: >',
  '  A short',
  '  text.',
  'empty:',
  '---',
  '',
  'By <!--{author.name}-->old<!--{/author.name}--> on <!--{date}--><!--{/date}-->, see `<!--{title}-->x<!--{/title}-->`.',
  '',
  '<wbr><!--{unknown}-->kept<!--{/unknown}--> and <wbr><!--{title}-->old<!--{/title}--><!--{/other}-->',
  '',
  '```',
  '<!--{title}-->code<!--{/title}-->',
  '```',
  '',
];

describe('the front matter', () => {
  test('gives the values of its keys, of the keys under a key and of its lists (R-XREF-004)', () => {
    expect(Object.fromEntries(readFields(paper))).toEqual({
      title: 'A paper: the plan',
      subtitle: "It's new",
      date: '2026-10-30',
      'author.name': 'Hannes Stauss',
      'author.affiliation': 'PHT',
      keywords: 'notes, papers',
      tags: 'one, two',
      abstract: 'A short text.',
    });
    expect(Object.fromEntries(readFields(['+++', 'title = "A paper"', '[author]', 'name = "Ann"', '+++', '']))).toEqual({ title: 'A paper', 'author.name': 'Ann' });
    expect(readFields(['# No front matter', '']).size).toBe(0);
  });
});

describe('the fields', () => {
  test('are the markers of one key around a value, outside the front matter and code (R-XREF-004)', () => {
    expect(findFields(paper).map(({ key, line, start, valueStart, valueEnd, end }) => [key, line, paper[line].slice(start, end), paper[line].slice(valueStart, valueEnd)])).toEqual([
      ['author.name', 17, '<!--{author.name}-->old<!--{/author.name}-->', 'old'],
      ['date', 17, '<!--{date}--><!--{/date}-->', ''],
      ['unknown', 19, '<wbr><!--{unknown}-->kept<!--{/unknown}-->', 'kept'],
      ['title', 19, '<wbr><!--{title}-->old<!--{/title}-->', 'old'],
    ]);
    expect(fieldMarkers('title')).toEqual(['<wbr><!--{title}-->', '<!--{/title}-->']);
    // A field at the start of a line without <wbr> makes its paragraph a block of HTML, in which no field counts.
    expect(findFields(['<!--{title}-->A<!--{/title}--> text.', ''])).toEqual([]);
  });

  test('get the current values of their keys from the formatter, and a field of an unknown key keeps its text (R-XREF-004)', () => {
    const filled = fillFields(paper);
    expect(filled[17]).toBe('By <wbr><!--{author.name}-->Hannes Stauss<!--{/author.name}--> on <wbr><!--{date}-->2026-10-30<!--{/date}-->, see `<!--{title}-->x<!--{/title}-->`.');
    expect(filled[19]).toBe('<wbr><!--{unknown}-->kept<!--{/unknown}--> and <wbr><!--{title}-->A paper: the plan<!--{/title}--><!--{/other}-->');
    expect(filled[22]).toBe('<!--{title}-->code<!--{/title}-->');
    expect(fillFields(filled)).toEqual(filled);
    expect(fillFields(['Text.', ''])).toEqual(['Text.', '']);
    // The formatter gives a start marker at the start of a line its <wbr>, and then the value.
    expect(fillFields(['---', 'title: New', '---', '', '<!--{title}-->Old<!--{/title}--> is the title.', ''])[4]).toBe('<wbr><!--{title}-->New<!--{/title}--> is the title.');
  });
});
