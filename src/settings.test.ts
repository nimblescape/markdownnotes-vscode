// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the default settings and the check of the values that
 * the user set.
 */

import { expect, test } from 'vitest';
import { checkedSettings, defaultSettings, notePlaces, type Settings, showsInline, showsInSideView } from './settings';

test('the defaults show the notes in the preview with their icons and their callouts on hover and in the side view, collapse the notes and their boxes in the text editor without keeping them collapsed, show the funnel, open links in a new window, and add the comment of the format', () => {
  expect(defaultSettings).toEqual({
    expandInEditor: false,
    showInPreview: true,
    showCalloutOnHover: true,
    showIconsInPreview: true,
    collapseInEditor: true,
    keepNotesCollapsed: false,
    showFunnels: true,
    showNotesIn: 'sideView',
    openLinksIn: 'newWindow',
    addFormatComment: true,
  });
});

test('checkedSettings keeps the values that the settings take', () => {
  const values: Record<keyof Settings, unknown> = {
    expandInEditor: true,
    showInPreview: false,
    showCalloutOnHover: false,
    showIconsInPreview: false,
    collapseInEditor: false,
    keepNotesCollapsed: true,
    showFunnels: false,
    showNotesIn: 'inline',
    openLinksIn: 'system',
    addFormatComment: false,
  };
  expect(checkedSettings((key) => values[key])).toEqual(values);
  expect(checkedSettings((key) => ({ showNotesIn: 'sideView', openLinksIn: 'editor' })[key as string])).toMatchObject({ showNotesIn: 'sideView', openLinksIn: 'editor' });
});

test('checkedSettings gives a missing value or a value that the setting does not take its default', () => {
  expect(checkedSettings(() => undefined)).toEqual(defaultSettings);
  const values: Record<keyof Settings, unknown> = {
    expandInEditor: 'yes',
    showInPreview: null,
    showCalloutOnHover: 0,
    showIconsInPreview: 'hidden',
    collapseInEditor: 1,
    keepNotesCollapsed: 'on',
    showFunnels: 'no',
    showNotesIn: 'Inline',
    openLinksIn: true,
    addFormatComment: 'off',
  };
  expect(checkedSettings((key) => values[key])).toEqual(defaultSettings);
  // The value "both" of an earlier version of the setting is no longer a value (Hannes, 2026-10-28 15:19).
  expect(checkedSettings((key) => (key === 'showNotesIn' ? 'both' : undefined)).showNotesIn).toBe('sideView');
});

test('showNotesIn chooses the side view or the boxes of the text editor, never both (R-GEN-009)', () => {
  expect(notePlaces.map((showNotesIn) => [showsInline({ showNotesIn }), showsInSideView({ showNotesIn })])).toEqual([
    [false, true],
    [true, false],
  ]);
});
