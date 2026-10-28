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
 * and the rules of the markdown-it plugin ([src/notes/syntax.ts](syntax.ts)).
 * So the editor and the preview agree on the notes: a comment in a code span,
 * in a code block or in the front matter of the document is no note, and a
 * comment in a block quote or in a list item is one.
 *
 * markdown-it keeps the line of each block, not the column of a comment. The
 * text of a block in a block quote or in a list item also loses the prefix of
 * each line: the markers of the block quote and the indentation of the list
 * item. The module therefore finds each line of the text of a block at the end
 * of its line of the Markdown text, and from it the column of a comment.
 */

import MarkdownIt from 'markdown-it';
import type { StateBlock, Token } from 'markdown-it';
import {
  type InlineNoteMeta,
  inlineNoteRule,
  innerText,
  type Kind,
  type MarkerKind,
  type NoteLinesMeta,
  noteLinesRule,
  noteLinesTokenType,
  noteTokenType,
  type NoteText,
  onlyComments,
  readMarker,
  readNote,
  selectionOf,
} from './syntax';

/** Position is a place in the lines of a text: the index of the line and the index of the character in the line. */
export interface Position {
  line: number;
  character: number;
}

/**
 * Place tells where a note stands: on lines of its own (`block`), or in the text of a line of a paragraph or a heading
 * (`inline`). An inline note `<!-- note inline` on lines of its own has the place `block`.
 */
export type Place = 'block' | 'inline';

/** Marker is a marker of a selection in a Markdown text ([R-NOTE-006](../../docs/requirements.md#r-note-006)). */
export interface Marker {
  kind: MarkerKind;
  /** id is the ID of the selection. */
  id: string;
  /** start is the position of the `<` of `<!--`. */
  start: Position;
  /** end is the position after the `>` of `-->`. */
  end: Position;
  /** blockStart is the position of the first character of the text of the block of the marker. */
  blockStart: Position;
}

/**
 * NoteSelection is the passage of the text that a note belongs to ([R-NOTE-006](../../docs/requirements.md#r-note-006)):
 * from the end of its opening marker, or from the start of the text of its block without one, to the start of its
 * closing marker. A point is an empty selection at its marker.
 */
export interface NoteSelection {
  /** id is the ID of the selection. */
  id: string;
  /** start is the position of the first character of the passage. */
  start: Position;
  /** end is the position after the last character of the passage. */
  end: Position;
  /** markers are the markers of the selection in the text. */
  markers: Marker[];
}

