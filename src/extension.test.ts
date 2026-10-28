// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests run the activation of the extension with a fake of the API of
 * VS Code ([src/testing/fakeVscode.ts](testing/fakeVscode.ts)). They check
 * that every registration can be removed, that the export renders the icons
 * of the notes with the settings and the link of the document (R-PREV-001,
 * R-PREV-003), that a link of an icon opens the side view, and the threads of
 * the notes in the text editor and the Comments view (R-TEXT-001, R-TEXT-002,
 * R-TEXT-003, R-VIEW-001): their places, their answers, the editor of an
 * answer (R-EDIT-001), the save (R-EDIT-002), the new note and the new answer
 * with the GitHub login and the date (R-EDIT-003, R-EDIT-005, R-GEN-006), the
 * delete (R-EDIT-004), the refused text (R-NOTE-003), the warning at a nested
 * note, the folding, and the reading of the notes after a change of a
 * document or of a setting.
 */

import MarkdownIt from 'markdown-it';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { githubProvider, githubScopes } from './github';
import { previewCommands } from './extension';
import { noteClass } from './markdown/markdownIt';
import { editorCommands } from './noteEditor';
import { commands as noteCommands, controllerId, draftContext, noteContext } from './noteThreads';
import { notesViewId, viewCommands } from './notesView';
import { settingsSection } from './settings';
import { bodyOf, Fake, FakeDocument, FakeEditor, FakeFoldingRange, FakeMarkdownString, FakeRange, FakeThread, FakeUri, settle } from './testing/fakeVscode';

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

/**
 * run runs a registered command and waits for its promises.
 * @param command - The command.
 * @param args - Its arguments.
 */
const run = async (command: string, ...args: unknown[]): Promise<void> => {
  await fake.run(command, ...args);
  await vi.advanceTimersByTimeAsync(0);
};

/** note is a Markdown text with a note of two answers, each with a front matter. */
const note =
  '# Title\n\n<!-- note\n---\nauthor: ann\ndate: 2026-10-28T10:15+01:00\n---\nThe **text**.\n---\nauthor: bob\ndate: 2026-10-28T11:00+01:00\n---\nAn answer.\n-->\n\nMore.\n';

/** focus is the command that opens the side view. */
const focus = `${notesViewId}.focus`;

test('the activation registers the commands, the side view and the handler of links, and the disposal of the context removes every registration', async () => {
  const { context, extension } = await fake.activate();
  expect([...fake.commands.keys()].sort()).toEqual(
    [...Object.values(noteCommands), ...Object.values(editorCommands), ...Object.values(viewCommands), ...Object.values(previewCommands)].sort(),
  );
  expect(fake.controller?.id).toBe(controllerId);
  expect([...fake.views.keys()]).toEqual([notesViewId]);
  expect(fake.uriHandler).toBeDefined();
  expect(typeof extension.deactivate).toBe('function');
  expect(fake.registrations.length).toBeGreaterThan(0);
  for (const subscription of context.subscriptions) {
    subscription.dispose();
  }
  expect(fake.registrations.filter((registration) => !registration.disposed)).toEqual([]);
});

test('the export renders the icons with the setting showInPreview and the link of the rendered document (R-PREV-001, R-PREV-003)', async () => {
  const { api, extension } = await fake.activate();
  const md = api.extendMarkdownIt(new MarkdownIt({ html: true }));
  // A rendering without a document has no link to the side view.
  const plain = md.render(note);
  expect(plain).toContain(`class="${noteClass}-icon"`);
  expect(plain).not.toContain('href=');
  const document = new FakeUri('file', '/folder/a.md');
  const query = new URLSearchParams({ document: document.toString(), line: '2' }).toString();
  expect(md.render(note, { currentDocument: document })).toContain(`href="vscode://${extension.extensionId}${extension.openPath}?${query.replace(/&/g, '&amp;')}"`);
  const hidden = new FakeUri('file', '/folder/hidden.md');
  fake.settings.set(hidden.path, { showInPreview: false });
  expect(md.render(note, { currentDocument: hidden })).not.toContain(noteClass);
  expect(md.render(note, { currentDocument: hidden })).toContain('More.');
});

