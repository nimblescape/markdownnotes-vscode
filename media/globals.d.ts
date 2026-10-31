// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The globals of the page of the side view for the type check of its script
// (media/notesView.js, R-GEN-018): the API of VS Code for a webview, and the
// visual editor of dist/visualEditor.js, which declares window.nimblescapeVisualEditor.

import type {} from '../src/webview/visualEditor';

declare global {
  /** PageState is the state of the page that VS Code keeps while it hides the view, and after a reload of the view. */
  interface PageState {
    /** tab is the tab of the editors that the user chose last. */
    readonly tab?: unknown;
    /** filter is the filter of the list, as an earlier version of the script may have written it. */
    readonly filter?: { readonly open?: unknown; readonly done?: unknown; readonly colors?: unknown; readonly text?: unknown };
  }

  /** acquireVsCodeApi returns the API of VS Code for the script of a webview, once for each page. */
  function acquireVsCodeApi(): {
    postMessage(message: unknown): void;
    getState(): PageState | undefined;
    setState(state: PageState): void;
  };
}
