// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests run the activation of the extension with a fake of the API of
 * VS Code. They check that every registration can be removed, that the export
 * renders the callouts with the settings of the document (R-PREV-001,
 * R-PREV-003), and the threads of the notes in the text editor and the
 * Comments view (R-TEXT-001, R-VIEW-001): their places and contents, the
 * editor of a box (R-EDIT-001), the save (R-EDIT-002), the new note with its
 * author and date (R-EDIT-003), the delete (R-EDIT-004), the refused text
 * (R-NOTE-003), the warning at a nested note, the folding, and the reading of
 * the notes after a change of a document or of a setting.
 */

import MarkdownIt from 'markdown-it';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { noteClass } from './markdown/markdownIt';
import { commands as noteCommands, controllerId, draftContext, noteContext } from './noteThreads';
import { settingsSection } from './settings';

// The static import of the module of the threads reads only its constants; each test imports the extension with the
// fake of the editor API anew.
vi.mock('vscode', () => ({}));

/** FakeUri stands for a vscode.Uri. */
class FakeUri {
  constructor(
    readonly scheme: string,
    readonly path: string,
  ) {}

  static parse(text: string): FakeUri {
    const colon = text.indexOf(':');
    return new FakeUri(text.slice(0, colon), text.slice(colon + 1));
  }

  toString(): string {
    return `${this.scheme}:${this.path}`;
  }
}

/** FakePosition stands for a vscode.Position. */
interface FakePosition {
  line: number;
  character: number;
}

/** FakeRange stands for a vscode.Range. */
class FakeRange {
  readonly start: FakePosition;
  readonly end: FakePosition;

  constructor(startLine: number, startCharacter: number, endLine: number, endCharacter: number) {
    this.start = { line: startLine, character: startCharacter };
    this.end = { line: endLine, character: endCharacter };
  }

  isEqual(other: FakeRange): boolean {
    return JSON.stringify([this.start, this.end]) === JSON.stringify([other.start, other.end]);
  }
}

/** FakeMarkdownString stands for a vscode.MarkdownString. */
class FakeMarkdownString {
  supportHtml = false;
  baseUri: FakeUri | undefined;

  constructor(readonly value: string) {}
}

/** FakeWorkspaceEdit stands for a vscode.WorkspaceEdit. */
class FakeWorkspaceEdit {
  readonly replacements: { uri: FakeUri; range: FakeRange; text: string }[] = [];

  replace(uri: FakeUri, range: FakeRange, text: string): void {
    this.replacements.push({ uri, range, text });
  }
}

/** FakeDiagnostic stands for a vscode.Diagnostic. */
class FakeDiagnostic {
  source: string | undefined;

  constructor(
    readonly range: FakeRange,
    readonly message: string,
    readonly severity: number,
  ) {}
}

/** FakeFoldingRange stands for a vscode.FoldingRange. */
class FakeFoldingRange {
  constructor(
    readonly start: number,
    readonly end: number,
    readonly kind: number,
  ) {}
}

/** FakeComment is the part of a vscode.Comment that the tests read and that VS Code writes. */
interface FakeComment {
  body: FakeMarkdownString | string;
  mode: number;
  author: { name: string };
  timestamp: Date | undefined;
  label: string | undefined;
  contextValue: string;
}

/** FakeThread stands for a vscode.CommentThread. */
class FakeThread {
  canReply = true;
  label: string | undefined;
  contextValue: string | undefined;
  collapsibleState = 0;
  disposed = false;

  constructor(
    readonly uri: FakeUri,
    public range: FakeRange | undefined,
    public comments: FakeComment[],
  ) {
    threads.push(this);
  }

  dispose(): void {
    this.disposed = true;
  }
}

/** FakeDocument stands for a vscode.TextDocument. */
class FakeDocument {
  version = 1;
  isClosed = false;

  constructor(
    readonly uri: FakeUri,
    public text: string,
    readonly languageId = 'markdown',
    readonly eol = 1,
  ) {}

