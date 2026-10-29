// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests render Markdown with markdown-it, the renderer of the built-in
 * Markdown preview, with and without the plugin. They check the highlight of
 * each note from its start marker to its reference, with the color of the
 * note and the link that selects it (R-NOTE-006, R-PREV-001, R-PREV-003), that
 * the preview never shows the text of a note (R-PREV-004), the setting
 * showHighlights (R-PREV-005), the selected note, the escaping of the link,
 * and that the plugin changes nothing outside the notes.
 */

import MarkdownIt from 'markdown-it';
import { describe, expect, test } from 'vitest';
import { extendMarkdownIt, noteClass, type PreviewOptions } from './markdownIt';

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
 * @param showHighlights - The setting showHighlights.
 */
const preview = (withPlugin: boolean, showHighlights = true): MarkdownIt => {
  const md = new MarkdownIt({ html: true, linkify: true });
  const options: PreviewOptions = {
    settingsOf: () => ({ showHighlights }),
    linkOf: (_env: unknown, line: number) => `vscode://a.b/open?line=${line}`,
  };
  return (withPlugin ? extendMarkdownIt(md, options) : md).use(sourceMap);
};

/**
 * plain returns the HTML of a text without the attributes of the scrolling.
 * @param html - The HTML.
 */
const plain = (html: string): string => html.replace(/ data-line="\d+" class="code-line" dir="auto"/g, '');

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
 * startOf returns the HTML of the start of the highlight of a note.
 * @param number - The number of the note in the page.
 */
const startOf = (number: number): string => `<span class="${noteClass}-edge" data-selection="${noteClass}-${number}" data-edge="start"></span>`;

/**
 * endOf returns the HTML of the end of the highlight of a note, with its color, its label and its link.
 * @param number - The number of the note in the page.
 * @param line - The line of the definition, for the link.
 * @param color - The number of the color of the note.
 * @param note - The label of the note: note-aaaa for the first note, note-bbbb for the second, note-cccc for the third.
 */
const endOf = (number: number, line: number, color = 1, note = `note-${['aaaa', 'bbbb', 'cccc'][number - 1]}`): string =>
  `<span class="${noteClass}-edge" data-selection="${noteClass}-${number}" data-edge="end" data-color="${color}" data-note="${note}" data-href="vscode://a.b/open?line=${line}"></span>`;

