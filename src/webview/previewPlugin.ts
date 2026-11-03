// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The plugin of the editor that shows the blocks of the extensions of the Markdown preview of VS Code
// (docs/requirements.md, R-VSC-010). The extension renders the top-level blocks of the text with the plugins of these
// extensions in the extension host (src/adapter/preview.ts), and the connection of the page keeps each block that
// they show in another way than the editor, with its HTML. This plugin of the level "render" of the editor
// makes each such block one unit with its source: a rule of markdown-it finds the text of a known block at
// the start of a top-level block, and a fenced code block with a language that the extensions show, for example
// `mermaid`, is such a unit too while the extension has not yet answered for its new text. The unit shows the HTML of
// the extension, or its text as code until the HTML is there. After each change of the rendering, the page sends the
// event `vscode.markdown.updateContent` on `window`, as the Markdown preview does, because the scripts of these
// extensions, for example of diagrams, wait for it. A new analysis of the extension shows the new HTML of the blocks,
// and the editor parses the text again, so that a block that the extensions show, or no longer show, changes.

import type { RenderFunction, RenderPlugin } from '@nimblescape/markdownrender';
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs';
import type { PreviewBlock } from '../adapter/messages';
import type { VsCodePreview } from './connection';

/** previewPluginName is the name of the plugin. */
export const previewPluginName = 'vscodePreview';

/** previewToken is the type of the token of a block that the extensions of the Markdown preview show. */
export const previewToken = 'vscode_preview';

/** updateContentEvent is the event of the Markdown preview of VS Code after each change of its content. */
export const updateContentEvent = 'vscode.markdown.updateContent';

/**
 * VsCodePreviewPlugin is the plugin of the editor that shows the blocks of the extensions of the Markdown preview, a
 * plugin of the level "render" of @nimblescape/markdowneditor.
 */
export interface VsCodePreviewPlugin extends RenderPlugin {
  readonly render: Readonly<Record<string, RenderFunction>>;
  /** activate follows the new analyses of the extension, and returns the function that stops it. */
  readonly activate: (editor: { reparse(): void }) => () => void;
}

/** Shown is an element that shows a block, with the text of the block and the HTML that it shows. */
interface Shown {
  readonly element: HTMLElement;
  readonly text: string;
  html: string | undefined;
}

/** Known is a known block: its lines and its HTML. */
interface Known {
  readonly lines: readonly string[];
  readonly text: string;
}

/**
 * previewPlugin returns the plugin that shows the blocks of the extensions of the Markdown preview in the editor.
 * @param preview - The blocks of the connection, `connection.preview`.
 * @param target - The window of the page, which gets the event `vscode.markdown.updateContent`.
 */
export function previewPlugin(preview: VsCodePreview, target: Window = window): VsCodePreviewPlugin {
  /** byFirstLine holds the known blocks by their first line, the longest first. */
  let byFirstLine = new Map<string, Known[]>();
  let htmlOf = new Map<string, string>();
  let languages = new Set<string>();
  const shown = new Set<Shown>();
  let announcing = false;

  const take = (blocks: readonly PreviewBlock[], known: readonly string[]) => {
    byFirstLine = new Map();
    htmlOf = new Map();
    for (const block of blocks) {
      htmlOf.set(block.text, block.html);
      const lines = block.text.split('\n');
      byFirstLine.set(lines[0], [...(byFirstLine.get(lines[0]) ?? []), { lines, text: block.text }]);
    }
    byFirstLine.forEach((list) => list.sort((a, b) => b.lines.length - a.lines.length));
    languages = new Set(known);
  };

  /** announce sends the event of a new content once, after the editor put the elements into the page. */
  const announce = () => {
    if (announcing) {
      return;
    }
    announcing = true;
    setTimeout(() => {
      announcing = false;
      target.dispatchEvent(new CustomEvent(updateContentEvent));
    }, 0);
  };

  /** show shows the HTML of the block of an element, or its text as code while the HTML is not there. */
  const show = (entry: Shown) => {
    const html = htmlOf.get(entry.text);
    if (entry.html === html && entry.element.childNodes.length > 0) {
      return;
    }
    entry.html = html;
    if (html === undefined) {
      const pre = entry.element.ownerDocument.createElement('pre');
      pre.className = 'nsmd-preview-waiting';
      const code = entry.element.ownerDocument.createElement('code');
      code.textContent = entry.text;
      pre.append(code);
      entry.element.replaceChildren(pre);
    } else {
      entry.element.innerHTML = html;
    }
    announce();
  };

  take(preview.blocks, preview.languages);
  return {
    name: previewPluginName,
    apiVersion: 1,
    extendMarkdownIt: (md) => {
      // A known block at the start of a top-level block is one token, which no node of the editor takes. It ends a
      // paragraph before it, as the rules of the extensions do, for example a container.
      const rule = (state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean => {
        const top = state.parentType === 'root' || (silent && state.parentType === 'paragraph');
        if (state.level !== 0 || !top || byFirstLine.size === 0) {
          return false;
        }
        const lineAt = (line: number) => state.src.slice(state.bMarks[line], state.eMarks[line]);
        const candidates = byFirstLine.get(lineAt(startLine));
        const found = candidates?.find(
          (known) => startLine + known.lines.length <= endLine && known.lines.every((line, offset) => offset === 0 || lineAt(startLine + offset) === line),
        );
        if (!found) {
          return false;
        }
        if (!silent) {
          const token = state.push(previewToken, 'div', 0);
          token.block = true;
          token.map = [startLine, startLine + found.lines.length];
          token.content = found.text;
        }
        state.line = startLine + found.lines.length;
        return true;
      };
      md.block.ruler.before('table', previewToken, rule, { alt: ['paragraph'] });
      // A top-level fenced code block with a language that the extensions show is such a token too.
      md.core.ruler.after('block', `${previewToken}_fence`, (state) => {
        if (languages.size === 0) {
          return;
        }
        let lines: string[] | undefined;
        for (const token of state.tokens) {
          if (token.type !== 'fence' || token.level !== 0 || !token.map || !languages.has(token.info.trim().split(/\s+/)[0])) {
            continue;
          }
          lines ??= state.src.split('\n');
          let end = token.map[1];
          while (end > token.map[0] + 1 && /^[ \t]*$/.test(lines[end - 1] ?? '')) {
            end--;
          }
          token.type = previewToken;
          token.tag = 'div';
          token.content = lines.slice(token.map[0], end).join('\n');
          token.map = [token.map[0], end];
        }
      });
      // Without a page, for example in a text of HTML, the token shows the HTML of the extension, or its text as code.
      md.renderer.rules[previewToken] = (tokens, index) => {
        const html = htmlOf.get(tokens[index].content);
        return html ?? `<pre class="nsmd-preview-waiting"><code>${md.utils.escapeHtml(tokens[index].content)}</code></pre>\n`;
      };
    },
    render: {
      [previewToken]: (source, element) => {
        const entry: Shown = { element, text: source, html: undefined };
        element.replaceChildren();
        show(entry);
        shown.add(entry);
        return () => {
          shown.delete(entry);
        };
      },
    },
    activate: (editor) =>
      preview.onChange(() => {
        take(preview.blocks, preview.languages);
        shown.forEach(show);
        editor.reparse();
      }),
  };
}
