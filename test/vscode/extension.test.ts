// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/// <reference types="mocha" />
// Tests in a real VS Code (npm run test:vscode, .vscode-test.mjs): mocha runs them in the extension host. They open
// Markdown files of a temporary folder, and check the threads of the notes in the text editor (R-TEXT-001), the save
// of an edited note (R-EDIT-002), the refused text (R-NOTE-003), the delete (R-EDIT-004), and the callouts of the
// Markdown preview of VS Code (R-PREV-001, R-PREV-002) with the markdown-it plugin of the extension.

import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Api } from '../../src/extension';

/** extensionId is the identifier of the extension. */
const extensionId = 'nimblescape.nimblescape-markdown-note';

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
 * bodyOf returns the text of the body of a comment.
 * @param comment - The comment.
 */
const bodyOf = (comment: vscode.Comment): string => (typeof comment.body === 'string' ? comment.body : comment.body.value);

/** note is a Markdown text with a note on lines of its own and a note in a paragraph. */
const note = [
  '# Title',
  '',
  '<!-- note',
  '---',
  'author: Ann',
  'date: 2026-10-28T10:15+01:00',
  '---',
  'The **text** of the note.',
  '-->',
  '',
  'A sentence <!-- note',
  'Inline',
  '--> and more.',
  '',
].join('\n');

describe('nimblescape Markdown Note', () => {
  let folder: string;
  let count = 0;

  before(() => {
    folder = fs.mkdtempSync(path.join(os.tmpdir(), 'markdown-note-'));
  });

  after(() => {
    fs.rmSync(folder, { recursive: true, force: true });
  });

  afterEach(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  /**
   * open writes a Markdown file, opens it in the text editor, and returns it with the threads of its notes.
   * @param text - The text of the file.
   * @param notes - The number of notes that the file holds.
   */
  async function open(text: string, notes: number): Promise<{ document: vscode.TextDocument; threads: readonly vscode.CommentThread[] }> {
    const file = path.join(folder, `test-${++count}.md`);
    fs.writeFileSync(file, text);
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
    await vscode.window.showTextDocument(document);
    const extension = await api();
    const threads = await waitFor(() => {
      const found = extension.threadsOf(document.uri);
      return found.length === notes ? found : undefined;
    }, `${notes} threads`);
    return { document, threads };
  }

  it('shows a thread for each note, with the body, the author and the date (R-TEXT-001)', async () => {
    const { threads } = await open(note, 2);
    assert.deepEqual(
      threads.map((thread) => [thread.range?.start.line, thread.range?.end.line, thread.canReply]),
      [
        [2, 8, false],
        [10, 12, false],
      ],
    );
    const [first, second] = threads.map((thread) => thread.comments[0]);
    assert.equal(bodyOf(first), 'The **text** of the note.');
    assert.equal(first.author.name, 'Ann');
    assert.equal(first.timestamp?.toISOString(), '2026-10-28T09:15:00.000Z');
    assert.equal(bodyOf(second), 'Inline');
    assert.equal(second.author.name, 'Note');
  });

  it('writes the text of the editor of a box into the comment of the note (R-EDIT-002)', async () => {
    const { document, threads } = await open(note, 2);
    const comment = threads[0].comments[0];
    await vscode.commands.executeCommand('nimblescape.markdownNote.editNote', comment);
    assert.equal(comment.mode, vscode.CommentMode.Editing);
    // VS Code sets the body to the text of the editor before the button runs.
    comment.body = new vscode.MarkdownString('A new *text*.\n\nA second paragraph.');
    await vscode.commands.executeCommand('nimblescape.markdownNote.saveNote', comment);
    assert.equal(
      document.getText(),
      note.replace('The **text** of the note.', 'A new *text*.\n\nA second paragraph.'),
    );
    assert.equal(comment.mode, vscode.CommentMode.Preview);
    const extension = await api();
    await waitFor(() => (bodyOf(extension.threadsOf(document.uri)[0].comments[0]) === 'A new *text*.\n\nA second paragraph.' ? true : undefined), 'the saved body');
    assert.equal(extension.threadsOf(document.uri)[0], threads[0]);
  });

  it('refuses a text that contains another comment (R-NOTE-003)', async () => {
    const { document, threads } = await open(note, 2);
    const comment = threads[0].comments[0];
    comment.body = new vscode.MarkdownString('A <!-- comment --> in the note');
    await vscode.commands.executeCommand('nimblescape.markdownNote.saveNote', comment);
    assert.equal(document.getText(), note);
  });

  it('deletes a note from the file (R-EDIT-004)', async () => {
    const { document, threads } = await open(note, 2);
    await vscode.commands.executeCommand('nimblescape.markdownNote.deleteNote', threads[1].comments[0]);
    assert.equal(document.getText(), note.replace(' <!-- note\nInline\n-->', ''));
    const extension = await api();
    await waitFor(() => (extension.threadsOf(document.uri).length === 1 ? true : undefined), 'one thread');
  });

  it('the Markdown preview shows the notes as callouts (R-PREV-001, R-PREV-002)', async () => {
    const { document } = await open(note, 2);
    const html = await vscode.commands.executeCommand<string>('markdown.api.render', document);
    assert.match(html, /<div class="nimblescape-note[^"]*"[^>]*role="note" aria-label="Note by Ann">/);
    assert.match(html, /<span class="nimblescape-note-author">Ann<\/span><time class="nimblescape-note-date" datetime="2026-10-28T10:15\+01:00">2026-10-28 10:15<\/time>/);
    assert.match(html, /<strong>text<\/strong> of the note\./);
    assert.match(html, /A sentence <sup class="nimblescape-note-reference"><span class="nimblescape-note-number">1<\/span><\/sup> and more\./);
    assert.match(html, /aria-label="Note 1"/);
    assert.doesNotMatch(html, /&lt;!--/);
  });
});
