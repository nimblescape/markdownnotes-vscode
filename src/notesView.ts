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
 * Each answer has the buttons "Edit" and "Delete", each thread the buttons
 * "Answer" and "Delete Thread", and the view the button "Add Note", which adds
 * a note at the line of the cursor of the text editor. The editor of a text has
 * the tabs "Write" and "Preview"; the preview renders the text with the
 * Markdown preview of VS Code. A click on a link of a rendered text opens the
 * link ([src/links.ts](links.ts)). The view writes through the operations of the
 * threads of the text editor ([src/noteThreads.ts](noteThreads.ts)), so both
 * check and write a text in the same way. The script of the view is
 * [media/notesView.js](../media/notesView.js); it gets the state of the view
 * from this module and sends the actions of the user back.
 */

import * as vscode from 'vscode';
import { githubProvider } from './github';
import { openLink } from './links';
import type { Note, Position } from './notes/notes';
import { displayDate } from './notes/syntax';
import { isNoteDocument, type NoteEntry, type NoteThreads, problemMessage } from './noteThreads';

/** notesViewId is the identifier of the side view, which the manifest contributes. */
export const notesViewId = 'nimblescape.markdownNotes.notes';

/**
 * viewCommands are the commands of the side view: the button "Hide Notes" in its title, and "Show or Hide Notes" of the
 * title of the Markdown editors and of the Command Palette ([R-SIDE-006](../docs/requirements.md#r-side-006)).
 */
export const viewCommands = {
  hide: 'nimblescape.markdownNotes.hideNotes',
  toggle: 'nimblescape.markdownNotes.toggleNotes',
};

/** Message is a message of the script of the view. */
export type Message =
  | { type: 'ready' }
  | { type: 'signIn' }
  | { type: 'reveal'; id: string }
  | { type: 'save'; request: number; id: string; index: number; text: string }
  | { type: 'answer'; request: number; id: string; text: string }
  | { type: 'add'; request: number; text: string }
  | { type: 'deleteAnswer'; id: string; index: number }
  | { type: 'deleteNote'; id: string }
  | { type: 'render'; request: number; text: string }
  | { type: 'openLink'; href: string };

/** AnswerState is an answer as the view shows it. */
interface AnswerState {
  author: string;
  date: string;
  body: string;
  html: string;
}

/** ThreadState is a thread as the view shows it. */
interface ThreadState {
  id: string;
  line: number;
  kind: Note['kind'];
  nested: boolean;
  answers: AnswerState[];
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
}

/** cacheSize is the number of rendered texts that the view keeps. */
const cacheSize = 200;

/**
 * escapeHtml escapes the characters of a text that HTML reads as markup.
 * @param text - The text.
 */
const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);

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
  private readonly registrations: vscode.Disposable[];

  /**
   * @param extensionUri - The folder of the extension, which holds the script and the styles of the view.
   * @param threads - The threads of the notes, whose operations the view uses.
   * @param login - Returns the GitHub login of the user; with signIn true after asking for a sign-in.
   * @param render - Renders a Markdown text as the Markdown preview does.
   */
  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly threads: NoteThreads,
    private readonly login: (signIn: boolean) => Promise<string | undefined>,
    private readonly render: (text: string) => Promise<string>,
  ) {
    this.registrations = [
      vscode.window.onDidChangeActiveTextEditor((editor) => this.follow(editor)),
      vscode.window.onDidChangeTextEditorSelection((event) => this.follow(event.textEditor)),
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
    view.onDidChangeVisibility(() => {
      if (view.visible) {
        void this.refresh();
      }
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
    this.selected = this.noteAt(document, line)?.id ?? this.selected;
    await vscode.commands.executeCommand(`${notesViewId}.focus`);
    await this.refresh();
  }

  /**
   * hide closes the secondary side bar, which holds the view beside the chat of VS Code. VS Code has no command that
   * closes one view.
   */
  private async hide(): Promise<void> {
    await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
  }

  /**
   * noteAt returns the note of a document that holds a line, or whose selection holds it.
   * @param document - The URI of the document.
   * @param line - The index of the line.
   */
  private noteAt(document: vscode.Uri, line: number): NoteEntry | undefined {
    const holds = (start: Position, end: Position) => start.line <= line && line <= end.line;
    const entries = this.threads.entriesOf(document);
    return entries.find(({ note }) => holds(note.start, note.end)) ?? entries.find(({ note }) => note.selection && holds(note.selection.start, note.selection.end));
  }

  /**
   * follow makes the document of a text editor the document of the view, and selects the note at its cursor. Another
   * editor, for example the preview, keeps the document of the view.
   * @param editor - The text editor, or undefined.
   */
  private follow(editor: vscode.TextEditor | undefined): void {
    if (!editor || !isNoteDocument(editor.document)) {
      return;
    }
    const document = editor.document.uri;
    const line = editor.selection.active.line;
    this.lines.set(document.toString(), line);
    const { active } = editor.selection;
    this.selections.set(document.toString(), new vscode.Range(editor.selection.start ?? active, editor.selection.end ?? active));
    const changed = document.toString() !== this.document?.toString();
    const selected = this.noteAt(document, line)?.id;
    this.document = document;
    if (changed || (selected !== undefined && selected !== this.selected)) {
      this.selected = selected;
      void this.refresh();
    } else {
      void this.view?.webview.postMessage({ type: 'line', line });
    }
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

  /** state returns the content of the view. */
  async state(): Promise<State> {
    const document = this.document;
    const entries = document ? this.threads.entriesOf(document) : [];
    const threads = await Promise.all(
      entries.map(async ({ id, note }) => ({
        id,
        line: note.start.line,
        kind: note.kind,
        nested: note.nested,
        answers: await Promise.all(
          note.answers.map(async (answer) => ({
            author: answer.author ?? '',
            date: answer.date ? displayDate(answer.date) : '',
            body: answer.body,
            // A note that holds the start of another comment shows its text as it is.
            html: note.nested ? `<pre>${escapeHtml(answer.body)}</pre>` : await this.renderHtml(answer.body),
          })),
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
   * reveal shows a note in the text editor of its document and opens its box.
   * @param id - The identifier of the thread of the note.
   */
  private async reveal(id: string): Promise<void> {
    const uri = this.document;
    const entry = uri ? this.threads.entriesOf(uri).find((candidate) => candidate.id === id) : undefined;
    if (!uri || !entry) {
      return;
    }
    this.selected = id;
    const start = new vscode.Position(entry.note.start.line, entry.note.start.character);
    const column = vscode.window.visibleTextEditors.find((editor) => editor.document.uri.toString() === uri.toString())?.viewColumn;
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document, { viewColumn: column, selection: new vscode.Range(start, start) });
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
      case 'signIn':
        await this.login(true);
        await this.refresh();
        return;
      case 'render':
        await this.view?.webview.postMessage({ type: 'rendered', request: message.request, html: await this.renderHtml(message.text) });
        return;
      case 'reveal':
        await this.reveal(message.id);
        return;
      case 'openLink':
        await openLink(message.href, document, this.render);
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
        await this.reply(message.request, await this.threads.answer(document, message.id, message.text));
        return;
      case 'add': {
        const line = this.lines.get(document.toString()) ?? 0;
        const range = this.selections.get(document.toString()) ?? new vscode.Range(line, 0, line, 0);
        const result = await this.threads.addNote(document, range, message.text);
        if ('id' in result) {
          this.selected = result.id;
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
