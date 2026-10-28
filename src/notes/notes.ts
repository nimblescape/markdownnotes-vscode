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
  type NoteLinesMeta,
  noteLinesRule,
  noteLinesTokenType,
  noteTokenType,
  type NoteText,
  onlyComments,
  readNote,
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

/**
 * findNotes returns the notes of a Markdown text, with their places and their contents: each note of an HTML block
 * that holds only comments, each inline note `<!-- note inline` on lines of its own, and each note in the text of a
 * paragraph or a heading, where markdown-it reads the comment of the note as a comment of Markdown. Every other
 * comment is left out.
 * @param lines - The lines of the Markdown text.
 */
export function findNotes(lines: readonly string[]): Note[] {
  if (!lines.some((line) => /<!--[ \t]*note(?:[ \t]+inline)?[ \t]*$/i.test(line))) {
    return [];
  }
  const tokens = parse(lines);
  const position = positionOf(lines);
  const notes: Note[] = [];
  const containers: Token[] = [];
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
      const spans = onlyComments(token.content);
      if (!spans?.length) {
        return;
      }
      const locator = new Locator(lines, token.map[0], token.content);
      const prefix = containerPrefix(lines[token.map[0]], token.map[0], containers);
      for (const span of spans) {
        const note = noteAt(locator, token.content, span.start, span.end, 'block', prefix);
        if (note) {
          notes.push(note);
        }
      }
    } else if (token.type === 'inline' && token.map) {
      const parent = tokens[index - 1];
      if (!inlineParents.has(parent?.type) || !token.children?.some((child) => child.type === noteTokenType)) {
        return;
      }
      const first = token.map[0];
      const locator = new Locator(lines, first, token.content);
      const prefix = containerPrefix(lines[first], first, containers);
      for (const child of token.children ?? []) {
        if (child.type !== noteTokenType) {
          continue;
        }
        const { start, end } = child.meta as InlineNoteMeta;
        const note = noteAt(locator, token.content, start, end, 'inline', prefix);
        if (note) {
          notes.push(note);
        }
      }
    }
  });
  return notes;
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
