// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The messages between the plugin of the notes on the page of the editor of a whole file
 * ([R-TEXT-010](../../docs/requirements.md#r-text-010)) and the extension, through the channel of the plugin. The page
 * shows the content of a file, so each side checks each message before it uses it. The module uses no API of VS Code
 * and of the browser, so that both sides use it.
 */

import type { JumpKeys } from '@nimblescape/markdownrender/jumps';

/** pluginName is the name of the plugin of the notes, which names its channel. */
export const pluginName = 'notes';

/**
 * SlashName is a slash command of the editor that the extension runs on the text of the file, as in the text editor
 * ([R-EDIT-008](../../docs/requirements.md#r-edit-008)): `/todo` on the sentence before the cursor, and the commands
 * that need the workspace or the GitHub login.
 */
export type SlashName = 'todo' | 'figure' | 'table' | 'listing' | 'ref' | 'user';

/** slashNames are the names of SlashName. */
export const slashNames: readonly SlashName[] = ['todo', 'figure', 'table', 'listing', 'ref', 'user'];

/** TextPatch is a change of a range of the text of the file: its places in the text before the change and its new text. */
export interface TextPatch {
  from: number;
  to: number;
  insert: string;
}

/**
 * PageMessage is a message of the page: `ready` when the editor starts, `selection` with the selection of the editor
 * as places in the text of the file and whether the mouse made it, `comment` for the button "Comment" of the format
 * bar and for `/note` and `/todo` on selected text, which add a note or a todo note to the selected text, `footnote` for
 * `/footnote`, which adds a standard footnote at the cursor, and `slash` for a slash command that the extension runs on
 * the text of the file at a place of the cursor.
 */
export type PageMessage =
  | { type: 'ready' }
  | { type: 'selection'; anchor: number; head: number; mouse: boolean }
  | { type: 'comment'; todo?: true }
  | { type: 'footnote' }
  | { type: 'slash'; request: number; command: SlashName; text: string; at: number };

/**
 * ExtensionMessage is a message of the extension: `select` with the label of the selected note, or none, and whether
 * the editor scrolls to it, `highlights` with whether the highlights of the notes show, `jumpKeys` with the keys that
 * the user binds to Go Back and Go Forward of VS Code ([R-TEXT-011](../../docs/requirements.md#r-text-011)), and
 * `change` with the result of
 * a slash command: the patches of the text that the page sent with the request, and the range of the text to select
 * after them, for example the caption of a new figure.
 */
export type ExtensionMessage =
  | { type: 'select'; label: string | undefined; reveal: boolean }
  | { type: 'highlights'; show: boolean }
  | { type: 'jumpKeys'; keys: JumpKeys }
  | { type: 'change'; request: number; patches: TextPatch[]; select?: { from: number; to: number } };

/** isOffset is true for a place in a text: a whole number from 0. */
const isOffset = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;

/** labelPattern matches the label of a note. */
const labelPattern = /^note-[a-z0-9]{4}$/;

/**
 * pageMessage returns a message of the page, or undefined for another value.
 * @param value - The value that the page sent.
 */
export function pageMessage(value: unknown): PageMessage | undefined {
  const message = value as Record<string, unknown> | null;
  if (typeof message !== 'object' || message === null) {
    return undefined;
  }
  if (message.type === 'ready' || message.type === 'footnote') {
    return { type: message.type };
  }
  if (message.type === 'comment') {
    return message.todo === true ? { type: 'comment', todo: true } : { type: 'comment' };
  }
  if (message.type === 'selection' && isOffset(message.anchor) && isOffset(message.head)) {
    return { type: 'selection', anchor: message.anchor, head: message.head, mouse: message.mouse === true };
  }
  if (
    message.type === 'slash' &&
    isOffset(message.request) &&
    slashNames.includes(message.command as SlashName) &&
    typeof message.text === 'string' &&
    isOffset(message.at) &&
    message.at <= message.text.length
  ) {
    return { type: 'slash', request: message.request, command: message.command as SlashName, text: message.text, at: message.at };
  }
  return undefined;
}

/**
 * isPatch is true for a patch of a text: a range of places and a text.
 * @param value - The value.
 */
const isPatch = (value: unknown): value is TextPatch => {
  const patch = value as Record<string, unknown> | null;
  return typeof patch === 'object' && patch !== null && isOffset(patch.from) && isOffset(patch.to) && patch.from <= patch.to && typeof patch.insert === 'string';
};

/**
 * extensionMessage returns a message of the extension, or undefined for another value.
 * @param value - The value that the extension sent.
 */
export function extensionMessage(value: unknown): ExtensionMessage | undefined {
  const message = value as Record<string, unknown> | null;
  if (typeof message !== 'object' || message === null) {
    return undefined;
  }
  if (message.type === 'select' && (message.label === undefined || (typeof message.label === 'string' && labelPattern.test(message.label)))) {
    return { type: 'select', label: message.label, reveal: message.reveal === true };
  }
  if (message.type === 'highlights' && typeof message.show === 'boolean') {
    return { type: 'highlights', show: message.show };
  }
  if (message.type === 'jumpKeys') {
    const keys = message.keys as Record<string, unknown> | null;
    const strings = (list: unknown): list is string[] => Array.isArray(list) && list.every((each) => typeof each === 'string');
    if (typeof keys === 'object' && keys !== null && strings(keys.back) && strings(keys.forward)) {
      return { type: 'jumpKeys', keys: { back: [...keys.back], forward: [...keys.forward] } };
    }
  }
  if (message.type === 'change' && isOffset(message.request) && Array.isArray(message.patches) && message.patches.every(isPatch)) {
    const select = message.select as Record<string, unknown> | undefined;
    const patches = (message.patches as TextPatch[]).map(({ from, to, insert }) => ({ from, to, insert }));
    return select && isOffset(select.from) && isOffset(select.to) && select.from <= select.to
      ? { type: 'change', request: message.request, patches, select: { from: select.from, to: select.to } }
      : { type: 'change', request: message.request, patches };
  }
  return undefined;
}
