// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The side view "Notes", the note editor of the extension
 * ([R-SIDE-001](../docs/requirements.md#r-side-001) to
 * [R-SIDE-003](../docs/requirements.md#r-side-003)), and the only place that
 * shows the text of the notes. It is a webview view in the secondary side bar,
 * beside the chat of VS Code, that shows the threads of the active Markdown
 * file, each with its answers rendered as Markdown, with author and date. It
 * selects the thread at the cursor of the text editor, or the thread whose
 * highlight the user clicked in the preview
 * ([R-PREV-003](../docs/requirements.md#r-prev-003)).
 *
 * The view shows the answers of a thread as a tree: each reply after the answer
 * that it replies to, and the replies to a reply indented below it
 * ([R-NOTE-004](../docs/requirements.md#r-note-004)). The date of an answer
 * shows in the local time of the reader, with the local time of the author as
 * its tooltip ([R-NOTE-002](../docs/requirements.md#r-note-002)). The buttons
 * are small icons with a tooltip, as the buttons in the title of an editor:
 * each answer has "Reply", "Edit" and "Delete", each thread "Color", "Show as
 * Text", "Answer" and "Delete Thread", and the title of the view "Add Note",
 * which adds a note to the selected text of the text editor, as the light bulb
 * action of the selected text does ([src/addNoteAction.ts](addNoteAction.ts)).
 * "Color" gives the note one of the colors of
 * [src/notes/colors.ts](notes/colors.ts); every note has the same color by
 * default. "Show as Text" switches the thread to its text view: the whole text
 * of the note, as the text editor shows the file, which "Save" writes back. The
 * editor of a text switches between writing and the preview, which renders the
 * text with the Markdown preview of VS Code. A click on a link of a rendered
 * text opens the link ([src/links.ts](links.ts)). The view writes through the
 * operations of the store of the notes ([src/noteStore.ts](noteStore.ts)),
 * which check a text before they write it. The script of the view is
 * [media/notesView.js](../media/notesView.js); it gets the state of the view
 * ([src/notesViewState.ts](notesViewState.ts)) and sends the actions of the
 * user back, in the messages of
 * [src/notesViewProtocol.ts](notesViewProtocol.ts). Its page is
 * [src/notesViewPage.ts](notesViewPage.ts).
 *
 * A click on a thread selects its note in the text editor
 * ([R-SIDE-007](../docs/requirements.md#r-side-007)). The view is a list of the
 * threads in the order of the file, which the user scrolls on its own, in the
 * text editor and in the Markdown preview alike. It scrolls the selected thread
 * to its top when the selection changes, and does not follow the scrolling of
 * the text editor: VS Code tells an extension only the whole rows that a text
 * editor shows, after it scrolled, and no place of the preview, so threads
 * beside the text moved in steps and late. The position of the cursor, not only
 * its line, selects the thread, because the highlights of several notes can
 * share a line. The text editor and the Markdown preview show the highlight of
 * the note of the selected thread in a strong color and with a frame
 * ([src/selectedNotes.ts](selectedNotes.ts)).
 *
 * A click with the mouse on a highlight in the text editor selects its thread
 * and opens the view when it is closed. A click on a thread while the Markdown
 * preview shows the file and no text editor does keeps the preview, which
 * scrolls to the note.
 *
 * "Add Note" of the Markdown preview opens the editor of a new note for the
 * text that the user selected in the preview
 * ([R-PREV-008](../docs/requirements.md#r-prev-008)), as for the selected text
 * of the text editor: the view finds the selected text in the file
 * ([src/notes/rendered.ts](notes/rendered.ts)).
 *
 * The view shows the standard footnotes of the file too, the footnotes that
 * are no note ([R-FOOT-001](../docs/requirements.md#r-foot-001)), each as a
 * thread at the place of its first reference, while the setting
 * `nimblescape.markdownNotes.showFootnotes` is on: its label, with the numbers
 * of GitHub and of the Markdown preview in its tooltip, and its rendered text,
 * with "Edit" and "Delete", as a note
 * ([R-FOOT-002](../docs/requirements.md#r-foot-002)). The cursor on a
 * reference or in a definition selects the footnote. "Add Footnote" and
 * `/footnote` open the editor of a new footnote, whose reference goes at the
 * cursor of the text editor when the user saves it
 * ([R-FOOT-003](../docs/requirements.md#r-foot-003)).
 */

import * as vscode from 'vscode';
import { githubProvider } from './github';
import { openLink } from './links';
import { hiddenText } from './format/format';
import { colorNames } from './notes/colors';
import { highlightFor } from './notes/edits';
import { footnoteAt, placeText, referenceAt, referencePlace } from './notes/footnotes';
import { renderedRange } from './notes/rendered';
import { isNoteDocument, linesOf, type NoteStore, problemMessage } from './noteStore';
import { footnoteId, footnoteLabelOf, formContext, type Message, notesViewId, previewTextMissing, type State, viewCommands } from './notesViewProtocol';
import { pageHtml } from './notesViewPage';
import { highlightText, RenderCache, stateOf } from './notesViewState';
import { renderedEditor } from './renderedEditor';
import { showAt } from './scrolling';
import type { SelectedNotes } from './selectedNotes';
import type { Settings } from './settings';

/** wordCharacter matches a letter, a digit or an underscore: a character of a word that a double click selects. */
const wordCharacter = /[\p{L}\p{N}_]/u;

/** FollowedEditor is the part of a text editor that the view follows: its document and its selection. */
export type FollowedEditor = Pick<vscode.TextEditor, 'document' | 'selection'>;

/** markdownModes are the types of the custom editors of VS Code for a Markdown file: its modes "Markdown Preview" and "Markdown Editor". */
export const markdownModes = { preview: 'vscode.markdown.preview.editor', editor: 'vscode.markdown.editor' } as const;

/**
 * modeOf returns how the active tab of a group shows a document without a text editor, with the column of the group:
 * in the Markdown preview, which is the preview to the side (`toSide`) or the mode "Markdown Preview" of VS Code, in
 * the mode "Markdown Editor" of VS Code, or in the editor of a whole file
 * ([R-TEXT-010](../docs/requirements.md#r-text-010)); undefined for no such tab. VS Code tells an extension the URI of the document
 * of a custom editor, and of the preview to the side the type of its webview and its label, "Preview paper.md", only.
 * @param document - The URI of the document.
 * @param realOf - Returns the file of a clean document, or undefined for another document.
 */
function modeOf(
  document: vscode.Uri,
  realOf: (uri: vscode.Uri) => vscode.Uri | undefined = () => undefined,
): { mode: 'preview' | 'editor' | 'rendered'; column: vscode.ViewColumn; toSide: boolean; uri?: vscode.Uri } | undefined {
  const name = document.path.split('/').pop() ?? '';
  for (const group of vscode.window.tabGroups.all) {
    const tab = group.activeTab;
    const input = tab?.input as { viewType?: unknown; uri?: vscode.Uri } | undefined;
    const viewType = typeof input?.viewType === 'string' ? input.viewType : '';
    // A mode of the clean editing view of the file shows the clean document (R-TEXT-009).
    const own = input?.uri !== undefined && (realOf(input.uri) ?? input.uri).toString() === document.toString();
    if (own && viewType === markdownModes.preview) {
      return { mode: 'preview', column: group.viewColumn, toSide: false, uri: input.uri };
    }
    if (viewType.includes('markdown.preview') && input?.uri === undefined && tab!.label.includes(name)) {
      return { mode: 'preview', column: group.viewColumn, toSide: true };
    }
    if (own && viewType === markdownModes.editor) {
      return { mode: 'editor', column: group.viewColumn, toSide: false, uri: input.uri };
    }
    if (own && viewType === renderedEditor.viewType) {
      return { mode: 'rendered', column: group.viewColumn, toSide: false, uri: input.uri };
    }
  }
  return undefined;
}

/**
 * CleanMirror is the link of the clean editing view to the files ([R-TEXT-009](../docs/requirements.md#r-text-009)): the file of a clean
 * document, the places of one in the other, and the text editor of the clean document of a file.
 */
export interface CleanMirror {
  realOf(document: vscode.Uri): vscode.Uri | undefined;
  toReal(document: vscode.Uri, position: vscode.Position, after?: boolean): vscode.Position | undefined;
  cleanEditorOf(real: vscode.Uri): vscode.TextEditor | undefined;
  toClean(real: vscode.Uri, position: vscode.Position): vscode.Position | undefined;
  /** settled waits until the changes of a clean document are in the document of its file. */
  settled?(document: vscode.Uri): Promise<void>;
}

/** NotesView is the provider of the side view. */
export class NotesView implements vscode.WebviewViewProvider, vscode.Disposable {
  private view: vscode.WebviewView | undefined;
  /** document is the Markdown document that the view shows: the last active one. */
  private document: vscode.Uri | undefined;
  /** selected is the identifier of the selected thread. */
  private selected: string | undefined;
  /**
   * scrollPending tells whether the selected thread changed while the view was hidden: the hidden view cannot scroll,
   * so it scrolls to the thread when it shows again.
   */
  private scrollPending = false;
  /** lines holds the line of the cursor of each document, by its URI. */
  private readonly lines = new Map<string, number>();
  /** atCursor holds the identifier of the thread of the note at the cursor of each document, by its URI. */
  private readonly atCursor = new Map<string, string | undefined>();
  /** cursor is the last cursor of a text editor without selected text: its document and its place. */
  private cursor: { document: string; position: vscode.Position } | undefined;
  /** clean is whether the view follows a text editor of the clean editing view, whose lines the threads name. */
  private clean = false;
  /** selections holds the selection of the text editor of each document, by its URI, for "Add Note". */
  private readonly selections = new Map<string, vscode.Range>();
  /** rendered holds the HTML of rendered texts, by the text. */
  private readonly rendered: RenderCache;
  /** version counts the states, so that only the newest one reaches the view. */
  private version = 0;
  /** ready tells whether the script of the view started and receives messages. */
  private ready = false;
  /** newPending is the message of "Add Note" or "Add Footnote" that waits for a script that did not start yet. */
  private newPending: { type: 'new'; todo?: boolean } | { type: 'newFootnote'; label?: string } | undefined;
  /** footnoteEditor tells whether the editor of a new footnote is open, whose title names the place of its reference. */
  private footnoteEditor = false;
  /** form is the form of the notes that the menus know, the value of the context key formContext. */
  private form: string | undefined;
  /**
   * account is the GitHub login of the user that the view shows, read once for each change of the sessions: VS Code can
   * take seconds for a session, and the view shows each selected note at once.
   */
  private account: Promise<string | undefined> | undefined;
  private readonly registrations: vscode.Disposable[];

  /**
   * @param extensionUri - The folder of the extension, which holds the script and the styles of the view.
   * @param store - The store of the notes, whose operations the view uses.
   * @param login - Returns the GitHub login of the user; with signIn true after asking for a sign-in.
   * @param render - Renders a Markdown text as the Markdown preview does.
   * @param settingsOf - Returns the settings of a document.
   * @param chosen - The selected note of each document, which the view sets.
   * @param mirror - The link of the clean editing view (R-TEXT-009), whose text editor shows the notes of its file.
   */
  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly store: NoteStore,
    private readonly login: (signIn: boolean) => Promise<string | undefined>,
    private readonly render: (text: string) => Promise<string>,
    private readonly settingsOf: (document: vscode.Uri | undefined) => Settings,
    private readonly chosen: SelectedNotes,
    private readonly mirror?: CleanMirror,
  ) {
    this.rendered = new RenderCache(render);
    this.registrations = [
      vscode.window.onDidChangeActiveTextEditor((editor) => this.follow(editor)),
      vscode.window.tabGroups.onDidChangeTabs(() => this.followTab()),
      vscode.window.tabGroups.onDidChangeTabGroups(() => this.followTab()),
      vscode.window.onDidChangeTextEditorSelection((event) => this.follow(event.textEditor, event.kind === vscode.TextEditorSelectionChangeKind.Mouse)),
      store.onDidChange((document) => {
        if (document.toString() === this.document?.toString()) {
          void this.refresh();
        }
      }),
      vscode.authentication.onDidChangeSessions((event) => {
        if (event.provider.id === githubProvider) {
          this.account = undefined;
          void this.refresh();
        }
      }),
      vscode.commands.registerCommand(viewCommands.newNote, () => this.newNote()),
      vscode.commands.registerCommand(viewCommands.newFootnote, () => this.newFootnote()),
      vscode.commands.registerCommand(viewCommands.addDefinition, (uri: vscode.Uri, label: string) => this.newDefinition(uri, label)),
      vscode.commands.registerCommand(viewCommands.hide, () => this.hide()),
      vscode.commands.registerCommand(viewCommands.toggle, () => (this.view?.visible ? this.hide() : vscode.commands.executeCommand(`${notesViewId}.focus`))),
      vscode.commands.registerCommand(viewCommands.hideFromViewers, () => this.changeForm(true)),
      vscode.commands.registerCommand(viewCommands.eyeShown, () => this.changeForm(true)),
      vscode.commands.registerCommand(viewCommands.showInViewers, () => this.changeForm(false)),
      vscode.commands.registerCommand(viewCommands.eyeHidden, () => this.changeForm(false)),
    ];
    this.follow(vscode.window.activeTextEditor);
    this.followTab();
  }

  /**
   * resolveWebviewView fills the view when VS Code shows it.
   * @param view - The view.
   */
  resolveWebviewView(view: vscode.WebviewView): void {
    this.view = view;
    this.ready = false;
    const media = vscode.Uri.joinPath(this.extensionUri, 'media');
    const dist = vscode.Uri.joinPath(this.extensionUri, 'dist');
    view.webview.options = { enableScripts: true, localResourceRoots: [media, dist] };
    view.webview.html = pageHtml(view.webview, media, dist);
    view.webview.onDidReceiveMessage((message: Message) => this.receive(message));
    // The extension can start while VS Code opens a file in a mode of its own, after the change of the tabs.
    this.followTab();
    view.onDidChangeVisibility(() => {
      if (view.visible) {
        this.followTab();
        void this.refresh().then(() => {
          if (this.scrollPending && this.view === view) {
            this.scrollPending = false;
            void view.webview.postMessage({ type: 'scroll' });
          }
        });
      }
    });
    view.onDidDispose(() => {
      if (this.view === view) {
        this.view = undefined;
        this.ready = false;
        this.footnoteEditor = false;
      }
    });
  }

  /**
   * activeFile is the URI of the Markdown file whose notes the view shows: the file of the text editor, of the preview
   * or of the mode "Markdown Editor", and the file behind a clean editing view.
   */
  get activeFile(): vscode.Uri | undefined {
    return this.document;
  }

  /** visible tells whether the view is open and shows its content. */
  get visible(): boolean {
    return this.view?.visible === true;
  }

  /**
   * choose selects the note at a line of a document, for a click on its highlight in the preview, and leaves the view
   * closed when it is closed.
   * @param document - The URI of the document.
   * @param line - The index of a line of the note.
   */
  async choose(document: vscode.Uri, line: number): Promise<void> {
    this.document = document;
    this.select(document, this.store.entryAt(document, { line, character: 0 })?.id ?? this.selected);
    await this.refresh();
  }

  /**
   * show opens the view with the note at a line of a document, for a double click on its highlight in the preview.
   * @param document - The URI of the document.
   * @param line - The index of a line of the note.
   */
  async show(document: vscode.Uri, line: number): Promise<void> {
    this.document = document;
    this.select(document, this.store.entryAt(document, { line, character: 0 })?.id ?? this.selected);
    await vscode.commands.executeCommand(`${notesViewId}.focus`);
    await this.refresh();
  }

  /**
   * deselect deselects the selected note of a document, for a click on the text of the preview outside the highlight
   * of the note.
   * @param document - The URI of the document.
   */
  deselect(document: vscode.Uri): void {
    if (document.toString() === this.document?.toString()) {
      this.select(document, undefined);
      void this.refresh();
    } else {
      this.chosen.select(document, undefined);
    }
  }

  /**
   * deselectAll deselects the selected note of every document, when the highlights show or hide.
   */
  deselectAll(): void {
    for (const document of this.chosen.documents()) {
      this.chosen.select(vscode.Uri.parse(document), undefined);
    }
    if (this.document && this.selected !== undefined) {
      this.select(this.document, undefined);
      void this.refresh();
    }
  }

  /**
   * addFromPreview opens the editor of a new note in the view for text that the user selected in the Markdown preview of
   * a document ([R-PREV-008](../docs/requirements.md#r-prev-008)): the document of a clean editing view stands for its
   * file. The text must be text that a note can highlight, as for "Add Note" of the text editor; for other text the view
   * opens nothing and tells the user what to select.
   * @param rendered - The document that the preview renders.
   * @param line - The line of the block of the selected text, which the preview names.
   * @param before - The text of the block before the selected text, as the preview shows it.
   * @param text - The selected text, as the preview shows it.
   */
  async addFromPreview(rendered: vscode.TextDocument, line: number, before: string, text: string): Promise<void> {
    if (!this.fileOf(rendered)) {
      return;
    }
    const range = renderedRange(linesOf(rendered), line, before, text);
    if (!range) {
      void vscode.window.showInformationMessage(previewTextMissing);
      return;
    }
    await this.newNoteAt(rendered, range, false);
  }

  /**
   * addFromText opens the editor of a new note in the view for text of a text editor that a slash command names
   * ([R-EDIT-008](../docs/requirements.md#r-edit-008)): the text that the typed slash replaced, for `/note` and `/todo`,
   * or the sentence before `/todo`. The text editor selects the text, as for "Add Note".
   * @param editor - The text editor, also of a clean editing view.
   * @param range - The text.
   * @param todo - Whether the new note is a todo ([R-NOTE-008](../docs/requirements.md#r-note-008)).
   */
  async addFromText(editor: vscode.TextEditor, range: vscode.Range, todo: boolean): Promise<void> {
    if (!this.fileOf(editor.document)) {
      return;
    }
    editor.selection = new vscode.Selection(range.start, range.end);
    await this.newNoteAt(editor.document, range, todo);
  }

  /**
   * fileOf returns the file of a document that the extension can change: the document itself, or the file of a clean
   * editing view.
   * @param rendered - The document, also of a clean editing view.
   */
  private fileOf(rendered: vscode.TextDocument): { file: vscode.TextDocument; real: vscode.Uri | undefined } | undefined {
    const real = this.mirror?.realOf(rendered.uri);
    const file = real ? vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === real.toString()) : rendered;
    return file && isNoteDocument(file) ? { file, real } : undefined;
  }

  /**
   * newNoteAt opens the editor of a new note in the view for a range of a document, also of a clean editing view, when a
   * note can highlight its text; for other text it opens nothing and tells the user what to select.
   * @param rendered - The document.
   * @param range - The range.
   * @param todo - Whether the new note is a todo.
   */
  private async newNoteAt(rendered: vscode.TextDocument, range: { start: { line: number; character: number }; end: { line: number; character: number } }, todo: boolean): Promise<void> {
    const found = this.fileOf(rendered);
    if (!found) {
      return;
    }
    const { file, real } = found;
    const place = (position: { line: number; character: number }): vscode.Position | undefined => {
      const at = new vscode.Position(position.line, position.character);
      return real ? this.mirror!.toReal(rendered.uri, at) : at;
    };
    const start = place(range.start);
    const end = place(range.end);
    if (!start || !end || highlightFor(linesOf(file), new vscode.Range(start, end), this.store.textReadingOf(file)) === undefined) {
      void vscode.window.showInformationMessage(problemMessage({ kind: 'place' }));
      return;
    }
    const key = file.uri.toString();
    this.document = file.uri;
    this.clean = real !== undefined;
    this.lines.set(key, start.line);
    this.selections.set(key, new vscode.Range(start, end));
    // The title of the editor of the new note names the text at once, before the new state of the view.
    void this.refresh();
    if (this.ready) {
      await this.view?.webview.postMessage(this.lineMessage(file.uri, start.line));
    }
    await this.newNote(todo);
  }

  /**
   * newNote opens the editor of a new note in the view, for the selected text of the text editor, in the default color,
   * which the editor changes. Without selected text it opens nothing and tells the user to select text. It ignores the
   * arguments, such as the URI that a menu of VS Code passes.
   * @param todo - Whether the new note is a todo ([R-NOTE-008](../docs/requirements.md#r-note-008)).
   */
  private async newNote(todo = false): Promise<void> {
    const document = this.document;
    const selection = document && this.selections.get(document.toString());
    if (!selection || selection.isEmpty) {
      void vscode.window.showInformationMessage(problemMessage({ kind: 'noText' }));
      return;
    }
    if (!this.view?.visible) {
      await vscode.commands.executeCommand(`${notesViewId}.focus`);
    }
    await this.post(todo ? { type: 'new', todo } : { type: 'new' });
  }

  /**
   * post sends the message of "Add Note" or "Add Footnote" to the script; the script of a view that opens just now gets
   * it when it starts.
   * @param message - The message.
   */
  private async post(message: NonNullable<NotesView['newPending']>): Promise<void> {
    if (this.ready) {
      await this.view?.webview.postMessage(message);
    } else {
      this.newPending = message;
    }
  }

  /**
   * newFootnote opens the editor of a new standard footnote in the view ([R-FOOT-003](../docs/requirements.md#r-foot-003)),
   * for the cursor of the text editor, where its reference goes when the user saves it. Where no reference can stand, it
   * opens nothing and tells the user why. It ignores the arguments, such as the URI that a menu of VS Code passes.
   */
  private async newFootnote(): Promise<void> {
    const document = this.document;
    if (!document || this.footnotePlaceOf(document) === undefined) {
      void vscode.window.showInformationMessage(problemMessage({ kind: 'footnotePlace' }));
      return;
    }
    this.footnoteEditor = true;
    if (!this.view?.visible) {
      await vscode.commands.executeCommand(`${notesViewId}.focus`);
    }
    // The title of the editor names the place of the reference at once.
    await this.refresh();
    await this.post({ type: 'newFootnote' });
  }

  /**
   * newDefinition opens the editor of a new definition for the label of a reference without a definition, for the quick
   * fix "Add Definition" ([R-FOOT-004](../docs/requirements.md#r-foot-004)). The definition needs no place of a
   * reference, so the title of the editor names the label.
   * @param uri - The URI of the file whose reference has no definition.
   * @param label - The label of the reference.
   */
  private async newDefinition(uri: vscode.Uri, label: string): Promise<void> {
    if (this.document?.toString() !== uri.toString()) {
      await vscode.window.showTextDocument(uri);
    }
    this.footnoteEditor = false;
    if (!this.view?.visible) {
      await vscode.commands.executeCommand(`${notesViewId}.focus`);
    }
    await this.post({ type: 'newFootnote', label });
  }

  /**
   * addFootnoteFrom opens the editor of a new standard footnote for the cursor of a text editor, for `/footnote`
   * ([R-EDIT-008](../docs/requirements.md#r-edit-008)), as "Add Footnote" does.
   * @param editor - The text editor, also of a clean editing view.
   */
  async addFootnoteFrom(editor: vscode.TextEditor): Promise<void> {
    this.follow(editor);
    await this.newFootnote();
  }

  /**
   * footnotePlaceOf returns the text before the place of the reference of a new footnote at the cursor of the text editor
   * of a document, without the hidden markers of the notes and shortened, or undefined where no reference can stand.
   * @param document - The URI of the document.
   */
  private footnotePlaceOf(document: vscode.Uri): string | undefined {
    const range = this.selections.get(document.toString());
    const open = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === document.toString());
    if (!range || !open || !isNoteDocument(open)) {
      return undefined;
    }
    const lines = linesOf(open);
    const place = referencePlace(lines, range.end, this.store.textReadingOf(open));
    if (!place) {
      return undefined;
    }
    const text = lines[place.line].slice(0, place.character).replace(hiddenText, '');
    return placeText([text], { line: 0, character: text.length });
  }

  /**
   * hide closes the secondary side bar, which holds the view beside the chat of VS Code. VS Code has no command that
   * closes one view.
   */
  private async hide(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
  }

  /**
   * select makes a thread the selected thread of the view, and its note the selected note of its document.
   * @param document - The URI of the document.
   * @param id - The identifier of the thread, or undefined.
   * @param reveal - Whether the preview scrolls to the note.
   */
  private select(document: vscode.Uri, id: string | undefined, reveal = false): void {
    if (id !== this.selected && !this.visible) {
      this.scrollPending = id !== undefined;
    }
    this.selected = id;
    const entry = id === undefined ? undefined : this.store.entriesOf(document).find((candidate) => candidate.id === id);
    this.chosen.select(document, entry?.note.label, reveal);
  }

  /**
   * followEditor follows the selection of the editor of a whole file ([R-TEXT-010](../docs/requirements.md#r-text-010)),
   * as of a text editor: the editor gives it as a selection of the document.
   * @param editor - The document and the selection of the editor.
   * @param click - Whether the mouse changed the selection.
   */
  followEditor(editor: FollowedEditor, click: boolean): void {
    this.follow(editor, click);
  }

  /**
   * followTab makes the document of the active tab the document of the view, when the tab shows it in the mode
   * "Markdown Preview" or "Markdown Editor" of VS Code, which are no text editors. The selected note of the document
   * stays selected.
   */
  private followTab(): void {
    const input = vscode.window.tabGroups.activeTabGroup?.activeTab?.input as { viewType?: unknown; uri?: vscode.Uri } | undefined;
    // The editor of a whole file (R-TEXT-010) shows the notes of its document too.
    const modes: readonly unknown[] = [...Object.values(markdownModes), renderedEditor.viewType];
    // A mode of the clean editing view shows the notes of its file (R-TEXT-009).
    const real = input?.uri && this.mirror?.realOf(input.uri);
    const document = real ?? input?.uri;
    if (!document || !modes.includes(input?.viewType) || (document.toString() === this.document?.toString() && (real !== undefined) === this.clean)) {
      return;
    }
    this.document = document;
    this.clean = real !== undefined;
    const label = this.chosen.labelOf(document);
    this.select(document, this.store.entriesOf(document).find((entry) => entry.note.label === label)?.id);
    void this.refresh();
  }

  /**
   * doubleClicked tells whether a change of the selection of a text editor with the mouse is the second click of a
   * double click, and returns the place of the cursor before it. VS Code tells an extension no double click: it reports
   * the first click as a cursor without selected text, and the second click as the selected word at that place. A first
   * click on the place of the cursor changes nothing, so VS Code reports no first click, also long after the click that
   * put the cursor there. So a word that the mouse selects in one step, around the cursor or from it, is the word of a
   * double click. A drag of the mouse selects the text in steps, of which the first one is no word.
   * @param editor - The text editor.
   * @param click - Whether the mouse changed the selection.
   */
  private doubleClicked(editor: FollowedEditor, click: boolean): vscode.Position | undefined {
    const last = this.cursor;
    const key = editor.document.uri.toString();
    const { selection } = editor;
    this.cursor = selection.isEmpty ? { document: key, position: selection.active } : undefined;
    if (!click || !last || last.document !== key || selection.isEmpty || !selection.isSingleLine || last.position.line !== selection.start.line) {
      return undefined;
    }
    const { start, end } = selection;
    const at = last.position.character;
    if (at < start.character || end.character < at) {
      return undefined;
    }
    const line = editor.document.lineAt(start.line).text;
    const word = line.slice(start.character, end.character);
    const edges = [line[start.character - 1] ?? '', line[end.character] ?? ''];
    return !/\s/u.test(word) && edges.every((character) => !wordCharacter.test(character)) ? last.position : undefined;
  }

  /**
   * follow makes the document of a text editor the document of the view, and selects the note at its cursor. Another
   * editor, for example the preview, keeps the document of the view. The selected note stays selected while the cursor
   * is in it, and the cursor that leaves it deselects it; a click with the mouse outside the notes deselects the
   * selected note. A move of the cursor with the keys outside the notes keeps a note that the user chose in the view. A
   * double click on the highlight of the selected note opens the view.
   * @param editor - The text editor, or undefined.
   * @param click - Whether a click with the mouse moved the cursor.
   */
  private follow(editor: FollowedEditor | undefined, click = false): void {
    // A text editor of the clean editing view shows the notes of its file, at the places in the file.
    const real = editor && this.mirror?.realOf(editor.document.uri);
    if (!editor || (!real && !isNoteDocument(editor.document))) {
      return;
    }
    const place = (position: vscode.Position, after = false): vscode.Position => (real ? (this.mirror!.toReal(editor.document.uri, position, after) ?? position) : position);
    const document = real ?? editor.document.uri;
    // The word of a double click can end at the end of a highlight, outside the note; the place of the click names it.
    const doubleClick = this.doubleClicked(editor, click);
    const at = doubleClick ?? editor.selection.active;
    const active = place(at);
    const line = active.line;
    this.lines.set(document.toString(), line);
    this.selections.set(document.toString(), new vscode.Range(place(editor.selection.start ?? editor.selection.active), place(editor.selection.end ?? editor.selection.active)));
    const changed = document.toString() !== this.document?.toString() || (real !== undefined) !== this.clean;
    this.clean = real !== undefined;
    // The position, not only the line, names the note, because the selections of several notes can share a line. In the
    // clean editing view, the cursor at the start of a highlight is before its hidden start marker in the file.
    const entry = this.store.entryAt(document, active) ?? (real ? this.store.entryAt(document, place(at, true)) : undefined);
    // The cursor on a reference or in a definition of a standard footnote selects the footnote (R-FOOT-001); a
    // reference in the highlight of a note, such as a citation, selects its footnote too.
    const footnotes = this.settingsOf(document).showFootnotes ? this.store.footnotesOf(document) : [];
    const footnote = referenceAt(footnotes, active) ?? (entry ? undefined : footnoteAt(footnotes, active));
    const selected = footnote ? footnoteId(footnote.label) : entry?.id;
    const left = this.atCursor.get(document.toString()) === this.selected && this.selected !== undefined;
    this.atCursor.set(document.toString(), selected);
    this.document = document;
    if (changed || (selected !== undefined && selected !== this.selected) || ((click || left) && selected === undefined && this.selected !== undefined)) {
      this.select(document, selected);
      void this.refresh();
    } else {
      void this.view?.webview.postMessage(this.lineMessage(document, line));
    }
    const inSelection = entry?.note.selection !== undefined && !(entry.note.start.line <= active.line && active.line <= entry.note.end.line);
    if (doubleClick && inSelection) {
      void this.open();
    }
  }

  /**
   * lineMessage returns the message of a move of the cursor: its line, the text that a new note highlights, and the
   * place of the reference of a new footnote while its editor is open.
   * @param document - The URI of the document.
   * @param line - The index of the line of the cursor.
   */
  private lineMessage(document: vscode.Uri, line: number): { type: 'line'; line: number; highlight: string | undefined; footnotePlace?: string } {
    return { type: 'line', line, highlight: this.highlightOf(document), ...(this.footnoteEditor ? { footnotePlace: this.footnotePlaceOf(document) } : {}) };
  }

  /**
   * open opens the view and gives the focus back to the text editor.
   */
  async open(): Promise<void> {
    if (this.view) {
      this.view.show(true);
      return;
    }
    await vscode.commands.executeCommand(`${notesViewId}.focus`);
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  }

  /** settingsChanged shows the view again after a change of the settings of the extension. */
  settingsChanged(): void {
    void this.refresh();
  }

  /**
   * highlightOf returns the text that a new note highlights for the selection of the text editor of a document
   * (src/notesViewState.ts).
   * @param document - The URI of the document.
   */
  private highlightOf(document: vscode.Uri): string | undefined {
    return highlightText(this.store, document, this.selections.get(document.toString()));
  }

  /** state returns the content of the view (src/notesViewState.ts). */
  async state(): Promise<State> {
    const document = this.document;
    return stateOf({
      store: this.store,
      document,
      showFootnotes: () => document !== undefined && this.settingsOf(document).showFootnotes,
      toClean: (position) => (this.clean && document ? this.mirror?.toClean(document, position) : undefined),
      render: (text) => this.rendered.html(text),
      line: () => (document ? this.lines.get(document.toString()) : undefined),
      highlight: () => document && this.highlightOf(document),
      footnotePlace: () => (this.footnoteEditor && document ? { footnotePlace: this.footnotePlaceOf(document) } : {}),
      account: () => (this.account ??= this.login(false)),
      selected: () => this.selected,
    });
  }

  /**
   * changeForm writes all notes of the document of the view in a form, for the eye and its commands
   * ([R-HIDE-002](../docs/requirements.md#r-hide-002)), and says why when it cannot.
   * @param hidden - Whether the notes go into the hidden form.
   */
  private async changeForm(hidden: boolean): Promise<void> {
    const document = this.document;
    if (!document) {
      return;
    }
    const problem = await this.store.changeForm(document, hidden);
    if (problem) {
      void vscode.window.showWarningMessage(problemMessage(problem));
    }
    await this.refresh();
  }

  /** showForm tells the menus the form of the notes of the document of the view, for the eye in its title. */
  private showForm(): void {
    const hidden = this.document && this.store.formOf(this.document);
    const form = hidden === undefined ? '' : hidden ? 'hidden' : 'visible';
    if (form !== this.form) {
      this.form = form;
      void vscode.commands.executeCommand('setContext', formContext, form);
    }
  }

  /** refresh sends the content of the view to its script, when the view is open, and the form of the notes to the menus. */
  private async refresh(): Promise<void> {
    this.showForm();
    if (!this.view) {
      return;
    }
    const version = ++this.version;
    const state = await this.state();
    if (version === this.version && this.view) {
      this.view.description = state.file;
      await this.view.webview.postMessage(state);
    }
  }

  /**
   * reply sends the result of an action to the script: done, or the message of the problem.
   * @param request - The number of the request of the script.
   * @param problem - The problem, or undefined.
   */
  private async reply(request: number, problem: Parameters<typeof problemMessage>[0] | undefined): Promise<void> {
    await this.view?.webview.postMessage({ type: 'result', request, message: problem ? problemMessage(problem) : undefined });
  }

  /**
   * targetOf returns the text of a thread that "reveal" shows: the highlight of a note, or the note without one; the first
   * reference of a standard footnote, or its definition without one.
   * @param uri - The URI of the document.
   * @param id - The identifier of the thread.
   */
  private targetOf(uri: vscode.Uri, id: string): { start: vscode.Position; end: vscode.Position } | undefined {
    const label = footnoteLabelOf(id);
    if (label !== undefined) {
      const footnote = this.store.footnotesOf(uri).find((candidate) => candidate.label === label);
      const range = footnote?.references[0];
      if (range) {
        return { start: new vscode.Position(range.start.line, range.start.character), end: new vscode.Position(range.end.line, range.end.character) };
      }
      return footnote && { start: new vscode.Position(footnote.definition.first, 0), end: new vscode.Position(footnote.definition.first, 0) };
    }
    const note = this.store.entriesOf(uri).find((candidate) => candidate.id === id)?.note;
    if (!note) {
      return undefined;
    }
    const place = note.selection?.start ?? note.start;
    const start = new vscode.Position(place.line, place.character);
    return { start, end: note.selection ? new vscode.Position(note.selection.end.line, note.selection.end.character) : start };
  }

  /**
   * reveal shows a note in the text editor of its document, with the cursor at the start of its highlight or of the
   * note, and a standard footnote at its first reference or at its definition.
   * @param id - The identifier of the thread.
   * @param focus - Whether the text editor gets the focus; a click on a thread leaves the focus in the view.
   */
  private async reveal(id: string, focus: boolean): Promise<void> {
    const uri = this.document;
    const target = uri && this.targetOf(uri, id);
    if (!uri || !target) {
      return;
    }
    const visible = vscode.window.visibleTextEditors.find((editor) => editor.document.uri.toString() === uri.toString());
    const shown = visible === undefined ? modeOf(uri, (tab) => this.mirror?.realOf(tab)) : undefined;
    if (shown?.mode === 'preview' || shown?.mode === 'rendered') {
      // The preview and the editor of a whole file keep their place in the editor area and scroll to the note.
      this.select(uri, id, true);
      await this.refresh();
      return;
    }
    // The view shows the thread selected at once: the cursor at the start of the highlight in a clean editing view stands
    // before the hidden start marker, outside the note, and keeps the selected note without a new state of the view.
    this.select(uri, id);
    void this.refresh();
    const { start } = target;
    // A visible text editor scrolls smoothly to the note.
    const clean = this.mirror?.cleanEditorOf(uri);
    if (clean) {
      await showAt(clean, this.mirror!.toClean(uri, start) ?? start, focus);
      return;
    }
    if (shown?.mode === 'editor') {
      // The mode "Markdown Editor" stays, and selects the selection of the note, because it shows no note.
      const { end } = target;
      const shownUri = shown.uri ?? uri;
      const place = (position: vscode.Position): vscode.Position => (shownUri === uri ? position : (this.mirror?.toClean(uri, position) ?? position));
      await vscode.commands.executeCommand('vscode.openWith', shownUri, markdownModes.editor, { viewColumn: shown.column, selection: new vscode.Range(place(start), place(end)), preserveFocus: !focus });
      return;
    }
    if (visible) {
      await showAt(visible, start, focus);
      return;
    }
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, { selection: new vscode.Range(start, start), preserveFocus: !focus });
  }

  /**
   * receive runs an action of the user in the view.
   * @param message - The message of the script.
   */
  private async receive(message: Message): Promise<void> {
    const document = this.document;
    switch (message.type) {
      case 'ready':
        this.ready = true;
        await this.refresh();
        if (this.newPending) {
          const pending = this.newPending;
          this.newPending = undefined;
          await this.view?.webview.postMessage(pending);
        }
        return;
      case 'signIn':
        await this.login(true);
        this.account = undefined;
        await this.refresh();
        return;
      case 'render':
        await this.view?.webview.postMessage({ type: 'rendered', request: message.request, html: await this.rendered.html(message.text) });
        return;
      case 'reveal':
        await this.reveal(message.id, message.focus ?? true);
        return;
      case 'footnoteClosed':
        this.footnoteEditor = false;
        return;
      case 'deselect':
        if (document) {
          this.deselect(document);
        }
        return;
      case 'openLink':
        await openLink(message.href, document, this.render, this.settingsOf(document).openLinksIn);
        return;
    }
    if (!document) {
      if ('request' in message) {
        await this.reply(message.request, { kind: 'missing' });
      }
      return;
    }
    switch (message.type) {
      case 'save':
        await this.reply(message.request, await this.store.saveAnswer(document, message.id, message.answer, message.text));
        return;
      case 'answer':
        await this.reply(message.request, await this.store.answer(document, message.id, message.text, undefined, message.parent));
        return;
      case 'add': {
        const line = this.lines.get(document.toString()) ?? 0;
        const range = this.selections.get(document.toString()) ?? new vscode.Range(line, 0, line, 0);
        const result = await this.store.addNote(
          document,
          range,
          message.text,
          colorNames.find((name) => name === message.color),
          message.todo === true,
          this.settingsOf(document).hideNotesInNewFiles,
        );
        if ('id' in result) {
          this.select(document, result.id);
          await this.refresh();
        }
        await this.reply(message.request, 'problem' in result ? result.problem : undefined);
        return;
      }
      case 'saveText':
        await this.reply(message.request, await this.store.saveNoteText(document, message.id, message.text, message.original));
        return;
      case 'saveFootnote': {
        const label = footnoteLabelOf(message.id);
        await this.reply(message.request, label === undefined ? { kind: 'footnoteMissing' } : await this.store.saveFootnote(document, label, message.text, message.original));
        return;
      }
      case 'addFootnote': {
        if (message.label !== undefined) {
          // The editor of a new definition, for the quick fix "Add Definition".
          const problem = await this.store.addDefinition(document, message.label, message.text);
          if (!problem) {
            this.select(document, footnoteId(message.label));
            await this.refresh();
          }
          await this.reply(message.request, problem);
          return;
        }
        // The reference goes at the cursor of the text editor at the time of the save.
        const selection = this.selections.get(document.toString());
        const result = selection ? await this.store.addFootnote(document, selection.end, message.text) : { problem: { kind: 'footnotePlace' as const } };
        if ('label' in result) {
          this.footnoteEditor = false;
          this.select(document, footnoteId(result.label));
          await this.refresh();
        }
        await this.reply(message.request, 'problem' in result ? result.problem : undefined);
        return;
      }
      case 'deleteFootnote': {
        const label = footnoteLabelOf(message.id);
        if (label === undefined) {
          return;
        }
        // The deletion changes the text of the document, also references far from the view: the user confirms it first.
        const choice = await vscode.window.showWarningMessage(
          `Delete the footnote [^${label}]? This removes its definition and every reference to it from the file. Undo in the text editor of the file takes it back; in the clean editing view, choose "Open File with Markup" first.`,
          { modal: true },
          'Delete',
        );
        if (choice !== 'Delete') {
          return;
        }
        const problem = await this.store.deleteFootnote(document, label);
        if (problem) {
          void vscode.window.showErrorMessage(problemMessage(problem));
        }
        return;
      }
      case 'makeFootnote': {
        const replies = (this.store.entriesOf(document).find((entry) => entry.id === message.id)?.note.answers.length ?? 1) - 1;
        if (replies > 0) {
          // The replies go with the note: the user confirms it first.
          const choice = await vscode.window.showWarningMessage(
            `Make the note a footnote? The text of its first answer becomes the text of the footnote, and ${replies === 1 ? 'its reply goes' : `its ${replies} replies go`} with the note. Undo in the text editor of the file brings the note back; in the clean editing view, choose "Open File with Markup" first.`,
            { modal: true },
            'Make Footnote',
          );
          if (choice !== 'Make Footnote') {
            return;
          }
        }
        const result = await this.store.makeFootnote(document, message.id);
        if ('problem' in result) {
          void vscode.window.showErrorMessage(problemMessage(result.problem));
          return;
        }
        this.select(document, footnoteId(result.label));
        await this.refresh();
        return;
      }
      case 'color':
      case 'todo':
      case 'deleteAnswer':
      case 'deleteNote': {
        const problem =
          message.type === 'color'
            ? await this.store.colorNote(document, message.id, message.color)
            : message.type === 'todo'
              ? await this.store.todoNote(document, message.id, message.done ? 'done' : 'todo')
              : message.type === 'deleteAnswer'
              ? await this.store.deleteAnswer(document, message.id, message.answer)
              : await this.store.deleteNote(document, message.id);
        if (problem) {
          void vscode.window.showErrorMessage(problemMessage(problem));
        }
        return;
      }
    }
  }

  /** dispose removes the listeners of the view. */
  dispose(): void {
    for (const registration of this.registrations) {
      registration.dispose();
    }
  }
}
