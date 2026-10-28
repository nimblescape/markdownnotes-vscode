// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests run the overlay of the notes in the text editor
 * ([src/noteEditor.ts](noteEditor.ts)) with a fake of the API of VS Code
 * ([src/testing/fakeVscode.ts](testing/fakeVscode.ts)): the dimming after the
 * cursor (R-TEXT-003), the collapse of the notes the first time a file is in
 * the active editor and the commands of the folds (R-TEXT-005), and the
 * markers in the left margin (R-TEXT-006).
 */

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { colorOf, editorCommands, markerImage, noteColors } from './noteEditor';
import { Fake, FakeEditor, FakePosition, FakeRange } from './testing/fakeVscode';

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
