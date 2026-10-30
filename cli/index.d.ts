// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * formatMarkdown returns the formatted lines of a Markdown text, as the VS Code extension nimblescape Markdown Notes
 * and the command `markdownnotes format` format it: a start marker for each note without one, `<wbr>` before each start
 * marker, each paragraph on one line with its hard line breaks, the tables aligned, no white space at the end of a
 * line, one blank line between blocks and one line break at the end. Code blocks, HTML, the front matter, math,
 * containers and the answers of the notes stay as they are. A text whose comment of the format names a higher major
 * version stays as it is.
 * @param lines - The lines of the text, without their line breaks.
 */
export declare function formatMarkdown(lines: readonly string[]): string[];
