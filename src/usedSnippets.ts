// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The snippets of a source file as the text editor shows them
 * ([R-CODE-004](../docs/requirements.md#r-code-004)). Hannes, 2026-10-30,
 * 04:34: "the editor shall sow it as a rendered tag, unobstrusive, similar to
 * the small font annotations that are there sometimes", "the source code text
 * editor gets an icon toggle button the highlights the used snippets in a
 * source code view"; 05:49: "what about B but in a rendered way", "we do not
 * want it to be editable", "it is a whole line comment so jumping cursors is
 * not a problem"; 05:53: "can t we just jump over it?"; 05:57: "the complete
 * mark shall appear as a code lens line instead of the line itself", "the
 * clicking the end tag jumps to the start tag".
 *
 * Each mark line of a snippet shows as a tag in the small gray letters of a
 * code lens in place of its comment: the start mark as the name of the
 * snippet and the listings of the Markdown files of the workspace that show
 * it, for example "snippet keep-lines · Listing 2 in paper/paper.md", and the
 * end mark as "/snippet keep-lines". The characters of the file stay as they are; only the comment
 * is hidden. The cursor jumps over a mark line, as over a header line of a
 * note ([src/notes/cursor.ts](notes/cursor.ts)), and Backspace and Delete next
 * to a mark line do nothing, so no key changes a hidden mark: the hidden
 * characters of a whole line never stand between visible characters, which
 * caused the bugs of the cursor at the hidden markers of the notes. A click
 * on a start tag opens the Markdown file at the listing; a click on an end tag
 * puts the cursor on the first line of the code and shows the start tag.
 * "Rename Snippet", which
 * also renames the snippet in the listings, and "Remove Snippet" in the light
 * bulb of the code of a snippet change the marks. The button "Show Used
 * Snippets" in the title of the text editor of a source file with snippets
 * gives the lines of each snippet that a listing shows a background color,
 * until "Hide Used Snippets".
 */

import * as vscode from 'vscode';
import { locksLine, offLines } from './notes/cursor';
import { findItems, labelOf, wordOf } from './notes/figures';
import { findListings, isSnippetName, snippetsOf } from './notes/listings';

/**
 * usedSnippetCommands are the commands of the snippets in the text editor of a source file: the two buttons, the
 * opening of the listings of a snippet, the two actions of the light bulb, and the keys next to a mark line.
 */
export const usedSnippetCommands = {
  show: 'nimblescape.markdownNotes.showUsedSnippets',
  hide: 'nimblescape.markdownNotes.hideUsedSnippets',
  open: 'nimblescape.markdownNotes.openSnippetUse',
  rename: 'nimblescape.markdownNotes.renameSnippet',
  remove: 'nimblescape.markdownNotes.removeSnippet',
  keep: 'nimblescape.markdownNotes.keepSnippetMark',
};

/**
 * usedSnippetContexts are the context keys of the buttons, a source file with snippets and the highlights shown, and
 * of the keys that would join a line with a mark line: one on the left side of the cursor, one on its right side.
 */
export const usedSnippetContexts = {
  has: 'nimblescape.markdownNotes.hasSnippets',
  shown: 'nimblescape.markdownNotes.usedSnippetsShown',
  left: 'nimblescape.markdownNotes.snippetMarkLeft',
  right: 'nimblescape.markdownNotes.snippetMarkRight',
};

/** markText matches the text of a mark of a snippet up to its name. */
const markText = /\bmarkdownnotes:\s*\/?snippet\s+/;

/** linesOf returns the lines of a document. */
const linesOf = (document: vscode.TextDocument): string[] => document.getText().split(/\r\n|\r|\n/);

/** Snippet is a snippet of a source file: its name, and the index of the first and the last line of its code. */
type Snippet = ReturnType<typeof snippetsOf>[number];

/**
 * markLinesOf returns the lines of the marks of the snippets of a source, with the name of the snippet of each.
 * @param snippets - The snippets of the source.
 */
const markLinesOf = (snippets: readonly Snippet[]): Map<number, string> => new Map(snippets.flatMap(({ name, first, last }) => [[first - 1, name] as const, [last + 1, name] as const]));

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
 * snippet after `#`: each listing that names a snippet, with its number when it has a caption line.
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
    if (!listing.snippet) {
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
    const key = `${source.path}#${listing.snippet}`;
    uses.set(key, [...(uses.get(key) ?? []), { markdown: file, line: listing.line, label }]);
  });
  return uses;
}

