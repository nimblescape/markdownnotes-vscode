// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The settings of the extension, their defaults, and the check of their
 * values. The module uses no API of VS Code, so its tests need no fake of the
 * editor API.
 */

/** settingsSection is the section of the settings of the extension. */
export const settingsSection = 'nimblescape.markdownNotes';

/** Settings are the values of the settings of the extension. */
export interface Settings {
  /** expandInEditor opens the box of each note in the text editor ([R-TEXT-002](../docs/requirements.md#r-text-002)). */
  expandInEditor: boolean;
  /** showInPreview shows the icons of the notes in the Markdown preview ([R-PREV-005](../docs/requirements.md#r-prev-005)). */
  showInPreview: boolean;
}

/** defaultSettings are the values of the settings that the user did not set. */
export const defaultSettings: Readonly<Settings> = { expandInEditor: false, showInPreview: true };

/**
 * checkedSettings returns the settings with the default of each value that has another type than the setting takes.
 * @param read - Returns the value of a setting, or undefined.
 */
export function checkedSettings(read: (key: keyof Settings) => unknown): Settings {
  const expandInEditor = read('expandInEditor');
  const showInPreview = read('showInPreview');
  return {
    expandInEditor: typeof expandInEditor === 'boolean' ? expandInEditor : defaultSettings.expandInEditor,
    showInPreview: typeof showInPreview === 'boolean' ? showInPreview : defaultSettings.showInPreview,
  };
}
