// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests run the activation of the extension with a fake of the API of
 * VS Code ([src/testing/fakeVscode.ts](testing/fakeVscode.ts)). They check
 * that every registration can be removed; that the export renders the
 * highlights of the notes with the link of the document, hidden unless the
 * setting showHighlights is on and the side view is open (R-PREV-001,
 * R-PREV-003, R-PREV-005); the buttons "Show Highlights" and "Hide
 * Highlights" (R-GEN-011); the selected note of the preview; the formatter
 * (R-FMT-001); the buttons of the side view (R-SIDE-006); the links of the
 * preview; the comment of the format (R-NOTE-007); the reading of the notes
 * after a change; the warnings (R-TEXT-008); the folds (R-TEXT-005); and the
 * hover over the selected text that adds a note in a color (R-EDIT-006).
 */

import MarkdownIt from 'markdown-it';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { highlightCommands, highlightsContext } from './extension';
import { noteColors } from './notes/colors';
import { deleteCommands } from './noteEditor';
import { notesViewId, viewCommands } from './notesView';
import { showTime } from './selectionHover';
import { settingsSection } from './settings';
import { Fake, FakeDocument, FakeEditor, FakeFoldingRange, type FakeMarkdownString, FakePosition, FakeRange, type FakeTextEdit, FakeUri, type FakeView, marked, settle } from './testing/fakeVscode';

// The static imports of the modules read only their constants; each test imports the extension with a new fake of the
// editor API.
vi.mock('vscode', () => ({}));

/** fake is the fake API of the test. */
let fake: Fake;

beforeEach(() => {
  vi.useFakeTimers();
  fake = new Fake();
  vi.resetModules();
  vi.doMock('vscode', () => fake.api);
});

afterEach(() => {
  vi.useRealTimers();
});

/** note is a Markdown text with a note of two answers: the note of ann on lines 4 to 10 and the reply of bob. */
const note = [
  '# Title',
  '',
  'The text[^note-aaaa] of the page.',
  '',
  '[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00',
  '',
  '    The **text**.',
  '',
  '    > **bob** · 2026-10-28 11:00+01:00',
  '    >',
  '    > An answer.',
  '',
  'More.',
  '',
].join('\n');

/** focus is the command that opens the side view. */
const focus = `${notesViewId}.focus`;

/**
 * closeView closes the side view, as VS Code does when the user closes it.
 * @param view - The side view.
 */
const closeView = (view: FakeView): void => {
  view.visible = false;
  view.visibility.forEach((listener) => listener());
};

test('the activation registers the commands, the side view and the handler of links, and the disposal of the context removes every registration', async () => {
  const { context, extension } = await fake.activate();
  expect([...fake.commands.keys()].sort()).toEqual([...Object.values(viewCommands), ...Object.values(highlightCommands), ...Object.values(deleteCommands)].sort());
  expect([...fake.views.keys()]).toEqual([notesViewId]);
  expect(fake.uriHandler).toBeDefined();
  // The overlay of the text editor learns the place of the pointer from a hover provider, and the hover of the selected
  // text has one of its own.
  expect(fake.hovers.get('markdown')).toHaveLength(2);
  expect(typeof extension.deactivate).toBe('function');
  expect(fake.registrations.length).toBeGreaterThan(0);
  for (const subscription of context.subscriptions) {
    subscription.dispose();
  }
  expect(fake.registrations.filter((registration) => !registration.disposed)).toEqual([]);
});

