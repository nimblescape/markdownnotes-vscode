// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The overlay of the notes in the text editor: decorations and folding over
 * the text editor of VS Code, which stays as it is
 * ([R-GEN-007](../docs/requirements.md#r-gen-007)). The text editor never
 * shows the notes and their markers (Hannes, 2026-10-28: "in the text view we
 * never show the notes and the markers"); the side view shows them
 * ([src/notesView.ts](notesView.ts)).
 *
 * - **Collapsed notes** ([R-TEXT-005](../docs/requirements.md#r-text-005)): the
 *   extension gives VS Code a folding range for each note
 *   ([src/notes/folds.ts](notes/folds.ts)), so that a collapsed note vanishes
 *   into the line before it. It collapses the notes of a file the first time
 *   the file is in the active editor, collapses again a note that VS Code
 *   opens, for example after a click on its fold arrow, and keeps the cursor
 *   out of the lines of a collapsed note.
 * - **Highlights** ([R-NOTE-006](../docs/requirements.md#r-note-006)): while
 *   the setting `showHighlights` is on, also while the side view is closed,
 *   the text from the start marker to the reference of each note, its
 *   highlight, has a background in the color of the note with a line below
 *   it, so that it stands out of the text (Hannes, 2026-10-28: "when viewed
 *   make it good contrast"; 2026-10-29: "it shall not open the side view but
 *   only show the highlights"). The
 *   highlight of the selected note of the side view is strong with a frame in
 *   its color, also while the others are hidden, and the highlights of the
 *   other notes are dimmed. A hidden highlight shows while the pointer rests
 *   on its text (Hannes, 2026-10-28: "even when the highlights are hidden,
 *   hover over a highlight always shows the highlight"): VS Code asks the
 *   hover providers for the place of the pointer, so the extension learns it
 *   there, and shows no hover. VS Code tells no event when the pointer leaves
 *   the text, so the highlight stays until the pointer rests on other text,
 *   the cursor moves, or the side view opens. The start marker
 *   `<wbr><!--[note-7k2q-->` and the reference `[^note-7k2q]` vanish, also on the
 *   line of the cursor: the cursor steps over a marker as over one place, and
 *   Backspace and Delete next to a marker delete the character on the other
 *   side of it ([src/notes/cursor.ts](notes/cursor.ts)), so that no key
 *   changes a marker. The overview ruler shows a mark in the color of each
 *   highlight.
 * - **Headers** ([R-TEXT-007](../docs/requirements.md#r-text-007)): when a
 *   fold starts on the first line of a note, which then stays, the header on
 *   this line shows rendered, with the author and the date in the local time
 *   of the reader, for example `hannes · 2026-10-28 10:15`, and the date in
 *   the local time of the author as its hover. The cursor does not stay on a
 *   header line, and Backspace and Delete next to it change nothing, so that
 *   no key changes a header.
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
import { colorIndexOf, noteColors } from './notes/colors';
import { type Fold, foldsOf, headersOf } from './notes/folds';
import { deletion, locksLine, offLines, outside, type Side, type Span, spansOf } from './notes/cursor';
import { type Note, type Position, same } from './notes/notes';
import { authorDate } from './notes/syntax';
import { isNoteDocument, type NoteThreads } from './noteThreads';
import type { SelectedNotes } from './selectedNotes';

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

/** dimAlpha is the alpha, as two hexadecimal digits, of the color of the mark of a dimmed highlight in the overview ruler. */
const dimAlpha = '59';

/**
 * highlightStyles returns the styles of the highlight of a note in a color: `shown` with a clear background and a line
 * below, `faint` dimmed while another note is selected, and `strong` with a frame for the selected note. The text
 * editor and the clean editing view show the same styles.
 * @param color - The color of the note.
 */
export const highlightStyles = (color: string): Record<'shown' | 'faint' | 'strong', vscode.DecorationRenderOptions> => ({
  shown: {
    textDecoration: `underline 2px ${color}; text-underline-offset: 3px; background-color: ${color}47;`,
    overviewRulerColor: color,
    overviewRulerLane: vscode.OverviewRulerLane.Center,
  },
  faint: {
    textDecoration: `underline 1px ${color}${dimAlpha}; text-underline-offset: 3px; background-color: ${color}1f;`,
    overviewRulerColor: `${color}${dimAlpha}`,
    overviewRulerLane: vscode.OverviewRulerLane.Center,
  },
  strong: {
    textDecoration: `none; background-color: ${color}73; outline: 1px solid ${color}; border-radius: 3px;`,
    overviewRulerColor: color,
    overviewRulerLane: vscode.OverviewRulerLane.Full,
  },
});

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
 * positionOf returns the position of VS Code of a position of a note.
 * @param position - The position.
 */
const positionOf = (position: Position): vscode.Position => new vscode.Position(position.line, position.character);

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
  /** hidden hides the start markers and the references, and the first line of a collapsed fold that is the first line of a note. */
  private readonly hidden = vscode.window.createTextEditorDecorationType({ textDecoration: 'none; display: none;' });
  /**
   * highlights holds the decoration of the highlights of each color of a note: a clear background with a line below.
   * The highlights are styles of the text itself, not backgrounds behind it: VS Code takes the places of the backgrounds
   * of a line from the number of its characters, which counts the hidden markers, so that a background after a hidden
   * marker stands too far to the right, or does not show; a style of the text stays on the text (measured in VS Code
   * 1.143).
   */
  private readonly highlights = noteColors.map((color) => vscode.window.createTextEditorDecorationType(highlightStyles(color).shown));
  /** faint holds the decoration of the highlights of each color of the other notes while a note is selected: dimmed. */
  private readonly faint = noteColors.map((color) => vscode.window.createTextEditorDecorationType(highlightStyles(color).faint));
  /** strong holds the decoration of the highlight of the selected note of each color: a strong highlight with a frame. */
  private readonly strong = noteColors.map((color) => vscode.window.createTextEditorDecorationType(highlightStyles(color).strong));
  /** headers shows the rendered header of an answer in place of its header line. */
  private readonly headers = vscode.window.createTextEditorDecorationType({});
  /** collapsed holds the documents whose notes the extension collapsed once while a text editor shows them, by their URIs. */
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
  /** pointed is the note whose hidden highlight is under the pointer: the URI of its document and its label. */
  private pointed: { document: string; label: string } | undefined;

  /**
   * @param threads - The threads of the notes, which read the notes of each document and tell their changes.
   * @param showsHighlights - Tells whether the highlights of a document show: the setting showHighlights is on.
   * @param selected - The selected note of each document, whose highlight has the strong color.
   */
  constructor(
    private readonly threads: NoteThreads,
    private readonly showsHighlights: (document: vscode.Uri) => boolean,
    private readonly selected: SelectedNotes,
  ) {}

  /** register registers the folding, the commands of the keys and the listeners, and decorates the visible editors. */
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
      vscode.languages.registerHoverProvider('markdown', {
        provideHover: (document, position) => {
          this.point(document, position);
          return undefined;
        },
      }),
      vscode.commands.registerCommand(deleteCommands.left, () => this.deleteNext('left', false)),
      vscode.commands.registerCommand(deleteCommands.right, () => this.deleteNext('right', false)),
      vscode.commands.registerCommand(deleteCommands.wordLeft, () => this.deleteNext('left', true)),
      vscode.commands.registerCommand(deleteCommands.wordRight, () => this.deleteNext('right', true)),
      vscode.window.onDidChangeVisibleTextEditors((editors) => {
        // A file that no text editor shows collapses again in its next text editor, for example in "Open File with
        // Markup" after its clean editing view (R-TEXT-009).
        for (const key of this.collapsed) {
          if (!editors.some((editor) => editor.document.uri.toString() === key)) {
            this.collapsed.delete(key);
          }
        }
        editors.forEach((editor) => this.decorate(editor));
      }),
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        this.collapseOnce(editor);
        this.markContext(editor);
      }),
      vscode.window.onDidChangeTextEditorSelection((event) => {
        this.stepOver(event.textEditor);
        this.pointAt(undefined);
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

  /** showsChanged decorates the visible editors again after the highlights showed or vanished. */
  showsChanged(): void {
    this.pointed = undefined;
    vscode.window.visibleTextEditors.forEach((editor) => this.decorate(editor));
  }

  /**
   * point learns the place of the pointer in a document from a request for a hover: on the text of a hidden highlight,
   * the highlight shows, of the note whose highlight starts last.
   * @param document - The document.
   * @param position - The position of the pointer.
   */
  private point(document: vscode.TextDocument, position: vscode.Position): void {
    if (this.showsHighlights(document.uri)) {
      this.pointAt(undefined);
      return;
    }
    const note = this.notesIn(document)
      .filter((candidate) => candidate.selection && !same(candidate.selection.start, candidate.selection.end))
      .filter(({ selection }) => !positionOf(selection!.start).isAfter(position) && positionOf(selection!.end).isAfter(position))
      .sort((a, b) => positionOf(a.selection!.start).compareTo(positionOf(b.selection!.start)))
      .at(-1);
    this.pointAt(note && { document: document.uri.toString(), label: note.label });
  }

  /**
   * pointAt makes a note the note under the pointer, and decorates the editors of the documents of the old and the new
   * one.
   * @param pointed - The URI of the document and the label of the note, or undefined.
   */
  private pointAt(pointed: { document: string; label: string } | undefined): void {
    const before = this.pointed;
    if (before?.document === pointed?.document && before?.label === pointed?.label) {
      return;
    }
    this.pointed = pointed;
    for (const changed of new Set([before?.document, pointed?.document])) {
      if (changed !== undefined) {
        this.decorateAll(vscode.Uri.parse(changed));
      }
    }
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
   * spansIn returns the places of the hidden markers of the highlights of the notes of a document.
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
   * decorate gives a text editor the highlights of its notes, the hidden markers, and the hidden first lines and the
   * rendered headers of its collapsed notes.
   * @param editor - The text editor.
   */
  private decorate(editor: vscode.TextEditor): void {
    const document = editor.document;
    const notes = this.notesIn(document);
    const lines = linesOf(document);
    const folds = foldsOf(lines, notes);
    const cursor = editor.selection.active;
    const collapsed = new Set(folds.filter((fold) => isCollapsed(editor, fold)));
    const shut = this.shutIn(document);
    for (const fold of folds) {
      const known = collapsed.has(fold) ? true : isOpen(editor, fold) ? false : undefined;
      if (known !== undefined) {
        fold.notes.forEach((note) => (known ? shut.add(note.label) : shut.delete(note.label)));
      }
    }
    // While a note is selected, the other notes are dimmed (Hannes, 2026-10-28: "other notes shall be dimmed when one
    // note is selected").
    const label = this.selected.labelOf(document.uri);
    const selectedLabel = notes.some((note) => note.label === label) ? label : undefined;
    const dims = (note: Note): boolean => selectedLabel !== undefined && note.label !== selectedLabel;
    const shows = this.showsHighlights(document.uri);
    const pointed = this.pointed?.document === document.uri.toString() ? this.pointed.label : undefined;
    const highlighted = this.highlights.map((): vscode.Range[] => []);
    const faint = this.faint.map((): vscode.Range[] => []);
    const strong = this.strong.map((): vscode.Range[] => []);
    const hidden = [...collapsed].filter((fold) => fold.hidesFirst && cursor.line !== fold.start).map((fold) => document.lineAt(fold.start).range);
    for (const note of notes) {
      const selection = note.selection;
      if (!selection) {
        continue;
      }
      const range = new vscode.Range(positionOf(selection.start), positionOf(selection.end));
      const color = colorIndexOf(note);
      if (range.isEmpty) {
        // A note that highlights no text shows nothing.
      } else if (note.label === selectedLabel) {
        strong[color].push(range);
      } else if (note.label === pointed || (shows && !dims(note))) {
        highlighted[color].push(range);
      } else if (shows) {
        faint[color].push(range);
      }
      for (const marker of selection.markers) {
        hidden.push(new vscode.Range(positionOf(marker.start), positionOf(marker.end)));
      }
    }
    this.highlights.forEach((highlight, index) => editor.setDecorations(highlight, highlighted[index]));
    this.faint.forEach((highlight, index) => editor.setDecorations(highlight, faint[index]));
    this.strong.forEach((highlight, index) => editor.setDecorations(highlight, strong[index]));
    const headers: vscode.DecorationOptions[] = [];
    // VS Code shows the text before a hidden line at the end of the first line of its fold, so the headers in a closed
    // fold get no text.
    const closed = folds.filter((fold) => collapsed.has(fold) || (!isOpen(editor, fold) && fold.notes.length > 0 && fold.notes.every((note) => shut.has(note.label))));
    for (const header of headersOf(lines, notes)) {
      if (closed.some((fold) => fold.start < header.line && header.line <= fold.end)) {
        continue;
      }
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
   * keepLater collapses the open notes of a document in the active editor again after keepTime: VS Code read the folds
   * of this version of the document, so the fold command acts on them.
   * @param document - The document whose folds VS Code reads.
   */
  private keepLater(document: vscode.TextDocument): void {
    const key = document.uri.toString();
    this.read.set(key, document.version);
    setTimeout(() => {
      const editor = vscode.window.activeTextEditor;
      if (editor?.document === document && !document.isClosed) {
        this.keepShut(editor, this.foldsIn(document));
      }
    }, keepTime);
  }

  /**
   * keepShut collapses the notes that VS Code shows open in the active editor, and moves a cursor in the lines of such a
   * note out of them, because VS Code opens a fold that holds the cursor. The editor acts only on a version of the
   * document whose folds VS Code read.
   * @param editor - The active text editor.
   * @param folds - The folds of its document.
   */
  private keepShut(editor: vscode.TextEditor, folds: readonly Fold[]): void {
    const document = editor.document;
    if (this.read.get(document.uri.toString()) !== document.version) {
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
   * fold collapses or expands folds in the active text editor, and takes the new state of their notes until the visible
   * ranges of the editor tell it. A fold command names lines, so it waits until VS Code applied the edits of the
   * extension, for example the comment of the format that an opened file gets, and takes the lines of the folds from the
   * document then: with the lines of before, the command would fold other lines, such as the section of a heading.
   * @param folds - The folds: the folds of their notes, and the fold of the comment of the format.
   * @param collapse - Whether to collapse them.
   */
  private async fold(folds: readonly Pick<Fold, 'start' | 'notes'>[], collapse: boolean): Promise<void> {
    const document = vscode.window.activeTextEditor?.document;
    if (folds.length === 0 || !document) {
      return;
    }
    await this.threads.settled(document);
    if (vscode.window.activeTextEditor?.document !== document) {
      return;
    }
    const labels = new Set(folds.flatMap((fold) => fold.notes.map((note) => note.label)));
    const comment = folds.some((fold) => fold.notes.length === 0);
    const current = this.foldsIn(document).filter((fold) => (fold.notes.length === 0 ? comment : fold.notes.some((note) => labels.has(note.label))));
    if (current.length === 0) {
      return;
    }
    const shut = this.shutIn(document);
    current.forEach((fold) => fold.notes.forEach((note) => (collapse ? shut.add(note.label) : shut.delete(note.label))));
    await vscode.commands.executeCommand(collapse ? 'editor.fold' : 'editor.unfold', { levels: 1, direction: 'down', selectionLines: current.map((fold) => fold.start) });
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
   * collapseOnce collapses the notes of the document of the active editor the first time it is there, and again after
   * no text editor showed it; keepShut collapses a note that the user adds later.
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
    this.pending.set(key, { version: editor.document.version, until: Date.now() + settleTime });
    void this.fold(this.foldsIn(editor.document), true);
  }

  /** dispose removes the decorations. */
  dispose(): void {
    for (const decoration of [this.hidden, this.headers, ...this.highlights, ...this.faint, ...this.strong]) {
      decoration.dispose();
    }
  }
}
