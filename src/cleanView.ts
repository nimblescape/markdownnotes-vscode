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
 * as in a file without notes. A file system of the extension (scheme
 * `markdownnotes`) gives the text editor the clean text, and the extension
 * writes each change of it into the document of the file at once, which keeps
 * the notes at their text; a change of the file, for example a new note of the
 * side view, comes back into the clean text. A save of the view saves the file.
 * The highlights of the notes show in the view as in the text editor of the
 * file. The front matter is text in the view. Another extension, for example
 * nimblescape Markdown Paper, can give the rules of the front matter of a file
 * (decision 75): the keys of its schema and the lines of its read-only keys
 * stay as they are, an edit that changes them goes back, and Undo goes over
 * such an edit; the schema gives the problems, the quick fixes and the
 * suggestions of the front matter ([src/frontMatterEditing.ts](frontMatterEditing.ts)).
 * The parts that the formatter writes are read-only in the same way, as in the editor of
 * a whole file (decision 74, [src/notes/generated.ts](notes/generated.ts)):
 * the numbers of the captions, the texts of the references, the code blocks of
 * the listings, the values of the front matter in the text, and the parts that
 * other extensions name through the API, such as the citations of nimblescape
 * Markdown Paper. "Format Document" of the view writes them.
 *
 * A Markdown file with notes always opens in the view, and so does a paper
 * document of nimblescape Markdown Paper (a front matter with the key
 * `layout`), also without notes, so that the rules of its front matter apply
 * (decision 61): each text editor of such a file that shows becomes the view,
 * in its group and at its place of the cursor, also the text editor of a file
 * that opens in the editor of a whole file, for example with "Open Text Editor
 * to the Side" (decision 72). The command "Open File with Markup" opens the
 * file itself, for example for a conflict of git in a note; that file stays as
 * it is until its tab closes.
 */

import * as vscode from 'vscode';
import { registerFrontMatterEditing } from './frontMatterEditing';
import { highlightStyles } from './noteEditor';
import { applyClean, type BlockFinder, cleanLines, editOptions, endsHighlight, hidesTyped, isPaperDocument, type MarkerFinder, type Options, type Projection, project, toClean } from './notes/clean';
import { frontMatterEnd } from './notes/doctype';
import { type FrontMatterRules, keepsRules, readOnlyParts } from './notes/frontMatterRules';
import { colorIndexOf, noteColors } from './notes/colors';
import { findGenerated, type GeneratedFinder, type GeneratedPart, keepsGenerated, rangesOf } from './notes/generated';
import type { SelectedNotes } from './selectedNotes';

/** cleanScheme is the scheme of the documents of the clean editing view. */
export const cleanScheme = 'markdownnotes';

/** cleanCommands are the commands of the clean editing view. */
export const cleanCommands = { openWithMarkup: 'nimblescape.markdownNotes.openWithMarkup' };

/** frontMatterKept is the message of the status bar after an edit that went back because it broke the rules of the front matter. */
export const frontMatterKept = 'The keys of the schema of the front matter and the read-only keys with their values stay as they are. Change the text after a key.';

/**
 * generatedReadOnly is the message of the status bar after an edit of a generated part in the clean editing view, such
 * as the number of a caption or the text of a reference.
 */
export const generatedReadOnly = 'The formatter writes this part, so it is read-only in the clean editing view. Change what it comes from, and the save writes it again.';

/**
 * readOnlyColors are the colors of the read-only parts in the clean editing view and in the Markdown Editor
 * ([R-TEXT-009](../docs/requirements.md#r-text-009)), which the extension contributes to the themes: a gray background,
 * and a dotted frame in the themes of high contrast.
 */
export const readOnlyColors = { background: 'nimblescapeMarkdownNotes.readOnlyBackground', border: 'nimblescapeMarkdownNotes.readOnlyBorder' } as const;

/**
 * readOnlyStyle returns the style of the read-only parts in the clean editing view: the background of the theme color
 * of read-only parts, with round corners on a part of a line, and the dotted frame of the themes of high contrast.
 * @param wholeLine - Tells whether the style is for blocks of whole lines.
 */
const readOnlyStyle = (wholeLine: boolean): vscode.DecorationRenderOptions => ({
  isWholeLine: wholeLine,
  backgroundColor: new vscode.ThemeColor(readOnlyColors.background),
  borderRadius: wholeLine ? undefined : '3px',
  outlineColor: new vscode.ThemeColor(readOnlyColors.border),
  outlineStyle: 'dotted',
  outlineWidth: '1px',
});

