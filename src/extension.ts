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
 * highlights of the preview, which select a note in the side view, and the
 * links of the preview that deselect the selected note, and the buttons "Show
 * Highlights" and "Hide Highlights", and refreshes the previews and the notes
 * when a setting of the extension changes.
 *
 * The highlights show while the setting `showHighlights` is on and the side
 * view is open (Hannes, 2026-10-28: "closing the side view, also hides the
 * highlights"). The context key highlightsContext tells the menus whether
 * they show: the title of the editors has "Hide Highlights" then, and else
 * "Show Highlights", which turns the setting on and opens the side view.
 */

import type MarkdownIt from 'markdown-it';
import * as vscode from 'vscode';
import { AddNoteAction } from './addNoteAction';
import { registerFormatter, type SaveChanges } from './formatter';
import { githubLogin } from './github';
import { extendMarkdownIt } from './markdown/markdownIt';
import { NoteEditor } from './noteEditor';
import { findDoctype } from './notes/doctype';
import type { Note } from './notes/notes';
import { isNoteDocument, linesOf, NoteThreads } from './noteThreads';
import { notesViewId, NotesView, viewCommands } from './notesView';
import { SelectedNotes } from './selectedNotes';
import { checkedSettings, type Settings, settingsSection } from './settings';

/** extensionId is the identifier of the extension: the publisher and the name of the manifest. */
export const extensionId = 'nimblescape.nimblescape-markdown-notes';

/** openPath is the path of the links that select a note in the side view. */
export const openPath = '/open';

/** deselectPath is the path of the links of the preview that deselect the selected note, for a click outside its highlight. */
export const deselectPath = '/deselect';

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

/** Api is the export of the extension. */
export interface Api {
  /** extendMarkdownIt adds the notes to the markdown-it instance of the Markdown preview. */
  extendMarkdownIt(md: MarkdownIt): MarkdownIt;
  /** notesOf returns the notes of an open document, for the tests in VS Code. */
  notesOf(document: vscode.Uri): readonly Note[];
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
 * documentOf returns the document that the Markdown preview renders. The preview names it in the environment of the
 * rendering (`currentDocument`); a rendering without a document, such as a side of the rendered diff, has none.
 * @param env - The environment of the rendering.
 */
function documentOf(env: unknown): vscode.Uri | undefined {
  const document = (env as { currentDocument?: unknown } | undefined)?.currentDocument;
  return typeof document === 'object' && document !== null && 'scheme' in document ? (document as vscode.Uri) : undefined;
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
 * openFromLink selects the note of a link of the preview in the side view. The link names a document and a line. A
 * link can also come from outside VS Code, so the extension opens only a Markdown document that is open or that belongs
 * to the workspace, and only shows its notes. A link that deselects the selected note of an open document deselects
 * it.
 * @param uri - The URI that VS Code passes to the extension.
 * @param view - The side view.
 */
async function openFromLink(uri: vscode.Uri, view: NotesView): Promise<void> {
  const query = new URLSearchParams(uri.query);
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
  if (uri.path !== openPath || !target || !Number.isInteger(line) || line < 0) {
    return;
  }
  const parsed = vscode.Uri.parse(target);
  let document = vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === parsed.toString());
  if (!document && vscode.workspace.getWorkspaceFolder(parsed)) {
    document = await vscode.workspace.openTextDocument(parsed).then(undefined, () => undefined);
  }
  if (document && isNoteDocument(document)) {
    await view.show(document.uri, line);
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
 * showHighlights renders the previews again and changes the highlights of the text editors.
 * @param key - The setting: showHighlights.
 * @param value - The new value.
 */
async function setSetting(key: 'showHighlights', value: boolean): Promise<void> {
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
   * showsHighlights tells whether the highlights of a document show: the setting showHighlights is on and the side view
   * is open. The side view and the text editor overlay exist before the first call, which comes after registering.
   * @param document - The URI of the document, or undefined for the settings of the window.
   */
  const showsHighlights = (document: vscode.Uri | undefined): boolean => readSettings(document).showHighlights && view.visible;
  const editor = new NoteEditor(threads, showsHighlights, selected);
  const view = new NotesView(context.extensionUri, threads, githubLogin, renderMarkdown, readSettings, selected);
  /**
   * saveChangesOf returns the changes of a document before its save that its settings and its notes ask for: the
   * format while the setting formatOnSave is on and the document has notes or the comment of the format (R-FMT-001),
   * and the comment of the format while the setting addFormatComment is on and the document has notes (R-NOTE-007).
   * @param document - The document.
   */
  const saveChangesOf = (document: vscode.TextDocument): SaveChanges => {
    const settings = readSettings(document.uri);
    const notes = threads.notesOf(document).length > 0;
    return { format: settings.formatOnSave && (notes || findDoctype(linesOf(document)) !== undefined), comment: settings.addFormatComment && notes };
  };
  /** showsChanged shows or hides the highlights in the text editors and the previews, and the buttons that fit. */
  const showsChanged = (): void => {
    void vscode.commands.executeCommand('setContext', highlightsContext, showsHighlights(undefined));
    editor.showsChanged();
    refreshMarkdownPreviews();
  };
  context.subscriptions.push(
    editor,
    ...editor.register(),
    view,
    vscode.window.registerWebviewViewProvider(notesViewId, view, { webviewOptions: { retainContextWhenHidden: true } }),
    view.onDidChangeVisibility(showsChanged),
    vscode.window.registerUriHandler({ handleUri: (uri) => openFromLink(uri, view) }),
    ...registerFormatter(extensionId, saveChangesOf),
    new AddNoteAction(threads, viewCommands.newNote).register(),
    vscode.commands.registerCommand(highlightCommands.show, async () => {
      if (!readSettings(undefined).showHighlights) {
        await setSetting('showHighlights', true);
      }
      if (!view.visible) {
        await view.open();
      }
    }),
    vscode.commands.registerCommand(highlightCommands.hide, () => setSetting('showHighlights', false)),
    // The preview shows the selected note with a strong highlight, and scrolls to it on a request.
    selected.onDidChange(() => refreshMarkdownPreviews()),
    // The Markdown preview renders again only when its document or its own settings change.
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(settingsSection)) {
        showsChanged();
        view.settingsChanged();
      }
    }),
  );
  void vscode.commands.executeCommand('setContext', highlightsContext, showsHighlights(undefined));
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
      }),
    notesOf: (document) => threads.entriesOf(document).map((entry) => entry.note),
  };
}

/** deactivate stops the extension. VS Code disposes the registrations of the context. */
export function deactivate(): void {}
