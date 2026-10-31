// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * A fake of the part of the API of VS Code that the extension uses, for the
 * unit tests of the activation, the text editor and the side view. A test
 * creates a new fake for each test, gives it to `vi.doMock('vscode', ...)`, and
 * reads what the extension did: the decorations, the hovers, the commands, the
 * edits of the documents and the messages to the side view. The fake applies
 * a workspace edit to its documents and fires the change event, as VS Code
 * does.
 */

import { doctypeLines } from '../notes/doctype';

/** FakeUri stands for a vscode.Uri. */
export class FakeUri {
  constructor(
    readonly scheme: string,
    readonly path: string,
    readonly query = '',
    readonly authority = '',
    readonly fragment = '',
  ) {}

  static from(components: { scheme: string; path?: string; query?: string; authority?: string; fragment?: string }): FakeUri {
    return new FakeUri(components.scheme, components.path ?? '', components.query, components.authority, components.fragment);
  }

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

  compareTo(other: FakePosition): number {
    return this.line === other.line ? this.character - other.character : this.line - other.line;
  }

  isAfter(other: FakePosition): boolean {
    return this.compareTo(other) > 0;
  }

  isBefore(other: FakePosition): boolean {
    return this.compareTo(other) < 0;
  }

  isEqual(other: FakePosition): boolean {
    return this.compareTo(other) === 0;
  }
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

  get isSingleLine(): boolean {
    return this.start.line === this.end.line;
  }

  get isEmpty(): boolean {
    return this.start.line === this.end.line && this.start.character === this.end.character;
  }

  isEqual(other: FakeRange): boolean {
    return JSON.stringify([this.start, this.end]) === JSON.stringify([other.start, other.end]);
  }

  contains(position: FakePosition): boolean {
    const before = (a: FakePosition, b: FakePosition) => a.line < b.line || (a.line === b.line && a.character <= b.character);
    return before(this.start, position) && before(position, this.end);
  }
}

/** FakeSelection stands for a vscode.Selection: a range from its anchor to its active end, the cursor. */
export class FakeSelection extends FakeRange {
  readonly anchor: FakePosition;
  readonly active: FakePosition;

  constructor(anchor: FakePosition, active: FakePosition) {
    const forward = anchor.line < active.line || (anchor.line === active.line && anchor.character <= active.character);
    super(forward ? anchor : active, forward ? active : anchor);
    this.anchor = anchor;
    this.active = active;
  }
}

/** FakeMarkdownString stands for a vscode.MarkdownString. */
export class FakeMarkdownString {
  supportHtml = false;
  baseUri: FakeUri | undefined;
  isTrusted: boolean | { enabledCommands: string[] } | undefined;

  constructor(readonly value: string) {}
}

/** FakeHover stands for a vscode.Hover. */
export class FakeHover {
  constructor(
    readonly contents: FakeMarkdownString,
    readonly range?: FakeRange,
  ) {}
}

/** FakeCodeActionKind stands for a vscode.CodeActionKind: a name of parts that `.` separates. */
export class FakeCodeActionKind {
  static readonly Empty = new FakeCodeActionKind('');
  static readonly QuickFix = new FakeCodeActionKind('quickfix');
  static readonly Refactor = new FakeCodeActionKind('refactor');

  constructor(readonly value: string) {}

  append(part: string): FakeCodeActionKind {
    return new FakeCodeActionKind(this.value ? `${this.value}.${part}` : part);
  }

  contains(other: FakeCodeActionKind): boolean {
    return this.value === '' || other.value === this.value || other.value.startsWith(`${this.value}.`);
  }
}

/** FakeCodeAction stands for a vscode.CodeAction. */
export class FakeCodeAction {
  command: { command: string; title: string; arguments?: unknown[] } | undefined;
  edit: FakeWorkspaceEdit | undefined;
  diagnostics: FakeDiagnostic[] | undefined;
  isPreferred: boolean | undefined;

  constructor(
    readonly title: string,
    readonly kind?: FakeCodeActionKind,
  ) {}
}

/** FakeCompletionItem stands for a vscode.CompletionItem. */
export class FakeCompletionItem {
  detail: string | undefined;
  range: FakeRange | undefined;
  insertText: string | undefined;
  filterText: string | undefined;
  sortText: string | undefined;
  command: { command: string; title: string; arguments?: unknown[] } | undefined;

  constructor(
    readonly label: string | { label: string; description?: string },
    readonly kind?: number,
  ) {}
}

/** FakeCompletionProvider stands for a vscode.CompletionItemProvider. */
interface FakeCompletionProvider {
  provideCompletionItems(document: FakeDocument, position: FakePosition): FakeCompletionItem[] | undefined | Promise<FakeCompletionItem[] | undefined>;
}

