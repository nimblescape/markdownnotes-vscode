// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the standard footnotes of a text (R-FOOT-001): their
 * definitions, their references, their order and their numbers on GitHub and
 * in the Markdown preview; the changes when the side view saves or deletes a
 * footnote (R-FOOT-002) or adds one at the cursor (R-FOOT-003); and the label,
 * the definition and the place of the reference of a new footnote, also for
 * `/footnote` (R-EDIT-008); the forms that the checks warn about and the
 * definition of the quick fix "Add Definition" (R-FOOT-004); and the new labels
 * of "Renumber Footnotes" (R-FOOT-005).
 */

import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { applyEdit, type Edit, referenceAllowed } from './edits';
import {
  addDefinition,
  deleteFootnote,
  footnoteAt,
  footnoteDefinition,
  footnoteProblemsOf,
  insertFootnote,
  nextFootnoteLabel,
  placeText,
  readFootnotes,
  referencePlace,
  renumberFootnotes,
  replaceFootnote,
} from './footnotes';

/**
 * lines returns the lines of a text.
 * @param text - The text.
 */
const lines = (text: string): string[] => text.split('\n');

/**
 * applied returns the text after edits that refer to its lines before the change.
 * @param text - The lines of the text.
 * @param edits - The edits, in the order of the text.
 */
const applied = (text: readonly string[], edits: readonly Edit[]): string => [...edits].reverse().reduce((changed, edit) => applyEdit(changed, edit), [...text]).join('\n');

describe('readFootnotes', () => {
  test('a definition goes on with its indented lines, also after blank lines, and with the lines of text right after it', () => {
    const text = lines(['Text[^a] and[^b].', '', '[^a]: First line', 'lazy line', '', '    Second paragraph.', '', '[^b]:Tight.', '', 'Later text.'].join('\n'));
    const footnotes = readFootnotes(text);
    expect(footnotes.map((footnote) => [footnote.label, footnote.definition, footnote.text])).toEqual([
      ['a', { first: 2, last: 5 }, 'First line\nlazy line\n\nSecond paragraph.'],
      ['b', { first: 7, last: 7 }, 'Tight.'],
    ]);
    expect(footnotes[0].references).toEqual([{ start: { line: 0, character: 4 }, end: { line: 0, character: 8 } }]);
  });

  test('a block, a new definition or a line without indentation after a blank line ends a definition', () => {
    const text = lines(['[^1]: One.', '- a list', '', '[^2]: Two.', '[^3]: Three.', '', 'Text[^1][^2][^3].'].join('\n'));
    expect(readFootnotes(text).map((footnote) => [footnote.label, footnote.definition.first, footnote.definition.last])).toEqual([
      ['1', 0, 0],
      ['2', 3, 3],
      ['3', 4, 4],
    ]);
  });

  test('notes, code, the front matter and comments hold no standard footnote, and the first definition of a label counts', () => {
    const text = lines(
      [
        '---',
        '[^f]: front matter',
        '---',
        'Text[^1] and `[^1]` and[^note-7k2q] and[^x].',
        '',
        '```',
        '[^c]: code',
        '```',
        '',
        '<!-- a comment',
        '[^h]: hidden',
        '-->',
        '',
        '[^note-7k2q]: **a** · 2026-10-28 10:15Z',
        '',
        '    See[^1].',
        '',
        '[^1]: First.',
        '',
        '[^1]: Second.',
      ].join('\n'),
    );
    const footnotes = readFootnotes(text);
    expect(footnotes.map((footnote) => [footnote.label, footnote.text])).toEqual([['1', 'First.']]);
    // A footnote in a note is a footnote of the page.
    expect(footnotes[0].references.map((range) => range.start)).toEqual([
      { line: 3, character: 4 },
      { line: 15, character: 7 },
    ]);
  });

  test('the footnotes stand in the order of their first reference, and a footnote without a reference at its definition', () => {
    const text = lines(['Text[^late] then[^early].', '', '[^early]: E.', '', '[^alone]: A.', '', '[^late]: L.'].join('\n'));
    expect(readFootnotes(text).map((footnote) => [footnote.label, footnote.github, footnote.preview])).toEqual([
      ['late', 1, 1],
      ['early', 2, 2],
      ['alone', undefined, undefined],
    ]);
  });

  test('GitHub counts the notes of the visible form in its numbers, and the Markdown preview does not', () => {
    const footnotes = readFootnotes(lines(readFileSync('docs/example.md', 'utf8')));
    // The numbers of GitHub, checked on 2026-10-29 with the HTML of docs/example.md from the contents API of GitHub.
    expect(footnotes.map((footnote) => [footnote.label, footnote.github, footnote.preview])).toEqual([['1', 4, 1]]);
  });
});

