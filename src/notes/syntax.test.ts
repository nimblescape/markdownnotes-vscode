// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the syntax of a note (R-NOTE-001): the label, the header
 * with the author and the date (R-NOTE-002), the tree of the answers as block
 * quotes (R-NOTE-004), the lines that the extension writes, and the dates in
 * the local time of the reader and of the author. The tests run in the zone Europe/Vienna
 * (vitest.config.mts), which is UTC+01:00 on 2026-10-28.
 */

import { describe, expect, test } from 'vitest';
import { authorDate, displayDate, formatDate, headerText, markerText, newLabel, normalizeBody, noteLines, parseDate, readDefinition, readHeader, readMarker, readNote, usedLabels } from './syntax';

describe('labels and headers', () => {
  test('a new label is note- and four random small letters or digits that no footnote of the text uses', () => {
    const values = [0, 0, 0, 0, 0.99, 0.5, 0.1, 0.3];
    let index = 0;
    const random = (): number => values[index++ % values.length];
    expect(newLabel(new Set(['note-aaaa']), random)).toBe('note-9sdk');
    expect(usedLabels(['Text[^1] and[^note-7k2q].', '', '[^note-7k2q]: **a** · 2026-10-28 10:15Z', '[^own]: x'])).toEqual(new Set(['1', 'note-7k2q', 'own']));
  });

  test('a header is the login in bold, a middle dot and the date with the zone', () => {
    expect(readHeader('**hannes** · 2026-10-28 10:15+01:00')).toEqual({ author: 'hannes', date: '2026-10-28 10:15+01:00' });
    expect(readHeader('**name_short** · 2026-10-28 09:15Z ')).toEqual({ author: 'name_short', date: '2026-10-28 09:15Z' });
    expect(readHeader('**hannes** · 2026-10-28 10:15')).toBeUndefined();
    expect(readHeader('**hannes** - 2026-10-28 10:15+01:00')).toBeUndefined();
    expect(readHeader('hannes · 2026-10-28 10:15+01:00')).toBeUndefined();
  });

  test('the header of a todo note ends with its state, todo while it is open and done when it is completed (R-NOTE-008)', () => {
    expect(readHeader('**hannes** · 2026-10-29 18:30+01:00 · todo')).toEqual({ author: 'hannes', date: '2026-10-29 18:30+01:00', todo: 'todo' });
    expect(readHeader('**hannes** · 2026-10-29 18:30+01:00 · done ')).toEqual({ author: 'hannes', date: '2026-10-29 18:30+01:00', todo: 'done' });
    expect(readHeader('**hannes** · 2026-10-29 18:30+01:00 · later')).toBeUndefined();
    expect(readHeader('**hannes** · 2026-10-29 18:30+01:00 ·todo')).toBeUndefined();
    expect(readHeader('**hannes** · 2026-10-29 18:30+01:00 · TODO')).toBeUndefined();
    expect(headerText({ author: 'hannes', date: '2026-10-29 18:30+01:00', todo: 'done' })).toBe('**hannes** · 2026-10-29 18:30+01:00 · done');
    expect(headerText({ author: 'hannes', date: '2026-10-29 18:30+01:00' })).toBe('**hannes** · 2026-10-29 18:30+01:00');
    const note = readNote(['[^note-7k2q]: **hannes** · 2026-10-29 18:30+01:00 · todo', '', '    Fix it.', '', '    > **anna** · 2026-10-29 18:40Z', '    >', '    > Soon.']);
    expect(note?.answers.map((answer) => [answer.author, answer.todo])).toEqual([
      ['hannes', 'todo'],
      ['anna', undefined],
    ]);
  });

  test('a definition is a note only with the label of a note and a header', () => {
    expect(readDefinition('[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00')).toEqual({ label: 'note-7k2q', author: 'hannes', date: '2026-10-28 10:15+01:00' });
    expect(readDefinition('[^1]: **hannes** · 2026-10-28 10:15+01:00')).toBeUndefined();
    expect(readDefinition('[^note-7K2Q]: **hannes** · 2026-10-28 10:15+01:00')).toBeUndefined();
    expect(readDefinition('[^note-7k2q]: A real footnote.')).toBeUndefined();
    expect(readMarker('<!--[a3-->')).toBeUndefined();
  });

  test('a start marker is <wbr> and a comment with the label and an optional color; a reader also takes it without <wbr> (Hannes, 2026-10-28)', () => {
    expect(markerText('note-7k2q')).toBe('<wbr><!--[note-7k2q-->');
    expect(markerText('note-7k2q', 'blue')).toBe('<wbr><!--[note-7k2q-->');
    expect(markerText('note-7k2q', 'green')).toBe('<wbr><!--[note-7k2q green-->');
    expect(readMarker('<wbr><!--[note-7k2q-->text')).toEqual({ label: 'note-7k2q', color: undefined, length: 22 });
    expect(readMarker('<wbr><!--[note-7k2q green-->text')).toEqual({ label: 'note-7k2q', color: 'green', length: 28 });
    expect(readMarker('<!--[note-7k2q-->text')).toEqual({ label: 'note-7k2q', color: undefined, length: 17 });
    expect(readMarker('<wbr>text')).toBeUndefined();
  });
});