/**
 * tagByHand is the message of the status bar after an edit that typed or pasted a tag that the clean editing view
 * hides, such as an anchor or the comment of a listing: the hidden tags come only from the slash commands and the
 * formatter.
 */
export const tagByHand = 'The clean editing view hides this tag, so only a slash command, such as /note, /figure, /listing or /ref, or the formatter writes it. "Open File with Markup" shows the tags.';

/** FrontMatterSchemas gives the clean editing view the rules of the front matter of a file (decision 75). */
export interface FrontMatterSchemas {
  /**
   * schemaOf returns the rules of the front matter of a file, or undefined when the extension has no rules for it.
   * @param file - The URI of the file.
   * @param text - The text of the file.
   */
  schemaOf(file: vscode.Uri, text: string): Thenable<FrontMatterRules | undefined> | FrontMatterRules | undefined;
  /** onDidChange tells that the rules can have changed, for example after a change of a layout. */
  onDidChange?: vscode.Event<void>;
}

/**
 * resourceFolder is the name of the folder beside a clean document that holds the files of the folder of the workspace
 * of its file, by their paths in that folder, for the Markdown preview of the view: the preview loads only files from
 * the folder of the clean document, because a clean document belongs to no folder of the workspace.
 */
export const resourceFolder = '~markdownnotes~';

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
  /** cleaned resolves when the last write of the clean text into the clean document is done. */
  cleaned?: Promise<void>;
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
  /**
   * rules are the rules of the front matter of the file: undefined while they load the first time, null without rules.
   * They come from the extensions that give the rules of front matters (decision 75).
   */
  rules?: FrontMatterRules | null;
  /** rulesFor is the front matter of the last load of the rules, and rulesRun counts the loads, so that only the last one counts. */
  rulesFor?: string;
  rulesRun?: number;
  /**
   * refused holds the clean texts after the edits of the front matter or of a generated part that went back, each with
   * the clean text before it. VS Code keeps the write back as an undo step of its own, so Undo brings such an edit back;
   * the view then undoes one more step, the edit itself, and comes back to the clean text before it.
   */
  refused?: Array<{ text: string; clean: string }>;
  /**
   * formatted is the clean text that "Format Document" or the format of a save gives the clean document. The change that
   * gives it writes the generated parts, which the formatter keeps current.
   */
  formatted?: string;
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

/** selectTime is the time in milliseconds in which select waits for the text editor of a file or its view. */
const selectTime = 2000;

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

/**
 * hasCustomTab tells whether a tab of a group shows a document in a custom editor, for example in the editor of a whole
 * file ([R-TEXT-010](../docs/requirements.md#r-text-010)), which keeps the changes of the document.
 * @param file - The URI of the document.
 */
const hasCustomTab = (file: vscode.Uri): boolean =>
  vscode.window.tabGroups.all.some((group) => group.tabs.some((tab) => tab.input instanceof vscode.TabInputCustom && tab.input.uri.toString() === file.toString()));

