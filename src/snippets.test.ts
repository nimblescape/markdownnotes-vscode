// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the snippets of the source files (R-CODE-003) with a fake of the editor API: `/snippet` after a
 * slash that replaced selected lines, "Add Snippet" with the name that the user types, the light bulb of selected lines
 * of a source file, and the links of the comments of the listings in a Markdown file.
 */

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { Fake, FakeCodeActionKind, type FakeCompletionItem, FakeEditor, FakePosition, FakeRange, FakeSelection, settle } from './testing/fakeVscode';

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

/** code is a source file of TypeScript with a function. */
const code = 'export function keepLines(lines: string[]): string[] {\n  const kept = lines.filter(Boolean);\n  return kept;\n}\n';

/**
 * open opens a source file in the active text editor with a selection, and activates the extension.
 * @param selection - The selection.
 */
const open = async (selection: FakeSelection) => {
  const document = fake.open(code, '/folder/src/keep.ts', { languageId: 'typescript' });
  const editor = new FakeEditor(document, selection.active.line);
  editor.selection = selection;
  fake.editors.push(editor);
  fake.activeEditor = editor;
  await fake.activate();
  return { document, editor };
};

/**
 * labelOf returns the label of a suggestion.
 * @param item - The suggestion.
 */
const labelOf = (item: FakeCompletionItem): string => (typeof item.label === 'string' ? item.label : item.label.label);

test('"Add Snippet" writes the marks of the snippet around the selected lines, with the name that the user types (R-CODE-003)', async () => {
  const { document } = await open(new FakeSelection(new FakePosition(1, 2), new FakePosition(3, 0)));
  fake.input = 'kept-lines';
  await fake.run('nimblescape.markdownNotes.addSnippet');
  const [input] = fake.inputs;
  // The name comes from the first declared name of the lines, and must be new in the file.
  expect(input.value).toBe('kept');
  expect(input.validateInput?.('Kept')).toMatch(/small letters/i);
  expect(input.validateInput?.('kept-lines')).toBeUndefined();
  expect(document.text).toBe(
    'export function keepLines(lines: string[]): string[] {\n  // markdownnotes: snippet kept-lines\n  const kept = lines.filter(Boolean);\n  return kept;\n  // markdownnotes: /snippet kept-lines\n}\n',
  );
  // The light bulb of the selected lines of a source file has "Add Snippet", as a refactoring.
  expect(fake.codeActionsAt(document, new FakeRange(2, 0, 3, 0))).toEqual([{ title: 'Add Snippet', kind: 'refactor.markdownNotes.addSnippet', command: 'nimblescape.markdownNotes.addSnippet' }]);
  expect(fake.codeActionsAt(document, new FakeRange(2, 0, 3, 0), FakeCodeActionKind.QuickFix)).toEqual([]);
  expect(fake.codeActionsAt(document, new FakeRange(2, 0, 2, 0))).toEqual([]);
  // A name of a snippet of the file is taken.
  expect(fake.inputs.length).toBe(1);
  fake.activeEditor!.selection = new FakeSelection(new FakePosition(2, 0), new FakePosition(3, 0));
  await fake.run('nimblescape.markdownNotes.addSnippet');
  expect(fake.inputs[1].validateInput?.('kept-lines')).toMatch(/has a snippet/);
});

test('/snippet after a slash that replaced selected lines puts them back with the marks around them (R-CODE-003)', async () => {
  const selection = new FakeSelection(new FakePosition(1, 0), new FakePosition(2, 14));
  const { document, editor } = await open(selection);
  fake.fire('selection', { textEditor: editor, selections: editor.selections, kind: 2 });
  await settle();
  const range = new FakeRange(1, 0, 2, 14);
  await editor.edit((builder) => builder.replace(range, '/'));
  fake.fire('change', { document, contentChanges: [{ range, rangeOffset: 55, rangeLength: 50, text: '/' }] });
  await settle();
  const items = fake.complete(document, new FakePosition(1, 1));
  expect(items.map(labelOf)).toEqual(['/snippet']);
  fake.input = 'filter';
  await editor.edit((builder) => builder.replace(items[0].range!, items[0].insertText as string));
  await fake.run(items[0].command!.command, ...(items[0].command!.arguments ?? []));
  await settle();
  expect(document.text).toBe(
    'export function keepLines(lines: string[]): string[] {\n  // markdownnotes: snippet filter\n  const kept = lines.filter(Boolean);\n  return kept;\n  // markdownnotes: /snippet filter\n}\n',
  );
  // A slash that replaced no selected text offers no /snippet, and a Markdown file has its own slash commands.
  expect(fake.complete(document, new FakePosition(0, 1)).map(labelOf)).toEqual([]);
});

