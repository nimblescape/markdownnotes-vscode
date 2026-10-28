// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests run the overlay of the notes in the text editor
 * ([src/noteEditor.ts](noteEditor.ts)) with a fake of the API of VS Code
 * ([src/testing/fakeVscode.ts](testing/fakeVscode.ts)): the dimming after the
 * cursor (R-TEXT-003), the collapse of the notes the first time a file is in
 * the active editor and the commands of the folds (R-TEXT-005), the
 * markers in the left margin (R-TEXT-006), the highlight and the hidden
 * start markers and references of the selections (R-NOTE-006), and the
 * rendered header lines with the time of the author on hover (R-TEXT-007).
 * The tests run in the zone Europe/Vienna (vitest.config.mts), which is
 * UTC+01:00 on 2026-10-28.
 */

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { colorOf, deleteCommands, editorCommands, keepTime, markerContexts, markerImage, noteColors, settleTime } from './noteEditor';
import { foldedContext, noteContext } from './noteThreads';
import { Fake, FakeEditor, FakePosition, FakeRange, FakeThemeColor } from './testing/fakeVscode';

// The static import of the module reads only its constants; each test imports the extension with a new fake of the
// editor API.
vi.mock('vscode', () => ({}));

/** fake is the fake API of the test. */
let fake: Fake;

beforeEach(() => {
  vi.useFakeTimers();
  fake = new Fake();
  // The tests of the overlay keep their lines: the comment of the format, which an editor of a file with notes gets,
  // has tests of its own in src/extension.test.ts.
  fake.settings.set('workspace', { addFormatComment: false });
  vi.resetModules();
  vi.doMock('vscode', () => fake.api);
});

afterEach(() => {
  vi.useRealTimers();
});

/** hannes and anna are the header lines of two notes. */
const hannes = '[^note-aaaa]: **hannes** · 2026-10-28 10:15+01:00';
const anna = '[^note-bbbb]: **anna** · 2026-10-28 11:02+01:00';

/**
 * text is a Markdown text with two notes after two paragraphs, on lines 2 to 4 and 8 to 10, whose references end the
 * first lines of the paragraphs.
 */
const text = ['Intro text[^note-aaaa].', '', hannes, '', '    First', '', 'More text[^note-bbbb]', '', anna, '', '    Second', '', 'end of it.', ''].join('\n');

/** DecorationType is a decoration type of the fake, with the options of its creation. */
type DecorationType = { options: Record<string, unknown> };

/**
 * typesOf returns the decoration types of an editor that have an option, in the order of their creation.
 * @param editor - The editor.
 * @param option - The name of the option.
 */
const typesOf = (editor: FakeEditor, option: string): DecorationType[] =>
  [...(editor.decorations.keys() as Iterable<DecorationType>)].filter((type) => option in type.options);

/**
 * markerLines returns the line of the marker of each number in an editor, or undefined for a number without a marker.
 * @param editor - The editor.
 */
const markerLines = (editor: FakeEditor): (number | undefined)[] => typesOf(editor, 'gutterIconPath').map((type) => editor.linesOf(type)[0]);

/** Attachment is a decoration with a `before` attachment of its own. */
type Attachment = { range: FakeRange; renderOptions: { before: Record<string, unknown> } };

/**
 * attachmentType returns the decoration type of an editor whose decorations have attachments that a test accepts.
 * @param editor - The editor.
 * @param accepts - Tells whether an attachment is of the type.
 */
const attachmentType = (editor: FakeEditor, accepts: (before: Record<string, unknown>) => boolean): object =>
  [...editor.decorations.entries()].find(([, items]) => items.length > 0 && items.every((item) => 'renderOptions' in item && accepts((item as Attachment).renderOptions.before)))![0];

/**
 * start opens the text in the active editor with the cursor at a line and activates the extension.
 * @param line - The line of the cursor.
 * @param content - The text of the document.
 */
const start = async (line = 0, content = text) => {
  const editor = new FakeEditor(fake.open(content), line);
  fake.editors.push(editor);
  fake.activeEditor = editor;
  await fake.activate();
  return editor;
};

