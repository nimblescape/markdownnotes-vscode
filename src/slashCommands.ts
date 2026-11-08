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
 * figure, with its caption line such as `Figure 2:` before it and the caption
 * selected for typing, and `/table` inserts a table of two columns with its
 * caption line such as `Table 1:`. In text, `/ref` lists the figures, tables,
 * listings and sections of the file and inserts a link to the chosen one, such
 * as `[Table 1](#tab-grades)`, after it gave a figure, a table or a listing an
 * anchor at the end of its caption. A link to a section names the
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
 * ([R-GEN-012](../docs/requirements.md#r-gen-012)), for example `/cite` of
 * nimblescape Markdown Paper. They show after the commands of the notes, with
 * the same rules. A command on selected text, such as `/research` of Markdown
 * Paper, shows only when the slash replaced selected text, which it puts back
 * as `/note` does; the other commands show only when the slash replaced none.
 *
 * The commands of the blocks have the names of the editor of nimblescape Markdown and show after the other commands,
 * outside code blocks, tables and the front matter ([decision 79](../docs/requirements.md#decisions)): `/text`, `/h1`
 * to `/h6`, `/bullets`, `/numbers`, `/tasks` and `/quote` change the marker of the line, and `/code`, `/divider`,
 * `/image` and `/alert` insert their block ([src/notes/slash.ts](notes/slash.ts)).
 *
 * The view "Markdown Editor" runs the same commands on the text of its file (`runInText`), so that both editors have
 * the same commands with the same results ([src/renderedEditor.ts](renderedEditor.ts)).
 */

import * as vscode from 'vscode';
import { sourceOf } from './formatter';
import { githubLogin, githubProvider } from './github';
import type { SlashName, TextPatch } from './notes/editorMessages';
import { highlightFor, referenceAllowed } from './notes/edits';
import { fieldMarkers, readFields } from './notes/fields';
import { anchorColumn, anchorName, anchorText, captionWord, codeLines, defaultWord, findItems, type ItemKind, labelOf, numberOf, wordOf } from './notes/figures';
import { listingBlock, listingCite, listingTarget, snippetsOf, sourceFiles } from './notes/listings';
import { cloneFolder, isMissing, referencesOf, sourceFilesOf } from './notes/repos';
import { nextFootnoteLabel } from './notes/footnotes';
import { frontMatterEnd } from './notes/doctype';
import { type BlockName, blockCommands, blockSpacing, dateText, lineMarkers, markLine, sentenceBefore, timeText, typedAt } from './notes/slash';
import { isNoteDocument, linesOf, type NoteStore } from './noteStore';
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
  block: 'nimblescape.markdownNotes.slashBlock',
};

/** ownLabels are the slash commands of the notes and of the blocks, which no other extension can add. */
const ownLabels = ['/note', '/todo', '/footnote', '/figure', '/table', '/listing', '/ref', '/date', '/time', '/user', ...Object.keys(blockCommands).map((name) => `/${name}`)];

/** blockSnippets are the snippets of the commands that insert a block: on a line of its own, or in text for `/image`. */
const blockSnippets: Partial<Record<BlockName, string>> = {
  code: '```$1\n$0\n```',
  divider: '---',
  image: '![](${1:address})',
  alert: '> [!${1|NOTE,TIP,IMPORTANT,WARNING,CAUTION|}]\n> $0',
};

/** blockDetails are the longer texts of the commands of the blocks in the list of suggestions. */
const blockDetails: Record<BlockName, string> = {
  text: 'The line as text, without the marker of a heading, a list item, a task or a quote',
  h1: 'The line as a heading of level 1: #',
  h2: 'The line as a heading of level 2: ##',
  h3: 'The line as a heading of level 3: ###',
  h4: 'The line as a heading of level 4: ####',
  h5: 'The line as a heading of level 5: #####',
  h6: 'The line as a heading of level 6: ######',
  bullets: 'The line as an item of a bulleted list: -',
  numbers: 'The line as an item of a numbered list: 1.',
  tasks: 'The line as a task: - [ ]',
  quote: 'The line as a quote: >',
  code: 'A code block between lines of ```, with the text of the line',
  divider: 'A divider: ---',
  image: 'An image by its address: ![](address)',
  alert: 'An alert of the chosen kind: > [!NOTE]',
};

/** imageFiles are the files that `/figure` lists: the images that the Markdown preview and GitHub show. */
export const imageFiles = '**/*.{png,jpg,jpeg,gif,svg,webp,avif}';

/**
 * tableSnippet returns the table that `/table` inserts: its caption line, a blank line, and a table of two columns.
 * @param caption - The start of the caption: its word and its number, for example `Table 2:`.
 */
export const tableSnippet = (caption: string): string => `${caption} \${1:Caption}\n\n| \${2:Column} | \${3:Column} |\n| --- | --- |\n| $4 | $5 |\n$0`;

/**
 * captionStart returns the start of a new caption of a figure, a table or a listing at a line of a text: the word of
 * the links of the text or of the language of VS Code, and the number after the captions of its kind before the line,
 * for example `Tabelle 2:`. The formatter writes the numbers of the captions after it anew.
 * @param lines - The lines of the text.
 * @param kind - The kind of the new item.
 * @param line - The index of the line of the new caption.
 */
export function captionStart(lines: readonly string[], kind: 'figure' | 'table' | 'listing', line: number): string {
  const before = findItems(lines).filter((item) => item.kind === kind && item.line < line).length;
  return `${captionWord(lines, kind, vscode.env.language ?? 'en')} ${before + 1}:`;
}

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
  /** label is the command: a slash and small letters, for example `/cite`. */
  label: string;
  /** description is the short text beside the label in the list of suggestions. */
  description?: string;
  /** detail is the longer text of the chosen suggestion. */
  detail?: string;
  /**
   * selection is true for a command on selected text: the list offers it only when the typed slash replaced selected
   * text, as `/note`, and VS Code puts the text back before the command runs. Without it, the list offers the command
   * only when the slash replaced no text.
   */
  selection?: boolean;
  /**
   * run runs the command after VS Code removed the typed command from the text. An edit of the text editor of the
   * clean editing view goes into the file, as every edit of the view does.
   * @param editor - The text editor.
   * @param range - The range of the selected text that VS Code put back, for a command on selected text; else the
   * empty range at the place of the removed command.
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
 * Place is where a slash command writes: a text editor, also of the clean editing view, or the text of a file in the
 * view "Markdown Editor", whose page sent the text and the place of the cursor ([R-EDIT-008](../docs/requirements.md#r-edit-008)).
 */
interface Place {
  /** document is the document of the text editor, or the file of the Markdown Editor. */
  readonly document: vscode.TextDocument;
  /** lines are the lines of the text that the command changes. */
  readonly lines: string[];
  /** at is the place of the cursor in these lines. */
  readonly at: vscode.Position;
  /** clean is true for the clean editing view, which hides parts of its file. */
  readonly clean: boolean;
  /**
   * insertSnippet inserts a snippet at the cursor and selects its first placeholder.
   * @param snippet - The snippet.
   * @param keepWhitespace - true to keep the indentation of its lines.
   */
  insertSnippet(snippet: string, keepWhitespace?: boolean): Thenable<unknown>;
  /**
   * insert inserts texts of one line at places of the lines, and puts the cursor after the text at the cursor.
   * @param inserts - The texts and their places.
   */
  insert(inserts: readonly { at: vscode.Position; text: string }[]): Thenable<unknown>;
}

/** TextChange is the change of a slash command of the Markdown Editor: the patches of the text and the range to select. */
export interface TextChange {
  patches: TextPatch[];
  select?: { from: number; to: number };
}

/**
 * lineStarts returns the place in a text of the start of each line.
 * @param text - The text.
 */
const lineStarts = (text: string): number[] => {
  const starts = [0];
  for (const match of text.matchAll(/\r\n|\r|\n/g)) {
    starts.push(match.index + match[0].length);
  }
  return starts;
};

/**
 * plainSnippet returns the text of a snippet, without its placeholders, and the range of the text of its first
 * placeholder, or the place of its end `$0`, for the Markdown Editor, which has no placeholders.
 * @param snippet - The snippet.
 */
export function plainSnippet(snippet: string): { text: string; select?: [number, number] } {
  let text = '';
  const stops = new Map<number, [number, number]>();
  const pattern = /\\([\\$}])|\$\{(\d+):((?:\\[\\$}]|[^}])*)\}|\$\{(\d+)\}|\$(\d+)/g;
  let position = 0;
  for (const match of snippet.matchAll(pattern)) {
    text += snippet.slice(position, match.index);
    position = match.index + match[0].length;
    if (match[1] !== undefined) {
      text += match[1];
      continue;
    }
    const number = Number(match[2] ?? match[4] ?? match[5]);
    const value = (match[3] ?? '').replace(/\\([\\$}])/g, '$1');
    if (!stops.has(number)) {
      stops.set(number, [text.length, text.length + value.length]);
    }
    text += value;
  }
  text += snippet.slice(position);
  const first = [...stops.keys()].filter((number) => number > 0).sort((a, b) => a - b)[0];
  const select = stops.get(first ?? 0);
  return select ? { text, select } : { text };
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
   * @param store - The store of the notes, which read each document once for each version.
   * @param addNote - Opens the editor of a new note in the side view for text of a text editor.
   * @param addFootnote - Opens the editor of a new standard footnote in the side view for the cursor of a text editor.
   * @param mirror - The link of the clean editing view (R-TEXT-009), whose text is text of its file.
   * @param addNoteIn - Opens the editor of a new note in the side view for text of a file, for `/todo` of the view
   * "Markdown Editor".
   */
  constructor(
    private readonly store: NoteStore,
    private readonly addNote: (editor: vscode.TextEditor, range: vscode.Range, todo: boolean) => Promise<void>,
    private readonly addFootnote: (editor: vscode.TextEditor) => Promise<void>,
    private readonly mirror?: CleanMirror,
    private readonly addNoteIn?: (document: vscode.TextDocument, range: vscode.Range, todo: boolean) => Promise<void>,
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
      vscode.commands.registerCommand(slashCommandIds.user, (uri: vscode.Uri) => this.inEditor(uri, (place) => this.user(place))),
      vscode.commands.registerCommand(slashCommandIds.figure, (uri: vscode.Uri) => this.inEditor(uri, (place) => this.figure(place))),
      vscode.commands.registerCommand(slashCommandIds.ref, (uri: vscode.Uri) => this.inEditor(uri, (place) => this.ref(place))),
      vscode.commands.registerCommand(slashCommandIds.listing, (uri: vscode.Uri) => this.inEditor(uri, (place) => this.listing(place))),
      vscode.commands.registerCommand(slashCommandIds.other, (uri: vscode.Uri, label: string, restored?: vscode.Range) => this.other(uri, label, restored)),
      vscode.commands.registerCommand(slashCommandIds.block, (uri: vscode.Uri, name: BlockName, line: number) => this.block(uri, name, line)),
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
    return !!found && !!start && !!end && highlightFor(linesOf(found.file), new vscode.Range(start, end), this.store.textReadingOf(found.file)) !== undefined;
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
      const sentence = sentenceBefore(lines, new vscode.Position(position.line, typed.start), this.store.textReadingOf(document));
      const highlight = sentence && new vscode.Range(sentence.start.line, sentence.start.character, sentence.end.line, sentence.end.character);
      if (highlight && this.highlights(document, highlight)) {
        const created = item('/todo', 'Add Todo', `A todo note on ${quoted(document.getText(highlight))}`, vscode.CompletionItemKind.Function, removed, '');
        created.command = { command: slashCommandIds.note, title: 'Add Todo', arguments: [document.uri, highlight, true] };
        items.push(created);
      }
    }
    const reference = new vscode.Position(position.line, typed.start);
    // The reference of a footnote goes after a word: the slash stands after a space.
    if (!replaced && typed.start < typed.slash && this.fileOf(document) && referenceAllowed(lines, reference, this.store.textReadingOf(document))) {
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
      const table = item('/table', 'Add Table', 'A table with its caption line "Table 1:"', vscode.CompletionItemKind.Function, range, new vscode.SnippetString(tableSnippet(captionStart(lines, 'table', position.line))));
      items.push(figure, table, listing);
    }
    // A link stands where a reference of a footnote can stand, in the text of a block.
    if (found && referenceAllowed(lines, new vscode.Position(position.line, typed.slash), this.store.textReadingOf(document)) && (findItems(linesOf(found.file)).length > 0 || readFields(linesOf(found.file)).size > 0)) {
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
    // The commands of other extensions: a command on selected text puts the replaced text back and gets its range, as
    // /note; another command gets the text editor at the place of the command, and only without replaced text.
    for (const [label, other] of this.others) {
      if (other.selection === true && replaced) {
        const restored = new vscode.Range(replaced.start, endOf(replaced.start, replaced.text));
        const created = item(label, other.description ?? '', other.detail ?? `On ${quoted(replaced.text)}`, vscode.CompletionItemKind.Function, range, replaced.text);
        created.command = { command: slashCommandIds.other, title: label, arguments: [document.uri, label, restored] };
        items.push(created);
      } else if (other.selection !== true && !replaced) {
        const created = item(label, other.description ?? '', other.detail ?? '', vscode.CompletionItemKind.Function, range, '');
        created.command = { command: slashCommandIds.other, title: label, arguments: [document.uri, label] };
        items.push(created);
      }
    }
    // The commands of the blocks have the names of the editor of nimblescape Markdown (decision 79), outside the code
    // blocks, the tables and the front matter.
    // Each replaces only the slash and the typed letters, so that VS Code keeps them after the commands of the notes; a
    // command that changes the line removes the spaces before the cursor itself.
    if (!replaced && position.line >= frontMatterEnd(lines) && !codeLines(lines, true).has(position.line)) {
      const ownLine = line.slice(0, typed.slash).trim() === '' && line.slice(position.character).trim() === '';
      const { lead, trail } = blockSpacing(lines, position.line, '', '');
      for (const [name, description] of Object.entries(blockCommands) as [BlockName, string][]) {
        const label = `/${name}`;
        const detail = blockDetails[name];
        const kind = vscode.CompletionItemKind.Function;
        const block = ownLine ? blockSnippets[name] : name === 'image' ? blockSnippets.image : undefined;
        if (block !== undefined) {
          items.push(item(label, description, detail, kind, range, new vscode.SnippetString(name === 'image' ? block : `${lead}${block}${trail}`)));
        } else {
          const created = item(label, description, detail, kind, range, '');
          created.command = { command: slashCommandIds.block, title: description, arguments: [document.uri, name, position.line] };
          items.push(created);
        }
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
   * inEditor runs a command at the cursor of the text editor of a document, after it opened the file of a clean editing
   * view when VS Code closed it.
   * @param uri - The URI of the document.
   * @param run - The command.
   */
  private async inEditor(uri: vscode.Uri, run: (place: Place) => Promise<void>): Promise<void> {
    const editor = this.editorOf(uri);
    if (!editor) {
      return;
    }
    await this.load(editor.document);
    const at = editor.selection.active;
    await run({
      document: editor.document,
      lines: editor.document.getText().split(/\r\n|\r|\n/),
      at,
      clean: this.mirror?.realOf(editor.document.uri) !== undefined,
      insertSnippet: (snippet, keepWhitespace = false) =>
        editor.insertSnippet(new vscode.SnippetString(snippet), at, keepWhitespace ? { undoStopBefore: true, undoStopAfter: true, keepWhitespace: true } : undefined),
      insert: async (inserts) => {
        await editor.edit((builder) => inserts.forEach((each) => builder.insert(each.at, each.text)));
        const length = inserts.filter((each) => each.at.isEqual(at)).reduce((sum, each) => sum + each.text.length, 0);
        const after = new vscode.Position(at.line, at.character + length);
        editor.selection = new vscode.Selection(after, after);
      },
    });
  }

  /**
   * runInText runs a slash command of the view "Markdown Editor" on the text of its file, which its page sent with the
   * place of the cursor ([R-EDIT-008](../docs/requirements.md#r-edit-008)), as in a text editor of the file: `/todo` on
   * the sentence before the cursor opens the editor of the new todo note, and the other commands return the change of
   * the text, which the page makes, and the text to select, for example the caption.
   * @param file - The file of the editor.
   * @param command - The command.
   * @param text - The text of the file that the page sent.
   * @param offset - The place of the cursor in the text.
   * @returns The change, or undefined when the command changes no text.
   */
  async runInText(file: vscode.TextDocument, command: SlashName, text: string, offset: number): Promise<TextChange | undefined> {
    const starts = lineStarts(text);
    const line = starts.filter((start) => start <= offset).length - 1;
    const at = new vscode.Position(line, offset - starts[line]);
    const offsetOf = (position: vscode.Position): number => starts[position.line] + position.character;
    let change: TextChange | undefined;
    // A figure, a table and a listing are blocks: the empty paragraph of the editor, where the cursor is, has no text in
    // the file, so they get the blank lines around them.
    const block = command === 'figure' || command === 'table' || command === 'listing';
    const place: Place = {
      document: file,
      lines: text.split(/\r\n|\r|\n/),
      at,
      clean: false,
      insertSnippet: async (snippet) => {
        const plain = plainSnippet(snippet);
        let insert = plain.text;
        let lead = '';
        if (block) {
          const before = text.slice(0, offset);
          const after = text.slice(offset);
          lead = before === '' || /\n[ \t]*\r?\n$/.test(before) ? '' : before.endsWith('\n') ? '\n' : '\n\n';
          const trail = after === '' || /^\r?\n[ \t]*\r?\n/.test(after) ? '' : after.startsWith('\n') || after.startsWith('\r\n') ? '\n' : '\n\n';
          insert = `${lead}${insert.replace(/\n+$/, '')}${trail}`;
        }
        change = { patches: [{ from: offset, to: offset, insert }] };
        if (plain.select) {
          change.select = { from: offset + lead.length + plain.select[0], to: offset + lead.length + plain.select[1] };
        }
      },
      insert: async (inserts) => {
        const patches = inserts.map((each) => ({ from: offsetOf(each.at), to: offsetOf(each.at), insert: each.text })).sort((a, b) => a.from - b.from);
        const after = offset + patches.filter((patch) => patch.from <= offset).reduce((sum, patch) => sum + patch.insert.length, 0);
        change = { patches, select: { from: after, to: after } };
      },
    };
    switch (command) {
      case 'todo': {
        const sentence = sentenceBefore(place.lines, at, this.store.textReadingOf(file));
        if (sentence) {
          await this.addNoteIn?.(file, new vscode.Range(sentence.start.line, sentence.start.character, sentence.end.line, sentence.end.character), true);
        }
        return undefined;
      }
      case 'table':
        await place.insertSnippet(tableSnippet(captionStart(place.lines, 'table', at.line)));
        break;
      case 'figure':
        await this.figure(place);
        break;
      case 'listing':
        await this.listing(place);
        break;
      case 'ref':
        await this.ref(place);
        break;
      case 'user':
        await this.user(place);
        break;
    }
    return change;
  }

  /**
   * figure inserts an image of the workspace as a figure for `/figure`, after VS Code removed the typed command: the user
   * chooses the image, and the figure gets its caption line, a blank line and the image. The caption is selected for
   * typing, and the text of the image repeats it. Without images, the path is selected after the caption.
   * @param place - The place of the command.
   */
  private async figure(place: Place): Promise<void> {
    const found = this.fileOf(place.document);
    if (!found) {
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
    const caption = captionStart(place.lines, 'figure', place.at.line);
    await place.insertSnippet(`${caption} \${1:Caption}\n\n![\${1:Caption}](${path})`);
  }

  /**
   * listing inserts code of a file of the workspace as a listing for `/listing`
   * ([R-CODE-001](../docs/requirements.md#r-code-001)), after VS Code removed the typed command: the user chooses the
   * file, then the whole file or one of its snippets, and the caption is selected for typing. A file without snippets
   * gives its whole text. The caption is a link to the lines of the source; in the clean editing view, which hides the
   * link and the comment of the listing, they go into the file after the view wrote the caption and the code there. The
   * files of the clones of the references of the front matter are in the list as paths of their references, such as
   * `server:src/api.ts`, and their captions link to GitHub at the commit of the clone; the files of other clones of
   * `mp get` are not ([R-CODE-006](../docs/requirements.md#r-code-006)).
   * @param place - The place of the command.
   */
  private async listing(place: Place): Promise<void> {
    const found = this.fileOf(place.document);
    if (!found) {
      return;
    }
    const folder = found.file.uri.path.replace(/\/[^/]*$/, '');
    const files = await vscode.workspace.findFiles(sourceFiles, '{**/node_modules/**,**/.git/**}', 2000);
    const fileLines = linesOf(found.file);
    const references = referencesOf(fileLines);
    const clone = new RegExp(`/${cloneFolder.replace(/\./g, '\\.')}/([^/]+)/(.+)$`);
    const chosen = await vscode.window.showQuickPick(
      files
        .flatMap((file) => {
          const cloned = clone.exec(file.path);
          if (!cloned) {
            return [{ file, relative: relativePath(folder, file.path) }];
          }
          const path = cloned[2]
            .split('/')
            .map((part) => encodeURIComponent(part).replace(/\(/g, '%28').replace(/\)/g, '%29'))
            .join('/');
          return references.has(cloned[1]) ? [{ file, relative: `${cloned[1]}:${path}` }] : [];
        })
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
    const read = sourceOf(found.file.uri);
    const listed = read && sourceFilesOf(fileLines, read)(chosen.relative);
    const address = listed && !isMissing(listed) ? listed.address : chosen.relative;
    const [, , comment, , ...code] = listingBlock('Caption', chosen.relative, name, text, address);
    const target = listingTarget(address, text, name);
    const file = place.clean ? this.mirror?.realOf(place.document.uri) : undefined;
    // The clean editing view hides the link of the caption and the comment: the view gets the caption and the code block.
    const { at } = place;
    const head = `${captionStart(place.lines, 'listing', at.line)} `;
    const link = `](${target}) ${listingCite(target)}`;
    const lines = file ? [`${head}\${1:Caption}`, '', ...code.map(snippetText)] : [`${head}[\${1:Caption}${snippetText(link)}`, '', snippetText(comment), '', ...code.map(snippetText)];
    await place.insertSnippet(`${lines.join('\n')}\n$0`, true);
    if (file) {
      // The hidden parts go into the file after the view wrote the caption and the code block there.
      await this.mirror?.settled?.(place.document.uri);
      const start = this.mirror!.toReal(place.document.uri, new vscode.Position(at.line, at.character + head.length), true);
      const end = this.mirror!.toReal(place.document.uri, new vscode.Position(at.line, at.character + head.length + 'Caption'.length));
      const fence = this.mirror!.toReal(place.document.uri, new vscode.Position(at.line + 2, 0), true);
      if (start && end && fence) {
        const edit = new vscode.WorkspaceEdit();
        edit.insert(file, start, '[');
        edit.insert(file, end, link);
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
   * @param place - The place of the command.
   */
  private async ref(place: Place): Promise<void> {
    const found = this.fileOf(place.document);
    if (!found) {
      return;
    }
    // The text of the Markdown Editor is the text of its file, which may be newer than the document.
    const lines = place.clean ? linesOf(found.file) : place.lines;
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
      await this.field(place, chosen.key, fields.get(chosen.key) ?? '');
      return;
    }
    const target = items[chosen.index];
    const name = target.anchor ?? target.id ?? anchorName(target, items);
    // A section without an anchor of the older form is linked by the ID of its heading, and gets no anchor.
    const anchored = target.anchor !== undefined || target.id !== undefined;
    const link = `[${chosen.label}](#${name})`;
    const { at, clean } = place;
    await place.insert([
      { at, text: link },
      ...(!anchored && !clean ? [{ at: new vscode.Position(target.line, anchorColumn(lines[target.line], target)), text: anchorText(name) }] : []),
    ]);
    if (!anchored && clean) {
      // The view hides the anchor, so it goes into the file, after the view wrote the link there.
      await this.mirror?.settled?.(place.document.uri);
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
   * @param place - The place of the command.
   * @param key - The key of the value.
   * @param value - The value.
   */
  private async field(place: Place, key: string, value: string): Promise<void> {
    const [open, close] = fieldMarkers(key);
    const { at, clean } = place;
    await place.insert([{ at, text: clean ? value : `${open}${value}${close}` }]);
    const file = clean ? this.mirror!.realOf(place.document.uri)! : undefined;
    if (file) {
      await this.mirror?.settled?.(place.document.uri);
      // The start marker goes after the hidden parts before the value, and the end marker before the ones after it.
      const start = this.mirror!.toReal(place.document.uri, at, true);
      const end = this.mirror!.toReal(place.document.uri, new vscode.Position(at.line, at.character + value.length));
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
   * @param restored - The range of the selected text that VS Code put back, for a command on selected text.
   */
  private async other(uri: vscode.Uri, label: string, restored?: vscode.Range): Promise<void> {
    const command = this.others.get(label);
    const editor = [vscode.window.activeTextEditor, ...vscode.window.visibleTextEditors].find((candidate) => candidate?.document.uri.toString() === uri.toString());
    if (!command || !editor) {
      return;
    }
    const at = editor.selection.active;
    try {
      const run = () => command.run(editor, restored ?? new vscode.Range(at, at));
      // In the clean editing view, only the edits of a slash command may write the tags that the view hides.
      await (this.mirror?.command ? this.mirror.command(uri, run) : run());
    } catch (error) {
      void vscode.window.showErrorMessage(`The slash command ${label} failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * block runs a command of a block in a line with text of a text editor, after VS Code removed the typed command, and
   * removes the spaces before the cursor: `/text`, `/h1` to `/h6`, `/bullets`, `/numbers`, `/tasks` and `/quote` write
   * the marker of their block in place of the marker of the line, `/code` puts the text of the line between the lines
   * of a code block, and `/divider` and `/alert` insert their block between blank lines in place of the spaces around
   * the cursor.
   * @param uri - The URI of the document.
   * @param name - The name of the command.
   * @param line - The index of the line.
   */
  private async block(uri: vscode.Uri, name: BlockName, line: number): Promise<void> {
    const editor = this.editorOf(uri);
    if (!editor || line >= editor.document.lineCount) {
      return;
    }
    const at = editor.selection.active.line === line ? editor.selection.active.character : editor.document.lineAt(line).text.length;
    const full = editor.document.lineAt(line).text;
    const spaces = /[ \t]*$/.exec(full.slice(0, at))![0].length;
    const snippet = blockSnippets[name];
    if (snippet !== undefined && name !== 'code') {
      const before = full.slice(0, at - spaces);
      const after = full.slice(at).replace(/^[ \t]+/, '');
      const { lead, trail } = blockSpacing(linesOf(editor.document), line, before, after);
      const range = new vscode.Range(line, at - spaces, line, full.length - after.length);
      await editor.insertSnippet(new vscode.SnippetString(`${lead}${snippet}${trail}`), range);
      return;
    }
    // The spaces before the cursor go, unless they indent the line.
    if (spaces > 0 && spaces < at) {
      await editor.edit((builder) => builder.delete(new vscode.Range(line, at - spaces, line, at)));
    }
    const text = editor.document.lineAt(line).text;
    if (name === 'code') {
      const { text: content, newEnd } = markLine(text, '');
      const indent = content.slice(0, newEnd);
      await editor.edit((builder) => builder.replace(new vscode.Range(line, 0, line, text.length), `${indent}\`\`\`\n${content}\n${indent}\`\`\``));
      const end = new vscode.Position(line + 1, content.length);
      editor.selection = new vscode.Selection(end, end);
      return;
    }
    const marker = lineMarkers[name];
    if (marker === undefined) {
      return;
    }
    const active = editor.selection.active;
    const { text: marked, oldEnd, newEnd } = markLine(text, marker);
    await editor.edit((builder) => builder.replace(new vscode.Range(line, 0, line, oldEnd), marked.slice(0, newEnd)));
    // The cursor stays in the text of the line.
    if (active.line === line) {
      const cursor = new vscode.Position(line, active.character >= oldEnd ? active.character + newEnd - oldEnd : newEnd);
      editor.selection = new vscode.Selection(cursor, cursor);
    }
  }

  /**
   * user inserts the GitHub login of the user at the cursor of a text editor for `/user` without a sign-in, after VS
   * Code removed the typed command: it asks for the sign-in first.
   * @param place - The place of the command.
   */
  private async user(place: Place): Promise<void> {
    const login = await githubLogin(true);
    this.login = login;
    if (!login) {
      void vscode.window.showInformationMessage('/user inserts your GitHub login after a sign-in with GitHub.');
    } else {
      await place.insert([{ at: place.at, text: login }]);
    }
  }
}
