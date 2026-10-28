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
 * plugin therefore removes each inline note with the blanks and the blank lines
 * before and after it, and joins the text before and after the note into one
 * paragraph again, with one space and without a line break
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
import type { Options, Renderer, StateCore, Token } from 'markdown-it';
import { colorIndexOf } from '../notes/colors';
import { addNoteRules, inlineParents } from '../notes/notes';
import {
  displayDate,
  innerText,
  type InlineNoteMeta,
  noteLinesTokenType,
  noteTokenType,
  type NoteText,
  onlyComments,
  readMarker,
  readNote,
  selectionOf,
} from '../notes/syntax';

/** noteClass is the class of the element of a callout, and the start of the classes of its parts. */
export const noteClass = 'nimblescape-note';

/** iconTokenType is the type of the inline token of the icon of a note in a text. */
const iconTokenType = 'nimblescape_note_icon';

/** calloutTokenType is the type of the block token of the hidden callout of a note in a text, after its block. */
const calloutTokenType = 'nimblescape_note_callout';

/** blockTokenType is the type of the block token of a note between blocks: its icon in the margin and its callout. */
const blockTokenType = 'nimblescape_note_block';

/** edgeTokenType is the type of the inline token of the start or the end of a selection: an empty element. */
const edgeTokenType = 'nimblescape_note_edge';

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
  /** number is the number of the note in the document, from 1, which gives its color. */
  number: number;
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
 * nextId returns a new ID of a callout of a parsing. The IDs count for each environment of a parsing, and a body holds
 * no note, so each ID is unique in the page.
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
 * @param number - The number of the note, from 1.
 */
function noteMeta(state: StateCore, note: NoteText, line: number, number: number): NoteMeta {
  // Each body is a Markdown text of its own (R-TEXT-004). It has the environment of the document, for example the
  // document of the preview, except the footnotes of markdown-it-footnote (the plugin of the extension Markdown
  // Footnotes): with them, the last core rule of that plugin would add the list of the footnotes of the document, or
  // of an answer before, to the body. So each body has only its own footnotes (R-GEN-007).
  // A note that holds the start of another comment shows its text as it is: as Markdown, that start would open an
  // HTML comment in the page and hide the rest of the page.
  const bodies = note.answers.map((answer) => {
    if (note.nested || answer.body === '') {
      return [];
    }
    const tokens = state.md.parse(answer.body, { ...(state.env as object), footnotes: undefined });
    hideLines(tokens);
    return tokens;
  });
  return { note, number, id: nextId(state.env), line, bodies };
}

/** EdgeMeta is the meta of the token of the start or the end of a selection. */
interface EdgeMeta {
  /** id is the ID of the selection. */
  id: string;
  edge: 'start' | 'end';
  /** number is the number of the note of the selection. */
  number: number;
}

/** Selected is a note with a selection, by the ID of the selection. */
interface Selected {
  note: NoteText;
  /** token is the token of the note, and offset its offset in the text of the token. */
  token: Token;
  offset: number;
  /** line is the index of the first line of the note in the document. */
  line: number;
  number: number;
}

/**
 * Numbers are the numbers of the notes of a document, in the order of the document as the text editor counts them,
 * and the notes with a selection whose closing marker or point is in a text, where their icons go.
 */
class Numbers {
  /** numbers holds the number of each note by its token and its offset in the text of the token. */
  private readonly numbers = new Map<Token, Map<number, number>>();
  /** selected holds the notes with a selection by the ID of the selection. */
  readonly selected = new Map<string, Selected>();
  /** attached holds the IDs of the selections whose closing marker or point is in the text of a block. */
  readonly attached = new Set<string>();

