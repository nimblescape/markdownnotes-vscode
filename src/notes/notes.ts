// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The notes of a Markdown text, by their places in the lines of the text
 * ([R-NOTE-001](../../docs/requirements.md#r-note-001)). The text editor, the
 * Comments view, the side view, the folding and the warnings of the extension
 * work with these places. The module uses no API of VS Code.
 *
 * The notes come from markdown-it, the parser of the Markdown preview, with
 * the options of the preview, its rule for the front matter of a document,
 * and the rules of the notes ([src/notes/syntax.ts](syntax.ts)). So the editor
 * and the preview agree on the notes: a reference in a code span, in a code
 * block or in the front matter of the document is no reference, and a note in
 * a block quote or in a list item is one.
 *
 * markdown-it keeps the line of each block, not the column of a reference.
 * The text of a block in a block quote or in a list item also loses the
 * prefix of each line: the markers of the block quote and the indentation of
 * the list item. The module therefore finds each line of the text of a block
 * at the end of its line of the Markdown text, and from it the column of a
 * reference or a marker.
 */

import MarkdownIt from 'markdown-it';
import type { StateBlock, Token } from 'markdown-it';
import {
  addNoteRules,
  allReferences,
  type InlineMeta,
  markerType,
  noteCloseType,
  type NoteMeta,
  noteOpenType,
  type NoteText,
  readNote,
  referenceType,
} from './syntax';

/** Position is a place in the lines of a text: the index of the line and the index of the character in the line. */
export interface Position {
  line: number;
  character: number;
}

/** Range is a part of the lines of a text, from its start to its end. */
export interface Range {
  start: Position;
  end: Position;
}

/**
 * MarkerKind tells what a hidden part of the selection of a note marks: `open` is the start marker, `close` the
 * reference at the end, and `point` a start marker directly before the reference.
 */
export type MarkerKind = 'open' | 'close' | 'point';

/** Marker is a hidden part of the selection of a note in a Markdown text ([R-NOTE-006](../../docs/requirements.md#r-note-006)). */
export interface Marker {
  kind: MarkerKind;
  start: Position;
  end: Position;
}

/**
 * NoteSelection is the highlight of a note, the text that it belongs to ([R-NOTE-006](../../docs/requirements.md#r-note-006)):
 * from the end of its start marker, or from the start of the text of the block of its reference without one, to the
 * start of its reference. A point, in an older file, is an empty highlight.
 */
export interface NoteSelection {
  start: Position;
  end: Position;
  /** markers are the start marker and the reference, or the point of both. */
  markers: Marker[];
}

/** Note is the definition of a note in a Markdown text, with its place and its content. */
export interface Note extends NoteText {
  /** start is the position of the `[` of the definition. */
  start: Position;
  /** end is the position after the last character of the last line of the definition. */
  end: Position;
  /** prefix is the prefix of each further line of the definition: the markers of its block quotes and the indentation of its list items. */
  prefix: string;
  /** reference is the place of the reference of the note in the text, without which the note belongs to no text. */
  reference?: Range;
  /** marker is the place of the start marker of the highlight, with `<wbr>` before it. */
  marker?: Range;
  /** color is the name of the color in the start marker, or undefined for the default color. */
  color?: string;
  /** selection is the highlight of the note, when the text has its reference. */
  selection?: NoteSelection;
  /** inHeading tells whether the reference is in a heading, whose anchor on GitHub changes then. */
  inHeading: boolean;
  /** inLink tells whether the reference is in the text of a link, where it breaks on GitHub. */
  inLink: boolean;
  /** duplicate tells whether an earlier note of the text has the same label. */
  duplicate: boolean;
}

/**
 * isFrontMatterFence tells whether a line of a Markdown text is a fence of the front matter: `---` at the start of
 * the line, with nothing after it but spaces.
 * @param state - The state of the block parser.
 * @param line - The index of the line.
 */
const isFrontMatterFence = (state: StateBlock, line: number): boolean =>
  state.tShift[line] === 0 && state.src.slice(state.bMarks[line], state.eMarks[line]).trimEnd() === '---';

/**
 * frontMatter is a block rule for the front matter of a Markdown document, as the Markdown preview of VS Code has
 * one: the first line is `---`, and the front matter ends with the next line `---`. A reference in the front matter
 * is no reference, because the preview shows the front matter as a table or as YAML code, never as Markdown.
 * @param state - The state of the block parser.
 * @param startLine - The index of the line where the rule starts.
 * @param endLine - The index of the line after the text.
 * @param silent - Whether the rule only tells whether it matches.
 */
function frontMatter(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  if (startLine !== 0 || !isFrontMatterFence(state, 0)) {
    return false;
  }
  let end = 1;
  while (end < endLine && !isFrontMatterFence(state, end)) {
    end++;
  }
  if (end >= endLine) {
    return false;
  }
  if (!silent) {
    const token = state.push('front_matter', '', 0);
    token.block = true;
    token.map = [startLine, end + 1];
    state.line = end + 1;
  }
  return true;
}

/**
 * parser reads a Markdown text as the Markdown preview of VS Code does, with HTML, with the front matter of the
 * document and with the rules of the notes. It skips the rules that change only the text of the tokens.
 */
const parser = new MarkdownIt({ html: true });
parser.block.ruler.before('fence', 'front_matter', frontMatter, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });
addNoteRules(parser);
parser.core.ruler.disable(['linkify', 'replacements', 'smartquotes', 'text_join']);

/**
 * parse returns the tokens of a Markdown text, as the Markdown preview reads it. The parsing takes every reference of
 * the form of a note, also without a note, for the warnings. The formatter uses the tokens too.
 * @param lines - The lines of the Markdown text.
 */
export const parse = (lines: readonly string[]): Token[] => parser.parse(lines.join('\n'), { [allReferences]: true });

/** textParents are the tokens before an inline token whose text can hold the reference of a note. */
export const textParents = new Set(['paragraph_open', 'heading_open', 'th_open', 'td_open']);

/**
 * containerPrefix returns the prefix of the further lines of a block, from the first line of the block and the
 * containers of the block: the markers `>` of its block quotes, and for each list item the width of its marker as
 * spaces. A list item whose marker is on an earlier line counts with the white space of the line.
 * @param line - The first line of the block.
 * @param lineIndex - The index of that line.
 * @param containers - The open tokens of the block quotes and list items around the block, from the outermost.
 */
export function containerPrefix(line: string, lineIndex: number, containers: readonly Token[]): string {
  let rest = line;
  let prefix = '';
  for (const container of containers) {
    let match: RegExpExecArray | null;
    if (container.type === 'blockquote_open') {
      match = /^[ \t]{0,3}>[ \t]?/.exec(rest);
      if (!match) {
        break;
      }
      prefix += match[0];
    } else if (container.map?.[0] === lineIndex) {
      match = /^[ \t]{0,3}(?:[-+*]|\d{1,9}[.)])(?:[ \t]+|$)/.exec(rest);
      if (!match) {
        break;
      }
      prefix += match[0].replace(/[^\t]/g, ' ');
    } else {
      match = /^[ \t]*/.exec(rest)!;
      prefix += match[0];
    }
    rest = rest.slice(match[0].length);
  }
  return prefix;
}

