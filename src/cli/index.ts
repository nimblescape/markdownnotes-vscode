// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The library of the npm package @nimblescape/markdownnotes ([R-FMT-004](../../docs/requirements.md#r-fmt-004)): the
 * formatter of Markdown files with notes for programs, for example the command markdownpaper of nimblescape Markdown
 * Paper, which formats the notes first and then its own parts, and the text of a file without its notes
 * ([R-HIDE-004](../../docs/requirements.md#r-hide-004)) for a program that publishes it. Loading it runs nothing. Its types are in
 * cli/index.d.ts, which names no type of other packages, because the package has no dependencies.
 */

export { formatMarkdown } from '../format/format';
export { stripNotes } from '../notes/strip';
