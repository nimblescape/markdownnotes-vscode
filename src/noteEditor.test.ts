// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests run the overlay of the notes in the text editor
 * ([src/noteEditor.ts](noteEditor.ts)) with a fake of the API of VS Code
 * ([src/testing/fakeVscode.ts](testing/fakeVscode.ts)): the collapse of the
 * notes the first time a file is in the active editor, which repeats while
 * VS Code reads the folds anew, and the collapse of a note that VS Code opens
 * (R-TEXT-005); the highlights in the colors of the notes while the setting
 * showHighlights is on and the side view is open, the hidden highlight under
 * the pointer and the strong highlight of the selected note, and the hidden
 * start markers and references (R-NOTE-006); the cursor and the keys next to
 * a hidden marker; and the rendered header lines with the time of the author
 * on hover (R-TEXT-007). The tests run in the zone Europe/Vienna
 * (vitest.config.mts), which is UTC+01:00 on 2026-10-28.
 */

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { noteColors } from './notes/colors';
import { doctypeLines } from './notes/doctype';
import { deleteCommands, keepTime, markerContexts, settleTime } from './noteEditor';
import { notesViewId } from './notesView';
import { Fake, FakeEditor, FakePosition, FakeRange, FakeThemeColor, FakeUri, type FakeView, settle } from './testing/fakeVscode';

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

/** hannes and anna are the header lines of two notes. */
const hannes = '[^note-aaaa]: **hannes** · 2026-10-28 10:15+01:00';
const anna = '[^note-bbbb]: **anna** · 2026-10-28 11:02+01:00';

/**
 * text is a Markdown text with two notes after two paragraphs, on lines 2 to 4 and 8 to 10, whose references end the
 * first lines of the paragraphs.
 */
const text = ['Intro text[^note-aaaa].', '', hannes, '', '    First', '', 'More text[^note-bbbb]', '', anna, '', '    Second', '', 'end of it.', ''].join('\n');

/**
 * highlighted is a Markdown text with two highlights: of a note in the default color on line 0 from character 33 to 48,
 * and of a green note on line 6 from character 33 to 37.
 */
const highlighted = [
  'The agents <wbr><!--[note-aaaa-->change the work[^note-aaaa] of teams.',
  '',
  hannes,
  '',
  '    Which?',
  '',
  'More <wbr><!--[note-bbbb green-->text[^note-bbbb].',
  '',
  anna,
  '',
  '    B',
  '',
  'End.',
].join('\n');

/** DecorationType is a decoration type of the fake, with the options of its creation. */
type DecorationType = { options: Record<string, unknown> };

/** Attachment is a decoration with a `before` attachment of its own. */
type Attachment = { range: FakeRange; renderOptions: { before: Record<string, unknown> } };

/** styles are the beginnings of the styles of the text of the highlights of each kind. */
const styles = { shown: 'underline 2px ', faint: 'underline 1px ', strong: 'none; background-color: ' } as const;

/**
 * highlightsOf returns the highlights of a kind in an editor: the color and the ranges of each decoration type with
 * ranges.
 * @param editor - The editor.
 * @param kind - The kind of the highlights: shown, faint for the other notes while a note is selected, or strong for
 * the selected note.
 */
const highlightsOf = (editor: FakeEditor, kind: keyof typeof styles): [string, FakeRange[]][] =>
  [...editor.decorations.entries()]
    .map(([type, items]) => [String((type as DecorationType).options.textDecoration), items] as const)
    .filter(([style, items]) => style.startsWith(styles[kind]) && items.length > 0)
    .map(([style, items]) => [style.slice(styles[kind].length, styles[kind].length + 7), items as FakeRange[]]);

/**
 * hiddenOf returns the hidden ranges of an editor: the markers, the header lines and the first lines of collapsed notes.
 * @param editor - The editor.
 */
const hiddenOf = (editor: FakeEditor): FakeRange[] =>
  [...editor.decorations.entries()].find(([type]) => (type as DecorationType).options.textDecoration === 'none; display: none;')?.[1] as FakeRange[];

