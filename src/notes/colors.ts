// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The number and the color of each note of a file
 * ([R-TEXT-006](../../docs/requirements.md#r-text-006)): the number is the
 * place of the note in the file from the top, from 1, and the color comes
 * from the number. The text editor, the preview and the side view show both.
 * The module uses no API of VS Code.
 */

/**
 * noteColors are the colors of the notes, by their numbers: the first note has the first color. The colors carry a
 * white number on both light and dark themes.
 */
export const noteColors = ['#1a7fe0', '#2e8b3e', '#c7731a', '#8a4fc0', '#d33b3b', '#138a8a'] as const;

/**
 * colorIndexOf returns the index of the color of a note in noteColors, from 0.
 * @param number - The number of the note, from 1.
 */
export const colorIndexOf = (number: number): number => (number - 1) % noteColors.length;

/**
 * colorOf returns the color of a note.
 * @param number - The number of the note, from 1.
 */
export const colorOf = (number: number): string => noteColors[colorIndexOf(number)];