/** CleanView is the file system of the clean documents, and their link to the documents of their files. */
export class CleanView implements vscode.FileSystemProvider, vscode.Disposable {
  private readonly changes = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile = this.changes.event;
  private readonly fileChanges = new vscode.EventEmitter<vscode.Uri>();
  /** rulesChanges tells the clean document whose rules of the front matter changed. */
  private readonly rulesChanges = new vscode.EventEmitter<vscode.Uri>();
  /** schemas are the extensions that give the rules of front matters, in the order of their registration. */
  private readonly schemas: FrontMatterSchemas[] = [];
  /**
   * onDidChangeMarkup tells the file of a view whose text changed from elsewhere, for example a new note of the side
   * view: the Markdown preview of the view renders the file again, also when its clean text stays.
   */
  readonly onDidChangeMarkup = this.fileChanges.event;
  /** mirrors holds the link of each clean document, by its URI, while it opens and after. */
  private readonly mirrors = new Map<string, Promise<Mirror>>();
  /** ready holds the link of each clean document after it opened, by its URI. */
  private readonly ready = new Map<string, Mirror>();
  /** commands counts the slash commands of other extensions that run in each clean document now, by its URI. */
  private readonly commands = new Map<string, number>();
  /** markup holds the files that "Open File with Markup" opened, by their URIs: they stay as they are until their tabs close. */
  private readonly markup = new Set<string>();
  /** opening holds the files that "Open File with Markup" opens now, by their URIs, before they have tabs. */
  private readonly opening = new Set<string>();
  /** switching holds the files whose text editors become the view now, by their URIs. */
  private readonly switching = new Set<string>();
  /**
   * asIs holds the documents that VS Code saves as they are now, by their URIs: the files whose changes go back to their
   * text on disk after the view closed without a save, and the views that follow a save of their files elsewhere.
   */
  private readonly asIs = new Set<string>();
  /** left holds the links of the clean documents that VS Code closed, by their URIs, until the next pass takes their files. */
  private readonly left = new Map<string, Mirror>();
  /** saved tells whether a document was saved since the last pass, which then closes the tabs behind the views. */
  private saved = false;
  /** switched is the running pass that makes the text editors of files with notes the view, and again whether one more pass follows it. */
  private switched: { pass: Promise<void>; again: boolean } | undefined;
  /** closing holds the switches of text editors to their views that did not yet close the tabs of their files, by the URIs of the files. */
  private readonly closing = new Map<string, Promise<void>>();
  /**
   * highlights holds the decorations of the highlights of each color, as in the text editor of a file: shown, faint
   * while another note is selected, and strong for the selected note.
   */
  private readonly highlights = (['shown', 'faint', 'strong'] as const).map((kind) =>
    noteColors.map((color) => vscode.window.createTextEditorDecorationType(highlightStyles(color)[kind])),
  );
  /** readOnly holds the decorations of the read-only parts: of parts of lines, and of blocks of whole lines. */
  private readonly readOnly = { parts: vscode.window.createTextEditorDecorationType(readOnlyStyle(false)), lines: vscode.window.createTextEditorDecorationType(readOnlyStyle(true)) };
  /** log is the output channel of the view, which names each edit that the view could not keep in step. */
  private readonly log = vscode.window.createOutputChannel('Markdown Notes: Clean Editing View');
  /** finders are the finders of the blocks that other extensions hide (R-GEN-012). */
  private readonly finders = new Set<BlockFinder>();
  /** blocks returns the blocks of all finders; a finder that fails gives none. */
  private readonly blocks: BlockFinder = (lines) =>
    [...this.finders].flatMap((finder) => {
      try {
        return [...finder(lines)];
      } catch {
        return [];
      }
    });
  /** markerFinders are the finders of the markers that other extensions hide (R-GEN-012). */
  private readonly markerFinders = new Set<MarkerFinder>();
  /** markers returns the markers of all finders; a finder that fails gives none. */
  private readonly markers: MarkerFinder = (lines) =>
    [...this.markerFinders].flatMap((finder) => {
      try {
        return [...finder(lines)];
      } catch {
        return [];
      }
    });

  /** generatedFinders are the finders of the generated parts that other extensions write (R-GEN-012). */
  private readonly generatedFinders = new Set<GeneratedFinder>();
  /** generated holds the generated parts of the last text of a file that the view looked at. */
  private generated: { text: string; parts: readonly GeneratedPart[] } = { text: '', parts: [] };

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
   * optionsOf returns the options of the projection of a file that the view reads anew: the definitions of the standard
   * footnotes that have a reference are hidden while the side view shows the footnotes.
   * @param file - The URI of the file.
   */
  private optionsOf(file: vscode.Uri): Options {
    return { ...(this.showsFootnotes(file) ? { footnotes: true } : {}), blocks: this.blocks, markers: this.markers };
  }

  /**
   * belongsInView tells whether the file of a text opens in the view: a text with the markup of notes (a start marker, a
   * reference or a definition of a note, or the comment of the format; an anchor of a figure or a table; or a block or a
   * marker that another extension hides), or a paper document, also without notes, so that the rules of its front
   * matter apply (decision 61).
   * @param text - The text.
   */
  private belongsInView(text: string): boolean {
    return isPaperDocument(text) || project(text, { blocks: this.blocks, markers: this.markers }).hidden.length > 0;
  }

  /**
   * settled waits until the changes of a clean document are written into the document of its file, so that an edit of
   * the file finds the text of the view.
   * @param document - The URI of the clean document.
   */
  async settled(document: vscode.Uri): Promise<void> {
    const key = document.toString();
    const mirror = this.ready.get(key) ?? (await this.mirrors.get(key));
    await mirror?.queue;
  }

  /**
   * command runs a slash command of another extension in a clean document: while it runs, its edits may write the tags
   * that the view hides, such as the start marker of `/research` of nimblescape Markdown Paper, which an edit of the
   * user may not type ([R-TEXT-009](../docs/requirements.md#r-text-009)).
   * @param document - The URI of the clean document.
   * @param run - The command.
   */
  async command<T>(document: vscode.Uri, run: () => T | Thenable<T>): Promise<T> {
    const key = document.toString();
    this.commands.set(key, (this.commands.get(key) ?? 0) + 1);
    try {
      return await run();
    } finally {
      // VS Code can tell the change of the last edit after the edit is done.
      setTimeout(() => {
        const left = (this.commands.get(key) ?? 1) - 1;
        if (left > 0) {
          this.commands.set(key, left);
        } else {
          this.commands.delete(key);
        }
      }, 0);
    }
  }