  get lineCount(): number {
    return this.text.split(/\r\n|\r|\n/).length;
  }

  /** offsetAt returns the offset of a position of the text. */
  offsetAt(position: FakePosition): number {
    const lines = this.text.split(/(?<=\n)|(?<=\r)(?!\n)/);
    return lines.slice(0, position.line).reduce((sum, line) => sum + line.length, 0) + position.character;
  }

  getText(range?: FakeRange): string {
    return range ? this.text.slice(this.offsetAt(range.start), this.offsetAt(range.end)) : this.text;
  }
}

/** threads are the comment threads that the extension created. */
let threads: FakeThread[];
/** openDocuments are the open documents of the fake. */
let openDocuments: FakeDocument[];
/** settingsOf holds the values of the settings of the fake, by the path of a document; '' is the window. */
let settingsOf: Map<string, Record<string, unknown>>;
/** registeredCommands are the handlers of the registered commands, by their names. */
let registeredCommands: Map<string, (...args: unknown[]) => unknown>;
/** executed records the executed commands. */
let executed: string[];
/** errors records the error messages that the extension showed. */
let errors: string[];
/** diagnostics holds the warnings of each document, by its URI. */
let diagnostics: Map<string, FakeDiagnostic[]>;
/** foldingProviders are the folding providers by their language. */
let foldingProviders: Map<string, { provideFoldingRanges(document: FakeDocument): FakeFoldingRange[] }>;
/** listeners are the event listeners by the name of their event. */
let listeners: Map<string, ((event: unknown) => void)[]>;
/** controller is the comment controller that the extension created. */
let controller: { id: string; options?: unknown; commentingRangeProvider?: { provideCommentingRanges(document: FakeDocument): FakeRange[] } } | undefined;
/** gitUser is the user.name of the Git configuration of the fake repository, or undefined for no repository. */
let gitUser: string | undefined;
/** disposables are the registrations that the fake API returned. */
let disposables: { dispose(): void; disposed: boolean }[];

/** disposable returns a new registration of the fake API and records it. */
const disposable = () => {
  const registration = {
    disposed: false,
    dispose() {
      this.disposed = true;
    },
  };
  disposables.push(registration);
  return registration;
};

/**
 * on returns the fake of an event of the API.
 * @param name - The name of the event.
 */
const on = (name: string) => (listener: (event: unknown) => void) => {
  listeners.set(name, [...(listeners.get(name) ?? []), listener]);
  return disposable();
};

/**
 * fire calls the listeners of an event.
 * @param name - The name of the event.
 * @param event - The event.
 */
const fire = (name: string, event: unknown): void => {
  for (const listener of listeners.get(name) ?? []) {
    listener(event);
  }
};

/**
 * applyEdit applies a workspace edit to the open documents, as VS Code does, and fires the change event.
 * @param edit - The edit.
 */
const applyEdit = async (edit: FakeWorkspaceEdit): Promise<boolean> => {
  for (const { uri, range, text } of edit.replacements) {
    const document = openDocuments.find((candidate) => candidate.uri.toString() === uri.toString())!;
    document.text = document.text.slice(0, document.offsetAt(range.start)) + text + document.text.slice(document.offsetAt(range.end));
    document.version++;
    fire('change', { document });
  }
  return true;
};

