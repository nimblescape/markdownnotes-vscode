// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The slash commands of the text editor
 * ([R-EDIT-008](../docs/requirements.md#r-edit-008)). A slash at the start of
 * a line or after a space offers `/note`, `/todo`, `/footnote`, `/date`,
 * `/time` and `/user` in the list of suggestions of VS Code (Hannes, 2026-10-29: "the /
 * command allows tab completion", "all slash commands are intended for the
 * text editor"), in the text editors of Markdown files, also of the clean
 * editing view. VS Code shows the list after a trigger character also in a
 * Markdown file, where it shows no suggestions while the user types words;
 * Tab or Enter takes the chosen command.
 *
 * VS Code replaces selected text with the slash that the user types. The
 * module remembers the text that a slash replaced, so that `/note` and
 * `/todo` put it back and add the note to it (Hannes, 2026-10-29: "selecting
 * and /note creates a note", "/note is not available when no text is
 * selected"). `/todo` without such text takes the sentence before it. Both
 * open the editor of the new note in the side view
 * ([src/notesView.ts](notesView.ts)). `/footnote` removes the typed command
 * with the spaces before it and opens the editor of a new standard footnote
 * in the side view, as "Add Footnote" does: its reference goes at the end of
 * the word before the command when the user saves it (Hannes, 2026-10-29:
 * "since footnotes are also available in the side view, it just goes to the
 * side view editor, similar to the /notes command"). `/user` inserts the
 * GitHub login of the user, the name that the notes give their author
 * (Hannes, 2026-10-29: "/user insert the current user name"); without a
 * sign-in, it asks for the sign-in first.
 *
 * Other extensions add slash commands through the API of the extension
 * ([R-GEN-012](../docs/requirements.md#r-gen-012)), for example `/source` of
 * nimblescape Markdown Paper (Hannes, 2026-10-29, 22:15: "it is also the slash
 * commands"). They show after the commands of the notes, with the same rules.
 */

import * as vscode from 'vscode';
import { githubLogin, githubProvider } from './github';
import { highlightFor, referenceAllowed } from './notes/edits';
import { nextFootnoteLabel } from './notes/footnotes';
import { dateText, sentenceBefore, timeText, typedAt } from './notes/slash';
import { isNoteDocument, linesOf, type NoteThreads } from './noteThreads';
import type { CleanMirror } from './notesView';

/** slashCommandIds are the commands that the suggestions run after VS Code wrote their text. No menu shows them. */
export const slashCommandIds = {
  note: 'nimblescape.markdownNotes.slashNote',
  footnote: 'nimblescape.markdownNotes.slashFootnote',
  user: 'nimblescape.markdownNotes.slashUser',
  other: 'nimblescape.markdownNotes.slashOther',
};

/** ownLabels are the slash commands of the notes, which no other extension can add. */
const ownLabels = ['/note', '/todo', '/footnote', '/date', '/time', '/user'];

/** SlashCommand is a slash command that another extension adds (R-GEN-012), after the commands of the notes. */
export interface SlashCommand {
  /** label is the command: a slash and small letters, for example `/source`. */
  label: string;
  /** description is the short text beside the label in the list of suggestions. */
  description?: string;
  /** detail is the longer text of the chosen suggestion. */
  detail?: string;
  /**
   * run runs the command after VS Code removed the typed command from the text. An edit of the text editor of the
   * clean editing view goes into the file, as every edit of the view does.
   * @param editor - The text editor.
   * @param range - The empty range at the place of the removed command.
   */
  run(editor: vscode.TextEditor, range: vscode.Range): unknown;
}

/** Replaced is the selected text that a typed slash replaced, at the version of the document after the slash. */
interface Replaced {
  document: string;
  version: number;
  start: vscode.Position;
  text: string;
}

/**
 * quoted returns a text for the list of suggestions: on one line, and shortened.
 * @param text - The text.
 */
const quoted = (text: string): string => {
  const line = text.replace(/\s+/g, ' ').trim();
  return `“${line.length > 40 ? `${line.slice(0, 39)}…` : line}”`;
};

/**
 * endOf returns the position after a text that starts at a position.
 * @param start - The position.
 * @param text - The text.
 */
const endOf = (start: vscode.Position, text: string): vscode.Position => {
  const parts = text.split(/\r?\n/);
  return new vscode.Position(start.line + parts.length - 1, (parts.length === 1 ? start.character : 0) + parts.at(-1)!.length);
};

/** SlashCommands gives the text editors of Markdown files the slash commands. */
export class SlashCommands implements vscode.CompletionItemProvider {
  /** selections holds the selected text of each document, at the version of the document. */
  private readonly selections = new Map<string, { range: vscode.Range; text: string; version: number }>();
  private replaced: Replaced | undefined;
  /**
   * login is the GitHub login of the user for `/user`, read without a sign-in at the start and after each change of the
   * sessions, because the list of suggestions shows it at once.
   */
  private login: string | undefined;
  /** others are the slash commands of other extensions, by their labels, in the order of their registration. */
  private readonly others = new Map<string, SlashCommand>();

  /**
   * @param threads - The threads of the notes, which read each document once for each version.
   * @param addNote - Opens the editor of a new note in the side view for text of a text editor.
   * @param addFootnote - Opens the editor of a new standard footnote in the side view for the cursor of a text editor.
   * @param mirror - The link of the clean editing view (R-TEXT-009), whose text is text of its file.
   */
  constructor(
    private readonly threads: NoteThreads,
    private readonly addNote: (editor: vscode.TextEditor, range: vscode.Range, todo: boolean) => Promise<void>,
    private readonly addFootnote: (editor: vscode.TextEditor) => Promise<void>,
    private readonly mirror?: CleanMirror,
  ) {}

  /** register registers the suggestions for the Markdown files, and the commands that they run. */
  register(): vscode.Disposable[] {
    void this.readLogin();
    return [
      vscode.languages.registerCompletionItemProvider('markdown', this, '/'),
      vscode.window.onDidChangeTextEditorSelection((event) => this.remember(event.textEditor)),
      vscode.workspace.onDidChangeTextDocument((event) => this.replace(event)),
      vscode.workspace.onDidCloseTextDocument((document) => this.selections.delete(document.uri.toString())),
      vscode.commands.registerCommand(slashCommandIds.note, (uri: vscode.Uri, range: vscode.Range, todo: boolean) => this.note(uri, range, todo)),
      vscode.commands.registerCommand(slashCommandIds.footnote, (uri: vscode.Uri) => this.footnote(uri)),
      vscode.commands.registerCommand(slashCommandIds.user, (uri: vscode.Uri) => this.user(uri)),
      vscode.commands.registerCommand(slashCommandIds.other, (uri: vscode.Uri, label: string) => this.other(uri, label)),
      vscode.authentication.onDidChangeSessions((event) => {
        if (event.provider.id === githubProvider) {
          void this.readLogin();
        }
      }),
    ];
  }

  /**
   * add adds the slash command of another extension, until the disposal of the result. The label is a slash and small
   * letters, and no other command has it.
   * @param command - The command.
   */
  add(command: SlashCommand): vscode.Disposable {
    const { label } = command;
    if (typeof label !== 'string' || !/^\/[a-z]+$/.test(label)) {
      throw new Error(`The label of a slash command is a slash and small letters, not ${JSON.stringify(label)}.`);
    }
    if (ownLabels.includes(label) || this.others.has(label)) {
      throw new Error(`The slash command ${label} exists already.`);
    }
    this.others.set(label, command);
    return new vscode.Disposable(() => {
      if (this.others.get(label) === command) {
        this.others.delete(label);
      }
    });
  }

  /** readLogin reads the GitHub login of the user without a sign-in. */
  private async readLogin(): Promise<void> {
    this.login = await githubLogin(false);
  }

  /**
   * remember keeps the selected text of a text editor of a Markdown file: one selection with text.
   * @param editor - The text editor.
   */
  private remember(editor: vscode.TextEditor): void {
    const { document, selections } = editor;
    if (document.languageId === 'markdown' && selections.length === 1 && !selections[0].isEmpty) {
      this.selections.set(document.uri.toString(), { range: selections[0], text: document.getText(selections[0]), version: document.version });
    }
  }

  /**
   * replace keeps the selected text that a typed slash replaced: a change of the selection to a slash, right after the
   * selection.
   * @param event - The change of a document.
   */
  private replace(event: vscode.TextDocumentChangeEvent): void {
    const key = event.document.uri.toString();
    const selected = this.selections.get(key);
    const [change] = event.contentChanges;
    if (selected && event.contentChanges.length === 1 && change.text === '/' && change.rangeLength > 0 && change.range.isEqual(selected.range) && event.document.version === selected.version + 1) {
      this.replaced = { document: key, version: event.document.version, start: change.range.start, text: selected.text };
    }
  }

  /**
   * replacedAt returns the selected text that the slash before the cursor replaced, while the user typed only letters
   * after the slash.
   * @param document - The document.
   * @param position - The position of the cursor.
   */
  private replacedAt(document: vscode.TextDocument, position: vscode.Position): Replaced | undefined {
    const replaced = this.replaced;
    if (!replaced || replaced.document !== document.uri.toString() || replaced.start.line !== position.line) {
      return undefined;
    }
    const typed = document.lineAt(position.line).text.slice(replaced.start.character, position.character);
    return /^\/[a-z]*$/.test(typed) && document.version - replaced.version === typed.length - 1 ? replaced : undefined;
  }

  /**
   * fileOf returns the file of a document that the extension can change: the document itself, or the file of a clean
   * editing view, and the place in the file of a position of the document.
   * @param document - The document.
   */
  private fileOf(document: vscode.TextDocument): { file: vscode.TextDocument; place: (position: vscode.Position) => vscode.Position | undefined } | undefined {
    const real = this.mirror?.realOf(document.uri);
    const file = real ? vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === real.toString()) : document;
    if (!file || !isNoteDocument(file)) {
      return undefined;
    }
    return { file, place: (position) => (real ? this.mirror!.toReal(document.uri, position) : position) };
  }

  /**
   * highlights tells whether a note can highlight a range of a document ([R-NOTE-006](../docs/requirements.md#r-note-006)).
   * @param document - The document.
   * @param range - The range.
   */
  private highlights(document: vscode.TextDocument, range: vscode.Range): boolean {
    const found = this.fileOf(document);
    const start = found?.place(range.start);
    const end = found?.place(range.end);
    return !!found && !!start && !!end && highlightFor(linesOf(found.file), new vscode.Range(start, end), this.threads.textReadingOf(found.file)) !== undefined;
  }

  /**
   * provideCompletionItems returns the slash commands for the slash before the cursor.
   * @param document - The document.
   * @param position - The position of the cursor.
   */
  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] | undefined {
    const line = document.lineAt(position.line).text;
    const replaced = this.replacedAt(document, position);
    const typed = replaced ? { slash: replaced.start.character, start: replaced.start.character } : typedAt(line, position.character);
    if (!typed) {
      return undefined;
    }
    // The command replaces the slash and the typed letters, and a command without a text of its own also the spaces before it.
    const range = new vscode.Range(position.line, typed.slash, position.line, position.character);
    const removed = new vscode.Range(position.line, typed.start, position.line, position.character);
    const item = (label: string, description: string, detail: string, kind: vscode.CompletionItemKind, replacing: vscode.Range, text: string): vscode.CompletionItem => {
      const created = new vscode.CompletionItem({ label, description }, kind);
      created.detail = detail;
      created.range = replacing;
      created.insertText = text;
      created.filterText = label;
      return created;
    };
    const items: vscode.CompletionItem[] = [];
    const lines = linesOf(document);
    if (replaced) {
      const restored = new vscode.Range(replaced.start, endOf(replaced.start, replaced.text));
      for (const todo of [false, true]) {
        const label = todo ? '/todo' : '/note';
        const created = item(label, todo ? 'Add Todo' : 'Add Note', `${todo ? 'A todo note' : 'A note'} on ${quoted(replaced.text)}`, vscode.CompletionItemKind.Function, range, replaced.text);
        created.command = { command: slashCommandIds.note, title: todo ? 'Add Todo' : 'Add Note', arguments: [document.uri, restored, todo] };
        items.push(created);
      }
    } else {
      const sentence = sentenceBefore(lines, new vscode.Position(position.line, typed.start), this.threads.textReadingOf(document));
      const highlight = sentence && new vscode.Range(sentence.start.line, sentence.start.character, sentence.end.line, sentence.end.character);
      if (highlight && this.highlights(document, highlight)) {
        const created = item('/todo', 'Add Todo', `A todo note on ${quoted(document.getText(highlight))}`, vscode.CompletionItemKind.Function, removed, '');
        created.command = { command: slashCommandIds.note, title: 'Add Todo', arguments: [document.uri, highlight, true] };
        items.push(created);
      }
    }
    const reference = new vscode.Position(position.line, typed.start);
    // The reference of a footnote goes after a word: the slash stands after a space.
    if (!replaced && typed.start < typed.slash && this.fileOf(document) && referenceAllowed(lines, reference, this.threads.textReadingOf(document))) {
      const label = nextFootnoteLabel(lines);
      const created = item('/footnote', 'Add Footnote', `The footnote [^${label}], in the editor of the side view`, vscode.CompletionItemKind.Reference, removed, '');
      created.command = { command: slashCommandIds.footnote, title: 'Add Footnote', arguments: [document.uri] };
      items.push(created);
    }
    const now = new Date();
    items.push(
      item('/date', dateText(now), 'Insert the current date', vscode.CompletionItemKind.Value, range, dateText(now)),
      item('/time', timeText(now), 'Insert the current date and time, in the local time', vscode.CompletionItemKind.Value, range, timeText(now)),
    );
    if (this.login) {
      items.push(item('/user', this.login, 'Insert your GitHub login', vscode.CompletionItemKind.Value, range, this.login));
    } else {
      const created = item('/user', 'Sign in with GitHub', 'Sign in with GitHub, then insert your GitHub login', vscode.CompletionItemKind.Value, range, '');
      created.command = { command: slashCommandIds.user, title: 'Insert User', arguments: [document.uri] };
      items.push(created);
    }
    // The commands of other extensions replace no selected text, and get the text editor at the place of the command.
    if (!replaced) {
      for (const [label, other] of this.others) {
        const created = item(label, other.description ?? '', other.detail ?? '', vscode.CompletionItemKind.Function, range, '');
        created.command = { command: slashCommandIds.other, title: label, arguments: [document.uri, label] };
        items.push(created);
      }
    }
    // The list keeps the order of the commands.
    items.forEach((created, index) => (created.sortText = String(index).padStart(2, '0')));
    return items;
  }

  /**
   * note opens the editor of a new note in the side view for text of a text editor, for `/note` and `/todo`.
   * @param uri - The URI of the document.
   * @param range - The text.
   * @param todo - Whether the new note is a todo.
   */
  private async note(uri: vscode.Uri, range: vscode.Range, todo: boolean): Promise<void> {
    const editor = [vscode.window.activeTextEditor, ...vscode.window.visibleTextEditors].find((candidate) => candidate?.document.uri.toString() === uri.toString());
    if (editor) {
      await this.addNote(editor, range, todo);
    }
  }

  /**
   * footnote opens the editor of a new standard footnote in the side view for the cursor of a text editor, for
   * `/footnote`, after VS Code removed the typed command.
   * @param uri - The URI of the document.
   */
  private async footnote(uri: vscode.Uri): Promise<void> {
    const editor = [vscode.window.activeTextEditor, ...vscode.window.visibleTextEditors].find((candidate) => candidate?.document.uri.toString() === uri.toString());
    if (editor) {
      await this.addFootnote(editor);
    }
  }

  /**
   * other runs the slash command of another extension in a text editor, after VS Code removed the typed command, and
   * shows a message when it fails.
   * @param uri - The URI of the document.
   * @param label - The label of the command.
   */
  private async other(uri: vscode.Uri, label: string): Promise<void> {
    const command = this.others.get(label);
    const editor = [vscode.window.activeTextEditor, ...vscode.window.visibleTextEditors].find((candidate) => candidate?.document.uri.toString() === uri.toString());
    if (!command || !editor) {
      return;
    }
    const at = editor.selection.active;
    try {
      await command.run(editor, new vscode.Range(at, at));
    } catch (error) {
      void vscode.window.showErrorMessage(`The slash command ${label} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * user inserts the GitHub login of the user at the cursor of a text editor for `/user` without a sign-in, after VS
   * Code removed the typed command: it asks for the sign-in first.
   * @param uri - The URI of the document.
   */
  private async user(uri: vscode.Uri): Promise<void> {
    const login = await githubLogin(true);
    this.login = login;
    const editor = [vscode.window.activeTextEditor, ...vscode.window.visibleTextEditors].find((candidate) => candidate?.document.uri.toString() === uri.toString());
    if (!login) {
      void vscode.window.showInformationMessage('/user inserts your GitHub login after a sign-in with GitHub.');
    } else if (editor) {
      const at = editor.selection.active;
      await editor.edit((builder) => builder.insert(at, login));
    }
  }
}
