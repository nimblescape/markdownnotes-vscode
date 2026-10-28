// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests run the side view "Notes" with a fake of the API of VS Code
 * ([src/testing/fakeVscode.ts](testing/fakeVscode.ts)), as its script sends
 * the actions of the user (R-SIDE-001 to R-SIDE-003): the page and its
 * policy, the threads of the active Markdown file with the rendered answers,
 * the thread at the cursor, the save, the answer, the new note, the delete,
 * the preview of a text, the GitHub sign-in (R-GEN-006), and the reveal of a
 * note in the text editor.
 */

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { githubProvider } from './github';
import { notesViewId } from './notesView';
import { Fake, FakeEditor, FakePosition, type FakeView, settle } from './testing/fakeVscode';

// The static imports of the modules read only their constants; each test imports the extension with a new fake of the
// editor API.
vi.mock('vscode', () => ({}));

/** fake is the fake API of the test. */
let fake: Fake;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 28, 10, 15));
  fake = new Fake();
  fake.rendered = (text) => `<p>${text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>\n`;
  vi.resetModules();
  vi.doMock('vscode', () => fake.api);
});

afterEach(() => {
  vi.useRealTimers();
});

/** note is a Markdown text with a note of two answers. */
const note = '# Title\n\n<!-- note\n---\nauthor: ann\ndate: 2026-10-28T10:15+01:00\n---\nThe **text**.\n---\nauthor: bob\n---\nAn answer.\n-->\n\nMore.\n';

/**
 * start opens a document in the active text editor, activates the extension and shows the side view.
 * @param text - The text of the document.
 * @param line - The line of the cursor.
 */
const start = async (text = note, line = 0) => {
  const document = fake.open(text);
  const editor = new FakeEditor(document, line);
  fake.editors.push(editor);
  fake.activeEditor = editor;
  await fake.activate();
  const view = fake.resolveView(notesViewId);
  await send(view, { type: 'ready' });
  return { document, editor, view };
};

/**
 * send sends a message of the script of the view and waits for its handling.
 * @param view - The view.
 * @param message - The message.
 */
const send = async (view: FakeView, message: unknown): Promise<void> => {
  await view.send(message);
  await settle();
};

/**
 * results returns the results of the requests of the script.
 * @param view - The view.
 */
const results = (view: FakeView) => view.messages.filter((message) => message.type === 'result');

test('the view is a page whose policy runs only its own script from the folder media (R-SIDE-001)', async () => {
  const { view } = await start();
  expect(view.webview.options).toEqual({ enableScripts: true, localResourceRoots: [expect.objectContaining({ path: '/extension/media' })] });
  const html = view.webview.html;
  const nonce = /script-src 'nonce-(\w+)'/.exec(html)?.[1];
  expect(nonce).toMatch(/^\w{32}$/);
  expect(html).toContain("default-src 'none';");
  expect(html).toContain(`<script nonce="${nonce}" src="file:/extension/media/notesView.js"></script>`);
  expect(html).toContain('<link rel="stylesheet" href="file:/extension/media/notesView.css">');
  expect(html.match(/<script/g)).toHaveLength(1);
});

test('the view shows the threads of the active Markdown file with the rendered answers, and the account without asking for a sign-in', async () => {
  fake.login = 'hannes';
  const { view } = await start(`${note}\n<!-- note\nA <!-- b\n-->\n`, 15);
  expect(view.state()).toEqual({
    type: 'state',
    file: 'a.md',
    line: 15,
    account: 'hannes',
    selected: undefined,
    threads: [
      {
        id: '1',
        line: 2,
        kind: 'block',
        nested: false,
        answers: [
          { author: 'ann', date: expect.stringContaining('2026'), body: 'The **text**.', html: '<p>The <strong>text</strong>.</p>\n' },
          { author: 'bob', date: '', body: 'An answer.', html: '<p>An answer.</p>\n' },
        ],
      },
      // A note that holds the start of another comment shows its text as it is.
      { id: '2', line: 16, kind: 'block', nested: true, answers: [{ author: '', date: '', body: 'A <!-- b', html: '<pre>A &#60;!-- b</pre>' }] },
    ],
  });
  expect(fake.sessions.map((session) => session.options)).toContainEqual({ silent: true });
  expect(fake.sessions.map((session) => session.options)).not.toContainEqual({ createIfNone: true });
});

test('the view selects the thread at the cursor and follows the active Markdown editor (R-SIDE-002)', async () => {
  const { editor, view } = await start();
  editor.selection = { active: new FakePosition(5, 0) };
  fake.fire('selection', { textEditor: editor });
  await settle();
  expect(view.state().selected).toBe('1');
  // A move of the cursor outside the notes keeps the selection and tells the script the line for a new note.
  editor.selection = { active: new FakePosition(15, 0) };
  fake.fire('selection', { textEditor: editor });
  await settle();
  expect(view.messages.at(-1)).toEqual({ type: 'line', line: 15 });
  expect(view.state().selected).toBe('1');
  const other = new FakeEditor(fake.open('Other\n', '/folder/b.md'));
  fake.fire('activeEditor', other);
  await settle();
  expect(view.state()).toMatchObject({ file: 'b.md', threads: [] });
  // An editor of another language, or none, keeps the document of the view.
  fake.fire('activeEditor', new FakeEditor(fake.open('Text', '/folder/c.txt', { languageId: 'plaintext' })));
  fake.fire('activeEditor', undefined);
  await settle();
  expect(view.state().file).toBe('b.md');
});

