// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The side view "Notes", the note editor of the extension
 * ([R-SIDE-001](../docs/requirements.md#r-side-001) to
 * [R-SIDE-003](../docs/requirements.md#r-side-003)), and the only place that
 * shows the text of the notes (Hannes, 2026-10-28: "we completely drop the
 * inline view"). It is a webview view in the secondary side bar, beside the
 * chat of VS Code, that shows the threads of the active Markdown file, each
 * with its answers rendered as Markdown, with author and date. It selects the
 * thread at the cursor of the text editor, or the thread whose highlight the
 * user clicked in the preview ([R-PREV-003](../docs/requirements.md#r-prev-003)).
 *
 * The view shows the answers of a thread as a tree: each reply after the
 * answer that it replies to, and the replies to a reply indented below it
 * ([R-NOTE-004](../docs/requirements.md#r-note-004)). The date of an answer
 * shows in the local time of the reader, with the local time of the author as
 * its tooltip ([R-NOTE-002](../docs/requirements.md#r-note-002)). The buttons
 * are small icons with a tooltip, as the buttons in the title of an editor
 * (Hannes, 2026-10-28: "exchange all the buttons on the note editor with
 * icons"): each answer has "Reply", "Edit" and "Delete", each thread "Color",
 * "Show as Text", "Answer" and "Delete Thread", and the title of the view
 * "Add Note", which adds a note to the selected text of the text editor, as
 * the light bulb action of the selected text does
 * ([src/addNoteAction.ts](addNoteAction.ts)). "Color" gives the note one of the colors of
 * [src/notes/colors.ts](notes/colors.ts); every note has the same color by
 * default. "Show as Text" switches the thread to its text view: the whole
 * text of the note, as the text editor shows the file, which "Save" writes
 * back. The editor of a text switches between writing and the preview, which
 * renders the text with the Markdown preview of VS Code. A click on a link of
 * a rendered text opens the link ([src/links.ts](links.ts)). The view writes
 * through the operations of the threads ([src/noteThreads.ts](noteThreads.ts)),
 * which check a text before they write it. The script of the view is
 * [media/notesView.js](../media/notesView.js); it gets the state of the view
 * from this module and sends the actions of the user back.
 *
 * A click on a thread selects its note in the text editor
 * ([R-SIDE-007](../docs/requirements.md#r-side-007)). The view is a list of
 * the threads in the order of the file, which the user scrolls on its own
 * (Hannes, 2026-10-29, decision 25: "List that scrolls freely"), in the text
 * editor and in the Markdown preview alike. It scrolls the selected thread to
 * its top when the selection changes, and does not follow the scrolling of the
 * text editor: VS Code tells an extension only the whole rows that a text
 * editor shows, after it scrolled, and no place of the preview, so threads
 * beside the text moved in steps and late (Hannes, 2026-10-29: "the side view
 * really has no smooth scrolling and is laggy"). The position of the cursor,
 * not only its line, selects the thread, because the highlights of several
 * notes can share a line. The text editor and the Markdown preview show the
 * highlight of the note of the selected thread in a strong color and with a
 * frame ([src/selectedNotes.ts](selectedNotes.ts)).
 *
 * A click with the mouse on a highlight in the text editor selects its thread
 * and opens the view when it is closed. A click on a thread while the
 * Markdown preview shows the file and no text editor does keeps the preview,
 * which scrolls to the note (Hannes, 2026-10-28: the editor area stays in its
 * mode).
 *
 * "Add Note" of the Markdown preview opens the editor of a new note for the
 * text that the user selected in the preview
 * ([R-PREV-008](../docs/requirements.md#r-prev-008)), as for the selected text
 * of the text editor: the view finds the selected text in the file
 * ([src/notes/rendered.ts](notes/rendered.ts)).
 */

import * as vscode from 'vscode';
import { githubProvider } from './github';
import { openLink } from './links';
import { hiddenText } from './format/format';
import { colorIndexOf, colorNames, colorOf, noteColors } from './notes/colors';
import { highlightFor, placeFor } from './notes/edits';
import { renderedRange } from './notes/rendered';
import { authorDate, displayDate } from './notes/syntax';
import { type AnswerRef, isNoteDocument, linesOf, type NoteThreads, problemMessage } from './noteThreads';
import type { SelectedNotes } from './selectedNotes';
import type { Settings } from './settings';

/** notesViewId is the identifier of the side view, which the manifest contributes. */
export const notesViewId = 'nimblescape.markdownNotes.notes';

/**
 * viewCommands are the commands of the side view: the buttons "Add Note" and "Hide Notes" in its title
 * ([R-SIDE-003](../docs/requirements.md#r-side-003)), and "Show or Hide Notes" of the title of the Markdown editors and
 * of the Command Palette ([R-SIDE-006](../docs/requirements.md#r-side-006)).
 */
export const viewCommands = {
  newNote: 'nimblescape.markdownNotes.newNote',
  hide: 'nimblescape.markdownNotes.hideNotes',
  toggle: 'nimblescape.markdownNotes.toggleNotes',
};

/** Message is a message of the script of the view. */
export type Message =
  | { type: 'ready' }
  | { type: 'signIn' }
  | { type: 'reveal'; id: string; focus?: boolean }
  | { type: 'deselect' }
  | { type: 'save'; request: number; id: string; answer: AnswerRef; text: string }
  | { type: 'answer'; request: number; id: string; text: string; parent?: AnswerRef }
  | { type: 'add'; request: number; text: string; color?: string }
  | { type: 'deleteAnswer'; id: string; answer: AnswerRef }
  | { type: 'deleteNote'; id: string }
  | { type: 'color'; id: string; color: string | undefined }
  | { type: 'saveText'; request: number; id: string; text: string; original: string }
  | { type: 'render'; request: number; text: string }
  | { type: 'openLink'; href: string };

/** AnswerState is an answer as the view shows it. */
interface AnswerState {
  author: string;
  /**
   * date is the date in the local time of the reader, and authorDate the date in the local time of the author; written
   * is the date as the file holds it, which names the answer in a message of a change, with its author and its index.
   */
  date: string;
  authorDate: string;
  written: string;
  body: string;
  html: string;
  /** depth is 0 for the first answer, 1 for a reply to it, and so on; parent is the index of the answer that it replies to. */
  depth: number;
  parent: number | undefined;
}

/** ThreadState is a thread as the view shows it. */
interface ThreadState {
  id: string;
  line: number;
  /** color is the color of the note ([R-TEXT-006](../docs/requirements.md#r-text-006)), and colorName its name. */
  color: string;
  colorName: string;
  /** text is the whole text of the note, for its text view. */
  text: string;
  answers: AnswerState[];
}

/** State is the content of the view, which the script shows. */
export interface State {
  type: 'state';
  /** file is the name of the Markdown file, or undefined when no Markdown file was active. */
  file: string | undefined;
  /** line is the index of the line of the cursor in the text editor. */
  line: number | undefined;
  /**
   * highlight is the text that a new note highlights, the selected text of the text editor, shortened; or undefined
   * when the selection holds no text that a note can highlight.
   */
  highlight: string | undefined;
  /** account is the GitHub login of the user, or undefined without a sign-in. */
  account: string | undefined;
  selected: string | undefined;
  threads: ThreadState[];
  /** colors are the colors that "Color" offers, by their names; the first one is the default. */
  colors: { name: string; color: string }[];
}

/** cacheSize is the number of rendered texts that the view keeps. */
const cacheSize = 200;

/** titleLength is the number of characters of the highlighted text in the title of the editor of a new note. */
const titleLength = 60;

/** doubleClickTime is the longest time in milliseconds from the first click of a double click to the second one. */
const doubleClickTime = 500;

/** wordCharacter matches a letter, a digit or an underscore: a character of a word that a double click selects. */
const wordCharacter = /[\p{L}\p{N}_]/u;

/**
 * escapeHtml escapes the characters of a text that HTML reads as markup.
 * @param text - The text.
 */
const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);

/** markdownModes are the types of the custom editors of VS Code for a Markdown file: its modes "Markdown Preview" and "Markdown Editor". */
export const markdownModes = { preview: 'vscode.markdown.preview.editor', editor: 'vscode.markdown.editor' } as const;

/**
 * modeOf returns how the active tab of a group shows a document without a text editor, with the column of the group:
 * in the Markdown preview, which is the preview to the side (`toSide`) or the mode "Markdown Preview" of VS Code, or in
 * the mode "Markdown Editor" of VS Code; undefined for no such tab. VS Code tells an extension the URI of the document
 * of a custom editor, and of the preview to the side the type of its webview and its label, "Preview paper.md", only.
 * @param document - The URI of the document.
 * @param realOf - Returns the file of a clean document, or undefined for another document.
 */
function modeOf(
  document: vscode.Uri,
  realOf: (uri: vscode.Uri) => vscode.Uri | undefined = () => undefined,
): { mode: 'preview' | 'editor'; column: vscode.ViewColumn; toSide: boolean; uri?: vscode.Uri } | undefined {
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
  }
  return undefined;
}

/**
 * CleanMirror is the link of the clean editing view to the files ([R-TEXT-009](../docs/requirements.md#r-text-009)): the file of a clean
 * document, the places of one in the other, and the text editor of the clean document of a file.
 */
export interface CleanMirror {
  realOf(document: vscode.Uri): vscode.Uri | undefined;
  toReal(document: vscode.Uri, position: vscode.Position): vscode.Position | undefined;
  cleanEditorOf(real: vscode.Uri): vscode.TextEditor | undefined;
  toClean(real: vscode.Uri, position: vscode.Position): vscode.Position | undefined;
}

/**
 * previewTextMissing is the message for text of the Markdown preview that the view did not find in the file, such as a
 * formula, which the preview shows in another form.
 */
export const previewTextMissing =
  'The note was not added: the selected text of the preview was not found in the Markdown text. Select the text in the text editor, then choose "Add Note" again.';

/** NotesView is the provider of the side view. */
export class NotesView implements vscode.WebviewViewProvider, vscode.Disposable {
  private view: vscode.WebviewView | undefined;
  /** document is the Markdown document that the view shows: the last active one. */
  private document: vscode.Uri | undefined;
  /** selected is the identifier of the selected thread. */
  private selected: string | undefined;
  /** lines holds the line of the cursor of each document, by its URI. */
  private readonly lines = new Map<string, number>();
  /** atCursor holds the identifier of the thread of the note at the cursor of each document, by its URI. */
  private readonly atCursor = new Map<string, string | undefined>();
  /**
   * cursor is the last cursor of a text editor without selected text: its document, its place, its time, and whether a
   * click with the mouse put it there.
   */
  private cursor: { document: string; position: vscode.Position; time: number; click: boolean } | undefined;
  /** clean is whether the view follows a text editor of the clean editing view, whose lines the threads name. */
  private clean = false;
  /** selections holds the selection of the text editor of each document, by its URI, for "Add Note". */
  private readonly selections = new Map<string, vscode.Range>();
  /** rendered holds the HTML of rendered texts, by the text. */
  private readonly rendered = new Map<string, string>();
  /** version counts the states, so that only the newest one reaches the view. */
  private version = 0;
  /** ready tells whether the script of the view started and receives messages. */
  private ready = false;
  /** newPending tells whether "Add Note" waits for a script that did not start yet. */
  private newPending = false;
  /**
   * account is the GitHub login of the user that the view shows, read once for each change of the sessions: VS Code can
   * take seconds for a session, and the view shows each selected note at once.
   */
  private account: Promise<string | undefined> | undefined;
  private readonly registrations: vscode.Disposable[];

  /**
   * @param extensionUri - The folder of the extension, which holds the script and the styles of the view.
   * @param threads - The threads of the notes, whose operations the view uses.
   * @param login - Returns the GitHub login of the user; with signIn true after asking for a sign-in.
   * @param render - Renders a Markdown text as the Markdown preview does.
   * @param settingsOf - Returns the settings of a document.
   * @param chosen - The selected note of each document, which the view sets.
   * @param mirror - The link of the clean editing view (R-TEXT-009), whose text editor shows the notes of its file.
   */
  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly threads: NoteThreads,
    private readonly login: (signIn: boolean) => Promise<string | undefined>,
    private readonly render: (text: string) => Promise<string>,
    private readonly settingsOf: (document: vscode.Uri | undefined) => Settings,
    private readonly chosen: SelectedNotes,
    private readonly mirror?: CleanMirror,
  ) {
    this.registrations = [
      vscode.window.onDidChangeActiveTextEditor((editor) => this.follow(editor)),
      vscode.window.tabGroups.onDidChangeTabs(() => this.followTab()),
      vscode.window.tabGroups.onDidChangeTabGroups(() => this.followTab()),
      vscode.window.onDidChangeTextEditorSelection((event) => this.follow(event.textEditor, event.kind === vscode.TextEditorSelectionChangeKind.Mouse)),
      threads.onDidChange((document) => {
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
      vscode.commands.registerCommand(viewCommands.hide, () => this.hide()),
      vscode.commands.registerCommand(viewCommands.toggle, () => (this.view?.visible ? this.hide() : vscode.commands.executeCommand(`${notesViewId}.focus`))),
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
    view.webview.options = { enableScripts: true, localResourceRoots: [media] };
    view.webview.html = this.html(view.webview, media);
    view.webview.onDidReceiveMessage((message: Message) => this.receive(message));
    // The extension can start while VS Code opens a file in a mode of its own, after the change of the tabs.
    this.followTab();
    view.onDidChangeVisibility(() => {
      if (view.visible) {
        this.followTab();
        void this.refresh();
      }
    });
    view.onDidDispose(() => {
      if (this.view === view) {
        this.view = undefined;
        this.ready = false;
      }
    });
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
    this.select(document, this.threads.entryAt(document, { line, character: 0 })?.id ?? this.selected);
    await this.refresh();
  }

  /**
   * show opens the view with the note at a line of a document, for a double click on its highlight in the preview.
   * @param document - The URI of the document.
   * @param line - The index of a line of the note.
   */
  async show(document: vscode.Uri, line: number): Promise<void> {
    this.document = document;
    this.select(document, this.threads.entryAt(document, { line, character: 0 })?.id ?? this.selected);
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
    const real = this.mirror?.realOf(rendered.uri);
    const file = real ? vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === real.toString()) : rendered;
    if (!file || !isNoteDocument(file)) {
      return;
    }
    const range = renderedRange(linesOf(rendered), line, before, text);
    if (!range) {
      void vscode.window.showInformationMessage(previewTextMissing);
      return;
    }
    const place = (position: { line: number; character: number }): vscode.Position | undefined => {
      const at = new vscode.Position(position.line, position.character);
      return real ? this.mirror!.toReal(rendered.uri, at) : at;
    };
    const start = place(range.start);
    const end = place(range.end);
    if (!start || !end || highlightFor(linesOf(file), new vscode.Range(start, end), this.threads.textReadingOf(file)) === undefined) {
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
      await this.view?.webview.postMessage({ type: 'line', line: start.line, highlight: this.highlightOf(file.uri) });
    }
    await this.newNote();
  }

  /**
   * newNote opens the editor of a new note in the view, for the selected text of the text editor, in the default color,
   * which the editor changes. Without selected text it opens nothing and tells the user to select text (Hannes,
   * 2026-10-28: "there shall be no way to add a note without highlighting text"). It ignores the arguments, such as the
   * URI that a menu of VS Code passes.
   */
  private async newNote(): Promise<void> {
    const document = this.document;
    const selection = document && this.selections.get(document.toString());
    if (!selection || selection.isEmpty) {
      void vscode.window.showInformationMessage(problemMessage({ kind: 'noText' }));
      return;
    }
    if (!this.view?.visible) {
      await vscode.commands.executeCommand(`${notesViewId}.focus`);
    }
    if (this.ready) {
      await this.view?.webview.postMessage({ type: 'new' });
    } else {
      // The script of a view that opens just now gets the request when it starts.
      this.newPending = true;
    }
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
    this.selected = id;
    const entry = id === undefined ? undefined : this.threads.entriesOf(document).find((candidate) => candidate.id === id);
    this.chosen.select(document, entry?.note.label, reveal);
  }

  /**
   * followTab makes the document of the active tab the document of the view, when the tab shows it in the mode
   * "Markdown Preview" or "Markdown Editor" of VS Code, which are no text editors. The selected note of the document
   * stays selected.
   */
  private followTab(): void {
    const input = vscode.window.tabGroups.activeTabGroup?.activeTab?.input as { viewType?: unknown; uri?: vscode.Uri } | undefined;
    const modes: readonly unknown[] = Object.values(markdownModes);
    // A mode of the clean editing view shows the notes of its file (R-TEXT-009).
    const real = input?.uri && this.mirror?.realOf(input.uri);
    const document = real ?? input?.uri;
    if (!document || !modes.includes(input?.viewType) || (document.toString() === this.document?.toString() && (real !== undefined) === this.clean)) {
      return;
    }
    this.document = document;
    this.clean = real !== undefined;
    const label = this.chosen.labelOf(document);
    this.select(document, this.threads.entriesOf(document).find((entry) => entry.note.label === label)?.id);
    void this.refresh();
  }

  /**
   * doubleClicked tells whether a change of the selection of a text editor with the mouse is the second click of a
   * double click, and returns the place of the cursor before it. VS Code tells an extension no double click: it reports
   * the first click as a cursor without selected text, unless the cursor stood there, and the second click as the
   * selected word at that place. A drag of the mouse and a click with Shift select text from the cursor, so a word around
   * the cursor is the word of a double click; a word that starts or ends at the cursor is one only soon after a click.
   * @param editor - The text editor.
   * @param click - Whether the mouse changed the selection.
   */
  private doubleClicked(editor: vscode.TextEditor, click: boolean): vscode.Position | undefined {
    const last = this.cursor;
    const key = editor.document.uri.toString();
    const { selection } = editor;
    this.cursor = selection.isEmpty ? { document: key, position: selection.active, time: Date.now(), click } : undefined;
    if (!click || !last || last.document !== key || selection.isEmpty || !selection.isSingleLine || last.position.line !== selection.start.line) {
      return undefined;
    }
    const { start, end } = selection;
    const at = last.position.character;
    const around = start.character < at && at < end.character;
    const atEdge = (at === start.character || at === end.character) && last.click && Date.now() - last.time <= doubleClickTime;
    if (!around && !atEdge) {
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
   * is in it, and the cursor that leaves it deselects it (Hannes, 2026-10-29: "moving the cursor into a highlight shows
   * the highlight but keeps it selected when the cursor goes out of it again"); a click with the mouse outside the notes
   * deselects the selected note (Hannes, 2026-10-28: "clicking somewhere in the text shall deselect the selected
   * note"). A move of the cursor with the keys outside the notes keeps a note that the user chose in the view. A double
   * click on the highlight of the selected note opens the view (Hannes, 2026-10-29: "only a double click on a selected
   * highlight shall open the side view").
   * @param editor - The text editor, or undefined.
   * @param click - Whether a click with the mouse moved the cursor.
   */
  private follow(editor: vscode.TextEditor | undefined, click = false): void {
    // A text editor of the clean editing view shows the notes of its file, at the places in the file.
    const real = editor && this.mirror?.realOf(editor.document.uri);
    if (!editor || (!real && !isNoteDocument(editor.document))) {
      return;
    }
    const place = (position: vscode.Position): vscode.Position => (real ? (this.mirror!.toReal(editor.document.uri, position) ?? position) : position);
    const document = real ?? editor.document.uri;
    // The word of a double click can end at the end of a highlight, outside the note; the place of the click names it.
    const doubleClick = this.doubleClicked(editor, click);
    const active = place(doubleClick ?? editor.selection.active);
    const line = active.line;
    this.lines.set(document.toString(), line);
    this.selections.set(document.toString(), new vscode.Range(place(editor.selection.start ?? editor.selection.active), place(editor.selection.end ?? editor.selection.active)));
    const changed = document.toString() !== this.document?.toString() || (real !== undefined) !== this.clean;
    this.clean = real !== undefined;
    // The position, not only the line, names the note, because the selections of several notes can share a line.
    const entry = this.threads.entryAt(document, active);
    const selected = entry?.id;
    const left = this.atCursor.get(document.toString()) === this.selected && this.selected !== undefined;
    this.atCursor.set(document.toString(), selected);
    this.document = document;
    if (changed || (selected !== undefined && selected !== this.selected) || ((click || left) && selected === undefined && this.selected !== undefined)) {
      this.select(document, selected);
      void this.refresh();
    } else {
      void this.view?.webview.postMessage({ type: 'line', line, highlight: this.highlightOf(document) });
    }
    const inSelection = entry?.note.selection !== undefined && !(entry.note.start.line <= active.line && active.line <= entry.note.end.line);
    if (doubleClick && inSelection) {
      void this.open();
    }
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

  /**
   * html returns the page of the view: its styles and its script, with a policy that allows no other script and no
   * other style, also no style attribute; the script sets its styles through the CSS object model, which the policy
   * allows.
   * @param webview - The webview of the view.
   * @param media - The folder of the script and the styles.
   */
  private html(webview: vscode.Webview, media: vscode.Uri): string {
    const nonce = globalThis.crypto.randomUUID().replace(/-/g, '');
    const script = webview.asWebviewUri(vscode.Uri.joinPath(media, 'notesView.js'));
    const styles = webview.asWebviewUri(vscode.Uri.joinPath(media, 'notesView.css'));
    const policy = `default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';`;
    return [
      '<!DOCTYPE html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="UTF-8">',
      `<meta http-equiv="Content-Security-Policy" content="${policy}">`,
      '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
      `<link rel="stylesheet" href="${styles.toString()}">`,
      '<title>Notes</title>',
      '</head>',
      '<body>',
      '<main id="notes"></main>',
      `<script nonce="${nonce}" src="${script.toString()}"></script>`,
      '</body>',
      '</html>',
    ].join('\n');
  }

  /**
   * renderHtml renders a Markdown text, once for each text. A text that the preview cannot render shows as it is.
   * @param text - The Markdown text.
   */
  private async renderHtml(text: string): Promise<string> {
    let html = this.rendered.get(text);
    if (html === undefined) {
      html = await this.render(text).catch(() => `<pre>${escapeHtml(text)}</pre>`);
      if (this.rendered.size >= cacheSize) {
        this.rendered.clear();
      }
      this.rendered.set(text, html);
    }
    return html;
  }

  /** settingsChanged shows the view again after a change of the settings of the extension. */
  settingsChanged(): void {
    void this.refresh();
  }

  /**
   * highlightOf returns the text that a new note highlights for the selection of the text editor of a document: the text
   * from its start marker to its reference, without the markers and references of other notes, on one line and
   * shortened; or undefined when the selection holds no text that a note can highlight.
   * @param document - The URI of the document.
   */
  private highlightOf(document: vscode.Uri): string | undefined {
    const range = this.selections.get(document.toString());
    const open = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === document.toString());
    if (!range || range.isEmpty || !open) {
      return undefined;
    }
    const lines = linesOf(open);
    const place = placeFor(lines, range, this.threads.textReadingOf(open));
    if (!place) {
      return undefined;
    }
    const text = open
      .getText(new vscode.Range(place.marker.line, place.marker.character, place.reference.line, place.reference.character))
      .replace(hiddenText, '')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > titleLength ? `${text.slice(0, titleLength - 1).trimEnd()}…` : text;
  }

  /** state returns the content of the view. */
  async state(): Promise<State> {
    const document = this.document;
    const entries = document ? this.threads.entriesOf(document) : [];
    /**
     * lineOf returns the line that the view names for a note: the line of its definition in the text editor, and the
     * line of the start of its highlight in the clean editing view, which shows no definition.
     * @param note - The note.
     */
    const lineOf = (note: (typeof entries)[number]['note']): number => {
      const place = note.selection?.start ?? note.start;
      const clean = this.clean && document ? this.mirror?.toClean(document, new vscode.Position(place.line, place.character)) : undefined;
      return clean?.line ?? note.start.line;
    };
    const threads = await Promise.all(
      entries.map(async ({ id, note, text }) => ({
        id,
        line: lineOf(note),
        color: colorOf(note),
        colorName: colorNames[colorIndexOf(note)],
        text,
        answers: await Promise.all(
          note.answers.map(
            async (answer): Promise<AnswerState> => ({
              author: answer.author,
              date: displayDate(answer.date),
              authorDate: authorDate(answer.date),
              written: answer.date,
              body: answer.body,
              html: await this.renderHtml(answer.body),
              depth: answer.depth,
              parent: answer.parent,
            }),
          ),
        ),
      })),
    );
    return {
      type: 'state',
      file: document?.path.split('/').pop(),
      line: document ? this.lines.get(document.toString()) : undefined,
      highlight: document && this.highlightOf(document),
      account: await (this.account ??= this.login(false)),
      selected: entries.some((entry) => entry.id === this.selected) ? this.selected : undefined,
      threads,
      colors: colorNames.map((name, index) => ({ name, color: noteColors[index] })),
    };
  }

  /** refresh sends the content of the view to its script, when the view is open. */
  private async refresh(): Promise<void> {
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
   * reveal shows a note in the text editor of its document, with the cursor at the start of its highlight or of the
   * note.
   * @param id - The identifier of the thread of the note.
   * @param focus - Whether the text editor gets the focus; a click on a thread leaves the focus in the view.
   */
  private async reveal(id: string, focus: boolean): Promise<void> {
    const uri = this.document;
    const entry = uri ? this.threads.entriesOf(uri).find((candidate) => candidate.id === id) : undefined;
    if (!uri || !entry) {
      return;
    }
    const column = vscode.window.visibleTextEditors.find((editor) => editor.document.uri.toString() === uri.toString())?.viewColumn;
    const shown = column === undefined ? modeOf(uri, (tab) => this.mirror?.realOf(tab)) : undefined;
    if (shown?.mode === 'preview') {
      // The preview keeps its place in the editor area and scrolls to the note.
      this.select(uri, id, true);
      await this.refresh();
      return;
    }
    // The view shows the thread selected at once: the cursor at the start of the highlight in a clean editing view stands
    // before the hidden start marker, outside the note, and keeps the selected note without a new state of the view.
    this.select(uri, id);
    void this.refresh();
    const place = entry.note.selection?.start ?? entry.note.start;
    const start = new vscode.Position(place.line, place.character);
    const clean = this.mirror?.cleanEditorOf(uri);
    if (clean) {
      const at = this.mirror!.toClean(uri, start) ?? start;
      await vscode.window.showTextDocument(clean.document, { viewColumn: clean.viewColumn, selection: new vscode.Range(at, at), preserveFocus: !focus });
      return;
    }
    if (shown?.mode === 'editor') {
      // The mode "Markdown Editor" stays, and selects the selection of the note, because it shows no note.
      const end = entry.note.selection ? new vscode.Position(entry.note.selection.end.line, entry.note.selection.end.character) : start;
      const target = shown.uri ?? uri;
      const place = (position: vscode.Position): vscode.Position => (target === uri ? position : (this.mirror?.toClean(uri, position) ?? position));
      await vscode.commands.executeCommand('vscode.openWith', target, markdownModes.editor, { viewColumn: shown.column, selection: new vscode.Range(place(start), place(end)), preserveFocus: !focus });
      return;
    }
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, { viewColumn: column, selection: new vscode.Range(start, start), preserveFocus: !focus });
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
          this.newPending = false;
          await this.view?.webview.postMessage({ type: 'new' });
        }
        return;
      case 'signIn':
        await this.login(true);
        this.account = undefined;
        await this.refresh();
        return;
      case 'render':
        await this.view?.webview.postMessage({ type: 'rendered', request: message.request, html: await this.renderHtml(message.text) });
        return;
      case 'reveal':
        await this.reveal(message.id, message.focus ?? true);
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
        await this.reply(message.request, await this.threads.saveAnswer(document, message.id, message.answer, message.text));
        return;
      case 'answer':
        await this.reply(message.request, await this.threads.answer(document, message.id, message.text, undefined, message.parent));
        return;
      case 'add': {
        const line = this.lines.get(document.toString()) ?? 0;
        const range = this.selections.get(document.toString()) ?? new vscode.Range(line, 0, line, 0);
        const result = await this.threads.addNote(document, range, message.text, colorNames.find((name) => name === message.color));
        if ('id' in result) {
          this.select(document, result.id);
          await this.refresh();
        }
        await this.reply(message.request, 'problem' in result ? result.problem : undefined);
        return;
      }
      case 'saveText':
        await this.reply(message.request, await this.threads.saveNoteText(document, message.id, message.text, message.original));
        return;
      case 'color':
      case 'deleteAnswer':
      case 'deleteNote': {
        const problem =
          message.type === 'color'
            ? await this.threads.colorNote(document, message.id, message.color)
            : message.type === 'deleteAnswer'
              ? await this.threads.deleteAnswer(document, message.id, message.answer)
              : await this.threads.deleteNote(document, message.id);
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
