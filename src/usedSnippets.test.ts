// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the snippets in the text editor of a source file (R-CODE-004) with a fake of the editor API: the code
 * lens above the start mark with the listings that show the snippet, the dimmed marks, and the buttons that highlight
 * the used snippets.
 */

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { Fake, type FakeCodeLens, FakeEditor, FakeUri, settle } from './testing/fakeVscode';

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

test('a code lens above the start mark of each snippet names the listings that show it, and opens them (R-CODE-004)', async () => {
  fake.files.set('/folder/paper/paper.md', paper);
  fake.found = [new FakeUri('file', '/folder/paper/paper.md')];
  const source = fake.open(code, '/folder/src/parse.ts', { languageId: 'typescript' });
  const editor = new FakeEditor(source, 0);
  fake.editors.push(editor);
  fake.activeEditor = editor;
  await fake.activate();
  const [provider] = fake.codeLenses;
  const lenses = (await provider.provideCodeLenses(source)) as FakeCodeLens[];
  expect(lenses.map((lens) => [lens.range.start.line, lens.command?.title, lens.command?.command])).toEqual([
    [1, 'snippet keep-lines · Listing 2 in paper/paper.md, paper/paper.md', 'nimblescape.markdownNotes.openSnippetUse'],
    [4, 'snippet unused · in no listing', ''],
  ]);
  // With two listings, the user chooses the one to open.
  fake.pick = (items) => items[1];
  await fake.run(lenses[0].command!.command, ...(lenses[0].command!.arguments ?? []));
  expect(fake.picks.at(-1)!.map((item) => item.label)).toEqual(['Listing 2 in paper/paper.md', 'paper/paper.md']);
  expect(fake.shown.at(-1)).toMatchObject({ options: { selection: { start: { line: 14 } } } });
  // A Markdown file has no code lenses of snippets.
  expect(await provider.provideCodeLenses(fake.open(paper, '/folder/paper/other.md'))).toEqual([]);
});

test('the marks show dimmed, and "Show Used Snippets" colors the lines of each snippet that a listing shows (R-CODE-004)', async () => {
  fake.files.set('/folder/paper/paper.md', paper);
  fake.found = [new FakeUri('file', '/folder/paper/paper.md')];
  const source = fake.open(code, '/folder/src/parse.ts', { languageId: 'typescript' });
  const editor = new FakeEditor(source, 0);
  fake.editors.push(editor);
  fake.activeEditor = editor;
  await fake.activate();
  await settle();
  // The decorations of the marks dim them, and those of the used snippets give them a background color.
  const linesOf = (match: (options: { opacity?: string; backgroundColor?: string }) => boolean) =>
    [...editor.decorations].filter(([type]) => match((type as { options: { opacity?: string; backgroundColor?: string } }).options)).flatMap(([, ranges]) => ranges.map((range) => ('range' in range ? range.range : range)).map((range) => [range.start.line, range.end.line]));
  const decorations = () => [linesOf((options) => options.opacity === '0.5'), linesOf((options) => options.backgroundColor === 'rgba(255, 212, 0, 0.16)')];
  expect(decorations()).toEqual([
    [
      [1, 1],
      [3, 3],
      [4, 4],
      [6, 6],
    ],
    [],
  ]);
  expect(fake.calls).toContainEqual({ command: 'setContext', args: ['nimblescape.markdownNotes.hasSnippets', true] });
  await fake.run('nimblescape.markdownNotes.showUsedSnippets');
  expect(decorations()[1]).toEqual([[2, 2]]);
  expect(fake.calls).toContainEqual({ command: 'setContext', args: ['nimblescape.markdownNotes.usedSnippetsShown', true] });
  await fake.run('nimblescape.markdownNotes.hideUsedSnippets');
  expect(decorations()[1]).toEqual([]);
});
