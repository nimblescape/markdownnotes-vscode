// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The smooth scroll of a text editor to a note that the side view selects
 * ([R-SIDE-007](../docs/requirements.md#r-side-007)). With
 * `editor.smoothScrolling`, VS Code scrolls a text editor in 125 milliseconds,
 * and over a long way it jumps over most of the text, while the Markdown
 * preview scrolls smoothly over the whole way. The extension therefore scrolls
 * a text editor itself, in small steps that start and end slowly, as the
 * preview does.
 */

import * as vscode from 'vscode';

/** scrollTime is the time of a scroll in milliseconds, about the time in which the preview scrolls to a note. */
export const scrollTime = 450;
/** stepTime is the time between two steps of a scroll in milliseconds, about one frame of the screen. */
const stepTime = 16;

/** scrolls holds the number of the last scroll of each text editor, so that a new scroll stops an older one. */
const scrolls = new WeakMap<vscode.TextEditor, number>();
/** count counts the scrolls, so that each one has a number of its own. */
let count = 0;

/**
 * ease returns the part of the way at a part of the time: the scroll starts slowly, is fast in the middle and ends
 * slowly.
 * @param time - The part of the time, from 0 to 1.
 */
const ease = (time: number): number => (time < 0.5 ? 4 * time ** 3 : 1 - (-2 * time + 2) ** 3 / 2);

/**
 * scrollTo scrolls a text editor smoothly to a place, so that the place shows in the middle of the editor. Each step
 * goes to a place in the text between the middle of the visible text and the place, by the characters, so that the
 * steps also move through the rows of a long wrapped line. Without `editor.smoothScrolling`, it scrolls at once. A
 * click or a key in the text editor stops the scroll, and so does a new scroll of the same editor.
 * @param editor - The text editor.
 * @param place - The place.
 */
export async function scrollTo(editor: vscode.TextEditor, place: vscode.Position): Promise<void> {
  const { document } = editor;
  const run = ++count;
  scrolls.set(editor, run);
  const reveal = (offset: number) => {
    const at = document.positionAt(offset);
    editor.revealRange(new vscode.Range(at, at), vscode.TextEditorRevealType.InCenter);
  };
  const target = document.offsetAt(place);
  const visible = editor.visibleRanges;
  if (vscode.workspace.getConfiguration('editor', document).get<boolean>('smoothScrolling') === false || visible.length === 0) {
    reveal(target);
    return;
  }
  const from = Math.round((document.offsetAt(visible[0].start) + document.offsetAt(visible[visible.length - 1].end)) / 2);
  const stop = vscode.window.onDidChangeTextEditorSelection((event) => {
    if (event.textEditor === editor && (event.kind === vscode.TextEditorSelectionChangeKind.Mouse || event.kind === vscode.TextEditorSelectionChangeKind.Keyboard)) {
      scrolls.delete(editor);
    }
  });
  try {
    const steps = Math.round(scrollTime / stepTime);
    for (let step = 1; step <= steps; step++) {
      await new Promise((resolve) => setTimeout(resolve, stepTime));
      if (scrolls.get(editor) !== run || document.isClosed) {
        return;
      }
      reveal(Math.round(from + (target - from) * ease(step / steps)));
    }
  } finally {
    stop.dispose();
  }
}

/**
 * showAt puts the cursor of a visible text editor at a place and scrolls the editor smoothly to it, because
 * showTextDocument with a selection scrolls as VS Code does. Setting the selection of a text editor does not scroll it.
 * @param editor - The visible text editor.
 * @param place - The place of the cursor.
 * @param focus - Whether the text editor gets the focus.
 */
export async function showAt(editor: vscode.TextEditor, place: vscode.Position, focus: boolean): Promise<void> {
  const shown = focus ? await vscode.window.showTextDocument(editor.document, { viewColumn: editor.viewColumn, preserveFocus: false }) : editor;
  shown.selection = new vscode.Selection(place, place);
  void scrollTo(shown, place);
}
