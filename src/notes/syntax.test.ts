// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the syntax of a note (R-NOTE-001): which comments are
 * notes, block notes and inline notes (R-NOTE-005), the front matter with the
 * author and the date (R-NOTE-002), the answers of a thread (R-NOTE-004), the
 * texts that a note must not contain (R-NOTE-003), the comments as markdown-it
 * finds them, and the dates of a front matter.
 */

import MarkdownIt from 'markdown-it';
import { describe, expect, test } from 'vitest';
import {
  answerLines,
  bodyProblem,
  commentEndAt,
  commentText,
  displayDate,
  formatDate,
  frontMatterLines,
  inlineNoteRule,
  innerText,
  normalizeBody,
  noteLinesRule,
  noteLinesTokenType,
  noteTokenType,
  onlyComments,
  parseDate,
  readNote,
} from './syntax';

describe('readNote', () => {
  test('reads a comment that starts with `<!-- note` on a line of its own, with the front matter and the body', () => {
    const note = readNote(' note\n---\nauthor: hannes\ndate: 2026-10-28T10:15+01:00\n---\nThe **text**.\n\nA second paragraph.\n');
    expect(note).toEqual({
      kind: 'block',
      keyword: 'note',
      answers: [
        {
          frontMatter: {
            lines: ['---', 'author: hannes', 'date: 2026-10-28T10:15+01:00', '---'],
            fields: { author: 'hannes', date: '2026-10-28T10:15+01:00' },
          },
          author: 'hannes',
          date: '2026-10-28T10:15+01:00',
          body: 'The **text**.\n\nA second paragraph.',
          start: 1,
          bodyLine: 5,
          end: 8,
        },
      ],
      nested: false,
    });
  });

  test('reads `<!-- note inline` as an inline note (R-NOTE-005)', () => {
    expect(readNote(' note inline\nText\n')).toMatchObject({ kind: 'inline', keyword: 'note inline', answers: [{ body: 'Text' }] });
    expect(readNote('NOTE   Inline \nText\n')).toMatchObject({ kind: 'inline', keyword: 'NOTE   Inline' });
  });

  test('reads a note without a front matter: the text starts on the next line', () => {
    expect(readNote(' note\nOnly a text.\n')?.answers).toMatchObject([{ frontMatter: undefined, author: undefined, date: undefined, body: 'Only a text.', bodyLine: 1 }]);
    expect(readNote('NOTE  \n  Text  \n')?.answers).toMatchObject([{ body: 'Text' }]);
    expect(readNote('note\n\n\nText\n\n')?.answers).toMatchObject([{ body: 'Text', start: 1, bodyLine: 3, end: 4 }]);
  });

  test('a comment without the word `note` alone on its first line is no note', () => {
    for (const text of [' a comment ', ' note ', ' note: a text\n', ' notes\nText\n', ' TODO\nnote\n', '\nnote\nText\n', ' note text\nmore\n', ' note inline ', ' inline\nText\n']) {
      expect(readNote(text), text).toBeUndefined();
    }
  });

  test('an empty note has one empty answer', () => {
    expect(readNote(' note\n')?.answers).toMatchObject([{ body: '', frontMatter: undefined, start: 1, end: 1 }]);
    expect(readNote(' note\n---\nauthor: A\n---\n')?.answers).toMatchObject([{ body: '', author: 'A', start: 1, bodyLine: 4, end: 4 }]);
  });

  test('a front matter has at least one field and blank lines only, and ends with `---`; other lines are the body', () => {
    // A field name is not case-sensitive, a value loses its quotes, and the first field of a name wins.
    expect(readNote(' note\n---\nAuthor: "A B"\n\ndate: \'2026-10-28\'\nauthor: C\n---\nText\n')?.answers).toMatchObject([
      { author: 'A B', date: '2026-10-28', body: 'Text' },
    ]);
    // A line that is no field, a front matter without a field, and a front matter that does not end are the body.
    expect(readNote(' note\n---\nnot a field\n---\nText\n')?.answers).toMatchObject([{ frontMatter: undefined, body: '---\nnot a field\n---\nText' }]);
    expect(readNote(' note\n---\n\n---\nText\n')?.answers).toMatchObject([{ frontMatter: undefined, body: '---\n\n---\nText' }]);
    expect(readNote(' note\n---\nauthor: A\nText\n')?.answers).toMatchObject([{ frontMatter: undefined, body: '---\nauthor: A\nText' }]);
    // An empty field names nobody.
    expect(readNote(' note\n---\nauthor:\n---\nText\n')?.answers).toMatchObject([{ author: undefined, body: 'Text' }]);
  });

  test('reads the answers of a thread: each front matter starts an answer (R-NOTE-004)', () => {
    const text = ' note\n---\nauthor: hannes\ndate: 2026-10-28T10:15+01:00\n---\nCheck the dates.\n\n---\nauthor: anna\n---\nFriday works.\n\n---\n\nA rule.\n';
    expect(readNote(text)?.answers).toMatchObject([
      { author: 'hannes', date: '2026-10-28T10:15+01:00', body: 'Check the dates.', start: 1, bodyLine: 5, end: 6 },
      { author: 'anna', date: undefined, body: 'Friday works.\n\n---\n\nA rule.', start: 7, bodyLine: 10, end: 15 },
    ]);
    // The first answer may have no front matter; an empty first answer before a front matter is no answer.
    expect(readNote(' note\nFirst\n---\nauthor: B\n---\nSecond\n')?.answers.map((answer) => [answer.author, answer.body])).toEqual([
      [undefined, 'First'],
      ['B', 'Second'],
    ]);
    expect(readNote(' note\n\n---\nauthor: A\n---\nText\n')?.answers).toMatchObject([{ author: 'A', body: 'Text', start: 2 }]);
  });

  test('a body that ends on the line of `-->` ends at the last line', () => {
    expect(readNote(' note\nText ')?.answers).toMatchObject([{ body: 'Text', start: 1, bodyLine: 1, end: 2 }]);
  });

  test('a note that holds the start of another comment is nested (R-NOTE-003)', () => {
    expect(readNote(' note\nText <!-- inner\n')).toMatchObject({ nested: true });
    expect(readNote(' note\nText\n')).toMatchObject({ nested: false });
  });
});

