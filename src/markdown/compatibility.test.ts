// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests render Markdown with the plugin of the extension together with
 * the markdown-it plugins of other Markdown extensions of VS Code (R-GEN-007):
 * markdown-it-footnote of "Markdown Footnotes", markdown-it-emoji of
 * "Markdown Emoji" and markdown-it-task-lists of "Markdown Checkboxes", in the
 * major versions that these extensions of Matt Bierner use, the option
 * `highlight` that "Markdown Preview Mermaid Support" sets for the fences of
 * Mermaid, and the frame that "Markdown Preview Github Styling" puts around the
 * page. The Markdown preview applies the plugins of the extensions in the order
 * in which the extensions start, so each test runs both orders. A note is a
 * footnote of the text, so markdown-it-footnote must never show it.
 */

import MarkdownIt from 'markdown-it';
import emoji from 'markdown-it-emoji';
import footnote from 'markdown-it-footnote';
import taskLists from 'markdown-it-task-lists';
import { describe, expect, test } from 'vitest';
import { extendMarkdownIt, noteClass } from './markdownIt';

/**
 * mermaid sets the option highlight as "Markdown Preview Mermaid Support" does: a fence of the language mermaid becomes
 * an element that the script of that extension draws, with the characters `&`, `<` and `>` of the code escaped.
 * @param md - The markdown-it instance.
 */
const mermaid = (md: MarkdownIt): MarkdownIt => {
  const highlight = md.options.highlight;
  const escaped = (code: string): string => code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  md.options.highlight = (code, language, attributes) =>
    language === 'mermaid' ? `<pre class="mermaid">${escaped(code)}</pre>` : (highlight?.(code, language, attributes) ?? '');
  return md;
};

/** frameStart and frameEnd frame the page as "Markdown Preview Github Styling" does. */
const frameStart = '<div class="github-markdown-body"><div class="github-markdown-content">';
const frameEnd = '</div></div>';

/**
 * githubStyles wraps the method render of the renderer as "Markdown Preview Github Styling" does: the page gets a
 * frame for the styles of GitHub.
 * @param md - The markdown-it instance.
 */
const githubStyles = (md: MarkdownIt): MarkdownIt => {
  const render = md.renderer.render;
  md.renderer.render = (...parameters) => `${frameStart}${render.apply(md.renderer, parameters)}${frameEnd}`;
  return md;
};

/**
 * others adds the plugins of the other extensions.
 * @param md - The markdown-it instance.
 */
const others = (md: MarkdownIt): MarkdownIt => githubStyles(mermaid(md.use(footnote).use(emoji).use(taskLists)));

/**
 * notes adds the plugin of the extension.
 * @param md - The markdown-it instance.
 */
const notes = (md: MarkdownIt): MarkdownIt => extendMarkdownIt(md, { settingsOf: () => ({ showInPreview: true }), linkOf: () => 'vscode://a.b/open' });

/** orders are the two orders of the plugins: the plugin of the extension after the others, and before them. */
const orders = [
  ['after the others', () => notes(others(new MarkdownIt({ html: true })))],
  ['before the others', () => others(notes(new MarkdownIt({ html: true })))],
] as const;

/** document is a text with the syntax of every other plugin, comments and footnotes that are no notes. */
const document = [
  '# Plan :rocket:',
  '',
  'The agents change the work of teams[^1] and more[^note-cccc]. <!-- a comment -->',
  '',
  '- [ ] task one',
  '- [x] task two',
  '',
  '```mermaid',
  'graph TD; A-->B;',
  '```',
  '',
  '[^1]: The footnote.',
  '',
  '[^note-cccc]: Not a header, so a footnote.',
  '',
].join('\n');

/** note is a note with a selection whose body uses every other plugin, also an arrow `-->` of Mermaid. */
const note = [
  'The agents <!--[note-7k2q-->change :tada: the work[^note-7k2q] of teams[^1].',
  '',
  '[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00',
  '',
  '    Which :smile: teams[^2]?',
  '',
  '    ```mermaid',
  '    graph TD; A --> B;',
  '    ```',
  '',
  '    > **anna** · 2026-10-28 11:02+01:00',
  '    >',
  '    > - [x] done',
  '',
  '[^1]: The footnote.',
  '',
  '[^2]: The footnote of the note.',
  '',
].join('\n');

describe.each(orders)('with the plugin of the extension %s', (_name, create) => {
  test('a text without notes renders as with the other plugins alone', () => {
    expect(create().render(document)).toBe(others(new MarkdownIt({ html: true })).render(document));
  });

  test('a note keeps the output of the other plugins in the text and in its callout', () => {
    const html = create().render(note);
    // The page has one frame of the styles of GitHub, and the callout none.
    expect(html.startsWith(frameStart) && html.endsWith(frameEnd)).toBe(true);
    expect(html.split(frameStart)).toHaveLength(2);
    expect(html).toMatch(
      new RegExp(`^${frameStart}<p>The agents <span class="${noteClass}-edge"[^>]*></span>change 🎉 the work<span class="${noteClass}-edge"[^>]*></span><a class="${noteClass}-icon [^]*</a> of teams<sup class="footnote-ref"><a href="#fn1" id="fnref1">\\[1\\]</a></sup>\\.</p>\n`),
    );
    expect(html).toContain('<p>Which 😄 teams<sup class="footnote-ref"><a href="#fn2" id="fnref2">[2]</a></sup>?</p>\n<pre class="mermaid">graph TD; A --&gt; B;\n</pre>\n');
    expect(html).toContain('<li class="task-list-item"><input class="task-list-item-checkbox" checked="" disabled="" type="checkbox"> done</li>');
  });

  test('a note never shows as a footnote, and a footnote in a note is a footnote of the page', () => {
    const html = create().render(note);
    // The list of the footnotes stands once, at the end of the page, with the footnotes of the text and of the note.
    expect(html.match(/<section class="footnotes">/g)).toHaveLength(1);
    expect(html).toMatch(/<\/div>\n<hr class="footnotes-sep">\n<section class="footnotes">[^]*The footnote\.[^]*The footnote of the note\.[^]*<\/section>\n<\/div><\/div>$/);
    expect(html.match(/<li id="fn\d+" class="footnote-item">/g)).toHaveLength(2);
    expect(html).not.toContain('note-7k2q');
  });
});