test('"Add Snippet" in a file type that the extension does not know writes the marks in the comment form of VS Code for its language (R-CODE-003)', async () => {
  await open(new FakeSelection(new FakePosition(0, 0), new FakePosition(0, 0)));
  const nim = fake.open('proc keep() =\n  echo "kept"\n', '/folder/src/keep.nim', { languageId: 'nim' });
  const editor = new FakeEditor(nim, 1);
  editor.selection = new FakeSelection(new FakePosition(1, 0), new FakePosition(1, 13));
  fake.editors.push(editor);
  fake.activeEditor = editor;
  fake.lineComments.set('nim', '#');
  fake.input = 'echo';
  await fake.run('nimblescape.markdownNotes.addSnippet');
  expect(nim.text).toBe('proc keep() =\n  # markdownnotes: snippet echo\n  echo "kept"\n  # markdownnotes: /snippet echo\n');
  // A language without line comments in VS Code leaves the file as it was, with a message.
  const text = fake.open('a = 1\n', '/folder/src/a.weird', { languageId: 'weird' });
  const other = new FakeEditor(text, 0);
  other.selection = new FakeSelection(new FakePosition(0, 0), new FakePosition(0, 5));
  fake.editors.push(other);
  fake.activeEditor = other;
  await fake.run('nimblescape.markdownNotes.addSnippet');
  expect(text.text).toBe('a = 1\n');
  expect(fake.infos.at(-1)).toMatch(/weird has no comments/);
  // A JSON file has no comments, so it offers no "Add Snippet".
  const json = fake.open('{}\n', '/folder/a.json', { languageId: 'json' });
  expect(fake.codeActionsAt(json, new FakeRange(0, 0, 0, 2))).toEqual([]);
  expect(fake.codeActionsAt(fake.open('{}\n', '/folder/tsconfig.json', { languageId: 'jsonc' }), new FakeRange(0, 0, 0, 2))).toHaveLength(1);
});

test('the comment of a listing is a link to its source file, at the line of its snippet or its symbol (R-CODE-003)', async () => {
  await open(new FakeSelection(new FakePosition(0, 0), new FakePosition(0, 0)));
  const paper = fake.open('<!-- listing: ../src/keep.ts#keepLines -->\n\n```typescript\n```\n\n<!-- listing: ../src/keep.ts -->\n\n```\n```\n', '/folder/paper/a.md');
  const links = fake.links.get('markdown')!.provideDocumentLinks(paper);
  expect(links.map((link) => [link.range.start.line, link.range.start.character, link.range.end.character, link.target?.path, link.target?.fragment, link.tooltip])).toEqual([
    [0, 14, 38, '/folder/src/keep.ts', 'L1', 'Open keepLines in ../src/keep.ts'],
    [5, 14, 28, '/folder/src/keep.ts', '', 'Open ../src/keep.ts'],
  ]);
});

test('/listing in a Markdown file lists the snippets of the chosen file before its symbols, and inserts the code of a snippet without its marks (R-CODE-001, R-CODE-003)', async () => {
  await open(new FakeSelection(new FakePosition(0, 0), new FakePosition(0, 0)));
  const source = fake.documents.find((document) => document.uri.path === '/folder/src/keep.ts')!;
  source.text = 'export function keepLines(lines: string[]): string[] {\n  // markdownnotes: snippet filter\n  const kept = lines.filter(Boolean);\n  // markdownnotes: /snippet filter\n  return kept;\n}\n';
  fake.found = [source.uri];
  const paper = fake.open('/\n', '/folder/paper.md');
  const editor = new FakeEditor(paper, 0);
  editor.selection = { active: new FakePosition(0, 1) };
  fake.editors.push(editor);
  fake.activeEditor = editor;
  const item = fake.complete(paper, new FakePosition(0, 1)).find((candidate) => labelOf(candidate) === '/listing')!;
  fake.pick = (choices) => (fake.picks.length === 1 ? choices[0] : choices.find((choice) => choice.label === 'filter'));
  await editor.edit((builder) => builder.replace(item.range!, item.insertText as string));
  await fake.run(item.command!.command, ...(item.command!.arguments ?? []));
  await settle();
  expect(fake.picks[1].map((choice) => [choice.label, choice.description])).toEqual([
    ['Whole file', 'src/keep.ts'],
    ['filter', 'Snippet'],
  ]);
  expect(paper.text).toBe('Listing: Caption\n\n<!-- listing: src/keep.ts#filter -->\n\n```typescript\nconst kept = lines.filter(Boolean);\n```\n\n');
});