/**
 * UsedSnippets shows the marks of the snippets of a source file as tags in its text editor, keeps the cursor off them,
 * changes them with the actions of the light bulb, and highlights the used snippets.
 */
export class UsedSnippets implements vscode.CodeActionProvider {
  /** uses are the uses of the snippets of the workspace, read once and again after a change of a Markdown file. */
  private uses: Promise<Map<string, Use[]>> | undefined;
  /** shown tells whether the lines of the used snippets have their background color. */
  private shown = false;
  /** timer delays the new reading of the uses after a change of a Markdown file. */
  private timer: ReturnType<typeof setTimeout> | undefined;
  /** cursors are the selections of each text editor after the last change, for the direction of a move of the cursor. */
  private readonly cursors = new WeakMap<vscode.TextEditor, readonly vscode.Selection[]>();
  /** contexts holds the values of the context keys of the keys next to a mark line that the extension set last. */
  private readonly contexts = { left: false, right: false };
  /** hidden hides the comment of each mark line; tags shows its tag in its place. */
  private readonly hidden = vscode.window.createTextEditorDecorationType({ textDecoration: 'none; display: none;' });
  private readonly tags = vscode.window.createTextEditorDecorationType({});
  /** used colors the lines of each used snippet. */
  private readonly used = vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    backgroundColor: 'rgba(255, 212, 0, 0.16)',
    overviewRulerColor: 'rgba(255, 212, 0, 0.6)',
    overviewRulerLane: vscode.OverviewRulerLane.Right,
  });
  /** renameKind and removeKind are the kinds of the actions "Rename Snippet" and "Remove Snippet" in the light bulb. */
  private readonly renameKind = vscode.CodeActionKind.Refactor.append('markdownNotes.renameSnippet');
  private readonly removeKind = vscode.CodeActionKind.Refactor.append('markdownNotes.removeSnippet');

  /** register registers the tags, the steps of the cursor, the buttons, the actions and the listeners of the changes. */
  register(): vscode.Disposable[] {
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.md');
    const reset = () => this.reset();
    void vscode.commands.executeCommand('setContext', usedSnippetContexts.shown, false);
    void this.decorate();
    return [
      this.hidden,
      this.tags,
      this.used,
      watcher,
      { dispose: () => clearTimeout(this.timer) },
      vscode.languages.registerCodeActionsProvider({ scheme: 'file' }, this, { providedCodeActionKinds: [this.renameKind, this.removeKind] }),
      watcher.onDidCreate(reset),
      watcher.onDidChange(reset),
      watcher.onDidDelete(reset),
      vscode.workspace.onDidChangeTextDocument((event) => (event.document.languageId === 'markdown' ? this.reset() : event.contentChanges.length > 0 ? void this.decorate() : undefined)),
      vscode.window.onDidChangeActiveTextEditor(() => void this.decorate()),
      vscode.window.onDidChangeVisibleTextEditors(() => void this.decorate()),
      vscode.window.onDidChangeTextEditorSelection((event) => this.stepOver(event)),
      vscode.commands.registerCommand(usedSnippetCommands.show, () => this.toggle(true)),
      vscode.commands.registerCommand(usedSnippetCommands.hide, () => this.toggle(false)),
      vscode.commands.registerCommand(usedSnippetCommands.open, (uses: Use[]) => this.open(uses)),
      vscode.commands.registerCommand(usedSnippetCommands.rename, (uri?: vscode.Uri, name?: string) => this.rename(uri, name)),
      vscode.commands.registerCommand(usedSnippetCommands.remove, (uri?: vscode.Uri, name?: string) => this.remove(uri, name)),
      vscode.commands.registerCommand(usedSnippetCommands.keep, () => undefined),
    ];
  }

  /** reset reads the uses again a moment after the last change of a Markdown file. */
  private reset(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.uses = undefined;
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
   * toggle shows or hides the background color of the lines of the used snippets.
   * @param shown - Whether the lines get the color.
   */
  private async toggle(shown: boolean): Promise<void> {
    this.shown = shown;
    await vscode.commands.executeCommand('setContext', usedSnippetContexts.shown, shown);
    await this.decorate();
  }

  /**
   * decorate shows the mark lines of the snippets in the visible text editors of source files as tags, and colors the
   * used snippets.
   */
  private async decorate(): Promise<void> {
    const active = vscode.window.activeTextEditor;
    const editors = vscode.window.visibleTextEditors.filter((editor) => this.source(editor.document));
    const snippets = new Map(editors.map((editor) => [editor, snippetsOf(linesOf(editor.document))]));
    await vscode.commands.executeCommand('setContext', usedSnippetContexts.has, active !== undefined && (snippets.get(active)?.length ?? 0) > 0);
    this.markContext(active);
    const uses = [...snippets.values()].some((found) => found.length > 0) ? await this.usesOf() : new Map<string, Use[]>();
    for (const [editor, found] of snippets) {
      const document = editor.document;
      const path = document.uri.path;
      const hidden: vscode.Range[] = [];
      const tags: vscode.DecorationOptions[] = [];
      const tag = (line: number, text: string, hover: string) => {
        if (line >= document.lineCount) {
          return;
        }
        const content = document.lineAt(line);
        const range = new vscode.Range(line, content.firstNonWhitespaceCharacterIndex, line, content.text.length);
        hidden.push(range);
        tags.push({
          range,
          hoverMessage: hover,
          // The tag has the color and the size of the text of a code lens (Hannes, 05:57: "the complete mark shall
          // appear as a code lens line instead of the line itself"); VS Code lets no extension change the height of
          // a line.
          renderOptions: { before: { contentText: text, color: new vscode.ThemeColor('editorCodeLens.foreground'), textDecoration: 'none; font-size: 90%;' } },
        });
      };
      for (const { name, first, last } of found) {
        const listed = uses.get(`${path}#${name}`) ?? [];
        const where = listed.length > 0 ? listed.map((use) => use.label).join(', ') : 'in no listing';
        tag(first - 1, `snippet ${name} · ${where}`, listed.length > 0 ? `A click opens ${listed.length === 1 ? 'the listing' : 'one of the listings'}.` : 'No listing of a Markdown file of the workspace shows this snippet.');
        tag(last + 1, `/snippet ${name}`, `The end of the snippet ${name}: a click shows its start.`);
      }
      editor.setDecorations(this.hidden, hidden);
      editor.setDecorations(this.tags, tags);
      editor.setDecorations(this.used, this.shown ? found.filter(({ name, first, last }) => last >= first && uses.has(`${path}#${name}`)).map(({ first, last }) => new vscode.Range(first, 0, last, 0)) : []);
    }
  }

  /**
   * stepOver moves each cursor of a text editor of a source file off a mark line, in the direction of its move, so that
   * no typed key changes a hidden mark; a selection of text stays as it is. A click on the tag of a start mark opens
   * the listings of its snippet, and a click on the tag of an end mark puts the cursor at the start of the snippet
   * (Hannes, 05:57: "the clicking the end tag jumps to the start tag").
   * @param event - The change of the selections.
   */
  private stepOver(event: vscode.TextEditorSelectionChangeEvent): void {
    const editor = event.textEditor;
    const selections = editor.selections;
    const snippets = this.source(editor.document) ? snippetsOf(linesOf(editor.document)) : [];
    const marks = markLinesOf(snippets);
    if (marks.size === 0) {
      this.cursors.set(editor, selections);
      this.markContext(editor);
      return;
    }
    const lines = linesOf(editor.document);
    const blocked = new Set(marks.keys());
    const previous = this.cursors.get(editor);
    const clicked = event.kind === vscode.TextEditorSelectionChangeKind.Mouse && selections.length === 1 && selections[0].isEmpty ? selections[0].active.line : undefined;
    const opened = clicked === undefined ? undefined : snippets.find(({ first }) => first - 1 === clicked);
    const ended = clicked === undefined ? undefined : snippets.find(({ last }) => last + 1 === clicked);
    const moved = selections.map((selection, index) => {
      if (ended) {
        const at = new vscode.Position(ended.first, 0);
        return new vscode.Selection(at, at);
      }
      if (!selection.isEmpty) {
        return selection;
      }
      const free = offLines(blocked, lines, selection.active, previous?.[index]?.active);
      const position = new vscode.Position(free.line, free.character);
      return position.isEqual(selection.active) ? selection : new vscode.Selection(position, position);
    });
    this.cursors.set(editor, moved);
    if (moved.some((selection, index) => selection !== selections[index])) {
      editor.selections = moved;
    }
    this.markContext(editor);
    if (ended) {
      editor.revealRange(new vscode.Range(ended.first - 1, 0, ended.first - 1, 0), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    } else if (opened) {
      void this.usesOf().then((uses) => {
        const found = uses.get(`${editor.document.uri.path}#${opened.name}`) ?? [];
        return found.length > 0 ? this.open(found) : undefined;
      });
    }
  }

  /**
   * markContext sets the context keys that tell whether Backspace or Delete would join the line of the cursor with a
   * mark line, for one empty selection in the active editor of a source file.
   * @param editor - The text editor.
   */
  private markContext(editor: vscode.TextEditor | undefined): void {
    const active = editor !== undefined && editor === vscode.window.activeTextEditor && this.source(editor.document) ? editor : undefined;
    const cursor = active && active.selections.length === 1 && active.selection.isEmpty ? active.selection.active : undefined;
    const lines = cursor ? linesOf(active!.document) : [];
    const blocked = cursor ? new Set(markLinesOf(snippetsOf(lines)).keys()) : new Set<number>();
    for (const side of ['left', 'right'] as const) {
      const next = cursor !== undefined && blocked.size > 0 && locksLine(blocked, lines, cursor, side);
      if (next !== this.contexts[side]) {
        this.contexts[side] = next;
        void vscode.commands.executeCommand('setContext', usedSnippetContexts[side], next);
      }
    }
  }

  /**
   * snippetAt returns the snippet of a source whose marks or code hold a range, the innermost one of nested snippets.
   * @param snippets - The snippets of the source.
   * @param range - The range.
   */
  private snippetAt(snippets: readonly Snippet[], range: vscode.Range): Snippet | undefined {
    return snippets.filter(({ first, last }) => range.start.line >= first - 1 && range.end.line <= last + 1).sort((a, b) => b.first - a.first)[0];
  }

  /**
   * provideCodeActions returns "Rename Snippet" and "Remove Snippet" for the snippet of the selected lines or the
   * cursor of a source file.
   * @param document - The document.
   * @param range - The selected range, or the place of the cursor.
   * @param context - The context, with the kinds that VS Code asks for.
   */
  provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext): vscode.CodeAction[] {
    const snippet = this.source(document) ? this.snippetAt(snippetsOf(linesOf(document)), range) : undefined;
    if (!snippet) {
      return [];
    }
    const action = (title: string, kind: vscode.CodeActionKind, command: string) => {
      const found = new vscode.CodeAction(title, kind);
      found.command = { title, command, arguments: [document.uri, snippet.name] };
      return found;
    };
    return [action(`Rename Snippet "${snippet.name}"`, this.renameKind, usedSnippetCommands.rename), action(`Remove Snippet "${snippet.name}"`, this.removeKind, usedSnippetCommands.remove)].filter(
      (found) => context.only === undefined || context.only.contains(found.kind!),
    );
  }

  /**
   * chosen returns the document and the snippet of a command: the named snippet of a file, or the snippet at the cursor
   * of the active editor.
   * @param uri - The URI of the source file, or undefined for the active editor.
   * @param name - The name of the snippet, or undefined for the snippet at the cursor.
   */
  private async chosen(uri?: vscode.Uri, name?: string): Promise<{ document: vscode.TextDocument; snippet: Snippet; snippets: Snippet[] } | undefined> {
    const editor = vscode.window.activeTextEditor;
    const document = uri ? await vscode.workspace.openTextDocument(uri) : editor?.document;
    if (!document || !this.source(document)) {
      return undefined;
    }
    const snippets = snippetsOf(linesOf(document));
    const snippet = name !== undefined ? snippets.find((candidate) => candidate.name === name) : editor && this.snippetAt(snippets, editor.selection);
    return snippet && { document, snippet, snippets };
  }

  /**
   * rename asks for a new name of a snippet and writes it into its two marks and into the comments of the listings of
   * the Markdown files of the workspace that show it.
   * @param uri - The URI of the source file, or undefined for the active editor.
   * @param name - The name of the snippet, or undefined for the snippet at the cursor.
   */
  private async rename(uri?: vscode.Uri, name?: string): Promise<void> {
    const found = await this.chosen(uri, name);
    if (!found) {
      return;
    }
    const { document, snippet, snippets } = found;
    const given = await vscode.window.showInputBox({
      prompt: 'The new name of the snippet: small letters and digits, with - between them',
      value: snippet.name,
      validateInput: (value) =>
        !isSnippetName(value) ? 'Small letters and digits, with - between them' : value !== snippet.name && snippets.some((other) => other.name === value) ? 'The file has a snippet of this name' : undefined,
    });
    if (!given || given === snippet.name || !isSnippetName(given)) {
      return;
    }
    const edit = new vscode.WorkspaceEdit();
    for (const line of [snippet.first - 1, snippet.last + 1]) {
      const mark = markText.exec(document.lineAt(line).text);
      if (mark) {
        const start = mark.index + mark[0].length;
        edit.replace(document.uri, new vscode.Range(line, start, line, start + snippet.name.length), given);
      }
    }
    const key = `${document.uri.path}#${snippet.name}`;
    const files = new Map(((await this.usesOf()).get(key) ?? []).map((use) => [use.markdown.toString(), use.markdown]));
    for (const file of files.values()) {
      const markdown = await vscode.workspace.openTextDocument(file);
      for (const use of usesOfText(linesOf(markdown), file, '').get(key) ?? []) {
        const text = markdown.lineAt(use.line).text;
        const start = text.lastIndexOf(`#${snippet.name}`) + 1;
        edit.replace(file, new vscode.Range(use.line, start, use.line, start + snippet.name.length), given);
      }
    }
    await vscode.workspace.applyEdit(edit);
    this.uses = undefined;
  }

  /**
   * remove removes the two marks of a snippet and leaves its code; when a listing shows the snippet, the user agrees
   * first.
   * @param uri - The URI of the source file, or undefined for the active editor.
   * @param name - The name of the snippet, or undefined for the snippet at the cursor.
   */
  private async remove(uri?: vscode.Uri, name?: string): Promise<void> {
    const found = await this.chosen(uri, name);
    if (!found) {
      return;
    }
    const { document, snippet } = found;
    const listed = (await this.usesOf()).get(`${document.uri.path}#${snippet.name}`) ?? [];
    if (listed.length > 0) {
      const answer = await vscode.window.showWarningMessage(
        `${listed.map((use) => use.label).join(', ')} ${listed.length === 1 ? 'shows' : 'show'} the snippet ${snippet.name}. Remove its marks? The listing is then not found.`,
        { modal: true },
        'Remove',
      );
      if (answer !== 'Remove') {
        return;
      }
    }
    const edit = new vscode.WorkspaceEdit();
    for (const line of [snippet.first - 1, snippet.last + 1]) {
      // A mark on the last line goes with the line break before it.
      const range = line + 1 < document.lineCount ? new vscode.Range(line, 0, line + 1, 0) : new vscode.Range(line - 1, document.lineAt(line - 1).text.length, line, document.lineAt(line).text.length);
      edit.replace(document.uri, range, '');
    }
    await vscode.workspace.applyEdit(edit);
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
