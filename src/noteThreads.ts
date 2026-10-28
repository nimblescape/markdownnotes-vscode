// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The notes in the text editor and in the Comments view of VS Code
 * ([R-TEXT-001](../docs/requirements.md#r-text-001) and
 * [R-VIEW-001](../docs/requirements.md#r-view-001)), with the comments API of
 * VS Code: a comment controller with one comment thread for each note of an
 * open Markdown document, and one comment for each answer of the note. The
 * box of a thread shows each answer as Markdown, with the author and the date
 * of its front matter, as the extension GitHub Pull Requests shows the
 * comments of a pull request; it collapses and expands
 * ([R-TEXT-002](../docs/requirements.md#r-text-002)). The decorations and the
 * folds of the notes are the overlay of [src/noteEditor.ts](noteEditor.ts).
 *
 * The button "Edit" of an answer turns it into an editor of Markdown, and
 * "Save" writes the text back into the answer in the comment of the note
 * ([R-EDIT-001](../docs/requirements.md#r-edit-001) and
 * [R-EDIT-002](../docs/requirements.md#r-edit-002)). The `+` at a line adds a
 * new note ([R-EDIT-003](../docs/requirements.md#r-edit-003)), the reply box
 * adds an answer ([R-EDIT-005](../docs/requirements.md#r-edit-005)), and
 * "Delete" removes an answer or the whole note
 * ([R-EDIT-004](../docs/requirements.md#r-edit-004)). A new note and a new
 * answer name the GitHub login of the user as their author
 * ([R-GEN-006](../docs/requirements.md#r-gen-006)). A text that a note must
 * not hold, for example another comment, is not written: the box shows a
 * message and opens the editor with the text again
 * ([R-NOTE-003](../docs/requirements.md#r-note-003)). The side view
 * ([src/notesView.ts](notesView.ts)) uses the same operations.
 *
 * The threads follow the text: after each change of a document, and a pause
 * of changeDelay, the extension reads the notes again and keeps the thread of
 * each note whose comment kept its text, so that an open box stays open. The
 * extension also warns at a note that holds the start of another comment.
 */

import * as vscode from 'vscode';
import { appendAnswer, deleteAnswer, deleteNote, type Edit, insertNote, type Problem, replaceAnswer, type Result } from './notes/edits';
import { findNotes, type Note, type Position } from './notes/notes';
import { type Answer, formatDate, normalizeBody, parseDate } from './notes/syntax';
import type { Settings } from './settings';

/** controllerId is the identifier of the comment controller, which the conditions of the menus name. */
export const controllerId = 'nimblescape.markdownNotes';

/** noteContext is the context value of a thread of a note and of the comment of an answer, which the menus name. */
export const noteContext = 'nimblescape.markdownNotes.note';

/** draftContext is the context value of the comment of a new note or a new answer that was not written yet. */
export const draftContext = 'nimblescape.markdownNotes.draft';

/** commands are the commands of the buttons of the boxes. */
export const commands = {
  addNote: 'nimblescape.markdownNotes.addNote',
  discardNewNote: 'nimblescape.markdownNotes.discardNewNote',
  answer: 'nimblescape.markdownNotes.answer',
  editAnswer: 'nimblescape.markdownNotes.editAnswer',
  deleteAnswer: 'nimblescape.markdownNotes.deleteAnswer',
  saveAnswer: 'nimblescape.markdownNotes.saveAnswer',
  cancelEdit: 'nimblescape.markdownNotes.cancelEdit',
  deleteNote: 'nimblescape.markdownNotes.deleteNote',
} as const;

/** changeDelay is the pause, in milliseconds, after the last change of a document before its notes are read again. */
const changeDelay = 300;

/**
 * reopenDelay is the pause, in milliseconds, before the editor of a box opens again after a refused text. VS Code
 * sends the changes of a thread to the window 100 ms after the last change, and opens the editor only when the mode
 * of the comment changes: the comment first goes back to the preview mode, and to the editing mode after this pause.
 */
const reopenDelay = 300;

/** threadLabel is the label of the box of a note. */
const threadLabel = 'Markdown note';

/** NoteComment is the comment of one answer of a note in its thread, or of a text that was not written yet. */
export class NoteComment implements vscode.Comment {
  body: vscode.MarkdownString;
  mode = vscode.CommentMode.Preview;
  author: vscode.CommentAuthorInformation;
  timestamp: Date | undefined;
  contextValue: string;
  label: string | undefined;

  /**
   * @param thread - The thread of the comment.
   * @param index - The index of the answer, or undefined for a text that was not written yet: a new note in a thread
   *   without a note, or a new answer in the thread of a note.
   * @param document - The document of the note, whose folder is the base of the relative links of the body.
   * @param answer - The answer, or for a text that was not written yet its text and its author.
   */
  constructor(
    readonly thread: vscode.CommentThread,
    public index: number | undefined,
    document: vscode.Uri,
    answer: Answer | { body: string; author: string | undefined; date?: undefined },
  ) {
    this.body = markdown(answer.body, document);
    this.author = { name: answer.author || 'Note' };
    this.timestamp = answer.date ? parseDate(answer.date) : undefined;
    // A date of another form shows as written.
    this.label = answer.date && !this.timestamp ? answer.date : undefined;
    this.contextValue = index === undefined ? draftContext : noteContext;
  }

  /** text returns the text of the body, which VS Code sets to the text of the editor before a button runs. */
  text(): string {
    return typeof this.body === 'string' ? this.body : this.body.value;
  }
}

/**
 * markdown returns the body of a comment as a Markdown string whose relative links start at the folder of the
 * document.
 * @param text - The Markdown text.
 * @param document - The document.
 */
function markdown(text: string, document: vscode.Uri): vscode.MarkdownString {
  const body = new vscode.MarkdownString(text);
  body.supportHtml = true;
  body.baseUri = document;
  return body;
}

/** Entry is the thread of a note of a document. */
interface Entry {
  /** id identifies the thread while the document is open, also after changes of the document. */
  id: string;
  thread: vscode.CommentThread;
  /** comments are the comments of the answers, and the comment of a new answer that was not written yet. */
  comments: NoteComment[];
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
}

/**
 * problemMessage returns the message of a refused text.
 * @param problem - The problem.
 */
export function problemMessage(problem: Problem): string {
  switch (problem.kind) {
    case 'nested':
      return `The change was not saved: a note must not contain another comment. Remove "${problem.text}" from its text.`;
    case 'structure':
      return 'The change was not saved: the text would change the note or the Markdown around it. A blank line ends a note in the text of a line, and a front matter (---, author: …, ---) in a text starts a new answer.';
    case 'signIn':
      return 'The change was not saved: sign in with GitHub, so that the note names its author. The extension asks for the sign-in when you add a note or an answer.';
    case 'missing':
      return 'The change was not saved: the file no longer holds the note.';
  }
}

/**
 * isNoteDocument tells whether a document can have notes: a Markdown document that the extension can change, in a
 * writable file system or not saved yet. A version of a file in Git and a Markdown cell of a notebook have none.
 * @param document - The document.
 */
export function isNoteDocument(document: vscode.TextDocument): boolean {
  const scheme = document.uri.scheme;
  return document.languageId === 'markdown' && (scheme === 'untitled' || vscode.workspace.fs.isWritableFileSystem(scheme) === true);
}

/**
 * linesOf returns the lines of a document.
 * @param document - The document.
 */
const linesOf = (document: vscode.TextDocument): string[] => document.getText().split(/\r\n|\r|\n/);

/**
 * rangeOf returns the range of a note in its document.
 * @param note - The note.
 */
export const rangeOf = (note: Note): vscode.Range => new vscode.Range(note.start.line, note.start.character, note.end.line, note.end.character);

/** NoteThreads keeps the threads of the notes of the open Markdown documents. */
export class NoteThreads implements vscode.Disposable {
  private readonly controller: vscode.CommentController;
  private readonly diagnostics: vscode.DiagnosticCollection;
  /** entries holds the threads of the notes of each document, by its URI. */
  private readonly entries = new Map<string, Entry[]>();
  /** timers holds the pending reading of each changed document, by its URI. */
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  /** notes holds the notes of each document for one version, which the overlay of the text editor shares. */
  private readonly notes = new WeakMap<vscode.TextDocument, { version: number; notes: Note[] }>();
  /** listeners are the listeners of the changes of the notes of a document. */
  private readonly listeners = new Set<(document: vscode.Uri) => void>();
  /** count is the number of threads that the extension created, for their identifiers. */
  private count = 0;

  /**
   * @param settingsOf - Returns the settings of a document.
   * @param authorOf - Returns the GitHub login of the user after a sign-in, or undefined without one.
   */
  constructor(
    private readonly settingsOf: (document: vscode.Uri) => Settings,
    private readonly authorOf: () => Promise<string | undefined>,
  ) {
    this.controller = vscode.comments.createCommentController(controllerId, 'Markdown notes');
    this.controller.options = { prompt: 'Add a note…', placeHolder: 'The text, in Markdown' };
    this.controller.commentingRangeProvider = {
      provideCommentingRanges: (document) => (isNoteDocument(document) ? [new vscode.Range(0, 0, Math.max(document.lineCount - 1, 0), 0)] : []),
    };
    this.diagnostics = vscode.languages.createDiagnosticCollection('nimblescape.markdownNotes');
  }

  /** register registers the commands and the listeners, and reads the notes of the open documents. */
  register(): vscode.Disposable[] {
    const registrations = [
      vscode.commands.registerCommand(commands.addNote, (reply: vscode.CommentReply) => this.writeNew(reply.thread, reply.text, undefined)),
      vscode.commands.registerCommand(commands.discardNewNote, (reply: vscode.CommentReply) => reply.thread.dispose()),
      vscode.commands.registerCommand(commands.answer, (reply: vscode.CommentReply) => this.answerIn(reply.thread, reply.text, undefined)),
      vscode.commands.registerCommand(commands.editAnswer, (comment: NoteComment) => this.show(comment, vscode.CommentMode.Editing)),
      vscode.commands.registerCommand(commands.cancelEdit, (comment: NoteComment) => this.cancel(comment)),
      vscode.commands.registerCommand(commands.saveAnswer, (comment: NoteComment) => this.save(comment)),
      vscode.commands.registerCommand(commands.deleteAnswer, (comment: NoteComment) => this.deleteFrom(comment)),
      vscode.commands.registerCommand(commands.deleteNote, (thread: vscode.CommentThread) => this.deleteThread(thread)),
      vscode.workspace.onDidOpenTextDocument((document) => this.sync(document)),
      vscode.workspace.onDidChangeTextDocument((event) => this.syncLater(event.document)),
      vscode.workspace.onDidCloseTextDocument((document) => this.forget(document.uri)),
    ];
    this.syncAll();
    return registrations;
  }

  /** syncAll reads the notes of every open document again and builds every thread anew, for changed settings. */
  syncAll(): void {
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
   * threadsOf returns the threads of the notes of a document, in the order of the notes.
   * @param document - The URI of the document.
   */
  threadsOf(document: vscode.Uri): vscode.CommentThread[] {
    return (this.entries.get(document.toString()) ?? []).map((entry) => entry.thread);
  }

  /**
   * entriesOf returns the notes of an open document with the identifiers of their threads, in the order of the notes.
   * @param document - The URI of the document.
   */
  entriesOf(document: vscode.Uri): NoteEntry[] {
    return (this.entries.get(document.toString()) ?? []).map(({ id, note }) => ({ id, note }));
  }

  /**
   * expand opens the box of the thread of a note in the text editor.
   * @param document - The URI of the document.
   * @param id - The identifier of the thread.
   */
  expand(document: vscode.Uri, id: string): void {
    const entry = this.entryOf(document, id);
    if (entry) {
      entry.thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
    }
  }

  /**
   * notesOf returns the notes of a document, read once for each version.
   * @param document - The document.
   */
  notesOf(document: vscode.TextDocument): Note[] {
    let known = this.notes.get(document);
    if (!known || known.version !== document.version) {
      known = { version: document.version, notes: findNotes(linesOf(document)) };
      this.notes.set(document, known);
    }
    return known.notes;
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
        return this.create(document, note, raw);
      }
      used.add(entry);
      this.update(entry, document.uri, note, raw);
      return entry;
    });
    for (const entry of old) {
      if (!used.has(entry)) {
        entry.thread.dispose();
      }
    }
    this.entries.set(key, entries);
    this.diagnostics.set(
      document.uri,
      notes
        .filter((note) => note.nested)
        .map((note) => {
          const diagnostic = new vscode.Diagnostic(
            rangeOf(note),
            'A note must not contain another comment: this note holds "<!--". The preview shows its text as it is.',
            vscode.DiagnosticSeverity.Warning,
          );
          diagnostic.source = 'Markdown Notes';
          return diagnostic;
        }),
    );
    for (const listener of this.listeners) {
      listener(document.uri);
    }
  }

  /**
   * create builds the thread of a note, or makes a new thread of the `+` the thread of a new note.
   * @param document - The document.
   * @param note - The note.
   * @param raw - The text of its comment in the document.
   * @param thread - The thread of the `+`, or undefined for a new thread.
   */
  private create(document: vscode.TextDocument, note: Note, raw: string, thread?: vscode.CommentThread): Entry {
    const created = thread ?? this.controller.createCommentThread(document.uri, rangeOf(note), []);
    created.canReply = true;
    created.label = threadLabel;
    created.contextValue = noteContext;
    if (!thread) {
      created.collapsibleState = this.settingsOf(document.uri).expandInEditor
        ? vscode.CommentThreadCollapsibleState.Expanded
        : vscode.CommentThreadCollapsibleState.Collapsed;
    }
    const entry: Entry = { id: String(++this.count), thread: created, comments: [], note, raw, expected: undefined };
    this.fill(entry, document.uri);
    return entry;
  }

  /**
   * fill gives a thread a comment for each answer of its note. A comment whose box is being edited keeps the text of
   * its editor, and a new answer that was not written yet stays at the end.
   * @param entry - The thread.
   * @param document - The URI of the document.
   */
  private fill(entry: Entry, document: vscode.Uri): void {
    const comments = entry.note.answers.map((answer, index) => {
      const old = entry.comments[index];
      return old && old.index !== undefined && old.mode === vscode.CommentMode.Editing ? old : new NoteComment(entry.thread, index, document, answer);
    });
    entry.comments = [...comments, ...entry.comments.filter((comment) => comment.index === undefined)];
    entry.thread.comments = entry.comments;
  }

  /**
   * update gives a thread the place and the content of its note.
   * @param entry - The thread.
   * @param document - The URI of the document.
   * @param note - The note.
   * @param raw - The text of its comment in the document.
   */
  private update(entry: Entry, document: vscode.Uri, note: Note, raw: string): void {
    const range = rangeOf(note);
    if (!entry.thread.range?.isEqual(range)) {
      entry.thread.range = range;
    }
    const changed = entry.raw !== raw;
    entry.raw = raw;
    entry.expected = undefined;
    entry.note = note;
    if (changed) {
      this.fill(entry, document);
    }
  }

  /**
   * forget removes the threads and the warnings of a document.
   * @param document - The URI of the document.
   */
  private forget(document: vscode.Uri): void {
    const key = document.toString();
    clearTimeout(this.timers.get(key));
    this.timers.delete(key);
    for (const entry of this.entries.get(key) ?? []) {
      entry.thread.dispose();
    }
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
   * entryOfThread returns the entry of a thread, or undefined for a thread without a note.
   * @param thread - The thread.
   */
  private entryOfThread(thread: vscode.CommentThread): Entry | undefined {
    return this.entries.get(thread.uri.toString())?.find((entry) => entry.thread === thread);
  }

  /**
   * show sets the mode of a comment and shows it in its thread.
   * @param comment - The comment.
   * @param mode - The mode.
   */
  private show(comment: NoteComment, mode: vscode.CommentMode): void {
    comment.mode = mode;
    const entry = this.entryOfThread(comment.thread);
    comment.thread.comments = entry ? [...entry.comments] : [comment];
  }

  /**
   * cancel closes the editor of a box and drops its text: the box shows the answer as the document holds it. A new
   * note that was not written yet goes away with its thread, and a new answer with its comment.
   * @param comment - The comment.
   */
  private cancel(comment: NoteComment): void {
    const entry = this.entryOfThread(comment.thread);
    if (!entry) {
      comment.thread.dispose();
      return;
    }
    if (comment.index === undefined) {
      entry.comments = entry.comments.filter((other) => other !== comment);
      entry.thread.comments = entry.comments;
      return;
    }
    comment.body = markdown(entry.note.answers[comment.index]?.body ?? '', comment.thread.uri);
    this.show(comment, vscode.CommentMode.Preview);
  }

  /**
   * refuse shows the message of a refused text and opens the editor of the box again with the text.
   * @param comment - The comment.
   * @param problem - The problem.
   */
  private refuse(comment: NoteComment, problem: Problem): void {
    void vscode.window.showErrorMessage(problemMessage(problem));
    this.show(comment, vscode.CommentMode.Preview);
    setTimeout(() => this.show(comment, vscode.CommentMode.Editing), reopenDelay);
  }

  /**
   * apply writes an edit of the lines of a text into a document, with the line breaks of the document.
   * @param document - The document.
   * @param edit - The edit.
   */
  private async apply(document: vscode.TextDocument, edit: Edit): Promise<boolean> {
    const workspaceEdit = new vscode.WorkspaceEdit();
    const eol = document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
    workspaceEdit.replace(
      document.uri,
      new vscode.Range(edit.start.line, edit.start.character, edit.end.line, edit.end.character),
      edit.text.replace(/\n/g, eol),
    );
    return vscode.workspace.applyEdit(workspaceEdit);
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
    const result = edit(linesOf(document), entry.note);
    if ('problem' in result) {
      return result.problem;
    }
    entry.expected = keepsNote(entry.note) ? entry.note.start : undefined;
    if (!(await this.apply(document, result.edit))) {
      entry.expected = undefined;
      return { kind: 'structure' };
    }
    written?.();
    this.sync(document);
    return undefined;
  }

  /**
   * saveAnswer writes a text into an answer of a note ([R-EDIT-002](../docs/requirements.md#r-edit-002)).
   * @param document - The URI of the document.
   * @param id - The identifier of the thread of the note.
   * @param index - The index of the answer.
   * @param text - The text of the editor.
   * @param written - Runs after the edit and before the notes are read again.
   */
  saveAnswer(document: vscode.Uri, id: string, index: number, text: string, written?: () => void): Promise<Problem | undefined> {
    return this.change(document, id, (lines, note) => (index < note.answers.length ? replaceAnswer(lines, note, index, normalizeBody(text)) : { problem: { kind: 'missing' } }), () => true, written);
  }

  /**
   * answer adds an answer of the signed-in user to a note ([R-EDIT-005](../docs/requirements.md#r-edit-005)).
   * @param document - The URI of the document.
   * @param id - The identifier of the thread of the note.
   * @param text - The text of the answer.
   * @param written - Runs after the edit and before the notes are read again.
   */
  async answer(document: vscode.Uri, id: string, text: string, written?: () => void): Promise<Problem | undefined> {
    const author = await this.authorOf();
    if (!author) {
      return { kind: 'signIn' };
    }
    return this.change(document, id, (lines, note) => appendAnswer(lines, note, normalizeBody(text), { author, date: formatDate(new Date()) }), () => true, written);
  }

  /**
   * deleteAnswer removes an answer of a note, and the note with its only answer
   * ([R-EDIT-004](../docs/requirements.md#r-edit-004)).
   * @param document - The URI of the document.
   * @param id - The identifier of the thread of the note.
   * @param index - The index of the answer.
   */
  deleteAnswer(document: vscode.Uri, id: string, index: number): Promise<Problem | undefined> {
    return this.change(
      document,
      id,
      (lines, note) => (index < note.answers.length ? deleteAnswer(lines, note, index) : { problem: { kind: 'missing' } }),
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
   * addNote adds a note of the signed-in user for a line of a document ([R-EDIT-003](../docs/requirements.md#r-edit-003)).
   * @param uri - The URI of the document.
   * @param line - The index of the line.
   * @param text - The text of the note.
   * @param thread - The thread of the `+`, which becomes the thread of the note, or undefined for a new thread.
   * @returns The identifier of the thread of the new note, or the problem that prevents it.
   */
  async addNote(uri: vscode.Uri, line: number, text: string, thread?: vscode.CommentThread): Promise<{ id: string } | { problem: Problem }> {
    const author = await this.authorOf();
    if (!author) {
      return { problem: { kind: 'signIn' } };
    }
    const document = await vscode.workspace.openTextDocument(uri);
    const result = insertNote(linesOf(document), line, normalizeBody(text), { author, date: formatDate(new Date()) });
    if ('problem' in result) {
      return result;
    }
    if (!(await this.apply(document, result.edit))) {
      return { problem: { kind: 'structure' } };
    }
    const lines = linesOf(document);
    const note = findNotes(lines).find((candidate) => candidate.start.line === result.start!.line && candidate.start.character === result.start!.character);
    if (!note) {
      return { problem: { kind: 'structure' } };
    }
    // The thread of the new note takes it, so that the next reading keeps the thread.
    const entry = this.create(document, note, document.getText(rangeOf(note)), thread);
    entry.thread.range = rangeOf(note);
    entry.thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
    entry.expected = note.start;
    this.entries.set(uri.toString(), [...(this.entries.get(uri.toString()) ?? []), entry]);
    this.sync(document);
    return { id: entry.id };
  }

  /**
   * save writes the text of the editor of a box: into its answer, as a new answer, or as a new note.
   * @param comment - The comment, whose body VS Code set to the text of the editor.
   */
  private async save(comment: NoteComment): Promise<void> {
    const entry = this.entryOfThread(comment.thread);
    if (!entry) {
      await this.writeNew(comment.thread, comment.text(), comment);
      return;
    }
    if (comment.index === undefined) {
      await this.answerIn(comment.thread, comment.text(), comment);
      return;
    }
    // VS Code closed the editor of the box; the comment leaves the editing mode, so that "Edit" opens it again.
    const problem = await this.saveAnswer(comment.thread.uri, entry.id, comment.index, comment.text(), () => (comment.mode = vscode.CommentMode.Preview));
    if (problem) {
      this.refuse(comment, problem);
    }
  }

  /**
   * writeNew adds a new note from the reply box of a new thread, after the block of the last line of the thread. The
   * thread becomes the thread of the note. A refused text stays in the box, in an editor.
   * @param thread - The new thread.
   * @param text - The text of the note.
   * @param draft - The comment that holds a refused text from before, or undefined.
   */
  private async writeNew(thread: vscode.CommentThread, text: string, draft: NoteComment | undefined): Promise<void> {
    const result = await this.addNote(thread.uri, thread.range?.end.line ?? 0, text, thread);
    if ('problem' in result) {
      const comment = draft ?? new NoteComment(thread, undefined, thread.uri, { body: text, author: undefined });
      comment.body = markdown(text, thread.uri);
      thread.canReply = false;
      thread.label = threadLabel;
      thread.contextValue = draftContext;
      this.refuse(comment, result.problem);
    }
  }

  /**
   * answerIn adds an answer from the reply box of the thread of a note. A refused text stays in the thread, in an
   * editor of a new answer.
   * @param thread - The thread.
   * @param text - The text of the answer.
   * @param draft - The comment that holds a refused text from before, or undefined.
   */
  private async answerIn(thread: vscode.CommentThread, text: string, draft: NoteComment | undefined): Promise<void> {
    const entry = this.entryOfThread(thread);
    if (!entry) {
      return;
    }
    const problem = await this.answer(thread.uri, entry.id, text, () => {
      if (draft) {
        entry.comments = entry.comments.filter((comment) => comment !== draft);
      }
    });
    if (problem) {
      const comment = draft ?? new NoteComment(thread, undefined, thread.uri, { body: text, author: undefined });
      comment.body = markdown(text, thread.uri);
      if (!draft) {
        entry.comments = [...entry.comments, comment];
      }
      this.refuse(comment, problem);
    }
  }

  /**
   * deleteFrom removes the answer of a comment. Undo in the editor brings it back.
   * @param comment - The comment of the answer.
   */
  private async deleteFrom(comment: NoteComment): Promise<void> {
    const entry = this.entryOfThread(comment.thread);
    if (entry && comment.index !== undefined) {
      await this.deleteAnswer(comment.thread.uri, entry.id, comment.index);
    }
  }

  /**
   * deleteThread removes the note of a thread with all its answers. Undo in the editor brings it back.
   * @param thread - The thread.
   */
  private async deleteThread(thread: vscode.CommentThread): Promise<void> {
    const entry = this.entryOfThread(thread);
    if (entry) {
      await this.deleteNote(thread.uri, entry.id);
    }
  }

  /** dispose removes the threads, the warnings and the comment controller. */
  dispose(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.entries.clear();
    this.listeners.clear();
    this.diagnostics.dispose();
    this.controller.dispose();
  }
}