  /**
   * registerHiddenBlocks makes the view leave out the blocks that a finder of another extension returns
   * ([R-GEN-012](../docs/requirements.md#r-gen-012)): blocks of whole lines that belong at the end of the file, such as
   * the database of the sources of nimblescape Markdown Paper. A file with such a block opens in the view too.
   * @param finder - Returns the blocks of the lines of a file.
   */
  registerHiddenBlocks(finder: BlockFinder): vscode.Disposable {
    this.finders.add(finder);
    this.blocksChanged();
    return new vscode.Disposable(() => {
      if (this.finders.delete(finder)) {
        this.blocksChanged();
      }
    });
  }

  /**
   * registerHiddenMarkers makes the view leave out the markers that a finder of another extension returns
   * ([R-GEN-012](../docs/requirements.md#r-gen-012)): parts of a line of text, such as the start marker
   * `<wbr><!--[research-->` of nimblescape Markdown Paper, which an edit keeps as the start marker of a note. A file
   * with such a marker opens in the view too.
   * @param finder - Returns the markers of the lines of a file.
   */
  registerHiddenMarkers(finder: MarkerFinder): vscode.Disposable {
    this.markerFinders.add(finder);
    this.blocksChanged();
    return new vscode.Disposable(() => {
      if (this.markerFinders.delete(finder)) {
        this.blocksChanged();
      }
    });
  }

  /**
   * registerFrontMatterSchema makes the view keep the rules of the front matter that another extension gives
   * ([R-TEXT-009](../docs/requirements.md#r-text-009), decision 75): the keys of the schema and the read-only keys with
   * their values stay, and the schema gives the problems, the quick fixes and the suggestions. The first extension
   * that gives rules for a file wins.
   * @param schemas - Gives the rules of the front matter of a file.
   */
  registerFrontMatterSchema(schemas: FrontMatterSchemas): vscode.Disposable {
    this.schemas.push(schemas);
    const listener = schemas.onDidChange?.(() => this.reloadRules());
    this.reloadRules();
    return new vscode.Disposable(() => {
      listener?.dispose();
      const index = this.schemas.indexOf(schemas);
      if (index >= 0) {
        this.schemas.splice(index, 1);
        this.reloadRules();
      }
    });
  }

  /** reloadRules loads the rules of the front matter of each view anew. */
  private reloadRules(): void {
    for (const [key, mirror] of this.ready) {
      this.loadRules(vscode.Uri.parse(key), mirror, true);
    }
  }

  /**
   * loadRules loads the rules of the front matter of a view, after a change of its front matter, or again. Until the
   * first load is done, the front matter stays as it is; a later load keeps the rules before it until it is done.
   * @param uri - The URI of the clean document.
   * @param mirror - The link of the clean document.
   * @param again - Tells whether the rules load also for the same front matter.
   */
  private loadRules(uri: vscode.Uri, mirror: Mirror, again = false): void {
    const lines = mirror.model.split(/\r\n|\r|\n/);
    const head = lines.slice(0, frontMatterEnd(lines)).join('\n');
    if (!again && mirror.rulesRun !== undefined && mirror.rulesFor === head) {
      return;
    }
    mirror.rulesFor = head;
    const run = (mirror.rulesRun ?? 0) + 1;
    mirror.rulesRun = run;
    const done = (rules: FrontMatterRules | undefined): void => {
      if (mirror.rulesRun === run) {
        mirror.rules = rules ?? null;
        this.rulesChanges.fire(uri);
      }
    };
    if (this.schemas.length === 0 || head === '') {
      done(undefined);
      return;
    }
    void this.rulesFrom(mirror.file, mirror.model).then(done, () => done(undefined));
  }

  /**
   * rulesFrom returns the rules of the front matter of a file from the first extension that has rules for it; an
   * extension that fails has none.
   * @param file - The URI of the file.
   * @param text - The text of the file.
   */
  private async rulesFrom(file: vscode.Uri, text: string): Promise<FrontMatterRules | undefined> {
    for (const schemas of [...this.schemas]) {
      try {
        const rules = await schemas.schemaOf(file, text);
        if (rules) {
          return rules;
        }
      } catch {
        // The next extension.
      }
    }
    return undefined;
  }