beforeEach(() => {
  vi.useFakeTimers();
  threads = [];
  openDocuments = [];
  settingsOf = new Map();
  registeredCommands = new Map();
  executed = [];
  errors = [];
  diagnostics = new Map();
  foldingProviders = new Map();
  listeners = new Map();
  controller = undefined;
  gitUser = undefined;
  disposables = [];
  vi.resetModules();
  vi.doMock('vscode', () => ({
    Uri: FakeUri,
    Range: FakeRange,
    MarkdownString: FakeMarkdownString,
    WorkspaceEdit: FakeWorkspaceEdit,
    Diagnostic: FakeDiagnostic,
    FoldingRange: FakeFoldingRange,
    CommentMode: { Editing: 0, Preview: 1 },
    CommentThreadCollapsibleState: { Collapsed: 0, Expanded: 1 },
    DiagnosticSeverity: { Error: 0, Warning: 1 },
    FoldingRangeKind: { Comment: 1 },
    EndOfLine: { LF: 1, CRLF: 2 },
    comments: {
      createCommentController: (id: string) => {
        controller = Object.assign(disposable(), {
          id,
          createCommentThread: (uri: FakeUri, range: FakeRange, comments: FakeComment[]) => new FakeThread(uri, range, comments),
        });
        return controller;
      },
    },
    languages: {
      createDiagnosticCollection: () =>
        Object.assign(disposable(), {
          set: (uri: FakeUri, list: FakeDiagnostic[]) => diagnostics.set(uri.toString(), list),
          delete: (uri: FakeUri) => diagnostics.delete(uri.toString()),
        }),
      registerFoldingRangeProvider: (language: string, provider: { provideFoldingRanges(document: FakeDocument): FakeFoldingRange[] }) => {
        foldingProviders.set(language, provider);
        return disposable();
      },
    },
    commands: {
      registerCommand: (command: string, handler: (...args: unknown[]) => unknown) => {
        registeredCommands.set(command, handler);
        return disposable();
      },
      executeCommand: async (command: string) => {
        executed.push(command);
      },
    },
    window: {
      showErrorMessage: async (message: string) => {
        errors.push(message);
      },
    },
    workspace: {
      getConfiguration: (section: string, scope?: FakeUri) => {
        expect(section).toBe(settingsSection);
        const values = { ...settingsOf.get(''), ...settingsOf.get(scope?.path ?? '') };
        return { get: (key: string) => values[key] };
      },
      get textDocuments() {
        return openDocuments;
      },
      openTextDocument: async (uri: FakeUri) => openDocuments.find((document) => document.uri.toString() === uri.toString()),
      applyEdit,
      fs: { isWritableFileSystem: (scheme: string) => (scheme === 'file' ? true : scheme === 'git' ? false : undefined) },
      onDidOpenTextDocument: on('open'),
      onDidChangeTextDocument: on('change'),
      onDidCloseTextDocument: on('close'),
      onDidChangeConfiguration: on('configuration'),
    },
    extensions: {
      getExtension: (id: string) => {
        if (id === 'vscode.markdown-language-features') {
          return { isActive: true };
        }
        if (id === 'vscode.git') {
          const repository = gitUser === undefined ? null : { getConfig: async () => gitUser, getGlobalConfig: async () => '' };
          return { isActive: true, exports: { getAPI: () => ({ getRepository: () => repository }) } };
        }
        return undefined;
      },
    },
  }));
});

afterEach(() => {
  vi.useRealTimers();
});

/**
 * open adds an open document to the fake.
 * @param text - The text of the document.
 * @param path - The path of the document.
 * @param options - The scheme and the language of the document.
 */
const open = (text: string, path = '/folder/a.md', options: { scheme?: string; languageId?: string } = {}): FakeDocument => {
  const document = new FakeDocument(new FakeUri(options.scheme ?? 'file', path), text, options.languageId);
  openDocuments.push(document);
  return document;
};

/** activate imports the extension with the fake API and activates it. */
const activate = async () => {
  const extension = await import('./extension');
  const context = { subscriptions: [] as { dispose(): void }[] };
  const api = extension.activate(context as never);
  return { api, context, extension };
};

/**
 * run runs a registered command and waits for its promises.
 * @param command - The command.
 * @param args - Its arguments.
 */
const run = async (command: string, ...args: unknown[]): Promise<void> => {
  await registeredCommands.get(command)!(...args);
  await vi.advanceTimersByTimeAsync(0);
};

/**
 * live returns the threads that were not disposed.
 */
const live = (): FakeThread[] => threads.filter((thread) => !thread.disposed);

/**
 * bodyOf returns the text of the body of the comment of a thread.
 * @param thread - The thread.
 */
