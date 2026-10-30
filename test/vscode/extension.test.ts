/// <reference types="mocha" />
// Tests in a real VS Code (npm run test:vscode, .vscode-test.mjs): mocha runs them in the extension host. They open
// Markdown files of a temporary folder, and check the notes and their highlights (R-NOTE-004, R-NOTE-006), the comment
// of the format on a save (R-NOTE-007), the collapsed notes (R-TEXT-005), the side view and the buttons of the highlights
// (R-SIDE-001, R-GEN-011), the link of /ref and a value of the front matter in the clean editing view (R-XREF-001,
// R-XREF-004), the light bulb action and the shortcut of "Add Note" (R-EDIT-006), the formatter and its
// format on save of a file with notes (R-FMT-001), the current code of the listings on a save (R-CODE-002), a listing in
// the clean editing view (R-CODE-001), the snippets of a source file (R-CODE-003), and the highlights of the Markdown preview of VS Code (R-PREV-001 to
// R-PREV-004) with the markdown-it plugin of the extension, and the headings of the links of the side view in the HTML
// of the preview (R-SIDE-005). The tests add no note and no answer, because these need a GitHub sign-in (R-GEN-006), which a test
// cannot give.

import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Api } from '../../src/extension';
import { headingLine } from '../../src/links';
import { doctypeLines } from '../../src/notes/doctype';

/** extensionId is the identifier of the extension. */
const extensionId = 'nimblescape.nimblescape-markdownnotes';

/** marked returns a text with the comment of the format at its top, as a change of the extension writes it (R-NOTE-007). */
const marked = (text: string): string => `${doctypeLines.join('\n')}\n\n${text}`;

/** commandOf returns the full name of a command of the extension. */
const commandOf = (name: string): string => `nimblescape.markdownNotes.${name}`;

/** api returns the export of the active extension. */
async function api(): Promise<Api> {
  const extension = vscode.extensions.getExtension<Api>(extensionId);
  assert.ok(extension, `the extension ${extensionId} is installed`);
  return extension.isActive ? extension.exports : extension.activate();
}

/**
 * waitFor returns the first value of a function that is not undefined, or fails after a time.
 * @param read - The function.
 * @param what - What the test waits for, for the message of the failure.
 */
