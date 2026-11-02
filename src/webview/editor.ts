// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The script of the page of the editor of a whole file ([R-TEXT-010](../../docs/requirements.md#r-text-010)), the
 * bundle `dist/editor.js`: it connects to the document of VS Code through the adapter of nimblescape Markdown,
 * `@nimblescape/markdownvscode`, and creates the editor of rendered Markdown with the source of the connection and the
 * plugin of the notes ([src/webview/notesPlugin.ts](notesPlugin.ts)), with the button "Comment" in the format bar. The
 * side view of the extension shows the threads of the notes, so the editor shows no icons of threads beside the text.
 */

import { MarkdownEditor } from '@nimblescape/markdowneditor';
import { connectVsCode } from '@nimblescape/markdownvscode/webview';
import { createNotesPlugin } from './notesPlugin';

void connectVsCode().then((connection) => {
  new MarkdownEditor(connection.element, {
    source: connection.source,
    editable: connection.editable,
    id: 'webview',
    host: connection.host,
    plugins: [createNotesPlugin({ comment: true })],
    threadIcons: false,
  });
});