test('the export renders the highlights with the link of the rendered document, hidden unless the setting showHighlights is on and the side view is open (R-PREV-001, R-PREV-003, R-PREV-005)', async () => {
  const { api, extension } = await fake.activate();
  const md = api.extendMarkdownIt(new MarkdownIt({ html: true }));
  // A rendering without a document has no link to the side view.
  const plain = md.render(note);
  expect(plain).toContain(' data-note="note-aaaa"');
  expect(plain).not.toContain(' data-href=');
  const document = new FakeUri('file', '/folder/a.md');
  const query = new URLSearchParams({ document: document.toString(), line: '4' }).toString();
  expect(md.render(note, { currentDocument: document })).toContain(` data-href="vscode://${extension.extensionId}${extension.openPath}?${query.replace(/&/g, '&amp;')}" data-hidden="true"`);
  // With the side view open, the highlights show, except in a document whose setting is off.
  fake.resolveView(notesViewId);
  expect(md.render(note, { currentDocument: document })).not.toContain('data-hidden');
  const hidden = new FakeUri('file', '/folder/hidden.md');
  fake.settings.set(hidden.path, { showHighlights: false });
  expect(md.render(note, { currentDocument: hidden })).toContain(' data-hidden="true"');
  // The preview never shows the text of a note.
  expect(md.render(note, { currentDocument: document })).not.toContain('An answer');
});

test('"Hide Highlights" turns the setting off in the settings that decide the value, and "Show Highlights" turns it on and opens the side view (R-GEN-011)', async () => {
  await fake.activate();
  const contexts = () => fake.calls.filter(({ command, args }) => command === 'setContext' && args[0] === highlightsContext).map(({ args }) => args[1]);
  // The highlights do not show before the side view opens.
  expect(contexts()).toEqual([false]);
  await fake.run(highlightCommands.show);
  expect(fake.updates).toEqual([]);
  expect(fake.executed).toContain(focus);
  const view = fake.resolveView(notesViewId);
  expect(contexts().at(-1)).toBe(true);
  await fake.run(highlightCommands.hide);
  expect(fake.updates).toEqual([{ key: 'showHighlights', value: false, target: 1 }]);
  expect(contexts().at(-1)).toBe(false);
  expect(fake.executed).toContain('markdown.preview.refresh');
  // A value of the workspace decides the value for the window, so the button changes it there.
  fake.settings.set('workspace', { showHighlights: false });
  await fake.run(highlightCommands.show);
  expect(fake.updates[1]).toEqual({ key: 'showHighlights', value: true, target: 2 });
  expect(fake.settings.get('workspace')).toEqual({ showHighlights: true });
  expect(contexts().at(-1)).toBe(true);
  // Closing the side view hides the highlights without a change of the setting, and the button opens it again.
  closeView(view);
  expect(contexts().at(-1)).toBe(false);
  const shows = view.shows;
  await fake.run(highlightCommands.show);
  expect(fake.updates).toHaveLength(2);
  expect(view.shows).toBe(shows + 1);
});

test('the previews render again when the side view opens or closes, and after a change of a setting of the extension only', async () => {
  await fake.activate();
  const refreshes = () => fake.executed.filter((command) => command === 'markdown.preview.refresh').length;
  const view = fake.resolveView(notesViewId);
  expect(refreshes()).toBe(1);
  closeView(view);
  expect(refreshes()).toBe(2);
  fake.fire('configuration', { affectsConfiguration: (section: string) => section === settingsSection });
  expect(refreshes()).toBe(3);
  fake.fire('configuration', { affectsConfiguration: () => false });
  expect(refreshes()).toBe(3);
});

test('the highlight of the selected note in the preview has the link that deselects it, and the link deselects the note in the side view, for an open document only (R-PREV-003)', async () => {
  const document = fake.open(note);
  const { api, extension } = await fake.activate();
  const view = fake.resolveView(notesViewId);
  const handle = async (uri: string) => {
    await fake.uriHandler!.handleUri(FakeUri.parse(uri));
    await settle();
  };
  await handle(`vscode://${extension.extensionId}${extension.openPath}?${new URLSearchParams({ document: document.uri.toString(), line: '5' }).toString()}`);
  expect(view.state().selected).toBe(view.state().threads[0].id);
  const md = api.extendMarkdownIt(new MarkdownIt({ html: true }));
  const deselect = `vscode://${extension.extensionId}${extension.deselectPath}?${new URLSearchParams({ document: document.uri.toString() }).toString()}`;
  expect(md.render(note, { currentDocument: document.uri })).toContain(` data-selected="true" data-deselect="${deselect.replace(/&/g, '&amp;')}"`);
  // A link of a document that is not open changes nothing.
  await handle(`vscode://${extension.extensionId}${extension.deselectPath}?${new URLSearchParams({ document: 'file:///folder/b.md' }).toString()}`);
  expect(view.state().selected).toBe(view.state().threads[0].id);
  await handle(deselect);
  expect(view.state().selected).toBeUndefined();
  expect(md.render(note, { currentDocument: document.uri })).not.toContain('data-selected');
});

