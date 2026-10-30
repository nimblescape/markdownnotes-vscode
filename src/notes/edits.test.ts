// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the changes of the Markdown text when an answer is saved
 * (R-EDIT-002), when a note is added (R-EDIT-003) with its start marker, its
 * reference and its definition after the block (R-NOTE-006), when an answer
 * or a note is deleted (R-EDIT-004), and when an answer or a reply to an
 * answer is added (R-EDIT-005, R-NOTE-004).
 * A text that markdown-it would not read back as the same note never reaches
 * the file.
 */

import { describe, expect, test } from 'vitest';
import { appendAnswer, applyEdit, colorNote, deleteAnswer, deleteNote, type Edit, highlightFor, insertNote, replaceAnswer, replaceNoteText, type Result, todoNote } from './edits';
import { findNotes, type Position } from './notes';

/**
 * lines returns the lines of a text.
 * @param text - The text.
 */
const lines = (text: string): string[] => text.split('\n');

/**
 * after returns the text after the edit of a result, or the problem of the result.
 * @param text - The lines of the text.
 * @param result - The result.
 */
const after = (text: string[], result: Result | Edit): string | object =>
  'problem' in result ? result.problem : applyEdit(text, 'edit' in result ? result.edit : result).join('\n');

/** fields are the author and the date of a new answer. */
const fields = { author: 'hannes', date: '2026-10-28 10:15+01:00' };

/** random returns the random numbers that give the label `note-7k2q`. */
const random = (): (() => number) => {
  const values = [33, 10, 28, 16].map((index) => (index + 0.5) / 36);
  let index = 0;
  return () => values[index++ % values.length];
};

/**
 * add adds a note with the body `Which teams?` for a range of a text and returns the text after the change.
 * @param text - The text.
 * @param start - The start of the range.
 * @param end - The end of the range, else the start.
 */
const add = (text: string, start: Position, end: Position = start): string | object => {
  const source = lines(text);
  return after(source, insertNote(source, { start, end }, 'Which teams?', fields, random()));
};

/** definition is the definition of the new note of add. */
const definition = '[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00\n\n    Which teams?';

