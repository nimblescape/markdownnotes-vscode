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
 * markers of the selections (R-NOTE-006), and the rendered front matters
 * (R-TEXT-007).
 */

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { colorOf, editorCommands, markerImage, noteColors } from './noteEditor';
import { Fake, FakeEditor, FakePosition, FakeRange, FakeThemeColor, FakeWorkspaceEdit } from './testing/fakeVscode';

// The static import of the module reads only its constants; each test imports the extension with a new fake of the
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
 * text is a Markdown text with a note after a paragraph, on lines 2 to 4, and an inline note between the two lines of
 * a paragraph, on lines 7 to 9.
 */
const text = 'Intro text.\n\n<!-- note\nFirst\n-->\n\nMore text\n<!-- note inline\nSecond\n-->\n\nend of it.\n';

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
  expect(editor.decorations.get(dimmed)).toEqual([new FakeRange(2, 0, 4, 3), new FakeRange(7, 0, 9, 3)]);
  editor.selection = { active: new FakePosition(8, 2) };
  fake.fire('selection', { textEditor: editor });
  expect(editor.decorations.get(dimmed)).toEqual([new FakeRange(0, 0, 7, 0), new FakeRange(9, 3, 12, 0)]);
});

test('each note has a marker with its number in its color in the left margin and in the overview ruler (R-TEXT-006)', async () => {
  const editor = await start();
  const markers = typesOf(editor, 'gutterIconPath');
  expect(markerLines(editor)).toEqual([2, 7]);
  markers.forEach(({ options }, index) => {
    expect(options).toMatchObject({ gutterIconSize: 'contain', overviewRulerColor: colorOf(index + 1), overviewRulerLane: 1 });
    expect(String(options.gutterIconPath)).toContain(Buffer.from(markerImage(index + 1)).toString('base64'));
  });
  // The colors repeat after the last one, and a number of three digits shows as an ellipsis.
  expect(colorOf(noteColors.length + 1)).toBe(noteColors[0]);
  expect(markerImage(2)).toContain('>2</text>');
  expect(markerImage(100)).toContain('>…</text>');
});

