// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests run the clean editing view
 * ([R-TEXT-009](../docs/requirements.md#r-text-009)) with a fake of the API of
 * VS Code ([src/testing/fakeVscode.ts](testing/fakeVscode.ts)), as VS Code
 * reads its documents and reports their changes: the text of a file without
 * the notes markup and the highlights at their text, the edits of the view in
 * the file, also typed over the last word of a highlight, Undo, a change of
 * the file from elsewhere, the save, the strong highlight of the selected
 * note, a text editor of a file with notes that becomes the view, the command
 * "Open File with Markup", a close of the view without a save, and the text
 * of the Markdown preview of the view.
 */

import { beforeEach, expect, test, vi } from 'vitest';
import type { CleanView } from './cleanView';
import type { SelectedNotes } from './selectedNotes';
import { Fake, FakeDocument, FakeEditor, type FakePosition, FakeRange, FakeSelection, type FakeSnippetString, type FakeTab, FakeTabInputCustom, FakeTabInputText, FakeUri, settle } from './testing/fakeVscode';

vi.mock('vscode', () => ({}));

/** fake is the fake API of the test. */
let fake: Fake;

beforeEach(() => {
  fake = new Fake();
  vi.resetModules();
  vi.doMock('vscode', () => fake.api);
});

/** text is a file with two notes in one paragraph and a paragraph after their definitions. */
const text = [
  'The agents <wbr><!--[note-7k2q green-->change the work[^note-7k2q] of <wbr><!--[note-m3x8-->teams[^note-m3x8].',
  '',
  '[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00',
  '',
  '    Which ways?',
  '',
  '[^note-m3x8]: **anna** · 2026-10-28 11:02+01:00',
  '',
  '    All teams?',
  '',
  'The next paragraph.',
  '',
].join('\n');

/** clean is the clean text of the file. */
const clean = 'The agents change the work of teams.\n\nThe next paragraph.\n';

/**
 * opened returns the clean view, the file and the clean document of the file in a visible text editor, as VS Code
 * opens it: it reads the clean text from the file system of the view.
 * @param file - The text of the file.
 * @param showsFootnotes - Tells whether the side view shows the standard footnotes.
 */
async function opened(file = text, showsFootnotes?: () => boolean): Promise<{ view: CleanView; selected: SelectedNotes; real: FakeDocument; document: FakeDocument; editor: FakeEditor }> {
  const { CleanView, cleanUriOf } = await import('./cleanView');
  const { SelectedNotes } = await import('./selectedNotes');
  const selected = new SelectedNotes();
  const view = new CleanView(() => true, selected, showsFootnotes);
  view.register();
  const real = fake.open(file);
  const uri = cleanUriOf(real.uri as never);
  const content = new TextDecoder().decode(await view.readFile(uri));
  const document = new FakeDocument(uri as never, content);
  fake.documents.push(document);
  const editor = fake.show(document, { viewColumn: 1 });
  fake.fire('visibleEditors', fake.editors);
  await settle();
  return { view, selected, real, document, editor };
}

/**
 * inEditor shows a file in a visible text editor of the first group with its tab, as VS Code opens a file of the
 * Explorer, starts the clean view, and waits until it took the text editor.
 * @param options - The cursor in the file, the text of the file, its changes that are not saved, the input of its tab,
 * and whether the editor of a whole file shows the file in the second group, as after "Open Text Editor to the Side".
 */
async function inEditor(options: { offset?: number; content?: string; dirty?: boolean; input?: (uri: unknown) => unknown; rendered?: boolean } = {}) {
  const { CleanView } = await import('./cleanView');
  const { SelectedNotes } = await import('./selectedNotes');
  const content = options.content ?? text;
  fake.files.set('/folder/a.md', content);
  const real = fake.open(content);
  real.isDirty = options.dirty ?? false;
  const editor = new FakeEditor(real, 0, 1);
  editor.selection = { active: real.positionAt(options.offset ?? 0) };
  const tab: FakeTab = { input: options.input ? options.input(real.uri) : new FakeTabInputText(real.uri), isPreview: true };
  fake.editors.push(editor);
  fake.activeEditor = editor;
  fake.tabGroups.push({ viewColumn: 1, tabs: [tab], activeTab: tab });
  const custom: FakeTab = { input: new FakeTabInputCustom(real.uri, 'nimblescape.markdownNotes.editor') };
  if (options.rendered) {
    fake.tabGroups.push({ viewColumn: 2, tabs: [custom], activeTab: custom });
  }
  const view = new CleanView(() => true, new SelectedNotes());
  view.register();
  await settle();
  await settle();
  return { view, real, tab, custom };
}

/**
 * closeView closes the tab of the view, as the user does, with the events of VS Code.
 * @param document - The clean document.
 */
async function closeView(document: FakeDocument): Promise<void> {
  const tabs = fake.tabGroups.flatMap((group) => group.tabs.filter((tab) => (tab.input as FakeTabInputText).uri === document.uri));
  await (fake.api.window as { tabGroups: { close(tabs: FakeTab[]): Promise<boolean> } }).tabGroups.close(tabs);
  fake.editors = fake.editors.filter((editor) => editor.document !== document);
  fake.fire('tabs', {});
  fake.fire('visibleEditors', fake.editors);
  fake.fire('close', document);
  await settle();
  await settle();
}

/**
 * typeIn changes the clean document as VS Code does for a key: the text from `start` to `end` becomes `insert`, and
 * the change event follows.
 * @param document - The clean document.
 * @param start - The offset of the start of the change.
 * @param end - The offset of the end of the change.
 * @param insert - The new text.
 */
function typeIn(document: FakeDocument, start: number, end: number, insert: string): void {
  const range = new FakeRange(document.positionAt(start), document.positionAt(end));
  document.text = document.text.slice(0, start) + insert + document.text.slice(end);
  document.version++;
  fake.fire('change', { document, contentChanges: [{ range, rangeOffset: start, rangeLength: end - start, text: insert }] });
}

/**
 * moved reports a move of the cursor of the clean editor, which VS Code reports late, also after the next change.
 * @param editor - The text editor of the clean document.
 * @param offset - The offset of the cursor.
 * @param kind - The kind of the move: undefined after an edit, 1 for a key, 2 for the mouse.
 */
function moved(editor: FakeEditor, offset: number, kind?: number): void {
  const position = editor.document.positionAt(offset);
  fake.fire('selection', { textEditor: editor, selections: [new FakeSelection(position, position)], kind });
}

/**
 * highlighted returns the texts of an editor with a decoration of a style, for example `outline` for the strong
 * highlight of the selected note.
 * @param editor - The text editor.
 * @param style - A part of the style of the decoration.
 */
function highlighted(editor: FakeEditor, style: string): string[] {
  return [...editor.decorations]
    .filter(([type]) => String((type as { options: { textDecoration: string } }).options.textDecoration).includes(style))
    .flatMap(([, ranges]) => ranges.map((range) => editor.document.getText('range' in range ? range.range : range)));
}

test('shows the text of a file without the notes markup, with the highlights of the notes at their text', async () => {
  const { document, editor } = await opened();
  expect(document.getText()).toBe(clean);
  expect(highlighted(editor, 'underline 2px').sort()).toEqual(['change the work', 'teams']);
});

test('names the place in the file of a place in the view before the hidden markup there, or after it', async () => {
  const { view, real, document } = await opened();
  const start = document.positionAt(clean.indexOf('change'));
  const marker = real.text.indexOf('<wbr><!--[note-7k2q');
  expect(view.toReal(document.uri as never, start as never)).toEqual(real.positionAt(marker));
  expect(view.toReal(document.uri as never, start as never, true)).toEqual(real.positionAt(real.text.indexOf('change')));
});

test('writes typed text into the file: outside a highlight at its edges, in it inside its text', async () => {
  const { real, document } = await opened();
  typeIn(document, clean.indexOf(' of teams'), clean.indexOf(' of teams'), ' and more');
  await settle();
  typeIn(document, document.text.indexOf('teams'), document.text.indexOf('teams'), 'all ');
  await settle();
  typeIn(document, document.text.indexOf('work'), document.text.indexOf('work'), 'whole ');
  await settle();
  expect(real.text).toContain('<!--[note-7k2q green-->change the whole work[^note-7k2q] and more of all <wbr><!--[note-m3x8-->teams[^note-m3x8].');
  expect(document.getText()).toBe('The agents change the whole work and more of all teams.\n\nThe next paragraph.\n');
});

test('keeps each letter typed over the last word of a highlight in it, as VS Code types over a selection', async () => {
  const { real, document, editor } = await opened();
  // VS Code types "job" over "work" as a replacement with "j" and the insertions of "o" and "b", and reports the
  // moves of the cursor late.
  const start = clean.indexOf('work');
  typeIn(document, start, start + 4, 'j');
  typeIn(document, start + 1, start + 1, 'o');
  moved(editor, start + 1);
  typeIn(document, start + 2, start + 2, 'b');
  moved(editor, start + 2);
  moved(editor, start + 3);
  await settle();
  expect(real.text).toContain('change the job[^note-7k2q] of');
  // After a move of the cursor elsewhere, typed text at the end of the highlight stays outside of it.
  moved(editor, 0, 2);
  moved(editor, start + 3, 2);
  typeIn(document, start + 3, start + 3, 's');
  await settle();
  expect(real.text).toContain('change the job[^note-7k2q]s of');
});

test('brings back the file as it was for Undo, with each note at its place', async () => {
  const { real, document } = await opened();
  // Two line breaks in a highlight end it there and move its definition after its paragraph.
  const at = clean.indexOf(' work');
  typeIn(document, at, at, '\n\n');
  await settle();
  expect(real.text).toContain('change the[^note-7k2q]\n\n[^note-7k2q]:');
  typeIn(document, at, at + 2, '');
  await settle();
  expect(real.text).toBe(text);
});

test('shows a change of the file from elsewhere, for example a new note of the side view', async () => {
  const { real, document } = await opened();
  const edit = new (fake.api.WorkspaceEdit as new () => { replace(uri: unknown, range: FakeRange, text: string): void })();
  edit.replace(real.uri, new FakeRange(real.positionAt(text.length), real.positionAt(text.length)), '\nAn added line.\n');
  await fake.applyEdit(edit as never);
  await settle();
  expect(document.getText()).toBe(`${clean}\nAn added line.\n`);
});

test('hides the definitions of the standard footnotes while the side view shows them, keeps one typed in the view, and shows them when the side view does not (R-TEXT-009, R-FOOT-001)', async () => {
  let shows = true;
  const footnoted = text.replace('The next paragraph.\n', 'The next paragraph.[^1]\n\n[^1]: A source.\n');
  const { view, real, document } = await opened(footnoted, () => shows);
  expect(document.getText()).toBe('The agents change the work of teams.\n\nThe next paragraph.[^1]\n');
  // A footnote typed in the view stays there, as the user types it, and goes into the file.
  typeIn(document, document.text.length, document.text.length, '\nAlso.[^2]\n\n[^2]: Typed.\n');
  await settle();
  expect(document.getText()).toContain('[^2]: Typed.');
  expect(real.text).toContain('[^1]: A source.\n');
  expect(real.text).toContain('[^2]: Typed.\n');
  // Without the footnotes in the side view, the view shows their definitions.
  shows = false;
  view.showsChanged();
  await settle();
  expect(document.getText()).toContain('[^1]: A source.');
  shows = true;
  view.showsChanged();
  await settle();
  expect(document.getText()).toBe('The agents change the work of teams.\n\nThe next paragraph.[^1]\n\nAlso.[^2]\n');
  expect(real.text).toContain('[^2]: Typed.\n');
});

/** paperSchema is the schema of the front matter of a paper: the key layout read-only, and the key kind a required choice. */
const paperSchema = {
  type: 'object',
  properties: { layout: { type: 'string', readOnly: true }, title: { type: 'string' }, kind: { type: 'string', enum: ['Bachelor', 'Master'], default: 'Bachelor' } },
  required: ['layout', 'title', 'kind'],
};

test('edits the front matter as text, and with the rules of another extension keeps the keys of the schema and the read-only keys, with problems, quick fixes and suggestions (R-TEXT-009, decision 75)', async () => {
  const { frontMatterKept } = await import('./cleanView');
  const titled = `---\nlayout: pht/thesis\ntitle: A paper\n---\n\n${text}`;
  const { view, real, document } = await opened(titled);
  // VS Code reads the clean text anew from the file system of the view when it has no tab and no changes.
  document.isDirty = true;
  // Without rules, the front matter is text like the rest, and has no link above it.
  const start = document.text.indexOf('A paper');
  typeIn(document, start, start, 'The ');
  await settle();
  expect(real.text.startsWith('---\nlayout: pht/thesis\ntitle: The A paper\n---\n')).toBe(true);
  expect(fake.statusMessages).toEqual([]);
  expect(fake.codeLenses).toEqual([]);
  // The rules of another extension, for the file of the view.
  let asked: string | undefined;
  view.registerFrontMatterSchema({
    schemaOf: (file) => {
      asked = file.toString();
      return Promise.resolve({ schema: paperSchema });
    },
  });
  await settle();
  expect(asked).toBe(real.uri.toString());
  // An edit of a key of the schema, or of the value of a read-only key, goes back with a message.
  const key = document.text.indexOf('title:');
  typeIn(document, key, key, 'sub');
  await settle();
  const layout = document.text.indexOf('thesis');
  typeIn(document, layout, layout + 'thesis'.length, 'concept');
  await settle();
  expect(document.getText().startsWith('---\nlayout: pht/thesis\ntitle: The A paper\n---\n')).toBe(true);
  expect(real.text.startsWith('---\nlayout: pht/thesis\ntitle: The A paper\n---\n')).toBe(true);
  expect(fake.statusMessages).toEqual([frontMatterKept, frontMatterKept]);
  // The text after a key goes into the file.
  const title = document.text.indexOf('The A paper');
  typeIn(document, title, title + 'The A paper'.length, 'A plan');
  await settle();
  expect(real.text.startsWith('---\nlayout: pht/thesis\ntitle: A plan\n---\n')).toBe(true);
  // The missing key shows as a warning at the first fence, and its quick fixes add it with a value of the choice.
  const problems = fake.diagnostics.get(document.uri.toString()) ?? [];
  expect(problems.map((problem) => [problem.range.start.line, problem.message, problem.severity, problem.source])).toEqual([[0, '"kind": A value is required.', 1, 'Markdown Notes']]);
  const actions = fake.actionsAt(document, new FakeRange(0, 0, 0, 0));
  expect(actions.map((action) => [action.title, action.isPreferred])).toEqual([
    ['Add "kind: Bachelor"', true],
    ['Add "kind: Master"', false],
  ]);
  const [fix] = actions[0].edit!.replacements;
  typeIn(document, document.offsetAt(fix.range.start), document.offsetAt(fix.range.end), fix.text);
  await settle();
  expect(real.text.startsWith('---\nlayout: pht/thesis\ntitle: A plan\nkind: Bachelor\n---\n')).toBe(true);
  expect(fake.diagnostics.get(document.uri.toString())).toEqual([]);
  // After a key with a choice, its values are the suggestions, which a colon or a space opens.
  const after = document.text.indexOf('kind: ') + 'kind: '.length;
  expect(fake.complete(document, document.positionAt(after)).map((item) => item.label)).toEqual(['Bachelor', 'Master']);
  expect(fake.completions.get('scheme:markdownnotes')?.[0].triggers).toEqual([':', ' ']);
});

/** figured is a file with notes, a figure with the number of its caption and a reference to it. */
const figured = `Figure 1: A cat<a id="fig-cat"></a>\n\n![A cat](cat.png)\n\nSee [Figure 1](#fig-cat) and the next part.\n\n${text}`;

test('keeps the generated parts read-only: an edit of the number of a caption or of the text of a reference goes back with a message, and an edit around them goes into the file (R-TEXT-009, decision 74)', async () => {
  const { generatedReadOnly } = await import('./cleanView');
  const { real, document } = await opened(figured);
  document.isDirty = true;
  const number = document.text.indexOf('1:');
  typeIn(document, number, number + 1, '2');
  await settle();
  expect(document.getText().startsWith('Figure 1: A cat\n')).toBe(true);
  expect(real.text).toBe(figured);
  expect(fake.statusMessages).toEqual([generatedReadOnly]);
  // Text typed at the end of the number would become a piece of it.
  typeIn(document, number + 1, number + 1, '0');
  await settle();
  expect(document.getText().startsWith('Figure 1: A cat\n')).toBe(true);
  const reference = document.text.indexOf('Figure 1]');
  typeIn(document, reference, reference + 'Figure'.length, 'Abbildung');
  await settle();
  expect(document.getText()).toContain('See [Figure 1](#fig-cat) and');
  expect(real.text).toBe(figured);
  expect(fake.statusMessages).toEqual([generatedReadOnly, generatedReadOnly, generatedReadOnly]);
  // The text of the caption, and the deletion of the whole reference, go into the file.
  const caption = document.text.indexOf('A cat');
  typeIn(document, caption, caption, 'Still ');
  await settle();
  expect(real.text.startsWith('Figure 1: Still A cat<a id="fig-cat"></a>\n')).toBe(true);
  const see = document.text.indexOf('See [');
  typeIn(document, see, document.text.indexOf('and the next'), 'See ');
  await settle();
  expect(real.text).toContain('\nSee and the next part.\n');
  expect(fake.statusMessages).toHaveLength(3);
});

test('marks the read-only parts with the gray background of the theme and the reason in their hover: the generated parts, and the parts of the front matter that its rules keep (R-TEXT-009, decision 80)', async () => {
  const { frontMatterKept, generatedReadOnly, readOnlyColors } = await import('./cleanView');
  const { view, document, editor } = await opened(`---\nlayout: pht/thesis\ntitle: A paper\n---\n\n${figured}`);
  /** marked returns the texts with the decoration of read-only parts, of parts of lines or of whole lines, with their hovers. */
  const marked = (wholeLine: boolean): string[] =>
    [...editor.decorations]
      .filter(([type]) => {
        const options = (type as { options: { backgroundColor?: { id: string }; isWholeLine?: boolean } }).options;
        return options.backgroundColor?.id === readOnlyColors.background && options.isWholeLine === wholeLine;
      })
      .flatMap(([, ranges]) => ranges.map((range) => `${document.getText('range' in range ? range.range : range)} | ${String(((range as { hoverMessage?: { value: string } }).hoverMessage)?.value)}`));
  expect(marked(false)).toEqual([`1 | ${generatedReadOnly}`, `Figure 1 | ${generatedReadOnly}`]);
  expect(marked(true)).toEqual([]);
  // With the rules of another extension: the fences, the keys of the schema and the lines of the read-only keys.
  view.registerFrontMatterSchema({ schemaOf: () => Promise.resolve({ schema: paperSchema }) });
  await settle();
  expect(marked(false)).toEqual([`1 | ${generatedReadOnly}`, `Figure 1 | ${generatedReadOnly}`, `title: | ${frontMatterKept}`]);
  expect(marked(true)).toEqual([`--- | ${frontMatterKept}`, `--- | ${frontMatterKept}`, `layout: pht/thesis | ${frontMatterKept}`]);
});

test('formats the text of the file for "Format Document" of the view, with its hidden parts, and takes the formatted file as it is (R-TEXT-009, R-FMT-001)', async () => {
  const { generatedReadOnly } = await import('./cleanView');
  const stale = figured.replace('Figure 1: A cat', 'Figure 3: A cat');
  const { view, real, document } = await opened(stale);
  document.isDirty = true;
  // The formatter gets the text of the file, with the anchor of the caption and the notes that the view hides, and
  // writes the number of the caption anew; the edit changes only the number in the view.
  const texts: string[] = [];
  const edits = view.formatOf(document as never, (file) => {
    texts.push(file);
    return file.replace('Figure 3: A cat', 'Figure 1: A cat');
  });
  expect(texts).toEqual([stale]);
  expect(edits.map((edit) => [document.offsetAt(edit.range.start as never), document.offsetAt(edit.range.end as never), edit.newText])).toEqual([[7, 8, '1']]);
  typeIn(document, 7, 8, '1');
  await settle();
  expect(real.text).toBe(figured);
  expect(fake.statusMessages).toEqual([]);
  // A format that changes only hidden parts, such as the text of a note, goes into the file at once, without edits.
  expect(view.formatOf(document as never, (file) => file.replace('Which ways?', 'Which way?'))).toEqual([]);
  await settle();
  expect(real.text).toBe(figured.replace('Which ways?', 'Which way?'));
  expect(document.getText()).toBe(figured.replace('<a id="fig-cat"></a>', '').replace(text, clean));
  // A view whose text is not the clean text of its file, for example during a write, gets no edits.
  document.text = `Now ${document.text}`;
  expect(view.formatOf(document as never, (file) => file.replace('A cat', 'A dog'))).toEqual([]);
  document.text = document.text.slice('Now '.length);
  // A part that another extension names, such as a citation, is read-only, until its finder goes.
  const finder = (lines: readonly string[]) => lines.flatMap((line, index) => (line.startsWith('See ') ? [{ line: index, start: line.indexOf('the next'), end: line.indexOf('the next') + 'the next'.length }] : []));
  const registration = view.registerGeneratedParts(finder);
  const next = document.text.indexOf('next part');
  typeIn(document, next, next + 'next'.length, 'last');
  await settle();
  expect(real.text).toBe(figured.replace('Which ways?', 'Which way?'));
  expect(fake.statusMessages).toEqual([generatedReadOnly]);
  registration.dispose();
  typeIn(document, next, next + 'next'.length, 'last');
  await settle();
  expect(real.text).toContain('See [Figure 1](#fig-cat) and the last part.');
});

test('takes back a tag that the view hides when the user types or pastes it, and lets a slash command of another extension write one (R-TEXT-009, decision 78)', async () => {
  const { tagByHand } = await import('./cleanView');
  const { view, real, document } = await opened(figured);
  document.isDirty = true;
  // An anchor typed at the end of a caption, and the comment of a listing pasted before a code block.
  const caption = document.text.indexOf('A cat\n');
  typeIn(document, caption + 'A cat'.length, caption + 'A cat'.length, '<a id="fig-other"></a>');
  await settle();
  expect(real.text).toBe(figured);
  expect(document.getText().startsWith('Figure 1: A cat\n')).toBe(true);
  expect(fake.statusMessages).toEqual([tagByHand]);
  const see = document.text.indexOf('See [');
  typeIn(document, see, see, '<!-- listing: ../src/a.ts -->\n\n```ts\nconst a = 1;\n```\n\n');
  await settle();
  expect(real.text).toBe(figured);
  expect(fake.statusMessages).toEqual([tagByHand, tagByHand]);
  // A comment of the user, which the view shows, and a fence that opens a code block go into the file.
  typeIn(document, see, see, '<!-- A comment -->\n\n');
  await settle();
  expect(real.text).toContain('<!-- A comment -->\n\nSee [Figure 1]');
  expect(fake.statusMessages).toHaveLength(2);
  // The same anchor, written by a slash command of another extension, goes into the file.
  const end = document.text.indexOf('A cat\n') + 'A cat'.length;
  await view.command(document.uri as never, async () => {
    typeIn(document, end, end, '<a id="fig-other"></a>');
    await settle();
  });
  expect(real.text.startsWith('Figure 1: A cat<a id="fig-other"></a><a id="fig-cat"></a>\n')).toBe(true);
  expect(fake.statusMessages).toHaveLength(2);
});

test('saves the file for a save of the view, with each note', async () => {
  const { view, real, document } = await opened();
  typeIn(document, 0, 0, 'Now ');
  await settle();
  await view.writeFile(document.uri as never, new TextEncoder().encode(document.getText()));
  expect(real.saves).toBe(1);
  expect(real.text.startsWith('Now The agents <wbr><!--[note-7k2q green-->')).toBe(true);
});

test('saves the view as it is after the format of the save of its file changed its clean text, so that its tab shows no dot (R-FMT-001)', async () => {
  const { view, real, document } = await opened();
  typeIn(document, 0, 0, 'Now ');
  await settle();
  // The save of the file formats it before the write; the change reaches the view during the save of the view.
  const save = real.save.bind(real);
  real.save = async () => {
    const end = real.positionAt(real.text.length);
    await fake.applyEdit(Object.assign(new (fake.api.WorkspaceEdit as new () => object)(), { replacements: [{ uri: real.uri, range: new FakeRange(end.line, end.character, end.line, end.character), text: 'Formatted.\n' }] }) as never);
    await settle();
    return save();
  };
  document.isDirty = true;
  await view.writeFile(document.uri as never, new TextEncoder().encode(document.getText()));
  expect(real.text.endsWith('The next paragraph.\nFormatted.\n')).toBe(true);
  expect(real.isDirty).toBe(false);
  // VS Code keeps the changes of the view during its save as changes that are not saved; the view saves them after.
  await new Promise((resolve) => setTimeout(resolve, 0));
  await settle();
  expect(document.getText()).toBe(`Now ${clean}Formatted.\n`);
  expect(document.saves).toBe(1);
  expect(document.isDirty).toBe(false);
  expect(view.savesAsIs(document.uri as never)).toBe(false);
});

test('keeps the file when VS Code opens the view with the clean text that it read before another extension hid more parts, and shows the clean text of now without changes (R-TEXT-009, R-GEN-012)', async () => {
  const { CleanView, cleanUriOf } = await import('./cleanView');
  const { SelectedNotes } = await import('./selectedNotes');
  const view = new CleanView(() => true, new SelectedNotes());
  view.register();
  const marker = '<!-- toc -->';
  const marked = text.replace('The next paragraph.', `${marker}The next paragraph.`);
  const real = fake.open(marked);
  const uri = cleanUriOf(real.uri as never);
  // VS Code reads the clean text; the other extension registers its markers before VS Code opens the document.
  const read = new TextDecoder().decode(await view.readFile(uri));
  expect(read).toBe(`${clean.replace('The next', `${marker}The next`)}`);
  view.registerHiddenMarkers((lines) => lines.flatMap((line, index) => (line.startsWith(marker) ? [{ line: index, start: 0, end: marker.length }] : [])));
  await settle();
  const document = new FakeDocument(uri as never, read);
  fake.documents.push(document);
  fake.show(document, { viewColumn: 1 });
  fake.fire('open', document);
  await settle();
  await settle();
  expect(real.text).toBe(marked);
  expect(real.isDirty).toBe(false);
  expect(document.getText()).toBe(clean);
  expect(document.isDirty).toBe(false);
  // A text of its own, for example the changes that VS Code kept from the last session, goes into the file.
  const other = fake.open(text, '/folder/b.md');
  const otherUri = cleanUriOf(other.uri as never);
  await view.readFile(otherUri);
  const kept = new FakeDocument(otherUri as never, `Now ${clean}`);
  fake.documents.push(kept);
  fake.fire('open', kept);
  await settle();
  await settle();
  expect(other.text.startsWith('Now The agents')).toBe(true);
});

test('shows the highlight of the selected note strong, also while the highlights are hidden, and the others dimmed', async () => {
  const { selected, real, editor } = await opened();
  selected.select(real.uri as never, 'note-m3x8');
  await settle();
  expect(highlighted(editor, 'outline')).toEqual(['teams']);
  expect(highlighted(editor, 'underline 1px')).toEqual(['change the work']);
});

test('shows a text editor of a file with notes as the view, in its group and at its cursor, and closes the tab of the file', async () => {
  const { real, tab } = await inEditor({ offset: text.indexOf('teams') });
  expect(fake.editors).toHaveLength(1);
  const [editor] = fake.editors;
  expect(editor.document.uri.scheme).toBe('markdownnotes');
  expect(editor.document.getText()).toBe(clean);
  expect(editor.selection.active).toEqual(editor.document.positionAt(clean.indexOf('teams')));
  expect(fake.activeEditor).toBe(editor);
  expect(fake.shown.at(-1)?.options).toMatchObject({ viewColumn: 1, preview: true, preserveFocus: false });
  expect(fake.closedTabs).toEqual([tab]);
  expect(real.text).toBe(text);
});

test('selects a range of the file in the view that takes the place of the text editor that the editor of a whole file opened, also while the switch runs (R-VSC-002)', async () => {
  const { CleanView } = await import('./cleanView');
  const { SelectedNotes } = await import('./selectedNotes');
  const real = fake.open(text);
  const editor = new FakeEditor(real, 0, 1);
  const tab: FakeTab = { input: new FakeTabInputText(real.uri), isPreview: false };
  fake.editors.push(editor);
  fake.activeEditor = editor;
  fake.tabGroups.push({ viewColumn: 1, tabs: [tab], activeTab: tab });
  const view = new CleanView(() => true, new SelectedNotes());
  view.register();
  // The editor gives the selection before the text editor became the view: the cursor of the text editor is at 0.
  const start = text.indexOf('teams');
  await view.select(real.uri as never, new FakeRange(real.positionAt(start), real.positionAt(start + 5)) as never);
  const shown = fake.activeEditor;
  expect(shown.document.uri.scheme).toBe('markdownnotes');
  const document = shown.document as unknown as FakeDocument;
  expect(shown.selection.anchor).toEqual(document.positionAt(clean.indexOf('teams')));
  expect(shown.selection.active).toEqual(document.positionAt(clean.indexOf('teams') + 5));
  expect(shown.revealed).toHaveLength(1);
});

test('selects a range of a file without notes in its own text editor, which stays', async () => {
  const { CleanView } = await import('./cleanView');
  const { SelectedNotes } = await import('./selectedNotes');
  const plain = '# Title\n\nText.\n';
  const real = fake.open(plain);
  const editor = new FakeEditor(real, 0, 1);
  const tab: FakeTab = { input: new FakeTabInputText(real.uri) };
  fake.editors.push(editor);
  fake.activeEditor = editor;
  fake.tabGroups.push({ viewColumn: 1, tabs: [tab], activeTab: tab });
  const view = new CleanView(() => true, new SelectedNotes());
  view.register();
  await view.select(real.uri as never, new FakeRange(real.positionAt(9), real.positionAt(13)) as never);
  expect(fake.activeEditor).toBe(editor);
  expect(editor.selection.anchor).toEqual(real.positionAt(9));
  expect(editor.selection.active).toEqual(real.positionAt(13));
});

test('shows a paper document without notes as the view too, with the rules of its front matter (R-TEXT-009, decision 61)', async () => {
  const { frontMatterKept } = await import('./cleanView');
  const paperText = '---\nlayout: pht/thesis\ntitle: A paper\n---\n\nA text without notes.\n';
  const { view, real, tab } = await inEditor({ content: paperText });
  view.registerFrontMatterSchema({ schemaOf: () => ({ schema: paperSchema }) });
  await settle();
  const [editor] = fake.editors;
  expect(editor.document.uri.scheme).toBe('markdownnotes');
  expect(editor.document.getText()).toBe(paperText);
  expect(fake.closedTabs).toEqual([tab]);
  const document = editor.document as unknown as FakeDocument;
  document.isDirty = true;
  const start = document.text.indexOf('pht/thesis');
  typeIn(document, start, start, 'my/');
  await settle();
  expect(document.getText()).toBe(paperText);
  expect(real.text).toBe(paperText);
  expect(fake.statusMessages).toEqual([frontMatterKept]);
  const next = document.text.indexOf('A text');
  typeIn(document, next, next, 'Now ');
  await settle();
  expect(real.text).toBe(paperText.replace('A text', 'Now A text'));
});

test.each([
  ['a file without notes', { content: 'A text without notes.\n' }],
  ['a file without notes whose front matter has no layout', { content: '---\ntitle: A text\n---\n\nA text without notes.\n' }],
  ['the file of a view of the changes of git', { input: (uri: unknown) => ({ original: uri, modified: uri }) }],
])('leaves the text editor of %s as it is', async (_name, options) => {
  const { real } = await inEditor(options);
  expect(fake.editors.map((editor) => editor.document)).toEqual([real]);
  expect(fake.shown).toEqual([]);
  expect(fake.closedTabs).toEqual([]);
});

test('keeps the tab of a file with changes behind the view, and closes it after the save of the file', async () => {
  const { real, tab } = await inEditor({ dirty: true });
  expect(fake.editors[0].document.uri.scheme).toBe('markdownnotes');
  expect(fake.closedTabs).toEqual([]);
  await real.save();
  fake.fire('save', real);
  await settle();
  expect(fake.closedTabs).toEqual([tab]);
});

test('opens the file itself for "Open File with Markup" at the place of the cursor, until its tab closes', async () => {
  const { real } = await inEditor({ offset: text.indexOf('teams') });
  const view = fake.editors[0];
  await fake.run('nimblescape.markdownNotes.openWithMarkup');
  fake.fire('visibleEditors', fake.editors);
  await settle();
  expect(fake.editors[0].document).toBe(real);
  // The cursor goes before the start marker of the note at the cursor of the view.
  expect(fake.editors[0].selection.active).toEqual(real.positionAt(text.indexOf('<wbr><!--[note-m3x8-->teams')));
  expect(fake.closedTabs).toHaveLength(1);
  // The user closes the tab of the file, and opens the file again.
  const group = fake.tabGroups[0];
  await (fake.api.window as { tabGroups: { close(tab: FakeTab): Promise<boolean> } }).tabGroups.close(group.activeTab!);
  fake.show(view.document, { viewColumn: 1 });
  fake.fire('tabs', {});
  await settle();
  fake.show(real, { viewColumn: 1 });
  fake.fire('visibleEditors', fake.editors);
  await settle();
  await settle();
  expect(fake.editors[0].document.uri.scheme).toBe('markdownnotes');
});

test.each(['before', 'while'])('keeps the file that "Open File with Markup" shows %s the view closes the tab of the file that it took the place of', async (when) => {
  const window = fake.api.window as {
    showTextDocument(target: unknown, options?: unknown): Promise<FakeEditor>;
    tabGroups: { close(tabs: FakeTab[]): Promise<boolean> };
  };
  const { showTextDocument: show, tabGroups } = window;
  const close = tabGroups.close;
  // The user runs "Open File with Markup" as soon as the view shows. VS Code closes a tab later than it shows one, so
  // the command can show the tab of the file that the view closes now.
  const openWithMarkup = () => void fake.run('nimblescape.markdownNotes.openWithMarkup');
  if (when === 'before') {
    window.showTextDocument = async (target, options) => {
      const editor = await show(target, options);
      if (target instanceof FakeUri && target.scheme === 'markdownnotes') {
        window.showTextDocument = show;
        openWithMarkup();
      }
      return editor;
    };
  } else {
    tabGroups.close = async (tabs) => {
      tabGroups.close = close;
      openWithMarkup();
      await settle();
      return close(tabs);
    };
  }
  const { real } = await inEditor();
  await settle();
  fake.fire('tabs', {});
  fake.fire('visibleEditors', fake.editors);
  await settle();
  await settle();
  expect(fake.activeEditor?.document).toBe(real);
  expect(fake.editors.map((editor) => editor.document)).toEqual([real]);
  expect((fake.tabGroups[0].activeTab?.input as FakeTabInputText | undefined)?.uri).toBe(real.uri);
});

test('brings the file back to its text on disk when the view closes without a save, with a save that changes nothing more, and closes the tab of the file behind the view', async () => {
  const { view, real } = await inEditor();
  const document = fake.editors[0].document;
  typeIn(document, 0, 0, 'Now ');
  await settle();
  expect(real.text.startsWith('Now The agents')).toBe(true);
  expect(real.isDirty).toBe(true);
  // VS Code opens a tab of the file with changes behind the view.
  const behind: FakeTab = { input: new FakeTabInputText(real.uri) };
  fake.tabGroups[0].tabs.push(behind);
  // The save of the file skips the formatter and the comment of the format while the file goes back.
  let reverting: boolean | undefined;
  const save = real.save.bind(real);
  real.save = () => {
    reverting = view.savesAsIs(real.uri as never);
    return save();
  };
  await closeView(document);
  expect(real.text).toBe(text);
  expect(real.saves).toBe(1);
  expect(reverting).toBe(true);
  expect(view.savesAsIs(real.uri as never)).toBe(false);
  expect(fake.closedTabs).toContain(behind);
});

test('shows the text editor of a file beside the editor of a whole file as the view too, with the markup hidden and the rules of the front matter (R-TEXT-009, decision 72)', async () => {
  const { frontMatterKept } = await import('./cleanView');
  const frontMatter = '---\nlayout: pht/thesis\ntitle: A paper\nkind: Master\n---\n\n';
  const { view, real, tab, custom } = await inEditor({ content: frontMatter + text, rendered: true });
  view.registerFrontMatterSchema({ schemaOf: () => ({ schema: paperSchema }) });
  await settle();
  const [editor] = fake.editors;
  expect(editor.document.uri.scheme).toBe('markdownnotes');
  expect(editor.document.getText()).toBe(frontMatter + clean);
  expect(fake.shown.at(-1)?.options).toMatchObject({ viewColumn: 1 });
  expect(fake.closedTabs).toEqual([tab]);
  expect(fake.tabGroups[1].tabs).toEqual([custom]);
  const document = editor.document as unknown as FakeDocument;
  const start = document.text.indexOf('title:');
  typeIn(document, start, start, 'The ');
  await settle();
  expect(document.getText()).toBe(frontMatter + clean);
  expect(real.text).toBe(frontMatter + text);
  expect(fake.statusMessages).toEqual([frontMatterKept]);
  // The edit that went back leaves no changes that are not saved.
  expect(real.isDirty).toBe(false);
  expect(document.isDirty).toBe(false);
});

test('keeps the changes in the file when the view closes without a save while the editor of a whole file shows the file (decision 72)', async () => {
  const { real } = await inEditor({ rendered: true });
  const document = fake.editors[0].document;
  typeIn(document, 0, 0, 'Now ');
  await settle();
  await closeView(document);
  expect(real.text.startsWith('Now The agents')).toBe(true);
  expect(real.isDirty).toBe(true);
  expect(real.saves).toBe(0);
});

test('saves the view as it is after a save of its file elsewhere, for example in the editor of a whole file, so that the view has no changes that are not saved (decision 72)', async () => {
  const { view, real } = await inEditor({ rendered: true });
  const document = fake.editors[0].document as unknown as FakeDocument;
  // The editor of a whole file changes the file; the view shows the change.
  await fake.applyEdit(Object.assign(new (fake.api.WorkspaceEdit as new () => object)(), { replacements: [{ uri: real.uri, range: new FakeRange(0, 0, 0, 0), text: 'Now ' }] }) as never);
  await settle();
  expect(document.getText()).toBe(`Now ${clean}`);
  expect(document.isDirty).toBe(true);
  let asIs: boolean | undefined;
  const save = document.save.bind(document);
  document.save = () => {
    asIs = view.savesAsIs(document.uri as never);
    return save();
  };
  // A save of a file with changes that are not saved leaves the view as it is.
  fake.fire('save', real);
  await settle();
  expect(document.saves).toBe(0);
  await real.save();
  fake.fire('save', real);
  await settle();
  expect(document.saves).toBe(1);
  expect(document.isDirty).toBe(false);
  expect(asIs).toBe(true);
  expect(view.savesAsIs(document.uri as never)).toBe(false);
  // VS Code writes the view for its save: the file stays as it is, also when it changed again since.
  await fake.applyEdit(Object.assign(new (fake.api.WorkspaceEdit as new () => object)(), { replacements: [{ uri: real.uri, range: new FakeRange(0, 0, 0, 0), text: 'And ' }] }) as never);
  await settle();
  const saves = real.saves;
  document.save = async () => {
    await view.writeFile(document.uri as never, new TextEncoder().encode(`Now ${clean}`));
    return save();
  };
  await real.save();
  real.isDirty = false;
  fake.fire('save', real);
  await settle();
  expect(real.saves).toBe(saves + 1);
  expect(real.text.startsWith('And Now The agents')).toBe(true);
});

test('keeps the changes of a closed view in the file that "Open File with Markup" shows', async () => {
  const { real } = await inEditor();
  const document = fake.editors[0].document;
  typeIn(document, 0, 0, 'Now ');
  await settle();
  await fake.run('nimblescape.markdownNotes.openWithMarkup');
  await closeView(document);
  expect(real.text.startsWith('Now The agents')).toBe(true);
  expect(real.saves).toBe(0);
  expect(fake.editors.map((editor) => editor.document)).toEqual([real]);
});

test('keeps a file that a link of a view only reads, also with changes of its own text editor', async () => {
  const { cleanUriOf } = await import('./cleanView');
  const { view } = await inEditor();
  const other = fake.open(text, '/folder/b.md');
  fake.files.set('/folder/b.md', text);
  // The Markdown language server checks that the file of a link exists.
  await view.stat(cleanUriOf(other.uri as never));
  await fake.applyEdit(Object.assign(new (fake.api.WorkspaceEdit as new () => object)(), { replacements: [{ uri: other.uri, range: new FakeRange(0, 0, 0, 0), text: 'Mine. ' }] }) as never);
  fake.fire('tabs', {});
  await settle();
  await settle();
  expect(other.text.startsWith('Mine. ')).toBe(true);
});

test('gives the Markdown preview of the view the text of the file, and the line of the view of each line of the file', async () => {
  const { view } = await inEditor();
  const source = view.sourceOf(fake.editors[0].document.getText());
  expect(source?.text).toBe(text);
  expect(source?.lines).toEqual([0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3]);
  // The preview of the file itself renders its own text.
  expect(view.sourceOf(text)).toBeUndefined();
  expect(view.sourceOf('Another text.\n')).toBeUndefined();
});

test('names the file of a view in the authority of its URI, so that a relative link of the view leads to the view of the file of the link', async () => {
  const { cleanUriOf, fileOf } = await import('./cleanView');
  for (const file of ['file:///folder/a.md', 'vscode-remote://ssh-remote+host/home/a.md', 'file:///c%3A/Users/a.md']) {
    expect(fileOf(cleanUriOf(FakeUri.parse(file) as never))?.toString()).toBe(FakeUri.parse(file).toString());
  }
  const link = FakeUri.joinPath(cleanUriOf(FakeUri.parse('file:///folder/a.md') as never) as never, '..', 'b.md');
  expect(fileOf(link as never)?.toString()).toBe(new FakeUri('file', '/folder/b.md').toString());
  expect(fileOf(FakeUri.parse('file:///folder/a.md') as never)).toBeUndefined();
});

test('shows a file without notes in place of its view, for example for a link of a view to it', async () => {
  const { cleanUriOf } = await import('./cleanView');
  await inEditor();
  fake.files.set('/folder/b.md', 'A text without notes.\n');
  const link = await fake.openTextDocument(cleanUriOf(new FakeUri('file', '/folder/b.md') as never) as never);
  expect(link.getText()).toBe('A text without notes.\n');
  fake.show(link, { viewColumn: 1 });
  fake.fire('visibleEditors', fake.editors);
  await settle();
  await settle();
  const file = new FakeUri('file', '/folder/b.md').toString();
  expect(fake.editors.map((editor) => editor.document.uri.toString())).toEqual([file]);
  expect(fake.tabGroups[0].tabs.map((tab) => (tab.input as FakeTabInputText).uri.toString())).toEqual(['markdownnotes://file/folder/a.md', file]);
});

test('gives the files of the Markdown preview of a view as they are: the files beside the file, its style sheets from the folder of the workspace, and its images by their paths there', async () => {
  const { CleanView, cleanUriOf, resourceFolder } = await import('./cleanView');
  const { SelectedNotes } = await import('./selectedNotes');
  const view = new CleanView(() => true, new SelectedNotes());
  view.register();
  fake.settings.set('', { 'markdown.styles': ['.vscode/serif.css', 'https://x.y/web.css', '/abs/style.css'] });
  fake.files.set('/folder/docs/img/a.png', 'image a');
  fake.files.set('/folder/figures/b.png', 'image b');
  fake.files.set('/folder/.vscode/serif.css', 'body { font-family: serif; }');
  const document = cleanUriOf(new FakeUri('file', '/folder/docs/paper.md') as never);
  const read = async (uri: unknown): Promise<string> => new TextDecoder().decode(await view.readFile(uri as never));
  // VS Code reads a relative image from the folder of the document, and a relative style sheet from there too, because
  // the document belongs to no folder of the workspace.
  expect(await read(FakeUri.joinPath(document as never, '..', 'img/a.png'))).toBe('image a');
  expect(await view.stat(FakeUri.joinPath(document as never, '..', 'img/a.png') as never)).toMatchObject({ type: 1, permissions: 1 });
  expect(await read(FakeUri.joinPath(document as never, '..', '.vscode/serif.css'))).toBe('body { font-family: serif; }');
  const image = (source: string): string | undefined => view.imageOf(document, source)?.toString();
  const inFolder = `markdownnotes://file/folder/docs/${resourceFolder}`;
  expect(image('img/a.png')).toBe(`${inFolder}/docs/img/a.png`);
  expect(image('../figures/b.png')).toBe(`${inFolder}/figures/b.png`);
  expect(image('/figures/b.png?size=2#top')).toBe(`${inFolder}/figures/b.png`);
  expect(image('img/a%20b.png')).toBe(`${inFolder}/docs/img/a b.png`);
  for (const outside of ['../../outside.png', 'https://x.y/c.png', 'data:image/png;base64,AA==', '//x.y/c.png', '']) {
    expect(image(outside)).toBeUndefined();
  }
  expect(view.imageOf(new FakeUri('file', '/folder/docs/paper.md') as never, 'img/a.png')).toBeUndefined();
  expect(await read(view.imageOf(document, '../figures/b.png'))).toBe('image b');
  expect(view.resourceOf(FakeUri.parse(`${inFolder}/../../../etc/passwd`) as never)).toBeUndefined();
  // A file that is no Markdown file does not change, and a file that does not exist is not found.
  await expect(view.writeFile(FakeUri.joinPath(document as never, '..', 'img/a.png') as never, new Uint8Array())).rejects.toThrow('changes only Markdown files');
  await expect(view.stat(FakeUri.joinPath(document as never, '..', 'img/none.png') as never)).rejects.toThrow('no file markdownnotes://file/folder/docs/img/none.png');
  expect(view.resourceOf(document)).toBeUndefined();
});

test('shows a file that is no Markdown file in place of its view, for a link of a view to it', async () => {
  const { cleanUriOf } = await import('./cleanView');
  await inEditor();
  fake.files.set('/folder/data.csv', 'a,b\n1,2\n');
  const link = await fake.openTextDocument(cleanUriOf(new FakeUri('file', '/folder/data.csv') as never) as never);
  expect(link.getText()).toBe('a,b\n1,2\n');
  fake.show(link, { viewColumn: 1 });
  fake.fire('visibleEditors', fake.editors);
  await settle();
  await settle();
  expect(fake.editors.map((editor) => editor.document.uri.toString())).toEqual([new FakeUri('file', '/folder/data.csv').toString()]);
});

test('opens the document of a file again that VS Code closes behind its view, for the notes of the side view', async () => {
  const { real } = await inEditor();
  // VS Code closes the document of a file after its last tab closed.
  fake.documents = fake.documents.filter((document) => document !== real);
  fake.fire('close', real);
  await settle();
  expect(fake.documents.find((document) => document.uri.toString() === real.uri.toString())?.getText()).toBe(text);
});

test('shows a listing without its comment and the link of its caption, and takes a listing of /listing into the file with them (R-CODE-001)', async () => {
  const listing = 'Listing 1: [Keeping](src/keep.ts#L2) (keep.ts, L2)\n\n<!-- listing: src/keep.ts#keep -->\n\n```typescript\nconst kept = 1;\n```\n';
  const { view, real, document, editor } = await opened(`${text}\n${listing}\n`);
  expect(document.getText()).toBe(`${clean}\nListing 1: Keeping\n\n\`\`\`typescript\nconst kept = 1;\n\`\`\`\n\n`);
  const { SlashCommands } = await import('./slashCommands');
  new SlashCommands({} as never, async () => {}, async () => {}, view).register();
  fake.files.set('/folder/src/other.ts', 'export const other = 2;\n');
  fake.found = [new FakeUri('file', '/folder/src/other.ts')];
  fake.pick = (choices) => choices[0];
  // VS Code reports the insertion of the snippet as a change of the view, which the view writes into the file.
  editor.insertSnippet = async (snippet: FakeSnippetString, position: FakePosition) => {
    const at = document.offsetAt(position);
    typeIn(document, at, at, snippet.text);
    return true;
  };
  editor.selection = { active: document.positionAt(document.text.length) };
  await fake.run('nimblescape.markdownNotes.slashListing', document.uri);
  await settle();
  expect(real.text.endsWith(`\n${listing}\nListing 2: [Caption](src/other.ts) (other.ts)\n\n<!-- listing: src/other.ts -->\n\n\`\`\`typescript\nexport const other = 2;\n\`\`\`\n`)).toBe(true);
  expect(document.getText().endsWith('```\n\nListing 2: Caption\n\n```typescript\nexport const other = 2;\n```\n')).toBe(true);
  // Text typed over the caption goes into its link.
  const caption = document.text.lastIndexOf('Caption');
  typeIn(document, caption, caption + 'Caption'.length, 'Other');
  await settle();
  expect(real.text).toContain('\nListing 2: [Other](src/other.ts) (other.ts)\n\n<!-- listing: src/other.ts -->\n');
});
