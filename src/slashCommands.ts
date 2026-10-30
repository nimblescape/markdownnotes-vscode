// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The slash commands of the text editor
 * ([R-EDIT-008](../docs/requirements.md#r-edit-008)). A slash at the start of a
 * line or after a space offers `/note`, `/todo`, `/footnote`, `/date`, `/time`
 * and `/user` in the list of suggestions of VS Code, in the text editors of
 * Markdown files, also of the clean editing view. VS Code shows the list after
 * a trigger character also in a Markdown file, where it shows no suggestions
 * while the user types words; Tab or Enter takes the chosen command.
 *
 * VS Code replaces selected text with the slash that the user types. The module
 * remembers the text that a slash replaced, so that `/note` and `/todo` put it
 * back and add the note to it. `/todo` without such text takes the sentence
 * before it. Both open the editor of the new note in the side view
 * ([src/notesView.ts](notesView.ts)). `/footnote` removes the typed command
 * with the spaces before it and opens the editor of a new standard footnote in
 * the side view, as "Add Footnote" does: its reference goes at the end of the
 * word before the command when the user saves it. `/user` inserts the GitHub
 * login of the user, the name that the notes give their author; without a
 * sign-in, it asks for the sign-in first.
 *
 * `/figure` and `/table` add an entry, and `/ref` a reference to it
 * ([R-XREF-001](../docs/requirements.md#r-xref-001)). On a line of their own,
 * `/figure` lists the images of the workspace and inserts the chosen one as a
 * figure, with its caption selected for typing, and `/table` inserts a table of
 * two columns with its caption line `Table:`. In text, `/ref` lists the
 * figures, tables, listings and sections of the file and inserts a link to the
 * chosen one, such as `[Table 1](#tab-grades)`, after it gave a figure, a table
 * or a listing an anchor at the end of its line. A link to a section names the
 * ID that GitHub gives its heading, such as `[Chapter 2.1](#methods)`, and the
 * heading gets no anchor ([src/notes/figures.ts](notes/figures.ts)).
 *
 * `/listing` adds code of a file of the workspace as a listing
 * ([R-CODE-001](../docs/requirements.md#r-code-001)): the user chooses the
 * file, and then the whole file or one of its snippets
 * ([src/notes/listings.ts](notes/listings.ts)). The formatter writes the
 * current code into the listing on each format. A function, a class or a method
 * is a snippet too: the extension lists no symbols of a language
 * ([R-CODE-005](../docs/requirements.md#r-code-005)).
 *
 * Other extensions add slash commands through the API of the extension
 * ([R-GEN-012](../docs/requirements.md#r-gen-012)), for example `/source` of
 * nimblescape Markdown Paper. They show after the commands of the notes, with
 * the same rules.
 */

import * as vscode from 'vscode';
import { githubLogin, githubProvider } from './github';
import { highlightFor, referenceAllowed } from './notes/edits';
import { fieldMarkers, readFields } from './notes/fields';
import { anchorColumn, anchorName, anchorText, codeLines, defaultWord, findItems, type ItemKind, labelOf, numberOf, wordOf } from './notes/figures';
import { listingBlock, listingTarget, snippetsOf, sourceFiles } from './notes/listings';
import { nextFootnoteLabel } from './notes/footnotes';
import { dateText, sentenceBefore, timeText, typedAt } from './notes/slash';
import { isNoteDocument, linesOf, type NoteThreads } from './noteThreads';
import type { CleanMirror } from './notesView';

/** slashCommandIds are the commands that the suggestions run after VS Code wrote their text. No menu shows them. */
export const slashCommandIds = {
  note: 'nimblescape.markdownNotes.slashNote',
  footnote: 'nimblescape.markdownNotes.slashFootnote',
  user: 'nimblescape.markdownNotes.slashUser',
  figure: 'nimblescape.markdownNotes.slashFigure',
  ref: 'nimblescape.markdownNotes.slashRef',
  listing: 'nimblescape.markdownNotes.slashListing',
  other: 'nimblescape.markdownNotes.slashOther',
};

/** ownLabels are the slash commands of the notes, which no other extension can add. */
const ownLabels = ['/note', '/todo', '/footnote', '/figure', '/table', '/listing', '/ref', '/date', '/time', '/user'];

/** imageFiles are the files that `/figure` lists: the images that the Markdown preview and GitHub show. */
export const imageFiles = '**/*.{png,jpg,jpeg,gif,svg,webp,avif}';

/** tableSnippet is the table that `/table` inserts: its caption line, a blank line, and a table of two columns. */
export const tableSnippet = 'Table: ${1:Caption}\n\n| ${2:Column} | ${3:Column} |\n| --- | --- |\n| $4 | $5 |\n$0';

/**
 * snippetText escapes a text for a snippet, so that VS Code inserts it as it is.
 * @param text - The text.
 */
const snippetText = (text: string): string => text.replace(/[\\$}]/g, (character) => `\\${character}`);

/**
 * relativePath returns the path of a file from a folder for a link of Markdown, with `/` and each part encoded, also
 * the parentheses, which end a link.
 * @param folder - The path of the folder.
 * @param file - The path of the file.
 */
export function relativePath(folder: string, file: string): string {
  const from = folder.split('/').filter((part) => part.length > 0);
  const to = file.split('/').filter((part) => part.length > 0);
  let shared = 0;
  while (shared < from.length && shared < to.length - 1 && from[shared] === to[shared]) {
    shared++;
  }
  return [...from.slice(shared).map(() => '..'), ...to.slice(shared)]
    .map((part) => (part === '..' ? part : encodeURIComponent(part).replace(/\(/g, '%28').replace(/\)/g, '%29')))
    .join('/');
}

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
      vscode.commands.registerCommand(slashCommandIds.figure, (uri: vscode.Uri) => this.figure(uri)),
      vscode.commands.registerCommand(slashCommandIds.ref, (uri: vscode.Uri) => this.ref(uri)),
      vscode.commands.registerCommand(slashCommandIds.listing, (uri: vscode.Uri) => this.listing(uri)),
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
   * loaded tells whether the file of a clean editing view is open as a document. VS Code closes the document of a file
   * a while after no editor shows it, also while its clean editing view is open.
   * @param document - The document.
   */
  private loaded(document: vscode.TextDocument): boolean {
    const real = this.mirror?.realOf(document.uri);
    return !real || vscode.workspace.textDocuments.some((candidate) => candidate.uri.toString() === real.toString());
  }

  /**
   * load opens the file of a clean editing view as a document when VS Code closed it, so that `fileOf` finds it.
   * @param document - The document.
   */
  private async load(document: vscode.TextDocument): Promise<void> {
    const real = this.mirror?.realOf(document.uri);
    if (real && !this.loaded(document)) {
      await vscode.workspace.openTextDocument(real);
    }
  }

  /**
   * provideCompletionItems returns the slash commands for the slash before the cursor, after it opened the file of a
   * clean editing view when VS Code closed it.
   * @param document - The document.
   * @param position - The position of the cursor.
   */
  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.CompletionItem[]> {
    return this.loaded(document) ? this.itemsAt(document, position) : this.load(document).then(() => this.itemsAt(document, position));
  }

  /**
   * itemsAt returns the slash commands for the slash before the cursor.
   * @param document - The document.
   * @param position - The position of the cursor.
   */
  private itemsAt(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] | undefined {
    const line = document.lineAt(position.line).text;
    const replaced = this.replacedAt(document, position);
    const typed = replaced ? { slash: replaced.start.character, start: replaced.start.character } : typedAt(line, position.character);
    if (!typed) {
      return undefined;
    }
    // The command replaces the slash and the typed letters, and a command without a text of its own also the spaces before it.
    const range = new vscode.Range(position.line, typed.slash, position.line, position.character);
    const removed = new vscode.Range(position.line, typed.start, position.line, position.character);
    const item = (label: string, description: string, detail: string, kind: vscode.CompletionItemKind, replacing: vscode.Range, text: string | vscode.SnippetString): vscode.CompletionItem => {
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
    // A figure, a table and a listing are blocks of their own: on a line of their own.
    const found = !replaced ? this.fileOf(document) : undefined;
    if (found && line.slice(0, typed.slash).trim() === '' && line.slice(position.character).trim() === '' && !codeLines(lines).has(position.line)) {
      const figure = item('/figure', 'Add Figure', 'An image of the workspace as a figure, with its caption', vscode.CompletionItemKind.Function, range, '');
      figure.command = { command: slashCommandIds.figure, title: 'Add Figure', arguments: [document.uri] };
      const listing = item('/listing', 'Add Listing', 'Code of a file of the workspace, which the formatter keeps current', vscode.CompletionItemKind.Function, range, '');
      listing.command = { command: slashCommandIds.listing, title: 'Add Listing', arguments: [document.uri] };
      items.push(figure, item('/table', 'Add Table', 'A table with its caption line "Table:"', vscode.CompletionItemKind.Function, range, new vscode.SnippetString(tableSnippet)), listing);
    }
    // A link stands where a reference of a footnote can stand, in the text of a block.
    if (found && referenceAllowed(lines, new vscode.Position(position.line, typed.slash), this.threads.textReadingOf(document)) && (findItems(linesOf(found.file)).length > 0 || readFields(linesOf(found.file)).size > 0)) {
      const ref = item('/ref', 'Link a Figure, Table or Section', 'A link to a figure, a table, a listing or a section of the file, or a value of the front matter', vscode.CompletionItemKind.Reference, range, '');
      ref.command = { command: slashCommandIds.ref, title: 'Link a Figure, Table or Section', arguments: [document.uri] };
      items.push(ref);
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
   * editorOf returns the text editor of a document, the active one first.
   * @param uri - The URI of the document.
   */
  private editorOf(uri: vscode.Uri): vscode.TextEditor | undefined {
    return [vscode.window.activeTextEditor, ...vscode.window.visibleTextEditors].find((candidate) => candidate?.document.uri.toString() === uri.toString());
  }

  /**
   * figure inserts an image of the workspace as a figure for `/figure`, after VS Code removed the typed command: the user
   * chooses the image, and its caption is selected for typing. Without images, the path is selected after the caption.
   * @param uri - The URI of the document.
   */
  private async figure(uri: vscode.Uri): Promise<void> {
    const editor = this.editorOf(uri);
    if (editor) {
      await this.load(editor.document);
    }
    const found = editor && this.fileOf(editor.document);
    if (!editor || !found) {
      return;
    }
    const folder = found.file.uri.path.replace(/\/[^/]*$/, '');
    const files = await vscode.workspace.findFiles(imageFiles, '**/node_modules/**', 1000);
    const paths = files.map((file) => relativePath(folder, file.path)).sort((a, b) => a.localeCompare(b));
    let path = '${2:images/figure.png}';
    if (paths.length > 0) {
      const chosen = await vscode.window.showQuickPick(
        paths.map((relative) => ({ label: decodeURIComponent(relative.split('/').at(-1)!), description: decodeURIComponent(relative), relative })),
        { placeHolder: 'The image of the new figure', matchOnDescription: true },
      );
      if (!chosen) {
        return;
      }
      path = snippetText(chosen.relative);
    }
    await editor.insertSnippet(new vscode.SnippetString(`![\${1:Caption}](${path})`), editor.selection.active);
  }

  /**
   * listing inserts code of a file of the workspace as a listing for `/listing`
   * ([R-CODE-001](../docs/requirements.md#r-code-001)), after VS Code removed the typed command: the user chooses the
   * file, then the whole file or one of its snippets, and the caption is selected for typing. A file without snippets
   * gives its whole text. The caption is a link to the lines of the source; in the clean editing view, which hides the
   * link and the comment of the listing, they go into the file after the view wrote the caption and the code there.
   * @param uri - The URI of the document.
   */
  private async listing(uri: vscode.Uri): Promise<void> {
    const editor = this.editorOf(uri);
    if (editor) {
      await this.load(editor.document);
    }
    const found = editor && this.fileOf(editor.document);
    if (!editor || !found) {
      return;
    }
    const folder = found.file.uri.path.replace(/\/[^/]*$/, '');
    const files = await vscode.workspace.findFiles(sourceFiles, '{**/node_modules/**,**/.git/**}', 2000);
    const chosen = await vscode.window.showQuickPick(
      files
        .map((file) => ({ file, relative: relativePath(folder, file.path) }))
        .sort((a, b) => a.relative.localeCompare(b.relative))
        .map(({ file, relative }) => ({ label: decodeURIComponent(relative.split('/').at(-1)!), description: decodeURIComponent(relative), relative, file })),
      { placeHolder: 'The file of the source code of the new listing', matchOnDescription: true },
    );
    if (!chosen) {
      return;
    }
    const source = await vscode.workspace.openTextDocument(chosen.file);
    const text = source.getText();
    const snippets = snippetsOf(text.split(/\r\n|\r|\n/)).map(({ name }) => ({ label: name, description: 'Snippet', name: name as string | undefined }));
    let name: string | undefined;
    if (snippets.length > 0) {
      const part = await vscode.window.showQuickPick([{ label: 'Whole file', description: chosen.description, name: undefined as string | undefined }, ...snippets], {
        placeHolder: 'The part of the file: the whole file or a snippet',
        matchOnDescription: true,
      });
      if (!part) {
        return;
      }
      name = part.name;
    }
    const [, , comment, , ...code] = listingBlock('Caption', chosen.relative, name, text);
    const target = listingTarget(chosen.relative, text, name);
    const file = this.mirror?.realOf(editor.document.uri);
    // The clean editing view hides the link of the caption and the comment: the view gets the caption and the code block.
    const lines = file ? ['Listing: ${1:Caption}', '', ...code.map(snippetText)] : [`Listing: [\${1:Caption}](${snippetText(target)})`, '', snippetText(comment), '', ...code.map(snippetText)];
    const at = editor.selection.active;
    await editor.insertSnippet(new vscode.SnippetString(`${lines.join('\n')}\n$0`), at, { undoStopBefore: true, undoStopAfter: true, keepWhitespace: true });
    if (file) {
      // The hidden parts go into the file after the view wrote the caption and the code block there.
      await this.mirror?.settled?.(editor.document.uri);
      const head = 'Listing: ';
      const start = this.mirror!.toReal(editor.document.uri, new vscode.Position(at.line, at.character + head.length), true);
      const end = this.mirror!.toReal(editor.document.uri, new vscode.Position(at.line, at.character + head.length + 'Caption'.length));
      const fence = this.mirror!.toReal(editor.document.uri, new vscode.Position(at.line + 2, 0), true);
      if (start && end && fence) {
        const edit = new vscode.WorkspaceEdit();
        edit.insert(file, start, '[');
        edit.insert(file, end, `](${target})`);
        edit.insert(file, fence, `${comment}\n\n`);
        await vscode.workspace.applyEdit(edit);
      }
    }
  }

  /**
   * ref inserts a link to a figure, a table, a listing or a section of the file for `/ref`, after VS Code removed the
   * typed command: the user chooses the figure, the table, the listing or the heading of the section. A figure, a table
   * or a listing gets an anchor at the end of its line when it has none, and a section needs none: the link names the
   * ID that GitHub gives its heading ([R-XREF-003](../docs/requirements.md#r-xref-003)). In the clean editing view,
   * which hides the anchors, the anchor goes into the file after the view wrote the link into it.
   * @param uri - The URI of the document.
   */
  private async ref(uri: vscode.Uri): Promise<void> {
    const editor = this.editorOf(uri);
    if (editor) {
      await this.load(editor.document);
    }
    const found = editor && this.fileOf(editor.document);
    if (!editor || !found) {
      return;
    }
    const lines = linesOf(found.file);
    const items = findItems(lines);
    const fields = readFields(lines);
    const wordFor = (kind: ItemKind): string => wordOf(lines, kind) ?? defaultWord(kind, vscode.env.language ?? 'en');
    const chosen = await vscode.window.showQuickPick(
      [
        ...items.map((target, index) => ({ label: `${wordFor(target.kind)} ${labelOf(items, target)}`, description: target.caption, index, key: undefined })),
        ...[...fields].map(([key, value]) => ({ label: key, description: `Front matter: ${value}`, index: -1, key })),
      ],
      { placeHolder: 'The figure, table, section or value of the front matter to reference', matchOnDescription: true },
    );
    if (!chosen) {
      return;
    }
    if (chosen.key !== undefined) {
      await this.field(editor, chosen.key, fields.get(chosen.key) ?? '');
      return;
    }
    const target = items[chosen.index];
    const name = target.anchor ?? target.id ?? anchorName(target, items);
    // A section without an anchor of the older form is linked by the ID of its heading, and gets no anchor.
    const anchored = target.anchor !== undefined || target.id !== undefined;
    const link = `[${chosen.label}](#${name})`;
    const at = editor.selection.active;
    const clean = this.mirror?.realOf(editor.document.uri) !== undefined;
    await editor.edit((builder) => {
      builder.insert(at, link);
      if (!anchored && !clean) {
        builder.insert(new vscode.Position(target.line, anchorColumn(lines[target.line], target)), anchorText(name));
      }
    });
    const after = new vscode.Position(at.line, at.character + link.length);
    editor.selection = new vscode.Selection(after, after);
    if (!anchored && clean) {
      // The view hides the anchor, so it goes into the file, after the view wrote the link there.
      await this.mirror?.settled?.(editor.document.uri);
      const current = linesOf(found.file);
      const same = findItems(current).filter((other) => other.kind === target.kind)[numberOf(items, target) - 1];
      if (same && !same.anchor) {
        const edit = new vscode.WorkspaceEdit();
        edit.insert(found.file.uri, new vscode.Position(same.line, anchorColumn(current[same.line], same)), anchorText(name));
        await vscode.workspace.applyEdit(edit);
      }
    }
  }

  /**
   * field inserts a value of the front matter between its markers for `/ref`
   * ([R-XREF-004](../docs/requirements.md#r-xref-004)). In the clean editing view, which hides the markers, the value
   * goes into the view, and the markers go around it in the file after the view wrote it there.
   * @param editor - The text editor.
   * @param key - The key of the value.
   * @param value - The value.
   */
  private async field(editor: vscode.TextEditor, key: string, value: string): Promise<void> {
    const [open, close] = fieldMarkers(key);
    const at = editor.selection.active;
    const clean = this.mirror?.realOf(editor.document.uri) !== undefined;
    await editor.edit((builder) => builder.insert(at, clean ? value : `${open}${value}${close}`));
    const after = new vscode.Position(at.line, at.character + value.length + (clean ? 0 : open.length + close.length));
    editor.selection = new vscode.Selection(after, after);
    const file = clean ? this.mirror!.realOf(editor.document.uri)! : undefined;
    if (file) {
      await this.mirror?.settled?.(editor.document.uri);
      // The start marker goes after the hidden parts before the value, and the end marker before the ones after it.
      const start = this.mirror!.toReal(editor.document.uri, at, true);
      const end = this.mirror!.toReal(editor.document.uri, new vscode.Position(at.line, at.character + value.length));
      if (start && end) {
        const edit = new vscode.WorkspaceEdit();
        edit.insert(file, start, open);
        edit.insert(file, end, close);
        await vscode.workspace.applyEdit(edit);
      }
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
