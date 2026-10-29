// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The clean editing view of a Markdown file with notes
 * ([R-TEXT-009](../docs/requirements.md#r-text-009), decision 27). The text
 * editor of the view edits the clean text of the file
 * ([src/notes/clean.ts](notes/clean.ts)): the text without the start markers,
 * the references, the definitions of the notes and the comment of the format,
 * so that the line breaks, the cursor, the word moves, search and copy behave
 * as in a file without notes (Hannes, 2026-10-29: "the editor must behave as
 * if there was no notes markup at all in the document"). A file system of the
 * extension (scheme `markdown-notes`) gives the text editor the clean text,
 * and the extension writes each change of it into the document of the file at
 * once, which keeps the notes at their text; a change of the file, for example
 * a new note of the side view, comes back into the clean text. A save of the
 * view saves the file. The highlights of the notes show in the view as in the
 * text editor of the file.
 *
 * A Markdown file with notes always opens in the view (Hannes, 2026-10-29: "we
 * always want our markdown notes be in cleanview - always not with a separate
 * command"): each text editor of such a file that shows becomes the view, in
 * its group and at its place of the cursor. The command "Open File with
 * Markup" opens the file itself, for example for a conflict of git in a note;
 * that file stays as it is until its tab closes.
 */

import * as vscode from 'vscode';
import { highlightStyles } from './noteEditor';
import { applyClean, cleanLines, editOptions, endsHighlight, type Options, type Projection, project } from './notes/clean';
import { colorIndexOf, noteColors } from './notes/colors';
import type { SelectedNotes } from './selectedNotes';

/** cleanScheme is the scheme of the documents of the clean editing view. */
export const cleanScheme = 'markdown-notes';

/** cleanCommands are the commands of the clean editing view. */
export const cleanCommands = { openWithMarkup: 'nimblescape.markdownNotes.openWithMarkup' };

/**
 * resourceFolder is the name of the folder beside a clean document that holds the files of the folder of the workspace
 * of its file, by their paths in that folder, for the Markdown preview of the view: the preview loads only files from
 * the folder of the clean document, because a clean document belongs to no folder of the workspace.
 */
export const resourceFolder = '~markdown-notes~';

/** markdownName matches the names of the files that VS Code reads as Markdown: a clean URI of such a file names its clean text. */
const markdownName = /\.(?:md|mkd|mkdn|mdwn|mdown|markdown|markdn|mdtxt|mdtext|litcoffee|ron|ronn|workbook)$/i;

/** schemePrefix matches the start of an address with a scheme, such as `https:` or `data:`. */
const schemePrefix = /^[a-z][a-z0-9+.-]*:/i;

/**
 * hex returns the bytes of a text in UTF-8 as hexadecimal digits.
 * @param text - The text.
 */
const hex = (text: string): string => [...new TextEncoder().encode(text)].map((byte) => byte.toString(16).padStart(2, '0')).join('');

/**
 * unhex returns the text of the hexadecimal digits of its bytes in UTF-8.
 * @param digits - The digits.
 */
const unhex = (digits: string): string => new TextDecoder().decode(new Uint8Array((digits.match(/[0-9a-f]{2}/g) ?? []).map((pair) => parseInt(pair, 16))));

/**
 * cleanUriOf returns the URI of the clean document of a file: the path and the query of the file, so that the tab shows
 * its name and VS Code reads it as Markdown, and the scheme and the authority of the file in its authority, so that a
 * relative link of the view, for example to another Markdown file, leads to the view of the file of the link.
 * @param file - The URI of the file.
 */
export const cleanUriOf = (file: vscode.Uri): vscode.Uri =>
  vscode.Uri.from({ scheme: cleanScheme, authority: file.authority ? `${file.scheme}~${hex(file.authority)}` : file.scheme, path: file.path, query: file.query });

/**
 * fileOf returns the URI of the file of a clean document, or undefined for another document.
 * @param document - The URI of the document.
 */
export function fileOf(document: vscode.Uri): vscode.Uri | undefined {
  const [scheme, authority = ''] = document.authority.split('~');
  return document.scheme === cleanScheme && scheme ? vscode.Uri.from({ scheme, authority: unhex(authority), path: document.path, query: document.query }) : undefined;
}

/**
 * folderOf returns the path of a folder with a slash at its end, so that a path inside it starts with it.
 * @param folder - The URI of the folder.
 */
const folderOf = (folder: vscode.Uri): string => folder.path.replace(/\/?$/, '/');

/**
 * fromFile reads a file of the workspace for a clean URI, and reports a file that does not exist for the clean URI.
 * @param uri - The clean URI.
 * @param read - Reads the file.
 */
async function fromFile<T>(uri: vscode.Uri, read: () => Thenable<T>): Promise<T> {
  try {
    return await read();
  } catch {
    throw vscode.FileSystemError.FileNotFound(uri);
  }
}

/**
 * hasMarkup tells whether a text has the markup of notes: a start marker, a reference or a definition of a note, or the
 * comment of the format.
 * @param text - The text.
 */
export const hasMarkup = (text: string): boolean => project(text).hidden.length > 0;

/** Mirror is the link between a clean document and the document of its file. */
interface Mirror {
  /**
   * file is the URI of the file. VS Code can close the document of a file that no editor shows and that has no
   * changes, so the view opens it again for each write.
   */
  file: vscode.Uri;
  /** model is the text of the file with the changes of the view that are not written yet. */
  model: string;
  /** projection is the projection of the model. */
  projection: Projection;
  /** queue is the chain of the writes into the document of the file, one after the other. */
  queue: Promise<void>;
  /** writing counts the writes into the document of the file that run. */
  writing: number;
  /** mtime is the time of the last change of the clean text for the file system. */
  mtime: number;
  /**
   * shown tells whether a tab shows the view, or showed it until its close; a view that a link or the Markdown preview
   * only reads has no tab.
   */
  shown: boolean;
  /**
   * history holds the texts of the file of the last clean texts since the last change of the file from elsewhere, so
   * that Undo and Redo of the view bring back the file as it was, with its notes at the same places, and the options of
   * their projections.
   */
  history: Entry[];
  /**
   * typing is the text of the clean text that the last edits typed at the end of a highlight, from its start to the
   * offset after it, where the next typed text stays in the highlight, until the cursor goes out of it. VS Code reports
   * the moves of the cursor of an edit late, also after the next edit, so a move inside this text keeps it.
   */
  typing?: { from: number; to: number };
}

/** Entry is a clean text of the history of a view, with the text of its file and the options of its projection. */
interface Entry {
  clean: string;
  text: string;
  options: Options;
}

/**
 * entryOf returns the entry of the history of a projection.
 * @param projection - The projection.
 */
const entryOf = (projection: Projection): Entry => ({ clean: projection.clean, text: projection.text, options: projection.options });

/** historySize is the number of the texts that the history of a view keeps. */
const historySize = 200;

/**
 * replacement returns the smallest replacement that turns one text into another: the range in the old text and the new
 * text of it.
 * @param from - The old text.
 * @param to - The new text.
 */
function replacement(from: string, to: string): { start: number; end: number; text: string } {
  let start = 0;
  while (start < from.length && start < to.length && from[start] === to[start]) {
    start++;
  }
  let end = 0;
  while (end < from.length - start && end < to.length - start && from[from.length - 1 - end] === to[to.length - 1 - end]) {
    end++;
  }
  return { start, end: from.length - end, text: to.slice(start, to.length - end) };
}

/**
 * offsetIn returns the offset of a position in a text.
 * @param text - The text.
 * @param position - The position.
 */
function offsetIn(text: string, position: vscode.Position): number {
  let offset = 0;
  for (let line = 0; line < position.line; line++) {
    const next = text.indexOf('\n', offset);
    if (next < 0) {
      return text.length;
    }
    offset = next + 1;
  }
  const end = text.indexOf('\n', offset);
  return Math.min(offset + position.character, end < 0 ? text.length : end);
}

/**
 * positionIn returns the position of an offset in a text.
 * @param text - The text.
 * @param offset - The offset.
 */
function positionIn(text: string, offset: number): vscode.Position {
  const before = text.slice(0, offset);
  const line = before.split('\n').length - 1;
  return new vscode.Position(line, offset - (before.lastIndexOf('\n') + 1));
}


/**
 * hasTab tells whether a tab of a group shows a document in a text editor of its own.
 * @param file - The URI of the document.
 */
const hasTab = (file: vscode.Uri): boolean =>
  vscode.window.tabGroups.all.some((group) => group.tabs.some((tab) => tab.input instanceof vscode.TabInputText && tab.input.uri.toString() === file.toString()));

/** CleanView is the file system of the clean documents, and their link to the documents of their files. */
export class CleanView implements vscode.FileSystemProvider, vscode.Disposable {
  private readonly changes = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile = this.changes.event;
  private readonly fileChanges = new vscode.EventEmitter<vscode.Uri>();
  /**
   * onDidChangeMarkup tells the file of a view whose text changed from elsewhere, for example a new note of the side
   * view: the Markdown preview of the view renders the file again, also when its clean text stays.
   */
  readonly onDidChangeMarkup = this.fileChanges.event;
  /** mirrors holds the link of each clean document, by its URI, while it opens and after. */
  private readonly mirrors = new Map<string, Promise<Mirror>>();
  /** ready holds the link of each clean document after it opened, by its URI. */
  private readonly ready = new Map<string, Mirror>();
  /** markup holds the files that "Open File with Markup" opened, by their URIs: they stay as they are until their tabs close. */
  private readonly markup = new Set<string>();
  /** opening holds the files that "Open File with Markup" opens now, by their URIs, before they have tabs. */
  private readonly opening = new Set<string>();
  /** switching holds the files whose text editors become the view now, by their URIs. */
  private readonly switching = new Set<string>();
  /** reverting holds the files whose changes go back to their text on disk, by their URIs, after the view closed without a save. */
  private readonly reverting = new Set<string>();
  /** left holds the links of the clean documents that VS Code closed, by their URIs, until the next pass takes their files. */
  private readonly left = new Map<string, Mirror>();
  /** saved tells whether a document was saved since the last pass, which then closes the tabs behind the views. */
  private saved = false;
  /** switched is the running pass that makes the text editors of files with notes the view, and again whether one more pass follows it. */
  private switched: { pass: Promise<void>; again: boolean } | undefined;
  /**
   * highlights holds the decorations of the highlights of each color, as in the text editor of a file: shown, faint
   * while another note is selected, and strong for the selected note.
   */
  private readonly highlights = (['shown', 'faint', 'strong'] as const).map((kind) =>
    noteColors.map((color) => vscode.window.createTextEditorDecorationType(highlightStyles(color)[kind])),
  );
  /** log is the output channel of the view, which names each edit that the view could not keep in step. */
  private readonly log = vscode.window.createOutputChannel('Markdown Notes: Clean Editing View');

  /**
   * @param showsHighlights - Tells whether the highlights of a file show.
   * @param selected - The selected note of each file, whose highlight is strong.
   * @param showsFootnotes - Tells whether the side view shows the standard footnotes of a file, whose definitions the
   * view then hides.
   */
  constructor(
    private readonly showsHighlights: (document: vscode.Uri) => boolean,
    private readonly selected: SelectedNotes,
    private readonly showsFootnotes: (document: vscode.Uri) => boolean = () => false,
  ) {}

  /**
   * optionsOf returns the options of the projection of a file that the view reads anew: the definitions of the
   * standard footnotes that have a reference are hidden while the side view shows the footnotes (Hannes, 2026-10-29:
   * "the definition can even be hidden, same as for the note, it does not make sense to show it").
   * @param file - The URI of the file.
   */
  private optionsOf(file: vscode.Uri): Options {
    return this.showsFootnotes(file) ? { footnotes: true } : {};
  }

  /** register registers the file system, the command and the listeners of the view, and makes the text editors of files with notes the view. */
  register(): vscode.Disposable[] {
    const registrations = [
      vscode.workspace.registerFileSystemProvider(cleanScheme, this, { isCaseSensitive: true }),
      vscode.commands.registerCommand(cleanCommands.openWithMarkup, () => this.openWithMarkup()),
      vscode.workspace.onDidOpenTextDocument((document) => this.opened(document)),
      vscode.workspace.onDidChangeTextDocument((event) => {
        void this.changed(event);
        // A file gets its first note, for example from the side view: its text editor becomes the view.
        if (event.document.uri.scheme !== cleanScheme && vscode.window.visibleTextEditors.some((editor) => editor.document === event.document)) {
          this.switchLater();
        }
      }),
      vscode.workspace.onDidSaveTextDocument(() => {
        this.saved = true;
        this.switchLater();
      }),
      vscode.workspace.onDidCloseTextDocument((document) => this.closed(document)),
      vscode.window.onDidChangeVisibleTextEditors(() => {
        this.decorateAll();
        this.switchLater();
      }),
      vscode.window.tabGroups.onDidChangeTabs(() => this.switchLater()),
      this.selected.onDidChange(() => this.decorateAll()),
      vscode.window.onDidChangeTextEditorSelection((event) => {
        const mirror = this.ready.get(event.textEditor.document.uri.toString());
        if (!mirror?.typing) {
          return;
        }
        const offset = event.textEditor.document.offsetAt(event.selections[0].active);
        if (event.selections.length !== 1 || offset < mirror.typing.from || offset > mirror.typing.to) {
          mirror.typing = undefined;
        }
      }),
    ];
    // The text editors that VS Code shows at its start, also those of the last session.
    this.switchLater();
    return registrations;
  }

  dispose(): void {
    this.changes.dispose();
    this.fileChanges.dispose();
    this.log.dispose();
    for (const type of this.highlights.flat()) {
      type.dispose();
    }
  }

  /**
   * realOf returns the URI of the file of a clean document, or undefined for another document.
   * @param document - The URI of the document.
   */
  realOf(document: vscode.Uri): vscode.Uri | undefined {
    return fileOf(document);
  }

  /**
   * reverts tells whether the changes of a file go back to its text on disk now, so that its save changes nothing more.
   * @param file - The URI of the file.
   */
  reverts(file: vscode.Uri): boolean {
    return this.reverting.has(file.toString());
  }

  /**
   * toReal returns the position in the file of a position in a clean document: before the hidden parts there, or after
   * them, for example after the start marker of a highlight that starts there.
   * @param document - The URI of the clean document.
   * @param position - The position in the clean document.
   * @param after - Whether the position in the file is after the hidden parts at the position.
   */
  toReal(document: vscode.Uri, position: vscode.Position, after = false): vscode.Position | undefined {
    const mirror = this.ready.get(document.toString());
    if (!mirror) {
      return undefined;
    }
    const clean = offsetIn(mirror.projection.clean, position);
    let removed = 0;
    mirror.projection.hidden.forEach((part, index) => {
      if (mirror.projection.at[index] < clean || (after && mirror.projection.at[index] === clean)) {
        removed += part.end - part.start;
      }
    });
    return positionIn(mirror.projection.text, clean + removed);
  }

  /**
   * cleanEditorOf returns a visible text editor of the clean document of a file, or undefined.
   * @param file - The URI of the file.
   */
  cleanEditorOf(file: vscode.Uri): vscode.TextEditor | undefined {
    return vscode.window.visibleTextEditors.find((editor) => fileOf(editor.document.uri)?.toString() === file.toString());
  }

  /**
   * toClean returns the position in the clean document of a file of a position in the file.
   * @param file - The URI of the file.
   * @param position - The position in the file.
   */
  toClean(file: vscode.Uri, position: vscode.Position): vscode.Position | undefined {
    const mirror = this.ready.get(cleanUriOf(file).toString());
    if (!mirror) {
      return undefined;
    }
    const offset = offsetIn(mirror.projection.text, position);
    let removed = 0;
    for (const part of mirror.projection.hidden) {
      if (part.end <= offset) {
        removed += part.end - part.start;
      } else if (part.start < offset) {
        removed += offset - part.start;
      }
    }
    return positionIn(mirror.projection.clean, offset - removed);
  }

  /**
   * sourceOf returns the text of the file of a view whose clean text is a text, which the Markdown preview renders in
   * place of the clean text so that it shows the highlights of the notes, and the line in the clean text of each line
   * of the file, so that the preview and the view scroll together; or undefined for another text. The preview parses
   * the text of a document without its URI.
   * @param clean - The text that the preview parses.
   */
  sourceOf(clean: string): { text: string; lines: number[] } | undefined {
    const mirror = [...this.ready.values()].find((candidate) => candidate.projection.clean === clean && candidate.projection.text !== clean);
    return mirror && { text: mirror.projection.text, lines: cleanLines(mirror.projection) };
  }

  /** openWithMarkup opens the file of the active clean document itself, at the same place, beside the view in its group. */
  private async openWithMarkup(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    const file = editor && fileOf(editor.document.uri);
    if (!editor || !file) {
      return;
    }
    const key = file.toString();
    const place = (position: vscode.Position): vscode.Position => this.toReal(editor.document.uri, position) ?? position;
    const { viewColumn } = editor;
    const selection = new vscode.Selection(place(editor.selection.anchor), place(editor.selection.active));
    this.markup.add(key);
    this.opening.add(key);
    try {
      // The view can still close the tab of the file that it took the place of; the file opens after that.
      while (this.switched) {
        await this.switched.pass;
      }
      await vscode.window.showTextDocument(file, { viewColumn, preview: false, selection });
    } finally {
      this.opening.delete(key);
    }
  }

  /** switchLater makes the text editors of files with notes the view, after the pass that runs now. */
  private switchLater(): void {
    if (this.switched) {
      this.switched.again = true;
      return;
    }
    const switched = { pass: Promise.resolve(), again: false };
    this.switched = switched;
    switched.pass = (async () => {
      do {
        switched.again = false;
        await this.switchEditors();
      } while (switched.again);
    })()
      .catch((error: unknown) => this.log.appendLine(`${new Date().toISOString()} ${String(error)}`))
      .finally(() => (this.switched = undefined));
  }

  /**
   * switchEditors makes each visible text editor of a Markdown file with notes the view, in its group, takes the files
   * of the views that closed, and after a save closes the tabs of the files behind their views.
   */
  private async switchEditors(): Promise<void> {
    // A file that "Open File with Markup" opened stays as it is until its tab closes.
    for (const key of this.markup) {
      if (!this.opening.has(key) && !hasTab(vscode.Uri.parse(key))) {
        this.markup.delete(key);
      }
    }
    for (const editor of vscode.window.visibleTextEditors) {
      const mirror = this.ready.get(editor.document.uri.toString());
      if (mirror) {
        mirror.shown = true;
      }
    }
    const reverted = await this.leaveClosed();
    for (const editor of vscode.window.visibleTextEditors) {
      const document = editor.document;
      const key = document.uri.toString();
      const back = this.leaves(document);
      if (this.switching.has(key) || this.markup.has(key) || reverted.has(key) || (!back && !this.switchable(document))) {
        continue;
      }
      const tab = vscode.window.tabGroups.all.find((group) => group.viewColumn === editor.viewColumn)?.activeTab;
      // The side of a view of the changes of git stays: git compares the file itself.
      if (!(tab?.input instanceof vscode.TabInputText) || tab.input.uri.toString() !== key) {
        continue;
      }
      this.switching.add(key);
      try {
        await (back ? this.switchBack(editor, back, tab) : this.switchTo(editor, tab));
      } finally {
        this.switching.delete(key);
      }
    }
    if (this.saved) {
      this.saved = false;
      await this.closeBehind();
    }
  }

  /**
   * leaves returns the file of a clean document without changes that shows no Markdown file with notes, for example
   * the view of the file of a link of a view to a file without notes or to a file that is no Markdown file, or
   * undefined: its text editor becomes the text editor of the file.
   * @param document - The document.
   */
  private leaves(document: vscode.TextDocument): vscode.Uri | undefined {
    if (document.isDirty) {
      return undefined;
    }
    const mirror = this.ready.get(document.uri.toString());
    if (!mirror) {
      // A file of a link of a view that is no Markdown file, which the file system of the view gives as it is.
      return document.uri.scheme === cleanScheme ? this.resourceOf(document.uri) : undefined;
    }
    return document.languageId !== 'markdown' || !hasMarkup(mirror.model) ? mirror.file : undefined;
  }

  /**
   * switchBack shows a file in place of the text editor of its view, in its group, as a preview when its tab is one,
   * at the same place, and closes the tabs of the view.
   * @param editor - The text editor of the view.
   * @param file - The URI of the file.
   * @param tab - The tab of the text editor.
   */
  private async switchBack(editor: vscode.TextEditor, file: vscode.Uri, tab: vscode.Tab): Promise<void> {
    const { selection, viewColumn } = editor;
    const clean = editor.document.uri;
    const place = (position: vscode.Position): vscode.Position => this.toReal(clean, position) ?? position;
    await vscode.window.showTextDocument(file, {
      viewColumn,
      preview: tab.isPreview,
      preserveFocus: vscode.window.activeTextEditor !== editor,
      selection: new vscode.Selection(place(selection.anchor), place(selection.active)),
    });
    await this.closeTabsOf(clean);
  }

  /**
   * switchable tells whether the text editor of a document becomes the view: a Markdown file with notes, or with the
   * comment of the format, that the extension can change.
   * @param document - The document.
   */
  private switchable(document: vscode.TextDocument): boolean {
    return (
      document.uri.scheme !== cleanScheme &&
      document.languageId === 'markdown' &&
      vscode.workspace.fs.isWritableFileSystem(document.uri.scheme) === true &&
      hasMarkup(document.getText())
    );
  }

  /**
   * switchTo shows the view of the file of a text editor in place of it: in its group, as a preview when its tab is one,
   * with the same selection and the same first visible line, and closes its tab. A file with changes keeps its tab
   * behind the view, because a close would ask to save them; it closes after the save.
   * @param editor - The text editor of the file.
   * @param tab - The tab of the text editor.
   */
  private async switchTo(editor: vscode.TextEditor, tab: vscode.Tab): Promise<void> {
    const file = editor.document.uri;
    const { selection, viewColumn } = editor;
    const top = editor.visibleRanges[0]?.start;
    const focus = vscode.window.activeTextEditor === editor;
    const clean = cleanUriOf(file);
    await this.mirrorOf(clean);
    const place = (position: vscode.Position): vscode.Position => this.toClean(file, position) ?? new vscode.Position(0, 0);
    const shown = await vscode.window.showTextDocument(clean, {
      viewColumn,
      preview: tab.isPreview,
      preserveFocus: !focus,
      selection: new vscode.Selection(place(selection.anchor), place(selection.active)),
    });
    this.ready.get(clean.toString())!.shown = true;
    if (top && top.line > 0) {
      shown.revealRange(new vscode.Range(place(top), place(top)), vscode.TextEditorRevealType.AtTop);
    }
    // "Open File with Markup" can show the file again while the view opens; its tab then stays.
    if (!editor.document.isDirty && !this.markup.has(file.toString())) {
      await this.closeTabsOf(file);
    }
  }

  /**
   * closeBehind closes the tabs behind the views: the tabs of the files with notes and without changes whose views have
   * tabs, apart from the files that "Open File with Markup" opened. VS Code opens a tab of each file with changes
   * that are not saved, also of a file that only its view changes; such a tab closes after the save. An active tab
   * of a file stays: its text editor becomes the view.
   */
  private async closeBehind(): Promise<void> {
    for (const mirror of this.ready.values()) {
      const key = mirror.file.toString();
      const document = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === key);
      if (!this.markup.has(key) && !this.switching.has(key) && !document?.isDirty && hasMarkup(mirror.model) && hasTab(cleanUriOf(mirror.file))) {
        await this.closeTabsOf(mirror.file, false);
      }
    }
  }

  /**
   * leaveClosed takes the files of the views whose tabs closed: a file with changes goes back to its text on disk,
   * because the user closed its view without a save, and its tabs behind the view close; a file that "Open File with
   * Markup" opened stays as it is.
   * @returns The URIs of the files that went back.
   */
  private async leaveClosed(): Promise<Set<string>> {
    const reverted = new Set<string>();
    const views = [...this.ready.entries(), ...this.left.entries()];
    this.left.clear();
    for (const [key, mirror] of views) {
      if (!mirror.shown || hasTab(vscode.Uri.parse(key))) {
        continue;
      }
      mirror.shown = false;
      if (!this.markup.has(mirror.file.toString()) && (await this.revertLeft(mirror))) {
        reverted.add(mirror.file.toString());
        await this.closeTabsOf(mirror.file);
      }
    }
    return reverted;
  }

  /**
   * closeTabsOf closes the tabs that show a document in a text editor of its own.
   * @param file - The URI of the document.
   * @param active - Whether an active tab closes too.
   */
  private async closeTabsOf(file: vscode.Uri, active = true): Promise<void> {
    const tabs = vscode.window.tabGroups.all.flatMap((group) =>
      group.tabs.filter((tab) => tab.input instanceof vscode.TabInputText && tab.input.uri.toString() === file.toString() && (active || !tab.isActive)),
    );
    if (tabs.length > 0) {
      await vscode.window.tabGroups.close(tabs, true);
    }
  }

  /**
   * mirrorOf returns the link of a clean document, and opens the document of its file the first time.
   * @param uri - The URI of the clean document.
   */
  private mirrorOf(uri: vscode.Uri): Promise<Mirror> {
    const key = uri.toString();
    const known = this.mirrors.get(key);
    if (known) {
      return known;
    }
    const file = fileOf(uri);
    if (!file) {
      return Promise.reject(vscode.FileSystemError.FileNotFound(uri));
    }
    const mirror = Promise.resolve(vscode.workspace.openTextDocument(file)).then((real) => {
      const model = real.getText();
      const projection = project(model, this.optionsOf(file));
      const opened: Mirror = { file, model, projection, queue: Promise.resolve(), writing: 0, mtime: Date.now(), shown: false, history: [entryOf(projection)] };
      this.ready.set(key, opened);
      if (vscode.workspace.textDocuments.some((document) => document.uri.toString() === key)) {
        // VS Code read the document before as a file that is no Markdown file, as it is; it reads the clean text now.
        this.changes.fire([{ type: vscode.FileChangeType.Changed, uri }]);
      }
      return opened;
    }, () => {
      // For example a link of the view to a file that does not exist.
      throw vscode.FileSystemError.FileNotFound(uri);
    });
    this.mirrors.set(key, mirror);
    mirror.catch(() => this.mirrors.delete(key));
    return mirror;
  }

  /**
   * opened takes a clean document that VS Code opened with a text of its own, for example the changes of the last
   * session that it kept: they go into the file as one change.
   * @param document - The document.
   */
  private opened(document: vscode.TextDocument): void {
    const mirror = this.ready.get(document.uri.toString());
    if (mirror && document.getText() !== mirror.projection.clean) {
      this.takeText(mirror, document.getText());
    }
  }

  /**
   * takeText writes a clean text that differs from the clean text of the model into the file, as one change.
   * @param mirror - The link of the clean document.
   * @param text - The clean text.
   */
  private takeText(mirror: Mirror, text: string): void {
    const change = replacement(mirror.projection.clean, text);
    mirror.model = applyClean(mirror.projection, change.start, change.end, change.text).text;
    mirror.projection = project(mirror.model, editOptions(mirror.projection));
    mirror.history = [entryOf(mirror.projection)];
    this.writeReal(mirror);
  }

  /**
   * closed forgets a clean document that VS Code closed, after the next pass took its file, and opens the document of
   * a file again whose view is open.
   * @param document - The document.
   */
  private closed(document: vscode.TextDocument): void {
    const key = document.uri.toString();
    const mirror = this.ready.get(key);
    if (document.uri.scheme !== cleanScheme) {
      // VS Code closes the document of a file when its last tab closes, also behind its view; the side view reads the
      // notes of the file from it. Opened again by the extension, it stays open for some minutes.
      if ([...this.ready.values()].some((view) => view.file.toString() === key && hasTab(cleanUriOf(view.file)))) {
        void Promise.resolve(vscode.workspace.openTextDocument(document.uri)).catch((error: unknown) => this.log.appendLine(`${new Date().toISOString()} ${String(error)}`));
      }
      return;
    }
    this.mirrors.delete(key);
    this.ready.delete(key);
    if (mirror) {
      this.left.set(key, mirror);
      this.switchLater();
    }
  }

  /**
   * revertLeft brings the file of a closed view back to its text on disk, when it has the changes of the view: the user
   * closed the view without a save.
   * @param mirror - The link of the closed view.
   * @returns Whether the file went back.
   */
  private async revertLeft(mirror: Mirror): Promise<boolean> {
    await mirror.queue;
    const real = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === mirror.file.toString());
    if (!real?.isDirty || real.getText() !== mirror.model) {
      return false;
    }
    const disk = new TextDecoder().decode(await vscode.workspace.fs.readFile(mirror.file));
    const change = replacement(real.getText(), disk);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(mirror.file, new vscode.Range(real.positionAt(change.start), real.positionAt(change.end)), change.text);
    const key = mirror.file.toString();
    this.reverting.add(key);
    try {
      await vscode.workspace.applyEdit(edit);
      await real.save();
    } finally {
      this.reverting.delete(key);
    }
    return true;
  }

  /**
   * changed takes a change of a document: a change of a clean document goes into the document of its file, and a change
   * of a file from elsewhere into its clean document.
   * @param event - The change.
   */
  private async changed(event: vscode.TextDocumentChangeEvent): Promise<void> {
    const key = event.document.uri.toString();
    if (event.document.uri.scheme === cleanScheme) {
      if (event.contentChanges.length === 0) {
        return;
      }
      // At once when the view is ready, before VS Code reports the move of the cursor of the change.
      const mirror = this.ready.get(key) ?? (await this.mirrors.get(key));
      if (mirror) {
        this.cleanChanged(mirror, event);
      }
      return;
    }
    for (const [clean, pending] of this.mirrors) {
      const mirror = await pending;
      if (mirror.file.toString() === key && mirror.writing === 0 && event.document.getText() !== mirror.model) {
        // A change of the file from elsewhere, for example a note of the side view or a save with the formatter.
        mirror.model = event.document.getText();
        mirror.projection = project(mirror.model, this.optionsOf(mirror.file));
        mirror.history = [entryOf(mirror.projection)];
        await this.writeClean(vscode.Uri.parse(clean), mirror);
        this.fileChanges.fire(mirror.file);
      }
    }
  }

  /**
   * cleanChanged writes a change of a clean document into the model of its file, change by change as VS Code applies
   * them, and then into the document of the file.
   * @param mirror - The link of the clean document.
   * @param event - The change.
   */
  private cleanChanged(mirror: Mirror, event: vscode.TextDocumentChangeEvent): void {
    const document = event.document;
    if (document.getText() === mirror.projection.clean) {
      // The change that the extension wrote itself.
      return;
    }
    const earlier = [...mirror.history].reverse().find((entry) => entry.clean === document.getText());
    if (earlier) {
      // Undo or Redo: the file as it was with this clean text.
      mirror.typing = undefined;
      mirror.model = earlier.text;
      mirror.projection = project(earlier.text, earlier.options);
      this.writeReal(mirror);
      this.decorateAll();
      return;
    }
    for (const change of event.contentChanges) {
      const clean = mirror.projection.clean;
      const start = offsetIn(clean, change.range.start);
      const end = offsetIn(clean, change.range.end);
      const continues = event.contentChanges.length === 1 && mirror.typing?.to === end;
      const result = applyClean(mirror.projection, start, end, change.text, continues);
      if (result.way !== 'direct') {
        this.log.appendLine(`${new Date().toISOString()} ${result.way}: ${JSON.stringify(clean.slice(start, end))} → ${JSON.stringify(change.text)} at ${start}`);
      }
      mirror.model = result.text;
      mirror.projection = project(result.text, editOptions(mirror.projection));
      // Text typed into the end of a highlight, also over its last word, or deleted there while typing: the next
      // letters stay in it.
      const after = start + change.text.length;
      const from = continues ? Math.min(mirror.typing!.from, start) : start;
      mirror.typing = event.contentChanges.length === 1 && (change.text.length > 0 || continues) && endsHighlight(mirror.projection, after) ? { from, to: after } : undefined;
    }
    mirror.history = [...mirror.history, entryOf(mirror.projection)].slice(-historySize);
    this.writeReal(mirror);
    if (document.getText() !== mirror.projection.clean) {
      // The edit changed how the file reads, for example a code block that it opened: the view shows the file again.
      this.log.appendLine(`${new Date().toISOString()} the clean text is written anew`);
      void this.writeClean(document.uri, mirror);
    }
    this.decorateAll();
  }

  /**
   * writeReal writes the model into the document of the file, after the writes before.
   * @param mirror - The link of a clean document.
   */
  private writeReal(mirror: Mirror): void {
    mirror.queue = mirror.queue.then(async () => {
      const real = await vscode.workspace.openTextDocument(mirror.file);
      const current = real.getText();
      if (current === mirror.model) {
        return;
      }
      const change = replacement(current, mirror.model);
      const edit = new vscode.WorkspaceEdit();
      edit.replace(mirror.file, new vscode.Range(real.positionAt(change.start), real.positionAt(change.end)), change.text);
      mirror.writing++;
      try {
        await vscode.workspace.applyEdit(edit);
      } finally {
        mirror.writing--;
      }
    });
  }

  /**
   * writeClean writes the clean text of the model into the clean document.
   * @param uri - The URI of the clean document.
   * @param mirror - The link of the clean document.
   */
  private async writeClean(uri: vscode.Uri, mirror: Mirror): Promise<void> {
    const document = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === uri.toString());
    if (document && !document.isDirty && !hasTab(uri)) {
      // VS Code reads a clean document without a tab and without changes again from the file system; an edit would
      // give it changes, and VS Code would open a tab of it.
      mirror.mtime = Date.now();
      this.changes.fire([{ type: vscode.FileChangeType.Changed, uri }]);
    } else if (document && document.getText() !== mirror.projection.clean) {
      const change = replacement(document.getText(), mirror.projection.clean);
      const edit = new vscode.WorkspaceEdit();
      edit.replace(uri, new vscode.Range(document.positionAt(change.start), document.positionAt(change.end)), change.text);
      await vscode.workspace.applyEdit(edit);
    }
    this.decorateAll();
  }

  /** decorateAll shows the highlights of the notes in the visible text editors of the clean documents. */
  private decorateAll(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      const key = editor.document.uri.toString();
      const pending = editor.document.uri.scheme === cleanScheme ? this.mirrors.get(key) : undefined;
      void pending?.then((mirror) => {
        const current = editor.document.getText() === mirror.projection.clean;
        const shows = this.showsHighlights(mirror.file);
        // As in the text editor: the selected note strong, also while the highlights are hidden, and the others dimmed.
        const label = this.selected.labelOf(mirror.file);
        const selected = mirror.projection.highlights.some((highlight) => highlight.label === label) ? label : undefined;
        const ranges = this.highlights.map((types) => types.map((): vscode.Range[] => []));
        for (const highlight of current ? mirror.projection.highlights : []) {
          const kind = highlight.label === selected ? 2 : !shows ? undefined : selected === undefined ? 0 : 1;
          if (kind !== undefined && highlight.end > highlight.start) {
            ranges[kind][colorIndexOf(highlight)].push(new vscode.Range(editor.document.positionAt(highlight.start), editor.document.positionAt(highlight.end)));
          }
        }
        this.highlights.forEach((types, kind) => types.forEach((type, color) => editor.setDecorations(type, ranges[kind][color])));
      });
    }
  }

  /**
   * showsChanged shows or hides the highlights after a change of the setting or of the side view, and shows or hides
   * the definitions of the standard footnotes after a change of the setting `showFootnotes`.
   */
  showsChanged(): void {
    for (const [key, mirror] of this.ready) {
      if (this.showsFootnotes(mirror.file) !== (mirror.projection.options.footnotes === true)) {
        mirror.typing = undefined;
        mirror.projection = project(mirror.model, this.optionsOf(mirror.file));
        mirror.history = [entryOf(mirror.projection)];
        void this.writeClean(vscode.Uri.parse(key), mirror);
      }
    }
    this.decorateAll();
  }

  watch(): vscode.Disposable {
    return new vscode.Disposable(() => undefined);
  }

  /**
   * resourceOf returns the file that a clean URI names when it names no clean text, or undefined: a file that the
   * Markdown preview of a view loads, such as an image or a style sheet of the setting `markdown.styles`, or the file of
   * a link of a view that is no Markdown file. The file system gives such a file as it is, and does not change it. The
   * preview of a view loads only files from the folder of its clean document, so it loads an image of a file in a
   * folder of the workspace from the folder resourceFolder there (imageOf), by its path in the folder of the workspace,
   * and a style sheet with a relative path from the folder of the clean document, which stands for the folder of the
   * workspace, as for the file itself.
   * @param uri - The clean URI.
   */
  resourceOf(uri: vscode.Uri): vscode.Uri | undefined {
    const file = fileOf(uri);
    if (!file || this.mirrors.has(uri.toString())) {
      return undefined;
    }
    const marker = `/${resourceFolder}/`;
    const at = file.path.indexOf(marker);
    if (at >= 0) {
      const folder = vscode.workspace.getWorkspaceFolder(file.with({ path: file.path.slice(0, at + 1) }));
      const path = file.path.slice(at + marker.length);
      return folder && path.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..') ? vscode.Uri.joinPath(folder.uri, path) : undefined;
    }
    for (const scope of [uri, file]) {
      const styles = vscode.workspace.getConfiguration('markdown', scope).get<unknown>('styles');
      for (const style of Array.isArray(styles) ? styles : []) {
        // The preview loads a style sheet with a relative path from the folder of the workspace of a file.
        if (typeof style !== 'string' || style === '' || schemePrefix.test(style) || style.startsWith('/') || style.split(/[\\/]/).includes('..')) {
          continue;
        }
        const suffix = vscode.Uri.joinPath(file.with({ path: '/' }), style).path;
        const folder = file.path.endsWith(suffix) && vscode.workspace.getWorkspaceFolder(file.with({ path: file.path.slice(0, file.path.length - suffix.length + 1) }));
        if (folder) {
          return vscode.Uri.joinPath(folder.uri, style);
        }
      }
    }
    return markdownName.test(file.path) ? undefined : file;
  }

  /**
   * imageOf returns the clean URI from which the Markdown preview of a view loads an image of its file, or undefined
   * for an image that the preview loads as it is: the URI of the image in the folder resourceFolder beside the clean
   * document, for an image in the folder of the workspace of the file (resourceOf). The preview reads a relative path
   * of an image from the folder of the file, and a path that starts with a slash from the folder of the workspace.
   * @param document - The URI of the clean document that the preview renders.
   * @param source - The address of the image in the Markdown text, as markdown-it encodes it.
   */
  imageOf(document: vscode.Uri, source: string): vscode.Uri | undefined {
    const file = fileOf(document);
    const folder = file && vscode.workspace.getWorkspaceFolder(file);
    if (!folder || source === '' || source.startsWith('#') || source.startsWith('//') || schemePrefix.test(source)) {
      return undefined;
    }
    let path: string;
    try {
      path = decodeURIComponent(source.replace(/[?#].*$/s, ''));
    } catch {
      return undefined;
    }
    const target = path.startsWith('/') ? vscode.Uri.joinPath(folder.uri, path) : vscode.Uri.joinPath(file, '..', path);
    const root = folderOf(folder.uri);
    return target.path.startsWith(root) ? vscode.Uri.joinPath(document, '..', resourceFolder, target.path.slice(root.length)) : undefined;
  }

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    const resource = this.resourceOf(uri);
    if (resource) {
      const stat = await fromFile(uri, () => vscode.workspace.fs.stat(resource));
      return { type: stat.type, ctime: stat.ctime, mtime: stat.mtime, size: stat.size, permissions: vscode.FilePermission.Readonly };
    }
    const mirror = await this.mirrorOf(uri);
    return { type: vscode.FileType.File, ctime: 0, mtime: mirror.mtime, size: new TextEncoder().encode(mirror.projection.clean).length };
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const resource = this.resourceOf(uri);
    if (resource) {
      return fromFile(uri, () => vscode.workspace.fs.readFile(resource));
    }
    return new TextEncoder().encode((await this.mirrorOf(uri)).projection.clean);
  }

  /**
   * writeFile saves the file of a clean document: VS Code writes the clean text when the user saves the view. A text
   * that differs from the clean text of the model goes into the file as one change first. A file that the clean URI
   * names as it is (resourceOf) does not change.
   * @param uri - The URI of the clean document.
   * @param content - The clean text.
   */
  async writeFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
    if (this.resourceOf(uri)) {
      throw vscode.FileSystemError.NoPermissions('The clean editing view changes only Markdown files.');
    }
    const mirror = await this.mirrorOf(uri);
    const text = new TextDecoder().decode(content);
    if (text !== mirror.projection.clean) {
      this.takeText(mirror, text);
    }
    await mirror.queue;
    const real = await vscode.workspace.openTextDocument(mirror.file);
    await real.save();
    mirror.mtime = Date.now();
    // The formatter can change the file on its save; the clean document follows after its own save.
    if (real.getText() !== mirror.model) {
      mirror.model = real.getText();
      mirror.projection = project(mirror.model, editOptions(mirror.projection));
      setTimeout(() => void this.writeClean(uri, mirror).then(() => vscode.workspace.textDocuments.find((document) => document.uri.toString() === uri.toString())?.save()), 0);
    }
  }

  readDirectory(): [string, vscode.FileType][] {
    throw vscode.FileSystemError.NoPermissions('The clean editing view has no folders.');
  }

  createDirectory(): void {
    throw vscode.FileSystemError.NoPermissions('The clean editing view has no folders.');
  }

  delete(): void {
    throw vscode.FileSystemError.NoPermissions('The clean editing view deletes no file.');
  }

  rename(): void {
    throw vscode.FileSystemError.NoPermissions('The clean editing view renames no file.');
  }
}