describe('comments', () => {
  test('commentEndAt ends a comment as markdown-it 14 does', () => {
    expect(commentEndAt('a <!-- b --> c', 2)).toBe(12);
    expect(commentEndAt('<!-->', 0)).toBe(5);
    expect(commentEndAt('<!--->', 0)).toBe(6);
    expect(commentEndAt('<!-- no end', 0)).toBe(-1);
    expect(commentEndAt('text', 0)).toBe(-1);
  });

  test('innerText returns the text between `<!--` and `-->`', () => {
    expect(innerText('<!-- note\nText\n-->')).toBe(' note\nText\n');
    expect(innerText('<!-->')).toBe('');
    expect(innerText('<!--->')).toBe('');
  });

  test('onlyComments returns the comments of a block that holds nothing else', () => {
    expect(onlyComments('<!-- a -->\n  <!-- b -->\n')).toEqual([
      { start: 0, end: 10 },
      { start: 13, end: 23 },
    ]);
    expect(onlyComments('<!-- a --> text')).toBeUndefined();
    expect(onlyComments('<div><!-- a --></div>')).toBeUndefined();
    expect(onlyComments('<!-- no end\n')).toBeUndefined();
  });

  test('inlineNoteRule reads the inline comments that html_inline reads, with their spans', () => {
    const md = new MarkdownIt({ html: true });
    md.inline.ruler.before('html_inline', noteTokenType, inlineNoteRule);
    const children = md.parseInline('a <!-- x --> b `<!-- code -->` <!-- y -->', {})[0].children!;
    const comments = children.filter((child) => child.type === noteTokenType);
    expect(comments.map((child) => [child.content, child.meta])).toEqual([
      ['<!-- x -->', { start: 2, end: 12 }],
      ['<!-- y -->', { start: 31, end: 41 }],
    ]);
    // The rule reads no comment when HTML is off, as html_inline.
    const plain = new MarkdownIt({ html: false });
    plain.inline.ruler.before('html_inline', noteTokenType, inlineNoteRule);
    expect(plain.parseInline('a <!-- x -->', {})[0].children!.some((child) => child.type === noteTokenType)).toBe(false);
  });

  /**
   * blocks returns the types, lines and contents of the tokens of a text with the block rule of the inline notes.
   * @param text - The text.
   * @param html - The option html of markdown-it.
   */
  const blocks = (text: string, html = true) => {
    const md = new MarkdownIt({ html });
    md.block.ruler.before('html_block', noteLinesTokenType, noteLinesRule, { alt: ['paragraph', 'reference', 'blockquote'] });
    return md
      .parse(text, {})
      .filter((token) => token.block && token.nesting >= 0)
      .map((token) => [token.type, token.map, token.type === noteLinesTokenType ? [token.content, token.meta] : token.content]);
  };

  test('noteLinesRule reads an inline note on lines of its own, also in a paragraph, with its span (R-NOTE-005)', () => {
    expect(blocks('One\n<!-- note inline\n---\nauthor: A\n---\nText\n-->\nTwo\n')).toEqual([
      ['paragraph_open', [0, 1], ''],
      ['inline', [0, 1], 'One'],
      [noteLinesTokenType, [1, 7], ['<!-- note inline\n---\nauthor: A\n---\nText\n-->', { start: 4, end: 47 }]],
      ['paragraph_open', [7, 8], ''],
      ['inline', [7, 8], 'Two'],
    ]);
    // A blank line does not end the comment.
    expect(blocks('<!-- Note Inline\nA\n\nB\n-->\n')).toEqual([[noteLinesTokenType, [0, 5], ['<!-- Note Inline\nA\n\nB\n-->', { start: 0, end: 25 }]]]);
  });

  test('noteLinesRule reads a note in a block quote without the markers of its lines', () => {
    expect(blocks('> One\n> <!-- note inline\n> Text\n> -->\n> Two\n')).toEqual([
      ['blockquote_open', [0, 5], ''],
      ['paragraph_open', [0, 1], ''],
      ['inline', [0, 1], 'One'],
      [noteLinesTokenType, [1, 4], ['<!-- note inline\nText\n-->', { start: 8, end: 37 }]],
      ['paragraph_open', [4, 5], ''],
      ['inline', [4, 5], 'Two'],
    ]);
  });

  test('noteLinesRule starts the next block with a text after `-->`', () => {
    expect(blocks('One\n<!-- note inline\nText\n-->  and more\n')).toEqual([
      ['paragraph_open', [0, 1], ''],
      ['inline', [0, 1], 'One'],
      [noteLinesTokenType, [1, 4], ['<!-- note inline\nText\n-->', { start: 4, end: 29 }]],
      ['paragraph_open', [3, 4], ''],
      ['inline', [3, 4], 'and more'],
    ]);
  });

  test('noteLinesRule leaves a block note, a comment that does not end, an indented comment and HTML off to the other rules', () => {
    for (const text of ['<!-- note\nText\n-->\n', '<!-- note inline\nText\n', '    <!-- note inline\n    Text\n    -->\n', '<!-- note inline -->\n', 'A <!-- note inline\nB\n-->\n']) {
      expect(blocks(text).some(([type]) => type === noteLinesTokenType), text).toBe(false);
    }
    expect(blocks('<!-- note inline\nText\n-->\n', false).some(([type]) => type === noteLinesTokenType)).toBe(false);
  });
});