  /**
   * rulesOf returns the rules of the front matter of a clean document, or undefined without rules or while they load.
   * @param document - The URI of the clean document.
   */
  rulesOf(document: vscode.Uri): FrontMatterRules | undefined {
    return this.ready.get(document.toString())?.rules ?? undefined;
  }

  /**
   * registerGeneratedParts makes the view keep the generated parts that a finder of another extension returns read-only
   * ([R-GEN-012](../docs/requirements.md#r-gen-012), [R-TEXT-009](../docs/requirements.md#r-text-009)): parts of a line or
   * blocks of whole lines that its format step writes, such as the citations and the reference list of nimblescape
   * Markdown Paper.
   * @param finder - Returns the generated parts of the lines of a file.
   */
  registerGeneratedParts(finder: GeneratedFinder): vscode.Disposable {
    this.generatedFinders.add(finder);
    this.generated = { text: '', parts: [] };
    return new vscode.Disposable(() => {
      this.generatedFinders.delete(finder);
      this.generated = { text: '', parts: [] };
    });
  }

  /**
   * generatedOf returns the generated parts of the text of a file: the parts of the notes and the parts of the finders
   * of other extensions; a finder that fails gives none.
   * @param text - The text of the file.
   */
  private generatedOf(text: string): readonly GeneratedPart[] {
    if (this.generated.text !== text || text === '') {
      const lines = text.split('\n');
      const parts = [
        ...findGenerated(lines),
        ...[...this.generatedFinders].flatMap((finder) => {
          try {
            return [...finder(lines)];
          } catch {
            return [];
          }
        }),
      ];
      this.generated = { text, parts };
    }
    return this.generated.parts;
  }

  /**
   * formats tells the view the edits of the formatter for a clean document, from "Format Document" or the format of a
   * save: the change that gives their text may write the generated parts (R-GEN-016).
   * @param document - The clean document.
   * @param edits - The edits of the formatter.
   */
  formats(document: vscode.TextDocument, edits: readonly vscode.TextEdit[]): void {
    const mirror = this.ready.get(document.uri.toString());
    if (!mirror || edits.length === 0) {
      return;
    }
    let text = document.getText();
    for (const edit of [...edits].sort((a, b) => document.offsetAt(b.range.start) - document.offsetAt(a.range.start))) {
      text = text.slice(0, document.offsetAt(edit.range.start)) + edit.newText + text.slice(document.offsetAt(edit.range.end));
    }
    mirror.formatted = text;
  }

  /** blocksChanged writes each view anew after a change of the finders of hidden blocks or markers, and switches the text editors. */
  private blocksChanged(): void {
    for (const [key, mirror] of this.ready) {
      mirror.typing = undefined;
      mirror.projection = project(mirror.model, this.optionsOf(mirror.file));
      mirror.history = [entryOf(mirror.projection)];
      void this.writeClean(vscode.Uri.parse(key), mirror);
    }
    this.switchLater();
  }