test('with the cursor outside the notes the editor dims the notes, and with the cursor in a note everything outside it (R-TEXT-003)', async () => {
  const editor = await start(0);
  const [dimmed] = typesOf(editor, 'opacity');
  expect(editor.decorations.get(dimmed)).toEqual([new FakeRange(2, 0, 4, 9), new FakeRange(8, 0, 10, 10)]);
  editor.selection = { active: new FakePosition(9, 0) };
  fake.fire('selection', { textEditor: editor });
  expect(editor.decorations.get(dimmed)).toEqual([new FakeRange(0, 0, 8, 0), new FakeRange(10, 10, 13, 0)]);
});

test('each note has a marker with its number in its color in the left margin and in the overview ruler (R-TEXT-006)', async () => {
  const editor = await start();
  const markers = typesOf(editor, 'gutterIconPath');
  // The marker stands at the first line of the selection, and while the note is open also at its first line.
  expect(markers.map((type) => editor.linesOf(type))).toEqual([
    [0, 2],
    [6, 8],
  ]);
  markers.forEach(({ options }, index) => {
    expect(options).toMatchObject({ gutterIconSize: 'contain', overviewRulerColor: colorOf(index + 1), overviewRulerLane: 1 });
    expect(String(options.gutterIconPath)).toContain(Buffer.from(markerImage(index + 1)).toString('base64'));
  });
  // The colors repeat after the last one, and a number of three digits shows as an ellipsis.
  expect(colorOf(noteColors.length + 1)).toBe(noteColors[0]);
  expect(markerImage(2)).toContain('>2</text>');
  expect(markerImage(100)).toContain('>…</text>');
});

test('the marker of a note with a selection over several lines stands at the last line of the selection, beside the comment mark of VS Code that opens the box (R-TEXT-006)', async () => {
  fake.settings.set('', { collapseInEditor: false, showNotesIn: 'inline' });
  const editor = await start(9, ['The <!--[note-aaaa-->agents', 'change the work[^note-aaaa] of teams.', '', hannes, '', '    Which?', ''].join('\n'));
  expect(markerLines(editor)).toEqual([1]);
  expect(typesOf(editor, 'gutterIconPath').map((type) => editor.linesOf(type))).toEqual([[1, 3]]);
  // The box of the note opens below the last line of the selection, where VS Code shows its comment mark.
  expect(fake.live()[0].range).toEqual(new FakeRange(0, 21, 1, 15));
});

test('the notes collapse the first time their file is in the active editor, into the line of text before them (R-TEXT-005)', async () => {
  const editor = await start(12);
  expect(fake.calls).toEqual([{ command: 'editor.fold', args: [{ levels: 1, direction: 'down', selectionLines: [0, 6] }] }]);
  // VS Code tells the collapsed folds by the visible ranges, and the marker of a collapsed note stays only at its selection.
  editor.visibleRanges = [new FakeRange(0, 0, 0, 23), new FakeRange(5, 0, 6, 21), new FakeRange(11, 0, 13, 0)];
  fake.fire('visibleRanges', { textEditor: editor });
  expect(markerLines(editor)).toEqual([0, 6]);
  expect(typesOf(editor, 'gutterIconPath').map((type) => editor.linesOf(type).length)).toEqual([1, 1]);
  // The file collapses only once: a note that the user opens stays open when the editor comes back.
  fake.fire('activeEditor', editor);
  expect(fake.calls).toHaveLength(1);
  // After the file closes, it collapses again when it opens again.
  fake.fire('close', editor.document);
  fake.fire('activeEditor', editor);
  expect(fake.calls).toHaveLength(2);
});

test('the setting collapseInEditor false keeps the notes open', async () => {
  fake.settings.set('', { collapseInEditor: false });
  await start();
  expect(fake.calls).toEqual([]);
});

test('a collapsed note at the start of the file hides its first line, and the cursor does not stay on it (R-TEXT-005, R-TEXT-007)', async () => {
  const editor = await start(4, `${hannes}\n\n    First\n\nText[^note-aaaa].\n`);
  const [hidden] = typesOf(editor, 'textDecoration');
  const first = new FakeRange(0, 0, 0, hannes.length);
  const reference = new FakeRange(4, 4, 4, 16);
  expect(fake.calls[0].args).toEqual([{ levels: 1, direction: 'down', selectionLines: [0] }]);
  // The header line of the open note shows rendered, and the reference vanishes also on the line of the cursor.
  expect(editor.decorations.get(hidden)).toEqual([reference, first]);
  editor.visibleRanges = [new FakeRange(0, 0, 0, hannes.length), new FakeRange(4, 0, 5, 0)];
  fake.fire('visibleRanges', { textEditor: editor });
  expect(editor.decorations.get(hidden)).toEqual([first, reference, first]);
  // A cursor on the hidden first line goes past the collapsed note to the next line of text, which VS Code shows.
  editor.selection = { active: new FakePosition(0, 3) };
  fake.fire('selection', { textEditor: editor });
  expect(editor.selection.active).toEqual(new FakePosition(4, 0));
  expect(editor.decorations.get(hidden)).toEqual([first, reference, first]);
});

