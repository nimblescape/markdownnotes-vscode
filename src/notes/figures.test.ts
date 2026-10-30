// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the figures and the tables of a Markdown text and the links
 * to them (R-XREF-001, R-XREF-002): which images and tables count, the names of
 * new anchors, the word of a link, and the numbers that the formatter writes
 * into the captions and the links (R-GEN-016).
 */

import { describe, expect, test } from 'vitest';
import { anchorCaptions, anchorColumn, anchorName, anchorsOf, captionFigures, captionWord, defaultWord, findItems, hasNumberedLinks, labelOf, numberCaptions, numberLinks, numberOf, slugOf, wordOf } from './figures';

/**
 * text is a paper with two figures with captions, an image without one, a table with a caption, a table without one, a
 * caption without its image, and links.
 */
const text = [
  '# Results',
  '',
  'As [Table 2](#tab-grades) and [Figure 3](#fig-plan) show, the plan works.',
  '',
  'Figure: Plan of the study<a id="fig-plan"></a>',
  '',
  '![Plan of the study](images/plan.png)',
  '',
  'Text with an inline ![icon](icon.png) image.',
  '',
  'Table 5: Participants by grade<a id="tab-grades"></a>',
  '',
  '| Grade | Participants |',
  '| --- | --- |',
  '| 5 | 12 |',
  '',
  '| A | B |',
  '| --- | --- |',
  '| 1 | 2 |',
  '',
  'Abbildung 7: Ergebnisse der Schüler',
  '',
  '![Ergebnisse](images/results.png)',
  '',
  '![Logo without a caption](logo.png)',
  '',
  'Figure 9: No image follows',
  '',
  '```markdown',
  '![Not a figure](code.png)',
  '[Table 7](#tab-grades)',
  '```',
  '',
].join('\n');

