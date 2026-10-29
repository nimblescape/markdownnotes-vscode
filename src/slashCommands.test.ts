// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the slash commands of the text editor (R-EDIT-008) with a
 * fake of the editor API: the suggestions after a typed slash, `/todo` for the
 * sentence before it and `/note` for the text that the slash replaced, which
 * open the editor of a new note in the side view, the todo notes that the side
 * view adds and completes (R-NOTE-008), `/footnote`, which opens the editor of
 * a new footnote in the side view, `/date`, `/time` and `/user`.
 */

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { notesViewId } from './notesView';
import { Fake, type FakeCompletionItem, FakeEditor, FakePosition, FakeRange, FakeSelection, type FakeView, settle } from './testing/fakeVscode';

// The static imports of the modules read only their constants; each test imports the extension with a new fake of the
// editor API.
vi.mock('vscode', () => ({}));

/** fake is the fake API of the test. */
let fake: Fake;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 29, 19, 29));
  fake = new Fake();
  vi.resetModules();
  vi.doMock('vscode', () => fake.api);
});

afterEach(() => {
  vi.useRealTimers();
});

/**
 * start opens a document in the active text editor with the cursor at a position, activates the extension and shows
 * the side view.
 * @param text - The text of the document.
 * @param line - The line of the cursor.
 * @param character - The column of the cursor.
 */
