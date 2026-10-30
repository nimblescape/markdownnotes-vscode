// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The Markdown marks that the toolbar and the keys of the visual editor of the side view write
 * ([R-SIDE-004](../../docs/requirements.md#r-side-004)): bold, italic, code and a link around the selected text, and a
 * list or a block quote in front of the selected lines. Each function returns one replacement of the text and the
 * selection after it, so that the editor applies them as one edit, which Undo takes back. The functions use no API of
 * the browser, so that the tests run them without one.
 */

/** Change is a replacement of the characters from `start` to `end` by `text`, and the selection after it. */
export interface Change {
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
}

/** Inline is a mark that stands before and after the selected text. */
export type Inline = 'bold' | 'italic' | 'code';

/** Block is a mark that stands in front of each selected line. */
export type Block = 'bullets' | 'numbers' | 'quote';

/** marks are the Markdown marks of the inline kinds. */
const marks: Record<Inline, string> = { bold: '**', italic: '*', code: '`' };

/**
 * toggleInline puts the mark of a kind around the selected text, or takes it away when the selected text already
 * has it, inside or around the selection. Without selected text, it writes the two marks with the cursor between
 * them. The selection after it covers the same text.
 * @param text - The Markdown text.
 * @param start - The start of the selection.
 * @param end - The end of the selection.
 * @param kind - The kind of the mark.
 */
export const toggleInline = (text: string, start: number, end: number, kind: Inline): Change => {
  const mark = marks[kind];
  const selected = text.slice(start, end);
  // A bold text starts with `**`, which also starts with the mark of italic: italic takes away a single `*` only.
  const single = (before: string, after: string): boolean => kind !== 'italic' || (!before.endsWith('**') && !after.startsWith('**')) || (before.endsWith('***') && after.startsWith('***'));
  const before = text.slice(0, start);
  const after = text.slice(end);
  if (before.endsWith(mark) && after.startsWith(mark) && single(before, after)) {
    return { start: start - mark.length, end: end + mark.length, text: selected, selectionStart: start - mark.length, selectionEnd: end - mark.length };
  }
  if (selected.length >= 2 * mark.length && selected.startsWith(mark) && selected.endsWith(mark) && single(selected, selected)) {
    const inner = selected.slice(mark.length, selected.length - mark.length);
    return { start, end, text: inner, selectionStart: start, selectionEnd: start + inner.length };
  }
  return { start, end, text: `${mark}${selected}${mark}`, selectionStart: start + mark.length, selectionEnd: end + mark.length };
};

/**
 * link writes a link around the selected text, `[text](url)`, with the selection on `url`, so that the user types
 * the address. Without selected text, it writes `[text](url)` with the selection on `text`. A selected text that is
 * an address becomes the address of the link.
 * @param text - The Markdown text.
 * @param start - The start of the selection.
 * @param end - The end of the selection.
 */
export const link = (text: string, start: number, end: number): Change => {
  const selected = text.slice(start, end);
  if (selected === '') {
    return { start, end, text: '[text](url)', selectionStart: start + 1, selectionEnd: start + 5 };
  }
  if (/^(https?:\/\/|mailto:)\S+$/.test(selected)) {
    return { start, end, text: `[text](${selected})`, selectionStart: start + 1, selectionEnd: start + 5 };
  }
  const written = `[${selected}](url)`;
  return { start, end, text: written, selectionStart: start + written.length - 4, selectionEnd: start + written.length - 1 };
};

/** prefixes match the marks of the block kinds at the start of a line, after its indentation. */
const prefixes: Record<Block, RegExp> = { bullets: /^(\s*)[-*+] /, numbers: /^(\s*)\d+[.)] /, quote: /^(\s*)> ?/ };

/**
 * toggleBlock puts the mark of a kind in front of each line of the selection: `- ` for a list, `1. `, `2. ` … for a
 * numbered list and `> ` for a block quote. When each line that is not blank has it already, it takes it away. The
 * selection after it covers the same lines.
 * @param text - The Markdown text.
 * @param start - The start of the selection.
 * @param end - The end of the selection.
 * @param kind - The kind of the mark.
 */
export const toggleBlock = (text: string, start: number, end: number, kind: Block): Change => {
  const first = text.lastIndexOf('\n', start - 1) + 1;
  // A selection that ends at the start of a line does not take that line.
  const last = end > start && text[end - 1] === '\n' ? end - 1 : end;
  const lineEnd = text.indexOf('\n', last);
  const stop = lineEnd === -1 ? text.length : lineEnd;
  const lines = text.slice(first, stop).split('\n');
  const filled = lines.filter((line) => line.trim() !== '');
  const remove = filled.length > 0 && filled.every((line) => prefixes[kind].test(line));
  let number = 0;
  const changed = lines.map((line) => {
    if (remove) {
      return line.replace(prefixes[kind], '$1');
    }
    if (line.trim() === '' && lines.length > 1) {
      return line;
    }
    number += 1;
    const mark = kind === 'bullets' ? '- ' : kind === 'numbers' ? `${number}. ` : '> ';
    return mark + line;
  });
  const written = changed.join('\n');
  return { start: first, end: stop, text: written, selectionStart: first, selectionEnd: first + written.length };
};
