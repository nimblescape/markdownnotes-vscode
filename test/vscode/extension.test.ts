// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/// <reference types="mocha" />
// Tests in a real VS Code (npm run test:vscode, .vscode-test.mjs): mocha runs them in the extension host. They open
// Markdown files of a temporary folder, and check the threads of the notes in the text editor with one comment for
// each answer (R-TEXT-001, R-NOTE-004), the save of an edited answer (R-EDIT-002), the refused text (R-NOTE-003), the
// delete (R-EDIT-004), the collapsed notes (R-TEXT-005), the side view (R-SIDE-001), and the icons and callouts of the Markdown preview of VS Code
// (R-PREV-001 to R-PREV-004) with the markdown-it plugin of the extension, and the headings of the links of the side
// view in the HTML of the preview (R-SIDE-005). The tests add no note and no answer, because
// these need a GitHub sign-in (R-GEN-006), which a test cannot give.

import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Api } from '../../src/extension';
import { headingLine } from '../../src/links';

/** extensionId is the identifier of the extension. */
const extensionId = 'nimblescape.nimblescape-markdown-notes';

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
 * bodyOf returns the text of the body of a comment.
 * @param comment - The comment.
 */
const bodyOf = (comment: vscode.Comment): string => (typeof comment.body === 'string' ? comment.body : comment.body.value);

/** note is a Markdown text with a block note of two answers and an inline note in the text of a line. */
const note = [
  '# Title',
  '',
  '<!-- note',
  '---',
  'author: ann',
  'date: 2026-10-28T10:15+01:00',
  '---',
  'The **text** of the note.',
  '---',
  'author: bob',
  '---',
  'An answer.',
  '-->',
  '',
  'A sentence <!-- note inline',
  'Inline',
  '--> and more.',
  '',
].join('\n');

