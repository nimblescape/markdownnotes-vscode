// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the hidden form of the notes (R-HIDE-001 to R-HIDE-003):
 * the escape of the end of a comment, the reading of a note whose definition is
 * an HTML comment and whose end marker is a comment, the writes of the extension
 * in the form of the file, the switch of all notes of a file to the other form
 * (R-HIDE-002), the word `hidden` of the comment of the format, and the
 * formatter, which writes each note in the form of its file.
 */

import MarkdownIt from 'markdown-it';
import { describe, expect, test } from 'vitest';
import { extendMarkdownIt } from '../markdown/markdownIt';
import { formatMarkdown } from '../format/format';
import { project } from './clean';
import { checksOf } from './checks';
import { doctypeLines, doctypeLinesOf, findDoctype } from './doctype';
import { appendAnswer, applyEdit, convertForm, deleteNote, hiddenForm, insertNote, notesInForm, replaceAnswer, replaceNoteText, type Result } from './edits';
import { findNotes, read } from './notes';
import { escapeHidden, unescapeHidden } from './syntax';

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
const after = (text: string[], result: Result): string | object => ('problem' in result ? result.problem : applyEdit(text, result.edit).join('\n'));

/** fields are the author and the date of a new answer. */
const fields = { author: 'hannes', date: '2026-10-28 10:15+01:00' };

/**
 * random returns the random numbers that give a label, by default `note-7k2q`.
 * @param characters - The four characters of the label.
 */
const random = (characters = '7k2q'): (() => number) => {
  const values = [...characters].map((character) => ('abcdefghijklmnopqrstuvwxyz0123456789'.indexOf(character) + 0.5) / 36);
  let index = 0;
  return () => values[index++ % values.length];
};

/** visible is a text with one note in the visible form, with a reply. */
const visible = [
  'The agents <wbr><!--[note-7k2q green-->change the work of teams[^note-7k2q] in three ways.',
  '',
  '[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00',
  '',
  '    Which three ways? The code `a --> b` stays.',
  '',
  '    > **anna** · 2026-10-28 11:02+01:00',
  '    >',
  '    > See the plan.',
  '',
  'Next paragraph.',
  '',
].join('\n');

/** hidden is the text of visible in the hidden form. */
const hidden = [
  'The agents <wbr><!--[note-7k2q green-->change the work of teams<!--note-7k2q]--> in three ways.',
  '',
  '<!--',
  '[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00',
  '',
  '    Which three ways? The code `a --\\> b` stays.',
  '',
  '    > **anna** · 2026-10-28 11:02+01:00',
  '    >',
  '    > See the plan.',
  '-->',
  '',
  'Next paragraph.',
  '',
].join('\n');

describe('the escape of the hidden form', () => {
  test('gives each end of a comment one more backslash, and the reading removes it again', () => {
    expect(escapeHidden('a --> b --!> c --\\> d')).toBe('a --\\> b --!\\> c --\\\\> d');
    for (const text of ['-->', '--!>', '--\\>', '--\\\\!>', '--->', '<!-- x -->', 'a -- > b', '--!\\\\>']) {
      expect(unescapeHidden(escapeHidden(text))).toBe(text);
      expect(escapeHidden(text)).not.toMatch(/--!?>/);
    }
  });
});

describe('the reading of the hidden form', () => {
  test('reads the note, its answers, its end marker and its highlight', () => {
    const [note] = findNotes(lines(hidden));
    expect(note).toMatchObject({ label: 'note-7k2q', hidden: true, start: { line: 2, character: 0 }, end: { line: 10, character: 3 }, color: 'green' });
    expect(note.answers.map((answer) => [answer.author, answer.body, answer.depth])).toEqual([
      ['hannes', 'Which three ways? The code `a --> b` stays.', 0],
      ['anna', 'See the plan.', 1],
    ]);
    expect(note.reference).toEqual({ start: { line: 0, character: 63 }, end: { line: 0, character: 80 } });
    expect(note.selection).toMatchObject({ start: { line: 0, character: 39 }, end: { line: 0, character: 63 } });
  });

  test('reads the same answers as the visible form', () => {
    const strip = (text: string) => findNotes(lines(text)).map(({ label, answers, color }) => ({ label, answers, color }));
    expect(strip(hidden)).toEqual(strip(visible));
  });

  test('leaves a comment that is no note, or a note whose comment ends early, to the blocks of HTML', () => {
    expect(findNotes(lines('Text.\n\n<!--\nA comment.\n-->\n'))).toEqual([]);
    const early = 'Text<!--note-7k2q]-->.\n\n<!--\n[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00\n\n    a --> b\n-->\n';
    expect(findNotes(lines(early))).toEqual([]);
  });

  test('finds an end marker at the start of a line, which ends the paragraph', () => {
    const text = 'Text\n<!--note-7k2q]--> more.\n\n<!--\n[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00\n-->\n';
    expect(read(lines(text)).endMarkersInHtml).toEqual([{ line: 1, character: 0 }]);
  });

  test('tells the form of a text by the comment of the format, or by its notes', () => {
    expect(hiddenForm(lines(hidden))).toBe(true);
    expect(hiddenForm(lines(visible))).toBe(false);
    expect(hiddenForm(['No notes.'])).toBeUndefined();
    expect(hiddenForm([...doctypeLinesOf(true), '', 'No notes.'])).toBe(true);
    expect(hiddenForm([...doctypeLines, '', ...lines(hidden)])).toBe(false);
  });
});

