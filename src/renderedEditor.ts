// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The editor of a whole file ([R-TEXT-010](../docs/requirements.md#r-text-010)): the editor of rendered Markdown of
 * nimblescape Markdown as the custom text editor of Markdown files, with the plugin of the notes
 * ([src/webview/notesPlugin.ts](webview/notesPlugin.ts)). The adapter of VS Code of the extension
 * ([src/adapter/editor.ts](adapter/editor.ts), [R-VSC-001](../docs/requirements.md#r-vsc-001)) registers it and
 * connects its page to the document, so that the file stays a text document of VS Code. The setting `renderedEditor`
 * chooses the files that open in it: every Markdown file (`all`), the files with notes or with the comment of the format
 * and the paper documents (`notesAndPapers`), or none; every other file opens in the text editor. The button "Open Text
 * Editor to the Side" in the title of the editor opens the text editor of the file, which is the clean editing view for
 * a file with notes and for a paper document ([R-TEXT-009](../docs/requirements.md#r-text-009), decision 72).
 *
 * The editor is the view "Markdown Editor" of the three views of a Markdown file, beside "Text Editor" and "Markdown
 * Preview" (R-VSC-002): the title of each view has the buttons of all three views in this order, the button of the
 * selected view marked with its icon in a filled square, and the buttons "Reopen in Text Editor", "Reopen in Markdown
 * Preview" and "Reopen in Markdown Editor" of the two other views switch to them; the list of the editors of VS Code
 * names it "Markdown Editor". The view "Markdown Editor" of a document of the clean editing view is the editor of its
 * file.
 *
 * The module connects the plugin of each editor to the extension (src/notes/editorMessages.ts): the selection of the
 * editor, as places in the text of the file, goes to the side view, which selects the thread at the cursor and adds a
 * new note to the selected text, as for a text editor. The selected note of the side view shows strong in the editor,
 * which scrolls to it on a click on its thread, and the setting `showHighlights` shows or hides the highlights.
 *
 * Other extensions add plugins to the editor ([R-GEN-012](../docs/requirements.md#r-gen-012)), for example Markdown
 * Paper: the package.json of such an extension names the scripts of its plugins in the contribution point
 * `nimblescape.markdown.extensions`, and the page loads them with its own plugins. The part of such a plugin in the
 * other extension connects through `registerEditorPlugin` of the API of the extension, also after editors opened.
 */

import { registerMarkdownEditor, type MarkdownEditorHandle, type PluginConnect, type PluginPanelChannel } from './adapter/editor';
import * as vscode from 'vscode';
import type { JumpKeys } from '@nimblescape/markdownrender/jumps';
import { fileOf } from './cleanView';
import { isPaperDocument } from './notes/clean';
import { findDoctype } from './notes/doctype';
import { type ExtensionMessage, pageMessage, pluginName, type SlashName } from './notes/editorMessages';
import type { TextChange } from './slashCommands';
import type { SelectedNotes } from './selectedNotes';
import type { EditorFiles, Settings } from './settings';

/**
 * renderedEditor names the editor: the type of the custom editor, the commands of the buttons of the title of the
 * editors of a Markdown file (the text editor to the side, and the three views of the file,
 * [R-VSC-002](../docs/requirements.md#r-vsc-002): a button "Reopen in …" for each other view, and a button of the
 * selected view, which does nothing), and the commands of the buttons to the previous and to the next change in a diff
 * with the editor on both sides ([R-TEXT-010](../docs/requirements.md#r-text-010)), which show while the context key
 * `diffContext` is true.
 */
export const renderedEditor = {
  viewType: 'nimblescape.markdownNotes.editor',
  openText: 'nimblescape.markdownNotes.openTextEditor',
  reopenEditor: 'nimblescape.markdownNotes.reopenInMarkdownEditor',
  reopenText: 'nimblescape.markdownNotes.reopenInTextEditor',
  reopenPreview: 'nimblescape.markdownNotes.reopenInMarkdownPreview',
  textSelected: 'nimblescape.markdownNotes.textEditorSelected',
  previewSelected: 'nimblescape.markdownNotes.markdownPreviewSelected',
  editorSelected: 'nimblescape.markdownNotes.markdownEditorSelected',
  previousChange: 'nimblescape.markdownNotes.previousChange',
  nextChange: 'nimblescape.markdownNotes.nextChange',
  diffContext: 'nimblescape.markdownNotes.editor.diff',
};

/**
 * ownPlugins are the names of the plugins of the page of the extension: the plugin of the notes and the plugin of the
 * figures (src/webview/figuresPlugin.ts). A plugin of another extension has another name.
 */
export const ownPlugins: readonly string[] = [pluginName, 'figures'];

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

/**
 * RenderedCommands run the slash commands of the editor that need the extension ([R-EDIT-008](../docs/requirements.md#r-edit-008)).
 */
export interface RenderedCommands {
  /** footnote opens the editor of a new standard footnote in the side view for the cursor of the editor, for `/footnote`. */
  footnote(): Thenable<unknown>;
  /**
   * slash runs a slash command on the text of a file that the page sent, at a place of the cursor, and returns the
   * change of the text, or undefined.
   */
  slash(file: vscode.TextDocument, command: SlashName, text: string, at: number): Promise<TextChange | undefined>;
}

/** Connection is the channel of the plugin in the panel of one document. */
interface Connection {
  readonly channel: PluginPanelChannel;
  /** pending is the last selection of the page that waits for selectionDelay. */
  pending: { anchor: number; head: number; mouse: boolean; timer: ReturnType<typeof setTimeout> } | undefined;
}

/** textDelay is the longest time in milliseconds that a slash command waits for the change of the page in the document. */
export const textDelay = 1000;

/**
 * textOf resolves when a document has a text, or after textDelay.
 * @param document - The document.
 * @param text - The text.
 */
function textOf(document: vscode.TextDocument, text: string): Promise<void> {
  if (document.getText() === text) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      listener.dispose();
      resolve();
    };
    const timer = setTimeout(done, textDelay);
    const listener = vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.document === document && document.getText() === text) {
        done();
      }
    });
  });
}