describe('writing', () => {
  test('bodyProblem names the first forbidden text of a body (R-NOTE-003)', () => {
    expect(bodyProblem('A text with `code`.')).toBeUndefined();
    expect(bodyProblem('A <!-- comment')).toBe('<!--');
    expect(bodyProblem('An end -->')).toBe('-->');
    expect(bodyProblem('An end --!>')).toBe('--!>');
  });

  test('normalizeBody trims the text of the editor and writes its line breaks as `\\n`', () => {
    expect(normalizeBody('\r\n  First\r\n\r\n  Second  \r\n\r\n')).toBe('First\n\n  Second');
    expect(normalizeBody(' \n \n')).toBe('');
  });

  test('frontMatterLines writes the fields with a value, on one line each', () => {
    expect(frontMatterLines({ author: 'A\nB', date: '2026-10-28' })).toEqual(['---', 'author: A B', 'date: 2026-10-28', '---']);
    expect(frontMatterLines({ author: '', date: '2026-10-28' })).toEqual(['---', 'date: 2026-10-28', '---']);
    expect(frontMatterLines({ author: undefined })).toBeUndefined();
  });

  test('commentText writes `<!-- note` or `<!-- note inline`, the front matter, the body and `-->` on lines of their own', () => {
    expect(commentText('block', ['---', 'author: A', '---'], 'Text')).toBe('<!-- note\n---\nauthor: A\n---\nText\n-->');
    expect(commentText('inline', undefined, 'Text')).toBe('<!-- note inline\nText\n-->');
    expect(commentText('block', undefined, '')).toBe('<!-- note\n-->');
    expect(readNote(innerText(commentText('inline', ['---', 'author: A', '---'], 'Text')))).toMatchObject({ kind: 'inline', answers: [{ author: 'A', body: 'Text' }] });
  });

  test('answerLines returns the lines of the front matter and of the body', () => {
    expect(answerLines(['---', 'author: A', '---'], 'One\nTwo')).toEqual(['---', 'author: A', '---', 'One', 'Two']);
    expect(answerLines(undefined, '')).toEqual([]);
  });
});

