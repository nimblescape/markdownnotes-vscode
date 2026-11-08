// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The slash commands of Notes in the editor of a whole file, the view "Markdown Editor"
 * ([R-EDIT-008](../../docs/requirements.md#r-edit-008), [decision 79](../../docs/requirements.md#decisions)): the same
 * names and the same results as in the text editor. The editor of nimblescape Markdown offers them in its list of slash
 * commands, which removes the typed command before a command runs
 * ([the slash commands](https://github.com/nimblescape/markdown/blob/main/docs/editor.md#r-gen-003)).
 *
 * - `/note` and `/todo` on selected text: the slash typed on selected text keeps the text, and the command asks the
 *   extension to add a note or a todo note to it, as the button "Comment" does.
 * - `/todo` after text, `/footnote` after a word: the command removes the spaces before it; `/todo` adds a todo note to
 *   the sentence before it, and `/footnote` opens the editor of a new standard footnote in the side view.
 * - `/figure`, `/table` and `/listing` in a paragraph of their own, `/ref` after text, and `/user`: the extension runs
 *   the command of the text editor on the text of the file that the page sends, with its lists of VS Code, and sends
 *   back the change of the text and the text to select, for example the caption, which the editor makes as a change of
 *   the user. `/table` of Notes, a table with its caption, takes the place of the table of the editor, and `/footnote`
 *   of Notes the place of its footnote.
 * - `/date` and `/time` insert the date and the time at once, as the text editor does.
 *
 * The module uses no API of VS Code.
 */

import type { Editor } from '@tiptap/core';
import type { MenuItem, PluginChannel, PluginEditor } from '@nimblescape/markdowneditor';
import type { ExtensionMessage, PageMessage, SlashName } from '../notes/editorMessages';
import { dateText, timeText } from '../notes/slash';

/** footnoteId and tableId are the ids of the footnote and the table of the editor, whose places the commands of Notes take. */
const footnoteId = 'footnote';
const tableId = 'table';

/** SlashConnection is the connection of the slash commands of an editor to the extension. */
export interface SlashConnection {
  readonly editor: PluginEditor;
  readonly channel: PluginChannel;
  /** requests counts the requests of the editor. */
  requests: number;
  /** waiting holds the text of the file that each open request sent, by its number. */
  readonly waiting: Map<number, string>;
}

/**
 * takeChange makes the change that the extension sent for a request of a slash command, when the text of the file is
 * still the text that the request sent, and selects the text that the change names.
 * @param connection - The connection.
 * @param message - The message of the extension.
 * @returns Whether the editor made the change.
 */
export function takeChange(connection: SlashConnection, message: Extract<ExtensionMessage, { type: 'change' }>): boolean {
  const sent = connection.waiting.get(message.request);
  connection.waiting.delete(message.request);
  const { editor } = connection;
  if (sent === undefined || editor.getMarkdown() !== sent || !editor.changeText(message.patches)) {
    return false;
  }
  if (message.select) {
    editor.selectText(message.select.from, message.select.to);
  }
  return true;
}

/**
 * place returns the text of the block of the cursor before it, without a typed command at its end, and after it.
 * @param tiptap - The Tiptap editor.
 */
function place(tiptap: Editor): { before: string; after: string; topLevel: boolean; text: boolean } {
  const { $head } = tiptap.state.selection;
  const block = $head.parent;
  if (!block.isTextblock || block.type.spec.code) {
    return { before: '', after: '', topLevel: false, text: false };
  }
  return {
    before: block.textBetween(0, $head.parentOffset, '\n', '\n').replace(/(^|\s)\/[a-z]*$/, '$1'),
    after: block.textBetween($head.parentOffset, block.content.size, '\n', '\n'),
    topLevel: $head.depth === 1 && block.type.name === 'paragraph',
    text: true,
  };
}

/**
 * removeSpacesBefore removes the spaces before the cursor, which a command without a text of its own removes with the
 * typed command, as in the text editor.
 * @param tiptap - The Tiptap editor.
 */
function removeSpacesBefore(tiptap: Editor): void {
  const { $head } = tiptap.state.selection;
  const spaces = /[ \t]*$/.exec($head.parent.textBetween(0, $head.parentOffset, '\n', '\n'))![0].length;
  if (spaces > 0) {
    tiptap.view.dispatch(tiptap.state.tr.delete($head.pos - spaces, $head.pos));
  }
}

/**
 * slashItems returns the slash commands of Notes for the place of the cursor of an editor.
 * @param tiptap - The Tiptap editor.
 * @param connection - The connection to the extension, or undefined without one.
 */
export function slashItems(tiptap: Editor, connection: SlashConnection | undefined): MenuItem[] {
  if (!tiptap.isEditable) {
    return [];
  }
  const post = (message: PageMessage) => connection?.channel.post(message);
  /** request asks the extension to run a command on the text of the file at the cursor. */
  const request = (command: SlashName) => {
    if (!connection) {
      return;
    }
    const id = ++connection.requests;
    const text = connection.editor.getMarkdown();
    connection.waiting.set(id, text);
    post({ type: 'slash', request: id, command, text, at: connection.editor.textOffset(tiptap.state.selection.head) });
  };
  const insert = (text: string) => tiptap.chain().focus().insertContent(text).run();
  const now = new Date();
  const items: MenuItem[] = [
    { id: 'notes-date', label: `Date: ${dateText(now)}`, slash: 'date', keywords: ['today'], icon: 'paragraph', run: () => insert(dateText(new Date())) },
    { id: 'notes-time', label: `Time: ${timeText(now)}`, slash: 'time', keywords: ['now'], icon: 'paragraph', run: () => insert(timeText(new Date())) },
  ];
  if (!connection) {
    return items;
  }
  const at = place(tiptap);
  const afterText = at.text && at.before.trim() !== '' && /\s$/.test(at.before);
  const ownLine = at.topLevel && at.before.trim() === '' && at.after.trim() === '';
  items.unshift(
    { id: 'notes-note', label: 'Add Note', slash: 'note', keywords: ['comment'], icon: 'note', selection: true, run: () => post({ type: 'comment' }) },
    { id: 'notes-todo-selection', label: 'Add Todo', slash: 'todo', icon: 'taskList', selection: true, run: () => post({ type: 'comment', todo: true }) },
  );
  if (afterText) {
    items.push({
      id: 'notes-todo',
      label: 'Add Todo to the sentence before',
      slash: 'todo',
      icon: 'taskList',
      run: () => {
        removeSpacesBefore(tiptap);
        request('todo');
      },
    });
    // The footnote of Notes opens its editor in the side view, in place of the footnote of the editor.
    items.push({
      id: footnoteId,
      label: 'Footnote',
      slash: 'footnote',
      icon: 'footnote',
      hint: '[^1]',
      run: () => {
        removeSpacesBefore(tiptap);
        post({ type: 'footnote' });
      },
    });
    items.push({ id: 'notes-ref', label: 'Link a Figure, Table or Section', slash: 'ref', keywords: ['reference', 'link'], icon: 'link', run: () => request('ref') });
  }
  if (!afterText) {
    // As in the text editor, a footnote stands only after a word.
    items.push({ id: footnoteId, label: 'Footnote', hidden: true, run: () => undefined });
  }
  if (ownLine) {
    items.push(
      { id: 'notes-figure', label: 'Figure', slash: 'figure', keywords: ['image', 'picture'], icon: 'image', run: () => request('figure') },
      // The table of Notes has its caption, in place of the table of the editor.
      { id: tableId, label: 'Table with caption', slash: 'table', keywords: ['grid'], icon: 'table', hint: '| |', run: () => request('table') },
      { id: 'notes-listing', label: 'Listing', slash: 'listing', keywords: ['code', 'source'], icon: 'codeBlock', run: () => request('listing') },
    );
  } else {
    // As in the text editor, a table stands in a paragraph of its own.
    items.push({ id: tableId, label: 'Table', hidden: true, run: () => undefined });
  }
  items.push({ id: 'notes-user', label: 'Your GitHub login', slash: 'user', keywords: ['login', 'name'], icon: 'paragraph', run: () => request('user') });
  return items;
}
