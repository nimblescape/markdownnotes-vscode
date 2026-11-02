// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the Markdown formatter (R-FMT-001 to R-FMT-003): each
 * paragraph on one line with its hard line breaks, the start markers at the
 * start of a line joined to their paragraphs, the aligned tables with the
 * width that the text editor shows, the white space and the blank lines, and
 * the blocks that it keeps as they are.
 */

import { describe, expect, test } from 'vitest';
import { doctypeLines } from '../notes/doctype';
import { findNotes } from '../notes/notes';
import { formatMarkdown, visibleWidth } from './format';

/**
 * format returns a formatted text.
 * @param text - The text.
 */
const format = (text: string): string => formatMarkdown(text.split('\n')).join('\n');

/** note is the definition of a note. */
const note = '[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00\n\n    A body\n    on two lines.  \n    Third line.\n';

describe('the paragraphs', () => {
  test('stand on one line, with their hard line breaks of two spaces or a backslash', () => {
    expect(format('One\ntwo \nthree   \nfour\\\nfive\n')).toBe('One two three   \nfour\\\nfive\n');
    expect(format('An escaped backslash\\\\\nis no break.\n')).toBe('An escaped backslash\\\\ is no break.\n');
  });

  test('in list items and block quotes keep the prefix of their first line, also after a lazy line', () => {
    expect(format('- one\n  two\n- three\n  four\n')).toBe('- one two\n- three four\n');
    expect(format('> one\n> two\nlazy\n')).toBe('> one two lazy\n');
    expect(format('> - one\n>   two\n')).toBe('> - one two\n');
    expect(format('1. one  \n   two\n')).toBe('1. one  \n   two\n');
  });

  test('never join a heading, a list, a quote of another depth, a fence, a table, HTML, math, a container or a footnote', () => {
    const kept = [
      '# Heading\n\nText\n- item\n',
      'Text\n> quote\n',
      'Text\n\n```\ncode\nmore\n```\n',
      '| a   | b   |\n| --- | --- |\n| c   | d   |\n',
      '<div>\nhtml\ntext\n</div>\n',
      '$$\nx = 1\n$$\n',
      '::: warning\nsome text\n:::\n',
      'Text\n[^1]: a footnote\n',
      'Title\n=====\n',
    ];
    for (const text of kept) {
      expect(format(text)).toBe(text);
    }
  });

  test('join a start marker at the start of a line to the paragraph before it, and the line after it too, with <wbr> before it', () => {
    const text = 'The text\n<!--[note-aaaa-->of the note[^note-aaaa]\nand more.\n\n' + note;
    const formatted = format(text);
    expect(formatted).toBe('The text <wbr><!--[note-aaaa-->of the note[^note-aaaa] and more.\n\n' + note);
    const [found] = findNotes(formatted.split('\n'));
    expect(found.selection && formatted.split('\n')[0].slice(found.selection.start.character, found.selection.end.character)).toBe('of the note');
    // A marker at the start of a paragraph gets <wbr> before it, so that the line is text and no block of HTML.
    expect(format('<!--[note-aaaa-->Text[^note-aaaa]\n')).toBe('<wbr><!--[note-aaaa-->Text[^note-aaaa]\n');
  });

  test('give every start marker <wbr> before it, and a note without a start marker one at the start of the text of its block', () => {
    expect(format('The <!--[note-aaaa green-->text[^note-aaaa].\n\n' + note)).toBe('The <wbr><!--[note-aaaa green-->text[^note-aaaa].\n\n' + note);
    expect(format('- The text[^note-aaaa].\n\n  ' + note.replace(/\n {4}/g, '\n      '))).toBe('- <wbr><!--[note-aaaa-->The text[^note-aaaa].\n\n  ' + note.replace(/\n {4}/g, '\n      '));
    const written = 'The <wbr><!--[note-aaaa-->text[^note-aaaa].\n\n' + note;
    expect(format(written)).toBe(written);
  });
});

describe('the links to figures and tables', () => {
  test('get the numbers of the figures and tables in the order of the text, in their captions too (R-XREF-002, R-GEN-016)', () => {
    const text = [
      'As [Figure 2](#fig-b) and\n[Figure 1](#fig-a) show.',
      '',
      'Figure 2: Second<a id="fig-b"></a>',
      '',
      '![Second](b.png)',
      '',
      'Table: People',
      '',
      '| A |',
      '| --- |',
      '',
      'Figure 1: First<a id="fig-a"></a>',
      '',
      '![First](a.png)',
      '',
    ].join('\n');
    const numbered = 'As [Figure 1](#fig-b) and [Figure 2](#fig-a) show.\n\nFigure 1: Second<a id="fig-b"></a>\n\n![Second](b.png)\n\nTable 1: People\n\n| A   |\n| --- |\n\nFigure 2: First<a id="fig-a"></a>\n\n![First](a.png)\n';
    expect(format(text)).toBe(numbered);
    expect(format(numbered)).toBe(numbered);
  });

  test('give a figure of the older form, an image with an anchor, a caption line from the text of the image (R-XREF-001)', () => {
    const text = ['As [Figure 2](#fig-b) show.', '', '![Second](b.png)<a id="fig-b"></a>', ''].join('\n');
    expect(format(text)).toBe('As [Figure 1](#fig-b) show.\n\nFigure 1: Second<a id="fig-b"></a>\n\n![Second](b.png)\n');
  });
});

