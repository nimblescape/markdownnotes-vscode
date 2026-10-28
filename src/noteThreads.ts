// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The notes in the text editor and in the Comments view of VS Code
 * ([R-TEXT-001](../docs/requirements.md#r-text-001) and
 * [R-VIEW-001](../docs/requirements.md#r-view-001)), with the comments API of
 * VS Code: a comment controller with one comment thread for each note of an
 * open Markdown document. The box of a thread shows the body of the note as
 * Markdown, with the author and the date of its front matter. Its button
 * "Edit Note" turns the box into an editor of Markdown, and "Save" writes the
 * text back into the comment of the note in the document
 * ([R-EDIT-001](../docs/requirements.md#r-edit-001) and
 * [R-EDIT-002](../docs/requirements.md#r-edit-002)). The `+` at a line of a
 * Markdown document adds a new note ([R-EDIT-003](../docs/requirements.md#r-edit-003)),
 * and "Delete Note" removes a note ([R-EDIT-004](../docs/requirements.md#r-edit-004)).
 * A text that a note must not hold, for example another comment, is not
 * written: the box shows a message and opens the editor with the text again
 * ([R-NOTE-003](../docs/requirements.md#r-note-003)).
 *
 * The threads follow the text: after each change of a document, and a pause
 * of changeDelay, the extension reads the notes again and keeps the thread of
 * each note whose comment kept its text, so that an open box stays open. The
 * extension also warns at a note that holds the start of another comment, and
 * lets the editor fold the notes of several lines.
 */

import * as vscode from 'vscode';
import { deleteNote, type Edit, insertNote, type Problem, replaceBody } from './notes/edits';
import { findNotes, type Note, type Position } from './notes/notes';
import { formatDate, normalizeBody, parseDate } from './notes/syntax';
import type { Settings } from './settings';

/** controllerId is the identifier of the comment controller, which the conditions of the menus name. */
export const controllerId = 'nimblescape.markdownNote';

/** noteContext is the context value of the comment of a note, which the conditions of the menus name. */
export const noteContext = 'nimblescape.markdownNote.note';

/** draftContext is the context value of the comment of a new note that was not written yet. */
export const draftContext = 'nimblescape.markdownNote.draft';

/** commands are the commands of the buttons of the boxes. */
export const commands = {
  addNote: 'nimblescape.markdownNote.addNote',
  discardNewNote: 'nimblescape.markdownNote.discardNewNote',
  editNote: 'nimblescape.markdownNote.editNote',
  deleteNote: 'nimblescape.markdownNote.deleteNote',
  saveNote: 'nimblescape.markdownNote.saveNote',
  cancelEdit: 'nimblescape.markdownNote.cancelEdit',
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

/** NoteComment is the comment of the thread of a note: the body, the author and the date of the note. */
export class NoteComment implements vscode.Comment {
  body: vscode.MarkdownString;
  mode = vscode.CommentMode.Preview;
  author: vscode.CommentAuthorInformation;
  timestamp: Date | undefined;
  contextValue: string;
  label: string | undefined;

  /**
   * @param thread - The thread of the comment.
   * @param note - The note, or undefined for a new note that was not written yet.
   * @param document - The document of the note, whose folder is the base of the relative links of the body.
   * @param draft - For a new note: its text and the author of the new note.
   */
  constructor(
    readonly thread: vscode.CommentThread,
    public note: Note | undefined,
    document: vscode.Uri,
    draft?: { text: string; author: string | undefined },
  ) {
    this.body = markdown(note?.body ?? draft?.text ?? '', document);
    this.author = { name: (note ? note.author : draft?.author) || 'Note' };
    this.timestamp = note?.date ? parseDate(note.date) : undefined;
    // A date of another form shows as written.
    this.label = note?.date && !this.timestamp ? note.date : undefined;
    this.contextValue = note ? noteContext : draftContext;
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
  thread: vscode.CommentThread;
  comment: NoteComment;
  /** raw is the text of the comment in the document, by which a thread finds its note after a change. */
  raw: string;
  /** expected is the position of the note after an edit of the extension, which the next reading finds there. */
  expected: Position | undefined;
}

/**
 * problemMessage returns the message of a refused text.
 * @param problem - The problem.
 */
export function problemMessage(problem: Problem): string {
  switch (problem.kind) {
    case 'nested':
      return `The note was not saved: a note must not contain another comment. Remove "${problem.text}" from its text.`;
    case 'structure':
      return 'The note was not saved: in this place, the text would change the Markdown around the note, for example with a blank line in a note inside a paragraph. Write the text without blank lines, or put the note on lines of its own.';
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
const rangeOf = (note: Note): vscode.Range => new vscode.Range(note.start.line, note.start.character, note.end.line, note.end.character);

/** NoteThreads keeps the threads of the notes of the open Markdown documents. */
export class NoteThreads implements vscode.Disposable {
  private readonly controller: vscode.CommentController;
  private readonly diagnostics: vscode.DiagnosticCollection;
  /** entries holds the threads of the notes of each document, by its URI. */
  private readonly entries = new Map<string, Entry[]>();
  /** timers holds the pending reading of each changed document, by its URI. */
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  /** notes holds the notes of each document for one version, which the folding shares. */
  private readonly notes = new WeakMap<vscode.TextDocument, { version: number; notes: Note[] }>();

  /**
   * @param settingsOf - Returns the settings of a document.
   * @param authorOf - Returns the author of a new note in a document, or undefined.
   */
  constructor(
    private readonly settingsOf: (document: vscode.Uri) => Settings,
    private readonly authorOf: (document: vscode.Uri) => Promise<string | undefined>,
  ) {
    this.controller = vscode.comments.createCommentController(controllerId, 'Markdown notes');
    this.controller.options = { prompt: 'Add a note…', placeHolder: 'The text of the note, in Markdown' };
    this.controller.commentingRangeProvider = {
      provideCommentingRanges: (document) => (isNoteDocument(document) ? [new vscode.Range(0, 0, Math.max(document.lineCount - 1, 0), 0)] : []),
    };
    this.diagnostics = vscode.languages.createDiagnosticCollection('nimblescape.markdownNote');
  }

  /** register registers the commands, the listeners and the folding, and reads the notes of the open documents. */
  register(): vscode.Disposable[] {
    const registrations = [
      vscode.commands.registerCommand(commands.addNote, (reply: vscode.CommentReply) => this.add(reply)),
      vscode.commands.registerCommand(commands.discardNewNote, (reply: vscode.CommentReply) => reply.thread.dispose()),
      vscode.commands.registerCommand(commands.editNote, (comment: NoteComment) => this.edit(comment)),
      vscode.commands.registerCommand(commands.cancelEdit, (comment: NoteComment) => this.cancel(comment)),
      vscode.commands.registerCommand(commands.saveNote, (comment: NoteComment) => this.save(comment)),
      vscode.commands.registerCommand(commands.deleteNote, (comment: NoteComment) => this.delete(comment)),
      vscode.workspace.onDidOpenTextDocument((document) => this.sync(document)),
      vscode.workspace.onDidChangeTextDocument((event) => this.syncLater(event.document)),
      vscode.workspace.onDidCloseTextDocument((document) => this.forget(document.uri)),
      vscode.languages.registerFoldingRangeProvider('markdown', {
        /** provideFoldingRanges folds each note on lines of its own with more than one line, as a comment. */
        provideFoldingRanges: (document) =>
          this.notesOf(document)
            .filter((note) => note.place === 'block' && note.end.line > note.start.line)
            .map((note) => new vscode.FoldingRange(note.start.line, note.end.line, vscode.FoldingRangeKind.Comment)),
      }),
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
   * threadsOf returns the threads of the notes of a document, in the order of the notes.
   * @param document - The URI of the document.
   */
  threadsOf(document: vscode.Uri): vscode.CommentThread[] {
    return (this.entries.get(document.toString()) ?? []).map((entry) => entry.thread);
  }

  /**
   * notesOf returns the notes of a document, read once for each version.
   * @param document - The document.
   */
  private notesOf(document: vscode.TextDocument): Note[] {
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
          diagnostic.source = 'Markdown Note';
          return diagnostic;
        }),
    );
  }

  /**
   * create builds the thread of a note.
   * @param document - The document.
   * @param note - The note.
   * @param raw - The text of its comment in the document.
   */
  private create(document: vscode.TextDocument, note: Note, raw: string): Entry {
    const thread = this.controller.createCommentThread(document.uri, rangeOf(note), []);
    const comment = new NoteComment(thread, note, document.uri);
    thread.comments = [comment];
    thread.canReply = false;
    thread.label = threadLabel;
    thread.contextValue = noteContext;
    thread.collapsibleState = this.settingsOf(document.uri).expandInEditor
      ? vscode.CommentThreadCollapsibleState.Expanded
      : vscode.CommentThreadCollapsibleState.Collapsed;
    return { thread, comment, raw, expected: undefined };
  }

  /**
   * update gives a thread the place and the content of its note. A comment whose box is being edited keeps the text
   * of its editor.
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
    const changed = entry.raw !== raw || entry.comment.note === undefined;
    entry.raw = raw;
    entry.expected = undefined;
    entry.comment.note = note;
    if (changed && entry.comment.mode !== vscode.CommentMode.Editing) {
      const comment = new NoteComment(entry.thread, note, document);
      entry.comment = comment;
      entry.thread.comments = [comment];
      entry.thread.contextValue = noteContext;
      entry.thread.label = threadLabel;
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
  }

  /**
   * entryOf returns the thread of a comment.
   * @param comment - The comment.
   */
  private entryOf(comment: NoteComment): Entry | undefined {
    return this.entries.get(comment.thread.uri.toString())?.find((entry) => entry.comment === comment || entry.thread === comment.thread);
  }

  /**
   * show sets the mode of a comment and shows it in its thread.
   * @param comment - The comment.
   * @param mode - The mode.
   */
  private show(comment: NoteComment, mode: vscode.CommentMode): void {
    comment.mode = mode;
    comment.thread.comments = [comment];
  }

  /**
   * edit opens the editor of the box of a note.
   * @param comment - The comment of the note.
   */
  private edit(comment: NoteComment): void {
    this.show(comment, vscode.CommentMode.Editing);
  }

  /**
   * cancel closes the editor of a box and drops its text: the box shows the note as the document holds it. A new
   * note that was not written yet goes away.
   * @param comment - The comment.
   */
  private cancel(comment: NoteComment): void {
    if (!comment.note) {
      comment.thread.dispose();
      return;
    }
    comment.body = markdown(comment.note.body, comment.thread.uri);
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
   * save writes the text of the editor of a box into the note, or adds a new note that was refused before.
   * @param comment - The comment, whose body VS Code set to the text of the editor.
   */
  private async save(comment: NoteComment): Promise<void> {
    if (!comment.note) {
      await this.write(comment.thread, comment.text(), comment);
      return;
    }
    const document = await vscode.workspace.openTextDocument(comment.thread.uri);
    this.sync(document);
    const entry = this.entryOf(comment);
    const note = entry?.comment.note;
    if (!entry || !note) {
      void vscode.window.showErrorMessage('The note was not saved: the document no longer holds it.');
      return;
    }
    const result = replaceBody(linesOf(document), note, normalizeBody(comment.text()));
    if ('problem' in result) {
      this.refuse(comment, result.problem);
      return;
    }
    entry.expected = note.start;
    if (!(await this.apply(document, result.edit))) {
      entry.expected = undefined;
      this.refuse(comment, { kind: 'structure' });
      return;
    }
    // VS Code closed the editor of the box; the comment leaves the editing mode, so that "Edit Note" opens it again.
    this.show(comment, vscode.CommentMode.Preview);
    this.sync(document);
  }

  /**
   * add writes a new note from the reply box of a new thread.
   * @param reply - The thread and the text of its reply box.
   */
  private async add(reply: vscode.CommentReply): Promise<void> {
    await this.write(reply.thread, reply.text, undefined);
  }

  /**
   * write adds a new note to the document of a thread, after the block of the last line of the thread. The thread
   * becomes the thread of the note. A refused text stays in the box, in an editor.
   * @param thread - The new thread.
   * @param text - The text of the note.
   * @param draft - The comment that holds a refused text from before, or undefined.
   */
  private async write(thread: vscode.CommentThread, text: string, draft: NoteComment | undefined): Promise<void> {
    const document = await vscode.workspace.openTextDocument(thread.uri);
    const author = (await this.authorOf(document.uri)) || undefined;
    const comment = draft ?? new NoteComment(thread, undefined, document.uri, { text, author });
    comment.body = markdown(text, document.uri);
    thread.canReply = false;
    thread.label = threadLabel;
    const result = insertNote(linesOf(document), thread.range?.end.line ?? 0, normalizeBody(text), { author, date: formatDate(new Date()) });
    if ('problem' in result) {
      thread.contextValue = draftContext;
      this.refuse(comment, result.problem);
      return;
    }
    const entries = this.entries.get(document.uri.toString()) ?? [];
    const entry: Entry = { thread, comment, raw: '', expected: result.start };
    this.entries.set(document.uri.toString(), [...entries, entry]);
    if (!(await this.apply(document, result.edit))) {
      this.entries.set(document.uri.toString(), entries);
      this.refuse(comment, { kind: 'structure' });
      return;
    }
    this.show(comment, vscode.CommentMode.Preview);
    thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
    this.sync(document);
  }

  /**
   * delete removes a note from its document. Undo in the editor brings it back.
   * @param comment - The comment of the note.
   */
  private async delete(comment: NoteComment): Promise<void> {
    const document = await vscode.workspace.openTextDocument(comment.thread.uri);
    this.sync(document);
    const note = this.entryOf(comment)?.comment.note;
    if (!note) {
      return;
    }
    if (await this.apply(document, deleteNote(linesOf(document), note))) {
      this.sync(document);
    }
  }

  /** dispose removes the threads, the warnings and the comment controller. */
  dispose(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.entries.clear();
    this.diagnostics.dispose();
    this.controller.dispose();
  }
}