describe('the plugin', () => {
  test('changes nothing in a text without notes', () => {
    expect(preview(true).render(document)).toBe(preview(false).render(document));
  });

  test('shows the highlight of a note from its start marker to its reference, and never the text of the note (R-NOTE-006, R-PREV-001, R-PREV-004)', () => {
    const html = preview(true).render(`# T\n\nThe <wbr><!--[note-aaaa-->text[^note-aaaa] here.\n\n[^note-aaaa]: ${header}\n\n    The **text**.\n\n    > **anna** · 2026-10-28 11:02+01:00\n    >\n    > Yes.\n\nPara.\n`);
    expect(html).toBe(
      [
        '<h1 data-line="0" class="code-line" dir="auto">T</h1>',
        `<p data-line="2" class="code-line" dir="auto">The ${startOf(1)}text${endOf(1, 4)} here.</p>`,
        '<p data-line="12" class="code-line" dir="auto">Para.</p>',
        '',
      ].join('\n'),
    );
  });

  test('gives the highlight the color that its start marker names, also with the start marker at the start of a line', () => {
    const text = [
      '<wbr><!--[note-aaaa green-->The agents[^note-aaaa] change.',
      '',
      `[^note-aaaa]: ${header}`,
      '',
      'More <wbr><!--[note-bbbb teal-->work[^note-bbbb] and <!--[note-cccc red-->teams[^note-cccc].',
      '',
      `[^note-bbbb]: ${header}`,
      '',
      `[^note-cccc]: ${header}`,
    ].join('\n');
    const html = plain(preview(true).render(text));
    expect(html).toBe(`<p>${startOf(1)}The agents${endOf(1, 2, 2)} change.</p>\n<p>More ${startOf(2)}work${endOf(2, 6, 6)} and ${startOf(3)}teams${endOf(3, 8, 5)}.</p>\n`);
  });

  test('shows the highlight of a note without a start marker from the start of its block, and a note at a point not at all', () => {
    const text = [`Change[^note-aaaa] the work.<wbr><!--[note-bbbb-->[^note-bbbb]`, '', `[^note-aaaa]: ${header}`, '', `[^note-bbbb]: ${header}`].join('\n');
    // The script of the preview starts a highlight without a start at the start of its block.
    expect(plain(preview(true).render(text))).toBe(`<p>Change${endOf(1, 2)} the work.</p>\n`);
  });

  test('shows a highlight in a heading, in a list item and in a table cell', () => {
    const text = [
      '# <wbr><!--[note-aaaa-->Plan[^note-aaaa]',
      '',
      '- <wbr><!--[note-bbbb purple-->One[^note-bbbb]',
      '- Two',
      '',
      '| A | B |',
      '| - | - |',
      '| one | <wbr><!--[note-cccc-->two[^note-cccc] |',
      '',
      ...['aaaa', 'bbbb', 'cccc'].flatMap((label) => [`[^note-${label}]: ${header}`, '']),
    ].join('\n');
    const html = plain(preview(true).render(text));
    expect(html.startsWith(`<h1>${startOf(1)}Plan${endOf(1, 9)}</h1>\n<ul>\n<li>${startOf(2)}One${endOf(2, 11, 4)}</li>\n<li>Two</li>\n</ul>\n<table>`)).toBe(true);
    expect(html).toContain(`<td>${startOf(3)}two${endOf(3, 13)}</td>`);
    expect(html).toMatch(/<\/table>\n$/);
  });

  test('shows only the first reference of a note as the end of its highlight, and nothing for a note without a reference, a second definition or a further start marker', () => {
    const text = `A <wbr><!--[note-aaaa-->b[^note-aaaa] c[^note-aaaa] <!--[note-aaaa-->d.\n\n[^note-aaaa]: ${header}\n\n[^note-aaaa]: ${header}\n\n    Again.\n\n> [^note-bbbb]: ${header}\n`;
    expect(plain(preview(true).render(text))).toBe(`<p>A ${startOf(1)}b${endOf(1, 2)} c d.</p>\n<blockquote></blockquote>\n`);
  });

  test('a definition directly after a paragraph ends the paragraph, and a paragraph after it without a blank line belongs to the note', () => {
    const html = plain(preview(true).render(`Text[^note-aaaa].\n[^note-aaaa]: ${header}\n    Body.\nLazy line.\n\nNext.\n`));
    expect(html).toBe(`<p>Text${endOf(1, 1)}.</p>\n<p>Next.</p>\n`);
  });

  test('shows a reference in code and to no note as written, and every start marker without its note shows nothing', () => {
    const text = `Text[^note-aaaa].\n\n[^note-aaaa]: ${header}\n\n    See[^note-aaaa].\n\n\`[^note-aaaa]\` and [^note-zzzz] and <wbr><!--[note-yyyy-->.\n`;
    expect(plain(preview(true).render(text))).toContain('<p><code>[^note-aaaa]</code> and [^note-zzzz] and .</p>');
  });

  test('takes a block of HTML of a note that opens a comment and does not close it out of the page, so that the page after the note stays', () => {
    const text = `Text[^note-aaaa].\n\n[^note-aaaa]: ${header}\n\n    <!-- closed --> <b>bold</b>\n\n    <!-- open\n    more\n\nAfter.\n`;
    expect(plain(preview(true).render(text))).toBe(`<p>Text${endOf(1, 2)}.</p>\n<p>After.</p>\n`);
  });

  test('escapes the link, and gives the end of a highlight no link when the rendering has no document', () => {
    const md = extendMarkdownIt(new MarkdownIt({ html: true }), { settingsOf: () => ({ showHighlights: true }), linkOf: (env) => (env as { link?: string }).link });
    const text = `<wbr><!--[note-aaaa-->Text[^note-aaaa].\n\n[^note-aaaa]: ${header}\n`;
    expect(md.render(text, { link: 'vscode://a.b/open?x="1"&y=2' })).toContain(' data-href="vscode://a.b/open?x=&quot;1&quot;&amp;y=2"');
    expect(md.render(text, {})).toContain(`<span class="${noteClass}-edge" data-selection="${noteClass}-1" data-edge="end" data-color="1" data-note="note-aaaa"></span>`);
  });

  test('gives each highlight of a page its own ID', () => {
    const html = preview(true).render(`<wbr><!--[note-aaaa-->A[^note-aaaa] <wbr><!--[note-bbbb-->B[^note-bbbb]\n\n[^note-aaaa]: ${header}\n\n[^note-bbbb]: ${header}\n`);
    expect([...html.matchAll(/ data-selection="([^"]+)" data-edge="end"/g)].map((match) => match[1])).toEqual([`${noteClass}-1`, `${noteClass}-2`]);
  });

  test('with showHighlights off, marks the highlights hidden for the script of the preview, which shows the selected one and the one under the pointer (R-PREV-005)', () => {
    const text = `One <wbr><!--[note-aaaa-->two[^note-aaaa] three.\n\n[^note-aaaa]: ${header}\n\n    Body.\n\nNext.\n`;
    expect(plain(preview(true, false).render(text))).toBe(
      `<p>One ${startOf(1)}two${endOf(1, 2).replace('></span>', ' data-hidden="true"></span>')} three.</p>\n<p>Next.</p>\n`,
    );
  });

  test('marks the end of the highlight of the selected note with its request to scroll and its link that deselects it (R-PREV-003)', () => {
    const selections = new Map<unknown, { label: string | undefined; reveal: number | undefined }>();
    const md = extendMarkdownIt(new MarkdownIt({ html: true }), {
      settingsOf: () => ({ showHighlights: true }),
      linkOf: () => 'vscode://a.b/open',
      selectedOf: (env) => selections.get((env as { id?: string }).id),
      deselectLinkOf: (env) => (env as { deselect?: string }).deselect,
    });
    const text = `<wbr><!--[note-aaaa-->A[^note-aaaa] <wbr><!--[note-bbbb-->B[^note-bbbb]\n\n[^note-aaaa]: ${header}\n\n[^note-bbbb]: ${header}\n`;
    const attributes = (env: object) =>
      [...md.render(text, env).matchAll(/<span [^>]*data-edge="end"[^>]*>/g)].map((match) => [...match[0].matchAll(/ data-(?:selected|reveal|deselect)="[^"]*"/g)].join(''));
    expect(attributes({})).toEqual(['', '']);
    selections.set('x', { label: 'note-bbbb', reveal: undefined });
    selections.set('y', { label: 'note-aaaa', reveal: 4 });
    expect(attributes({ id: 'x' })).toEqual(['', ' data-selected="true"']);
    expect(attributes({ id: 'y' })).toEqual([' data-selected="true" data-reveal="4"', '']);
    expect(attributes({ id: 'x', deselect: 'vscode://a.b/deselect?d="1"' })).toEqual(['', ' data-selected="true" data-deselect="vscode://a.b/deselect?d=&quot;1&quot;"']);
  });

  test('reads the setting and the link for the environment of each rendering', () => {
    const environments: unknown[] = [];
    const md = extendMarkdownIt(new MarkdownIt({ html: true }), {
      settingsOf: (env) => {
        environments.push(env);
        return { showHighlights: (env as { show?: boolean }).show ?? true };
      },
      linkOf: () => undefined,
    });
    const tokens = md.parse(`<wbr><!--[note-aaaa-->Text[^note-aaaa].\n\n[^note-aaaa]: ${header}\n`, {});
    expect(md.renderer.render(tokens, md.options, { show: false })).toContain(' data-hidden="true"');
    expect(md.renderer.render(tokens, md.options, { show: true })).not.toContain(' data-hidden');
    expect(environments).toContainEqual({ show: false });
  });

  test('renders the text of the file of a clean editing view in place of its clean text, with the lines of the view for the scrolling (R-TEXT-009)', () => {
    const text = `First <wbr><!--[note-aaaa-->text[^note-aaaa].\n\n[^note-aaaa]: ${header}\n\n    Why?\n\nLast paragraph.\n`;
    const md = new MarkdownIt({ html: true });
    extendMarkdownIt(md, {
      settingsOf: () => ({ showHighlights: true }),
      linkOf: () => undefined,
      sourceOf: (clean) => (clean === 'First text.\n\nLast paragraph.\n' ? { text, lines: [0, 1, 2, 2, 2, 2, 2, 3] } : undefined),
    }).use(sourceMap);
    const html = md.render('First text.\n\nLast paragraph.\n', {});
    expect(html).toContain(' data-note="note-aaaa"');
    expect(html).not.toContain('Why?');
    expect(html).toContain('<p data-line="2" class="code-line" dir="auto">Last paragraph.</p>');
    // Another rendering, such as of a file itself, renders its own text with its own lines.
    expect(md.render('One.\n\nTwo.\n', {})).toContain('<p data-line="2" class="code-line" dir="auto">Two.</p>');
  });

  test('loads an image from the address that the extension gives, after the address of the preview of VS Code, and keeps the address of the text (R-TEXT-009)', () => {
    const md = new MarkdownIt({ html: true });
    extendMarkdownIt(md, {
      settingsOf: () => ({ showHighlights: true }),
      linkOf: () => undefined,
      imageOf: (env, source) => ((env as { clean?: boolean }).clean && !source.startsWith('https:') ? `https://view/${source}` : undefined),
    });
    // The preview of VS Code wraps the rule of the plugins and sets the address of the preview first.
    const inner = md.renderer.rules.image!;
    md.renderer.rules.image = (tokens, index, options, env, self) => {
      const token = tokens[index];
      if (!token.attrGet('data-src')) {
        token.attrSet('data-src', token.attrGet('src')!);
        token.attrSet('src', `preview:${token.attrGet('src')}`);
      }
      return inner(tokens, index, options, env, self);
    };
    const text = '![a b](../img/a%20b.png) ![web](https://x.y/c.png)';
    expect(md.render(text, { clean: true })).toBe(
      '<p><img src="https://view/../img/a%20b.png" alt="a b" data-src="../img/a%20b.png"> <img src="preview:https://x.y/c.png" alt="web" data-src="https://x.y/c.png"></p>\n',
    );
    expect(md.render(text, {})).toBe('<p><img src="preview:../img/a%20b.png" alt="a b" data-src="../img/a%20b.png"> <img src="preview:https://x.y/c.png" alt="web" data-src="https://x.y/c.png"></p>\n');
  });
});
