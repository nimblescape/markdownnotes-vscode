// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * A fake of the part of the API of VS Code that the extension uses, for the
 * unit tests of the activation, the threads and the side view. A test creates
 * a new fake for each test, gives it to `vi.doMock('vscode', ...)`, and reads
 * what the extension did: the threads, the decorations, the messages, the
 * edits of the documents and the messages to the side view. The fake applies
 * a workspace edit to its documents and fires the change event, as VS Code
 * does.
 */

/** FakeUri stands for a vscode.Uri. */
export class FakeUri {
  constructor(
    readonly scheme: string,
    readonly path: string,
    readonly query = '',
    readonly authority = '',
    readonly fragment = '',
  ) {}

  static parse(text: string): FakeUri {
    const match = /^([a-z][\w+.-]*):(?:\/\/([^/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/i.exec(text);
    if (!match) {
      throw new Error(`no URI: ${text}`);
    }
    return new FakeUri(match[1], decodeURIComponent(match[3]), match[4] ?? '', match[2] ?? '', match[5] ?? '');
  }

  /** joinPath joins the path of a URI with parts, and resolves the parts "." and "..", as the posix paths do. */
  static joinPath(base: FakeUri, ...parts: string[]): FakeUri {
    const segments: string[] = [];
    for (const segment of [base.path, ...parts].join('/').split('/')) {
      if (segment === '..') {
        segments.pop();
      } else if (segment !== '' && segment !== '.') {
        segments.push(segment);
      }
    }
    return new FakeUri(base.scheme, `/${segments.join('/')}`, '', base.authority);
  }

  with(change: { path?: string; fragment?: string }): FakeUri {
    return new FakeUri(this.scheme, change.path ?? this.path, this.query, this.authority, change.fragment ?? this.fragment);
  }

  toString(): string {
    const authority = this.authority ? `//${this.authority}` : '';
    return `${this.scheme}:${authority}${this.path}${this.query ? `?${this.query}` : ''}${this.fragment ? `#${this.fragment}` : ''}`;
  }
}

/** FakePosition stands for a vscode.Position. */
export class FakePosition {
  constructor(
    readonly line: number,
    readonly character: number,
  ) {}
}

/** FakeRange stands for a vscode.Range. */
export class FakeRange {
  readonly start: FakePosition;
  readonly end: FakePosition;

  constructor(...args: [number, number, number, number] | [FakePosition, FakePosition]) {
    if (args.length === 2) {
      [this.start, this.end] = args;
    } else {
      this.start = new FakePosition(args[0], args[1]);
      this.end = new FakePosition(args[2], args[3]);
    }
  }

  isEqual(other: FakeRange): boolean {
    return JSON.stringify([this.start, this.end]) === JSON.stringify([other.start, other.end]);
  }
}

/** FakeMarkdownString stands for a vscode.MarkdownString. */
export class FakeMarkdownString {
  supportHtml = false;
  baseUri: FakeUri | undefined;

  constructor(readonly value: string) {}
}

/** FakeWorkspaceEdit stands for a vscode.WorkspaceEdit. */
export class FakeWorkspaceEdit {
  readonly replacements: { uri: FakeUri; range: FakeRange; text: string }[] = [];

  replace(uri: FakeUri, range: FakeRange, text: string): void {
    this.replacements.push({ uri, range, text });
  }
}

/** FakeDiagnostic stands for a vscode.Diagnostic. */
export class FakeDiagnostic {
  source: string | undefined;

  constructor(
    readonly range: FakeRange,
    readonly message: string,
    readonly severity: number,
  ) {}
}

/** FakeFoldingRange stands for a vscode.FoldingRange. */
export class FakeFoldingRange {
  constructor(
    readonly start: number,
    readonly end: number,
    readonly kind: number,
  ) {}
}

/** FakeComment is the part of a vscode.Comment that the tests read and that VS Code writes. */
export interface FakeComment {
  body: FakeMarkdownString | string;
  mode: number;
  author: { name: string };
  timestamp: Date | undefined;
  label: string | undefined;
  contextValue: string;
}

/** FakeDocument stands for a vscode.TextDocument. */
export class FakeDocument {
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

/** FakeEditor stands for a vscode.TextEditor. */
export class FakeEditor {
  /** decorations holds the ranges of each decoration type. */
  readonly decorations = new Map<object, FakeRange[]>();
  selection: { active: FakePosition };

  constructor(
    readonly document: FakeDocument,
    line = 0,
    readonly viewColumn = 1,
  ) {
    this.selection = { active: new FakePosition(line, 0) };
  }

  setDecorations(type: object, ranges: FakeRange[]): void {
    this.decorations.set(type, ranges);
  }
}

/** FakeView stands for a vscode.WebviewView of the side view. */
export class FakeView {
  visible = true;
  /** messages are the messages that the extension sent to the script of the view. */
  readonly messages: { type: string; [key: string]: unknown }[] = [];
  /** listeners are the listeners of the messages of the script. */
  readonly listeners: ((message: unknown) => unknown)[] = [];
  readonly visibility: (() => void)[] = [];
  readonly disposals: (() => void)[] = [];
  readonly webview = {
    options: {} as Record<string, unknown>,
    html: '',
    cspSource: 'vscode-resource:',
    asWebviewUri: (uri: FakeUri) => uri,
    postMessage: async (message: { type: string }) => {
      this.messages.push(message);
      return true;
    },
    onDidReceiveMessage: (listener: (message: unknown) => unknown) => {
      this.listeners.push(listener);
      return { dispose() {} };
    },
  };

  onDidChangeVisibility(listener: () => void) {
    this.visibility.push(listener);
    return { dispose() {} };
  }

  onDidDispose(listener: () => void) {
    this.disposals.push(listener);
    return { dispose() {} };
  }

  /** send sends a message of the script to the extension and waits for its handling. */
  async send(message: unknown): Promise<void> {
    await Promise.all(this.listeners.map((listener) => listener(message)));
  }

  /** state returns the last state that the extension sent. */
  state() {
    return [...this.messages].reverse().find((message) => message.type === 'state') as unknown as {
      file: string | undefined;
      line: number | undefined;
      account: string | undefined;
      selected: string | undefined;
      threads: { id: string; line: number; kind: string; nested: boolean; answers: { author: string; date: string; body: string; html: string }[] }[];
    };
  }
}

/** FakeThread stands for a vscode.CommentThread. */
export class FakeThread {
  canReply = true;
  label: string | undefined;
  contextValue: string | undefined;
  collapsibleState = 0;
  disposed = false;

  constructor(
    readonly fake: Fake,
    readonly uri: FakeUri,
    public range: FakeRange | undefined,
    public comments: FakeComment[],
  ) {
    fake.threads.push(this);
  }

  dispose(): void {
    this.disposed = true;
  }
}

/** Registration is a registration of the fake API, which records its disposal. */
export interface Registration {
  dispose(): void;
  disposed: boolean;
}

/** Fake is the fake API with the records of what the extension did. */
export class Fake {
  threads: FakeThread[] = [];
  documents: FakeDocument[] = [];
  editors: FakeEditor[] = [];
  activeEditor: FakeEditor | undefined;
  /** settings holds the values of the settings, by the path of a document; '' is the user, 'workspace' the workspace. */
  settings = new Map<string, Record<string, unknown>>();
  commands = new Map<string, (...args: unknown[]) => unknown>();
  /** executed records the executed commands that the fake does not register. */
  executed: string[] = [];
  /** calls records the arguments of the executed commands, other than markdown.api.render. */
  calls: { command: string; args: unknown[] }[] = [];
  /** external records the URIs that the extension opened with the system. */
  external: string[] = [];
  /** warnings records the questions of the extension; the answer is the item that the user picks, or undefined. */
  warnings: string[] = [];
  answer: string | undefined;
  /** updates records the changes of settings: the key, the value and the target. */
  updates: { key: string; value: unknown; target: number }[] = [];
  /** directories holds the paths of the folders of the file system. */
  directories = new Set<string>();
  /** rendered is the result of the command markdown.api.render for a text, or undefined for none. */
  rendered: ((text: string) => string) | undefined = (text) => `<p>${text}</p>\n`;
  errors: string[] = [];
  diagnostics = new Map<string, FakeDiagnostic[]>();
  folding = new Map<string, { provideFoldingRanges(document: FakeDocument): FakeFoldingRange[] }>();
  listeners = new Map<string, ((event: unknown) => void)[]>();
  controller: { id: string; options?: unknown; commentingRangeProvider?: { provideCommentingRanges(document: FakeDocument): FakeRange[] } } | undefined;
  /** login is the GitHub login of the session; undefined means no session, and a sign-in is refused. */
  login: string | undefined;
  /** signIn is the login that a sign-in gives, or undefined when the user cancels it. */
  signIn: string | undefined;
  /** sessions records the options of each request of a session. */
  sessions: { provider: string; scopes: readonly string[]; options: unknown }[] = [];
  views = new Map<string, { resolveWebviewView(view: FakeView): void }>();
  uriHandler: { handleUri(uri: FakeUri): unknown } | undefined;
  /** shown records the documents and the options of showTextDocument. */
  shown: { document: FakeDocument; options: unknown }[] = [];
  /** workspaceFolder is the path of the folder of the workspace. */
  workspaceFolder = '/folder/';
  /** files holds the texts of the files that are not open, by their paths; openTextDocument opens them. */
  files = new Map<string, string>();
  registrations: Registration[] = [];
  /** api is the module `vscode` of the fake. */
  readonly api: Record<string, unknown>;

  constructor() {
    // The getters of the API read the fields of this fake.
    const fake = this;
    const on = (name: string) => (listener: (event: unknown) => void) => {
      this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
      return this.registration();
    };
    this.api = {
      Uri: FakeUri,
      Position: FakePosition,
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
      FileType: { File: 1, Directory: 2 },
      ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
      env: {
        uriScheme: 'vscode',
        openExternal: async (uri: FakeUri) => {
          this.external.push(uri.toString());
          return true;
        },
      },
      comments: {
        createCommentController: (id: string) => {
          this.controller = Object.assign(this.registration(), {
            id,
            createCommentThread: (uri: FakeUri, range: FakeRange, comments: FakeComment[]) => new FakeThread(this, uri, range, comments),
          });
          return this.controller;
        },
      },
      languages: {
        createDiagnosticCollection: () =>
          Object.assign(this.registration(), {
            set: (uri: FakeUri, list: FakeDiagnostic[]) => this.diagnostics.set(uri.toString(), list),
            delete: (uri: FakeUri) => this.diagnostics.delete(uri.toString()),
          }),
        registerFoldingRangeProvider: (language: string, provider: { provideFoldingRanges(document: FakeDocument): FakeFoldingRange[] }) => {
          this.folding.set(language, provider);
          return this.registration();
        },
      },
      commands: {
        registerCommand: (command: string, handler: (...args: unknown[]) => unknown) => {
          this.commands.set(command, handler);
          return this.registration();
        },
        executeCommand: async (command: string, ...args: unknown[]) => {
          this.executed.push(command);
          if (command !== 'markdown.api.render') {
            this.calls.push({ command, args });
          }
          return command === 'markdown.api.render' && this.rendered ? this.rendered(args[0] as string) : undefined;
        },
      },
      window: {
        showErrorMessage: async (message: string) => {
          this.errors.push(message);
        },
        showWarningMessage: async (message: string) => {
          this.warnings.push(message);
          return this.answer;
        },
        createTextEditorDecorationType: (options: unknown) => Object.assign(this.registration(), { options }),
        get visibleTextEditors() {
          return fake.editors;
        },
        get activeTextEditor() {
          return fake.activeEditor;
        },
        onDidChangeVisibleTextEditors: on('visibleEditors'),
        onDidChangeActiveTextEditor: on('activeEditor'),
        onDidChangeTextEditorSelection: on('selection'),
        registerWebviewViewProvider: (id: string, provider: { resolveWebviewView(view: FakeView): void }) => {
          this.views.set(id, provider);
          return this.registration();
        },
        registerUriHandler: (handler: { handleUri(uri: FakeUri): unknown }) => {
          this.uriHandler = handler;
          return this.registration();
        },
        showTextDocument: async (document: FakeDocument, options: unknown) => {
          this.shown.push({ document, options });
        },
      },
      workspace: {
        getConfiguration: (section: string, scope?: FakeUri) => {
          const values = { ...this.settings.get(''), ...this.settings.get('workspace'), ...this.settings.get(scope?.path ?? '') };
          return {
            get: (key: string) => values[key],
            inspect: (key: string) => ({ globalValue: this.settings.get('')?.[key], workspaceValue: this.settings.get('workspace')?.[key] }),
            update: async (key: string, value: unknown, target: number) => {
              const scope = target === 2 ? 'workspace' : '';
              this.settings.set(scope, { ...this.settings.get(scope), [key]: value });
              this.updates.push({ key, value, target });
              this.fire('configuration', { affectsConfiguration: (name: string) => name === section || name === `${section}.${key}` });
            },
          };
        },
        get textDocuments() {
          return fake.documents;
        },
        openTextDocument: async (uri: FakeUri) => {
          const document = this.documents.find((candidate) => candidate.uri.toString() === uri.toString());
          if (document) {
            return document;
          }
          const text = this.files.get(uri.path);
          if (uri.scheme !== 'file' || text === undefined) {
            throw new Error(`no document ${uri.toString()}`);
          }
          return this.open(text, uri.path);
        },
        applyEdit: (edit: FakeWorkspaceEdit) => this.applyEdit(edit),
        getWorkspaceFolder: (uri: FakeUri) => (uri.path.startsWith(this.workspaceFolder) ? { uri: new FakeUri('file', this.workspaceFolder) } : undefined),
        fs: {
          isWritableFileSystem: (scheme: string) => (scheme === 'file' ? true : scheme === 'git' ? false : undefined),
          stat: async (uri: FakeUri) => {
            if (this.directories.has(uri.path)) {
              return { type: 2 };
            }
            if (this.files.has(uri.path) || this.documents.some((document) => document.uri.toString() === uri.toString())) {
              return { type: 1 };
            }
            throw new Error(`no file ${uri.toString()}`);
          },
        },
        onDidOpenTextDocument: on('open'),
        onDidChangeTextDocument: on('change'),
        onDidCloseTextDocument: on('close'),
        onDidChangeConfiguration: on('configuration'),
      },
      extensions: {
        getExtension: (id: string) => (id === 'vscode.markdown-language-features' ? { isActive: true } : undefined),
      },
      authentication: {
        getSession: async (provider: string, scopes: readonly string[], options: { createIfNone?: boolean; silent?: boolean }) => {
          this.sessions.push({ provider, scopes, options });
          if (this.login === undefined && options.createIfNone) {
            if (this.signIn === undefined) {
              throw new Error('User did not consent to login.');
            }
            this.login = this.signIn;
          }
          return this.login === undefined ? undefined : { account: { label: this.login, id: '1' }, accessToken: 'token', scopes };
        },
        onDidChangeSessions: on('sessions'),
      },
    };
  }

  /** registration returns a new registration of the fake API and records it. */
  registration(): Registration {
    const registration = {
      disposed: false,
      dispose() {
        this.disposed = true;
      },
    };
    this.registrations.push(registration);
    return registration;
  }

  /**
   * fire calls the listeners of an event.
   * @param name - The name of the event.
   * @param event - The event.
   */
  fire(name: string, event: unknown): void {
    for (const listener of this.listeners.get(name) ?? []) {
      listener(event);
    }
  }

  /**
   * applyEdit applies a workspace edit to the documents, as VS Code does, and fires the change event.
   * @param edit - The edit.
   */
  async applyEdit(edit: FakeWorkspaceEdit): Promise<boolean> {
    for (const { uri, range, text } of edit.replacements) {
      const document = this.documents.find((candidate) => candidate.uri.toString() === uri.toString())!;
      document.text = document.text.slice(0, document.offsetAt(range.start)) + text + document.text.slice(document.offsetAt(range.end));
      document.version++;
      this.fire('change', { document });
    }
    return true;
  }

  /**
   * open adds an open document.
   * @param text - The text of the document.
   * @param path - The path of the document.
   * @param options - The scheme and the language of the document.
   */
  open(text: string, path = '/folder/a.md', options: { scheme?: string; languageId?: string } = {}): FakeDocument {
    const document = new FakeDocument(new FakeUri(options.scheme ?? 'file', path), text, options.languageId);
    this.documents.push(document);
    return document;
  }

  /** activate imports the extension with this fake API and activates it. */
  async activate() {
    const extension = await import('../extension');
    const context = { subscriptions: [] as { dispose(): void }[], extensionUri: new FakeUri('file', '/extension') };
    const api = extension.activate(context as never);
    return { api, context, extension };
  }

  /**
   * resolveView lets the provider of a side view fill a new view, as VS Code does when the view shows.
   * @param id - The identifier of the view.
   */
  resolveView(id: string): FakeView {
    const view = new FakeView();
    this.views.get(id)!.resolveWebviewView(view);
    return view;
  }

  /** live returns the threads that were not disposed. */
  live(): FakeThread[] {
    return this.threads.filter((thread) => !thread.disposed);
  }

  /**
   * run runs a registered command.
   * @param command - The command.
   * @param args - Its arguments.
   */
  async run(command: string, ...args: unknown[]): Promise<void> {
    await this.commands.get(command)!(...args);
  }
}

/**
 * settle waits until the promises of the extension that wait for nothing but other promises are done.
 */
export async function settle(): Promise<void> {
  for (let count = 0; count < 50; count++) {
    await Promise.resolve();
  }
}

/**
 * bodyOf returns the text of the body of a comment.
 * @param comment - The comment.
 */
export const bodyOf = (comment: FakeComment): string => (typeof comment.body === 'string' ? comment.body : comment.body.value);