/** Note is a comment of a Markdown text, with its place and its content. */
export interface Note extends NoteText {
  /** place tells where the note stands. */
  place: Place;
  /** start is the position of the `<` of `<!--`. */
  start: Position;
  /** end is the position after the `>` of `-->`. */
  end: Position;
  /** text is the text between `<!--` and `-->`, without the prefixes of its lines. */
  text: string;
  /** prefix is the prefix of each further line of the note: the markers of its block quotes and the indentation of its list items. */
  prefix: string;
  /** selection is the passage of the text that the note belongs to, when the markers of its selection are in the text. */
  selection?: NoteSelection;
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
 * one: the first line is `---`, and the front matter ends with the next line `---`. A comment in the front matter is
 * no note, because the preview shows the front matter as a table or as YAML code, never as Markdown.
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
 * addNoteRules adds the rules of the notes to a markdown-it instance: the block rule of an inline note on lines of its
 * own, and the inline rule of a comment in a text.
 * @param md - The markdown-it instance.
 */
export function addNoteRules(md: MarkdownIt): void {
  md.block.ruler.before('html_block', noteLinesTokenType, noteLinesRule, { alt: ['paragraph', 'reference', 'blockquote'] });
  md.inline.ruler.before('html_inline', noteTokenType, inlineNoteRule);
}

/**
 * parser reads a Markdown text as the Markdown preview of VS Code does, with HTML, with the front matter of the
 * document and with the rules of the notes. It skips the rules that change only the text of the tokens.
 */
const parser = new MarkdownIt({ html: true });
parser.block.ruler.before('fence', 'front_matter', frontMatter, { alt: ['paragraph', 'reference', 'blockquote', 'list'] });
addNoteRules(parser);
parser.core.ruler.disable(['linkify', 'replacements', 'smartquotes', 'text_join']);

/** leafTypes are the tokens of the blocks that hold no other block, by which a new note finds its place. */
const leafTypes = new Set(['paragraph_open', 'heading_open', 'fence', 'code_block', 'html_block', 'table_open', 'hr', 'front_matter', noteLinesTokenType]);

/**
 * inlineParents are the tokens before an inline token whose text can hold a note: a note has several lines, and the
 * text of a table cell has one.
 */
export const inlineParents = new Set(['paragraph_open', 'heading_open']);

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
 * noteAt builds a note from a comment of the text of a token, or returns undefined when the comment is no note or
 * when its position was not found.
 * @param locator - The locator of the token.
 * @param content - The text of the token.
 * @param start - The offset of the comment in the text of the token.
 * @param end - The offset after the comment.
 * @param place - The place of the note.
 * @param prefix - The prefix of the further lines.
 */
function noteAt(locator: Locator, content: string, start: number, end: number, place: Place, prefix: string): Note | undefined {
  const text = innerText(content.slice(start, end));
  const note = readNote(text);
  const startPosition = locator.position(start);
  const endPosition = locator.position(end);
  if (!note || !startPosition || !endPosition) {
    return undefined;
  }
  return { ...note, place, start: startPosition, end: endPosition, text, prefix };
}

/**
 * positionOf returns a function that returns the position of an offset of the source text of the parser.
 * @param lines - The lines of the Markdown text, which the parser read joined with `\n`.
 */
function positionOf(lines: readonly string[]): (offset: number) => Position {
  const starts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    starts.push(offset);
    offset += line.length + 1;
  }
  return (target) => {
    let line = 0;
    while (line + 1 < starts.length && starts[line + 1] <= target) {
      line++;
    }
    return { line, character: target - starts[line] };
  };
}

/**
 * parse returns the tokens of a Markdown text.
 * @param lines - The lines of the Markdown text.
 */
const parse = (lines: readonly string[]): Token[] => parser.parse(lines.join('\n'), {});

/** markerPattern matches the comments in a text that can be markers of a selection. */
const markerPattern = /<!--\[?[A-Za-z][A-Za-z0-9]{0,31}\]?-->/g;

/**
 * before tells whether a position comes before another one, or is the same.
 * @param a - The position.
 * @param b - The other position.
 */
const before = (a: Position, b: Position): boolean => a.line < b.line || (a.line === b.line && a.character <= b.character);

/** Reading is the notes and the markers of the selections of a Markdown text. */
interface Reading {
  notes: Note[];
  markers: Marker[];
}

/**
 * read returns the notes and the markers of a Markdown text, with their places and their contents: each note of an
 * HTML block that holds only comments, each inline note `<!-- note inline` on lines of its own, each note in the text
 * of a paragraph or a heading, where markdown-it reads the comment of the note as a comment of Markdown, and each
 * marker of a selection in a text or in an HTML block. Every other comment is left out.
 * @param lines - The lines of the Markdown text.
 */
