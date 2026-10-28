// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The Markdown formatter in VS Code
 * ([R-FMT-001](../docs/requirements.md#r-fmt-001)): the provider of "Format
 * Document" for Markdown files, which VS Code also runs when a Markdown file
 * is saved, because the manifest makes the extension the default formatter of
 * Markdown with format on save. It gives one edit of the lines that the
 * formatter ([src/format/format.ts](format/format.ts)) changes, with the line
 * breaks of the document.
 */

import * as vscode from 'vscode';
import { formatMarkdown } from './format/format';
import { editBetween } from './notes/edits';

/**
 * formatEdits returns the edits that format a Markdown document, or none when it is formatted.
 * @param document - The document.
 */
export function formatEdits(document: vscode.TextDocument): vscode.TextEdit[] {
  const lines = document.getText().split(/\r\n|\r|\n/);
  const formatted = formatMarkdown(lines);
  if (formatted.length === lines.length && formatted.every((line, index) => line === lines[index])) {
    return [];
  }
  const edit = editBetween(lines, formatted);
  const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
  return [vscode.TextEdit.replace(new vscode.Range(edit.start.line, edit.start.character, edit.end.line, edit.end.character), edit.text.replace(/\n/g, eol))];
}

/** registerFormatter registers the formatter of Markdown documents. */
export const registerFormatter = (): vscode.Disposable =>
  vscode.languages.registerDocumentFormattingEditProvider({ language: 'markdown' }, { provideDocumentFormattingEdits: formatEdits });
