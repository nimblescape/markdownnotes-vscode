// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The Markdown formatter in VS Code
 * ([R-FMT-001](../docs/requirements.md#r-fmt-001)): the provider of "Format
 * Document" for every Markdown file, as the manifest makes the extension the
 * default formatter of Markdown, and the format on save of a Markdown file
 * with notes (Hannes, 2026-10-29: "Only files with notes"). The save of a file
 * with notes also writes the comment of the format of the notes
 * ([R-NOTE-007](../docs/requirements.md#r-note-007)), which the extension no
 * longer writes when an editor only shows the file (Hannes, 2026-10-29, "D2:
 * ok"). It gives one edit of the lines that the formatter
 * ([src/format/format.ts](format/format.ts)) and the comment change, with the
 * line breaks of the document.
 */

import * as vscode from 'vscode';
import { formatMarkdown } from './format/format';
import { doctypeEdit, newerFormat } from './notes/doctype';
import { applyEdit, editBetween } from './notes/edits';

/** SaveChanges are the changes of a document before its save: its format, and the comment of the format of the notes. */
export interface SaveChanges {
  format: boolean;
  comment: boolean;
}

/**
 * editsBetween returns the edit of a document from its lines to other lines, or none when they are the same.
 * @param document - The document.
 * @param lines - The lines of the document.
 * @param changed - The changed lines.
 */
function editsBetween(document: vscode.TextDocument, lines: readonly string[], changed: readonly string[]): vscode.TextEdit[] {
  if (changed.length === lines.length && changed.every((line, index) => line === lines[index])) {
    return [];
  }
  const edit = editBetween(lines, changed);
  const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
  return [vscode.TextEdit.replace(new vscode.Range(edit.start.line, edit.start.character, edit.end.line, edit.end.character), edit.text.replace(/\n/g, eol))];
}

/**
 * saveEdits returns the edits of a Markdown document before its save, or none: the format, and the comment of the
 * format of the notes at the top of the file when it has none or one of an older text
 * ([R-NOTE-007](../docs/requirements.md#r-note-007)), in one edit. A document whose comment names a newer version of
 * the format gets no comment.
 * @param document - The document.
 * @param changes - The changes that the document gets.
 */
export function saveEdits(document: vscode.TextDocument, changes: SaveChanges): vscode.TextEdit[] {
  const lines = document.getText().split(/\r\n|\r|\n/);
  let changed = changes.format ? formatMarkdown(lines) : lines;
  const comment = changes.comment && newerFormat(changed) === undefined ? doctypeEdit(changed, true) : undefined;
  if (comment) {
    changed = applyEdit(changed, comment);
  }
  return editsBetween(document, lines, changed);
}

/**
 * formatEdits returns the edits that format a Markdown document, or none when it is formatted.
 * @param document - The document.
 */
export const formatEdits = (document: vscode.TextDocument): vscode.TextEdit[] => saveEdits(document, { format: true, comment: false });

/**
 * changesOnSave returns the changes of a document before its save: of a Markdown document, the changes that the
 * settings of the extension and the notes of the document ask for, on a save that is no automatic save after a delay,
 * as VS Code skips its format on save then. The extension leaves the format to VS Code when the user turned on
 * editor.formatOnSave for the document, so that the formatter runs once, and to the formatter that the user chose as
 * the default formatter of Markdown in place of this extension.
 * @param document - The document.
 * @param reason - The reason of the save.
 * @param extension - The identifier of this extension.
 * @param wanted - Returns the changes that the settings of the extension and the notes of a document ask for.
 */
export function changesOnSave(document: vscode.TextDocument, reason: vscode.TextDocumentSaveReason, extension: string, wanted: (document: vscode.TextDocument) => SaveChanges): SaveChanges {
  if (document.languageId !== 'markdown' || reason === vscode.TextDocumentSaveReason.AfterDelay) {
    return { format: false, comment: false };
  }
  const editor = vscode.workspace.getConfiguration('editor', document);
  const formatter = editor.get<unknown>('defaultFormatter');
  const byOther = editor.get<unknown>('formatOnSave') === true || (typeof formatter === 'string' && formatter !== extension);
  const changes = wanted(document);
  return { format: changes.format && !byOther, comment: changes.comment };
}

/**
 * registerFormatter registers the formatter of Markdown documents for "Format Document", and the changes of a
 * document before its save: its format, and the comment of the format of the notes.
 * @param extension - The identifier of this extension, the default formatter of Markdown.
 * @param wanted - Returns the changes that the settings of the extension and the notes of a document ask for.
 */
export const registerFormatter = (extension: string, wanted: (document: vscode.TextDocument) => SaveChanges): vscode.Disposable[] => [
  vscode.languages.registerDocumentFormattingEditProvider({ language: 'markdown' }, { provideDocumentFormattingEdits: formatEdits }),
  vscode.workspace.onWillSaveTextDocument((event) => {
    const changes = changesOnSave(event.document, event.reason, extension, wanted);
    if (changes.format || changes.comment) {
      event.waitUntil(Promise.resolve(saveEdits(event.document, changes)));
    }
  }),
];