test('the notes collapse the first time their file is in the active editor, into the line of text before them (R-TEXT-005)', async () => {
  const editor = await start(11);
  expect(fake.calls).toEqual([{ command: 'editor.fold', args: [{ levels: 1, direction: 'down', selectionLines: [0, 6] }] }]);
  // VS Code tells the collapsed folds by the visible ranges, and the marker of a collapsed note moves to its line.
  editor.visibleRanges = [new FakeRange(0, 0, 0, 11), new FakeRange(5, 0, 6, 9), new FakeRange(11, 0, 12, 0)];
  fake.fire('visibleRanges', { textEditor: editor });
  expect(markerLines(editor)).toEqual([0, 6]);
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

test('a collapsed note at the start of the file hides its first line, except while the cursor is on it (R-TEXT-005)', async () => {
  const editor = await start(4, '<!-- note\nFirst\n-->\n\nText.\n');
  const [hidden] = typesOf(editor, 'textDecoration');
  expect(fake.calls[0].args).toEqual([{ levels: 1, direction: 'down', selectionLines: [0] }]);
  expect(editor.decorations.get(hidden)).toEqual([]);
  editor.visibleRanges = [new FakeRange(0, 0, 0, 9), new FakeRange(4, 0, 5, 0)];
  fake.fire('visibleRanges', { textEditor: editor });
  expect(editor.decorations.get(hidden)).toEqual([new FakeRange(0, 0, 0, 9)]);
  editor.selection = { active: new FakePosition(0, 3) };
  fake.fire('selection', { textEditor: editor });
  expect(editor.decorations.get(hidden)).toEqual([]);
});

test('"Collapse Note" collapses the note of its box, and the commands of the Command Palette collapse or expand all notes (R-TEXT-005)', async () => {
  await start(11);
  fake.calls.length = 0;
  const [, second] = fake.live();
  await fake.run(editorCommands.collapseNote, second);
  await fake.run(editorCommands.expandAll);
  await fake.run(editorCommands.collapseAll);
  expect(fake.calls.map(({ command, args }) => [command, (args[0] as { selectionLines: number[] }).selectionLines])).toEqual([
    ['editor.fold', [6]],
    ['editor.unfold', [0, 6]],
    ['editor.fold', [0, 6]],
  ]);
});

test('a selection has a highlight in the color of its note, and its markers vanish behind a bar or a dot, except on the line of the cursor (R-NOTE-006)', async () => {
  const content = 'The agents <!--[a1-->change the work<!--a1]--> of teams.\n<!-- note\n---\nselection: a1\n---\nWhich?\n-->\n\nA point <!--[a2]-->here.\n<!-- note\n---\nselection: a2\n---\nP\n-->\n';
  fake.settings.set('', { collapseInEditor: false });
  const editor = await start(7, content);
  const [first, second] = typesOf(editor, 'backgroundColor');
  expect(first.options).toMatchObject({ backgroundColor: `${noteColors[0]}33`, overviewRulerColor: noteColors[0] });
  expect(editor.decorations.get(first)).toEqual([new FakeRange(0, 21, 0, 36)]);
  // A point selects no text.
  expect(editor.decorations.get(second)).toEqual([]);
  const [hidden] = typesOf(editor, 'textDecoration');
  const [, faint] = typesOf(editor, 'opacity');
  const edges = attachmentType(editor, (before) => before.contentText === '' || before.contentText === '●');
  expect(editor.decorations.get(hidden)).toEqual([new FakeRange(0, 11, 0, 21), new FakeRange(0, 36, 0, 46), new FakeRange(8, 8, 8, 19)]);
  expect(editor.decorations.get(faint)).toEqual([]);
  const shown = editor.decorations.get(edges) as Attachment[];
  expect(shown.map(({ range }) => range)).toEqual([new FakeRange(0, 21, 0, 21), new FakeRange(0, 36, 0, 36), new FakeRange(8, 8, 8, 8)]);
  expect(shown.map(({ renderOptions }) => renderOptions.before)).toEqual([
    expect.objectContaining({ contentText: '', width: '2px', backgroundColor: colorOf(1) }),
    expect.objectContaining({ contentText: '', width: '2px', backgroundColor: colorOf(1) }),
    expect.objectContaining({ contentText: '●', color: colorOf(2) }),
  ]);
  // The marker of a note also stands at the first line of its selection, and only there while the note is collapsed.
  const markers = () => typesOf(editor, 'gutterIconPath').map((type) => editor.linesOf(type));
  expect(markers()).toEqual([
    [0, 1],
    [8, 9],
  ]);
  editor.visibleRanges = [new FakeRange(0, 0, 0, 56), new FakeRange(7, 0, 8, 33), new FakeRange(15, 0, 15, 0)];
  fake.fire('visibleRanges', { textEditor: editor });
  expect(markers()).toEqual([[0], [8]]);
  // On the line of the cursor the markers show as they are, dimmed.
  editor.selection = { active: new FakePosition(0, 3) };
  fake.fire('selection', { textEditor: editor });
  expect(editor.decorations.get(faint)).toEqual([new FakeRange(0, 11, 0, 21), new FakeRange(0, 36, 0, 46)]);
  expect(editor.decorations.get(hidden)).toEqual([new FakeRange(8, 8, 8, 19)]);
  expect(editor.linesOf(edges)).toEqual([8]);
});

test('each front matter collapses into one rendered line with the author and the date, except on the line of the cursor (R-TEXT-007)', async () => {
  const content = 'Intro.\n\n<!-- note\n---\nauthor: hannes\ndate: 2026-10-28T10:15+01:00\n---\nFirst\n---\nauthor: anna\n---\nSecond\n-->\n\nEnd.\n';
  fake.settings.set('', { collapseInEditor: false });
  const editor = await start(14, content);
  // The front matters collapse also when the notes stay open.
  expect(fake.calls).toEqual([{ command: 'editor.fold', args: [{ levels: 1, direction: 'down', selectionLines: [3, 8] }] }]);
  editor.visibleRanges = [new FakeRange(0, 0, 3, 3), new FakeRange(7, 0, 8, 3), new FakeRange(11, 0, 15, 0)];
  fake.fire('visibleRanges', { textEditor: editor });
  const headers = attachmentType(editor, (before) => before.fontStyle === 'italic');
  const rendered = () => (editor.decorations.get(headers) as Attachment[]).map(({ range, renderOptions }) => [range.start.line, renderOptions.before.contentText]);
  expect(rendered()).toEqual([
    [3, 'hannes · 2026-10-28 10:15'],
    [8, 'anna'],
  ]);
  expect((editor.decorations.get(headers) as Attachment[])[0].renderOptions.before.color).toEqual(new FakeThemeColor('descriptionForeground'));
  const [hidden] = typesOf(editor, 'textDecoration');
  expect(editor.decorations.get(hidden)).toEqual([new FakeRange(3, 0, 3, 3), new FakeRange(8, 0, 8, 3)]);
  // On the line of the cursor the first line of the front matter shows as it is.
  editor.selection = { active: new FakePosition(8, 1) };
  fake.fire('selection', { textEditor: editor });
  expect(rendered()).toEqual([[3, 'hannes · 2026-10-28 10:15']]);
  expect(editor.decorations.get(hidden)).toEqual([new FakeRange(3, 0, 3, 3)]);
});

test('a new front matter collapses when it appears, and a front matter that the user opened stays open (R-TEXT-007)', async () => {
  fake.settings.set('', { collapseInEditor: false });
  const editor = await start(0, 'Intro.\n\n<!-- note\n---\nauthor: hannes\n---\nFirst\n-->\n');
  expect(fake.calls.map(({ args }) => (args[0] as { selectionLines: number[] }).selectionLines)).toEqual([[3]]);
  // An answer adds a front matter; the first one stays as the user left it.
  const edit = new FakeWorkspaceEdit();
  edit.replace(editor.document.uri, new FakeRange(7, 0, 7, 0), '---\nauthor: anna\n---\nSecond\n');
  await fake.applyEdit(edit);
  await vi.advanceTimersByTimeAsync(1000);
  expect(fake.calls.map(({ args }) => (args[0] as { selectionLines: number[] }).selectionLines)).toEqual([[3], [7]]);
});
