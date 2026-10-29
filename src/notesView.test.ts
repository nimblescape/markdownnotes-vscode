// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests run the side view "Notes" with a fake of the API of VS Code
 * ([src/testing/fakeVscode.ts](testing/fakeVscode.ts)), as its script sends
 * the actions of the user (R-SIDE-001 to R-SIDE-003): the page and its
 * policy, the threads of the active Markdown file with the rendered answers
 * and their tree (R-NOTE-004), the thread at the cursor, the save, the reply
 * to the note and to an answer, the new note for the selected text in a
 * color, the color and the text view of a note, the delete, the preview of a
 * text, the GitHub sign-in (R-GEN-006), the reveal of a note in the text
 * editor, the list that does not follow the scrolling of the text editor
 * (decision 25), and the links. The tests run in the zone Europe/Vienna (vitest.config.mts),
 * which is UTC+01:00 on 2026-10-28.
 */

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { githubProvider } from './github';
import { addPath, extensionId } from './extension';
import { markdownModes, notesViewId, previewTextMissing, viewCommands } from './notesView';
import { Fake, FakeEditor, FakePosition, FakeRange, FakeSelection, FakeTabInputText, FakeUri, type FakeView, marked, settle } from './testing/fakeVscode';

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

/**
 * linkCalls returns the commands that the links ran, without the folds that the overlay of the text editor runs, the
 * context keys and the refresh of the previews.
 */
const linkCalls = () => fake.calls.filter(({ command }) => !command.startsWith('editor.') && command !== 'setContext' && command !== 'markdown.preview.refresh');

/** newWindow is the command that moves the active editor into a new window of VS Code. */
const newWindow = 'workbench.action.moveEditorToNewWindow';

/** openedLinks returns the commands that the links ran, with the path and the position of each opened file. */
const openedLinks = () =>
  linkCalls().map(({ command, args }) =>
    command === newWindow ? [command] : [command, (args[0] as FakeUri).path, ...(command === 'vscode.open' ? [(args[1] as { selection?: FakeRange }).selection?.start] : [])],
  );

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