describe('nimblescape Markdown Notes', () => {
  let folder: string;
  let count = 0;

  before(() => {
    folder = fs.mkdtempSync(path.join(os.tmpdir(), 'markdown-notes-'));
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

  it('shows a thread for each note, with a comment for each answer (R-TEXT-001, R-NOTE-004)', async () => {
    const { threads } = await open(note, 2);
    assert.deepEqual(
      threads.map((thread) => [thread.range?.start.line, thread.range?.end.line, thread.canReply]),
      [
        [2, 12, true],
        [14, 16, true],
      ],
    );
    assert.deepEqual(
      threads.map((thread) => thread.comments.map((comment) => [comment.author.name, bodyOf(comment)])),
      [
        [
          ['ann', 'The **text** of the note.'],
          ['bob', 'An answer.'],
        ],
        [['Note', 'Inline']],
      ],
    );
    assert.equal(threads[0].comments[0].timestamp?.toISOString(), '2026-10-28T09:15:00.000Z');
  });

  it('writes the text of the editor of an answer into the comment of the note (R-EDIT-002)', async () => {
    const { document, threads } = await open(note, 2);
    const comment = threads[0].comments[1];
    await vscode.commands.executeCommand(commandOf('editAnswer'), comment);
    assert.equal(comment.mode, vscode.CommentMode.Editing);
    // VS Code sets the body to the text of the editor before the button runs.
    comment.body = new vscode.MarkdownString('A new *answer*.\n\nA second paragraph.');
    await vscode.commands.executeCommand(commandOf('saveAnswer'), comment);
    assert.equal(document.getText(), note.replace('An answer.', 'A new *answer*.\n\nA second paragraph.'));
    assert.equal(comment.mode, vscode.CommentMode.Preview);
    const extension = await api();
    await waitFor(() => (bodyOf(extension.threadsOf(document.uri)[0].comments[1]) === 'A new *answer*.\n\nA second paragraph.' ? true : undefined), 'the saved body');
    assert.equal(extension.threadsOf(document.uri)[0], threads[0]);
  });

  it('refuses a text that contains another comment (R-NOTE-003)', async () => {
    const { document, threads } = await open(note, 2);
    const comment = threads[0].comments[0];
    comment.body = new vscode.MarkdownString('A <!-- comment --> in the note');
    await vscode.commands.executeCommand(commandOf('saveAnswer'), comment);
    assert.equal(document.getText(), note);
  });

  it('deletes an answer and a whole note from the file (R-EDIT-004)', async () => {
    const { document, threads } = await open(note, 2);
    await vscode.commands.executeCommand(commandOf('deleteAnswer'), threads[0].comments[0]);
    assert.equal(document.getText(), note.replace('---\nauthor: ann\ndate: 2026-10-28T10:15+01:00\n---\nThe **text** of the note.\n', ''));
    await vscode.commands.executeCommand(commandOf('deleteNote'), threads[1]);
    assert.equal(document.getText(), note.replace('---\nauthor: ann\ndate: 2026-10-28T10:15+01:00\n---\nThe **text** of the note.\n', '').replace(' <!-- note inline\nInline\n-->', ''));
    const extension = await api();
    await waitFor(() => (extension.threadsOf(document.uri).length === 1 && extension.threadsOf(document.uri)[0].comments.length === 1 ? true : undefined), 'one thread with one answer');
  });

  it('collapses the notes the first time the file is in the active editor, so that an inline note leaves no paragraph break (R-TEXT-005)', async () => {
    const { document } = await open('One line.\n\n<!-- note inline\nA\n-->\n\nTwo lines.\n', 1);
    const editor = await waitFor(() => vscode.window.visibleTextEditors.find((candidate) => candidate.document === document), 'the editor');
    // The visible ranges of the editor split at a collapsed fold: the fold of the note takes lines 1 to 5.
    const ranges = await waitFor(() => (editor.visibleRanges.length === 2 ? editor.visibleRanges : undefined), 'the collapsed note');
    assert.deepEqual(
      ranges.map((range) => [range.start.line, range.end.line]),
      [
        [0, 0],
        [6, 7],
      ],
    );
    await vscode.commands.executeCommand(commandOf('expandAllNotes'));
    await waitFor(() => (editor.visibleRanges.length === 1 ? true : undefined), 'the expanded note');
  });

  it('opens the side view "Notes" (R-SIDE-001)', async () => {
    await open(note, 2);
    await vscode.commands.executeCommand(`${commandOf('notes')}.focus`);
  });

  it('the Markdown preview shows the notes as icons with callouts, and removes the inline note from the text (R-PREV-001 to R-PREV-004)', async () => {
    const { document } = await open(note, 2);
    const html = await vscode.commands.executeCommand<string>('markdown.api.render', document);
    const link = `${vscode.env.uriScheme}://${extensionId}/open?${new URLSearchParams({ document: document.uri.toString(), line: '2' }).toString().replace(/&/g, '&amp;')}`;
    assert.ok(html.includes(`<div class="nimblescape-note-anchor"><a class="nimblescape-note-icon nimblescape-note-color-1" aria-label="Note by ann, 2 answers" aria-describedby="nimblescape-note-1" href="${link}">`), html);
    assert.match(html, /<div class="nimblescape-note nimblescape-note-color-1" id="nimblescape-note-1" role="note" aria-label="Note by ann, 2 answers" hidden>/);
    assert.match(html, /<span class="nimblescape-note-author">ann<\/span><time class="nimblescape-note-date" datetime="2026-10-28T10:15\+01:00">2026-10-28 10:15<\/time>/);
    assert.match(html, /<span class="nimblescape-note-author">bob<\/span><\/div>/);
    assert.match(html, /<strong>text<\/strong> of the note\./);
    assert.match(html, /A sentence<a class="nimblescape-note-icon nimblescape-note-color-2" aria-label="Note" aria-describedby="nimblescape-note-2" href="[^"]*line=14">.*?<\/a> and more\.<\/p>/);
    assert.doesNotMatch(html, /&lt;!--|<!-- note/);
  });

  it('finds the heading of a link of a note in the HTML of the Markdown preview of VS Code (R-SIDE-005)', async () => {
    const html = await vscode.commands.executeCommand<string>('markdown.api.render', '---\ntitle: x\n---\n# Hong et al.\n\nText.\n\n## Abstract\n\n## Abstract\n');
    assert.equal(headingLine(html, 'hong-et-al'), 3, html);
    assert.equal(headingLine(html, 'Abstract'), 7, html);
    assert.equal(headingLine(html, 'abstract-1'), 9, html);
    assert.equal(headingLine(html, 'missing'), undefined);
  });
});
