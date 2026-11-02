// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The editor of a whole file ([R-TEXT-010](../docs/requirements.md#r-text-010)): the editor of rendered Markdown of
 * nimblescape Markdown as the custom text editor of Markdown files, with the plugin of the notes
 * ([src/webview/notesPlugin.ts](webview/notesPlugin.ts)). The adapter `@nimblescape/markdownvscode` registers it and
 * connects its page to the document, so that the file stays a text document of VS Code. The setting `renderedEditor`
 * chooses the files that open in it: every Markdown file (`all`), the files with notes or with the comment of the format
 * and the paper documents (`notesAndPapers`), or none; every other file opens in the text editor. The button "Open Text
 * Editor to the Side" in the title of the editor opens the text of the file with its markup.
 *
 * The module connects the plugin of each editor to the extension (src/notes/editorMessages.ts): the selection of the
 * editor, as places in the text of the file, goes to the side view, which selects the thread at the cursor and adds a
 * new note to the selected text, as for a text editor. The selected note of the side view shows strong in the editor,
 * which scrolls to it on a click on its thread, and the setting `showHighlights` shows or hides the highlights.
 */

import { registerMarkdownEditor, type PluginPanelChannel } from '@nimblescape/markdownvscode';
import * as vscode from 'vscode';
import { isPaperDocument } from './notes/clean';
import { findDoctype } from './notes/doctype';
import { type ExtensionMessage, pageMessage, pluginName } from './notes/editorMessages';
import type { SelectedNotes } from './selectedNotes';
import type { EditorFiles, Settings } from './settings';

/** renderedEditor names the editor: the type of the custom editor and the command of the button of its title. */
export const renderedEditor = {
  viewType: 'nimblescape.markdownNotes.editor',
  openText: 'nimblescape.markdownNotes.openTextEditor',
};