  /**
   * @param tokens - The tokens of the document, before the core rule changes them.
   */
  constructor(tokens: readonly Token[]) {
    let count = 0;
    const add = (token: Token, offset: number, note: NoteText, line: number): void => {
      count++;
      const known = this.numbers.get(token) ?? new Map<number, number>();
      known.set(offset, count);
      this.numbers.set(token, known);
      const id = selectionOf(note);
      if (id !== undefined && !this.selected.has(id)) {
        this.selected.set(id, { note, token, offset, line, number: count });
      }
    };
    tokens.forEach((token, index) => {
      if (token.type === noteLinesTokenType && token.map) {
        const note = readNote(innerText(token.content));
        if (note) {
          add(token, 0, note, token.map[0]);
        }
      } else if (token.type === 'html_block' && token.map) {
        for (const span of onlyComments(token.content) ?? []) {
          const note = readNote(innerText(token.content.slice(span.start, span.end)));
          if (note) {
            add(token, span.start, note, token.map[0] + lineOf(token.content, span.start));
          }
        }
      } else if (token.type === 'inline' && token.map) {
        for (const child of token.children ?? []) {
          if (child.type !== noteTokenType) {
            continue;
          }
          const marker = readMarker(child.content);
          if (marker && marker.kind !== 'open') {
            this.attached.add(marker.id);
          }
          const note = inlineParents.has(tokens[index - 1]?.type) ? readNote(innerText(child.content)) : undefined;
          if (note) {
            add(child, 0, note, token.map[0] + lineOf(token.content, (child.meta as InlineNoteMeta).start));
          }
        }
      }
    });
  }

  /**
   * of returns the number of a note.
   * @param token - The token of the note: its HTML block, its inline note on lines of its own, or its comment in a text.
   * @param offset - The offset of the note in the text of an HTML block, else 0.
   */
  of(token: Token, offset = 0): number {
    return this.numbers.get(token)?.get(offset) ?? 0;
  }

