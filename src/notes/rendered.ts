// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The place in the Markdown text of text that the user selects in the
 * Markdown preview ([R-PREV-008](../../docs/requirements.md#r-prev-008)). The
 * preview names the line of the block of the selected text, the text of the
 * block before the selected text, and the selected text, as the page shows
 * them: without the markup of Markdown and of HTML. The page shows the letters
 * and the digits of the text of a block in their order, but not each other
 * character of the Markdown text: a link shows its text without its address,
 * an entity shows its character, and an escaped character shows without its
 * backslash. So the module finds the selected text by its letters and digits:
 * it reads them from the text of the block in the Markdown text, without the
 * parts that the page does not show (HTML comments and tags, the addresses and
 * titles of links, images, and the references of notes), and the selected text
 * starts after as many letters and digits as the text before it holds. When
 * that place does not hold the selected text, because the page showed a part
 * that the module does not read as the page does, the occurrence of the
 * selected text nearest to that place wins. The module uses no API of VS Code.
 */

import { type Position, type Range, type Reading, read } from './notes';

/** wordCharacter matches a letter or a digit: the characters by which the module finds the selected text. */
const wordCharacter = /^[\p{L}\p{N}]$/u;

/** autolink matches an autolink: the page shows its address. */
const autolink = /^<(?:[a-z][a-z0-9+.-]{1,31}:[^\s<>]*|[^\s<>@]+@[^\s<>]+)>/i;

/** htmlTag matches an HTML tag: the page shows no part of it. */
const htmlTag = /^<\/?[a-z][a-z0-9-]*(?:\s[^<>]*)?\/?>/i;

/** noteReference matches the reference of a note, which shows nothing. */
const noteReference = /^\[\^note-[a-z0-9]{4}\]/;

/** entity matches an entity of HTML: the page shows its character. */
const entity = /^&(?:#(\d{1,7})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z][a-zA-Z0-9]{1,31}));/;

/** letterEntities holds the characters of the named entities of letters that Markdown texts use most. */
const letterEntities: Readonly<Record<string, string>> = {
  auml: 'ä',
  ouml: 'ö',
  uuml: 'ü',
  Auml: 'Ä',
  Ouml: 'Ö',
  Uuml: 'Ü',
  szlig: 'ß',
  eacute: 'é',
  egrave: 'è',
  agrave: 'à',
  aacute: 'á',
  ccedil: 'ç',
  ntilde: 'ñ',
};

/** asciiPunctuation matches the characters that a backslash escapes in Markdown. */
const asciiPunctuation = /^[!-/:-@[-`{-~]$/;

/** Word is the letters and the digits of a text, in lower case, and for each one the offsets of its source. */
interface Word {
  characters: string[];
  /** starts holds the offset of the first character of the source of each character. */
  starts: number[];
  /** ends holds the offset after the last character of the source of each character. */
  ends: number[];
}

/**
 * wordOf returns the letters and the digits of a text as the page shows it, in lower case, for the comparison.
 * @param text - The text.
 */
export function wordOf(text: string): string[] {
  return [...text].flatMap((character) => (wordCharacter.test(character) ? [...character.toLowerCase()] : []));
}

/**
 * closing returns the offset after the bracket that closes the bracket at an offset of a text, or -1 without one. A
 * backslash escapes a bracket.
 * @param text - The text.
 * @param start - The offset of the opening bracket: `[`, `(` or `<`.
 */
function closing(text: string, start: number): number {
  const open = text[start];
  const close = open === '[' ? ']' : open === '(' ? ')' : '>';
  let depth = 0;
  for (let index = start; index < text.length; index++) {
    const character = text[index];
    if (character === '\\') {
      index++;
    } else if (character === open && open !== '<') {
      depth++;
    } else if (character === '<' && open === '(' && depth === 1 && index === start + 1) {
      // A destination in angle brackets can hold brackets.
      const end = closing(text, index);
      if (end < 0) {
        return -1;
      }
      index = end - 1;
    } else if (character === close) {
      depth--;
      if (depth <= 0) {
        return index + 1;
      }
    }
  }
  return -1;
}

/**
 * shownWord returns the letters and the digits that the page shows of a Markdown text of a block: without HTML comments
 * and tags, the addresses and titles of links, images, and the references of notes; with the text of code spans and of
 * autolinks, and the characters of entities.
 * @param text - The text of the block, its lines joined with line breaks.
 */
function shownWord(text: string): Word {
  const word: Word = { characters: [], starts: [], ends: [] };
  /**
   * add adds the letters and the digits of a text that the page shows, with the offsets of its source.
   * @param shown - The text that the page shows.
   * @param start - The offset of the first character of the source.
   * @param end - The offset after the last character of the source.
   */
  const add = (shown: string, start: number, end: number): void => {
    for (const character of wordOf(shown)) {
      word.characters.push(character);
      word.starts.push(start);
      word.ends.push(end);
    }
  };
  /** opened counts the brackets `[` of the text of links that are open, so that `](` starts the address of a link. */
  let opened = 0;
  let index = 0;
  while (index < text.length) {
    const rest = text.slice(index);
    const character = text[index];
    if (character === '\\' && asciiPunctuation.test(text[index + 1] ?? '')) {
      index += 2;
    } else if (rest.startsWith('<!--')) {
      const end = text.indexOf('-->', index + 4);
      index = end < 0 ? text.length : end + 3;
    } else if (character === '<' && autolink.test(rest)) {
      const length = autolink.exec(rest)![0].length;
      for (let inner = index + 1; inner < index + length - 1; inner++) {
        add(text[inner], inner, inner + 1);
      }
      index += length;
    } else if (character === '<' && htmlTag.test(rest)) {
      index += htmlTag.exec(rest)![0].length;
    } else if (character === '`') {
      const fence = /^`+/.exec(rest)![0];
      const end = new RegExp(`(?<!\`)${fence}(?!\`)`, 'g');
      end.lastIndex = index + fence.length;
      const found = end.exec(text);
      if (found) {
        for (let inner = index + fence.length; inner < found.index; inner++) {
          add(text[inner], inner, inner + 1);
        }
        index = found.index + fence.length;
      } else {
        index += fence.length;
      }
    } else if (rest.startsWith('![') && closing(text, index + 1) > 0) {
      // An image shows no text: its description is the text of its attribute alt.
      let end = closing(text, index + 1);
      if (text[end] === '(' || text[end] === '[') {
        end = Math.max(end, closing(text, end));
      }
      index = end;
    } else if (noteReference.test(rest)) {
      index += noteReference.exec(rest)![0].length;
    } else if (character === '[') {
      opened++;
      index++;
    } else if (character === ']' && opened > 0 && (text[index + 1] === '(' || text[index + 1] === '[') && closing(text, index + 1) > 0) {
      // The address and the title of a link, and the label of a link by reference, show nothing.
      opened--;
      index = closing(text, index + 1);
    } else if (character === '&' && entity.test(rest)) {
      const [source, decimal, hexadecimal, name] = entity.exec(rest)!;
      const code = decimal !== undefined ? Number(decimal) : hexadecimal !== undefined ? Number.parseInt(hexadecimal, 16) : undefined;
      const shown = code !== undefined ? (code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '') : (letterEntities[name] ?? '');
      add(shown, index, index + source.length);
      index += source.length;
    } else {
      if (character === ']' && opened > 0) {
        opened--;
      }
      const point = String.fromCodePoint(text.codePointAt(index)!);
      add(point, index, index + point.length);
      index += point.length;
    }
  }
  return word;
}

/**
 * matchesAt tells whether a list of characters holds another one at an offset.
 * @param characters - The characters.
 * @param part - The other characters.
 * @param offset - The offset.
 */
const matchesAt = (characters: readonly string[], part: readonly string[], offset: number): boolean => part.every((character, index) => characters[offset + index] === character);

/**
 * renderedRange returns the range in a Markdown text of text that the user selected in its preview, or undefined when
 * the block holds no such text. The range starts at the first letter or digit of the selected text and ends after the
 * last one, and also holds the other characters at its edges, such as a period, when the Markdown text holds them
 * there.
 * @param lines - The lines of the Markdown text that the preview renders.
 * @param line - The line of the block of the selected text, which the preview names (`data-line`): a paragraph, a
 * heading, a list item or a row of a table.
 * @param before - The text of the block before the selected text, as the page shows it.
 * @param selected - The selected text, as the page shows it.
 * @param reading - The reading of the lines.
 */
export function renderedRange(lines: readonly string[], line: number, before: string, selected: string, reading: Reading = read(lines)): Range | undefined {
  // The blocks of text of the line: one, or the cells of a row of a table.
  const blocks = reading.blocks.filter((block) => block.first === line).sort((a, b) => a.starts.get(line)!.character - b.starts.get(line)!.character);
  const target = wordOf(selected);
  if (blocks.length === 0 || target.length === 0) {
    return undefined;
  }
  // The text of the blocks, line by line, and the position in the Markdown text of each of its offsets.
  let text = '';
  const places: Position[] = [];
  /** lineEnd is the position after the last character of the line before, where the break between two lines stands. */
  let lineEnd: Position | undefined;
  for (const block of blocks) {
    for (let index = block.first; index <= block.last; index++) {
      const start = block.starts.get(index);
      const end = block.ends.get(index);
      if (!start || !end) {
        continue;
      }
      if (lineEnd) {
        text += '\n';
        places.push(lineEnd);
      }
      for (let character = start.character; character < end.character; character++) {
        places.push({ line: index, character });
      }
      text += lines[index].slice(start.character, end.character);
      lineEnd = end;
    }
  }
  const placeOf = (offset: number): Position => places[offset] ?? lineEnd!;
  const shown = shownWord(text);
  const prefix = wordOf(before);
  let offset: number | undefined;
  if (matchesAt(shown.characters, prefix, 0) && matchesAt(shown.characters, target, prefix.length)) {
    offset = prefix.length;
  } else {
    for (let candidate = 0; candidate + target.length <= shown.characters.length; candidate++) {
      if (matchesAt(shown.characters, target, candidate) && (offset === undefined || Math.abs(candidate - prefix.length) < Math.abs(offset - prefix.length))) {
        offset = candidate;
      }
    }
  }
  if (offset === undefined) {
    return undefined;
  }
  let start = shown.starts[offset];
  let end = shown.ends[offset + target.length - 1];
  // The characters at the edges of the selected text belong to it, when the Markdown text holds them there.
  const trimmed = selected.trim();
  const leading = /^[^\p{L}\p{N}]*/u.exec(trimmed)![0];
  const trailing = /[^\p{L}\p{N}]*$/u.exec(trimmed)![0];
  if (leading !== '' && text.slice(start - leading.length, start) === leading) {
    start -= leading.length;
  }
  if (trailing !== '' && text.slice(end, end + trailing.length) === trailing) {
    end += trailing.length;
  }
  return { start: placeOf(start), end: placeOf(end) };
}
