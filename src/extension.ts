// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The editor wiring of the extension. The manifest contributes the settings,
 * the commands with their buttons, the side view, and the styles and the
 * script of the Markdown preview. Activation returns the markdown-it plugin
 * ([src/markdown/markdownIt.ts](markdown/markdownIt.ts)), which the Markdown
 * extension of VS Code reads from the export `extendMarkdownIt` when it builds
 * its preview. It starts the notes of the open documents
 * ([src/noteThreads.ts](noteThreads.ts)), their overlay of the text editor
 * ([src/noteEditor.ts](noteEditor.ts)), and the side view
 * ([src/notesView.ts](notesView.ts)), the only place that shows the text of
 * the notes (Hannes, 2026-10-28: "we completely drop the inline view"), with
 * the GitHub login of the user as the author of new notes
 * ([src/github.ts](github.ts)), and the formatter of Markdown documents
 * ([src/formatter.ts](formatter.ts)), and the light bulb action of the
 * selected text, which adds a note
 * ([src/addNoteAction.ts](addNoteAction.ts)). It handles the links of the
 * highlights of the preview, which select a note and open the side view, and the
 * links of the preview that deselect the selected note, and the links of the
 * button "Add Note" at the selected text of the preview, which add a note to
 * that text ([R-PREV-008](../docs/requirements.md#r-prev-008)), and the
 * buttons "Show Highlights" and "Hide Highlights", and refreshes the previews
 * and the notes when a setting of the extension changes. Its export `getAPI`
 * gives other extensions, such as nimblescape Markdown Paper, a versioned API
 * ([R-GEN-012](../docs/requirements.md#r-gen-012)).
 *
 * The highlights show while the setting `showHighlights` is on, also while
 * the side view is closed (Hannes, 2026-10-29: "clicking the highlight button
 * [...] shall not open the side view but only show the highlights"); a click
 * on a highlight selects its note, and a double click opens the side view
 * (Hannes, 2026-10-29: "only a double click on a selected highlight shall open
 * the side view"). The context key highlightsContext tells
 * the menus whether they show: the title of the editors has "Hide Highlights"
 * then, and else "Show Highlights", which turns the setting on.
 */

import type MarkdownIt from 'markdown-it';
import * as vscode from 'vscode';
import { AddNoteAction } from './addNoteAction';
import { CleanView, fileOf } from './cleanView';
import { type FormatStep, FormatSteps, registerFormatter, type SaveChanges } from './formatter';
import { keptCurrent } from './format/format';
import { githubLogin } from './github';
import { extendMarkdownIt } from './markdown/markdownIt';
import { NoteEditor } from './noteEditor';
import { findDoctype } from './notes/doctype';
import type { BlockFinder } from './notes/clean';
import type { Note } from './notes/notes';
import { isNoteDocument, linesOf, NoteThreads } from './noteThreads';
import { notesViewId, NotesView, viewCommands } from './notesView';
import { SelectedNotes } from './selectedNotes';
import { type SlashCommand, SlashCommands } from './slashCommands';
import { Snippets } from './snippets';
import { checkedSettings, type Settings, settingsSection } from './settings';

/** extensionId is the identifier of the extension: the publisher and the name of the manifest. */
export const extensionId = 'nimblescape.nimblescape-markdownnotes';

/** openPath is the path of the links that select a note and open the side view, for a double click on its highlight. */
export const openPath = '/open';

/**
 * selectPath is the path of the links of the preview that select a note and leave the side view as it is, for a click on
 * its highlight: the script of the preview takes the link of the highlight with this path.
 */
export const selectPath = '/select';

/** deselectPath is the path of the links of the preview that deselect the selected note, for a click outside its highlight. */
export const deselectPath = '/deselect';

/** addPath is the path of the links of the preview that add a note to the text that the user selected in the preview. */
export const addPath = '/add';

/**
 * highlightCommands are the commands of the buttons in the title of the text editor and of the Markdown preview of a
 * Markdown file, which show and hide the highlights of the notes ([R-PREV-005](../docs/requirements.md#r-prev-005)).
 */
export const highlightCommands = {
  show: 'nimblescape.markdownNotes.showHighlights',
  hide: 'nimblescape.markdownNotes.hideHighlights',
};

/** highlightsContext is the context key that tells the menus whether the highlights show. */
export const highlightsContext = 'nimblescape.markdownNotes.highlightsShown';

/**
 * footnoteCommands are the commands of the buttons in the title of the side view that show and hide the standard
 * footnotes in the side view ([R-FOOT-001](../docs/requirements.md#r-foot-001)).
 */
export const footnoteCommands = {
  show: 'nimblescape.markdownNotes.showFootnotes',
  hide: 'nimblescape.markdownNotes.hideFootnotes',
};

/** footnotesContext is the context key that tells the menus whether the side view shows the footnotes. */
export const footnotesContext = 'nimblescape.markdownNotes.footnotesShown';

/** HiddenBlocks finds the blocks of a file that the clean editing view leaves out for another extension. */
export interface HiddenBlocks {
  /**
   * find returns the blocks of whole lines of a file, from the first to the last line, that belong at the end of the
   * file, such as a database of sources. Text typed in the view goes before them, and they stay at the end.
   * @param lines - The lines of the file.
   */
  find: BlockFinder;
}

/**
 * ApiV1 is version 1 of the API of the extension for other extensions, for example nimblescape Markdown Paper, which
 * add their parts to the notes of a Markdown file without the extension knowing them. Each register call returns a
 * disposable that removes the part again.
 */
export interface ApiV1 {
  version: 1;
  /**
   * fileOf returns the URI of the file behind a document of the clean editing view
   * ([R-TEXT-009](../docs/requirements.md#r-text-009)), or undefined for another document.
   */
  fileOf(document: vscode.Uri): vscode.Uri | undefined;
  /**
   * registerFormatStep adds a step to the formatter of Markdown files, after the steps of the notes, in "Format
   * Document" of a file and in the format on save ([R-FMT-001](../docs/requirements.md#r-fmt-001)).
   * @param step - The step.
   */
  registerFormatStep(step: FormatStep): vscode.Disposable;
  /**
   * registerHiddenBlocks makes the clean editing view leave out blocks at the end of a file
   * ([R-TEXT-009](../docs/requirements.md#r-text-009)).
   * @param blocks - The finder of the blocks.
   */
  registerHiddenBlocks(blocks: HiddenBlocks): vscode.Disposable;
  /**
   * registerSlashCommand adds a slash command to the text editors of Markdown files
   * ([R-EDIT-008](../docs/requirements.md#r-edit-008)), after the commands of the notes. Its label is a slash and
   * small letters that no other command has, or the call throws.
   * @param command - The command.
   */
  registerSlashCommand(command: SlashCommand): vscode.Disposable;
}

/** Api is the export of the extension. */
export interface Api {
  /** extendMarkdownIt adds the notes to the markdown-it instance of the Markdown preview. */
  extendMarkdownIt(md: MarkdownIt): MarkdownIt;
  /** notesOf returns the notes of an open document, for the tests in VS Code. */
  notesOf(document: vscode.Uri): readonly Note[];
  /**
   * getAPI returns the API for other extensions in a version, as the Git extension of VS Code does, or undefined for a
   * version that the extension does not know.
   * @param version - The version of the API.
   */
  getAPI(version: number): ApiV1 | undefined;
}

/**
 * readSettings reads the settings of the extension that apply to a document.
 * @param document - The document, or undefined for the settings of the window.
 */
export function readSettings(document: vscode.Uri | undefined): Settings {
  const configuration = vscode.workspace.getConfiguration(settingsSection, document);
  return checkedSettings((key) => configuration.get(key));
}

/**
 * renderedOf returns the document that the Markdown preview renders. The preview names it in the environment of the
 * rendering (`currentDocument`); a rendering without a document, such as a side of the rendered diff, has none.
 * @param env - The environment of the rendering.
 */
function renderedOf(env: unknown): vscode.Uri | undefined {
  const document = (env as { currentDocument?: unknown } | undefined)?.currentDocument;
  return typeof document === 'object' && document !== null && 'scheme' in document ? (document as vscode.Uri) : undefined;
}

/**
 * documentOf returns the file whose notes the Markdown preview shows: the rendered document, or the file of a clean
 * document of the clean editing view ([R-TEXT-009](../docs/requirements.md#r-text-009)).
 * @param env - The environment of the rendering.
 */
function documentOf(env: unknown): vscode.Uri | undefined {
  const document = renderedOf(env);
  return document && (fileOf(document) ?? document);
}

/**
 * noteLink returns the link of the highlight of a note in the preview: a URI of VS Code for the extension, which selects
 * the note in the side view ([R-PREV-003](../docs/requirements.md#r-prev-003)). A rendering without a document has none.
 * @param env - The environment of the rendering.
 * @param line - The index of the first line of the note.
 */
function noteLink(env: unknown, line: number): string | undefined {
  const document = documentOf(env);
  if (!document) {
    return undefined;
  }
  const query = new URLSearchParams({ document: document.toString(), line: String(line) }).toString();
  return `${vscode.env.uriScheme}://${extensionId}${openPath}?${query}`;
}

/**
 * deselectLink returns the link of the preview that deselects the selected note of its document in the side view, for a
 * click on the text outside the highlight of the note ([R-PREV-003](../docs/requirements.md#r-prev-003)). A rendering
 * without a document has none.
 * @param env - The environment of the rendering.
 */
function deselectLink(env: unknown): string | undefined {
  const document = documentOf(env);
  return document && `${vscode.env.uriScheme}://${extensionId}${deselectPath}?${new URLSearchParams({ document: document.toString() }).toString()}`;
}

/**
 * addLink returns the link of the button "Add Note" of the preview, which adds a note to the text that the user selects
 * in the preview ([R-PREV-008](../docs/requirements.md#r-prev-008)): a URI of VS Code for the extension, with the
 * rendered document, to which the script of the preview adds the line of the block, the text before the selected text
 * and the selected text. A rendering without a document, or of a document that can have no notes, has none.
 * @param env - The environment of the rendering.
 */
function addLink(env: unknown): string | undefined {
  const document = renderedOf(env);
  const file = document && (fileOf(document) ?? document);
  const open = file && vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === file.toString());
  if (!document || !open || !isNoteDocument(open)) {
    return undefined;
  }
  return `${vscode.env.uriScheme}://${extensionId}${addPath}?${new URLSearchParams({ document: document.toString() }).toString()}`;
}

/**
 * openFromLink selects the note of a link of the preview, and opens the side view for a link that opens it. The link
 * names a document and a line. A link can also come from outside VS Code, so the extension opens only a Markdown
 * document that is open or that belongs to the workspace, and only shows its notes. A link that deselects the selected
 * note of an open document deselects it. A link of "Add Note" of an open document opens the editor of a new note in the
 * side view, which the user writes and adds.
 * @param uri - The URI that VS Code passes to the extension.
 * @param view - The side view.
 */
async function openFromLink(uri: vscode.Uri, view: NotesView): Promise<void> {
  const query = new URLSearchParams(uri.query);
  if (uri.path === addPath) {
    const target = query.get('document');
    const line = Number(query.get('line'));
    const document = target && vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === vscode.Uri.parse(target).toString());
    if (document && Number.isInteger(line) && line >= 0) {
      await view.addFromPreview(document, line, query.get('before') ?? '', query.get('text') ?? '');
    }
    return;
  }
  if (uri.path === deselectPath) {
    const target = query.get('document');
    const document = target && vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === vscode.Uri.parse(target).toString());
    if (document) {
      view.deselect(document.uri);
    }
    return;
  }
  const target = query.get('document');
  const line = Number(query.get('line'));
  if ((uri.path !== openPath && uri.path !== selectPath) || !target || !Number.isInteger(line) || line < 0) {
    return;
  }
  const parsed = vscode.Uri.parse(target);
  let document = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === parsed.toString());
  if (!document && vscode.workspace.getWorkspaceFolder(parsed)) {
    document = await vscode.workspace.openTextDocument(parsed).then(undefined, () => undefined);
  }
  if (document && isNoteDocument(document)) {
    await (uri.path === openPath ? view.show(document.uri, line) : view.choose(document.uri, line));
  }
}

/**
 * renderMarkdown renders a Markdown text with the Markdown preview of VS Code and its plugins, for the side view.
 * @param text - The Markdown text.
 */
async function renderMarkdown(text: string): Promise<string> {
  const html = await vscode.commands.executeCommand<unknown>('markdown.api.render', text);
  if (typeof html !== 'string') {
    throw new Error('The Markdown preview rendered no HTML.');
  }
  return html;
}

/**
 * setSetting turns a setting of the extension on or off, in the settings that decide the value for the window: the
 * settings of the workspace when they hold a value, else the settings of the user. The change of the setting
 * showHighlights renders the previews again and changes the highlights of the text editors; the change of the setting
 * showFootnotes shows the side view again.
 * @param key - The setting: showHighlights or showFootnotes.
 * @param value - The new value.
 */
async function setSetting(key: 'showHighlights' | 'showFootnotes', value: boolean): Promise<void> {
  const configuration = vscode.workspace.getConfiguration(settingsSection);
  const inWorkspace = configuration.inspect(key)?.workspaceValue !== undefined;
  await configuration.update(key, value, inWorkspace ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global);
}

/** markdownExtension is the identifier of the Markdown extension of VS Code, which owns the Markdown preview. */
const markdownExtension = 'vscode.markdown-language-features';

/**
 * refreshMarkdownPreviews renders the Markdown previews again, so that they use a changed setting of the extension.
 * While the Markdown extension is not active, no Markdown preview is open, and the command would only start that
 * extension, so nothing happens then.
 */
function refreshMarkdownPreviews(): void {
  if (vscode.extensions.getExtension(markdownExtension)?.isActive) {
    vscode.commands.executeCommand('markdown.preview.refresh').then(undefined, () => undefined);
  }
}

/**
 * activate starts the extension.
 * @param context - The extension context, which holds the registrations to dispose on deactivation.
 * @returns The export of the extension, which the Markdown extension of VS Code reads.
 */
export function activate(context: vscode.ExtensionContext): Api {
  const threads = new NoteThreads(() => githubLogin(true));
  context.subscriptions.push(threads, ...threads.register());
  const selected = new SelectedNotes();
  /**
   * showsHighlights tells whether the highlights of a document show: the setting showHighlights is on.
   * @param document - The URI of the document, or undefined for the settings of the window.
   */
  const showsHighlights = (document: vscode.Uri | undefined): boolean => readSettings(document).showHighlights;
  const editor = new NoteEditor(threads, showsHighlights, selected);
  const clean = new CleanView(showsHighlights, selected, (document) => readSettings(document).showFootnotes);
  const steps = new FormatSteps();
  const view = new NotesView(context.extensionUri, threads, githubLogin, renderMarkdown, readSettings, selected, clean);
  const slash = new SlashCommands(threads, (editor, range, todo) => view.addFromText(editor, range, todo), (editor) => view.addFootnoteFrom(editor), clean);
  /** apiV1 is version 1 of the API for other extensions (R-GEN-012). */
  const apiV1: ApiV1 = {
    version: 1,
    fileOf,
    registerFormatStep: (step) => steps.register(step),
    registerHiddenBlocks: (blocks) => clean.registerHiddenBlocks((lines) => blocks.find(lines)),
    registerSlashCommand: (command) => slash.add(command),
  };
  /**
   * saveChangesOf returns the changes of a document before its save that its settings and its notes ask for: the
   * format while the setting formatOnSave is on and the document has notes, the comment of the format, a part whose
   * text the formatter keeps current (a listing, a value of the front matter, an anchor), or a part that a
   * step of another extension formats (R-FMT-001, R-GEN-012), and the comment of the format while the setting addFormatComment is on and the document has notes (R-NOTE-007).
   * @param document - The document.
   */
  const saveChangesOf = (document: vscode.TextDocument): SaveChanges => {
    const settings = readSettings(document.uri);
    if (clean.reverts(document.uri)) {
      // The file goes back to its text on disk after its clean editing view closed without a save.
      return { format: false, comment: false };
    }
    const notes = threads.notesOf(document).length > 0;
    return { format: settings.formatOnSave && (notes || findDoctype(linesOf(document)) !== undefined || keptCurrent(linesOf(document)) || steps.appliesTo(document)), comment: settings.addFormatComment && notes };
  };
  /** contextsChanged shows the buttons that fit the settings showHighlights and showFootnotes. */
  const contextsChanged = (): void => {
    void vscode.commands.executeCommand('setContext', highlightsContext, showsHighlights(undefined));
    void vscode.commands.executeCommand('setContext', footnotesContext, readSettings(undefined).showFootnotes);
  };
  /** showsChanged shows or hides the highlights in the text editors and the previews, and the buttons that fit. */
  const showsChanged = (): void => {
    contextsChanged();
    editor.showsChanged();
    clean.showsChanged();
    refreshMarkdownPreviews();
  };
  context.subscriptions.push(
    editor,
    ...editor.register(),
    clean,
    ...clean.register(),
    view,
    vscode.window.registerWebviewViewProvider(notesViewId, view, { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.window.registerUriHandler({ handleUri: (uri) => openFromLink(uri, view) }),
    ...registerFormatter(extensionId, saveChangesOf, steps),
    new AddNoteAction(threads, viewCommands.newNote, clean).register(),
    ...slash.register(),
    ...new Snippets().register(),
    vscode.commands.registerCommand(highlightCommands.show, async () => {
      if (!readSettings(undefined).showHighlights) {
        await setSetting('showHighlights', true);
      }
    }),
    vscode.commands.registerCommand(highlightCommands.hide, () => setSetting('showHighlights', false)),
    vscode.commands.registerCommand(footnoteCommands.show, async () => {
      if (!readSettings(undefined).showFootnotes) {
        await setSetting('showFootnotes', true);
      }
    }),
    vscode.commands.registerCommand(footnoteCommands.hide, () => setSetting('showFootnotes', false)),
    // The preview shows the selected note with a strong highlight, and scrolls to it on a request.
    selected.onDidChange(() => refreshMarkdownPreviews()),
    // The preview of a clean editing view renders the text of its file, which can change while the clean text stays.
    clean.onDidChangeMarkup(() => refreshMarkdownPreviews()),
    // The Markdown preview renders again only when its document or its own settings change.
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(settingsSection)) {
        if (event.affectsConfiguration(`${settingsSection}.showHighlights`)) {
          view.deselectAll();
        }
        showsChanged();
        view.settingsChanged();
      }
    }),
  );
  contextsChanged();
  return {
    extendMarkdownIt: (md) =>
      extendMarkdownIt(md, {
        settingsOf: (env) => ({ showHighlights: showsHighlights(documentOf(env)) }),
        linkOf: noteLink,
        selectedOf: (env) => {
          const document = documentOf(env);
          return document && { label: selected.labelOf(document), reveal: selected.revealOf(document) };
        },
        deselectLinkOf: deselectLink,
        addLinkOf: addLink,
        sourceOf: (text) => clean.sourceOf(text),
        imageOf: (env, source) => {
          const document = renderedOf(env);
          const provider = (env as { resourceProvider?: { asWebviewUri(uri: vscode.Uri): vscode.Uri } }).resourceProvider;
          const image = document && provider && clean.imageOf(document, source);
          return image ? provider.asWebviewUri(image).toString(true) : undefined;
        },
      }),
    notesOf: (document) => threads.entriesOf(document).map((entry) => entry.note),
    getAPI: (version) => (version === 1 ? apiV1 : undefined),
  };
}

/** deactivate stops the extension. VS Code disposes the registrations of the context. */
export function deactivate(): void {}
