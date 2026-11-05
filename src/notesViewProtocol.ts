// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The protocol of the side view "Notes" ([src/notesView.ts](notesView.ts)): its identifier and commands, the messages
 * that its script ([media/notesView.js](../media/notesView.js)) sends, the state that the extension sends to the
 * script, and the identifiers of the threads of the standard footnotes.
 */

import type { TodoState } from './notes/syntax';
import type { AnswerRef } from './noteStore';

/** notesViewId is the identifier of the side view, which the manifest contributes. */
export const notesViewId = 'nimblescape.markdownNotes.notes';

/**
 * viewCommands are the commands of the side view: the buttons "Add Note", "Add Footnote"
 * ([R-FOOT-003](../docs/requirements.md#r-foot-003)) and "Hide Notes" in its title
 * ([R-SIDE-003](../docs/requirements.md#r-side-003)), "Show or Hide Notes" of the title of the Markdown editors and
 * of the Command Palette ([R-SIDE-006](../docs/requirements.md#r-side-006)), and the eye in its title with the commands
 * "Hide Notes from Other Viewers" and "Show Notes in Other Viewers" of the Command Palette
 * ([R-HIDE-002](../docs/requirements.md#r-hide-002)): the eye has a command for each state, whose title is the tooltip
 * that says the state and what a click does. "Add Definition" opens the editor of a new definition for the label of a
 * reference without a definition, for its quick fix ([R-FOOT-004](../docs/requirements.md#r-foot-004)); it takes the URI
 * of the file and the label, so the Command Palette does not show it.
 */
export const viewCommands = {
  newNote: 'nimblescape.markdownNotes.newNote',
  newFootnote: 'nimblescape.markdownNotes.addFootnote',
  addDefinition: 'nimblescape.markdownNotes.addFootnoteDefinition',
  hide: 'nimblescape.markdownNotes.hideNotes',
  toggle: 'nimblescape.markdownNotes.toggleNotes',
  hideFromViewers: 'nimblescape.markdownNotes.hideNotesFromViewers',
  showInViewers: 'nimblescape.markdownNotes.showNotesInViewers',
  eyeShown: 'nimblescape.markdownNotes.notesShownToViewers',
  eyeHidden: 'nimblescape.markdownNotes.notesHiddenFromViewers',
};

/**
 * formContext is the context key that tells the menus the form of the notes of the document of the side view
 * ([R-HIDE-002](../docs/requirements.md#r-hide-002)): `visible`, `hidden`, or empty for a document without notes, for
 * which the eye does not show.
 */
export const formContext = 'nimblescape.markdownNotes.notesForm';

/** Message is a message of the script of the view. */
export type Message =
  | { type: 'ready' }
  | { type: 'signIn' }
  | { type: 'reveal'; id: string; focus?: boolean }
  | { type: 'deselect' }
  | { type: 'save'; request: number; id: string; answer: AnswerRef; text: string }
  | { type: 'answer'; request: number; id: string; text: string; parent?: AnswerRef }
  | { type: 'add'; request: number; text: string; color?: string; todo?: boolean }
  | { type: 'todo'; id: string; done: boolean }
  | { type: 'deleteAnswer'; id: string; answer: AnswerRef }
  | { type: 'deleteNote'; id: string }
  | { type: 'makeFootnote'; id: string }
  | { type: 'color'; id: string; color: string | undefined }
  | { type: 'saveText'; request: number; id: string; text: string; original: string }
  | { type: 'render'; request: number; text: string }
  | { type: 'openLink'; href: string }
  | { type: 'saveFootnote'; request: number; id: string; text: string; original: string }
  | { type: 'deleteFootnote'; id: string }
  | { type: 'addFootnote'; request: number; text: string; label?: string }
  | { type: 'footnoteClosed' };

/** AnswerState is an answer as the view shows it. */
export interface AnswerState {
  author: string;
  /**
   * date is the date in the local time of the reader, and authorDate the date in the local time of the author; written
   * is the date as the file holds it, which names the answer in a message of a change, with its author and its index.
   */
  date: string;
  authorDate: string;
  written: string;
  body: string;
  html: string;
  /** depth is 0 for the first answer, 1 for a reply to it, and so on; parent is the index of the answer that it replies to. */
  depth: number;
  parent: number | undefined;
}

/** ThreadState is a thread as the view shows it. */
export interface ThreadState {
  id: string;
  line: number;
  /** color is the color of the note ([R-TEXT-006](../docs/requirements.md#r-text-006)), and colorName its name. */
  color: string;
  colorName: string;
  /** text is the whole text of the note, for its text view. */
  text: string;
  /** todo is the state of a todo note ([R-NOTE-008](../docs/requirements.md#r-note-008)), or undefined for another note. */
  todo?: TodoState;
  answers: AnswerState[];
  /**
   * footnote is the label and the rendered text of a standard footnote ([R-FOOT-001](../docs/requirements.md#r-foot-001)),
   * with the numbers of GitHub and of the Markdown preview, which have no number for a footnote without a reference;
   * undefined for a note. A footnote has no answers, and its text is the text of its definition.
   */
  footnote?: { label: string; html: string; github?: number; preview?: number };
}

/** State is the content of the view, which the script shows. */
export interface State {
  type: 'state';
  /** file is the name of the Markdown file, or undefined when no Markdown file was active. */
  file: string | undefined;
  /** line is the index of the line of the cursor in the text editor. */
  line: number | undefined;
  /**
   * highlight is the text that a new note highlights, the selected text of the text editor, shortened; or undefined
   * when the selection holds no text that a note can highlight.
   */
  highlight: string | undefined;
  /**
   * footnotePlace is the text before the place of the reference of a new footnote at the cursor, shortened, while the
   * editor of a new footnote is open; undefined when no reference can stand at the cursor.
   */
  footnotePlace?: string;
  /** account is the GitHub login of the user, or undefined without a sign-in. */
  account: string | undefined;
  selected: string | undefined;
  threads: ThreadState[];
  /** colors are the colors that "Color" offers, by their names; the first one is the default. */
  colors: { name: string; color: string }[];
}

/** footnotePrefix starts the identifier of the thread of a standard footnote; the threads of the notes have numbers. */
const footnotePrefix = 'footnote-';

/**
 * footnoteId returns the identifier of the thread of a standard footnote, which names its label.
 * @param label - The label of the footnote.
 */
export const footnoteId = (label: string): string => `${footnotePrefix}${encodeURIComponent(label)}`;

/**
 * footnoteLabelOf returns the label of the footnote of a thread, or undefined for the thread of a note.
 * @param id - The identifier of the thread.
 */
export const footnoteLabelOf = (id: string): string | undefined => (id.startsWith(footnotePrefix) ? decodeURIComponent(id.slice(footnotePrefix.length)) : undefined);

/**
 * previewTextMissing is the message for text of the Markdown preview that the view did not find in the file, such as a
 * formula, which the preview shows in another form.
 */
export const previewTextMissing =
  'The note was not added: the selected text of the preview was not found in the Markdown text. Select the text in the text editor, then choose "Add Note" again.';
