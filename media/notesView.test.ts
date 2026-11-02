// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The tests of the script of the side view (media/notesView.js, R-GEN-018): the
// script runs in a page of happy-dom with the page of src/notesView.ts, gets the
// messages of the extension and sends its messages to a fake API of VS Code.

import { Window, type HTMLInputElement, type HTMLTextAreaElement } from 'happy-dom';
import { afterEach, expect, test } from 'vitest';
import script from './notesView.js?raw';

/** PageState is the state of the page that the script keeps with the API of VS Code. */
type PageState = Record<string, unknown>;

/** View is a page of the side view with its script, and the messages that the script sent to the extension. */
interface View {
  readonly window: Window;
  readonly document: Window['document'];
  readonly posted: Record<string, unknown>[];
  /** send sends a message of the extension to the script. */
  readonly send: (message: Record<string, unknown>) => void;
}

/** windows are the pages of a test, which the test closes at its end. */
const windows: Window[] = [];

afterEach(async () => {
  await Promise.all(windows.splice(0).map((window) => window.happyDOM.close()));
});

/** start opens the page of the side view with its script, as VS Code shows it. */
const start = (): View => {
  const window = new Window();
  windows.push(window);
  window.document.body.innerHTML = '<main id="notes"></main>';
  const posted: Record<string, unknown>[] = [];
  let saved: PageState | undefined;
  Object.assign(window, {
    acquireVsCodeApi: () => ({
      postMessage: (message: Record<string, unknown>) => posted.push(message),
      getState: () => saved,
      setState: (state: PageState) => {
        saved = state;
      },
    }),
  });
  window.eval(script);
  return { window, document: window.document, posted, send: (data) => window.dispatchEvent(new window.MessageEvent('message', { data })) };
};

/** answer is an answer of ann, as the extension writes it into the state. */
const answer = { author: 'ann', date: '2026-10-28 10:15+01:00', authorDate: 'ann · 2026-10-28 10:15+01:00', written: '2026-10-28 10:15+01:00', body: 'The text.', html: '<p>The text.</p>', depth: 0, parent: undefined };

/** thread is a note at line 3 with the answer of ann. */
const thread = { id: '1', line: 2, color: '#e5c07b', colorName: 'yellow', text: '[^note-aaaa]: …', answers: [answer] };

/** state is a state of a file with the thread, as the extension sends it. */
const state = {
  type: 'state',
  file: 'paper.md',
  line: 0,
  highlight: undefined,
  account: 'ann',
  selected: undefined,
  threads: [thread],
  colors: [
    { name: 'yellow', color: '#e5c07b' },
    { name: 'green', color: '#98c379' },
  ],
};

/** buttonOf returns the button with a tooltip or a name for a screen reader. */
const buttonOf = (view: View, label: string) => {
  const found = [...view.document.querySelectorAll('button')].find((candidate) => candidate.getAttribute('aria-label') === label || candidate.getAttribute('data-tooltip') === label || candidate.textContent === label);
  expect(found, label).toBeDefined();
  return found!;
};

test('the script asks for the state when it starts, and shows the file and the threads of a state (R-SIDE-001)', () => {
  const view = start();
  expect(view.posted).toEqual([{ type: 'ready' }]);
  expect(view.document.querySelector('.file')?.textContent).toBe('No Markdown file');
  view.send(state);
  expect(view.document.querySelector('.file')?.textContent).toBe('paper.md');
  expect(view.document.querySelector('.account')?.textContent).toBe('Signed in to GitHub as ann');
  const section = view.document.querySelector('section.thread');
  expect(section?.getAttribute('data-id')).toBe('1');
  expect(section?.getAttribute('aria-label')).toBe('Note at line 3');
  expect(section?.textContent).toContain('The text.');
});

