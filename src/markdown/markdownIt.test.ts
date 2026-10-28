// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests render Markdown with markdown-it, the renderer of the built-in
 * Markdown preview, with and without the plugin. They check the icon of a
 * block note and of an inline note with its link (R-PREV-001, R-PREV-003),
 * the hidden callout with the answers of a thread (R-PREV-002, R-NOTE-004),
 * the paragraph that stays whole around an inline note (R-PREV-004), the lines
 * for the scrolling of the preview, the escaping of the author and the date,
 * the note that holds another comment (R-NOTE-003), the setting
 * showInPreview (R-PREV-005), and that the plugin changes nothing outside the
 * notes.
 */

import MarkdownIt from 'markdown-it';
import { describe, expect, test } from 'vitest';
import { extendMarkdownIt, noteClass } from './markdownIt';

/**
 * sourceMap is the plugin of the Markdown preview of VS Code that adds the first source line and the class
 * `code-line` to every block token, and an empty element with them before each HTML block
 * (extensions/markdown-language-features/src/markdownEngine.ts). The preview adds it after the plugins of the
 * extensions.
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
  const htmlBlock = md.renderer.rules.html_block!;
  md.renderer.rules.html_block = (tokens, index, options, env, self) => `<div ${self.renderAttrs(tokens[index])} ></div>\n${htmlBlock(tokens, index, options, env, self)}`;
};

/**
 * preview returns a markdown-it instance configured like the Markdown preview, with or without the plugin.
 * @param withPlugin - Whether the instance has the plugin.
 * @param showInPreview - The setting showInPreview.
 */
const preview = (withPlugin: boolean, showInPreview = true): MarkdownIt => {
  const md = new MarkdownIt({ html: true, linkify: true });
  const options = { settingsOf: () => ({ showInPreview }), linkOf: (_env: unknown, line: number) => `vscode://a.b/open?line=${line}` };
  return (withPlugin ? extendMarkdownIt(md, options) : md).use(sourceMap);
};

/**
 * plain returns the HTML of a text without the attributes of the scrolling, which the tests of the lines check.
 * @param html - The HTML.
 */
const plain = (html: string): string => html.replace(/ data-line="\d+" class="code-line" dir="auto"/g, '');

/** glyph is the image of the icon. */
const glyph = /<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="[^"]+"\/><\/svg>/;

/**
 * icons returns the HTML with a short mark for the image of each icon.
 * @param html - The HTML.
 */