describe('the tables', () => {
  test('get aligned columns after the alignment of their delimiter row', () => {
    expect(format('|a|b|c|d|\n|:-|-:|:-:|-|\n|long text|1|x|y|\n')).toBe(
      ['| a         |   b |  c  | d   |', '| :-------- | --: | :-: | --- |', '| long text |   1 |  x  | y   |', ''].join('\n'),
    );
  });

  test('measure the width that the text editor shows: without hidden markers and references, wide characters twice', () => {
    expect(format('| a | b |\n|---|---|\n| x<!--[note-aaaa-->y[^note-aaaa] | 日本 |\n| long | z |\n\n' + note)).toBe(
      ['| a    | b    |', '| ---- | ---- |', '| x<wbr><!--[note-aaaa-->y[^note-aaaa]   | 日本 |', '| long | z    |', '', note].join('\n'),
    );
    expect(visibleWidth('abc')).toBe(3);
    expect(visibleWidth('日本')).toBe(4);
    expect(visibleWidth('é')).toBe(1);
    expect(visibleWidth('👍')).toBe(2);
    expect(visibleWidth('👨‍👩‍👧')).toBe(2);
    expect(visibleWidth('©')).toBe(1);
    expect(visibleWidth('<!--[note-aaaa-->[^note-aaaa]')).toBe(0);
  });

  test('keep escaped pipes, fill missing cells and keep the cells that the preview does not show', () => {
    expect(format('a | b\n--- | ---\nc \\| d\ne | f | g\n')).toBe(['| a      | b   |', '| ------ | --- |', '| c \\| d |     |', '| e      | f   | g |', ''].join('\n'));
  });

  test('in a block quote or a list keep their form', () => {
    expect(format('> | a | b |\n> |---|---|\n> | long | c |\n')).toBe('> | a | b |\n> |---|---|\n> | long | c |\n');
  });
});

describe('the white space', () => {
  test('ends no line, outside code blocks and blocks of HTML', () => {
    expect(format('# Title  \n\nText  \n\n```\ncode  \n```\n\n<div>  \n</div>\n')).toBe('# Title\n\nText\n\n```\ncode  \n```\n\n<div>  \n</div>\n');
  });

  test('gives one blank line between blocks and around the ATX headings, none at the start and one line break at the end', () => {
    expect(format('\n\n# Title\nText\n\n\n\n## Part\n- item\n\n\n')).toBe('# Title\n\nText\n\n## Part\n\n- item\n');
    expect(format('Text')).toBe('Text\n');
    expect(format('')).toBe('');
    expect(format('```\na\n\n\n\nb\n```\n')).toBe('```\na\n\n\n\nb\n```\n');
  });

  test('keeps a blank line at the start before a line that would else start a front matter', () => {
    expect(format('\n\n---\nTitle\n---\n')).toBe('\n---\nTitle\n---\n');
  });
});

describe('the formatter', () => {
  test('keeps the front matter, the comment of the format of the notes, other comments and the notes as they are', () => {
    const text = [
      '---',
      'title: A  ',
      'list:',
      '  - one',
      '---',
      ...doctypeLines,
      '',
      '<!--',
      'A comment  ',
      'with lines.',
      '-->',
      '',
      'The text[^note-aaaa]',
      'of the page.',
      '',
      note,
    ].join('\n');
    expect(format(text)).toBe(text.replace('The text[^note-aaaa]\nof', '<wbr><!--[note-aaaa-->The text[^note-aaaa] of'));
    const toml = '+++\ntitle = "A"\ntext = "B"\n+++\n\nText\nmore\n';
    expect(format(toml)).toBe('+++\ntitle = "A"\ntext = "B"\n+++\n\nText more\n');
  });

  test('writes the same text when it formats its own result, and keeps the notes of the text', () => {
    const text = '# Title\nThe <!--[note-aaaa-->first\npassage[^note-aaaa] here.\n\n' + note + '\n\n\n| a | b |\n|-|-|\n| c | d |\n';
    const once = format(text);
    expect(format(once)).toBe(once);
    const notes = (value: string) => findNotes(value.split('\n')).map((found) => ({ label: found.label, answers: found.answers }));
    expect(notes(once)).toEqual(notes(text));
  });

  test('keeps a text whose comment of the format names a higher major version as it is (R-NOTE-007)', () => {
    const text = '<!-- nimblescape-markdownnotes v2.0.0 spec=https://example.com/format-v2.md\n-->\n\nA paragraph\non two lines.\n';
    expect(format(text)).toBe(text);
    expect(format(text.replace('v2.0.0', 'v1.9.3'))).toBe(text.replace('v2.0.0', 'v1.9.3').replace('paragraph\non', 'paragraph on'));
  });
});
