// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The snippets of the source files and the links of the listings
 * ([R-CODE-003](../docs/requirements.md#r-code-003)). Hannes, 2026-10-30,
 * 03:20: "a slash command in the source code editor /snippet adds the mark,
 * but the mark must be more clear it belongs to the notes plugin", "snippet is
 * the correct name for it", "it is like markdown links extension".
 *
 * In a source file, the user selects lines and types `/`, as for `/note` in a
 * Markdown file: VS Code replaces the selected lines with the slash, and
 * `/snippet` puts them back, asks for the name of the snippet, and writes its
 * two marks around them in the comment form of the language
 * ([src/notes/listings.ts](notes/listings.ts)). "Add Snippet" in the Command
 * Palette and in the light bulb of selected lines does the same. The comment of
 * a listing in a Markdown file is a link: Ctrl+Click opens its source file at
 * the snippet or the symbol, as a Markdown link opens its file.
 */

import * as vscode from 'vscode';
import { fileOf } from './cleanView';
import { sourceOf } from './formatter';
import { findListings, hasSymbols, isSnippetName, snippetLines, snippetsOf, symbolLines } from './notes/listings';

/** snippetCommands are the commands of the snippets: the one of the Command Palette, and the one of `/snippet`. */
export const snippetCommands = {
  add: 'nimblescape.markdownNotes.addSnippet',
  slash: 'nimblescape.markdownNotes.slashSnippet',
};

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
      vscode.commands.registerCommand(snippetCommands.add, (uri?: vscode.Uri, range?: vscode.Range) => this.add(uri, range)),
      vscode.commands.registerCommand(snippetCommands.slash, (uri: vscode.Uri, range: vscode.Range) => this.add(uri, range)),
    ];
  }

  /**
   * marked tells whether the extension can mark a snippet in a document: a source file whose language has comments of
   * a line, not a Markdown file.
   * @param document - The document.
   */
  private marked(document: vscode.TextDocument): boolean {
    return document.languageId !== 'markdown' && snippetLines(document.uri.path, 'x') !== undefined;
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
   */
  private async add(uri?: vscode.Uri, range?: vscode.Range): Promise<void> {
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
    const name = await vscode.window.showInputBox({
      title: 'Add Snippet',
      prompt: 'The name of the snippet, which a listing of a Markdown file names after #',
      value: suggestedName(text),
      validateInput: (value) =>
        !isSnippetName(value) ? 'Small letters and digits, with - between them, for example parse-notes.' : taken.has(value) ? 'The file has a snippet of this name.' : undefined,
    });
    if (!name || !isSnippetName(name) || taken.has(name)) {
      return;
    }
    const indent = /^\s*/.exec(document.lineAt(first).text)![0];
    const [open, close] = snippetLines(document.uri.path, name, indent)!;
    const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
    await editor.edit((builder) => builder.replace(new vscode.Range(first, 0, last, document.lineAt(last).text.length), `${open}${eol}${text}${eol}${close}`));
  }

  /**
   * provideDocumentLinks returns the links of the comments of the listings of a Markdown file: each opens its source
   * file at the first line of its snippet or its symbol.
   * @param document - The document.
   */
  provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
    const file = fileOf(document.uri) ?? document.uri;
    if (file.scheme !== 'file') {
      return [];
    }
    const lines = document.getText().split(/\r\n|\r|\n/);
    const source = sourceOf(file);
    return findListings(lines).flatMap((listing) => {
      const text = lines[listing.line];
      const reference = `${listing.path}${listing.symbol ? `#${listing.symbol}` : ''}`;
      const column = text.indexOf(reference);
      let target: vscode.Uri;
      try {
        target = vscode.Uri.joinPath(file, '..', decodeURIComponent(listing.path));
      } catch {
        return [];
      }
      const code = listing.symbol ? source?.(listing.path)?.split(/\r\n|\r|\n/) : undefined;
      const found = code && (snippetsOf(code).find((snippet) => snippet.name === listing.symbol) ?? (hasSymbols(listing.path) ? symbolLines(code, listing.symbol!) : undefined));
      // The number of the first line of the snippet or the symbol, from 1.
      const line = found ? found.first + 1 : undefined;
      const link = new vscode.DocumentLink(new vscode.Range(listing.line, column, listing.line, column + reference.length), line ? target.with({ fragment: `L${line}` }) : target);
      link.tooltip = listing.symbol ? `Open ${listing.symbol} in ${decodeURIComponent(listing.path)}` : `Open ${decodeURIComponent(listing.path)}`;
      return [link];
    });
  }
}