/**
 * Locator finds the positions of the offsets of the text of a token in the lines of the Markdown text. Each line of
 * the text of the token is the end of its line of the Markdown text, after the prefix of that line, apart from the
 * white space at the end of the last line and the closing `#` of a heading.
 */
class Locator {
  /** contentLines are the lines of the text of the token. */
  private readonly contentLines: string[];
  /** bases holds, for each line of the text of the token, the column of its first character that is not white space. */
  private readonly bases: (number | undefined)[];

  /**
   * @param lines - The lines of the Markdown text.
   * @param firstLine - The index of the first line of the token.
   * @param content - The text of the token.
   */
  constructor(
    lines: readonly string[],
    private readonly firstLine: number,
    content: string,
  ) {
    this.contentLines = content.split('\n');
    this.bases = this.contentLines.map((text, index) => {
      const line = lines[firstLine + index];
      const trimmed = text.trimStart();
      if (line === undefined || trimmed === '') {
        return undefined;
      }
      // The text after the prefix is the end of the line, so its last place in the line is its place.
      const column = line.lastIndexOf(trimmed);
      return column < 0 ? undefined : column - (text.length - trimmed.length);
    });
  }

  /**
   * position returns the position of an offset of the text of the token, or undefined when its line was not found.
   * @param offset - The offset in the text of the token.
   */
  position(offset: number): Position | undefined {
    let index = 0;
    let rest = offset;
    while (index < this.contentLines.length - 1 && rest > this.contentLines[index].length) {
      rest -= this.contentLines[index].length + 1;
      index++;
    }
    const base = this.bases[index];
    return base === undefined ? undefined : { line: this.firstLine + index, character: base + rest };
  }
}

/**
 * before tells whether a position comes before another one, or is the same.
 * @param a - The position.
 * @param b - The other position.
 */
export const before = (a: Position, b: Position): boolean => a.line < b.line || (a.line === b.line && a.character <= b.character);

/**
 * same tells whether two positions are the same.
 * @param a - The position.
 * @param b - The other position.
 */
export const same = (a: Position, b: Position): boolean => a.line === b.line && a.character === b.character;

