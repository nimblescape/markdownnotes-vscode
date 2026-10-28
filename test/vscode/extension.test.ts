// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/// <reference types="mocha" />
// Tests in a real VS Code (npm run test:vscode, .vscode-test.mjs): mocha runs them in the extension host. They open
// Markdown files of a temporary folder, and check the threads of the notes in the text editor at their selections with
// one comment for each answer (R-TEXT-001, R-NOTE-004, R-NOTE-006), the save of an edited answer (R-EDIT-002), the
// refused text, the delete (R-EDIT-004), the collapsed notes (R-TEXT-005), the side view (R-SIDE-001), and the icons
// and callouts of the Markdown preview of VS Code (R-PREV-001 to R-PREV-004) with the markdown-it plugin of the
// extension, and the headings of the links of the side view in the HTML of the preview (R-SIDE-005). The tests add no
// note and no answer, because these need a GitHub sign-in (R-GEN-006), which a test cannot give.

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

/**
 * note is a Markdown text with two notes of one paragraph: the note of ann with the reply of bob, whose selection
 * starts at the start of the paragraph, and the note of carl on a passage with a start marker.
 */
const note = [
  '# Title',
  '',
  'The text[^note-aaaa] of the page and <!--[note-bbbb-->a passage[^note-bbbb] here.',
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

/** first is the definition of the note of ann with the reply of bob. */
const first = '[^note-aaaa]: **ann** · 2026-10-28 10:15+01:00\n\n    The **text** of the note.\n\n    > **bob** · 2026-10-28 11:00+01:00\n    >\n    > An answer.\n';

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

  it('shows a thread for each note at its selection, with a comment for each answer (R-TEXT-001, R-NOTE-004, R-NOTE-006)', async () => {
    const { threads } = await open(note, 2);
    assert.deepEqual(
      threads.map((thread) => [thread.range?.start.line, thread.range?.start.character, thread.range?.end.line, thread.range?.end.character, thread.canReply]),
      [
        [2, 0, 2, 8, true],
        [2, 54, 2, 63, true],
      ],
    );
    assert.deepEqual(
      threads.map((thread) => thread.comments.map((comment) => [comment.author.name, bodyOf(comment)])),
      [
        [
          ['ann', 'The **text** of the note.'],
          ['bob', 'An answer.'],
        ],
        [['carl', 'Inline']],
      ],
    );
    assert.equal(threads[0].comments[0].timestamp?.toISOString(), '2026-10-28T09:15:00.000Z');
    assert.equal(threads[1].comments[0].timestamp?.toISOString(), '2026-10-28T12:00:00.000Z');
  });

  it('writes the text of the editor of an answer into the note (R-EDIT-002)', async () => {
    const { document, threads } = await open(note, 2);
    const comment = threads[0].comments[1];
    await vscode.commands.executeCommand(commandOf('editAnswer'), comment);
    assert.equal(comment.mode, vscode.CommentMode.Editing);
    // VS Code sets the body to the text of the editor before the button runs.
    comment.body = new vscode.MarkdownString('A new *answer*.\n\nA second paragraph.');
    await vscode.commands.executeCommand(commandOf('saveAnswer'), comment);
    assert.equal(document.getText(), note.replace('    > An answer.', '    > A new *answer*.\n    >\n    > A second paragraph.'));
    assert.equal(comment.mode, vscode.CommentMode.Preview);
    const extension = await api();
    await waitFor(() => (bodyOf(extension.threadsOf(document.uri)[0].comments[1]) === 'A new *answer*.\n\nA second paragraph.' ? true : undefined), 'the saved body');
    assert.equal(extension.threadsOf(document.uri)[0], threads[0]);
  });

  it('refuses a text that would start another answer', async () => {
    const { document, threads } = await open(note, 2);
    const comment = threads[0].comments[0];
    comment.body = new vscode.MarkdownString('> **eve** · 2026-10-28 12:00+01:00\n>\n> Not an answer of eve.');
    await vscode.commands.executeCommand(commandOf('saveAnswer'), comment);
    assert.equal(document.getText(), note);
  });

  it('deletes an answer and a whole note from the file (R-EDIT-004)', async () => {
    const { document, threads } = await open(note, 2);
    // The reply of bob becomes the first answer.
    const shorter = note.replace(first, '[^note-aaaa]: **bob** · 2026-10-28 11:00+01:00\n\n    An answer.\n');
    await vscode.commands.executeCommand(commandOf('deleteAnswer'), threads[0].comments[0]);
    assert.equal(document.getText(), shorter);
    await vscode.commands.executeCommand(commandOf('deleteNote'), threads[1]);
    assert.equal(document.getText(), shorter.replace('<!--[note-bbbb-->', '').replace('[^note-bbbb]', '').replace('[^note-bbbb]: **carl** · 2026-10-28 12:00Z\n\n    Inline\n\n', ''));
    const extension = await api();
    await waitFor(() => (extension.threadsOf(document.uri).length === 1 && extension.threadsOf(document.uri)[0].comments.length === 1 ? true : undefined), 'one thread with one answer');
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
    await vscode.commands.executeCommand(commandOf('expandAllNotes'));
    await waitFor(() => (editor.visibleRanges.length === 1 ? true : undefined), 'the expanded note');
  });

  it('opens the side view "Notes" (R-SIDE-001)', async () => {
    await open(note, 2);
    await vscode.commands.executeCommand(`${commandOf('notes')}.focus`);
  });

  it('the Markdown preview shows the notes as icons at their references with callouts, and never as footnotes (R-PREV-001 to R-PREV-004)', async () => {
    const { document } = await open(note, 2);
    const html = await vscode.commands.executeCommand<string>('markdown.api.render', document);
    const link = `${vscode.env.uriScheme}://${extensionId}/open?${new URLSearchParams({ document: document.uri.toString(), line: '4' }).toString().replace(/&/g, '&amp;')}`;
    const edge = (number: number, side: string) => `<span class="nimblescape-note-edge" data-selection="nimblescape-note-${number}" data-edge="${side}" data-color="${number}"></span>`;
    assert.ok(html.includes(`The text${edge(1, 'end')}<a class="nimblescape-note-icon nimblescape-note-color-1" aria-label="Note by ann, 2 answers" aria-describedby="nimblescape-note-1" href="${link}">`), html);
    assert.match(html, new RegExp(`and ${edge(2, 'start')}a passage${edge(2, 'end')}<a class="nimblescape-note-icon nimblescape-note-color-2" aria-label="Note by carl" aria-describedby="nimblescape-note-2" href="[^"]*line=12">`));
    assert.match(html, /<div class="nimblescape-note nimblescape-note-color-1" id="nimblescape-note-1" role="note" aria-label="Note by ann, 2 answers" hidden>/);
    // The date shows in the local time of the reader, and its tooltip in the local time of the author.
    assert.match(html, /<span class="nimblescape-note-author">ann<\/span><time class="nimblescape-note-date" datetime="2026-10-28T10:15\+01:00" title="2026-10-28 10:15 at the author \(UTC\+01:00\)">2026-10-28 \d{2}:\d{2}<\/time>/);
    assert.match(html, /<span class="nimblescape-note-author">bob<\/span>/);
    assert.match(html, /<strong>text<\/strong> of the note\./);
    assert.doesNotMatch(html, /\[\^note-|&lt;!--|<!--\[note|footnote/);
  });

  it('finds the heading of a link of a note in the HTML of the Markdown preview of VS Code (R-SIDE-005)', async () => {
    const html = await vscode.commands.executeCommand<string>('markdown.api.render', '---\ntitle: x\n---\n# Hong et al.\n\nText.\n\n## Abstract\n\n## Abstract\n');
    assert.equal(headingLine(html, 'hong-et-al'), 3, html);
    assert.equal(headingLine(html, 'Abstract'), 7, html);
    assert.equal(headingLine(html, 'abstract-1'), 9, html);
    assert.equal(headingLine(html, 'missing'), undefined);
  });
});
