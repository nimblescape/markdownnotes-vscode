// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check how the extension finds the text that the user selected in the Markdown preview in the Markdown
 * text (R-PREV-008): by the line of the block, the text of the block before the selected text and the selected text, as
 * the page shows them.
 */

import MarkdownIt from 'markdown-it';
import { describe, expect, test } from 'vitest';
import { renderedRange } from './rendered';

/**
 * selected returns the part of a Markdown text that the selected text of its preview names, or undefined.
 * @param text - The Markdown text.
 * @param line - The line of the block.
 * @param before - The text of the block before the selected text, as the page shows it.
 * @param selection - The selected text, as the page shows it.
 */
const selected = (text: string, line: number, before: string, selection: string): string | undefined => {
  const lines = text.split('\n');
  const range = renderedRange(lines, line, before, selection);
  if (!range) {
    return undefined;
  }
  const { start, end } = range;
  if (start.line === end.line) {
    return lines[start.line].slice(start.character, end.character);
  }
  return [lines[start.line].slice(start.character), ...lines.slice(start.line + 1, end.line), lines[end.line].slice(0, end.character)].join('\n');
};

/**
 * shownText returns the text that the page shows of the HTML of a block, as the text of its elements: without the
 * tags, with the characters that markdown-it escapes.
 * @param html - The HTML.
 */
const shownText = (html: string): string =>
  html
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');

describe('the text of the preview in the Markdown text', () => {
  test('finds the selected text after the text before it, also with emphasis, links and code spans', () => {
    expect(selected('The quick brown fox.', 0, 'The ', 'quick brown')).toBe('quick brown');
    expect(selected('The **quick** brown fox.', 0, 'The ', 'quick brown')).toBe('quick** brown');
    expect(selected('See [the docs](https://x.y/docs "Docs") for more.', 0, 'See the ', 'docs for')).toBe('docs](https://x.y/docs "Docs") for');
    expect(selected('Run `npm test` now.', 0, 'Run npm ', 'test now')).toBe('test` now');
    expect(selected('Go to <https://example.com> now.', 0, 'Go to https://', 'example')).toBe('example');
    expect(selected('An ![logo](a.png) image text.', 0, 'An  ', 'image')).toBe('image');
    expect(selected('A [link][ref] here.\n\n[ref]: https://x.y', 0, 'A link ', 'here')).toBe('here');
  });

  test('takes the characters at the edges of the selected text, when the Markdown text holds them there', () => {
    expect(selected('Say "hello, world." now.', 0, 'Say ', '"hello, world."')).toBe('"hello, world."');
    expect(selected('The *word*. Next.', 0, 'The ', 'word.')).toBe('word');
  });

  test('reads entities as their characters and escaped characters without the backslash', () => {
    expect(selected('Tom &amp; Jerry &auml;rgern sich.', 0, 'Tom & ', 'Jerry ärgern')).toBe('Jerry &auml;rgern');
    // The escaped character at the end shows in another form, so the range ends after the last letter.
    expect(selected('Count &#65;B and \\*stars\\* here.', 0, 'Count ', 'AB and *stars*')).toBe('&#65;B and \\*stars');
    expect(selected('A \\<!-- b --> c', 0, 'A <!-- ', 'b')).toBe('b');
  });

  test('takes the occurrence of a repeated text after the text before it', () => {
    const lines = 'a b a b a';
    expect(renderedRange([lines], 0, 'a b ', 'a')).toEqual({ start: { line: 0, character: 4 }, end: { line: 0, character: 5 } });
    expect(renderedRange([lines], 0, 'a b a b ', 'a')).toEqual({ start: { line: 0, character: 8 }, end: { line: 0, character: 9 } });
  });

  test('skips the hidden parts of the notes: start markers and references', () => {
    const text = 'The <wbr><!--[note-aaaa green-->text[^note-aaaa] here.\n\n[^note-aaaa]: **anna** · 2026-10-29 10:00+01:00\n\n    A note.';
    expect(selected(text, 0, 'The text ', 'here')).toBe('here');
    expect(selected(text, 0, 'The ', 'text here.')).toBe('text[^note-aaaa] here.');
  });

  test('finds text in headings, list items, block quotes over several lines, and table cells', () => {
    expect(selected('## Big Title', 0, 'Big ', 'Title')).toBe('Title');
    expect(selected('1. Item one\n2. Item two', 1, 'Item ', 'two')).toBe('two');
    expect(selected('> First line\n> second line here', 0, 'First ', 'line\nsecond')).toBe('line\n> second');
    expect(selected('| A | B |\n|---|---|\n| one | two three |', 2, 'one ', 'two')).toBe('two');
    expect(selected('| A | B |\n|---|---|\n| one | two three |', 2, 'onetwo ', 'three')).toBe('three');
  });

  test('takes the nearest occurrence when the page shows the text before it in another form, and nothing for other text', () => {
    // The page shows an emoji for a shortcode, which has no letters.
    expect(selected('Hi :smile: then hi again.', 0, 'Hi 😄 then ', 'hi')).toBe('hi');
    expect(selected('The quick brown fox.', 0, 'The ', 'slow')).toBeUndefined();
    expect(selected('The quick brown fox.', 0, 'The ', '— ')).toBeUndefined();
    expect(selected('The quick brown fox.\n\nNext.', 1, '', 'quick')).toBeUndefined();
    expect(selected('```\ncode here\n```', 1, 'code ', 'here')).toBeUndefined();
  });

  test('finds each word of a paragraph that markdown-it renders, at its place in the Markdown text', () => {
    const text = 'Use **bold** and _it_ with [a link](https://x.y/z?q=1 "T") and `code &amp;` and <b>html</b> &amp; more, a link again: [a link](/b).';
    const shown = shownText(new MarkdownIt({ html: true }).render(text)).trim();
    const words = [...shown.matchAll(/[\p{L}\p{N}]+/gu)];
    expect(words.length).toBeGreaterThan(10);
    for (const word of words) {
      const range = renderedRange([text], 0, shown.slice(0, word.index), word[0]);
      expect(range && text.slice(range.start.character, range.end.character)).toBe(word[0]);
    }
  });
});