const bodyOf = (thread: FakeThread): string => {
  const body = thread.comments[0].body;
  return typeof body === 'string' ? body : body.value;
};

/** note is a Markdown text with one note with a front matter. */
const note = '# Title\n\n<!-- note\n---\nauthor: Ann\ndate: 2026-10-28T10:15+01:00\n---\nThe **text**.\n-->\n\nMore.\n';

test('the activation registers the commands of the buttons, and the disposal of the context removes every registration', async () => {
  const { context, extension } = await activate();
  expect([...registeredCommands.keys()].sort()).toEqual(Object.values(noteCommands).sort());
  expect(controller?.id).toBe(controllerId);
  expect(typeof extension.deactivate).toBe('function');
  expect(disposables.length).toBeGreaterThan(0);
  for (const subscription of context.subscriptions) {
    subscription.dispose();
  }
  expect(disposables.filter((registration) => !registration.disposed)).toEqual([]);
});

test('the export renders the callouts with the setting showInPreview of the rendered document (R-PREV-001, R-PREV-003)', async () => {
  const { api } = await activate();
  const md = api.extendMarkdownIt(new MarkdownIt({ html: true }));
  expect(md.render(note)).toContain(noteClass);
  const document = new FakeUri('file', '/folder/hidden.md');
  settingsOf.set(document.path, { showInPreview: false });
  expect(md.render(note, { currentDocument: document })).not.toContain(noteClass);
  expect(md.render(note, { currentDocument: new FakeUri('file', '/folder/other.md') })).toContain(noteClass);
});

test('a note of an open Markdown document gets a collapsed thread with its body, author and date (R-TEXT-001, R-VIEW-001)', async () => {
  const document = open(note);
  open(note, '/folder/a.txt', { languageId: 'plaintext' });
  open(note, '/folder/a.md', { scheme: 'git' });
  await activate();
  expect(live()).toHaveLength(1);
  const [thread] = live();
  expect(thread.uri).toBe(document.uri);
  expect(thread.range).toEqual(new FakeRange(2, 0, 8, 3));
  expect(thread).toMatchObject({ canReply: false, contextValue: noteContext, collapsibleState: 0, label: 'Markdown note' });
  expect(thread.comments).toHaveLength(1);
  expect(thread.comments[0]).toMatchObject({ author: { name: 'Ann' }, mode: 1, contextValue: noteContext, label: undefined });
  expect(thread.comments[0].timestamp?.toISOString()).toBe('2026-10-28T09:15:00.000Z');
  expect(thread.comments[0].body).toMatchObject({ value: 'The **text**.', supportHtml: true, baseUri: document.uri });
  // The `+` of a new note is at every line of a document that can have notes.
  expect(controller?.commentingRangeProvider?.provideCommentingRanges(document)).toEqual([new FakeRange(0, 0, 11, 0)]);
  expect(controller?.commentingRangeProvider?.provideCommentingRanges(openDocuments[2])).toEqual([]);
});

test('a note without a front matter names no author, and a date of another form shows as written', async () => {
  open('<!-- note\nText\n-->\n\n<!-- note\n---\ndate: last week\n---\nText\n-->\n');
  await activate();
  expect(live().map((thread) => [thread.comments[0].author.name, thread.comments[0].timestamp, thread.comments[0].label])).toEqual([
    ['Note', undefined, undefined],
    ['Note', undefined, 'last week'],
  ]);
});

test('the setting expandInEditor opens the boxes, and a change of a setting builds the threads anew and refreshes the previews', async () => {
  open(note);
  await activate();
  expect(live()[0].collapsibleState).toBe(0);
  settingsOf.set('', { expandInEditor: true });
  fire('configuration', { affectsConfiguration: (section: string) => section === settingsSection });
  expect(live()).toHaveLength(1);
  expect(live()[0].collapsibleState).toBe(1);
  expect(executed).toEqual(['markdown.preview.refresh']);
  // A change of another setting changes nothing.
  fire('configuration', { affectsConfiguration: () => false });
  expect(executed).toHaveLength(1);
});

