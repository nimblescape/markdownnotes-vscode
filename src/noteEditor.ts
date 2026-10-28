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
 *   on, and has the commands "Collapse Note", "Collapse All Notes" and "Expand
 *   All Notes".
 * - **Markers** ([R-TEXT-006](../docs/requirements.md#r-text-006)): each note
 *   has a marker in the left margin with its number, in its color: at its
 *   first line, or at the line that stays of its fold while it is collapsed.
 *   A note with a selection has it at the first line of the selection, and
 *   while it is open also at its first line. The overview ruler shows a mark
 *   in the same color.
 * - **Selections** ([R-NOTE-006](../docs/requirements.md#r-note-006)): the
 *   selection of a note has a highlight in the color of the note. Its markers
 *   `<!--[a1-->` and `<!--a1]-->` vanish: a thin bar in the color of the note
 *   stands at the start and at the end of the selection, and a dot at a point
 *   `<!--[a1]-->`. On the line of the cursor the markers show as they are,
 *   dimmed, so that the cursor never moves through hidden text.
 * - **Headers** ([R-TEXT-007](../docs/requirements.md#r-text-007)): the front
 *   matter of each answer has a fold of its own, which the extension collapses
 *   when it first sees it in the active editor. A collapsed front matter
 *   shows as one rendered line with the author and the date, for example
 *   `hannes · 2026-10-28 10:15`; on the line of the cursor it shows as it is.
 *
 * VS Code tells an extension which lines are folded only by the visible
 * ranges of the editor, which end at the first line of a collapsed fold and
 * start again after its last line.
 */

import * as vscode from 'vscode';
import { colorIndexOf, colorOf, noteColors } from './notes/colors';
import { type Fold, foldOf, foldsOf, type Header, headersOf } from './notes/folds';
import type { Marker, Note, Position } from './notes/notes';
import { isNoteDocument, type NoteThreads, rangeOf } from './noteThreads';
import type { Settings } from './settings';

/** editorCommands are the commands of the folds of the notes. */
export const editorCommands = {
  collapseNote: 'nimblescape.markdownNotes.collapseNote',
  collapseAll: 'nimblescape.markdownNotes.collapseAllNotes',
  expandAll: 'nimblescape.markdownNotes.expandAllNotes',
} as const;

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
  /** faint dims the markers of the selections on the line of the cursor. */
  private readonly faint = vscode.window.createTextEditorDecorationType({ opacity: '0.45' });
  /** headers shows the rendered header of a collapsed front matter in place of its first line. */
  private readonly headers = vscode.window.createTextEditorDecorationType({});
  /** markers holds the decoration of the marker of each number of a note. */
  private readonly markers: vscode.TextEditorDecorationType[] = [];
  /** collapsed holds the documents whose notes the extension collapsed once, by their URIs. */
  private readonly collapsed = new Set<string>();
  /** known holds the keys of the front matters that the extension saw in the active editor, by the URIs of their documents. */
  private readonly known = new Map<string, Set<string>>();

  /**
   * @param threads - The threads of the notes, which read the notes of each document and tell their changes.
   * @param settingsOf - Returns the settings of a document.
   */
  constructor(
    private readonly threads: NoteThreads,
    private readonly settingsOf: (document: vscode.Uri) => Settings,
  ) {}

  /** register registers the folding, the commands and the listeners, and decorates the visible editors. */
  register(): vscode.Disposable[] {
    const registrations = [
      vscode.languages.registerFoldingRangeProvider('markdown', {
        provideFoldingRanges: (document) =>
          isNoteDocument(document)
            ? [
                ...this.foldsIn(document).map((fold) => new vscode.FoldingRange(fold.start, fold.end, vscode.FoldingRangeKind.Comment)),
                ...headersOf(this.notesIn(document)).map((header) => new vscode.FoldingRange(header.start, header.end)),
              ]
            : [],
      }),
      vscode.commands.registerCommand(editorCommands.collapseNote, (thread?: vscode.CommentThread) => this.collapseNote(thread)),
      vscode.commands.registerCommand(editorCommands.collapseAll, () => this.foldAll(true)),
      vscode.commands.registerCommand(editorCommands.expandAll, () => this.foldAll(false)),
      vscode.window.onDidChangeVisibleTextEditors((editors) => editors.forEach((editor) => this.decorate(editor))),
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        this.collapseOnce(editor);
        this.foldNewHeaders(editor);
      }),
      vscode.window.onDidChangeTextEditorSelection((event) => this.decorate(event.textEditor)),
      vscode.window.onDidChangeTextEditorVisibleRanges((event) => this.decorate(event.textEditor)),
      vscode.workspace.onDidCloseTextDocument((document) => {
        this.collapsed.delete(document.uri.toString());
        this.known.delete(document.uri.toString());
      }),
      this.threads.onDidChange((document) => {
        for (const editor of vscode.window.visibleTextEditors) {
          if (editor.document.uri.toString() === document.toString()) {
            this.decorate(editor);
          }
        }
        const active = vscode.window.activeTextEditor;
        if (active?.document.uri.toString() === document.toString()) {
          this.foldNewHeaders(active);
        }
      }),
    ];
    vscode.window.visibleTextEditors.forEach((editor) => this.decorate(editor));
    this.collapseOnce(vscode.window.activeTextEditor);
    this.foldNewHeaders(vscode.window.activeTextEditor);
    return registrations;
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
    const folds = foldsOf(linesOf(document), notes);
    const cursor = editor.selection.active;
    const current = notes.find((note) => contains(note, cursor));
    const end = document.lineAt(Math.max(document.lineCount - 1, 0)).range.end;
    const outside = current ? [new vscode.Range(new vscode.Position(0, 0), rangeOf(current).start), new vscode.Range(rangeOf(current).end, end)] : notes.map(rangeOf);
    editor.setDecorations(this.dimmed, outside);
    const collapsed = new Set(folds.filter((fold) => isCollapsed(editor, fold)));
    // A note with a selection has its marker at the first line of the selection, and while it is open also at its
    // own first line. Notes of one line share it, as the notes of one collapsed fold, and the first of them shows its
    // marker there.
    const taken = new Set<number>();
    const lines = notes.map((note) => {
      const fold = foldOf(folds, note);
      const shut = fold !== undefined && collapsed.has(fold);
      const own = note.selection ? [note.selection.start.line, shut ? undefined : note.start.line] : [shut ? fold.start : note.start.line];
      const free = [...new Set(own)].filter((line): line is number => line !== undefined && !taken.has(line));
      free.forEach((line) => taken.add(line));
      return free;
    });
    for (let number = 1; number <= Math.max(notes.length, this.markers.length); number++) {
      editor.setDecorations(this.markerOf(number), (lines[number - 1] ?? []).map((line) => new vscode.Range(line, 0, line, 0)));
    }
    const highlighted = this.highlights.map((): vscode.Range[] => []);
    const hidden = [...collapsed].filter((fold) => fold.hidesFirst && cursor.line !== fold.start).map((fold) => document.lineAt(fold.start).range);
    const edges: vscode.DecorationOptions[] = [];
    const faint: vscode.Range[] = [];
    notes.forEach(({ selection }, index) => {
      if (!selection) {
        return;
      }
      const range = new vscode.Range(positionOf(selection.start), positionOf(selection.end));
      if (!range.isEmpty) {
        highlighted[colorIndexOf(index + 1)].push(range);
      }
      for (const marker of selection.markers) {
        const place = new vscode.Range(positionOf(marker.start), positionOf(marker.end));
        if (marker.start.line === cursor.line) {
          faint.push(place);
        } else {
          hidden.push(place);
          edges.push(edgeOf(marker, index + 1));
        }
      }
    });
    this.highlights.forEach((highlight, index) => editor.setDecorations(highlight, highlighted[index]));
    const headers: vscode.DecorationOptions[] = [];
    for (const header of headersOf(notes)) {
      if (header.start !== cursor.line && isCollapsed(editor, header)) {
        const line = document.lineAt(header.start);
        const fence = line.text.indexOf('---');
        hidden.push(new vscode.Range(header.start, fence, header.start, line.text.length));
        headers.push({
          range: new vscode.Range(header.start, fence, header.start, fence),
          renderOptions: { before: { contentText: header.text, color: new vscode.ThemeColor('descriptionForeground'), fontStyle: 'italic' } },
        });
      }
    }
    editor.setDecorations(this.headers, headers);
    editor.setDecorations(this.hidden, hidden);
    editor.setDecorations(this.edges, edges);
    editor.setDecorations(this.faint, faint);
  }

  /**
   * fold collapses or expands folds in the active text editor.
   * @param folds - The folds.
   * @param collapse - Whether to collapse them.
   */
  private async fold(folds: readonly Pick<Fold, 'start'>[], collapse: boolean): Promise<void> {
    if (folds.length > 0) {
      await vscode.commands.executeCommand(collapse ? 'editor.fold' : 'editor.unfold', { levels: 1, direction: 'down', selectionLines: folds.map((fold) => fold.start) });
    }
  }

  /**
   * collapseOnce collapses the notes of the document of the active editor the first time it is there, when the setting
   * collapseInEditor is on. A note that the user adds later stays open.
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
    if (this.settingsOf(editor.document.uri).collapseInEditor) {
      void this.fold(this.foldsIn(editor.document), true);
    }
  }

  /**
   * foldNewHeaders collapses the front matters of the active editor that the extension has not seen there before,
   * except the one with the cursor, so that the user can edit a front matter that is open. It also collapses them when
   * the setting collapseInEditor is off, because a front matter shows as its rendered header.
   * @param editor - The active text editor, or undefined.
   */
  private foldNewHeaders(editor: vscode.TextEditor | undefined): void {
    if (!editor || editor !== vscode.window.activeTextEditor || !isNoteDocument(editor.document)) {
      return;
    }
    const key = editor.document.uri.toString();
    const known = this.known.get(key) ?? new Set<string>();
    const headers: Header[] = headersOf(this.notesIn(editor.document));
    const cursor = editor.selection.active.line;
    const fresh = headers.filter((header) => !known.has(header.key) && (cursor < header.start || cursor > header.end));
    this.known.set(key, new Set(headers.map((header) => header.key)));
    void this.fold(fresh, true);
  }

  /**
   * collapseNote collapses the note of a box, or the note at the cursor of the active editor.
   * @param thread - The thread of the box, or undefined.
   */
  private async collapseNote(thread: vscode.CommentThread | undefined): Promise<void> {
    const uri = thread?.uri ?? vscode.window.activeTextEditor?.document.uri;
    const document = uri && vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === uri.toString());
    if (!document) {
      return;
    }
    const position = thread?.range?.start ?? vscode.window.activeTextEditor?.selection.active;
    const note = position && this.notesIn(document).find((candidate) => contains(candidate, position));
    const fold = note && foldOf(this.foldsIn(document), note);
    if (!fold) {
      return;
    }
    if (vscode.window.activeTextEditor?.document !== document) {
      await vscode.window.showTextDocument(document);
    }
    await this.fold([fold], true);
  }

  /**
   * foldAll collapses or expands every note of the active editor.
   * @param collapse - Whether to collapse the notes.
   */
  private async foldAll(collapse: boolean): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      await this.fold(this.foldsIn(editor.document), collapse);
    }
  }

  /** dispose removes the decorations. */
  dispose(): void {
    for (const decoration of [this.dimmed, this.hidden, this.edges, this.faint, this.headers, ...this.highlights, ...this.markers]) {
      decoration.dispose();
    }
  }
}