function read(lines: readonly string[]): Reading {
  const tokens = parse(lines);
  const position = positionOf(lines);
  const notes: Note[] = [];
  const markers: Marker[] = [];
  const containers: Token[] = [];
  /**
   * addMarker adds a marker of a comment of the text of a token.
   * @param locator - The locator of the token.
   * @param content - The text of the token.
   * @param start - The offset of the comment in the text of the token.
   * @param end - The offset after the comment.
   */
  const addMarker = (locator: Locator, content: string, start: number, end: number): void => {
    const marker = readMarker(content.slice(start, end));
    const startPosition = locator.position(start);
    const endPosition = locator.position(end);
    const blockStart = locator.position(content.length - content.trimStart().length);
    if (marker && startPosition && endPosition && blockStart) {
      markers.push({ ...marker, start: startPosition, end: endPosition, blockStart });
    }
  };
  tokens.forEach((token, index) => {
    if (token.type === noteLinesTokenType && token.map) {
      const text = innerText(token.content);
      const note = readNote(text);
      const { start, end } = token.meta as NoteLinesMeta;
      if (note) {
        const prefix = containerPrefix(lines[token.map[0]], token.map[0], containers);
        notes.push({ ...note, place: 'block', start: position(start), end: position(end), text, prefix });
      }
    } else if (token.type === 'blockquote_open' || token.type === 'list_item_open') {
      containers.push(token);
    } else if (token.type === 'blockquote_close' || token.type === 'list_item_close') {
      containers.pop();
    } else if (token.type === 'html_block' && token.map) {
      const locator = new Locator(lines, token.map[0], token.content);
      // A marker at the start of a line starts an HTML block, which the extension never writes, but reads.
      for (const match of token.content.matchAll(markerPattern)) {
        addMarker(locator, token.content, match.index, match.index + match[0].length);
      }
      const spans = onlyComments(token.content);
      if (!spans?.length) {
        return;
      }
      const prefix = containerPrefix(lines[token.map[0]], token.map[0], containers);
      for (const span of spans) {
        const note = noteAt(locator, token.content, span.start, span.end, 'block', prefix);
        if (note) {
          notes.push(note);
        }
      }
    } else if (token.type === 'inline' && token.map) {
      if (!token.children?.some((child) => child.type === noteTokenType)) {
        return;
      }
      const parent = tokens[index - 1];
      const first = token.map[0];
      const locator = new Locator(lines, first, token.content);
      const prefix = containerPrefix(lines[first], first, containers);
      for (const child of token.children ?? []) {
        if (child.type !== noteTokenType) {
          continue;
        }
        const { start, end } = child.meta as InlineNoteMeta;
        addMarker(locator, token.content, start, end);
        // A note has several lines, so only the text of a paragraph or a heading holds one; a marker has one line.
        const note = inlineParents.has(parent?.type) ? noteAt(locator, token.content, start, end, 'inline', prefix) : undefined;
        if (note) {
          notes.push(note);
        }
      }
    }
  });
  for (const note of notes) {
    const id = selectionOf(note);
    const own = markers.filter((marker) => marker.id === id);
    const point = own.find((marker) => marker.kind === 'point');
    const open = own.find((marker) => marker.kind === 'open');
    const close = own.find((marker) => marker.kind === 'close');
    if (!id) {
      continue;
    }
    if (point) {
      note.selection = { id, start: point.start, end: point.start, markers: own };
    } else if (close && open && before(open.end, close.start)) {
      note.selection = { id, start: open.end, end: close.start, markers: own };
    } else if (close && !open) {
      // Without an opening marker, the selection starts at the start of the text of its block.
      note.selection = { id, start: close.blockStart, end: close.start, markers: own };
    }
  }
  return { notes, markers };
}

/** noteKeyword matches a line that can start a note, so that a text without one needs no parsing. */
const noteKeyword = /<!--[ \t]*note(?:[ \t]+inline)?[ \t]*$/i;

/**
 * findNotes returns the notes of a Markdown text, with their places, their contents and their selections.
 * @param lines - The lines of the Markdown text.
 */
export function findNotes(lines: readonly string[]): Note[] {
  return lines.some((line) => noteKeyword.test(line)) ? read(lines).notes : [];
}

/**
 * findMarkers returns the markers of the selections of a Markdown text, also of selections without a note.
 * @param lines - The lines of the Markdown text.
 */
export function findMarkers(lines: readonly string[]): Marker[] {
  return lines.some((line) => line.includes('-->')) ? read(lines).markers : [];
}

/** Insertion is the place of a new note: the line before which it goes, the prefix of its lines, and its kind. */
export interface Insertion {
  /** line is the index of the line before which the note goes; the number of lines puts it at the end. */
  line: number;
  /** prefix is the prefix of each line of the note. */
  prefix: string;
  /** kind is the kind of the new note: `inline` in a paragraph or after a heading, `block` elsewhere. */
  kind: Kind;
}

/**
 * insertionFor returns the place of a new note for a line of a Markdown text
 * ([R-EDIT-003](../../docs/requirements.md#r-edit-003)). On a line of a paragraph, the note is an inline note after
 * that line, so that it keeps its place in the text; after a heading and after an inline note, it is an inline note
 * too. On a line of another block, it is a block note after the block. The note gets the prefix of the block, so that
 * it stays in the block quote or the list item of the block. On a line outside every block, for example a blank line,
 * the note is a block note after the block before the line, or at the start of the text.
 * @param lines - The lines of the Markdown text.
 * @param line - The index of the line.
 */
