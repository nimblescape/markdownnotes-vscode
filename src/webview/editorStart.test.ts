// @vitest-environment happy-dom
// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The tests of the start of the editor of a whole file with the plugins of other extensions (src/webview/editorStart.ts,
// R-GEN-012, R-TEXT-010): the plugins of other extensions come after the plugins of this extension, a plugin with the
// name of another one is left out, and the editor starts without the plugins of other extensions when they stop its
// start.

import type { MarkdownEditor, MarkdownPlugin } from '@nimblescape/markdowneditor';
import type { VsCodeConnection } from '@nimblescape/markdownvscode/webview';
import { TextSource } from '@nimblescape/markdowntext';
import { afterEach, expect, test } from 'vitest';
import { start, withOthers } from './editorStart';

let editors: MarkdownEditor[] = [];
afterEach(() => {
  editors.forEach((editor) => editor.destroy());
  editors = [];
  document.body.replaceChildren();
  document.head.querySelectorAll('style[data-nsmd-plugin]').forEach((style) => style.remove());
});

/** connection returns a connection of the page to a document with a text, without VS Code. */
function connection(text: string): VsCodeConnection {
  const element = document.createElement('div');
  document.body.append(element);
  return {
    source: new TextSource(text),
    editable: true,
    element,
    host: { platform: 'vscode', channel: () => ({ post: () => undefined, onMessage: () => () => undefined }) },
  } as unknown as VsCodeConnection;
}

/** namesOf returns the names of the plugins of an editor that their styles show. */
const plugin = (name: string, extra: Partial<MarkdownPlugin> = {}): MarkdownPlugin => ({ name, apiVersion: 1, ...extra });

test('the plugins of other extensions come after the plugins of this extension, without a second plugin of a name', () => {
  const own = [plugin('notes'), plugin('figures')];
  const others = [plugin('citations'), plugin('notes'), plugin('lists'), plugin('citations')];
  expect(withOthers(own, others).map((each) => each.name)).toEqual(['notes', 'figures', 'citations', 'lists']);
});

test('the editor shows the parts of the plugins of other extensions', () => {
  const editor = start(connection('A text.\n'), [plugin('marked', { styles: '.marked-by-paper { color: red; }' })]);
  editors.push(editor);
  expect(editor.getMarkdown()).toBe('A text.\n');
  expect(document.head.textContent).toContain('marked-by-paper');
});

test('the editor starts with the plugins of this extension when a plugin of another extension stops its start', () => {
  const failing = plugin('failing', {
    extendMarkdownIt: () => {
      throw new Error('The plugin fails.');
    },
  });
  const page = connection('# Title\n\nA text.\n');
  const editor = start(page, [failing]);
  editors.push(editor);
  expect(editor.getMarkdown()).toBe('# Title\n\nA text.\n');
  expect(page.element.querySelectorAll('.ProseMirror')).toHaveLength(1);
});
