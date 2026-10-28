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
 * notePlaces are the places where VS Code shows the text of the notes ([R-GEN-009](../docs/requirements.md#r-gen-009)):
 * the side view, or the boxes of the text editor ("inline"). VS Code shows the notes in one of them, never in both.
 */
export const notePlaces = ['sideView', 'inline'] as const;

/** NotePlace is a place where VS Code shows the text of the notes. */
export type NotePlace = (typeof notePlaces)[number];

/**
 * linkTargets are the places where a link of a note to a file opens ([R-GEN-010](../docs/requirements.md#r-gen-010)):
 * in a new window of VS Code, in the editor of VS Code, or in the program of the system for the file.
 */
export const linkTargets = ['newWindow', 'editor', 'system'] as const;

/** LinkTarget is a place where a link of a note to a file opens. */
export type LinkTarget = (typeof linkTargets)[number];

/** Settings are the values of the settings of the extension. */
export interface Settings {
  /** expandInEditor opens the box of each note in the text editor ([R-TEXT-002](../docs/requirements.md#r-text-002)). */
  expandInEditor: boolean;
  /** showInPreview shows the icons of the notes in the Markdown preview ([R-PREV-005](../docs/requirements.md#r-prev-005)). */
  showInPreview: boolean;
  /** showCalloutOnHover shows the callout of a note while the pointer rests on its icon in the preview ([R-PREV-002](../docs/requirements.md#r-prev-002)). */
  showCalloutOnHover: boolean;
  /** collapseInEditor collapses the notes of a file in the text editor ([R-TEXT-005](../docs/requirements.md#r-text-005)). */
  collapseInEditor: boolean;
  /** keepNotesCollapsed keeps the notes collapsed in the text editor: nothing expands them ([R-TEXT-005](../docs/requirements.md#r-text-005)). */
  keepNotesCollapsed: boolean;
  /** showFunnels shows the funnel from the selected thread of the side view to its note ([R-SIDE-007](../docs/requirements.md#r-side-007)). */
  showFunnels: boolean;
  /** showNotesIn is the place where VS Code shows the text of the notes ([R-GEN-009](../docs/requirements.md#r-gen-009)). */
  showNotesIn: NotePlace;
  /** openLinksIn is the place where a link of a note to a file opens ([R-GEN-010](../docs/requirements.md#r-gen-010)). */
  openLinksIn: LinkTarget;
  /** addFormatComment writes the comment of the format into a file with notes as soon as an editor shows it ([R-NOTE-007](../docs/requirements.md#r-note-007)). */
  addFormatComment: boolean;
}

/** defaultSettings are the values of the settings that the user did not set. */
export const defaultSettings: Readonly<Settings> = {
  expandInEditor: false,
  showInPreview: true,
  showCalloutOnHover: true,
  collapseInEditor: true,
  keepNotesCollapsed: false,
  showFunnels: true,
  showNotesIn: 'sideView',
  openLinksIn: 'newWindow',
  addFormatComment: true,
};

/**
 * checkedSettings returns the settings with the default of each value that the setting does not take.
 * @param read - Returns the value of a setting, or undefined.
 */
export function checkedSettings(read: (key: keyof Settings) => unknown): Settings {
  const flag = (key: 'expandInEditor' | 'showInPreview' | 'showCalloutOnHover' | 'collapseInEditor' | 'keepNotesCollapsed' | 'showFunnels' | 'addFormatComment'): boolean => {
    const raw = read(key);
    return typeof raw === 'boolean' ? raw : defaultSettings[key];
  };
  const choice = <T extends string>(key: 'showNotesIn' | 'openLinksIn', values: readonly T[]): T => {
    const raw = read(key);
    return values.find((value) => value === raw) ?? (defaultSettings[key] as T);
  };
  return {
    expandInEditor: flag('expandInEditor'),
    showInPreview: flag('showInPreview'),
    showCalloutOnHover: flag('showCalloutOnHover'),
    collapseInEditor: flag('collapseInEditor'),
    keepNotesCollapsed: flag('keepNotesCollapsed'),
    showFunnels: flag('showFunnels'),
    showNotesIn: choice('showNotesIn', notePlaces),
    openLinksIn: choice('openLinksIn', linkTargets),
    addFormatComment: flag('addFormatComment'),
  };
}

/**
 * showsInline tells whether the text of the notes shows in the boxes of the text editor.
 * @param settings - The settings.
 */
export const showsInline = (settings: Pick<Settings, 'showNotesIn'>): boolean => settings.showNotesIn === 'inline';

/**
 * showsInSideView tells whether the text of the notes shows in the side view.
 * @param settings - The settings.
 */
export const showsInSideView = (settings: Pick<Settings, 'showNotesIn'>): boolean => settings.showNotesIn === 'sideView';
