// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The tests of the editor of a whole file (R-TEXT-010): the files that open in it, the messages of the channel of the
// plugin of the notes, and the side view at the selection of the editor, with the fake editor API of
// src/testing/fakeVscode.ts. The page itself, with the plugin of the notes, has its tests in
// src/webview/notesPlugin.test.ts.

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { highlightCommands } from './extension';
import { extensionMessage, pageMessage, pluginName } from './notes/editorMessages';
import { notesViewId, viewCommands } from './notesView';
import { opensIn, renderedEditor, selectionDelay } from './renderedEditor';
import { Fake, type FakePanel, type FakeView, marked, settle } from './testing/fakeVscode';

vi.mock('vscode', () => ({}));

/** fake is the fake API of the test. */
let fake: Fake;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 28, 10, 15));
  fake = new Fake();
  vi.resetModules();
  vi.doMock('vscode', () => fake.api);
});

afterEach(() => {
  vi.useRealTimers();
});

/** text is a Markdown text with the notes of ann and bob on "agents" and "the work". */
const text = marked(
  [
    'The <wbr><!--[note-aaaa-->agents[^note-aaaa] change <wbr><!--[note-bbbb green-->the work[^note-bbbb].',
    '',
    '[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00',
    '',
    '    A',
    '',
    '[^note-bbbb]: **bob** · 2026-10-28 10:15+01:00',
    '',
    '    B',
    '',
  ].join('\n'),
);

/**
 * open activates the extension, opens a document in the editor of a whole file, as VS Code does for a Markdown file,
 * shows the side view and lets the plugin of the page start.
 * @param content - The text of the document.
 */
const open = async (content = text) => {
  const document = fake.open(content);
  await fake.activate();
  const view = fake.resolveView(notesViewId);
  await view.send({ type: 'ready' });
  const panel = await fake.resolveCustomEditor(renderedEditor.viewType, document);
  await panel.send({ type: 'ready' });
  await page(panel, { type: 'ready' });
  return { document, panel, view };
};

/**
 * page sends a message of the plugin of the notes on the page and waits for its handling.
 * @param panel - The panel of the editor.
 * @param message - The message of the plugin.
 */
const page = async (panel: FakePanel, message: unknown): Promise<void> => {
  await panel.send({ type: 'plugin', plugin: pluginName, message });
  await settle();
};

/**
 * select sends the selection of the page, as numbers of characters of the file, and waits until it counts.
 * @param panel - The panel of the editor.
 * @param anchor - The anchor.
 * @param head - The head.
 */
const select = async (panel: FakePanel, anchor: number, head = anchor): Promise<void> => {
  await page(panel, { type: 'selection', anchor, head, mouse: true });
  vi.advanceTimersByTime(selectionDelay);
  await settle();
};

/**
 * at returns the place of a word in the paragraph of the notes of the text, after the comment of the format.
 * @param word - The word.
 */
const at = (word: string): number => text.indexOf(word, text.indexOf('The <wbr>'));

/** selected returns the thread that the side view selects. */
const selected = (view: FakeView) => view.state().selected;

test('the setting renderedEditor chooses the files that open in the editor: every Markdown file, the files with notes or with the comment of the format and the papers, or none (R-TEXT-010)', () => {
  const plain = '# Title\n\nText.\n';
  const paper = '---\nlayout: pht/thesis\n---\n\n# Title\n';
  for (const content of [plain, text, marked(plain), paper]) {
    expect(opensIn('all', content)).toBe(true);
    expect(opensIn('none', content)).toBe(false);
  }
  expect([plain, text, marked(plain), paper, 'A [^note-aaaa] reference.\n'].map((content) => opensIn('notesAndPapers', content))).toEqual([false, true, true, true, true]);
});

test('each side of the channel takes only the messages of the plugin of the notes and ignores every other value (R-TEXT-010)', () => {
  expect(pageMessage({ type: 'ready' })).toEqual({ type: 'ready' });
  expect(pageMessage({ type: 'comment', extra: 1 })).toEqual({ type: 'comment' });
  expect(pageMessage({ type: 'selection', anchor: 3, head: 9, mouse: true })).toEqual({ type: 'selection', anchor: 3, head: 9, mouse: true });
  expect(pageMessage({ type: 'selection', anchor: 3, head: 9, mouse: 'yes' })).toEqual({ type: 'selection', anchor: 3, head: 9, mouse: false });
  for (const value of [undefined, null, 'ready', { type: 'run', command: 'workbench.action.terminal.new' }, { type: 'selection', anchor: -1, head: 2 }, { type: 'selection', anchor: 1.5, head: 2 }, { type: 'selection', anchor: '1', head: 2 }]) {
    expect(pageMessage(value), JSON.stringify(value)).toBeUndefined();
  }
  expect(extensionMessage({ type: 'select', label: 'note-a3k9', reveal: true })).toEqual({ type: 'select', label: 'note-a3k9', reveal: true });
  expect(extensionMessage({ type: 'select', label: undefined })).toEqual({ type: 'select', label: undefined, reveal: false });
  expect(extensionMessage({ type: 'highlights', show: false })).toEqual({ type: 'highlights', show: false });
  for (const value of [{ type: 'select', label: 'note-a3k9"><script>' }, { type: 'select', label: 7 }, { type: 'highlights', show: 'no' }, { type: 'init' }]) {
    expect(extensionMessage(value), JSON.stringify(value)).toBeUndefined();
  }
});

