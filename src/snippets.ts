// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The snippets of the source files and the links of the listings
 * ([R-CODE-003](../docs/requirements.md#r-code-003)).
 *
 * In a source file, the user selects lines and types `/`, as for `/note` in a
 * Markdown file: VS Code replaces the selected lines with the slash, and
 * `/snippet` puts them back, asks for the name of the snippet, and writes its
 * two marks around them in the comment form of the language
 * ([src/notes/listings.ts](notes/listings.ts)). "Add Snippet" in the Command
 * Palette and in the light bulb of selected lines does the same. The comment of
 * a listing in a Markdown file is a link: Ctrl+Click opens its source file at
 * the snippet, as a Markdown link opens its file. The clean editing view hides
 * the comment and the link around the caption of the listing, so there the text
 * of the caption is the link.
 */

import * as vscode from 'vscode';
import { fileOf } from './cleanView';
import { listingFilesOf, sourceOf } from './formatter';
import { findItems } from './notes/figures';
import { captionLinkOf, captionsOf, findListings, isSnippetName, snippetLines, snippetsOf, snippetText } from './notes/listings';
import { referencePath } from './notes/repos';

/** CleanText gives the text of the file of a document of the clean editing view, and the places of the file there. */
export interface CleanText {
  textOf(document: vscode.Uri): string | undefined;
  toClean(file: vscode.Uri, position: vscode.Position): vscode.Position | undefined;
}

/**
 * snippetCommands are the commands of the snippets: the one of the Command Palette, the one of `/snippet`, and the one
 * of the link of the name of a reference in a listing, which opens the clone of the reference in a new window.
 */
export const snippetCommands = {
  add: 'nimblescape.markdownNotes.addSnippet',
  slash: 'nimblescape.markdownNotes.slashSnippet',
  repository: 'nimblescape.markdownNotes.openRepository',
};

/** openRepository is the tooltip of the link that opens the clone of a reference in a new window. */
const openRepository = 'Open Repository in New Window';

/**
 * openClone opens the folder of a clone in a new window of VS Code, where its files can be edited.
 * @param folder - The folder of the clone.
 */
const openClone = (folder: vscode.Uri) => vscode.commands.executeCommand('vscode.openFolder', folder, { forceNewWindow: true });

/**
 * uncommented are the IDs of the languages without comments, whose files get no marks: JSON (a `.json` file with
 * comments, such as `tsconfig.json`, has the language `jsonc`), plain text and tables of values.
 */
const uncommented = new Set(['json', 'plaintext', 'csv', 'tsv', 'log', 'binary']);

/** Selected is the selected text of a source file that a typed slash can replace, at the version of the document. */
interface Selected {
  range: vscode.Range;
  text: string;
  version: number;
}

/** Replaced is the selected text that a typed slash replaced, at the version of the document after the slash. */
interface Replaced {
  document: string;
  version: number;
  start: vscode.Position;
  text: string;
}

/**
 * suggestedName returns a name for a new snippet from its code: the first declared name, in small letters with `-`
 * between its words, or `snippet`.
 * @param text - The code of the snippet.
 */
export function suggestedName(text: string): string {
  const declared = /\b(?:function\*?|class|interface|def|fn|func|fun|const|let|var|struct|enum)\s+([A-Za-z_$][\w$]*)/.exec(text)?.[1];
  const name = (declared ?? '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return isSnippetName(name) ? name : 'snippet';
}

/** Snippets gives the source files `/snippet` and "Add Snippet", and the comments of the listings their links. */
export class Snippets implements vscode.CompletionItemProvider, vscode.CodeActionProvider, vscode.DocumentLinkProvider {
  /** selections are the selected text of each source file, by the URI of the document. */
  private readonly selections = new Map<string, Selected>();
  /** replaced is the selected text that the last typed slash replaced. */
  private replaced: Replaced | undefined;
  /** kind is the kind of the action "Add Snippet" in the light bulb. */
  private readonly kind = vscode.CodeActionKind.Refactor.append('markdownNotes.addSnippet');

  /**
   * @param clean - The clean editing view, whose documents get the links on the captions.
   */
  constructor(private readonly clean?: CleanText) {}

  /** register registers the suggestion, the commands, the action of the light bulb and the links of the listings. */
  register(): vscode.Disposable[] {
    const files: vscode.DocumentSelector = { scheme: 'file' };
    return [
      vscode.languages.registerCompletionItemProvider(files, this, '/'),
      vscode.languages.registerCodeActionsProvider(files, this, { providedCodeActionKinds: [this.kind] }),
      vscode.languages.registerDocumentLinkProvider('markdown', this),
      vscode.window.onDidChangeTextEditorSelection((event) => this.remember(event.textEditor)),
      vscode.workspace.onDidChangeTextDocument((event) => this.replace(event)),
      vscode.workspace.onDidCloseTextDocument((document) => this.selections.delete(document.uri.toString())),
      vscode.commands.registerCommand(snippetCommands.add, (uri?: vscode.Uri, range?: vscode.Range, name?: string) => this.add(uri, range, name)),
      vscode.commands.registerCommand(snippetCommands.slash, (uri: vscode.Uri, range: vscode.Range) => this.add(uri, range)),
      vscode.commands.registerCommand(snippetCommands.repository, (folder: string) => openClone(vscode.Uri.parse(folder))),
    ];
  }

  /**
   * marked tells whether the extension can mark a snippet in a document: a source file of any language that has
   * comments, not a Markdown file. A file type that the extension knows gets the marks in its comment form
   * (`snippetLines`), and another one in the comment form that VS Code knows for its language.
   * @param document - The document.
   */
  private marked(document: vscode.TextDocument): boolean {
    return document.languageId !== 'markdown' && (snippetLines(document.uri.path, 'x') !== undefined || !uncommented.has(document.languageId));
  }

  /**
   * remember keeps the selected text of a text editor of a source file: one selection with text.
   * @param editor - The text editor.
   */
  private remember(editor: vscode.TextEditor): void {
    const { document, selections } = editor;
    if (this.marked(document) && selections.length === 1 && !selections[0].isEmpty) {
      this.selections.set(document.uri.toString(), { range: selections[0], text: document.getText(selections[0]), version: document.version });
    }
  }

  /**
   * replace keeps the selected text that a typed slash replaced: a change of the selection to a slash.
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
   * provideCompletionItems returns `/snippet` after a slash that replaced selected lines of a source file, while the user
   * typed only letters after it.
   * @param document - The document.
   * @param position - The position of the cursor.
   */
  provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): vscode.CompletionItem[] | undefined {
    const replaced = this.replaced;
    if (!replaced || !this.marked(document) || replaced.document !== document.uri.toString() || replaced.start.line !== position.line) {
      return undefined;
    }
    const typed = document.lineAt(position.line).text.slice(replaced.start.character, position.character);
    if (!/^\/[a-z]*$/.test(typed) || document.version - replaced.version !== typed.length - 1) {
      return undefined;
    }
    const lines = replaced.text.split(/\r\n|\r|\n/);
    const end = new vscode.Position(replaced.start.line + lines.length - 1, (lines.length === 1 ? replaced.start.character : 0) + lines.at(-1)!.length);
    const item = new vscode.CompletionItem({ label: '/snippet', description: 'Add Snippet' }, vscode.CompletionItemKind.Function);
    item.detail = 'Marks the selected lines as a snippet, which a listing of a Markdown file can show';
    item.range = new vscode.Range(replaced.start, position);
    item.insertText = replaced.text;
    item.filterText = '/snippet';
    item.command = { command: snippetCommands.slash, title: 'Add Snippet', arguments: [document.uri, new vscode.Range(replaced.start, end)] };
    return [item];
  }

  /**
   * provideCodeActions returns "Add Snippet" for the selected lines of a source file.
   * @param document - The document.
   * @param range - The selection, or another range.
   * @param context - The context, with the kinds that VS Code asks for.
   */
  provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext): vscode.CodeAction[] {
    if (range.isEmpty || !this.marked(document) || (context.only !== undefined && !context.only.contains(this.kind))) {
      return [];
    }
    const action = new vscode.CodeAction('Add Snippet', this.kind);
    action.command = { command: snippetCommands.add, title: 'Add Snippet', arguments: [document.uri, range] };
    return [action];
  }

  /**
   * add marks lines of a source file as a snippet: it asks for the name, and writes the start mark before the first
   * line and the end mark after the last one, with the indentation of the first line.
   * @param uri - The URI of the document, or undefined for the active text editor.
   * @param range - The lines, or undefined for the selection of the text editor.
   * @param given - The name of the snippet, for a keyboard shortcut or another extension, or undefined to ask for it.
   */
  private async add(uri?: vscode.Uri, range?: vscode.Range, given?: string): Promise<void> {
    const editor = uri ? vscode.window.visibleTextEditors.find((candidate) => candidate.document.uri.toString() === uri.toString()) : vscode.window.activeTextEditor;
    const document = editor?.document;
    const lines = range ?? editor?.selection;
    if (!editor || !document || !lines || lines.isEmpty || !this.marked(document)) {
      void vscode.window.showInformationMessage('Select the lines of the snippet in a source file, then run "Add Snippet".');
      return;
    }
    const first = lines.start.line;
    const last = lines.end.character === 0 && lines.end.line > first ? lines.end.line - 1 : lines.end.line;
    const text = document.getText(new vscode.Range(first, 0, last, document.lineAt(last).text.length));
    const taken = new Set(snippetsOf(document.getText().split(/\r\n|\r|\n/)).map((snippet) => snippet.name));
    const name =
      given ??
      (await vscode.window.showInputBox({
        title: 'Add Snippet',
        prompt: 'The name of the snippet, which a listing of a Markdown file names after #',
        value: suggestedName(text),
        validateInput: (value) =>
          !isSnippetName(value) ? 'Small letters and digits, with - between them, for example parse-notes.' : taken.has(value) ? 'The file has a snippet of this name.' : undefined,
      }));
    if (!name || !isSnippetName(name) || taken.has(name)) {
      return;
    }
    const indent = /^\s*/.exec(document.lineAt(first).text)![0];
    const known = snippetLines(document.uri.path, name, indent);
    const [open, close] = known ?? snippetText(name).map((mark) => `${indent}${mark}`);
    const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
    await editor.edit((builder) => builder.replace(new vscode.Range(first, 0, last, document.lineAt(last).text.length), `${open}${eol}${text}${eol}${close}`));
    if (!known) {
      await this.comment(editor, first, last + 2);
    }
  }

  /**
   * comment turns the two marks of a new snippet of a file type that the extension does not know into comments: VS Code
   * writes them in the comment form of the language of the file with its command "Add Line Comment". A language
   * without comments leaves the marks as they are, and they go again, with a message.
   * @param editor - The text editor.
   * @param open - The line of the start mark.
   * @param close - The line of the end mark.
   */
  private async comment(editor: vscode.TextEditor, open: number, close: number): Promise<void> {
    const { document } = editor;
    const bare = (line: number) => snippetText('').some((mark) => document.lineAt(line).text.trim().startsWith(mark.trim()));
    const at = (line: number) => new vscode.Position(line, 0);
    editor.selections = [new vscode.Selection(at(open), at(open)), new vscode.Selection(at(close), at(close))];
    await vscode.commands.executeCommand('editor.action.addCommentLine');
    const end = new vscode.Position(open + 1, 0);
    editor.selection = new vscode.Selection(end, end);
    if (bare(open) || bare(close)) {
      await editor.edit((builder) => {
        builder.delete(new vscode.Range(open, 0, open + 1, 0));
        builder.delete(new vscode.Range(close - 1, document.lineAt(close - 1).text.length, close, document.lineAt(close).text.length));
      });
      void vscode.window.showInformationMessage(`The language ${document.languageId} has no comments for the marks of a snippet. A listing can show the whole file.`);
    }
  }

  /**
   * provideDocumentLinks returns the links of the listings of a Markdown file: the comment of each listing opens its
   * source file at the first line of its snippet, and the name of the reference of a listing of another repository,
   * `server` in `server:src/api.ts`, opens the clone of the reference in a new window. A document of the clean editing
   * view, which hides the comments, gets the links on the texts of the captions.
   * @param document - The document.
   */
  provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
    const real = fileOf(document.uri);
    const file = real ?? document.uri;
    const text = real ? this.clean?.textOf(document.uri) : document.getText();
    if (file.scheme !== 'file' || text === undefined) {
      return [];
    }
    const lines = text.split(/\r\n|\r|\n/);
    const source = sourceOf(file);
    const listings = findListings(lines);
    const captions = real && listings.length > 0 ? captionsOf(lines, findItems(lines), listings) : [];
    // The file of a listing of another repository is in its clone (R-CODE-006).
    const files = listingFilesOf(file, lines);
    return listings.flatMap((listing, index) => {
      const listed = files(listing.path);
      if (!listed) {
        return [];
      }
      const target = listed.uri;
      const code = listing.snippet ? source?.(listed.path)?.split(/\r\n|\r|\n/) : undefined;
      const found = code && snippetsOf(code).find(({ name }) => name === listing.snippet);
      // The number of the first line of the snippet, from 1.
      const line = found ? found.first + 1 : undefined;
      const opens = line ? target.with({ fragment: `L${line}` }) : target;
      const tooltip = listing.snippet ? `Open ${listing.snippet} in ${decodeURIComponent(listing.path)}` : `Open ${decodeURIComponent(listing.path)}`;
      let range: vscode.Range | undefined;
      if (real) {
        // The text of the caption between the hidden `[` and `](…)` of its link.
        const link = captions[index] && captionLinkOf(lines, captions[index]);
        const start = link && this.clean?.toClean(file, new vscode.Position(link.open.line, link.open.end));
        const end = link && this.clean?.toClean(file, new vscode.Position(link.close.line, link.close.start));
        range = start && end && end.isAfter(start) ? new vscode.Range(start, end) : undefined;
      } else {
        const reference = `${listing.path}${listing.snippet ? `#${listing.snippet}` : ''}`;
        const column = lines[listing.line].indexOf(reference);
        const name = listed.clone && referencePath(listing.path)?.name;
        if (listed.clone && name) {
          // The name opens the clone, and the path after the colon the file.
          const repository = new vscode.DocumentLink(
            new vscode.Range(listing.line, column, listing.line, column + name.length),
            vscode.Uri.parse(`command:${snippetCommands.repository}?${encodeURIComponent(JSON.stringify([listed.clone.toString()]))}`),
          );
          repository.tooltip = `${openRepository}: ${name}`;
          const file = new vscode.DocumentLink(new vscode.Range(listing.line, column + name.length + 1, listing.line, column + reference.length), opens);
          file.tooltip = tooltip;
          return [repository, file];
        }
        range = new vscode.Range(listing.line, column, listing.line, column + reference.length);
      }
      if (!range) {
        return [];
      }
      const link = new vscode.DocumentLink(range, opens);
      link.tooltip = tooltip;
      return [link];
    });
  }
}
