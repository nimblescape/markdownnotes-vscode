// @vitest-environment happy-dom
// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The tests of the extensions of the Markdown preview of VS Code in the editor (docs/requirements.md, R-VSC-010): the
// extensions that the adapter takes, the blocks that their plugins show in another way, the page with their style
// sheets and scripts, and the blocks in the editor of the page, with the event `vscode.markdown.updateContent`.

import { MarkdownEditor } from '@nimblescape/markdowneditor';
import type MarkdownIt from 'markdown-it';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registerMarkdownEditor, type MarkdownEditorHandle, type MarkdownEditorRegistration } from '../adapter/editor';
import { previewContributions, PreviewRenderer } from '../adapter/preview';
import { editorElementId, pagesElementId } from '../adapter/messages';
import { FakeUri, fakeVsCode, openPanel, type FakeVsCode } from './fakeVscode';
import { connectVsCode, type VsCodeConnection } from './connection';
import { previewPlugin, updateContentEvent } from './previewPlugin';

/**
 * math is a markdown-it plugin as an extension of the Markdown preview has one: a block between two lines `$$` and
 * code blocks `mermaid` as diagrams, through the option `highlight`, as the Mermaid extension of VS Code does.
 */
function math(md: MarkdownIt): MarkdownIt {
  md.block.ruler.before(
    'fence',
    'math_block',
    (state, startLine, endLine, silent) => {
      const line = (at: number) => state.src.slice(state.bMarks[at] + state.tShift[at], state.eMarks[at]);
      if (line(startLine) !== '$$') {
        return false;
      }
      let end = startLine + 1;
      while (end < endLine && line(end) !== '$$') {
        end++;
      }
      if (!silent) {
        const token = state.push('math_block', 'div', 0);
        token.block = true;
        token.content = state.getLines(startLine + 1, end, 0, false);
        token.map = [startLine, end + 1];
      }
      state.line = end + 1;
      return true;
    },
    { alt: ['paragraph'] },
  );
  md.renderer.rules.math_block = (tokens, index) => `<div class="math">${md.utils.escapeHtml(tokens[index].content.trim())}</div>\n`;
  const highlight = md.options.highlight;
  md.options.highlight = (code, language, attrs) =>
    language === 'mermaid' ? `<pre class="mermaid">${md.utils.escapeHtml(code)}</pre>` : language === 'ts' ? `<pre class="hl"><code>${md.utils.escapeHtml(code)}</code></pre>` : (highlight?.(code, language, attrs) ?? '');
  // A container whose token leaves out its closing line, as markdown-it-container does.
  md.block.ruler.before('fence', 'note_box', (state, startLine, endLine, silent) => {
    const line = (at: number) => state.src.slice(state.bMarks[at] + state.tShift[at], state.eMarks[at]);
    if (line(startLine) !== '::: note') {
      return false;
    }
    let end = startLine + 1;
    while (end < endLine && line(end) !== ':::') {
      end++;
    }
    if (!silent) {
      const token = state.push('note_box', 'aside', 0);
      token.block = true;
      token.content = state.getLines(startLine + 1, end, 0, false);
      token.map = [startLine, end];
    }
    state.line = end + 1;
    return true;
  });
  md.renderer.rules.note_box = (tokens, index) => `<aside class="note">${md.utils.escapeHtml(tokens[index].content.trim())}</aside>\n`;
  // Emoji inside a paragraph, which the editor does not show.
  md.core.ruler.push('smile', (state) => {
    for (const token of state.tokens) {
      token.children?.forEach((child) => {
        if (child.type === 'text') {
          child.content = child.content.replace(':smile:', '😄');
        }
      });
    }
  });
  return md;
}

const file = [
  '---',
  'title: Test',
  '---',
  '# Title',
  '',
  'Text :smile:.',
  '',
  '$$',
  'x^2',
  '$$',
  '',
  '```mermaid',
  'graph TD',
  '```',
  '',
  '```ts',
  'let a = 1;',
  '```',
  '',
  '::: note',
  'A note.',
  ':::',
  '',
  '- $$ in a list',
  '',
].join('\n');

