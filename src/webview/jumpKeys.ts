// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The keys of Go Back and Go Forward on the page of the Markdown Editor
 * ([R-TEXT-011](../../docs/requirements.md#r-text-011)): the keys that the user binds to Go Back and Go Forward of VS
 * Code, which the extension sends through the channel of the plugin of the notes, and the default keys of VS Code on
 * the platform until they come.
 */

import { type JumpKeys, type Platform, vscodeJumpKeys } from '@nimblescape/markdownrender/jumps';

let received: JumpKeys | undefined;

/**
 * takeJumpKeys keeps the keys that the extension sent.
 * @param keys - The keys.
 */
export function takeJumpKeys(keys: JumpKeys): void {
  received = keys;
}

/**
 * jumpKeysOf returns the function that gives the editor the keys of now.
 * @param platform - The platform, for the default keys.
 */
export function jumpKeysOf(platform: Platform): () => JumpKeys {
  return () => received ?? vscodeJumpKeys(platform);
}