test('the buttons of the preview show and hide its notes in the settings that decide the value, and render the previews again (R-PREV-005)', async () => {
  await fake.activate();
  await fake.run(previewCommands.hide);
  expect(fake.updates).toEqual([{ key: 'showInPreview', value: false, target: 1 }]);
  expect(fake.executed).toContain('markdown.preview.refresh');
  // A value of the workspace decides the value for the window, so the button changes it there.
  fake.settings.set('workspace', { showInPreview: false });
  await fake.run(previewCommands.show);
  expect(fake.updates[1]).toEqual({ key: 'showInPreview', value: true, target: 2 });
  expect(fake.settings.get('')).toEqual({ showInPreview: false });
  expect(fake.settings.get('workspace')).toEqual({ showInPreview: true });
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
  expect(fake.calls.at(-1)).toEqual({ command: `${notesViewId}.focus`, args: [] });
});

test('a link of an icon opens the side view at its note, for an open Markdown document or one of the workspace only', async () => {
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

test('a note of an open Markdown document gets a collapsed thread with one comment for each answer (R-TEXT-001, R-TEXT-002, R-VIEW-001)', async () => {
  const document = fake.open(note);
  fake.open(note, '/folder/a.txt', { languageId: 'plaintext' });
  const old = fake.open(note, '/folder/a.md', { scheme: 'git' });
  await fake.activate();
  expect(fake.live()).toHaveLength(1);
  const [thread] = fake.live();
  expect(thread.uri).toBe(document.uri);
  expect(thread.range).toEqual(new FakeRange(2, 0, 13, 3));
  expect(thread).toMatchObject({ canReply: true, contextValue: noteContext, collapsibleState: 0, label: 'Markdown note' });
  expect(thread.comments.map((comment) => [comment.author.name, comment.timestamp?.toISOString(), bodyOf(comment), comment.mode, comment.contextValue])).toEqual([
    ['ann', '2026-10-28T09:15:00.000Z', 'The **text**.', 1, noteContext],
    ['bob', '2026-10-28T10:00:00.000Z', 'An answer.', 1, noteContext],
  ]);
  expect(thread.comments[0].body).toMatchObject({ supportHtml: true, baseUri: document.uri });
  // The `+` of a new note is at every line of a document that can have notes.
  expect(fake.controller?.commentingRangeProvider?.provideCommentingRanges(document)).toEqual([new FakeRange(0, 0, 16, 0)]);
  expect(fake.controller?.commentingRangeProvider?.provideCommentingRanges(old)).toEqual([]);
});

test('a note without a front matter names no author, and a date of another form shows as written', async () => {
  fake.open('<!-- note\nText\n-->\n\n<!-- note\n---\ndate: last week\n---\nText\n-->\n');
  await fake.activate();
  expect(fake.live().map((thread) => [thread.comments[0].author.name, thread.comments[0].timestamp, thread.comments[0].label])).toEqual([
    ['Note', undefined, undefined],
    ['Note', undefined, 'last week'],
  ]);
});

test('the text editor dims the source of each note (R-TEXT-003)', async () => {
  const document = fake.open(note);
  const editor = new FakeEditor(document);
  fake.editors.push(editor);
  await fake.activate();
  const [[type, ranges]] = [...editor.decorations];
  expect(type).toMatchObject({ options: { opacity: '0.55' } });
  expect(ranges).toEqual([new FakeRange(2, 0, 13, 3)]);
  // An editor that shows later gets the decoration too; a document without notes has none.
  const other = new FakeEditor(fake.open('Text <!-- note inline\nA\n--> more.\n', '/folder/b.md'));
  const old = new FakeEditor(fake.open(note, '/folder/a.md', { scheme: 'git' }));
  fake.fire('visibleEditors', [other, old]);
  expect(other.decorations.get(type)).toEqual([new FakeRange(0, 5, 2, 3)]);
  expect(old.decorations.get(type)).toEqual([]);
  await run(noteCommands.deleteNote, fake.live()[0]);
  expect(editor.decorations.get(type)).toEqual([]);
});

test('the setting expandInEditor opens the boxes, and a change of a setting builds the threads anew and refreshes the previews', async () => {
  fake.open(note);
  await fake.activate();
  expect(fake.live()[0].collapsibleState).toBe(0);
  fake.settings.set('', { expandInEditor: true });
  fake.fire('configuration', { affectsConfiguration: (section: string) => section === settingsSection });
  expect(fake.live()).toHaveLength(1);
  expect(fake.live()[0].collapsibleState).toBe(1);
  expect(fake.executed).toEqual(['markdown.preview.refresh']);
  // A change of another setting changes nothing.
  fake.fire('configuration', { affectsConfiguration: () => false });
  expect(fake.executed).toHaveLength(1);
});

test('Edit opens the editor of an answer, and Save writes the text into the answer in the comment of the note (R-EDIT-001, R-EDIT-002)', async () => {
  const document = fake.open(note);
  await fake.activate();
  const [thread] = fake.live();
  const comment = thread.comments[1];
  await run(noteCommands.editAnswer, comment);
  expect(comment.mode).toBe(0);
  // VS Code sets the body to the text of the editor before the button runs.
  comment.body = new FakeMarkdownString('A new *answer*.\n\nWith a second paragraph.\n');
  await run(noteCommands.saveAnswer, comment);
  expect(document.text).toBe(
    '# Title\n\n<!-- note\n---\nauthor: ann\ndate: 2026-10-28T10:15+01:00\n---\nThe **text**.\n---\nauthor: bob\ndate: 2026-10-28T11:00+01:00\n---\nA new *answer*.\n\nWith a second paragraph.\n-->\n\nMore.\n',
  );
  expect(fake.errors).toEqual([]);
  // The thread stays, with the saved text, in the preview mode.
  await vi.advanceTimersByTimeAsync(1000);
  expect(fake.live()).toEqual([thread]);
  expect(thread.range).toEqual(new FakeRange(2, 0, 15, 3));
  expect(thread.comments.map(bodyOf)).toEqual(['The **text**.', 'A new *answer*.\n\nWith a second paragraph.']);
  expect(thread.comments.map((other) => other.mode)).toEqual([1, 1]);
});

test('Save keeps the line breaks of a document with CRLF', async () => {
  const document = new FakeDocument(new FakeUri('file', '/folder/crlf.md'), 'Text\r\n\r\n<!-- note\r\nOld\r\n-->\r\n', 'markdown', 2);
  fake.documents.push(document);
  await fake.activate();
  const comment = fake.live()[0].comments[0];
  comment.body = new FakeMarkdownString('One\n\nTwo');
  await run(noteCommands.saveAnswer, comment);
  expect(document.text).toBe('Text\r\n\r\n<!-- note\r\nOne\r\n\r\nTwo\r\n-->\r\n');
});

test('Save refuses a text with another comment, shows why and opens the editor with the text again (R-NOTE-003)', async () => {
  const document = fake.open(note);
  await fake.activate();
  const comment = fake.live()[0].comments[0];
  await run(noteCommands.editAnswer, comment);
  comment.body = new FakeMarkdownString('A <!-- comment --> in the note');
  await run(noteCommands.saveAnswer, comment);
  expect(document.text).toBe(note);
  expect(fake.errors).toEqual(['The change was not saved: a note must not contain another comment. Remove "<!--" from its text.']);
  expect(comment.mode).toBe(1);
  await vi.advanceTimersByTimeAsync(300);
  expect(comment.mode).toBe(0);
  expect(bodyOf(fake.live()[0].comments[0])).toBe('A <!-- comment --> in the note');
});

test('Cancel closes the editor and shows the answer as the document holds it', async () => {
  fake.open(note);
  await fake.activate();
  const comment = fake.live()[0].comments[0];
  await run(noteCommands.editAnswer, comment);
  comment.body = new FakeMarkdownString('Not saved');
  await run(noteCommands.cancelEdit, comment);
  expect(comment.mode).toBe(1);
  expect(bodyOf(fake.live()[0].comments[0])).toBe('The **text**.');
});

test('Add Note signs in with GitHub and writes a new note with the login and the date after the line (R-EDIT-003, R-GEN-006)', async () => {
  vi.setSystemTime(new Date(2026, 9, 28, 10, 15));
  const document = fake.open('# Title\n\nFirst line\nsecond line\n\nLast.\n');
  fake.signIn = 'hannes';
  await fake.activate();
  // VS Code creates the thread of the `+` at the line, without comments.
  const thread = new FakeThread(fake, document.uri, new FakeRange(2, 0, 2, 0), []);
  await run(noteCommands.addNote, { thread, text: 'A **new** note.' });
  expect(fake.sessions).toEqual([{ provider: githubProvider, scopes: githubScopes, options: { createIfNone: true } }]);
  expect(document.text).toMatch(
    /^# Title\n\nFirst line\n<!-- note inline\n---\nauthor: hannes\ndate: 2026-10-28T10:15[+-]\d{2}:\d{2}\n---\nA \*\*new\*\* note\.\n-->\nsecond line\n\nLast\.\n$/,
  );
  // The thread of the `+` becomes the thread of the note.
  await vi.advanceTimersByTimeAsync(1000);
  expect(fake.live()).toEqual([thread]);
  expect(thread).toMatchObject({ canReply: true, contextValue: noteContext, collapsibleState: 1, range: new FakeRange(3, 0, 9, 3) });
  expect(thread.comments).toHaveLength(1);
  expect(thread.comments[0]).toMatchObject({ author: { name: 'hannes' }, mode: 1, contextValue: noteContext });
  expect(bodyOf(thread.comments[0])).toBe('A **new** note.');
});

test('Add Note without a GitHub sign-in or with a refused text keeps the text in an editor of the box, which Save writes after a fix', async () => {
  const document = fake.open('Text\n');
  await fake.activate();
  const thread = new FakeThread(fake, document.uri, new FakeRange(0, 0, 0, 0), []);
  await run(noteCommands.addNote, { thread, text: 'First text' });
  expect(document.text).toBe('Text\n');
  expect(fake.errors).toEqual([expect.stringMatching(/^The change was not saved: sign in with GitHub/)]);
  await vi.advanceTimersByTimeAsync(300);
  const draft = thread.comments[0];
  expect(draft).toMatchObject({ mode: 0, contextValue: draftContext });
  expect(thread).toMatchObject({ canReply: false, contextValue: draftContext });
  fake.signIn = 'hannes';
  draft.body = new FakeMarkdownString('Bad <!-- text');
  await run(noteCommands.saveAnswer, draft);
  expect(document.text).toBe('Text\n');
  expect(fake.errors).toHaveLength(2);
  await vi.advanceTimersByTimeAsync(300);
  expect(thread.comments).toEqual([draft]);
  draft.body = new FakeMarkdownString('Good text');
  await run(noteCommands.saveAnswer, draft);
  expect(document.text).toMatch(/^Text\n<!-- note inline\n---\nauthor: hannes\ndate: .*\n---\nGood text\n-->\n$/);
  await vi.advanceTimersByTimeAsync(1000);
  expect(fake.live()).toEqual([thread]);
  expect(thread.comments.map((comment) => comment.contextValue)).toEqual([noteContext]);
});

test('Cancel of a new note removes its box', async () => {
  const document = fake.open('Text\n');
  await fake.activate();
  const thread = new FakeThread(fake, document.uri, new FakeRange(0, 0, 0, 0), []);
  await run(noteCommands.discardNewNote, { thread, text: '' });
  expect(thread.disposed).toBe(true);
});

test('Answer adds an answer of the signed-in user at the end of the thread (R-EDIT-005, R-GEN-006)', async () => {
  const document = fake.open(note);
  fake.login = 'carl';
  await fake.activate();
  const [thread] = fake.live();
  await run(noteCommands.answer, { thread, text: 'A third answer.' });
  expect(document.text).toMatch(/\n---\nAn answer\.\n---\nauthor: carl\ndate: .*\n---\nA third answer\.\n-->\n\nMore\.\n$/);
  await vi.advanceTimersByTimeAsync(1000);
  expect(fake.live()).toEqual([thread]);
  expect(thread.comments.map((comment) => [comment.author.name, bodyOf(comment)])).toEqual([
    ['ann', 'The **text**.'],
    ['bob', 'An answer.'],
    ['carl', 'A third answer.'],
  ]);
});

test('a refused answer stays in an editor at the end of the thread, which Save writes after a fix and Cancel removes', async () => {
  const document = fake.open(note);
  fake.login = 'carl';
  await fake.activate();
  const [thread] = fake.live();
  await run(noteCommands.answer, { thread, text: 'Bad <!-- text' });
  expect(document.text).toBe(note);
  expect(fake.errors).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(300);
  expect(thread.comments).toHaveLength(3);
  const draft = thread.comments[2];
  expect(draft).toMatchObject({ mode: 0, contextValue: draftContext });
  expect(bodyOf(draft)).toBe('Bad <!-- text');
  draft.body = new FakeMarkdownString('Fixed');
  await run(noteCommands.saveAnswer, draft);
  expect(document.text).toContain('\n---\nFixed\n-->\n');
  await vi.advanceTimersByTimeAsync(1000);
  expect(thread.comments.map((comment) => [bodyOf(comment), comment.contextValue])).toEqual([
    ['The **text**.', noteContext],
    ['An answer.', noteContext],
    ['Fixed', noteContext],
  ]);
  // A refused answer that the user cancels goes away.
  await run(noteCommands.answer, { thread, text: 'Bad <!-- again' });
  await vi.advanceTimersByTimeAsync(300);
  await run(noteCommands.cancelEdit, thread.comments[3]);
  expect(thread.comments).toHaveLength(3);
});

test('Delete removes an answer, the last answer removes the note, and Delete Thread removes the note with its answers (R-EDIT-004)', async () => {
  const document = fake.open(note);
  await fake.activate();
  const [thread] = fake.live();
  await run(noteCommands.deleteAnswer, thread.comments[0]);
  expect(document.text).toBe('# Title\n\n<!-- note\n---\nauthor: bob\ndate: 2026-10-28T11:00+01:00\n---\nAn answer.\n-->\n\nMore.\n');
  expect(fake.live()).toEqual([thread]);
  expect(thread.comments.map((comment) => comment.author.name)).toEqual(['bob']);
  await run(noteCommands.deleteAnswer, thread.comments[0]);
  expect(document.text).toBe('# Title\n\nMore.\n');
  expect(fake.live()).toEqual([]);
  const other = fake.open(note, '/folder/b.md');
  fake.fire('open', other);
  await run(noteCommands.deleteNote, fake.live()[0]);
  expect(other.text).toBe('# Title\n\nMore.\n');
  expect(fake.live()).toEqual([]);
});

test('after a change of a document and a pause, the threads follow their notes', async () => {
  const document = fake.open(note);
  await fake.activate();
  const [thread] = fake.live();
  document.text = `Intro.\n\n${note}<!-- note\nSecond\n-->\n`;
  document.version++;
  fake.fire('change', { document });
  // The notes are read again only after the pause.
  expect(fake.live()).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(300);
  expect(fake.live()).toHaveLength(2);
  expect(fake.live()[0]).toBe(thread);
  expect(thread.range).toEqual(new FakeRange(4, 0, 15, 3));
  expect(bodyOf(fake.live()[1].comments[0])).toBe('Second');
  // A closed document loses its threads.
  fake.fire('close', document);
  expect(fake.live()).toEqual([]);
});

test('a note that holds the start of another comment gets a warning (R-NOTE-003)', async () => {
  const document = fake.open('<!-- note\nA <!-- b\n-->\n');
  await fake.activate();
  expect(fake.diagnostics.get(document.uri.toString())).toMatchObject([{ range: new FakeRange(0, 0, 2, 3), severity: 1, source: 'Markdown Notes' }]);
});

test('the editor folds each note on lines of its own into the line before it, and no note in the text of a line (R-TEXT-005)', async () => {
  const document = fake.open(`${note}\nA sentence <!-- note inline\nInline\n--> end.\n`);
  await fake.activate();
  // The heading keeps the fold of the Markdown extension, so the fold of the note starts on the blank line after it,
  // and takes the blank line after the note, so that one blank line stays between the heading and the text.
  expect(fake.folding.get('markdown')?.provideFoldingRanges(document)).toEqual([new FakeFoldingRange(1, 14, 1)]);
});