describe('readNote', () => {
  test('reads the answers: the first after the header, each further one as a block quote with its own header', () => {
    const note = readNote([
      '[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00',
      '',
      '    Which teams?',
      '',
      '    - one',
      '',
      '    > **anna** · 2026-10-28 11:02+01:00',
      '    >',
      '    > The teams of the plan.',
      '    >',
      '    > > A quote.',
      '',
      '    > **hannes** · 2026-10-28 11:30+01:00',
    ]);
    expect(note).toEqual({
      label: 'note-7k2q',
      answers: [
        { author: 'hannes', date: '2026-10-28 10:15+01:00', body: 'Which teams?\n\n- one', depth: 0, parent: undefined, start: 0, end: 5 },
        { author: 'anna', date: '2026-10-28 11:02+01:00', body: 'The teams of the plan.\n\n> A quote.', depth: 1, parent: 0, start: 6, end: 11 },
        { author: 'hannes', date: '2026-10-28 11:30+01:00', body: '', depth: 1, parent: 0, start: 12, end: 13 },
      ],
    });
  });

  test('reads the tree of the replies: a reply stands in the block quote of the answer that it replies to', () => {
    const note = readNote([
      '[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00',
      '',
      '    Which teams?',
      '',
      '    > **anna** · 2026-10-28 11:02+01:00',
      '    >',
      '    > The teams of the plan.',
      '    >',
      '    > > **hannes** · 2026-10-28 11:30+01:00',
      '    > >',
      '    > > Thanks.',
      '    > > lazy line',
      '    >',
      '    > > **eve** · 2026-10-28 11:40+01:00',
      '    > >',
      '    > > > A quote in the reply.',
      '',
      '    > **bob** · 2026-10-28 12:00+01:00',
      '    >',
      '    > Another answer to the note.',
    ]);
    expect(note?.answers.map(({ author, body, depth, parent, start, end }) => ({ author, body, depth, parent, start, end }))).toEqual([
      { author: 'hannes', body: 'Which teams?', depth: 0, parent: undefined, start: 0, end: 3 },
      { author: 'anna', body: 'The teams of the plan.', depth: 1, parent: 0, start: 4, end: 7 },
      { author: 'hannes', body: 'Thanks.\nlazy line', depth: 2, parent: 1, start: 8, end: 12 },
      { author: 'eve', body: '> A quote in the reply.', depth: 2, parent: 1, start: 13, end: 16 },
      { author: 'bob', body: 'Another answer to the note.', depth: 1, parent: 0, start: 17, end: 20 },
    ]);
  });

  test('takes a lazy line and a tab as lines of the note', () => {
    const note = readNote(['[^note-7k2q]: **hannes** · 2026-10-28 10:15Z', '', '    First line', 'lazy line', '\tTab line']);
    expect(note?.answers[0].body).toBe('First line\nlazy line\nTab line');
  });

  test('reads no note from a definition of another form', () => {
    expect(readNote(['[^1]: The footnote.'])).toBeUndefined();
  });
});

