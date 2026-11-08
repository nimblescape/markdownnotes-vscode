// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The links to places of the file itself in the text editor ([R-TEXT-011](../../docs/requirements.md#r-text-011)): a
 * link `[text](#id)` to the anchor of HTML with that ID or name, for example the anchor of a caption of a figure, of a
 * section or of an entry of the reference list of nimblescape Markdown Paper, else to the heading with that GitHub ID;
 * a footnote reference to its definition, and the label of a definition to its first reference. The places are found
 * in the text that the editor shows; an anchor that the clean editing view hides is found in the text of the file and
 * goes to the start of its line in the shown text. The links of the editor of VS Code then go there, so that Go Back
 * of VS Code returns.
 */

import type { Token } from 'markdown-it';
import { headingText, slug } from '@nimblescape/markdownrender';
import { readFootnotes } from './footnotes';
import { parse, type Position } from './notes';

/** PlaceLink is a link to a place of the shown text: its range in a line and the position of its target. */
export interface PlaceLink {
  readonly line: number;
  readonly start: number;
  readonly end: number;
  readonly target: Position;
}

/** linkSearch matches a link to a place of the file: the text in brackets and the ID after `(#`, with an optional title. */
const linkSearch = /\[(?:[^[\]\\]|\\.|\[[^[\]]*\])*\]\(\s*<?#([^\s)>]+)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g;

/** codeSearch matches the code spans of a line, in which a link is text. */
const codeSearch = /(`+)[^]*?(?<!`)\1(?!`)/g;

/** anchorSearch matches an element of HTML with the attribute id or name; the group is its value. */
const anchorSearch = /<[A-Za-z][\w-]*\b[^>]*?\s(?:id|name)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>/]+))[^>]*>/g;

/**
 * decoded returns an ID without its percent-encoding, or the ID itself when its encoding is wrong.
 * @param id - The ID.
 */
function decoded(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

/**
 * masked returns a line with spaces in place of its code spans, so that the places of the rest stay.
 * @param line - The line.
 */
const masked = (line: string): string => line.replace(codeSearch, (code) => ' '.repeat(code.length));

/**
 * codeLines returns the lines of the code blocks and of the front matter of a text, where a link or an anchor is text.
 * @param tokens - The tokens of the text.
 */
function codeLines(tokens: readonly Token[]): Set<number> {
  const lines = new Set<number>();
  for (const token of tokens) {
    if ((token.type === 'fence' || token.type === 'code_block' || token.type === 'front_matter') && token.map) {
      for (let line = token.map[0]; line < token.map[1]; line++) {
        lines.add(line);
      }
    }
  }
  return lines;
}

/**
 * headingsOf returns the line of each heading of a text by its GitHub ID, as the renderer gives it: the ID of a second
 * heading with the same text has the suffix `-1`, and so on.
 * @param tokens - The tokens of the text.
 */
function headingsOf(tokens: readonly Token[]): Map<string, number> {
  const headings = new Map<string, number>();
  const ids = new Set<string>();
  tokens.forEach((token, index) => {
    if (token.type !== 'heading_open' || !token.map) {
      return;
    }
    const base = slug(headingText(tokens[index + 1]?.children ?? []));
    let id = base;
    for (let count = 1; ids.has(id); count++) {
      id = `${base}-${count}`;
    }
    ids.add(id);
    headings.set(id, token.map[0]);
  });
  return headings;
}

/**
 * anchorsOf returns the position of each anchor of HTML of a text by its ID or name: the first anchor of a name counts.
 * @param lines - The lines of the text.
 */
function anchorsOf(lines: readonly string[]): Map<string, Position> {
  const code = codeLines(parse(lines));
  const anchors = new Map<string, Position>();
  lines.forEach((line, index) => {
    if (code.has(index) || !line.includes('<')) {
      return;
    }
    for (const match of masked(line).matchAll(anchorSearch)) {
      const id = match[1] ?? match[2] ?? match[3] ?? '';
      if (id && !anchors.has(id)) {
        anchors.set(id, { line: index, character: match.index });
      }
    }
  });
  return anchors;
}

/**
 * placeLinks returns the links to places of the file itself in the text that an editor shows.
 * @param shown - The lines of the shown text, for example the clean text of the clean editing view.
 * @param file - The lines of the text of the file when it holds parts that the shown text hides, else undefined.
 * @param toShown - Returns the position in the shown text of a position in the file; undefined when it has none.
 */
export function placeLinks(shown: readonly string[], file?: readonly string[], toShown?: (position: Position) => Position | undefined): PlaceLink[] {
  const tokens = parse(shown);
  const code = codeLines(tokens);
  const headings = headingsOf(tokens);
  const anchors = new Map<string, Position>();
  for (const [id, position] of anchorsOf(file ?? shown)) {
    const place = file ? toShown?.(position) : position;
    if (place) {
      // A hidden anchor stands at the end of its line, for example of a caption: the link goes to the start of the line.
      anchors.set(id, file ? { line: place.line, character: 0 } : place);
    }
  }
  const links: PlaceLink[] = [];
  shown.forEach((line, index) => {
    if (code.has(index) || !line.includes('](')) {
      return;
    }
    for (const match of masked(line).matchAll(linkSearch)) {
      const id = decoded(match[1]);
      const heading = headings.get(id);
      const target = anchors.get(id) ?? (heading === undefined ? undefined : { line: heading, character: 0 });
      if (target) {
        links.push({ line: index, start: match.index, end: match.index + match[0].length, target });
      }
    }
  });
  for (const footnote of readFootnotes(shown)) {
    const definition = { line: footnote.definition.first, character: footnote.indent.length };
    for (const reference of footnote.references) {
      links.push({ line: reference.start.line, start: reference.start.character, end: reference.end.character, target: definition });
    }
    const first = footnote.references[0];
    if (first) {
      links.push({ line: definition.line, start: definition.character, end: definition.character + footnote.label.length + 3, target: first.start });
    }
  }
  return links.sort((a, b) => a.line - b.line || a.start - b.start);
}
