// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The state of the side view "Notes" ([src/notesView.ts](notesView.ts)): the content that its script shows, with the
 * rendered answers of the notes and the standard footnotes, and the text that a new note highlights.
 */

import * as vscode from 'vscode';
import { hiddenText } from './format/format';
import { colorIndexOf, colorNames, colorOf, noteColors } from './notes/colors';
import { placeFor } from './notes/edits';
import type { Footnote } from './notes/footnotes';
import { authorDate, displayDate } from './notes/syntax';
import { linesOf, type NoteStore } from './noteStore';
import { type AnswerState, footnoteId, type State, type ThreadState } from './notesViewProtocol';

/** cacheSize is the number of rendered texts that the view keeps. */
const cacheSize = 200;

/** titleLength is the number of characters of the highlighted text in the title of the editor of a new note. */
const titleLength = 60;

/**
 * keyOfFootnote returns the place of a standard footnote in the order of the file: its first reference, else its
 * definition.
 * @param footnote - The footnote.
 */
const keyOfFootnote = (footnote: Footnote): { line: number; character: number } => footnote.references[0]?.start ?? { line: footnote.definition.first, character: 0 };

/**
 * isAfter tells whether a position comes after another one.
 * @param a - The position.
 * @param b - The other position.
 */
const isAfter = (a: { line: number; character: number }, b: { line: number; character: number }): boolean => a.line > b.line || (a.line === b.line && a.character > b.character);

/** footnoteColor is the color of the threads of the footnotes, which have no color of a note. */
const footnoteColor = 'var(--vscode-descriptionForeground)';

/**
 * escapeHtml escapes the characters of a text that HTML reads as markup.
 * @param text - The text.
 */
const escapeHtml = (text: string): string => text.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);

/** RenderCache renders Markdown texts as the Markdown preview does, and keeps the HTML of the last ones. */
export class RenderCache {
  /** rendered holds the HTML of rendered texts, by the text. */
  private readonly rendered = new Map<string, string>();

  /**
   * @param render - Renders a Markdown text as the Markdown preview does.
   */
  constructor(private readonly render: (text: string) => Promise<string>) {}

  /**
   * html renders a Markdown text, once for each text. A text that the preview cannot render shows as it is.
   * @param text - The Markdown text.
   */
  async html(text: string): Promise<string> {
    let html = this.rendered.get(text);
    if (html === undefined) {
      html = await this.render(text).catch(() => `<pre>${escapeHtml(text)}</pre>`);
      if (this.rendered.size >= cacheSize) {
        this.rendered.clear();
      }
      this.rendered.set(text, html);
    }
    return html;
  }
}

/**
 * highlightText returns the text that a new note highlights for the selection of the text editor of a document: the text
 * from its start marker to its reference, without the markers and references of other notes, on one line and
 * shortened; or undefined when the selection holds no text that a note can highlight.
 * @param store - The store of the notes, which reads the blocks of the text.
 * @param document - The URI of the document.
 * @param range - The selection of the text editor of the document, or undefined.
 */
export function highlightText(store: NoteStore, document: vscode.Uri, range: vscode.Range | undefined): string | undefined {
  const open = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === document.toString());
  if (!range || range.isEmpty || !open) {
    return undefined;
  }
  const lines = linesOf(open);
  const place = placeFor(lines, range, store.textReadingOf(open));
  if (!place) {
    return undefined;
  }
  const text = open
    .getText(new vscode.Range(place.marker.line, place.marker.character, place.reference.line, place.reference.character))
    .replace(hiddenText, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > titleLength ? `${text.slice(0, titleLength - 1).trimEnd()}…` : text;
}

/**
 * StateSource is what the view knows for its state. The functions read the view when the state needs the value, after
 * the answers are rendered, so that the state holds the newest cursor, selection and account.
 */
export interface StateSource {
  /** store is the store of the notes. */
  store: NoteStore;
  /** document is the Markdown document that the view shows, or undefined. */
  document: vscode.Uri | undefined;
  /** showFootnotes tells whether the view shows the standard footnotes of the document. */
  showFootnotes: () => boolean;
  /** toClean returns the place of the clean editing view for a place of the file, or undefined when the view follows the file. */
  toClean: (position: vscode.Position) => vscode.Position | undefined;
  /** render renders a Markdown text as the Markdown preview does. */
  render: (text: string) => Promise<string>;
  /** line returns the line of the cursor of the text editor. */
  line: () => number | undefined;
  /** highlight returns the text that a new note highlights. */
  highlight: () => string | undefined;
  /** footnotePlace returns the place of the reference of a new footnote while its editor is open, else nothing. */
  footnotePlace: () => Pick<State, 'footnotePlace'>;
  /** account returns the GitHub login of the user. */
  account: () => Promise<string | undefined>;
  /** selected returns the identifier of the selected thread. */
  selected: () => string | undefined;
}

/**
 * stateOf returns the content of the view: the threads of the notes of the document, each with its rendered answers,
 * and the standard footnotes, each at the place of its first reference.
 * @param source - What the view knows.
 */
export async function stateOf(source: StateSource): Promise<State> {
  const { store, document } = source;
  const entries = document ? store.entriesOf(document) : [];
  /**
   * lineOf returns the line that the view names for a note: the line of its definition in the text editor, and the
   * line of the start of its highlight in the clean editing view, which shows no definition.
   * @param note - The note.
   */
  const lineOf = (note: (typeof entries)[number]['note']): number => {
    const place = note.selection?.start ?? note.start;
    const clean = source.toClean(new vscode.Position(place.line, place.character));
    return clean?.line ?? note.start.line;
  };
  const notes = await Promise.all(
    entries.map(async ({ id, note, text }) => ({
      id,
      line: lineOf(note),
      color: colorOf(note),
      colorName: colorNames[colorIndexOf(note)],
      text,
      ...(note.answers[0]?.todo ? { todo: note.answers[0].todo } : {}),
      answers: await Promise.all(
        note.answers.map(
          async (answer): Promise<AnswerState> => ({
            author: answer.author,
            date: displayDate(answer.date),
            authorDate: authorDate(answer.date),
            written: answer.date,
            body: answer.body,
            html: await source.render(answer.body),
            depth: answer.depth,
            parent: answer.parent,
          }),
        ),
      ),
    })),
  );
  const threads: ThreadState[] = [...notes];
  const footnotes = document && source.showFootnotes() ? store.footnotesOf(document) : [];
  for (const footnote of footnotes) {
    // Each footnote stands at the place of its first reference, before the first note whose highlight starts later.
    const place = keyOfFootnote(footnote);
    const clean = source.toClean(new vscode.Position(place.line, place.character));
    const index = entries.findIndex((entry) => isAfter(entry.note.selection?.start ?? entry.note.start, place));
    const thread: ThreadState = {
      id: footnoteId(footnote.label),
      line: clean?.line ?? place.line,
      color: footnoteColor,
      colorName: '',
      text: footnote.text,
      answers: [],
      footnote: { label: footnote.label, html: await source.render(footnote.text), github: footnote.github, preview: footnote.preview },
    };
    const at = index < 0 ? threads.length : threads.findIndex((candidate) => candidate.id === entries[index].id);
    threads.splice(at, 0, thread);
  }
  return {
    type: 'state',
    file: document?.path.split('/').pop(),
    line: source.line(),
    highlight: source.highlight(),
    ...source.footnotePlace(),
    account: await source.account(),
    selected: threads.some((thread) => thread.id === source.selected()) ? source.selected() : undefined,
    threads,
    colors: colorNames.map((name, index) => ({ name, color: noteColors[index] })),
  };
}
