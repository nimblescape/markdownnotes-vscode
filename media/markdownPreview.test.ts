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
 * @param before - Changes the page before the script runs.
 */
const start = (body: string, before?: (window: Window) => void) => {
  const window = new Window();
  windows.push(window);
  window.document.body.innerHTML = body;
  before?.(window);
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

test('a request to scroll to the selected note waits for the pages of nimblescape Markdown Paper, and then scrolls the pages', () => {
  const scrolled: string[] = [];
  const selected = ' data-selected="true" data-reveal="1"';
  const page = start(`<div class="markdown-body"><div class="nimblescape-paper" hidden data-paper="{}"></div><p data-line="2">The ${edges('aaaa', 'text', selected)}.</p></div>`, (window) => {
    Object.defineProperty(window.document, 'readyState', { configurable: true, get: () => 'complete' });
    window.Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this.closest('.nimblescape-paper-pages') ? 'pages' : 'content');
    };
  });
  // VS Code loaded the page again: the content is there, the pages are not.
  page.window.dispatchEvent(new page.window.Event('load'));
  expect(scrolled).toEqual([]);
  const pages = page.document.createElement('div');
  pages.className = 'nimblescape-paper-pages';
  pages.innerHTML = `<div class="pagedjs_page"><div class="pagedjs_page_content"><p data-line="2">The ${edges('aaaa', 'paged text', selected)}.</p></div></div>`;
  page.document.querySelector('.markdown-body')!.before(pages);
  page.window.dispatchEvent(new page.window.Event('nimblescape-paper-rendered'));
  expect(scrolled).toEqual(['pages']);
  // The same request scrolls only once, also after the next pages.
  page.window.dispatchEvent(new page.window.Event('nimblescape-paper-rendered'));
  expect(scrolled).toEqual(['pages']);
});

test('the pages of before take the state of the notes from the content, when nimblescape Markdown Paper shows them without a new layout (R-PREV-009)', () => {
  // The content of VS Code has the new selected note; the pages of before have the selected note of before.
  const content = `<p data-line="2">${edges('aaaa', 'one')} and ${edges('bbbb', 'two', ' data-selected="true" data-reveal="5"')}.</p>`;
  const before = `<p data-line="2">${edges('aaaa', 'paged one', ' data-selected="true" data-reveal="4"')} and ${edges('bbbb', 'paged two')}.</p>`;
  const page = start(`<div class="nimblescape-paper-pages"><div class="pagedjs_page"><div class="pagedjs_page_content">${before}</div></div></div><div class="markdown-body">${content}</div>`, (window) => {
    window.Element.prototype.scrollIntoView = () => undefined;
  });
  page.window.dispatchEvent(new page.window.Event('nimblescape-paper-rendered'));
  expect(page.painted()).toEqual({ 'nimblescape-note-3-dim': ['paged one'], 'nimblescape-note-3-selected': ['paged two'] });
  const ends = [...page.document.querySelectorAll('.nimblescape-paper-pages [data-edge="end"]')].map((end) => [end.getAttribute('data-selected'), end.getAttribute('data-reveal')]);
  expect(ends).toEqual([
    [null, null],
    ['true', '5'],
  ]);
});

test('a request to scroll to the selected note of another document scrolls once the page is loaded', () => {
  const scrolled: string[] = [];
  let state = 'interactive';
  const page = start(`<div class="markdown-body"><p data-line="2">The ${edges('aaaa', 'text', ' data-selected="true" data-reveal="4"')}.</p></div>`, (window) => {
    // In the preview of VS Code, a smooth scroll that starts before the page is loaded does not move the page.
    Object.defineProperty(window.document, 'readyState', { configurable: true, get: () => state });
    window.Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this.getAttribute('data-note') ?? this.className);
    };
  });
  expect(scrolled).toEqual([]);
  state = 'complete';
  page.window.dispatchEvent(new page.window.Event('load'));
  expect(scrolled).toEqual(['note-aaaa']);
});

