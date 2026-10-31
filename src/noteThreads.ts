// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The notes of the open Markdown documents, with the operations that change
 * them: the threads of the side view ([src/notesView.ts](notesView.ts),
 * [R-SIDE-001](../docs/requirements.md#r-side-001)), one for each note, with an
 * identifier that stays while the document is open. "Save" writes a text back
 * into an answer of a note ([R-EDIT-002](../docs/requirements.md#r-edit-002)),
 * "Add Note" adds a new note
 * ([R-EDIT-003](../docs/requirements.md#r-edit-003)), "Answer" and "Reply" add
 * a reply to the note or to an answer
 * ([R-EDIT-005](../docs/requirements.md#r-edit-005)), "Delete" removes an
 * answer or the whole note ([R-EDIT-004](../docs/requirements.md#r-edit-004)),
 * the colors of the side view give a note a color in its start marker, and the
 * text view of the side view saves the whole text of a note. A new note and a
 * new answer name the GitHub login of the user as their author
 * ([R-GEN-006](../docs/requirements.md#r-gen-006)). A text that would change
 * the structure of the note, for example a block quote that starts with a
 * header, is not written, and the side view shows its message. The extension
 * shows no note in the boxes of the comments of VS Code. The decorations and
 * the folds of the notes are the overlay of [src/noteEditor.ts](noteEditor.ts).
 *
 * The extension reads the standard footnotes of a document too, once for each
 * version, for the side view ([R-FOOT-001](../docs/requirements.md#r-foot-001)):
 * "Save" writes the text of a footnote, "Delete" removes it with its
 * references, and "Add Footnote" adds one at the cursor
 * ([R-FOOT-002](../docs/requirements.md#r-foot-002),
 * [R-FOOT-003](../docs/requirements.md#r-foot-003)).
 *
 * The threads follow the text: after each change of a document, and a pause
 * of changeDelay, the extension reads the notes again and keeps the thread of
 * each note whose text stayed the same, so that the side view keeps its
 * selected thread and its open editors. The extension also shows the warnings
 * of the notes ([src/notes/checks.ts](notes/checks.ts),
 * [R-TEXT-008](../docs/requirements.md#r-text-008)).
 */

import * as vscode from 'vscode';
import { sourceOf } from './formatter';
import { appendAnswer, colorNote, deleteAnswer, deleteNote, type Edit, insertNote, type Problem, replaceAnswer, replaceNoteText, type Result, todoNote, withDoctype } from './notes/edits';
import { checksOf, listingChecksOf } from './notes/checks';
import { formatVersion, newerFormat, versionText } from './notes/doctype';
import { deleteFootnote, type Footnote, type FootnoteResult, insertFootnote, readFootnotes, replaceFootnote } from './notes/footnotes';
import { findNotes, type Note, noteAt, type Position, type Reading, read, readNotes } from './notes/notes';
import { formatDate, normalizeBody, type TodoState } from './notes/syntax';

/** changeDelay is the pause, in milliseconds, after the last change of a document before its notes are read again. */
const changeDelay = 300;

/** Entry is the thread of a note of a document. */
interface Entry {
  /** id identifies the thread while the document is open, also after changes of the document. */
  id: string;
  note: Note;
  /** raw is the text of the comment in the document, by which a thread finds its note after a change. */
  raw: string;
  /** expected is the position of the note after an edit of the extension, which the next reading finds there. */
  expected: Position | undefined;
}

/** NoteEntry is a note of a document with the identifier of its thread, for the side view. */
export interface NoteEntry {
  id: string;
  note: Note;
  /** text is the text of the definition of the note in the document, without the prefix of its block quotes and list items. */
  text: string;
}

/**
 * ownText returns the text of the definition of a note without the prefix of its block quotes and list items on its
 * further lines.
 * @param raw - The text of the definition in the document.
 * @param prefix - The prefix of the further lines.
 */
function ownText(raw: string, prefix: string): string {
  return raw
    .split(/\r\n|\r|\n/)
    .map((line, index) => (index === 0 ? line : line.startsWith(prefix) ? line.slice(prefix.length) : line.startsWith(prefix.trimEnd()) ? line.slice(prefix.trimEnd().length) : line))
    .join('\n');
}

/**
 * AnswerRef names an answer of a note as the side view showed it: its index in the tree, and the author, the date and
 * the body as the file holds them. A write to the answer goes ahead only when the note still has this answer at this
 * index, so that a side view that shows an older state never changes another answer (for example a second click on
 * "Delete"), also not an answer of the same author in the same minute.
 */
export interface AnswerRef {
  index: number;
  author: string;
  date: string;
  body: string;
}

/**
 * isAnswer tells whether a note has an answer at the index of a reference, with its author, its date and its body.
 * @param note - The note.
 * @param answer - The reference of the answer.
 */
const isAnswer = (note: Note, answer: AnswerRef): boolean => {
  const found = note.answers[answer.index];
  return found?.author === answer.author && found.date === answer.date && found.body === answer.body;
};

/**
 * problemMessage returns the message of a refused text.
 * @param problem - The problem.
 */
export function problemMessage(problem: Problem): string {
  switch (problem.kind) {
    case 'empty':
      return 'The change was not saved: an answer needs a text. To remove an answer or a note, use "Delete".';
    case 'place':
      return 'The note was not added: a note highlights text of a paragraph, a heading, a list item or a table cell. Select the text there.';
    case 'noText':
      return 'The note was not added: select the text in the text editor that the note is about, then choose "Add Note" again.';
    case 'structure':
      return 'The change was not saved: the text would change the note or the Markdown around it. A block quote whose first line is a header (**login** · date) starts a new answer.';
    case 'text':
      return `The change was not saved: the text must stay this one note. Keep its first line "[^${problem.label}]: **login** · date", indent each further line by four spaces, and add no other note.`;
    case 'signIn':
      return 'The change was not saved: sign in with GitHub, so that the note names its author. The extension asks for the sign-in when you add a note or an answer.';
    case 'missing':
      return 'The change was not saved: the file no longer holds the note.';
    case 'changed':
      return 'The change was not saved: the note changed in the meantime. Look at the note again, and repeat the change if it is still needed.';
    case 'format':
      return `The change was not saved: the file uses version ${versionText(problem.format)} of the format of the notes, and this version of the extension knows only the versions ${formatVersion.major}.x. Update the extension.`;
    case 'footnoteEmpty':
      return 'The footnote was not saved: a footnote needs a text. To remove a footnote, use "Delete".';
    case 'footnotePlace':
      return 'The footnote was not added: its reference cannot stand at the cursor. Put the cursor into the text of a paragraph, a heading, a list item or a table cell, outside code, links and the markers of notes, then choose "Add Footnote" again.';
    case 'footnoteStructure':
      return 'The footnote was not saved: the text would change the footnote or the Markdown around it.';
    case 'footnoteMissing':
      return 'The change was not saved: the file no longer holds the footnote.';
    case 'footnoteChanged':
      return 'The change was not saved: the footnote changed in the meantime. Look at the footnote again, and repeat the change if it is still needed.';
  }
}

/** footnoteProblems are the problems of the changes of a standard footnote, by the problems of footnotes.ts. */
const footnoteProblems = { empty: 'footnoteEmpty', structure: 'footnoteStructure', place: 'footnotePlace' } as const;

/** definitionSearch matches a text with the definition of a footnote, so that a text without one needs no reading of its footnotes. */
const definitionSearch = /^ {0,3}\[\^[^\]\s]+\]:/m;

/**
 * isNoteDocument tells whether a document can have notes: a Markdown document that the extension can change, in a
 * writable file system or not saved yet. A version of a file in Git and a Markdown cell of a notebook have none.
 * @param document - The document.
 */
export function isNoteDocument(document: vscode.TextDocument): boolean {
  const scheme = document.uri.scheme;
  // The clean editing view shows a file without its notes (R-TEXT-009): its file has them.
  return document.languageId === 'markdown' && scheme !== 'markdownnotes' && (scheme === 'untitled' || vscode.workspace.fs.isWritableFileSystem(scheme) === true);
}

/**
 * linesOf returns the lines of a document.
 * @param document - The document.
 */
export const linesOf = (document: vscode.TextDocument): string[] => document.getText().split(/\r\n|\r|\n/);

/**
 * rangeOf returns the range of a note in its document.
 * @param note - The note.
 */
export const rangeOf = (note: Note): vscode.Range => new vscode.Range(note.start.line, note.start.character, note.end.line, note.end.character);

/** NoteThreads keeps the threads of the notes of the open Markdown documents. */
export class NoteThreads implements vscode.Disposable {
  private readonly diagnostics: vscode.DiagnosticCollection;
  /** entries holds the threads of the notes of each document, by its URI. */
  private readonly entries = new Map<string, Entry[]>();
  /** timers holds the pending reading of each changed document, by its URI. */
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  /** readings holds the reading of each document for one version, whose notes the overlay of the text editor shares. */
  private readonly readings = new WeakMap<vscode.TextDocument, { version: number; reading: Reading }>();
  /** textReadings holds the reading with the blocks of text of each document without notes, for one version. */
  private readonly textReadings = new WeakMap<vscode.TextDocument, { version: number; reading: Reading }>();
  /** footnotes holds the standard footnotes of each document, for one version. */
  private readonly footnotes = new WeakMap<vscode.TextDocument, { version: number; footnotes: Footnote[] }>();
  /** listeners are the listeners of the changes of the notes of a document. */
  private readonly listeners = new Set<(document: vscode.Uri) => void>();
  /** changing holds the edits of the extension that VS Code did not apply yet, of each document by its URI. */
  private readonly changing = new Map<string, Set<Promise<boolean>>>();
  /** count is the number of threads that the extension created, for their identifiers. */
  private count = 0;

  /**
   * @param authorOf - Returns the GitHub login of the user after a sign-in, or undefined without one.
   */
  constructor(private readonly authorOf: () => Promise<string | undefined>) {
    this.diagnostics = vscode.languages.createDiagnosticCollection('nimblescape.markdownNotes');
  }

  /** register registers the listeners, and reads the notes of the open documents. */
  register(): vscode.Disposable[] {
    const registrations = [
      vscode.workspace.onDidOpenTextDocument((document) => this.sync(document)),
      vscode.workspace.onDidChangeTextDocument((event) => this.syncLater(event.document)),
      vscode.workspace.onDidCloseTextDocument((document) => this.forget(document.uri)),
    ];
    this.syncAll();
    return registrations;
  }

  /** syncAll reads the notes of every open document again and builds every thread anew. */
  private syncAll(): void {
    for (const key of [...this.entries.keys()]) {
      this.forget(vscode.Uri.parse(key));
    }
    for (const document of vscode.workspace.textDocuments) {
      this.sync(document);
    }
  }

  /**
   * onDidChange adds a listener of the changes of the notes of a document.
   * @param listener - The listener, which gets the URI of the document.
   */
  onDidChange(listener: (document: vscode.Uri) => void): vscode.Disposable {
    this.listeners.add(listener);
    return { dispose: () => this.listeners.delete(listener) };
  }

  /**
   * entriesOf returns the notes of an open document with the identifiers of their threads, in the order of the notes.
   * @param document - The URI of the document.
   */
  entriesOf(document: vscode.Uri): NoteEntry[] {
    return (this.entries.get(document.toString()) ?? []).map(({ id, note, raw }) => ({ id, note, text: ownText(raw, note.prefix) }));
  }

  /**
   * entryAt returns the note of an open document at a position: the note whose definition holds its line, or else the
   * note whose selection holds it and starts last.
   * @param document - The URI of the document.
   * @param position - The position.
   */
  entryAt(document: vscode.Uri, position: Position): NoteEntry | undefined {
    const entries = this.entriesOf(document);
    const note = noteAt(entries.map((entry) => entry.note), position);
    return entries.find((entry) => entry.note === note);
  }

  /**
   * notesOf returns the notes of a document, read once for each version.
   * @param document - The document.
   */
  notesOf(document: vscode.TextDocument): Note[] {
    return this.readingOf(document).notes;
  }

  /**
   * readingOf returns the reading of a document, read once for each version.
   * @param document - The document.
   */
  readingOf(document: vscode.TextDocument): Reading {
    let known = this.readings.get(document);
    if (!known || known.version !== document.version) {
      known = { version: document.version, reading: readNotes(linesOf(document)) };
      this.readings.set(document, known);
    }
    return known.reading;
  }

  /**
   * textReadingOf returns the reading of a document with its blocks of text, read once for each version. The reading of
   * readingOf skips the blocks of a document without notes, but the light bulb action of the selected text and the title
   * of a new note need them also for the first note of a file.
   * @param document - The document.
   */
  textReadingOf(document: vscode.TextDocument): Reading {
    const reading = this.readingOf(document);
    if (reading.blocks.length > 0 || reading.notes.length > 0) {
      return reading;
    }
    let known = this.textReadings.get(document);
    if (!known || known.version !== document.version) {
      known = { version: document.version, reading: read(linesOf(document)) };
      this.textReadings.set(document, known);
    }
    return known.reading;
  }

  /**
   * footnotesOf returns the standard footnotes of an open document ([R-FOOT-001](../docs/requirements.md#r-foot-001)),
   * read once for each version; none for a document that is not open or that cannot have notes.
   * @param uri - The URI of the document.
   */
  footnotesOf(uri: vscode.Uri): Footnote[] {
    const document = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === uri.toString());
    if (!document || !isNoteDocument(document)) {
      return [];
    }
    let known = this.footnotes.get(document);
    if (!known || known.version !== document.version) {
      const text = document.getText();
      known = { version: document.version, footnotes: definitionSearch.test(text) ? readFootnotes(linesOf(document), this.textReadingOf(document)) : [] };
      this.footnotes.set(document, known);
    }
    return known.footnotes;
  }

  /**
   * syncLater reads the notes of a changed document after a pause of changeDelay without a further change.
   * @param document - The document.
   */
  private syncLater(document: vscode.TextDocument): void {
    const key = document.uri.toString();
    clearTimeout(this.timers.get(key));
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key);
        this.sync(document);
      }, changeDelay),
    );
  }

  /**
   * sync reads the notes of a document and matches the threads to them: a thread whose note the extension just wrote
   * finds it at its expected position, any other thread finds the note with the same text of its comment. A thread
   * without a note goes away; a note without a thread gets a new one.
   * @param document - The document.
   */
  private sync(document: vscode.TextDocument): void {
    if (!isNoteDocument(document) || document.isClosed) {
      return;
    }
    const key = document.uri.toString();
    clearTimeout(this.timers.get(key));
    this.timers.delete(key);
    const notes = this.notesOf(document);
    const old = this.entries.get(key) ?? [];
    const used = new Set<Entry>();
    const entries = notes.map((note) => {
      const raw = document.getText(rangeOf(note));
      const entry =
        old.find((candidate) => !used.has(candidate) && candidate.expected?.line === note.start.line && candidate.expected.character === note.start.character) ??
        old.find((candidate) => !used.has(candidate) && candidate.expected === undefined && candidate.raw === raw);
      if (!entry) {
        return this.create(note, raw);
      }
      used.add(entry);
      this.update(entry, note, raw);
      return entry;
    });
    this.entries.set(key, entries);
    const lines = linesOf(document);
    const source = sourceOf(document.uri);
    this.diagnostics.set(
      document.uri,
      [...checksOf(lines, this.readingOf(document)), ...(source ? listingChecksOf(lines, source) : [])].map((check) => {
        const range = new vscode.Range(check.range.start.line, check.range.start.character, check.range.end.line, check.range.end.character);
        const severity = check.severity === 'warning' ? vscode.DiagnosticSeverity.Warning : vscode.DiagnosticSeverity.Information;
        const diagnostic = new vscode.Diagnostic(range, check.message, severity);
        diagnostic.source = 'Markdown Notes';
        return diagnostic;
      }),
    );
    for (const listener of this.listeners) {
      listener(document.uri);
    }
  }

  /**
   * create builds the thread of a note.
   * @param note - The note.
   * @param raw - The text of its comment in the document.
   */
  private create(note: Note, raw: string): Entry {
    return { id: String(++this.count), note, raw, expected: undefined };
  }

  /**
   * update gives a thread the place and the content of its note.
   * @param entry - The thread.
   * @param note - The note.
   * @param raw - The text of its comment in the document.
   */
  private update(entry: Entry, note: Note, raw: string): void {
    entry.raw = raw;
    entry.expected = undefined;
    entry.note = note;
  }

  /**
   * forget removes the threads and the warnings of a document.
   * @param document - The URI of the document.
   */
  private forget(document: vscode.Uri): void {
    const key = document.toString();
    clearTimeout(this.timers.get(key));
    this.timers.delete(key);
    this.entries.delete(key);
    this.diagnostics.delete(document);
    for (const listener of this.listeners) {
      listener(document);
    }
  }

  /**
   * entryOf returns the thread of a note by its identifier.
   * @param document - The URI of the document.
   * @param id - The identifier.
   */
  private entryOf(document: vscode.Uri, id: string): Entry | undefined {
    return this.entries.get(document.toString())?.find((entry) => entry.id === id);
  }

  /**
   * apply writes the edits of the lines of a text into a document in one workspace edit, with the line breaks of the
   * document.
   * @param document - The document.
   * @param edits - The edits, which refer to the lines before the change and do not overlap.
   */
  private async apply(document: vscode.TextDocument, edits: readonly Edit[]): Promise<boolean> {
    const workspaceEdit = new vscode.WorkspaceEdit();
    const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
    for (const edit of edits) {
      workspaceEdit.replace(
        document.uri,
        new vscode.Range(edit.start.line, edit.start.character, edit.end.line, edit.end.character),
        edit.text.replace(/\n/g, eol),
      );
    }
    const key = document.uri.toString();
    const applied = Promise.resolve(vscode.workspace.applyEdit(workspaceEdit));
    const pending = this.changing.get(key) ?? new Set<Promise<boolean>>();
    pending.add(applied);
    this.changing.set(key, pending);
    try {
      return await applied;
    } finally {
      pending.delete(applied);
      if (pending.size === 0 && this.changing.get(key) === pending) {
        this.changing.delete(key);
      }
    }
  }

  /**
   * settled resolves when VS Code applied the edits of the extension to a document. Until then, the lines of the
   * document in the extension can be older than the lines of the text editor, so that a command with the lines of the
   * document, such as a fold, acts on other lines.
   * @param document - The document.
   */
  async settled(document: vscode.TextDocument): Promise<void> {
    let pending = this.changing.get(document.uri.toString());
    while (pending && pending.size > 0) {
      await Promise.allSettled([...pending]);
      pending = this.changing.get(document.uri.toString());
    }
  }

  /**
   * change writes the edit of a note of a document: it reads the notes first, so that the edit fits the text of the
   * document, and again after the edit.
   * @param uri - The URI of the document.
   * @param id - The identifier of the thread of the note.
   * @param edit - Returns the edit for the lines of the document and the note.
   * @param keepsNote - Whether the note stays after the edit, so that its thread finds it at its place.
   * @param written - Runs after the edit and before the notes are read again.
   */
  private async change(
    uri: vscode.Uri,
    id: string,
    edit: (lines: string[], note: Note) => Result,
    keepsNote: (note: Note) => boolean,
    written?: () => void,
  ): Promise<Problem | undefined> {
    const document = await vscode.workspace.openTextDocument(uri);
    this.sync(document);
    const entry = this.entryOf(uri, id);
    if (!entry) {
      return { kind: 'missing' };
    }
    const lines = linesOf(document);
    const format = newerFormat(lines);
    if (format !== undefined) {
      return { kind: 'format', format };
    }
    const result = edit(lines, entry.note);
    if ('problem' in result) {
      return result.problem;
    }
    // The comment of the format of the notes comes with each change of the extension (R-NOTE-007).
    const { edits, shift } = withDoctype(lines, result.edit);
    entry.expected = keepsNote(entry.note) ? shift(entry.note.start) : undefined;
    if (!(await this.apply(document, edits))) {
      entry.expected = undefined;
      return { kind: 'structure' };
    }
    written?.();
    this.sync(document);
    return undefined;
  }

  /**
   * saveAnswer writes a text into an answer of a note ([R-EDIT-002](../docs/requirements.md#r-edit-002)), with the
   * date of the save when the text changed.
   * @param document - The URI of the document.
   * @param id - The identifier of the thread of the note.
   * @param answer - The answer, as the side view showed it.
   * @param text - The text of the editor.
   * @param written - Runs after the edit and before the notes are read again.
   */
  saveAnswer(document: vscode.Uri, id: string, answer: AnswerRef, text: string, written?: () => void): Promise<Problem | undefined> {
    const date = formatDate(new Date());
    return this.change(
      document,
      id,
      (lines, note) => (isAnswer(note, answer) ? replaceAnswer(lines, note, answer.index, normalizeBody(text), date) : { problem: { kind: 'changed' } }),
      () => true,
      written,
    );
  }

  /**
   * answer adds a reply of the signed-in user to an answer of a note, by default to the first answer, which is a reply
   * to the note ([R-EDIT-005](../docs/requirements.md#r-edit-005)).
   * @param document - The URI of the document.
   * @param id - The identifier of the thread of the note.
   * @param text - The text of the answer.
   * @param written - Runs after the edit and before the notes are read again.
   * @param parent - The answer that the reply replies to, as the side view showed it, or undefined for a reply to the note.
   */
  async answer(document: vscode.Uri, id: string, text: string, written?: () => void, parent?: AnswerRef): Promise<Problem | undefined> {
    const author = await this.authorOf();
    if (!author) {
      return { kind: 'signIn' };
    }
    return this.change(
      document,
      id,
      (lines, note) =>
        parent && !isAnswer(note, parent) ? { problem: { kind: 'changed' } } : appendAnswer(lines, note, normalizeBody(text), { author, date: formatDate(new Date()) }, parent?.index ?? 0),
      () => true,
      written,
    );
  }

  /**
   * deleteAnswer removes an answer of a note, and the note with its only answer
   * ([R-EDIT-004](../docs/requirements.md#r-edit-004)).
   * @param document - The URI of the document.
   * @param id - The identifier of the thread of the note.
   * @param answer - The answer, as the side view showed it.
   */
  deleteAnswer(document: vscode.Uri, id: string, answer: AnswerRef): Promise<Problem | undefined> {
    return this.change(
      document,
      id,
      (lines, note) => (isAnswer(note, answer) ? deleteAnswer(lines, note, answer.index) : { problem: { kind: 'changed' } }),
      (note) => note.answers.length > 1,
    );
  }

  /**
   * deleteNote removes a note with all its answers ([R-EDIT-004](../docs/requirements.md#r-edit-004)).
   * @param document - The URI of the document.
   * @param id - The identifier of the thread of the note.
   */
  deleteNote(document: vscode.Uri, id: string): Promise<Problem | undefined> {
    return this.change(document, id, (lines, note) => ({ edit: deleteNote(lines, note) }), () => false);
  }

  /**
   * colorNote gives a note a color, or the default color.
   * @param document - The URI of the document.
   * @param id - The identifier of the thread of the note.
   * @param color - The name of the color, or undefined for the default color.
   */
  colorNote(document: vscode.Uri, id: string, color: string | undefined): Promise<Problem | undefined> {
    return this.change(document, id, (lines, note) => colorNote(lines, note, color), () => true);
  }

  /**
   * todoNote gives a todo note its state ([R-NOTE-008](../docs/requirements.md#r-note-008)): open or completed.
   * @param document - The URI of the document.
   * @param id - The identifier of the thread of the note.
   * @param state - The state: `todo` while it is open, `done` when it is completed.
   */
  todoNote(document: vscode.Uri, id: string, state: TodoState): Promise<Problem | undefined> {
    return this.change(document, id, (lines, note) => todoNote(lines, note, state), () => true);
  }

  /**
   * saveNoteText writes the text of the text view of the side view into a note: the whole text of its definition. It
   * writes only while the note still has the text that the text view started from, so that it never takes back a change
   * that came in the meantime, such as a new reply.
   * @param document - The URI of the document.
   * @param id - The identifier of the thread of the note.
   * @param text - The text of the text view.
   * @param original - The text of the note when the text view opened.
   */
  saveNoteText(document: vscode.Uri, id: string, text: string, original: string): Promise<Problem | undefined> {
    return this.change(
      document,
      id,
      (lines, note) => (this.entriesOf(document).find((entry) => entry.id === id)?.text === original ? replaceNoteText(lines, note, text) : { problem: { kind: 'changed' } }),
      () => true,
    );
  }

  /**
   * addNote adds a note of the signed-in user for a range of a document ([R-EDIT-003](../docs/requirements.md#r-edit-003)):
   * its highlight is the selected text of the range in a paragraph or a heading.
   * @param uri - The URI of the document.
   * @param range - The range, for example the selection of the text editor.
   * @param text - The text of the note.
   * @param color - The name of the color of the note, or undefined for the default color.
   * @param todo - Whether the note is an open todo ([R-NOTE-008](../docs/requirements.md#r-note-008)).
   * @returns The identifier of the thread of the new note, or the problem that prevents it.
   */
  async addNote(uri: vscode.Uri, range: vscode.Range, text: string, color?: string, todo = false): Promise<{ id: string } | { problem: Problem }> {
    const author = await this.authorOf();
    if (!author) {
      return { problem: { kind: 'signIn' } };
    }
    const document = await vscode.workspace.openTextDocument(uri);
    const before = linesOf(document);
    const format = newerFormat(before);
    if (format !== undefined) {
      return { problem: { kind: 'format', format } };
    }
    const result = insertNote(before, range, normalizeBody(text), { author, date: formatDate(new Date()), ...(todo ? { todo: 'todo' as const } : {}) }, undefined, color);
    if ('problem' in result) {
      return result;
    }
    const { edits, shift } = withDoctype(before, result.edit);
    if (!(await this.apply(document, edits))) {
      return { problem: { kind: 'structure' } };
    }
    const lines = linesOf(document);
    const start = shift(result.start!);
    const note = findNotes(lines).find((candidate) => candidate.start.line === start.line && candidate.start.character === start.character);
    if (!note) {
      return { problem: { kind: 'structure' } };
    }
    // The thread of the new note takes it, so that the next reading keeps the thread.
    const entry = this.create(note, document.getText(rangeOf(note)));
    entry.expected = note.start;
    this.entries.set(uri.toString(), [...(this.entries.get(uri.toString()) ?? []), entry]);
    this.sync(document);
    return { id: entry.id };
  }

  /**
   * changeFootnote writes the edits of a change of a standard footnote of a document. A footnote is no note, so the
   * change writes no comment of the format ([R-FOOT-001](../docs/requirements.md#r-foot-001)).
   * @param uri - The URI of the document.
   * @param label - The label of the footnote.
   * @param edit - Returns the edits for the lines of the document and the footnote.
   */
  private async changeFootnote(uri: vscode.Uri, label: string, edit: (lines: string[], footnote: Footnote) => FootnoteResult | { problem: Problem }): Promise<Problem | undefined> {
    const document = await vscode.workspace.openTextDocument(uri);
    const footnote = this.footnotesOf(uri).find((candidate) => candidate.label === label);
    if (!footnote) {
      return { kind: 'footnoteMissing' };
    }
    const result = edit(linesOf(document), footnote);
    if ('problem' in result) {
      return typeof result.problem === 'string' ? { kind: footnoteProblems[result.problem] } : result.problem;
    }
    if (!(await this.apply(document, result.edits))) {
      return { kind: 'footnoteStructure' };
    }
    this.sync(document);
    return undefined;
  }

  /**
   * saveFootnote writes a text into the definition of a standard footnote ([R-FOOT-002](../docs/requirements.md#r-foot-002)),
   * only while the definition still holds the text that the editor started from.
   * @param document - The URI of the document.
   * @param label - The label of the footnote.
   * @param text - The text of the editor.
   * @param original - The text of the definition when the editor opened.
   */
  saveFootnote(document: vscode.Uri, label: string, text: string, original: string): Promise<Problem | undefined> {
    return this.changeFootnote(document, label, (lines, footnote) => (footnote.text === original ? replaceFootnote(lines, footnote, text) : { problem: { kind: 'footnoteChanged' } }));
  }

  /**
   * deleteFootnote removes a standard footnote: its definition and every reference to it, in one edit
   * ([R-FOOT-002](../docs/requirements.md#r-foot-002)).
   * @param document - The URI of the document.
   * @param label - The label of the footnote.
   */
  deleteFootnote(document: vscode.Uri, label: string): Promise<Problem | undefined> {
    return this.changeFootnote(document, label, (lines, footnote) => ({ edits: deleteFootnote(lines, footnote) }));
  }

  /**
   * addFootnote adds a standard footnote with a text at a position of a document ([R-FOOT-003](../docs/requirements.md#r-foot-003)):
   * its reference with the next free number and its definition, in one edit.
   * @param uri - The URI of the document.
   * @param position - The position of the cursor, or the end of the selected text.
   * @param text - The text of the footnote.
   * @returns The label of the new footnote, or the problem that prevents it.
   */
  async addFootnote(uri: vscode.Uri, position: Position, text: string): Promise<{ label: string } | { problem: Problem }> {
    const document = await vscode.workspace.openTextDocument(uri);
    const result = insertFootnote(linesOf(document), position, text, this.textReadingOf(document));
    if ('problem' in result) {
      return { problem: { kind: footnoteProblems[result.problem] } };
    }
    if (!(await this.apply(document, result.edits))) {
      return { problem: { kind: 'footnoteStructure' } };
    }
    this.sync(document);
    return { label: result.label! };
  }

  /** dispose removes the threads and the warnings. */
  dispose(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.entries.clear();
    this.listeners.clear();
    this.diagnostics.dispose();
  }
}
