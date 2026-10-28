// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests render Markdown with markdown-it, the renderer of the built-in
 * Markdown preview, with and without the plugin. They check the callout of a
 * note on lines of its own (R-PREV-001) and of a note in a paragraph
 * (R-PREV-002), the lines of the body for the scrolling of the preview, the
 * escaping of the author and the date, the note that holds another comment
 * (R-NOTE-003), the setting showInPreview (R-PREV-003), and that the plugin
 * changes nothing outside the notes.
 */

import MarkdownIt from 'markdown-it';
import { describe, expect, test } from 'vitest';
import { extendMarkdownIt, noteClass } from './markdownIt';

/**
 * sourceMap is the rule of the Markdown preview of VS Code that adds the first source line and the class
 * `code-line` to every block token (extensions/markdown-language-features/src/markdownEngine.ts). The preview adds it
 * after the plugins of the extensions.
 * @param md - The markdown-it instance.
 */
const sourceMap = (md: MarkdownIt): void => {
  md.core.ruler.push('source_map_data_attribute', (state) => {
    for (const token of state.tokens) {
      if (token.map && token.type !== 'inline') {
        token.attrSet('data-line', String(token.map[0]));
        token.attrJoin('class', 'code-line');
        token.attrJoin('dir', 'auto');
      }
    }
  });
};

/**
 * preview returns a markdown-it instance configured like the Markdown preview, with or without the plugin.
 * @param withPlugin - Whether the instance has the plugin.
 * @param showInPreview - The setting showInPreview.
 */
const preview = (withPlugin: boolean, showInPreview = true): MarkdownIt => {
  const md = new MarkdownIt({ html: true, linkify: true });
  return (withPlugin ? extendMarkdownIt(md, () => ({ showInPreview })) : md).use(sourceMap);
};

/** document is a Markdown text with every kind of block and comments that are no notes. */
const document = [
  '# Title',
  '',
  'A paragraph with `<!-- note` in code and a [link](https://example.com). <!-- a comment -->',
  '',
  '<!-- a comment of its own -->',
  '',
  '```js',
  '<!-- note',
  'code',
  '-->',
  '```',
  '',
  '- item',
  '',
  '> quote',
  '',
  '| a | b |',
  '| - | - |',
  '| <!-- note --> | c |',
  '',
  '<div>html</div>',
  '',
].join('\n');