describe('the figures and tables', () => {
  test('are the images alone in their paragraphs and the tables, each with a caption line before it, not in code (R-XREF-001)', () => {
    const lines = text.split('\n');
    const items = findItems(lines);
    expect(items.map(({ kind, caption, line, head, anchor }) => [kind, caption, line, head, anchor])).toEqual([
      ['section', 'Results', 0, undefined, undefined],
      ['figure', 'Plan of the study', 4, 4, 'fig-plan'],
      ['table', 'Participants by grade', 10, 10, 'tab-grades'],
      ['figure', 'Ergebnisse der Schüler', 20, 20, undefined],
    ]);
    expect(numberOf(items, items[3])).toBe(2);
    expect(anchorsOf(lines)).toEqual([
      { line: 4, start: lines[4].indexOf('<a'), end: lines[4].length },
      { line: 10, start: lines[10].indexOf('<a'), end: lines[10].length },
    ]);
  });

  test('get the numbers of their captions from the order of the text, with the word of each caption (R-XREF-001, R-GEN-016)', () => {
    const lines = text.split('\n');
    const numbered = numberCaptions(lines);
    expect([numbered[4], numbered[10], numbered[20], numbered[26], numbered[29]]).toEqual([
      'Figure 1: Plan of the study<a id="fig-plan"></a>',
      'Table 1: Participants by grade<a id="tab-grades"></a>',
      'Abbildung 2: Ergebnisse der Schüler',
      'Figure 9: No image follows',
      '![Not a figure](code.png)',
    ]);
    expect(numbered.filter((line, index) => line !== lines[index])).toHaveLength(3);
    // A caption in a quote and a caption of several lines keep their marks and their texts.
    expect(numberCaptions(['> Table:   People', '> of the study', '>', '> | A |', '> | --- |', ''])[0]).toBe('> Table 1:   People');
    expect(numberCaptions(['No captions.'])).toEqual(['No captions.']);
  });

  test('get an anchor at the end of each caption of a kind whose generated list the text holds (R-GEN-016)', () => {
    const lines = ['## List of tables', '', '<!-- lot -->', '<!-- /lot -->', '', 'Table: Grades', '', '| A |', '| --- |', '', 'Table: Grades', '', '| B |', '| --- |', '', 'Figure: Plan', '', '![Plan](p.png)', '', '```', '<!-- lof -->', '```', ''];
    const anchored = anchorCaptions(lines);
    expect([anchored[5], anchored[10], anchored[15]]).toEqual(['Table: Grades<a id="tab-grades"></a>', 'Table: Grades<a id="tab-grades-2"></a>', 'Figure: Plan']);
    expect(anchorCaptions(anchored)).toEqual(anchored);
    expect(anchorCaptions(['Table: Grades', '', '| A |', '| --- |', ''])[0]).toBe('Table: Grades');
  });

  test('of the older form, an image with the anchor of a figure, get a caption line from the text of the image (R-XREF-001)', () => {
    const old = ['See [Abbildung 2](#fig-plan).', '', '![Plan of the study](plan.png)<a id="fig-plan"></a>', '', '> ![Quoted](q.png)<a id="fig-quoted"></a>', ''];
    expect(findItems(old).map(({ caption, line, head }) => [caption, line, head])).toEqual([
      ['Plan of the study', 2, undefined],
      ['Quoted', 4, undefined],
    ]);
    // A figure in a quote keeps its form, because a caption line there needs the marks of the quote.
    const captioned = captionFigures(old);
    expect(captioned).toEqual(['See [Abbildung 2](#fig-plan).', '', 'Abbildung: Plan of the study<a id="fig-plan"></a>', '', '![Plan of the study](plan.png)', '', '> ![Quoted](q.png)<a id="fig-quoted"></a>', '']);
    expect(numberLinks(numberCaptions(captioned)).slice(0, 3)).toEqual(['See [Abbildung 1](#fig-plan).', '', 'Abbildung 1: Plan of the study<a id="fig-plan"></a>']);
    expect(captionFigures(['![Plain](a.png)', ''])).toEqual(['![Plain](a.png)', '']);
    expect(findItems(['![Plain](a.png)', ''])).toEqual([]);
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
    const noted = ['A text[^note-aaaa].', '', '[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00', '', '    Figure 1: In a note', '', '    ![In a note](a.png)', ''];
    expect(findItems(noted)).toEqual([]);
  });

  test('get new anchors from their captions, in small letters, without small words and a name that the file uses (R-XREF-001)', () => {
    const items = findItems(text.split('\n'));
    expect(anchorName(items[3], items)).toBe('fig-ergebnisse-schueler');
    expect(anchorName({ kind: 'table', caption: 'Participants by grade', line: 0 }, items)).toBe('tab-participants-grade');
    expect(anchorName({ kind: 'figure', caption: 'Plan', line: 0 }, [...items, { kind: 'figure', caption: 'x', line: 1, anchor: 'fig-plan' }])).toBe('fig-plan-2');
    expect(anchorName({ kind: 'figure', caption: '…', line: 0 }, [])).toBe('fig-0');
    expect(anchorName({ kind: 'table', caption: 'The Results of the 2 groups in the test', line: 0 }, [])).toBe('tab-results-2-groups');
    expect(anchorName({ kind: 'table', caption: 'Und oder', line: 0 }, [])).toBe('tab-und-oder');
  });
});

