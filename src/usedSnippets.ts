// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The snippets of a source file as the text editor shows them
 * ([R-CODE-004](../docs/requirements.md#r-code-004)). Hannes, 2026-10-30,
 * 04:34: "the editor shall sow it as a rendered tag, unobstrusive, similar to
 * the small font annotations that are there sometimes", "the source code text
 * editor gets an icon toggle button the highlights the used snippets in a
 * source code view".
 *
 * Above the start mark of each snippet, VS Code shows a small line of a code
 * lens, as its line "3 references" above a function: the name of the snippet
 * and the listings of the Markdown files of the workspace that show it, for
 * example "snippet keep-lines · Listing 2 in paper/paper.md". A click on it
 * opens the Markdown file at the listing. The two marks show dimmed, and the
 * characters of the file stay as they are. The button "Show Used Snippets" in
 * the title of the text editor of a source file with snippets gives the lines
 * of each snippet that a listing shows a background color, until "Hide Used
 * Snippets".
 */

import * as vscode from 'vscode';
import { findItems, labelOf, wordOf } from './notes/figures';
import { findListings, snippetsOf } from './notes/listings';

/** usedSnippetCommands are the commands of the used snippets: the two buttons, and the click on a code lens. */
export const usedSnippetCommands = {
  show: 'nimblescape.markdownNotes.showUsedSnippets',
  hide: 'nimblescape.markdownNotes.hideUsedSnippets',
  open: 'nimblescape.markdownNotes.openSnippetUse',
};

/** usedSnippetContexts are the context keys of the buttons: a source file with snippets, and the highlights shown. */
export const usedSnippetContexts = {
  has: 'nimblescape.markdownNotes.hasSnippets',
  shown: 'nimblescape.markdownNotes.usedSnippetsShown',
};

/** Use is a listing of a Markdown file that shows a snippet. */
export interface Use {
  /** markdown is the URI of the Markdown file, and line the line of the comment of the listing. */
  markdown: vscode.Uri;
  line: number;
  /** label names the listing, for example "Listing 2 in paper/paper.md", or only the file for a listing without caption. */
  label: string;
}

/**
 * usesOfText returns the uses of the snippets of a Markdown text, by the path of the source file and the name of the
 * snippet after `#`: each listing that names a snippet or a symbol, with its number when it has a caption line.
 * @param lines - The lines of the Markdown text.
 * @param file - The URI of the Markdown file.
 * @param where - The path of the Markdown file that the labels name.
 */
export function usesOfText(lines: readonly string[], file: vscode.Uri, where: string): Map<string, Use[]> {
  const uses = new Map<string, Use[]>();
  const listings = findListings(lines);
  if (listings.length === 0) {
    return uses;
  }
  const items = findItems(lines);
  const captions = items.filter((item) => item.kind === 'listing');
  const word = wordOf(lines, 'listing') ?? 'Listing';
  listings.forEach((listing, index) => {
    if (!listing.symbol) {
      return;
    }
    let source: vscode.Uri;
    try {
      source = vscode.Uri.joinPath(file, '..', decodeURIComponent(listing.path));
    } catch {
      return;
    }
    // The caption line stands directly before the comment, or one blank line before it, after the listing before.
    const previous = index > 0 ? listings[index - 1].close : -1;
    const caption = captions.find((item) => item.line > previous && item.line < listing.line && listing.line - item.line <= 2);
    const label = caption ? `${word} ${labelOf(items, caption)} in ${where}` : where;
    const key = `${source.path}#${listing.symbol}`;
    uses.set(key, [...(uses.get(key) ?? []), { markdown: file, line: listing.line, label }]);
  });
  return uses;
}

/** UsedSnippets shows the uses of the snippets of a source file in its text editor, and highlights the used snippets. */
export class UsedSnippets implements vscode.CodeLensProvider {
  /** uses are the uses of the snippets of the workspace, read once and again after a change of a Markdown file. */
  private uses: Promise<Map<string, Use[]>> | undefined;
  /** shown tells whether the lines of the used snippets have their background color. */
  private shown = false;
  /** timer delays the new reading of the uses after a change of a Markdown file. */
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly changed = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this.changed.event;
  /** marks dims the two marks of each snippet; used colors the lines of each used snippet. */
  private readonly marks = vscode.window.createTextEditorDecorationType({ opacity: '0.5' });
  private readonly used = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    backgroundColor: 'rgba(255, 212, 0, 0.16)',
    overviewRulerColor: 'rgba(255, 212, 0, 0.6)',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
  });

  /** register registers the code lenses, the buttons, the click on a code lens and the listeners of the changes. */
  register(): vscode.Disposable[] {
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.md');
    const reset = () => this.reset();
    void vscode.commands.executeCommand('setContext', usedSnippetContexts.shown, false);
    void this.decorate();
    return [
      this.marks,
      this.used,
      this.changed,
      watcher,
      { dispose: () => clearTimeout(this.timer) },
      vscode.languages.registerCodeLensProvider({ scheme: 'file' }, this),
      watcher.onDidCreate(reset),
      watcher.onDidChange(reset),
      watcher.onDidDelete(reset),
      vscode.workspace.onDidChangeTextDocument((event) => (event.document.languageId === 'markdown' ? this.reset() : event.contentChanges.length > 0 ? void this.decorate() : undefined)),
      vscode.window.onDidChangeActiveTextEditor(() => void this.decorate()),
      vscode.window.onDidChangeVisibleTextEditors(() => void this.decorate()),
      vscode.commands.registerCommand(usedSnippetCommands.show, () => this.toggle(true)),
      vscode.commands.registerCommand(usedSnippetCommands.hide, () => this.toggle(false)),
      vscode.commands.registerCommand(usedSnippetCommands.open, (uses: Use[]) => this.open(uses)),
    ];
  }

  /** reset reads the uses again a moment after the last change of a Markdown file. */
  private reset(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.uses = undefined;
      this.changed.fire();
      void this.decorate();
    }, 500);
  }

  /** usesOf returns the uses of the snippets of the workspace, by the path of the source file and the name. */
  private usesOf(): Promise<Map<string, Use[]>> {
    this.uses ??= this.read();
    return this.uses;
  }

  /** read reads the listings of the Markdown files of the workspace: an open document as it stands, else the disk. */
  private async read(): Promise<Map<string, Use[]>> {
    const uses = new Map<string, Use[]>();
    const files = await vscode.workspace.findFiles('**/*.md', '{**/node_modules/**,**/.git/**}', 2000);
    for (const file of files) {
      const open = vscode.workspace.textDocuments.find((document) => document.uri.toString() === file.toString());
      let text: string;
      try {
        text = open ? open.getText() : new TextDecoder().decode(await vscode.workspace.fs.readFile(file));
      } catch {
        continue;
      }
      if (!text.includes('<!-- listing:')) {
        continue;
      }
      for (const [key, found] of usesOfText(text.split(/\r\n|\r|\n/), file, vscode.workspace.asRelativePath(file))) {
        uses.set(key, [...(uses.get(key) ?? []), ...found]);
      }
    }
    return uses;
  }

  /**
   * source tells whether the extension shows the snippets of a document: a file of the disk that is no Markdown file.
   * @param document - The document.
   */
  private source(document: vscode.TextDocument): boolean {
    return document.uri.scheme === 'file' && document.languageId !== 'markdown';
  }

  /**
   * provideCodeLenses returns a code lens above the start mark of each snippet of a source file: its name and the
   * listings that show it, which a click opens.
   * @param document - The document.
   */
  async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
    if (!this.source(document)) {
      return [];
    }
    const snippets = snippetsOf(document.getText().split(/\r\n|\r|\n/));
    if (snippets.length === 0) {
      return [];
    }
    const uses = await this.usesOf();
    return snippets.map(({ name, first }) => {
      const found = uses.get(`${document.uri.path}#${name}`) ?? [];
      const title = `snippet ${name} · ${found.length > 0 ? found.map((use) => use.label).join(', ') : 'in no listing'}`;
      const range = new vscode.Range(first - 1, 0, first - 1, 0);
      return new vscode.CodeLens(range, found.length > 0 ? { title, command: usedSnippetCommands.open, arguments: [found], tooltip: 'Open the listing' } : { title, command: '' });
    });
  }

  /**
   * toggle shows or hides the background color of the lines of the used snippets.
   * @param shown - Whether the lines get the color.
   */
  private async toggle(shown: boolean): Promise<void> {
    this.shown = shown;
    await vscode.commands.executeCommand('setContext', usedSnippetContexts.shown, shown);
    await this.decorate();
  }

  /** decorate dims the marks of the snippets in the visible text editors of source files, and colors the used snippets. */
  private async decorate(): Promise<void> {
    const active = vscode.window.activeTextEditor;
    const editors = vscode.window.visibleTextEditors.filter((editor) => this.source(editor.document));
    const snippets = new Map(editors.map((editor) => [editor, snippetsOf(editor.document.getText().split(/\r\n|\r|\n/))]));
    await vscode.commands.executeCommand('setContext', usedSnippetContexts.has, active !== undefined && (snippets.get(active)?.length ?? 0) > 0);
    const uses = this.shown && [...snippets.values()].some((found) => found.length > 0) ? await this.usesOf() : undefined;
    for (const [editor, found] of snippets) {
      const line = (index: number) => new vscode.Range(index, 0, index, editor.document.lineAt(index).text.length);
      editor.setDecorations(
        this.marks,
        found.flatMap(({ first, last }) => [line(first - 1), line(last + 1)]),
      );
      const path = editor.document.uri.path;
      editor.setDecorations(this.used, uses ? found.filter(({ name, first, last }) => last >= first && uses.has(`${path}#${name}`)).map(({ first, last }) => new vscode.Range(first, 0, last, 0)) : []);
    }
  }

  /**
   * open opens the Markdown file of a use at its listing; with several uses, the user chooses one first.
   * @param uses - The uses of the snippet.
   */
  private async open(uses: readonly Use[]): Promise<void> {
    const chosen = uses.length === 1 ? uses[0] : (await vscode.window.showQuickPick(uses.map((use) => ({ label: use.label, use })), { placeHolder: 'The listing to open' }))?.use;
    if (chosen) {
      const at = new vscode.Position(chosen.line, 0);
      await vscode.window.showTextDocument(chosen.markdown, { selection: new vscode.Range(at, at) });
    }
  }
}
