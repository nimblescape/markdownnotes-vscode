// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The cursor at the hidden markers of the selections and at the header lines
 * of the answers in the text editor
 * ([R-NOTE-006](../../docs/requirements.md#r-note-006),
 * [R-TEXT-007](../../docs/requirements.md#r-text-007)). The start marker and
 * the reference of a selection stay hidden, and each header line shows
 * rendered, also on the line of the cursor (Hannes, 2026-10-28: a click on a
 * selection shall not expand it, and the markers and the headers are not for
 * editing). So the cursor steps over a hidden marker as over one place, it
 * does not stay on a header line, and Backspace and Delete next to a marker
 * delete the character on the other side of it, and next to a header line
 * nothing: no key changes a marker or a header. The module uses no API of
 * VS Code.
 */

import type { Marker, Position } from './notes';

/** Span is the place of a hidden marker in its line: a marker never spans two lines. */
export interface Span {
  /** line is the index of the line. */
  line: number;
  /** start is the column of the first character of the marker. */
  start: number;
  /** end is the column after the last character of the marker. */
  end: number;
}

/** Side is the side of the cursor on which a key deletes: left for Backspace, right for Delete. */
export type Side = 'left' | 'right';

/** Deletion is the part of a text that a key deletes, from its start to its end; an empty part deletes nothing. */
export interface Deletion {
  start: Position;
  end: Position;
}

/**
 * spansOf returns the places of markers in their lines.
 * @param markers - The markers.
 */
export const spansOf = (markers: readonly Marker[]): Span[] => markers.map((marker) => ({ line: marker.start.line, start: marker.start.character, end: marker.end.character }));

/**
 * across returns the column on the other side of the markers that follow each other directly from a column of a line
 * to one side, or the column itself without a marker there.
 * @param spans - The places of the markers.
 * @param line - The index of the line.
 * @param column - The column.
 * @param side - The side.
 */
export function across(spans: readonly Span[], line: number, column: number, side: Side): number {
  let place = column;
  for (;;) {
    const next = spans.find((span) => span.line === line && (side === 'left' ? span.end === place && span.start < place : span.start === place && span.end > place));
    if (!next) {
      return place;
    }
    place = side === 'left' ? next.start : next.end;
  }
}

/**
 * outside returns the place of the cursor outside the hidden markers. A place inside a marker goes to the edge of the
 * marker in the direction of the move from the previous place on the same line, and past the markers that follow
 * directly; after a click or a move from another line it goes to the nearer edge.
 * @param spans - The places of the markers.
 * @param position - The place of the cursor.
 * @param previous - The place of the cursor before, if known.
 */
export function outside(spans: readonly Span[], position: Position, previous?: Position): Position {
  const inside = spans.find((span) => span.line === position.line && span.start < position.character && position.character < span.end);
  if (!inside) {
    return position;
  }
  const sameLine = previous?.line === position.line;
  const forward = sameLine && previous.character <= inside.start;
  const backward = sameLine && previous.character >= inside.end;
  const right = forward || (!backward && position.character - inside.start >= inside.end - position.character);
  const side: Side = right ? 'right' : 'left';
  return { line: position.line, character: across(spans, position.line, right ? inside.start : inside.end, side) };
}

/** wordBefore and wordAfter find the word or the run of other signs next to a column, with the spaces between. */
const wordBefore = /(?:[\p{L}\p{N}_]+|[^\p{L}\p{N}_\s]+)?\s*$/u;
const wordAfter = /^\s*(?:[\p{L}\p{N}_]+|[^\p{L}\p{N}_\s]+)?/u;

/**
 * offLines returns the place of the cursor outside the lines where it does not stay: the header lines, and the lines
 * of the collapsed notes, which VS Code would open for the cursor. A place on such a line goes to the next free line in
 * the direction of the move from the previous place, at its start below and at its end above; after a click or a move
 * on the same line it goes below, or above at the end of the text.
 * @param blocked - The indexes of the lines where the cursor does not stay.
 * @param lines - The lines of the text.
 * @param position - The place of the cursor.
 * @param previous - The place of the cursor before, if known.
 */
export function offLines(blocked: ReadonlySet<number>, lines: readonly string[], position: Position, previous?: Position): Position {
  if (!blocked.has(position.line)) {
    return position;
  }
  const free = (step: 1 | -1): number | undefined => {
    let line = position.line + step;
    while (line >= 0 && line < lines.length && blocked.has(line)) {
      line += step;
    }
    return line >= 0 && line < lines.length ? line : undefined;
  };
  const up = previous !== undefined && previous.line > position.line;
  const below = free(1);
  const above = free(-1);
  if (!up && below !== undefined) {
    return { line: below, character: 0 };
  }
  if (above !== undefined) {
    return { line: above, character: lines[above].length };
  }
  return below === undefined ? position : { line: below, character: 0 };
}

/**
 * isSurrogatePair tells whether two code units of a text form one character.
 * @param text - The text.
 * @param index - The index of the first code unit.
 */
const isSurrogatePair = (text: string, index: number): boolean => /[\uD800-\uDBFF]/.test(text.charAt(index)) && /[\uDC00-\uDFFF]/.test(text.charAt(index + 1));

/**
 * locksLine tells whether a key that deletes to one side of the cursor would join its line with a header line: the
 * cursor is at the start of the line after a header line, or at the end of the line before one.
 * @param headers - The indexes of the header lines.
 * @param lines - The lines of the text.
 * @param cursor - The place of the cursor.
 * @param side - The side of the cursor on which the key deletes.
 */
export const locksLine = (headers: ReadonlySet<number>, lines: readonly string[], cursor: Position, side: Side): boolean =>
  side === 'left' ? cursor.character === 0 && headers.has(cursor.line - 1) : cursor.character >= (lines[cursor.line] ?? '').length && headers.has(cursor.line + 1);

/**
 * deletion returns the part of a text that Backspace or Delete deletes, or one of the keys that delete a word, when a
 * hidden marker is next to the cursor on that side: the character or the word on the other side of the markers, or the
 * line break there, and never a part of another marker or of a header line. It returns an empty part for a key that
 * would join a line with a header line, and undefined without a marker or a header line next to the cursor, so that
 * the key does what it always does.
 * @param lines - The lines of the text.
 * @param spans - The places of the markers.
 * @param cursor - The place of the cursor.
 * @param side - The side of the cursor on which the key deletes.
 * @param word - Whether the key deletes a word.
 * @param headers - The indexes of the header lines.
 */
export function deletion(lines: readonly string[], spans: readonly Span[], cursor: Position, side: Side, word: boolean, headers: ReadonlySet<number> = new Set()): Deletion | undefined {
  const { line } = cursor;
  const at = (character: number): Position => ({ line, character });
  if (locksLine(headers, lines, cursor, side)) {
    return { start: cursor, end: cursor };
  }
  const place = across(spans, line, cursor.character, side);
  if (place === cursor.character) {
    return undefined;
  }
  const text = lines[line] ?? '';
  if (side === 'left') {
    if (place === 0) {
      return line > 0 && !headers.has(line - 1) ? { start: { line: line - 1, character: lines[line - 1].length }, end: at(0) } : { start: at(0), end: at(0) };
    }
    let start = word ? (wordBefore.exec(text.slice(0, place))?.index ?? place - 1) : place - (place >= 2 && isSurrogatePair(text, place - 2) ? 2 : 1);
    for (const span of spans) {
      if (span.line === line && span.end > start && span.end <= place) {
        start = Math.max(start, span.end);
      }
    }
    return { start: at(start), end: at(place) };
  }
  if (place >= text.length) {
    return line + 1 < lines.length && !headers.has(line + 1) ? { start: at(text.length), end: { line: line + 1, character: 0 } } : { start: at(place), end: at(place) };
  }
  let end = word ? place + (wordAfter.exec(text.slice(place))?.[0].length ?? 1) : place + (isSurrogatePair(text, place) ? 2 : 1);
  for (const span of spans) {
    if (span.line === line && span.start >= place && span.start < end) {
      end = Math.min(end, span.start);
    }
  }
  return { start: at(place), end: at(end) };
}
