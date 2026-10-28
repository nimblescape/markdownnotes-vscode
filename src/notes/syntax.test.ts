// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the syntax of a note (R-NOTE-001): which comments are
 * notes, the front matter with the author and the date (R-NOTE-002), the
 * body, the texts that a note must not contain (R-NOTE-003), the comments as
 * markdown-it finds them, and the dates of a front matter.
 */

import MarkdownIt from 'markdown-it';
import { describe, expect, test } from 'vitest';
import {
  bodyProblem,
  commentEndAt,
  commentText,
  displayDate,
  formatDate,
  frontMatterLines,
  inlineNoteRule,
  innerText,
  normalizeBody,
  noteTokenType,
  onlyComments,
  parseDate,
  readNote,
} from './syntax';

describe('readNote', () => {
  test('reads a comment that starts with `<!-- note` on a line of its own, with the front matter and the body', () => {
    const note = readNote(' note\n---\nauthor: Hannes Stauss\ndate: 2026-10-28T10:15+01:00\n---\nThe **text**.\n\nA second paragraph.\n');
    expect(note).toEqual({
      frontMatter: {
        lines: ['---', 'author: Hannes Stauss', 'date: 2026-10-28T10:15+01:00', '---'],
        fields: { author: 'Hannes Stauss', date: '2026-10-28T10:15+01:00' },
      },
      author: 'Hannes Stauss',
      date: '2026-10-28T10:15+01:00',
      body: 'The **text**.\n\nA second paragraph.',
      bodyLine: 5,
      nested: false,
    });
  });

  test('reads a note without a front matter: the text starts on the next line', () => {
    expect(readNote(' note\nOnly a text.\n')).toMatchObject({ frontMatter: undefined, author: undefined, date: undefined, body: 'Only a text.', bodyLine: 1 });
    expect(readNote('NOTE  \n  Text  \n')).toMatchObject({ body: 'Text' });
    expect(readNote('note\n\n\nText\n\n')).toMatchObject({ body: 'Text', bodyLine: 3 });
  });

  test('a comment without the word `note` alone on its first line is no note', () => {
    for (const text of [' a comment ', ' note ', ' note: a text\n', ' notes\nText\n', ' TODO\nnote\n', '\nnote\nText\n', ' note text\nmore\n']) {
      expect(readNote(text), text).toBeUndefined();
    }
  });

  test('an empty note has an empty body', () => {
    expect(readNote(' note\n')).toMatchObject({ body: '', frontMatter: undefined });
    expect(readNote(' note\n---\nauthor: A\n---\n')).toMatchObject({ body: '', author: 'A' });
  });

  test('a front matter has fields and blank lines only, and ends with `---`; other lines are the body', () => {
    // A field name is not case-sensitive, a value loses its quotes, and the first field of a name wins.
    expect(readNote(' note\n---\nAuthor: "A B"\n\ndate: \'2026-10-28\'\nauthor: C\n---\nText\n')).toMatchObject({
      author: 'A B',
      date: '2026-10-28',
      body: 'Text',
    });
    // A line that is no field, and a front matter that does not end, make the lines the body.
    expect(readNote(' note\n---\nnot a field\n---\nText\n')).toMatchObject({ frontMatter: undefined, body: '---\nnot a field\n---\nText' });
    expect(readNote(' note\n---\nauthor: A\nText\n')).toMatchObject({ frontMatter: undefined, body: '---\nauthor: A\nText' });
    // The front matter must start right after the line of `<!-- note`.
    expect(readNote(' note\n\n---\nauthor: A\n---\nText\n')).toMatchObject({ frontMatter: undefined });
    // An empty field names nobody.
    expect(readNote(' note\n---\nauthor:\n---\nText\n')).toMatchObject({ author: undefined, body: 'Text' });
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

  test('commentText writes `<!-- note`, the front matter, the body and `-->` on lines of their own', () => {
    expect(commentText(['---', 'author: A', '---'], 'Text')).toBe('<!-- note\n---\nauthor: A\n---\nText\n-->');
    expect(commentText(undefined, '')).toBe('<!-- note\n-->');
    expect(readNote(innerText(commentText(['---', 'author: A', '---'], 'Text')))).toMatchObject({ author: 'A', body: 'Text' });
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
