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
 * A section is the part of the text under a heading. A link to it names the ID
 * that GitHub and the Markdown preview give the heading, from its text, and has
 * the numbers of the sections around it and its own, for example
 * `[Chapter 2.1](#methods)` (Hannes, 2026-10-30, 03:28: "why do headings
 * required anchors?"; "we shall stay as close to markdown as possible"). An
 * anchor of the older form, `## Methods<a id="sec-methods"></a>`, still counts.
 *
 * A figure is an image that stands alone in its paragraph, and its caption is
 * the text of the image. A table has a caption: a paragraph that starts with
 * `Table:` directly before it. A figure or a table that a link names has an
 * anchor at the end of the line of its image or its caption, for example
 * `<a id="tab-grades"></a>`, and a link to it has a word and a number as its
 * text, for example `[Table 1](#tab-grades)`. A listing of code
 * ([R-CODE-001](../../docs/requirements.md#r-code-001)) has the caption
 * `Listing:` before the comment of its source and its code block, and the
 * anchor `lst-…`. The formatter writes the number of each link from the order
 * of the figures, the tables, the listings and the sections in the text. The
 * module uses no API of VS Code.
 */

import type { Token } from 'markdown-it';
import { readFootnotes } from './footnotes';
import { parse, readNotes } from './notes';
import { noteCloseType, noteOpenType } from './syntax';

/** ItemKind is the kind of an item: a figure, a table, a listing of code or a section, the part of the text under a heading. */
export type ItemKind = 'figure' | 'table' | 'listing' | 'section';

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
  /** id is the ID that GitHub gives the heading of a section, for example `methods` for `## Methods`. */
  id?: string;
}

/**
 * slugOf returns the ID that GitHub gives a heading with a text, before a number for a heading of the same ID: the text
 * in small letters, without the characters that are no letter, digit, mark, `_`, `-` or space, and a `-` for each space.
 * @param text - The text of the heading, as the page shows it.
 */
export const slugOf = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '')
    .replace(/ /g, '-');

/**
 * textOf returns the text of a heading as the page shows it: its text and its code, without HTML, emphasis and the
 * addresses of its links.
 * @param inline - The inline token of the heading.
 */
function textOf(inline: Token): string {
  return (inline.children ?? []).map((child) => (child.type === 'text' || child.type === 'code_inline' ? child.content : child.type === 'softbreak' ? ' ' : '')).join('');
}

/** anchorPattern is the source of the pattern of an anchor of a figure, a table or a section, with its name. */
const anchorPattern = String.raw`<a id="((?:fig|tab|lst|sec)-[a-z0-9]+(?:-[a-z0-9]+)*)"></a>`;

/** hasAnchor tells quickly whether a text can hold an anchor. */
export const hasAnchor = (text: string): boolean => /<a id="(?:fig|tab|lst|sec)-/.test(text);

/** prefixes are the prefixes of the names of the anchors of each kind. */
const prefixes: Record<ItemKind, string> = { figure: 'fig', table: 'tab', listing: 'lst', section: 'sec' };

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
  /** ids counts the IDs of the headings: GitHub gives a second heading of an ID the ID with `-1`, a third one `-2`. */
  const ids = new Map<string, number>();
  const idOf = (text: string): string => {
    const slug = slugOf(text);
    let id = slug;
    for (let count = ids.get(slug) ?? 0; ids.has(id); count++) {
      id = `${slug}-${count + 1}`;
      ids.set(slug, count + 1);
    }
    ids.set(id, ids.get(id) ?? 0);
    return id;
  };
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
      const id = idOf(textOf(inline));
      items.push({ kind: 'section', caption, line, level: Number(token.tag.slice(1)), id, ...(anchor ? { anchor: anchor.name, anchorStart: anchor.start, anchorEnd: anchor.end } : {}) });
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
    const captioned = /^(Table|Listing):\s*([^]*)$/.exec(inline.content.replace(new RegExp(anchorPattern, 'g'), '').trim());
    const next = tokens[index + 3];
    // The caption of a listing can have the comment of its source between it and the code block.
    const code = next?.type === 'fence' || (next?.type === 'html_block' && tokens[index + 4]?.type === 'fence');
    if (captioned && (captioned[1] === 'Table' ? next?.type === 'table_open' : code)) {
      items.push({ kind: captioned[1] === 'Table' ? 'table' : 'listing', caption: captioned[2].replace(/\s+/g, ' ').trim(), line: last, ...located });
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

/** linkSearch matches a link to a place of the file with a word and a number as its text, such as `[Table 1](#tab-x)`. */
const linkSearch = /\[([^\[\]\n]*?\S)(\s+)([A-Z]?\d+(?:\.\d+)*)\]\(#([^()\s]+)\)/g;

/**
 * sectionWords are the words of a link to the ID of a heading whose number the formatter writes, so that a link such as
 * `[Step 2](#install)` keeps its text.
 */
const sectionWords = new Set(['Chapter', 'Kapitel', 'Section', 'Abschnitt']);

/**
 * targetsOf returns the items of a text that a link names, by the name after `#`: the anchors of the figures, the
 * tables, the listings and the sections, and the IDs of the headings of the sections, which count only for a link
 * with a word of `sectionWords`.
 * @param items - The items of the text.
 */
function targetsOf(items: readonly Item[]): Map<string, { item: Item; byId: boolean }> {
  const targets = new Map<string, { item: Item; byId: boolean }>();
  for (const item of items) {
    if (item.id !== undefined && !targets.has(item.id)) {
      targets.set(item.id, { item, byId: true });
    }
  }
  for (const item of items) {
    if (item.anchor !== undefined) {
      targets.set(item.anchor, { item, byId: false });
    }
  }
  return targets;
}

/**
 * wordOf returns the word of the last link to an item of a kind in a text, for example "Tabelle", or undefined. A link
 * to a name that the text does not have counts by the prefix of the name, such as `tab-` for a table.
 * @param lines - The lines of the text.
 * @param kind - The kind of the item.
 */
export function wordOf(lines: readonly string[], kind: ItemKind): string | undefined {
  const targets = targetsOf(findItems(lines));
  let word: string | undefined;
  for (const line of lines) {
    for (const match of line.matchAll(linkSearch)) {
      const target = targets.get(match[4]);
      const counts = target ? target.item.kind === kind && (!target.byId || sectionWords.has(match[1])) : match[4].startsWith(`${prefixes[kind]}-`);
      if (counts) {
        word = match[1];
      }
    }
  }
  return word;
}

/**
 * hasNumberedLinks tells whether a text has a link whose number the formatter writes: a link to the anchor of an item,
 * or a link with a word of `sectionWords` to the ID of the heading of a section.
 * @param lines - The lines of the text.
 */
export function hasNumberedLinks(lines: readonly string[]): boolean {
  if (!lines.some((line) => line.includes('](#'))) {
    return false;
  }
  const targets = targetsOf(findItems(lines));
  return lines.some((line) => [...line.matchAll(linkSearch)].some((match) => {
    const target = targets.get(match[4]);
    return target !== undefined && (!target.byId || sectionWords.has(match[1]));
  }));
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
  if (!lines.some((line) => line.includes('](#'))) {
    return [...lines];
  }
  const items = findItems(lines);
  const targets = targetsOf(items);
  if (targets.size === 0) {
    return [...lines];
  }
  const code = codeLines(lines);
  return lines.map((line, index) => {
    if (code.has(index) || !line.includes('](#')) {
      return line;
    }
    const spans = codeSpans(line);
    return line.replace(linkSearch, (whole: string, word: string, space: string, _number: string, name: string, offset: number) => {
      const target = targets.get(name);
      const counts = target !== undefined && (!target.byId || sectionWords.has(word)) && !spans.some(([start, end]) => start <= offset && offset < end);
      return counts ? `[${word}${space}${labelOf(items, target.item)}](#${name})` : whole;
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
  de: { figure: 'Abbildung', table: 'Tabelle', listing: 'Listing', section: 'Kapitel' },
  en: { figure: 'Figure', table: 'Table', listing: 'Listing', section: 'Chapter' },
};

/**
 * defaultWord returns the word of a link for a language of VS Code, for example "Abbildung" for `de-AT`, and the English
 * word for a language without words.
 * @param kind - The kind of the item.
 * @param language - The language of VS Code.
 */
export const defaultWord = (kind: ItemKind, language: string): string => (words[language.slice(0, 2).toLowerCase()] ?? words.en)[kind];