describe('insertNote', () => {
  test('a selection gets a start marker and a reference, and the note goes after the paragraph', () => {
    const text = 'The agents change the work\nof teams.\n\nNext.\n';
    expect(add(text, { line: 0, character: 11 }, { line: 0, character: 26 })).toBe(
      `The agents <wbr><!--[note-7k2q-->change the work[^note-7k2q]\nof teams.\n\n${definition}\n\nNext.\n`,
    );
  });

  test('an empty range adds no note: a note always highlights text', () => {
    expect(add('The agents change the work.\n', { line: 0, character: 4 })).toEqual({ kind: 'noText' });
  });

  test('every note has a start marker, also at the start of the paragraph and at the start of a later line', () => {
    const text = 'The agents\nchange the work.';
    expect(add(text, { line: 0, character: 0 }, { line: 1, character: 6 })).toBe(`<wbr><!--[note-7k2q-->The agents\nchange[^note-7k2q] the work.\n\n${definition}`);
    expect(add(text, { line: 1, character: 0 }, { line: 1, character: 6 })).toBe(`The agents\n<wbr><!--[note-7k2q-->change[^note-7k2q] the work.\n\n${definition}`);
  });

  test('a selection of whole lines ends at the end of the last selected line', () => {
    expect(add('One.\nTwo.\nThree.', { line: 0, character: 0 }, { line: 2, character: 0 })).toBe(`<wbr><!--[note-7k2q-->One.\nTwo.[^note-7k2q]\nThree.\n\n${definition}`);
  });

  test('the reference never stands in a link or a code span', () => {
    expect(add('See [the plan](plan.md) now.', { line: 0, character: 4 }, { line: 0, character: 10 })).toBe(
      `See <wbr><!--[note-7k2q-->[the plan](plan.md)[^note-7k2q] now.\n\n${definition}`,
    );
    expect(add('Run `npm test` now.', { line: 0, character: 6 }, { line: 0, character: 9 })).toBe(`Run <wbr><!--[note-7k2q-->\`npm test\`[^note-7k2q] now.\n\n${definition}`);
  });

  test('a note in a list or a block quote goes after the whole list or quote, at the start of the line', () => {
    expect(add('- One\n- Two\n\nNext.', { line: 0, character: 2 }, { line: 0, character: 5 })).toBe(`- <wbr><!--[note-7k2q-->One[^note-7k2q]\n- Two\n\n${definition}\n\nNext.`);
    expect(add('> Quoted\n> text.\n\nNext.', { line: 0, character: 2 }, { line: 1, character: 6 })).toBe(
      `> <wbr><!--[note-7k2q-->Quoted\n> text[^note-7k2q].\n\n${definition}\n\nNext.`,
    );
    expect(add('> Quoted\n> text.\nLazy.', { line: 1, character: 2 }, { line: 1, character: 6 })).toBe(
      `> Quoted\n> <wbr><!--[note-7k2q-->text[^note-7k2q].\nLazy.\n\n${definition}`,
    );
  });

  test('a note in a table goes after the table, with a start marker also at the start of a cell', () => {
    expect(add('| A | B |\n| - | - |\n| one | two |', { line: 2, character: 9 }, { line: 2, character: 11 })).toBe(
      `| A | B |\n| - | - |\n| one | t<wbr><!--[note-7k2q-->wo[^note-7k2q] |\n\n${definition}`,
    );
    expect(add('| A | B |\n| - | - |\n| one | two |', { line: 2, character: 8 }, { line: 2, character: 11 })).toBe(
      `| A | B |\n| - | - |\n| one | <wbr><!--[note-7k2q-->two[^note-7k2q] |\n\n${definition}`,
    );
  });

  test('the notes of one block stand in the order of their references', () => {
    const text = 'The agents change the work[^note-aaaa].\n\n[^note-aaaa]: **anna** · 2026-10-28 09:00+01:00\n\nNext.';
    expect(add(text, { line: 0, character: 4 }, { line: 0, character: 10 })).toBe(
      `The <wbr><!--[note-7k2q-->agents[^note-7k2q] change the work[^note-aaaa].\n\n${definition}\n\n[^note-aaaa]: **anna** · 2026-10-28 09:00+01:00\n\nNext.`,
    );
    expect(add(text, { line: 0, character: 38 }, { line: 0, character: 39 })).toBe(
      `The agents change the work[^note-aaaa]<wbr><!--[note-7k2q-->.[^note-7k2q]\n\n[^note-aaaa]: **anna** · 2026-10-28 09:00+01:00\n\n${definition}\n\nNext.`,
    );
  });

  test('a note needs highlighted text of a paragraph, a heading, a list item or a table cell, and a body', () => {
    expect(add('```\ncode\n```', { line: 1, character: 0 }, { line: 1, character: 4 })).toEqual({ kind: 'place' });
    expect(add('Text.\n\nMore.', { line: 0, character: 5 }, { line: 1, character: 0 })).toEqual({ kind: 'place' });
    const source = lines('Text.');
    expect(after(source, insertNote(source, { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, '', fields))).toEqual({ kind: 'empty' });
  });

  test('the new note gets a label that no footnote of the text uses', () => {
    const source = lines('Text[^note-7k2q].\n\n[^note-7k2q]: A footnote of that label.');
    const result = insertNote(source, { start: { line: 0, character: 0 }, end: { line: 0, character: 4 } }, 'Body.', fields, random());
    expect(result.label).not.toBe('note-7k2q');
    expect(result.label).toMatch(/^note-[a-z0-9]{4}$/);
  });
});

/** thread is a text with a note of two answers. */
const thread = [
  'The agents <!--[note-7k2q-->change[^note-7k2q] the work.',
  '',
  '[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00',
  '',
  '    Which teams?',
  '',
  '    > **anna** · 2026-10-28 11:02+01:00',
  '    >',
  '    > The teams of the plan.',
  '',
  'Next.',
].join('\n');

describe('answers', () => {
  test('replaceAnswer writes a new body and keeps the header', () => {
    const source = lines(thread);
    expect(after(source, replaceAnswer(source, findNotes(source)[0], 0, 'Which two teams?\n\n- one'))).toBe(
      thread.replace('    Which teams?', '    Which two teams?\n\n    - one'),
    );
  });

  test('replaceAnswer gives a changed body the date of the save and keeps the author, and an unchanged body keeps its date (R-EDIT-002)', () => {
    const source = lines(thread);
    const [note] = findNotes(source);
    const date = '2026-10-28 12:30+01:00';
    const changed = after(source, replaceAnswer(source, note, 1, 'The teams of the new plan.', date)) as string;
    expect(changed).toBe(thread.replace('    > **anna** · 2026-10-28 11:02+01:00', `    > **anna** · ${date}`).replace('of the plan.', 'of the new plan.'));
    expect(after(source, replaceAnswer(source, note, 1, 'The teams of the plan.', date))).toBe(thread);
  });

  test('appendAnswer adds a block quote with the header and the body', () => {
    const source = lines(thread);
    expect(after(source, appendAnswer(source, findNotes(source)[0], 'Thanks.', { author: 'hannes', date: '2026-10-28 11:30+01:00' }))).toBe(
      thread.replace('    > The teams of the plan.', '    > The teams of the plan.\n\n    > **hannes** · 2026-10-28 11:30+01:00\n    >\n    > Thanks.'),
    );
  });

  test('deleteAnswer removes an answer, and after the first one the next answer becomes the first', () => {
    const source = lines(thread);
    const note = findNotes(source)[0];
    expect(after(source, deleteAnswer(source, note, 1))).toBe(thread.replace('\n\n    > **anna** · 2026-10-28 11:02+01:00\n    >\n    > The teams of the plan.', ''));
    expect(after(source, deleteAnswer(source, note, 0))).toBe(
      thread.replace('[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00\n\n    Which teams?\n\n    > **anna** · 2026-10-28 11:02+01:00\n    >\n    > The teams', '[^note-7k2q]: **anna** · 2026-10-28 11:02+01:00\n\n    The teams'),
    );
  });

  test('appendAnswer adds a reply to an answer after the replies to it, one level deeper', () => {
    const source = lines(thread);
    const note = findNotes(source)[0];
    const reply = appendAnswer(source, note, 'Thanks.', { author: 'hannes', date: '2026-10-28 11:30+01:00' }, 1);
    expect(after(source, reply)).toBe(
      thread.replace('    > The teams of the plan.', '    > The teams of the plan.\n    >\n    > > **hannes** · 2026-10-28 11:30+01:00\n    > >\n    > > Thanks.'),
    );
    const replied = applyEdit(source, (reply as { edit: Edit }).edit);
    // A reply to the first answer goes after the whole tree below it.
    expect(after(replied, appendAnswer(replied, findNotes(replied)[0], 'Later.', { author: 'eve', date: '2026-10-28 12:00+01:00' }, 0))).toBe(
      `${replied.join('\n').replace('    > > Thanks.', '    > > Thanks.\n\n    > **eve** · 2026-10-28 12:00+01:00\n    >\n    > Later.')}`,
    );
    expect(appendAnswer(source, note, 'Text.', fields, 5)).toEqual({ problem: { kind: 'missing' } });
  });

  test('deleteAnswer keeps the replies of the removed answer one level higher', () => {
    const text = [
      'Text[^note-7k2q].',
      '',
      '[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00',
      '',
      '    Which teams?',
      '',
      '    > **anna** · 2026-10-28 11:02+01:00',
      '    >',
      '    > The teams.',
      '    >',
      '    > > **eve** · 2026-10-28 11:40+01:00',
      '    > >',
      '    > > Me too.',
    ].join('\n');
    const source = lines(text);
    const note = findNotes(source)[0];
    expect(after(source, deleteAnswer(source, note, 1))).toBe(
      ['Text[^note-7k2q].', '', '[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00', '', '    Which teams?', '', '    > **eve** · 2026-10-28 11:40+01:00', '    >', '    > Me too.'].join('\n'),
    );
    expect(after(source, deleteAnswer(source, note, 0))).toBe(
      ['Text[^note-7k2q].', '', '[^note-7k2q]: **anna** · 2026-10-28 11:02+01:00', '', '    The teams.', '', '    > **eve** · 2026-10-28 11:40+01:00', '    >', '    > Me too.'].join('\n'),
    );
  });

  test('a text that would start another answer is not written, and an empty text neither', () => {
    const source = lines(thread);
    const note = findNotes(source)[0];
    expect(after(source, replaceAnswer(source, note, 0, 'Text.\n\n> **eve** · 2026-10-28 12:00+01:00'))).toEqual({ kind: 'structure' });
    expect(after(source, appendAnswer(source, note, '', fields))).toEqual({ kind: 'empty' });
  });

  test('a note in a list item keeps the prefix of its lines', () => {
    const text = '- Item[^note-7k2q]\n\n  [^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00\n\n      Text.';
    const source = lines(text);
    expect(after(source, replaceAnswer(source, findNotes(source)[0], 0, 'New\n\ntext.'))).toBe(
      '- Item[^note-7k2q]\n\n  [^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00\n\n      New\n\n      text.',
    );
  });
});

describe('deleteNote', () => {
  test('removes the definition with one blank line, the reference and the start marker', () => {
    const source = lines(thread);
    expect(after(source, deleteNote(source, findNotes(source)[0]))).toBe('The agents change the work.\n\nNext.');
  });

  test('removes a note at the end of the text and a point', () => {
    const source = lines('Text.<!--[note-7k2q-->[^note-7k2q]\n\n[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00\n\n    Body.\n');
    expect(after(source, deleteNote(source, findNotes(source)[0]))).toBe('Text.\n');
  });

  test('the only answer of a note goes with the note', () => {
    const source = lines('Text[^note-7k2q].\n\n[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00\n\n    Body.');
    expect(after(source, deleteAnswer(source, findNotes(source)[0], 0))).toBe('Text.');
  });
});

describe('colorNote', () => {
  test('writes the color into the start marker, and the default color as a marker without a color (R-TEXT-006)', () => {
    const source = lines(thread);
    const green = after(source, colorNote(source, findNotes(source)[0], 'green'));
    expect(green).toBe(thread.replace('<!--[note-7k2q-->', '<wbr><!--[note-7k2q green-->'));
    const back = lines(green as string);
    expect(after(back, colorNote(back, findNotes(back)[0], undefined))).toBe(thread.replace('<!--[note-7k2q-->', '<wbr><!--[note-7k2q-->'));
    expect(after(back, colorNote(back, findNotes(back)[0], 'blue'))).toBe(thread.replace('<!--[note-7k2q-->', '<wbr><!--[note-7k2q-->'));
  });

  test('a color that the start marker cannot hold is not written', () => {
    const source = lines(thread);
    expect(after(source, colorNote(source, findNotes(source)[0], 'Green'))).toEqual({ kind: 'structure' });
  });
});

describe('todoNote', () => {
  /** todo is a note of two answers, which is no todo note. */
  const todo = 'The <wbr><!--[note-7k2q-->text[^note-7k2q].\n\n[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00\n\n    Fix it.\n\n    > **anna** · 2026-10-28 11:00Z\n    >\n    > Soon.';

  test('writes the state of a todo note into the header of its first answer, and takes it away (R-NOTE-008)', () => {
    const source = lines(todo);
    const open = after(source, todoNote(source, findNotes(source)[0], 'todo'));
    expect(open).toBe(todo.replace('10:15+01:00\n', '10:15+01:00 · todo\n'));
    const opened = lines(open as string);
    expect(findNotes(opened)[0].answers.map((answer) => answer.todo)).toEqual(['todo', undefined]);
    const done = after(opened, todoNote(opened, findNotes(opened)[0], 'done'));
    expect(done).toBe(todo.replace('10:15+01:00\n', '10:15+01:00 · done\n'));
    const completed = lines(done as string);
    expect(after(completed, todoNote(completed, findNotes(completed)[0], undefined))).toBe(todo);
    // A change of the text of the first answer keeps the state, and a new reply has none.
    expect(after(completed, replaceAnswer(completed, findNotes(completed)[0], 0, 'Fix it now.', '2026-10-29 09:00+01:00'))).toContain('[^note-7k2q]: **hannes** · 2026-10-29 09:00+01:00 · done\n\n    Fix it now.');
    expect(after(completed, appendAnswer(completed, findNotes(completed)[0], 'Thanks.', fields))).toContain('    > **hannes** · 2026-10-28 10:15+01:00\n    >\n    > Thanks.');
  });

  test('the state goes to the answer that takes the place of the first answer (R-EDIT-004)', () => {
    const source = lines(todo.replace('10:15+01:00\n', '10:15+01:00 · done\n'));
    expect(after(source, deleteAnswer(source, findNotes(source)[0], 0))).toBe(
      'The <wbr><!--[note-7k2q-->text[^note-7k2q].\n\n[^note-7k2q]: **anna** · 2026-10-28 11:00Z · done\n\n    Soon.',
    );
  });
});

describe('replaceNoteText', () => {
  /** own is the text of the note of thread, as the text view shows it. */
  const own = thread.split('\n').slice(2, 9).join('\n');

  test('writes the text of the text view as the definition of the note', () => {
    const source = lines(thread);
    const text = own.replace('    Which teams?', '    Which two teams?');
    expect(after(source, replaceNoteText(source, findNotes(source)[0], text))).toBe(thread.replace('    Which teams?', '    Which two teams?'));
  });

  test('keeps the prefix of a note in a list item', () => {
    const text = '- The agents <!--[note-7k2q-->change[^note-7k2q] the work.\n\n  [^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00\n\n      Which teams?\n';
    const source = lines(text);
    const note = findNotes(source)[0];
    expect(after(source, replaceNoteText(source, note, '[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00\n\n    Which two teams?'))).toBe(
      text.replace('Which teams?', 'Which two teams?'),
    );
  });

  test('refuses a text that is no longer this one note, and an empty text', () => {
    const source = lines(thread);
    const note = findNotes(source)[0];
    expect(after(source, replaceNoteText(source, note, own.replace('[^note-7k2q]:', '[^note-aaaa]:')))).toEqual({ kind: 'text', label: 'note-7k2q' });
    expect(after(source, replaceNoteText(source, note, `${own}\n\n[^note-bbbb]: **anna** · 2026-10-28 11:00+01:00\n\n    More.`))).toEqual({ kind: 'text', label: 'note-7k2q' });
    expect(after(source, replaceNoteText(source, note, `${own}\n\nNot indented.`))).toEqual({ kind: 'text', label: 'note-7k2q' });
    expect(after(source, replaceNoteText(source, note, '  \n'))).toEqual({ kind: 'empty' });
  });
});

describe('highlightFor', () => {
  test('gives the place of a note for a selection in one block, and none for a selection over several blocks or without text', () => {
    const source = lines('The agents change the work.\n\nOf teams.');
    expect(highlightFor(source, { start: { line: 0, character: 4 }, end: { line: 0, character: 10 } })).toEqual({ marker: { line: 0, character: 4 }, reference: { line: 0, character: 10 }, line: 1 });
    expect(highlightFor(source, { start: { line: 0, character: 4 }, end: { line: 2, character: 3 } })).toBeUndefined();
    expect(highlightFor(source, { start: { line: 0, character: 27 }, end: { line: 1, character: 0 } })).toBeUndefined();
    expect(highlightFor(source, { start: { line: 0, character: 4 }, end: { line: 0, character: 4 } })).toBeUndefined();
  });
});