describe('the plugin', () => {
  test('changes nothing in a text without notes', () => {
    expect(preview(true).render(document)).toBe(preview(false).render(document));
  });

  test('shows a note on lines of its own as a callout at its place (R-PREV-001)', () => {
    const html = preview(true).render('# T\n\n<!-- note\n---\nauthor: Hannes Stauss\ndate: 2026-10-28T10:15+01:00\n---\nThe **text**.\n\n- one\n-->\n\nPara.\n');
    expect(html).toBe(
      [
        '<h1 data-line="0" class="code-line" dir="auto">T</h1>',
        `<div class="${noteClass} code-line" data-line="2" dir="auto" role="note" aria-label="Note by Hannes Stauss">`,
        `<div class="${noteClass}-header"><span class="${noteClass}-author">Hannes Stauss</span><time class="${noteClass}-date" datetime="2026-10-28T10:15+01:00">2026-10-28 10:15</time></div>`,
        `<div class="${noteClass}-body">`,
        '<p data-line="7" class="code-line" dir="auto">The <strong>text</strong>.</p>',
        '<ul data-line="9" class="code-line" dir="auto">',
        '<li data-line="9" class="code-line" dir="auto">one</li>',
        '</ul>',
        '</div>',
        '</div>',
        '<p data-line="12" class="code-line" dir="auto">Para.</p>',
        '',
      ].join('\n'),
    );
  });

  test('shows a note in a paragraph as a number, and its callout after the paragraph (R-PREV-002)', () => {
    const html = preview(true).render('A sentence <!-- note\nFirst\n--> and <!-- note\nSecond\n--> end.\n\nNext.\n');
    expect(html).toBe(
      [
        `<p data-line="0" class="code-line" dir="auto">A sentence <sup class="${noteClass}-reference"><span class="${noteClass}-number">1</span></sup> and <sup class="${noteClass}-reference"><span class="${noteClass}-number">2</span></sup> end.</p>`,
        `<div class="${noteClass} code-line" data-line="0" dir="auto" role="note" aria-label="Note 1">`,
        `<div class="${noteClass}-header"><span class="${noteClass}-number">1</span><span class="${noteClass}-author">Note</span></div>`,
        `<div class="${noteClass}-body">`,
        '<p data-line="1" class="code-line" dir="auto">First</p>',
        '</div>',
        '</div>',
        `<div class="${noteClass} code-line" data-line="2" dir="auto" role="note" aria-label="Note 2">`,
        `<div class="${noteClass}-header"><span class="${noteClass}-number">2</span><span class="${noteClass}-author">Note</span></div>`,
        `<div class="${noteClass}-body">`,
        '<p data-line="3" class="code-line" dir="auto">Second</p>',
        '</div>',
        '</div>',
        '<p data-line="6" class="code-line" dir="auto">Next.</p>',
        '',
      ].join('\n'),
    );
  });

  test('shows a note in a block quote in the block quote', () => {
    const html = preview(true).render('> <!-- note\n> In a quote\n> -->\n');
    expect(html).toContain(`<blockquote data-line="0" class="code-line" dir="auto">\n<div class="${noteClass} code-line" data-line="0"`);
    expect(html).toContain('<p data-line="1" class="code-line" dir="auto">In a quote</p>\n</div>\n</div>\n</blockquote>');
  });

  test('escapes the author and the date, and removes the marks of the rendered diff from them', () => {
    const html = preview(true).render('<!-- note\n---\nauthor: <b>A</b><span data-diff-start="1"></span>\ndate: "soon & later"\n---\nText\n-->\n');
    expect(html).toContain(`<span class="${noteClass}-author">&lt;b&gt;A&lt;/b&gt;</span>`);
    expect(html).toContain('aria-label="Note by &lt;b&gt;A&lt;/b&gt;"');
    expect(html).toContain(`<time class="${noteClass}-date" datetime="soon &amp; later">soon &amp; later</time>`);
  });

  test('shows the text of a note that holds another comment as it is, so that the page stays visible (R-NOTE-003)', () => {
    const html = preview(true).render('<!-- note\nBad <!-- inner <b>\n-->\n\nAfter.\n');
    expect(html).toContain(`<p class="${noteClass}-problem">`);
    expect(html).toContain(`<pre class="${noteClass}-text">Bad &lt;!-- inner &lt;b&gt;</pre>`);
    expect(html).toContain('<p data-line="4" class="code-line" dir="auto">After.</p>');
  });

  test('shows an empty note as a callout with a header only', () => {
    expect(preview(true).render('<!-- note\n-->\n')).toContain(`<div class="${noteClass}-body">\n</div>`);
  });

  test('keeps the comments that are no notes, and the notes in code and table cells, as without the plugin', () => {
    for (const text of ['<!-- plain -->\n\nText <!-- other --> x\n', '| a |\n| - |\n| x <!-- note --> |\n', '`<!-- note\nx\n-->`\n']) {
      expect(preview(true).render(text), text).toBe(preview(false).render(text));
    }
  });

  test('with showInPreview off, shows the preview as without the plugin (R-PREV-003)', () => {
    const text = '<!-- note\nBlock\n-->\n\nA sentence <!-- note\nInline\n--> end.\n';
    expect(preview(true, false).render(text)).toBe(preview(false).render(text));
  });

  test('reads the setting for the environment of each rendering', () => {
    const environments: unknown[] = [];
    const md = extendMarkdownIt(new MarkdownIt({ html: true }), (env) => {
      environments.push(env);
      return { showInPreview: (env as { show?: boolean }).show ?? true };
    });
    expect(md.render('<!-- note\nText\n-->\n', { show: false })).not.toContain(noteClass);
    expect(md.render('<!-- note\nText\n-->\n', { show: true })).toContain(noteClass);
    expect(environments).toContainEqual({ show: false });
  });
});
