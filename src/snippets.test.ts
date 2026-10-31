// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the snippets of the source files (R-CODE-003) with a fake of the editor API: `/snippet` after a
 * slash that replaced selected lines, "Add Snippet" with the name that the user types, the light bulb of selected lines
 * of a source file, and the links of the comments of the listings in a Markdown file.
 */

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { snippetCommands } from './snippets';
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
  // The light bulb of the selected lines of a source file has "Add Snippet", as a refactoring, and in a snippet the
  // actions of the snippet (R-CODE-004).
  expect(fake.codeActionsAt(document, new FakeRange(2, 0, 3, 0))).toEqual([
    { title: 'Add Snippet', kind: 'refactor.markdownNotes.addSnippet', command: 'nimblescape.markdownNotes.addSnippet' },
    { title: 'Rename Snippet "kept-lines"', kind: 'refactor.markdownNotes.renameSnippet', command: 'nimblescape.markdownNotes.renameSnippet' },
    { title: 'Remove Snippet "kept-lines"', kind: 'refactor.markdownNotes.removeSnippet', command: 'nimblescape.markdownNotes.removeSnippet' },
  ]);
  expect(fake.codeActionsAt(document, new FakeRange(2, 0, 3, 0), FakeCodeActionKind.QuickFix)).toEqual([]);
  expect(fake.codeActionsAt(document, new FakeRange(2, 0, 2, 0)).map((action) => action.title)).toEqual(['Rename Snippet "kept-lines"', 'Remove Snippet "kept-lines"']);
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