test('the editor gets the highlights and the selected note when its plugin starts, and the highlights again after "Hide Highlights" (R-TEXT-010, R-GEN-011)', async () => {
  const { panel } = await open();
  expect(panel.pluginMessages(pluginName)).toEqual([
    { type: 'highlights', show: true },
    { type: 'select', label: undefined, reveal: false },
  ]);
  await fake.run(highlightCommands.hide);
  await settle();
  expect(panel.pluginMessages(pluginName).at(-1)).toEqual({ type: 'highlights', show: false });
});

test('the side view follows the selection of the editor: the cursor in a highlight selects its thread, and the selected note goes back to the editor (R-TEXT-010, R-SIDE-002)', async () => {
  const { panel, view } = await open();
  const [first, second] = view.state().threads;
  await select(panel, at('the work') + 2);
  expect(selected(view)).toBe(second.id);
  expect(panel.pluginMessages(pluginName).at(-1)).toEqual({ type: 'select', label: 'note-bbbb', reveal: false });
  // Only the last selection of a quick series counts, after the delay.
  await page(panel, { type: 'selection', anchor: at('agents') + 1, head: at('agents') + 1, mouse: false });
  await page(panel, { type: 'selection', anchor: at('the work') + 1, head: at('the work') + 1, mouse: false });
  vi.advanceTimersByTime(selectionDelay - 1);
  await settle();
  expect(selected(view)).toBe(second.id);
  await select(panel, at('agents') + 3);
  expect(selected(view)).toBe(first.id);
  // A click outside the notes deselects the note.
  await select(panel, at('change'));
  expect(selected(view)).toBeUndefined();
  expect(panel.pluginMessages(pluginName).at(-1)).toEqual({ type: 'select', label: undefined, reveal: false });
  // A selection beyond the end of the text, for example while a change is on its way, stays in the text.
  await select(panel, text.length + 40);
  expect(selected(view)).toBeUndefined();
});

test('"Comment" of the format bar and "Add Note" open the editor of a new note for the selected text of the editor (R-TEXT-010, R-EDIT-006)', async () => {
  const { panel, view } = await open();
  const start = at('change');
  // The button sends its message at once after the selection, which counts without the delay, and runs "Add Note".
  await page(panel, { type: 'selection', anchor: start, head: start + 'change'.length, mouse: true });
  await page(panel, { type: 'comment' });
  expect(fake.calls.at(-1)).toEqual({ command: viewCommands.newNote, args: [] });
  await fake.run(viewCommands.newNote);
  expect(view.messages.at(-1)).toEqual({ type: 'new' });
  expect(view.messages.filter((message) => message.type === 'line').at(-1)).toMatchObject({ highlight: 'change' });
  // Without selected text, "Add Note" tells to select text.
  await select(panel, start);
  await fake.run(viewCommands.newNote);
  expect(fake.infos.at(-1)).toMatch(/select/i);
});

test('a click on a thread selects its note in the editor, which scrolls to it, and opens no text editor (R-TEXT-010, R-SIDE-007)', async () => {
  const { panel, view } = await open();
  fake.editors = [];
  fake.activeEditor = undefined;
  const [, second] = view.state().threads;
  await view.send({ type: 'reveal', id: second.id, focus: false });
  await settle();
  expect(selected(view)).toBe(second.id);
  expect(panel.pluginMessages(pluginName).at(-1)).toEqual({ type: 'select', label: 'note-bbbb', reveal: true });
  expect(fake.shown).toEqual([]);
});

test('a file that the setting does not choose opens in the text editor in the same place, and a closed editor gets no more messages (R-TEXT-010)', async () => {
  fake.settings.set('', { renderedEditor: 'notesAndPapers' });
  const plain = fake.open('# Title\n\nText.\n', '/folder/plain.md');
  await fake.activate();
  const redirected = await fake.resolveCustomEditor(renderedEditor.viewType, plain);
  expect(fake.calls.find(({ command }) => command === 'vscode.openWith')?.args.slice(0, 2)).toEqual([plain.uri, 'default']);
  expect(redirected.webview.html).toBe('');
  const document = fake.open(text);
  const panel = await fake.resolveCustomEditor(renderedEditor.viewType, document);
  await panel.send({ type: 'ready' });
  await page(panel, { type: 'ready' });
  expect(panel.pluginMessages(pluginName)).toHaveLength(2);
  panel.dispose();
  await fake.run(highlightCommands.hide);
  await settle();
  expect(panel.pluginMessages(pluginName)).toHaveLength(2);
});