test('"Hide Note Text" and "Show Note Text" fold the note of their box or at the cursor, and the commands of the Command Palette collapse or expand all notes (R-TEXT-005)', async () => {
  fake.settings.set('', { showNotesIn: 'inline' });
  const editor = await start(12);
  fake.calls.length = 0;
  const [, second] = fake.live();
  await fake.run(editorCommands.collapseNote, second);
  await fake.run(editorCommands.expandAll);
  await fake.run(editorCommands.collapseAll);
  // The cursor in the selection of a note folds this note.
  editor.selection = { active: new FakePosition(0, 3) };
  await fake.run(editorCommands.collapseNote);
  // "Show Note Text" scrolls to the note when it is outside the visible lines.
  await fake.run(editorCommands.expandNote, second);
  expect(fake.calls.map(({ command, args }) => [command, (args[0] as { selectionLines: number[] }).selectionLines])).toEqual([
    ['editor.fold', [6]],
    ['editor.unfold', [0, 6]],
    ['editor.fold', [0, 6]],
    ['editor.fold', [0]],
    ['editor.unfold', [6]],
  ]);
  expect(editor.revealed).toEqual([new FakeRange(8, 0, 10, 10)]);
});

test('the box of a note has the button "Hide Note Text" while the text shows and "Show Note Text" while it is folded, after the visible ranges or else the last command (R-TEXT-005)', async () => {
  fake.settings.set('', { showNotesIn: 'inline' });
  const editor = await start(12);
  const [first, second] = fake.live();
  // The first collapse folds both notes.
  expect([first.contextValue, second.contextValue]).toEqual([foldedContext, foldedContext]);
  // The visible ranges show the first note open and the second one folded.
  editor.visibleRanges = [new FakeRange(0, 0, 6, 21), new FakeRange(11, 0, 13, 0)];
  fake.fire('visibleRanges', { textEditor: editor });
  expect([first.contextValue, second.contextValue]).toEqual([noteContext, foldedContext]);
  // A fold outside the visible ranges keeps the state of the last command.
  editor.visibleRanges = [new FakeRange(12, 0, 13, 0)];
  await fake.run(editorCommands.expandNote, second);
  fake.fire('visibleRanges', { textEditor: editor });
  expect([first.contextValue, second.contextValue]).toEqual([noteContext, noteContext]);
});

test('the first collapse repeats each time VS Code reads the folds of the unchanged document anew, for a short time, because a fold before the reading has no effect (R-TEXT-005)', async () => {
  const editor = await start(12);
  const provider = fake.folding.get('markdown')!;
  const folds = [{ command: 'editor.fold', args: [{ levels: 1, direction: 'down', selectionLines: [0, 6] }] }];
  expect(fake.calls).toEqual(folds);
  // VS Code reads the folds anew when another extension registers a folding provider.
  provider.provideFoldingRanges(editor.document);
  await vi.runAllTimersAsync();
  expect(fake.calls).toEqual([...folds, ...folds]);
  // The fold commands act on the active editor, so another file there stops the repetition.
  fake.activeEditor = new FakeEditor(fake.open('Other.', '/folder/b.md'));
  provider.provideFoldingRanges(editor.document);
  await vi.runAllTimersAsync();
  fake.activeEditor = editor;
  expect(fake.calls).toHaveLength(2);
  // A change of the document ends the repetition.
  editor.document.version++;
  provider.provideFoldingRanges(editor.document);
  await vi.runAllTimersAsync();
  editor.document.version--;
  provider.provideFoldingRanges(editor.document);
  await vi.runAllTimersAsync();
  expect(fake.calls).toHaveLength(2);
});