export function insertionFor(lines: readonly string[], line: number): Insertion {
  const tokens = parse(lines);
  const containers: Token[] = [];
  let found: { token: Token; containers: Token[] } | undefined;
  let before: { token: Token; containers: Token[] } | undefined;
  for (const token of tokens) {
    if (token.type === 'blockquote_open' || token.type === 'list_item_open') {
      containers.push(token);
    } else if (token.type === 'blockquote_close' || token.type === 'list_item_close') {
      containers.pop();
    } else if (leafTypes.has(token.type) && token.map) {
      const [start, end] = token.map;
      if (start <= line && line < end) {
        found = { token, containers: [...containers] };
      } else if (end <= line) {
        before = { token, containers: [...containers] };
      }
    }
  }
  const block = found ?? before;
  if (!block) {
    return { line: 0, prefix: '', kind: 'block' };
  }
  const [start, end] = block.token.map!;
  const prefix = block.token.type === 'front_matter' ? '' : containerPrefix(lines[start], start, block.containers);
  if (found && block.token.type === 'paragraph_open') {
    return { line: line + 1, prefix, kind: 'inline' };
  }
  const inline = found !== undefined && (block.token.type === 'heading_open' || block.token.type === noteLinesTokenType);
  return { line: end, prefix, kind: inline ? 'inline' : 'block' };
}

/** TextBlock is a paragraph or a heading, with the start and the end of the text of each of its lines. */
interface TextBlock {
  /** first is the index of the first line of the text. */
  first: number;
  /** last is the index of the last line of the text. */
  last: number;
  /** end is the index of the line after the block. */
  end: number;
  /** prefix is the prefix of a note after the block. */
  prefix: string;
  /** starts holds the position of the first character of the text of each line, by the index of the line. */
  starts: Map<number, Position>;
  /** ends holds the position after the last character of the text of each line, by the index of the line. */
  ends: Map<number, Position>;
}

/**
 * textBlocksOf returns the paragraphs and the headings of a Markdown text, the blocks whose text holds the markers of
 * a selection.
 * @param lines - The lines of the Markdown text.
 * @param tokens - The tokens of the text.
 */
function textBlocksOf(lines: readonly string[], tokens: readonly Token[]): TextBlock[] {
  const blocks: TextBlock[] = [];
  const containers: Token[] = [];
  tokens.forEach((token, index) => {
    if (token.type === 'blockquote_open' || token.type === 'list_item_open') {
      containers.push(token);
    } else if (token.type === 'blockquote_close' || token.type === 'list_item_close') {
      containers.pop();
    } else if (inlineParents.has(token.type) && token.map && tokens[index + 1]?.type === 'inline') {
      const content = tokens[index + 1].content;
      const locator = new Locator(lines, token.map[0], content);
      const starts = new Map<number, Position>();
      const ends = new Map<number, Position>();
      let offset = 0;
      for (const text of content.split('\n')) {
        const start = locator.position(offset + text.length - text.trimStart().length);
        const end = locator.position(offset + text.trimEnd().length);
        if (start && end) {
          starts.set(start.line, start);
          ends.set(end.line, end);
        }
        offset += text.length + 1;
      }
      const found = [...starts.keys()];
      if (found.length > 0) {
        blocks.push({
          first: Math.min(...found),
          last: Math.max(...found),
          end: token.map[1],
          prefix: containerPrefix(lines[token.map[0]], token.map[0], containers),
          starts,
          ends,
        });
      }
    }
  });
  return blocks;
}

/** Range is a part of the lines of a text, from its start to its end. */
export interface Range {
  start: Position;
  end: Position;
}

/**
 * SelectionPlace is the place of a new note with a selection ([R-NOTE-006](../../docs/requirements.md#r-note-006)):
 * the markers in the text, and the line before which the note goes, after the block of the end of the selection.
 */
export interface SelectionPlace {
  /** markers are the markers to write, with their positions in the text before the change. */
  markers: { kind: MarkerKind; position: Position }[];
  /** line is the index of the line before which the note goes. */
  line: number;
  /** prefix is the prefix of each line of the note. */
  prefix: string;
}