describe('the sections', () => {
  /** paper is a paper with a title, chapters of the level `##`, a heading underlined with `---`, and a closing `##`. */
  const paper = [
    '---',
    'title: A paper',
    '---',
    '',
    '# The paper',
    '',
    'See [Kapitel 9](#sec-data) and [Chapter 1](#sec-methods).',
    '',
    '## Introduction',
    '',
    '## Methods<a id="sec-methods"></a> ##',
    '',
    '#### Deep',
    '',
    '### Data<a id="sec-data"></a>',
    '',
    'Results',
    '-------',
    '',
    '```',
    '## Not a heading',
    '```',
    '',
  ];

  test('are the headings from the top level that more than one heading has, with the numbers of the sections around them (R-XREF-003)', () => {
    const items = findItems(paper);
    expect(items.map((item) => [item.caption, item.line, item.anchor, labelOf(items, item)])).toEqual([
      ['Introduction', 8, undefined, '1'],
      ['Methods', 10, 'sec-methods', '2'],
      ['Deep', 12, undefined, '2.0.1'],
      ['Data', 14, 'sec-data', '2.1'],
      ['Results', 16, undefined, '3'],
    ]);
    // A file with one heading of each level numbers from the highest one.
    const single = findItems(['# Title', '', '## Part', '']);
    expect(single.map((item) => labelOf(single, item))).toEqual(['1', '1.1']);
  });

  test('get their anchors at the end of the text of the heading, and their links the numbers from the formatter (R-XREF-003)', () => {
    const items = findItems(paper);
    expect(anchorColumn(paper[10].replace('<a id="sec-methods"></a>', ''), items[1])).toBe('## Methods'.length);
    expect(anchorColumn(paper[16], items[4])).toBe('Results'.length);
    expect(anchorColumn('![x](y.png)  ', { kind: 'figure', caption: 'x', line: 0 })).toBe('![x](y.png)'.length);
    expect(anchorName(items[4], items)).toBe('sec-results');
    expect(numberLinks(paper)[6]).toBe('See [Kapitel 2.1](#sec-data) and [Chapter 2](#sec-methods).');
    expect(anchorsOf(paper).map(({ line }) => line)).toEqual([10, 14]);
    expect([defaultWord('section', 'de'), defaultWord('section', 'en')]).toEqual(['Kapitel', 'Chapter']);
  });

  test('are linked by the ID that GitHub gives their headings, which the formatter numbers only for a link with a word of a section (R-XREF-003)', () => {
    expect(['Methods', 'Ergebnisse & Diskussion', 'Über die Daten (2024)', 'Leitfaden {BIB}', 'snake_case', 'Ende '].map(slugOf)).toEqual([
      'methods',
      'ergebnisse--diskussion',
      'über-die-daten-2024',
      'leitfaden-bib',
      'snake_case',
      'ende-',
    ]);
    const text = ['## The `parse` *function*', '', '## Data', '', '## Data', '', '## Data-1', '', '## Notes<a id="sec-notes"></a>', '', 'See [Kapitel 9](#data-1), [Step 9](#data), [Chapter 9](#notes) and [Chapter 9](#sec-notes).', ''];
    const items = findItems(text);
    expect(items.map((item) => item.id)).toEqual(['the-parse-function', 'data', 'data-1', 'data-1-1', 'notes']);
    expect(numberLinks(text)[10]).toBe('See [Kapitel 3](#data-1), [Step 9](#data), [Chapter 5](#notes) and [Chapter 5](#sec-notes).');
    expect(wordOf(text, 'section')).toBe('Chapter');
    expect([hasNumberedLinks(text), hasNumberedLinks(['## Data', '', 'See [Step 1](#data).', '']), hasNumberedLinks(['See [Chapter 1](#gone).'])]).toEqual([true, false, false]);
  });
});

describe('the links', () => {
  test('get the numbers of their figures and tables from the order of the text, and keep their words (R-XREF-002)', () => {
    const numbered = numberLinks(text.split('\n'));
    expect(numbered[2]).toBe('As [Table 1](#tab-grades) and [Figure 1](#fig-plan) show, the plan works.');
    // The code block stays as it is.
    expect(numbered[30]).toBe('[Table 7](#tab-grades)');
    // A moved figure changes the number of its link, also of a link with another word.
    const moved = text.split('\n');
    const plan = moved.splice(4, 4);
    moved.splice(20, 0, ...plan);
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
    // A new caption takes the word of the links only when a caption can have it.
    expect([captionWord(lines, 'table', 'de'), captionWord(lines, 'figure', 'en'), captionWord([], 'listing', 'de')]).toEqual(['Tabelle', 'Abbildung', 'Listing']);
  });
});
