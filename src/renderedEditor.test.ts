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
import { notesViewId, viewCommands } from './notesViewProtocol';
import { opensIn, renderedEditor, selectionDelay } from './renderedEditor';
import { Fake, type FakePanel, type FakeView, FakeUri, marked, settle } from './testing/fakeVscode';

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
  expect(pageMessage({ type: 'comment', todo: true })).toEqual({ type: 'comment', todo: true });
  expect(pageMessage({ type: 'footnote' })).toEqual({ type: 'footnote' });
  expect(pageMessage({ type: 'slash', request: 2, command: 'figure', text: 'ab', at: 1 })).toEqual({ type: 'slash', request: 2, command: 'figure', text: 'ab', at: 1 });
  for (const value of [
    { type: 'slash', request: 2, command: 'date', text: 'ab', at: 1 },
    { type: 'slash', request: 2, command: 'figure', text: 'ab', at: 3 },
    { type: 'slash', request: -1, command: 'figure', text: 'ab', at: 1 },
  ]) {
    expect(pageMessage(value), JSON.stringify(value)).toBeUndefined();
  }
  expect(extensionMessage({ type: 'change', request: 1, patches: [{ from: 1, to: 2, insert: 'x', more: 1 }], select: { from: 1, to: 2 } })).toEqual({
    type: 'change',
    request: 1,
    patches: [{ from: 1, to: 2, insert: 'x' }],
    select: { from: 1, to: 2 },
  });
  expect(extensionMessage({ type: 'change', request: 1, patches: [{ from: 2, to: 1, insert: 'x' }] })).toBeUndefined();
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

test('/note, /todo and /footnote of the editor open the editor of a new note, a todo note or a footnote in the side view, as in the text editor (R-EDIT-008, decision 79)', async () => {
  fake.login = 'carl';
  const { document, panel, view } = await open();
  const start = at('change');
  // /todo on selected text: the editor selects the text again, and the side view opens the editor of a todo note.
  await page(panel, { type: 'selection', anchor: start, head: start + 'change'.length, mouse: false });
  await page(panel, { type: 'comment', todo: true });
  expect(view.messages.at(-1)).toEqual({ type: 'new', todo: true });
  expect(view.messages.filter((message) => message.type === 'line').at(-1)).toMatchObject({ highlight: 'change' });
  // /footnote: the side view opens the editor of a new footnote at the cursor.
  await page(panel, { type: 'selection', anchor: start + 'change'.length, head: start + 'change'.length, mouse: false });
  await page(panel, { type: 'footnote' });
  expect(fake.calls.at(-1)).toEqual({ command: viewCommands.newFootnote, args: [] });
  // /todo after text: the todo note on the sentence before the cursor, which the page sends with the text.
  const sentence = 'Fix the bug. Write the tests';
  const text = `${document.getText().trimEnd()}\n\n${sentence}\n`;
  // The change of the page reaches the document a moment after the message.
  const sent = page(panel, { type: 'slash', request: 1, command: 'todo', text, at: text.length - 1 });
  document.text = text;
  document.version++;
  fake.fire('change', { document, contentChanges: [] });
  await sent;
  expect(view.messages.filter((message) => message.type === 'new')).toEqual([
    { type: 'new', todo: true },
    { type: 'new', todo: true },
  ]);
  expect(view.messages.filter((message) => message.type === 'line').at(-1)).toMatchObject({ highlight: 'Write the tests' });
});