/** Found is a reference or a start marker in the text of a block. */
interface Found extends Range {
  label: string;
  /** block is the index of the inline token of the block. */
  block: number;
  /** blockStart is the position of the first character of the text of the block. */
  blockStart: Position;
  /** color is the name of the color of a start marker. */
  color?: string;
  inHeading: boolean;
  inLink: boolean;
}

/** TextBlock is the text of a paragraph, a heading or a table cell, with the start and the end of the text of each of its lines. */
export interface TextBlock {
  /** first is the index of the first line of the text. */
  first: number;
  /** last is the index of the last line of the text. */
  last: number;
  /** outerEnd is the index of the line after the outermost block that holds the text, such as a list or a block quote. */
  outerEnd: number;
  /** outerStart is the index of the first line of that outermost block. */
  outerStart: number;
  /** starts holds the position of the first character of the text of each line, by the index of the line. */
  starts: Map<number, Position>;
  /** ends holds the position after the last character of the text of each line, by the index of the line. */
  ends: Map<number, Position>;
}

/** Reading is the notes, the references and the markers of a Markdown text, and its blocks of text. */
export interface Reading {
  notes: Note[];
  /** references are the references of the form of a note in the text of the blocks, also those without a note. */
  references: Found[];
  markers: Found[];
  blocks: TextBlock[];
  /** markersInHtml are the start markers at the start of a line, which make the line an HTML block. */
  markersInHtml: Position[];
  /** inNotes are the references of the form of a note in the text of a note, which names no note. */
  inNotes: Range[];
}

/** emptyReading is the reading of a text without notes. */
const emptyReading = (): Reading => ({ notes: [], references: [], markers: [], blocks: [], markersInHtml: [], inNotes: [] });