describe('footnoteAt', () => {
  test('a reference or a line of a definition names its footnote', () => {
    const text = lines(['Text[^1] here.', '', '[^1]: One', '    more.'].join('\n'));
    const footnotes = readFootnotes(text);
    expect(footnoteAt(footnotes, { line: 0, character: 4 })?.label).toBe('1');
    expect(footnoteAt(footnotes, { line: 0, character: 8 })?.label).toBe('1');
    expect(footnoteAt(footnotes, { line: 0, character: 10 })).toBeUndefined();
    expect(footnoteAt(footnotes, { line: 3, character: 0 })?.label).toBe('1');
    expect(footnoteAt(footnotes, { line: 1, character: 0 })).toBeUndefined();
  });
});

describe('replaceFootnote', () => {
  test('the text goes after the label, each further line is indented by four spaces, and a blank line is empty (R-FOOT-002)', () => {
    const text = lines(['Text[^1].', '', '[^1]: Old', 'lazy.', '', 'End.'].join('\n'));
    const result = replaceFootnote(text, readFootnotes(text)[0], '\n New text.\n\n  Second paragraph.  \n   \nThird.\n\n');
    expect('edits' in result && applied(text, result.edits)).toBe(['Text[^1].', '', '[^1]: New text.', '', '      Second paragraph.  ', '', '    Third.', '', 'End.'].join('\n'));
  });

  test('an empty text is refused', () => {
    const text = lines('Text[^1].\n\n[^1]: Old.');
    expect(replaceFootnote(text, readFootnotes(text)[0], ' \n ')).toEqual({ problem: 'empty' });
  });
});

describe('deleteFootnote', () => {
  test('the definition with its blank lines and every reference go in one change (R-FOOT-002)', () => {
    const text = lines(['A word[^1] here, and [^1] there [^1].', '', '[^1]: One', '    more.', '', 'End.'].join('\n'));
    expect(applied(text, deleteFootnote(text, readFootnotes(text)[0]))).toBe(['A word here, and there.', '', 'End.'].join('\n'));
  });

  test('a definition at the end of the text takes the blank lines before it, and the line break at the end stays', () => {
    const text = lines('Text[^1].\n\n[^1]: One.\n');
    expect(applied(text, deleteFootnote(text, readFootnotes(text)[0]))).toBe('Text.\n');
    const only = lines('[^1]: One.\n');
    expect(applied(only, deleteFootnote(only, readFootnotes(only)[0]))).toBe('\n');
  });
});

