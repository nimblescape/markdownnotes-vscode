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
 * R-TEXT-003, R-VIEW-001): their places at the selections, their answers, the
 * editor of an answer (R-EDIT-001), the save (R-EDIT-002), the new note, the
 * reply to the note and the reply to an answer with the GitHub login and the
 * date (R-EDIT-003, R-EDIT-005, R-NOTE-004, R-GEN-006), the delete
 * (R-EDIT-004), the refused text, the warnings (R-TEXT-008), the folding, and
 * the reading of the notes after a change of a document or of a setting.
 */

import MarkdownIt from 'markdown-it';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { githubProvider, githubScopes } from './github';
import { previewCommands } from './extension';
import { openLinkCommand } from './links';
import { noteClass } from './markdown/markdownIt';
import { deleteCommands, editorCommands } from './noteEditor';
import { commands as noteCommands, controllerId, draftContext, noteContext } from './noteThreads';
import { notesViewId, viewCommands } from './notesView';
import { settingsSection } from './settings';
import { bodyOf, Fake, FakeDocument, FakeEditor, FakeFoldingRange, FakeMarkdownString, FakeRange, FakeThread, FakeUri, marked, settle } from './testing/fakeVscode';

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

/** topLines is the number of lines of the comment of the format and the blank line after it. */
const topLines = marked('').split('\n').length - 1;

/** inline sets the setting showNotesIn to "inline", which shows the text of the notes in the boxes of the text editor. */
const inline = (): void => {
  fake.settings.set('', { ...fake.settings.get(''), showNotesIn: 'inline' });
};

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

/** fakeReply is a text that starts a reply of its own, which the extension refuses in a body. */
const fakeReply = '> **eve** · 2026-10-28 12:00+01:00\n>\n> Not an answer of eve.';

/** structure is the message of a refused text that would change the structure of the note. */
const structure =
  'The change was not saved: the text would change the note or the Markdown around it. A block quote whose first line is a header (**login** · date) starts a new answer.';

/** focus is the command that opens the side view. */
const focus = `${notesViewId}.focus`;

