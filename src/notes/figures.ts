// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The figures, the tables and the sections of a Markdown text, and the links
 * to them ([R-XREF-001](../../docs/requirements.md#r-xref-001),
 * [R-XREF-002](../../docs/requirements.md#r-xref-002),
 * [R-XREF-003](../../docs/requirements.md#r-xref-003)). Hannes, 2026-10-30:
 * "it adds a references to the figure or table in the text", "technically it
 * is a link to it", "/ref also adds chapter numbers"; the commands named by a
 * noun add an entry, `/ref` adds a reference
 * ([decision 35](../../docs/requirements.md#decisions)).
 *
 * A section is the part of the text under a heading. Its anchor stands at the
 * end of the line of the heading, for example `## Methods<a id="sec-methods"></a>`,
 * and a link to it has the numbers of the sections around it and its own, for
 * example `[Chapter 2.1](#sec-methods)`.
 *
 * A figure is an image that stands alone in its paragraph, and its caption is
 * the text of the image. A table has a caption: a paragraph that starts with
 * `Table:` directly before it. A figure or a table that a link names has an
 * anchor at the end of the line of its image or its caption, for example
 * `<a id="tab-grades"></a>`, and a link to it has a word and a number as its
 * text, for example `[Table 1](#tab-grades)`. The formatter writes the number
 * of each link from the order of the figures and the tables in the text. The
 * module uses no API of VS Code.
 */

import type { Token } from 'markdown-it';
import { readFootnotes } from './footnotes';
import { parse, readNotes } from './notes';
import { noteCloseType, noteOpenType } from './syntax';

/** ItemKind is the kind of an item: a figure, a table or a section, the part of the text under a heading. */
export type ItemKind = 'figure' | 'table' | 'section';

/** Item is a figure, a table or a section of a Markdown text. */
export interface Item {
  kind: ItemKind;
  /** caption is the text of the image of a figure, the text after `Table:` or the text of a heading, without the anchor. */
  caption: string;
  /** line is the index of the line that ends the image, the caption or the text of the heading, where its anchor stands. */
  line: number;
  /** level is the level of the heading of a section, 1 for `#`. */
  level?: number;
  /** anchor is the name of the anchor, or undefined without one. */
  anchor?: string;
  /** anchorStart and anchorEnd are the columns of the anchor in its line. */
  anchorStart?: number;
  anchorEnd?: number;
}

/** anchorPattern is the source of the pattern of an anchor of a figure, a table or a section, with its name. */
const anchorPattern = String.raw`<a id="((?:fig|tab|sec)-[a-z0-9]+(?:-[a-z0-9]+)*)"></a>`;

/** hasAnchor tells quickly whether a text can hold an anchor. */
export const hasAnchor = (text: string): boolean => text.includes('<a id="fig-') || text.includes('<a id="tab-') || text.includes('<a id="sec-');

/** prefixes are the prefixes of the names of the anchors of each kind. */
const prefixes: Record<ItemKind, string> = { figure: 'fig', table: 'tab', section: 'sec' };

/**
 * anchorOf returns the anchor of a line: the last one at its end, after which only white space follows.
 * @param line - The line.
 */
function anchorOf(line: string): { name: string; start: number; end: number } | undefined {
  const match = new RegExp(`${anchorPattern}\\s*$`).exec(line);
  return match ? { name: match[1], start: match.index, end: match.index + match[0].trimEnd().length } : undefined;
}

/**
 * imageOf returns the caption of a paragraph that holds only an image, apart from white space, line breaks and
 * anchors, or undefined.
 * @param inline - The inline token of the paragraph.
 */
function imageOf(inline: Token): string | undefined {
  const parts = (inline.children ?? []).filter(
    (child) => !(child.type === 'text' && child.content.trim() === '') && child.type !== 'softbreak' && !(child.type === 'html_inline' && /^<a id="(?:fig|tab)-[^"]*">$|^<\/a>$/.test(child.content)),
  );
  return parts.length === 1 && parts[0].type === 'image' ? parts[0].content.trim() : undefined;
}

/**
 * findItems returns the figures, the tables and the sections of a Markdown text in the order of the text. Code blocks,
 * HTML, the front matter and the texts of the notes hold none. A heading above the top level of the sections, such as
 * the title of a document with sections of the level `##`, starts no section ([topLevel](#toplevel)).
 * @param lines - The lines of the text.
 */
export function findItems(lines: readonly string[]): Item[] {
  const tokens = parse(lines);
  const items: Item[] = [];
  let depth = 0;
  tokens.forEach((token, index) => {
    if (token.type === noteOpenType) {
      depth++;
    } else if (token.type === noteCloseType) {
      depth--;
    }
    if (depth > 0 || !token.map) {
      return;
    }
    const inline = tokens[index + 1];
    if (token.type === 'heading_open') {
      // The text of a heading underlined with `===` or `---` ends on the line before the underline.
      const line = token.markup.startsWith('#') ? token.map[0] : token.map[1] - 2;
      const anchor = anchorOf(lines[line].replace(/\s+#+\s*$/, ''));
      const caption = inline.content.replace(new RegExp(anchorPattern, 'g'), '').replace(/\s+/g, ' ').trim();
      items.push({ kind: 'section', caption, line, level: Number(token.tag.slice(1)), ...(anchor ? { anchor: anchor.name, anchorStart: anchor.start, anchorEnd: anchor.end } : {}) });
      return;
    }
    if (token.type !== 'paragraph_open') {
      return;
    }
    const last = token.map[1] - 1;
    const anchor = anchorOf(lines[last]);
    const located = anchor ? { anchor: anchor.name, anchorStart: anchor.start, anchorEnd: anchor.end } : {};
    const caption = imageOf(inline);
    if (caption !== undefined) {
      items.push({ kind: 'figure', caption, line: last, ...located });
      return;
    }
    const table = /^Table:\s*([^]*)$/.exec(inline.content.replace(new RegExp(anchorPattern, 'g'), '').trim());
    if (table && tokens[index + 3]?.type === 'table_open') {
      items.push({ kind: 'table', caption: table[1].replace(/\s+/g, ' ').trim(), line: last, ...located });
    }
  });
  const top = topLevel(items);
  return items.filter((item) => item.kind !== 'section' || item.level! >= top);
}

/**
 * topLevel returns the level of the headings of the first sections, such as the chapters: the highest level that more
 * than one heading has, or else the highest level of a heading. A heading above it, such as the one title of a
 * document, starts no section.
 * @param items - The items of the text.
 */
function topLevel(items: readonly Item[]): number {
  const levels = items.filter((item) => item.kind === 'section').map((item) => item.level!);
  const repeated = levels.filter((level, index) => levels.indexOf(level) !== index);
  return Math.min(...(repeated.length > 0 ? repeated : levels));
}

/**
 * numberOf returns the number of an item among the items of its kind, from 1.
 * @param items - The items of the text.
 * @param item - The item.
 */
export const numberOf = (items: readonly Item[], item: Item): number => items.filter((other) => other.kind === item.kind).indexOf(item) + 1;

/**
 * labelOf returns the number of an item as a link shows it: the number among the items of its kind for a figure or a
 * table, for example "3", and the numbers of the sections around a section and of the section itself, for example
 * "2.1" for the first section of the level `###` in the second chapter of the level `##`.
 * @param items - The items of the text.
 * @param item - The item.
 */
export function labelOf(items: readonly Item[], item: Item): string {
  if (item.kind !== 'section') {
    return String(numberOf(items, item));
  }
  const sections = items.filter((other) => other.kind === 'section');
  const top = Math.min(...sections.map((section) => section.level!));
  const counters: number[] = [];
  for (const section of sections) {
    const place = section.level! - top;
    counters.length = place + 1;
    counters[place] = (counters[place] ?? 0) + 1;
    if (section === item) {
      return Array.from(counters, (counter) => counter ?? 0).join('.');
    }
  }
  return '0';
}

/** smallWords are the English and German words that a name of an anchor leaves out, such as "the" and "der". */
const smallWords = new Set(['a', 'an', 'and', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with', 'das', 'dem', 'den', 'der', 'des', 'die', 'ein', 'eine', 'fuer', 'im', 'mit', 'nach', 'oder', 'und', 'von', 'zu', 'zum', 'zur']);

/**
 * anchorName returns a new name of an anchor for an item: the prefix of its kind and up to three words of its caption,
 * in small letters and digits, without small words such as "the", and a number when the file uses the name already.
 * @param item - The item.
 * @param items - The items of the text, whose anchors the name must differ from.
 */
export function anchorName(item: Item, items: readonly Item[]): string {
  const all = item.caption
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 0);
  const content = all.filter((word) => !smallWords.has(word));
  const words = (content.length > 0 ? content : all).slice(0, 3);
  const base = `${prefixes[item.kind]}-${words.length > 0 ? words.join('-') : String(numberOf(items, item))}`;
  const used = new Set(items.map((other) => other.anchor));
  let name = base;
  for (let count = 2; used.has(name); count++) {
    name = `${base}-${count}`;
  }
  return name;
}

/** linkSearch matches a link to an anchor of a figure, a table or a section with a word and a number as its text. */
const linkSearch = /\[([^\[\]\n]*?\S)(\s+)([A-Z]?\d+(?:\.\d+)*)\]\(#((?:fig|tab|sec)-[a-z0-9]+(?:-[a-z0-9]+)*)\)/g;

/**
 * wordOf returns the word of the last link to an item of a kind in a text, for example "Tabelle", or undefined.
 * @param lines - The lines of the text.
 * @param kind - The kind of the item.
 */
export function wordOf(lines: readonly string[], kind: ItemKind): string | undefined {
  let word: string | undefined;
  for (const line of lines) {
    for (const match of line.matchAll(linkSearch)) {
      if (match[4].startsWith(`${prefixes[kind]}-`)) {
        word = match[1];
      }
    }
  }
  return word;
}

/**
 * codeSpans returns the column ranges of the code spans of a line.
 * @param line - The line.
 */
function codeSpans(line: string): [number, number][] {
  const spans: [number, number][] = [];
  const search = /(`+)[^]*?\1/g;
  for (let match = search.exec(line); match; match = search.exec(line)) {
    spans.push([match.index, match.index + match[0].length]);
  }
  return spans;
}

/**
 * numberLinks returns the lines of a Markdown text with the number of each link to a figure or a table written anew
 * from the order of the items in the text ([R-XREF-002](../../docs/requirements.md#r-xref-002)). The word of a link
 * stays; a link to an anchor that the text does not hold, and a link in a code block or a code span, stays as it is.
 * @param lines - The lines of the text.
 */
export function numberLinks(lines: readonly string[]): string[] {
  if (!lines.some(hasAnchor)) {
    return [...lines];
  }
  const items = findItems(lines);
  const numbers = new Map(items.filter((item) => item.anchor).map((item) => [item.anchor!, labelOf(items, item)]));
  if (numbers.size === 0) {
    return [...lines];
  }
  const code = codeLines(lines);
  return lines.map((line, index) => {
    if (code.has(index) || !line.includes('](#')) {
      return line;
    }
    const spans = codeSpans(line);
    return line.replace(linkSearch, (whole: string, word: string, space: string, _number: string, anchor: string, offset: number) => {
      const number = numbers.get(anchor);
      return number === undefined || spans.some(([start, end]) => start <= offset && offset < end) ? whole : `[${word}${space}${number}](#${anchor})`;
    });
  });
}

/**
 * codeLines returns the indexes of the lines of the code blocks and the blocks of HTML of a text.
 * @param lines - The lines of the text.
 */
export function codeLines(lines: readonly string[]): Set<number> {
  const code = new Set<number>();
  for (const token of parse(lines)) {
    if ((token.type === 'fence' || token.type === 'code_block' || token.type === 'html_block') && token.map) {
      for (let line = token.map[0]; line < token.map[1]; line++) {
        code.add(line);
      }
    }
  }
  return code;
}

/**
 * anchorsOf returns the anchors of the figures and the tables of a text, by their lines, for the clean editing view,
 * which hides them: each anchor outside the code blocks, the code spans, the blocks of HTML and the definitions of the
 * notes and the footnotes, also one that an edit moved from the end of its line or whose line is no longer a figure
 * or a table, so that the anchor stays hidden at its text.
 * @param lines - The lines of the text.
 */
export function anchorsOf(lines: readonly string[]): { line: number; start: number; end: number }[] {
  if (!lines.some(hasAnchor)) {
    return [];
  }
  const skipped = codeLines(lines);
  const skip = (first: number, last: number) => {
    for (let line = first; line <= last; line++) {
      skipped.add(line);
    }
  };
  readNotes(lines).notes.forEach((note) => skip(note.start.line, note.end.line));
  readFootnotes(lines).forEach(({ definition }) => skip(definition.first, definition.last));
  const search = new RegExp(anchorPattern, 'g');
  return lines.flatMap((line, index) => {
    if (skipped.has(index) || !hasAnchor(line)) {
      return [];
    }
    const spans = codeSpans(line);
    return [...line.matchAll(search)]
      .filter((match) => !spans.some(([start, end]) => start <= match.index && match.index < end))
      .map((match) => ({ line: index, start: match.index, end: match.index + match[0].length }));
  });
}

/**
 * anchorColumn returns the column of a line where a new anchor of an item goes: the end of the line, and for a heading
 * the end of its text, before a closing sequence of `#`.
 * @param line - The line of the item.
 * @param item - The item.
 */
export const anchorColumn = (line: string, item: Item): number => (item.kind === 'section' ? line.replace(/(?:\s+#+)?\s*$/, '') : line.trimEnd()).length;

/** anchorText returns the anchor of a name. */
export const anchorText = (name: string): string => `<a id="${name}"></a>`;

/** words are the words of the links of each kind, by the language of the user. */
const words: Record<string, Record<ItemKind, string>> = {
  de: { figure: 'Abbildung', table: 'Tabelle', section: 'Kapitel' },
  en: { figure: 'Figure', table: 'Table', section: 'Chapter' },
};

/**
 * defaultWord returns the word of a link for a language of VS Code, for example "Abbildung" for `de-AT`, and the English
 * word for a language without words.
 * @param kind - The kind of the item.
 * @param language - The language of VS Code.
 */
export const defaultWord = (kind: ItemKind, language: string): string => (words[language.slice(0, 2).toLowerCase()] ?? words.en)[kind];