describe('a new footnote', () => {
  test('the label is the next free number (R-FOOT-003)', () => {
    expect(nextFootnoteLabel(['Text[^1] and[^3] and[^note-7k2q].', '', '[^own]: x'])).toBe('4');
    expect(nextFootnoteLabel(['No footnote.'])).toBe('1');
  });

  test('the definition goes after the last definition of a standard footnote, or at the end of the text, with a blank line before it', () => {
    expect(footnoteDefinition(['# T', '', 'Text[^1].', ''], '1')).toEqual({ at: { line: 2, character: 9 }, text: '\n\n[^1]: ', cursor: { line: 4, character: 6 } });
    expect(footnoteDefinition(['Text[^2] more.', '', '[^1]: One.', '', '    Second paragraph.', '', 'Later text.'], '2')).toEqual({
      at: { line: 4, character: 21 },
      text: '\n\n[^2]: ',
      cursor: { line: 6, character: 6 },
    });
    // A line right after the definition goes on with it, and the text after the place keeps its blank line.
    expect(footnoteDefinition(['[^1]: One.', 'lazy line', 'Text.'], '2')).toEqual({ at: { line: 2, character: 5 }, text: '\n\n[^2]: ', cursor: { line: 4, character: 6 } });
    expect(footnoteDefinition(['[^1]: One.', '', 'Text[^2].'], '2')).toEqual({ at: { line: 0, character: 10 }, text: '\n\n[^2]: ', cursor: { line: 2, character: 6 } });
    // The definition of a note is no standard footnote.
    expect(footnoteDefinition(['Text[^1].', '', '[^note-7k2q]: **a** · 2026-10-28 10:15Z', '', '    x'], '1')).toEqual({ at: { line: 4, character: 5 }, text: '\n\n[^1]: ', cursor: { line: 6, character: 6 } });
    expect(footnoteDefinition([''], '1')).toEqual({ at: { line: 0, character: 0 }, text: '[^1]: ', cursor: { line: 0, character: 6 } });
    expect(footnoteDefinition(['Text.'], '1', 'One\n\nTwo')).toEqual({ at: { line: 0, character: 5 }, text: '\n\n[^1]: One\n\n    Two', cursor: { line: 2, character: 6 } });
  });

  test('a reference stands in the text of a block, and not in a code span, a code block, a link or a marker of a note', () => {
    const line = 'Text with `code` and [a link](x) here.';
    expect(referenceAllowed([line], { line: 0, character: 9 })).toBe(true);
    expect(referenceAllowed([line], { line: 0, character: line.length })).toBe(true);
    expect(referenceAllowed([line], { line: 0, character: 12 })).toBe(false);
    expect(referenceAllowed([line], { line: 0, character: 24 })).toBe(false);
    expect(referenceAllowed(['```', 'code', '```'], { line: 1, character: 2 })).toBe(false);
    expect(referenceAllowed([''], { line: 0, character: 0 })).toBe(false);
    const note = ['The <wbr><!--[note-7k2q-->text[^note-7k2q].', '', '[^note-7k2q]: **a** · 2026-10-28 10:15Z', '', '    x'];
    expect(referenceAllowed(note, { line: 0, character: 12 })).toBe(false);
    expect(referenceAllowed(note, { line: 0, character: 33 })).toBe(false);
    expect(referenceAllowed(note, { line: 0, character: 3 })).toBe(true);
  });

  test('the reference goes after the word at the cursor, and after the text before the spaces before the cursor', () => {
    const text = ['The agents change  the work.', '', '`code`'];
    expect(referencePlace(text, { line: 0, character: 6 })).toEqual({ line: 0, character: 10 });
    expect(referencePlace(text, { line: 0, character: 10 })).toEqual({ line: 0, character: 10 });
    expect(referencePlace(text, { line: 0, character: 19 })).toEqual({ line: 0, character: 17 });
    expect(referencePlace(text, { line: 0, character: 0 })).toEqual({ line: 0, character: 0 });
    expect(referencePlace(text, { line: 2, character: 3 })).toBeUndefined();
    expect(placeText(text, { line: 0, character: 17 })).toBe('The agents change');
    expect(placeText(text, { line: 0, character: 17 }, 10)).toBe('…change');
    expect(placeText(['A second paragraph without footnotes, where a new footnote goes.'], { line: 0, character: 64 })).toBe('…footnotes, where a new footnote goes.');
    expect(placeText(['Averyveryverylongword'], { line: 0, character: 21 }, 10)).toBe('…ylongword');
  });

  test('"Add Footnote" writes the reference and the definition in one change (R-FOOT-003)', () => {
    const text = lines(['The agents change the work.', '', 'More[^1].', '', '[^1]: One.', '', 'End.'].join('\n'));
    const result = insertFootnote(text, { line: 0, character: 13 }, 'A source.\n\nSecond.');
    expect(result.label).toBe('2');
    expect('edits' in result && applied(text, result.edits)).toBe(
      ['The agents change[^2] the work.', '', 'More[^1].', '', '[^1]: One.', '', '[^2]: A source.', '', '    Second.', '', 'End.'].join('\n'),
    );
    // A reference at the end of the last line of the text and its definition after it are one edit.
    const last = ['Text.'];
    const end = insertFootnote(last, { line: 0, character: 5 }, 'Note.');
    expect('edits' in end && end.edits.length).toBe(1);
    expect('edits' in end && applied(last, end.edits)).toBe('Text.[^1]\n\n[^1]: Note.');
    expect(insertFootnote(['`code`'], { line: 0, character: 3 }, 'x')).toEqual({ problem: 'place' });
    expect(insertFootnote(['Text.'], { line: 0, character: 5 }, '  ')).toEqual({ problem: 'empty' });
  });
});

