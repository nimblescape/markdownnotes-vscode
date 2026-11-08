// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The generated parts of a Markdown file: the parts that the formatter writes from what they come from
 * ([R-GEN-016](../../docs/requirements.md#r-gen-016)). The clean editing view keeps them read-only, as the editor of a
 * whole file does ([R-TEXT-009](../../docs/requirements.md#r-text-009),
 * [decision 74](../../docs/requirements.md#decisions)): the number of each caption, the text of each reference to a
 * figure, a table, a listing or a section, the code block of each listing, and each value of the front matter in the
 * text whose key the front matter has. Other extensions add their parts through the API
 * ([R-GEN-012](../../docs/requirements.md#r-gen-012)), for example the citations, the reference list and the generated
 * lists of nimblescape Markdown Paper. The user changes a part through what it comes from, and the save writes it
 * again. The module uses no API of VS Code.
 */

import type { Block, Marker } from './clean';
import { findFields, hasField, readFields } from './fields';
import { numberPlaces } from './figures';
import { findListings } from './listings';

/**
 * GeneratedPart is a generated part of a file: a part of a line, by the index of the line and its start and end in the
 * line, or a block of whole lines, from its first to its last line.
 */
export type GeneratedPart = Marker | Block;

/** GeneratedFinder returns the generated parts of the lines of a file that another extension writes. */
export type GeneratedFinder = (lines: readonly string[]) => readonly GeneratedPart[];

/**
 * findGenerated returns the generated parts of the lines of a file that the formatter of the notes writes: the number
 * of each caption, the text of each reference between its square brackets, the code block of each listing from its
 * opening to its closing fence, and each value of the front matter between its markers whose key the front matter has.
 * @param lines - The lines of the file.
 */
export function findGenerated(lines: readonly string[]): GeneratedPart[] {
  const parts: GeneratedPart[] = [...numberPlaces(lines)];
  for (const listing of findListings(lines)) {
    parts.push({ first: listing.open, last: listing.close });
  }
  if (lines.some(hasField)) {
    const values = readFields(lines);
    for (const field of findFields(lines)) {
      if (values.has(field.key) && field.valueEnd > field.valueStart) {
        parts.push({ line: field.line, start: field.valueStart, end: field.valueEnd });
      }
    }
  }
  return parts;
}

/** Change is the change of a text: the range in the old text and the new text of it. */
interface Change {
  start: number;
  end: number;
  text: string;
}

/**
 * changesOf returns the smallest changes that turn one text into another: the one with the longest same start, and the
 * one with the longest same end. Text typed next to the same text, such as `[` before `[`, can stand at more than one
 * place; the two changes are the first and the last of these places.
 * @param from - The old text.
 * @param to - The new text.
 */
function changesOf(from: string, to: string): Change[] {
  const most = Math.min(from.length, to.length);
  const sameStart = (limit: number): number => {
    let length = 0;
    while (length < limit && from[length] === to[length]) {
      length++;
    }
    return length;
  };
  const sameEnd = (limit: number): number => {
    let length = 0;
    while (length < limit && from[from.length - 1 - length] === to[to.length - 1 - length]) {
      length++;
    }
    return length;
  };
  const change = (start: number, end: number): Change => ({ start, end: from.length - end, text: to.slice(start, to.length - end) });
  const startFirst = sameStart(most);
  const endFirst = sameEnd(most);
  return [change(startFirst, sameEnd(most - startFirst)), change(sameStart(most - endFirst), endFirst)];
}

/** Range is a generated part as a range of the text: from its start to its end, and whether it is a block of whole lines. */
interface Range {
  from: number;
  to: number;
  lines: boolean;
}

/**
 * keepsRange tells whether a change keeps a generated part as it is. Text typed into the part, and a change of a piece
 * of it, change it; a change that takes the whole part removes it, a part of a line only with text around it, so that
 * typing over the part alone changes it. Text typed at the edge of a part of a line becomes a piece of it, such as a
 * digit after the number of a caption; a change of the text next to it keeps it. A block of whole lines keeps text
 * typed at its edges outside, and keeps its lines: text before it ends with a line break, and text after it starts
 * with one.
 * @param change - The change.
 * @param range - The part.
 * @param text - The old text.
 */
function keepsRange(change: Change, range: Range, text: string): boolean {
  const { start, end } = change;
  if (end < range.from || start > range.to) {
    return true;
  }
  if (start < range.to && end > range.from) {
    return start <= range.from && end >= range.to && (start < range.from || end > range.to || range.lines);
  }
  if (!range.lines) {
    return start < end;
  }
  // At the edge of a block of whole lines: the block keeps its first and its last line.
  const before = text.slice(0, start) + change.text;
  const after = change.text + text.slice(end);
  return (end !== range.from || before === '' || before.endsWith('\n')) && (start !== range.to || after === '' || /^[\r\n]/.test(after));
}

/**
 * keepsGenerated tells whether an edit of a file keeps each generated part of the file as it is
 * ([R-TEXT-009](../../docs/requirements.md#r-text-009)): text typed into a part or at the edge of a part of a line, or
 * a change of a piece of a part, does not; a change that takes a whole part with text around it, such as the deletion
 * of a caption or of a reference, does. Text typed before a block of whole lines, such as the code block of a listing,
 * ends with a line break, and text typed after it starts with one. Of the places where typed text can stand, such as
 * `[` before `[`, one that keeps the parts counts.
 * @param before - The text of the file before the edit.
 * @param after - The text of the file after the edit.
 * @param parts - The generated parts of the file before the edit.
 */
export function keepsGenerated(before: string, after: string, parts: readonly GeneratedPart[]): boolean {
  if (parts.length === 0 || before === after) {
    return true;
  }
  const lines = before.split('\n');
  const starts = [0];
  for (const line of lines) {
    starts.push(starts[starts.length - 1] + line.length + 1);
  }
  const ranges = parts.flatMap((part): Range[] => {
    if ('first' in part) {
      return part.first >= 0 && part.first <= part.last && part.last < lines.length ? [{ from: starts[part.first], to: starts[part.last] + lines[part.last].replace(/\r$/, '').length, lines: true }] : [];
    }
    return part.line >= 0 && part.line < lines.length && part.start >= 0 && part.start < part.end && part.end <= lines[part.line].length
      ? [{ from: starts[part.line] + part.start, to: starts[part.line] + part.end, lines: false }]
      : [];
  });
  return changesOf(before, after).some((change) => ranges.every((range) => keepsRange(change, range, before)));
}
