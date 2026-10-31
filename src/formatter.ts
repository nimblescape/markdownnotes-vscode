// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The Markdown formatter in VS Code
 * ([R-FMT-001](../docs/requirements.md#r-fmt-001)): the provider of "Format
 * Document" for every Markdown file, as the manifest makes the extension the
 * default formatter of Markdown, and the format on save of a Markdown file with
 * notes. The save of a file with notes also writes the comment of the format of
 * the notes ([R-NOTE-007](../docs/requirements.md#r-note-007)), which the
 * extension no longer writes when an editor only shows the file. It gives one
 * edit of the lines that the formatter
 * ([src/format/format.ts](format/format.ts)) and the comment change, with the
 * line breaks of the document.
 *
 * Other extensions add steps to the formatter through the API of the extension
 * ([R-GEN-012](../docs/requirements.md#r-gen-012)), for example nimblescape
 * Markdown Paper for its citations, so that one formatter formats the notes and
 * the parts of the other extension in one edit. A step runs after the steps of
 * the notes on the text of a file; in the clean editing view, it runs with the
 * save of the file. When a step changes the text, the steps of the notes and
 * the other steps run again, at most three times, so that one format is
 * enough.
 *
 * The formatter writes the current code of the source of each listing of a
 * file ([R-CODE-002](../docs/requirements.md#r-code-002)): it reads the file of
 * the source by its path relative to the Markdown file, from its open document
 * when it has one, so that unsaved changes of the source count, else from the
 * disk.
 */

import * as fs from 'node:fs';
import * as vscode from 'vscode';
import { cleanScheme } from './cleanView';
import { formatMarkdown } from './format/format';
import { doctypeEdit, newerFormat } from './notes/doctype';
import { applyEdit, editBetween, hiddenForm } from './notes/edits';
import type { Source } from './notes/listings';
import { isMissing, sourceFilesOf } from './notes/repos';

/** FormatStep is a step of the formatter that another extension adds, after the steps of the notes (R-GEN-012). */
export interface FormatStep {
  /**
   * applies tells whether the step formats a file. A Markdown file that a step formats gets the format on save, also
   * without notes.
   * @param lines - The lines of the file.
   * @param file - The URI of the file.
   */
  applies(lines: readonly string[], file: vscode.Uri): boolean;
  /**
   * format returns the formatted lines of a file.
   * @param lines - The lines of the file, formatted by the steps before.
   * @param file - The URI of the file.
   */
  format(lines: readonly string[], file: vscode.Uri): readonly string[];
}

/** FormatSteps are the steps of the formatter that other extensions add, in the order of their registration. */
export class FormatSteps {
  private readonly steps = new Set<FormatStep>();

  /**
   * register adds a step, until the disposal of the result.
   * @param step - The step.
   */
  register(step: FormatStep): vscode.Disposable {
    this.steps.add(step);
    return new vscode.Disposable(() => this.steps.delete(step));
  }

  /**
   * appliesTo tells whether a step formats a document: a file, not a document of the clean editing view, whose text
   * has no hidden parts of the file. A step that fails formats nothing.
   * @param document - The document.
   */
  appliesTo(document: vscode.TextDocument): boolean {
    const lines = document.getText().split(/\r\n|\r|\n/);
    return document.uri.scheme !== cleanScheme && [...this.steps].some((step) => applies(step, lines, document.uri));
  }

  /**
   * run returns the lines of a document after the steps that format it. A step that fails, or that returns no lines,
   * leaves the lines as they are.
   * @param document - The document.
   * @param lines - The lines, formatted by the steps of the notes.
   */
  run(document: vscode.TextDocument, lines: string[]): string[] {
    if (document.uri.scheme === cleanScheme) {
      return lines;
    }
    let changed = lines;
    for (const step of this.steps) {
      if (applies(step, changed, document.uri)) {
        try {
          const formatted = step.format(changed, document.uri);
          if (Array.isArray(formatted) && formatted.every((line) => typeof line === 'string')) {
            changed = [...formatted];
          }
        } catch {
          // The step of the other extension failed: the lines stay as they are.
        }
      }
    }
    return changed;
  }
}

/**
 * applies tells whether a step formats the lines of a file; a step that fails does not.
 * @param step - The step.
 * @param lines - The lines of the file.
 * @param file - The URI of the file.
 */
function applies(step: FormatStep, lines: readonly string[], file: vscode.Uri): boolean {
  try {
    return step.applies(lines, file) === true;
  } catch {
    return false;
  }
}

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
 * sourceOf returns the reader of the files of the listings of a Markdown file
 * ([R-CODE-002](../docs/requirements.md#r-code-002)): a path relative to the folder of the file, with `%` escapes, from
 * the open document of the file, else from the disk. A document that is no file reads no source, and its listings keep
 * their code.
 * @param file - The URI of the Markdown file.
 */
export function sourceOf(file: vscode.Uri): Source | undefined {
  if (file.scheme !== 'file') {
    return undefined;
  }
  const folder = vscode.Uri.joinPath(file, '..');
  return (relative) => {
    try {
      const path = vscode.Uri.joinPath(folder, decodeURIComponent(relative));
      const open = vscode.workspace.textDocuments.find((other) => other.uri.toString() === path.toString());
      return open ? open.getText() : fs.readFileSync(path.fsPath, 'utf8');
    } catch {
      return undefined;
    }
  };
}

/**
 * listingFilesOf returns the reader of the files of the listings of a Markdown file: the URI of the file and its path
 * relative to the Markdown file, which `sourceOf` reads; the file of a path in the repository of the paper, or the
 * file in the clone of a reference of the front matter for a path of another repository
 * ([R-CODE-006](../docs/requirements.md#r-code-006)). It returns undefined for a missing reference or clone.
 * @param file - The URI of the Markdown file.
 * @param lines - The lines of the Markdown file.
 */
export function listingFilesOf(file: vscode.Uri, lines: readonly string[]): (path: string) => { uri: vscode.Uri; path: string } | undefined {
  const source = sourceOf(file);
  const files = source && sourceFilesOf(lines, source);
  return (path) => {
    const found = files?.(path);
    if (found && isMissing(found)) {
      return undefined;
    }
    const relative = found ? found.path : path;
    try {
      return { uri: vscode.Uri.joinPath(file, '..', decodeURIComponent(relative)), path: relative };
    } catch {
      return undefined;
    }
  };
}

/**
 * saveEdits returns the edits of a Markdown document before its save, or none: the format, and the comment of the
 * format of the notes at the top of the file when it has none or one of an older text
 * ([R-NOTE-007](../docs/requirements.md#r-note-007)), in one edit. A document whose comment names a newer version of
 * the format gets no comment.
 * @param document - The document.
 * @param changes - The changes that the document gets.
 * @param steps - The steps of the formatter of other extensions, which run after the steps of the notes.
 */
export function saveEdits(document: vscode.TextDocument, changes: SaveChanges, steps?: FormatSteps): vscode.TextEdit[] {
  const lines = document.getText().split(/\r\n|\r|\n/);
  const options = { source: sourceOf(document.uri) };
  let changed = changes.format ? formatMarkdown(lines, options) : lines;
  // A step of another extension can write what the steps of the notes read, such as the markers of a generated list,
  // whose captions then get their anchors (R-GEN-016); the steps run again while they change the text, at most three
  // times, so that one format gives the text that the next format keeps.
  for (let round = 0; changes.format && steps && round < 3; round++) {
    const stepped = steps.run(document, changed);
    if (stepped.join('\n') === changed.join('\n')) {
      break;
    }
    changed = formatMarkdown(stepped, options);
    if (changed.join('\n') === stepped.join('\n')) {
      break;
    }
  }
  const comment = changes.comment && newerFormat(changed) === undefined ? doctypeEdit(changed, true, hiddenForm(changed) === true) : undefined;
  if (comment) {
    changed = applyEdit(changed, comment);
  }
  return editsBetween(document, lines, changed);
}

/**
 * formatEdits returns the edits that format a Markdown document, or none when it is formatted.
 * @param document - The document.
 * @param steps - The steps of the formatter of other extensions.
 */
export const formatEdits = (document: vscode.TextDocument, steps?: FormatSteps): vscode.TextEdit[] => saveEdits(document, { format: true, comment: false }, steps);

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
 * @param steps - The steps of the formatter of other extensions.
 */
export const registerFormatter = (extension: string, wanted: (document: vscode.TextDocument) => SaveChanges, steps?: FormatSteps): vscode.Disposable[] => [
  vscode.languages.registerDocumentFormattingEditProvider({ language: 'markdown' }, { provideDocumentFormattingEdits: (document) => formatEdits(document, steps) }),
  vscode.workspace.onWillSaveTextDocument((event) => {
    const changes = changesOnSave(event.document, event.reason, extension, wanted);
    if (changes.format || changes.comment) {
      event.waitUntil(Promise.resolve(saveEdits(event.document, changes, steps)));
    }
  }),
];
