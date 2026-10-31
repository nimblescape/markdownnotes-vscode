// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the snippets in the text editor of a source file (R-CODE-004) with a fake of the editor API: the tag
 * in place of each mark line with the listings that show the snippet, the cursor that jumps over the mark lines, the
 * click on a tag that opens a listing, the keys next to a mark line, "Rename Snippet" and "Remove Snippet", and the
 * buttons that highlight the used snippets.
 */

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { Fake, FakeEditor, FakePosition, type FakeRange, FakeSelection, FakeUri, settle } from './testing/fakeVscode';

// The static imports of the modules read only their constants; each test imports the extension with a new fake of the
// editor API.
vi.mock('vscode', () => ({}));

/** fake is the fake API of the test. */
let fake: Fake;

beforeEach(() => {
  fake = new Fake();
  vi.resetModules();
  vi.doMock('vscode', () => fake.api);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** code is a source file with a used snippet and a snippet that no listing shows. */
const code = [
  'export function parse(lines: string[]): string[] {',
  '  // markdownnotes: snippet keep-lines',
  '  const kept = lines.filter(Boolean);',
  '  // markdownnotes: /snippet keep-lines',
  '  # markdownnotes: snippet unused',
  '  return kept;',
  '  # markdownnotes: /snippet unused',
  '}',
  '',
].join('\n');

/** paper is a Markdown file with a listing of the snippet with its caption, and a listing of it without caption. */
const paper = [
  'Listing: A table<a id="lst-a"></a>',
  '',
  '<!-- listing: ../src/parse.ts#readFields -->',
  '',
  '```ts',
  '```',
  '',
  'Listing: Keeping lines',
  '',
  '<!-- listing: ../src/parse.ts#keep-lines -->',
  '',
  '```ts',
  '```',
  '',
  '<!-- listing: ../src/parse.ts#keep-lines -->',
  '```ts',
  '```',
  '',
].join('\n');

/**
 * start opens the source file in the active text editor of a workspace with the paper, and activates the extension.
 * @param line - The line of the cursor.
 */
const start = async (line = 0) => {
  fake.files.set('/folder/paper/paper.md', paper);
  fake.found = [new FakeUri('file', '/folder/paper/paper.md')];
  const source = fake.open(code, '/folder/src/parse.ts', { languageId: 'typescript' });
  const editor = new FakeEditor(source, line);
  fake.editors.push(editor);
  fake.activeEditor = editor;
  await fake.activate();
  await settle();
  return { source, editor };
};

/** Options are the options of a decoration type of the fake. */
type Options = { textDecoration?: string; backgroundColor?: string };

/**
 * decorated returns the ranges or the options of the decorations of an editor whose type has the options that a test
 * names, without the types without a decoration.
 * @param editor - The text editor.
 * @param match - Tells whether a type counts.
 */
const decorated = (editor: FakeEditor, match: (options: Options) => boolean) =>
  [...editor.decorations].filter(([type, ranges]) => ranges.length > 0 && match((type as { options: Options }).options)).flatMap(([, ranges]) => ranges);

/**
 * select moves the cursor of an editor and tells the extension, as VS Code does after a key or a click.
 * @param editor - The text editor.
 * @param line - The line.
 * @param character - The column.
 * @param kind - 1 for a key, 2 for a click.
 */
const select = async (editor: FakeEditor, line: number, character: number, kind: number) => {
  editor.selection = new FakeSelection(new FakePosition(line, character), new FakePosition(line, character));
  fake.fire('selection', { textEditor: editor, selections: editor.selections, kind });
  await settle();
  return [editor.selection.active.line, editor.selection.active.character];
};

test('each mark line shows as a tag in place of its comment: the start mark with the listings that show the snippet, the end mark with its name (R-CODE-004)', async () => {
  const { editor } = await start();
  const hidden = decorated(editor, (options) => options.textDecoration === 'none; display: none;') as FakeRange[];
  // The comment is hidden from its first character to the end of the line; the indentation stays.
  expect(hidden.map((range) => [range.start.line, range.start.character, range.end.character])).toEqual([1, 3, 4, 6].map((line) => [line, 2, code.split('\n')[line].length]));
  const tags = decorated(editor, (options) => Object.keys(options).length === 0) as { range: FakeRange; renderOptions: { before: { contentText: string } } }[];
  expect(tags.map((tag) => [tag.range.start.line, tag.renderOptions.before.contentText])).toEqual([
    [1, 'snippet keep-lines · Listing 2 in paper/paper.md, paper/paper.md'],
    [3, '/snippet keep-lines'],
    [4, 'snippet unused · in no listing'],
    [6, '/snippet unused'],
  ]);
  // The extension shows no code lens.
  expect(fake.codeLenses).toEqual([]);
});

test('the cursor jumps over a mark line, and a click on a tag opens the listing of its snippet (R-CODE-004)', async () => {
  const { editor } = await start();
  await select(editor, 0, 5, 1);
  // Down from the first line onto the start mark: the cursor goes to the code below it; up again: to the end of the line above.
  expect(await select(editor, 1, 5, 1)).toEqual([2, 0]);
  expect(await select(editor, 1, 0, 1)).toEqual([0, code.split('\n')[0].length]);
  // Down over two mark lines that follow each other.
  await select(editor, 2, 0, 1);
  expect(await select(editor, 3, 0, 1)).toEqual([5, 0]);
  // A selection of text over the marks stays.
  editor.selection = new FakeSelection(new FakePosition(0, 0), new FakePosition(3, 4));
  fake.fire('selection', { textEditor: editor, selections: editor.selections, kind: 2 });
  await settle();
  expect([editor.selection.anchor.line, editor.selection.active.line, editor.selection.active.character]).toEqual([0, 3, 4]);
  // A click on the tag of a snippet without a listing only moves the cursor.
  expect(await select(editor, 4, 3, 2)).toEqual([5, 0]);
  expect(fake.shown).toEqual([]);
  // A click on the tag of an end mark puts the cursor at the start of the snippet, below its start tag.
  expect(await select(editor, 6, 3, 2)).toEqual([5, 0]);
  expect(await select(editor, 3, 3, 2)).toEqual([2, 0]);
  expect(editor.revealed.at(-1)!.start.line).toBe(1);
  expect(fake.shown).toEqual([]);
  // A click on the tag of a used snippet opens its listing; with two listings, the user chooses one.
  fake.pick = (items) => items[1];
  await select(editor, 1, 3, 2);
  expect(fake.picks.at(-1)!.map((item) => item.label)).toEqual(['Listing 2 in paper/paper.md', 'paper/paper.md']);
  expect(fake.shown.at(-1)).toMatchObject({ options: { selection: { start: { line: 14 } } } });
});

test('Backspace and Delete next to a mark line do nothing, so that no key joins the hidden mark with the code (R-CODE-004)', async () => {
  const { editor } = await start();
  const contexts = () =>
    ['left', 'right'].map((side) => fake.calls.filter((call) => call.command === 'setContext' && call.args[0] === `nimblescape.markdownNotes.snippetMark${side === 'left' ? 'Left' : 'Right'}`).at(-1)?.args[1] ?? false);
  await select(editor, 2, 0, 1);
  expect(contexts()).toEqual([true, false]);
  await select(editor, 2, code.split('\n')[2].length, 1);
  expect(contexts()).toEqual([false, true]);
  await select(editor, 5, 3, 1);
  expect(contexts()).toEqual([false, false]);
  await select(editor, 0, code.split('\n')[0].length, 1);
  expect(contexts()).toEqual([false, true]);
  // The command of the keys there changes nothing.
  await fake.run('nimblescape.markdownNotes.keepSnippetMark');
  expect(editor.document.text).toBe(code);
});

test('"Rename Snippet" renames the marks and the listings of a snippet, and "Remove Snippet" removes its marks, after a question when a listing shows it (R-CODE-004)', async () => {
  const { source } = await start();
  fake.input = 'keep-all';
  await fake.run('nimblescape.markdownNotes.renameSnippet', source.uri, 'keep-lines');
  const [input] = fake.inputs;
  expect(input.value).toBe('keep-lines');
  expect(input.validateInput?.('Keep')).toMatch(/small letters/i);
  expect(input.validateInput?.('unused')).toMatch(/has a snippet/);
  expect(source.text).toBe(code.replace(/keep-lines/g, 'keep-all'));
  const markdown = fake.documents.find((document) => document.uri.path === '/folder/paper/paper.md')!;
  expect(markdown.text).toBe(paper.replace(/keep-lines/g, 'keep-all'));
  // A listing shows the snippet: the user agrees first.
  await fake.run('nimblescape.markdownNotes.removeSnippet', source.uri, 'keep-all');
  expect(fake.warnings.at(-1)).toBe('Listing 2 in paper/paper.md, paper/paper.md show the snippet keep-all. Remove its marks? The listing is then not found.');
  expect(source.text).toBe(code.replace(/keep-lines/g, 'keep-all'));
  fake.answer = 'Remove';
  await fake.run('nimblescape.markdownNotes.removeSnippet', source.uri, 'keep-all');
  // No listing shows the other snippet.
  const asked = fake.warnings.length;
  await fake.run('nimblescape.markdownNotes.removeSnippet', source.uri, 'unused');
  expect(fake.warnings).toHaveLength(asked);
  expect(source.text).toBe(['export function parse(lines: string[]): string[] {', '  const kept = lines.filter(Boolean);', '  return kept;', '}', ''].join('\n'));
});

test('"Show Used Snippets" colors the lines of each snippet that a listing shows (R-CODE-004)', async () => {
  const { editor } = await start();
  const colored = () => (decorated(editor, (options) => options.backgroundColor === 'rgba(255, 212, 0, 0.16)') as FakeRange[]).map((range) => [range.start.line, range.end.line]);
  expect(colored()).toEqual([]);
  expect(fake.calls).toContainEqual({ command: 'setContext', args: ['nimblescape.markdownNotes.hasSnippets', true] });
  await fake.run('nimblescape.markdownNotes.showUsedSnippets');
  expect(colored()).toEqual([[2, 2]]);
  expect(fake.calls).toContainEqual({ command: 'setContext', args: ['nimblescape.markdownNotes.usedSnippetsShown', true] });
  await fake.run('nimblescape.markdownNotes.hideUsedSnippets');
  expect(colored()).toEqual([]);
});