/** FakeCodeActionProvider stands for a vscode.CodeActionProvider. */
interface FakeCodeActionProvider {
  provideCodeActions(document: FakeDocument, range: FakeRange, context: { only?: FakeCodeActionKind; triggerKind: number; diagnostics: FakeDiagnostic[] }): FakeCodeAction[];
}

/** FakeDocumentLink stands for a vscode.DocumentLink. */
export class FakeDocumentLink {
  tooltip: string | undefined;

  constructor(
    readonly range: FakeRange,
    readonly target?: FakeUri,
  ) {}
}

/** FakeDisposable is a disposable of the fake API, which calls its function on its disposal. */
export class FakeDisposable {
  constructor(private readonly call: () => void) {}

  dispose(): void {
    this.call();
  }
}

/** FakeEventEmitter is an event of the fake API, which calls its listeners on fire. */
export class FakeEventEmitter<T> {
  private readonly listeners: ((value: T) => void)[] = [];
  readonly event = (listener: (value: T) => void) => {
    this.listeners.push(listener);
    return { dispose: () => undefined };
  };

  fire(value: T): void {
    for (const listener of this.listeners) {
      listener(value);
    }
  }

  dispose(): void {}
}

/** FakeWorkspaceEdit stands for a vscode.WorkspaceEdit. */
export class FakeWorkspaceEdit {
  readonly replacements: { uri: FakeUri; range: FakeRange; text: string }[] = [];

  replace(uri: FakeUri, range: FakeRange, text: string): void {
    this.replacements.push({ uri, range, text });
  }

  insert(uri: FakeUri, position: FakePosition, text: string): void {
    this.replacements.push({ uri, range: new FakeRange(position.line, position.character, position.line, position.character), text });
  }
}

/** FakeSnippetString stands for a vscode.SnippetString. */
export class FakeSnippetString {
  constructor(readonly value: string) {}

  /** text returns the text that VS Code inserts for the snippet: each placeholder with its default text. */
  get text(): string {
    return this.value.replace(/\$\{\d+:((?:\\.|[^}\\])*)\}|\$\d+/g, (_whole, text: string | undefined) => text ?? '').replace(/\\([\\$}])/g, '$1');
  }
}

/** FakeTextEdit stands for a vscode.TextEdit. */
export class FakeTextEdit {
  constructor(
    readonly range: FakeRange,
    readonly newText: string,
  ) {}

  static replace(range: FakeRange, newText: string): FakeTextEdit {
    return new FakeTextEdit(range, newText);
  }
}

/** FakeDiagnostic stands for a vscode.Diagnostic. */
export class FakeDiagnostic {
  source: string | undefined;
  code: string | number | undefined;

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
    readonly kind?: number,
  ) {}
}

/** FakeTabInputText stands for a vscode.TabInputText: the input of a tab of a text editor. */
export class FakeTabInputText {
  constructor(readonly uri: FakeUri) {}
}

/** FakeTab stands for a vscode.Tab. */
export interface FakeTab {
  input: unknown;
  isPreview?: boolean;
}

/** ShowOptions stands for the vscode.TextDocumentShowOptions that the extension gives. */
interface ShowOptions {
  viewColumn?: number;
  preview?: boolean;
  preserveFocus?: boolean;
  selection?: FakeRange;
}

/** FakeFileSystemProvider stands for the part of a vscode.FileSystemProvider that VS Code reads to open a document. */
interface FakeFileSystemProvider {
  readFile(uri: FakeUri): Uint8Array | Promise<Uint8Array>;
}

/** FakeCodeLens stands for a vscode.CodeLens. */
export class FakeCodeLens {
  constructor(
    readonly range: FakeRange,
    readonly command?: { title: string; command: string; arguments?: unknown[]; tooltip?: string },
  ) {}
}

/** FakeThemeColor stands for a vscode.ThemeColor. */
export class FakeThemeColor {
  constructor(readonly id: string) {}
}

/** FakeDocument stands for a vscode.TextDocument. */
export class FakeDocument {
  version = 1;
  isClosed = false;
  /** isDirty tells whether the document has changes that are not saved: an edit sets it, and a save clears it. */
  isDirty = false;
  /** saves counts the saves of the document. */
  saves = 0;

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

  /** positionAt returns the position of an offset of the text. */
  positionAt(offset: number): FakePosition {
    const before = this.text.slice(0, offset).split(/\r\n|\r|\n/);
    return new FakePosition(before.length - 1, before.at(-1)!.length);
  }

