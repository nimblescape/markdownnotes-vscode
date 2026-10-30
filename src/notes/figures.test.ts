// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the figures and the tables of a Markdown text and the links
 * to them (R-XREF-001, R-XREF-002): which images and tables count, the names of
 * new anchors, the word of a link, and the numbers that the formatter writes.
 */

import { describe, expect, test } from 'vitest';
import { anchorName, anchorsOf, defaultWord, findItems, numberLinks, numberOf, wordOf } from './figures';

/** text is a paper with two figures, a table with a caption, a table without one, and links. */
const text = [
  '# Results',
  '',
  'As [Table 2](#tab-grades) and [Figure 3](#fig-plan) show, the plan works.',
  '',
  '![Plan of the study](images/plan.png)<a id="fig-plan"></a>',
  '',
  'Text with an inline ![icon](icon.png) image.',
  '',
  'Table: Participants by grade<a id="tab-grades"></a>',
  '',
  '| Grade | Participants |',
  '| --- | --- |',
  '| 5 | 12 |',
  '',
  '| A | B |',
  '| --- | --- |',
  '| 1 | 2 |',
  '',
  '![Ergebnisse der Schüler](images/results.png)',
  '',
  '```markdown',
  '![Not a figure](code.png)',
  '[Table 7](#tab-grades)',
  '```',
  '',
].join('\n');

describe('the figures and tables', () => {
  test('are the images alone in their paragraphs and the tables with a caption line, not in code (R-XREF-001)', () => {
    const items = findItems(text.split('\n'));
    expect(items.map(({ kind, caption, line, anchor }) => [kind, caption, line, anchor])).toEqual([
      ['figure', 'Plan of the study', 4, 'fig-plan'],
      ['table', 'Participants by grade', 8, 'tab-grades'],
      ['figure', 'Ergebnisse der Schüler', 18, undefined],
    ]);
    expect(numberOf(items, items[2])).toBe(2);
    expect(anchorsOf(text.split('\n'))).toEqual([
      { line: 4, start: 37, end: 58 },
      { line: 8, start: 28, end: 51 },
    ]);
  });

  test('have anchors that the clean editing view hides also away from the end of a line, but not in code or a note', () => {
    const lines = [
      'Joined![Plan](plan.png)<a id="fig-plan"></a> text<a id="tab-a"></a>',
      'Code `<a id="fig-code"></a>`',
      '',
      '    <a id="fig-indented"></a>',
      '',
      'A text[^note-aaaa].',
      '',
      '[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00',
      '',
      '    See <a id="tab-note"></a>',
      '',
    ];
    expect(anchorsOf(lines)).toEqual([
      { line: 0, start: 23, end: 44 },
      { line: 0, start: 49, end: 67 },
    ]);
  });

  test('are not the images and tables in the text of a note', () => {
    const noted = ['A text[^note-aaaa].', '', '[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00', '', '    ![In a note](a.png)', ''];
    expect(findItems(noted)).toEqual([]);
  });

  test('get new anchors from their captions, in small letters, without small words and a name that the file uses (R-XREF-001)', () => {
    const items = findItems(text.split('\n'));
    expect(anchorName(items[2], items)).toBe('fig-ergebnisse-schueler');
    expect(anchorName({ kind: 'table', caption: 'Participants by grade', line: 0 }, items)).toBe('tab-participants-grade');
    expect(anchorName({ kind: 'figure', caption: 'Plan', line: 0 }, [...items, { kind: 'figure', caption: 'x', line: 1, anchor: 'fig-plan' }])).toBe('fig-plan-2');
    expect(anchorName({ kind: 'figure', caption: '…', line: 0 }, [])).toBe('fig-0');
    expect(anchorName({ kind: 'table', caption: 'The Results of the 2 groups in the test', line: 0 }, [])).toBe('tab-results-2-groups');
    expect(anchorName({ kind: 'table', caption: 'Und oder', line: 0 }, [])).toBe('tab-und-oder');
  });
});

describe('the links', () => {
  test('get the numbers of their figures and tables from the order of the text, and keep their words (R-XREF-002)', () => {
    const numbered = numberLinks(text.split('\n'));
    expect(numbered[2]).toBe('As [Table 1](#tab-grades) and [Figure 1](#fig-plan) show, the plan works.');
    // The code block stays as it is.
    expect(numbered[22]).toBe('[Table 7](#tab-grades)');
    // A moved figure changes the number of its link, also of a link with another word.
    const moved = text.split('\n');
    moved.splice(4, 2);
    moved.splice(18, 0, '![Plan of the study](images/plan.png)<a id="fig-plan"></a>', '');
    moved[2] = 'Wie [Abbildung 1](#fig-plan) zeigt, `[Figure 9](#fig-plan)` and [Figure 4](#fig-none).';
    expect(numberLinks(moved)[2]).toBe('Wie [Abbildung 2](#fig-plan) zeigt, `[Figure 9](#fig-plan)` and [Figure 4](#fig-none).');
    expect(numberLinks(['No anchors [Table 3](#tab-x).'])).toEqual(['No anchors [Table 3](#tab-x).']);
  });

  test('take the word of the last link of their kind, else the word of the language of VS Code', () => {
    const lines = ['See [Tabelle 1](#tab-a) and [Abbildung 2](#fig-b), then [Tab. 3](#tab-c).'];
    expect(wordOf(lines, 'table')).toBe('Tab.');
    expect(wordOf(lines, 'figure')).toBe('Abbildung');
    expect(wordOf(['None.'], 'figure')).toBeUndefined();
    expect([defaultWord('figure', 'de-AT'), defaultWord('table', 'de'), defaultWord('table', 'en-US'), defaultWord('figure', 'ja')]).toEqual(['Abbildung', 'Tabelle', 'Table', 'Figure']);
  });
});
