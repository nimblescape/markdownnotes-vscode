// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests run the activation of the extension with a fake of the API of
 * VS Code ([src/testing/fakeVscode.ts](testing/fakeVscode.ts)). They check
 * that every registration can be removed; that the export renders the
 * highlights of the notes with the link of the document, hidden while the
 * setting showHighlights is off (R-PREV-001, R-PREV-003, R-PREV-005); the buttons "Show Highlights" and "Hide
 * Highlights" (R-GEN-011); the selected note of the preview; the formatter
 * (R-FMT-001); the buttons of the side view (R-SIDE-006); the links of the
 * preview; the comment of the format (R-NOTE-007); the reading of the notes
 * after a change; the warnings (R-TEXT-008); the folds (R-TEXT-005); and the
 * light bulb action of the selected text that adds a note (R-EDIT-006).
 */

import MarkdownIt from 'markdown-it';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { cleanCommands } from './cleanView';
import { footnoteCommands, footnotesContext, highlightCommands, highlightsContext } from './extension';
import { deleteCommands } from './noteEditor';
import { notesViewId, viewCommands } from './notesView';
import { settingsSection } from './settings';
import { slashCommandIds } from './slashCommands';
import { Fake, FakeCodeActionKind, FakeDocument, FakeEditor, FakeFoldingRange, FakePosition, FakeRange, FakeSelection, type FakeTextEdit, FakeUri, type FakeView, marked, settle } from './testing/fakeVscode';

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
  expect([...fake.commands.keys()].sort()).toEqual(
    [
      ...Object.values(viewCommands),
      ...Object.values(highlightCommands),
      ...Object.values(footnoteCommands),
      ...Object.values(deleteCommands),
      ...Object.values(cleanCommands),
      ...Object.values(slashCommandIds),
    ].sort(),
  );
  expect([...fake.views.keys()]).toEqual([notesViewId]);
  expect(fake.uriHandler).toBeDefined();
  // The overlay of the text editor learns the place of the pointer from a hover provider, and the selected text has the
  // light bulb action "Add Note".
  expect(fake.hovers.get('markdown')).toHaveLength(1);
  expect(fake.codeActions.get('markdown')).toHaveLength(1);
  // A slash in the text editor offers the slash commands (R-EDIT-008).
  expect(fake.completions.get('markdown')?.map(({ triggers }) => triggers)).toEqual([['/']]);
  expect(typeof extension.deactivate).toBe('function');
  expect(fake.registrations.length).toBeGreaterThan(0);
  for (const subscription of context.subscriptions) {
    subscription.dispose();
  }
  expect(fake.registrations.filter((registration) => !registration.disposed)).toEqual([]);
});

test('the export renders the highlights with the link of the rendered document, hidden while the setting showHighlights is off (R-PREV-001, R-PREV-003, R-PREV-005)', async () => {
  const { api, extension } = await fake.activate();
  const md = api.extendMarkdownIt(new MarkdownIt({ html: true }));
  // A rendering without a document has no link to the side view.
  const plain = md.render(note);
  expect(plain).toContain(' data-note="note-aaaa"');
  expect(plain).not.toContain(' data-href=');
  const document = new FakeUri('file', '/folder/a.md');
  const query = new URLSearchParams({ document: document.toString(), line: '4' }).toString();
  expect(md.render(note, { currentDocument: document })).toContain(` data-href="vscode://${extension.extensionId}${extension.openPath}?${query.replace(/&/g, '&amp;')}"`);
  // The highlights show also while the side view is closed, except in a document whose setting is off.
  expect(md.render(note, { currentDocument: document })).not.toContain('data-hidden');
  const hidden = new FakeUri('file', '/folder/hidden.md');
  fake.settings.set(hidden.path, { showHighlights: false });
  expect(md.render(note, { currentDocument: hidden })).toContain(' data-hidden="true"');
  // The preview never shows the text of a note.
  expect(md.render(note, { currentDocument: document })).not.toContain('An answer');
});

test('the export ends the page of an open document that can have notes with the link of "Add Note" of the preview (R-PREV-008)', async () => {
  const document = fake.open(note);
  const { api, extension } = await fake.activate();
  const md = api.extendMarkdownIt(new MarkdownIt({ html: true }));
  const link = `vscode://${extension.extensionId}${extension.addPath}?${new URLSearchParams({ document: document.uri.toString() }).toString()}`;
  const html = md.render('Text.\n', { currentDocument: document.uri });
  expect(html).toBe(`<p>Text.</p>\n<div class="nimblescape-note-page" data-add="${link.replace(/&/g, '&amp;')}" hidden></div>\n`);
  // A rendering without a document, of a document that is not open, or of a document that can have no notes has none.
  expect(md.render('Text.\n')).toBe('<p>Text.</p>\n');
  expect(md.render('Text.\n', { currentDocument: new FakeUri('file', '/folder/b.md') })).toBe('<p>Text.</p>\n');
  const version = fake.open('Text.\n', '/folder/a.md', { scheme: 'git' });
  expect(md.render('Text.\n', { currentDocument: version.uri })).toBe('<p>Text.</p>\n');
});

