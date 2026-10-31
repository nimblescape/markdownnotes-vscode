// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The tests of the script of the notes in the Markdown preview
// (media/markdownPreview.js, R-GEN-018): the script runs in a page of happy-dom
// with the elements that the markdown-it plugin of the extension writes. happy-dom
// has no CSS Custom Highlight API, so the page gets a registry that keeps the
// highlights of the script; happy-dom has no layout either, so the tests check
// what needs none.

import { Window } from 'happy-dom';
import { afterEach, expect, test } from 'vitest';
import script from './markdownPreview.js?raw';

/** FakeHighlight keeps the ranges and the priority of a highlight of the script. */
class FakeHighlight {
  readonly ranges: { toString(): string }[];
  priority = 0;
  constructor(...ranges: { toString(): string }[]) {
    this.ranges = ranges;
  }
}

/** windows are the pages of a test, which the test closes at its end. */
const windows: Window[] = [];

afterEach(async () => {
  await Promise.all(windows.splice(0).map((window) => window.happyDOM.close()));
});

/**
 * start opens a page of the preview with a body and the script.
 * @param body - The HTML of the body, as the preview shows the rendered file.
 */
const start = (body: string) => {
  const window = new Window();
  windows.push(window);
  window.document.body.innerHTML = body;
  const registry = new Map<string, FakeHighlight>();
  // window.CSS of happy-dom is a new object at each read, so the page gets its own.
  Object.defineProperty(window, 'CSS', { value: { highlights: registry }, configurable: true });
  Object.assign(window, { Highlight: FakeHighlight });
  window.eval(script);
  /** painted returns the text of each highlight by its name. */
  const painted = () => Object.fromEntries([...registry].map(([name, highlight]) => [name, highlight.ranges.map((range) => range.toString())]));
  return { window, document: window.document, registry, painted };
};

/** open is the address of the end of a highlight, which opens the note in the side view. */
const open = 'vscode://nimblescape.nimblescape-markdownnotes/open?file=paper.md&note=note-aaaa';

/**
 * edges returns the start and the end of the highlight of a note, as the markdown-it plugin writes them.
 * @param attributes - More attributes of the end.
 */
const edges = (id: string, text: string, attributes = '') =>
  `<span class="nimblescape-note-edge" data-edge="start" data-selection="${id}"></span>${text}<span class="nimblescape-note-edge" data-edge="end" data-selection="${id}" data-color="3" data-note="note-${id}" data-href="${open}"${attributes}></span>`;

test('the script paints the text between the start and the end of each note, also without a start from the start of the block (R-NOTE-006)', () => {
  const { painted } = start(`<p data-line="2">The ${edges('aaaa', 'marked text')} of the page.</p><p data-line="4">A block<span class="nimblescape-note-edge" data-edge="end" data-selection="bbbb" data-color="5"></span> ends.</p>`);
  expect(painted()).toEqual({ 'nimblescape-note-3': ['marked text'], 'nimblescape-note-5': ['A block'] });
});

test('a hidden highlight shows only while its note is selected, and a selected note dims the others (R-PREV-003)', () => {
  const page = start(`<p data-line="2">${edges('aaaa', 'one', ' data-hidden')} and ${edges('bbbb', 'two')}.</p>`);
  expect(page.painted()).toEqual({ 'nimblescape-note-3': ['two'] });
  expect(page.document.documentElement.hasAttribute('data-nimblescape-chosen')).toBe(false);
  // The preview shows the file again with the first note selected.
  page.document.body.innerHTML = `<p data-line="2">${edges('aaaa', 'one', ' data-hidden data-selected')} and ${edges('bbbb', 'two')}.</p>`;
  page.window.dispatchEvent(new page.window.Event('vscode.markdown.updateContent'));
  expect(page.painted()).toEqual({ 'nimblescape-note-3-selected': ['one'], 'nimblescape-note-3-dim': ['two'] });
  expect(page.document.documentElement.hasAttribute('data-nimblescape-chosen')).toBe(true);
});

test('the content of the page sits in a link of an open shadow tree of the body, without an address until a click on a highlight', () => {
  const { document } = start(`<p data-line="2">The ${edges('aaaa', 'text')}.</p>`);
  const root = document.body.shadowRoot;
  expect(root).not.toBeNull();
  const link = root!.querySelector('a');
  expect(link?.style.display).toBe('contents');
  expect(link?.querySelector('slot')).not.toBeNull();
  expect(link?.hasAttribute('href')).toBe(false);
});

test('a page without notes and without "Add Note" keeps its body as it is', () => {
  const { document, painted } = start('<p data-line="0">No notes.</p>');
  expect(document.body.shadowRoot).toBeNull();
  expect(painted()).toEqual({});
});

test('with the pages of nimblescape Markdown Paper the script paints the notes in the pages, not in the hidden content', () => {
  const content = `<p data-line="2">The ${edges('aaaa', 'text')}.</p>`;
  const page = start(`<div class="content">${content}</div>`);
  expect(page.painted()).toEqual({ 'nimblescape-note-3': ['text'] });
  const pages = page.document.createElement('div');
  pages.className = 'nimblescape-paper-pages';
  pages.innerHTML = `<div class="pagedjs_page"><div class="pagedjs_page_content"><p data-line="2">The ${edges('aaaa', 'paged text')}.</p></div></div>`;
  page.document.body.append(pages);
  page.window.dispatchEvent(new page.window.Event('nimblescape-paper-rendered'));
  expect(page.painted()).toEqual({ 'nimblescape-note-3': ['paged text'] });
});
