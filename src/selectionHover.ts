// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The hover of the selected text in the text editor, which adds a note
 * ([R-EDIT-006](../docs/requirements.md#r-edit-006)). When the user selects
 * text of a Markdown file that a note can highlight, a hover over the
 * selection shows "Add Note" and an icon of each color of the notes (Hannes,
 * 2026-10-28: "selecting text shows a hover over the selected text with color
 * icons that allow to create the note"). A click on an icon opens the editor
 * of a new note in the side view, in this color
 * ([src/notesView.ts](notesView.ts)).
 *
 * The hover shows a short time after the user stopped selecting the text with
 * the mouse or the keys, at the cursor, which stands at an edge of the
 * selection, and also when the pointer rests on the selected text. It shows
 * only for one selection that starts and ends in one block of text, in a file
 * that the extension can change, and not after a command or an edit changed
 * the selection, so that "Select All" shows no hover. The hover takes no
 * focus, so the keys keep working in the text editor.
 *
 * The hover is Markdown of VS Code: VS Code keeps the color of an element
 * `span` only in the form `color:#rrggbb;`, and a class of a codicon, so each
 * icon is a codicon in the color of its note, in a link that runs the command
 * "Add Note" with the name of the color.
 */

import * as vscode from 'vscode';
import { colorNames, noteColors } from './notes/colors';
import { highlightFor } from './notes/edits';
import { isNoteDocument, linesOf, type NoteThreads } from './noteThreads';

/** showTime is the time in milliseconds after the last change of a selection before its hover shows. */
export const showTime = 600;

/**
 * hoverText returns the content of the hover: "Add Note" and an icon of each color of the notes, each one a link that
 * runs a command with the name of its color.
 * @param command - The command "Add Note".
 */
export function hoverText(command: string): vscode.MarkdownString {
  const icons = colorNames.map((name, index) => {
    const query = encodeURIComponent(JSON.stringify([name]));
    return `[<span style="color:${noteColors[index]};" class="codicon codicon-circle-large-filled"></span>](command:${command}?${query} "Add a note in ${name}")`;
  });
  const text = new vscode.MarkdownString(`Add Note&nbsp;&nbsp;${icons.join('&nbsp;')}`);
  text.supportHtml = true;
  text.isTrusted = { enabledCommands: [command] };
  return text;
}

/** SelectionHover gives the selected text of the text editors of Markdown files its hover. */
export class SelectionHover {
  /** timer shows the hover of the last selection after showTime. */
  private timer: ReturnType<typeof setTimeout> | undefined;

  /**
   * @param threads - The threads of the notes, which read each document once for each version.
   * @param command - The command "Add Note" of the side view, which takes the name of a color.
   */
  constructor(
    private readonly threads: NoteThreads,
    private readonly command: string,
  ) {}

  /** register registers the hover and the listener of the selections. */
  register(): vscode.Disposable[] {
    return [
      vscode.languages.registerHoverProvider('markdown', { provideHover: (document, position) => this.hoverAt(document, position) }),
      vscode.window.onDidChangeTextEditorSelection((event) => this.later(event)),
      { dispose: () => clearTimeout(this.timer) },
    ];
  }

  /**
   * offers tells whether the selection of a text editor gets the hover: one selection with text that a note can
   * highlight, in a file that the extension can change.
   * @param editor - The text editor.
   */
  private offers(editor: vscode.TextEditor): boolean {
    const { document, selection } = editor;
    if (selection.isEmpty || editor.selections.length > 1 || !isNoteDocument(document)) {
      return false;
    }
    return highlightFor(linesOf(document), selection, this.threads.textReadingOf(document)) !== undefined;
  }

  /**
   * hoverAt returns the hover of a position of a document: on the selected text of a visible text editor of the
   * document that gets the hover, or undefined.
   * @param document - The document.
   * @param position - The position of the pointer or the cursor.
   */
  private hoverAt(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    const editor = vscode.window.visibleTextEditors.find((candidate) => candidate.document === document && candidate.selection.contains(position));
    return editor && this.offers(editor) ? new vscode.Hover(hoverText(this.command), editor.selection) : undefined;
  }

  /**
   * later shows the hover of a selection that the user made with the mouse or the keys, when it is still the selection
   * after showTime.
   * @param event - The change of the selection.
   */
  private later(event: vscode.TextEditorSelectionChangeEvent): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    const { textEditor: editor, kind } = event;
    if ((kind !== vscode.TextEditorSelectionChangeKind.Mouse && kind !== vscode.TextEditorSelectionChangeKind.Keyboard) || editor.selection.isEmpty) {
      return;
    }
    const selection = editor.selection;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (vscode.window.activeTextEditor === editor && editor.selection.isEqual(selection) && this.offers(editor)) {
        void vscode.commands.executeCommand('editor.action.showHover', { focus: 'noAutoFocus' });
      }
    }, showTime);
  }
}
