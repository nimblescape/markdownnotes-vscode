// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The plugin of the figures, the tables, the listings, the references and the values of the front matter of Notes for
 * the editor of rendered Markdown of nimblescape Markdown, in the editor of a whole file
 * ([R-TEXT-010](../../docs/requirements.md#r-text-010)). It shows the text as the clean editing view does, without the
 * markup that the formatter needs ([R-XREF-001](../../docs/requirements.md#r-xref-001),
 * [R-XREF-004](../../docs/requirements.md#r-xref-004), [R-CODE-001](../../docs/requirements.md#r-code-001)):
 *
 * - The anchor at the end of a caption or a heading, for example `<a id="tab-grades"></a>`, and the markers of a value
 *   of the front matter, `<wbr><!--{title}-->` and `<!--{/title}-->`, are hidden nodes in the line, which keep their
 *   text byte for byte. The comment of a listing, for example `<!-- listing: ../src/fields.ts#read -->`, is a hidden
 *   block.
 * - The parts that the formatter writes are read-only
 *   ([the generated parts](https://github.com/nimblescape/markdown/blob/main/docs/editor.md#r-edit-011)): the number of
 *   a caption, the text of a reference to a figure, a table, a listing or a section, which Ctrl+click (Cmd+click on
 *   macOS) follows to its target, the code block of a listing and the cite of its source after its caption, and a value
 *   of the front matter with its markers, when the front matter has its key. The user changes them through what they
 *   come from, and the formatter writes them again when the file is saved.
 * - Text typed after the anchor at the end of a caption or a heading goes before the anchor, Enter there splits the
 *   block after the anchor, and Backspace and Delete jump over the hidden markup. An anchor stays at the end of its
 *   caption or heading when an edit replaces the text before it, and the comment of a listing goes with its code block.
 *   Changes from outside, Undo and Redo pass.
 *
 * In the renderer, for example in the pages, the anchors stay, so that the links to them work, and the other markup has
 * no output. The module uses no API of VS Code, so that the editor on a web page can use it too.
 */

import { Extension, Node, type Editor } from '@tiptap/core';
import { isHistoryTransaction } from '@tiptap/pm/history';
import type { Node as PmNode } from '@tiptap/pm/model';
import { type EditorState, Plugin, PluginKey, TextSelection, type Transaction } from '@tiptap/pm/state';
import { Mapping } from '@tiptap/pm/transform';
import type MarkdownIt from 'markdown-it';
import type { StateCore, Token } from 'markdown-it';
import { type GeneratedPart, type MarkdownPlugin, outsideChange, type PluginEditor } from '@nimblescape/markdowneditor';
import { keyPattern, readFields } from '../notes/fields';
import { captionKinds, captionStart, headingIds, type ItemKind, numberedLinkText, sectionWords, topLevel } from '../notes/figures';
import { listingComment } from '../notes/listings';
import { notesWrite } from './notesPlugin';

/** pluginName is the name of the plugin. */
export const pluginName = 'figures';

/** The types of the tokens of the plugin: an anchor, a marker of a value of the front matter, and the comment of a listing. */
export const tokenTypes = { anchor: 'nimblescape_anchor', field: 'nimblescape_field', listing: 'nimblescape_listing' } as const;

/** The names of the nodes of the plugin. */
export const nodeNames = { anchor: 'figureAnchor', field: 'fieldMarker', listing: 'listingComment' } as const;

/** figuresWrite is the meta of a transaction in which the plugin keeps its markup itself, which its guard lets pass. */
export const figuresWrite = 'nimblescapeFiguresWrite';

/** anchorOpen matches the start tag of an anchor of a figure, a table, a listing or a section, with its name. */
const anchorOpen = /^<a id="((?:fig|tab|lst|sec)-[a-z0-9]+(?:-[a-z0-9]+)*)">$/;

/** fieldOpen and fieldClose match the start marker and the end marker of a value of the front matter, with its key. */
const fieldOpen = new RegExp(String.raw`^<!--\{(${keyPattern})\}-->$`);
const fieldClose = new RegExp(String.raw`^<!--\{/(${keyPattern})\}-->$`);

/** isHtml returns true for a token of inline HTML whose text is a text or matches a pattern. */
const isHtml = (token: Token | undefined, test: RegExp | string): boolean =>
  token?.type === 'html_inline' && (typeof test === 'string' ? token.content === test : test.test(token.content));

/**
 * newToken returns a token of the line of a type of the plugin.
 * @param state - The state of the core rule.
 * @param type - The type.
 * @param content - The text of the markup, as the file has it.
 * @param meta - The meta of the token.
 */
function newToken(state: StateCore, type: string, content: string, meta: Record<string, string>): Token {
  const token = new state.Token(type, '', 0);
  token.content = content;
  token.meta = meta;
  return token;
}

/**
 * closeOf returns the index of the end marker of a value of the front matter after its start marker, in the same line,
 * or -1 when another marker or the end of the line comes first, as the formatter reads a value
 * ([src/notes/fields.ts](../notes/fields.ts)).
 * @param children - The tokens of the line.
 * @param from - The index after the start marker.
 * @param key - The key of the start marker.
 */
function closeOf(children: readonly Token[], from: number, key: string): number {
  for (let index = from; index < children.length; index++) {
    const child = children[index];
    if (child.type === 'softbreak' || child.type === 'hardbreak' || isHtml(child, fieldOpen)) {
      return -1;
    }
    const close = child.type === 'html_inline' ? fieldClose.exec(child.content) : null;
    if (close) {
      return close[1] === key ? index : -1;
    }
  }
  return -1;
}

/**
 * mergeInline makes one token of each anchor, `<a id="…">` and `</a>`, and of each marker of a value of the front matter
 * with the `<wbr>` before it, among the tokens of a line.
 * @param state - The state of the core rule.
 * @param children - The tokens of the line.
 */
function mergeInline(state: StateCore, children: readonly Token[]): Token[] {
  const merged: Token[] = [];
  const closes = new Set<number>();
  for (let index = 0; index < children.length; index++) {
    const child = children[index];
    if (child.type !== 'html_inline') {
      merged.push(child);
      continue;
    }
    const anchor = anchorOpen.exec(child.content);
    if (anchor && isHtml(children[index + 1], '</a>')) {
      merged.push(newToken(state, tokenTypes.anchor, child.content + children[index + 1].content, { name: anchor[1] }));
      index++;
      continue;
    }
    const wbr = child.content === '<wbr>' && isHtml(children[index + 1], fieldOpen) ? 1 : 0;
    const open = fieldOpen.exec(children[index + wbr].content);
    const close = open ? closeOf(children, index + wbr + 1, open[1]) : -1;
    if (open && close > 0) {
      merged.push(newToken(state, tokenTypes.field, (wbr ? child.content : '') + children[index + wbr].content, { key: open[1], edge: 'open' }));
      closes.add(close);
      index += wbr;
      continue;
    }
    if (closes.has(index)) {
      merged.push(newToken(state, tokenTypes.field, child.content, { key: fieldClose.exec(child.content)![1], edge: 'close' }));
      continue;
    }
    merged.push(child);
  }
  return merged;
}

/**
 * isListingComment returns true for a block of HTML of one line that is the comment of a listing.
 * @param token - The token.
 */
const isListingComment = (token: Token): boolean =>
  token.type === 'html_block' && token.map !== null && token.map[1] - token.map[0] === 1 && listingComment.test(token.content.replace(/\n$/, ''));

/**
 * figuresRule is the core rule that makes the tokens of the plugin: one token of each anchor and of each marker of a
 * value of the front matter in the lines, and one token of each comment of a listing. It runs after the inline rules.
 * @param state - The state of the core rule.
 */
function figuresRule(state: StateCore): void {
  for (const token of state.tokens) {
    if (token.type === 'inline' && token.children && token.content.includes('<')) {
      token.children = mergeInline(state, token.children);
    }
  }
  state.tokens = state.tokens.map((token) => {
    if (!isListingComment(token)) {
      return token;
    }
    const listing = new state.Token(tokenTypes.listing, '', 0);
    listing.block = true;
    listing.level = token.level;
    listing.map = token.map;
    listing.content = token.content.replace(/\n$/, '');
    return listing;
  });
}

/**
 * extendMarkdownIt adds the rule of the plugin to the markdown-it of the editor and of the renderer. In the output of
 * the renderer, the anchors stay as the file has them, and the markers and the comments of the listings have none.
 * @param md - The markdown-it.
 */
export function extendMarkdownIt(md: MarkdownIt): MarkdownIt {
  md.core.ruler.after('inline', 'nimblescape_figures', figuresRule);
  // The text of an anchor matches anchorOpen and `</a>`, so it holds no other HTML.
  md.renderer.rules[tokenTypes.anchor] = (tokens, index) => tokens[index].content;
  md.renderer.rules[tokenTypes.field] = () => '';
  md.renderer.rules[tokenTypes.listing] = () => '';
  return md;
}

/** FigureAnchor is the anchor of a figure, a table, a listing or a section in the line: hidden, with its text. */
const FigureAnchor = Node.create({
  name: nodeNames.anchor,
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,
  addAttributes: () => ({ name: { default: '', rendered: false }, text: { default: '', rendered: false } }),
  parseHTML: () => [],
  renderHTML: ({ node }) => ['span', { class: 'nsmd-figure-anchor', 'data-anchor': node.attrs.name as string }],
  renderText: () => '',
});

/** FieldMarker is the start marker or the end marker of a value of the front matter in the line: hidden, with its text. */
const FieldMarker = Node.create({
  name: nodeNames.field,
  group: 'inline',
  inline: true,
  atom: true,
  selectable: false,
  addAttributes: () => ({ key: { default: '', rendered: false }, edge: { default: 'open', rendered: false }, text: { default: '', rendered: false } }),
  parseHTML: () => [],
  renderHTML: ({ node }) => ['span', { class: 'nsmd-field-marker', 'data-field': node.attrs.key as string, 'data-edge': node.attrs.edge as string }],
  renderText: () => '',
});

/** ListingComment is the comment of a listing, which names the source of its code: a hidden block with its line. */
const ListingComment = Node.create({
  name: nodeNames.listing,
  group: 'block',
  atom: true,
  selectable: false,
  addAttributes: () => ({ text: { default: '', rendered: false } }),
  parseHTML: () => [],
  renderHTML: () => ['div', { class: 'nsmd-listing-comment' }],
  renderText: () => '',
});

/** isFence returns true for a fenced code block. */
const isFence = (node: PmNode | null | undefined): boolean => node?.type.name === 'codeBlock' && node.attrs.fence !== '';

/** isBlank returns true for a node of white space in a line. */
const isBlank = (node: PmNode): boolean => node.isText && node.text!.trim() === '';

/** Anchor is an anchor of a document with its position. */
interface Anchor {
  readonly name: string;
  readonly pos: number;
  readonly node: PmNode;
}

/**
 * trailingAnchor returns the anchor at the end of a textblock, after which only white space follows, or undefined.
 * @param block - The textblock.
 * @param pos - The position of the textblock.
 */
function trailingAnchor(block: PmNode, pos: number): Anchor | undefined {
  let offset = block.content.size;
  for (let index = block.childCount - 1; index >= 0; index--) {
    const child = block.child(index);
    offset -= child.nodeSize;
    if (!isBlank(child)) {
      return child.type.name === nodeNames.anchor ? { name: child.attrs.name as string, pos: pos + 1 + offset, node: child } : undefined;
    }
  }
  return undefined;
}

/**
 * imageOnly returns true for a paragraph that holds only an image, apart from white space, line breaks and anchors.
 * @param paragraph - The paragraph.
 */
function imageOnly(paragraph: PmNode): boolean {
  let images = 0;
  let other = 0;
  paragraph.forEach((child) => {
    if (child.type.name === 'image') {
      images++;
    } else if (!isBlank(child) && child.type.name !== 'hardBreak' && child.type.name !== nodeNames.anchor) {
      other++;
    }
  });
  return images === 1 && other === 0;
}

/**
 * captionOf returns the match of the start of a caption at the start of a textblock: its word, and the white space and
 * the number when it has one, or null. The start must be text without marks, as the formatter reads a caption.
 * @param block - The textblock.
 */
function captionOf(block: PmNode): RegExpExecArray | null {
  const first = block.firstChild;
  return block.type.name === 'paragraph' && first?.isText && first.marks.length === 0 ? captionStart.exec(first.text!) : null;
}

/**
 * kindAfter returns the kind of a caption by the blocks after it: an image for a figure, a table for a table, and a
 * fenced code block, with or without a block of HTML such as the comment of the listing, for a listing.
 * @param parent - The parent of the caption.
 * @param index - The index of the caption in its parent.
 * @param word - The word of the caption.
 */
function kindAfter(parent: PmNode, index: number, word: string): ItemKind | undefined {
  const kind = captionKinds[word];
  const next = parent.maybeChild(index + 1);
  const comment = next?.type.name === 'htmlBlock' || next?.type.name === nodeNames.listing;
  const fits =
    kind === 'table' ? next?.type.name === 'table' : kind === 'listing' ? isFence(next) || (comment && isFence(parent.maybeChild(index + 2))) : next?.type.name === 'paragraph' && imageOnly(next);
  return fits ? kind : undefined;
}

/** Item is a figure, a table, a listing or a section of a document, with the position of its textblock. */
interface Item {
  readonly kind: ItemKind;
  readonly level?: number;
  readonly id?: string;
  readonly anchor?: string;
  readonly pos: number;
}

/** Link is a link to a place of the document whose text is a word and a number, with the range of its text. */
interface Link {
  readonly from: number;
  readonly to: number;
  readonly word: string;
  readonly name: string;
}

/**
 * linksOf returns the links of a textblock to a place of the document, `#…`, whose whole text is a word and a number.
 * @param block - The textblock.
 * @param pos - The position of the textblock.
 */
function linksOf(block: PmNode, pos: number): Link[] {
  const links: Link[] = [];
  let open: { from: number; to: number; text: string; href: string; mixed: boolean } | undefined;
  const end = () => {
    const words = open && !open.mixed ? numberedLinkText.exec(open.text) : null;
    if (open && words) {
      links.push({ from: open.from, to: open.to, word: words[1], name: open.href.slice(1) });
    }
    open = undefined;
  };
  block.forEach((child, offset) => {
    const at = pos + 1 + offset;
    const link = child.marks.find((mark) => mark.type.name === 'link');
    const href = typeof link?.attrs.href === 'string' ? link.attrs.href : '';
    if (!href.startsWith('#')) {
      end();
      return;
    }
    if (open && (open.href !== href || open.to !== at)) {
      end();
    }
    open ??= { from: at, to: at, text: '', href, mixed: false };
    open.to = at + child.nodeSize;
    open.text += child.isText ? child.text! : '';
    open.mixed ||= !child.isText;
  });
  end();
  return links;
}

/**
 * decoded returns the name of a target as the file writes it: markdown-it encodes the characters of a link, for
 * example `ü` of a heading ID.
 * @param name - The name after `#`.
 */
function decoded(name: string): string {
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

/** Analysis is what the plugin finds in a document: its generated parts and its anchors at the ends of textblocks. */
interface Analysis {
  readonly parts: GeneratedPart[];
  readonly anchors: Anchor[];
}

/** analyses holds the analysis of each document, which is the same for the same document. */
const analyses = new WeakMap<PmNode, Analysis>();

/** editors are the editors with the plugin, so that a reference can go to its target in its editor. */
const editors = new Set<Editor>();

/**
 * reveal puts the cursor at the start of a target in the editor of a document and scrolls to it.
 * @param doc - The document.
 * @param pos - The position of the textblock of the target.
 */
function reveal(doc: PmNode, pos: number): void {
  for (const tiptap of editors) {
    if (tiptap.state.doc !== doc) {
      continue;
    }
    const { view } = tiptap;
    const selection = TextSelection.near(doc.resolve(pos + 1));
    view.dispatch(view.state.tr.setSelection(selection).scrollIntoView());
    const { node } = view.domAtPos(selection.from);
    const element = node instanceof Element ? node : node.parentElement;
    element?.scrollIntoView?.({ block: 'center' });
  }
}

/**
 * analysisOf returns the generated parts and the anchors of a document. The parts follow the rules of the formatter
 * ([src/notes/figures.ts](../notes/figures.ts), [src/notes/listings.ts](../notes/listings.ts),
 * [src/notes/fields.ts](../notes/fields.ts)): a caption is a paragraph that starts with a word, a number and a colon
 * before its image, table or code block; a reference names the anchor of an item or, with a word such as "Chapter", the
 * GitHub ID of the heading of a section.
 * @param doc - The document.
 */
export function analysisOf(doc: PmNode): Analysis {
  const cached = analyses.get(doc);
  if (cached) {
    return cached;
  }
  const parts: GeneratedPart[] = [];
  const anchors: Anchor[] = [];
  const items: Item[] = [];
  const links: Link[] = [];
  const pictures = new Set<number>();
  const idOf = headingIds();
  const front = doc.firstChild?.type.name === 'frontMatter' ? readFields(String(doc.firstChild.attrs.text).split(/\r?\n/)) : new Map<string, string>();
  doc.descendants((node, pos, parent, index) => {
    if (node.type.name === nodeNames.listing && parent && isFence(parent.maybeChild(index + 1))) {
      // The code block after the comment of a listing, with or without a caption.
      const code = pos + node.nodeSize;
      parts.push({ from: code, to: code + parent.child(index + 1).nodeSize });
    }
    if (!node.isTextblock) {
      return true;
    }
    if (node.type.name === 'codeBlock') {
      return false;
    }
    links.push(...linksOf(node, pos));
    // The values of the front matter, with their markers, when the front matter has their keys.
    let start: PmNode | undefined;
    let startPos = 0;
    node.forEach((child, offset) => {
      if (child.type.name !== nodeNames.field) {
        return;
      }
      const at = pos + 1 + offset;
      if (child.attrs.edge === 'close' && start && start.attrs.key === child.attrs.key && front.has(child.attrs.key as string)) {
        parts.push({ from: startPos, to: at + 1 });
      }
      start = child.attrs.edge === 'open' ? child : undefined;
      startPos = at;
    });
    const anchor = trailingAnchor(node, pos);
    if (anchor) {
      anchors.push(anchor);
    }
    if (node.type.name === 'heading') {
      items.push({ kind: 'section', level: node.attrs.level as number, id: idOf(node.textContent), anchor: anchor?.name, pos });
      return false;
    }
    if (!parent || pictures.has(pos)) {
      return false;
    }
    if (imageOnly(node)) {
      // An image of the older form, with the anchor of a figure and without a caption, still counts.
      if (anchor?.name.startsWith('fig-')) {
        items.push({ kind: 'figure', anchor: anchor.name, pos });
      }
      return false;
    }
    const caption = captionOf(node);
    const kind = caption ? kindAfter(parent, index, caption[1]) : undefined;
    if (!caption || !kind) {
      return false;
    }
    items.push({ kind, anchor: anchor?.name, pos });
    if (kind === 'figure') {
      pictures.add(pos + node.nodeSize);
    }
    if (caption[3]) {
      const digits = pos + 1 + caption[1].length + caption[2].length;
      parts.push({ from: digits, to: digits + caption[3].length });
    }
    if (kind === 'listing') {
      parts.push(...citeOf(node, pos, parent, index));
    }
    return false;
  });
  const top = topLevel(items);
  const targets = new Map<string, { pos: number; byId: boolean }>();
  for (const item of items) {
    if (item.id !== undefined && (item.kind !== 'section' || item.level! >= top) && !targets.has(item.id)) {
      targets.set(item.id, { pos: item.pos, byId: true });
    }
  }
  for (const item of items) {
    if (item.anchor !== undefined && (item.kind !== 'section' || item.level! >= top)) {
      targets.set(item.anchor, { pos: item.pos, byId: false });
    }
  }
  for (const link of links) {
    const target = targets.get(link.name) ?? targets.get(decoded(link.name));
    if (target && (!target.byId || sectionWords.has(link.word))) {
      parts.push({ from: link.from, to: link.to, open: () => reveal(doc, target.pos) });
    }
  }
  const analysis = { parts: parts.sort((a, b) => a.from - b.from), anchors };
  analyses.set(doc, analysis);
  return analysis;
}

/**
 * citeOf returns the cite of the source after the link of the caption of a listing as a generated part, for example
 * `(fields.ts, L12-L30)`, when the comment of the listing follows the caption.
 * @param caption - The caption.
 * @param pos - The position of the caption.
 * @param parent - The parent of the caption.
 * @param index - The index of the caption in its parent.
 */
function citeOf(caption: PmNode, pos: number, parent: PmNode, index: number): GeneratedPart[] {
  if (parent.maybeChild(index + 1)?.type.name !== nodeNames.listing) {
    return [];
  }
  // The cite is the text after the last link of the caption, before its anchor.
  let tail = '';
  let tailFrom = -1;
  caption.forEach((child, offset) => {
    if (child.marks.some((mark) => mark.type.name === 'link')) {
      tail = '';
      tailFrom = pos + 1 + offset + child.nodeSize;
    } else if (tailFrom >= 0 && child.isText && child.marks.length === 0) {
      tail += child.text!;
    } else if (child.type.name !== nodeNames.anchor) {
      tailFrom = -1;
    }
  });
  const cite = tailFrom >= 0 ? /^([ \t]+)\([^()\n]*\)/.exec(tail) : null;
  return cite && tail.slice(cite[0].length).trim() === '' ? [{ from: tailFrom + cite[1].length, to: tailFrom + cite[0].length }] : [];
}

/**
 * isUserEdit returns true for a transaction of the user that changes the document: no change from outside, no Undo or
 * Redo, and no write of a plugin of Notes.
 * @param tr - The transaction.
 */
const isUserEdit = (tr: Transaction): boolean =>
  tr.docChanged && tr.getMeta(outsideChange) !== true && !isHistoryTransaction(tr) && tr.getMeta(figuresWrite) !== true && tr.getMeta(notesWrite) !== true;

/**
 * holdsItem returns true for a textblock whose anchor names an item: a heading, a caption or an image of the older form.
 * @param block - The textblock.
 */
const holdsItem = (block: PmNode): boolean => block.type.name === 'heading' || captionOf(block) !== null || (block.type.name === 'paragraph' && imageOnly(block));

/**
 * guardedEdit returns the transaction that keeps the markup of the plugin after the edits of the user, or null when it
 * stays: an anchor at the end of a caption or a heading that an edit deleted goes back to the end of its textblock
 * while the textblock is still a caption or a heading, and a comment of a listing whose code block an edit deleted goes
 * too.
 * @param transactions - The transactions of the edit.
 * @param before - The state before them.
 * @param after - The state after them.
 */
export function guardedEdit(transactions: readonly Transaction[], before: EditorState, after: EditorState): Transaction | null {
  if (!transactions.some((tr) => tr.docChanged) || !transactions.every((tr) => !tr.docChanged || isUserEdit(tr))) {
    return null;
  }
  const mapping = new Mapping();
  transactions.forEach((tr) => mapping.appendMapping(tr.mapping));
  const tr = after.tr;
  const kept = new Set(analysisOf(after.doc).anchors.map((anchor) => anchor.name));
  for (const anchor of analysisOf(before.doc).anchors) {
    if (kept.has(anchor.name)) {
      continue;
    }
    const at = Math.min(tr.mapping.map(mapping.map(anchor.pos, -1), -1), tr.doc.content.size);
    const $at = tr.doc.resolve(at);
    if ($at.depth > 0 && $at.parent.isTextblock && holdsItem($at.parent) && !trailingAnchor($at.parent, $at.before())) {
      tr.insert($at.end(), anchor.node.type.create(anchor.node.attrs));
    }
  }
  before.doc.descendants((node, pos, parent, index) => {
    if (node.type.name !== nodeNames.listing || !parent || !isFence(parent.maybeChild(index + 1))) {
      return !node.isTextblock;
    }
    const at = tr.mapping.map(mapping.map(pos, 1), 1);
    const $at = tr.doc.resolve(Math.min(at, tr.doc.content.size));
    if (tr.doc.nodeAt($at.pos)?.type.name === nodeNames.listing && !isFence($at.parent.maybeChild($at.index() + 1))) {
      tr.delete($at.pos, $at.pos + tr.doc.nodeAt($at.pos)!.nodeSize);
    }
    return false;
  });
  return tr.docChanged ? tr.setMeta(figuresWrite, true) : null;
}

/** isHidden returns true for an anchor or a marker of a value of the front matter. */
const isHidden = (node: PmNode | null | undefined): boolean => node?.type.name === nodeNames.anchor || node?.type.name === nodeNames.field;

/**
 * jumpOverMarkup returns the command that moves the cursor over the anchors and the markers next to it, before
 * Backspace (backward) or Delete (forward) deletes a character, so that the key deletes the character beyond them. At
 * the edge of a generated part, the cursor stays, so that the key deletes the whole part. The command moves the cursor
 * and leaves the key to the next command.
 * @param direction - -1 for Backspace, 1 for Delete.
 */
function jumpOverMarkup(direction: -1 | 1) {
  return ({ editor }: { editor: Editor }): boolean => {
    const { state, view } = editor;
    const { empty, from } = state.selection;
    const next = (pos: number) => (direction < 0 ? state.doc.resolve(pos).nodeBefore : state.doc.resolve(pos).nodeAfter);
    const parts = analysisOf(state.doc).parts;
    const atPart = (pos: number) => parts.some((part) => (direction < 0 ? part.to === pos : part.from === pos));
    if (!empty || !isHidden(next(from)) || atPart(from)) {
      return false;
    }
    let at = from;
    while (isHidden(next(at)) && !atPart(at)) {
      at += direction;
    }
    view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, at)));
    return false;
  };
}

/**
 * beforeTrailing returns the position before the anchors at the end of the textblock of a position, when only anchors
 * and white space follow the position in its textblock and an anchor stands right before it, or undefined.
 * @param state - The state.
 * @param pos - The position.
 */
function beforeTrailing(state: EditorState, pos: number): number | undefined {
  const $pos = state.doc.resolve(pos);
  if ($pos.nodeBefore?.type.name !== nodeNames.anchor) {
    return undefined;
  }
  for (let index = $pos.index(); index < $pos.parent.childCount; index++) {
    const child = $pos.parent.child(index);
    if (!isBlank(child) && child.type.name !== nodeNames.anchor) {
      return undefined;
    }
  }
  let at = pos;
  while (state.doc.resolve(at).nodeBefore?.type.name === nodeNames.anchor) {
    at--;
  }
  return at;
}

/**
 * splitAfterAnchors is the command for Enter before the anchor at the end of a caption or a heading: it moves the
 * cursor to the end of the textblock, so that the anchor stays in it, and leaves the key to the next command.
 */
function splitAfterAnchors({ editor }: { editor: Editor }): boolean {
  const { state, view } = editor;
  const { empty, $from } = state.selection;
  if (!empty || !$from.parent.isTextblock || $from.nodeAfter?.type.name !== nodeNames.anchor) {
    return false;
  }
  for (let index = $from.index(); index < $from.parent.childCount; index++) {
    const child = $from.parent.child(index);
    if (!isBlank(child) && child.type.name !== nodeNames.anchor) {
      return false;
    }
  }
  view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, $from.end())));
  return false;
}

/** guardKey is the key of the plugin of the guard. */
const guardKey = new PluginKey('nimblescapeFiguresGuard');

/** Guard keeps the markup of the plugin while the user edits (see the comment of the module). */
const Guard = Extension.create({
  name: 'figuresGuard',
  priority: 1000,
  addKeyboardShortcuts: () => ({
    Backspace: (props) => jumpOverMarkup(-1)(props),
    Delete: (props) => jumpOverMarkup(1)(props),
    Enter: (props) => splitAfterAnchors(props),
  }),
  addProseMirrorPlugins: () => [
    new Plugin({
      key: guardKey,
      appendTransaction: (transactions, before, after) => guardedEdit(transactions, before, after),
      props: {
        handleTextInput: (view, from, to, text) => {
          const at = from === to ? beforeTrailing(view.state, from) : undefined;
          if (at === undefined) {
            return false;
          }
          const tr = view.state.tr.insertText(text, at);
          view.dispatch(tr.setSelection(TextSelection.create(tr.doc, at + text.length)).scrollIntoView());
          return true;
        },
      },
    }),
  ],
});

/** styles are the styles of the plugin: the comments of the listings are hidden. */
export const styles = '.nsmd-listing-comment { display: none; }';

/**
 * activate adds an editor to the editors whose references go to their targets.
 * @param editor - The editor.
 * @returns What to dispose.
 */
function activate(editor: PluginEditor): () => void {
  const tiptap = editor.tiptap;
  editors.add(tiptap);
  return () => editors.delete(tiptap);
}

/** figuresPlugin is the plugin of the figures, the tables, the listings, the references and the values of the front matter. */
export const figuresPlugin: MarkdownPlugin = {
  name: pluginName,
  apiVersion: 1,
  extendMarkdownIt,
  styles,
  nodes: [FigureAnchor, FieldMarker, ListingComment, Guard],
  fromMarkdown: {
    [tokenTypes.anchor]: { node: nodeNames.anchor, getAttrs: (token) => ({ name: (token.meta as { name: string }).name, text: token.content }) },
    [tokenTypes.field]: {
      node: nodeNames.field,
      getAttrs: (token) => {
        const meta = token.meta as { key: string; edge: string };
        return { key: meta.key, edge: meta.edge, text: token.content };
      },
    },
    [tokenTypes.listing]: { node: nodeNames.listing, getAttrs: (token) => ({ text: token.content }) },
  },
  toMarkdown: {
    nodes: {
      [nodeNames.anchor]: (state, node) => {
        state.text(node.attrs.text as string, false);
      },
      [nodeNames.field]: (state, node) => {
        state.text(node.attrs.text as string, false);
      },
      [nodeNames.listing]: (state, node) => {
        state.text(node.attrs.text as string, false);
        state.closeBlock(node);
      },
    },
  },
  generated: (doc) => analysisOf(doc).parts,
  activate,
};
