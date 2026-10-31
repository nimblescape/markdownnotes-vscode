// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The types of the markdown-it plugins of other Markdown extensions, which the compatibility tests use
// (src/markdown/compatibility.test.ts). The packages have no types of their own.

declare module 'markdown-it-footnote' {
  import type { PluginSimple } from 'markdown-it';
  const footnote: PluginSimple;
  export default footnote;
}

declare module 'markdown-it-emoji' {
  import type { PluginSimple } from 'markdown-it';
  const emoji: PluginSimple;
  export default emoji;
}

declare module 'markdown-it-task-lists' {
  import type { PluginSimple } from 'markdown-it';
  const taskLists: PluginSimple;
  export default taskLists;
}
