// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The quick fixes of the checks of the standard footnotes
 * ([R-FOOT-004](../docs/requirements.md#r-foot-004)) and the command "Renumber Footnotes"
 * ([R-FOOT-005](../docs/requirements.md#r-foot-005)). "Add Definition" at a reference without a definition opens the
 * editor of a new definition for its label in the side view; "Delete Definition" at a definition without a reference
 * removes it with the blank lines after it. "Renumber Footnotes" works on the active Markdown file of the side view, also
 * the file behind a clean editing view, in one edit that Undo takes back.
 */

import * as vscode from 'vscode';
import { footnoteCodes } from './notes/checks';
import { deleteFootnote } from './notes/footnotes';
import { diagnosticSource, linesOf, type NoteThreads } from './noteThreads';
import { viewCommands } from './notesView';

/** renumberCommand is the command "Renumber Footnotes". The command "Add Definition" belongs to the side view. */
export const renumberCommand = 'nimblescape.markdownNotes.renumberFootnotes';

/** referenceText matches the text of a reference of a footnote, with its label. */
const referenceText = /^\[\^([^\]\s]+)\]$/;

/** definitionHead matches the first line of a definition of a footnote, with its label. */
const definitionHead = /^ {0,3}\[\^([^\]\s]+)\]:/;

/**
 * FootnoteActions gives the warnings of the standard footnotes their quick fixes. The text editor of the file itself
 * and the Problems view show them; for a file in the clean editing view, only the Problems view
 * ([R-TEXT-009](../docs/requirements.md#r-text-009)).
 */
export class FootnoteActions implements vscode.CodeActionProvider {
  readonly kind = vscode.CodeActionKind.QuickFix;

  /**
   * constructor keeps the threads, which read the footnotes of a document.
   * @param threads - The threads of the notes.
   */
  constructor(private readonly threads: NoteThreads) {}

  /** register registers the quick fixes for Markdown files. */
  register(): vscode.Disposable {
    return vscode.languages.registerCodeActionsProvider('markdown', this, { providedCodeActionKinds: [this.kind] });
  }

  /**
   * provideCodeActions returns "Add Definition" for each warning of a reference without a definition, and "Delete
   * Definition" for each warning of a definition without a reference.
   * @param document - The document.
   * @param _range - The range of the request, which the warnings of the context cover.
   * @param context - The warnings at the range.
   */
  provideCodeActions(document: vscode.TextDocument, _range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];
    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== diagnosticSource) {
        continue;
      }
      if (diagnostic.code === footnoteCodes.undefined) {
        const label = referenceText.exec(document.getText(diagnostic.range))?.[1];
        if (label !== undefined) {
          const action = new vscode.CodeAction(`Add Definition of [^${label}]`, this.kind);
          action.command = { command: viewCommands.addDefinition, title: 'Add Definition', arguments: [document.uri, label] };
          action.diagnostics = [diagnostic];
          action.isPreferred = true;
          actions.push(action);
        }
      } else if (diagnostic.code === footnoteCodes.unreferenced) {
        const line = diagnostic.range.start.line;
        const label = definitionHead.exec(document.lineAt(line).text)?.[1];
        const footnote = this.threads.footnotesOf(document.uri).find((candidate) => candidate.label === label && candidate.definition.first === line);
        if (footnote) {
          const edit = new vscode.WorkspaceEdit();
          const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
          for (const change of deleteFootnote(linesOf(document), footnote)) {
            edit.replace(document.uri, new vscode.Range(change.start.line, change.start.character, change.end.line, change.end.character), change.text.replace(/\n/g, eol));
          }
          const action = new vscode.CodeAction(`Delete Definition of [^${footnote.label}]`, this.kind);
          action.edit = edit;
          action.diagnostics = [diagnostic];
          actions.push(action);
        }
      }
    }
    return actions;
  }
}

/**
 * registerRenumber registers the command "Renumber Footnotes".
 * @param threads - The threads of the notes, which write the change.
 * @param fileOf - Returns the URI of the active Markdown file, the file behind a clean editing view, or undefined.
 */
export function registerRenumber(threads: NoteThreads, fileOf: () => vscode.Uri | undefined): vscode.Disposable {
  return vscode.commands.registerCommand(renumberCommand, async () => {
    const file = fileOf();
    if (!file) {
      void vscode.window.showInformationMessage('Open a Markdown file first: the command renumbers the footnotes of the active Markdown file.');
      return;
    }
    const result = await threads.renumberFootnotes(file);
    if (result === undefined) {
      vscode.window.setStatusBarMessage('Renumbered the footnotes: 1, 2, 3 … in the order of their first reference.', 5000);
      return;
    }
    switch (result.problem) {
      case 'numbered':
        void vscode.window.showInformationMessage('The footnotes are numbered already: 1, 2, 3 … in the order of their first reference.');
        return;
      case 'undefined':
        void vscode.window.showWarningMessage(
          `The footnotes were not renumbered: the reference [^${result.label}] in line ${result.line + 1} has no definition, and a new label could name it. Add its definition or delete the reference first.`,
        );
        return;
      case 'duplicate':
        void vscode.window.showWarningMessage(
          `The footnotes were not renumbered: line ${result.line + 1} holds a second definition of [^${result.label}]. Give it a label of its own or delete it first.`,
        );
        return;
      case 'failed':
        void vscode.window.showWarningMessage('The footnotes were not renumbered: the file changed in the meantime. Try again.');
        return;
    }
  });
}
