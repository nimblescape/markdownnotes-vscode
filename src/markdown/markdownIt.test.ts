// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests render Markdown with markdown-it, the renderer of the built-in
 * Markdown preview, with and without the plugin. They check the icon of a
 * note at its reference and in the margin with its link (R-PREV-001,
 * R-PREV-003), the hidden callout with the answers of a thread and the dates
 * in the local time of the reader and of the author (R-PREV-002, R-NOTE-002,
 * R-NOTE-004), the selections (R-NOTE-006), the text without the notes
 * (R-PREV-004), the lines for the scrolling of the preview, the escaping of
 * the link, the setting showInPreview (R-PREV-005), and that the plugin
 * changes nothing outside the notes. The tests run in the zone Europe/Vienna
 * (vitest.config.mts), which is UTC+01:00 on 2026-10-28.
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
  const options = {
    settingsOf: () => ({ showInPreview }),
    linkOf: (_env: unknown, line: number) => `vscode://a.b/open?line=${line}`,
    fileLinkOf: (_env: unknown, href: string) => (/^[a-z]+:|^#/.test(href) ? undefined : `vscode://a.b/link?href=${href}`),
  };
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

/** document is a Markdown text with every kind of block, comments, and footnotes that are no notes. */
const document = [
  '# Title',
  '',
  'A paragraph with `[^note-aaaa]` in code and a [link](https://example.com). <!-- a comment -->',
  '',
  '<!-- a comment of its own -->',
  '',
  '```js',
  '[^note-aaaa]: **hannes** · 2026-10-28 10:15+01:00',
  '```',
  '',
  '- item[^note-bbbb]',
  '',
  '> quote',
  '',
  '| a | b |',
  '| - | - |',
  '| c | d |',
  '',
  '<div>html</div>',
  '',
  '[^note-cccc]: Not a header.',
  '',
].join('\n');

/** header is the header of a first answer. */
const header = '**hannes** · 2026-10-28 10:15+01:00';

/**
 * iconOf returns the HTML of the icon of a note.
 * @param number - The number of the note.
 * @param line - The line of the definition, for the link.
 * @param label - The label of the icon.
 */
const iconOf = (number: number, line: number, label = 'Note by hannes'): string =>
  `<a class="${noteClass}-icon ${noteClass}-color-${number}" aria-label="${label}" aria-describedby="${noteClass}-${number}" href="vscode://a.b/open?line=${line}">[icon]</a>`;

/**
 * edgeOf returns the HTML of the start or the end of the selection of a note.
 * @param number - The number of the note.
 * @param edge - The start or the end.
 */
const edgeOf = (number: number, edge: 'start' | 'end'): string => `<span class="${noteClass}-edge" data-selection="${noteClass}-${number}" data-edge="${edge}" data-color="${number}"></span>`;

/** dateOf is the HTML of the date of the header. */
const dateOf = `<time class="${noteClass}-date" datetime="2026-10-28T10:15+01:00" title="2026-10-28 10:15 at the author (UTC+01:00)">2026-10-28 10:15</time>`;

describe('the plugin', () => {
  test('changes nothing in a text without notes', () => {
    expect(preview(true).render(document)).toBe(preview(false).render(document));
  });

  test('shows a note as an icon at its reference with a hidden callout after the block (R-PREV-001, R-PREV-002, R-PREV-003)', () => {
    const html = preview(true).render(`# T\n\nThe text[^note-aaaa].\n\n[^note-aaaa]: ${header}\n\n    The **text**.\n\n    - one\n\nPara.\n`);
    expect(icons(html)).toBe(
      [
        '<h1 data-line="0" class="code-line" dir="auto">T</h1>',
        `<p data-line="2" class="code-line" dir="auto">The text${edgeOf(1, 'end')}${iconOf(1, 4)}.</p>`,
        `<div class="${noteClass} ${noteClass}-color-1" id="${noteClass}-1" role="note" aria-label="Note by hannes" hidden>`,
        `<div class="${noteClass}-answer">`,
        `<div class="${noteClass}-header"><span class="${noteClass}-author">hannes</span>${dateOf}</div>`,
        `<div class="${noteClass}-body">`,
        // The elements of the callout have no lines, so the scrolling of the preview does not use them.
        '<p>The <strong>text</strong>.</p>',
        '<ul>',
        '<li>one</li>',
        '</ul>',
        '</div>',
        '</div>',
        '</div>',
        '<p data-line="10" class="code-line" dir="auto">Para.</p>',
        '',
      ].join('\n'),
    );
  });

  test('shows each answer of a thread in the callout with the date in the local time of the reader, and the number of answers at the icon (R-NOTE-004)', () => {
    const text = [
      'Text[^note-aaaa].',
      '',
      `[^note-aaaa]: ${header}`,
      '',
      '    Check the dates.',
      '',
      '    > **anna** · 2026-10-28 03:02-05:00',
      '    >',
      '    > Friday works.',
      '    >',
      '    > > A quote in the answer.',
      '',
      '    > **eve** · 2026-10-28 11:00Z',
    ].join('\n');
    const html = plain(preview(true).render(text));
    expect(html).toContain(`aria-label="Note by hannes, 3 answers" aria-describedby="${noteClass}-1"`);
    expect(html).toContain(`<span class="${noteClass}-count">3</span></a>`);
    expect(html).toContain(
      [
        `<div class="${noteClass}-body">`,
        '<p>Check the dates.</p>',
        '</div>',
        '</div>',
        `<div class="${noteClass}-answer">`,
        `<div class="${noteClass}-header"><span class="${noteClass}-author">anna</span><time class="${noteClass}-date" datetime="2026-10-28T03:02-05:00" title="2026-10-28 03:02 at the author (UTC−05:00)">2026-10-28 09:02</time></div>`,
        `<div class="${noteClass}-body">`,
        '<p>Friday works.</p>',
        '<blockquote>',
        '<p>A quote in the answer.</p>',
        '</blockquote>',
        '</div>',
        '</div>',
        `<div class="${noteClass}-answer">`,
        `<div class="${noteClass}-header"><span class="${noteClass}-author">eve</span><time class="${noteClass}-date" datetime="2026-10-28T11:00Z" title="2026-10-28 11:00 at the author (UTC)">2026-10-28 12:00</time></div>`,
        `<div class="${noteClass}-body">`,
        '</div>',
      ].join('\n'),
    );
  });

  test('shows the replies to a reply indented below it, as a tree (R-NOTE-004)', () => {
    const text = [
      'Text[^note-aaaa].',
      '',
      `[^note-aaaa]: ${header}`,
      '',
      '    Which teams?',
      '',
      '    > **anna** · 2026-10-28 11:02+01:00',
      '    >',
      '    > The teams.',
      '    >',
      '    > > **hannes** · 2026-10-28 11:30+01:00',
      '    > >',
      '    > > Thanks.',
      '',
      '    > **bob** · 2026-10-28 12:00+01:00',
    ].join('\n');
    const html = plain(preview(true).render(text)).replace(/<time [^>]*>[^<]*<\/time>/g, '');
    const answer = (author: string, body: string) => [`<div class="${noteClass}-answer">`, `<div class="${noteClass}-header"><span class="${noteClass}-author">${author}</span></div>`, `<div class="${noteClass}-body">`, ...body.split('|'), '</div>'];
    expect(html).toContain(
      [
        ...answer('hannes', '<p>Which teams?</p>'),
        '</div>',
        ...answer('anna', '<p>The teams.</p>'),
        `<div class="${noteClass}-replies">`,
        ...answer('hannes', '<p>Thanks.</p>'),
        '</div>',
        '</div>',
        '</div>',
        ...answer('bob', ''),
        '</div>',
        '</div>',
      ].filter((line) => line !== '').join('\n'),
    );
  });

  test('shows the selection of a note from its start marker or from the start of the block to its reference, and a point by its icon only (R-NOTE-006)', () => {
    const text = [
      'The agents <!--[note-aaaa-->change the work[^note-aaaa] of teams.',
      '',
      `[^note-aaaa]: ${header}`,
      '',
      'Change[^note-bbbb] the work.<!--[note-cccc-->[^note-cccc]',
      '',
      `[^note-bbbb]: ${header}`,
      '',
      `[^note-cccc]: ${header}`,
    ].join('\n');
    const html = icons(plain(preview(true).render(text)));
    expect(html).toContain(`<p>The agents ${edgeOf(1, 'start')}change the work${edgeOf(1, 'end')}${iconOf(1, 2)} of teams.</p>`);
    expect(html).toContain(`<p>Change${edgeOf(2, 'end')}${iconOf(2, 6)} the work.${iconOf(3, 8)}</p>`);
  });

  test('shows a reference in a heading, in a list item and in a table cell, and puts the callout after the whole block', () => {
    const text = ['# Plan[^note-aaaa]', '', '- One[^note-bbbb]', '- Two', '', '| A | B |', '| - | - |', '| one | two[^note-cccc] |', '', ...['aaaa', 'bbbb', 'cccc'].flatMap((label) => [`[^note-${label}]: ${header}`, ''])].join('\n');
    const html = icons(plain(preview(true).render(text)));
    expect(html).toMatch(/^<h1>Plan<span [^>]*><\/span><a [^>]*>\[icon\]<\/a><\/h1>\n<ul>\n<li>One<span [^>]*><\/span><a [^>]*>\[icon\]<\/a><\/li>\n<li>Two<\/li>\n<\/ul>\n<table>/);
    expect(html).toContain(`<td>two${edgeOf(3, 'end')}${iconOf(3, 13)}</td>`);
    expect(html).toMatch(/<\/table>\n<div class="nimblescape-note nimblescape-note-color-1"[^]*<div class="nimblescape-note nimblescape-note-color-3"[^]*<\/div>\n$/);
  });

  test('shows a note without a reference, and a second definition of a label, by an icon in the margin', () => {
    const text = `Text[^note-aaaa].\n\n[^note-aaaa]: ${header}\n\n[^note-aaaa]: ${header}\n\n    Again.\n\n> [^note-bbbb]: ${header}\n`;
    const html = icons(plain(preview(true).render(text)));
    expect(html).toContain(`<p>Text${edgeOf(1, 'end')}${iconOf(1, 2)}.</p>`);
    expect(html).toContain(`<div class="${noteClass}-anchor">${iconOf(2, 4)}</div>`);
    expect(html).toMatch(new RegExp(`<blockquote>\n<div class="${noteClass}-anchor"><a [^>]*>\\[icon\\]</a></div>\n<div class="${noteClass} ${noteClass}-color-3"[^]*</blockquote>\n$`));
  });

  test('a definition directly after a paragraph ends the paragraph, and a paragraph after it without a blank line belongs to the note', () => {
    const html = icons(plain(preview(true).render(`Text[^note-aaaa].\n[^note-aaaa]: ${header}\n    Body.\nLazy line.\n\nNext.\n`)));
    expect(html).toMatch(/^<p>Text<span [^>]*><\/span><a [^>]*>\[icon\]<\/a>\.<\/p>\n<div class="nimblescape-note [^]*<p>Body.\nLazy line.<\/p>\n<\/div>\n<\/div>\n<\/div>\n<p>Next.<\/p>\n$/);
  });

  test('shows a reference in a note, in code and to no note as written, and every start marker without its note shows nothing', () => {
    const text = `Text[^note-aaaa].\n\n[^note-aaaa]: ${header}\n\n    See[^note-aaaa].\n\n\`[^note-aaaa]\` and [^note-zzzz] and <!--[note-yyyy-->.\n`;
    const html = icons(plain(preview(true).render(text)));
    expect(html).toContain('<p>See[^note-aaaa].</p>');
    expect(html).toContain('<p><code>[^note-aaaa]</code> and [^note-zzzz] and .</p>');
  });

  test('shows a block of HTML of a note that opens a comment and does not close it as text, so that the page after the callout stays', () => {
    const text = `Text[^note-aaaa].\n\n[^note-aaaa]: ${header}\n\n    <!-- closed --> <b>bold</b>\n\n    <!-- open\n    more\n\nAfter.\n`;
    const html = plain(preview(true).render(text));
    expect(html).toContain('<p>&lt;!-- open<br>\nmore</p>\n');
    expect(html).toContain('<!-- closed --> <b>bold</b>');
    expect(html).toMatch(/<\/div>\n<p>After\.<\/p>\n$/);
  });

  test('escapes the link, and shows an icon without a link that takes the focus when the rendering has no document', () => {
    const md = extendMarkdownIt(new MarkdownIt({ html: true }), { settingsOf: () => ({ showInPreview: true }), linkOf: (env) => (env as { link?: string }).link, fileLinkOf: () => undefined });
    const text = `Text[^note-aaaa].\n\n[^note-aaaa]: ${header}\n`;
    expect(md.render(text, { link: 'vscode://a.b/open?x="1"&y=2' })).toContain('href="vscode://a.b/open?x=&quot;1&quot;&amp;y=2"');
    expect(md.render(text, {})).toContain(`<span class="${noteClass}-icon ${noteClass}-color-1" aria-label="Note by hannes" aria-describedby="${noteClass}-1" role="img" tabindex="0">`);
  });

  test('gives the links of a callout that name files the address of the extension, and keeps the tokens of the document as they are (R-GEN-010)', () => {
    const md = preview(true);
    const text = `Text[^note-aaaa].\n\n[^note-aaaa]: ${header}\n\n    [PDF](../literatur/a.pdf), [web](https://example.com), [here](#top)\n\n[Outside](b.pdf)\n`;
    const tokens = md.parse(text, {});
    const html = md.renderer.render(tokens, md.options, {});
    expect(html).toContain('<a href="vscode://a.b/link?href=../literatur/a.pdf">PDF</a>');
    expect(html).toContain('<a href="https://example.com">web</a>');
    expect(html).toContain('<a href="#top">here</a>');
    // A link of the text outside the notes stays as the Markdown preview of VS Code opens it.
    expect(html).toContain('<a href="b.pdf">Outside</a>');
    expect(md.renderer.render(tokens, md.options, {})).toBe(html);
    // The tokens of a body are in the meta of the note and of its icon.
    const hrefs = new Set(JSON.stringify(tokens).match(/"href","[^"]*"/g));
    expect([...hrefs]).toEqual(['"href","../literatur/a.pdf"', '"href","https://example.com"', '"href","#top"', '"href","b.pdf"']);
  });

  test('gives each callout of a page its own ID', () => {
    const html = preview(true).render(`A[^note-aaaa] B[^note-bbbb]\n\n[^note-aaaa]: ${header}\n\n[^note-bbbb]: ${header}\n`);
    expect([...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1])).toEqual([`${noteClass}-1`, `${noteClass}-2`]);
  });

  test('with showInPreview off, shows no icon, no selection and no callout (R-PREV-005)', () => {
    const text = `One <!--[note-aaaa-->two[^note-aaaa] three.\n\n[^note-aaaa]: ${header}\n\n    Body.\n\n> **anna** · 2026-10-28 11:02+01:00\n\nNext.\n`;
    expect(plain(preview(true, false).render(text))).toBe('<p>One two three.</p>\n<blockquote>\n<p><strong>anna</strong> · 2026-10-28 11:02+01:00</p>\n</blockquote>\n<p>Next.</p>\n');
  });

  test('marks the icons for the script of the preview: without a callout on hover after the setting showCalloutOnHover, and the selected note with its request to scroll (R-PREV-002, R-SIDE-007)', () => {
    const selections = new Map<unknown, { label: string | undefined; reveal: number | undefined }>();
    const md = extendMarkdownIt(new MarkdownIt({ html: true }), {
      settingsOf: (env) => ({ showInPreview: true, showCalloutOnHover: (env as { hover?: boolean }).hover }),
      linkOf: () => 'vscode://a.b/open',
      fileLinkOf: () => undefined,
      selectedOf: (env) => selections.get((env as { id?: string }).id),
    });
    const text = `A[^note-aaaa] B[^note-bbbb]\n\n[^note-aaaa]: ${header}\n\n[^note-bbbb]: ${header}\n`;
    const attributes = (env: object) =>
      [...md.render(text, env).matchAll(/<a class="[^"]*-icon[^>]*>/g)].map((match) => [...match[0].matchAll(/ data-(?:hover|selected|reveal)="[^"]*"/g)].join(''));
    // A missing setting shows the callout, as the default of the setting does.
    expect(attributes({})).toEqual(['', '']);
    expect(attributes({ hover: true })).toEqual(['', '']);
    expect(attributes({ hover: false })).toEqual([' data-hover="off"', ' data-hover="off"']);
    selections.set('x', { label: 'note-bbbb', reveal: undefined });
    selections.set('y', { label: 'note-aaaa', reveal: 4 });
    expect(attributes({ id: 'x' })).toEqual(['', ' data-selected="true"']);
    expect(attributes({ id: 'y' })).toEqual([' data-selected="true" data-reveal="4"', '']);
  });

  test('reads the setting and the link for the environment of each rendering', () => {
    const environments: unknown[] = [];
    const md = extendMarkdownIt(new MarkdownIt({ html: true }), {
      settingsOf: (env) => {
        environments.push(env);
        return { showInPreview: (env as { show?: boolean }).show ?? true };
      },
      linkOf: () => undefined,
      fileLinkOf: () => undefined,
    });
    const tokens = md.parse(`Text[^note-aaaa].\n\n[^note-aaaa]: ${header}\n`, {});
    expect(md.renderer.render(tokens, md.options, { show: false })).not.toContain(noteClass);
    expect(md.renderer.render(tokens, md.options, { show: true })).toContain(noteClass);
    expect(environments).toContainEqual({ show: false });
  });
});
