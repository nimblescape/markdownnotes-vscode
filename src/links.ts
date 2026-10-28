// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The links of the rendered notes in the side view "Notes"
 * ([R-SIDE-005](../docs/requirements.md#r-side-005)). The page of the view
 * resolves a relative link against its own address, and VS Code opens only
 * some schemes from a webview, so the script of the view sends each click on
 * a link to the extension. This module opens the link as the Markdown preview
 * of VS Code does: a web link or a mail link with the system, a link to a file
 * in VS Code, relative to the folder of the Markdown file of the note, at the
 * heading or the line that its fragment names. A link of another scheme opens
 * with the system only after the user agrees, and a link that runs a command
 * or holds its own content never opens.
 */

import * as vscode from 'vscode';

/** externalSchemes are the schemes of the links that the system opens without a question: web pages and mail. */
const externalSchemes = new Set(['http', 'https', 'mailto']);

/** refusedSchemes are the schemes of the links that never open: they run code or hold their content in the link. */
const refusedSchemes = new Set(['command', 'javascript', 'vbscript', 'data', 'blob', 'vscode-webview', 'vscode-resource']);

/**
 * decoded returns a text without its percent-encoding, or the text itself when it holds no valid encoding.
 * @param text - The text.
 */
function decoded(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

/**
 * unescaped returns the text of the value of an HTML attribute.
 * @param value - The value, with the escapes of HTML.
 */
function unescaped(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|#39|#(\d+));/g, (_, name: string, code: string | undefined) =>
    code ? String.fromCharCode(Number(code)) : { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[name]!,
  );
}

/**
 * headingLine returns the index of the line of the heading whose identifier a fragment names, in the HTML that the
 * Markdown preview renders for a file. The preview gives each heading the identifier of its text and the index of its
 * line.
 * @param html - The rendered HTML of the file.
 * @param fragment - The fragment of the link, without "#".
 */
export function headingLine(html: string, fragment: string): number | undefined {
  const wanted = decoded(fragment).toLowerCase();
  for (const [tag] of html.matchAll(/<h[1-6]\s[^>]*>/gi)) {
    const id = /\sid="([^"]*)"/i.exec(tag)?.[1];
    const line = /\sdata-line="(\d+)"/i.exec(tag)?.[1];
    if (id !== undefined && line !== undefined && decoded(unescaped(id)).toLowerCase() === wanted) {
      return Number(line);
    }
  }
  return undefined;
}

/** Target is the place that a link names. */
type Target =
  | { kind: 'system'; uri: vscode.Uri; ask: boolean }
  | { kind: 'file'; uri: vscode.Uri; fragment: string }
  | { kind: 'refused'; scheme: string };

/**
 * targetOf returns the place that a link of a note names. A link without a scheme is a path: relative to the folder of
 * the document, or to the folder of its workspace when it starts with "/"; a link of only a fragment names a place in
 * the document itself.
 * @param href - The address of the link, as the rendered HTML holds it.
 * @param document - The Markdown document of the note.
 */
function targetOf(href: string, document: vscode.Uri | undefined): Target | undefined {
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(href)?.[1].toLowerCase();
  if (scheme === 'file') {
    const uri = vscode.Uri.parse(href);
    return { kind: 'file', uri: uri.with({ fragment: '' }), fragment: uri.fragment };
  }
  if (scheme !== undefined) {
    if (refusedSchemes.has(scheme)) {
      return { kind: 'refused', scheme };
    }
    return { kind: 'system', uri: vscode.Uri.parse(href), ask: !externalSchemes.has(scheme) && scheme !== vscode.env.uriScheme };
  }
  if (!document) {
    return undefined;
  }
  const [, path = '', fragment = ''] = /^([^?#]*)(?:\?[^#]*)?(?:#(.*))?$/.exec(href) ?? [];
  if (path === '') {
    return { kind: 'file', uri: document, fragment };
  }
  const folder = vscode.workspace.getWorkspaceFolder(document)?.uri;
  const base = path.startsWith('/') ? (folder ?? document.with({ path: '/' })) : vscode.Uri.joinPath(document, '..');
  return { kind: 'file', uri: vscode.Uri.joinPath(base, decoded(path)), fragment };
}

/**
 * positionOf returns the position that the fragment of a link names in a document: a line as "L12" or "L12,5", or a
 * heading of a Markdown file by its identifier, as the Markdown preview gives it.
 * @param document - The document.
 * @param fragment - The fragment, without "#".
 * @param render - Renders a Markdown text as the Markdown preview does.
 */
async function positionOf(document: vscode.TextDocument, fragment: string, render: (text: string) => Promise<string>): Promise<vscode.Position | undefined> {
  const line = /^L(\d+)(?:,(\d+))?$/i.exec(fragment);
  if (line) {
    return new vscode.Position(Math.max(Number(line[1]) - 1, 0), Math.max(Number(line[2] ?? 1) - 1, 0));
  }
  if (document.languageId !== 'markdown') {
    return undefined;
  }
  const heading = headingLine(await render(document.getText()).catch(() => ''), fragment);
  return heading === undefined ? undefined : new vscode.Position(heading, 0);
}

/**
 * openLink opens a link of a rendered note in the side view.
 * @param href - The address of the link, as the rendered HTML holds it.
 * @param document - The Markdown document of the note, or undefined.
 * @param render - Renders a Markdown text as the Markdown preview does, to find a heading.
 */
export async function openLink(href: string, document: vscode.Uri | undefined, render: (text: string) => Promise<string>): Promise<void> {
  const target = targetOf(href.trim(), document);
  if (!target) {
    return;
  }
  if (target.kind === 'refused') {
    void vscode.window.showErrorMessage(`The link was not opened: the side view opens no link of the scheme "${target.scheme}:".`);
    return;
  }
  if (target.kind === 'system') {
    const open = 'Open';
    const text = target.uri.toString(true);
    if (target.ask && (await vscode.window.showWarningMessage(`Open the link "${text}" with the program of your system?`, { modal: true }, open)) !== open) {
      return;
    }
    await vscode.env.openExternal(target.uri);
    return;
  }
  const stat = await vscode.workspace.fs.stat(target.uri).then(
    (found) => found,
    () => undefined,
  );
  if (!stat) {
    void vscode.window.showErrorMessage(`The link was not opened: the file ${target.uri.path} does not exist.`);
    return;
  }
  if (stat.type & vscode.FileType.Directory) {
    await vscode.commands.executeCommand('revealInExplorer', target.uri);
    return;
  }
  const opened =
    target.fragment === ''
      ? undefined
      : await vscode.workspace.openTextDocument(target.uri).then(
          (found) => found,
          () => undefined,
        );
  const position = opened && (await positionOf(opened, target.fragment, render));
  if (!opened || !position) {
    // A link without a place, and a file that is no text, such as an image or a PDF, open in the editor that VS Code
    // has for the file.
    await vscode.commands.executeCommand('vscode.open', target.uri);
    return;
  }
  const visible = vscode.window.visibleTextEditors.find((editor) => editor.document.uri.toString() === opened.uri.toString());
  await vscode.window.showTextDocument(opened, { viewColumn: visible?.viewColumn, selection: new vscode.Range(position, position) });
}
