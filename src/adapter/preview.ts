// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The extensions of the Markdown preview of VS Code in the editor (docs/requirements.md, R-VSC-010). Such an extension
// declares its parts in its package.json: `markdown.markdownItPlugins`, with a function `extendMarkdownIt(md)` that its
// `activate` returns, `markdown.previewStyles` and `markdown.previewScripts`. The adapter finds them as the Markdown
// preview of VS Code does, but leaves out the extensions that contribute plugins of the editor (R-VSC-008) and the
// extension that registers the editor, because their plugins of the editor show their syntax. It calls each
// `extendMarkdownIt` on a markdown-it with the options of the renderer (the options of the renderer of nimblescape Markdown).
//
// These functions run in the extension host, not in the page. So the adapter renders the top-level blocks of the text
// with them here, and compares the HTML of each block with the HTML of the renderer without them: a block whose HTML
// differs becomes a block of the level "render" on the page, with this HTML (a block of the level "render" of the plugins of the editor). A paragraph,
// a heading, a list, a block quote, a table, a line, a block of HTML and the definition of a footnote stay blocks of the
// editor. A code block stays a code block of the editor while its HTML is still code, a `pre` with a `code`; only a
// code block whose language a plugin shows as something else, for example a diagram, becomes a block of the level
// "render". The raw HTML of the file shows as its text, as in the editor.
//
// The code imports no module `vscode` and uses no Node.js API, as the rest of the side of the extension.

import { createMarkdownIt, MarkdownRenderer, type MarkdownItExtension, type RendererOptions } from '@nimblescape/markdownrender';
import { frontMatterOf } from '@nimblescape/markdowntext';
import type * as vscode from 'vscode';
import type { PreviewBlock } from './messages';

/** PreviewScript is a script of `markdown.previewScripts`: its file, and true for a module of JavaScript. */
export interface PreviewScript {
  readonly uri: vscode.Uri;
  readonly module: boolean;
}

/** PreviewContribution is an extension of the Markdown preview with its style sheets and its scripts. */
export interface PreviewContribution {
  readonly extension: vscode.Extension<unknown>;
  readonly styles: readonly vscode.Uri[];
  readonly scripts: readonly PreviewScript[];
}

/** PreviewAnalysis is what the page needs of a text: the blocks that the extensions show, and the languages of their code blocks. */
export interface PreviewAnalysis {
  readonly blocks: PreviewBlock[];
  readonly languages: string[];
}

/** isRecord is true for an object that is no array. */
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

/** slashed returns the address of a folder with a slash at its end. */
const slashed = (address: string): string => (address.endsWith('/') ? address : `${address}/`);

/** editorContribution is the contribution point of the plugins of the editor (R-VSC-008). */
const editorContribution = 'nimblescape.markdown.extensions';

/**
 * fileOf returns a file of the folder of an extension, or undefined for a path that leaves the folder.
 * @param api - The API of VS Code.
 * @param extension - The extension.
 * @param path - The path in the package.json of the extension.
 */
function fileOf(api: typeof vscode, extension: vscode.Extension<unknown>, path: unknown): vscode.Uri | undefined {
  if (typeof path !== 'string' || path.trim() === '') {
    return undefined;
  }
  const uri = api.Uri.joinPath(extension.extensionUri, path);
  return uri.toString().startsWith(slashed(extension.extensionUri.toString())) ? uri : undefined;
}

/**
 * previewContributions returns the extensions of the Markdown preview whose syntax the editor shows, in the order of
 * their IDs: the enabled extensions with `markdown.markdownItPlugins`, without the extensions that contribute plugins
 * of the editor and without the extension that registers the editor.
 * @param api - The API of VS Code.
 * @param own - A file of the extension that registers the editor, for example the script of its page.
 */
export function previewContributions(api: typeof vscode, own?: vscode.Uri): PreviewContribution[] {
  const ownAddress = own?.toString();
  const contributions: PreviewContribution[] = [];
  const extensions = [...api.extensions.all].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const extension of extensions) {
    const contributes: unknown = (extension.packageJSON as { contributes?: unknown } | undefined)?.contributes;
    if (!isRecord(contributes) || contributes['markdown.markdownItPlugins'] !== true || contributes[editorContribution] !== undefined) {
      continue;
    }
    if (ownAddress?.startsWith(slashed(extension.extensionUri.toString()))) {
      continue;
    }
    const styles = (Array.isArray(contributes['markdown.previewStyles']) ? contributes['markdown.previewStyles'] : [])
      .map((path) => fileOf(api, extension, path))
      .filter((uri): uri is vscode.Uri => uri !== undefined);
    const scripts: PreviewScript[] = [];
    for (const script of Array.isArray(contributes['markdown.previewScripts']) ? contributes['markdown.previewScripts'] : []) {
      // A script is a path, or an object with the path and the type `module`.
      const path = isRecord(script) ? script.path : script;
      const uri = fileOf(api, extension, path);
      if (uri) {
        scripts.push({ uri, module: isRecord(script) && script.type === 'module' });
      }
    }
    contributions.push({ extension, styles, scripts });
  }
  return contributions;
}

/**
 * previewExtensions activates the extensions of the Markdown preview and returns their functions `extendMarkdownIt`,
 * in their order. An extension that does not start, or whose function fails, adds no syntax.
 * @param contributions - The extensions.
 */