describe('the comment of the format', () => {
  test('holds the word hidden after the version in the hidden form', () => {
    expect(doctypeLinesOf(true)[0]).toMatch(/^<!-- nimblescape-markdownnotes v1\.0\.0 hidden spec=https:/);
    expect(findDoctype([...doctypeLinesOf(true)])?.hidden).toBe(true);
    expect(findDoctype([...doctypeLines])?.hidden).toBe(false);
    expect(findDoctype(['<!-- nimblescape-markdownnotes v1.0.0 spec=https://x/hidden -->'])?.hidden).toBe(false);
    expect(doctypeLinesOf(true).slice(0, -1).join('\n')).not.toContain('-->');
  });
});

describe('the writes in the hidden form', () => {
  test('a new note of a text in the hidden form is hidden, with its end marker and its comment', () => {
    const text = lines(`${doctypeLinesOf(true).join('\n')}\n\nThe agents change the work.\n`);
    const line = doctypeLinesOf(true).length + 1;
    // The comment of the format names the label note-7k2q as an example.
    const result = insertNote(text, { start: { line, character: 4 }, end: { line, character: 10 } }, 'Who?', fields, random('p3x9'));
    expect(after(text, result)).toBe(
      `${doctypeLinesOf(true).join('\n')}\n\nThe <wbr><!--[note-p3x9-->agents<!--note-p3x9]--> change the work.\n\n<!--\n[^note-p3x9]: **hannes** · 2026-10-28 10:15+01:00\n\n    Who?\n-->\n`,
    );
  });

  test('the first note of a file is hidden with the setting hideNotesInNewFiles', () => {
    const text = ['Text here.'];
    const result = insertNote(text, { start: { line: 0, character: 0 }, end: { line: 0, character: 4 } }, 'Why?', fields, random(), undefined, true);
    expect(after(text, result)).toBe('<wbr><!--[note-7k2q-->Text<!--note-7k2q]--> here.\n\n<!--\n[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00\n\n    Why?\n-->');
    // A file with notes keeps its form.
    const shown = lines(visible);
    const kept = insertNote(shown, { start: { line: 10, character: 0 }, end: { line: 10, character: 4 } }, 'Why?', fields, random(), undefined, true);
    expect(after(shown, kept)).toMatch(/Next\[\^note-[a-z0-9]{4}\]/);
  });

  test('an answer is written in the hidden form and escaped', () => {
    const text = lines(hidden);
    const [note] = findNotes(text);
    const changed = after(text, appendAnswer(text, note, 'Use <!-- x --> here.', { author: 'bert', date: '2026-10-28 12:00+01:00' }));
    expect(changed).toContain('    > Use <!-- x --\\> here.\n-->');
    const [again] = findNotes(lines(changed as string));
    expect(again.answers.at(-1)?.body).toBe('Use <!-- x --> here.');
    expect(after(text, replaceAnswer(text, note, 1, 'Done -->'))).toContain('    > Done --\\>\n-->');
  });

  test('the text view writes the definition into its comment', () => {
    const text = lines(hidden);
    const [note] = findNotes(text);
    const own = '[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00\n\n    a --> b';
    expect(after(text, replaceNoteText(text, note, own))).toBe(hidden.replace(/<!--\n[^]*?\n-->/, '<!--\n[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00\n\n    a --\\> b\n-->'));
  });

  test('the deletion of a note takes its comment and its end marker', () => {
    const text = lines(hidden);
    const [note] = findNotes(text);
    expect(applyEdit(text, deleteNote(text, note)).join('\n')).toBe('The agents change the work of teams in three ways.\n\nNext paragraph.\n');
  });
});

