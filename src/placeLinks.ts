// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The links to places of the file itself in the text editor ([R-TEXT-011](../docs/requirements.md#r-text-011)), in the
 * clean editing view and in the text editor of a file: Ctrl+click (Cmd+click on macOS) on a link to a heading or to an
 * anchor, on a footnote reference or on the label of a footnote definition goes to its target
 * ([src/notes/places.ts](notes/places.ts)). The target of each link is the document itself with the line and the
 * column of the place, so VS Code opens it as a navigation, the same as a link to a heading of its Markdown extension,
 * and Go Back and Go Forward of VS Code return through the places: their keys, the buttons of the title bar and the back
 * and forward buttons of the mouse. A link of this extension covers the whole link, and VS Code takes it in place of the
 * link of its Markdown extension on the same text, which finds no anchor of HTML and no anchor that the view hides.
 */

import * as vscode from 'vscode';
import { cleanScheme } from './cleanView';
import { placeLinks } from './notes/places';

/** PlaceView is what the links need from the clean editing view. */
export interface PlaceView {
  /** realOf returns the URI of the file of a clean document. */
  realOf(document: vscode.Uri): vscode.Uri | undefined;
  /** textOf returns the text of the file of a clean document. */
  textOf(document: vscode.Uri): string | undefined;
  /** toClean returns the position in the clean document of a file of a position in the file. */
  toClean(file: vscode.Uri, position: vscode.Position): vscode.Position | undefined;
}

/** placeLinkSelector names the documents with the links: Markdown files and the documents of the clean editing view. */
export const placeLinkSelector: vscode.DocumentSelector = [
  { language: 'markdown', scheme: 'file' },
  { language: 'markdown', scheme: cleanScheme },
];

/** PlaceLinks gives the links to places of the document itself. */
export class PlaceLinks implements vscode.DocumentLinkProvider {
  /**
   * @param view - The clean editing view.
   */
  constructor(private readonly view: PlaceView) {}

  provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
    const shown = document.getText().split(/\r?\n/);
    const file = document.uri.scheme === cleanScheme ? this.view.realOf(document.uri) : undefined;
    const text = file ? this.view.textOf(document.uri) : undefined;
    const toShown = file ? (position: { line: number; character: number }) => this.view.toClean(file, new vscode.Position(position.line, position.character)) : undefined;
    return placeLinks(shown, text?.split(/\r?\n/), toShown).map(({ line, start, end, target }) => {
      const link = new vscode.DocumentLink(
        new vscode.Range(line, start, line, end),
        document.uri.with({ fragment: `L${target.line + 1},${target.character + 1}` }),
      );
      link.tooltip = 'Go to the target';
      return link;
    });
  }

  /** register registers the links. */
  register(): vscode.Disposable {
    return vscode.languages.registerDocumentLinkProvider(placeLinkSelector, this);
  }
}
