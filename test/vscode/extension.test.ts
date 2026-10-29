/// <reference types="mocha" />
// Tests in a real VS Code (npm run test:vscode, .vscode-test.mjs): mocha runs them in the extension host. They open
// Markdown files of a temporary folder, and check the notes and their highlights (R-NOTE-004, R-NOTE-006), the comment
// of the format on a save (R-NOTE-007), the collapsed notes (R-TEXT-005), the side view and the buttons of the highlights
// (R-SIDE-001, R-GEN-011), the hover over the selected text (R-EDIT-006), the formatter and its format on save of a file
// with notes (R-FMT-001), and the highlights of the Markdown preview of VS Code (R-PREV-001 to R-PREV-004) with the
// markdown-it plugin of the extension, and the headings of the links of the side view in the HTML of the preview
// (R-SIDE-005). The tests add no note and no answer, because these need a GitHub sign-in (R-GEN-006), which a test
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
const extensionId = 'nimblescape.nimblescape-markdown-notes';

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
    folder = fs.mkdtempSync(path.join(os.tmpdir(), 'markdown-notes-'));
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
   * open writes a Markdown file, opens it in the text editor, and returns it with its editor and its notes.
   * @param text - The text of the file.
   * @param notes - The number of notes that the file holds.
   */
  async function open(text: string, notes: number): Promise<{ document: vscode.TextDocument; editor: vscode.TextEditor; found: ReturnType<Api['notesOf']> }> {
    const file = path.join(folder, `test-${++count}.md`);
    fs.writeFileSync(file, text);
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
    const editor = await vscode.window.showTextDocument(document);
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

  it('gives the selected text of a paragraph a hover with "Add Note" and an icon of each color, and the text of a note none (R-EDIT-006)', async () => {
    const { document, editor } = await open(note, 2);
    const hoverAt = async (line: number, character: number) =>
      (await vscode.commands.executeCommand<vscode.Hover[]>('vscode.executeHoverProvider', document.uri, new vscode.Position(line, character)))
        .flatMap((hover) => hover.contents)
        .map((content) => (typeof content === 'string' ? content : content.value))
        .filter((value) => value.startsWith('Add Note'));
    editor.selection = new vscode.Selection(16, 0, 16, 4);
    let text: string | undefined;
    for (let tries = 0; tries < 100 && text === undefined; tries++) {
      [text] = await hoverAt(16, 2);
      if (text === undefined) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
    assert.ok(text, 'the hover of the selected text');
    assert.equal(text.match(/codicon-circle-large-filled/g)?.length, 6);
    assert.match(text, /\(command:nimblescape\.markdownNotes\.newNote\?%5B%22green%22%5D "Add a note in green"\)/);
    editor.selection = new vscode.Selection(6, 4, 6, 8);
    assert.deepEqual(await hoverAt(6, 6), []);
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

  it('the Markdown preview shows the highlight of each note in its color with its link, and never the text of a note or a footnote (R-PREV-001 to R-PREV-004)', async () => {
    const { document } = await open(note, 2);
    const html = await vscode.commands.executeCommand<string>('markdown.api.render', document);
    const link = (line: number) => `${vscode.env.uriScheme}://${extensionId}/open?${new URLSearchParams({ document: document.uri.toString(), line: String(line) }).toString().replace(/&/g, '&amp;')}`;
    const start = (number: number) => `<span class="nimblescape-note-edge" data-selection="nimblescape-note-${number}" data-edge="start"></span>`;
    const end = (number: number, color: number, label: string, line: number) =>
      `<span class="nimblescape-note-edge" data-selection="nimblescape-note-${number}" data-edge="end" data-color="${color}" data-note="${label}" data-href="${link(line)}"`;
    assert.ok(html.includes(`The text${end(1, 1, 'note-aaaa', 4)}`), html);
    assert.ok(html.includes(`and ${start(2)}a highlight${end(2, 2, 'note-bbbb', 12)}`), html);
    assert.doesNotMatch(html, /\[\^note-|&lt;!--|<!--\[note|footnote|An answer|Inline/);
  });

  it('finds the heading of a link of a note in the HTML of the Markdown preview of VS Code (R-SIDE-005)', async () => {
    const html = await vscode.commands.executeCommand<string>('markdown.api.render', '---\ntitle: x\n---\n# Hong et al.\n\nText.\n\n## Abstract\n\n## Abstract\n');
    assert.equal(headingLine(html, 'hong-et-al'), 3, html);
    assert.equal(headingLine(html, 'Abstract'), 7, html);
    assert.equal(headingLine(html, 'abstract-1'), 9, html);
    assert.equal(headingLine(html, 'missing'), undefined);
  });
});
