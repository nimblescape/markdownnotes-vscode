// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The messages between the plugin of the notes on the page of the editor of a whole file
 * ([R-TEXT-010](../../docs/requirements.md#r-text-010)) and the extension, through the channel of the plugin. The page
 * shows the content of a file, so each side checks each message before it uses it. The module uses no API of VS Code
 * and of the browser, so that both sides use it.
 */

/** pluginName is the name of the plugin of the notes, which names its channel. */
export const pluginName = 'notes';

/**
 * PageMessage is a message of the page: `ready` when the editor starts, `selection` with the selection of the editor
 * as places in the text of the file and whether the mouse made it, and `comment` for the button "Comment" of the format
 * bar, which adds a note to the selected text.
 */
export type PageMessage = { type: 'ready' } | { type: 'selection'; anchor: number; head: number; mouse: boolean } | { type: 'comment' };

/**
 * ExtensionMessage is a message of the extension: `select` with the label of the selected note, or none, and whether
 * the editor scrolls to it, and `highlights` with whether the highlights of the notes show.
 */
export type ExtensionMessage = { type: 'select'; label: string | undefined; reveal: boolean } | { type: 'highlights'; show: boolean };

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
  if (message.type === 'ready' || message.type === 'comment') {
    return { type: message.type };
  }
  if (message.type === 'selection' && isOffset(message.anchor) && isOffset(message.head)) {
    return { type: 'selection', anchor: message.anchor, head: message.head, mouse: message.mouse === true };
  }
  return undefined;
}

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
  return undefined;
}