  lineAt(line: number): { text: string; range: FakeRange; firstNonWhitespaceCharacterIndex: number } {
    const text = this.text.split(/\r\n|\r|\n/)[line];
    return { text, range: new FakeRange(line, 0, line, text.length), firstNonWhitespaceCharacterIndex: /^\s*/.exec(text)![0].length };
  }

  async save(): Promise<boolean> {
    this.saves++;
    this.isDirty = false;
    return true;
  }
}

/** FakeEditor stands for a vscode.TextEditor. */
export class FakeEditor {
  /** decorations holds the ranges, or the options with their ranges, of each decoration type. */
  readonly decorations = new Map<object, (FakeRange | { range: FakeRange })[]>();
  /** current is the primary selection of the editor, and others are the further selections of several cursors. */
  private current: FakeSelection;
  private others: FakeSelection[] = [];
  /** visibleRanges are the visible lines; VS Code splits them at a collapsed fold. */
  visibleRanges: FakeRange[];

  constructor(
    readonly document: FakeDocument,
    line = 0,
    readonly viewColumn = 1,
  ) {
    this.current = new FakeSelection(new FakePosition(line, 0), new FakePosition(line, 0));
    this.visibleRanges = [new FakeRange(0, 0, Math.max(document.lineCount - 1, 0), 0)];
  }

  get selection(): FakeSelection {
    return this.current;
  }

  /** A test can set only the cursor, which is then also the anchor. */
  set selection(value: { active: FakePosition; anchor?: FakePosition }) {
    this.current = value instanceof FakeSelection ? value : new FakeSelection(value.anchor ?? value.active, value.active);
    this.others = [];
  }

  get selections(): FakeSelection[] {
    return [this.current, ...this.others];
  }

  set selections(values: FakeSelection[]) {
    this.selection = values[0];
    this.others = values.slice(1);
  }

  /**
   * edit applies the deletions and replacements of a callback to the document, and moves the cursor as VS Code does: a
   * cursor after a change moves with the text, and a cursor in a change goes to its start.
   * @param callback - Adds the changes.
   */
  async edit(callback: (builder: { delete(range: FakeRange): void; replace(range: FakeRange, text: string): void; insert(position: FakePosition, text: string): void }) => void): Promise<boolean> {
    const changes: { range: FakeRange; text: string }[] = [];
    callback({
      delete: (range) => changes.push({ range, text: '' }),
      replace: (range, text) => changes.push({ range, text }),
      insert: (position, text) => changes.push({ range: new FakeRange(position.line, position.character, position.line, position.character), text }),
    });
    for (const { range, text } of changes.reverse()) {
      const start = this.document.offsetAt(range.start);
      const end = this.document.offsetAt(range.end);
      const cursor = this.document.offsetAt(this.current.active);
      this.document.text = this.document.text.slice(0, start) + text + this.document.text.slice(end);
      this.document.version++;
      this.document.isDirty = true;
      const moved = cursor >= end ? cursor - (end - start) + text.length : cursor > start ? start : cursor;
      this.selection = { active: this.document.positionAt(moved) };
    }
    return true;
  }

  /**
   * insertSnippet inserts the text of a snippet at a position, as VS Code does, and puts the cursor after it.
   * @param snippet - The snippet.
   * @param position - The position.
   */
  async insertSnippet(snippet: FakeSnippetString, position: FakePosition): Promise<boolean> {
    await this.edit((builder) => builder.insert(position, snippet.text));
    return true;
  }

  /**
   * linesOf returns the first lines of the ranges of a decoration type.
   * @param type - The decoration type.
   */
  linesOf(type: object): number[] {
    return (this.decorations.get(type) ?? []).map((item) => ('range' in item ? item.range : item).start.line);
  }

  setDecorations(type: object, ranges: (FakeRange | { range: FakeRange })[]): void {
    this.decorations.set(type, ranges);
  }

  /** revealed records the ranges that the extension scrolled to. */
  readonly revealed: FakeRange[] = [];

  revealRange(range: FakeRange): void {
    this.revealed.push(range);
  }
}

/** FakeView stands for a vscode.WebviewView of the side view. */
export class FakeView {
  visible = true;
  /** shows counts the calls of show, which opens the view. */
  shows = 0;
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