describe('noteLines', () => {
  test('writes the header, a blank line, the body indented by four spaces, and each further answer as a block quote', () => {
    expect(
      noteLines('note-7k2q', [
        { author: 'hannes', date: '2026-10-28 10:15+01:00', body: 'Which teams?\n\n- one' },
        { author: 'anna', date: '2026-10-28 11:02+01:00', body: 'The teams.\n\nTwo.' },
        { author: 'hannes', date: '2026-10-28 11:30+01:00', body: '' },
      ]),
    ).toEqual([
      '[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00',
      '',
      '    Which teams?',
      '',
      '    - one',
      '',
      '    > **anna** · 2026-10-28 11:02+01:00',
      '    >',
      '    > The teams.',
      '    >',
      '    > Two.',
      '',
      '    > **hannes** · 2026-10-28 11:30+01:00',
    ]);
  });

  test('writes each reply as a block quote in the block quote of the answer that it replies to', () => {
    expect(
      noteLines('note-7k2q', [
        { author: 'hannes', date: '2026-10-28 10:15+01:00', body: 'Which teams?' },
        { author: 'anna', date: '2026-10-28 11:02+01:00', body: 'The teams.', depth: 1 },
        { author: 'hannes', date: '2026-10-28 11:30+01:00', body: 'Thanks.\n\nTwo.', depth: 2 },
        { author: 'eve', date: '2026-10-28 11:40+01:00', body: 'Me too.', depth: 2 },
        { author: 'bob', date: '2026-10-28 12:00+01:00', body: 'Another.', depth: 1 },
      ]),
    ).toEqual([
      '[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00',
      '',
      '    Which teams?',
      '',
      '    > **anna** · 2026-10-28 11:02+01:00',
      '    >',
      '    > The teams.',
      '    >',
      '    > > **hannes** · 2026-10-28 11:30+01:00',
      '    > >',
      '    > > Thanks.',
      '    > >',
      '    > > Two.',
      '    >',
      '    > > **eve** · 2026-10-28 11:40+01:00',
      '    > >',
      '    > > Me too.',
      '',
      '    > **bob** · 2026-10-28 12:00+01:00',
      '    >',
      '    > Another.',
    ]);
  });

  test('reads back the answers that it writes', () => {
    const answers = [
      { author: 'hannes', date: '2026-10-28 10:15+01:00', body: '# Heading\n\n```js\nconst a = 1;\n\nconst b = 2;\n```', depth: 0 },
      { author: 'anna', date: '2026-10-28 11:02Z', body: '> quoted\n\n- [ ] task', depth: 1 },
      { author: 'eve', date: '2026-10-28 11:03Z', body: '```\n> code\n```\n\n> > deep', depth: 2 },
      { author: 'bob', date: '2026-10-28 11:04Z', body: 'Deeper.', depth: 3 },
      { author: 'ann', date: '2026-10-28 11:05Z', body: 'Back.', depth: 1 },
    ];
    expect(readNote(noteLines('note-7k2q', answers))?.answers.map(({ author, date, body, depth }) => ({ author, date, body, depth }))).toEqual(answers);
  });

  test('writes a note without a body as its header alone', () => {
    expect(noteLines('note-7k2q', [{ author: 'hannes', date: '2026-10-28 10:15Z', body: '' }])).toEqual(['[^note-7k2q]: **hannes** · 2026-10-28 10:15Z']);
  });
});

describe('dates', () => {
  test('a new date is the local date and time with the offset of the zone', () => {
    expect(formatDate(new Date('2026-10-28T09:15:42Z'))).toBe('2026-10-28 10:15+01:00');
    expect(formatDate(new Date('2026-07-01T09:15:00Z'))).toBe('2026-07-01 11:15+02:00');
  });

  test('a date with a zone shows in the local time of the reader', () => {
    expect(displayDate('2026-10-28 10:15+01:00')).toBe('2026-10-28 10:15');
    expect(displayDate('2026-10-28 09:15Z')).toBe('2026-10-28 10:15');
    expect(displayDate('2026-10-28 03:15-05:00')).toBe('2026-10-28 09:15');
    expect(displayDate('2026-10-28 10:15')).toBe('2026-10-28 10:15');
    expect(displayDate('yesterday')).toBe('yesterday');
    expect(parseDate('2026-10-28 10:15+01:00')?.toISOString()).toBe('2026-10-28T09:15:00.000Z');
    expect(authorDate('2026-10-28 03:15-05:00')).toBe('2026-10-28 03:15 at the author (UTC\u221205:00)');
    expect(authorDate('2026-10-28 09:15Z')).toBe('2026-10-28 09:15 at the author (UTC)');
    expect(parseDate('2026-02-31 10:15Z')).toBeUndefined();
  });

  test('a body loses the blank lines and the white space around it', () => {
    expect(normalizeBody('\r\n  Text\r\n\r\nMore  \r\n\n')).toBe('Text\n\nMore');
  });
});
