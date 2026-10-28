// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The color of each note ([R-TEXT-006](../../docs/requirements.md#r-text-006)):
 * every note has the same color by default, and the user can give a note
 * another color in the side view (Hannes, 2026-10-28: "notes can be colored in
 * the notes editor, by default they get all the same color"). The start marker
 * of a note holds the name of its color, for example `<!--[note-7k2q green-->`
 * (Hannes, 2026-10-28, on the card "Where should the file keep the color": "In
 * the start marker"). The text editor, the preview and the side view show it.
 * The module uses no API of VS Code.
 */

/**
 * noteColors are the colors of the notes; the first one is the color of every note without a color of its own. Each
 * one stands out on both light and dark themes.
 */
export const noteColors = ['#1a7fe0', '#2e8b3e', '#c7731a', '#8a4fc0', '#d33b3b', '#138a8a'] as const;

/** colorNames are the names of noteColors, by which the start marker of a note names its color. */
export const colorNames = ['blue', 'green', 'orange', 'purple', 'red', 'teal'] as const;

/** ColorName is the name of a color of a note. */
export type ColorName = (typeof colorNames)[number];

/**
 * colorIndexOf returns the index of the color of a note in noteColors, from 0: of the color of its own, or of the
 * first color.
 * @param note - The note.
 */
export const colorIndexOf = (note: { color?: string }): number => Math.max(colorNames.indexOf(note.color as ColorName), 0);

/**
 * colorOf returns the color of a note.
 * @param note - The note.
 */
export const colorOf = (note: { color?: string }): string => noteColors[colorIndexOf(note)];
