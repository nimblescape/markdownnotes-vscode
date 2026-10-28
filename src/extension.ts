// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The editor wiring of the extension. The manifest contributes the settings,
 * the commands of the boxes of the notes with their buttons, the side view,
 * and the styles and the script of the Markdown preview. Activation returns
 * the markdown-it plugin ([src/markdown/markdownIt.ts](markdown/markdownIt.ts)),
 * which the Markdown extension of VS Code reads from the export
 * `extendMarkdownIt` when it builds its preview. It starts the threads of the
 * notes in the text editor and in the Comments view
 * ([src/noteThreads.ts](noteThreads.ts)), their overlay of the text editor
 * ([src/noteEditor.ts](noteEditor.ts)), and the side view
 * ([src/notesView.ts](notesView.ts)), with the GitHub login of the user as the
 * author of new notes ([src/github.ts](github.ts)), and the formatter of
 * Markdown documents ([src/formatter.ts](formatter.ts)). It handles the links of
 * the icons of the preview, which open a note in the side view, or in its box
 * while the side view does not show, the links to files of the callouts of the
 * preview and of the boxes ([src/links.ts](links.ts)), the links of the preview
 * that deselect the selected note, and the buttons of the preview, which show
 * and hide its notes and its icons, and refreshes the previews and the
 * threads when a setting of the extension changes.
 */

import type MarkdownIt from 'markdown-it';
import * as vscode from 'vscode';
import { registerFormatter } from './formatter';
import { githubLogin } from './github';
import { extendMarkdownIt, type PreviewSettings } from './markdown/markdownIt';
import { isFileLink, openLink, openLinkCommand } from './links';
import { NoteEditor } from './noteEditor';
import { isNoteDocument, NoteThreads } from './noteThreads';
import { notesViewId, NotesView, viewCommands } from './notesView';
import { SelectedNotes } from './selectedNotes';
import { checkedSettings, type Settings, settingsSection, showsInSideView } from './settings';

/** extensionId is the identifier of the extension: the publisher and the name of the manifest. */
export const extensionId = 'nimblescape.nimblescape-markdown-notes';

/** openPath is the path of the links that open a note in the side view. */
export const openPath = '/open';

/** linkPath is the path of the links of the callouts of the preview that open a file that a link of a note names. */
export const linkPath = '/link';

/** deselectPath is the path of the links of the preview that deselect the selected note, for a click outside its passage. */
export const deselectPath = '/deselect';

/**
 * previewCommands are the commands of the buttons in the title of the Markdown preview, which show and hide its notes
 * ([R-PREV-005](../docs/requirements.md#r-prev-005)), and its icons of the notes
 * ([R-PREV-007](../docs/requirements.md#r-prev-007)).
 */
export const previewCommands = {
  show: 'nimblescape.markdownNotes.showInPreview',
  hide: 'nimblescape.markdownNotes.hideInPreview',
  showIcons: 'nimblescape.markdownNotes.showIconsInPreview',
  hideIcons: 'nimblescape.markdownNotes.hideIconsInPreview',
};

