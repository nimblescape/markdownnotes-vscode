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
 * of its header, as the extension GitHub Pull Requests shows the
 * comments of a pull request; it collapses and expands
 * ([R-TEXT-002](../docs/requirements.md#r-text-002)). The decorations and the
 * folds of the notes are the overlay of [src/noteEditor.ts](noteEditor.ts).
 *
 * The box shows the answers in the order of the file, each reply after the
 * answer that it replies to, and a reply to a reply with the label "Reply to"
 * and the author of that answer, because a box of VS Code has no tree
 * ([R-NOTE-004](../docs/requirements.md#r-note-004)).
 *
 * The button "Edit" of an answer turns it into an editor of Markdown, and
 * "Save" writes the text back into the answer in the note
 * ([R-EDIT-001](../docs/requirements.md#r-edit-001) and
 * [R-EDIT-002](../docs/requirements.md#r-edit-002)). The `+` at a line adds a
 * new note ([R-EDIT-003](../docs/requirements.md#r-edit-003)), the reply box
 * adds a reply to the note, the button "Reply" of an answer a reply to that
 * answer ([R-EDIT-005](../docs/requirements.md#r-edit-005)), and "Delete"
 * removes an answer or the whole note
 * ([R-EDIT-004](../docs/requirements.md#r-edit-004)). A new note and a new
 * answer name the GitHub login of the user as their author
 * ([R-GEN-006](../docs/requirements.md#r-gen-006)). A text that would change
 * the structure of the note, for example a block quote that starts with a
 * header, is not written: the box shows a message and opens the editor with
 * the text again. The side view ([src/notesView.ts](notesView.ts)) uses the
 * same operations.
 *
 * The threads follow the text: after each change of a document, and a pause
 * of changeDelay, the extension reads the notes again and keeps the thread of
 * each note whose text stayed the same, so that an open box stays open. The
 * extension also shows the warnings of the notes
 * ([src/notes/checks.ts](notes/checks.ts),
 * [R-TEXT-008](../docs/requirements.md#r-text-008)).
 */

import * as vscode from 'vscode';
import { appendAnswer, deleteAnswer, deleteNote, type Edit, insertNote, type Problem, replaceAnswer, type Result, withDoctype } from './notes/edits';
import { commandAddress, commandLinks, openLinkCommand } from './links';
import { checksOf } from './notes/checks';
import { doctypeEdit, formatVersion, newerFormat } from './notes/doctype';
import { findNotes, type Note, noteAt, type Position, type Reading, readNotes } from './notes/notes';
import { type Answer, formatDate, normalizeBody, parseDate } from './notes/syntax';
import { type Settings, showsInline } from './settings';

/** controllerId is the identifier of the comment controller, which the conditions of the menus name. */
export const controllerId = 'nimblescape.markdownNotes';

/** noteContext is the context value of a thread of a note and of the comment of an answer, which the menus name. */
export const noteContext = 'nimblescape.markdownNotes.note';

/**
 * foldedContext is the context value of a thread of a note whose text is folded in the text editor, which the menus
 * name: its box has the button "Show Note Text" in place of "Hide Note Text".
 */
export const foldedContext = 'nimblescape.markdownNotes.note.folded';

/** draftContext is the context value of the comment of a new note or a new answer that was not written yet. */
export const draftContext = 'nimblescape.markdownNotes.draft';

/** commands are the commands of the buttons of the boxes. */
export const commands = {
  addNote: 'nimblescape.markdownNotes.addNote',
  discardNewNote: 'nimblescape.markdownNotes.discardNewNote',
  answer: 'nimblescape.markdownNotes.answer',
  replyToAnswer: 'nimblescape.markdownNotes.replyToAnswer',
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
   * @param parent - The index of the answer that the answer replies to, and its author for the label of a reply to a
   *   reply; undefined for the first answer and for a new note.
   */
  constructor(
    readonly thread: vscode.CommentThread,
    public index: number | undefined,
    document: vscode.Uri,
    answer: Answer | { body: string; author: string | undefined; date?: undefined },
    readonly parent?: { index: number; author: string },
  ) {
    this.body = markdown(answer.body, document);
    this.author = { name: answer.author || 'Note' };
    this.timestamp = answer.date ? parseDate(answer.date) : undefined;
    // A reply to the first answer is a reply to the note, which the box shows without a label.
    this.label = parent && parent.index > 0 ? `Reply to ${parent.author}` : undefined;
    this.contextValue = index === undefined ? draftContext : noteContext;
  }

  /** text returns the text of the body, which VS Code sets to the text of the editor before a button runs. */
  text(): string {
    return typeof this.body === 'string' ? this.body : (sources.get(this.body) ?? this.body.value);
  }
}

/** sources holds the Markdown text of each body whose links to files run the command openLinkCommand. */
const sources = new WeakMap<vscode.MarkdownString, string>();

/**
 * markdown returns the body of a comment as a Markdown string whose relative links start at the folder of the
 * document. Its links to files run the command openLinkCommand, which opens them after the setting openLinksIn
 * ([R-GEN-010](../docs/requirements.md#r-gen-010)); the editor of the box shows the text itself (editable).
 * @param text - The Markdown text.
 * @param document - The document.
 */
function markdown(text: string, document: vscode.Uri): vscode.MarkdownString {
  const body = editable(commandLinks(text, (href) => commandAddress(href, document)), document);
  body.isTrusted = { enabledCommands: [openLinkCommand] };
  sources.set(body, text);
  return body;
}

/**
 * editable returns the body of a comment in the editing mode: the Markdown text as the document holds it.
 * @param text - The Markdown text.
 * @param document - The document.
 */
function editable(text: string, document: vscode.Uri): vscode.MarkdownString {
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
    case 'empty':
      return 'The change was not saved: an answer needs a text. To remove an answer, use "Delete".';
    case 'place':
      return 'The note was not added: a note belongs to the text of a paragraph, a heading, a list item or a table cell. Select a passage there, or put the cursor there.';
    case 'structure':
      return 'The change was not saved: the text would change the note or the Markdown around it. A block quote whose first line is a header (**login** · date) starts a new answer.';
    case 'signIn':
      return 'The change was not saved: sign in with GitHub, so that the note names its author. The extension asks for the sign-in when you add a note or an answer.';
    case 'missing':
      return 'The change was not saved: the file no longer holds the note.';
    case 'format':
      return `The change was not saved: the file uses version ${problem.format} of the format of the notes, and this version of the extension knows only version ${formatVersion}. Update the extension.`;
  }
}

/**
 * isShown tells whether an editor shows a document: a text editor, also a side of a diff, or the tab of a custom
 * editor such as the modes "Markdown Preview" and "Markdown Editor".
 * @param document - The document.
 */
function isShown(document: vscode.TextDocument): boolean {
  const key = document.uri.toString();
  return (
    vscode.window.visibleTextEditors.some((editor) => editor.document === document) ||
    vscode.window.tabGroups.all.some((group) => group.tabs.some((tab) => (tab.input as { uri?: unknown } | undefined)?.uri?.toString() === key))
  );
}

/**
 * showProblem shows the message of a problem of a change, if there is one.
 * @param problem - The problem, or undefined.
 */
function showProblem(problem: Problem | undefined): void {
  if (problem) {
    void vscode.window.showErrorMessage(problemMessage(problem));
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
 * hiddenThread returns a thread of a note that VS Code does not show, for the setting showNotesIn "sideView"
 * ([R-GEN-009](../docs/requirements.md#r-gen-009)): the text of the notes then shows only in the side view, which reads
 * the notes from the threads as always.
 * @param uri - The URI of the document.
 * @param range - The range of the thread.
 */
function hiddenThread(uri: vscode.Uri, range: vscode.Range): vscode.CommentThread {
  return { uri, range, comments: [], collapsibleState: vscode.CommentThreadCollapsibleState.Collapsed, canReply: true, dispose: () => undefined };
}

/**
 * rangeOf returns the range of a note in its document.
 * @param note - The note.
 */
export const rangeOf = (note: Note): vscode.Range => new vscode.Range(note.start.line, note.start.character, note.end.line, note.end.character);

/**
 * threadRangeOf returns the range of the thread of a note: its selection, as the range of a comment of a pull request
 * ([R-NOTE-006](../docs/requirements.md#r-note-006)), or the range of the note without one.
 * @param note - The note.
 */
export const threadRangeOf = (note: Note): vscode.Range =>
  note.selection ? new vscode.Range(note.selection.start.line, note.selection.start.character, note.selection.end.line, note.selection.end.character) : rangeOf(note);

/** NoteThreads keeps the threads of the notes of the open Markdown documents. */
export class NoteThreads implements vscode.Disposable {
  private readonly controller: vscode.CommentController;
  private readonly diagnostics: vscode.DiagnosticCollection;
  /** entries holds the threads of the notes of each document, by its URI. */
  private readonly entries = new Map<string, Entry[]>();
  /** timers holds the pending reading of each changed document, by its URI. */
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  /** readings holds the reading of each document for one version, whose notes the overlay of the text editor shares. */
  private readonly readings = new WeakMap<vscode.TextDocument, { version: number; reading: Reading }>();
  /** listeners are the listeners of the changes of the notes of a document. */
  private readonly listeners = new Set<(document: vscode.Uri) => void>();
  /** marked holds the documents with notes whose comment of the format the extension checked since they opened, by their URIs. */
  private readonly marked = new Set<string>();
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
    this.controller.commentingRangeProvider = this.commentingRanges();
    this.diagnostics = vscode.languages.createDiagnosticCollection('nimblescape.markdownNotes');
  }

  /** register registers the commands and the listeners, and reads the notes of the open documents. */
  register(): vscode.Disposable[] {
    const registrations = [
      vscode.commands.registerCommand(commands.addNote, (reply: vscode.CommentReply) => this.writeNew(reply.thread, reply.text, undefined)),
      vscode.commands.registerCommand(commands.discardNewNote, (reply: vscode.CommentReply) => reply.thread.dispose()),
      vscode.commands.registerCommand(commands.answer, (reply: vscode.CommentReply) => this.answerIn(reply.thread, reply.text, undefined)),
      vscode.commands.registerCommand(commands.replyToAnswer, (comment: NoteComment) => this.startReply(comment)),
      vscode.commands.registerCommand(commands.editAnswer, (comment: NoteComment) => this.show(comment, vscode.CommentMode.Editing)),
      vscode.commands.registerCommand(commands.cancelEdit, (comment: NoteComment) => this.cancel(comment)),
      vscode.commands.registerCommand(commands.saveAnswer, (comment: NoteComment) => this.save(comment)),
      vscode.commands.registerCommand(commands.deleteAnswer, (comment: NoteComment) => this.deleteFrom(comment)),
      vscode.commands.registerCommand(commands.deleteNote, (thread: vscode.CommentThread) => this.deleteThread(thread)),
      vscode.workspace.onDidOpenTextDocument((document) => this.sync(document)),
      vscode.workspace.onDidChangeTextDocument((event) => this.syncLater(event.document)),
      vscode.workspace.onDidCloseTextDocument((document) => {
        this.marked.delete(document.uri.toString());
        this.forget(document.uri);
      }),
      // A document that an editor shows gets the comment of the format.
      vscode.window.onDidChangeVisibleTextEditors(() => this.markAll()),
      vscode.window.tabGroups.onDidChangeTabs(() => this.markAll()),
    ];
    this.syncAll();
    return registrations;
  }

  /**
   * commentingRanges returns the provider of the ranges where the `+` of a new note shows: every line of a Markdown
   * file, while the notes show in the boxes of the text editor.
   */
  private commentingRanges(): vscode.CommentingRangeProvider {
    return {
      provideCommentingRanges: (document) =>
        isNoteDocument(document) && showsInline(this.settingsOf(document.uri)) ? [new vscode.Range(0, 0, Math.max(document.lineCount - 1, 0), 0)] : [],
    };
  }

  /** syncAll reads the notes of every open document again and builds every thread anew, for changed settings. */
  syncAll(): void {
    // A new provider makes VS Code ask for the ranges of the `+` again.
    this.controller.commentingRangeProvider = this.commentingRanges();
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
   * showFolded gives each thread of a note of a document the context value of a note whose text is folded, or of a
   * note whose text shows, which chooses the button "Show Note Text" or "Hide Note Text" of its box.
   * @param document - The URI of the document.
   * @param folded - Tells whether the text of a note is folded.
   */
  showFolded(document: vscode.Uri, folded: (note: Note) => boolean): void {
    for (const { thread, note } of this.entries.get(document.toString()) ?? []) {
      const value = folded(note) ? foldedContext : noteContext;
      if ((thread.contextValue === noteContext || thread.contextValue === foldedContext) && thread.contextValue !== value) {
        thread.contextValue = value;
      }
    }
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
   * noteOfThread returns the note of a thread, or undefined for a thread without a note.
   * @param thread - The thread.
   */
  noteOfThread(thread: vscode.CommentThread): Note | undefined {
    return this.entryOfThread(thread)?.note;
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
    return this.readingOf(document).notes;
  }

  /**
   * readingOf returns the reading of a document, read once for each version.
   * @param document - The document.
   */
  private readingOf(document: vscode.TextDocument): Reading {
    let known = this.readings.get(document);
    if (!known || known.version !== document.version) {
      known = { version: document.version, reading: readNotes(linesOf(document)) };
      this.readings.set(document, known);
    }
    return known.reading;
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
      checksOf(linesOf(document), this.readingOf(document)).map((check) => {
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
    this.mark(document);
  }

  /** markAll writes the comment of the format into each open document that needs it. */
  private markAll(): void {
    for (const document of vscode.workspace.textDocuments) {
      this.mark(document);
    }
  }

  /**
   * mark writes the comment of the format into a document with notes that an editor shows, when the document has no
   * comment or one of an older text ([R-NOTE-007](../docs/requirements.md#r-note-007); Hannes, 2026-10-28: "as soon as
   * a note is detected, the "DOCTYPE" is written"). The document then has an unsaved change. The extension checks each
   * document once after it opens, so that Undo removes the comment for good; a later change of a note writes it again.
   * A document whose comment names a newer version of the format stays as it is.
   * @param document - The document.
   */
  private mark(document: vscode.TextDocument): void {
    const key = document.uri.toString();
    if (this.marked.has(key) || document.isClosed || !this.entries.get(key)?.length || !this.settingsOf(document.uri).addFormatComment || !isShown(document)) {
      return;
    }
    this.marked.add(key);
    const lines = linesOf(document);
    const edit = newerFormat(lines) === undefined ? doctypeEdit(lines, true) : undefined;
    if (edit) {
      void this.apply(document, [edit]);
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
    const created =
      thread ??
      (showsInline(this.settingsOf(document.uri)) ? this.controller.createCommentThread(document.uri, threadRangeOf(note), []) : hiddenThread(document.uri, threadRangeOf(note)));
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
    const answers = entry.note.answers;
    const comments = answers.map((answer, index) => {
      const old = entry.comments[index];
      const parent = answer.parent === undefined ? undefined : { index: answer.parent, author: answers[answer.parent].author };
      return old && old.index !== undefined && old.mode === vscode.CommentMode.Editing ? old : new NoteComment(entry.thread, index, document, answer, parent);
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
    const range = threadRangeOf(note);
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
   * show sets the mode of a comment and shows it in its thread: in the editing mode with the text as the document
   * holds it, else with the links to files that run the command openLinkCommand.
   * @param comment - The comment.
   * @param mode - The mode.
   */
  private show(comment: NoteComment, mode: vscode.CommentMode): void {
    comment.mode = mode;
    comment.body = (mode === vscode.CommentMode.Editing ? editable : markdown)(comment.text(), comment.thread.uri);
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
   * @param index - The index of the answer.
   * @param text - The text of the editor.
   * @param written - Runs after the edit and before the notes are read again.
   */
  saveAnswer(document: vscode.Uri, id: string, index: number, text: string, written?: () => void): Promise<Problem | undefined> {
    const date = formatDate(new Date());
    return this.change(document, id, (lines, note) => (index < note.answers.length ? replaceAnswer(lines, note, index, normalizeBody(text), date) : { problem: { kind: 'missing' } }), () => true, written);
  }

  /**
   * answer adds a reply of the signed-in user to an answer of a note, by default to the first answer, which is a reply
   * to the note ([R-EDIT-005](../docs/requirements.md#r-edit-005)).
   * @param document - The URI of the document.
   * @param id - The identifier of the thread of the note.
   * @param text - The text of the answer.
   * @param written - Runs after the edit and before the notes are read again.
   * @param parent - The index of the answer that the reply replies to.
   */
  async answer(document: vscode.Uri, id: string, text: string, written?: () => void, parent = 0): Promise<Problem | undefined> {
    const author = await this.authorOf();
    if (!author) {
      return { kind: 'signIn' };
    }
    return this.change(document, id, (lines, note) => appendAnswer(lines, note, normalizeBody(text), { author, date: formatDate(new Date()) }, parent), () => true, written);
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
   * addNote adds a note of the signed-in user for a range of a document ([R-EDIT-003](../docs/requirements.md#r-edit-003)):
   * with a selection of the range in the text of a paragraph or a heading, or for its line elsewhere.
   * @param uri - The URI of the document.
   * @param range - The range, for example the selection of the text editor or the range of the thread of the `+`.
   * @param text - The text of the note.
   * @param thread - The thread of the `+`, which becomes the thread of the note, or undefined for a new thread.
   * @returns The identifier of the thread of the new note, or the problem that prevents it.
   */
  async addNote(uri: vscode.Uri, range: vscode.Range, text: string, thread?: vscode.CommentThread): Promise<{ id: string } | { problem: Problem }> {
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
    const result = insertNote(before, range, normalizeBody(text), { author, date: formatDate(new Date()) });
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
    const entry = this.create(document, note, document.getText(rangeOf(note)), thread);
    entry.thread.range = threadRangeOf(note);
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
    const result = await this.addNote(thread.uri, thread.range ?? new vscode.Range(0, 0, 0, 0), text, thread);
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
    const problem = await this.answer(
      thread.uri,
      entry.id,
      text,
      () => {
        if (draft) {
          entry.comments = entry.comments.filter((comment) => comment !== draft);
        }
      },
      draft?.parent?.index ?? 0,
    );
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
   * startReply opens an editor of a new reply to the answer of a comment, after the answers in its box.
   * @param comment - The comment of the answer.
   */
  private startReply(comment: NoteComment): void {
    const entry = this.entryOfThread(comment.thread);
    const answer = comment.index === undefined ? undefined : entry?.note.answers[comment.index];
    if (!entry || !answer || comment.index === undefined) {
      return;
    }
    const reply = new NoteComment(comment.thread, undefined, comment.thread.uri, { body: '', author: undefined }, { index: comment.index, author: answer.author });
    reply.label = `Reply to ${answer.author}`;
    reply.mode = vscode.CommentMode.Editing;
    entry.comments = [...entry.comments, reply];
    entry.thread.comments = entry.comments;
    entry.thread.collapsibleState = vscode.CommentThreadCollapsibleState.Expanded;
  }

  /**
   * deleteFrom removes the answer of a comment. Undo in the editor brings it back.
   * @param comment - The comment of the answer.
   */
  private async deleteFrom(comment: NoteComment): Promise<void> {
    const entry = this.entryOfThread(comment.thread);
    if (entry && comment.index !== undefined) {
      showProblem(await this.deleteAnswer(comment.thread.uri, entry.id, comment.index));
    }
  }

  /**
   * deleteThread removes the note of a thread with all its answers. Undo in the editor brings it back.
   * @param thread - The thread.
   */
  private async deleteThread(thread: vscode.CommentThread): Promise<void> {
    const entry = this.entryOfThread(thread);
    if (entry) {
      showProblem(await this.deleteNote(thread.uri, entry.id));
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