test('the formatter of Markdown documents gives one edit of the changed lines with the line breaks of the document, and none for a formatted document (R-FMT-001)', async () => {
  await fake.activate();
  const formatter = fake.formatters.get('markdown')!;
  const format = (document: FakeDocument): string => {
    const edits = formatter.provideDocumentFormattingEdits(document);
    expect(edits.length).toBeLessThanOrEqual(1);
    const [edit] = edits as FakeTextEdit[];
    return edit ? document.text.slice(0, document.offsetAt(edit.range.start)) + edit.newText + document.text.slice(document.offsetAt(edit.range.end)) : document.text;
  };
  const document = fake.open('# Title\nOne\ntwo  \n\n\n|a|b|\n|-|-|\n|long|c|\n');
  expect(format(document)).toBe('# Title\n\nOne two\n\n| a    | b   |\n| ---- | --- |\n| long | c   |\n');
  expect(formatter.provideDocumentFormattingEdits(fake.open('# Title\n\nText\n', '/folder/b.md'))).toEqual([]);
  const crlf = new FakeDocument(new FakeUri('file', '/folder/crlf.md'), 'One\r\ntwo\r\n\r\n\r\nThree\r\n', 'markdown', 2);
  expect(format(crlf)).toBe('One two\r\n\r\nThree\r\n');
});

test('the button of the side view closes the secondary side bar, and the button of the editors shows or hides the view (R-SIDE-006)', async () => {
  await fake.activate();
  const view = fake.resolveView(notesViewId);
  await fake.run(viewCommands.hide);
  expect(fake.calls.at(-1)).toEqual({ command: 'workbench.action.closeAuxiliaryBar', args: [] });
  await fake.run(viewCommands.toggle);
  expect(fake.calls.at(-1)).toEqual({ command: 'workbench.action.closeAuxiliaryBar', args: [] });
  view.visible = false;
  await fake.run(viewCommands.toggle);
  expect(fake.calls.at(-1)).toEqual({ command: focus, args: [] });
});

test('a link of a highlight of the preview opens the side view at its note, for an open Markdown document or one of the workspace only', async () => {
  const document = fake.open(note);
  const { extension } = await fake.activate();
  const view = fake.resolveView(notesViewId);
  const link = (target: string, line: string, path = extension.openPath) =>
    FakeUri.parse(`vscode://${extension.extensionId}${path}?${new URLSearchParams({ document: target, line }).toString()}`);
  const handle = async (uri: FakeUri) => {
    await fake.uriHandler!.handleUri(uri);
    await settle();
  };
  await handle(link(document.uri.toString(), '5'));
  expect(fake.executed.filter((command) => command === focus)).toHaveLength(1);
  expect(view.state()).toMatchObject({ file: 'a.md', selected: view.state().threads[0].id });
  // A file of the workspace that is not open opens; a file outside the workspace does not.
  fake.files.set('/folder/b.md', note);
  await handle(link('file:/folder/b.md', '2'));
  expect(view.state().file).toBe('b.md');
  fake.files.set('/other/c.md', note);
  await handle(link('file:/other/c.md', '2'));
  // Another path, a line that is no index, and a document that is not Markdown open nothing.
  fake.open('Text', '/folder/a.txt', { languageId: 'plaintext' });
  await handle(link('file:/folder/a.txt', '0'));
  await handle(link(document.uri.toString(), '-1'));
  await handle(link(document.uri.toString(), 'one'));
  await handle(link(document.uri.toString(), '2', '/other'));
  expect(fake.executed.filter((command) => command === focus)).toHaveLength(2);
});