test('the first collapse repeats only for the time of settleTime (R-TEXT-005)', async () => {
  const editor = await start(12);
  vi.advanceTimersByTime(settleTime + 1);
  fake.folding.get('markdown')!.provideFoldingRanges(editor.document);
  await vi.runAllTimersAsync();
  expect(fake.calls).toHaveLength(1);
});

test('with the setting keepNotesCollapsed the notes collapse, nothing shows their text, and a fold that VS Code opens collapses again (R-TEXT-005)', async () => {
  // The setting keeps the notes collapsed also with collapseInEditor false, and the boxes of showNotesIn "inline".
  fake.settings.set('', { keepNotesCollapsed: true, collapseInEditor: false, showNotesIn: 'inline' });
  const editor = await start(12);
  const fold = (...lines: number[]) => ({ command: 'editor.fold', args: [{ levels: 1, direction: 'down', selectionLines: lines }] });
  expect(fake.calls).toEqual([fold(0, 6)]);
  // The commands that show the text of a note do nothing; the commands that hide it still work.
  const [, second] = fake.live();
  await fake.run(editorCommands.expandNote, second);
  await fake.run(editorCommands.expandAll);
  expect(fake.calls).toEqual([fold(0, 6)]);
  await fake.run(editorCommands.collapseNote, second);
  expect(fake.calls).toEqual([fold(0, 6), fold(6)]);
  fake.calls.length = 0;
  // The editor folds again only after VS Code read the folds of this version of the document, so that the fold
  // command does not act on another region, for example of a heading.
  editor.visibleRanges = [new FakeRange(0, 0, 13, 0)];
  fake.fire('visibleRanges', { textEditor: editor });
  expect(fake.calls).toEqual([]);
  vi.advanceTimersByTime(settleTime + 1);
  fake.folding.get('markdown')!.provideFoldingRanges(editor.document);
  vi.advanceTimersByTime(keepTime);
  expect(fake.calls).toEqual([fold(0, 6)]);
  // VS Code shows both notes collapsed, and then opens the second one, for example for a search.
  editor.visibleRanges = [new FakeRange(0, 0, 0, 23), new FakeRange(5, 0, 6, 21), new FakeRange(11, 0, 13, 0)];
  fake.fire('visibleRanges', { textEditor: editor });
  expect(fake.calls).toHaveLength(1);
  editor.visibleRanges = [new FakeRange(0, 0, 0, 23), new FakeRange(5, 0, 13, 0)];
  fake.fire('visibleRanges', { textEditor: editor });
  expect(fake.calls).toEqual([fold(0, 6), fold(6)]);
  // A cursor in a collapsed note goes to the line of text before it on a move up.
  editor.visibleRanges = [new FakeRange(0, 0, 0, 23), new FakeRange(5, 0, 6, 21), new FakeRange(11, 0, 13, 0)];
  fake.fire('visibleRanges', { textEditor: editor });
  for (const line of [12, 4]) {
    editor.selection = { active: new FakePosition(line, 2) };
    fake.fire('selection', { textEditor: editor });
  }
  expect(editor.selection.active).toEqual(new FakePosition(0, 23));
  // A cursor in a note that VS Code opened for it, for example after "Go to Line", leaves it, and the note collapses.
  fake.calls.length = 0;
  editor.selection = { active: new FakePosition(9, 4) };
  editor.visibleRanges = [new FakeRange(0, 0, 0, 23), new FakeRange(5, 0, 13, 0)];
  fake.fire('visibleRanges', { textEditor: editor });
  expect(editor.selection.active).toEqual(new FakePosition(11, 0));
  expect(fake.calls).toEqual([fold(6)]);
});

test('the passage of the note that the side view selects has a strong highlight with a frame in the color of the note (R-SIDE-007)', async () => {
  const content = 'The agents <!--[note-aaaa-->change\nthe work[^note-aaaa] of teams.\n\n[^note-aaaa]: **hannes** · 2026-10-28 10:15+01:00\n\n    Which?\n';
  const editor = await start(6, content);
  const strong = (type: DecorationType) => typeof type.options.border === 'string';
  const highlighted = () => [...editor.decorations.entries()].filter(([type, items]) => strong(type as DecorationType) && items.length > 0).map(([, items]) => items);
  expect(highlighted()).toEqual([]);
  // A click on the thread in the side view selects the note.
  const { notesViewId } = await import('./notesView');
  const view = fake.resolveView(notesViewId);
  await view.send({ type: 'reveal', id: '1', focus: false });
  await vi.runAllTimersAsync();
  expect(highlighted()).toEqual([[new FakeRange(0, 28, 1, 8)]]);
  const [type] = [...editor.decorations.keys()].filter((candidate) => strong(candidate as DecorationType)) as DecorationType[];
  expect(type.options).toMatchObject({ backgroundColor: `${noteColors[0]}66`, border: `1px solid ${noteColors[0]}` });
});