describe('the analysis of the blocks', () => {
  it('finds the top-level blocks that the plugins show in another way, with their HTML', () => {
    const { blocks, languages } = new PreviewRenderer([math]).analyze(file);
    expect(blocks).toEqual([
      { text: '$$\nx^2\n$$', html: '<div class="math">x^2</div>\n' },
      { text: '```mermaid\ngraph TD\n```', html: '<pre class="mermaid">graph TD\n</pre>\n' },
      { text: '::: note\nA note.\n:::', html: '<aside class="note">A note.</aside>\n' },
    ]);
    expect(languages).toEqual(['mermaid']);
  });

  it('keeps a code block whose HTML is still code, the paragraphs and the front matter', () => {
    const { blocks } = new PreviewRenderer([math]).analyze(file);
    expect(blocks.map((block) => block.text).join('\n')).not.toMatch(/let a|smile|title|# Title|in a list/);
  });

  it('reads a text with the line breaks of Windows and a byte order mark', () => {
    const { blocks } = new PreviewRenderer([math]).analyze(`\ufeff${file.replace(/\n/g, '\r\n')}`);
    expect(blocks.map((block) => block.text)).toEqual(['$$\nx^2\n$$', '```mermaid\ngraph TD\n```', '::: note\nA note.\n:::']);
  });

  it('finds nothing without plugins', () => {
    expect(new PreviewRenderer([]).analyze(file)).toEqual({ blocks: [], languages: [] });
  });
});

let fake: FakeVsCode;
let stop: MarkdownEditorHandle | undefined;
const connections: VsCodeConnection[] = [];
const editors: MarkdownEditor[] = [];

beforeEach(() => {
  fake = fakeVsCode();
  document.body.innerHTML = `<div id="${editorElementId}"></div><iframe id="${pagesElementId}" srcdoc="" hidden></iframe><script nonce="abc"></script>`;
});

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
  connections.splice(0).forEach((connection) => connection.dispose());
  stop?.dispose();
  stop = undefined;
});

/** extension returns an installed extension with a package.json and the exports of its activate. */
function extension(id: string, contributes: Record<string, unknown>, exports: unknown = {}) {
  return {
    id,
    extensionUri: FakeUri.file(`/extensions/${id}`),
    packageJSON: { contributes },
    activate: () => Promise.resolve(exports),
  };
}

describe('the extensions of the Markdown preview', () => {
  it('are the enabled extensions with plugins of markdown-it, without those with plugins of the editor and the own one', () => {
    fake.extensions.push(
      extension('b.math', {
        'markdown.markdownItPlugins': true,
        'markdown.previewStyles': ['./styles/math.css', '../outside.css'],
        'markdown.previewScripts': ['./dist/plain.js', { path: './dist/module.js', type: 'module' }],
      }),
      extension('a.styles', { 'markdown.previewStyles': ['./look.css'] }),
      extension('c.paper', { 'markdown.markdownItPlugins': true, 'nimblescape.markdown.extensions': { editorScripts: ['dist/plugins.js'] } }),
      extension('d.own', { 'markdown.markdownItPlugins': true }),
    );
    const found = previewContributions(fake.api, FakeUri.file('/extensions/d.own/dist/webview.js') as never);
    expect(found.map((contribution) => contribution.extension.id)).toEqual(['b.math']);
    expect(found[0].styles.map((uri) => uri.path)).toEqual(['/extensions/b.math/styles/math.css']);
    expect(found[0].scripts.map((script) => [script.uri.path, script.module])).toEqual([
      ['/extensions/b.math/dist/plain.js', false],
      ['/extensions/b.math/dist/module.js', true],
    ]);
  });
});

