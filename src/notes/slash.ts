// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The text of the slash commands of the text editor
 * ([R-EDIT-008](../../docs/requirements.md#r-edit-008)): the typed command
 * before the cursor, the sentence before the command, which `/todo`
 * highlights, and the date and the time that `/date` and `/time` insert.
 * `/footnote` opens the editor of a new standard footnote in the side view,
 * whose text is in [footnotes.ts](footnotes.ts). The module uses no API of
 * VS Code.
 */

import { blockAt } from './edits';
import { type Position, type Range, type Reading, read } from './notes';

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