describe('the checks of the footnotes (R-FOOT-004)', () => {
  test('a reference without a definition, a definition without a reference and a second definition of a label are problems; the notes are not', () => {
    const text = [
      'Text[^1] and[^gone] and `[^code]`[^1].',
      '',
      'A note <wbr><!--[note-7k2q-->here[^note-7k2q] and[^note-zzzz].',
      '',
      '[^1]: One.',
      '',
      '[^own]: Only[^own] itself.',
      '',
      '[^1]: Again.',
      '',
      '  [^spare]: Nobody.',
      '',
      '[^note-7k2q]: **a** · 2026-10-28 10:15Z',
      '',
      '    x',
    ];
    expect(footnoteProblemsOf(text)).toEqual({
      undefinedReferences: [{ label: 'gone', range: { start: { line: 0, character: 12 }, end: { line: 0, character: 19 } } }],
      // A reference in the definition of its own footnote does not show the footnote.
      unreferenced: [
        { label: 'own', line: 6 },
        { label: 'spare', line: 10 },
      ],
      duplicates: [{ label: '1', line: 8 }],
    });
    expect(footnoteProblemsOf(['Text[^1].', '', '[^1]: One.'])).toEqual({ undefinedReferences: [], unreferenced: [], duplicates: [] });
  });

  test('"Add Definition" writes the definition of a label at the place of a new definition, and nothing for a label that has one', () => {
    const text = ['Text[^gone].', '', '[^1]: One.', '', 'End[^1].'];
    const result = addDefinition(text, 'gone', 'The source.\n\nSecond.');
    expect('edits' in result && applied(text, result.edits)).toBe(['Text[^gone].', '', '[^1]: One.', '', '[^gone]: The source.', '', '    Second.', '', 'End[^1].'].join('\n'));
    expect(addDefinition(text, '1', 'Again.')).toEqual({ problem: 'exists' });
    expect(addDefinition(text, 'gone', ' \n ')).toEqual({ problem: 'empty' });
  });
});

describe('"Renumber Footnotes" (R-FOOT-005)', () => {
  test('the footnotes with numbers get 1, 2, 3 … in the order of their first reference, in the references and the definitions', () => {
    const text = [
      'First[^3], then[^1] and[^word], again[^3].',
      '',
      '> Quoted[^7].',
      '',
      '[^1]: One, see[^3].',
      '',
      ' [^3]: Three.',
      '',
      '[^7]: Seven.',
      '',
      '[^word]: A word.',
      '',
      '[^5]: Nobody names it.',
      '',
      '[^4]: Nor this one.',
    ];
    const result = renumberFootnotes(text);
    expect('edits' in result && applied(text, result.edits)).toBe(
      [
        'First[^1], then[^2] and[^word], again[^1].',
        '',
        '> Quoted[^3].',
        '',
        '[^2]: One, see[^1].',
        '',
        ' [^1]: Three.',
        '',
        '[^3]: Seven.',
        '',
        '[^word]: A word.',
        '',
        // The footnotes without a reference follow in the order of their definitions.
        '[^4]: Nobody names it.',
        '',
        '[^5]: Nor this one.',
      ].join('\n'),
    );
  });

  test('the notes, the labels that are words, and the references in code stay as they are', () => {
    const text = ['A <wbr><!--[note-7k2q-->note[^note-7k2q] and[^2] `[^2]`.', '', '[^2]: Two.', '', '[^note-7k2q]: **a** · 2026-10-28 10:15Z', '', '    x'];
    const result = renumberFootnotes(text);
    expect('edits' in result && applied(text, result.edits)).toBe(
      ['A <wbr><!--[note-7k2q-->note[^note-7k2q] and[^1] `[^2]`.', '', '[^1]: Two.', '', '[^note-7k2q]: **a** · 2026-10-28 10:15Z', '', '    x'].join('\n'),
    );
  });

  test('it changes nothing when the labels are in order, and names a reference of a number without a definition or a second definition of a number', () => {
    expect(renumberFootnotes(['A[^1] b[^2] c[^word].', '', '[^1]: x', '', '[^2]: y', '', '[^word]: z'])).toEqual({ problem: 'numbered' });
    expect(renumberFootnotes(['No footnote.'])).toEqual({ problem: 'numbered' });
    expect(renumberFootnotes(['A[^2] b[^9].', '', '[^2]: x'])).toEqual({ problem: 'undefined', label: '9', line: 0 });
    expect(renumberFootnotes(['A[^2].', '', '[^2]: x', '', '[^2]: y'])).toEqual({ problem: 'duplicate', label: '2', line: 4 });
    // A word without a definition takes no number, so it does not stop the renumbering.
    const text = ['A[^2] b[^gone].', '', '[^2]: x'];
    const result = renumberFootnotes(text);
    expect('edits' in result && applied(text, result.edits)).toBe(['A[^1] b[^gone].', '', '[^1]: x'].join('\n'));
  });
});
