// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The markdown-it plugin of the built-in Markdown preview. It shows each note
 * as a small icon at its place ([R-PREV-001](../../docs/requirements.md#r-prev-001)):
 * an inline note in the text, and a block note in the left margin between the
 * blocks. Each icon has a hidden callout, which the script of the preview
 * ([media/markdownPreview.js](../../media/markdownPreview.js)) shows while the
 * pointer rests on the icon or the icon has the focus
 * ([R-PREV-002](../../docs/requirements.md#r-prev-002)): each answer of the
 * thread with its author, its date and its body rendered as Markdown, with the
 * plugins of the preview. The icon is a link to the extension, which opens the
 * note in the side view ([R-PREV-003](../../docs/requirements.md#r-prev-003)).
 *
 * In Markdown, a comment that starts a line ends the paragraph before it. The
 * plugin therefore removes each inline note with the blanks before and after
 * it, and joins the text before and after the note into one paragraph again
 * ([R-PREV-004](../../docs/requirements.md#r-prev-004)). A note in another
 * place, such as a table cell, stays a comment, as in the text editor
 * ([notes.ts](../notes/notes.ts)). Every other token keeps the output of the
 * preview, and a comment that is no note stays an HTML comment, which the
 * preview does not show.
 *
 * The plugin adds the rules of the notes ([syntax.ts](../notes/syntax.ts)) and
 * a core rule after the rules of markdown-it, which turns the notes into
 * tokens of icons and callouts. It parses the body of each answer with the
 * same markdown-it instance. The preview parses a document once for each
 * version and renders it again for each change of a setting, without the
 * document in the environment of the parsing. So the core rule does the same
 * for every document, and the render rules read the setting `showInPreview`
 * ([R-PREV-005](../../docs/requirements.md#r-prev-005)) and the link of the
 * document from the environment of the rendering.
 */

import type MarkdownIt from 'markdown-it';
import type { StateCore, Token } from 'markdown-it';
import { addNoteRules, inlineParents } from '../notes/notes';
import { displayDate, innerText, type InlineNoteMeta, noteLinesTokenType, noteTokenType, type NoteText, onlyComments, readNote } from '../notes/syntax';

/** noteClass is the class of the element of a callout, and the start of the classes of its parts. */
export const noteClass = 'nimblescape-note';

/** iconTokenType is the type of the inline token of the icon of a note in a text. */
const iconTokenType = 'nimblescape_note_icon';

/** calloutTokenType is the type of the block token of the hidden callout of a note in a text, after its block. */
const calloutTokenType = 'nimblescape_note_callout';

/** blockTokenType is the type of the block token of a note between blocks: its icon in the margin and its callout. */
const blockTokenType = 'nimblescape_note_block';

/** PreviewSettings are the settings of the extension that change the preview. */
export interface PreviewSettings {
  /** showInPreview shows the icons and the callouts of the notes ([R-PREV-005](../../docs/requirements.md#r-prev-005)). */
  showInPreview: boolean;
}

/** PreviewOptions give the plugin the settings and the links of the document that the preview renders. */
export interface PreviewOptions {
  /**
   * settingsOf returns the settings for the environment of a rendering, which names its document.
   * @param env - The environment of the rendering.
   */
  settingsOf(env: unknown): PreviewSettings;
  /**
   * linkOf returns the link that opens a note of the rendered document in the side view, or undefined without a
   * document.
   * @param env - The environment of the rendering.
   * @param line - The index of the first line of the note in the document.
   */
  linkOf(env: unknown, line: number): string | undefined;
}

/** NoteMeta is the meta of the tokens of the icon and the callout of a note. */
interface NoteMeta {
  /** note is the content of the comment. */
  note: NoteText;
  /** id is the ID of the element of the callout, which the icon names. */
  id: string;
  /** line is the index of the first line of the note in the document. */
  line: number;
  /** bodies are the tokens of the body of each answer. */
  bodies: Token[][];
}

/**
 * diffMarker matches an empty element that the rendered diff of VS Code inserts into the Markdown text at the start
 * or at the end of a changed part of a line (extensions/markdown-language-features/src/preview/documentRenderer.ts).
 * In the body it marks the change; in the author and the date it would show as text.
 */
const diffMarker = /<span data-diff-(?:start|end)="\d+"><\/span>/g;

/** glyph is the image of the icon: a speech bubble in the color of the text. */
const glyph =
  '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2.5 2h11A1.5 1.5 0 0 1 15 3.5v7a1.5 1.5 0 0 1-1.5 1.5H8.2L5 14.7V12H2.5A1.5 1.5 0 0 1 1 10.5v-7A1.5 1.5 0 0 1 2.5 2Z"/></svg>';

/** counts holds the number of notes of each parsing, by its environment, for the IDs of the callouts. */
const counts = new WeakMap<object, number>();

/** noEnvironment stands for the environment of a parsing without one. */
const noEnvironment = {};

/**
 * nextId returns a new ID of a callout of a parsing. The parsing of the bodies shares the environment, so each ID is
 * unique in the page.
 * @param env - The environment of the parsing.
 */
function nextId(env: unknown): string {
  const key = typeof env === 'object' && env !== null ? env : noEnvironment;
  const count = (counts.get(key) ?? 0) + 1;
  counts.set(key, count);
  return `${noteClass}-${count}`;
}

/**
 * hideLines removes the lines of the tokens of a body: the attribute `data-line` and the class `code-line`, which the
 * preview adds for the scrolling with the editor. A callout is hidden or floats above the page, so the scrolling must
 * not use its elements.
 * @param tokens - The tokens of a body.
 */
function hideLines(tokens: readonly Token[]): void {
  for (const token of tokens) {
    token.map = null;
    if (!token.attrs) {
      continue;
    }
    token.attrs = token.attrs
      .filter(([name]) => name !== 'data-line')
      .map(([name, value]): [string, string] => [name, name === 'class' ? value.split(' ').filter((part) => part !== 'code-line').join(' ') : value])
      .filter(([name, value]) => name !== 'class' || value !== '');
  }
}

/**
 * noteMeta builds the meta of a note: its ID, its line and the tokens of the body of each answer.
 * @param state - The state of the core rule.
 * @param note - The content of the comment.
 * @param line - The index of the first line of the note in the document.
 */
function noteMeta(state: StateCore, note: NoteText, line: number): NoteMeta {
  // A note that holds the start of another comment shows its text as it is: as Markdown, that start would open an
  // HTML comment in the page and hide the rest of the page.
  const bodies = note.answers.map((answer) => {
    if (note.nested || answer.body === '') {
      return [];
    }
    const tokens = state.md.parse(answer.body, state.env);
    hideLines(tokens);
    return tokens;
  });
  return { note, id: nextId(state.env), line, bodies };
}

/**
 * newToken builds a token with a meta.
 * @param state - The state of the core rule.
 * @param type - The type of the token.
 * @param meta - The meta.
 * @param level - The nesting level.
 */
function newToken(state: StateCore, type: string, meta: NoteMeta | undefined, level: number): Token {
  const token = new state.Token(type, '', 0);
  token.meta = meta;
  token.level = level;
  token.block = type !== iconTokenType;
  return token;
}

/**
 * textToken builds an inline token of a text.
 * @param state - The state of the core rule.
 * @param content - The text.
 */
function textToken(state: StateCore, content: string): Token {
  const token = new state.Token('text', '', 0);
  token.content = content;
  return token;
}

/**
 * lineOf returns the index of the line of an offset of a text.
 * @param text - The text.
 * @param offset - The offset.
 */
const lineOf = (text: string, offset: number): number => text.slice(0, offset).split('\n').length - 1;

/** textBlocks are the opening tokens of the blocks whose text holds the icon of an inline note on lines of its own. */
const textBlocks = new Set(['paragraph_open', 'heading_open']);

/**
 * attachLines turns an inline note on lines of its own into an icon in the text of the block before it, or of the
 * block after it, without the blanks around the note. When a paragraph stands before and after the note, the two
 * paragraphs become one again, as they would be without the note: the text after the note follows after a line
 * break, or after a space when it started on the last line of the note. A note without a text block around it shows
 * as a block note.
 * @param state - The state of the core rule.
 * @param tokens - The tokens of the document.
 * @param index - The index of the token of the note.
 * @param output - The tokens that the core rule wrote so far.
 * @returns The index of the last token that the note took.
 */
function attachLines(state: StateCore, tokens: readonly Token[], index: number, output: Token[]): number {
  const token = tokens[index];
  const map = token.map!;
  const note = readNote(innerText(token.content));
  if (!note) {
    token.type = 'html_block';
    output.push(token);
    return index;
  }
  const icon = newToken(state, iconTokenType, noteMeta(state, note, map[0]), 0);
  const [previousOpen, previousInline, previousClose] = output.slice(-3);
  const before =
    output.length >= 3 &&
    textBlocks.has(previousOpen.type) &&
    previousOpen.level === token.level &&
    previousOpen.map?.[1] === map[0] &&
    previousInline.type === 'inline' &&
    previousClose.nesting === -1;
  const [nextOpen, nextInline] = [tokens[index + 1], tokens[index + 2]];
  const after =
    nextOpen !== undefined &&
    textBlocks.has(nextOpen.type) &&
    nextOpen.level === token.level &&
    nextOpen.map !== null &&
    nextOpen.map[0] <= map[1] &&
    nextInline?.type === 'inline';
  if (before) {
    previousInline.children = [...(previousInline.children ?? []), icon];
    previousOpen.map = [previousOpen.map![0], map[1]];
    if (after && previousOpen.type === 'paragraph_open' && nextOpen.type === 'paragraph_open') {
      const joint = nextOpen.map![0] < map[1] ? textToken(state, ' ') : new state.Token('softbreak', 'br', 0);
      previousInline.children.push(joint, ...(nextInline.children ?? []));
      previousInline.content += `\n${nextInline.content}`;
      previousOpen.map = [previousOpen.map[0], nextOpen.map![1]];
      // The paragraph before the note keeps its closing token, and the paragraph after it goes.
      return index + 3;
    }
    return index;
  }
  if (after) {
    nextInline.children = [icon, textToken(state, ' '), ...(nextInline.children ?? [])];
    nextOpen.map = [map[0], nextOpen.map![1]];
    return index;
  }
  icon.type = blockTokenType;
  icon.block = true;
  icon.level = token.level;
  output.push(icon);
  return index;
}

/**
 * iconsInText turns the notes in the text of a paragraph or a heading into icons, without the blanks before them: the
 * icon follows the word before the note, and one space the icon. Every other comment of the text stays a comment.
 * @param state - The state of the core rule.
 * @param token - The inline token.
 * @param inBlock - Whether the inline token is the text of a paragraph or a heading.
 */
function iconsInText(state: StateCore, token: Token, inBlock: boolean): void {
  const children = token.children ?? [];
  children.forEach((child, index) => {
    if (child.type !== noteTokenType) {
      return;
    }
    const note = inBlock ? readNote(innerText(child.content)) : undefined;
    if (!note) {
      child.type = 'html_inline';
      return;
    }
    const { start } = child.meta as InlineNoteMeta;
    child.type = iconTokenType;
    child.meta = noteMeta(state, note, token.map![0] + lineOf(token.content, start));
    child.content = '';
    const previous = children[index - 1];
    if (previous?.type === 'text') {
      previous.content = previous.content.replace(/[ \t]+$/, '');
    }
    const next = children[index + 1];
    if (next?.type === 'text') {
      next.content = next.content.replace(/^[ \t]+/, ' ');
    }
  });
}

/**
 * transform is the core rule of the plugin: it turns the notes of a document into icons and callouts.
 * @param state - The state of the core rule.
 */
function transform(state: StateCore): void {
  const tokens = state.tokens;
  const output: Token[] = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type === noteLinesTokenType && token.map) {
      index = attachLines(state, tokens, index, output);
      continue;
    }
    if (token.type === 'html_block' && token.map) {
      // The comments of the block that are no notes show nothing, with or without the block.
      const notes = (onlyComments(token.content) ?? []).flatMap((span) => {
        const note = readNote(innerText(token.content.slice(span.start, span.end)));
        return note ? [{ note, line: token.map![0] + lineOf(token.content, span.start) }] : [];
      });
      if (notes.length > 0) {
        output.push(...notes.map(({ note, line }) => newToken(state, blockTokenType, noteMeta(state, note, line), token.level)));
        continue;
      }
    }
    output.push(token);
  }
  // The callouts of the icons in a text follow the closing token of the paragraph or the heading.
  const result: Token[] = [];
  let pending: Token[] = [];
  output.forEach((token, index) => {
    result.push(token);
    if (token.type === 'inline' && token.map) {
      iconsInText(state, token, inlineParents.has(output[index - 1]?.type));
      const icons = (token.children ?? []).filter((child) => child.type === iconTokenType);
      pending = icons.map((icon) => newToken(state, calloutTokenType, icon.meta as NoteMeta, output[index + 1]?.level ?? token.level));
    } else if (token.nesting === -1 && pending.length > 0) {
      result.push(...pending);
      pending = [];
    }
  });
  state.tokens = result;
}

/**
 * labelOf returns the label of a note: its first author and the number of its answers.
 * @param meta - The meta of the note.
 */
function labelOf(meta: NoteMeta): string {
  const author = meta.note.answers[0].author?.replace(diffMarker, '');
  const count = meta.note.answers.length;
  return `Note${author ? ` by ${author}` : ''}${count > 1 ? `, ${count} answers` : ''}`;
}

/**
 * iconHtml returns the HTML of the icon of a note: a link that opens the note in the side view, or without a link an
 * element that takes the focus, which shows the callout too.
 * @param md - The markdown-it instance.
 * @param meta - The meta of the note.
 * @param link - The link, or undefined.
 */
function iconHtml(md: MarkdownIt, meta: NoteMeta, link: string | undefined): string {
  const count = meta.note.answers.length > 1 ? `<span class="${noteClass}-count">${meta.note.answers.length}</span>` : '';
  const attributes = `class="${noteClass}-icon" aria-label="${md.utils.escapeHtml(labelOf(meta))}" aria-describedby="${meta.id}"`;
  return link === undefined
    ? `<span ${attributes} role="img" tabindex="0">${glyph}${count}</span>`
    : `<a ${attributes} href="${md.utils.escapeHtml(link)}">${glyph}${count}</a>`;
}

/**
 * calloutHtml returns the HTML of the hidden callout of a note: each answer with its header and its body.
 * @param md - The markdown-it instance.
 * @param meta - The meta of the note.
 * @param render - Renders the tokens of a body.
 */
function calloutHtml(md: MarkdownIt, meta: NoteMeta, render: (tokens: Token[]) => string): string {
  const escape = md.utils.escapeHtml;
  const problem = meta.note.nested
    ? `<p class="${noteClass}-problem">This note contains the start of another comment, <code>&lt;!--</code>, and shows its text as it is.</p>\n`
    : '';
  const answers = meta.note.answers.map((answer, index) => {
    const author = answer.author?.replace(diffMarker, '');
    const date = answer.date?.replace(diffMarker, '');
    const header = [
      `<span class="${noteClass}-author">${escape(author || 'Note')}</span>`,
      date ? `<time class="${noteClass}-date" datetime="${escape(date)}">${escape(displayDate(date))}</time>` : '',
    ].join('');
    const body = meta.note.nested ? `<pre class="${noteClass}-text">${escape(answer.body)}</pre>\n` : render(meta.bodies[index]);
    return `<div class="${noteClass}-answer">\n<div class="${noteClass}-header">${header}</div>\n<div class="${noteClass}-body">\n${body}</div>\n</div>\n`;
  });
  return `<div class="${noteClass}" id="${meta.id}" role="note" aria-label="${escape(labelOf(meta))}" hidden>\n${problem}${answers.join('')}</div>\n`;
}

/**
 * extendMarkdownIt adds the notes to a markdown-it instance of the Markdown preview.
 * @param md - The markdown-it instance.
 * @param options - The settings and the links of the rendered document.
 * @returns The same instance.
 */
export function extendMarkdownIt(md: MarkdownIt, options: PreviewOptions): MarkdownIt {
  addNoteRules(md);
  md.core.ruler.push('nimblescape_notes', transform);
  const shows = (env: unknown): boolean => options.settingsOf(env).showInPreview;
  // A comment that the core rule did not reach renders as markdown-it renders an inline comment: as it is.
  md.renderer.rules[noteTokenType] = (tokens, index) => tokens[index].content;
  md.renderer.rules[noteLinesTokenType] = (tokens, index) => `${tokens[index].content}\n`;
  md.renderer.rules[iconTokenType] = (tokens, index, _options, env) => {
    const meta = tokens[index].meta as NoteMeta;
    return shows(env) ? iconHtml(md, meta, options.linkOf(env, meta.line)) : '';
  };
  md.renderer.rules[calloutTokenType] = (tokens, index, rendererOptions, env, self) =>
    shows(env) ? calloutHtml(md, tokens[index].meta as NoteMeta, (body) => self.render(body, rendererOptions, env)) : '';
  md.renderer.rules[blockTokenType] = (tokens, index, rendererOptions, env, self) => {
    const meta = tokens[index].meta as NoteMeta;
    if (!shows(env)) {
      return '';
    }
    const callout = calloutHtml(md, meta, (body) => self.render(body, rendererOptions, env));
    return `<div class="${noteClass}-anchor">${iconHtml(md, meta, options.linkOf(env, meta.line))}</div>\n${callout}`;
  };
  return md;
}