test('a selection has a highlight in the color of its note, and its start marker and its reference vanish behind a bar or a dot, also on the line of the cursor (R-NOTE-006)', async () => {
  const content = [
    'The agents <!--[note-aaaa-->change the work[^note-aaaa] of teams.',
    '',
    hannes,
    '',
    '    Which?',
    '',
    'A point <!--[note-bbbb-->[^note-bbbb]here.',
    '',
    anna,
    '',
    '    P',
    '',
  ].join('\n');
  fake.settings.set('', { collapseInEditor: false });
  const editor = await start(11, content);
  const [first, second] = typesOf(editor, 'backgroundColor');
  expect(first.options).toMatchObject({ backgroundColor: `${noteColors[0]}33`, overviewRulerColor: noteColors[0] });
  expect(editor.decorations.get(first)).toEqual([new FakeRange(0, 28, 0, 43)]);
  // A point selects no text.
  expect(editor.decorations.get(second)).toEqual([]);
  const [hidden] = typesOf(editor, 'textDecoration');
  const edges = attachmentType(editor, (before) => before.contentText === '' || before.contentText === '●');
  const headers = [new FakeRange(2, 0, 2, hannes.length), new FakeRange(8, 0, 8, anna.length)];
  expect(editor.decorations.get(hidden)).toEqual([new FakeRange(0, 11, 0, 28), new FakeRange(0, 43, 0, 55), new FakeRange(6, 8, 6, 37), ...headers]);
  const shown = editor.decorations.get(edges) as Attachment[];
  expect(shown.map(({ range }) => range)).toEqual([new FakeRange(0, 28, 0, 28), new FakeRange(0, 43, 0, 43), new FakeRange(6, 8, 6, 8)]);
  expect(shown.map(({ renderOptions }) => renderOptions.before)).toEqual([
    expect.objectContaining({ contentText: '', width: '2px', backgroundColor: colorOf(1) }),
    expect.objectContaining({ contentText: '', width: '2px', backgroundColor: colorOf(1) }),
    expect.objectContaining({ contentText: '●', color: colorOf(2) }),
  ]);
  // The marker of a note also stands at the first line of its selection, and only there while the note is collapsed.
  const markers = () => typesOf(editor, 'gutterIconPath').map((type) => editor.linesOf(type));
  expect(markers()).toEqual([
    [0, 2],
    [6, 8],
  ]);
  editor.visibleRanges = [new FakeRange(0, 0, 0, 65), new FakeRange(5, 0, 6, 42), new FakeRange(11, 0, 11, 0)];
  fake.fire('visibleRanges', { textEditor: editor });
  expect(markers()).toEqual([[0], [6]]);
  // On the line of the cursor the start marker and the reference stay hidden (Hannes, 2026-10-28).
  editor.selection = { active: new FakePosition(0, 3) };
  fake.fire('selection', { textEditor: editor });
  expect(editor.decorations.get(hidden)).toEqual([new FakeRange(0, 11, 0, 28), new FakeRange(0, 43, 0, 55), new FakeRange(6, 8, 6, 37), ...headers]);
  expect(editor.linesOf(edges)).toEqual([0, 0, 6]);
});

