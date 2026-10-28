// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The editor wiring of the extension. The manifest contributes the settings,
 * the commands of the boxes of the notes with their buttons, and the styles of
 * the Markdown preview without code. Activation returns the markdown-it plugin
 * ([src/markdown/markdownIt.ts](markdown/markdownIt.ts)), which the Markdown
 * extension of VS Code reads from the export `extendMarkdownIt` when it builds
 * its preview, and starts the threads of the notes in the text editor and in
 * the Comments view ([src/noteThreads.ts](noteThreads.ts)). It reads the
 * settings, finds the author of a new note, and refreshes the previews and the
 * threads when a setting of the extension changes.
 */

import type MarkdownIt from 'markdown-it';
import * as vscode from 'vscode';
import { extendMarkdownIt, type PreviewSettings } from './markdown/markdownIt';
import { NoteThreads } from './noteThreads';
import { checkedSettings, type Settings, settingsSection } from './settings';

/** Api is the export of the extension. */
export interface Api {
  /** extendMarkdownIt adds the callouts of the notes to the markdown-it instance of the Markdown preview. */
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
 * previewSettingsOf returns the settings of the document that the Markdown preview renders. The preview names it in
 * the environment of the rendering (`currentDocument`); a rendering without a document, such as a side of the
 * rendered diff, gets the settings of the window.
 * @param env - The environment of the rendering.
 */
function previewSettingsOf(env: unknown): PreviewSettings {
  const document = (env as { currentDocument?: unknown } | undefined)?.currentDocument;
  const uri = typeof document === 'object' && document !== null && 'scheme' in document ? (document as vscode.Uri) : undefined;
  return { showInPreview: readSettings(uri).showInPreview };
}

/** GitRepository is the part of a repository of the Git extension of VS Code that the extension reads. */
interface GitRepository {
  getConfig(key: string): Promise<string>;
  getGlobalConfig(key: string): Promise<string>;
}

/** GitApi is the part of the API of the Git extension of VS Code (version 1) that the extension reads. */
interface GitApi {
  getRepository(uri: vscode.Uri): GitRepository | null;
}

/** gitExtension is the identifier of the Git extension of VS Code. */
const gitExtension = 'vscode.git';

/**
 * authorOf returns the author of a new note in a document ([R-EDIT-003](../docs/requirements.md#r-edit-003)): the
 * setting `author`, or else `user.name` of the Git configuration of the repository of the document, or undefined. The
 * Git extension can be off, for example in Restricted Mode; the note then names the author of the setting only.
 * @param document - The URI of the document.
 */
async function authorOf(document: vscode.Uri): Promise<string | undefined> {
  const setting = readSettings(document).author;
  if (setting) {
    return setting;
  }
  try {
    const extension = vscode.extensions.getExtension<{ getAPI(version: 1): GitApi }>(gitExtension);
    if (!extension) {
      return undefined;
    }
    const exports = extension.isActive ? extension.exports : await extension.activate();
    const repository = exports.getAPI(1).getRepository(document);
    if (!repository) {
      return undefined;
    }
    const name = (await repository.getConfig('user.name').catch(() => '')) || (await repository.getGlobalConfig('user.name').catch(() => ''));
    return name.trim() || undefined;
  } catch {
    return undefined;
  }
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
  const threads = new NoteThreads(readSettings, authorOf);
  context.subscriptions.push(
    threads,
    ...threads.register(),
    // The Markdown preview renders again only when its document or its own settings change.
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(settingsSection)) {
        refreshMarkdownPreviews();
        threads.syncAll();
      }
    }),
  );
  return {
    extendMarkdownIt: (md) => extendMarkdownIt(md, previewSettingsOf),
    threadsOf: (document) => threads.threadsOf(document),
  };
}

/** deactivate stops the extension. VS Code disposes the registrations of the context. */
export function deactivate(): void {}