/**
 * same tells whether two positions are the same.
 * @param a - The position.
 * @param b - The other position.
 */
const same = (a: Position, b: Position): boolean => a.line === b.line && a.character === b.character;

/**
 * selectionPlaceFor returns the place of a new note for a range of a Markdown text, when the range is in the text of
 * paragraphs or headings. An empty range gets a point at the end of the text of its line. A marker never starts a
 * line, because a comment at the start of a line starts an HTML block, which ends the paragraph in every Markdown
 * viewer: the opening marker goes to the end of the text of the line before, and at the start of the text of a block
 * it is left out, so that the selection starts at the start of its block.
 * @param lines - The lines of the Markdown text.
 * @param range - The range, for example the selection of the text editor.
 */
export function selectionPlaceFor(lines: readonly string[], range: Range): SelectionPlace | undefined {
  const blocks = textBlocksOf(lines, parse(lines));
  const blockAt = (line: number): TextBlock | undefined => blocks.find((block) => block.first <= line && line <= block.last);
  let { start, end } = range;
  const startBlock = blockAt(start.line);
  if (!startBlock) {
    return undefined;
  }
  if (same(start, end)) {
    return { markers: [{ kind: 'point', position: startBlock.ends.get(start.line)! }], line: startBlock.end, prefix: startBlock.prefix };
  }
  // A selection of whole lines ends at the start of the next line, which belongs to the line before.
  const endLineBlock = blockAt(end.line);
  if (end.line > start.line && (!endLineBlock || end.character <= endLineBlock.starts.get(end.line)!.character)) {
    const previous = end.line - 1;
    const block = blockAt(previous);
    if (!block) {
      return undefined;
    }
    end = block.ends.get(previous)!;
  }
  const endBlock = blockAt(end.line);
  if (!endBlock) {
    return undefined;
  }
  // The selection starts and ends in the text of its lines.
  const lineStart = startBlock.starts.get(start.line)!;
  if (start.character < lineStart.character) {
    start = lineStart;
  }
  if (start.character >= startBlock.ends.get(start.line)!.character && start.line < end.line) {
    start = (blockAt(start.line + 1) ?? startBlock).starts.get(start.line + 1) ?? start;
  }
  const lineEnd = endBlock.ends.get(end.line)!;
  if (end.character > lineEnd.character) {
    end = lineEnd;
  }
  if (!before(start, end) || same(start, end)) {
    return { markers: [{ kind: 'point', position: startBlock.ends.get(start.line)! }], line: startBlock.end, prefix: startBlock.prefix };
  }
  const markers: SelectionPlace['markers'] = [];
  const startOfLine = same(start, (blockAt(start.line) ?? startBlock).starts.get(start.line)!);
  const block = blockAt(start.line)!;
  if (!startOfLine) {
    markers.push({ kind: 'open', position: start });
  } else if (start.line > block.first) {
    markers.push({ kind: 'open', position: block.ends.get(start.line - 1)! });
  } else if (block !== endBlock) {
    // The selection starts at the start of a block before the block of its end: the opening marker goes to the end of
    // the text before, when it is the text of a paragraph or a heading.
    let previous = start.line - 1;
    while (previous >= 0 && lines[previous].trim() === '') {
      previous--;
    }
    const before = previous >= 0 ? blockAt(previous) : undefined;
    if (before) {
      markers.push({ kind: 'open', position: before.ends.get(previous)! });
    }
  }
  markers.push({ kind: 'close', position: end });
  return { markers, line: endBlock.end, prefix: endBlock.prefix };
}

/**
 * nextSelectionId returns a new ID of a selection: `a` and the smallest number that no marker and no note of the text
 * uses.
 * @param lines - The lines of the Markdown text.
 */
export function nextSelectionId(lines: readonly string[]): string {
  const used = new Set([...findMarkers(lines).map((marker) => marker.id), ...findNotes(lines).flatMap((note) => selectionOf(note) ?? [])]);
  let number = 1;
  while (used.has(`a${number}`)) {
    number++;
  }
  return `a${number}`;
}
