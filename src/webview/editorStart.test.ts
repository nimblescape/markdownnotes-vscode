// @vitest-environment happy-dom
// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The tests of the start of the editor of a whole file with the plugins of other extensions (src/webview/editorStart.ts,
// R-GEN-012, R-TEXT-010): the plugins of other extensions come after the plugins of this extension, a plugin with the
// name of another one is left out, and the editor starts without the plugins of other extensions when they stop its
// start. The blocks of the extensions of the Markdown preview of VS Code show next to the notes (R-VSC-010).

import type { MarkdownEditor, MarkdownPlugin } from '@nimblescape/markdowneditor';
import type { PreviewBlock } from '../adapter/messages';
import type { VsCodeConnection } from './connection';
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

/**
 * connection returns a connection of the page to a document with a text, without VS Code.
 * @param text - The text of the document.
 * @param blocks - The blocks that the extensions of the Markdown preview show.
 */
function connection(text: string, blocks: PreviewBlock[] = []): VsCodeConnection {
  const element = document.createElement('div');
  document.body.append(element);
  return {
    source: new TextSource(text),
    editable: true,
    element,
    host: { platform: 'vscode', channel: () => ({ post: () => undefined, onMessage: () => () => undefined }) },
    preview: { blocks, languages: [], onChange: () => () => undefined },
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

test('the editor shows the blocks of the extensions of the Markdown preview, with the notes of the text', () => {
  const text = [
    'A <wbr><!--[note-7k2q-->marked text[^note-7k2q].',
    '',
    '$$',
    'x^2',
    '$$',
    '',
    '[^note-7k2q]: **hannes** · 2026-11-03 10:15+01:00',
    '',
    '    A note.',
    '',
  ].join('\n');
  const page = connection(text, [{ text: '$$\nx^2\n$$', html: '<p class="math">x^2</p>\n' }]);
  const editor = start(page, []);
  editors.push(editor);
  expect(page.element.querySelector('.nsmd-unit-rendered .math')?.textContent).toBe('x^2');
  expect([...page.element.querySelectorAll('[data-note="note-7k2q"].nsmd-note')].map((element) => element.textContent).join('')).toBe('marked text');
  expect(editor.getMarkdown()).toBe(text);
});