/**
 * headersOf returns the rendered headers of an editor: the range and the text of each one, and its hover.
 * @param editor - The editor.
 */
const headersOf = (editor: FakeEditor): (Attachment & { hoverMessage: string })[] =>
  ([...editor.decorations.entries()].find(([type]) => Object.keys((type as DecorationType).options).length === 0)?.[1] ?? []) as (Attachment & { hoverMessage: string })[];

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
  await settle();
  return editor;
};

/** openView opens the side view, as VS Code does when the user opens it. */
const openView = (): FakeView => fake.resolveView(notesViewId);

/**
 * closeView closes the side view, as VS Code does when the user closes it.
 * @param view - The side view.
 */
const closeView = (view: FakeView): void => {
  view.visible = false;
  view.visibility.forEach((listener) => listener());
};

/**
 * fold returns the call of the fold command of VS Code for lines.
 * @param lines - The first lines of the folds.
 */
const fold = (...lines: number[]) => ({ command: 'editor.fold', args: [{ levels: 1, direction: 'down', selectionLines: lines }] });

test('the notes collapse the first time their file is in the active editor, into the line of text before them (R-TEXT-005)', async () => {
  const editor = await start(12);
  expect(fake.calls.filter(({ command }) => command === 'editor.fold')).toEqual([fold(0, 6)]);
  fake.calls.length = 0;
  // The file collapses only once: a note that VS Code opens collapses again after VS Code read its folds.
  fake.fire('activeEditor', editor);
  await settle();
  expect(fake.calls.filter(({ command }) => command === 'editor.fold')).toEqual([]);
  // After the file closes, it collapses again when it opens again.
  fake.fire('close', editor.document);
  fake.fire('activeEditor', editor);
  await settle();
  expect(fake.calls.filter(({ command }) => command === 'editor.fold')).toEqual([fold(0, 6)]);
  // After no text editor showed the file, for example while its clean editing view showed, it collapses again.
  fake.calls.length = 0;
  fake.fire('visibleEditors', []);
  fake.fire('visibleEditors', [editor]);
  fake.fire('activeEditor', editor);
  await settle();
  expect(fake.calls.filter(({ command }) => command === 'editor.fold')).toEqual([fold(0, 6)]);
});

test('a fold command waits for the edits of the extension, and folds the lines of the notes in the changed document (R-TEXT-005)', async () => {
  // A click on a highlight in the preview shows the notes of the file in the side view, without its text editor.
  const editor = new FakeEditor(fake.open(text), 12);
  fake.editors.push(editor);
  const { extension } = await fake.activate();
  const view = openView();
  await view.send({ type: 'ready' });
  await fake.uriHandler!.handleUri(FakeUri.parse(`vscode://${extension.extensionId}${extension.openPath}?${new URLSearchParams({ document: editor.document.uri.toString(), line: '2' }).toString()}`));
  await settle();
  // A change of the color in the side view, which VS Code applies only later, gives the file the comment of the
  // format at its top, which moves the notes down. The text editor of the file becomes active in the meantime.
  let release = (): void => undefined;
  fake.held = new Promise((resolve) => (release = resolve));
  const colored = view.send({ type: 'color', id: view.state().threads[0].id, color: 'green' });
  await settle();
  fake.activeEditor = editor;
  fake.fire('activeEditor', editor);
  await settle();
  expect(fake.calls.filter(({ command }) => command === 'editor.fold')).toEqual([]);
  release();
  await colored;
  await settle();
  expect(editor.document.text.startsWith('<!-- nimblescape-markdown-notes ')).toBe(true);
  // The folds of the notes, at their lines after the edit; the new comment of the format folds after VS Code read the
  // folds of the changed file, as every fold that shows open.
  const added = doctypeLines.length + 1;
  expect(fake.calls.filter(({ command }) => command === 'editor.fold')).toEqual([fold(added, 6 + added)]);
});
test('a collapsed note at the start of the file hides its first line, and the cursor does not stay on it (R-TEXT-005, R-TEXT-007)', async () => {
  const editor = await start(4, `${hannes}\n\n    First\n\nText[^note-aaaa].\n`);
  const first = new FakeRange(0, 0, 0, hannes.length);
  const reference = new FakeRange(4, 4, 4, 16);
  expect(fake.calls.filter(({ command }) => command === 'editor.fold')).toEqual([fold(0)]);
  // The reference vanishes also on the line of the cursor, and the first line of the collapsed note, which stays, shows
  // its header rendered.
  editor.visibleRanges = [new FakeRange(0, 0, 0, hannes.length), new FakeRange(4, 0, 5, 0)];
  fake.fire('visibleRanges', { textEditor: editor });
  expect(hiddenOf(editor)).toEqual([first, reference, first]);
  expect(headersOf(editor).map(({ range, renderOptions }) => [range, renderOptions.before.contentText])).toEqual([[first, 'hannes · 2026-10-28 10:15']]);
  // A cursor on the hidden first line goes past the collapsed note to the next line of text, which VS Code shows.
  editor.selection = { active: new FakePosition(0, 3) };
  fake.fire('selection', { textEditor: editor });
  expect(editor.selection.active).toEqual(new FakePosition(4, 0));
});

