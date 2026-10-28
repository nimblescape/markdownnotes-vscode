// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The overlay of the notes in the text editor: decorations and folding over
 * the text editor of VS Code, which stays as it is
 * ([R-GEN-007](../docs/requirements.md#r-gen-007)).
 *
 * - **Dimming after the cursor** ([R-TEXT-003](../docs/requirements.md#r-text-003)):
 *   while the cursor is outside the notes, the editor dims the notes; while it
 *   is in a note, it dims everything outside this note.
 * - **Collapsed notes** ([R-TEXT-005](../docs/requirements.md#r-text-005)): the
 *   extension gives VS Code a folding range for each note
 *   ([src/notes/folds.ts](notes/folds.ts)), so that a collapsed note vanishes
 *   into the line before it. It collapses the notes of a file the first time
 *   the file is in the active editor, when the setting `collapseInEditor` is
 *   on, and has the commands "Hide Note Text", "Show Note Text", "Collapse All
 *   Notes" and "Expand All Notes". The box of a note has the button "Hide Note
 *   Text" while the text of the note shows, and "Show Note Text" while it is
 *   folded.
 * - **Markers** ([R-TEXT-006](../docs/requirements.md#r-text-006)): each note
 *   has a marker in the left margin with its number, in its color: at its
 *   first line, or at the line that stays of its fold while it is collapsed.
 *   A note with a selection has it at the last line of the selection, beside
 *   the comment mark of VS Code, whose click opens the box (VS Code tells an
 *   extension of no click on the marker itself), and while the note is open
 *   also at its first line. The overview ruler shows a mark in the same color.
 * - **Selections** ([R-NOTE-006](../docs/requirements.md#r-note-006)): the
 *   selection of a note has a highlight in the color of the note. Its start
 *   marker `<!--[note-7k2q-->` and its reference `[^note-7k2q]` vanish: a thin
 *   bar in the color of the note stands at the start and at the end of the
 *   selection, and a dot at a point. The markers stay hidden also on the line
 *   of the cursor: the cursor steps over a marker as over one place, and
 *   Backspace and Delete next to a marker delete the character on the other
 *   side of it ([src/notes/cursor.ts](notes/cursor.ts)), so that no key changes
 *   a marker. The selection of the selected note of the side view has a strong
 *   highlight with a frame in its color.
 * - **Headers** ([R-TEXT-007](../docs/requirements.md#r-text-007)): the header
 *   line of each answer shows rendered, with the author and the date in the
 *   local time of the reader, for example `hannes · 2026-10-28 10:15`, and the
 *   date in the local time of the author as its hover, also on the line of
 *   the cursor. The cursor does not stay on a header line, and Backspace and
 *   Delete next to it change nothing, so that no key changes a header.
 * - **Notes that stay collapsed** ([R-TEXT-005](../docs/requirements.md#r-text-005)):
 *   with the setting `keepNotesCollapsed`, the notes collapse the first time a
 *   file is in the active editor, and the extension collapses again a note
 *   that VS Code opens, for example after a click on its fold arrow. The
 *   cursor does not stay in the lines of a collapsed note.
 *
 * VS Code tells an extension which lines are folded only by the visible
 * ranges of the editor, which end at the first line of a collapsed fold and
 * start again after its last line. A fold outside the visible ranges keeps the
 * state that the extension saw or gave it last.
 *
 * VS Code reads the folds of all folding providers anew when an extension
 * registers one, and a fold command during the reading before acts on the old
 * folds. At the start of VS Code with a Markdown file open, the Markdown
 * extension of VS Code registers its provider after this extension collapsed
 * the notes, so the extension collapses them again each time VS Code reads the
 * folds of the unchanged document, for a short time after the first collapse.
 */

import * as vscode from 'vscode';
import { colorIndexOf, colorOf, noteColors } from './notes/colors';
import { type Fold, foldOf, foldsOf, headersOf } from './notes/folds';
import { deletion, locksLine, offLines, outside, type Side, type Span, spansOf } from './notes/cursor';
import { type Marker, type Note, noteAt, type Position, same } from './notes/notes';
import { authorDate } from './notes/syntax';
import { isNoteDocument, type NoteThreads, rangeOf } from './noteThreads';
import type { SelectedNotes } from './selectedNotes';
import type { Settings } from './settings';

/** editorCommands are the commands of the folds of the notes. */
export const editorCommands = {
  collapseNote: 'nimblescape.markdownNotes.collapseNote',
  expandNote: 'nimblescape.markdownNotes.expandNote',
  collapseAll: 'nimblescape.markdownNotes.collapseAllNotes',
  expandAll: 'nimblescape.markdownNotes.expandAllNotes',
} as const;

/** deleteCommands are the commands of Backspace and Delete, and of the keys that delete a word, next to a hidden marker. */
export const deleteCommands = {
  left: 'nimblescape.markdownNotes.deleteLeft',
  right: 'nimblescape.markdownNotes.deleteRight',
  wordLeft: 'nimblescape.markdownNotes.deleteWordLeft',
  wordRight: 'nimblescape.markdownNotes.deleteWordRight',
} as const;

/** markerContexts are the context keys that tell the keys of deleteCommands that a hidden marker is next to the cursor. */
export const markerContexts = {
  left: 'nimblescape.markdownNotes.markerLeft',
  right: 'nimblescape.markdownNotes.markerRight',
} as const;

/** builtinDeletes are the commands of VS Code that the keys run without a marker next to the cursor. */
const builtinDeletes = {
  left: ['deleteLeft', 'deleteWordLeft'],
  right: ['deleteRight', 'deleteWordRight'],
} as const;

/** keepTime is the time in milliseconds after VS Code read the folds of a document before the extension collapses its open notes again. */
export const keepTime = 300;

export { colorOf, noteColors } from './notes/colors';

/**
 * markerImage returns the image of the marker of a note: a speech bubble in its color with its number.
 * @param number - The number of the note, from 1.
 */
export function markerImage(number: number): string {
  const label = number > 99 ? '…' : String(number);
  const size = label.length > 1 ? 6.5 : 8;
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">',
    `<path d="M2.5 1.5h11A1.5 1.5 0 0 1 15 3v7.5a1.5 1.5 0 0 1-1.5 1.5H7.5L4 15v-3H2.5A1.5 1.5 0 0 1 1 10.5V3a1.5 1.5 0 0 1 1.5-1.5z" fill="${colorOf(number)}"/>`,
    `<text x="8" y="9.6" font-family="sans-serif" font-size="${size}" font-weight="bold" fill="#fff" text-anchor="middle">${label}</text>`,
    '</svg>',
  ].join('');
}

/**
 * settleTime is the time in milliseconds after the first collapse of the notes of a document in which the extension
 * collapses them again each time VS Code reads the folds of the unchanged document.
 */
export const settleTime = 10_000;

/**
 * linesOf returns the lines of a document.
 * @param document - The document.
 */
const linesOf = (document: vscode.TextDocument): string[] => document.getText().split(/\r\n|\r|\n/);

/**
 * contains tells whether a note holds a position, its start and its end included.
 * @param note - The note.
 * @param position - The position.
 */
const contains = (note: Note, position: vscode.Position): boolean => rangeOf(note).contains(position);

/**
 * positionOf returns the position of VS Code of a position of a note.
 * @param position - The position.
 */
const positionOf = (position: Position): vscode.Position => new vscode.Position(position.line, position.character);

/**
 * edgeOf returns the decoration of a hidden marker of a selection: a thin bar in the color of the note at the start or
 * the end of the selection, or a dot at a point.
 * @param marker - The marker.
 * @param number - The number of the note, from 1.
 */
function edgeOf(marker: Marker, number: number): vscode.DecorationOptions {
  const color = colorOf(number);
  const at = positionOf(marker.kind === 'open' ? marker.end : marker.start);
  const before: vscode.ThemableDecorationAttachmentRenderOptions =
    marker.kind === 'point'
      ? { contentText: '●', color, fontWeight: 'bold', margin: '0 1px' }
      : { contentText: '', width: '2px', height: '1.1em', backgroundColor: color, margin: marker.kind === 'open' ? '0 1px 0 0' : '0 0 0 1px', textDecoration: 'none; vertical-align: text-bottom;' };
  return { range: new vscode.Range(at, at), renderOptions: { before } };
}

/**
 * isCollapsed tells whether VS Code shows a fold collapsed in an editor: a visible range ends at its first line, and the
 * next one starts after its last line, or the fold ends the document.
 * @param editor - The text editor.
 * @param fold - The fold.
 */
function isCollapsed(editor: vscode.TextEditor, fold: Pick<Fold, 'start' | 'end'>): boolean {
  const ranges = editor.visibleRanges;
  return ranges.some((range, index) => {
    const next = ranges[index + 1];
    return range.end.line === fold.start && (next ? next.start.line === fold.end + 1 : fold.end === editor.document.lineCount - 1);
  });
}

/**
 * isOpen tells whether VS Code shows a fold open in an editor: a visible range holds its first line and the line after
 * it.
 * @param editor - The text editor.
 * @param fold - The fold.
 */
const isOpen = (editor: vscode.TextEditor, fold: Pick<Fold, 'start'>): boolean => editor.visibleRanges.some((range) => range.start.line <= fold.start && range.end.line > fold.start);

/** NoteEditor keeps the decorations and the folds of the notes in the text editors. */
export class NoteEditor implements vscode.Disposable {
  /** dimmed is the decoration of the part of the text that the user does not work on. */
  private readonly dimmed = vscode.window.createTextEditorDecorationType({ opacity: '0.55' });
  /** hidden hides the first line of a collapsed fold that is the first line of a note. */
  private readonly hidden = vscode.window.createTextEditorDecorationType({ textDecoration: 'none; display: none;' });
  /** highlights holds the decoration of the selections of each color of a note. */
  private readonly highlights = noteColors.map((color) => vscode.window.createTextEditorDecorationType({ backgroundColor: `${color}33`, overviewRulerColor: color, overviewRulerLane: vscode.OverviewRulerLane.Center }));
  /** edges shows the bars and the dots in place of the hidden markers of the selections. */
  private readonly edges = vscode.window.createTextEditorDecorationType({});
  /** strong holds the decoration of the selection of the selected note of each color: a strong highlight with a frame. */
  private readonly strong = noteColors.map((color) => vscode.window.createTextEditorDecorationType({ backgroundColor: `${color}66`, border: `1px solid ${color}`, borderRadius: '3px' }));
  /** headers shows the rendered header of an answer in place of its header line. */
  private readonly headers = vscode.window.createTextEditorDecorationType({});
  /** markers holds the decoration of the marker of each number of a note. */
  private readonly markers: vscode.TextEditorDecorationType[] = [];
  /** collapsed holds the documents whose notes the extension collapsed once, by their URIs. */
  private readonly collapsed = new Set<string>();
  /** pending holds the documents whose first collapse repeats, by their URIs: the version of the document and the time until which it repeats. */
  private readonly pending = new Map<string, { version: number; until: number }>();
  /** shut holds the labels of the notes whose text is folded, of each document by its URI. */
  private readonly shut = new Map<string, Set<string>>();
  /** read holds the version of each document whose folds VS Code read last, by its URI. */
  private readonly read = new Map<string, number>();
  /** cursors holds the last selections of each editor, for the direction of a move of the cursor. */
  private readonly cursors = new WeakMap<vscode.TextEditor, readonly vscode.Selection[]>();
  /** contexts holds the values of markerContexts that the extension set last. */
  private readonly contexts = { left: false, right: false };

  /**
   * @param threads - The threads of the notes, which read the notes of each document and tell their changes.
   * @param settingsOf - Returns the settings of a document.
   * @param selected - The selected note of each document, whose selection has the strong highlight.
   */
  constructor(
    private readonly threads: NoteThreads,
    private readonly settingsOf: (document: vscode.Uri) => Settings,
    private readonly selected: SelectedNotes,
  ) {}

  /** register registers the folding, the commands and the listeners, and decorates the visible editors. */
  register(): vscode.Disposable[] {
    const registrations = [
      vscode.languages.registerFoldingRangeProvider('markdown', {
        provideFoldingRanges: (document) => {
          if (!isNoteDocument(document)) {
            return [];
          }
          this.repeatCollapse(document);
          this.keepLater(document);
          return this.foldsIn(document).map((fold) => new vscode.FoldingRange(fold.start, fold.end, vscode.FoldingRangeKind.Comment));
        },
      }),
      vscode.commands.registerCommand(editorCommands.collapseNote, (thread?: vscode.CommentThread) => this.foldNote(thread, true)),
      vscode.commands.registerCommand(editorCommands.expandNote, (thread?: vscode.CommentThread) => this.foldNote(thread, false)),
      vscode.commands.registerCommand(editorCommands.collapseAll, () => this.foldAll(true)),
      vscode.commands.registerCommand(editorCommands.expandAll, () => this.foldAll(false)),
      vscode.commands.registerCommand(deleteCommands.left, () => this.deleteNext('left', false)),
      vscode.commands.registerCommand(deleteCommands.right, () => this.deleteNext('right', false)),
      vscode.commands.registerCommand(deleteCommands.wordLeft, () => this.deleteNext('left', true)),
      vscode.commands.registerCommand(deleteCommands.wordRight, () => this.deleteNext('right', true)),
      vscode.window.onDidChangeVisibleTextEditors((editors) => editors.forEach((editor) => this.decorate(editor))),
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        this.collapseOnce(editor);
        this.markContext(editor);
      }),
      vscode.window.onDidChangeTextEditorSelection((event) => {
        this.stepOver(event.textEditor);
        this.decorate(event.textEditor);
      }),
      vscode.window.onDidChangeTextEditorVisibleRanges((event) => this.decorate(event.textEditor)),
      vscode.workspace.onDidCloseTextDocument((document) => {
        const key = document.uri.toString();
        this.collapsed.delete(key);
        this.pending.delete(key);
        this.shut.delete(key);
        this.read.delete(key);
      }),
      this.threads.onDidChange((document) => this.decorateAll(document)),
      this.selected.onDidChange((document) => this.decorateAll(document)),
    ];
    vscode.window.visibleTextEditors.forEach((editor) => this.decorate(editor));
    this.collapseOnce(vscode.window.activeTextEditor);
    return registrations;
  }

  /**
   * decorateAll decorates the visible editors of a document.
   * @param document - The URI of the document.
   */
  private decorateAll(document: vscode.Uri): void {
    for (const editor of vscode.window.visibleTextEditors) {
      if (editor.document.uri.toString() === document.toString()) {
        this.decorate(editor);
      }
    }
  }

  /**
   * notesIn returns the notes of a document that can have notes.
   * @param document - The document.
   */
  private notesIn(document: vscode.TextDocument): Note[] {
    return isNoteDocument(document) && !document.isClosed ? this.threads.notesOf(document) : [];
  }

  /**
   * foldsIn returns the folds of the notes of a document.
   * @param document - The document.
   */
  private foldsIn(document: vscode.TextDocument): Fold[] {
    return foldsOf(linesOf(document), this.notesIn(document));
  }

  /**
   * spansIn returns the places of the hidden markers of the selections of the notes of a document.
   * @param document - The document.
   */
  private spansIn(document: vscode.TextDocument): Span[] {
    return spansOf(this.notesIn(document).flatMap((note) => note.selection?.markers ?? []));
  }

  /**
   * headerLinesIn returns the indexes of the header lines of the answers of the notes of a document.
   * @param document - The document.
   */
  private headerLinesIn(document: vscode.TextDocument): Set<number> {
    return new Set(headersOf(linesOf(document), this.notesIn(document)).map((header) => header.line));
  }

  /**
   * markerOf returns the decoration of the marker of a number, which it creates the first time.
   * @param number - The number of a note, from 1.
   */
  private markerOf(number: number): vscode.TextEditorDecorationType {
    while (this.markers.length < number) {
      const created = this.markers.length + 1;
      this.markers.push(
        vscode.window.createTextEditorDecorationType({
          gutterIconPath: vscode.Uri.parse(`data:image/svg+xml;base64,${Buffer.from(markerImage(created)).toString('base64')}`),
          gutterIconSize: 'contain',
          overviewRulerColor: colorOf(created),
          overviewRulerLane: vscode.OverviewRulerLane.Left,
        }),
      );
    }
    return this.markers[number - 1];
  }

  /**
   * decorate gives a text editor the dimming, the markers and the hidden first lines of its notes.
   * @param editor - The text editor.
   */
  private decorate(editor: vscode.TextEditor): void {
    const document = editor.document;
    const notes = this.notesIn(document);
    const lines = linesOf(document);
    const folds = foldsOf(lines, notes);
    const cursor = editor.selection.active;
    const current = notes.find((note) => contains(note, cursor));
    const end = document.lineAt(Math.max(document.lineCount - 1, 0)).range.end;
    const outside = current ? [new vscode.Range(new vscode.Position(0, 0), rangeOf(current).start), new vscode.Range(rangeOf(current).end, end)] : notes.map(rangeOf);
    editor.setDecorations(this.dimmed, outside);
    const collapsed = new Set(folds.filter((fold) => isCollapsed(editor, fold)));
    const shut = this.shutIn(document);
    for (const fold of folds) {
      const known = collapsed.has(fold) ? true : isOpen(editor, fold) ? false : undefined;
      if (known !== undefined) {
        fold.notes.forEach((note) => (known ? shut.add(note.label) : shut.delete(note.label)));
      }
    }
    this.threads.showFolded(document.uri, (note) => shut.has(note.label));
    // A note with a selection has its marker at the last line of the selection, where VS Code shows the comment mark
    // of its box, and while it is open also at its own first line. Notes of one line share it, as the notes of one
    // collapsed fold, and the first of them shows its marker there.
    const taken = new Set<number>();
    const markerLines = notes.map((note) => {
      const fold = foldOf(folds, note);
      const shut = fold !== undefined && collapsed.has(fold);
      const own = note.selection ? [note.selection.end.line, shut ? undefined : note.start.line] : [shut ? fold.start : note.start.line];
      const free = [...new Set(own)].filter((line): line is number => line !== undefined && !taken.has(line));
      free.forEach((line) => taken.add(line));
      return free;
    });
    for (let number = 1; number <= Math.max(notes.length, this.markers.length); number++) {
      editor.setDecorations(this.markerOf(number), (markerLines[number - 1] ?? []).map((line) => new vscode.Range(line, 0, line, 0)));
    }
    const highlighted = this.highlights.map((): vscode.Range[] => []);
    const strong = this.strong.map((): vscode.Range[] => []);
    const hidden = [...collapsed].filter((fold) => fold.hidesFirst && cursor.line !== fold.start).map((fold) => document.lineAt(fold.start).range);
    const edges: vscode.DecorationOptions[] = [];
    const selectedLabel = this.selected.labelOf(document.uri);
    notes.forEach(({ label, selection }, index) => {
      if (!selection) {
        return;
      }
      const range = new vscode.Range(positionOf(selection.start), positionOf(selection.end));
      if (!range.isEmpty) {
        (label === selectedLabel ? strong : highlighted)[colorIndexOf(index + 1)].push(range);
      }
      for (const marker of selection.markers) {
        hidden.push(new vscode.Range(positionOf(marker.start), positionOf(marker.end)));
        edges.push(edgeOf(marker, index + 1));
      }
    });
    this.highlights.forEach((highlight, index) => editor.setDecorations(highlight, highlighted[index]));
    this.strong.forEach((highlight, index) => editor.setDecorations(highlight, strong[index]));
    const headers: vscode.DecorationOptions[] = [];
    for (const header of headersOf(lines, notes)) {
      const range = new vscode.Range(header.line, header.start, header.line, header.end);
      hidden.push(range);
      headers.push({
        range,
        hoverMessage: authorDate(header.date),
        renderOptions: { before: { contentText: header.text, color: new vscode.ThemeColor('descriptionForeground'), fontStyle: 'italic' } },
      });
    }
    editor.setDecorations(this.headers, headers);
    editor.setDecorations(this.hidden, hidden);
    editor.setDecorations(this.edges, edges);
    if (editor === vscode.window.activeTextEditor) {
      this.keepShut(editor, folds);
    }
  }

  /**
   * stepOver moves each cursor of an editor off a header line, in the direction of its move and past the lines of the
   * collapsed notes, and out of a hidden marker to the edge of the marker, and sets the context keys of the markers and
   * header lines next to the cursor.
   * @param editor - The text editor.
   */
  private stepOver(editor: vscode.TextEditor): void {
    const document = editor.document;
    const spans = this.spansIn(document);
    const headers = this.headerLinesIn(document);
    const lines = linesOf(document);
    const blocked = new Set(headers);
    for (const fold of foldsOf(lines, this.notesIn(document)).filter((candidate) => isCollapsed(editor, candidate))) {
      for (let line = fold.hidesFirst ? fold.start : fold.start + 1; line <= fold.end; line++) {
        blocked.add(line);
      }
    }
    const previous = this.cursors.get(editor);
    const selections = editor.selections;
    const free = (position: Position, before: Position | undefined): Position => outside(spans, offLines(blocked, lines, position, before), before);
    const moved = selections.map((selection, index) => {
      const active = free(selection.active, previous?.[index]?.active);
      const anchor = selection.isEmpty ? active : free(selection.anchor, previous?.[index]?.anchor);
      return same(active, selection.active) && same(anchor, selection.anchor) ? selection : new vscode.Selection(positionOf(anchor), positionOf(active));
    });
    this.cursors.set(editor, moved);
    if (moved.some((selection, index) => selection !== selections[index])) {
      editor.selections = moved;
    }
    this.markContext(editor, spans, headers);
  }

  /**
   * markContext sets the context keys that tell whether a hidden marker or a header line is next to the cursor on its
   * left or its right side, for one empty selection in the active editor.
   * @param editor - The text editor.
   * @param spans - The places of the hidden markers of its document.
   * @param headers - The indexes of the header lines of its document.
   */
  private markContext(editor: vscode.TextEditor | undefined, spans = editor ? this.spansIn(editor.document) : [], headers = editor ? this.headerLinesIn(editor.document) : new Set<number>()): void {
    const selections = editor === vscode.window.activeTextEditor ? (editor?.selections ?? []) : [];
    const cursor = selections.length === 1 && selections[0].isEmpty ? selections[0].active : undefined;
    const lines = cursor && editor && headers.size > 0 ? linesOf(editor.document) : [];
    for (const side of ['left', 'right'] as const) {
      const next =
        cursor !== undefined &&
        (spans.some((span) => span.line === cursor.line && (side === 'left' ? span.end : span.start) === cursor.character) || (headers.size > 0 && locksLine(headers, lines, cursor, side)));
      if (next !== this.contexts[side]) {
        this.contexts[side] = next;
        void vscode.commands.executeCommand('setContext', markerContexts[side], next);
      }
    }
  }

  /**
   * deleteNext deletes the character or the word on the other side of the hidden markers next to the cursor of the
   * active editor, or runs the command of VS Code for the key without a marker there.
   * @param side - The side of the cursor on which the key deletes.
   * @param word - Whether the key deletes a word.
   */
  private async deleteNext(side: Side, word: boolean): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }
    const document = editor.document;
    const range =
      editor.selections.length === 1 && editor.selection.isEmpty ? deletion(linesOf(document), this.spansIn(document), editor.selection.active, side, word, this.headerLinesIn(document)) : undefined;
    if (!range) {
      await vscode.commands.executeCommand(builtinDeletes[side][word ? 1 : 0]);
      return;
    }
    if (!same(range.start, range.end)) {
      await editor.edit((edit) => edit.delete(new vscode.Range(positionOf(range.start), positionOf(range.end))));
    }
  }

  /**
   * keepLater collapses the open notes of a document in the active editor again after keepTime, when the setting
   * keepNotesCollapsed is on: VS Code read the folds of this version of the document, so the fold command acts on them.
   * @param document - The document whose folds VS Code reads.
   */
  private keepLater(document: vscode.TextDocument): void {
    const key = document.uri.toString();
    this.read.set(key, document.version);
    if (!this.settingsOf(document.uri).keepNotesCollapsed) {
      return;
    }
    setTimeout(() => {
      const editor = vscode.window.activeTextEditor;
      if (editor?.document === document && !document.isClosed) {
        this.keepShut(editor, this.foldsIn(document));
      }
    }, keepTime);
  }

  /**
   * keepShut collapses the notes that VS Code shows open in the active editor, when the setting keepNotesCollapsed is
   * on, and moves a cursor in the lines of such a note out of them, because VS Code opens a fold that holds the cursor.
   * The editor acts only on a version of the document whose folds VS Code read.
   * @param editor - The active text editor.
   * @param folds - The folds of its document.
   */
  private keepShut(editor: vscode.TextEditor, folds: readonly Fold[]): void {
    const document = editor.document;
    if (!this.settingsOf(document.uri).keepNotesCollapsed || this.read.get(document.uri.toString()) !== document.version) {
      return;
    }
    const previous = this.cursors.get(editor)?.[0]?.active;
    // held holds the folds that hold a cursor, which VS Code opens.
    const held = new Set<Fold>();
    const moved = editor.selections.map((selection) => {
      const line = selection.active.line;
      const fold = folds.find((candidate) => (candidate.hidesFirst ? candidate.start : candidate.start + 1) <= line && line <= candidate.end);
      if (!fold) {
        return selection;
      }
      held.add(fold);
      const above = fold.hidesFirst ? fold.start - 1 : fold.start;
      const below = fold.end + 1 < document.lineCount ? fold.end + 1 : undefined;
      const down = previous !== undefined && previous.line < line;
      const target = (down && below !== undefined) || above < 0 ? new vscode.Position(below ?? 0, 0) : document.lineAt(above).range.end;
      return new vscode.Selection(target, target);
    });
    if (held.size > 0) {
      editor.selections = moved;
    }
    const open = folds.filter((fold) => held.has(fold) || isOpen(editor, fold));
    if (open.length > 0) {
      void this.fold(open, true);
    }
  }

  /**
   * shutIn returns the labels of the notes of a document whose text is folded, which the editor keeps up to date.
   * @param document - The document.
   */
  private shutIn(document: vscode.TextDocument): Set<string> {
    const key = document.uri.toString();
    const shut = this.shut.get(key) ?? new Set<string>();
    this.shut.set(key, shut);
    return shut;
  }

  /**
   * fold collapses or expands folds in the active text editor, and takes the new state for the boxes of their notes
   * until the visible ranges of the editor tell it.
   * @param folds - The folds.
   * @param collapse - Whether to collapse them.
   */
  private async fold(folds: readonly Pick<Fold, 'start' | 'notes'>[], collapse: boolean): Promise<void> {
    const document = vscode.window.activeTextEditor?.document;
    if (folds.length === 0 || !document) {
      return;
    }
    const shut = this.shutIn(document);
    folds.forEach((fold) => fold.notes.forEach((note) => (collapse ? shut.add(note.label) : shut.delete(note.label))));
    this.threads.showFolded(document.uri, (note) => shut.has(note.label));
    await vscode.commands.executeCommand(collapse ? 'editor.fold' : 'editor.unfold', { levels: 1, direction: 'down', selectionLines: folds.map((fold) => fold.start) });
  }

  /**
   * repeatCollapse collapses the notes of a document again after VS Code read its folds, while its first collapse
   * repeats: the document did not change since, and the time of the repetition did not end. VS Code takes the folds of
   * all providers before it runs the fold command, so the command acts on the folds of this reading.
   * @param document - The document whose folds VS Code reads.
   */
  private repeatCollapse(document: vscode.TextDocument): void {
    const key = document.uri.toString();
    const pending = this.pending.get(key);
    if (!pending) {
      return;
    }
    if (pending.version !== document.version || Date.now() > pending.until) {
      this.pending.delete(key);
      return;
    }
    setTimeout(() => {
      if (this.pending.has(key) && vscode.window.activeTextEditor?.document === document) {
        void this.fold(this.foldsIn(document), true);
      }
    }, 0);
  }

  /**
   * collapseOnce collapses the notes of the document of the active editor the first time it is there, when the setting
   * collapseInEditor or keepNotesCollapsed is on. A note that the user adds later stays open, except with
   * keepNotesCollapsed.
   * @param editor - The active text editor, or undefined.
   */
  private collapseOnce(editor: vscode.TextEditor | undefined): void {
    if (!editor || !isNoteDocument(editor.document)) {
      return;
    }
    const key = editor.document.uri.toString();
    if (this.collapsed.has(key)) {
      return;
    }
    this.collapsed.add(key);
    const settings = this.settingsOf(editor.document.uri);
    if (settings.collapseInEditor || settings.keepNotesCollapsed) {
      this.pending.set(key, { version: editor.document.version, until: Date.now() + settleTime });
      void this.fold(this.foldsIn(editor.document), true);
    }
  }

  /**
   * foldNote hides or shows the text of the note of a box, or of the note at the cursor of the active editor: the note
   * that holds the cursor, or else the note whose selection holds it. Notes with only blank lines between them share
   * one fold. After it shows the text, the editor scrolls to the note when it is outside the visible lines.
   * @param thread - The thread of the box, or undefined.
   * @param collapse - Whether to hide the text.
   */
  private async foldNote(thread: vscode.CommentThread | undefined, collapse: boolean): Promise<void> {
    const uri = thread?.uri ?? vscode.window.activeTextEditor?.document.uri;
    const document = uri && vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === uri.toString());
    if (!document || (!collapse && this.settingsOf(document.uri).keepNotesCollapsed)) {
      return;
    }
    const cursor = vscode.window.activeTextEditor?.selection.active;
    const note = thread ? this.threads.noteOfThread(thread) : cursor && noteAt(this.notesIn(document), cursor);
    const fold = note && foldOf(this.foldsIn(document), note);
    if (!fold) {
      return;
    }
    const editor = vscode.window.activeTextEditor?.document === document ? vscode.window.activeTextEditor : await vscode.window.showTextDocument(document);
    await this.fold([fold], collapse);
    if (!collapse) {
      editor.revealRange(rangeOf(note), vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }
  }

  /**
   * foldAll collapses or expands every note of the active editor; with the setting keepNotesCollapsed it expands none.
   * @param collapse - Whether to collapse the notes.
   */
  private async foldAll(collapse: boolean): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor && (collapse || !this.settingsOf(editor.document.uri).keepNotesCollapsed)) {
      await this.fold(this.foldsIn(editor.document), collapse);
    }
  }

  /** dispose removes the decorations. */
  dispose(): void {
    for (const decoration of [this.dimmed, this.hidden, this.edges, this.headers, ...this.highlights, ...this.strong, ...this.markers]) {
      decoration.dispose();
    }
  }
}
