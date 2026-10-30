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
import { compareVersions, doctypeEdit, doctypeLines, findDoctype, formatVersion, frontMatterEnd, newerFormat, specUrl, versionText } from './doctype';
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
    expect(doctypeLines[0]).toBe(`<!-- nimblescape-markdownnotes v1.0.0 spec=${specUrl}`);
    expect(versionText(formatVersion)).toBe('1.0.0');
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
    expect(findDoctype(lines(`# T\n\n${comment}\n`))).toEqual({ start: 2, end: 2 + doctypeLines.length - 1, version: { major: 1, minor: 0, patch: 0 } });
    expect(findDoctype(['<!-- nimblescape-markdownnotes v2.10.3 spec=x -->'])).toEqual({ start: 0, end: 0, version: { major: 2, minor: 10, patch: 3 } });
    expect(findDoctype(['<!-- nimblescape-markdownnotes', '-->'])).toEqual({ start: 0, end: 1, version: undefined });
    // The first form of the comment named the version as format=1, which reads as no version.
    expect(findDoctype(['<!-- nimblescape-markdownnotes format=1 spec=x -->'])).toEqual({ start: 0, end: 0, version: undefined });
    // The comment of the earlier name counts as older.
    expect(findDoctype(['<!-- nimblescape-markdown-notes v1.0.0 spec=x -->'])).toEqual({ start: 0, end: 0, version: undefined });
    expect(findDoctype(lines(`\`\`\`markdown\n${comment}\n\`\`\`\n`))).toBeUndefined();
    expect(findDoctype(['Text <!-- nimblescape-markdownnotes -->'])).toBeUndefined();
  });

  test('names a newer major version of the format than the extension knows, so that the extension changes no note', () => {
    expect(newerFormat(['<!-- nimblescape-markdownnotes v2.0.0 -->'])).toEqual({ major: 2, minor: 0, patch: 0 });
    // A newer minor or patch version adds only what the extension reads and keeps.
    expect(newerFormat(['<!-- nimblescape-markdownnotes v1.4.2 -->'])).toBeUndefined();
    expect(newerFormat(lines(`${comment}\n`))).toBeUndefined();
    expect(newerFormat(['<!-- nimblescape-markdownnotes', '-->'])).toBeUndefined();
    expect(newerFormat(['# Title'])).toBeUndefined();
  });

  test('compares semantic versions by their major, minor and patch numbers', () => {
    const version = (major: number, minor: number, patch: number) => ({ major, minor, patch });
    expect(compareVersions(version(1, 0, 0), version(1, 0, 0))).toBe(0);
    expect(compareVersions(version(1, 0, 1), version(1, 0, 0))).toBeGreaterThan(0);
    expect(compareVersions(version(1, 10, 0), version(1, 9, 9))).toBeGreaterThan(0);
    expect(compareVersions(version(1, 9, 9), version(2, 0, 0))).toBeLessThan(0);
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

  test('keeps a comment of the same or a higher version also with another text, writes an older one anew, and removes the comment from a text without notes', () => {
    expect(doctypeEdit(lines(`${comment}\n\n${noted}`), true)).toBeUndefined();
    // Only a higher version writes the comment anew.
    for (const kept of ['<!-- nimblescape-markdownnotes v1.0.0 spec=x\nOther words.\n-->', '<!-- nimblescape-markdownnotes v1.0.1 -->', '<!-- nimblescape-markdownnotes v1.2.0 -->', '<!-- nimblescape-markdownnotes v2.0.0 -->']) {
      expect(doctypeEdit(lines(`${kept}\n\n${noted}`), true), kept).toBeUndefined();
    }
    for (const old of ['<!-- nimblescape-markdownnotes v0.9.9 -->', '<!-- nimblescape-markdownnotes format=1 spec=x\n-->', '<!-- nimblescape-markdownnotes\n-->', '<!-- nimblescape-markdown-notes v1.0.0 spec=x\n-->']) {
      expect(after(`${old}\n\n${noted}`, [doctypeEdit(lines(`${old}\n\n${noted}`), true)!]), old).toBe(`${comment}\n\n${noted}`);
    }
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