test('the frame of the selected note in the zoomed pages of nimblescape Markdown Paper stands at the text, in a browser without the standardized zoom', () => {
  const selected = ' data-selected="true"';
  const page = start(
    `<div class="nimblescape-paper-pages" style="zoom: 0.5"><div class="pagedjs_page"><div class="pagedjs_page_content"><p data-line="2">The ${edges('aaaa', 'paged text', selected)}.</p></div></div></div>`,
    (window) => {
      // The browser of VS Code gives the rectangles of the text in the coordinates of the zoomed pages.
      Object.defineProperty(window.Range.prototype, 'getClientRects', { configurable: true, value: () => [{ left: 100, top: 200, right: 160, bottom: 220, width: 60, height: 20 }] });
      Object.defineProperty(window.Element.prototype, 'getBoundingClientRect', {
        configurable: true,
        value: function (this: { classList: { contains(name: string): boolean } }) {
          const box = this.classList.contains('pagedjs_page_content') ? { left: 0, top: 0, right: 1000, bottom: 1000 } : { left: 0, top: 0, right: 0, bottom: 0 };
          return { ...box, x: box.left, y: box.top, width: box.right - box.left, height: box.bottom - box.top };
        },
      });
    },
  );
  const style = page.document.querySelector('.nimblescape-note-frame')?.getAttribute('style');
  expect(style).toBe('left: 49px; top: 99px; width: 32px; height: 12px;');
});

/** doi is the address of a citation link in the text of a note. */
const doi = 'https://doi.org/10.1000/example';

/**
 * citing opens a page whose note holds a citation link, as the preview of VS Code writes it, and points the caret of
 * the page into the text of the link (happy-dom has no layout).
 */
const citing = () => {
  const page = start(`<p data-line="2">See ${edges('aaaa', `the study of <a href="${doi}" data-href="${doi}">Singla et al., 2025</a>`)} and <a href="${doi}" data-href="${doi}">another</a>.</p>`);
  const [inNote, outside] = [...page.document.querySelectorAll('p a')] as unknown as HTMLAnchorElement[];
  let caret: Node = inNote.firstChild!;
  Object.assign(page.document, { caretPositionFromPoint: () => ({ offsetNode: caret, offset: 2 }) });
  /** press presses the mouse on a link, with the caret in its text. */
  const press = (link: HTMLAnchorElement, init: { ctrlKey?: boolean; metaKey?: boolean } = {}) => {
    caret = link.firstChild!;
    link.dispatchEvent(new page.window.MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0, detail: 1, clientX: 5, clientY: 5, ...init }) as unknown as Event);
  };
  /** release releases the mouse on a link and waits until the script took its address back. */
  const release = async (link: HTMLAnchorElement) => {
    link.dispatchEvent(new page.window.MouseEvent('mouseup', { bubbles: true, cancelable: true, button: 0 }) as unknown as Event);
    await new Promise((resolve) => setTimeout(resolve, 5));
  };
  const attributes = (link: HTMLAnchorElement) => ({ href: link.getAttribute('href'), dataHref: link.getAttribute('data-href'), draggable: link.getAttribute('draggable') });
  return { ...page, inNote, outside, press, release, attributes };
};

test('a click on a link in a highlight, for example a citation, selects the note: the link holds the address that selects it for the time of the click (R-PREV-003)', async () => {
  const page = citing();
  page.press(page.inNote);
  // VS Code opens the address of the first link of the path of the click, and the preview opens `data-href` first.
  expect(page.attributes(page.inNote)).toEqual({ href: open.replace('/open?', '/select?'), dataHref: null, draggable: 'false' });
  const click = new page.window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0, detail: 1 });
  page.inNote.dispatchEvent(click as unknown as Event);
  expect(click.defaultPrevented).toBe(true);
  await page.release(page.inNote);
  expect(page.attributes(page.inNote)).toEqual({ href: doi, dataHref: doi, draggable: null });
});

test('Ctrl+click (Cmd+click on macOS) on a link in a highlight opens the link, and a link outside the highlights keeps its click (R-PREV-003)', async () => {
  const page = citing();
  const link = page.document.body.shadowRoot!.querySelector('a')!;
  for (const init of [{ ctrlKey: true }, { metaKey: true }]) {
    page.press(page.inNote, init);
    expect(page.attributes(page.inNote)).toEqual({ href: doi, dataHref: doi, draggable: null });
    expect(link.hasAttribute('href')).toBe(false);
    await page.release(page.inNote);
  }
  page.press(page.outside);
  expect(page.attributes(page.outside)).toEqual({ href: doi, dataHref: doi, draggable: null });
  expect(link.hasAttribute('href')).toBe(false);
});
