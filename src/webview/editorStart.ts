// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The start of the editor of a whole file ([R-TEXT-010](../../docs/requirements.md#r-text-010)) on the page of the
 * bundle `dist/editor.js` (src/webview/editor.ts): the plugins of this extension, with the plugin that shows the blocks
 * of the extensions of the Markdown preview of VS Code ([R-VSC-010](../../docs/requirements.md#r-vsc-010)), and the
 * plugins that other extensions contribute ([R-GEN-012](../../docs/requirements.md#r-gen-012)). A plugin with the name of another plugin of the editor
 * is left out, and when the plugins of other extensions stop the start of the editor, the editor starts with the plugins
 * of this extension only.
 */

import { MarkdownEditor, type MarkdownPlugin } from '@nimblescape/markdowneditor';
import type { VsCodeConnection } from './connection';
import { figuresPlugin } from './figuresPlugin';
import { createNotesPlugin } from './notesPlugin';
import { previewPlugin } from './previewPlugin';

/**
 * withOthers returns the plugins of this extension and, after them, the plugins of other extensions with names that no
 * plugin before them has.
 * @param own - The plugins of this extension.
 * @param others - The plugins of other extensions.
 */
export function withOthers(own: readonly MarkdownPlugin[], others: readonly MarkdownPlugin[]): MarkdownPlugin[] {
  const names = new Set(own.map((plugin) => plugin.name));
  const plugins = [...own];
  for (const plugin of others) {
    if (!names.has(plugin.name)) {
      names.add(plugin.name);
      plugins.push(plugin);
    }
  }
  return plugins;
}

/**
 * start creates the editor of the page with the plugins of this extension and of other extensions.
 * @param connection - The connection of the page to the document.
 * @param others - The plugins of other extensions.
 */
export function start(connection: VsCodeConnection, others: readonly MarkdownPlugin[]): MarkdownEditor {
  const create = (plugins: MarkdownPlugin[]) =>
    new MarkdownEditor(connection.element, {
      source: connection.source,
      editable: connection.editable,
      id: 'webview',
      host: connection.host,
      plugins,
      threadIcons: false,
    });
  const own = [createNotesPlugin({ comment: true, slashCommands: true }), figuresPlugin, previewPlugin(connection.preview)];
  if (others.length === 0) {
    return create(own);
  }
  try {
    return create(withOthers(own, others));
  } catch {
    connection.element.replaceChildren();
    return create(own);
  }
}