test('the first collapse repeats each time VS Code reads the folds of the unchanged document anew, for a short time, because a fold before the reading has no effect (R-TEXT-005)', async () => {
  const editor = await start(12);
  const provider = fake.folding.get('markdown')!;
  const folds = () => fake.calls.filter(({ command }) => command === 'editor.fold');
  expect(folds()).toEqual([fold(0, 6)]);
  // VS Code reads the folds anew when another extension registers a folding provider.
  provider.provideFoldingRanges(editor.document);
  await vi.advanceTimersByTimeAsync(0);
  expect(folds()).toEqual([fold(0, 6), fold(0, 6)]);
  // The fold commands act on the active editor, so another file there stops the repetition.
  fake.activeEditor = new FakeEditor(fake.open('Other.', '/folder/b.md'));
  provider.provideFoldingRanges(editor.document);
  await vi.advanceTimersByTimeAsync(0);
  fake.activeEditor = editor;
  expect(folds()).toHaveLength(2);
  // A change of the document ends the repetition.
  editor.document.version++;
  provider.provideFoldingRanges(editor.document);
  await vi.advanceTimersByTimeAsync(0);
  editor.document.version--;
  provider.provideFoldingRanges(editor.document);
  await vi.advanceTimersByTimeAsync(0);
  expect(folds()).toHaveLength(2);
});

test('the first collapse repeats only for the time of settleTime (R-TEXT-005)', async () => {
  const editor = await start(12);
  vi.advanceTimersByTime(settleTime + 1);
  fake.folding.get('markdown')!.provideFoldingRanges(editor.document);
  await vi.advanceTimersByTimeAsync(0);
  expect(fake.calls.filter(({ command }) => command === 'editor.fold')).toHaveLength(1);
});

test('the notes stay collapsed: a fold that VS Code opens collapses again, and a cursor leaves the lines of a collapsed note (R-TEXT-005)', async () => {
  const editor = await start(12);
  const folds = () => fake.calls.filter(({ command }) => command === 'editor.fold');
  fake.calls.length = 0;
  // The editor folds again only after VS Code read the folds of this version of the document, so that the fold
  // command does not act on another region, for example of a heading.
  editor.visibleRanges = [new FakeRange(0, 0, 13, 0)];
  fake.fire('visibleRanges', { textEditor: editor });
  await settle();
  expect(folds()).toEqual([]);
  vi.advanceTimersByTime(settleTime + 1);
  fake.folding.get('markdown')!.provideFoldingRanges(editor.document);
  await vi.advanceTimersByTimeAsync(keepTime);
  expect(folds()).toEqual([fold(0, 6)]);
  // VS Code shows both notes collapsed, and then opens the second one, for example for a search.
  editor.visibleRanges = [new FakeRange(0, 0, 0, 23), new FakeRange(5, 0, 6, 21), new FakeRange(11, 0, 13, 0)];
  fake.fire('visibleRanges', { textEditor: editor });
  await settle();
  expect(folds()).toHaveLength(1);
  editor.visibleRanges = [new FakeRange(0, 0, 0, 23), new FakeRange(5, 0, 13, 0)];
  fake.fire('visibleRanges', { textEditor: editor });
  await settle();
  expect(folds()).toEqual([fold(0, 6), fold(6)]);
  // A cursor in a collapsed note goes to the line of text before it on a move up.
  editor.visibleRanges = [new FakeRange(0, 0, 0, 23), new FakeRange(5, 0, 6, 21), new FakeRange(11, 0, 13, 0)];
  fake.fire('visibleRanges', { textEditor: editor });
  for (const line of [12, 4]) {
    editor.selection = { active: new FakePosition(line, 2) };
    fake.fire('selection', { textEditor: editor });
  }
  expect(editor.selection.active).toEqual(new FakePosition(0, 23));
  await settle();
  // A cursor in a note that VS Code opened for it, for example after "Go to Line", leaves it, and the note collapses.
  fake.calls.length = 0;
  editor.selection = { active: new FakePosition(9, 4) };
  editor.visibleRanges = [new FakeRange(0, 0, 0, 23), new FakeRange(5, 0, 13, 0)];
  fake.fire('visibleRanges', { textEditor: editor });
  await settle();
  expect(editor.selection.active).toEqual(new FakePosition(11, 0));
  expect(folds()).toEqual([fold(6)]);
});