test('the cursor steps over a hidden marker in the direction of its move, or to the nearer edge after a click, and the keys that delete next to a marker keep it (R-NOTE-006)', async () => {
  fake.settings.set('', { collapseInEditor: false });
  const editor = await start(4, ['The agents <!--[note-aaaa-->change the work[^note-aaaa] of teams.', '', hannes, '', '    Which?', ''].join('\n'));
  const move = (line: number, character: number) => {
    editor.selection = { active: new FakePosition(line, character) };
    fake.fire('selection', { textEditor: editor, kind: 1 });
    return editor.selection.active;
  };
  move(0, 11);
  // A step to the right into the start marker goes to its end, a step to the left to its start.
  expect(move(0, 12)).toEqual(new FakePosition(0, 28));
  expect(move(0, 27)).toEqual(new FakePosition(0, 11));
  // A cursor that comes from another line goes to the nearer edge.
  move(4, 0);
  expect(move(0, 52)).toEqual(new FakePosition(0, 55));
  const document = editor.document;
  const contexts = () => fake.calls.filter(({ command }) => command === 'setContext').map(({ args }) => args);
  // At the end of the start marker, Backspace deletes the space before it, and the cursor stays after the marker.
  move(0, 28);
  expect(contexts().at(-1)).toEqual([markerContexts.left, true]);
  await fake.run(deleteCommands.left);
  expect(document.text.split('\n')[0]).toBe('The agents<!--[note-aaaa-->change the work[^note-aaaa] of teams.');
  expect(editor.selection.active).toEqual(new FakePosition(0, 27));
  // At the start of the reference, Delete deletes the space after it; the word keys delete the word on the other side.
  move(0, 42);
  await fake.run(deleteCommands.right);
  expect(document.text.split('\n')[0]).toBe('The agents<!--[note-aaaa-->change the work[^note-aaaa]of teams.');
  move(0, 54);
  await fake.run(deleteCommands.wordLeft);
  expect(document.text.split('\n')[0]).toBe('The agents<!--[note-aaaa-->change the [^note-aaaa]of teams.');
  // Without a marker next to the cursor, the keys run the commands of VS Code.
  fake.calls.length = 0;
  move(0, 2);
  await fake.run(deleteCommands.wordRight);
  expect(fake.calls.map(({ command }) => command)).toEqual(['setContext', 'deleteWordRight']);
});

test('each header line shows as one rendered line with the author and the date in the local time of the reader, the time of the author on hover, also on the line of the cursor (R-TEXT-007, R-NOTE-002)', async () => {
  const reply = '    > **anna** · 2026-10-28 09:02-02:00';
  const content = ['Intro[^note-aaaa].', '', hannes, '', '    First', '', reply, '    >', '    > Second', '', 'End.', ''].join('\n');
  fake.settings.set('', { collapseInEditor: false });
  const editor = await start(10, content);
  expect(fake.calls).toEqual([]);
  const headers = attachmentType(editor, (before) => before.fontStyle === 'italic');
  const rendered = () => (editor.decorations.get(headers) as Attachment[]).map(({ range, renderOptions }) => [range, renderOptions.before.contentText]);
  // The quote markers of a reply stay.
  expect(rendered()).toEqual([
    [new FakeRange(2, 0, 2, hannes.length), 'hannes · 2026-10-28 10:15'],
    [new FakeRange(6, 6, 6, reply.length), 'anna · 2026-10-28 12:02'],
  ]);
  const [own, other] = editor.decorations.get(headers) as (Attachment & { hoverMessage: string })[];
  expect(own.renderOptions.before.color).toEqual(new FakeThemeColor('descriptionForeground'));
  expect([own.hoverMessage, other.hoverMessage]).toEqual(['2026-10-28 10:15 at the author (UTC+01:00)', '2026-10-28 09:02 at the author (UTC−02:00)']);
  const [hidden] = typesOf(editor, 'textDecoration');
  expect(editor.decorations.get(hidden)).toEqual([new FakeRange(0, 5, 0, 17), new FakeRange(2, 0, 2, hannes.length), new FakeRange(6, 6, 6, reply.length)]);
  // The cursor does not stay on a header line: it goes to the next line, and the header stays rendered.
  editor.selection = { active: new FakePosition(6, 1) };
  fake.fire('selection', { textEditor: editor });
  expect(editor.selection.active).toEqual(new FakePosition(7, 0));
  expect(rendered()).toHaveLength(2);
  // A move up from below goes to the end of the line above the header line.
  editor.selection = { active: new FakePosition(6, 3) };
  fake.fire('selection', { textEditor: editor });
  expect(editor.selection.active).toEqual(new FakePosition(5, 0));
  // Backspace at the start of the line after a header line, and Delete at the end of the line before it, change nothing.
  const text = editor.document.text;
  await fake.run(deleteCommands.right);
  editor.selection = { active: new FakePosition(7, 0) };
  fake.fire('selection', { textEditor: editor });
  await fake.run(deleteCommands.left);
  await fake.run(deleteCommands.wordLeft);
  expect(editor.document.text).toBe(text);
});