test('the rendered text of an answer loses scripts, handlers, styles and script addresses, and keeps its links', () => {
  const view = start();
  const html = '<p onclick="steal()" style="color: red">Read <a href="javascript:steal()">this</a>, <a href=" java\tscript:steal()">that</a> and <a href="https://example.com/">the page</a>.</p><script>steal()</script><iframe srcdoc="x"></iframe>';
  view.send({ ...state, threads: [{ ...thread, answers: [{ ...answer, html }] }] });
  const paragraph = view.document.querySelector('section.thread p');
  expect(paragraph?.getAttribute('onclick')).toBeNull();
  expect(paragraph?.getAttribute('style')).toBeNull();
  const links = [...view.document.querySelectorAll('section.thread a')];
  expect(links.map((link) => link.getAttribute('href'))).toEqual([null, null, 'https://example.com/']);
  expect(view.document.querySelector('section.thread script')).toBeNull();
  expect(view.document.querySelector('section.thread iframe')).toBeNull();
  // A click on a link of the text asks the extension to open it.
  links[2].dispatchEvent(new view.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  expect(view.posted.at(-1)).toEqual({ type: 'openLink', href: 'https://example.com/' });
});

test('the buttons of a thread send their messages (R-SIDE-002, R-FOOT-006)', () => {
  const view = start();
  view.send(state);
  buttonOf(view, 'Make Footnote').click();
  buttonOf(view, 'Delete Thread').click();
  buttonOf(view, 'Delete the answer of ann').click();
  buttonOf(view, 'Line 3').click();
  expect(view.posted.slice(1)).toEqual([
    { type: 'makeFootnote', id: '1' },
    { type: 'deleteNote', id: '1' },
    { type: 'deleteAnswer', id: '1', answer: { index: 0, author: 'ann', date: '2026-10-28 10:15+01:00', body: 'The text.' } },
    { type: 'reveal', id: '1' },
  ]);
  // The swatch shows the colors, and a color goes to the note.
  buttonOf(view, 'Color of the note: yellow').click();
  buttonOf(view, 'green').click();
  expect(view.posted.at(-1)).toEqual({ type: 'color', id: '1', color: 'green' });
});

test('the search field shows only the threads with each word, and Escape clears it (R-SIDE-008)', () => {
  const view = start();
  const other = { ...thread, id: '2', line: 7, answers: [{ ...answer, author: 'bob', body: 'Another remark.', html: '<p>Another remark.</p>' }] };
  view.send({ ...state, threads: [thread, other] });
  const search = view.document.querySelector('input.search') as HTMLInputElement;
  const shown = () => [...view.document.querySelectorAll('section.thread')].map((section) => section.getAttribute('data-id'));
  expect(shown()).toEqual(['1', '2']);
  search.value = 'REMARK bob';
  search.dispatchEvent(new view.window.Event('input'));
  expect(shown()).toEqual(['2']);
  search.dispatchEvent(new view.window.KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
  expect(search.value).toBe('');
  expect(shown()).toEqual(['1', '2']);
});

test('the editor of a new note sends its text with Ctrl+Enter, shows a problem of the extension and closes after a save (R-NOTE-006)', () => {
  const view = start();
  view.send({ ...state, highlight: 'the passage' });
  view.send({ type: 'new' });
  expect(view.document.querySelector('.new-note .new-title')?.textContent).toBe('New note on “the passage”');
  // Without the bundle of the visual editor, the editor shows the tab "Markdown".
  const field = view.document.querySelector('.new-note textarea') as HTMLTextAreaElement;
  field.value = 'Why?';
  field.dispatchEvent(new view.window.Event('input'));
  field.dispatchEvent(new view.window.KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, cancelable: true }));
  expect(view.posted.at(-1)).toEqual({ type: 'add', request: 1, text: 'Why?', color: undefined, todo: false });
  // A second Ctrl+Enter while the extension handles the first sends nothing.
  const sent = view.posted.length;
  (view.document.querySelector('.new-note textarea') as HTMLTextAreaElement).dispatchEvent(new view.window.KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, cancelable: true }));
  expect(view.posted.length).toBe(sent);
  view.send({ type: 'result', request: 1, message: 'The note was not added.' });
  expect(view.document.querySelector('.new-note [role="alert"]')?.textContent).toBe('The note was not added.');
  expect((view.document.querySelector('.new-note textarea') as HTMLTextAreaElement).value).toBe('Why?');
  buttonOf(view, 'Add Note (Ctrl+Enter)').click();
  view.send({ type: 'result', request: 2 });
  expect(view.document.querySelector('.new-note')).toBeNull();
});
