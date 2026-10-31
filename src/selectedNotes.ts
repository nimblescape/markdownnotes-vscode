// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The selected note of each document: the note of the selected thread of the
 * side view ([R-SIDE-007](../docs/requirements.md#r-side-007)). The text editor
 * and the Markdown preview show the highlight of this note strong and with a
 * frame in its color, also while the other highlights are hidden, so that the
 * selected thread of the side view and its text belong together. A request to
 * reveal the note makes the preview scroll to it, for a click on a thread while
 * the preview shows the file and no text editor does.
 */

import type * as vscode from 'vscode';

/** revealTime is the time in milliseconds in which a rendering of the preview scrolls to a note after the request. */
export const revealTime = 3000;

/** SelectedNotes keeps the label of the selected note of each document, by the URI of the document. */
export class SelectedNotes {
  /** labels holds the label of the selected note of each document. */
  private readonly labels = new Map<string, string>();
  /** reveals holds the number and the time of the last request to reveal the selected note of each document in the preview. */
  private readonly reveals = new Map<string, { request: number; time: number }>();
  /** listeners are the listeners of the changes. */
  private readonly listeners = new Set<(document: vscode.Uri) => void>();
  /** requests counts the requests to reveal a note, so that each one has a number of its own. */
  private requests = 0;

  /**
   * labelOf returns the label of the selected note of a document, or undefined.
   * @param document - The URI of the document.
   */
  labelOf(document: vscode.Uri | string): string | undefined {
    return this.labels.get(document.toString());
  }

  /** documents returns the URIs of the documents that have a selected note, as text. */
  documents(): string[] {
    return [...this.labels.keys()];
  }

  /**
   * revealOf returns the number of the last request to reveal the selected note of a document, for revealTime after the
   * request, so that a later rendering, for example of a new preview, does not scroll; otherwise undefined.
   * @param document - The URI of the document.
   */
  revealOf(document: vscode.Uri | string): number | undefined {
    const reveal = this.reveals.get(document.toString());
    return reveal && Date.now() - reveal.time <= revealTime ? reveal.request : undefined;
  }

  /**
   * select makes a note the selected note of a document, and tells the listeners of a change.
   * @param document - The URI of the document.
   * @param label - The label of the note, or undefined for no note.
   * @param reveal - Whether the preview scrolls to the note.
   */
  select(document: vscode.Uri, label: string | undefined, reveal = false): void {
    const key = document.toString();
    if (label === this.labels.get(key) && !reveal) {
      return;
    }
    if (label === undefined) {
      this.labels.delete(key);
    } else {
      this.labels.set(key, label);
    }
    if (reveal) {
      this.reveals.set(key, { request: ++this.requests, time: Date.now() });
    }
    this.listeners.forEach((listener) => listener(document));
  }

  /**
   * onDidChange adds a listener of the changes of the selected note of a document.
   * @param listener - The listener, which gets the URI of the document.
   */
  onDidChange(listener: (document: vscode.Uri) => void): vscode.Disposable {
    this.listeners.add(listener);
    return { dispose: () => this.listeners.delete(listener) };
  }
}
