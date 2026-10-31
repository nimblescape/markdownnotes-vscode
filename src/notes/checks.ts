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
 * without highlighted text, a
 * start marker at the start of a line without `<wbr>` before it, and an end
 * marker of the hidden form at the start of a line. A note in the other form
 * than its file gets a hint, because the formatter writes it in the form of the
 * file ([R-HIDE-003](../../docs/requirements.md#r-hide-003)). A listing
 * whose source file or snippet is not found gets a warning too
 * ([R-CODE-005](../../docs/requirements.md#r-code-005)), and so do the
 * standard footnotes: a reference without a definition, a definition without
 * a reference and a second definition of a label
 * ([R-FOOT-004](../../docs/requirements.md#r-foot-004)). The module uses no
 * API of VS Code.
 */

import { hiddenForm } from './edits';
import { footnoteProblemsOf } from './footnotes';
import { missingListings, type Source } from './listings';
import { isMissing, missingMessage, sourceFilesOf } from './repos';
import { firstLineOf, type Range, type Reading, same } from './notes';

/**
 * Check is one finding of the checks: the part of the text, the message, whether it is a warning or a hint, and the code
 * of a finding that has a quick fix.
 */
export interface Check {
  range: Range;
  message: string;
  severity: 'warning' | 'information';
  code?: (typeof footnoteCodes)[keyof typeof footnoteCodes];
}

/** footnoteCodes are the codes of the checks of the standard footnotes, which name their quick fixes. */
export const footnoteCodes = { undefined: 'footnote-undefined', unreferenced: 'footnote-unreferenced', duplicate: 'footnote-duplicate' } as const;

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
  const form = hiddenForm(lines, reading);
  const formText = (hidden: boolean): string => (hidden ? 'hidden' : 'visible');
  const otherForm = (hidden: boolean): string =>
    `in the ${formText(hidden)} form in a file whose notes ${hidden ? 'other viewers show' : 'are hidden from other viewers'}. "Format Document" writes it in the ${formText(!hidden)} form.`;
  for (const note of reading.notes) {
    const first = lineRange(lines, note.start.line, note.start.character);
    if (note.duplicate) {
      add(first, `Another note of the file has the label ${note.label}. Its references name the first one; give this note a label of its own.`);
      continue;
    }
    // One hint for each note: at its definition, or else at the end of its highlight.
    const ending = note.reference && lines[note.reference.start.line].startsWith('<!--', note.reference.start.character);
    if (form !== undefined && note.hidden !== form) {
      add(first, `The note is ${otherForm(note.hidden)}`, 'information');
    } else if (note.reference && form !== undefined && ending !== form) {
      add(note.reference, `The end of the highlight is ${otherForm(ending === true)}`, 'information');
    }
    if (!note.reference) {
      add(
        first,
        note.hidden
          ? `No end marker <!--${note.label}]--> ends the highlight of this note. Add it at the end of the text of the note, or delete the note.`
          : `No reference [^${note.label}] names this note, so GitHub does not show it. Add the reference to the text, or delete the note.`,
      );
    }
    if (note.prefix.includes('>') && !note.hidden) {
      add(first, 'GitHub does not show a footnote in a block quote. Move the note after the block quote, at the start of the line.');
    }
    if (note.start.line > 0 && !isBlank(lines[note.start.line - 1])) {
      add(first, note.hidden ? 'Put a blank line before the comment of the note, as the format of the notes asks.' : 'Put a blank line before the note, so that every Markdown viewer reads it as a footnote.');
    }
    if (!isBlank(lines[note.end.line + 1])) {
      add(
        lineRange(lines, note.end.line),
        note.hidden ? 'Put a blank line after the comment of the note, as the format of the notes asks.' : 'Put a blank line after the note: a line of text directly after it belongs to the note.',
      );
    }
    for (let line = firstLineOf(note) + 1; line <= note.end.line - (note.hidden ? 1 : 0); line++) {
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
  for (const position of reading.endMarkersInHtml) {
    add(lineRange(lines, position.line, position.character), 'An end marker at the start of a line ends the paragraph. Put it directly after the text before it; "Format Document" does it.');
  }
  return checks.sort((a, b) => a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character);
}

/**
 * footnoteChecksOf returns the checks of the standard footnotes of a Markdown text
 * ([R-FOOT-004](../../docs/requirements.md#r-foot-004)): a warning at each reference without a definition, at each
 * definition without a reference and at each second definition of a label. The first two have the quick fixes "Add
 * Definition" and "Delete Definition".
 * @param lines - The lines of the text.
 * @param reading - The reading of the text, with its blocks of text.
 */
export function footnoteChecksOf(lines: readonly string[], reading: Reading): Check[] {
  const problems = footnoteProblemsOf(lines, reading);
  const definitionRange = (line: number): Range => lineRange(lines, line, /^ */.exec(lines[line])![0].length);
  return [
    ...problems.undefinedReferences.map(
      ({ label, range }): Check => ({ range, message: `The file has no footnote [^${label}], so this reference shows as text. Add its definition, or delete the reference.`, severity: 'warning', code: footnoteCodes.undefined }),
    ),
    ...problems.unreferenced.map(
      ({ label, line }): Check => ({
        range: definitionRange(line),
        message: `No reference [^${label}] names this footnote, so GitHub and the preview do not show it. Add the reference to the text, or delete the definition.`,
        severity: 'warning',
        code: footnoteCodes.unreferenced,
      }),
    ),
    ...problems.duplicates.map(
      ({ label, line }): Check => ({
        range: definitionRange(line),
        message: `An earlier footnote of the file has the label ${label}, and the references [^${label}] name that one. Give this footnote a label of its own, or delete it.`,
        severity: 'warning',
        code: footnoteCodes.duplicate,
      }),
    ),
  ].sort((a, b) => a.range.start.line - b.range.start.line || a.range.start.character - b.range.start.character);
}

/**
 * listingChecksOf returns a warning at the comment of each listing of a Markdown text whose file or snippet the source
 * does not have, for example a listing that names a function, which is no snippet
 * ([R-CODE-005](../../docs/requirements.md#r-code-005)), or a listing of another repository whose reference or clone
 * is missing ([R-CODE-006](../../docs/requirements.md#r-code-006)). The formatter keeps the code of such a listing.
 * @param lines - The lines of the text.
 * @param source - Reads the files of the listings.
 */
export function listingChecksOf(lines: readonly string[], source: Source): Check[] {
  const texts = new Map<string, string | undefined>();
  const read: Source = (path) => {
    if (!texts.has(path)) {
      texts.set(path, source(path));
    }
    return texts.get(path);
  };
  const files = sourceFilesOf(lines, read);
  return missingListings(lines, read).map((listing) => {
    const file = files(listing.path);
    if (isMissing(file)) {
      return { range: lineRange(lines, listing.line), message: `The listing keeps its code. ${missingMessage(file)}`, severity: 'warning' };
    }
    let path = listing.path;
    try {
      path = decodeURIComponent(path);
    } catch {
      // The path keeps its escapes.
    }
    const message =
      read(file.path) === undefined
        ? `The source file ${path} of the listing was not found. The listing keeps its code.`
        : `The file ${path} has no snippet "${listing.snippet}". A listing shows a whole file or a snippet: mark the code in the source file with /snippet. The listing keeps its code.`;
    return { range: lineRange(lines, listing.line), message, severity: 'warning' };
  });
}