test('"Hide Highlights" turns the setting off in the settings that decide the value, and "Show Highlights" turns it on without opening the side view (R-GEN-011)', async () => {
  await fake.activate();
  const contexts = () => fake.calls.filter(({ command, args }) => command === 'setContext' && args[0] === highlightsContext).map(({ args }) => args[1]);
  // The highlights show from the start, also while the side view is closed.
  expect(contexts()).toEqual([true]);
  await fake.run(highlightCommands.show);
  expect(fake.updates).toEqual([]);
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
  // "Show Highlights" only shows the highlights (Hannes, 2026-10-29: "it shall not open the side view but only show the
  // highlights"), and closing the side view keeps them.
  expect(fake.executed).not.toContain(focus);
  closeView(fake.resolveView(notesViewId));
  expect(contexts().at(-1)).toBe(true);
});

test('"Hide Footnotes" and "Show Footnotes" turn the setting showFootnotes off and on, and the buttons follow it (R-FOOT-001)', async () => {
  await fake.activate();
  const contexts = () => fake.calls.filter(({ command, args }) => command === 'setContext' && args[0] === footnotesContext).map(({ args }) => args[1]);
  expect(contexts()).toEqual([true]);
  await fake.run(footnoteCommands.show);
  expect(fake.updates).toEqual([]);
  await fake.run(footnoteCommands.hide);
  expect(fake.updates).toEqual([{ key: 'showFootnotes', value: false, target: 1 }]);
  expect(contexts().at(-1)).toBe(false);
  await fake.run(footnoteCommands.show);
  expect(fake.updates[1]).toEqual({ key: 'showFootnotes', value: true, target: 1 });
  expect(contexts().at(-1)).toBe(true);
});