test('/figure, /table, /ref and /user of the editor run on the text that the page sent, as in the text editor, and send back the change and the text to select (R-EDIT-008, decision 79)', async () => {
  fake.login = 'carl';
  const content = '# Results\n\nTable 1: Grades\n\n| A |\n| --- |\n\nSee \n';
  const { panel } = await open(content);
  fake.found = [new FakeUri('file', '/folder/images/plan.png')];
  const last = () => panel.pluginMessages(pluginName).at(-1);
  // The page removed the typed command. Its empty paragraph after the table has no text in the file: its place is the
  // end of the table, and a figure gets the blank lines before it.
  const text = content;
  const empty = text.indexOf('\n\nSee');
  await page(panel, { type: 'slash', request: 1, command: 'figure', text, at: empty });
  const figure = '\n\nFigure 1: Caption\n\n![Caption](images/plan.png)';
  expect(last()).toEqual({ type: 'change', request: 1, patches: [{ from: empty, to: empty, insert: figure }], select: { from: empty + 12, to: empty + 19 } });
  await page(panel, { type: 'slash', request: 2, command: 'table', text, at: empty });
  const table = '\n\nTable 2: Caption\n\n| Column | Column |\n| --- | --- |\n|  |  |';
  expect(last()).toEqual({ type: 'change', request: 2, patches: [{ from: empty, to: empty, insert: table }], select: { from: empty + 11, to: empty + 18 } });
  // /ref links the table and gives its caption an anchor; the cursor goes after the link.
  fake.pick = (choices) => choices.find((choice) => choice.label === 'Table 1');
  const end = content.length - 1;
  await page(panel, { type: 'slash', request: 3, command: 'ref', text: content, at: end });
  const caption = content.indexOf('Grades') + 'Grades'.length;
  const anchor = '<a id="tab-grades"></a>';
  const link = '[Table 1](#tab-grades)';
  expect(last()).toEqual({
    type: 'change',
    request: 3,
    patches: [
      { from: caption, to: caption, insert: anchor },
      { from: end, to: end, insert: link },
    ],
    select: { from: end + anchor.length + link.length, to: end + anchor.length + link.length },
  });
  await page(panel, { type: 'slash', request: 4, command: 'user', text: content, at: end });
  expect(last()).toEqual({ type: 'change', request: 4, patches: [{ from: end, to: end, insert: 'carl' }], select: { from: end + 4, to: end + 4 } });
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

test('the view "Markdown Editor" of a document of the clean editing view is the editor of its file, and the buttons of the three views open the active file in another view in its place (R-VSC-002, R-TEXT-009)', async () => {
  await fake.activate();
  // The clean URI of the file file:///folder/a.md (cleanUriOf of src/cleanView.ts).
  const view = fake.open(text, '/folder/a.md', { scheme: 'markdownnotes', authority: 'file' });
  const panel = await fake.resolveCustomEditor(renderedEditor.viewType, view);
  expect(panel.webview.html).toBe('');
  const [file, viewType] = fake.calls.find(({ command }) => command === 'vscode.openWith')!.args as [{ scheme: string; path: string }, string];
  expect([file.scheme, file.path, viewType]).toEqual(['file', '/folder/a.md', renderedEditor.viewType]);
  await fake.run(renderedEditor.reopenPreview);
  await fake.run(renderedEditor.reopenText);
  expect(fake.calls.filter(({ command }) => command === 'reopenActiveEditorWith').map(({ args }) => args)).toEqual([['vscode.markdown.preview.editor'], ['default']]);
});

test('the page gets the scripts of the plugins that other extensions contribute, and other extensions connect their part through the API (R-GEN-012, R-TEXT-010)', async () => {
  const paper = 'nimblescape.nimblescape-markdownpaper';
  fake.extensions.set(paper, { packageJSON: { contributes: { 'nimblescape.markdown.extensions': { editorScripts: ['dist/editorPlugins.js'] } } } });
  const document = fake.open(text);
  const { api } = await fake.activate();
  const panel = await fake.resolveCustomEditor(renderedEditor.viewType, document);
  await panel.send({ type: 'ready' });
  const init = panel.messages.find((message) => message.type === 'init');
  expect(init?.plugins).toEqual([`file:/extensions/${paper}/dist/editorPlugins.js`]);
  // The part on the page speaks first; its part in the other extension connects later and gets the message.
  await panel.send({ type: 'plugin', plugin: 'citations', message: { type: 'ready' } });
  const received: unknown[] = [];
  const registration = api.getAPI(1)!.registerEditorPlugin('citations', (channel) => {
    channel.onMessage((message) => {
      received.push(message);
      void channel.post({ type: 'sources', count: 2 });
    });
  });
  await settle();
  expect(received).toEqual([{ type: 'ready' }]);
  expect(panel.pluginMessages('citations')).toEqual([{ type: 'sources', count: 2 }]);
  registration.dispose();
  await panel.send({ type: 'plugin', plugin: 'citations', message: { type: 'again' } });
  await settle();
  expect(received).toEqual([{ type: 'ready' }]);
  // The plugins of this extension keep their names.
  expect(() => api.getAPI(1)!.registerEditorPlugin(pluginName, () => undefined)).toThrow();
  expect(() => api.getAPI(1)!.registerEditorPlugin('figures', () => undefined)).toThrow();
});