async function waitFor<T>(read: () => T | undefined, what: string): Promise<T> {
  const end = Date.now() + 10_000;
  for (;;) {
    const value = read();
    if (value !== undefined) {
      return value;
    }
    if (Date.now() > end) {
      throw new Error(`timeout: ${what}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

/**
 * note is a Markdown text with two notes of one paragraph: the note of ann with the reply of bob, whose highlight
 * starts at the start of the paragraph, and the green note of carl on a highlight with a start marker.
 */
const note = [
  '# Title',
  '',
  'The text[^note-aaaa] of the page and <wbr><!--[note-bbbb green-->a highlight[^note-bbbb] here.',
  '',
  '[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00',
  '',
  '    The **text** of the note.',
  '',
  '    > **bob** · 2026-10-28 11:00+01:00',
  '    >',
  '    > An answer.',
  '',
  '[^note-bbbb]: **carl** · 2026-10-28 12:00Z',
  '',
  '    Inline',
  '',
  'More.',
  '',
].join('\n');


describe('nimblescape Markdown Notes', () => {
  let folder: string;
  let count = 0;

  /** settings are the settings of the extension. */
  const settings = () => vscode.workspace.getConfiguration('nimblescape.markdownNotes');

  before(async () => {
    folder = fs.mkdtempSync(path.join(os.tmpdir(), 'markdownnotes-'));
    // A save of a file of the tests writes no comment of the format; one test turns it on.
    await settings().update('addFormatComment', false, vscode.ConfigurationTarget.Global);
  });

  after(async () => {
    await settings().update('addFormatComment', undefined, vscode.ConfigurationTarget.Global);
    fs.rmSync(folder, { recursive: true, force: true });
  });

  afterEach(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  /**
   * view returns the clean editing view of a file once it is the active text editor (R-TEXT-009).
   * @param file - The URI of the file.
   */
  const viewOf = (file: vscode.Uri): Promise<vscode.TextEditor> =>
    waitFor(() => {
      const editor = vscode.window.activeTextEditor;
      return editor?.document.uri.scheme === 'markdownnotes' && editor.document.uri.path === file.path ? editor : undefined;
    }, 'the clean editing view');

  /**
   * open writes a Markdown file, opens it in the text editor, and returns it with its editor and its notes. A file with
   * notes opens in the clean editing view (R-TEXT-009); "Open File with Markup" then opens the file itself, whose text
   * editor these tests check.
   * @param text - The text of the file.
   * @param notes - The number of notes that the file holds.
   */
  async function open(text: string, notes: number): Promise<{ document: vscode.TextDocument; editor: vscode.TextEditor; found: ReturnType<Api['notesOf']> }> {
    const file = path.join(folder, `test-${++count}.md`);
    fs.writeFileSync(file, text);
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
    let editor = await vscode.window.showTextDocument(document);
    if (notes > 0) {
      await viewOf(document.uri);
      await vscode.commands.executeCommand(commandOf('openWithMarkup'));
      editor = await waitFor(() => (vscode.window.activeTextEditor?.document === document ? vscode.window.activeTextEditor : undefined), 'the text editor of the file');
    }
    const extension = await api();
    const found = await waitFor(() => {
      const read = extension.notesOf(document.uri);
      return read.length === notes ? read : undefined;
    }, `${notes} notes`);
    return { document, editor, found };
  }

  it('reads each note with its answers and its highlight, from its start marker or the start of its block to its reference (R-NOTE-004, R-NOTE-006)', async () => {
    const { found } = await open(note, 2);
    assert.deepEqual(
      found.map((each) => [each.label, each.color, each.selection?.start.line, each.selection?.start.character, each.selection?.end.line, each.selection?.end.character]),
      [
        ['note-aaaa', undefined, 2, 0, 2, 8],
        ['note-bbbb', 'green', 2, 65, 2, 76],
      ],
    );
    assert.deepEqual(
      found.map((each) => each.answers.map((answer) => answer.author)),
      [['ann', 'bob'], ['carl']],
    );
  });

  it('writes the comment of the format at the top of a file with notes on a save, and changes nothing when an editor only shows the file (R-NOTE-007)', async () => {
    await settings().update('addFormatComment', true, vscode.ConfigurationTarget.Global);
    // The format on save has a test of its own.
    await settings().update('formatOnSave', false, vscode.ConfigurationTarget.Global);
    try {
      const { document, editor } = await open(note, 2);
      await new Promise((resolve) => setTimeout(resolve, 500));
      assert.equal(document.getText(), note);
      assert.equal(document.isDirty, false);
      await editor.edit((edit) => edit.insert(new vscode.Position(document.lineCount - 1, 0), '\nEnd.\n'));
      assert.ok(await document.save(), 'the save of the file');
      assert.equal(document.getText(), marked(`${note}\nEnd.\n`));
    } finally {
      await settings().update('addFormatComment', false, vscode.ConfigurationTarget.Global);
      await settings().update('formatOnSave', undefined, vscode.ConfigurationTarget.Global);
    }
  });

  it('collapses the notes the first time the file is in the active editor, into the line of text before them (R-TEXT-005)', async () => {
    const { document } = await open('One line[^note-aaaa].\n\n[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00\n\n    A\n\nTwo lines.\n', 1);
    const editor = await waitFor(() => vscode.window.visibleTextEditors.find((candidate) => candidate.document === document), 'the editor');
    // The visible ranges of the editor split at a collapsed fold: the fold of the note takes lines 0 to 4.
    const ranges = await waitFor(() => (editor.visibleRanges.length === 2 ? editor.visibleRanges : undefined), 'the collapsed note');
    assert.deepEqual(
      ranges.map((range) => [range.start.line, range.end.line]),
      [
        [0, 0],
        [5, 7],
      ],
    );
  });

  it('collapses a note after a list item and before a heading, and not the section of the heading around it (R-TEXT-005)', async () => {
    const text = '## Tasks\n\n- One\n- Two[^note-aaaa]\n\n[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00\n\n    A\n\n## Next\n\nText.\n';
    const { document } = await open(text, 1);
    const editor = await waitFor(() => vscode.window.visibleTextEditors.find((candidate) => candidate.document === document), 'the editor');
    // The fold of the note takes lines 3 to 7 and stays inside the fold of the section "Tasks", lines 0 to 7.
    const ranges = await waitFor(() => (editor.visibleRanges.length === 2 ? editor.visibleRanges : undefined), 'the collapsed note');
    assert.deepEqual(
      ranges.map((range) => [range.start.line, range.end.line]),
      [
        [0, 3],
        [8, 12],
      ],
    );
  });

  it('opens a file with notes in the clean editing view, which writes each change into the file and saves it (R-TEXT-009)', async () => {
    const file = vscode.Uri.file(path.join(folder, `test-${++count}.md`));
    fs.writeFileSync(file.fsPath, note);
    await vscode.commands.executeCommand('vscode.open', file);
    const view = await viewOf(file);
    assert.equal(view.document.getText(), '# Title\n\nThe text of the page and a highlight here.\n\nMore.\n');
    // Version 1 of the API for other extensions names the file behind the view (R-GEN-012).
    assert.equal((await api()).getAPI(1)?.fileOf(view.document.uri)?.toString(), file.toString());
    const fileTab = () => vscode.window.tabGroups.all.flatMap((group) => group.tabs).find((tab) => tab.input instanceof vscode.TabInputText && tab.input.uri.toString() === file.toString());
    await waitFor(() => (fileTab() ? undefined : true), 'the close of the tab of the file');
    // Text typed at the end of a highlight stays outside of it.
    const end = view.document.positionAt(view.document.getText().indexOf(' here.'));
    await view.edit((edit) => edit.insert(end, ' and more'));
    const real = await waitFor(() => vscode.workspace.textDocuments.find((document) => document.uri.toString() === file.toString() && document.getText().includes(' and more')), 'the change in the file');
    assert.ok(real.getText().includes('<wbr><!--[note-bbbb green-->a highlight[^note-bbbb] and more here.'));
    assert.ok(await view.document.save(), 'the save of the view');
    assert.ok(fs.readFileSync(file.fsPath, 'utf8').includes('a highlight[^note-bbbb] and more here.'), 'the file on disk');
    assert.equal(real.isDirty, false);
    // "Open File with Markup" opens the file itself, and the extension leaves it as it is.
    await vscode.commands.executeCommand(commandOf('openWithMarkup'));
    await waitFor(() => (vscode.window.activeTextEditor?.document === real ? true : undefined), 'the text editor of the file');
    await new Promise((resolve) => setTimeout(resolve, 500));
    assert.equal(vscode.window.activeTextEditor?.document, real);
  });

  it('links a table with /ref in the clean editing view, and writes its anchor into the file, which the view hides (R-XREF-001)', async () => {
    const file = vscode.Uri.file(path.join(folder, `test-${++count}.md`));
    // Without the heading, the table is the first entry of the list of /ref.
    fs.writeFileSync(file.fsPath, note.replace('# Title\n', 'Title.\n').replace('\nMore.\n', '\nSee .\n\nTable 1: People\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n'));
    await vscode.commands.executeCommand('vscode.open', file);
    const view = await viewOf(file);
    const at = view.document.positionAt(view.document.getText().indexOf('See ') + 'See '.length);
    view.selection = new vscode.Selection(at, at);
    // The command shows the list of the figures and the tables; the test takes its first entry.
    let done = false;
    const run = Promise.resolve(vscode.commands.executeCommand(commandOf('slashRef'), view.document.uri)).then(() => (done = true));
    while (!done) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
    }
    await run;
    const real = await waitFor(
      () => vscode.workspace.textDocuments.find((document) => document.uri.toString() === file.toString() && document.getText().includes('<a id="tab-people"></a>')),
      'the anchor in the file',
    );
    assert.ok(real.getText().includes('See [Table 1](#tab-people).\n\nTable 1: People<a id="tab-people"></a>\n'), real.getText());
    await waitFor(() => (view.document.getText().includes('See [Table 1](#tab-people).\n\nTable 1: People\n') ? true : undefined), 'the hidden anchor in the view');
    // Saved files leave no changes behind, which the close of the editors would ask about.
    await vscode.workspace.saveAll(false);
    await waitFor(() => (real.isDirty ? undefined : true), 'the save of the file');
  });

  it('inserts a value of the front matter with /ref in the clean editing view, and writes its markers into the file, which the view hides (R-XREF-004)', async () => {
    const file = vscode.Uri.file(path.join(folder, `test-${++count}.md`));
    fs.writeFileSync(file.fsPath, `---\ntitle: A paper\n---\n\n${note.replace('# Title\n', 'Title.\n').replace('\nMore.\n', '\nSee .\n')}`);
    await vscode.commands.executeCommand('vscode.open', file);
    const view = await viewOf(file);
    const at = view.document.positionAt(view.document.getText().indexOf('See ') + 'See '.length);
    view.selection = new vscode.Selection(at, at);
    // Without figures, tables and headings, the value of the key title is the first entry of the list of /ref.
    let done = false;
    const run = Promise.resolve(vscode.commands.executeCommand(commandOf('slashRef'), view.document.uri)).then(() => (done = true));
    while (!done) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');
    }
    await run;
    const real = await waitFor(
      () => vscode.workspace.textDocuments.find((document) => document.uri.toString() === file.toString() && document.getText().includes('<!--{/title}-->')),
      'the markers in the file',
    );
    assert.ok(real.getText().includes('\nSee <wbr><!--{title}-->A paper<!--{/title}-->.\n'), real.getText());
    await waitFor(() => (view.document.getText().includes('\nSee A paper.\n') ? true : undefined), 'the hidden markers in the view');
    await vscode.workspace.saveAll(false);
    await waitFor(() => (real.isDirty ? undefined : true), 'the save of the file');
  });

  it('runs a slash command of another extension on selected text in the clean editing view, and the view hides the marker that the command writes (R-EDIT-008, R-GEN-012, R-TEXT-009)', async () => {
    const file = vscode.Uri.file(path.join(folder, `test-${++count}.md`));
    fs.writeFileSync(file.fsPath, note.replace('\nMore.\n', '\nAgents change the work.\n'));
    await vscode.commands.executeCommand('vscode.open', file);
    const view = await viewOf(file);
    const v1 = (await api()).getAPI(1)!;
    const marker = '<wbr><!--[research-->';
    const markers = v1.registerHiddenMarkers({ find: (lines) => lines.flatMap((line, index) => (line.includes(marker) ? [{ line: index, start: line.indexOf(marker), end: line.indexOf(marker) + marker.length }] : [])) });
    const research = v1.registerSlashCommand({
      label: '/research',
      selection: true,
      run: (editor, range) =>
        editor.edit((edit) => {
          edit.insert(range.end, ' (RESEARCH)');
          edit.insert(range.start, marker);
        }),
    });
    try {
      const start = view.document.positionAt(view.document.getText().indexOf('change the work'));
      const selected = new vscode.Selection(start, start.translate(0, 'change the work'.length));
      view.selection = selected;
      await new Promise((resolve) => setTimeout(resolve, 200));
      // VS Code replaces the selected text with the typed slash.
      await view.edit((edit) => edit.replace(selected, '/'));
      const list = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', view.document.uri, start.translate(0, 1), '/');
      const item = list.items.find((candidate) => (typeof candidate.label === 'string' ? candidate.label : candidate.label.label) === '/research');
      assert.ok(item?.command, 'the command /research in the list');
      await view.edit((edit) => edit.replace(item.range as vscode.Range, item.insertText as string));
      await vscode.commands.executeCommand(item.command.command, ...(item.command.arguments ?? []));
      const real = await waitFor(() => vscode.workspace.textDocuments.find((document) => document.uri.toString() === file.toString() && document.getText().includes(marker)), 'the marker in the file');
      assert.ok(real.getText().includes('\nAgents <wbr><!--[research-->change the work (RESEARCH).\n'), real.getText());
      await waitFor(() => (view.document.getText().includes('\nAgents change the work (RESEARCH).\n') ? true : undefined), 'the hidden marker in the view');
      await vscode.workspace.saveAll(false);
      await waitFor(() => (real.isDirty ? undefined : true), 'the save of the file');
    } finally {
      research.dispose();
      markers.dispose();
    }
  });

  it('writes the current code of the source of each listing into a file on its save, from the open document of the source or the disk (R-CODE-002, R-FMT-001)', async () => {
    fs.mkdirSync(path.join(folder, 'src'), { recursive: true });
    const source = vscode.Uri.file(path.join(folder, 'src', 'read me.ts'));
    const code = '// markdownnotes: snippet read\nexport function read(path: string): string {\n  return path;\n}\n// markdownnotes: /snippet read\n\nexport const other = 1;\n';
    fs.writeFileSync(source.fsPath, code);
    const whole = code.split('\n').filter((line) => !line.includes('markdownnotes:')).join('\n').trimEnd();
    const file = vscode.Uri.file(path.join(folder, `test-${++count}.md`));
    const listing = (comment: string) => `${comment}\n\n\`\`\`typescript\nold\n\`\`\`\n`;
    fs.writeFileSync(file.fsPath, `Listing: Reading\n\n${listing('<!-- listing: src/read%20me.ts#read -->')}\n${listing('<!-- listing: src/read%20me.ts -->')}`);
    const document = await vscode.workspace.openTextDocument(file);
    await vscode.window.showTextDocument(document);
    // A file with listings opens in the clean editing view, which hides their comments; this test edits the file itself.
    await viewOf(file);
    await vscode.commands.executeCommand(commandOf('openWithMarkup'));
    const editor = await waitFor(() => (vscode.window.activeTextEditor?.document === document ? vscode.window.activeTextEditor : undefined), 'the text editor of the file');
    // A file without notes gets the format on save, because the formatter keeps its listings current.
    await editor.edit((edit) => edit.insert(new vscode.Position(document.lineCount - 1, 0), '\nEnd.\n'));
    assert.ok(await document.save(), 'the save of the file');
    const read = 'export function read(path: string): string {\n  return path;\n}';
    assert.equal(
      document.getText(),
      `Listing 1: [Reading](src/read%20me.ts#L2-L4) (read me.ts, L2-L4)\n\n<!-- listing: src/read%20me.ts#read -->\n\n\`\`\`typescript\n${read}\n\`\`\`\n\n<!-- listing: src/read%20me.ts -->\n\n\`\`\`typescript\n${whole}\n\`\`\`\n\nEnd.\n`,
    );
    // A change of the source that is not saved yet counts.
    const opened = await vscode.workspace.openTextDocument(source);
    const change = new vscode.WorkspaceEdit();
    change.replace(source, new vscode.Range(2, 9, 2, 13), 'path.trim()');
    assert.ok(await vscode.workspace.applyEdit(change), 'the change of the source');
    await editor.edit((edit) => edit.insert(new vscode.Position(document.lineCount - 1, 0), 'More.\n'));
    assert.ok(await document.save(), 'the second save of the file');
    assert.ok(document.getText().startsWith('Listing 1: [Reading](src/read%20me.ts#L2-L4) (read me.ts, L2-L4)\n\n<!-- listing: src/read%20me.ts#read -->\n\n```typescript\nexport function read(path: string): string {\n  return path.trim();\n}\n```\n'), document.getText());
    assert.ok(await opened.save(), 'the save of the source');
    // A snippet between its marks, and the comment of its listing as a link to its first line (R-CODE-003).
    const snippet = vscode.Uri.file(path.join(folder, 'src', 'snippet.py'));
    fs.writeFileSync(snippet.fsPath, 'def read(path):\n    # markdownnotes: snippet open-file\n    with open(path) as file:\n        return file.read()\n    # markdownnotes: /snippet open-file\n');
    await editor.edit((edit) => edit.insert(new vscode.Position(document.lineCount - 1, 0), '<!-- listing: src/snippet.py#open-file -->\n\n```python\n```\n'));
    assert.ok(await document.save(), 'the third save of the file');
    assert.ok(document.getText().endsWith('<!-- listing: src/snippet.py#open-file -->\n\n```python\nwith open(path) as file:\n    return file.read()\n```\n'), document.getText());
    const links = await vscode.commands.executeCommand<vscode.DocumentLink[]>('vscode.executeLinkProvider', document.uri);
    const link = links.find((candidate) => candidate.range.start.line === document.lineCount - 7);
    assert.equal(link?.target?.path, snippet.path);
    assert.equal(link?.target?.fragment, 'L3');
    // A listing that names no snippet, such as a function, keeps its code and gets a warning (R-CODE-005).
    await editor.edit((edit) => edit.insert(new vscode.Position(document.lineCount - 1, 0), '<!-- listing: src/snippet.py#read -->\n\n```python\n```\n'));
    const warning = await waitFor(() => vscode.languages.getDiagnostics(document.uri).find((diagnostic) => diagnostic.message.includes('has no snippet "read"')), 'the warning at the listing');
    assert.equal(warning.range.start.line, document.lineCount - 5);
  });

  it('shows only the caption and the code of a listing in the clean editing view, keeps typed text in the link of the caption, and links the caption to the source (R-CODE-001)', async () => {
    const source = vscode.Uri.file(path.join(folder, 'src', 'listed.ts'));
    fs.mkdirSync(path.dirname(source.fsPath), { recursive: true });
    fs.writeFileSync(source.fsPath, 'export const one = 1;\n');
    const file = vscode.Uri.file(path.join(folder, `test-${++count}.md`));
    const listing = 'Listing 1: [Caption](src/listed.ts) (listed.ts)\n\n<!-- listing: src/listed.ts -->\n\n```typescript\nexport const one = 1;\n```\n';
    fs.writeFileSync(file.fsPath, `${note}\n${listing}`);
    await vscode.commands.executeCommand('vscode.open', file);
    const view = await viewOf(file);
    assert.ok(view.document.getText().endsWith('\nMore.\n\nListing 1: Caption\n\n```typescript\nexport const one = 1;\n```\n'), view.document.getText());
    // Text typed over the caption stays in its link.
    const start = view.document.positionAt(view.document.getText().indexOf('Caption'));
    await view.edit((edit) => edit.replace(new vscode.Range(start, start.translate(0, 'Caption'.length)), 'Reading'));
    const real = await waitFor(
      () => vscode.workspace.textDocuments.find((document) => document.uri.toString() === file.toString() && document.getText().includes('Listing 1: [Reading](src/listed.ts) (listed.ts)')),
      'the new caption in the link',
    );
    assert.ok(real.getText().endsWith(`\n${listing.replace('Caption', 'Reading')}`), real.getText());
    // Ctrl+Click on the caption opens the source.
    const links = await vscode.commands.executeCommand<vscode.DocumentLink[]>('vscode.executeLinkProvider', view.document.uri);
    const link = links.find((candidate) => candidate.target?.path === source.path);
    assert.equal(link && view.document.getText(link.range), 'Reading');
    await vscode.workspace.saveAll(false);
    await waitFor(() => (real.isDirty ? undefined : true), 'the save of the file');
  });

  it('offers /snippet in the text editor of a source file after a slash that replaced selected lines (R-CODE-003)', async () => {
    const source = vscode.Uri.file(path.join(folder, 'src', `slash-${++count}.ts`));
    fs.mkdirSync(path.dirname(source.fsPath), { recursive: true });
    fs.writeFileSync(source.fsPath, 'export function keep(lines: string[]): string[] {\n  const kept = lines.filter(Boolean);\n  return kept;\n}\n');
    const editor = await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(source));
    const selected = new vscode.Selection(1, 0, 2, 14);
    editor.selection = selected;
    await new Promise((resolve) => setTimeout(resolve, 200));
    // VS Code replaces the selected lines with the typed slash.
    await editor.edit((edit) => edit.replace(selected, '/'));
    const list = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', source, new vscode.Position(1, 1), '/');
    const labels = list.items.map((item) => (typeof item.label === 'string' ? item.label : item.label.label));
    assert.ok(labels.includes('/snippet'), labels.join(', '));
    await vscode.commands.executeCommand('workbench.action.files.revert');
  });

  it('writes the marks of a snippet in the comment form that VS Code knows for a language that the extension does not know (R-CODE-003)', async () => {
    for (const [name, text, expected] of [
      ['keep.coffee', 'keep = (lines) ->\n  kept = lines.filter(Boolean)\n  kept\n', 'keep = (lines) ->\n  # markdownnotes: snippet kept\n  kept = lines.filter(Boolean)\n  # markdownnotes: /snippet kept\n  kept\n'],
      ['keep.fs', 'let keep lines =\n    let kept = List.filter id lines\n    kept\n', 'let keep lines =\n    // markdownnotes: snippet kept\n    let kept = List.filter id lines\n    // markdownnotes: /snippet kept\n    kept\n'],
    ]) {
      const source = vscode.Uri.file(path.join(folder, 'src', `${++count}-${name}`));
      fs.mkdirSync(path.dirname(source.fsPath), { recursive: true });
      fs.writeFileSync(source.fsPath, text);
      const editor = await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(source));
      await vscode.commands.executeCommand(commandOf('addSnippet'), source, new vscode.Range(1, 0, 2, 0), 'kept');
      assert.equal(editor.document.getText(), expected);
      await vscode.commands.executeCommand('workbench.action.files.revert');
    }
  });

  it('moves the cursor over the mark lines of a snippet, which show as tags (R-CODE-004)', async () => {
    const source = vscode.Uri.file(path.join(folder, 'src', `tag-${++count}.py`));
    fs.mkdirSync(path.dirname(source.fsPath), { recursive: true });
    fs.writeFileSync(source.fsPath, 'def read(path):\n    # markdownnotes: snippet open-file\n    return open(path).read()\n    # markdownnotes: /snippet open-file\n\n');
    const editor = await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(source));
    editor.selection = new vscode.Selection(0, 4, 0, 4);
    await vscode.commands.executeCommand('cursorDown');
    // The cursor does not stop on the start mark: it goes on to the first line of the code.
    await waitFor(() => (editor.selection.active.line === 2 ? true : undefined), 'the cursor on the code line');
    await vscode.commands.executeCommand('cursorDown');
    await waitFor(() => (editor.selection.active.line === 4 ? true : undefined), 'the cursor below the end mark');
    await vscode.commands.executeCommand('cursorUp');
    await waitFor(() => (editor.selection.active.line === 2 ? true : undefined), 'the cursor back on the code line');
  });

  it('hides the definitions of the standard footnotes in the clean editing view while the side view shows them (R-TEXT-009, R-FOOT-001)', async () => {
    const file = vscode.Uri.file(path.join(folder, `test-${++count}.md`));
    fs.writeFileSync(file.fsPath, note.replace('\nMore.\n', '\nMore.[^1]\n\n[^1]: A source.\n'));
    await vscode.commands.executeCommand('vscode.open', file);
    const view = await viewOf(file);
    assert.equal(view.document.getText(), '# Title\n\nThe text of the page and a highlight here.\n\nMore.[^1]\n');
    try {
      await settings().update('showFootnotes', false, vscode.ConfigurationTarget.Global);
      await waitFor(() => (view.document.getText().endsWith('More.[^1]\n\n[^1]: A source.\n') ? true : undefined), 'the definition in the view');
    } finally {
      await settings().update('showFootnotes', undefined, vscode.ConfigurationTarget.Global);
    }
    await waitFor(() => (view.document.getText().endsWith('More.[^1]\n') ? true : undefined), 'the hidden definition');
  });

  it('opens the side view "Notes", and "Hide Highlights" and "Show Highlights" change the setting showHighlights (R-SIDE-001, R-GEN-011)', async () => {
    await open(note, 2);
    await vscode.commands.executeCommand(`${commandOf('notes')}.focus`);
    try {
      await vscode.commands.executeCommand(commandOf('hideHighlights'));
      assert.equal(settings().get('showHighlights'), false);
      await vscode.commands.executeCommand(commandOf('showHighlights'));
      assert.equal(settings().get('showHighlights'), true);
    } finally {
      await settings().update('showHighlights', undefined, vscode.ConfigurationTarget.Global);
    }
  });

  it('gives the selected text of a paragraph the light bulb action "Add Note", and the text of a note none (R-EDIT-006)', async () => {
    const { document, editor } = await open(note, 2);
    const actionsAt = async (selection: vscode.Selection) => {
      editor.selection = selection;
      return (await vscode.commands.executeCommand<vscode.CodeAction[]>('vscode.executeCodeActionProvider', document.uri, selection)).filter(
        (action) => action.title === 'Add Note',
      );
    };
    const [action] = await actionsAt(new vscode.Selection(16, 0, 16, 4));
    assert.ok(action, 'the action of the selected text');
    assert.equal(action.kind?.value, 'quickfix.markdownNotes.addNote');
    assert.equal(action.command?.command, commandOf('newNote'));
    // The light bulb and Ctrl+. list every kind but the source actions, which VS Code shows only on request, and the
    // quick fixes first.
    assert.ok(vscode.CodeActionKind.QuickFix.contains(action.kind));
    const quickFixes = await vscode.commands.executeCommand<vscode.CodeAction[]>('vscode.executeCodeActionProvider', document.uri, editor.selection, vscode.CodeActionKind.QuickFix.value);
    assert.ok(quickFixes.some((candidate) => candidate.title === 'Add Note'));
    assert.deepEqual(await actionsAt(new vscode.Selection(6, 4, 6, 8)), []);
    assert.deepEqual(await actionsAt(new vscode.Selection(16, 2, 16, 2)), []);
  });

  it('runs "Add Note" and "Add Footnote" with shortcuts that VS Code does not use itself (R-EDIT-006, R-FOOT-003)', async () => {
    const mac = process.platform === 'darwin';
    const defaults = await vscode.workspace.openTextDocument(vscode.Uri.parse('vscode://defaultsettings/keybindings.json'));
    // The file of the default shortcuts holds comments, the shortcuts of VS Code and those of the extensions.
    const bindings = JSON.parse(
      defaults
        .getText()
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('//'))
        .join('\n'),
    ) as { key: string; command: string; when?: string }[];
    for (const [name, key] of [
      ['newNote', mac ? 'cmd+k n' : 'shift+alt+n'],
      ['addFootnote', mac ? 'cmd+k b' : 'shift+alt+b'],
    ]) {
      const own = bindings.filter((binding) => binding.key === key);
      assert.deepEqual(
        own.map(({ command }) => command),
        [commandOf(name)],
        key,
      );
      // "Add Note" needs selected text, and "Add Footnote" a place in the text.
      assert.equal(/editorHasSelection/.test(own[0].when ?? ''), name === 'newNote', key);
    }
  });

  it('offers the slash commands in the list of suggestions of a Markdown file (R-EDIT-008)', async () => {
    const { document } = await open('Written by /\n', 0);
    const list = await vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', document.uri, new vscode.Position(0, 12), '/');
    const own = list.items.map((item) => (typeof item.label === 'string' ? item.label : item.label.label)).filter((label) => label.startsWith('/'));
    // The test has no GitHub session: /user offers the sign-in.
    assert.deepEqual(own, ['/todo', '/footnote', '/date', '/time', '/user']);
  });

  it('formats a file and gives each start marker <wbr> before it (R-FMT-001)', async () => {
    const { document } = await open('One <!--[note-aaaa-->line[^note-aaaa]\nof text.\n\n[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00\n\n    A\n', 1);
    const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>('vscode.executeFormatDocumentProvider', document.uri, { tabSize: 4, insertSpaces: true });
    const edit = new vscode.WorkspaceEdit();
    edit.set(document.uri, edits);
    await vscode.workspace.applyEdit(edit);
    assert.equal(document.getText().split('\n')[0], 'One <wbr><!--[note-aaaa-->line[^note-aaaa] of text.');
  });

  it('formats a file with notes on a save, and keeps the text of a file without notes (R-FMT-001)', async () => {
    const { document, editor } = await open('One <!--[note-aaaa-->line[^note-aaaa]\nof text.\n\n[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00\n\n    A\n', 1);
    await editor.edit((edit) => edit.insert(new vscode.Position(0, 0), 'The '));
    assert.ok(await document.save(), 'the save of the file with notes');
    assert.equal(document.getText().split('\n')[0], 'The One <wbr><!--[note-aaaa-->line[^note-aaaa] of text.');
    const plain = await open('# Title\nOne\ntwo\n', 0);
    await plain.editor.edit((edit) => edit.insert(new vscode.Position(1, 0), 'The '));
    assert.ok(await plain.document.save(), 'the save of the file without notes');
    assert.equal(plain.document.getText(), '# Title\nThe One\ntwo\n');
  });

  it('the Markdown preview shows the highlight of each note in its color with its link, and never the text of a note or a footnote, and has the link of "Add Note" (R-PREV-001 to R-PREV-004, R-PREV-008)', async () => {
    const { document } = await open(note, 2);
    const html = await vscode.commands.executeCommand<string>('markdown.api.render', document);
    const link = (line: number) => `${vscode.env.uriScheme}://${extensionId}/open?${new URLSearchParams({ document: document.uri.toString(), line: String(line) }).toString().replace(/&/g, '&amp;')}`;
    const start = (number: number) => `<span class="nimblescape-note-edge" data-selection="nimblescape-note-${number}" data-edge="start"></span>`;
    const end = (number: number, color: number, label: string, line: number) =>
      `<span class="nimblescape-note-edge" data-selection="nimblescape-note-${number}" data-edge="end" data-color="${color}" data-note="${label}" data-href="${link(line)}"`;
    assert.ok(html.includes(`The text${end(1, 1, 'note-aaaa', 4)}`), html);
    assert.ok(html.includes(`and ${start(2)}a highlight${end(2, 2, 'note-bbbb', 12)}`), html);
    assert.doesNotMatch(html, /\[\^note-|&lt;!--|<!--\[note|footnote|An answer|Inline/);
    // The page ends with the link of "Add Note" for selected text of the preview (R-PREV-008).
    const add = `${vscode.env.uriScheme}://${extensionId}/add?${new URLSearchParams({ document: document.uri.toString() }).toString()}`;
    assert.ok(html.includes(`<div class="nimblescape-note-page" data-add="${add}" hidden></div>`), html);
  });

  it('finds the heading of a link of a note in the HTML of the Markdown preview of VS Code (R-SIDE-005)', async () => {
    const html = await vscode.commands.executeCommand<string>('markdown.api.render', '---\ntitle: x\n---\n# Hong et al.\n\nText.\n\n## Abstract\n\n## Abstract\n');
    assert.equal(headingLine(html, 'hong-et-al'), 3, html);
    assert.equal(headingLine(html, 'Abstract'), 7, html);
    assert.equal(headingLine(html, 'abstract-1'), 9, html);
    assert.equal(headingLine(html, 'missing'), undefined);
  });
});
