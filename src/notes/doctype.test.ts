// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the comment that marks a Markdown file with notes
 * (R-NOTE-007): its text, which no Markdown tool shows and which holds no
 * end of a comment before its last line; its place at the top of the file
 * after a front matter; its new text for another version; its removal with
 * the last note; and the edits of a change of the extension together with it.
 */

import MarkdownIt from 'markdown-it';
import { describe, expect, test } from 'vitest';
import { doctypeEdit, doctypeLines, findDoctype, formatVersion, frontMatterEnd, newerFormat, specUrl } from './doctype';
import { applyEdit, type Edit, insertNote, withDoctype } from './edits';
import { findNotes } from './notes';

/**
 * lines returns the lines of a text.
 * @param text - The text.
 */
const lines = (text: string): string[] => text.split('\n');

/** comment is the text of the comment. */
const comment = doctypeLines.join('\n');

/**
 * after returns the text after the edits.
 * @param text - The text.
 * @param edits - The edits, which refer to the text before them.
 */
const after = (text: string, edits: readonly Edit[]): string =>
  [...edits]
    .sort((a, b) => b.start.line - a.start.line || b.start.character - a.start.character)
    .reduce((current, edit) => applyEdit(current, edit), lines(text))
    .join('\n');

/** noted is a text with a note. */
const noted = 'Text[^note-aaaa].\n\n[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00\n\n    Body.\n';

describe('the comment of the format', () => {
  test('names the format, its version and its specification in its first line, and ends only in its last line', () => {
    expect(doctypeLines[0]).toBe(`<!-- nimblescape-markdown-notes format=${formatVersion} spec=${specUrl}`);
    expect(specUrl).toBe('https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/format.md');
    expect(doctypeLines.slice(0, -1).some((line) => line.includes('-->') || line.includes('<!--', 4))).toBe(false);
    expect(doctypeLines.at(-1)).toBe('-->');
    // No line has a blank line, which a reader of Markdown could take for the end of the block.
    expect(doctypeLines.every((line) => line.trim() !== '')).toBe(true);
  });

  test('is one HTML block that the preview does not show, and holds no note', () => {
    const md = new MarkdownIt({ html: true });
    const tokens = md.parse(`${comment}\n\n${noted}`, {});
    expect(tokens[0]).toMatchObject({ type: 'html_block', content: `${comment}\n` });
    expect(findNotes(lines(`${comment}\n\n${noted}`))).toHaveLength(1);
    expect(md.render(`${comment}\n`)).toBe(`${comment}\n`);
  });

  test('is found at the start of a line outside code blocks, with its version', () => {
    expect(findDoctype(lines(`# T\n\n${comment}\n`))).toEqual({ start: 2, end: 2 + doctypeLines.length - 1, format: 1 });
    expect(findDoctype(['<!-- nimblescape-markdown-notes format=2 spec=x -->'])).toEqual({ start: 0, end: 0, format: 2 });
    expect(findDoctype(['<!-- nimblescape-markdown-notes', '-->'])).toEqual({ start: 0, end: 1, format: undefined });
    expect(findDoctype(lines(`\`\`\`markdown\n${comment}\n\`\`\`\n`))).toBeUndefined();
    expect(findDoctype(['Text <!-- nimblescape-markdown-notes -->'])).toBeUndefined();
  });

  test('names a newer version of the format than the extension knows, so that the extension changes no note', () => {
    expect(newerFormat(['<!-- nimblescape-markdown-notes format=2 -->'])).toBe(2);
    expect(newerFormat(lines(`${comment}\n`))).toBeUndefined();
    expect(newerFormat(['<!-- nimblescape-markdown-notes', '-->'])).toBeUndefined();
    expect(newerFormat(['# Title'])).toBeUndefined();
  });

  test('knows the end of a YAML or TOML front matter', () => {
    expect(frontMatterEnd(['---', 'title: A', '---', '# A'])).toBe(3);
    expect(frontMatterEnd(['---', 'title: A', '...', '# A'])).toBe(3);
    expect(frontMatterEnd(['+++', 'title = "A"', '+++'])).toBe(3);
    expect(frontMatterEnd(['# A', '---'])).toBe(0);
    expect(frontMatterEnd(['---', 'no end'])).toBe(0);
  });
});

describe('the edit of the comment', () => {
  test('puts the comment at the top of a text with notes, with a blank line after it', () => {
    const edit = doctypeEdit(lines(noted), true)!;
    expect(after(noted, [edit])).toBe(`${comment}\n\n${noted}`);
    expect(edit.lines).toBe(doctypeLines.length + 1);
    expect(after(`\n${noted}`, [doctypeEdit(lines(`\n${noted}`), true)!])).toBe(`${comment}\n\n${noted}`);
  });

  test('puts the comment after a front matter, which stays the first block of the file', () => {
    const text = `---\ntitle: A\n---\n${noted}`;
    expect(after(text, [doctypeEdit(lines(text), true)!])).toBe(`---\ntitle: A\n---\n${comment}\n\n${noted}`);
    expect(after('---\ntitle: A\n---', [doctypeEdit(['---', 'title: A', '---'], true)!])).toBe(`---\ntitle: A\n---\n${comment}`);
  });

  test('keeps a current comment, writes an older one anew, and removes the comment from a text without notes', () => {
    expect(doctypeEdit(lines(`${comment}\n\n${noted}`), true)).toBeUndefined();
    const old = `<!-- nimblescape-markdown-notes format=0 -->\n\n${noted}`;
    expect(after(old, [doctypeEdit(lines(old), true)!])).toBe(`${comment}\n\n${noted}`);
    expect(after(`${comment}\n\n# Title\n`, [doctypeEdit(lines(`${comment}\n\n# Title\n`), false)!])).toBe('# Title\n');
    expect(after(`# Title\n\n${comment}`, [doctypeEdit(lines(`# Title\n\n${comment}`), false)!])).toBe('# Title\n');
    expect(doctypeEdit(['# Title'], false)).toBeUndefined();
  });

  test('comes with the edit of a change in one change, and moves the places after it', () => {
    const text = '# Title\n\nThe text of the page.\n';
    const result = insertNote(lines(text), { start: { line: 2, character: 4 }, end: { line: 2, character: 8 } }, 'Body.', { author: 'ann', date: '2026-10-28 10:15+01:00' });
    if ('problem' in result) {
      throw new Error('no note');
    }
    const { edits, shift } = withDoctype(lines(text), result.edit);
    const written = after(text, edits);
    expect(written.startsWith(`${comment}\n\n# Title\n\nThe <wbr><!--[`)).toBe(true);
    const start = shift(result.start!);
    expect(findNotes(lines(written)).map((note) => note.start)).toEqual([start]);
    expect(start.line).toBe(result.start!.line + doctypeLines.length + 1);
  });

  test('joins with an edit at the same place, and leaves a text without a change of the comment as it is', () => {
    const text = 'Text.\n';
    const edit: Edit = { start: { line: 0, character: 0 }, end: { line: 0, character: 5 }, text: 'Text[^note-aaaa].\n\n[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00\n\n    Body.' };
    const { edits } = withDoctype(lines(text), edit);
    expect(edits).toHaveLength(1);
    expect(after(text, edits)).toBe(`${comment}\n\n${noted}`);
    const plain: Edit = { start: { line: 0, character: 0 }, end: { line: 0, character: 4 }, text: 'Word' };
    expect(withDoctype(lines(text), plain).edits).toEqual([plain]);
  });
});
