// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * formatMarkdown returns the formatted lines of a Markdown text, as the VS Code extension nimblescape Markdown Notes
 * and the command `markdownnotes format` format it: a start marker for each note without one, `<wbr>` before each start
 * marker, each paragraph on one line with its hard line breaks, the tables aligned, no white space at the end of a
 * line, one blank line between blocks and one line break at the end. Code blocks, HTML, the front matter, math,
 * containers and the answers of the notes stay as they are. It writes the current values of the front matter into
 * their fields, the numbers into the links to figures, tables, listings and sections, and with `options.source` the
 * current code into the listings. A text whose comment of the format names a higher major version stays as it is.
 * @param lines - The lines of the text, without their line breaks.
 */
export declare function formatMarkdown(lines: readonly string[], options?: FormatOptions): string[];

/** FormatOptions are the options of formatMarkdown. */
export interface FormatOptions {
  /**
   * source reads a file of source code of a listing (`<!-- listing: path#symbol -->` before a code block) by its path
   * relative to the Markdown file, as written in the comment, or returns undefined. The formatter then writes the
   * current code of the file, or of the symbol of the file, into the code block. Without it, the listings keep their
   * code.
   */
  source?: (path: string) => string | undefined;
}