test('while the side view is open, each highlight has a clear background and a line below it in the color of its note, and the overview ruler a mark (R-NOTE-006, R-GEN-011)', async () => {
  const editor = await start(12, highlighted);
  // The highlights show only while the side view is open (Hannes, 2026-10-28: "closing the side view, also hides the
  // highlights").
  expect(highlightsOf(editor, 'shown')).toEqual([]);
  const view = openView();
  expect(highlightsOf(editor, 'shown')).toEqual([
    [noteColors[0], [new FakeRange(0, 33, 0, 48)]],
    [noteColors[1], [new FakeRange(6, 33, 6, 37)]],
  ]);
  const type = [...editor.decorations.keys()].find((candidate) => String((candidate as DecorationType).options.textDecoration).startsWith(`underline 2px ${noteColors[1]}`)) as DecorationType;
  // A style of the text stays on the text also after a hidden marker, where VS Code places a background too far right.
  expect(type.options).toEqual({ textDecoration: `underline 2px ${noteColors[1]}; text-underline-offset: 3px; background-color: ${noteColors[1]}47;`, overviewRulerColor: noteColors[1], overviewRulerLane: 2 });
  expect(fake.calls).toContainEqual({ command: 'setContext', args: ['nimblescape.markdownNotes.highlightsShown', true] });
  // Closing the side view hides the highlights again, and the setting stays as it is.
  closeView(view);
  expect(highlightsOf(editor, 'shown')).toEqual([]);
  expect(fake.calls.at(-2)).toEqual({ command: 'setContext', args: ['nimblescape.markdownNotes.highlightsShown', false] });
  expect(fake.updates).toEqual([]);
});

test('the setting showHighlights off hides the highlights also while the side view is open (R-GEN-011)', async () => {
  const editor = await start(12, highlighted);
  openView();
  fake.settings.set('', { showHighlights: false });
  fake.fire('configuration', { affectsConfiguration: () => true });
  expect(highlightsOf(editor, 'shown')).toEqual([]);
  fake.settings.set('', { showHighlights: true });
  fake.fire('configuration', { affectsConfiguration: () => true });
  expect(highlightsOf(editor, 'shown')).toHaveLength(2);
});

test('a hidden highlight shows while the pointer rests on its text, until the pointer rests on other text or the cursor moves, and the extension shows no hover for it (R-NOTE-006)', async () => {
  const editor = await start(12, highlighted);
  // VS Code asks the hover providers when the pointer rests on the text.
  expect(fake.hover(editor.document, new FakePosition(6, 35))).toEqual([]);
  expect(highlightsOf(editor, 'shown')).toEqual([[noteColors[1], [new FakeRange(6, 33, 6, 37)]]]);
  fake.hover(editor.document, new FakePosition(0, 40));
  expect(highlightsOf(editor, 'shown')).toEqual([[noteColors[0], [new FakeRange(0, 33, 0, 48)]]]);
  // The text after a highlight, and the marker before it, are no text of the highlight.
  fake.hover(editor.document, new FakePosition(0, 48));
  expect(highlightsOf(editor, 'shown')).toEqual([]);
  fake.hover(editor.document, new FakePosition(6, 35));
  editor.selection = { active: new FakePosition(12, 1) };
  fake.fire('selection', { textEditor: editor, kind: 1 });
  expect(highlightsOf(editor, 'shown')).toEqual([]);
});

