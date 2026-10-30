// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The Markdown formatter of the extension
 * ([R-FMT-001](../../docs/requirements.md#r-fmt-001) to
 * [R-FMT-003](../../docs/requirements.md#r-fmt-003)), which VS Code runs on
 * "Format Document" and, by default, when a Markdown file is saved (Hannes,
 * 2026-10-28: "it shall format on save tables and other reasonable defaults",
 * "but else have no hard linebreaks"). It writes each paragraph on one line
 * and keeps its hard line breaks, aligns the columns of the tables by the
 * width that the text editor shows, removes the white space at the end of the
 * lines, writes one blank line between blocks and around the ATX headings, and
 * ends the file with one line break. It changes no code block, no block of
 * HTML (so no comment, also not the comment of the format of the notes), no
 * front matter, no block of math (`$$`), no container (`:::`) and no note.
 *
 * The formatter reads the text with markdown-it, as the Markdown preview and
 * the notes do ([src/notes/notes.ts](../notes/notes.ts)), so it knows each
 * block as the preview knows it. Every note has a start marker, `<wbr>` and a
 * comment (Hannes, 2026-10-28: "there should never be a note without a start
 * marker", "why not always start with <wbr>"): the formatter adds the start
 * marker of a note without one at the start of the text of the block of its
 * reference, where its highlight starts, and `<wbr>` to a start marker without
 * it. A start marker at the start of a line without `<wbr>` makes the line a
 * block of HTML on GitHub; the formatter joins such a line to the paragraph
 * directly before it, or else puts `<wbr>` before the marker, which repairs
 * the highlight of the note. At the end it reads the formatted text again and keeps
 * it only when the preview shows the same blocks with the same text, apart
 * from white space; else it keeps the text as it was. The module uses no API
 * of VS Code.
 */

import type { Token } from 'markdown-it';
import { frontMatterEnd, newerFormat } from '../notes/doctype';
import { fillFields, findFields } from '../notes/fields';
import { findItems, numberLinks } from '../notes/figures';
import { findListings, refreshListings, type Source } from '../notes/listings';
import { before, parse, read } from '../notes/notes';
import { breakText, markerText, noteCloseType, noteOpenType } from '../notes/syntax';

/** hiddenText matches the start markers, with `<wbr>` before them, and the references of the notes, which the text editor hides. */
export const hiddenText = /(?:<wbr>)?<!--\[note-[a-z0-9]{4}(?: [a-z]+)?-->|\[\^note-[a-z0-9]{4}\]/g;

/** wideRanges are the ranges of the code points that a text editor shows two columns wide: East Asian wide and full-width characters. */
const wideRanges: readonly (readonly [number, number])[] = [
  [0x1100, 0x115f],
  [0x2e80, 0x303e],
  [0x3041, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa000, 0xa4cf],
  [0xa960, 0xa97f],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe10, 0xfe19],
  [0xfe30, 0xfe6f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x1b000, 0x1b2ff],
  [0x20000, 0x2fffd],
  [0x30000, 0x3fffd],
];

/** emoji matches a character that shows as an emoji, two columns wide. */
const emoji = /\p{Emoji_Presentation}|\p{Extended_Pictographic}️/u;

/** invisible matches a text of characters that take no column: combining marks and format characters. */
const invisible = /^[\p{Mn}\p{Me}\p{Cf}]+$/u;

/** graphemes splits a text into the characters that a reader sees. */
const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });

/**
 * visibleWidth returns the number of columns that the text editor of the extension shows for a text: without the
 * hidden start markers and references of the notes, with two columns for each East Asian wide character and each
 * emoji, and none for a combining mark.
 * @param text - The text.
 */
export function visibleWidth(text: string): number {
  let width = 0;
  for (const { segment } of graphemes.segment(text.replace(hiddenText, ''))) {
    const first = segment.codePointAt(0) ?? 0;
    if (emoji.test(segment) || wideRanges.some(([low, high]) => first >= low && first <= high)) {
      width += 2;
    } else if (!invisible.test(segment)) {
      width += 1;
    }
  }
  return width;
}

/** Piece is a line of a block of text: the prefix of its containers, such as `> ` or the indentation of a list item, and its text. */
interface Piece {
  prefix: string;
  text: string;
}

/** Unit is a paragraph, or a line of HTML that starts with the start marker of a note, with its lines. */
interface Unit {
  /** start is the index of its first line. */
  start: number;
  /** end is the index of the line after it. */
  end: number;
  /** level is the depth of its containers. */
  level: number;
  /** marker tells whether the unit is a line of HTML that starts with a start marker. */
  marker: boolean;
  /** pieces are its lines, or undefined when the formatter does not change them. */
  pieces: Piece[] | undefined;
}

/** markerLine matches the text of a line that starts with the start marker of a note. */
const markerLine = /^<!--\[note-[a-z0-9]{4}(?: [a-z]+)?-->/;

/** keptLine matches the text of a line that the formatter never joins: a block of math or a container. */
const keptLine = /^(\$\$|:::)/;

/**
 * piecesOf returns the lines of a block with their prefixes, from the text of the block that markdown-it gives
 * without the prefixes. Each line of the text ends its line of the Markdown text; when one does not, for example
 * after a tab, the result is undefined and the formatter keeps the block as it is.
 * @param lines - The lines of the Markdown text.
 * @param start - The index of the first line of the block.
 * @param content - The text of the block.
 */
function piecesOf(lines: readonly string[], start: number, content: string): Piece[] | undefined {
  const texts = content.replace(/\n$/, '').split('\n');
  const pieces: Piece[] = [];
  for (const [index, raw] of texts.entries()) {
    const last = index === texts.length - 1;
    const line = last ? lines[start + index]?.trimEnd() : lines[start + index];
    const text = last ? raw.trimEnd() : raw;
    if (line === undefined || !line.endsWith(text) || keptLine.test(text.trimStart())) {
      return undefined;
    }
    pieces.push({ prefix: line.slice(0, line.length - text.length), text });
  }
  return pieces;
}

/** Blocks is what the formatter knows of the blocks of a text. */
interface Blocks {
  /** units are the paragraphs and the lines of HTML with a start marker outside the notes, in the order of the text. */
  units: Unit[];
  /** kept are the lines that the formatter keeps as they are. */
  kept: Set<number>;
  /** headings are the lines of the ATX headings outside the containers. */
  headings: Set<number>;
  /** tables are the tables outside the containers, with the lines of their rows. */
  tables: { rows: number[]; columns: number }[];
}

/**
 * blocksOf reads the blocks of a text.
 * @param lines - The lines of the text.
 */
function blocksOf(lines: readonly string[]): Blocks {
  const tokens = parse(lines);
  const blocks: Blocks = { units: [], kept: new Set(), headings: new Set(), tables: [] };
  const keep = (start: number, end: number): void => {
    for (let line = start; line < end; line++) {
      blocks.kept.add(line);
    }
  };
  // markdown-it reads a TOML front matter, or a YAML one that ends with `...`, as Markdown.
  const front = frontMatterEnd(lines);
  keep(0, front);
  let depth = 0;
  let table: { rows: number[]; columns: number } | undefined;
  tokens.forEach((token, index) => {
    if (token.type === noteOpenType) {
      depth++;
      if (token.map) {
        keep(token.map[0], token.map[1]);
      }
      return;
    }
    if (token.type === noteCloseType) {
      depth--;
      return;
    }
    // The cells of a table and its end have no lines.
    if (table && token.type === 'th_open') {
      table.columns++;
    }
    if (table && token.type === 'table_close') {
      blocks.tables.push(table);
      table = undefined;
    }
    if (depth > 0 || !token.map || token.map[0] < front) {
      return;
    }
    const [start, end] = token.map;
    switch (token.type) {
      case 'front_matter':
      case 'fence':
      case 'code_block':
        keep(start, end);
        break;
      case 'html_block': {
        const pieces = end - start === 1 && markerLine.test(token.content.trimStart()) ? piecesOf(lines, start, token.content) : undefined;
        if (pieces) {
          blocks.units.push({ start, end, level: token.level, marker: true, pieces });
        } else {
          keep(start, end);
        }
        break;
      }
      case 'paragraph_open': {
        const pieces = piecesOf(lines, start, tokens[index + 1]?.content ?? '');
        blocks.units.push({ start, end, level: token.level, marker: false, pieces });
        if (!pieces) {
          keep(start, end);
        }
        break;
      }
      case 'heading_open':
        if (/^#+$/.test(token.markup)) {
          if (token.level === 0) {
            blocks.headings.add(start);
          }
        } else {
          // The lines of a setext heading before its last line can end with a hard line break.
          keep(start, end - 2);
        }
        break;
      case 'table_open':
        table = token.level === 0 ? { rows: [start, start + 1], columns: 0 } : undefined;
        break;
      case 'tr_open':
        if (table && start > table.rows[0]) {
          table.rows.push(start);
        }
        break;
    }
  });
  return blocks;
}

/**
 * addMarkers adds the start marker of each note without one at the start of its highlight, the start of the text of the
 * block of its reference, and `<wbr>` before each start marker without it.
 * @param lines - The lines of the text.
 */
function addMarkers(lines: readonly string[]): string[] {
  const result = [...lines];
  const reading = read(lines);
  const missing = reading.notes
    .filter((note) => !note.duplicate && note.reference && !note.marker && note.selection)
    .map((note) => ({ at: note.selection!.start, text: markerText(note.label) }));
  const bare = reading.markers.filter((marker) => !lines[marker.start.line].startsWith(breakText, marker.start.character)).map((marker) => ({ at: marker.start, text: breakText }));
  for (const { at, text } of [...missing, ...bare].sort((a, b) => (before(a.at, b.at) ? 1 : -1))) {
    const line = result[at.line];
    result[at.line] = line.slice(0, at.character) + text + line.slice(at.character);
  }
  return result;
}

/**
 * repairMarkers joins each line that starts with the start marker of a note to the paragraph directly before it in the
 * same container, and the paragraph directly after such a line too, so that the marker stands inside the paragraph:
 * a comment at the start of a line is a block of HTML, which ends the paragraph on GitHub. A line of a start marker
 * without a paragraph directly before it gets `<wbr>` before the marker, and so starts a paragraph, after a blank line
 * when the line before holds text: a line of text directly after a list item or a table would continue it.
 * @param lines - The lines of the text.
 */
function repairMarkers(lines: readonly string[]): string[] {
  const result = [...lines];
  const dropped = new Set<number>();
  let target: { line: number; level: number; end: number; afterMarker: boolean } | undefined;
  for (const unit of blocksOf(lines).units) {
    const joins = target && unit.pieces && unit.start === target.end && unit.level === target.level && (unit.marker || target.afterMarker);
    if (target && unit.pieces && joins) {
      result[target.line] = `${result[target.line].trimEnd()} ${unit.pieces[0].text.trimStart()}`;
      dropped.add(unit.start);
      target = { line: unit.end - 1 > unit.start ? unit.end - 1 : target.line, level: unit.level, end: unit.end, afterMarker: unit.marker };
    } else if (unit.marker && unit.pieces) {
      const [piece] = unit.pieces;
      const text = piece.text.trimStart();
      const separated = unit.start === 0 || lines[unit.start - 1].trim() === '' ? '' : '\n';
      result[unit.start] = `${separated}${piece.prefix}${piece.text.slice(0, piece.text.length - text.length)}${breakText}${text}`;
      target = { line: unit.start, level: unit.level, end: unit.end, afterMarker: true };
    } else {
      target = !unit.marker && unit.pieces ? { line: unit.end - 1, level: unit.level, end: unit.end, afterMarker: false } : undefined;
    }
  }
  return result.filter((_, line) => !dropped.has(line)).flatMap((line) => line.split('\n'));
}

/**
 * hardBreak tells whether the text of a line of a paragraph ends with a hard line break: two spaces, or a backslash
 * that is not escaped.
 * @param text - The text of the line.
 */
const hardBreak = (text: string): boolean => / {2}$/.test(text) || /(?:^|[^\\])(?:\\\\)*\\$/.test(text);

/** footnoteStart matches the text of a line that starts the definition of a footnote, which ends a paragraph on GitHub. */
const footnoteStart = /^\[\^[^\]\s]+\]:/;

/**
 * joinedLines returns the lines of a paragraph with its text on one line: each line break becomes a space, except a
 * hard line break and the break before the definition of a footnote.
 * @param pieces - The lines of the paragraph.
 */
function joinedLines(pieces: readonly Piece[]): string[] {
  const result: string[] = [];
  let current = `${pieces[0].prefix}${pieces[0].text}`;
  for (let index = 1; index < pieces.length; index++) {
    const piece = pieces[index];
    const text = piece.text.trimStart();
    if (hardBreak(pieces[index - 1].text)) {
      result.push(current);
      current = `${piece.prefix}${text}`;
    } else if (footnoteStart.test(text)) {
      result.push(current.trimEnd());
      current = `${piece.prefix}${text}`;
    } else {
      current = `${current.trimEnd()} ${text}`;
    }
  }
  result.push(current.trimEnd());
  return result;
}

/** Alignment is the alignment of a column of a table. */
type Alignment = 'left' | 'right' | 'center' | 'none';

/**
 * cellsOf returns the cells of a row of a table, as markdown-it splits them: at each `|` without a backslash before
 * it, without an empty cell before the first `|` and after the last one. The text of each cell stays as it is
 * written, with its escaped pipes.
 * @param line - The line of the row.
 */
function cellsOf(line: string): string[] {
  const text = line.trim();
  const cells: string[] = [];
  let current = '';
  for (let index = 0; index < text.length; index++) {
    if (text[index] === '|' && text[index - 1] !== '\\') {
      cells.push(current);
      current = '';
    } else {
      current += text[index];
    }
  }
  cells.push(current);
  if (cells[0] === '') {
    cells.shift();
  }
  if (cells.length > 0 && cells[cells.length - 1] === '') {
    cells.pop();
  }
  return cells.map((cell) => cell.trim());
}

/**
 * alignmentOf returns the alignment of a cell of the delimiter row of a table.
 * @param cell - The cell, for example `:---:`.
 */
const alignmentOf = (cell: string): Alignment =>
  cell.endsWith(':') ? (cell.startsWith(':') ? 'center' : 'right') : cell.startsWith(':') ? 'left' : 'none';

/**
 * padded returns the text of a cell with spaces to the width of its column, after the alignment of the column.
 * @param text - The text of the cell.
 * @param width - The width of the column.
 * @param alignment - The alignment of the column.
 */
function padded(text: string, width: number, alignment: Alignment): string {
  const fill = Math.max(0, width - visibleWidth(text));
  if (alignment === 'right') {
    return `${' '.repeat(fill)}${text}`;
  }
  if (alignment === 'center') {
    const before = Math.floor(fill / 2);
    return `${' '.repeat(before)}${text}${' '.repeat(fill - before)}`;
  }
  return `${text}${' '.repeat(fill)}`;
}

/**
 * delimiter returns the cell of the delimiter row of a column of a table.
 * @param width - The width of the column, at least 3.
 * @param alignment - The alignment of the column.
 */
function delimiter(width: number, alignment: Alignment): string {
  switch (alignment) {
    case 'left':
      return `:${'-'.repeat(width - 1)}`;
    case 'right':
      return `${'-'.repeat(width - 1)}:`;
    case 'center':
      return `:${'-'.repeat(width - 2)}:`;
    case 'none':
      return '-'.repeat(width);
  }
}

/**
 * alignedRows returns the lines of the rows of a table with aligned columns: a `|` at the start and at the end of each
 * row, one space on each side of each cell, and each column as wide as its widest cell. Cells after the columns of the
 * header, which the preview does not show, follow without alignment. The result is undefined when the formatter reads
 * the header with another number of columns than markdown-it.
 * @param lines - The lines of the text.
 * @param table - The lines of the rows of the table: the header, the delimiter row and the body.
 */
function alignedRows(lines: readonly string[], table: { rows: number[]; columns: number }): string[] | undefined {
  const [header, delimiterRow, ...body] = table.rows.map((line) => cellsOf(lines[line]));
  const alignments = delimiterRow.map(alignmentOf);
  if (header.length !== table.columns || alignments.length !== table.columns) {
    return undefined;
  }
  const rows = [header, ...body];
  const widths = alignments.map((_, column) => Math.max(3, ...rows.map((row) => visibleWidth(row[column] ?? ''))));
  const line = (row: readonly string[]): string => {
    const cells = alignments.map((alignment, column) => padded(row[column] ?? '', widths[column], alignment));
    return `| ${[...cells, ...row.slice(table.columns)].join(' | ')} |`;
  };
  return [line(header), `| ${alignments.map((alignment, column) => delimiter(widths[column], alignment)).join(' | ')} |`, ...body.map(line)];
}

/**
 * formatLines formats the lines of a text whose start markers stand inside their paragraphs.
 * @param lines - The lines of the text.
 */
function formatLines(lines: readonly string[]): string[] {
  const blocks = blocksOf(lines);
  const replaced = new Map<number, string[]>();
  for (const unit of blocks.units) {
    if (unit.pieces && !unit.marker) {
      replaced.set(unit.start, joinedLines(unit.pieces));
      for (let line = unit.start + 1; line < unit.end; line++) {
        replaced.set(line, []);
      }
    }
  }
  for (const table of blocks.tables) {
    alignedRows(lines, table)?.forEach((row, index) => replaced.set(table.rows[index], [row]));
  }
  const result: string[] = [];
  /** blankBefore tells whether the last line of the result is a blank line between blocks. */
  let blankBefore = false;
  /** blankAfter tells whether a blank line must come before the next line, after a heading. */
  let blankAfter = false;
  // A line `---` or `+++` at the start of the text would start a front matter.
  const first = lines.findIndex((line) => line.trim() !== '');
  if (first > 0 && frontMatterEnd(lines.slice(first)) > 0) {
    result.push('');
    blankBefore = true;
  }
  const push = (text: string, free: boolean): void => {
    if (free && text === '') {
      // No blank line at the start of the text, and one blank line between blocks.
      if (result.length > 0 && !blankBefore) {
        result.push('');
        blankBefore = true;
      }
      blankAfter = false;
      return;
    }
    if (blankAfter && !blankBefore) {
      result.push('');
    }
    result.push(text);
    blankBefore = false;
    blankAfter = false;
  };
  lines.forEach((line, index) => {
    const kept = blocks.kept.has(index);
    if (blocks.headings.has(index) && !kept) {
      if (result.length > 0 && result[result.length - 1] !== '') {
        push('', true);
      }
      push(line.trim(), true);
      blankAfter = true;
      return;
    }
    for (const text of replaced.get(index) ?? [kept ? line : line.trimEnd()]) {
      push(text, !kept);
    }
  });
  while (result.length > 0 && result[result.length - 1] === '') {
    result.pop();
  }
  result.push('');
  return result;
}

/**
 * inlineSignature returns the text of the tokens of an inline token, with each run of white space as one space: the
 * text that the preview shows, with the form of each token that is no text.
 * @param children - The tokens.
 */
const inlineSignature = (children: readonly Token[]): string =>
  children
    .map((child) => {
      if (child.type === 'text') {
        return child.content;
      }
      if (child.type === 'softbreak') {
        return ' ';
      }
      const label = (child.meta as { label?: string } | null)?.label ?? '';
      return `\u0001${child.type}:${child.tag}:${child.nesting}:${child.markup}:${child.content}:${JSON.stringify(child.attrs)}:${label}\u0001`;
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * signature returns the blocks of a text as the preview reads them, without their places and with each run of white
 * space in a text as one space, so that a formatted text has the signature of the text before.
 * @param lines - The lines of the text.
 */
const signature = (lines: readonly string[]): string =>
  parse(lines)
    .map((token) =>
      token.type === 'inline'
        ? `inline:${inlineSignature(token.children ?? [])}`
        : `${token.type}:${token.tag}:${token.nesting}:${token.level}:${token.markup}:${token.info}:${token.hidden}:${JSON.stringify(token.attrs)}:${(token.meta as { label?: string } | null)?.label ?? ''}:${token.block && token.nesting === 0 ? token.content : ''}`,
    )
    .join('\n');

/**
 * keptCurrent tells whether a text has parts whose text the formatter keeps current, which a save formats as a file
 * with notes ([R-FMT-001](../../docs/requirements.md#r-fmt-001)): a listing, a value of the front matter, or a figure,
 * a table, a listing or a section with an anchor, whose links get their numbers from it.
 * @param lines - The lines of the text.
 */
export const keptCurrent = (lines: readonly string[]): boolean =>
  findListings(lines).length > 0 || findFields(lines).length > 0 || findItems(lines).some((item) => item.anchor !== undefined);

/** FormatOptions are the options of the formatter. */
export interface FormatOptions {
  /** source reads a file of source code of a listing by its path relative to the Markdown file, or returns undefined. */
  source?: Source;
}

/**
 * formatMarkdown returns the formatted lines of a Markdown text: a start marker for each note without one, `<wbr>`
 * before each start marker, the start markers at the start of a line joined to their paragraphs, the number of each link
 * to a figure, a table or a section from their order, the current value of the front matter in each field
 * ([R-XREF-004](../../docs/requirements.md#r-xref-004)), with a source the current code of each listing
 * ([R-CODE-002](../../docs/requirements.md#r-code-002)), each paragraph on one line
 * with its hard line breaks, the tables aligned, no white space at the end of a line, one blank line between blocks
 * and around the ATX headings, and one line break at the end. Code blocks, blocks of HTML, the front matter, blocks of
 * math, containers and notes stay as they are. When the preview would read the formatted text with other blocks or
 * another text, the result is the text with only the repaired start markers. A text whose comment of the format names a
 * higher major version stays as it is, because its notes can have a form that this version does not know
 * ([R-NOTE-007](../../docs/requirements.md#r-note-007)).
 * @param lines - The lines of the text.
 * @param options - The options: `source` reads the files of the listings, by their paths relative to the file of the
 * text; without it, the listings keep their code.
 */
export function formatMarkdown(lines: readonly string[], options: FormatOptions = {}): string[] {
  if (newerFormat(lines) !== undefined) {
    return [...lines];
  }
  const filled = fillFields(numberLinks(addMarkers(repairMarkers(lines))));
  const repaired = options.source ? refreshListings(filled, options.source) : filled;
  const formatted = formatLines(repaired);
  return signature(formatted) === signature(repaired) ? formatted : repaired;
}
