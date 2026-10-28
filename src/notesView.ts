// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The side view "Notes", the note editor of the extension
 * ([R-SIDE-001](../docs/requirements.md#r-side-001) to
 * [R-SIDE-003](../docs/requirements.md#r-side-003)). It is a webview view in
 * the secondary side bar, beside the chat of VS Code, that lists the threads of the active Markdown file, each with
 * its answers rendered as Markdown, with author and date. It selects the
 * thread at the cursor of the text editor, or the thread whose icon the user
 * clicked in the preview ([R-PREV-003](../docs/requirements.md#r-prev-003)).
 *
 * The view shows the answers of a thread as a tree: each reply after the
 * answer that it replies to, and the replies to a reply indented below it
 * ([R-NOTE-004](../docs/requirements.md#r-note-004)). The date of an answer
 * shows in the local time of the reader, with the local time of the author as
 * its tooltip ([R-NOTE-002](../docs/requirements.md#r-note-002)). Each answer
 * has the buttons "Reply", "Edit" and "Delete", each thread the buttons
 * "Answer", a reply to the note, and "Delete Thread", and the view the button
 * "Add Note", which adds a note at the selection or the line of the cursor of
 * the text editor. The editor of a text has
 * the tabs "Write" and "Preview"; the preview renders the text with the
 * Markdown preview of VS Code. A click on a link of a rendered text opens the
 * link ([src/links.ts](links.ts)). The view writes through the operations of the
 * threads of the text editor ([src/noteThreads.ts](noteThreads.ts)), so both
 * check and write a text in the same way. The script of the view is
 * [media/notesView.js](../media/notesView.js); it gets the state of the view
 * from this module and sends the actions of the user back.
 *
 * Each thread shows the badge with the number and the color of its note, and
 * a click on a thread selects its note in the text editor
 * ([R-SIDE-007](../docs/requirements.md#r-side-007)). The left edge of the
 * view, next to the text editor, has a strip that stands for the whole file,
 * with a mark for each note, or for the lines of its selection, and the part
 * of the file that the text editor shows. A funnel leads from the selected
 * thread to the passage of its note (decision 12): to the end of the band that
 * a Markdown preview of the file draws from the passage, else to the rows of
 * the passage in the text editor ([src/editorLayout.ts](editorLayout.ts)), and
 * else to the mark of its note. The setting `showFunnels` and the buttons
 * "Show Funnels" and "Hide Funnels" in the title of the view show and hide
 * them. The position of the cursor, not only its line, selects the thread,
 * because the selections of several notes can share a line. The text editor
 * and the Markdown preview show the selection of the note of the selected
 * thread with a strong highlight and a frame ([src/selectedNotes.ts](selectedNotes.ts)).
 *
 * A click with the mouse on a selection in the text editor selects its thread
 * and opens the view when it is closed. A click on a thread while the
 * Markdown preview shows the file and no text editor does keeps the preview,
 * which scrolls to the note (Hannes, 2026-10-28: the editor area stays in its
 * mode).
 */

import * as vscode from 'vscode';
import { columnsOf, type EditorLayout, placeOf } from './editorLayout';
import { githubProvider } from './github';
import { openLink } from './links';
import { colorOf } from './notes/colors';
import { authorDate, displayDate } from './notes/syntax';
import { isNoteDocument, type NoteThreads, problemMessage } from './noteThreads';
import type { SelectedNotes } from './selectedNotes';
import { type Settings, showsInSideView } from './settings';

/** notesViewId is the identifier of the side view, which the manifest contributes. */
export const notesViewId = 'nimblescape.markdownNotes.notes';

/**
 * viewCommands are the commands of the side view: the button "Hide Notes" in its title, and "Show or Hide Notes" of the
 * title of the Markdown editors and of the Command Palette ([R-SIDE-006](../docs/requirements.md#r-side-006)).
 */
export const viewCommands = {
  hide: 'nimblescape.markdownNotes.hideNotes',
  toggle: 'nimblescape.markdownNotes.toggleNotes',
  showFunnels: 'nimblescape.markdownNotes.showFunnels',
  hideFunnels: 'nimblescape.markdownNotes.hideFunnels',
};

/** Message is a message of the script of the view. */
export type Message =
  | { type: 'ready' }
  | { type: 'size'; height: number }
  | { type: 'signIn' }
  | { type: 'reveal'; id: string; focus?: boolean }
  | { type: 'deselect' }
  | { type: 'save'; request: number; id: string; index: number; text: string }
  | { type: 'answer'; request: number; id: string; text: string; parent?: number }
  | { type: 'add'; request: number; text: string }
  | { type: 'deleteAnswer'; id: string; index: number }
  | { type: 'deleteNote'; id: string }
  | { type: 'render'; request: number; text: string }
  | { type: 'openLink'; href: string };

/** AnswerState is an answer as the view shows it. */
interface AnswerState {
  author: string;
  /** date is the date in the local time of the reader, and authorDate the date in the local time of the author. */
  date: string;
  authorDate: string;
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
  /** number is the number of the note in the file, from 1, and color its color ([R-TEXT-006](../docs/requirements.md#r-text-006)). */
  number: number;
  color: string;
  /** mark is the first and the last line of the mark of the note in the strip: its selection, or the note itself. */
  mark: [number, number];
  answers: AnswerState[];
}

/** Visible is the part of the file that the text editor shows: its first and its last line, and the number of lines. */
interface Visible {
  /** lines are the first and the last visible line, or undefined while no text editor shows the file. */
  lines: [number, number] | undefined;
  lineCount: number;
  /**
   * start is the top and the bottom of the start of the funnel of the selected thread at the left edge of the view, in
   * pixels from its top: the end of the band of the preview, or the rows of the passage in the text editor; undefined
   * for the mark of the note in the strip.
   */
  start: [number, number] | undefined;
}

/** State is the content of the view, which the script shows. */
export interface State {
  type: 'state';
  /** file is the name of the Markdown file, or undefined when no Markdown file was active. */
  file: string | undefined;
  /** line is the index of the line of the cursor in the text editor, at which "Add Note" adds a note. */
  line: number | undefined;
  /** account is the GitHub login of the user, or undefined without a sign-in. */
  account: string | undefined;
  selected: string | undefined;
  threads: ThreadState[];
  /** funnels tells whether the view shows the strip and the funnels. */
  funnels: boolean;
  visible: Visible;
}

/** cacheSize is the number of rendered texts that the view keeps. */
const cacheSize = 200;

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
 */
function modeOf(document: vscode.Uri): { mode: 'preview' | 'editor'; column: vscode.ViewColumn; toSide: boolean } | undefined {
  const name = document.path.split('/').pop() ?? '';
  for (const group of vscode.window.tabGroups.all) {
    const tab = group.activeTab;
    const input = tab?.input as { viewType?: unknown; uri?: vscode.Uri } | undefined;
    const viewType = typeof input?.viewType === 'string' ? input.viewType : '';
    const own = input?.uri?.toString() === document.toString();
    if (own && viewType === markdownModes.preview) {
      return { mode: 'preview', column: group.viewColumn, toSide: false };
    }
    if (viewType.includes('markdown.preview') && input?.uri === undefined && tab!.label.includes(name)) {
      return { mode: 'preview', column: group.viewColumn, toSide: true };
    }
    if (own && viewType === markdownModes.editor) {
      return { mode: 'editor', column: group.viewColumn, toSide: false };
    }
  }
  return undefined;
}

/**
 * meeting is the end of the band of the preview from the passage of the selected note to the right edge of the preview:
 * its top and its bottom in pixels from the top of the preview. The funnel of the side view starts there, so that both
 * meet at the top, where the selected thread stands (decision 12 of Hannes, 2026-10-28: "Preview draws its part").
 */
export const meeting: readonly [number, number] = [8, 28];

/**
 * workbench holds sizes of the window of VS Code in pixels, measured in VS Code 1.143 with its default settings: the
 * height of the bar of the tabs and of the breadcrumbs, the top of the page of the side view below the top of the bar of
 * the tabs, and the bottom of the text of a text editor below the bottom of the page of the side view. VS Code tells an
 * extension no place of a part of the window.
 */
const workbench = { tabs: 32, breadcrumbs: 22, viewTop: 28, editorBottom: 9 };

/**
 * topOf returns the top of the content of an editor in pixels from the top of the page of the side view, which stands
 * at the same height of the window: a text editor and the mode "Markdown Preview" below the bar of the tabs and the
 * breadcrumbs, the preview to the side below the bar of the tabs.
 * @param toSide - Whether the editor is the preview to the side.
 */
function topOf(toSide: boolean): number {
  const tabs = vscode.workspace.getConfiguration('workbench.editor').get<unknown>('showTabs');
  const breadcrumbs = vscode.workspace.getConfiguration('breadcrumbs').get<boolean>('enabled') ?? true;
  return (tabs === 'none' || tabs === false ? 0 : workbench.tabs) + (breadcrumbs && !toSide ? workbench.breadcrumbs : 0) - workbench.viewTop;
}

/**
 * lineHeightOf returns the height of a row of a text editor in pixels, as VS Code computes it from the settings
 * `editor.fontSize` and `editor.lineHeight`.
 * @param configuration - The settings `editor` of the document.
 */
function lineHeightOf(configuration: vscode.WorkspaceConfiguration): number {
  const mac = process.platform === 'darwin';
  const fontSize = configuration.get<number>('fontSize') ?? (mac ? 12 : 14);
  const lineHeight = configuration.get<number>('lineHeight') ?? 0;
  const height = lineHeight === 0 ? fontSize * (mac ? 1.5 : 1.35) : lineHeight < 8 ? fontSize * lineHeight : lineHeight;
  return Math.max(8, Math.round(height));
}

/**
 * wrapOf returns how a text editor wraps its lines, from the settings `editor.wordWrap` and `editor.wordWrapColumn`.
 * @param configuration - The settings `editor` of the document.
 */
function wrapOf(configuration: vscode.WorkspaceConfiguration): Pick<EditorLayout, 'wrap' | 'bound'> {
  const column = configuration.get<number>('wordWrapColumn') ?? 80;
  switch (configuration.get<string>('wordWrap')) {
    case 'on':
      return { wrap: undefined };
    case 'bounded':
      return { wrap: undefined, bound: column };
    case 'wordWrapColumn':
      return { wrap: column };
    default:
      return { wrap: Infinity };
  }
}

/** NotesView is the provider of the side view. */
export class NotesView implements vscode.WebviewViewProvider, vscode.Disposable {
  private view: vscode.WebviewView | undefined;
  /** document is the Markdown document that the view shows: the last active one. */
  private document: vscode.Uri | undefined;
  /** selected is the identifier of the selected thread. */
  private selected: string | undefined;
  /** lines holds the line of the cursor of each document, by its URI. */
  private readonly lines = new Map<string, number>();
  /** selections holds the selection of the text editor of each document, by its URI, for "Add Note". */
  private readonly selections = new Map<string, vscode.Range>();
  /** rendered holds the HTML of rendered texts, by the text. */
  private readonly rendered = new Map<string, string>();
  /** version counts the states, so that only the newest one reaches the view. */
  private version = 0;
  /** height is the height of the page of the view in pixels, which its script tells. */
  private height: number | undefined;
  /** columns holds the estimated number of columns of the rows of the text editor of each document, by its URI. */
  private readonly columns = new Map<string, number>();
  /** shownListeners are the listeners of the changes of the visibility of the view. */
  private readonly shownListeners = new Set<() => void>();
  private readonly registrations: vscode.Disposable[];

  /**
   * @param extensionUri - The folder of the extension, which holds the script and the styles of the view.
   * @param threads - The threads of the notes, whose operations the view uses.
   * @param login - Returns the GitHub login of the user; with signIn true after asking for a sign-in.
   * @param render - Renders a Markdown text as the Markdown preview does.
   * @param settingsOf - Returns the settings of a document.
   * @param chosen - The selected note of each document, which the view sets.
   */
  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly threads: NoteThreads,
    private readonly login: (signIn: boolean) => Promise<string | undefined>,
    private readonly render: (text: string) => Promise<string>,
    private readonly settingsOf: (document: vscode.Uri | undefined) => Settings,
    private readonly chosen: SelectedNotes,
  ) {
    this.registrations = [
      vscode.window.onDidChangeActiveTextEditor((editor) => this.follow(editor)),
      vscode.window.tabGroups.onDidChangeTabs(() => {
        this.followTab();
        this.postVisible();
      }),
      vscode.window.tabGroups.onDidChangeTabGroups(() => {
        this.followTab();
        this.postVisible();
      }),
      vscode.window.onDidChangeTextEditorSelection((event) => this.follow(event.textEditor, event.kind === vscode.TextEditorSelectionChangeKind.Mouse)),
      vscode.window.onDidChangeTextEditorVisibleRanges((event) => {
        if (event.textEditor.document.uri.toString() === this.document?.toString()) {
          this.postVisible();
        }
      }),
      threads.onDidChange((document) => {
        if (document.toString() === this.document?.toString()) {
          void this.refresh();
        }
      }),
      vscode.authentication.onDidChangeSessions((event) => {
        if (event.provider.id === githubProvider) {
          void this.refresh();
        }
      }),
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
      this.shownListeners.forEach((listener) => listener());
    });
    view.onDidDispose(() => {
      if (this.view === view) {
        this.view = undefined;
      }
    });
  }

  /**
   * show opens the view with the note at a line of a document, for a click on its icon in the preview.
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
   * deselect deselects the selected note of a document, for a click on the text of the preview outside the passage of
   * the note.
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
    const document = input?.uri;
    if (!document || !modes.includes(input.viewType) || document.toString() === this.document?.toString()) {
      return;
    }
    this.document = document;
    const label = this.chosen.labelOf(document);
    this.select(document, this.threads.entriesOf(document).find((entry) => entry.note.label === label)?.id);
    void this.refresh();
  }

  /**
   * follow makes the document of a text editor the document of the view, and selects the note at its cursor. Another
   * editor, for example the preview, keeps the document of the view. A click with the mouse on a selection of a note
   * opens the view when it is closed, and a click with the mouse outside the notes deselects the selected note (Hannes,
   * 2026-10-28: "clicking somewhere in the text shall deselect the selected note"); a move of the cursor with the keys
   * keeps it.
   * @param editor - The text editor, or undefined.
   * @param click - Whether a click with the mouse moved the cursor.
   */
  private follow(editor: vscode.TextEditor | undefined, click = false): void {
    if (!editor || !isNoteDocument(editor.document)) {
      return;
    }
    const document = editor.document.uri;
    const line = editor.selection.active.line;
    this.lines.set(document.toString(), line);
    const { active } = editor.selection;
    this.selections.set(document.toString(), new vscode.Range(editor.selection.start ?? active, editor.selection.end ?? active));
    const changed = document.toString() !== this.document?.toString();
    // The position, not only the line, names the note, because the selections of several notes can share a line.
    const entry = this.threads.entryAt(document, active);
    const selected = entry?.id;
    this.document = document;
    if (changed || (selected !== undefined && selected !== this.selected) || (click && selected === undefined && this.selected !== undefined)) {
      this.select(document, selected);
      void this.refresh();
    } else {
      void this.view?.webview.postMessage({ type: 'line', line });
    }
    const inSelection = entry?.note.selection !== undefined && !(entry.note.start.line <= active.line && active.line <= entry.note.end.line);
    if (click && inSelection && !this.view?.visible && showsInSideView(this.settingsOf(document))) {
      void this.open();
    }
  }

  /**
   * open opens the view and gives the focus back to the text editor.
   */
  private async open(): Promise<void> {
    if (this.view) {
      this.view.show(true);
      return;
    }
    await vscode.commands.executeCommand(`${notesViewId}.focus`);
    await vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
  }

  /**
   * html returns the page of the view: its styles and its script, with a policy that allows no other script.
   * @param webview - The webview of the view.
   * @param media - The folder of the script and the styles.
   */
  private html(webview: vscode.Webview, media: vscode.Uri): string {
    const nonce = globalThis.crypto.randomUUID().replace(/-/g, '');
    const script = webview.asWebviewUri(vscode.Uri.joinPath(media, 'notesView.js'));
    const styles = webview.asWebviewUri(vscode.Uri.joinPath(media, 'notesView.css'));
    const policy = `default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';`;
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

  /**
   * visible returns the part of the document of the view that its text editor shows, the first visible text editor of
   * the document.
   */
  private visible(): Visible {
    const uri = this.document?.toString();
    const editor = vscode.window.visibleTextEditors.find((candidate) => candidate.document.uri.toString() === uri);
    const document = editor?.document ?? vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === uri);
    const ranges = editor?.visibleRanges ?? [];
    return {
      lines: ranges.length > 0 ? [ranges[0].start.line, ranges[ranges.length - 1].end.line] : undefined,
      lineCount: document?.lineCount ?? 1,
      start: this.startOf(editor),
    };
  }

  /**
   * startOf returns the start of the funnel of the selected thread ([R-SIDE-007](../docs/requirements.md#r-side-007)):
   * the end of the band of a Markdown preview of the document, which draws the band from the passage; else the rows of
   * the passage in the text editor of the document, an estimate when the editor wraps its lines at its width; undefined
   * while the editor shows no row of the passage, so that the funnel starts at the mark in the strip.
   * @param editor - The first visible text editor of the document, or undefined.
   */
  private startOf(editor: vscode.TextEditor | undefined): [number, number] | undefined {
    const document = this.document;
    const entry = document && this.selected !== undefined ? this.threads.entriesOf(document).find((candidate) => candidate.id === this.selected) : undefined;
    if (!document || !entry || this.height === undefined) {
      return undefined;
    }
    const mode = modeOf(document);
    if (mode?.mode === 'preview') {
      const top = topOf(mode.toSide);
      return [meeting[0] + top, meeting[1] + top];
    }
    if (!editor) {
      return undefined;
    }
    const configuration = vscode.workspace.getConfiguration('editor', editor.document);
    const top = topOf(false) + (configuration.get<{ top?: number }>('padding')?.top ?? 0);
    const layout: EditorLayout = {
      ranges: editor.visibleRanges,
      lineHeight: lineHeightOf(configuration),
      top,
      height: Math.max(this.height + workbench.editorBottom - top, 0),
      ...wrapOf(configuration),
      lineCount: editor.document.lineCount,
    };
    const lineAt = (line: number): string => editor.document.lineAt(line).text;
    const key = document.toString();
    const columns = columnsOf(layout, lineAt, this.columns.get(key));
    this.columns.set(key, columns);
    const { note } = entry;
    return placeOf(layout, lineAt, columns, note.selection ?? { start: note.start, end: note.end });
  }

  /** postVisible sends the visible part of the file and the start of the funnel to the script of the view. */
  private postVisible(): void {
    void this.view?.webview.postMessage({ type: 'visible', visible: this.visible() });
  }

  /**
   * onDidChangeShown adds a listener of the changes of the visibility of the view, after which the preview draws or
   * removes its band.
   * @param listener - The listener.
   */
  onDidChangeShown(listener: () => void): vscode.Disposable {
    this.shownListeners.add(listener);
    return { dispose: () => this.shownListeners.delete(listener) };
  }

  /** shown tells whether the view is visible. */
  get shown(): boolean {
    return this.view?.visible ?? false;
  }

  /** settingsChanged shows the view again after a change of the settings, for the setting showFunnels. */
  settingsChanged(): void {
    void this.refresh();
  }

  /** state returns the content of the view. */
  async state(): Promise<State> {
    const document = this.document;
    const entries = document ? this.threads.entriesOf(document) : [];
    const threads = await Promise.all(
      entries.map(async ({ id, note }, index) => ({
        id,
        line: note.start.line,
        number: index + 1,
        color: colorOf(index + 1),
        mark: (note.selection ? [note.selection.start.line, note.selection.end.line] : [note.start.line, note.end.line]) as [number, number],
        answers: await Promise.all(
          note.answers.map(
            async (answer): Promise<AnswerState> => ({
              author: answer.author,
              date: displayDate(answer.date),
              authorDate: authorDate(answer.date),
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
      account: await this.login(false),
      selected: entries.some((entry) => entry.id === this.selected) ? this.selected : undefined,
      threads,
      funnels: this.settingsOf(document).showFunnels,
      visible: this.visible(),
    };
  }

  /** refresh sends the content of the view to its script, when the view is open. */
  private async refresh(): Promise<void> {
    if (!this.view) {
      return;
    }
    const version = ++this.version;
    const state = await this.state();
    if (version === this.version) {
      await this.view?.webview.postMessage(state);
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
   * reveal shows a note in the text editor of its document, with the cursor at the start of its selection or of the
   * note, and opens its box.
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
    const shown = column === undefined ? modeOf(uri) : undefined;
    if (shown?.mode === 'preview') {
      // The preview keeps its place in the editor area and scrolls to the note.
      this.select(uri, id, true);
      await this.refresh();
      return;
    }
    this.select(uri, id);
    const place = entry.note.selection?.start ?? entry.note.start;
    const start = new vscode.Position(place.line, place.character);
    if (shown?.mode === 'editor') {
      // The mode "Markdown Editor" stays, and selects the passage of the note, because it shows no note.
      const end = entry.note.selection ? new vscode.Position(entry.note.selection.end.line, entry.note.selection.end.character) : start;
      await vscode.commands.executeCommand('vscode.openWith', uri, markdownModes.editor, { viewColumn: shown.column, selection: new vscode.Range(start, end), preserveFocus: !focus });
      return;
    }
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, { viewColumn: column, selection: new vscode.Range(start, start), preserveFocus: !focus });
    this.threads.expand(uri, id);
  }

  /**
   * receive runs an action of the user in the view.
   * @param message - The message of the script.
   */
  private async receive(message: Message): Promise<void> {
    const document = this.document;
    switch (message.type) {
      case 'ready':
        await this.refresh();
        return;
      case 'size':
        this.height = message.height;
        this.postVisible();
        return;
      case 'signIn':
        await this.login(true);
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
        await this.reply(message.request, await this.threads.saveAnswer(document, message.id, message.index, message.text));
        return;
      case 'answer':
        await this.reply(message.request, await this.threads.answer(document, message.id, message.text, undefined, message.parent ?? 0));
        return;
      case 'add': {
        const line = this.lines.get(document.toString()) ?? 0;
        const range = this.selections.get(document.toString()) ?? new vscode.Range(line, 0, line, 0);
        const result = await this.threads.addNote(document, range, message.text);
        if ('id' in result) {
          this.select(document, result.id);
          await this.refresh();
        }
        await this.reply(message.request, 'problem' in result ? result.problem : undefined);
        return;
      }
      case 'deleteAnswer':
      case 'deleteNote': {
        const problem =
          message.type === 'deleteAnswer' ? await this.threads.deleteAnswer(document, message.id, message.index) : await this.threads.deleteNote(document, message.id);
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