const start = async (text: string, line: number, character: number) => {
  const document = fake.open(text);
  const editor = new FakeEditor(document, line);
  editor.selection = { active: new FakePosition(line, character) };
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
 * labels returns the labels of suggestions.
 * @param items - The suggestions.
 */
const labels = (items: FakeCompletionItem[]): string[] => items.map((item) => (typeof item.label === 'string' ? item.label : item.label.label));

/**
 * accept writes the text of a suggestion as VS Code does when the user presses Tab, and runs its command.
 * @param editor - The text editor.
 * @param item - The suggestion.
 */
const accept = async (editor: FakeEditor, item: FakeCompletionItem): Promise<void> => {
  await editor.edit((builder) => builder.replace(item.range!, item.insertText!));
  if (item.command) {
    await fake.run(item.command.command, ...(item.command.arguments ?? []));
  }
  await settle();
};

test('a slash after a space offers /todo for the sentence before it, /footnote, /date, /time and /user, and /todo opens the editor of a new todo note (R-EDIT-008, R-NOTE-008)', async () => {
  fake.login = 'carl';
  const { document, editor, view } = await start('Fix the bug. Write the tests /\n', 0, 30);
  const items = fake.complete(document, new FakePosition(0, 30));
  expect(labels(items)).toEqual(['/todo', '/footnote', '/date', '/time', '/user']);
  expect(items.map((item) => item.insertText)).toEqual(['', '', '2026-10-29', '2026-10-29 19:29', 'carl']);
  // /todo and /footnote remove the command with the space before it, /date, /time and /user keep the space.
  expect(items.map((item) => [item.range!.start.character, item.range!.end.character])).toEqual([
    [28, 30],
    [28, 30],
    [29, 30],
    [29, 30],
    [29, 30],
  ]);
  await accept(editor, items[0]);
  expect(document.text).toBe('Fix the bug. Write the tests\n');
  expect(editor.document.getText(editor.selection)).toBe('Write the tests');
  expect(view.messages.filter((message) => message.type === 'line').at(-1)).toEqual({ type: 'line', line: 0, highlight: 'Write the tests' });
  expect(view.messages.filter((message) => message.type === 'new')).toEqual([{ type: 'new', todo: true }]);
  // The new note is an open todo, which the check box of the side view marks completed.
  await send(view, { type: 'add', request: 1, text: 'Do it today.', todo: true });
  expect(view.messages.filter((message) => message.type === 'result')).toEqual([{ type: 'result', request: 1, message: undefined }]);
  expect(document.text).toMatch(/Fix the bug\. <wbr><!--\[(note-[a-z0-9]{4})-->Write the tests\[\^\1\]\n\n\[\^\1\]: \*\*carl\*\* · 2026-10-29 19:29\+01:00 · todo\n\n {4}Do it today\.\n$/);
  const id = view.state().threads[0].id;
  expect(view.state().threads[0].todo).toBe('todo');
  await send(view, { type: 'todo', id, done: true });
  expect(document.text).toContain('**carl** · 2026-10-29 19:29+01:00 · done\n');
  expect(view.state().threads[0].todo).toBe('done');
  await send(view, { type: 'todo', id, done: false });
  expect(document.text).toContain('**carl** · 2026-10-29 19:29+01:00 · todo\n');
});

test('/todo shows only where a note can highlight the sentence, and a slash in a word offers nothing (R-EDIT-008)', async () => {
  const { document } = await start('/\n\n```\ncode /\n```\n\nand/\n', 0, 1);
  expect(labels(fake.complete(document, new FakePosition(0, 1)))).toEqual(['/date', '/time', '/user']);
  expect(labels(fake.complete(document, new FakePosition(3, 6)))).toEqual(['/date', '/time', '/user']);
  expect(fake.complete(document, new FakePosition(6, 4))).toEqual([]);
});

test('/footnote removes the command and opens the editor of a new footnote in the side view, which writes the reference at the end of the word and the definition after the last footnote (R-EDIT-008, R-FOOT-003)', async () => {
  const { document, editor, view } = await start('One sentence /\n\nMore[^1].\n\n[^1]: A source.\n\nThe end.\n', 0, 14);
  const items = fake.complete(document, new FakePosition(0, 14));
  const footnote = items.find((item) => labels([item])[0] === '/footnote')!;
  expect(footnote.detail).toBe('The footnote [^2], in the editor of the side view');
  // VS Code puts the cursor after the text of the suggestion: where the command started.
  await editor.edit((builder) => builder.replace(footnote.range!, footnote.insertText!));
  editor.selection = { active: new FakePosition(0, 12) };
  await fake.run(footnote.command!.command, ...(footnote.command!.arguments ?? []));
  await settle();
  expect(document.text).toBe('One sentence\n\nMore[^1].\n\n[^1]: A source.\n\nThe end.\n');
  expect(view.messages.filter((message) => message.type === 'newFootnote')).toEqual([{ type: 'newFootnote' }]);
  expect(view.state().footnotePlace).toBe('One sentence');
  await send(view, { type: 'addFootnote', request: 1, text: 'Another source.' });
  expect(document.text).toBe('One sentence[^2]\n\nMore[^1].\n\n[^1]: A source.\n\n[^2]: Another source.\n\nThe end.\n');
});

test('a slash that replaced selected text offers /note and /todo, which put the text back and open the editor of a new note for it (R-EDIT-008)', async () => {
  const { document, editor, view } = await start('A word here.\n', 0, 0);
  editor.selection = new FakeSelection(new FakePosition(0, 2), new FakePosition(0, 6));
  fake.fire('selection', { textEditor: editor, selections: editor.selections, kind: 2 });
  await settle();
  // VS Code replaces the selected text with the typed slash.
  const range = new FakeRange(0, 2, 0, 6);
  await editor.edit((builder) => builder.replace(range, '/'));
  fake.fire('change', { document, contentChanges: [{ range, rangeOffset: 2, rangeLength: 4, text: '/' }] });
  await settle();
  const items = fake.complete(document, new FakePosition(0, 3));
  expect(labels(items)).toEqual(['/note', '/todo', '/date', '/time', '/user']);
  await accept(editor, items[0]);
  expect(document.text).toBe('A word here.\n');
  expect(editor.document.getText(editor.selection)).toBe('word');
  expect(view.messages.filter((message) => message.type === 'line').at(-1)).toEqual({ type: 'line', line: 0, highlight: 'word' });
  expect(view.messages.filter((message) => message.type === 'new')).toEqual([{ type: 'new' }]);
  // A slash that replaced no selected text offers no /note.
  await editor.edit((builder) => builder.replace(new FakeRange(0, 12, 0, 12), ' /'));
  fake.fire('change', { document, contentChanges: [{ range: new FakeRange(0, 12, 0, 12), rangeOffset: 12, rangeLength: 0, text: ' /' }] });
  expect(labels(fake.complete(document, new FakePosition(0, 14)))).toEqual(['/todo', '/footnote', '/date', '/time', '/user']);
});

test('/user inserts the GitHub login of the user, and asks for the sign-in first when there is none (R-EDIT-008, R-GEN-006)', async () => {
  const { document, editor } = await start('Written by /\n', 0, 12);
  // Without a session, /user signs in first and then inserts the login at the cursor.
  let user = fake.complete(document, new FakePosition(0, 12)).find((item) => labels([item])[0] === '/user')!;
  expect(user.label).toEqual({ label: '/user', description: 'Sign in with GitHub' });
  expect(user.insertText).toBe('');
  fake.signIn = 'dora';
  await accept(editor, user);
  expect(document.text).toBe('Written by dora\n');
  expect(fake.sessions.at(-1)!.options).toEqual({ createIfNone: true });
  // With a session, the list shows the login and inserts it itself.
  await editor.edit((builder) => builder.insert(new FakePosition(0, 15), ' and /'));
  user = fake.complete(document, new FakePosition(0, 21)).find((item) => labels([item])[0] === '/user')!;
  expect(user.label).toEqual({ label: '/user', description: 'dora' });
  expect(user.command).toBeUndefined();
  await accept(editor, user);
  expect(document.text).toBe('Written by dora and dora\n');
  // A sign-in that the user cancels inserts nothing.
  fake.login = undefined;
  fake.signIn = undefined;
  fake.fire('sessions', { provider: { id: 'github' } });
  await settle();
  await editor.edit((builder) => builder.insert(new FakePosition(0, 24), ' /'));
  user = fake.complete(document, new FakePosition(0, 26)).find((item) => labels([item])[0] === '/user')!;
  await accept(editor, user);
  expect(document.text).toBe('Written by dora and dora \n');
  expect(fake.infos.at(-1)).toBe('/user inserts your GitHub login after a sign-in with GitHub.');
});