  /** register registers the file system, the command and the listeners of the view, and makes the text editors of files with notes the view. */
  register(): vscode.Disposable[] {
    const registrations = [
      vscode.workspace.registerFileSystemProvider(cleanScheme, this, { isCaseSensitive: true }),
      vscode.commands.registerCommand(cleanCommands.openWithMarkup, () => this.openWithMarkup()),
      ...registerFrontMatterEditing(cleanScheme, { rulesOf: (document) => this.rulesOf(document), onDidChangeRules: this.rulesChanges.event }),
      vscode.workspace.onDidOpenTextDocument((document) => this.opened(document)),
      vscode.workspace.onDidChangeTextDocument((event) => {
        void this.changed(event);
        // A file gets its first note, for example from the side view: its text editor becomes the view.
        if (event.document.uri.scheme !== cleanScheme && vscode.window.visibleTextEditors.some((editor) => editor.document === event.document)) {
          this.switchLater();
        }
      }),
      vscode.workspace.onDidSaveTextDocument((document) => {
        this.saved = true;
        this.switchLater();
        void this.followSave(document).catch((error: unknown) => this.log.appendLine(`${new Date().toISOString()} ${String(error)}`));
      }),
      vscode.workspace.onDidCloseTextDocument((document) => this.closed(document)),
      vscode.window.onDidChangeVisibleTextEditors(() => {
        this.decorateAll();
        this.switchLater();
      }),
      vscode.window.tabGroups.onDidChangeTabs(() => this.switchLater()),
      this.selected.onDidChange(() => this.decorateAll()),
      // The rules of the front matter give its read-only parts.
      this.rulesChanges.event(() => this.decorateAll()),
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
    this.rulesChanges.dispose();
    this.log.dispose();
    for (const type of [...this.highlights.flat(), this.readOnly.parts, this.readOnly.lines]) {
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
   * savesAsIs tells whether VS Code saves a document as it is now, so that its save changes nothing more: a file whose
   * changes go back to its text on disk, or a view that follows a save of its file elsewhere.
   * @param document - The URI of the document.
   */
  savesAsIs(document: vscode.Uri): boolean {
    return this.asIs.has(document.toString());
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
   * textOf returns the text of the file of a clean document, with the parts that the document hides, or undefined for
   * another document.
   * @param document - The URI of the clean document.
   */
  textOf(document: vscode.Uri): string | undefined {
    return this.ready.get(document.toString())?.projection.text;
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

  /**
   * becomesView tells whether a text editor becomes the view: the text editor of a file that the view takes (switchable)
   * in a tab of its own, which "Open File with Markup" did not open. The side of a view of the changes of git stays.
   * @param editor - The text editor.
   */
  becomesView(editor: vscode.TextEditor): boolean {
    const key = editor.document.uri.toString();
    if (this.markup.has(key) || !this.switchable(editor.document)) {
      return false;
    }
    const tab = vscode.window.tabGroups.all.find((group) => group.viewColumn === editor.viewColumn)?.activeTab;
    return tab?.input instanceof vscode.TabInputText && tab.input.uri.toString() === key;
  }

  /**
   * select selects a range of a file in the active text editor of the file, which an editor of the whole file opened
   * with the selection of its page ([R-VSC-002](../docs/requirements.md#r-vsc-002)): in the view, when the text editor
   * becomes the view, at the places of the range in the clean text. The text editor becomes the view after it opened,
   * before the editor can give it the selection, so select waits for the switch, at most selectTime.
   * @param file - The URI of the file.
   * @param range - The range in the file.
   */
  async select(file: vscode.Uri, range: vscode.Range): Promise<void> {
    const key = file.toString();
    const view = cleanUriOf(file).toString();
    const until = Date.now() + selectTime;
    for (;;) {
      await this.switched?.pass;
      const editor = vscode.window.activeTextEditor;
      const uri = editor?.document.uri.toString();
      if (editor && uri === view) {
        const start = this.toClean(file, range.start);
        const end = this.toClean(file, range.end);
        if (start && end) {
          editor.selection = new vscode.Selection(start, end);
          editor.revealRange(new vscode.Range(start, end), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        }
        return;
      }
      if (editor && uri === key && !this.becomesView(editor)) {
        editor.selection = new vscode.Selection(range.start, range.end);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
        return;
      }
      if (Date.now() >= until) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
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
    return document.languageId !== 'markdown' || !this.belongsInView(mirror.model) ? mirror.file : undefined;
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
   * switchedOf resolves when the text editor of a file that becomes its view closed the tab of the file. A write of the
   * extension to the file waits for it: VS Code asks to save a file with changes whose tab closes, and in the tests of
   * extensions it drops the changes instead.
   * @param file - The URI of the file.
   */
  switchedOf(file: vscode.Uri): Promise<void> {
    return this.closing.get(file.toString()) ?? Promise.resolve();
  }

  /**
   * switchable tells whether the text editor of a document becomes the view: a Markdown file with notes, with the
   * comment of the format, or a paper document, that the extension can change. The text editor of a file that opens in
   * the editor of a whole file becomes the view too, for example after "Open Text Editor to the Side" or "Reopen Editor
   * With", so that each text editor of such a file keeps the front matter read-only and the markup hidden (decision 72).
   * @param document - The document.
   */
  private switchable(document: vscode.TextDocument): boolean {
    return (
      document.uri.scheme !== cleanScheme &&
      document.languageId === 'markdown' &&
      vscode.workspace.fs.isWritableFileSystem(document.uri.scheme) === true &&
      this.belongsInView(document.getText())
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
    const key = editor.document.uri.toString();
    let done = (): void => undefined;
    const closing = new Promise<void>((resolve) => (done = resolve));
    this.closing.set(key, closing);
    try {
      await this.switchToView(editor, tab);
    } finally {
      if (this.closing.get(key) === closing) {
        this.closing.delete(key);
      }
      done();
    }
  }

  /**
   * switchToView shows the view of the file of a text editor in place of it and closes the tab of the file, for
   * switchTo.
   * @param editor - The text editor of the file.
   * @param tab - The tab of the text editor.
   */
  private async switchToView(editor: vscode.TextEditor, tab: vscode.Tab): Promise<void> {
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
      if (!this.markup.has(key) && !this.switching.has(key) && !document?.isDirty && this.belongsInView(mirror.model) && hasTab(cleanUriOf(mirror.file))) {
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
      this.loadRules(uri, opened);
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
      this.loadRules(document.uri, mirror);
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
   * closed the view without a save. A file that the editor of a whole file still shows keeps its changes there.
   * @param mirror - The link of the closed view.
   * @returns Whether the file went back.
   */
  private async revertLeft(mirror: Mirror): Promise<boolean> {
    await mirror.queue;
    const real = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === mirror.file.toString());
    if (!real?.isDirty || real.getText() !== mirror.model || hasCustomTab(mirror.file)) {
      return false;
    }
    const disk = new TextDecoder().decode(await vscode.workspace.fs.readFile(mirror.file));
    const change = replacement(real.getText(), disk);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(mirror.file, new vscode.Range(real.positionAt(change.start), real.positionAt(change.end)), change.text);
    const key = mirror.file.toString();
    this.asIs.add(key);
    try {
      await vscode.workspace.applyEdit(edit);
      await real.save();
    } finally {
      this.asIs.delete(key);
    }
    return true;
  }

  /**
   * followSave saves the views of a file without changes, for example after its save in the editor of a whole file
   * ([R-TEXT-010](../docs/requirements.md#r-text-010)) or after an edit of the front matter that went back: a view
   * whose clean text is the clean text of the file then has no changes that are not saved, which VS Code would ask
   * about at its close. The save of the view changes nothing more (savesAsIs).
   * @param document - The document of the file.
   */
  private async followSave(document: vscode.TextDocument): Promise<void> {
    if (document.uri.scheme === cleanScheme) {
      return;
    }
    const file = document.uri.toString();
    for (const [key, mirror] of this.ready) {
      if (mirror.file.toString() !== file) {
        continue;
      }
      await mirror.queue;
      await mirror.cleaned;
      const view = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === key);
      if (!view?.isDirty || document.isDirty || document.getText() !== mirror.model || view.getText() !== mirror.projection.clean) {
        continue;
      }
      this.asIs.add(key);
      try {
        await view.save();
      } finally {
        this.asIs.delete(key);
      }
    }
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
        this.loadRules(vscode.Uri.parse(clean), mirror);
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
    let { model, projection, typing } = mirror;
    // The format writes the generated parts; an edit of the user keeps them.
    const formatting = mirror.formatted === document.getText();
    mirror.formatted = undefined;
    // A slash command of another extension may write hidden tags (`command`).
    const commanded = this.commands.has(document.uri.toString());
    let refusal: string | undefined;
    for (const change of event.contentChanges) {
      const clean = projection.clean;
      const start = offsetIn(clean, change.range.start);
      const end = offsetIn(clean, change.range.end);
      const continues = event.contentChanges.length === 1 && typing?.to === end;
      const result = applyClean(projection, start, end, change.text, continues);
      if (result.way !== 'direct') {
        this.log.appendLine(`${new Date().toISOString()} ${result.way}: ${JSON.stringify(clean.slice(start, end))} → ${JSON.stringify(change.text)} at ${start}`);
      }
      if (!formatting && !keepsGenerated(model, result.text, this.generatedOf(model))) {
        refusal = generatedReadOnly;
        break;
      }
      const next = project(result.text, editOptions(projection));
      if (!formatting && !commanded && hidesTyped(result, change.text, next)) {
        refusal = tagByHand;
        break;
      }
      model = result.text;
      projection = next;
      // Text typed into the end of a highlight, also over its last word, or deleted there while typing: the next
      // letters stay in it.
      const after = start + change.text.length;
      const from = continues ? Math.min(typing!.from, start) : start;
      typing = event.contentChanges.length === 1 && (change.text.length > 0 || continues) && endsHighlight(projection, after) ? { from, to: after } : undefined;
    }
    // The format may also write the front matter, as it writes the generated parts.
    if (refusal === undefined && !formatting && !keepsRules(mirror.model, model, mirror.rules)) {
      refusal = frontMatterKept;
    }
    if (refusal !== undefined) {
      this.refuse(mirror, event, refusal);
      return;
    }
    mirror.model = model;
    mirror.projection = projection;
    mirror.typing = typing;
    mirror.history = [...mirror.history, entryOf(mirror.projection)].slice(-historySize);
    this.writeReal(mirror);
    this.loadRules(document.uri, mirror);
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
      await this.switchedOf(mirror.file);
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
   * refuse takes back an edit of a clean document that breaks the rules of its front matter (decision 75), changes a
   * generated part, which is read-only in the view, or types a tag that the view hides: the edit goes back as a whole, the file stays as it is, the view of
   * a file without changes has no changes either, and the status bar says why. An Undo that brings back such an edit
   * undoes the edit too, so that Undo goes on with the edits before it.
   * @param mirror - The link of the clean document.
   * @param event - The change.
   * @param message - The message of the status bar.
   */
  private refuse(mirror: Mirror, event: vscode.TextDocumentChangeEvent, message: string): void {
    const document = event.document;
    const text = document.getText();
    const clean = mirror.projection.clean;
    const refused = mirror.refused ?? [];
    const index = refused.findIndex((entry) => entry.text === text && entry.clean === clean);
    mirror.typing = undefined;
    if (event.reason === vscode.TextDocumentChangeReason.Undo && index >= 0 && vscode.window.activeTextEditor?.document === document) {
      // The Undo of the write back: one more step undoes the edit, and the view shows the clean text before it.
      mirror.refused = refused.filter((_, other) => other !== index);
      void vscode.commands.executeCommand('undo');
      return;
    }
    if (event.reason !== vscode.TextDocumentChangeReason.Undo) {
      // A typed edit, or its Redo: its undo step comes back to the clean text before it.
      mirror.refused = [...refused, { text, clean }].slice(-historySize);
    }
    vscode.window.setStatusBarMessage(message, 5000);
    // A file without changes keeps a view without changes: the edit that went back changed nothing.
    void this.writeClean(document.uri, mirror)
      .then(() => {
        const real = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === mirror.file.toString());
        return real && this.followSave(real);
      })
      .catch((error: unknown) => this.log.appendLine(`${new Date().toISOString()} ${String(error)}`));
  }

  /**
   * writeClean writes the clean text of the model into the clean document, and keeps the write in the link, so that a
   * save of the view after a save of its file waits for it.
   * @param uri - The URI of the clean document.
   * @param mirror - The link of the clean document.
   */
  private writeClean(uri: vscode.Uri, mirror: Mirror): Promise<void> {
    const write = this.writeCleanText(uri, mirror);
    mirror.cleaned = write.catch(() => undefined);
    return write;
  }

  /**
   * writeCleanText writes the clean text of the model into the clean document, for writeClean.
   * @param uri - The URI of the clean document.
   * @param mirror - The link of the clean document.
   */
  private async writeCleanText(uri: vscode.Uri, mirror: Mirror): Promise<void> {
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

  /**
   * decorateAll shows the highlights of the notes and the read-only parts in the visible text editors of the clean
   * documents.
   */
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
        const readOnly = current ? this.readOnlyOf(mirror, editor.document) : { parts: [], lines: [] };
        editor.setDecorations(this.readOnly.parts, readOnly.parts);
        editor.setDecorations(this.readOnly.lines, readOnly.lines);
      });
    }
  }

  /**
   * readOnlyOf returns the read-only parts of a clean document that its text shows, with the reason in their hover
   * ([R-TEXT-009](../docs/requirements.md#r-text-009)): the generated parts, and the parts of the front matter that its
   * rules keep. A part that the clean text hides shows nothing.
   * @param mirror - The link of the clean document.
   * @param document - The clean document.
   */
  private readOnlyOf(mirror: Mirror, document: vscode.TextDocument): { parts: vscode.DecorationOptions[]; lines: vscode.DecorationOptions[] } {
    const text = mirror.projection.text;
    const result = { parts: [] as vscode.DecorationOptions[], lines: [] as vscode.DecorationOptions[] };
    const add = (parts: readonly GeneratedPart[], message: string): void => {
      const hoverMessage = new vscode.MarkdownString(message);
      for (const range of rangesOf(text, parts)) {
        const from = toClean(mirror.projection, range.from);
        const to = toClean(mirror.projection, range.to);
        if (to > from) {
          (range.lines ? result.lines : result.parts).push({ range: new vscode.Range(document.positionAt(from), document.positionAt(to)), hoverMessage });
        }
      }
    };
    add(this.generatedOf(text), generatedReadOnly);
    add(readOnlyParts(text, mirror.rules), frontMatterKept);
    return result;
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
   * names as it is (resourceOf) does not change. A view that follows a file without changes (followSave) leaves the
   * file as it is, also when it changed again since.
   * @param uri - The URI of the clean document.
   * @param content - The clean text.
   */
  async writeFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
    if (this.resourceOf(uri)) {
      throw vscode.FileSystemError.NoPermissions('The clean editing view changes only Markdown files.');
    }
    const mirror = await this.mirrorOf(uri);
    if (this.asIs.has(uri.toString())) {
      mirror.mtime = Date.now();
      return;
    }
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
