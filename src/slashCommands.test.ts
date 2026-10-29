// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the slash commands of the text editor (R-EDIT-008) with a
 * fake of the editor API: the suggestions after a typed slash, `/todo` for the
 * sentence before it and `/note` for the text that the slash replaced, which
 * open the editor of a new note in the side view, the todo notes that the side
 * view adds and completes (R-NOTE-008), `/footnote` with its definition, and
 * `/date` and `/time`.
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

test('a slash after a space offers /todo for the sentence before it, /footnote, /date and /time, and /todo opens the editor of a new todo note (R-EDIT-008, R-NOTE-008)', async () => {
  const { document, editor, view } = await start('Fix the bug. Write the tests /\n', 0, 30);
  const items = fake.complete(document, new FakePosition(0, 30));
  expect(labels(items)).toEqual(['/todo', '/footnote', '/date', '/time']);
  expect(items.map((item) => item.insertText)).toEqual(['', '[^1]', '2026-10-29', '2026-10-29 19:29']);
  // /todo removes the command with the space before it, /date and /time keep the space.
  expect(items.map((item) => [item.range!.start.character, item.range!.end.character])).toEqual([
    [28, 30],
    [28, 30],
    [29, 30],
    [29, 30],
  ]);
  await accept(editor, items[0]);
  expect(document.text).toBe('Fix the bug. Write the tests\n');
  expect(editor.document.getText(editor.selection)).toBe('Write the tests');
  expect(view.messages.filter((message) => message.type === 'line').at(-1)).toEqual({ type: 'line', line: 0, highlight: 'Write the tests' });
  expect(view.messages.filter((message) => message.type === 'new')).toEqual([{ type: 'new', todo: true }]);
  // The new note is an open todo, which the check box of the side view marks completed.
  fake.signIn = 'carl';
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
  expect(labels(fake.complete(document, new FakePosition(0, 1)))).toEqual(['/date', '/time']);
  expect(labels(fake.complete(document, new FakePosition(3, 6)))).toEqual(['/date', '/time']);
  expect(fake.complete(document, new FakePosition(6, 4))).toEqual([]);
});

test('/footnote writes the reference at the end of the word, and the definition after the last footnote, with the cursor in it (R-EDIT-008, R-FOOT-003)', async () => {
  const { document, editor } = await start('One sentence /\n\nMore[^1].\n\n[^1]: A source.\n\nThe end.\n', 0, 14);
  const items = fake.complete(document, new FakePosition(0, 14));
  const footnote = items.find((item) => labels([item])[0] === '/footnote')!;
  expect(footnote.insertText).toBe('[^2]');
  await accept(editor, footnote);
  expect(document.text).toBe('One sentence[^2]\n\nMore[^1].\n\n[^1]: A source.\n\n[^2]: \n\nThe end.\n');
  expect(editor.selection.active).toEqual(new FakePosition(6, 6));
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
  expect(labels(items)).toEqual(['/note', '/todo', '/date', '/time']);
  await accept(editor, items[0]);
  expect(document.text).toBe('A word here.\n');
  expect(editor.document.getText(editor.selection)).toBe('word');
  expect(view.messages.filter((message) => message.type === 'line').at(-1)).toEqual({ type: 'line', line: 0, highlight: 'word' });
  expect(view.messages.filter((message) => message.type === 'new')).toEqual([{ type: 'new' }]);
  // A slash that replaced no selected text offers no /note.
  await editor.edit((builder) => builder.replace(new FakeRange(0, 12, 0, 12), ' /'));
  fake.fire('change', { document, contentChanges: [{ range: new FakeRange(0, 12, 0, 12), rangeOffset: 12, rangeLength: 0, text: ' /' }] });
  expect(labels(fake.complete(document, new FakePosition(0, 14)))).toEqual(['/todo', '/footnote', '/date', '/time']);
});
