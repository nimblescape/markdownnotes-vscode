// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the slash commands of the text editor (R-EDIT-008) with a
 * fake of the editor API: the suggestions after a typed slash, `/todo` for the
 * sentence before it and `/note` for the text that the slash replaced, which
 * open the editor of a new note in the side view, the todo notes that the side
 * view adds and completes (R-NOTE-008), `/footnote`, which opens the editor of
 * a new footnote in the side view, `/date`, `/time` and `/user`, `/figure`,
 * `/table` and `/ref` (R-XREF-001), and the slash commands that other
 * extensions add through the API (R-GEN-012).
 */

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { notesViewId } from './notesView';
import { Fake, type FakeCompletionItem, FakeEditor, FakePosition, FakeRange, FakeSelection, type FakeSnippetString, FakeUri, type FakeView, settle } from './testing/fakeVscode';

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
  const { api } = await fake.activate();
  const view = fake.resolveView(notesViewId);
  await send(view, { type: 'ready' });
  return { document, editor, view, api };
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
  // A slash on a line of its own also offers a figure and a table (R-XREF-001).
  expect(labels(fake.complete(document, new FakePosition(0, 1)))).toEqual(['/figure', '/table', '/date', '/time', '/user']);
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

test('another extension adds a slash command through the API, which shows after the commands of the notes and runs at the place of the removed command, until its disposal (R-EDIT-008, R-GEN-012)', async () => {
  const { document, editor, api } = await start('As shown /\n', 0, 10);
  const runs: [string, number, number][] = [];
  const v1 = api.getAPI(1)!;
  const registration = v1.registerSlashCommand({
    label: '/source',
    description: 'Cite a Source',
    detail: 'A source of the document',
    run: async (target: FakeEditor, range: FakeRange) => {
      runs.push([target.document.uri.toString(), range.start.line, range.start.character]);
      await target.edit((builder) => builder.insert(range.start, '([Hong et al., 2024](#hong2024))'));
    },
  } as never);
  // A label of the notes, a second command of the same label and a label of another form throw.
  expect(() => v1.registerSlashCommand({ label: '/note', run: () => undefined } as never)).toThrow('The slash command /note exists already.');
  expect(() => v1.registerSlashCommand({ label: '/source', run: () => undefined } as never)).toThrow('The slash command /source exists already.');
  expect(() => v1.registerSlashCommand({ label: 'source', run: () => undefined } as never)).toThrow('a slash and small letters');
  const items = fake.complete(document, new FakePosition(0, 10));
  expect(labels(items)).toEqual(['/todo', '/footnote', '/date', '/time', '/user', '/source']);
  const source = items.at(-1)!;
  expect([source.detail, source.insertText, source.range!.start.character, source.range!.end.character]).toEqual(['A source of the document', '', 9, 10]);
  await editor.edit((builder) => builder.replace(source.range!, source.insertText!));
  editor.selection = { active: new FakePosition(0, 9) };
  await fake.run(source.command!.command, ...(source.command!.arguments ?? []));
  await settle();
  expect(runs).toEqual([[document.uri.toString(), 0, 9]]);
  expect(document.text).toBe('As shown ([Hong et al., 2024](#hong2024))\n');
  // A command that fails shows a message.
  const failing = v1.registerSlashCommand({
    label: '/broken',
    run: () => {
      throw new Error('no database');
    },
  } as never);
  await fake.run(source.command!.command, document.uri, '/broken');
  expect(fake.errors.at(-1)).toBe('The slash command /broken failed: no database');
  failing.dispose();
  registration.dispose();
  expect(labels(fake.complete(document, new FakePosition(0, 41)))).not.toContain('/source');
});

test('on a line of its own, /figure inserts a chosen image of the workspace as a figure, and /table a table with its caption line (R-EDIT-008, R-XREF-001)', async () => {
  const { document, editor } = await start('# Results\n\n/\n\nMore.\n', 2, 1);
  fake.found = [new FakeUri('file', '/folder/images/plan (v2).png'), new FakeUri('file', '/other/logo.svg')];
  const items = fake.complete(document, new FakePosition(2, 1));
  // The heading starts a section, which /ref links (R-XREF-003).
  expect(labels(items)).toEqual(['/figure', '/table', '/ref', '/date', '/time', '/user']);
  const table = items[1];
  expect((table.insertText as unknown as FakeSnippetString).value).toBe('Table: ${1:Caption}\n\n| ${2:Column} | ${3:Column} |\n| --- | --- |\n| $4 | $5 |\n$0');
  // /figure lists the images by their paths from the folder of the file, and inserts the chosen one.
  fake.pick = (choices) => choices.find((choice) => choice.label === 'plan (v2).png');
  await accept(editor, items[0]);
  expect(fake.picks.at(-1)!.map((choice) => choice.description)).toEqual(['../other/logo.svg', 'images/plan (v2).png']);
  expect(document.text).toBe('# Results\n\n![Caption](images/plan%20%28v2%29.png)\n\nMore.\n');
  // In text and in a code block, a figure and a table are not offered.
  const inText = fake.open('A sentence /\n\n```\n/\n```\n', '/folder/b.md');
  expect(labels(fake.complete(inText, new FakePosition(0, 12)))).not.toContain('/figure');
  expect(labels(fake.complete(inText, new FakePosition(3, 1)))).toEqual(['/date', '/time', '/user']);
});