test('a file with notes gets the comment of the format as soon as an editor shows it, once after it opens, and not with the setting addFormatComment off, nor a file without notes or with a newer format (R-NOTE-007)', async () => {
  const document = fake.open(note);
  const plain = fake.open('# Title\n\nText.\n', '/folder/plain.md');
  const hidden = fake.open(note, '/folder/hidden.md');
  const newer = fake.open(`<!-- nimblescape-markdown-notes format=2 -->\n\n${note}`, '/folder/newer.md');
  const off = fake.open(note, '/folder/off.md');
  fake.settings.set('/folder/off.md', { addFormatComment: false });
  fake.editors.push(...[document, plain, newer, off].map((shown) => new FakeEditor(shown)));
  await fake.activate();
  await vi.advanceTimersByTimeAsync(0);
  expect([document, plain, hidden, newer, off].map((each) => each.text)).toEqual([marked(note), '# Title\n\nText.\n', note, newer.text, note]);
  // The tab of the mode "Markdown Preview" shows a document too.
  fake.tabGroups = [{ viewColumn: 1, tabs: [{ input: { uri: hidden.uri } }] }];
  fake.fire('tabs', {});
  await vi.advanceTimersByTimeAsync(0);
  expect(hidden.text).toBe(marked(note));
  // Undo removes the comment for good, until the document opens again.
  document.text = note;
  document.version++;
  fake.fire('change', { document });
  await vi.advanceTimersByTimeAsync(1000);
  expect(document.text).toBe(note);
  fake.fire('close', document);
  fake.fire('open', document);
  await vi.advanceTimersByTimeAsync(0);
  expect(document.text).toBe(marked(note));
  // A note that the user writes into a file without notes brings the comment too.
  plain.text = `Text[^note-cccc].\n\n[^note-cccc]: **ann** · 2026-10-28 10:15+01:00\n\n    Body.\n`;
  plain.version++;
  fake.fire('change', { document: plain });
  await vi.advanceTimersByTimeAsync(1000);
  expect(plain.text).toBe(marked('Text[^note-cccc].\n\n[^note-cccc]: **ann** · 2026-10-28 10:15+01:00\n\n    Body.\n'));
});

test('a file whose comment of the format names a newer version keeps its notes as they are and shows why (R-NOTE-007)', async () => {
  const newer = `<!-- nimblescape-markdown-notes format=2 spec=https://example.com/format.md\n-->\n\n${note}`;
  const document = fake.open(newer);
  const editor = new FakeEditor(document, 15);
  fake.editors.push(editor);
  fake.activeEditor = editor;
  fake.signIn = 'hannes';
  await fake.activate();
  const view = fake.resolveView(notesViewId);
  await view.send({ type: 'ready' });
  await view.send({ type: 'save', request: 1, id: '1', answer: { index: 0, author: 'ann', date: '2026-10-28 10:15+01:00', body: 'The **text**.' }, text: 'A new text.' });
  await view.send({ type: 'deleteNote', id: '1' });
  editor.selection = { anchor: new FakePosition(15, 0), active: new FakePosition(15, 4) };
  fake.fire('selection', { textEditor: editor, kind: 2 });
  await view.send({ type: 'add', request: 2, text: 'A note.' });
  await settle();
  expect(document.text).toBe(newer);
  const message = 'The change was not saved: the file uses version 2 of the format of the notes, and this version of the extension knows only version 1. Update the extension.';
  expect(view.messages.filter((each) => each.type === 'result').map((each) => each.message)).toEqual([message, message]);
  expect(fake.errors).toEqual([message]);
});

test('after a change of a document and a pause, the extension reads its notes again, and a closed document has none', async () => {
  const document = fake.open(note);
  const { api } = await fake.activate();
  const labels = () => api.notesOf(document.uri as never).map((each) => [each.label, each.start.line]);
  expect(labels()).toEqual([['note-aaaa', 4]]);
  document.text = `Intro.\n\n${note}\nSecond[^note-bbbb].\n\n[^note-bbbb]: **ann** · 2026-10-28 10:15+01:00\n\n    Second\n`;
  document.version++;
  fake.fire('change', { document });
  // The notes are read again only after the pause.
  expect(labels()).toEqual([['note-aaaa', 4]]);
  await vi.advanceTimersByTimeAsync(300);
  expect(labels()).toEqual([
    ['note-aaaa', 6],
    ['note-bbbb', 18],
  ]);
  document.isClosed = true;
  fake.fire('close', document);
  expect(labels()).toEqual([]);
});