test('the previews render again after a change of a setting of the extension only, not when the side view opens or closes', async () => {
  await fake.activate();
  const refreshes = () => fake.executed.filter((command) => command === 'markdown.preview.refresh').length;
  closeView(fake.resolveView(notesViewId));
  expect(refreshes()).toBe(0);
  fake.fire('configuration', { affectsConfiguration: (section: string) => section === settingsSection });
  expect(refreshes()).toBe(1);
  fake.fire('configuration', { affectsConfiguration: () => false });
  expect(refreshes()).toBe(1);
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

/**
 * save fires the save of a document and returns the edits that the extension gives VS Code before the save.
 * @param document - The document.
 * @param reason - The reason of the save: 1 for a save of the user, 2 for an automatic save after a delay, 3 for a save
 * when the focus goes to another editor.
 */
const save = async (document: FakeDocument, reason = 1): Promise<FakeTextEdit[]> => {
  const waits: PromiseLike<FakeTextEdit[]>[] = [];
  fake.fire('willSave', { document, reason, waitUntil: (thenable: PromiseLike<FakeTextEdit[]>) => waits.push(thenable) });
  return (await Promise.all(waits)).flat();
};

/**
 * saved returns the text of a document after the edits that the extension gives VS Code before its save.
 * @param document - The document.
 * @param reason - The reason of the save.
 */
const saved = async (document: FakeDocument, reason = 1): Promise<string> => {
  const [edit, ...others] = await save(document, reason);
  expect(others).toEqual([]);
  return edit ? document.text.slice(0, document.offsetAt(edit.range.start)) + edit.newText + document.text.slice(document.offsetAt(edit.range.end)) : document.text;
};

test('a save formats a Markdown file with notes or with the comment of the format, and no other file, also not with the setting formatOnSave off or when VS Code formats on save itself (R-FMT-001)', async () => {
  // The comment of the format, which a save of a file with notes also writes, has a test of its own.
  fake.settings.set('workspace', { addFormatComment: false });
  await fake.activate();
  const withNotes = fake.open('One\ntwo[^note-aaaa].\n\n[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00\n\n    A\n', '/folder/notes.md');
  expect(await save(withNotes)).toHaveLength(1);
  // A save with the focus on another editor formats; an automatic save after a delay does not, as in VS Code.
  expect(await save(withNotes, 3)).toHaveLength(1);
  expect(await save(withNotes, 2)).toEqual([]);
  expect(await save(fake.open(marked('# Title\nOne\ntwo\n'), '/folder/doctype.md'))).toHaveLength(1);
  // A Markdown file without notes keeps its text; "Format Document" still formats it.
  const plain = fake.open('# Title\nOne\ntwo\n', '/folder/plain.md');
  expect(await save(plain)).toEqual([]);
  expect(fake.formatters.get('markdown')!.provideDocumentFormattingEdits(plain)).toHaveLength(1);
  expect(await save(fake.open('One\ntwo[^note-aaaa].\n\n[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00\n\n    A\n', '/folder/notes.txt', { languageId: 'plaintext' }))).toEqual([]);
  fake.settings.set('/folder/notes.md', { [`${settingsSection}.formatOnSave`]: false });
  expect(await save(withNotes)).toEqual([]);
  fake.settings.delete('/folder/notes.md');
  // With editor.formatOnSave on, VS Code runs the formatter itself; another default formatter is the choice of the user.
  fake.settings.set('', { 'editor.formatOnSave': true });
  expect(await save(withNotes)).toEqual([]);
  fake.settings.set('', { 'editor.defaultFormatter': 'other.formatter' });
  expect(await save(withNotes)).toEqual([]);
  fake.settings.set('', { 'editor.defaultFormatter': 'nimblescape.nimblescape-markdown-notes' });
  expect(await save(withNotes)).toHaveLength(1);
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

test('a link of a double click on a highlight of the preview opens the side view at its note, and the link of a click only selects it, for an open Markdown document or one of the workspace only', async () => {
  const document = fake.open(note);
  const { extension } = await fake.activate();
  const view = fake.resolveView(notesViewId);
  const link = (target: string, line: string, path = extension.openPath) =>
    FakeUri.parse(`vscode://${extension.extensionId}${path}?${new URLSearchParams({ document: target, line }).toString()}`);
  const handle = async (uri: FakeUri) => {
    await fake.uriHandler!.handleUri(uri);
    await settle();
  };
  // The link of a click selects the note and leaves the view as it is (Hannes, 2026-10-29: "only a double click on a
  // selected highlight shall open the side view").
  await handle(link(document.uri.toString(), '5', extension.selectPath));
  expect(fake.executed.filter((command) => command === focus)).toHaveLength(0);
  expect(view.state()).toMatchObject({ file: 'a.md', selected: view.state().threads[0].id });
  await view.send({ type: 'deselect' });
  await settle();
  expect(view.state().selected).toBeUndefined();
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

test('a save of a file with notes writes the comment of the format at its top, and an editor that only shows the file changes nothing, nor the setting addFormatComment off, a file without notes or with a newer format (R-NOTE-007)', async () => {
  // The format, which a save of a file with notes also does, has a test of its own.
  fake.settings.set('workspace', { formatOnSave: false });
  const document = fake.open(note);
  const plain = fake.open('# Title\n\nText.\n', '/folder/plain.md');
  const newer = fake.open(`<!-- nimblescape-markdown-notes v2.0.0 -->\n\n${note}`, '/folder/newer.md');
  const off = fake.open(note, '/folder/off.md');
  fake.settings.set('/folder/off.md', { addFormatComment: false });
  fake.editors.push(...[document, plain, newer, off].map((shown) => new FakeEditor(shown)));
  fake.tabGroups = [{ viewColumn: 1, tabs: [{ input: { uri: document.uri } }] }];
  await fake.activate();
  fake.fire('tabs', {});
  await vi.advanceTimersByTimeAsync(1000);
  // Hannes, 2026-10-29, "D2: ok": a file that an editor only shows keeps its text.
  expect([document, plain, newer, off].map((each) => each.text)).toEqual([note, '# Title\n\nText.\n', newer.text, note]);
  expect(await saved(document)).toBe(marked(note));
  expect(await saved(document, 3)).toBe(marked(note));
  expect(await saved(document, 2)).toBe(note);
  expect(await saved(plain)).toBe(plain.text);
  expect(await saved(newer)).toBe(newer.text);
  expect(await saved(off)).toBe(note);
  // A note that the user writes into a file without notes brings the comment with the next save.
  plain.text = `Text[^note-cccc].\n\n[^note-cccc]: **ann** · 2026-10-28 10:15+01:00\n\n    Body.\n`;
  plain.version++;
  fake.fire('change', { document: plain, contentChanges: [] });
  await vi.advanceTimersByTimeAsync(1000);
  expect(plain.text).toBe('Text[^note-cccc].\n\n[^note-cccc]: **ann** · 2026-10-28 10:15+01:00\n\n    Body.\n');
  expect(await saved(plain)).toBe(marked(plain.text));
});

test('a file whose comment of the format names a newer version keeps its notes as they are and shows why (R-NOTE-007)', async () => {
  const newer = `<!-- nimblescape-markdown-notes v2.0.0 spec=https://example.com/format.md\n-->\n\n${note}`;
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
  const message = 'The change was not saved: the file uses version 2.0.0 of the format of the notes, and this version of the extension knows only the versions 1.x. Update the extension.';
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
  fake.fire('change', { document, contentChanges: [] });
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
 * @param text - The text of the document.
 */
const select = async (anchor: FakePosition, active: FakePosition, text = paragraphs) => {
  const editor = new FakeEditor(fake.open(text), 0);
  fake.editors.push(editor);
  fake.activeEditor = editor;
  await fake.activate();
  await settle();
  fake.calls.length = 0;
  editor.selection = { anchor, active };
  fake.fire('selection', { textEditor: editor, kind: 2 });
  return editor;
};

test('the selected text of a paragraph gets the light bulb action "Add Note", which opens the editor of a new note in the side view, and no hover (R-EDIT-006)', async () => {
  const editor = await select(new FakePosition(0, 4), new FakePosition(0, 10));
  // VS Code asks the providers of the Code Actions with the selection, for the light bulb and for Ctrl+.
  const addNote = { title: 'Add Note', kind: 'quickfix.markdownNotes.addNote', command: viewCommands.newNote };
  expect(fake.codeActionsAt(editor.document, editor.selection)).toEqual([addNote]);
  expect(fake.codeActions.get('markdown')?.map(({ kinds }) => kinds.map((kind) => kind.value))).toEqual([['quickfix.markdownNotes.addNote']]);
  // A request for the quick fixes gets it, so it stands at the top of the list; a request for the refactorings gets
  // nothing.
  expect(fake.codeActionsAt(editor.document, editor.selection, FakeCodeActionKind.QuickFix)).toEqual([addNote]);
  expect(fake.codeActionsAt(editor.document, editor.selection, FakeCodeActionKind.Empty.append('refactor'))).toEqual([]);
  // No hover shows by itself over the selected text (Hannes, 2026-10-29, decision D4 of the code review).
  await vi.advanceTimersByTimeAsync(2000);
  expect(fake.calls.filter(({ command }) => command === 'editor.action.showHover')).toEqual([]);
  expect(fake.hover(editor.document, new FakePosition(0, 7))).toEqual([]);
  // The action runs "Add Note", which opens the editor of a new note in the side view.
  const view = fake.resolveView(notesViewId);
  await view.send({ type: 'ready' });
  // The file has no notes yet, and the title of the new note names the selected text.
  expect(view.state()).toMatchObject({ threads: [], highlight: 'agents' });
  await fake.run(addNote.command);
  expect(view.messages.at(-1)).toEqual({ type: 'new' });
});

test('the light bulb action "Add Note" is only for one selection in one block of text that a note can highlight, in a file that the extension can change (R-EDIT-006)', async () => {
  const editor = await select(new FakePosition(0, 4), new FakePosition(2, 3));
  const { document } = editor;
  // A selection over two paragraphs holds no text that one note can highlight.
  expect(fake.codeActionsAt(document, editor.selection)).toEqual([]);
  // An empty selection gets nothing, and neither does a range that is not the selection.
  editor.selection = { active: new FakePosition(2, 4) };
  expect(fake.codeActionsAt(document, editor.selection)).toEqual([]);
  expect(fake.codeActionsAt(document, new FakeRange(2, 0, 2, 8))).toEqual([]);
  editor.selection = { anchor: new FakePosition(2, 0), active: new FakePosition(2, 8) };
  expect(fake.codeActionsAt(document, editor.selection)).toHaveLength(1);
  // Several selections get nothing.
  editor.selections = [editor.selection, new FakeSelection(new FakePosition(0, 0), new FakePosition(0, 3))];
  expect(fake.codeActionsAt(document, editor.selections[0])).toEqual([]);
  // The text of a note gets nothing.
  const noted = new FakeEditor(fake.open(note, '/folder/noted.md'), 0);
  fake.editors.push(noted);
  noted.selection = { anchor: new FakePosition(6, 4), active: new FakePosition(6, 8) };
  expect(fake.codeActionsAt(noted.document, noted.selection)).toEqual([]);
  // A file that the extension cannot change, for example an older version of a file in Git, gets nothing.
  const old = new FakeEditor(fake.open(paragraphs, '/folder/a.md', { scheme: 'git' }));
  fake.editors.push(old);
  old.selection = { anchor: new FakePosition(0, 4), active: new FakePosition(0, 10) };
  expect(fake.codeActionsAt(old.document, old.selection)).toEqual([]);
  expect(noted.document.text).toBe(note);
});
