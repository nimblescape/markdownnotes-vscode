// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the default settings and the check of the values that
 * the user set.
 */

import { expect, test } from 'vitest';
import { checkedSettings, defaultSettings, type Settings } from './settings';

test('the defaults show the notes in the preview, and collapsed in the text editor', () => {
  expect(defaultSettings).toEqual({ expandInEditor: false, showInPreview: true });
});

test('checkedSettings keeps the values of the right type', () => {
  const values: Record<keyof Settings, unknown> = { expandInEditor: true, showInPreview: false };
  expect(checkedSettings((key) => values[key])).toEqual({ expandInEditor: true, showInPreview: false });
});

test('checkedSettings gives a missing value or a value of another type its default', () => {
  expect(checkedSettings(() => undefined)).toEqual(defaultSettings);
  const values: Record<keyof Settings, unknown> = { expandInEditor: 'yes', showInPreview: null };
  expect(checkedSettings((key) => values[key])).toEqual(defaultSettings);
});