describe('the blocks of the extensions in the editor', () => {
  /** register registers the editor and installs an extension of the Markdown preview with the plugin `math`. */
  function register(options: Partial<MarkdownEditorRegistration> = {}): void {
    fake.extensions.push(
      extension(
        'test.math',
        { 'markdown.markdownItPlugins': true, 'markdown.previewStyles': ['./math.css'], 'markdown.previewScripts': [{ path: './diagrams.js', type: 'module' }] },
        { extendMarkdownIt: math },
      ),
    );
    stop = registerMarkdownEditor(fake.api, {
      viewType: 'nimblescape.test.editor',
      script: FakeUri.file('/extension/dist/webview.js') as never,
      styles: [FakeUri.file('/extension/dist/markdown.css') as never],
      ...options,
    });
  }

  /** start opens a text in the editor, connects the page and creates the editor with the plugin of the preview. */
  async function start(text: string, options: Partial<MarkdownEditorRegistration> = {}) {
    register(options);
    const document = fake.open(text);
    const panel = await openPanel(fake, document);
    const connecting = connectVsCode({ api: panel.pageApi });
    await panel.settle();
    const connection = await connecting;
    connections.push(connection);
    await panel.settle();
    const editor = new MarkdownEditor(connection.element, { source: connection.source, id: 'webview', host: connection.host, plugins: [previewPlugin(connection.preview)] });
    editors.push(editor);
    return { document, panel, connection, editor };
  }

  /** types returns the types of the top-level blocks of the editor. */
  const types = (editor: MarkdownEditor) => {
    const doc = editor.tiptap.state.doc;
    return [...Array(doc.childCount).keys()].map((index) => doc.child(index).type.name);
  };

  const wait = (time: number) => new Promise((resolve) => setTimeout(resolve, time));

  it('loads the style sheets before those of the editor and the scripts after the script of the page', async () => {
    const { panel } = await start('Text\n');
    const html = panel.webview.html;
    expect(html.indexOf('/extensions/test.math/math.css')).toBeGreaterThan(0);
    expect(html.indexOf('/extensions/test.math/math.css')).toBeLessThan(html.indexOf('/extension/dist/markdown.css'));
    expect(html).toMatch(/<script nonce="[0-9a-f]+" type="module" src="https:\/\/webview\.test\/extensions\/test\.math\/diagrams\.js"><\/script>\n {2}<\/body>/);
    expect(html.indexOf('diagrams.js')).toBeGreaterThan(html.indexOf('/extension/dist/webview.js'));
    expect(panel.webview.options.localResourceRoots?.map((uri) => uri.path)).toContain('/extensions/test.math');
  });

  it('shows each block that the extensions show with their HTML, and sends the event of a new content', async () => {
    let events = 0;
    const count = () => events++;
    window.addEventListener(updateContentEvent, count);
    try {
      const { editor, connection } = await start(file);
      expect(connection.preview.blocks).toHaveLength(3);
      expect(types(editor)).toEqual(['frontMatter', 'heading', 'paragraph', 'rawBlock', 'rawBlock', 'codeBlock', 'rawBlock', 'bulletList']);
      const units = connection.element.querySelectorAll('.nsmd-unit-rendered');
      expect(units[0].querySelector('.math')?.textContent).toBe('x^2');
      expect(units[1].querySelector('pre.mermaid')?.textContent).toBe('graph TD\n');
      expect(units[2].querySelector('aside.note')?.textContent).toBe('A note.');
      expect(editor.getMarkdown()).toBe(file);
      await wait(5);
      expect(events).toBeGreaterThan(0);
    } finally {
      window.removeEventListener(updateContentEvent, count);
    }
  });

  it('follows a change of the document', async () => {
    const { document, panel, editor, connection } = await start('Text\n');
    expect(types(editor)).toEqual(['paragraph']);
    fake.change(document, 'Text\n\n$$\ny\n$$\n');
    await panel.settle();
    expect(types(editor)).toEqual(['paragraph', 'paragraph']);
    await wait(200);
    await panel.settle();
    expect(types(editor)).toEqual(['paragraph', 'rawBlock']);
    expect(connection.element.querySelector('.nsmd-unit-rendered .math')?.textContent).toBe('y');
    expect(editor.getMarkdown()).toBe('Text\n\n$$\ny\n$$\n');
  });

  it('shows a new code block of a known language as its code until the extension answers', async () => {
    const { panel, editor, connection } = await start('```mermaid\ngraph TD\n```\n');
    expect(types(editor)).toEqual(['rawBlock']);
    const unit = connection.element.querySelector<HTMLElement>('.nsmd-unit-rendered')!;
    unit.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    const field = unit.querySelector('textarea')!;
    field.value = '```mermaid\ngraph LR\n```';
    field.dispatchEvent(new FocusEvent('blur'));
    expect(types(editor)).toEqual(['rawBlock']);
    expect(connection.element.querySelector('.nsmd-unit-rendered .nsmd-preview-waiting')?.textContent).toBe('```mermaid\ngraph LR\n```');
    await panel.settle();
    await wait(200);
    await panel.settle();
    expect(connection.element.querySelector('.nsmd-unit-rendered pre.mermaid')?.textContent).toBe('graph LR\n');
    expect(editor.getMarkdown()).toBe('```mermaid\ngraph LR\n```\n');
  });

  it('shows nothing of the extensions when the option turns them off', async () => {
    const { panel, editor, connection } = await start(file, { previewExtensions: () => false });
    expect(panel.webview.html).not.toContain('math.css');
    expect(connection.preview.blocks).toEqual([]);
    expect(types(editor)).toEqual(['frontMatter', 'heading', 'paragraph', 'paragraph', 'codeBlock', 'codeBlock', 'paragraph', 'bulletList']);
  });
});