  /**
   * shownAtMarker tells whether a note shows at the closing marker or the point of its selection instead of its place.
   * @param token - The token of the note.
   * @param offset - The offset of the note in the text of an HTML block, else 0.
   * @param note - The note.
   */
  shownAtMarker(token: Token, offset: number, note: NoteText): boolean {
    const id = selectionOf(note);
    const selected = id === undefined ? undefined : this.selected.get(id);
    return id !== undefined && this.attached.has(id) && selected?.token === token && selected.offset === offset;
  }
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
 * block after it, without the blanks and the blank lines around the note. When a paragraph stands before and after
 * the note, the two paragraphs are one, as an inline note never ends a paragraph: the text after the note follows
 * after one space, without a line break. A note without a text block around it shows as a block note.
 * @param state - The state of the core rule.
 * @param tokens - The tokens of the document.
 * @param index - The index of the token of the note.
 * @param output - The tokens that the core rule wrote so far.
 * @param numbers - The numbers of the notes.
 * @returns The index of the last token that the note took.
 */
function attachLines(state: StateCore, tokens: readonly Token[], index: number, output: Token[], numbers: Numbers): number {
  const token = tokens[index];
  const map = token.map!;
  const note = readNote(innerText(token.content));
  if (!note) {
    token.type = 'html_block';
    output.push(token);
    return index;
  }
  const icon = newToken(state, iconTokenType, noteMeta(state, note, map[0], numbers.of(token)), 0);
  const [previousOpen, previousInline, previousClose] = output.slice(-3);
  const before =
    output.length >= 3 &&
    textBlocks.has(previousOpen.type) &&
    previousOpen.level === token.level &&
    previousOpen.map !== null &&
    previousOpen.map[1] <= map[0] &&
    previousInline.type === 'inline' &&
    previousClose.nesting === -1;
  const [nextOpen, nextInline] = [tokens[index + 1], tokens[index + 2]];
  const after =
    nextOpen !== undefined &&
    textBlocks.has(nextOpen.type) &&
    nextOpen.level === token.level &&
    nextOpen.map !== null &&
    nextInline?.type === 'inline';
  if (before) {
    previousInline.children = [...(previousInline.children ?? []), icon];
    previousOpen.map = [previousOpen.map![0], map[1]];
    if (after && previousOpen.type === 'paragraph_open' && nextOpen.type === 'paragraph_open') {
      previousInline.children.push(textToken(state, ' '), ...(nextInline.children ?? []));
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
 * iconsInText turns the notes and the markers of selections in a text into icons and the edges of selections. A note
 * in the text of a paragraph or a heading shows as an icon without the blanks before it: the icon follows the word
 * before the note, and one space the icon. A marker of a selection keeps the text around it: an opening marker becomes
 * the start of the selection, a closing marker its end and the icon of its note, and a point the icon of its note
 * ([R-NOTE-006](../../docs/requirements.md#r-note-006)). Every other comment of the text stays a comment.
 * @param state - The state of the core rule.
 * @param token - The inline token.
 * @param inBlock - Whether the inline token is the text of a paragraph or a heading.
 * @param numbers - The numbers of the notes.
 */
function iconsInText(state: StateCore, token: Token, inBlock: boolean, numbers: Numbers): void {
  const children = token.children ?? [];
  const result: Token[] = [];
  children.forEach((child, index) => {
    if (child.type !== noteTokenType) {
      result.push(child);
      return;
    }
    const marker = readMarker(child.content);
    const selected = marker && numbers.selected.get(marker.id);
    if (marker && selected) {
      const edge = (kind: EdgeMeta['edge']): Token => {
        const edgeToken = new state.Token(edgeTokenType, '', 0);
        edgeToken.meta = { id: marker.id, edge: kind, number: selected.number } satisfies EdgeMeta;
        return edgeToken;
      };
      if (marker.kind === 'open') {
        result.push(edge('start'));
        return;
      }
      const icon = newToken(state, iconTokenType, noteMeta(state, selected.note, selected.line, selected.number), 0);
      result.push(...(marker.kind === 'close' ? [edge('end')] : []), icon);
      return;
    }
    const note = inBlock && !marker ? readNote(innerText(child.content)) : undefined;
    if (!note) {
      child.type = 'html_inline';
      result.push(child);
      return;
    }
    const { start } = child.meta as InlineNoteMeta;
    child.type = iconTokenType;
    child.meta = noteMeta(state, note, token.map![0] + lineOf(token.content, start), numbers.of(child));
    child.content = '';
    const previous = result.at(-1);
    if (previous?.type === 'text') {
      previous.content = previous.content.replace(/[ \t]+$/, '');
    }
    const next = children[index + 1];
    if (next?.type === 'text') {
      next.content = next.content.replace(/^[ \t]+/, ' ');
    }
    result.push(child);
  });
  token.children = result;
}

/**
 * transform is the core rule of the plugin: it turns the notes of a document into icons and callouts.
 * @param state - The state of the core rule.
 */
function transform(state: StateCore): void {
  const tokens = state.tokens;
  const numbers = new Numbers(tokens);
  const output: Token[] = [];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type === noteLinesTokenType && token.map) {
      index = attachLines(state, tokens, index, output, numbers);
      continue;
    }
    if (token.type === 'html_block' && token.map) {
      // The comments of the block that are no notes show nothing, with or without the block. A note with a selection
      // shows at the marker of its selection.
      const notes = (onlyComments(token.content) ?? []).flatMap((span) => {
        const note = readNote(innerText(token.content.slice(span.start, span.end)));
        return note ? [{ note, span, line: token.map![0] + lineOf(token.content, span.start) }] : [];
      });
      if (notes.length > 0) {
        output.push(
          ...notes
            .filter(({ note, span }) => !numbers.shownAtMarker(token, span.start, note))
            .map(({ note, span, line }) => newToken(state, blockTokenType, noteMeta(state, note, line, numbers.of(token, span.start)), token.level)),
        );
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
      iconsInText(state, token, inlineParents.has(output[index - 1]?.type), numbers);
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
 * colorClassOf returns the class of the color of a note, which the icon, the callout and the highlight of its selection
 * share.
 * @param number - The number of the note, from 1.
 */
const colorClassOf = (number: number): string => `${noteClass}-color-${colorIndexOf(number) + 1}`;

/**
 * iconHtml returns the HTML of the icon of a note: a link that opens the note in the side view, or without a link an
 * element that takes the focus, which shows the callout too.
 * @param md - The markdown-it instance.
 * @param meta - The meta of the note.
 * @param link - The link, or undefined.
 */
function iconHtml(md: MarkdownIt, meta: NoteMeta, link: string | undefined): string {
  const count = meta.note.answers.length > 1 ? `<span class="${noteClass}-count">${meta.note.answers.length}</span>` : '';
  const attributes = `class="${noteClass}-icon ${colorClassOf(meta.number)}" aria-label="${md.utils.escapeHtml(labelOf(meta))}" aria-describedby="${meta.id}"`;
  return link === undefined
    ? `<span ${attributes} role="img" tabindex="0">${glyph}${count}</span>`
    : `<a ${attributes} href="${md.utils.escapeHtml(link)}">${glyph}${count}</a>`;
}

/**
 * calloutHtml returns the HTML of the hidden callout of a note: each answer with its header and its body.
 * @param md - The markdown-it instance.
 * @param meta - The meta of the note.
 * @param render - Renders the tokens of the body of the answer with the index.
 */
function calloutHtml(md: MarkdownIt, meta: NoteMeta, render: (tokens: Token[], index: number) => string): string {
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
    const body = meta.note.nested ? `<pre class="${noteClass}-text">${escape(answer.body)}</pre>\n` : render(meta.bodies[index], index);
    return `<div class="${noteClass}-answer">\n<div class="${noteClass}-header">${header}</div>\n<div class="${noteClass}-body">\n${body}</div>\n</div>\n`;
  });
  return `<div class="${noteClass} ${colorClassOf(meta.number)}" id="${meta.id}" role="note" aria-label="${escape(labelOf(meta))}" hidden>\n${problem}${answers.join('')}</div>\n`;
}

/**
 * renderBody renders the tokens of the body of an answer with the rules of the renderer (R-GEN-007).
 *
 * It calls the method `render` of the class of the renderer, not the method of the renderer itself: a plugin can wrap
 * the method of the renderer to frame the whole page, as the extension "Markdown Preview Github Styling" does, and a
 * body is no page. The footnotes of the body get the ID of the note and the number of the answer as the prefix of
 * their IDs (`docId` of markdown-it-footnote), so that they differ from the footnotes of the document, of the other
 * notes and of the other answers.
 * @param renderer - The renderer of the page.
 * @param tokens - The tokens of the body.
 * @param options - The options of the renderer.
 * @param env - The environment of the page.
 * @param meta - The meta of the note.
 * @param answer - The index of the answer.
 */
function renderBody(renderer: Renderer, tokens: Token[], options: Options, env: unknown, meta: NoteMeta, answer: number): string {
  const render = (Object.getPrototypeOf(renderer) as Renderer).render;
  return render.call(renderer, tokens, options, { ...(env as object), docId: `${meta.id}-${answer + 1}` });
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
  md.renderer.rules[edgeTokenType] = (tokens, index, _options, env) => {
    const meta = tokens[index].meta as EdgeMeta;
    return shows(env) ? `<span class="${noteClass}-edge" data-selection="${meta.id}" data-edge="${meta.edge}" data-color="${colorIndexOf(meta.number) + 1}"></span>` : '';
  };
  md.renderer.rules[calloutTokenType] = (tokens, index, rendererOptions, env, self) => {
    const meta = tokens[index].meta as NoteMeta;
    return shows(env) ? calloutHtml(md, meta, (body, answer) => renderBody(self, body, rendererOptions, env, meta, answer)) : '';
  };
  md.renderer.rules[blockTokenType] = (tokens, index, rendererOptions, env, self) => {
    const meta = tokens[index].meta as NoteMeta;
    if (!shows(env)) {
      return '';
    }
    const callout = calloutHtml(md, meta, (body, answer) => renderBody(self, body, rendererOptions, env, meta, answer));
    return `<div class="${noteClass}-anchor">${iconHtml(md, meta, options.linkOf(env, meta.line))}</div>\n${callout}`;
  };
  return md;
}
