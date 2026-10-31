// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The text of a Markdown file without its notes, for a website, a PDF or another place where a text is published
 * ([R-HIDE-004](../../docs/requirements.md#r-hide-004)): without the definitions of the notes, each with the blank line
 * after it, without the start markers and the references or end markers, and without the comment of the format, in
 * both forms of the notes ([R-HIDE-001](../../docs/requirements.md#r-hide-001)). The standard footnotes, all other
 * comments and the rest of the text stay as they are. The command `markdownnotes strip`, the library of the npm package
 * and the commands "Copy without Notes" and "Save Copy without Notes" of the extension use it. The module uses no API
 * of VS Code.
 */

import { project } from './clean';
import { newerFormat } from './doctype';

/**
 * stripNotes returns the lines of a Markdown text without its notes, or undefined for a text whose comment of the
 * format names a higher major version, whose notes the code does not know how to find.
 * @param lines - The lines of the text, without their line breaks.
 */
export function stripNotes(lines: readonly string[]): string[] | undefined {
  if (newerFormat(lines) !== undefined) {
    return undefined;
  }
  return project(lines.join('\n'), { publish: true }).clean.split('\n');
}

/**
 * stripText returns a Markdown text without its notes, with the line breaks of the text and its byte order mark, or
 * undefined for a text whose comment of the format names a higher major version.
 * @param text - The text.
 */
export function stripText(text: string): string | undefined {
  const bom = text.startsWith('\uFEFF') ? '\uFEFF' : '';
  const body = text.slice(bom.length);
  const eol = /\r\n/.test(body) ? '\r\n' : '\n';
  const stripped = stripNotes(body.split(/\r\n|\r|\n/));
  return stripped && bom + stripped.join(eol);
}
