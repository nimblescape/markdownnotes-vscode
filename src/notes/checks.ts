// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The checks of the notes of a Markdown text, which the text editor shows as
 * warnings ([R-TEXT-008](../../docs/requirements.md#r-text-008)). A note is a
 * footnote, and each check names a form that GitHub or another Markdown
 * viewer shows differently from the extension: a definition without blank
 * lines around it, lines of a note without the indentation of four spaces, a
 * second definition of a label, a reference without a note or a note without
 * a reference, a note in a block quote, a reference in the text of a link or
 * of a note, a reference in a heading, a note without a start marker or
 * without highlighted text, and a
 * start marker at the start of a line without `<wbr>` before it. The module
 * uses no API of VS Code.
 */

import { type Range, type Reading, same } from './notes';

/** Check is one finding of the checks: the part of the text, the message, and whether it is a warning or a hint. */
export interface Check {
  range: Range;
  message: string;
  severity: 'warning' | 'information';
}

/**
 * lineRange returns the range of the text of a line.
 * @param lines - The lines of the text.
 * @param line - The index of the line.
 * @param start - The column of the start.
 */
const lineRange = (lines: readonly string[], line: number, start = 0): Range => ({ start: { line, character: start }, end: { line, character: (lines[line] ?? '').length } });

/**
 * isBlank tells whether a line holds nothing but a prefix of block quotes and list items, and white space.
 * @param line - The line, or undefined after the last line.
 */
const isBlank = (line: string | undefined): boolean => line === undefined || /^[ \t>]*$/.test(line);

/**
 * checksOf returns the checks of the notes of a Markdown text.
 * @param lines - The lines of the text.
 * @param reading - The reading of the text.
 */
export function checksOf(lines: readonly string[], reading: Reading): Check[] {
  const checks: Check[] = [];
  const add = (range: Range, message: string, severity: Check['severity'] = 'warning'): void => {
    checks.push({ range, message, severity });
  };
  const labels = new Set(reading.notes.map((note) => note.label));
  for (const note of reading.notes) {
    const first = lineRange(lines, note.start.line, note.start.character);
    if (note.duplicate) {
      add(first, `Another note of the file has the label ${note.label}. Its references name the first one; give this note a label of its own.`);
      continue;
    }
    if (!note.reference) {
      add(first, `No reference [^${note.label}] names this note, so GitHub does not show it. Add the reference to the text, or delete the note.`);
    }
    if (note.prefix.includes('>')) {
      add(first, 'GitHub does not show a footnote in a block quote. Move the note after the block quote, at the start of the line.');
    }
    if (note.start.line > 0 && !isBlank(lines[note.start.line - 1])) {
      add(first, 'Put a blank line before the note, so that every Markdown viewer reads it as a footnote.');
    }
    if (!isBlank(lines[note.end.line + 1])) {
      add(lineRange(lines, note.end.line), 'Put a blank line after the note: a line of text directly after it belongs to the note.');
    }
    for (let line = note.start.line + 1; line <= note.end.line; line++) {
      const text = (lines[line] ?? '').slice(note.prefix.length);
      if (!isBlank(text) && !/^ {4}/.test(text)) {
        add(lineRange(lines, line), 'Indent each line of a note by four spaces. A line of text without them directly after the note still belongs to the note.', 'information');
      }
    }
    if (note.selection && same(note.selection.start, note.selection.end)) {
      add(note.reference!, 'The note highlights no text. Move its start marker to the start of the text that the note is about.');
    }
    if (note.reference && !note.marker) {
      add(note.reference, 'The note has no start marker. "Format Document" adds it at the start of the text of the block, where the highlight of the note starts then.');
    }
    if (note.reference && note.inLink) {
      add(note.reference, 'A reference in the text of a link breaks the link on GitHub. Move the reference after the link.');
    }
    if (note.reference && note.inHeading) {
      add(note.reference, 'A reference in a heading changes the anchor of the heading on GitHub, so links to the heading stop working.', 'information');
    }
  }
  for (const reference of reading.references) {
    if (!labels.has(reference.label)) {
      add(reference, `The file has no note ${reference.label}, so this reference shows as text. Add the note, or delete the reference.`);
    }
  }
  for (const range of reading.inNotes) {
    add(range, 'A note holds no note: this reference in the text of a note names no note. Put the reference in the text of the document.');
  }
  for (const position of reading.markersInHtml) {
    add(lineRange(lines, position.line, position.character), 'A start marker at the start of a line ends the paragraph. Put <wbr> before it; "Format Document" does it.');
  }
  return checks.sort((a, b) => a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character);
}