describe('dates', () => {
  test('parseDate reads the forms of ISO 8601 of a front matter', () => {
    expect(parseDate('2026-10-28T10:15+01:00')?.toISOString()).toBe('2026-10-28T09:15:00.000Z');
    expect(parseDate('2026-10-28T10:15:30Z')?.toISOString()).toBe('2026-10-28T10:15:30.000Z');
    expect(parseDate('2026-10-28 10:15+0100')?.toISOString()).toBe('2026-10-28T09:15:00.000Z');
    // A date or a time without a zone is local.
    expect(parseDate('2026-10-28')?.getTime()).toBe(new Date(2026, 9, 28).getTime());
    expect(parseDate('2026-10-28T10:15')?.getTime()).toBe(new Date(2026, 9, 28, 10, 15).getTime());
  });

  test('parseDate refuses another form and an impossible date', () => {
    for (const value of ['yesterday', '28.10.2026', '2026-02-31', '2026-13-01', '2026-10-28T24:00', '2026-10-28T10:60']) {
      expect(parseDate(value), value).toBeUndefined();
    }
  });

  test('displayDate shows a date and time without seconds and zone, and another text as written', () => {
    expect(displayDate('2026-10-28T10:15:30+01:00')).toBe('2026-10-28 10:15');
    expect(displayDate('2026-10-28')).toBe('2026-10-28');
    expect(displayDate(' last week ')).toBe('last week');
  });

  test('formatDate writes the local date and time in minutes with the offset of the zone', () => {
    const date = new Date(2026, 9, 28, 10, 15, 42);
    const text = formatDate(date);
    expect(text).toMatch(/^2026-10-28T10:15[+-]\d{2}:\d{2}$/);
    expect(parseDate(text)?.getTime()).toBe(new Date(2026, 9, 28, 10, 15).getTime());
  });
});
