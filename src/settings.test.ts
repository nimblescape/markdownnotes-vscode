// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the default settings and the check of the values that
 * the user set.
 */

import { expect, test } from 'vitest';
import { checkedSettings, defaultSettings, type Settings } from './settings';

test('the defaults show the notes in the preview, collapsed in the text editor, with the author of Git', () => {
  expect(defaultSettings).toEqual({ author: '', expandInEditor: false, showInPreview: true });
});

test('checkedSettings keeps the values of the right type, and trims the author', () => {
  const values: Record<keyof Settings, unknown> = { author: '  Hannes Stauss ', expandInEditor: true, showInPreview: false };
  expect(checkedSettings((key) => values[key])).toEqual({ author: 'Hannes Stauss', expandInEditor: true, showInPreview: false });
});

test('checkedSettings gives a missing value or a value of another type its default', () => {
  expect(checkedSettings(() => undefined)).toEqual(defaultSettings);
  const values: Record<keyof Settings, unknown> = { author: 42, expandInEditor: 'yes', showInPreview: null };
  expect(checkedSettings((key) => values[key])).toEqual(defaultSettings);
});
