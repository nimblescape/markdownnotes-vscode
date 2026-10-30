// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

import { describe, expect, it } from 'vitest';
import { type Change, link, toggleBlock, toggleInline } from './markup';

/**
 * applied returns the text after a change, with `[` and `]` around the selection after it.
 * @param text - The text before the change.
 * @param change - The change.
 */
const applied = (text: string, change: Change): string => {
  const result = text.slice(0, change.start) + change.text + text.slice(change.end);
  return `${result.slice(0, change.selectionStart)}[${result.slice(change.selectionStart, change.selectionEnd)}]${result.slice(change.selectionEnd)}`;
};

/**
 * selected returns a text without its `[` and `]`, and the place of the selection between them.
 * @param marked - The text with `[` and `]` around the selection.
 */
const selected = (marked: string): [string, number, number] => {
  const start = marked.indexOf('[');
  const end = marked.indexOf(']') - 1;
  return [marked.replace('[', '').replace(']', ''), start, end];
};

describe('the inline marks of the visual editor (R-SIDE-004)', () => {
  it('puts the mark around the selected text, and the selection stays on the text', () => {
    const [text, start, end] = selected('A [word] here');
    expect(applied(text, toggleInline(text, start, end, 'bold'))).toBe('A **[word]** here');
    expect(applied(text, toggleInline(text, start, end, 'italic'))).toBe('A *[word]* here');
    expect(applied(text, toggleInline(text, start, end, 'code'))).toBe('A `[word]` here');
  });

  it('takes the mark away from a text that has it around the selection or inside it', () => {
    const [around, start, end] = selected('A **[word]** here');
    expect(applied(around, toggleInline(around, start, end, 'bold'))).toBe('A [word] here');
    const [inside, from, to] = selected('A [*word*] here');
    expect(applied(inside, toggleInline(inside, from, to, 'italic'))).toBe('A [word] here');
  });

  it('keeps bold when italic is toggled on a bold text, and takes one mark of a bold and italic text', () => {
    const [bold, start, end] = selected('A **[word]** here');
    expect(applied(bold, toggleInline(bold, start, end, 'italic'))).toBe('A ***[word]*** here');
    const [both, from, to] = selected('A ***[word]*** here');
    expect(applied(both, toggleInline(both, from, to, 'italic'))).toBe('A **[word]** here');
  });

  it('writes the two marks with the cursor between them without selected text', () => {
    const [text, start, end] = selected('A [] here');
    expect(applied(text, toggleInline(text, start, end, 'bold'))).toBe('A **[]** here');
  });
});

describe('the links of the visual editor (R-SIDE-004)', () => {
  it('writes a link around the selected text and selects its address', () => {
    const [text, start, end] = selected('See [the guide] now');
    expect(applied(text, link(text, start, end))).toBe('See [the guide]([url]) now');
  });

  it('takes a selected address as the address of the link and selects its text', () => {
    const [text, start, end] = selected('See [https://example.org] now');
    expect(applied(text, link(text, start, end))).toBe('See [[text]](https://example.org) now');
  });

  it('writes an empty link with its text selected without selected text', () => {
    const [text, start, end] = selected('See [] now');
    expect(applied(text, link(text, start, end))).toBe('See [[text]](url) now');
  });
});

describe('the block marks of the visual editor (R-SIDE-004)', () => {
  it('puts the mark in front of each selected line, and numbers a numbered list', () => {
    const [text, start, end] = selected('Intro\n\nO[ne\nTw]o\nThree');
    expect(applied(text, toggleBlock(text, start, end, 'bullets'))).toBe('Intro\n\n[- One\n- Two]\nThree');
    expect(applied(text, toggleBlock(text, start, end, 'numbers'))).toBe('Intro\n\n[1. One\n2. Two]\nThree');
    expect(applied(text, toggleBlock(text, start, end, 'quote'))).toBe('Intro\n\n[> One\n> Two]\nThree');
  });

  it('takes the mark away when each line has it, and keeps the indentation', () => {
    const [text, start, end] = selected('[- One\n  - Two]');
    expect(applied(text, toggleBlock(text, start, end, 'bullets'))).toBe('[One\n  Two]');
  });

  it('leaves blank lines between the selected lines without a mark', () => {
    const [text, start, end] = selected('[One\n\nTwo]');
    expect(applied(text, toggleBlock(text, start, end, 'quote'))).toBe('[> One\n\n> Two]');
  });

  it('marks the line of the cursor without selected text, and not the line after a selection that ends at its start', () => {
    const [text, start, end] = selected('One\nT[]wo');
    expect(applied(text, toggleBlock(text, start, end, 'bullets'))).toBe('One\n[- Two]');
    const [lines, from, to] = selected('[One\n]Two');
    expect(applied(lines, toggleBlock(lines, from, to, 'quote'))).toBe('[> One]\nTwo');
  });
});