  /** show opens the view, and keeps the focus where it is; a hidden view tells its listeners that it shows. */
  show(): void {
    this.shows += 1;
    const hidden = !this.visible;
    this.visible = true;
    if (hidden) {
      this.visibility.forEach((listener) => listener());
    }
  }

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
      highlight: string | undefined;
      footnotePlace?: string;
      threads: {
        id: string;
        line: number;
        color: string;
        colorName: string;
        text: string;
        todo?: 'todo' | 'done';
        answers: { author: string; date: string; authorDate: string; written: string; body: string; html: string; depth: number; parent: number | undefined }[];
        footnote?: { label: string; html: string; github?: number; preview?: number };
      }[];
    };
  }
}

/** Registration is a registration of the fake API, which records its disposal. */
export interface Registration {
  dispose(): void;
  disposed: boolean;
}

/** Selector is a document selector of a provider: a language, or the scheme of the documents of every language. */
type Selector = string | { scheme: string };

/**
 * keyOf returns the key of the providers of a selector: the language, or `scheme:` and the scheme.
 * @param selector - The selector.
 */
const keyOf = (selector: Selector): string => (typeof selector === 'string' ? selector : `scheme:${selector.scheme}`);

/** symbolKind stands for vscode.SymbolKind, with the names of the numbers, as a numeric enum of TypeScript has them. */
const symbolKind: Record<string | number, string | number> = {};
['File', 'Module', 'Namespace', 'Package', 'Class', 'Method', 'Property', 'Field', 'Constructor', 'Enum', 'Interface', 'Function', 'Variable', 'Constant', 'String', 'Number', 'Boolean', 'Array', 'Object', 'Key', 'Null', 'EnumMember', 'Struct', 'Event', 'Operator', 'TypeParameter'].forEach((name, index) => {
  symbolKind[name] = index;
  symbolKind[index] = name;
});

/** Fake is the fake API with the records of what the extension did. */
export class Fake {
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
  /** infos records the information messages of the extension. */
  infos: string[] = [];
  /** warnings records the questions of the extension; the answer is the item that the user picks, or undefined. */
  warnings: string[] = [];
  answer: string | undefined;
  /** statusMessages records the messages of the extension in the status bar. */
  statusMessages: string[] = [];
  /** inputs records the options of each input box; input is its answer, or undefined when the user cancels it. */
  inputs: { value?: string; validateInput?: (value: string) => string | undefined }[] = [];
  input: string | undefined;
  /** links holds the providers of the links of each language. */
  links = new Map<string, { provideDocumentLinks(document: FakeDocument): FakeDocumentLink[] }>();
  /** picks records the items of each quick pick, and pick chooses the answer, the first item by default. */
  picks: { label: string; description?: string }[][] = [];
  pick: (items: { label: string; description?: string }[]) => unknown = (items) => items[0];
  /** found are the files that findFiles finds. */
  found: FakeUri[] = [];
  /** symbols holds the symbols of the files, by their paths, that the command vscode.executeDocumentSymbolProvider gives. */
  symbols = new Map<string, unknown[]>();
  /** codeLenses holds the providers of the code lenses. */
  codeLenses: { provideCodeLenses(document: FakeDocument): Promise<FakeCodeLens[]> | FakeCodeLens[] }[] = [];
  /** watched holds the listeners of the watchers of files, by the kind of the change. */
  watched: { kind: 'create' | 'change' | 'delete'; listener: (uri: FakeUri) => void }[] = [];
  /**
   * lineComments holds the line comments of the languages, by their IDs, that the command editor.action.addCommentLine
   * writes at the indentation of the line of each cursor of the active editor; a language without one changes nothing.
   */
  lineComments = new Map<string, string>();
  /** updates records the changes of settings: the key, the value and the target. */
  updates: { key: string; value: unknown; target: number }[] = [];
  /** directories holds the paths of the folders of the file system. */
  directories = new Set<string>();
  /** rendered is the result of the command markdown.api.render for a text, or undefined for none. */
  rendered: ((text: string) => string) | undefined = (text) => `<p>${text}</p>\n`;
  errors: string[] = [];
  diagnostics = new Map<string, FakeDiagnostic[]>();
  folding = new Map<string, { provideFoldingRanges(document: FakeDocument): FakeFoldingRange[] }>();
  /** hovers holds the providers of the hovers of each language, in the order of their registration. */
  hovers = new Map<string, { provideHover(document: FakeDocument, position: FakePosition): FakeHover | undefined }[]>();
  /** codeActions holds the providers of the Code Actions of each language, with the kinds that they provide. */
  codeActions = new Map<string, { provider: FakeCodeActionProvider; kinds: readonly FakeCodeActionKind[] }[]>();
  /** completions holds the providers of the suggestions of each language, with their trigger characters. */
  completions = new Map<string, { provider: FakeCompletionProvider; triggers: string[] }[]>();
  /** formatters holds the provider of "Format Document" of each language. */
  formatters = new Map<string, { provideDocumentFormattingEdits(document: FakeDocument): FakeTextEdit[] }>();
  listeners = new Map<string, ((event: unknown) => void)[]>();
  /** login is the GitHub login of the session; undefined means no session, and a sign-in is refused. */
  login: string | undefined;
  /** signIn is the login that a sign-in gives, or undefined when the user cancels it. */
  signIn: string | undefined;
  /** sessions records the options of each request of a session. */
  sessions: { provider: string; scopes: readonly string[]; options: unknown }[] = [];
  views = new Map<string, { resolveWebviewView(view: FakeView): void }>();
  uriHandler: { handleUri(uri: FakeUri): unknown } | undefined;
  /** held makes each edit of applyEdit wait until it resolves, as VS Code applies an edit some time after the call. */
  held: Promise<void> | undefined;
  /** refuses makes applyEdit change nothing and return false, as VS Code does for an edit that it cannot apply. */
  refuses = false;
  /** shown records the documents and the options of showTextDocument. */
  shown: { document: FakeDocument; options: unknown }[] = [];
  /**
   * tabGroups are the groups of tabs of the windows of VS Code, with the URIs of their tabs, and the active tab with
   * the type of its webview or custom editor and its label.
   */
  tabGroups: { viewColumn: number; tabs: FakeTab[]; activeTab?: FakeTab & { label?: string } }[] = [];
  /** closedTabs records the tabs that the extension closed. */
  closedTabs: FakeTab[] = [];
  /** workspaceFolder is the path of the folder of the workspace. */
  workspaceFolder = '/folder/';
  /**
   * files holds the texts of the files that are not open, and the texts on disk of the files, by their paths;
   * openTextDocument opens them.
   */
  files = new Map<string, string>();
  /** providers holds the file systems of the extension, by their schemes; openTextDocument reads their documents. */
  providers = new Map<string, FakeFileSystemProvider>();
  registrations: Registration[] = [];
  /** api is the module `vscode` of the fake. */
  readonly api: Record<string, unknown>;

