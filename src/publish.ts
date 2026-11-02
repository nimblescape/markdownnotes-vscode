// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The commands "Copy without Notes" and "Save Copy without Notes"
 * ([R-HIDE-004](../docs/requirements.md#r-hide-004)): they write the text of the active Markdown file without its
 * notes ([src/notes/strip.ts](notes/strip.ts)) to the clipboard, or into a file that the user chooses, for a website,
 * a PDF or another place where the text is published. The text is the text of the open document, also with changes
 * that are not saved. The commands never change the file itself, and write nothing for a file whose comment of the
 * format names a higher major version.
 */

import * as vscode from 'vscode';
import { formatVersion, newerFormat, versionText } from './notes/doctype';
import { stripText } from './notes/strip';

/** publishCommands are the commands of the text without notes, in the Command Palette and the menu of the side view. */
export const publishCommands = {
  copy: 'nimblescape.markdownNotes.copyWithoutNotes',
  save: 'nimblescape.markdownNotes.saveCopyWithoutNotes',
};

/**
 * nameOf returns the name of the file of a URI.
 * @param uri - The URI.
 */
const nameOf = (uri: vscode.Uri): string => uri.path.slice(uri.path.lastIndexOf('/') + 1);

/**
 * copyUriOf returns the proposed URI of the copy of a file without its notes: the same folder, and the name with
 * `-without-notes` before its extension.
 * @param uri - The URI of the file.
 */
export const copyUriOf = (uri: vscode.Uri): vscode.Uri => uri.with({ path: uri.path.replace(/(\.[^./]*)?$/, (extension) => `-without-notes${extension}`) });

/**
 * strippedOf returns the text of a file without its notes, or says why there is none and returns undefined.
 * @param file - The URI of the file, or undefined without an active Markdown file.
 */
async function strippedOf(file: vscode.Uri | undefined): Promise<string | undefined> {
  if (!file) {
    void vscode.window.showInformationMessage('Open a Markdown file first: the command writes the text of the active Markdown file without its notes.');
    return undefined;
  }
  const text = (await vscode.workspace.openTextDocument(file)).getText();
  const stripped = stripText(text);
  if (stripped === undefined) {
    const newer = newerFormat(text.split(/\r\n|\r|\n/)) ?? formatVersion;
    void vscode.window.showWarningMessage(
      `The file uses version ${versionText(newer)} of the format of the notes, and this version of the extension knows only the versions ${formatVersion.major}.x, so it writes no text without notes. Update the extension.`,
    );
  }
  return stripped;
}

/**
 * registerPublishCommands registers the commands of the text without notes.
 * @param fileOf - Returns the URI of the active Markdown file, the file behind a clean editing view, or undefined.
 */
export function registerPublishCommands(fileOf: () => vscode.Uri | undefined): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand(publishCommands.copy, async () => {
      const file = fileOf();
      const stripped = await strippedOf(file);
      if (file && stripped !== undefined) {
        await vscode.env.clipboard.writeText(stripped);
        vscode.window.setStatusBarMessage(`Copied the text of ${nameOf(file)} without its notes.`, 5000);
      }
    }),
    vscode.commands.registerCommand(publishCommands.save, async () => {
      const file = fileOf();
      const stripped = await strippedOf(file);
      if (!file || stripped === undefined) {
        return;
      }
      const target = await vscode.window.showSaveDialog({ defaultUri: copyUriOf(file), filters: { Markdown: ['md'] }, saveLabel: 'Save Copy', title: 'Save Copy without Notes' });
      if (!target) {
        return;
      }
      if (target.toString() === file.toString()) {
        void vscode.window.showWarningMessage('The copy without notes cannot replace the file itself. Choose another name.');
        return;
      }
      await vscode.workspace.fs.writeFile(target, new TextEncoder().encode(stripped));
      if ((await vscode.window.showInformationMessage(`Saved ${nameOf(target)}, the text of ${nameOf(file)} without its notes.`, 'Open')) === 'Open') {
        await vscode.window.showTextDocument(target);
      }
    }),
  ];
}