test('"Add Snippet" writes nothing in a clone of a reference to a tag or a commit, and writes the marks in a clone on a branch (R-CODE-006, decision 60)', async () => {
  const { pinnedMessage } = await import('./snippets');
  fake.open(`${'a'.repeat(40)}\n`, '/folder/.markdownpaper/repos/server/.git/HEAD');
  fake.open('ref: refs/heads/main\n', '/folder/.markdownpaper/repos/tools/.git/HEAD');
  const pinned = fake.open(code, '/folder/.markdownpaper/repos/server/src/keep.ts', { languageId: 'typescript' });
  const branch = fake.open(code, '/folder/.markdownpaper/repos/tools/src/keep.ts', { languageId: 'typescript' });
  for (const document of [pinned, branch]) {
    const editor = new FakeEditor(document, 1);
    editor.selection = new FakeSelection(new FakePosition(1, 2), new FakePosition(3, 0));
    fake.editors.push(editor);
  }
  await fake.activate();
  fake.input = 'kept-lines';
  await fake.run('nimblescape.markdownNotes.addSnippet', pinned.uri, new FakeRange(1, 2, 3, 0));
  expect(pinned.text).toBe(code);
  expect(fake.infos).toEqual([pinnedMessage]);
  expect(fake.inputs).toEqual([]);
  await fake.run('nimblescape.markdownNotes.addSnippet', branch.uri, new FakeRange(1, 2, 3, 0));
  expect(branch.text).toContain('  // markdownnotes: snippet kept-lines\n');
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

test('the comment of a listing is a link to its source file, at the line of its snippet (R-CODE-003)', async () => {
  const { document } = await open(new FakeSelection(new FakePosition(0, 0), new FakePosition(0, 0)));
  document.text = 'export function keepLines(lines: string[]): string[] {\n  // markdownnotes: snippet filter\n  const kept = lines.filter(Boolean);\n  // markdownnotes: /snippet filter\n  return kept;\n}\n';
  const paper = fake.open('<!-- listing: ../src/keep.ts#filter -->\n\n```typescript\n```\n\n<!-- listing: ../src/keep.ts -->\n\n```\n```\n\n<!-- listing: ../src/keep.ts#keepLines -->\n\n```\n```\n', '/folder/paper/a.md');
  const links = fake.links.get('markdown')!.provideDocumentLinks(paper);
  // A function is no snippet: its link opens the file at its start.
  expect(links.map((link) => [link.range.start.line, link.range.start.character, link.range.end.character, link.target?.path, link.target?.fragment, link.tooltip])).toEqual([
    [0, 14, 35, '/folder/src/keep.ts', 'L3', 'Open filter in ../src/keep.ts'],
    [5, 14, 28, '/folder/src/keep.ts', '', 'Open ../src/keep.ts'],
    [10, 14, 38, '/folder/src/keep.ts', '', 'Open keepLines in ../src/keep.ts'],
  ]);
});

test('the comment of a listing of another repository is a link to the file in its clone, and a listing without its clone has no link (R-CODE-006)', async () => {
  await open(new FakeSelection(new FakePosition(0, 0), new FakePosition(0, 0)));
  fake.open(`${'a'.repeat(40)}\n`, '/folder/.markdownpaper/repos/server/.git/HEAD');
  fake.open('export {};\n// markdownnotes: snippet read\nconst request = read();\n// markdownnotes: /snippet read\n', '/folder/.markdownpaper/repos/server/src/api.ts');
  const paper = fake.open('---\nrepos:\n  server: org/server\n  client: org/client\n---\n\n<!-- listing: server:src/api.ts#read -->\n\n```\n```\n\n<!-- listing: client:a.ts -->\n\n```\n```\n', '/folder/paper/a.md');
  const links = fake.links.get('markdown')!.provideDocumentLinks(paper);
  // The name of the reference opens the clone in a new window, and the path after the colon the file.
  expect(links.map((link) => [link.range.start.line, link.range.start.character, link.range.end.character, link.target?.scheme, link.target?.path, link.target?.fragment, link.tooltip])).toEqual([
    [6, 14, 20, 'command', snippetCommands.repository, '', 'Open Repository in New Window: server'],
    [6, 21, 36, 'file', '/folder/.markdownpaper/repos/server/src/api.ts', 'L3', 'Open read in server:src/api.ts'],
  ]);
  const [folder] = JSON.parse(decodeURIComponent(links[0].target!.query)) as string[];
  await fake.run(snippetCommands.repository, folder);
  const opened = fake.calls.find((call) => call.command === 'vscode.openFolder')!;
  expect([(opened.args[0] as { path: string }).path, opened.args[1]]).toEqual(['/folder/.markdownpaper/repos/server', { forceNewWindow: true }]);
});

test('/listing in a Markdown file lists the whole file and the snippets of the chosen file, and inserts the code of a snippet without its marks (R-CODE-001, R-CODE-003)', async () => {
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
  expect(paper.text).toBe('Listing 1: [Caption](src/keep.ts#L3) (keep.ts, L3)\n\n<!-- listing: src/keep.ts#filter -->\n\n```typescript\nconst kept = lines.filter(Boolean);\n```\n\n');
});

test('/listing lists the files of the clones of the references of the front matter by their references, and links the caption to GitHub at the commit of the clone (R-CODE-006)', async () => {
  await open(new FakeSelection(new FakePosition(0, 0), new FakePosition(0, 0)));
  const commit = 'f'.repeat(40);
  fake.open(`${commit}\n`, '/folder/.markdownpaper/repos/server/.git/HEAD');
  const api = fake.open('export {};\n// markdownnotes: snippet read\nconst request = read();\n// markdownnotes: /snippet read\n', '/folder/.markdownpaper/repos/server/src/api.ts', { languageId: 'typescript' });
  // The clone of a layout is no reference of the paper, so its files are not in the list.
  const layout = fake.open('body {}\n', '/folder/.markdownpaper/repos/thesis/style.css', { languageId: 'css' });
  const keep = fake.documents.find((document) => document.uri.path === '/folder/src/keep.ts')!;
  fake.found = [keep.uri, api.uri, layout.uri];
  const paper = fake.open('---\nrepos:\n  server: org/server@main\n---\n\n/\n', '/folder/paper.md');
  const editor = new FakeEditor(paper, 5);
  editor.selection = { active: new FakePosition(5, 1) };
  fake.editors.push(editor);
  fake.activeEditor = editor;
  const item = fake.complete(paper, new FakePosition(5, 1)).find((candidate) => labelOf(candidate) === '/listing')!;
  fake.pick = (choices) => (fake.picks.length === 1 ? choices.find((choice) => choice.description === 'server:src/api.ts') : choices.find((choice) => choice.label === 'read'));
  await editor.edit((builder) => builder.replace(item.range!, item.insertText as string));
  await fake.run(item.command!.command, ...(item.command!.arguments ?? []));
  await settle();
  expect(fake.picks[0].map((choice) => [choice.label, choice.description])).toEqual([
    ['api.ts', 'server:src/api.ts'],
    ['keep.ts', 'src/keep.ts'],
  ]);
  expect(paper.text).toBe(
    `---\nrepos:\n  server: org/server@main\n---\n\nListing 1: [Caption](https://github.com/org/server/blob/${commit}/src/api.ts#L3) (api.ts, L3)\n\n<!-- listing: server:src/api.ts#read -->\n\n\`\`\`typescript\nconst request = read();\n\`\`\`\n\n`,
  );
});
