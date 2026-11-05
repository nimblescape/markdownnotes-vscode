// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The layout of the side view "Notes" ([src/notesView.ts](notesView.ts)): its HTML page, which loads the script, the
 * styles and the visual editor of the view.
 */

import * as vscode from 'vscode';

/**
 * pageHtml returns the page of the view: its styles and its script, and the visual editor of the answers with its styles
 * ([R-SIDE-004](../docs/requirements.md#r-side-004)), with a policy that allows no other script and no other style,
 * also no style attribute: the scripts set their styles through the CSS object model, which the policy allows, and
 * the style elements of the editor carry the nonce of the page.
 * @param webview - The webview of the view.
 * @param media - The folder of the script and the styles.
 * @param dist - The folder of the bundle of the visual editor and its styles.
 */
export function pageHtml(webview: vscode.Webview, media: vscode.Uri, dist: vscode.Uri): string {
  const nonce = globalThis.crypto.randomUUID().replace(/-/g, '');
  const script = webview.asWebviewUri(vscode.Uri.joinPath(media, 'notesView.js'));
  const styles = webview.asWebviewUri(vscode.Uri.joinPath(media, 'notesView.css'));
  const editor = webview.asWebviewUri(vscode.Uri.joinPath(dist, 'visualEditor.js'));
  const editorStyles = webview.asWebviewUri(vscode.Uri.joinPath(dist, 'visualEditor.css'));
  const policy = `default-src 'none'; img-src ${webview.cspSource} https: data:; style-src ${webview.cspSource} 'nonce-${nonce}'; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';`;
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8">',
    `<meta http-equiv="Content-Security-Policy" content="${policy}">`,
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    `<link rel="stylesheet" href="${editorStyles.toString()}">`,
    `<link rel="stylesheet" href="${styles.toString()}">`,
    '<title>Notes</title>',
    '</head>',
    '<body>',
    '<main id="notes"></main>',
    `<script nonce="${nonce}" src="${editor.toString()}"></script>`,
    `<script nonce="${nonce}" src="${script.toString()}"></script>`,
    '</body>',
    '</html>',
  ].join('\n');
}