test('the highlight of the selected note is strong with a frame in its color, also while the highlights are hidden, and the highlights of the other notes are dimmed (R-SIDE-007)', async () => {
  const editor = await start(12, highlighted);
  const view = openView();
  // A mouse click into the highlight of the first note selects it.
  editor.selection = { active: new FakePosition(0, 40) };
  fake.fire('selection', { textEditor: editor, kind: 2 });
  await vi.runAllTimersAsync();
  expect(highlightsOf(editor, 'strong')).toEqual([[noteColors[0], [new FakeRange(0, 33, 0, 48)]]]);
  expect(highlightsOf(editor, 'shown')).toEqual([]);
  expect(highlightsOf(editor, 'faint')).toEqual([[noteColors[1], [new FakeRange(6, 33, 6, 37)]]]);
  const type = [...editor.decorations.keys()].find((candidate) => String((candidate as DecorationType).options.textDecoration).startsWith(`none; background-color: ${noteColors[0]}`)) as DecorationType;
  expect(type.options).toMatchObject({ textDecoration: `none; background-color: ${noteColors[0]}73; outline: 1px solid ${noteColors[0]}; border-radius: 3px;`, overviewRulerLane: 7 });
  // With the side view closed, only the selected note keeps its highlight.
  closeView(view);
  expect(highlightsOf(editor, 'strong')).toEqual([[noteColors[0], [new FakeRange(0, 33, 0, 48)]]]);
  expect(highlightsOf(editor, 'faint')).toEqual([]);
  // A mouse click outside the notes deselects the note.
  editor.selection = { active: new FakePosition(12, 1) };
  fake.fire('selection', { textEditor: editor, kind: 2 });
  await vi.runAllTimersAsync();
  expect(highlightsOf(editor, 'strong')).toEqual([]);
});

test('the start markers and the references vanish, also on the line of the cursor, and a note at a point shows no highlight (R-NOTE-006)', async () => {
  const content = ['The agents <wbr><!--[note-aaaa-->change the work[^note-aaaa] of teams.', '', hannes, '', '    Which?', '', 'A point <!--[note-bbbb-->[^note-bbbb]here.', '', anna, '', '    P', ''].join('\n');
  const editor = await start(11, content);
  openView();
  expect(highlightsOf(editor, 'shown')).toEqual([[noteColors[0], [new FakeRange(0, 33, 0, 48)]]]);
  const markers = [new FakeRange(0, 11, 0, 33), new FakeRange(0, 48, 0, 60), new FakeRange(6, 8, 6, 37)];
  const headers = [new FakeRange(2, 0, 2, hannes.length), new FakeRange(8, 0, 8, anna.length)];
  expect(hiddenOf(editor)).toEqual([...markers, ...headers]);
  // On the line of the cursor the start marker and the reference stay hidden (Hannes, 2026-10-28).
  editor.selection = { active: new FakePosition(0, 3) };
  fake.fire('selection', { textEditor: editor });
  expect(hiddenOf(editor)).toEqual([...markers, ...headers]);
});