/** noteMarkup matches a reference, a start marker or an end marker of a note. */
const noteMarkup = /\[\^note-[a-z0-9]{4}\]|<!--\[?note-[a-z0-9]{4}/;

/**
 * opensIn tells whether a Markdown text opens in the editor for a value of the setting `renderedEditor`.
 * @param files - The value of the setting.
 * @param text - The text of the file.
 */
export function opensIn(files: EditorFiles, text: string): boolean {
  if (files === 'all') {
    return true;
  }
  return files === 'notesAndPapers' && (noteMarkup.test(text) || findDoctype(text.split(/\r?\n/)) !== undefined || isPaperDocument(text));
}

/** EditorSelection is the selection of an editor of a document, and whether the mouse made it. */
export interface EditorSelection {
  readonly document: vscode.TextDocument;
  readonly selection: vscode.Selection;
  readonly mouse: boolean;
}

/** selectionDelay is the time in milliseconds after which a selection of the page counts, after its change is in the document. */
export const selectionDelay = 50;

/** Connection is the channel of the plugin in the panel of one document. */
interface Connection {
  readonly channel: PluginPanelChannel;
  /** pending is the last selection of the page that waits for selectionDelay. */
  pending: { anchor: number; head: number; mouse: boolean; timer: ReturnType<typeof setTimeout> } | undefined;
}

/** RenderedEditors registers the editor and connects the plugin of the notes of each editor to the extension. */
export class RenderedEditors implements vscode.Disposable {
  private readonly connections = new Set<Connection>();
  private readonly selections = new vscode.EventEmitter<EditorSelection>();
  /** onDidChangeSelection tells the side view each selection of an editor. */
  readonly onDidChangeSelection = this.selections.event;

  /**
   * @param extensionUri - The folder of the extension, which holds the script and the styles of the page.
   * @param settingsOf - Returns the settings of a document.
   * @param selected - The selected note of each document.
   * @param comment - Adds a note to the selected text of an editor, for the button "Comment" of its format bar.
   */
  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly settingsOf: (document: vscode.Uri | undefined) => Settings,
    private readonly selected: SelectedNotes,
    private readonly comment: () => Thenable<unknown>,
  ) {}

  /** register registers the editor and the listeners of the selected notes. */
  register(): vscode.Disposable[] {
    const dist = vscode.Uri.joinPath(this.extensionUri, 'dist');
    return [
      registerMarkdownEditor(vscode, {
        viewType: renderedEditor.viewType,
        script: vscode.Uri.joinPath(dist, 'editor.js'),
        // The styles of the editor of rendered Markdown and of its adapter, which the visual editor of the side view uses too.
        styles: [vscode.Uri.joinPath(dist, 'visualEditor.css')],
        opens: (document) => this.opens(document),
        openTextCommand: renderedEditor.openText,
        plugins: { [pluginName]: (channel) => this.connect(channel) },
      }),
      this.selected.onDidChange((document) => this.postSelected(document)),
    ];
  }

  /**
   * opens tells whether a document opens in the editor, by the setting `renderedEditor`.
   * @param document - The document.
   */
  opens(document: vscode.TextDocument): boolean {
    return document.languageId === 'markdown' && opensIn(this.settingsOf(document.uri).renderedEditor, document.getText());
  }

  /** showsChanged sends each editor whether the highlights show, after a change of the setting `showHighlights`. */
  showsChanged(): void {
    for (const connection of this.connections) {
      this.post(connection, { type: 'highlights', show: this.settingsOf(connection.channel.document.uri).showHighlights });
    }
  }

  dispose(): void {
    for (const connection of this.connections) {
      clearTimeout(connection.pending?.timer);
    }
    this.connections.clear();
    this.selections.dispose();
  }

  /**
   * connect connects the plugin of the editor of a panel: it takes the selections of the page and sends the selected note
   * and the highlights.
   * @param channel - The channel of the plugin in the panel.
   */
  private connect(channel: PluginPanelChannel): vscode.Disposable {
    const connection: Connection = { channel, pending: undefined };
    this.connections.add(connection);
    const listener = channel.onMessage((value) => {
      const message = pageMessage(value);
      if (message?.type === 'ready') {
        this.post(connection, { type: 'highlights', show: this.settingsOf(channel.document.uri).showHighlights });
        this.post(connection, { type: 'select', label: this.selected.labelOf(channel.document.uri), reveal: false });
      } else if (message?.type === 'selection') {
        clearTimeout(connection.pending?.timer);
        // The change of the text before the selection reaches the document a moment after the message.
        connection.pending = { anchor: message.anchor, head: message.head, mouse: message.mouse, timer: setTimeout(() => this.take(connection), selectionDelay) };
      } else if (message?.type === 'comment') {
        this.take(connection);
        void this.comment();
      }
    });
    return {
      dispose: () => {
        listener.dispose();
        clearTimeout(connection.pending?.timer);
        this.connections.delete(connection);
      },
    };
  }

  /**
   * take gives the side view the selection of the page that waits.
   * @param connection - The connection.
   */
  private take(connection: Connection): void {
    const pending = connection.pending;
    if (!pending) {
      return;
    }
    clearTimeout(pending.timer);
    connection.pending = undefined;
    const document = connection.channel.document;
    const length = document.getText().length;
    const at = (offset: number) => document.positionAt(Math.min(offset, length));
    this.selections.fire({ document, selection: new vscode.Selection(at(pending.anchor), at(pending.head)), mouse: pending.mouse });
  }

  /**
   * postSelected sends the selected note of a document to its editors, which scroll to it when the side view asks.
   * @param document - The URI of the document.
   */
  private postSelected(document: vscode.Uri): void {
    for (const connection of this.connections) {
      if (connection.channel.document.uri.toString() === document.toString()) {
        this.post(connection, { type: 'select', label: this.selected.labelOf(document), reveal: this.selected.revealOf(document) !== undefined });
      }
    }
  }

  /**
   * post sends a message to the plugin of an editor.
   * @param connection - The connection.
   * @param message - The message.
   */
  private post(connection: Connection, message: ExtensionMessage): void {
    void connection.channel.post(message);
  }
}