/** Api is the export of the extension. */
export interface Api {
  /** extendMarkdownIt adds the notes to the markdown-it instance of the Markdown preview. */
  extendMarkdownIt(md: MarkdownIt): MarkdownIt;
  /** threadsOf returns the threads of the notes of an open document, for the tests in VS Code. */
  threadsOf(document: vscode.Uri): readonly vscode.CommentThread[];
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
 * previewSettingsOf returns the settings of the document that the Markdown preview renders, or the settings of the
 * window for a rendering without a document.
 * @param env - The environment of the rendering.
 */
function previewSettingsOf(env: unknown): PreviewSettings {
  const { showInPreview, showCalloutOnHover, showIconsInPreview } = readSettings(documentOf(env));
  return { showInPreview, showCalloutOnHover, showIconsInPreview };
}

/**
 * noteLink returns the link of the icon of a note in the preview: a URI of VS Code for the extension, which opens the
 * note in the side view ([R-PREV-003](../docs/requirements.md#r-prev-003)). A rendering without a document has none.
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
 * click on the text outside the passage of the note ([R-PREV-003](../docs/requirements.md#r-prev-003)). A rendering
 * without a document has none.
 * @param env - The environment of the rendering.
 */
function deselectLink(env: unknown): string | undefined {
  const document = documentOf(env);
  return document && `${vscode.env.uriScheme}://${extensionId}${deselectPath}?${new URLSearchParams({ document: document.toString() }).toString()}`;
}

/**
 * fileLink returns the address of a link of a callout of the preview that names a file: a URI of VS Code for the
 * extension, which opens the file after the setting openLinksIn ([R-GEN-010](../docs/requirements.md#r-gen-010)). A
 * rendering without a document has none, and any other link keeps its address.
 * @param env - The environment of the rendering.
 * @param href - The address of the link.
 */
function fileLink(env: unknown, href: string): string | undefined {
  const document = documentOf(env);
  if (!document || !isFileLink(href)) {
    return undefined;
  }
  const query = new URLSearchParams({ document: document.toString(), href }).toString();
  return `${vscode.env.uriScheme}://${extensionId}${linkPath}?${query}`;
}

/**
 * openLinkFromPreview opens the file of a link of a callout of the preview. A link can also come from outside VS Code,
 * so the extension opens only a link of a Markdown document that is open in VS Code, and asks before it opens a file
 * that is no document with the program of the system.
 * @param uri - The URI that VS Code passes to the extension.
 */
async function openLinkFromPreview(uri: vscode.Uri): Promise<void> {
  const query = new URLSearchParams(uri.query);
  const target = query.get('document');
  const href = query.get('href');
  const document = target && vscode.workspace.textDocuments.find((candidate) => candidate.uri.toString() === vscode.Uri.parse(target).toString());
  if (document && href !== null && isNoteDocument(document)) {
    await openLink(href, document.uri, renderMarkdown, readSettings(document.uri).openLinksIn);
  }
}

/**
 * showBox opens the box of the note of a document at a line, in its text editor, for a link of the preview while the
 * side view does not show (setting showNotesIn "inline").
 * @param threads - The threads of the notes.
 * @param document - The document.
 * @param line - The index of a line of the note or of its selection.
 */
async function showBox(threads: NoteThreads, document: vscode.TextDocument, line: number): Promise<void> {
  const entry = threads.entryAt(document.uri, { line, character: 0 });
  const visible = vscode.window.visibleTextEditors.find((editor) => editor.document === document);
  const editor = await vscode.window.showTextDocument(document, { viewColumn: visible?.viewColumn });
  if (entry) {
    threads.expand(document.uri, entry.id);
    const range = threads.threadsOf(document.uri).find((thread) => threads.noteOfThread(thread) === entry.note)?.range;
    if (range) {
      editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    }
  }
}

/**
 * openFromLink opens the note of a link of the preview in the side view, or in its box while the side view does not
 * show. The link names a document and a line. A link can also come from outside VS Code, so the extension opens only a
 * Markdown document that is open or that belongs to the workspace, and only shows its notes. A link that deselects the
 * selected note of an open document deselects it.
 * @param uri - The URI that VS Code passes to the extension.
 * @param view - The side view.
 * @param threads - The threads of the notes.
 */
async function openFromLink(uri: vscode.Uri, view: NotesView, threads: NoteThreads): Promise<void> {
  if (uri.path === linkPath) {
    await openLinkFromPreview(uri);
    return;
  }
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
    await (showsInSideView(readSettings(document.uri)) ? view.show(document.uri, line) : showBox(threads, document, line));
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
 * settings of the workspace when they hold a value, else the settings of the user. The change of the settings
 * showInPreview and showIconsInPreview renders the previews again, and the change of showFunnels shows the side view
 * again.
 * @param key - The setting: showInPreview, showIconsInPreview or showFunnels.
 * @param value - The new value.
 */
async function setSetting(key: 'showInPreview' | 'showIconsInPreview' | 'showFunnels', value: boolean): Promise<void> {
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
  const threads = new NoteThreads(readSettings, () => githubLogin(true));
  context.subscriptions.push(threads, ...threads.register());
  const selected = new SelectedNotes();
  const editor = new NoteEditor(threads, readSettings, selected);
  context.subscriptions.push(editor, ...editor.register());
  const view = new NotesView(context.extensionUri, threads, githubLogin, renderMarkdown, readSettings, selected);
  context.subscriptions.push(
    view,
    vscode.window.registerWebviewViewProvider(notesViewId, view, { webviewOptions: { retainContextWhenHidden: true } }),
    vscode.window.registerUriHandler({ handleUri: (uri) => openFromLink(uri, view, threads) }),
    registerFormatter(),
    vscode.commands.registerCommand(openLinkCommand, (href: string, document: string) => {
      const uri = vscode.Uri.parse(document);
      return openLink(href, uri, renderMarkdown, readSettings(uri).openLinksIn);
    }),
    vscode.commands.registerCommand(previewCommands.show, () => setSetting('showInPreview', true)),
    vscode.commands.registerCommand(previewCommands.hide, () => setSetting('showInPreview', false)),
    vscode.commands.registerCommand(previewCommands.showIcons, () => setSetting('showIconsInPreview', true)),
    vscode.commands.registerCommand(previewCommands.hideIcons, () => setSetting('showIconsInPreview', false)),
    vscode.commands.registerCommand(viewCommands.showFunnels, () => setSetting('showFunnels', true)),
    vscode.commands.registerCommand(viewCommands.hideFunnels, () => setSetting('showFunnels', false)),
    // The preview shows the selected note with a strong highlight, and scrolls to it on a request.
    selected.onDidChange(() => refreshMarkdownPreviews()),
    // The Markdown preview renders again only when its document or its own settings change.
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(settingsSection)) {
        refreshMarkdownPreviews();
        threads.syncAll();
        view.settingsChanged();
      }
    }),
  );
  return {
    extendMarkdownIt: (md) =>
      extendMarkdownIt(md, {
        settingsOf: previewSettingsOf,
        linkOf: noteLink,
        fileLinkOf: fileLink,
        selectedOf: (env) => {
          const document = documentOf(env);
          return document && { label: selected.labelOf(document), reveal: selected.revealOf(document) };
        },
        deselectLinkOf: deselectLink,
      }),
    threadsOf: (document) => threads.threadsOf(document),
  };
}

/** deactivate stops the extension. VS Code disposes the registrations of the context. */
export function deactivate(): void {}