test('the warnings of the notes show as diagnostics, warnings and hints (R-TEXT-008)', async () => {
  const header = '**ann** · 2026-10-28 10:15+01:00';
  const document = fake.open(`# <wbr><!--[note-bbbb-->Plan[^note-bbbb]\n\nText[^note-aaaa] and [^note-zzzz].\n\n[^note-aaaa]: ${header}\n\n[^note-bbbb]: ${header}\n`);
  await fake.activate();
  expect(fake.diagnostics.get(document.uri.toString())).toMatchObject([
    { range: new FakeRange(0, 28, 0, 40), severity: 2, source: 'Markdown Notes', message: expect.stringMatching(/^A reference in a heading/) },
    { range: new FakeRange(2, 4, 2, 16), severity: 1, source: 'Markdown Notes', message: expect.stringMatching(/^The note has no start marker/) },
    { range: new FakeRange(2, 21, 2, 33), severity: 1, source: 'Markdown Notes', message: expect.stringMatching(/^The file has no note note-zzzz/) },
  ]);
});

test('the editor folds each note into the line of text before it (R-TEXT-005)', async () => {
  const document = fake.open(note);
  await fake.activate();
  expect(fake.folding.get('markdown')?.provideFoldingRanges(document)).toEqual([new FakeFoldingRange(2, 10, 1)]);
});

/** paragraphs is a Markdown text with two paragraphs, on lines 0 and 2. */
const paragraphs = 'The agents change the work of teams.\n\nA second paragraph.\n';

/**
 * select opens a text in the active editor, activates the extension, and selects text as the user does.
 * @param anchor - The anchor of the selection.
 * @param active - The cursor, the active end of the selection.
 * @param kind - How the user selected the text: 1 with the keys, 2 with the mouse, 3 by a command.
 * @param text - The text of the document.
 */
const select = async (anchor: FakePosition, active: FakePosition, kind = 2, text = paragraphs) => {
  const editor = new FakeEditor(fake.open(text), 0);
  fake.editors.push(editor);
  fake.activeEditor = editor;
  await fake.activate();
  await settle();
  fake.calls.length = 0;
  editor.selection = { anchor, active };
  fake.fire('selection', { textEditor: editor, kind });
  return editor;
};

/** hovers returns the calls of the command of VS Code that shows the hover at the cursor. */
const hovers = () => fake.calls.filter(({ command }) => command === 'editor.action.showHover');

test('a short time after the user selected text with the mouse or the keys, a hover over the selected text shows "Add Note" and an icon of each color, which adds a note in this color (R-EDIT-006)', async () => {
  const editor = await select(new FakePosition(0, 4), new FakePosition(0, 10));
  await vi.advanceTimersByTimeAsync(showTime - 1);
  expect(hovers()).toEqual([]);
  await vi.advanceTimersByTimeAsync(1);
  // The hover takes no focus, so the keys keep working in the text editor.
  expect(hovers()).toEqual([{ command: 'editor.action.showHover', args: [{ focus: 'noAutoFocus' }] }]);
  // VS Code asks the hover providers at the cursor, and also when the pointer rests on the selected text.
  const [hover] = fake.hover(editor.document, new FakePosition(0, 7)) as { contents: FakeMarkdownString; range: FakeRange }[];
  expect(hover.range).toMatchObject({ start: new FakePosition(0, 4), end: new FakePosition(0, 10) });
  expect(hover.contents).toMatchObject({ supportHtml: true, isTrusted: { enabledCommands: [viewCommands.newNote] } });
  const links = [...hover.contents.value.matchAll(/\[<span style="color:(#[0-9a-f]{6});" class="codicon codicon-circle-large-filled"><\/span>\]\(command:([^?]+)\?([^ ]+) "Add a note in (\w+)"\)/g)];
  expect(hover.contents.value.startsWith('Add Note')).toBe(true);
  expect(links.map(([, color, command, query, name]) => [color, command, JSON.parse(decodeURIComponent(query)), name])).toEqual(
    ['blue', 'green', 'orange', 'purple', 'red', 'teal'].map((name, index) => [noteColors[index], viewCommands.newNote, [name], name]),
  );
  // The pointer outside the selected text gets no hover.
  expect(fake.hover(editor.document, new FakePosition(2, 3))).toEqual([]);
  // A click on an icon runs "Add Note" with the name of its color, which opens the editor of a new note in the side view.
  const view = fake.resolveView(notesViewId);
  await view.send({ type: 'ready' });
  // The file has no notes yet, and the title of the new note names the selected text.
  expect(view.state()).toMatchObject({ threads: [], highlight: 'agents' });
  await fake.run(viewCommands.newNote, 'teal');
  expect(view.messages.at(-1)).toEqual({ type: 'new', color: 'teal' });
});