test('the activation registers the commands, the side view and the handler of links, and the disposal of the context removes every registration', async () => {
  const { context, extension } = await fake.activate();
  expect([...fake.commands.keys()].sort()).toEqual(
    [...Object.values(noteCommands), ...Object.values(editorCommands), ...Object.values(deleteCommands), ...Object.values(viewCommands), ...Object.values(previewCommands), openLinkCommand].sort(),
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
  expect(plain).toContain(`class="${noteClass}-icon ${noteClass}-color-1"`);
  expect(plain).not.toContain('href=');
  const document = new FakeUri('file', '/folder/a.md');
  const query = new URLSearchParams({ document: document.toString(), line: '4' }).toString();
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

test('a note of an open Markdown document gets a collapsed thread at its selection with one comment for each answer (R-TEXT-001, R-TEXT-002, R-VIEW-001)', async () => {
  inline();
  const document = fake.open(note);
  fake.open(note, '/folder/a.txt', { languageId: 'plaintext' });
  const old = fake.open(note, '/folder/a.md', { scheme: 'git' });
  await fake.activate();
  expect(fake.live()).toHaveLength(1);
  const [thread] = fake.live();
  expect(thread.uri).toBe(document.uri);
  // Without a start marker, the selection starts at the start of the paragraph and ends at the reference.
  expect(thread.range).toEqual(new FakeRange(2, 0, 2, 8));
  expect(thread).toMatchObject({ canReply: true, contextValue: noteContext, collapsibleState: 0, label: 'Markdown note' });
  expect(thread.comments.map((comment) => [comment.author.name, comment.timestamp?.toISOString(), bodyOf(comment), comment.mode, comment.contextValue, comment.label])).toEqual([
    ['ann', '2026-10-28T09:15:00.000Z', 'The **text**.', 1, noteContext, undefined],
    ['bob', '2026-10-28T10:00:00.000Z', 'An answer.', 1, noteContext, undefined],
  ]);
  expect(thread.comments[0].body).toMatchObject({ supportHtml: true, baseUri: document.uri });
  // The `+` of a new note is at every line of a document that can have notes.
  expect(fake.controller?.commentingRangeProvider?.provideCommentingRanges(document)).toEqual([new FakeRange(0, 0, 13, 0)]);
  expect(fake.controller?.commentingRangeProvider?.provideCommentingRanges(old)).toEqual([]);
});

test('Reply opens an editor of a reply to an answer, which Save writes into its block quote, and the box labels a reply to a reply (R-NOTE-004, R-EDIT-005)', async () => {
  inline();
  vi.setSystemTime(new Date(2026, 9, 28, 10, 15));
  const document = fake.open(note);
  fake.login = 'carl';
  await fake.activate();
  const [thread] = fake.live();
  await run(noteCommands.replyToAnswer, thread.comments[1]);
  expect(thread.comments).toHaveLength(3);
  const draft = thread.comments[2];
  expect(draft).toMatchObject({ mode: 0, contextValue: draftContext, label: 'Reply to bob' });
  expect(thread.collapsibleState).toBe(1);
  draft.body = new FakeMarkdownString('Thanks.\n\nSee you.');
  await run(noteCommands.saveAnswer, draft);
  // The first change of the extension writes the comment of the format at the top of the file (R-NOTE-007).
  expect(document.text).toBe(
    marked(note.replace('    > An answer.\n', '    > An answer.\n    >\n    > > **carl** · 2026-10-28 10:15+01:00\n    > >\n    > > Thanks.\n    > >\n    > > See you.\n')),
  );
  await vi.advanceTimersByTimeAsync(1000);
  expect(fake.live()).toEqual([thread]);
  expect(thread.comments.map((comment) => [comment.author.name, comment.label, bodyOf(comment), comment.contextValue])).toEqual([
    ['ann', undefined, 'The **text**.', noteContext],
    ['bob', undefined, 'An answer.', noteContext],
    ['carl', 'Reply to bob', 'Thanks.\n\nSee you.', noteContext],
  ]);
  // Cancel removes the editor of a reply.
  await run(noteCommands.replyToAnswer, thread.comments[0]);
  expect(thread.comments[3].label).toBe('Reply to ann');
  await run(noteCommands.cancelEdit, thread.comments[3]);
  expect(thread.comments).toHaveLength(3);
});

test('the text editor dims the source of each note (R-TEXT-003)', async () => {
  inline();
  const document = fake.open(note);
  const editor = new FakeEditor(document);
  fake.editors.push(editor);
  await fake.activate();
  const [[type, ranges]] = [...editor.decorations];
  expect(type).toMatchObject({ options: { opacity: '0.55' } });
  expect(ranges).toEqual([new FakeRange(4, 0, 10, 16)]);
  // An editor that shows later gets the decoration too; a document of Git has none.
  const short = 'Text[^note-bbbb].\n\n[^note-bbbb]: **ann** · 2026-10-28 10:15+01:00\n';
  const other = new FakeEditor(fake.open(short, '/folder/b.md'));
  const old = new FakeEditor(fake.open(note, '/folder/a.md', { scheme: 'git' }));
  fake.fire('visibleEditors', [other, old]);
  expect(other.decorations.get(type)).toEqual([new FakeRange(2, 0, 2, short.split('\n')[2].length)]);
  expect(old.decorations.get(type)).toEqual([]);
  await run(noteCommands.deleteNote, fake.live()[0]);
  expect(editor.decorations.get(type)).toEqual([]);
});

test('the setting expandInEditor opens the boxes, and a change of a setting builds the threads anew and refreshes the previews', async () => {
  inline();
  fake.open(note);
  await fake.activate();
  expect(fake.live()[0].collapsibleState).toBe(0);
  fake.settings.set('', { ...fake.settings.get(''), expandInEditor: true });
  fake.fire('configuration', { affectsConfiguration: (section: string) => section === settingsSection });
  expect(fake.live()).toHaveLength(1);
  expect(fake.live()[0].collapsibleState).toBe(1);
  expect(fake.executed).toEqual(['markdown.preview.refresh']);
  // A change of another setting changes nothing.
  fake.fire('configuration', { affectsConfiguration: () => false });
  expect(fake.executed).toHaveLength(1);
});

test('Edit opens the editor of an answer, and Save writes the text into the answer in the note with the date of the save (R-EDIT-001, R-EDIT-002)', async () => {
  inline();
  vi.setSystemTime(new Date(2026, 9, 28, 12, 30));
  const document = fake.open(note);
  await fake.activate();
  const [thread] = fake.live();
  const comment = thread.comments[1];
  await run(noteCommands.editAnswer, comment);
  expect(comment.mode).toBe(0);
  // VS Code sets the body to the text of the editor before the button runs.
  comment.body = new FakeMarkdownString('A new *answer*.\n\nWith a second paragraph.\n');
  await run(noteCommands.saveAnswer, comment);
  // A changed text gets the date of the save; the author stays (Hannes, 2026-10-28).
  expect(document.text).toBe(
    marked(note.replace('    > **bob** · 2026-10-28 11:00+01:00\n    >\n    > An answer.\n', '    > **bob** · 2026-10-28 12:30+01:00\n    >\n    > A new *answer*.\n    >\n    > With a second paragraph.\n')),
  );
  expect(fake.errors).toEqual([]);
  // The thread stays, with the saved text, in the preview mode, below the comment of the format.
  await vi.advanceTimersByTimeAsync(1000);
  expect(fake.live()).toEqual([thread]);
  expect(thread.range).toEqual(new FakeRange(2 + topLines, 0, 2 + topLines, 8));
  expect(thread.comments.map(bodyOf)).toEqual(['The **text**.', 'A new *answer*.\n\nWith a second paragraph.']);
  expect(thread.comments.map((other) => other.mode)).toEqual([1, 1]);
});

test('Save keeps the line breaks of a document with CRLF', async () => {
  inline();
  vi.setSystemTime(new Date(2026, 9, 28, 12, 30));
  const header = '[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00';
  const document = new FakeDocument(new FakeUri('file', '/folder/crlf.md'), `Text[^note-aaaa]\r\n\r\n${header}\r\n\r\n    Old\r\n`, 'markdown', 2);
  fake.documents.push(document);
  await fake.activate();
  const comment = fake.live()[0].comments[0];
  comment.body = new FakeMarkdownString('One\n\nTwo');
  await run(noteCommands.saveAnswer, comment);
  expect(document.text).toBe(marked(`Text[^note-aaaa]\r\n\r\n${header.replace('10:15', '12:30')}\r\n\r\n    One\r\n\r\n    Two\r\n`, '\r\n'));
});

test('Save refuses a text that would start another answer, shows why and opens the editor with the text again (R-EDIT-002)', async () => {
  inline();
  const document = fake.open(note);
  await fake.activate();
  const comment = fake.live()[0].comments[0];
  await run(noteCommands.editAnswer, comment);
  comment.body = new FakeMarkdownString(fakeReply);
  await run(noteCommands.saveAnswer, comment);
  expect(document.text).toBe(note);
  expect(fake.errors).toEqual([structure]);
  expect(comment.mode).toBe(1);
  await vi.advanceTimersByTimeAsync(300);
  expect(comment.mode).toBe(0);
  expect(bodyOf(fake.live()[0].comments[0])).toBe(fakeReply);
});

test('a file whose comment of the format names a newer version keeps its notes as they are and shows why (R-NOTE-007)', async () => {
  inline();
  const newer = `<!-- nimblescape-markdown-notes format=2 spec=https://example.com/format.md\n-->\n\n${note}`;
  const document = fake.open(newer);
  fake.signIn = 'hannes';
  await fake.activate();
  const [thread] = fake.live();
  const comment = thread.comments[0];
  comment.body = new FakeMarkdownString('A new text.');
  await run(noteCommands.saveAnswer, comment);
  await run(noteCommands.deleteNote, thread);
  await run(noteCommands.addNote, { thread: new FakeThread(fake, document.uri, new FakeRange(15, 0, 15, 4), []), text: 'A note.' });
  expect(document.text).toBe(newer);
  const message = 'The change was not saved: the file uses version 2 of the format of the notes, and this version of the extension knows only version 1. Update the extension.';
  expect(fake.errors).toEqual([message, message, message]);
});

test('Cancel closes the editor and shows the answer as the document holds it', async () => {
  inline();
  fake.open(note);
  await fake.activate();
  const comment = fake.live()[0].comments[0];
  await run(noteCommands.editAnswer, comment);
  comment.body = new FakeMarkdownString('Not saved');
  await run(noteCommands.cancelEdit, comment);
  expect(comment.mode).toBe(1);
  expect(bodyOf(fake.live()[0].comments[0])).toBe('The **text**.');
});

test('Add Note signs in with GitHub and writes a new note for the selection with the login and the date after the paragraph (R-EDIT-003, R-GEN-006, R-NOTE-006)', async () => {
  inline();
  vi.setSystemTime(new Date(2026, 9, 28, 10, 15));
  const document = fake.open('# Title\n\nFirst line\nsecond line\n\nLast.\n');
  fake.signIn = 'hannes';
  await fake.activate();
  // VS Code creates the thread of the `+` at the selected word, without comments.
  const thread = new FakeThread(fake, document.uri, new FakeRange(2, 6, 2, 10), []);
  await run(noteCommands.addNote, { thread, text: 'A **new** note.' });
  expect(fake.sessions).toEqual([{ provider: githubProvider, scopes: githubScopes, options: { createIfNone: true } }]);
  expect(document.text.startsWith(marked(''))).toBe(true);
  expect(document.text.slice(marked('').length)).toMatch(
    /^# Title\n\nFirst <!--\[(note-[a-z0-9]{4})-->line\[\^\1\]\nsecond line\n\n\[\^\1\]: \*\*hannes\*\* · 2026-10-28 10:15\+01:00\n\n {4}A \*\*new\*\* note\.\n\nLast\.\n$/,
  );
  // The thread of the `+` becomes the thread of the note, at its selection after the start marker.
  await vi.advanceTimersByTimeAsync(1000);
  expect(fake.live()).toEqual([thread]);
  expect(thread).toMatchObject({ canReply: true, contextValue: noteContext, collapsibleState: 1, range: new FakeRange(2 + topLines, 23, 2 + topLines, 27) });
  expect(thread.comments).toHaveLength(1);
  expect(thread.comments[0]).toMatchObject({ author: { name: 'hannes' }, mode: 1, contextValue: noteContext });
  expect(bodyOf(thread.comments[0])).toBe('A **new** note.');
});

test('Add Note without a GitHub sign-in or with a refused text keeps the text in an editor of the box, which Save writes after a fix', async () => {
  inline();
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
  draft.body = new FakeMarkdownString(fakeReply);
  await run(noteCommands.saveAnswer, draft);
  expect(document.text).toBe('Text\n');
  expect(fake.errors).toEqual([expect.any(String), structure]);
  await vi.advanceTimersByTimeAsync(300);
  expect(thread.comments).toEqual([draft]);
  draft.body = new FakeMarkdownString('Good text');
  await run(noteCommands.saveAnswer, draft);
  // An empty range in a paragraph is a point at the end of the text of its line.
  expect(document.text.slice(marked('').length)).toMatch(/^Text<!--\[(note-[a-z0-9]{4})-->\[\^\1\]\n\n\[\^\1\]: \*\*hannes\*\* · .*\n\n {4}Good text\n$/);
  await vi.advanceTimersByTimeAsync(1000);
  expect(fake.live()).toEqual([thread]);
  expect(thread.comments.map((comment) => comment.contextValue)).toEqual([noteContext]);
});

test('Cancel of a new note removes its box', async () => {
  inline();
  const document = fake.open('Text\n');
  await fake.activate();
  const thread = new FakeThread(fake, document.uri, new FakeRange(0, 0, 0, 0), []);
  await run(noteCommands.discardNewNote, { thread, text: '' });
  expect(thread.disposed).toBe(true);
});

test('Answer adds a reply of the signed-in user to the note, after the replies to the note (R-EDIT-005, R-GEN-006)', async () => {
  inline();
  vi.setSystemTime(new Date(2026, 9, 28, 10, 15));
  const document = fake.open(note);
  fake.login = 'carl';
  await fake.activate();
  const [thread] = fake.live();
  await run(noteCommands.answer, { thread, text: 'A third answer.' });
  expect(document.text).toBe(marked(note.replace('    > An answer.\n', '    > An answer.\n\n    > **carl** · 2026-10-28 10:15+01:00\n    >\n    > A third answer.\n')));
  await vi.advanceTimersByTimeAsync(1000);
  expect(fake.live()).toEqual([thread]);
  expect(thread.comments.map((comment) => [comment.author.name, comment.label, bodyOf(comment)])).toEqual([
    ['ann', undefined, 'The **text**.'],
    ['bob', undefined, 'An answer.'],
    ['carl', undefined, 'A third answer.'],
  ]);
});

test('a refused answer stays in an editor at the end of the thread, which Save writes after a fix and Cancel removes', async () => {
  inline();
  const document = fake.open(note);
  fake.login = 'carl';
  await fake.activate();
  const [thread] = fake.live();
  await run(noteCommands.answer, { thread, text: fakeReply });
  expect(document.text).toBe(note);
  expect(fake.errors).toEqual([structure]);
  await vi.advanceTimersByTimeAsync(300);
  expect(thread.comments).toHaveLength(3);
  const draft = thread.comments[2];
  expect(draft).toMatchObject({ mode: 0, contextValue: draftContext });
  expect(bodyOf(draft)).toBe(fakeReply);
  draft.body = new FakeMarkdownString('Fixed');
  await run(noteCommands.saveAnswer, draft);
  expect(document.text).toContain('    > **carl** · ');
  expect(document.text).toContain('    > Fixed\n\nMore.\n');
  await vi.advanceTimersByTimeAsync(1000);
  expect(thread.comments.map((comment) => [bodyOf(comment), comment.contextValue])).toEqual([
    ['The **text**.', noteContext],
    ['An answer.', noteContext],
    ['Fixed', noteContext],
  ]);
  // A refused answer that the user cancels goes away.
  await run(noteCommands.answer, { thread, text: fakeReply });
  await vi.advanceTimersByTimeAsync(300);
  await run(noteCommands.cancelEdit, thread.comments[3]);
  expect(thread.comments).toHaveLength(3);
});

test('Delete removes an answer, the last answer removes the note, and Delete Thread removes the note with its answers (R-EDIT-004)', async () => {
  inline();
  const document = fake.open(note);
  await fake.activate();
  const [thread] = fake.live();
  // The reply of bob becomes the first answer.
  await run(noteCommands.deleteAnswer, thread.comments[0]);
  expect(document.text).toBe(marked('# Title\n\nThe text[^note-aaaa] of the page.\n\n[^note-aaaa]: **bob** · 2026-10-28 11:00+01:00\n\n    An answer.\n\nMore.\n'));
  expect(fake.live()).toEqual([thread]);
  expect(thread.comments.map((comment) => comment.author.name)).toEqual(['bob']);
  // The last note takes the comment of the format with it.
  await run(noteCommands.deleteAnswer, thread.comments[0]);
  expect(document.text).toBe('# Title\n\nThe text of the page.\n\nMore.\n');
  expect(fake.live()).toEqual([]);
  const other = fake.open(note, '/folder/b.md');
  fake.fire('open', other);
  await run(noteCommands.deleteNote, fake.live()[0]);
  expect(other.text).toBe('# Title\n\nThe text of the page.\n\nMore.\n');
  expect(fake.live()).toEqual([]);
});

test('after a change of a document and a pause, the threads follow their notes', async () => {
  inline();
  const document = fake.open(note);
  await fake.activate();
  const [thread] = fake.live();
  document.text = `Intro.\n\n${note}\nSecond[^note-bbbb].\n\n[^note-bbbb]: **ann** · 2026-10-28 10:15+01:00\n\n    Second\n`;
  document.version++;
  fake.fire('change', { document });
  // The notes are read again only after the pause.
  expect(fake.live()).toHaveLength(1);
  await vi.advanceTimersByTimeAsync(300);
  expect(fake.live()).toHaveLength(2);
  expect(fake.live()[0]).toBe(thread);
  expect(thread.range).toEqual(new FakeRange(4, 0, 4, 8));
  expect(bodyOf(fake.live()[1].comments[0])).toBe('Second');
  // A closed document loses its threads.
  fake.fire('close', document);
  expect(fake.live()).toEqual([]);
});

test('the warnings of the notes show as diagnostics, warnings and hints (R-TEXT-008)', async () => {
  const header = '**ann** · 2026-10-28 10:15+01:00';
  const document = fake.open(`# Plan[^note-bbbb]\n\nText[^note-aaaa] and [^note-zzzz].\n\n[^note-aaaa]: ${header}\n\n[^note-bbbb]: ${header}\n`);
  await fake.activate();
  expect(fake.diagnostics.get(document.uri.toString())).toMatchObject([
    { range: new FakeRange(0, 6, 0, 18), severity: 2, source: 'Markdown Notes', message: expect.stringMatching(/^A reference in a heading/) },
    { range: new FakeRange(2, 21, 2, 33), severity: 1, source: 'Markdown Notes', message: expect.stringMatching(/^The file has no note note-zzzz/) },
  ]);
});

test('the editor folds each note into the line of text before it (R-TEXT-005)', async () => {
  const document = fake.open(note);
  await fake.activate();
  expect(fake.folding.get('markdown')?.provideFoldingRanges(document)).toEqual([new FakeFoldingRange(2, 10, 1)]);
});

/** linked is a text with a note whose answer has a link to a file, a web link, and a link in a code span. */
const linked = [
  'The text[^note-aaaa] of the page.',
  '',
  '[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00',
  '',
  '    See [the table (p. 3)](../literatur/a%20b.pdf), [web](https://example.com) and `[x](c.pdf)`.',
  '',
].join('\n');

/** newWindow is the command that moves the active editor into a new window of VS Code. */
const newWindow = 'workbench.action.moveEditorToNewWindow';

test('a link to a file in a box runs the command that opens it after the setting openLinksIn, and the editor of the box shows the text as the document holds it (R-GEN-010)', async () => {
  inline();
  const document = fake.open(linked);
  fake.files.set('/literatur/a b.pdf', '%PDF');
  await fake.activate();
  const comment = fake.live()[0].comments[0];
  const args = encodeURIComponent(JSON.stringify(['../literatur/a%20b.pdf', document.uri.toString()])).replace(/\(/g, '%28').replace(/\)/g, '%29');
  expect(bodyOf(comment)).toBe(`See [the table (p. 3)](command:${openLinkCommand}?${args}), [web](https://example.com) and \`[x](c.pdf)\`.`);
  expect((comment.body as FakeMarkdownString).isTrusted).toEqual({ enabledCommands: [openLinkCommand] });
  // The editor of the box shows the text of the document, and the box shows the links again after Cancel.
  await run(noteCommands.editAnswer, comment);
  expect(bodyOf(comment)).toBe('See [the table (p. 3)](../literatur/a%20b.pdf), [web](https://example.com) and `[x](c.pdf)`.');
  await run(noteCommands.cancelEdit, comment);
  expect(bodyOf(fake.live()[0].comments[0])).toContain(`(command:${openLinkCommand}?`);
  // The command opens the file in a new window of VS Code.
  fake.calls.length = 0;
  await run(openLinkCommand, ...JSON.parse(decodeURIComponent(args)));
  expect(fake.calls.map(({ command, args: [uri] }) => [command, (uri as FakeUri | undefined)?.path])).toEqual([
    ['vscode.open', '/literatur/a b.pdf'],
    [newWindow, undefined],
  ]);
});

test('a link to a file in a callout of the preview opens through the handler of links of the extension, for an open Markdown document only (R-GEN-010)', async () => {
  const document = fake.open(linked);
  fake.files.set('/literatur/a b.pdf', '%PDF');
  const { api, extension } = await fake.activate();
  const md = api.extendMarkdownIt(new MarkdownIt({ html: true }));
  const html = md.render(linked, { currentDocument: document.uri });
  const query = new URLSearchParams({ document: document.uri.toString(), href: '../literatur/a%20b.pdf' }).toString();
  expect(html).toContain(`href="vscode://${extension.extensionId}${extension.linkPath}?${query.replace(/&/g, '&amp;')}"`);
  expect(html).toContain('href="https://example.com"');
  fake.calls.length = 0;
  await fake.uriHandler!.handleUri(FakeUri.parse(`vscode://${extension.extensionId}${extension.linkPath}?${query}`));
  await settle();
  expect(fake.calls.map(({ command }) => command)).toEqual(['vscode.open', newWindow]);
  // A link of a document that is not open opens nothing.
  const other = new URLSearchParams({ document: 'file:///folder/b.md', href: '../literatur/a%20b.pdf' }).toString();
  await fake.uriHandler!.handleUri(FakeUri.parse(`vscode://${extension.extensionId}${extension.linkPath}?${other}`));
  await settle();
  expect(fake.calls).toHaveLength(2);
});

test('the default setting showNotesIn "sideView" shows no boxes and no + in the text editor, and the side view shows the notes (R-GEN-009)', async () => {
  const document = fake.open(note);
  fake.activeEditor = new FakeEditor(document);
  fake.editors.push(fake.activeEditor);
  await fake.activate();
  expect(fake.live()).toEqual([]);
  expect(fake.controller?.commentingRangeProvider?.provideCommentingRanges(document)).toEqual([]);
  const view = fake.resolveView(notesViewId);
  await view.send({ type: 'ready' });
  await settle();
  expect(view.state().threads).toHaveLength(1);
  // A change of the setting to "inline" shows the boxes and the +.
  fake.settings.set('', { showNotesIn: 'inline' });
  fake.fire('configuration', { affectsConfiguration: (name: string) => name.startsWith(settingsSection) });
  expect(fake.live()).toHaveLength(1);
  expect(fake.controller?.commentingRangeProvider?.provideCommentingRanges(document)).toEqual([new FakeRange(0, 0, 13, 0)]);
});

test('with the setting showNotesIn "inline", a link of an icon of the preview opens the box of its note in the text editor and not the side view (R-GEN-009)', async () => {
  fake.settings.set('', { showNotesIn: 'inline' });
  const document = fake.open(note);
  const { extension } = await fake.activate();
  const query = new URLSearchParams({ document: document.uri.toString(), line: '4' }).toString();
  await fake.uriHandler!.handleUri(FakeUri.parse(`vscode://${extension.extensionId}${extension.openPath}?${query}`));
  await settle();
  expect(fake.executed).not.toContain(focus);
  expect(fake.shown.map((shown) => shown.document)).toEqual([document]);
  expect(fake.live()[0].collapsibleState).toBe(1);
});