test('the view shows the threads of the active Markdown file with the rendered answers and their tree, and the account without asking for a sign-in', async () => {
  fake.login = 'hannes';
  const { view } = await start(`${note}\nA second[^note-bbbb] note.\n\n[^note-bbbb]: **bob** · 2026-10-28 09:00-02:00\n\n    Second.\n`, 13);
  expect(view.state()).toEqual({
    type: 'state',
    file: 'a.md',
    line: 13,
    highlight: undefined,
    account: 'hannes',
    selected: undefined,
    threads: [
      {
        id: '1',
        line: 4,
        color: '#1a7fe0',
        colorName: 'blue',
        text: '[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00\n\n    The **text**.\n\n    > **bob** · 2026-10-28 11:00+01:00\n    >\n    > An answer.',
        answers: [
          {
            author: 'ann',
            date: '2026-10-28 10:15',
            authorDate: '2026-10-28 10:15 at the author (UTC+01:00)',
            written: '2026-10-28 10:15+01:00',
            body: 'The **text**.',
            html: '<p>The <strong>text</strong>.</p>\n',
            depth: 0,
            parent: undefined,
          },
          { author: 'bob', date: '2026-10-28 11:00', authorDate: '2026-10-28 11:00 at the author (UTC+01:00)', written: '2026-10-28 11:00+01:00', body: 'An answer.', html: '<p>An answer.</p>\n', depth: 1, parent: 0 },
        ],
      },
      // The date of another zone shows in the local time of the reader, and the time of the author as authorDate.
      {
        id: '2',
        line: 16,
        // Every note has the same color until the user chooses another one (Hannes, 2026-10-28 20:03).
        color: '#1a7fe0',
        colorName: 'blue',
        text: '[^note-bbbb]: **bob** · 2026-10-28 09:00-02:00\n\n    Second.',
        answers: [{ author: 'bob', date: '2026-10-28 12:00', authorDate: '2026-10-28 09:00 at the author (UTC−02:00)', written: '2026-10-28 09:00-02:00', body: 'Second.', html: '<p>Second.</p>\n', depth: 0, parent: undefined }],
      },
    ],
    colors: [
      { name: 'blue', color: '#1a7fe0' },
      { name: 'green', color: '#2e8b3e' },
      { name: 'orange', color: '#c7731a' },
      { name: 'purple', color: '#8a4fc0' },
      { name: 'red', color: '#d33b3b' },
      { name: 'teal', color: '#138a8a' },
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
  // The cursor that leaves the note deselects it (Hannes, 2026-10-29), and a move outside the notes tells the script the
  // line, and the selected text that a new note would highlight: none without a selection.
  editor.selection = { active: new FakePosition(12, 0) };
  fake.fire('selection', { textEditor: editor });
  await settle();
  expect(view.state().selected).toBeUndefined();
  editor.selection = { active: new FakePosition(11, 0) };
  fake.fire('selection', { textEditor: editor });
  await settle();
  expect(view.messages.filter((message) => message.type === 'line').at(-1)).toEqual({ type: 'line', line: 11, highlight: undefined });
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

test('a click on a thread whose selection starts on the line where the selection of the note before it ends selects this thread and not the one before it (R-SIDE-002, R-SIDE-007)', async () => {
  const header = '**ann** · 2026-10-28 10:15+01:00';
  const text = `Work (<!--[note-aaaa-->Hong et al.,\n2024[^note-aaaa]; <!--[note-bbbb-->Shao et al., 2025[^note-bbbb]).\n\n[^note-aaaa]: ${header}\n\n    A\n\n[^note-bbbb]: ${header}\n\n    B\n`;
  const { editor, view } = await start(text, 9);
  const [, second] = view.state().threads;
  await send(view, { type: 'reveal', id: second.id, focus: false });
  // VS Code puts the cursor at the start of the selection of the second note, on the last line of the first selection.
  const { selection } = fake.shown.at(-1)!.options as { selection: FakeRange };
  expect(selection.start).toEqual(new FakePosition(1, 35));
  editor.selection = { active: selection.start };
  fake.fire('selection', { textEditor: editor });
  await settle();
  expect(view.state().selected).toBe(second.id);
  // The cursor in the first selection selects the first note.
  editor.selection = { active: new FakePosition(1, 2) };
  fake.fire('selection', { textEditor: editor });
  await settle();
  expect(view.state().selected).toBe(view.state().threads[0].id);
});

test('Save writes an answer and a refused text returns its message (R-SIDE-003, R-EDIT-002)', async () => {
  const { document, view } = await start();
  await send(view, { type: 'save', request: 1, id: '1', answer: { index: 1, author: 'bob', date: '2026-10-28 11:00+01:00', body: 'An answer.' }, text: 'A **changed** answer.' });
  // The changed answer has the date of the save.
  expect(document.text).toContain('    > **bob** · 2026-10-28 10:15+01:00\n    >\n    > A **changed** answer.\n\nMore.');
  expect(results(view)).toEqual([{ type: 'result', request: 1, message: undefined }]);
  expect(view.state().threads[0].answers[1].body).toBe('A **changed** answer.');
  await send(view, { type: 'save', request: 2, id: '1', answer: { index: 0, author: 'ann', date: '2026-10-28 10:15+01:00', body: 'The **text**.' }, text: '> **eve** · 2026-10-28 12:00+01:00\n>\n> Not an answer of eve.' });
  expect(results(view)[1]).toEqual({ type: 'result', request: 2, message: expect.stringContaining('starts a new answer') });
  await send(view, { type: 'save', request: 3, id: '9', answer: { index: 0, author: 'ann', date: '2026-10-28 10:15+01:00', body: 'The **text**.' }, text: 'Text' });
  expect(results(view)[2]).toEqual({ type: 'result', request: 3, message: 'The change was not saved: the file no longer holds the note.' });
});

test('Answer, Reply and Add Note need the GitHub sign-in, and write the login and the date (R-EDIT-003, R-EDIT-005, R-NOTE-004, R-GEN-006)', async () => {
  const { document, editor, view } = await start(note, 12);
  await send(view, { type: 'answer', request: 1, id: '1', text: 'A third answer.' });
  expect(results(view)[0]).toEqual({ type: 'result', request: 1, message: expect.stringMatching(/^The change was not saved: sign in with GitHub/) });
  expect(document.text).toBe(note);
  fake.signIn = 'carl';
  // Add Note needs selected text (Hannes, 2026-10-28: "there shall be no way to add a note without highlighting text").
  await send(view, { type: 'add', request: 2, text: 'A new note.' });
  expect(results(view)[1]).toEqual({ type: 'result', request: 2, message: expect.stringMatching(/^The note was not added: select the text/) });
  expect(document.text).toBe(note);
  // Add Note adds a note that highlights the selected text, in the color of the editor of the new note, and selects it
  // (R-NOTE-006).
  editor.selection = { anchor: new FakePosition(12, 0), active: new FakePosition(12, 4) };
  fake.fire('selection', { textEditor: editor, kind: 2 });
  await settle();
  expect(view.messages.filter((message) => message.type === 'line').at(-1)).toEqual({ type: 'line', line: 12, highlight: 'More' });
  await send(view, { type: 'add', request: 3, text: 'A new note.', color: 'green' });
  expect(results(view)[2]).toEqual({ type: 'result', request: 3, message: undefined });
  expect(document.text).toMatch(/\n\n<wbr><!--\[(note-[a-z0-9]{4}) green-->More\[\^\1\]\.\n\n\[\^\1\]: \*\*carl\*\* · 2026-10-28 10:15\+01:00\n\n {4}A new note\.\n$/);
  let state = view.state();
  expect(state.threads).toHaveLength(2);
  expect(state.selected).toBe(state.threads[1].id);
  expect(state.threads[1]).toMatchObject({ colorName: 'green', color: '#2e8b3e' });
  expect(state.threads[1].answers[0]).toMatchObject({ author: 'carl', body: 'A new note.' });
  // Answer replies to the note, after the replies to the note.
  await send(view, { type: 'answer', request: 4, id: '1', text: 'A third answer.' });
  expect(results(view)[3]).toEqual({ type: 'result', request: 4, message: undefined });
  expect(document.text).toContain('    > An answer.\n\n    > **carl** · 2026-10-28 10:15+01:00\n    >\n    > A third answer.\n\n<wbr><!--[note-');
  // Reply replies to an answer, in its block quote after its body and its replies.
  await send(view, { type: 'answer', request: 5, id: '1', text: 'Thanks.', parent: { index: 1, author: 'bob', date: '2026-10-28 11:00+01:00', body: 'An answer.' } });
  expect(results(view)[4]).toEqual({ type: 'result', request: 5, message: undefined });
  expect(document.text).toContain('    > An answer.\n    >\n    > > **carl** · 2026-10-28 10:15+01:00\n    > >\n    > > Thanks.\n\n    > **carl** · ');
  state = view.state();
  expect(state.threads[0].answers.map((answer) => [answer.author, answer.depth, answer.parent, answer.body])).toEqual([
    ['ann', 0, undefined, 'The **text**.'],
    ['bob', 1, 0, 'An answer.'],
    ['carl', 2, 1, 'Thanks.'],
    ['carl', 1, 0, 'A third answer.'],
  ]);
});

test('Delete and Delete Thread remove an answer and a note, and a missing note shows a message (R-EDIT-004)', async () => {
  const { document, view } = await start();
  await send(view, { type: 'deleteAnswer', id: '1', answer: { index: 0, author: 'ann', date: '2026-10-28 10:15+01:00', body: 'The **text**.' } });
  expect(document.text).toBe(marked('# Title\n\nThe text[^note-aaaa] of the page.\n\n[^note-aaaa]: **bob** · 2026-10-28 11:00+01:00\n\n    An answer.\n\nMore.\n'));
  expect(view.state().threads[0].answers).toHaveLength(1);
  await send(view, { type: 'deleteNote', id: '1' });
  expect(document.text).toBe('# Title\n\nThe text of the page.\n\nMore.\n');
  expect(view.state().threads).toEqual([]);
  await send(view, { type: 'deleteNote', id: '1' });
  expect(fake.errors).toEqual(['The change was not saved: the file no longer holds the note.']);
});

/** three is a note of ann with the answers of bob (index 1) and of cid (index 2), from the code review of 2026-10-28. */
const three = note.replace('    > An answer.\n', '    > Answer of bob.\n\n    > **cid** · 2026-10-28 11:30+01:00\n    >\n    > Answer of cid.\n');

/** bobRef and cidRef name the answers of bob and of cid of three as the side view shows them. */
const bobRef = { index: 1, author: 'bob', date: '2026-10-28 11:00+01:00', body: 'Answer of bob.' };
const cidRef = { index: 2, author: 'cid', date: '2026-10-28 11:30+01:00', body: 'Answer of cid.' };

test('a second Delete of an answer from a view that shows an older state keeps the next answer (R-EDIT-004)', async () => {
  const { document, view } = await start(three);
  // A double click on "Delete" at the answer of bob sends the message twice, before the view shows the new state.
  await send(view, { type: 'deleteAnswer', id: '1', answer: bobRef });
  await send(view, { type: 'deleteAnswer', id: '1', answer: bobRef });
  expect(document.text).not.toContain('Answer of bob.');
  expect(document.text).toContain('Answer of cid.');
  expect(fake.errors).toEqual(['The change was not saved: the note changed in the meantime. Look at the note again, and repeat the change if it is still needed.']);
});

test('a second Delete keeps the next answer also when it has the same author and the same minute (R-EDIT-004)', async () => {
  const { document, view } = await start(three.replace('**cid** · 2026-10-28 11:30+01:00', '**bob** · 2026-10-28 11:00+01:00'));
  await send(view, { type: 'deleteAnswer', id: '1', answer: bobRef });
  await send(view, { type: 'deleteAnswer', id: '1', answer: bobRef });
  expect(document.text).not.toContain('Answer of bob.');
  expect(document.text).toContain('Answer of cid.');
  expect(fake.errors).toEqual(['The change was not saved: the note changed in the meantime. Look at the note again, and repeat the change if it is still needed.']);
});

test('Save, Reply and Save of the text view from a view that shows an older state change no other answer (R-EDIT-002, R-EDIT-005)', async () => {
  const { document, view } = await start(three);
  const original = view.state().threads[0].text;
  // The editor of the answer of bob is open; then the answer of bob goes, so that index 1 is the answer of cid.
  await send(view, { type: 'deleteAnswer', id: '1', answer: bobRef });
  const after = document.text;
  await send(view, { type: 'save', request: 1, id: '1', answer: bobRef, text: 'Edited text of bob' });
  fake.signIn = 'carl';
  await send(view, { type: 'answer', request: 2, id: '1', text: 'A reply to bob.', parent: bobRef });
  await send(view, { type: 'saveText', request: 3, id: '1', original, text: original.replace('The **text**.', 'Changed.') });
  expect(document.text).toBe(after);
  expect(results(view).map((result) => result.message)).toEqual([expect.stringMatching(/the note changed in the meantime/), expect.stringMatching(/the note changed in the meantime/), expect.stringMatching(/the note changed in the meantime/)]);
  // The answer of cid at its new index takes the change.
  await send(view, { type: 'save', request: 4, id: '1', answer: { ...cidRef, index: 1 }, text: 'Edited text of cid.' });
  expect(results(view)[3]).toEqual({ type: 'result', request: 4, message: undefined });
  expect(document.text).toContain('    > **cid** · 2026-10-28 10:15+01:00\n    >\n    > Edited text of cid.\n');
});

test('a change of a setting keeps the threads, so that the view keeps its selected note and its open editors', async () => {
  const { view } = await start(three);
  await send(view, { type: 'reveal', id: '1', focus: false });
  const before = view.state();
  await fake.run('nimblescape.markdownNotes.hideHighlights');
  await settle();
  const after = view.state();
  expect(after.threads.map((thread) => thread.id)).toEqual(before.threads.map((thread) => thread.id));
  // The view sends its whole state again after the change of the setting, still with the selected note.
  expect(after.selected).toBe('1');
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

test('a click on the line of a thread shows its note in the text editor, and a click on the thread keeps the focus in the view (R-SIDE-007)', async () => {
  const { document, editor, view } = await start();
  await send(view, { type: 'reveal', id: '1' });
  expect(fake.shown).toEqual([{ document, options: { viewColumn: editor.viewColumn, selection: expect.objectContaining({ start: new FakePosition(2, 0) }), preserveFocus: false } }]);
  await send(view, { type: 'reveal', id: '9' });
  expect(fake.shown).toHaveLength(1);
  await send(view, { type: 'reveal', id: '1', focus: false });
  expect(fake.shown[1].options).toMatchObject({ preserveFocus: true });
});

test('a click on a thread puts the cursor at the start of the highlight of its note (R-SIDE-007)', async () => {
  await start('The agents <wbr><!--[note-aaaa-->change\nthe work[^note-aaaa] of teams.\n\n[^note-aaaa]: **hannes** · 2026-10-28 10:15+01:00\n\n    Which?\n');
  const view = fake.resolveView(notesViewId);
  await send(view, { type: 'ready' });
  await send(view, { type: 'reveal', id: '1' });
  expect(fake.shown[0].options).toMatchObject({ selection: expect.objectContaining({ start: new FakePosition(0, 33) }) });
});

/** twoNotes is a paragraph with the highlights of two notes, with their start markers. */
const twoNotes = `The <wbr><!--[note-aaaa-->agents[^note-aaaa] change <wbr><!--[note-bbbb green-->the work[^note-bbbb].\n\n[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00\n\n    A\n\n[^note-bbbb]: **ann** · 2026-10-28 10:15+01:00\n\n    B\n`;

/**
 * inCleanView opens a file from the Explorer in a tab of its own, as VS Code does, activates the extension, which
 * shows it in the clean editing view (R-TEXT-009), and shows the side view.
 * @param text - The text of the file.
 */
const inCleanView = async (text: string) => {
  fake.files.set('/folder/a.md', text);
  const document = fake.open(text);
  const tab = { input: new FakeTabInputText(document.uri), isPreview: true };
  fake.tabGroups.push({ viewColumn: 1, tabs: [tab], activeTab: tab });
  fake.editors.push(new FakeEditor(document, 0, 1));
  fake.activeEditor = fake.editors[0];
  await fake.activate();
  await settle();
  await settle();
  const [clean] = fake.editors;
  fake.fire('activeEditor', clean);
  const view = fake.resolveView(notesViewId);
  await send(view, { type: 'ready' });
  return { clean, document, view };
};

test('a click on a thread in the clean editing view selects the thread in the view, also when the cursor goes to the start of its highlight (R-SIDE-007, R-TEXT-009)', async () => {
  const { clean, view } = await inCleanView(twoNotes);
  expect(clean.document.getText()).toBe('The agents change the work.\n');
  const [first, second] = view.state().threads;
  for (const thread of [second, first]) {
    await send(view, { type: 'reveal', id: thread.id, focus: false });
    expect(view.state().selected).toBe(thread.id);
    // VS Code puts the cursor at the start of the highlight in the view, which is the place of the hidden start marker.
    const { selection } = fake.shown.at(-1)!.options as { selection: FakeRange };
    expect(clean.document.getText(new FakeRange(selection.start, clean.document.positionAt(clean.document.getText().length)))).toMatch(thread === first ? /^agents/ : /^the work/);
    clean.selection = { active: selection.start };
    fake.fire('selection', { textEditor: clean, selections: [selection] });
    await settle();
    expect(view.state().selected).toBe(thread.id);
  }
});

test('a click on a thread keeps the mode of the tab of the clean editing view, and the view shows the notes of its file in each mode (R-SIDE-007, R-TEXT-009)', async () => {
  const { clean, document, view } = await inCleanView(twoNotes);
  const [, second] = view.state().threads;
  const shown = fake.shown.length;
  // The user switches the tab of the view to the mode "Markdown Preview", which shows the clean document.
  const inMode = async (viewType: string) => {
    fake.editors = [];
    fake.tabGroups = [{ viewColumn: 1, tabs: [], activeTab: { input: { viewType, uri: clean.document.uri }, label: 'a.md' } }];
    fake.fire('tabs', {});
    await settle();
  };
  await inMode(markdownModes.preview);
  expect(view.state().threads).toHaveLength(2);
  await send(view, { type: 'reveal', id: second.id, focus: false });
  expect(fake.shown).toHaveLength(shown);
  expect(view.state().selected).toBe(second.id);
  expect(fake.calls.map(({ command }) => command)).not.toContain('vscode.openWith');
  // The mode "Markdown Editor" of the view selects the highlight of the note in the clean document.
  await inMode(markdownModes.editor);
  await send(view, { type: 'reveal', id: second.id, focus: false });
  expect(fake.shown).toHaveLength(shown);
  const { command, args } = fake.calls.at(-1)!;
  expect(command).toBe('vscode.openWith');
  expect(args.slice(0, 2)).toEqual([clean.document.uri, markdownModes.editor]);
  const { start, end } = (args[2] as { selection: FakeRange }).selection;
  expect(clean.document.getText(new FakeRange(start, end))).toBe('the work');
  expect(document.getText()).toBe(twoNotes);
});

test('a click on a thread keeps the mode of the file: the preview scrolls to the note, and the mode "Markdown Editor" selects its highlight (R-SIDE-007)', async () => {
  const text = 'The agents <!--[note-aaaa-->change\nthe work[^note-aaaa] of teams.\n\n[^note-aaaa]: **hannes** · 2026-10-28 10:15+01:00\n\n    Which?\n';
  const { document, view } = await start(text);
  const states = () => view.messages.filter((message) => message.type === 'state').length;
  // Only the preview to the side shows the file; VS Code tells its label and the type of its webview.
  fake.editors = [];
  fake.tabGroups = [{ viewColumn: 1, tabs: [], activeTab: { input: { viewType: 'mainThreadWebview-markdown.preview' }, label: 'Preview a.md' } }];
  const before = states();
  await send(view, { type: 'reveal', id: '1' });
  expect(fake.shown).toEqual([]);
  expect(states()).toBe(before + 1);
  expect(fake.calls.map(({ command }) => command)).toContain('markdown.preview.refresh');
  // The mode "Markdown Preview" of the text editor of VS Code is a custom editor of the document.
  fake.tabGroups = [{ viewColumn: 2, tabs: [], activeTab: { input: { viewType: markdownModes.preview, uri: document.uri }, label: 'a.md' } }];
  await send(view, { type: 'reveal', id: '1' });
  expect(fake.shown).toEqual([]);
  // The mode "Markdown Editor" opens the document in its own mode again, with the highlight of the note selected.
  fake.tabGroups = [{ viewColumn: 2, tabs: [], activeTab: { input: { viewType: markdownModes.editor, uri: document.uri }, label: 'a.md' } }];
  await send(view, { type: 'reveal', id: '1', focus: false });
  expect(fake.shown).toEqual([]);
  const { args } = fake.calls.at(-1)!;
  expect(fake.calls.at(-1)!.command).toBe('vscode.openWith');
  expect(args.slice(0, 2)).toEqual([document.uri, markdownModes.editor]);
  expect(args[2]).toMatchObject({ viewColumn: 2, preserveFocus: true, selection: { start: new FakePosition(0, 28), end: new FakePosition(1, 8) } });
  // The preview of another file, and a text editor of the file, open the text editor.
  fake.tabGroups = [{ viewColumn: 1, tabs: [], activeTab: { input: { viewType: 'mainThreadWebview-markdown.preview' }, label: 'Preview b.md' } }];
  await send(view, { type: 'reveal', id: '1' });
  expect(fake.shown).toHaveLength(1);
});

test('the view follows the active tab that shows a Markdown file in the mode "Markdown Preview" or "Markdown Editor", which is no text editor (R-SIDE-002)', async () => {
  const { view } = await start();
  const other = fake.open('Text[^note-bbbb].\n\n[^note-bbbb]: **bob** · 2026-10-28 11:00+01:00\n\n    B\n', '/folder/b.md');
  for (const [viewType, file] of [
    [markdownModes.preview, 'b.md'],
    [markdownModes.editor, 'a.md'],
    ['workbench.editor.browser', 'a.md'],
  ] as const) {
    const uri = viewType === markdownModes.preview ? other.uri : new FakeUri('file', '/folder/a.md');
    fake.tabGroups = [{ viewColumn: 1, tabs: [], activeTab: { input: { viewType, uri }, label: file } }];
    fake.fire('tabs', {});
    await settle();
    expect(view.state().file, viewType).toBe(file);
  }
  expect(view.state().threads).toHaveLength(1);
});

test('a click into the highlight of a note selects it, and a double click on it opens the view, which scrolls to the thread; the keyboard, a drag and the note itself do not (R-SIDE-007)', async () => {
  const text = 'The agents <!--[note-aaaa-->change\nthe work[^note-aaaa] of teams.\n\n[^note-aaaa]: **hannes** · 2026-10-28 10:15+01:00\n\n    Which?\n';
  const { editor, view } = await start(text);
  view.visible = false;
  /**
   * select changes the selection of the text editor as VS Code does: the mouse (2) or the keys (1).
   * @param anchor - The line and the character of the anchor.
   * @param active - The line and the character of the active end; the anchor without one.
   * @param kind - The kind of the change.
   */
  const select = async (anchor: [number, number], active = anchor, kind = 2) => {
    editor.selection = new FakeSelection(new FakePosition(...anchor), new FakePosition(...active));
    fake.fire('selection', { textEditor: editor, kind });
    await settle();
  };
  await select([0, 30], [0, 30], 1);
  expect(view.state().selected).toBe('1');
  await select([1, 2]);
  expect(view.shows).toBe(0);
  // VS Code reports the second click of a double click as the word at the place of the cursor.
  await select([1, 0], [1, 3]);
  expect(view.shows).toBe(1);
  expect(view.state().selected).toBe('1');
  // The thread was selected while the view was hidden, so the view scrolls to it when it shows.
  expect(view.messages.filter((message) => message.type === 'scroll')).toHaveLength(1);
  // The first click of a double click on the place of the cursor changes nothing, and VS Code reports only the word,
  // also long after the click that put the cursor there.
  await select([1, 4]);
  vi.advanceTimersByTime(2000);
  await select([1, 4], [1, 8]);
  expect(view.shows).toBe(2);
  // A drag selects the text from the cursor in steps, and the keys select no word of a double click.
  await select([1, 5]);
  await select([1, 5], [1, 7]);
  await select([1, 4]);
  await select([1, 4], [1, 6]);
  await select([1, 4], [1, 8]);
  await select([1, 6]);
  await select([1, 4], [1, 8], 1);
  // A double click on the note itself or outside the notes opens nothing.
  await select([5, 6]);
  await select([5, 4], [5, 9]);
  await select([0, 1]);
  await select([0, 0], [0, 3]);
  expect(view.shows).toBe(2);
});

test('a mouse click outside the notes and a cursor that leaves the selected note deselect it, a move with the keys outside the notes keeps a note of the view, and the script of the view deselects it for a click on its empty part or Escape (R-SIDE-007)', async () => {
  const { editor, view } = await start();
  const move = async (line: number, kind: number) => {
    editor.selection = { active: new FakePosition(line, 0) };
    fake.fire('selection', { textEditor: editor, kind });
    await settle();
  };
  await move(5, 2);
  expect(view.state().selected).toBe('1');
  await move(12, 2);
  expect(view.state().selected).toBeUndefined();
  // The cursor that leaves the selected note deselects it, also with the keys (Hannes, 2026-10-29: "keeps it selected
  // when the cursor goes out of it again").
  await move(5, 1);
  expect(view.state().selected).toBe('1');
  await move(12, 1);
  expect(view.state().selected).toBeUndefined();
  // A note that the user chose in the view stays selected while the keys move the cursor outside the notes.
  await send(view, { type: 'reveal', id: '1', focus: false });
  await move(11, 1);
  expect(view.state().selected).toBe('1');
  await send(view, { type: 'deselect' });
  expect(view.state().selected).toBeUndefined();
});

test('the view is a list that does not follow the scrolling of the text editor, and takes no size or scroll from its script (R-SIDE-007, decision 25)', async () => {
  const { editor, view } = await start(note, 12);
  const count = view.messages.length;
  editor.visibleRanges = [new FakeRange(1, 0, 13, 0)];
  fake.fire('visibleRanges', { textEditor: editor });
  await settle();
  expect(view.messages.length).toBe(count);
  expect(view.messages.at(-1)).not.toHaveProperty('placement');
  // The messages of the aligned view of before change nothing.
  await send(view, { type: 'size', height: 600 });
  await send(view, { type: 'scroll', rows: 3 });
  expect(fake.executed).not.toContain('editorScroll');
  expect(view.messages.length).toBe(count);
});

test('without an active Markdown file the view shows no threads, and an action returns that no note is there', async () => {
  await fake.activate();
  const view = fake.resolveView(notesViewId);
  await send(view, { type: 'ready' });
  expect(view.state()).toMatchObject({ file: undefined, line: undefined, threads: [] });
  await send(view, { type: 'add', request: 1, text: 'Note' });
  expect(results(view)).toEqual([{ type: 'result', request: 1, message: 'The change was not saved: the file no longer holds the note.' }]);
});

test('a click on a link of a rendered text opens it: a web link with the system, a file in a new window of VS Code at its heading or line, and a place of the file itself in its editor (R-SIDE-005, R-GEN-010)', async () => {
  fake.files.set('/folder/sources/hong.md', '# Hong et al.\n\n## Abstract\n\nText.\n');
  fake.files.set('/folder/data.txt', 'a\nb\nc\n');
  fake.files.set('/folder/paper.pdf', '%PDF');
  fake.directories.add('/folder/sources');
  // The Markdown preview gives each heading the identifier of its text and the index of its line.
  fake.rendered = (text) =>
    text.startsWith('# Hong')
      ? '<h1 id="hong-et-al" data-line="0" class="code-line" dir="auto">Hong et al.</h1>\n<h2 data-line="2" class="code-line" id="abstract">Abstract</h2>\n'
      : '<h1 id="title" data-line="0">Title</h1>\n';
  const { view } = await start();
  await send(view, { type: 'openLink', href: 'https://example.com/a?b=1' });
  await send(view, { type: 'openLink', href: 'mailto:ann@example.com' });
  expect(fake.external).toEqual(['https://example.com/a?b=1', 'mailto:ann@example.com']);
  // A relative path starts at the folder of the Markdown file, a path with "/" at the folder of the workspace.
  await send(view, { type: 'openLink', href: 'sources/hong.md#Abstract' });
  await send(view, { type: 'openLink', href: '/data.txt#L2,3' });
  await send(view, { type: 'openLink', href: '#title' });
  // A file without a place, a file that is no text and a heading that the file does not hold open as files.
  await send(view, { type: 'openLink', href: '../folder/paper.pdf' });
  await send(view, { type: 'openLink', href: 'sources/hong.md#missing' });
  await send(view, { type: 'openLink', href: 'sources' });
  expect(openedLinks()).toEqual([
    ['vscode.open', '/folder/sources/hong.md', new FakePosition(2, 0)],
    [newWindow],
    ['vscode.open', '/folder/data.txt', new FakePosition(1, 2)],
    [newWindow],
    ['vscode.open', '/folder/a.md', new FakePosition(0, 0)],
    ['vscode.open', '/folder/paper.pdf', undefined],
    [newWindow],
    ['vscode.open', '/folder/sources/hong.md', undefined],
    [newWindow],
    ['revealInExplorer', '/folder/sources'],
  ]);
  await send(view, { type: 'openLink', href: 'missing%20file.md' });
  expect(fake.errors).toEqual(['The link was not opened: the file /folder/missing file.md does not exist.']);
});

test('a file that a tab shows opens in that tab, and the setting openLinksIn opens a file in the editor or with the program of the system, which asks first for a file that is no document (R-GEN-010)', async () => {
  fake.files.set('/folder/paper.pdf', '%PDF');
  fake.files.set('/folder/tool.app', 'x');
  const { view } = await start();
  fake.tabGroups = [{ viewColumn: 3, tabs: [{ input: { uri: new FakeUri('file', '/folder/paper.pdf') } }] }];
  await send(view, { type: 'openLink', href: 'paper.pdf' });
  expect(openedLinks()).toEqual([['vscode.open', '/folder/paper.pdf', undefined]]);
  expect((linkCalls()[0].args[1] as { viewColumn: number }).viewColumn).toBe(3);
  fake.tabGroups = [];
  fake.calls.length = 0;
  fake.settings.set('', { openLinksIn: 'editor' });
  await send(view, { type: 'openLink', href: 'paper.pdf' });
  expect(openedLinks()).toEqual([['vscode.open', '/folder/paper.pdf', undefined]]);
  fake.calls.length = 0;
  fake.settings.set('', { openLinksIn: 'system' });
  await send(view, { type: 'openLink', href: 'paper.pdf' });
  await send(view, { type: 'openLink', href: 'tool.app' });
  expect(fake.external).toEqual(['file:/folder/paper.pdf']);
  expect(fake.warnings).toEqual(['Open the file "/folder/tool.app" with the program of your system?']);
  // A place of the Markdown file itself opens in its editor.
  await send(view, { type: 'openLink', href: '#title' });
  expect(openedLinks()).toEqual([['vscode.open', '/folder/a.md', undefined]]);
});

test('a link of another scheme opens only after a question, and a link that runs a command never (R-SIDE-005)', async () => {
  const { view } = await start();
  await send(view, { type: 'openLink', href: 'zotero://select/items/ABC' });
  expect(fake.warnings).toEqual(['Open the link "zotero://select/items/ABC" with the program of your system?']);
  expect(fake.external).toEqual([]);
  fake.answer = 'Open';
  await send(view, { type: 'openLink', href: 'zotero://select/items/ABC' });
  expect(fake.external).toEqual(['zotero://select/items/ABC']);
  // A link of VS Code opens without a question, as in the Markdown preview.
  await send(view, { type: 'openLink', href: 'vscode://file/folder/a.md' });
  expect(fake.warnings).toHaveLength(2);
  expect(fake.external).toHaveLength(2);
  for (const href of ['command:workbench.action.reloadWindow', 'data:text/html,<b>x</b>', 'JavaScript:alert(1)']) {
    await send(view, { type: 'openLink', href });
  }
  expect(fake.errors).toEqual([
    'The link was not opened: the extension opens no link of the scheme "command:".',
    'The link was not opened: the extension opens no link of the scheme "data:".',
    'The link was not opened: the extension opens no link of the scheme "javascript:".',
  ]);
  expect(linkCalls()).toEqual([]);
  expect(fake.external).toHaveLength(2);
});

test('"Add Note" opens the editor of a new note for the selected text, and without selected text tells to select text (R-EDIT-003, R-EDIT-006)', async () => {
  const { editor, view } = await start(note, 12);
  await fake.run(viewCommands.newNote);
  expect(fake.infos).toEqual(['The note was not added: select the text in the text editor that the note is about, then choose "Add Note" again.']);
  expect(view.messages.some((message) => message.type === 'new')).toBe(false);
  editor.selection = { anchor: new FakePosition(2, 4), active: new FakePosition(2, 8) };
  fake.fire('selection', { textEditor: editor, kind: 1 });
  await settle();
  await fake.run(viewCommands.newNote);
  expect(view.messages.at(-1)).toEqual({ type: 'new' });
  // The context menu of the text editor passes the URI of the document, which changes nothing.
  await fake.run(viewCommands.newNote, editor.document.uri);
  expect(view.messages.at(-1)).toEqual({ type: 'new' });
});

/**
 * addLink returns the link of "Add Note" of the preview of a document, for text that the user selected in the preview
 * (R-PREV-008).
 * @param document - The URI of the rendered document.
 * @param line - The line of the block, which the preview names.
 * @param before - The text of the block before the selected text, as the page shows it.
 * @param text - The selected text, as the page shows it.
 */
const addLink = (document: FakeUri, line: number, before: string, text: string): FakeUri =>
  FakeUri.parse(`vscode://${extensionId}${addPath}?${new URLSearchParams({ document: document.toString(), line: String(line), before, text }).toString()}`);

test('"Add Note" of the preview opens the editor of a new note for the selected text of the preview, which the new note highlights (R-PREV-008)', async () => {
  const { document, view } = await start(note, 0);
  fake.signIn = 'carl';
  const before = view.messages.length;
  await fake.uriHandler!.handleUri(addLink(document.uri, 2, 'The text of ', 'the page.'));
  await settle();
  // The title of the editor names the text at once, before the new state of the view.
  expect(view.messages.slice(before).filter((message) => message.type !== 'state')).toEqual([{ type: 'line', line: 2, highlight: 'the page.' }, { type: 'new' }]);
  expect(view.state().highlight).toBe('the page.');
  await send(view, { type: 'add', request: 1, text: 'A new note.' });
  expect(results(view)).toEqual([{ type: 'result', request: 1, message: undefined }]);
  expect(document.text).toMatch(/^The text\[\^note-aaaa\] of <wbr><!--\[(note-[a-z0-9]{4})-->the page\.\[\^\1\]$/m);
  expect(view.state().threads).toHaveLength(2);
  // Text that the file does not hold, such as the text of a note, which the preview never shows, or text that a note
  // cannot highlight, over two cells of a table, opens no editor and tells what to select.
  const count = view.messages.length;
  await fake.uriHandler!.handleUri(addLink(document.uri, 0, '', 'Other'));
  await fake.uriHandler!.handleUri(addLink(document.uri, 4, '', 'carl'));
  const table = fake.open('| A | B |\n|---|---|\n| one | two |\n', '/folder/table.md');
  await fake.uriHandler!.handleUri(addLink(table.uri, 2, '', 'onetwo'));
  await settle();
  expect(fake.infos).toEqual([previewTextMissing, previewTextMissing, expect.stringMatching(/^The note was not added: a note highlights text of a paragraph/)]);
  // A link of a document that is not open changes nothing.
  await fake.uriHandler!.handleUri(addLink(new FakeUri('file', '/folder/other.md'), 0, '', 'Title'));
  await settle();
  expect(view.messages.length).toBe(count);
});

test('"Add Note" of the preview of the clean editing view adds the note to the file, at the place of the selected text (R-PREV-008, R-TEXT-009)', async () => {
  const { clean, document, view } = await inCleanView(twoNotes);
  fake.signIn = 'carl';
  await fake.uriHandler!.handleUri(addLink(clean.document.uri, 0, 'The agents ', 'change'));
  await settle();
  expect(view.messages.filter((message) => message.type === 'new')).toEqual([{ type: 'new' }]);
  expect(view.state().highlight).toBe('change');
  await send(view, { type: 'add', request: 1, text: 'A new note.' });
  expect(results(view)).toEqual([{ type: 'result', request: 1, message: undefined }]);
  expect(document.text).toMatch(/^The <wbr><!--\[note-aaaa-->agents\[\^note-aaaa\] <wbr><!--\[(note-[a-z0-9]{4})-->change\[\^\1\] <wbr><!--\[note-bbbb green-->the work\[\^note-bbbb\]\.$/m);
});

test('"Add Note" opens the hidden view, and a view that opens just now gets the request when its script starts (R-EDIT-006)', async () => {
  const document = fake.open(note);
  const editor = new FakeEditor(document, 2);
  fake.editors.push(editor);
  fake.activeEditor = editor;
  await fake.activate();
  editor.selection = { anchor: new FakePosition(2, 4), active: new FakePosition(2, 8) };
  fake.fire('selection', { textEditor: editor, kind: 1 });
  await settle();
  await fake.run(viewCommands.newNote);
  expect(fake.calls.map(({ command }) => command)).toContain(`${notesViewId}.focus`);
  // VS Code resolves the view, and its script starts.
  const view = fake.resolveView(notesViewId);
  expect(view.messages.some((message) => message.type === 'new')).toBe(false);
  await send(view, { type: 'ready' });
  expect(view.messages.at(-1)).toEqual({ type: 'new' });
  expect(view.messages.filter((message) => message.type === 'new')).toHaveLength(1);
  expect(view.state().highlight).toBe('text');
});

test('the palette of a thread colors its note in its start marker, and the text view saves the whole note (R-NOTE-006, R-EDIT-001)', async () => {
  const text = 'The <wbr><!--[note-aaaa-->text[^note-aaaa] of the page.\n\n[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00\n\n    The text.\n';
  const { document, view } = await start(text, 4);
  await send(view, { type: 'color', id: '1', color: 'purple' });
  // A change of a file writes the comment of the format at its top (R-NOTE-007).
  expect(document.text).toBe(marked(text.replace('<!--[note-aaaa-->', '<!--[note-aaaa purple-->')));
  expect(view.state().threads[0]).toMatchObject({ colorName: 'purple', color: '#8a4fc0' });
  await send(view, { type: 'color', id: '1', color: undefined });
  expect(document.text).toBe(marked(text));
  // The text view shows the whole note, and Save writes it as it is, without a new date.
  expect(view.state().threads[0].text).toBe('[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00\n\n    The text.');
  const original = view.state().threads[0].text;
  await send(view, { type: 'saveText', request: 1, id: '1', original, text: '[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00\n\n    The changed text.\n\n    > **bob** · 2026-10-28 11:00+01:00\n    >\n    > Yes.' });
  expect(results(view)).toEqual([{ type: 'result', request: 1, message: undefined }]);
  expect(document.text).toContain('    The changed text.\n\n    > **bob** · 2026-10-28 11:00+01:00\n    >\n    > Yes.\n');
  expect(view.state().threads[0].answers.map((answer) => answer.author)).toEqual(['ann', 'bob']);
  // A text that is not this one note keeps the file as it is.
  await send(view, { type: 'saveText', request: 2, id: '1', original: view.state().threads[0].text, text: 'No header.' });
  expect(results(view)[1]).toEqual({ type: 'result', request: 2, message: expect.stringContaining('the text must stay this one note') });
});
