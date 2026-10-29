// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The light bulb action "Add Note" of the selected text in the text editor
 * ([R-EDIT-006](../docs/requirements.md#r-edit-006)). VS Code shows a light
 * bulb at the selected text when a Code Action is available for it; a click on
 * the light bulb, or Ctrl+. (Cmd+. on a Mac), lists "Add Note", which opens the
 * editor of a new note in the side view for the selected text
 * ([src/notesView.ts](notesView.ts)). The action replaces the hover over the
 * selected text, which showed by itself over each selection (Hannes,
 * 2026-10-29, decision D4 of the code review: "go with your proposal"). As
 * every way to add a note, it needs selected text (Hannes, 2026-10-28: "there
 * shall be no way to add a note without highlighting text"): VS Code offers it
 * only for one selection with text that a note can highlight, in a Markdown
 * file that the extension can change.
 */

import * as vscode from 'vscode';
import { highlightFor } from './notes/edits';
import { isNoteDocument, linesOf, type NoteThreads } from './noteThreads';

/** addNoteTitle is the title of the action in the list of the light bulb. */
export const addNoteTitle = 'Add Note';

/**
 * addNoteKindPart is the part of the kind of the action after `quickfix`. The light bulb and Ctrl+. list every kind
 * but the source actions, in groups by kind; the quick fixes come first, before "Rewrite", "Surround With" and "More
 * Actions...", which VS Code also offers for selected text in Markdown files. As a quick fix, "Add Note" stands at the
 * top of the list (measured in VS Code 1.144).
 */
export const addNoteKindPart = 'markdownNotes.addNote';

/** AddNoteAction gives the selected text of the text editors of Markdown files the Code Action "Add Note". */
export class AddNoteAction implements vscode.CodeActionProvider {
  /** kind is the kind of the action. */
  private readonly kind = vscode.CodeActionKind.QuickFix.append(addNoteKindPart);

  /**
   * @param threads - The threads of the notes, which read each document once for each version.
   * @param command - The command "Add Note" of the side view.
   */
  constructor(
    private readonly threads: NoteThreads,
    private readonly command: string,
  ) {}

  /** register registers the action for the Markdown files. */
  register(): vscode.Disposable {
    return vscode.languages.registerCodeActionsProvider('markdown', this, { providedCodeActionKinds: [this.kind] });
  }

  /**
   * provideCodeActions returns "Add Note" for the selection of a text editor: one selection with text that a note can
   * highlight, in a file that the extension can change. VS Code asks with the selection of the text editor, for the light
   * bulb after each change of the selection, and for Ctrl+.; a range that is no selection gets nothing, because "Add
   * Note" adds the note to the selection.
   * @param document - The document.
   * @param range - The selection, or another range.
   * @param context - The context, with the kinds that VS Code asks for.
   */
  provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext): vscode.CodeAction[] {
    if (range.isEmpty || (context.only !== undefined && !context.only.contains(this.kind)) || !isNoteDocument(document)) {
      return [];
    }
    const editor = vscode.window.visibleTextEditors.find((candidate) => candidate.document === document && candidate.selection.isEqual(range));
    if (editor === undefined || editor.selections.length > 1 || highlightFor(linesOf(document), range, this.threads.textReadingOf(document)) === undefined) {
      return [];
    }
    const action = new vscode.CodeAction(addNoteTitle, this.kind);
    action.command = { command: this.command, title: addNoteTitle };
    return [action];
  }
}