export async function previewExtensions(contributions: readonly PreviewContribution[]): Promise<MarkdownItExtension[]> {
  const extensions: MarkdownItExtension[] = [];
  for (const { extension } of contributions) {
    let exports: unknown;
    try {
      exports = await extension.activate();
    } catch {
      continue;
    }
    const extend = isRecord(exports) ? exports.extendMarkdownIt : undefined;
    if (typeof extend === 'function') {
      extensions.push((md) => {
        try {
          return (extend as MarkdownItExtension).call(exports, md);
        } catch {
          return md;
        }
      });
    }
  }
  return extensions;
}

/** editorBlocks are the types of the first tokens of the top-level blocks that always stay blocks of the editor. */
const editorBlocks = new Set([
  'paragraph_open',
  'heading_open',
  'bullet_list_open',
  'ordered_list_open',
  'blockquote_open',
  'table_open',
  'hr',
  'html_block',
  'footnote_reference_open',
]);

/** isBlank returns true for a line without other characters than spaces and tabs. */
const isBlank = (line: string | undefined): boolean => line === undefined || /^[ \t]*$/.test(line);

/** isCode is true for the HTML of a code block that is still code: a `pre` with a `code`. */
const isCode = (html: string): boolean => /^<pre\b[^>]*>\s*<code\b/i.test(html.trim());

/**
 * PreviewRenderer finds the top-level blocks of a text that the extensions of the Markdown preview show in another way
 * than the renderer without them, with their HTML.
 */
export class PreviewRenderer {
  private readonly base: MarkdownRenderer;
  private readonly extended: MarkdownRenderer;
  /** cache holds the HTML of the blocks of the last text, or null for a block that stays a block of the editor. */
  private cache = new Map<string, string | null>();

  /**
   * @param extensions - The functions `extendMarkdownIt` of the extensions.
   */
  constructor(extensions: readonly MarkdownItExtension[]) {
    // A block is a part of a file: its footnotes stay in place, its raw HTML shows as its text, and its first lines are
    // no front matter, as for a rendered block of the editor.
    const options: RendererOptions = { footnotes: 'inPlace', rawHtml: 'text', headingIds: false, lines: false, frontMatter: 'text' };
    this.base = new MarkdownRenderer(options);
    this.extended = new MarkdownRenderer({ ...options, markdownIt: createMarkdownIt(extensions, { footnotes: 'inPlace' }) });
  }

  /**
   * analyze returns the blocks of a text that the extensions show in another way, and the languages of the code blocks
   * among them.
   * @param input - The text of the file.
   * @param env - The environment of markdown-it, as the Markdown preview gives it, for example `currentDocument`.
   */
  analyze(input: string, env: Record<string, unknown> = {}): PreviewAnalysis {
    const text = (input.startsWith('﻿') ? input.slice(1) : input).replace(/\r\n?/g, '\n');
    const lines = text.split('\n');
    const front = frontMatterOf(lines);
    // markdown-it reads the text with the lines of the front matter blank, as the editor does.
    const body = front ? [...lines.slice(0, front.lines).map(() => ''), ...lines.slice(front.lines)].join('\n') : text;
    const tokens = this.extended.markdownIt.parse(body, { ...env });
    const groups: { type: string; info: string; start: number; end: number }[] = [];
    for (let index = 0; index < tokens.length; index++) {
      const first = tokens[index];
      let last = index;
      if (first.nesting === 1) {
        for (let depth = 1; depth > 0 && last + 1 < tokens.length; ) {
          last++;
          depth += tokens[last].nesting;
        }
      }
      const end = Math.max(0, ...tokens.slice(index, last + 1).map((token) => token.map?.[1] ?? 0));
      index = last;
      if (first.map) {
        groups.push({ type: first.type, info: first.info, start: first.map[0], end: Math.max(end, first.map[0] + 1) });
      }
    }
    const blocks: PreviewBlock[] = [];
    const languages = new Set<string>();
    const cache = new Map<string, string | null>();
    groups.forEach((group, position) => {
      if (editorBlocks.has(group.type)) {
        return;
      }
      // A block ends with the lines that are not blank after its last token, for example the closing line of a
      // container whose token leaves it out, up to the next block.
      const limit = groups[position + 1]?.start ?? lines.length;
      let end = group.end;
      while (end < limit && !isBlank(lines[end])) {
        end++;
      }
      while (end > group.start + 1 && isBlank(lines[end - 1])) {
        end--;
      }
      const blockText = lines.slice(group.start, end).join('\n');
      let html = cache.get(blockText) ?? this.cache.get(blockText);
      if (html === undefined) {
        const base = this.base.toHtml(blockText, { ...env }).html;
        const shown = this.extended.toHtml(blockText, { ...env }).html;
        const code = group.type === 'fence' || group.type === 'code_block';
        html = shown !== base && !(code && isCode(shown)) ? shown : null;
      }
      cache.set(blockText, html);
      if (html !== null) {
        blocks.push({ text: blockText, html });
        const language = group.type === 'fence' ? group.info.trim().split(/\s+/)[0] : '';
        if (language) {
          languages.add(language);
        }
      }
    });
    this.cache = cache;
    return { blocks, languages: [...languages] };
  }
}