  constructor() {
    // The getters of the API read the fields of this fake: inside a getter, this is the object of the API.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const fake = this;
    const on = (name: string) => (listener: (event: unknown) => void) => {
      this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
      return this.registration();
    };
    this.api = {
      Uri: FakeUri,
      Position: FakePosition,
      Range: FakeRange,
      Selection: FakeSelection,
      MarkdownString: FakeMarkdownString,
      Hover: FakeHover,
      CodeAction: FakeCodeAction,
      CodeActionKind: FakeCodeActionKind,
      DocumentLink: FakeDocumentLink,
      CodeActionTriggerKind: { Invoke: 1, Automatic: 2 },
      CompletionItem: FakeCompletionItem,
      CompletionItemKind: { Function: 2, Value: 11, Reference: 17 },
      WorkspaceEdit: FakeWorkspaceEdit,
      EventEmitter: FakeEventEmitter,
      Disposable: FakeDisposable,
      FileSystemError: { NoPermissions: (message: string) => new Error(message), FileNotFound: (uri: FakeUri) => new Error(`no file ${uri.toString()}`) },
      TextEdit: FakeTextEdit,
      Diagnostic: FakeDiagnostic,
      FoldingRange: FakeFoldingRange,
      ThemeColor: FakeThemeColor,
      CodeLens: FakeCodeLens,
      DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2 },
      FoldingRangeKind: { Comment: 1 },
      TextEditorRevealType: { InCenter: 1, InCenterIfOutsideViewport: 2, AtTop: 3 },
      TabInputText: FakeTabInputText,
      TextEditorSelectionChangeKind: { Keyboard: 1, Mouse: 2, Command: 3 },
      OverviewRulerLane: { Left: 1, Center: 2, Right: 4, Full: 7 },
      EndOfLine: { LF: 1, CRLF: 2 },
      TextDocumentSaveReason: { Manual: 1, AfterDelay: 2, FocusOut: 3 },
      FileType: { File: 1, Directory: 2 },
      FilePermission: { Readonly: 1 },
      FileChangeType: { Changed: 1, Created: 2, Deleted: 3 },
      ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
      SnippetString: FakeSnippetString,
      SymbolKind: symbolKind,
      env: {
        language: 'en',
        uriScheme: 'vscode',
        openExternal: async (uri: FakeUri) => {
          this.external.push(uri.toString());
          return true;
        },
      },
      languages: {
        createDiagnosticCollection: () =>
          Object.assign(this.registration(), {
            set: (uri: FakeUri, list: FakeDiagnostic[]) => this.diagnostics.set(uri.toString(), list),
            delete: (uri: FakeUri) => this.diagnostics.delete(uri.toString()),
          }),
        registerCodeLensProvider: (_selector: unknown, provider: { provideCodeLenses(document: FakeDocument): Promise<FakeCodeLens[]> | FakeCodeLens[]; onDidChangeCodeLenses?: unknown }) => {
          this.codeLenses.push(provider);
          return this.registration();
        },
        registerFoldingRangeProvider: (language: string, provider: { provideFoldingRanges(document: FakeDocument): FakeFoldingRange[] }) => {
          this.folding.set(language, provider);
          return this.registration();
        },
        registerCodeActionsProvider: (selector: Selector, provider: FakeCodeActionProvider, metadata: { providedCodeActionKinds: readonly FakeCodeActionKind[] }) => {
          const language = keyOf(selector);
          this.codeActions.set(language, [...(this.codeActions.get(language) ?? []), { provider, kinds: metadata.providedCodeActionKinds }]);
          return this.registration();
        },
        registerCompletionItemProvider: (selector: Selector, provider: FakeCompletionProvider, ...triggers: string[]) => {
          const language = keyOf(selector);
          this.completions.set(language, [...(this.completions.get(language) ?? []), { provider, triggers }]);
          return this.registration();
        },
        registerDocumentLinkProvider: (language: string, provider: { provideDocumentLinks(document: FakeDocument): FakeDocumentLink[] }) => {
          this.links.set(language, provider);
          return this.registration();
        },
        registerHoverProvider: (language: string, provider: { provideHover(document: FakeDocument, position: FakePosition): FakeHover | undefined }) => {
          this.hovers.set(language, [...(this.hovers.get(language) ?? []), provider]);
          return this.registration();
        },
        registerDocumentFormattingEditProvider: (selector: { language: string }, provider: { provideDocumentFormattingEdits(document: FakeDocument): FakeTextEdit[] }) => {
          this.formatters.set(selector.language, provider);
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
          if (command === 'vscode.executeDocumentSymbolProvider') {
            return this.symbols.get((args[0] as FakeUri).path);
          }
          const editor = this.activeEditor;
          const comment = editor && this.lineComments.get(editor.document.languageId);
          if (command === 'editor.action.addCommentLine' && editor && comment) {
            const lines = [...new Set(editor.selections.map((selection) => selection.active.line))];
            await editor.edit((builder) => {
              for (const line of lines) {
                const indent = /^\s*/.exec(editor.document.lineAt(line).text)![0].length;
                builder.insert(new FakePosition(line, indent), `${comment} `);
              }
            });
          }
          return command === 'markdown.api.render' && this.rendered ? this.rendered(args[0] as string) : undefined;
        },
      },
      window: {
        showQuickPick: async (items: { label: string; description?: string }[]) => {
          this.picks.push(items);
          return this.pick(items);
        },
        showInputBox: async (options: { value?: string; validateInput?: (value: string) => string | undefined }) => {
          this.inputs.push(options);
          return this.input;
        },
        showErrorMessage: async (message: string) => {
          this.errors.push(message);
        },
        showInformationMessage: async (message: string) => {
          this.infos.push(message);
        },
        showWarningMessage: async (message: string) => {
          this.warnings.push(message);
          return this.answer;
        },
        setStatusBarMessage: (message: string) => {
          this.statusMessages.push(message);
          return this.registration();
        },
        createTextEditorDecorationType: (options: unknown) => Object.assign(this.registration(), { options }),
        createOutputChannel: () => Object.assign(this.registration(), { appendLine: () => undefined }),
        get visibleTextEditors() {
          return fake.editors;
        },
        get activeTextEditor() {
          return fake.activeEditor;
        },
        tabGroups: {
          get all() {
            return fake.tabGroups;
          },
          get activeTabGroup() {
            return fake.tabGroups[0];
          },
          onDidChangeTabs: on('tabs'),
          onDidChangeTabGroups: on('tabGroups'),
          close: async (tabs: FakeTab | FakeTab[]) => {
            const closing = Array.isArray(tabs) ? tabs : [tabs];
            this.closedTabs.push(...closing);
            for (const group of this.tabGroups) {
              group.tabs = group.tabs.filter((tab) => !closing.includes(tab));
              if (group.activeTab && closing.includes(group.activeTab as FakeTab)) {
                group.activeTab = undefined;
              }
            }
            return true;
          },
        },
        onDidChangeVisibleTextEditors: on('visibleEditors'),
        onDidChangeActiveTextEditor: on('activeEditor'),
        onDidChangeTextEditorSelection: on('selection'),
        onDidChangeTextEditorVisibleRanges: on('visibleRanges'),
        registerWebviewViewProvider: (id: string, provider: { resolveWebviewView(view: FakeView): void }) => {
          this.views.set(id, provider);
          return this.registration();
        },
        registerUriHandler: (handler: { handleUri(uri: FakeUri): unknown }) => {
          this.uriHandler = handler;
          return this.registration();
        },
        showTextDocument: async (target: FakeDocument | FakeUri, options?: ShowOptions) => {
          if (target instanceof FakeDocument) {
            this.shown.push({ document: target, options });
            return this.editors.find((editor) => editor.document === target) ?? new FakeEditor(target);
          }
          // A URI opens its document in a new text editor of the group, as VS Code does.
          const document = await this.openTextDocument(target);
          this.shown.push({ document, options });
          return this.show(document, options);
        },
      },
      workspace: {
        getConfiguration: (section: string, scope?: FakeUri) => {
          const values = { ...this.settings.get(''), ...this.settings.get('workspace'), ...(scope ? this.settings.get(scope.path) : undefined) };
          return {
            // A test sets a setting by its whole name, such as editor.formatOnSave, or by its key alone.
            get: (key: string) => values[`${section}.${key}`] ?? values[key],
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
        openTextDocument: (uri: FakeUri) => this.openTextDocument(uri),
        applyEdit: (edit: FakeWorkspaceEdit) => this.applyEdit(edit),
        findFiles: async () => this.found,
        asRelativePath: (target: FakeUri) => (target.path.startsWith(this.workspaceFolder) ? target.path.slice(this.workspaceFolder.length) : target.path),
        createFileSystemWatcher: () => {
          const watcher = Object.assign(this.registration(), {
            onDidCreate: (listener: (uri: FakeUri) => void) => {
              this.watched.push({ kind: 'create', listener });
              return this.registration();
            },
            onDidChange: (listener: (uri: FakeUri) => void) => {
              this.watched.push({ kind: 'change', listener });
              return this.registration();
            },
            onDidDelete: (listener: (uri: FakeUri) => void) => {
              this.watched.push({ kind: 'delete', listener });
              return this.registration();
            },
          });
          return watcher;
        },
        registerFileSystemProvider: (scheme: string, provider: FakeFileSystemProvider) => {
          this.providers.set(scheme, provider);
          return this.registration();
        },
        getWorkspaceFolder: (uri: FakeUri) => (uri.path.startsWith(this.workspaceFolder) ? { uri: new FakeUri('file', this.workspaceFolder) } : undefined),
        fs: {
          isWritableFileSystem: (scheme: string) => (scheme === 'file' ? true : scheme === 'git' ? false : undefined),
          readFile: async (uri: FakeUri) => {
            const text = this.files.get(uri.path);
            if (text === undefined) {
              throw new Error(`no file ${uri.toString()}`);
            }
            return new TextEncoder().encode(text);
          },
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
        onDidSaveTextDocument: on('save'),
        onDidChangeConfiguration: on('configuration'),
        onWillSaveTextDocument: on('willSave'),
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
    await this.held;
    if (this.refuses) {
      return false;
    }
    const changed = new Set<FakeDocument>();
    // The ranges of the replacements refer to the text before the edit, so they apply from the end of the text.
    const replacements = edit.replacements.map(({ uri, range, text }) => {
      const document = this.documents.find((candidate) => candidate.uri.toString() === uri.toString())!;
      return { document, start: document.offsetAt(range.start), end: document.offsetAt(range.end), text };
    });
    for (const { document, start, end, text } of replacements.sort((a, b) => b.start - a.start)) {
      document.text = document.text.slice(0, start) + text + document.text.slice(end);
      document.isDirty = true;
      changed.add(document);
    }
    for (const document of changed) {
      document.version++;
      this.fire('change', { document, contentChanges: [] });
    }
    return true;
  }

  /**
   * openTextDocument returns the open document of a URI, or opens it as VS Code does: a file from the files, and a
   * document of a file system of the extension from it, and fires the event of the open.
   * @param uri - The URI of the document.
   */
  async openTextDocument(uri: FakeUri): Promise<FakeDocument> {
    const document = this.documents.find((candidate) => candidate.uri.toString() === uri.toString());
    if (document) {
      return document;
    }
    const provider = this.providers.get(uri.scheme);
    if (provider) {
      const opened = new FakeDocument(uri, new TextDecoder().decode(await provider.readFile(uri)));
      this.documents.push(opened);
      this.fire('open', opened);
      return opened;
    }
    const text = this.files.get(uri.path);
    if (uri.scheme !== 'file' || text === undefined) {
      throw new Error(`no document ${uri.toString()}`);
    }
    return this.open(text, uri.path);
  }

  /**
   * show shows a document in a new text editor in place of the text editor of its group, with the options of
   * showTextDocument, and makes its tab the active tab of the group: a tab of its own, or the tab that it has there.
   * @param document - The document.
   * @param options - The group, the preview, the focus and the selection.
   */
  show(document: FakeDocument, options: ShowOptions = {}): FakeEditor {
    const column = options.viewColumn ?? 1;
    const editor = new FakeEditor(document, 0, column);
    if (options.selection) {
      const { selection } = options;
      editor.selection = selection instanceof FakeSelection ? selection : new FakeSelection(selection.start, selection.end);
    }
    this.editors = [...this.editors.filter((other) => other.viewColumn !== column), editor];
    let group = this.tabGroups.find((candidate) => candidate.viewColumn === column);
    if (!group) {
      group = { viewColumn: column, tabs: [] };
      this.tabGroups.push(group);
    }
    let tab = group.tabs.find((candidate) => candidate.input instanceof FakeTabInputText && candidate.input.uri.toString() === document.uri.toString());
    if (!tab) {
      tab = { input: new FakeTabInputText(document.uri), isPreview: options.preview ?? true };
      group.tabs.push(tab);
    }
    group.activeTab = tab;
    if (!options.preserveFocus) {
      this.activeEditor = editor;
    }
    return editor;
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

  /**
   * hover asks the providers of the hovers of a document for a position, as VS Code does when the pointer rests there,
   * and returns their hovers.
   * @param document - The document.
   * @param position - The position of the pointer.
   */
  hover(document: FakeDocument, position: FakePosition): FakeHover[] {
    return (this.hovers.get(document.languageId) ?? []).flatMap((provider) => provider.provideHover(document, position) ?? []);
  }

  /**
   * codeActionsAt asks the providers of the Code Actions of a document for a range, as VS Code does for the light bulb
   * after a change of the selection, and returns the titles and kinds of their actions with their commands.
   * @param document - The document.
   * @param range - The range, the selection of the text editor for the light bulb.
   * @param only - The kind that VS Code asks for, or undefined for every kind.
   */
  codeActionsAt(document: FakeDocument, range: FakeRange, only?: FakeCodeActionKind): { title: string; kind: string | undefined; command: string | undefined }[] {
    return this.actionsAt(document, range, only).map((action) => ({ title: action.title, kind: action.kind?.value, command: action.command?.command }));
  }

  /**
   * actionsAt asks the providers of the Code Actions of a document for a range, with the diagnostics of the document
   * that touch the range, as VS Code does, and returns their actions.
   * @param document - The document.
   * @param range - The range, the selection of the text editor or the place of the pointer.
   * @param only - The kind that VS Code asks for, or undefined for every kind.
   */
  actionsAt(document: FakeDocument, range: FakeRange, only?: FakeCodeActionKind): FakeCodeAction[] {
    const diagnostics = (this.diagnostics.get(document.uri.toString()) ?? []).filter(
      (diagnostic) => diagnostic.range.contains(range.start) || diagnostic.range.contains(range.end) || range.contains(diagnostic.range.start),
    );
    return [...(this.codeActions.get(document.languageId) ?? []), ...(this.codeActions.get(`scheme:${document.uri.scheme}`) ?? [])].flatMap(({ provider }) =>
      provider.provideCodeActions(document, range, { only, triggerKind: 2, diagnostics }),
    );
  }

  /**
   * complete asks the providers of the suggestions of a document for a position, as VS Code does after a trigger
   * character, and returns their suggestions.
   * @param document - The document.
   * @param position - The position of the cursor.
   */
  complete(document: FakeDocument, position: FakePosition): FakeCompletionItem[] {
    return [...(this.completions.get(document.languageId) ?? []), ...(this.completions.get(`scheme:${document.uri.scheme}`) ?? [])].flatMap(({ provider }) => {
      const items = provider.provideCompletionItems(document, position);
      if (items instanceof Promise) {
        throw new Error('The provider waits for the document of a file, which the fake always has open.');
      }
      return items ?? [];
    });
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
 * marked returns a text with the comment of the format of the notes at its top, as the extension writes it with a
 * change of a file without a front matter ([R-NOTE-007](../../docs/requirements.md#r-note-007)).
 * @param text - The text.
 * @param eol - The line break of the text.
 */
export const marked = (text: string, eol = '\n'): string => doctypeLines.join(eol) + eol + eol + text;