/** RenderedEditors registers the editor and connects the plugin of the notes of each editor to the extension. */
export class RenderedEditors implements vscode.Disposable {
  private readonly connections = new Set<Connection>();
  private readonly selections = new vscode.EventEmitter<EditorSelection>();
  /** onDidChangeSelection tells the side view each selection of an editor. */
  readonly onDidChangeSelection = this.selections.event;
  /** handle is the registration of the editor, which connects the plugins of other extensions. */
  private handle: MarkdownEditorHandle | undefined;

  /**
   * @param extensionUri - The folder of the extension, which holds the script and the styles of the page.
   * @param settingsOf - Returns the settings of a document.
   * @param selected - The selected note of each document.
   * @param comment - Adds a note or a todo note to the selected text of an editor, for the button "Comment" of its
   * format bar and for `/note` and `/todo`.
   * @param select - Selects a range of a file in its text editor that the editor opened, which can become the clean
   * editing view ([R-TEXT-009](../docs/requirements.md#r-text-009)).
   * @param commands - Runs the other slash commands of the editor that need the extension.
   * @param jumpKeys - Returns the keys that the user binds to Go Back and Go Forward of VS Code, or undefined while they
   * are not known ([R-TEXT-011](../docs/requirements.md#r-text-011)).
   */
  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly settingsOf: (document: vscode.Uri | undefined) => Settings,
    private readonly selected: SelectedNotes,
    private readonly comment: (todo: boolean) => Thenable<unknown>,
    private readonly select?: (file: vscode.Uri, range: vscode.Range) => Thenable<void>,
    private readonly commands?: RenderedCommands,
    private readonly jumpKeys?: () => JumpKeys | undefined,
  ) {}

  /** register registers the editor and the listeners of the selected notes. */
  register(): vscode.Disposable[] {
    const dist = vscode.Uri.joinPath(this.extensionUri, 'dist');
    this.handle = registerMarkdownEditor(vscode, {
      viewType: renderedEditor.viewType,
      script: vscode.Uri.joinPath(dist, 'editor.js'),
      // The styles of the editor of rendered Markdown and of its adapter, which the visual editor of the side view uses too.
      styles: [vscode.Uri.joinPath(dist, 'visualEditor.css')],
      opens: (document) => this.opens(document),
      // The editor of a document of the clean editing view is the editor of its file (R-TEXT-009).
      fileOf: (document) => fileOf(document),
      openTextCommand: renderedEditor.openText,
      reopenCommands: { editor: renderedEditor.reopenEditor, text: renderedEditor.reopenText, preview: renderedEditor.reopenPreview },
      // The text editor of a file with notes or of a paper becomes the clean editing view, which gets the selection.
      select: this.select,
      nextChangeCommand: renderedEditor.nextChange,
      previousChangeCommand: renderedEditor.previousChange,
      plugins: { [pluginName]: (channel) => this.connect(channel) },
      // The plugins of other extensions, for example of Markdown Paper.
      contributedPlugins: true,
      // The syntax of the extensions of the Markdown preview of VS Code, for example diagrams and math.
      previewExtensions: (document) => this.settingsOf(document.uri).previewExtensions,
    });
    // The button of the selected view keeps its place among the buttons of the three views and marks the view; a click
    // on it keeps the view (R-VSC-002).
    const selectedViews = [renderedEditor.textSelected, renderedEditor.previewSelected, renderedEditor.editorSelected].map((command) =>
      vscode.commands.registerCommand(command, () => undefined),
    );
    return [this.handle, ...selectedViews, this.selected.onDidChange((document) => this.postSelected(document))];
  }

  /**
   * addPlugin connects the part in another extension of a plugin of the editor that this extension contributes
   * ([R-GEN-012](../docs/requirements.md#r-gen-012)), in each open editor and in each editor that opens later.
   * @param name - The name of the plugin, which no plugin of this extension has.
   * @param connect - Gets the channel of the plugin in the panel of each editor, and may return what to dispose when
   * the panel closes.
   * @returns The disposable that disconnects the plugin.
   */
  addPlugin(name: string, connect: PluginConnect): vscode.Disposable {
    if (ownPlugins.includes(name)) {
      throw new Error(`The plugin ${name} is a plugin of nimblescape Markdown Notes.`);
    }
    if (!this.handle) {
      throw new Error('The editor is not registered.');
    }
    return this.handle.addPlugin(name, connect);
  }

  /**
   * opens tells whether a document opens in the editor, by the setting `renderedEditor`.
   * @param document - The document.
   */
  opens(document: vscode.TextDocument): boolean {
    return document.languageId === 'markdown' && opensIn(this.settingsOf(document.uri).renderedEditor, document.getText());
  }

  /** jumpKeysChanged sends each editor the keys of Go Back and Go Forward after a change of the keyboard shortcuts. */
  jumpKeysChanged(): void {
    for (const connection of this.connections) {
      this.postJumpKeys(connection);
    }
  }

  /**
   * postJumpKeys sends an editor the keys that the user binds to Go Back and Go Forward, once they are known.
   * @param connection - The connection of the editor.
   */
  private postJumpKeys(connection: Connection): void {
    const keys = this.jumpKeys?.();
    if (keys) {
      this.post(connection, { type: 'jumpKeys', keys });
    }
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
        this.postJumpKeys(connection);
      } else if (message?.type === 'selection') {
        // Only the last selection of the keys in a quick series counts, but a click of the mouse counts at once when the
        // next selection comes: the first click of a double click puts the cursor that names its word (decision 86).
        if (connection.pending?.mouse) {
          this.take(connection);
        }
        clearTimeout(connection.pending?.timer);
        // The change of the text before the selection reaches the document a moment after the message.
        connection.pending = { anchor: message.anchor, head: message.head, mouse: message.mouse, timer: setTimeout(() => this.take(connection), selectionDelay) };
      } else if (message?.type === 'comment') {
        this.take(connection);
        void this.comment(message.todo === true);
      } else if (message?.type === 'footnote') {
        this.take(connection);
        void this.commands?.footnote();
      } else if (message?.type === 'slash') {
        void this.slash(connection, message);
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
   * slash runs a slash command of the page on the text that it sent, and sends the change of the text back.
   * @param connection - The connection.
   * @param message - The message of the page.
   */
  private async slash(connection: Connection, message: { request: number; command: SlashName; text: string; at: number }): Promise<void> {
    try {
      const { document } = connection.channel;
      if (message.command === 'todo') {
        // The side view finds the sentence in the document, which gets the last change of the page a moment later.
        await textOf(document, message.text);
      }
      const change = await this.commands?.slash(document, message.command, message.text, message.at);
      if (change) {
        this.post(connection, { type: 'change', request: message.request, patches: change.patches, ...(change.select ? { select: change.select } : {}) });
      }
    } catch (error) {
      void vscode.window.showErrorMessage(`The slash command /${message.command} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
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