describe('the switch of the form (R-HIDE-002)', () => {
  test('writes all notes in the hidden form with the word hidden, and back, in one edit each', () => {
    const shown = lines(`${doctypeLines.join('\n')}\n\n${visible}`);
    const hiddenText = after(shown, convertForm(shown, true)) as string;
    expect(hiddenText).toBe(`${doctypeLinesOf(true).join('\n')}\n\n${hidden}`);
    expect(after(lines(hiddenText), convertForm(lines(hiddenText), false))).toBe(shown.join('\n'));
  });

  test('adds the comment of the format and blank lines around a comment', () => {
    const text = lines('Text[^note-7k2q].\n\n[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00\n# Next');
    expect(after(text, convertForm(text, true))).toBe(
      `${doctypeLinesOf(true).join('\n')}\n\nText<!--note-7k2q]-->.\n\n<!--\n[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00\n-->\n\n# Next`,
    );
  });

  test('keeps the notes in a block quote in their block quote', () => {
    const text = lines('> Text[^note-7k2q].\n>\n> [^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00\n>\n>     Why?\n');
    const result = after(text, convertForm(text, true)) as string;
    expect(result).toContain('> <!--\n> [^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00\n>\n>     Why?\n> -->\n');
    expect(findNotes(lines(result))).toMatchObject([{ hidden: true, prefix: '> ', answers: [{ body: 'Why?' }] }]);
  });

  test('refuses a text without notes', () => {
    expect(convertForm(['Text.'], true)).toEqual({ problem: { kind: 'missing' } });
  });
});

describe('the readers of both forms (R-HIDE-003)', () => {
  test('the formatter writes a visible note of a hidden file in the hidden form', () => {
    const text = lines(`${doctypeLinesOf(true).join('\n')}\n\n${visible}`);
    expect(notesInForm(text).join('\n')).toBe(`${doctypeLinesOf(true).join('\n')}\n\n${hidden}`);
    expect(formatMarkdown(text).join('\n')).toBe(`${doctypeLinesOf(true).join('\n')}\n\n${hidden}`);
    // A file in its form stays as it is.
    expect(formatMarkdown(lines(hidden)).join('\n')).toBe(hidden);
  });

  test('the formatter joins an end marker at the start of a line to its paragraph', () => {
    const text = lines('The agents change\n<!--note-7k2q]--> the work.\n\n<!--\n[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00\n-->\n');
    expect(formatMarkdown(text).join('\n')).toBe('<wbr><!--[note-7k2q-->The agents change <!--note-7k2q]--> the work.\n\n<!--\n[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00\n-->\n');
  });

  test('the preview shows no part of a hidden note and its highlight', () => {
    const md = extendMarkdownIt(new MarkdownIt({ html: true }), { settingsOf: () => ({ showHighlights: true }), linkOf: () => 'link' });
    const html = md.render(hidden);
    expect(html).not.toContain('three ways?');
    expect(html).not.toContain('note-7k2q]');
    expect(html).toContain('data-edge="start"');
    expect(html).toContain('data-note="note-7k2q"');
    expect(html).toContain('<p>Next paragraph.</p>');
  });

  test('markdown-it without the extension, as GitHub, shows no part of a hidden note', () => {
    const html = new MarkdownIt({ html: true }).render(hidden);
    expect(html.replace(/<!--[^]*?-->/g, '')).toBe('<p>The agents <wbr>change the work of teams in three ways.</p>\n\n<p>Next paragraph.</p>\n');
  });

  test('the clean editing view leaves out the comment, the markers and the blank line after the comment', () => {
    expect(project(hidden).clean).toBe('The agents change the work of teams in three ways.\n\nNext paragraph.\n');
  });

  test('the checks warn of a note in the other form, and not of a missing indentation in the comment', () => {
    const text = lines(`${doctypeLinesOf(true).join('\n')}\n\n${visible}`);
    expect(checksOf(text, read(text)).map((check) => check.message)).toEqual([expect.stringContaining('visible form in a file whose notes are hidden')]);
    expect(checksOf(lines(hidden), read(lines(hidden)))).toEqual([]);
  });
});