test('Edit Note opens the editor of the box, and Save writes the text into the comment of the note (R-EDIT-001, R-EDIT-002)', async () => {
  const document = open(note);
  await activate();
  const [thread] = live();
  const comment = thread.comments[0];
  await run(noteCommands.editNote, comment);
  expect(comment.mode).toBe(0);
  // VS Code sets the body to the text of the editor before the button runs.
  comment.body = new FakeMarkdownString('A new *text*.\n\nWith a second paragraph.\n');
  await run(noteCommands.saveNote, comment);
  expect(document.text).toBe(
    '# Title\n\n<!-- note\n---\nauthor: Ann\ndate: 2026-10-28T10:15+01:00\n---\nA new *text*.\n\nWith a second paragraph.\n-->\n\nMore.\n',
  );
  expect(errors).toEqual([]);
  // The thread stays, with the saved text, in the preview mode.
  await vi.advanceTimersByTimeAsync(1000);
  expect(live()).toEqual([thread]);
  expect(thread.range).toEqual(new FakeRange(2, 0, 10, 3));
  expect(bodyOf(thread)).toBe('A new *text*.\n\nWith a second paragraph.');
  expect(thread.comments[0].mode).toBe(1);
});

test('Save keeps the line breaks of a document with CRLF', async () => {
  const document = new FakeDocument(new FakeUri('file', '/folder/crlf.md'), 'Text\r\n\r\n<!-- note\r\nOld\r\n-->\r\n', 'markdown', 2);
  openDocuments.push(document);
  await activate();
  const comment = live()[0].comments[0];
  comment.body = new FakeMarkdownString('One\n\nTwo');
  await run(noteCommands.saveNote, comment);
  expect(document.text).toBe('Text\r\n\r\n<!-- note\r\nOne\r\n\r\nTwo\r\n-->\r\n');
});

test('Save refuses a text with another comment, shows why and opens the editor with the text again (R-NOTE-003)', async () => {
  const document = open(note);
  await activate();
  const comment = live()[0].comments[0];
  await run(noteCommands.editNote, comment);
  comment.body = new FakeMarkdownString('A <!-- comment --> in the note');
  await run(noteCommands.saveNote, comment);
  expect(document.text).toBe(note);
  expect(errors).toEqual(['The note was not saved: a note must not contain another comment. Remove "<!--" from its text.']);
  expect(comment.mode).toBe(1);
  await vi.advanceTimersByTimeAsync(300);
  expect(comment.mode).toBe(0);
  expect(bodyOf(live()[0])).toBe('A <!-- comment --> in the note');
});

test('Cancel closes the editor and shows the note as the document holds it', async () => {
  open(note);
  await activate();
  const comment = live()[0].comments[0];
  await run(noteCommands.editNote, comment);
  comment.body = new FakeMarkdownString('Not saved');
  await run(noteCommands.cancelEdit, comment);
  expect(comment.mode).toBe(1);
  expect(bodyOf(live()[0])).toBe('The **text**.');
});

