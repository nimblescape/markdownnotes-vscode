// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The links of the rendered notes: in the side view "Notes"
 * ([R-SIDE-005](../docs/requirements.md#r-side-005)), in the boxes of the text
 * editor and in the callouts of the Markdown preview
 * ([R-GEN-010](../docs/requirements.md#r-gen-010)). The page of the side view
 * resolves a relative link against its own address, and VS Code opens only
 * some schemes from a webview, so the script of the view sends each click on
 * a link to the extension. A link to a file in a box runs a command of the
 * extension, and in a callout it is a URI of VS Code for the extension.
 *
 * This module opens the link as the Markdown preview of VS Code does: a web
 * link or a mail link with the system, a link to a file relative to the
 * folder of the Markdown file of the note, at the heading or the line that its
 * fragment names. The setting `openLinksIn` chooses where a file opens: in a
 * new window of VS Code, in the editor of VS Code, or with the program of the
 * system. A link to a place in the Markdown file itself opens in its editor. A
 * link of another scheme opens with the system only after the user agrees, a
 * file that is no document opens with the system only after the user agrees,
 * and a link that runs a command or holds its own content never opens.
 */

import * as vscode from 'vscode';
import type { LinkTarget } from './settings';

/** openLinkCommand is the command that the links to files of the boxes run, with the link and the URI of the document of the note. */
export const openLinkCommand = 'nimblescape.markdownNotes.openLink';

/**
 * documentTypes are the extensions of the files that the program of the system opens without a question: documents and
 * images, which open in a viewer. The system asks first for any other file, which could be a program.
 */
const documentTypes = new Set(
  ['pdf', 'epub', 'txt', 'md', 'markdown', 'html', 'htm', 'csv', 'json', 'xml', 'doc', 'docx', 'odt', 'rtf', 'xls', 'xlsx', 'ods', 'ppt', 'pptx', 'odp', 'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'tif', 'tiff', 'bib', 'ris'].map(
    (type) => `.${type}`,
  ),
);

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
 * isFileLink tells whether the address of a link names a file: a path, or a URI of the scheme `file`. A web link, a
 * mail link, and a link of only a fragment, which names a place in the document itself, name none.
 * @param href - The address of the link.
 */
export function isFileLink(href: string): boolean {
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(href)?.[1].toLowerCase();
  return scheme === undefined ? href !== '' && !href.startsWith('#') : scheme === 'file';
}

/**
 * commandLinks returns a Markdown text whose links to files have another address, for the box of a note: inline links
 * `[text](address)` and the definitions of reference links `[label]: address`. Fenced code blocks and code spans stay
 * as they are. The box shows the returned text, and its editor the text itself.
 * @param text - The Markdown text.
 * @param address - Returns the new address of a link to a file.
 */
export function commandLinks(text: string, address: (href: string) => string): string {
  const replaced = (destination: string): string => {
    const href = destination.startsWith('<') ? destination.slice(1, -1) : destination;
    return isFileLink(href) ? address(href) : destination;
  };
  let fence: string | undefined;
  return text
    .split('\n')
    .map((line) => {
      const marks = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
      if (fence) {
        if (marks && marks[0] === fence[0] && marks.length >= fence.length && line.trim() === marks) {
          fence = undefined;
        }
        return line;
      }
      if (marks) {
        fence = marks;
        return line;
      }
      const definition = /^( {0,3}\[[^\]]+\]:[ \t]*)(<[^<>]*>|\S+)(.*)$/.exec(line);
      if (definition) {
        return definition[1] + replaced(definition[2]) + definition[3];
      }
      return line
        .split(/(`+[^`]*`+)/)
        .map((part, index) =>
          index % 2 === 1 ? part : part.replace(/\]\(([ \t]*)(<[^<>\n]*>|[^\s()<>]+(?:\([^\s()]*\)[^\s()<>]*)*)/g, (_, space: string, destination: string) => `](${space}${replaced(destination)}`),
        )
        .join('');
    })
    .join('\n');
}

/**
 * commandAddress returns the address of a link of a box that runs the command openLinkCommand with the link and the
 * document of the note. The arguments are JSON, and the parentheses are encoded too, so that they do not end the link.
 * @param href - The address of the link.
 * @param document - The URI of the Markdown document of the note.
 */
export const commandAddress = (href: string, document: vscode.Uri): string =>
  `command:${openLinkCommand}?${encodeURIComponent(JSON.stringify([href, document.toString()])).replace(/\(/g, '%28').replace(/\)/g, '%29')}`;

/**
 * openFile opens a file in VS Code: in a new window, or in the editor at a position. A file that a tab of VS Code shows
 * already opens in that tab, also in another window.
 * @param uri - The URI of the file.
 * @param position - The position, or undefined for a file without a place, which opens in the editor that VS Code has for it.
 * @param target - The place: a new window or the editor.
 */
async function openFile(uri: vscode.Uri, position: vscode.Position | undefined, target: 'newWindow' | 'editor'): Promise<void> {
  const shown = vscode.window.tabGroups.all.find((group) =>
    group.tabs.some((tab) => (tab.input as { uri?: vscode.Uri } | undefined)?.uri?.toString() === uri.toString()),
  );
  const viewColumn = shown?.viewColumn;
  const selection = position && new vscode.Range(position, position);
  // A file that is no text, such as an image or a PDF, opens in the editor that VS Code has for it.
  await vscode.commands.executeCommand('vscode.open', uri, { viewColumn, selection, preview: false });
  if (target === 'newWindow' && !shown) {
    await vscode.commands.executeCommand('workbench.action.moveEditorToNewWindow');
  }
}

/**
 * openLink opens a link of a rendered note.
 * @param href - The address of the link, as the rendered HTML holds it.
 * @param document - The Markdown document of the note, or undefined.
 * @param render - Renders a Markdown text as the Markdown preview does, to find a heading.
 * @param target - The place where a file opens: the setting openLinksIn.
 */
export async function openLink(href: string, document: vscode.Uri | undefined, render: (text: string) => Promise<string>, target: LinkTarget = 'editor'): Promise<void> {
  const place = targetOf(href.trim(), document);
  if (!place) {
    return;
  }
  if (place.kind === 'refused') {
    void vscode.window.showErrorMessage(`The link was not opened: the extension opens no link of the scheme "${place.scheme}:".`);
    return;
  }
  if (place.kind === 'system') {
    const open = 'Open';
    const text = place.uri.toString(true);
    if (place.ask && (await vscode.window.showWarningMessage(`Open the link "${text}" with the program of your system?`, { modal: true }, open)) !== open) {
      return;
    }
    await vscode.env.openExternal(place.uri);
    return;
  }
  const stat = await vscode.workspace.fs.stat(place.uri).then(
    (found) => found,
    () => undefined,
  );
  if (!stat) {
    void vscode.window.showErrorMessage(`The link was not opened: the file ${place.uri.path} does not exist.`);
    return;
  }
  if (stat.type & vscode.FileType.Directory) {
    await vscode.commands.executeCommand('revealInExplorer', place.uri);
    return;
  }
  if (target === 'system' && place.uri.toString() !== document?.toString()) {
    const open = 'Open';
    const type = /\.[^./]*$/.exec(place.uri.path)?.[0].toLowerCase() ?? '';
    if (!documentTypes.has(type) && (await vscode.window.showWarningMessage(`Open the file "${place.uri.path}" with the program of your system?`, { modal: true }, open)) !== open) {
      return;
    }
    await vscode.env.openExternal(place.uri);
    return;
  }
  const opened =
    place.fragment === ''
      ? undefined
      : await vscode.workspace.openTextDocument(place.uri).then(
          (found) => found,
          () => undefined,
        );
  const position = opened && (await positionOf(opened, place.fragment, render));
  // A place in the Markdown file of the note opens in its editor.
  await openFile(place.uri, position, place.uri.toString() === document?.toString() ? 'editor' : target === 'system' ? 'editor' : target);
}