/** markerSearch matches the start markers in a text. */
const markerSearch = /<!--\[note-[a-z0-9]{4}(?: [a-z]+)?-->/g;

/**
 * read returns the notes of a Markdown text, with their places, their contents and their selections, and the
 * references, the markers and the blocks of text.
 * @param lines - The lines of the Markdown text.
 */
export function read(lines: readonly string[]): Reading {
  const tokens = parse(lines);
  const notes: Note[] = [];
  const references: Found[] = [];
  const markers: Found[] = [];
  const blocks: TextBlock[] = [];
  const markersInHtml: Position[] = [];
  const inNotes: Range[] = [];
  const containers: Token[] = [];
  /** depth is the depth of the definitions of notes around a token: the text of a note holds no text block. */
  let depth = 0;
  /** outer is the outermost block of the token, at the level 0. */
  let outer: Token | undefined;
  /** row is the lines of the row of a table, because the text of a table cell has no lines of its own. */
  let row: [number, number] | undefined;
  tokens.forEach((token, index) => {
    if (token.level === 0 && token.nesting >= 0) {
      outer = token;
    }
    if (token.type === 'tr_open' && token.map) {
      row = [token.map[0], token.map[1]];
    }
    if (token.type === noteOpenType) {
      depth++;
      if (depth === 1 && token.map) {
        const [first, end] = token.map;
        const prefix = containerPrefix(lines[first], first, containers);
        const own = lines.slice(first, end).map((line, offset) => {
          if (offset === 0) {
            return line.slice(prefix.length);
          }
          return line.startsWith(prefix) ? line.slice(prefix.length) : line.startsWith(prefix.trimEnd()) ? line.slice(prefix.trimEnd().length) : line;
        });
        const text = readNote(own);
        const meta = token.meta as NoteMeta;
        if (text) {
          notes.push({
            ...text,
            start: { line: first, character: prefix.length },
            end: { line: end - 1, character: lines[end - 1].length },
            prefix,
            inHeading: false,
            inLink: false,
            duplicate: meta.duplicate,
          });
        }
      }
      return;
    }
    if (token.type === noteCloseType) {
      depth--;
      return;
    }
    if (depth > 0) {
      if (token.type === 'inline' && token.map) {
        for (const child of token.children ?? []) {
          if (child.type === referenceType) {
            const meta = child.meta as InlineMeta;
            const line = token.map[0] + token.content.slice(0, meta.start).split('\n').length - 1;
            const character = (lines[line] ?? '').indexOf(token.content.slice(meta.start, meta.end));
            if (character >= 0) {
              inNotes.push({ start: { line, character }, end: { line, character: character + meta.end - meta.start } });
            }
          }
        }
      }
      return;
    }
    if (token.type === 'blockquote_open' || token.type === 'list_item_open') {
      containers.push(token);
    } else if (token.type === 'blockquote_close' || token.type === 'list_item_close') {
      containers.pop();
    } else if (token.type === 'html_block' && token.map) {
      // A start marker at the start of a line makes the line an HTML block, which breaks the paragraph.
      token.content.split('\n').forEach((text, offset) => {
        const line = lines[token.map![0] + offset] ?? '';
        for (const match of text.matchAll(markerSearch)) {
          markersInHtml.push({ line: token.map![0] + offset, character: line.indexOf(match[0]) });
        }
      });
    } else if (token.type === 'inline' && (token.map ?? row) && textParents.has(tokens[index - 1]?.type)) {
      const content = token.content;
      const map = token.map ?? row!;
      const locator = new Locator(lines, map[0], content);
      const blockStart = locator.position(content.length - content.trimStart().length);
      const starts = new Map<number, Position>();
      const ends = new Map<number, Position>();
      let offset = 0;
      for (const text of content.split('\n')) {
        const start = locator.position(offset + text.length - text.trimStart().length);
        const end = locator.position(offset + text.trimEnd().length);
        if (start && end && text.trim() !== '') {
          starts.set(start.line, start);
          ends.set(end.line, end);
        }
        offset += text.length + 1;
      }
      const found = [...starts.keys()];
      if (found.length > 0 && outer?.map) {
        blocks.push({ first: Math.min(...found), last: Math.max(...found), outerStart: outer.map[0], outerEnd: outer.map[1], starts, ends });
      }
      if (!blockStart) {
        return;
      }
      const inHeading = tokens[index - 1]?.type === 'heading_open';
      for (const child of token.children ?? []) {
        if (child.type === referenceType || child.type === markerType) {
          const meta = child.meta as InlineMeta;
          const start = locator.position(meta.start);
          const end = locator.position(meta.end);
          if (start && end) {
            // A reference in the text of a link breaks the link: markdown-it and GitHub take no link with a reference in its text.
            const inLink = /^[^[\]]*\](?:\(|\[)/.test(lines[end.line].slice(end.character));
            (child.type === referenceType ? references : markers).push({ label: meta.label, start, end, block: index, blockStart, color: meta.color, inHeading, inLink });
          }
        }
      }
    }
  });
  for (const note of notes) {
    // The references name the first note of their label.
    const reference = note.duplicate ? undefined : references.find((candidate) => candidate.label === note.label);
    if (!reference) {
      continue;
    }
    note.reference = { start: reference.start, end: reference.end };
    note.inHeading = reference.inHeading;
    note.inLink = reference.inLink;
    const marker = markers.find((candidate) => candidate.label === note.label && candidate.block === reference.block && before(candidate.end, reference.start));
    if (marker) {
      note.marker = { start: marker.start, end: marker.end };
      note.color = marker.color;
    }
    if (marker && same(marker.end, reference.start)) {
      note.selection = { start: marker.end, end: marker.end, markers: [{ kind: 'point', start: marker.start, end: reference.end }] };
    } else {
      note.selection = {
        start: marker?.end ?? reference.blockStart,
        end: reference.start,
        markers: [...(marker ? [{ kind: 'open' as const, start: marker.start, end: marker.end }] : []), { kind: 'close', start: reference.start, end: reference.end }],
      };
    }
  }
  return { notes, references, markers, blocks, markersInHtml, inNotes };
}

/** noteSearch matches a text that can hold a note, so that a text without one needs no parsing. */
const noteSearch = /\[\^note-[a-z0-9]{4}\]/;

/**
 * findNotes returns the notes of a Markdown text, with their places, their contents and their selections.
 * @param lines - The lines of the Markdown text.
 */
export function findNotes(lines: readonly string[]): Note[] {
  return readNotes(lines).notes;
}

/**
 * noteAt returns the note at a position: the note whose definition holds its line, or else the note whose selection
 * holds it. Of several selections that hold the position, for example of notes on one line, it is the one that starts
 * last, so that the start of a selection names its own note and not the one before it.
 * @param notes - The notes of the text.
 * @param position - The position.
 */
export function noteAt<T extends Pick<Note, 'start' | 'end' | 'selection'>>(notes: readonly T[], position: Position): T | undefined {
  const inNote = notes.find((note) => note.start.line <= position.line && position.line <= note.end.line);
  if (inNote) {
    return inNote;
  }
  let found: T | undefined;
  for (const note of notes) {
    const selection = note.selection;
    if (selection && before(selection.start, position) && before(position, selection.end) && (!found || before(found.selection!.start, selection.start))) {
      found = note;
    }
  }
  return found;
}

/**
 * readNotes returns the reading of a Markdown text, without the parsing for a text without the form of a note.
 * @param lines - The lines of the Markdown text.
 */
export function readNotes(lines: readonly string[]): Reading {
  return lines.some((line) => noteSearch.test(line)) ? read(lines) : emptyReading();
}
