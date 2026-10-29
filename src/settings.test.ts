// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the default settings and the check of the values that
 * the user set.
 */

import { expect, test } from 'vitest';
import { checkedSettings, defaultSettings, type Settings } from './settings';

test('the defaults show the highlights, open links in a new window, add the comment of the format, and format a file with notes on save', () => {
  expect(defaultSettings).toEqual({
    showHighlights: true,
    openLinksIn: 'newWindow',
    addFormatComment: true,
    formatOnSave: true,
  });
});

test('checkedSettings keeps the values that the settings take', () => {
  const values: Record<keyof Settings, unknown> = {
    showHighlights: false,
    openLinksIn: 'system',
    addFormatComment: false,
    formatOnSave: false,
  };
  expect(checkedSettings((key) => values[key])).toEqual(values);
  expect(checkedSettings((key) => ({ openLinksIn: 'editor' })[key as string])).toMatchObject({ openLinksIn: 'editor' });
});

test('checkedSettings gives a missing value or a value that the setting does not take its default', () => {
  expect(checkedSettings(() => undefined)).toEqual(defaultSettings);
  const values: Record<keyof Settings, unknown> = {
    showHighlights: 'no',
    openLinksIn: true,
    addFormatComment: 'off',
    formatOnSave: 'no',
  };
  expect(checkedSettings((key) => values[key])).toEqual(defaultSettings);
  expect(checkedSettings((key) => (key === 'openLinksIn' ? 'NewWindow' : undefined)).openLinksIn).toBe('newWindow');
});