const icons = (html: string): string => html.replace(new RegExp(glyph.source, 'g'), '[icon]');

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

  test('shows a block note as an icon in the margin with a hidden callout (R-PREV-001, R-PREV-002, R-PREV-003)', () => {
    const html = preview(true).render('# T\n\n<!-- note\n---\nauthor: hannes\ndate: 2026-10-28T10:15+01:00\n---\nThe **text**.\n\n- one\n-->\n\nPara.\n');
    expect(icons(html)).toBe(
      [
        '<h1 data-line="0" class="code-line" dir="auto">T</h1>',
        `<div class="${noteClass}-anchor"><a class="${noteClass}-icon ${noteClass}-color-1" aria-label="Note by hannes" aria-describedby="${noteClass}-1" href="vscode://a.b/open?line=2">[icon]</a></div>`,
        `<div class="${noteClass} ${noteClass}-color-1" id="${noteClass}-1" role="note" aria-label="Note by hannes" hidden>`,
        `<div class="${noteClass}-answer">`,
        `<div class="${noteClass}-header"><span class="${noteClass}-author">hannes</span><time class="${noteClass}-date" datetime="2026-10-28T10:15+01:00">2026-10-28 10:15</time></div>`,
        `<div class="${noteClass}-body">`,
        // The elements of the callout have no lines, so the scrolling of the preview does not use them.
        '<p dir="auto">The <strong>text</strong>.</p>',
        '<ul dir="auto">',
        '<li dir="auto">one</li>',
        '</ul>',
        '</div>',
        '</div>',
        '</div>',
        '<p data-line="12" class="code-line" dir="auto">Para.</p>',
        '',
      ].join('\n'),
    );
  });

  test('shows each answer of a thread in the callout, and the number of answers at the icon (R-NOTE-004)', () => {
    const html = plain(preview(true).render('<!-- note\n---\nauthor: hannes\n---\nCheck the dates.\n---\nauthor: anna\ndate: 2026-10-28\n---\nFriday works.\n-->\n'));
    expect(html).toContain(`aria-label="Note by hannes, 2 answers" aria-describedby="${noteClass}-1"`);
    expect(html).toContain(`<span class="${noteClass}-count">2</span></a>`);
    expect(html).toContain(
      [
        `<div class="${noteClass}-answer">`,
        `<div class="${noteClass}-header"><span class="${noteClass}-author">hannes</span></div>`,
        `<div class="${noteClass}-body">`,
        '<p dir="auto">Check the dates.</p>',
        '</div>',
        '</div>',
        `<div class="${noteClass}-answer">`,
        `<div class="${noteClass}-header"><span class="${noteClass}-author">anna</span><time class="${noteClass}-date" datetime="2026-10-28">2026-10-28</time></div>`,
        `<div class="${noteClass}-body">`,
        '<p dir="auto">Friday works.</p>',
      ].join('\n'),
    );
  });

  test('removes an inline note between two lines of a paragraph with its blanks, and keeps one paragraph (R-PREV-004)', () => {
    const html = icons(preview(true).render('Version 2.0 comes out.\n<!-- note inline\n---\nauthor: hannes\n---\nWhich day?\n-->\nThe beta starts before.\n\nNext.\n'));
    expect(html).toBe(
      [
        `<p data-line="0" class="code-line" dir="auto">Version 2.0 comes out.<a class="${noteClass}-icon ${noteClass}-color-1" aria-label="Note by hannes" aria-describedby="${noteClass}-1" href="vscode://a.b/open?line=1">[icon]</a> The beta starts before.</p>`,
        `<div class="${noteClass} ${noteClass}-color-1" id="${noteClass}-1" role="note" aria-label="Note by hannes" hidden>`,
        `<div class="${noteClass}-answer">`,
        `<div class="${noteClass}-header"><span class="${noteClass}-author">hannes</span></div>`,
        `<div class="${noteClass}-body">`,
        '<p dir="auto">Which day?</p>',
        '</div>',
        '</div>',
        '</div>',
        '<p data-line="9" class="code-line" dir="auto">Next.</p>',
        '',
      ].join('\n'),
    );
  });

  test('joins the paragraph around several inline notes, also in a list item and a block quote, with a space and no line break', () => {
    const notes = '<!-- note inline\nA\n-->\n<!-- note inline\nB\n-->\n';
    expect(icons(plain(preview(true).render(`One\n${notes}Two\n`)))).toMatch(/^<p>One<a [^>]*>\[icon\]<\/a><a [^>]*>\[icon\]<\/a> Two<\/p>\n/);
    expect(icons(plain(preview(true).render('- One\n  <!-- note inline\n  A\n  -->\n  Two\n')))).toMatch(/^<ul>\n<li>One<a [^>]*>\[icon\]<\/a> Two<div class="nimblescape-note nimblescape-note-color-1" [^]*<\/div>\n<\/li>\n<\/ul>\n$/);
    expect(icons(plain(preview(true).render('> One\n> <!-- note inline\n> A\n> -->\n> Two\n')))).toMatch(/^<blockquote>\n<p>One<a [^>]*>\[icon\]<\/a> Two<\/p>\n<div class/);
    // The option breaks of markdown-it, which the setting markdown.preview.breaks turns on, adds no line break either.
    const breaks = extendMarkdownIt(new MarkdownIt({ html: true, breaks: true }), { settingsOf: () => ({ showInPreview: true }), linkOf: () => undefined });
    expect(icons(breaks.render(`One\n${notes}Two\n`))).not.toContain('<br>');
    // A text after `-->` on the last line of the note follows after a space.
    expect(icons(plain(preview(true).render('One\n<!-- note inline\nA\n-->  and two\n')))).toMatch(/^<p>One<a [^>]*>\[icon\]<\/a> and two<\/p>\n/);
  });

  test('puts the icon of an inline note at the end of the text before it, at the start of the text after it, or in the margin', () => {
    expect(icons(plain(preview(true).render('# Title\n<!-- note inline\nA\n-->\n')))).toMatch(/^<h1>Title<a [^>]*>\[icon\]<\/a><\/h1>\n<div class/);
    expect(icons(plain(preview(true).render('<!-- note inline\nA\n-->\nTwo\n')))).toMatch(/^<p><a [^>]*>\[icon\]<\/a> Two<\/p>\n<div class/);
    expect(icons(plain(preview(true).render('# Title\n\n<!-- note inline\nA\n-->\n\nTwo\n')))).toMatch(/^<h1>Title<a [^>]*>\[icon\]<\/a><\/h1>\n<div class[^]*<p>Two<\/p>\n$/);
    expect(icons(plain(preview(true).render('- item\n\n<!-- note inline\nA\n-->\n\n| a |\n| - |\n')))).toMatch(/<\/ul>\n<div class="nimblescape-note-anchor"><a [^>]*>\[icon\]<\/a><\/div>\n<div class/);
  });

  test('an inline note never ends a paragraph: blank lines around it join the paragraphs before and after it (R-PREV-004)', () => {
    for (const text of ['One\n<!-- note inline\nA\n-->\n\nTwo\n', 'One\n\n<!-- note inline\nA\n-->\nTwo\n', 'One\n\n\n<!-- note inline\n\n---\nauthor: ann\n---\nA\n\n# Text\n-->\n\nTwo\n']) {
      expect(icons(plain(preview(true).render(text))), text).toMatch(/^<p>One<a [^>]*>\[icon\]<\/a> Two<\/p>\n<div class="nimblescape-note nimblescape-note-color-1" [^]*<\/div>\n$/);
      expect(preview(true, false).render(text), text).toBe('<p data-line="0" class="code-line" dir="auto">One Two</p>\n');
    }
    // A block note between two paragraphs keeps them apart.
    expect(icons(plain(preview(true).render('One\n\n<!-- note\nA\n-->\n\nTwo\n')))).toMatch(/^<p>One<\/p>\n<div class="nimblescape-note-anchor">[^]*<p>Two<\/p>\n$/);
  });

  test('shows a note in the text of a line as an icon after the word before it, and its callout after the paragraph', () => {
    const html = icons(plain(preview(true).render('A sentence <!-- note\nFirst\n-->   and <!-- note\nSecond\n--> end.\n\nNext.\n')));
    expect(html).toMatch(
      new RegExp(
        `^<p>A sentence<a class="${noteClass}-icon ${noteClass}-color-1" aria-label="Note" aria-describedby="${noteClass}-1" href="vscode://a\\.b/open\\?line=0">\\[icon\\]</a> and<a [^>]*href="vscode://a\\.b/open\\?line=2">\\[icon\\]</a> end\\.</p>\n<div class="${noteClass} ${noteClass}-color-1" id="${noteClass}-1"[^]*<p dir="auto">First</p>[^]*<div class="${noteClass} ${noteClass}-color-2" id="${noteClass}-2"[^]*<p dir="auto">Second</p>[^]*</div>\n<p>Next\\.</p>\n$`,
      ),
    );
  });

  test('shows a note in a block quote in the block quote', () => {
    const html = plain(preview(true).render('> <!-- note\n> In a quote\n> -->\n'));
    expect(html).toMatch(new RegExp(`^<blockquote>\n<div class="${noteClass}-anchor">[^]*<p dir="auto">In a quote</p>\n</div>\n</div>\n</div>\n</blockquote>\n$`));
  });

  test('escapes the author and the date, and removes the marks of the rendered diff from them', () => {
    const html = preview(true).render('<!-- note\n---\nauthor: <b>A</b><span data-diff-start="1"></span>\ndate: "soon & later"\n---\nText\n-->\n');
    expect(html).toContain(`<span class="${noteClass}-author">&lt;b&gt;A&lt;/b&gt;</span>`);
    expect(html).toContain('aria-label="Note by &lt;b&gt;A&lt;/b&gt;"');
    expect(html).toContain(`<time class="${noteClass}-date" datetime="soon &amp; later">soon &amp; later</time>`);
  });

  test('escapes the link, and shows an icon without a link that takes the focus when the rendering has no document', () => {
    const md = extendMarkdownIt(new MarkdownIt({ html: true }), { settingsOf: () => ({ showInPreview: true }), linkOf: (env) => (env as { link?: string }).link });
    expect(md.render('<!-- note\nText\n-->\n', { link: 'vscode://a.b/open?x="1"&y=2' })).toContain('href="vscode://a.b/open?x=&quot;1&quot;&amp;y=2"');
    expect(md.render('<!-- note\nText\n-->\n', {})).toContain(`<span class="${noteClass}-icon ${noteClass}-color-1" aria-label="Note" aria-describedby="${noteClass}-1" role="img" tabindex="0">`);
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

  test('gives each callout of a page its own ID', () => {
    const html = preview(true).render('<!-- note\nA\n-->\n\nB <!-- note\nC\n-->\n');
    expect([...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1])).toEqual([`${noteClass}-1`, `${noteClass}-2`]);
  });

  test('keeps the comments that are no notes, and the notes in code and table cells, as without the plugin', () => {
    for (const text of ['<!-- plain -->\n\nText <!-- other --> x\n', '| a |\n| - |\n| x <!-- note --> |\n', '`<!-- note\nx\n-->`\n']) {
      expect(preview(true).render(text), text).toBe(preview(false).render(text));
    }
  });

  test('with showInPreview off, shows no icon and no callout, and still removes the inline notes with their blanks (R-PREV-005)', () => {
    const text = '<!-- note\nBlock\n-->\n\nOne\n<!-- note inline\nInline\n-->\nTwo <!-- note\nIn a line\n--> three.\n';
    expect(preview(true, false).render(text)).toBe('<p data-line="4" class="code-line" dir="auto">One Two three.</p>\n');
  });

  test('shows a note with a selection by its icon at the end of the selection, with the two edges of the selection (R-NOTE-006)', () => {
    const note = (id: string) => `<!-- note\n---\nauthor: hannes\nselection: ${id}\n---\nWhich?\n-->\n`;
    const html = icons(preview(true).render(`The agents <!--[a1-->change the work<!--a1]--> of teams.\n${note('a1')}\nNext.\n`));
    expect(html).toBe(
      [
        '<p data-line="0" class="code-line" dir="auto">The agents ' +
          `<span class="${noteClass}-edge" data-selection="a1" data-edge="start" data-color="1"></span>change the work` +
          `<span class="${noteClass}-edge" data-selection="a1" data-edge="end" data-color="1"></span>` +
          `<a class="${noteClass}-icon ${noteClass}-color-1" aria-label="Note by hannes" aria-describedby="${noteClass}-1" href="vscode://a.b/open?line=1">[icon]</a> of teams.</p>`,
        // The note after the paragraph has no icon of its own in the margin, only its callout.
        `<div class="${noteClass} ${noteClass}-color-1" id="${noteClass}-1" role="note" aria-label="Note by hannes" hidden>`,
        `<div class="${noteClass}-answer">`,
        `<div class="${noteClass}-header"><span class="${noteClass}-author">hannes</span></div>`,
        `<div class="${noteClass}-body">`,
        '<p dir="auto">Which?</p>',
        '</div>',
        '</div>',
        '</div>',
        '<p data-line="9" class="code-line" dir="auto">Next.</p>',
        '',
      ].join('\n'),
    );
    // Without an opening marker the selection starts at the start of its paragraph, and a point shows the icon only.
    expect(icons(plain(preview(true).render(`The agents change<!--a1]--> the work.\n\n${note('a1')}`)))).toMatch(
      /^<p>The agents change<span class="nimblescape-note-edge" data-selection="a1" data-edge="end" data-color="1"><\/span><a [^>]*>\[icon\]<\/a> the work\.<\/p>\n<div class/,
    );
    expect(icons(plain(preview(true).render(`One <!--[a2]-->two.\n${note('a2')}`)))).toMatch(/^<p>One <a [^>]*>\[icon\]<\/a>two\.<\/p>\n<div class/);
    // Markers without a note stay comments, and with showInPreview off the markers vanish with the notes.
    expect(preview(true).render('One <!--[a1-->two<!--a1]-->.\n')).toBe(preview(false).render('One <!--[a1-->two<!--a1]-->.\n'));
    expect(preview(true, false).render(`The agents <!--[a1-->change the work<!--a1]--> of teams.\n${note('a1')}`)).toBe('<p data-line="0" class="code-line" dir="auto">The agents change the work of teams.</p>\n');
  });

  test('reads the setting and the link for the environment of each rendering', () => {
    const environments: unknown[] = [];
    const md = extendMarkdownIt(new MarkdownIt({ html: true }), {
      settingsOf: (env) => {
        environments.push(env);
        return { showInPreview: (env as { show?: boolean }).show ?? true };
      },
      linkOf: () => undefined,
    });
    const tokens = md.parse('<!-- note\nText\n-->\n', {});
    expect(md.renderer.render(tokens, md.options, { show: false })).not.toContain(noteClass);
    expect(md.renderer.render(tokens, md.options, { show: true })).toContain(noteClass);
    expect(environments).toContainEqual({ show: false });
  });
});