test('in text, /ref links a chosen figure or table, and gives it an anchor at the end of its line when it has none (R-EDIT-008, R-XREF-001)', async () => {
  const text = 'As /\n\n![Plan of the study](plan.png)\n\nTable: Participants<a id="tab-people"></a>\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n';
  const { document, editor } = await start(text, 0, 4);
  const items = fake.complete(document, new FakePosition(0, 4));
  expect(labels(items)).toEqual(['/todo', '/footnote', '/ref', '/date', '/time', '/user']);
  await accept(editor, items[2]);
  expect(fake.picks.at(-1)!.map((choice) => [choice.label, choice.description])).toEqual([
    ['Figure 1', 'Plan of the study'],
    ['Table 1', 'Participants'],
  ]);
  expect(document.text).toBe('As [Figure 1](#fig-plan-study)\n\n![Plan of the study](plan.png)<a id="fig-plan-study"></a>\n\nTable: Participants<a id="tab-people"></a>\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n');
  expect(editor.selection.active).toEqual(new FakePosition(0, 30));
  // A table with an anchor keeps it, and the word of the last link of its kind stays.
  document.text = document.text.replace('As [Figure 1]', 'Wie [Abbildung 1]').replace('As', 'Wie');
  editor.selection = { active: new FakePosition(0, document.text.indexOf('\n')) };
  await editor.edit((builder) => builder.insert(editor.selection.active, ' /'));
  const position = editor.selection.active;
  fake.pick = (choices) => choices[1];
  await accept(editor, fake.complete(document, position).find((item) => labels([item])[0] === '/ref')!);
  expect(document.text.split('\n')[0]).toBe('Wie [Abbildung 1](#fig-plan-study) [Table 1](#tab-people)');
  expect(document.text).toContain('Table: Participants<a id="tab-people"></a>\n');
  // A file without figures, tables and headings offers no /ref.
  const plain = fake.open('Text /\n', '/folder/c.md');
  expect(labels(fake.complete(plain, new FakePosition(0, 6)))).not.toContain('/ref');
});

test('/ref links a section with the numbers of its chapter, and gives its heading an anchor before a closing # (R-EDIT-008, R-XREF-003)', async () => {
  const text = '# Paper\n\n## Introduction\n\nSee /\n\n## Methods ##\n\n### Data\n\nResults\n-------\n';
  const { document, editor } = await start(text, 4, 5);
  fake.pick = (choices) => choices[2];
  await accept(editor, fake.complete(document, new FakePosition(4, 5)).find((item) => labels([item])[0] === '/ref')!);
  expect(fake.picks.at(-1)!.map((choice) => [choice.label, choice.description])).toEqual([
    ['Chapter 1', 'Introduction'],
    ['Chapter 2', 'Methods'],
    ['Chapter 2.1', 'Data'],
    ['Chapter 3', 'Results'],
  ]);
  expect(document.text).toBe('# Paper\n\n## Introduction\n\nSee [Chapter 2.1](#sec-data)\n\n## Methods ##\n\n### Data<a id="sec-data"></a>\n\nResults\n-------\n');
  for (const [choice, line] of [[1, '## Methods<a id="sec-methods"></a> ##'], [3, 'Results<a id="sec-results"></a>']] as const) {
    editor.selection = { active: new FakePosition(4, document.text.split('\n')[4].length) };
    await editor.edit((builder) => builder.insert(editor.selection.active, ' /'));
    fake.pick = (choices) => choices[choice];
    await accept(editor, fake.complete(document, editor.selection.active).find((item) => labels([item])[0] === '/ref')!);
    expect(document.text.split('\n')).toContain(line);
  }
  expect(document.text.split('\n')[4]).toBe('See [Chapter 2.1](#sec-data) [Chapter 2](#sec-methods) [Chapter 3](#sec-results)');
});
