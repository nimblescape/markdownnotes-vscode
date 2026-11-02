// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The script of the page of the editor of a whole file ([R-TEXT-010](../../docs/requirements.md#r-text-010)), the
 * bundle `dist/editor.js`: it connects to the document of VS Code through the adapter of nimblescape Markdown,
 * `@nimblescape/markdownvscode`, and creates the editor of rendered Markdown with the source of the connection, the
 * plugin of the notes ([src/webview/notesPlugin.ts](notesPlugin.ts)), with the button "Comment" in the format bar, and
 * the plugin of the figures, the tables, the listings, the references and the values of the front matter
 * ([src/webview/figuresPlugin.ts](figuresPlugin.ts)). The side view of the extension shows the threads of the notes, so
 * the editor shows no icons of threads beside the text.
 *
 * Before the editor starts, the page loads the plugins that other extensions contribute
 * ([R-GEN-012](../../docs/requirements.md#r-gen-012)), for example the plugins of Markdown Paper; they use the modules
 * of this page (`loadPlugins` of `@nimblescape/markdowneditor`). src/webview/editorStart.ts creates the editor.
 */

import { loadPlugins } from '@nimblescape/markdowneditor';
import { connectVsCode } from '@nimblescape/markdownvscode/webview';
import { start } from './editorStart';

void connectVsCode().then(async (connection) => start(connection, await loadPlugins(connection.pluginScripts, { nonce: connection.nonce })));
