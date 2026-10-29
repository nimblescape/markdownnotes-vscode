// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The Markdown formatter in VS Code
 * ([R-FMT-001](../docs/requirements.md#r-fmt-001)): the provider of "Format
 * Document" for every Markdown file, as the manifest makes the extension the
 * default formatter of Markdown, and the format on save of a Markdown file
 * with notes (Hannes, 2026-10-29: "Only files with notes"). It gives one edit
 * of the lines that the formatter ([src/format/format.ts](format/format.ts))
 * changes, with the line breaks of the document.
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

/**
 * formatsOnSave tells whether the extension formats a document when it is saved: a Markdown document that the
 * extension formats on a save by its settings and its notes, on a save that is no automatic save after a delay, as
 * VS Code skips its format on save then. The extension leaves the save to VS Code when the user turned on
 * editor.formatOnSave for the document, so that the formatter runs once, and to the formatter that the user chose as
 * the default formatter of Markdown in place of this extension.
 * @param document - The document.
 * @param reason - The reason of the save.
 * @param extension - The identifier of this extension.
 * @param wanted - Tells whether the settings of the extension and the notes of a document ask for the format on save.
 */
export function formatsOnSave(document: vscode.TextDocument, reason: vscode.TextDocumentSaveReason, extension: string, wanted: (document: vscode.TextDocument) => boolean): boolean {
  if (document.languageId !== 'markdown' || reason === vscode.TextDocumentSaveReason.AfterDelay) {
    return false;
  }
  const editor = vscode.workspace.getConfiguration('editor', document);
  const formatter = editor.get<unknown>('defaultFormatter');
  if (editor.get<unknown>('formatOnSave') === true || (typeof formatter === 'string' && formatter !== extension)) {
    return false;
  }
  return wanted(document);
}

/**
 * registerFormatter registers the formatter of Markdown documents for "Format Document", and its format on save.
 * @param extension - The identifier of this extension, the default formatter of Markdown.
 * @param wanted - Tells whether the settings of the extension and the notes of a document ask for the format on save.
 */
export const registerFormatter = (extension: string, wanted: (document: vscode.TextDocument) => boolean): vscode.Disposable[] => [
  vscode.languages.registerDocumentFormattingEditProvider({ language: 'markdown' }, { provideDocumentFormattingEdits: formatEdits }),
  vscode.workspace.onWillSaveTextDocument((event) => {
    if (formatsOnSave(event.document, event.reason, extension, wanted)) {
      event.waitUntil(Promise.resolve(formatEdits(event.document)));
    }
  }),
];
