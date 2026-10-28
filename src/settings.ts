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

/**
 * linkTargets are the places where a link of a note to a file opens ([R-GEN-010](../docs/requirements.md#r-gen-010)):
 * in a new window of VS Code, in the editor of VS Code, or in the program of the system for the file.
 */
export const linkTargets = ['newWindow', 'editor', 'system'] as const;

/** LinkTarget is a place where a link of a note to a file opens. */
export type LinkTarget = (typeof linkTargets)[number];

/** Settings are the values of the settings of the extension. */
export interface Settings {
  /** showHighlights shows the highlight of each note in the text editor and the preview ([R-GEN-011](../docs/requirements.md#r-gen-011)). */
  showHighlights: boolean;
  /** openLinksIn is the place where a link of a note to a file opens ([R-GEN-010](../docs/requirements.md#r-gen-010)). */
  openLinksIn: LinkTarget;
  /** addFormatComment writes the comment of the format into a file with notes as soon as an editor shows it ([R-NOTE-007](../docs/requirements.md#r-note-007)). */
  addFormatComment: boolean;
}

/** defaultSettings are the values of the settings that the user did not set. */
export const defaultSettings: Readonly<Settings> = {
  showHighlights: true,
  openLinksIn: 'newWindow',
  addFormatComment: true,
};

/**
 * checkedSettings returns the settings with the default of each value that the setting does not take.
 * @param read - Returns the value of a setting, or undefined.
 */
export function checkedSettings(read: (key: keyof Settings) => unknown): Settings {
  const flag = (key: 'showHighlights' | 'addFormatComment'): boolean => {
    const raw = read(key);
    return typeof raw === 'boolean' ? raw : defaultSettings[key];
  };
  const raw = read('openLinksIn');
  return {
    showHighlights: flag('showHighlights'),
    openLinksIn: linkTargets.find((value) => value === raw) ?? defaultSettings.openLinksIn,
    addFormatComment: flag('addFormatComment'),
  };
}
