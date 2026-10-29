// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The text of the slash commands of the text editor
 * ([R-EDIT-008](../../docs/requirements.md#r-edit-008)): the typed command
 * before the cursor, the sentence before the command, which `/todo`
 * highlights, the date and the time that `/date` and `/time` insert, and the
 * reference and the definition of the standard footnote that `/footnote`
 * adds ([R-FOOT-003](../../docs/requirements.md#r-foot-003)). The module uses
 * no API of VS Code.
 */

import { blockAt } from './edits';
import { type Position, type Range, type Reading, read } from './notes';
import { usedLabels } from './syntax';

/** Typed is a slash command that the user types before the cursor. */
export interface Typed {
  /** slash is the column of the slash. */
  slash: number;
  /** start is the column where the command starts with the spaces before it, which a command that removes its text removes too. */
  start: number;
  /** word is the typed command after the slash, for example `to`. */
  word: string;
}

/**
 * typedAt returns the slash command before the cursor: a slash at the start of a line or after a space, and the small
 * letters after it.
 * @param line - The text of the line.
 * @param character - The column of the cursor.
 */
export function typedAt(line: string, character: number): Typed | undefined {
  const match = /(^|[ \t]+)\/([a-z]*)$/.exec(line.slice(0, character));
  if (!match) {
    return undefined;
  }
  const slash = character - match[2].length - 1;
  // The spaces at the start of a line indent it: they stay.
  return { slash, start: match.index === 0 ? slash : match.index, word: match[2] };
}

/** pad writes a number with two digits. */
const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * dateText returns the date that `/date` inserts, in the local time, for example `2026-10-29`.
 * @param now - The current time.
 */
export const dateText = (now: Date): string => `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

/**
 * timeText returns the date and the time in minutes that `/time` inserts, in the local time, for example
 * `2026-10-29 19:29`.
 * @param now - The current time.
 */
export const timeText = (now: Date): string => `${dateText(now)} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

/**
 * sentenceEnd matches the end of a sentence: `.`, `!` or `?`, with the quotes, brackets, emphasis and references of
 * footnotes after it, before a space or the end of the line.
 */
const sentenceEnd = /[.!?]+["'’”)\]*_]*(?:\[\^[^\]\s]+\])*(?=\s|$)/g;

/**
 * sentenceBefore returns the sentence before a position in a block of text, which `/todo` highlights: from the end of
 * the sentence before it in the same block, or from the start of the block, to the last character before the position
 * that is no space.
 * @param lines - The lines of the Markdown text.
 * @param position - The position, before the typed command and the spaces before it.
 * @param reading - The reading of the lines.
 */
export function sentenceBefore(lines: readonly string[], position: Position, reading: Reading = read(lines)): Range | undefined {
  const block = blockAt(reading.blocks, position);
  if (!block || !block.starts.has(position.line)) {
    return undefined;
  }
  /** segment returns the columns of the text of a line of the block before the position. */
  const segment = (line: number): { from: number; to: number } => ({
    from: block.starts.get(line)!.character,
    to: line === position.line ? Math.min(position.character, block.ends.get(line)!.character) : block.ends.get(line)!.character,
  });
  let end: Position | undefined;
  for (let line = position.line; line >= block.first; line--) {
    if (!block.starts.has(line)) {
      continue;
    }
    const { from, to } = segment(line);
    const text = lines[line].slice(from, Math.max(from, to));
    const trimmed = end === undefined ? text.trimEnd() : text;
    if (end === undefined) {
      if (trimmed.trim() === '') {
        continue;
      }
      end = { line, character: from + trimmed.length };
    }
    // The end of the sentence itself is no end of an earlier sentence.
    const previous = [...trimmed.matchAll(sentenceEnd)].filter((match) => line !== end!.line || match.index + match[0].length < trimmed.length).at(-1);
    if (previous) {
      const after = previous.index + previous[0].length;
      const rest = /\S/.exec(trimmed.slice(after));
      if (rest) {
        return { start: { line, character: from + after + rest.index }, end };
      }
      // The sentence starts on the next line of the block that holds text.
      for (let next = line + 1; next <= end.line; next++) {
        if (block.starts.has(next) && lines[next].slice(segment(next).from, segment(next).to).trim() !== '') {
          const { from: nextFrom } = segment(next);
          const space = /^\s*/.exec(lines[next].slice(nextFrom))![0].length;
          return { start: { line: next, character: nextFrom + space }, end };
        }
      }
      return undefined;
    }
  }
  if (end === undefined) {
    return undefined;
  }
  const first = block.starts.get(block.first)!;
  return { start: first, end };
}

/** standardDefinition matches the first line of the definition of a standard footnote, a footnote that is no note. */
const standardDefinition = /^\[\^(?!note-[a-z0-9]{4}\])([^\]\s]+)\]:/;

/**
 * nextFootnoteLabel returns the label of a new standard footnote ([R-FOOT-003](../../docs/requirements.md#r-foot-003)):
 * the next free number, one more than the highest label of the text that is a number, and never a label that the text
 * already uses.
 * @param lines - The lines of the Markdown text.
 */
export function nextFootnoteLabel(lines: readonly string[]): string {
  const used = usedLabels(lines);
  let number = Math.max(0, ...[...used].filter((label) => /^\d+$/.test(label)).map(Number)) + 1;
  while (used.has(String(number))) {
    number++;
  }
  return String(number);
}

/** Definition is the text of the definition of a new footnote and its place. */
export interface Definition {
  /** at is the position where the text goes, and text the text: the line breaks, the label, a colon and a space. */
  at: Position;
  text: string;
  /** cursor is the position after the space of the definition, where the user writes its text. */
  cursor: Position;
}

/**
 * footnoteDefinition returns the definition of a new standard footnote and its place
 * ([R-FOOT-003](../../docs/requirements.md#r-foot-003)): after the last definition of a standard footnote, or at the end
 * of the text, with a blank line before it.
 * @param lines - The lines of the Markdown text.
 * @param label - The label of the footnote.
 */
export function footnoteDefinition(lines: readonly string[], label: string): Definition {
  const start = `[^${label}]: `;
  let last = -1;
  for (let line = lines.length - 1; line >= 0 && last < 0; line--) {
    if (standardDefinition.test(lines[line])) {
      // The definition goes on with the indented lines after it, and with each line right after a line of it.
      last = line;
      for (let next = line + 1; next < lines.length; next++) {
        if (lines[next].trim() === '') {
          continue;
        }
        if (!/^(?: {4}|\t)/.test(lines[next]) && lines[next - 1].trim() === '') {
          break;
        }
        last = next;
      }
    }
  }
  if (last < 0) {
    last = lines.length - 1;
    while (last >= 0 && lines[last].trim() === '') {
      last--;
    }
  }
  if (last < 0) {
    return { at: { line: 0, character: 0 }, text: start, cursor: { line: 0, character: start.length } };
  }
  // The line after the place is blank or the end of the text: a line right after a definition goes on with it.
  return { at: { line: last, character: lines[last].length }, text: `\n\n${start}`, cursor: { line: last + 2, character: start.length } };
}