test('Add Note writes a new note after the block of the line, with the author of the setting and the date (R-EDIT-003)', async () => {
  vi.setSystemTime(new Date(2026, 9, 28, 10, 15));
  const document = open('# Title\n\nFirst line\nsecond line\n\nLast.\n');
  settingsOf.set('', { author: 'Hannes' });
  await activate();
  // VS Code creates the thread of the `+` at the line, without comments.
  const thread = new FakeThread(document.uri, new FakeRange(2, 0, 2, 0), []);
  await run(noteCommands.addNote, { thread, text: 'A **new** note.' });
  expect(document.text).toMatch(/^# Title\n\nFirst line\nsecond line\n<!-- note\n---\nauthor: Hannes\ndate: 2026-10-28T10:15[+-]\d{2}:\d{2}\n---\nA \*\*new\*\* note\.\n-->\n\nLast\.\n$/);
  // The thread of the `+` becomes the thread of the note.
  await vi.advanceTimersByTimeAsync(1000);
  expect(live()).toEqual([thread]);
  expect(thread).toMatchObject({ canReply: false, contextValue: noteContext, collapsibleState: 1, range: new FakeRange(4, 0, 10, 3) });
  expect(thread.comments[0]).toMatchObject({ author: { name: 'Hannes' }, mode: 1, contextValue: noteContext });
  expect(bodyOf(thread)).toBe('A **new** note.');
});

test('Add Note takes the author from user.name of Git when the setting is empty, and names none without it', async () => {
  const document = open('Text\n');
  gitUser = 'Git User';
  await activate();
  await run(noteCommands.addNote, { thread: new FakeThread(document.uri, new FakeRange(0, 0, 0, 0), []), text: 'One' });
  expect(document.text).toContain('author: Git User\n');
  gitUser = undefined;
  const other = open('Text\n', '/folder/b.md');
  await run(noteCommands.addNote, { thread: new FakeThread(other.uri, new FakeRange(0, 0, 0, 0), []), text: 'Two' });
  expect(other.text).not.toContain('author:');
  expect(other.text).toContain('date: ');
});

test('Add Note refuses a text with another comment and keeps it in an editor of the box, which Save writes after a fix', async () => {
  const document = open('Text\n');
  await activate();
  const thread = new FakeThread(document.uri, new FakeRange(0, 0, 0, 0), []);
  await run(noteCommands.addNote, { thread, text: 'Bad <!-- text' });
  expect(document.text).toBe('Text\n');
  expect(errors).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(300);
  const draft = thread.comments[0];
  expect(draft).toMatchObject({ mode: 0, contextValue: draftContext });
  expect(thread.contextValue).toBe(draftContext);
  draft.body = new FakeMarkdownString('Good text');
  await run(noteCommands.saveNote, draft);
  expect(document.text).toMatch(/^Text\n<!-- note\n---\ndate: .*\n---\nGood text\n-->\n$/);
  await vi.advanceTimersByTimeAsync(1000);
  expect(live()).toEqual([thread]);
  expect(thread.comments[0].contextValue).toBe(noteContext);
});

test('Cancel of a new note removes its box', async () => {
  const document = open('Text\n');
  await activate();
  const thread = new FakeThread(document.uri, new FakeRange(0, 0, 0, 0), []);
  await run(noteCommands.discardNewNote, { thread, text: '' });
  expect(thread.disposed).toBe(true);
});

test('Delete Note removes the note from the document and its thread (R-EDIT-004)', async () => {
  const document = open(note);
  await activate();
  await run(noteCommands.deleteNote, live()[0].comments[0]);
  expect(document.text).toBe('# Title\n\nMore.\n');
  expect(live()).toEqual([]);
});

test('after a change of a document and a pause, the threads follow their notes', async () => {
  const document = open(note);
  await activate();
  const [thread] = live();
  document.text = `Intro.\n\n${note}<!-- note\nSecond\n-->\n`;
  document.version++;
  fire('change', { document });
  // The notes are read again only after the pause.
  expect(live()).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(300);
  expect(live()).toHaveLength(2);
  expect(live()[0]).toBe(thread);
  expect(thread.range).toEqual(new FakeRange(4, 0, 10, 3));
  expect(bodyOf(live()[1])).toBe('Second');
  // A closed document loses its threads.
  fire('close', document);
  expect(live()).toEqual([]);
});

test('a note that holds the start of another comment gets a warning (R-NOTE-003)', async () => {
  const document = open('<!-- note\nA <!-- b\n-->\n');
  await activate();
  expect(diagnostics.get(document.uri.toString())).toMatchObject([{ range: new FakeRange(0, 0, 2, 3), severity: 1, source: 'Markdown Notes' }]);
});

test('the editor folds each note of several lines on lines of its own', async () => {
  const document = open(`${note}\nA sentence <!-- note\nInline\n--> end.\n`);
  await activate();
  expect(foldingProviders.get('markdown')?.provideFoldingRanges(document)).toEqual([new FakeFoldingRange(2, 8, 1)]);
});