test('the hover of the selected text shows only for one selection in one block of text that stays for a short time, and not after a command (R-EDIT-006)', async () => {
  // A selection by a command, for example "Select All", gets no hover.
  let editor = await select(new FakePosition(0, 0), new FakePosition(2, 19), 3);
  await vi.advanceTimersByTimeAsync(showTime);
  expect(hovers()).toEqual([]);
  // A selection over two paragraphs holds no text that one note can highlight.
  fake = new Fake();
  vi.resetModules();
  vi.doMock('vscode', () => fake.api);
  editor = await select(new FakePosition(0, 4), new FakePosition(2, 3), 1);
  await vi.advanceTimersByTimeAsync(showTime);
  expect(hovers()).toEqual([]);
  expect(fake.hover(editor.document, new FakePosition(0, 7))).toEqual([]);
  // A selection that changes again before the time ends gets the hover only after its own time.
  editor.selection = { anchor: new FakePosition(2, 0), active: new FakePosition(2, 8) };
  fake.fire('selection', { textEditor: editor, kind: 1 });
  await vi.advanceTimersByTimeAsync(showTime / 2);
  editor.selection = { anchor: new FakePosition(2, 0), active: new FakePosition(2, 10) };
  fake.fire('selection', { textEditor: editor, kind: 1 });
  await vi.advanceTimersByTimeAsync(showTime / 2);
  expect(hovers()).toEqual([]);
  await vi.advanceTimersByTimeAsync(showTime / 2);
  expect(hovers()).toHaveLength(1);
  // An empty selection, and a selection in another editor than the active one, get none.
  editor.selection = { active: new FakePosition(2, 4) };
  fake.fire('selection', { textEditor: editor, kind: 2 });
  await vi.advanceTimersByTimeAsync(showTime);
  editor.selection = { anchor: new FakePosition(0, 0), active: new FakePosition(0, 3) };
  fake.fire('selection', { textEditor: editor, kind: 2 });
  fake.activeEditor = undefined;
  await vi.advanceTimersByTimeAsync(showTime);
  expect(hovers()).toHaveLength(1);
});

test('the hover of the selected text does not show in a file that the extension cannot change, nor on the text of a note (R-EDIT-006)', async () => {
  fake.settings.set('workspace', { addFormatComment: false });
  const editor = await select(new FakePosition(6, 4), new FakePosition(6, 8), 2, note);
  await vi.advanceTimersByTimeAsync(showTime);
  expect(hovers()).toEqual([]);
  const old = new FakeEditor(fake.open(paragraphs, '/folder/a.md', { scheme: 'git' }));
  fake.editors.push(old);
  fake.activeEditor = old;
  old.selection = { anchor: new FakePosition(0, 4), active: new FakePosition(0, 10) };
  fake.fire('selection', { textEditor: old, kind: 2 });
  await vi.advanceTimersByTimeAsync(showTime);
  expect(hovers()).toEqual([]);
  expect(fake.hover(old.document, new FakePosition(0, 5))).toEqual([]);
  expect(editor.document.text).toBe(note);
});