test('the cursor steps over a hidden marker in the direction of its move, or to the nearer edge after a click, and the keys that delete next to a marker keep it (R-NOTE-006)', async () => {
  const editor = await start(4, ['The agents <wbr><!--[note-aaaa-->change the work[^note-aaaa] of teams.', '', hannes, '', '    Which?', ''].join('\n'));
  const move = (line: number, character: number) => {
    editor.selection = { active: new FakePosition(line, character) };
    fake.fire('selection', { textEditor: editor, kind: 1 });
    return editor.selection.active;
  };
  move(0, 11);
  // A step to the right into the start marker goes to its end, a step to the left to its start.
  expect(move(0, 12)).toEqual(new FakePosition(0, 33));
  expect(move(0, 32)).toEqual(new FakePosition(0, 11));
  // A cursor that comes from another line goes to the nearer edge.
  move(4, 0);
  expect(move(0, 57)).toEqual(new FakePosition(0, 60));
  const document = editor.document;
  const contexts = () => fake.calls.filter(({ command, args }) => command === 'setContext' && String(args[0]).startsWith('nimblescape.markdownNotes.marker')).map(({ args }) => args);
  // At the end of the start marker, Backspace deletes the space before it, and the cursor stays after the marker.
  move(0, 33);
  expect(contexts().at(-1)).toEqual([markerContexts.left, true]);
  await fake.run(deleteCommands.left);
  expect(document.text.split('\n')[0]).toBe('The agents<wbr><!--[note-aaaa-->change the work[^note-aaaa] of teams.');
  expect(editor.selection.active).toEqual(new FakePosition(0, 32));
  // At the start of the reference, Delete deletes the space after it; the word keys delete the word on the other side.
  move(0, 47);
  await fake.run(deleteCommands.right);
  expect(document.text.split('\n')[0]).toBe('The agents<wbr><!--[note-aaaa-->change the work[^note-aaaa]of teams.');
  move(0, 59);
  await fake.run(deleteCommands.wordLeft);
  expect(document.text.split('\n')[0]).toBe('The agents<wbr><!--[note-aaaa-->change the [^note-aaaa]of teams.');
  // Without a marker next to the cursor, the keys run the commands of VS Code.
  fake.calls.length = 0;
  move(0, 2);
  await fake.run(deleteCommands.wordRight);
  expect(fake.calls.map(({ command }) => command)).toEqual(['setContext', 'deleteWordRight']);
});

test('each header line of an open note shows as one rendered line with the author and the date in the local time of the reader, the time of the author on hover, also on the line of the cursor (R-TEXT-007, R-NOTE-002)', async () => {
  const reply = '    > **anna** · 2026-10-28 09:02-02:00';
  const content = ['Intro[^note-aaaa].', '', hannes, '', '    First', '', reply, '    >', '    > Second', '', 'End.', ''].join('\n');
  const editor = await start(10, content);
  const rendered = () => headersOf(editor).map(({ range, renderOptions }) => [range, renderOptions.before.contentText]);
  // The quote markers of a reply stay.
  expect(rendered()).toEqual([
    [new FakeRange(2, 0, 2, hannes.length), 'hannes · 2026-10-28 10:15'],
    [new FakeRange(6, 6, 6, reply.length), 'anna · 2026-10-28 12:02'],
  ]);
  const [own, other] = headersOf(editor);
  expect(own.renderOptions.before).toEqual({ contentText: 'hannes · 2026-10-28 10:15', color: new FakeThemeColor('descriptionForeground'), fontStyle: 'italic' });
  expect([own.hoverMessage, other.hoverMessage]).toEqual(['2026-10-28 10:15 at the author (UTC+01:00)', '2026-10-28 09:02 at the author (UTC−02:00)']);
  expect(hiddenOf(editor)).toEqual([new FakeRange(0, 5, 0, 17), new FakeRange(2, 0, 2, hannes.length), new FakeRange(6, 6, 6, reply.length)]);
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
  const before = editor.document.text;
  await fake.run(deleteCommands.right);
  editor.selection = { active: new FakePosition(7, 0) };
  fake.fire('selection', { textEditor: editor });
  await fake.run(deleteCommands.left);
  await fake.run(deleteCommands.wordLeft);
  expect(editor.document.text).toBe(before);
  // While the note is collapsed, its headers show nothing: VS Code would show their text at the end of the line of the
  // fold.
  editor.visibleRanges = [new FakeRange(0, 0, 0, 17), new FakeRange(9, 0, 11, 0)];
  fake.fire('visibleRanges', { textEditor: editor });
  expect(rendered()).toEqual([]);
});