test('Save writes an answer and a refused text returns its message (R-SIDE-003, R-NOTE-003)', async () => {
  const { document, view } = await start();
  await send(view, { type: 'save', request: 1, id: '1', index: 1, text: 'A **changed** answer.' });
  expect(document.text).toContain('---\nauthor: bob\n---\nA **changed** answer.\n-->');
  expect(results(view)).toEqual([{ type: 'result', request: 1, message: undefined }]);
  expect(view.state().threads[0].answers[1].body).toBe('A **changed** answer.');
  await send(view, { type: 'save', request: 2, id: '1', index: 0, text: 'A <!-- b' });
  expect(results(view)[1]).toEqual({ type: 'result', request: 2, message: expect.stringContaining('must not contain another comment') });
  await send(view, { type: 'save', request: 3, id: '9', index: 0, text: 'Text' });
  expect(results(view)[2]).toEqual({ type: 'result', request: 3, message: 'The change was not saved: the file no longer holds the note.' });
});

test('Answer and Add Note need the GitHub sign-in, and write the login and the date (R-EDIT-003, R-EDIT-005, R-GEN-006)', async () => {
  const { document, view } = await start(note, 14);
  await send(view, { type: 'answer', request: 1, id: '1', text: 'A third answer.' });
  expect(results(view)[0]).toEqual({ type: 'result', request: 1, message: expect.stringMatching(/^The change was not saved: sign in with GitHub/) });
  expect(document.text).toBe(note);
  fake.signIn = 'carl';
  // Add Note adds a note at the line of the cursor and selects it.
  await send(view, { type: 'add', request: 2, text: 'A new note.' });
  expect(results(view)[1]).toEqual({ type: 'result', request: 2, message: undefined });
  expect(document.text).toMatch(/\n\nMore\.\n<!-- note inline\n---\nauthor: carl\ndate: 2026-10-28T10:15[+-]\d{2}:\d{2}\n---\nA new note\.\n-->\n$/);
  let state = view.state();
  expect(state.threads).toHaveLength(2);
  expect(state.selected).toBe(state.threads[1].id);
  expect(state.threads[1].answers[0]).toMatchObject({ author: 'carl', body: 'A new note.' });
  await send(view, { type: 'answer', request: 3, id: '1', text: 'A third answer.' });
  expect(results(view)[2]).toEqual({ type: 'result', request: 3, message: undefined });
  expect(document.text).toMatch(/---\nAn answer\.\n---\nauthor: carl\ndate: .*\n---\nA third answer\.\n-->\n/);
  state = view.state();
  expect(state.threads[0].answers.map((answer) => answer.author)).toEqual(['ann', 'bob', 'carl']);
});

test('Delete and Delete Thread remove an answer and a note, and a missing note shows a message (R-EDIT-004)', async () => {
  const { document, view } = await start();
  await send(view, { type: 'deleteAnswer', id: '1', index: 0 });
  expect(document.text).toBe('# Title\n\n<!-- note\n---\nauthor: bob\n---\nAn answer.\n-->\n\nMore.\n');
  expect(view.state().threads[0].answers).toHaveLength(1);
  await send(view, { type: 'deleteNote', id: '1' });
  expect(document.text).toBe('# Title\n\nMore.\n');
  expect(view.state().threads).toEqual([]);
  await send(view, { type: 'deleteNote', id: '1' });
  expect(fake.errors).toEqual(['The change was not saved: the file no longer holds the note.']);
});

test('the preview of an editor renders the text as the Markdown preview does, and a failed rendering shows the text as it is', async () => {
  const { view } = await start();
  await send(view, { type: 'render', request: 4, text: 'A **bold** text' });
  expect(view.messages.at(-1)).toEqual({ type: 'rendered', request: 4, html: '<p>A <strong>bold</strong> text</p>\n' });
  fake.rendered = undefined;
  await send(view, { type: 'render', request: 5, text: 'A <b> text' });
  expect(view.messages.at(-1)).toEqual({ type: 'rendered', request: 5, html: '<pre>A &#60;b&#62; text</pre>' });
});

test('Sign in asks VS Code for a GitHub session, and a change of the sessions shows the account', async () => {
  const { view } = await start();
  expect(view.state().account).toBeUndefined();
  fake.signIn = 'hannes';
  await send(view, { type: 'signIn' });
  expect(fake.sessions.at(-2)?.options).toEqual({ createIfNone: true });
  expect(view.state().account).toBe('hannes');
  fake.login = 'other';
  fake.fire('sessions', { provider: { id: githubProvider } });
  await settle();
  expect(view.state().account).toBe('other');
});

test('a click on the line of a thread shows its note in the text editor and opens its box', async () => {
  const { document, editor, view } = await start();
  await send(view, { type: 'reveal', id: '1' });
  expect(fake.shown).toEqual([{ document, options: { viewColumn: editor.viewColumn, selection: expect.objectContaining({ start: new FakePosition(2, 0) }) } }]);
  expect(fake.live()[0].collapsibleState).toBe(1);
  await send(view, { type: 'reveal', id: '9' });
  expect(fake.shown).toHaveLength(1);
});

test('without an active Markdown file the view shows no threads, and an action returns that no note is there', async () => {
  await fake.activate();
  const view = fake.resolveView(notesViewId);
  await send(view, { type: 'ready' });
  expect(view.state()).toMatchObject({ file: undefined, line: undefined, threads: [] });
  await send(view, { type: 'add', request: 1, text: 'Note' });
  expect(results(view)).toEqual([{ type: 'result', request: 1, message: 'The change was not saved: the file no longer holds the note.' }]);
});
