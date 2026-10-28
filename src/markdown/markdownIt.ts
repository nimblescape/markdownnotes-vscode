// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The markdown-it plugin of the built-in Markdown preview. A note is a
 * footnote of the Markdown text ([R-NOTE-001](../../docs/requirements.md#r-note-001)).
 * The preview shows it as a small icon at its reference in the text
 * ([R-PREV-001](../../docs/requirements.md#r-prev-001)), and a note without a
 * reference in the left margin at the place of its definition. Each icon has
 * a hidden callout, which the script of the preview
 * ([media/markdownPreview.js](../../media/markdownPreview.js)) shows while the
 * pointer rests on the icon or the icon has the focus
 * ([R-PREV-002](../../docs/requirements.md#r-prev-002)): each answer of the
 * thread with its author, its date and its body rendered as Markdown, with the
 * plugins of the preview. The icon is a link to the extension, which opens the
 * note in the side view ([R-PREV-003](../../docs/requirements.md#r-prev-003)).
 * The start marker and the reference of a note become the start and the end
 * of its selection, which the script highlights
 * ([R-NOTE-006](../../docs/requirements.md#r-note-006)).
 *
 * The plugin adds the rules of the notes ([syntax.ts](../notes/syntax.ts)),
 * which take the notes before the rules of footnotes of other plugins, and a
 * core rule after the rules of markdown-it and of the other plugins. The
 * block rule of the notes leaves the body of each note in the tokens of the
 * document, so that the core rules of other plugins, such as emoji and task
 * lists, also change the bodies ([R-GEN-007](../../docs/requirements.md#r-gen-007)).
 * The core rule then takes the tokens of each note out of the tokens of the
 * document into the token that opens the note: the body of each answer,
 * without its header line, and for a further answer without its block quote.
 * So the scrolling of the preview never uses the callout, which is hidden or
 * floats above the page. The core rule turns each reference into an icon and
 * each start marker into the start of a selection. The notes never show as
 * footnotes, and every other footnote keeps the output of its plugin
 * ([R-PREV-004](../../docs/requirements.md#r-prev-004)).
 *
 * The preview parses a document once for each version and renders it again for
 * each change of a setting, without the document in the environment of the
 * parsing. So the core rule does the same for every document, and the render
 * rules read the setting `showInPreview`
 * ([R-PREV-005](../../docs/requirements.md#r-prev-005)) and the link of the
 * document from the environment of the rendering.
 */

import type MarkdownIt from 'markdown-it';
import type { Options, Renderer, StateCore, Token } from 'markdown-it';
import { colorIndexOf } from '../notes/colors';
import { textParents } from '../notes/notes';
import {
  addNoteRules,
  authorDate,
  displayDate,
  type Header,
  type InlineMeta,
  isoDate,
  markerType,
  noteCloseType,
  type NoteMeta,
  noteOpenType,
  readHeader,
  referenceText,
  referenceType,
} from '../notes/syntax';

/** noteClass is the class of the element of a callout, and the start of the classes of its parts. */
export const noteClass = 'nimblescape-note';

/** iconTokenType is the type of the inline token of the icon of a note at its reference. */
const iconTokenType = 'nimblescape_note_icon';

/** edgeTokenType is the type of the inline token of the start of a selection: an empty element. */
const edgeTokenType = 'nimblescape_note_edge';

/** openCommentType is the type of a block of HTML of a note that opens a comment and does not close it, which shows as text. */
const openCommentType = 'nimblescape_note_open_comment';

/** PreviewSettings are the settings of the extension that change the preview. */
export interface PreviewSettings {
  /** showInPreview shows the icons and the callouts of the notes ([R-PREV-005](../../docs/requirements.md#r-prev-005)). */
  showInPreview: boolean;
  /**
   * showCalloutOnHover shows the callout of a note while the pointer rests on its icon
   * ([R-PREV-002](../../docs/requirements.md#r-prev-002)); without it, only the keyboard focus on the icon shows the
   * callout. A missing value shows it.
   */
  showCalloutOnHover?: boolean;
  /**
   * showIconsInPreview shows the icons of the notes ([R-PREV-007](../../docs/requirements.md#r-prev-007)); without it,
   * the icons are hidden, and the passages still show and open their notes. A missing value shows them.
   */
  showIconsInPreview?: boolean;
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
  /**
   * fileLinkOf returns the address of a link of a callout that names a file, so that the extension opens the file
   * ([R-GEN-010](../../docs/requirements.md#r-gen-010)), or undefined for any other link and without a document.
   * @param env - The environment of the rendering.
   * @param href - The address of the link.
   */
  fileLinkOf(env: unknown, href: string): string | undefined;
  /**
   * selectedOf returns the label of the selected note of the rendered document, whose selection the preview shows with
   * a strong highlight and a frame, and the number of a request to scroll to it, or undefined without a document.
   * @param env - The environment of the rendering.
   */
  selectedOf?(env: unknown): { label: string | undefined; reveal: number | undefined } | undefined;
  /**
   * deselectLinkOf returns the link that deselects the selected note of the rendered document, for a click on the text
   * outside its passage ([R-PREV-003](../../docs/requirements.md#r-prev-003)), or undefined without a document.
   * @param env - The environment of the rendering.
   */
  deselectLinkOf?(env: unknown): string | undefined;
  /**
   * funnelOf returns the end of the band that the preview draws from the passage of the selected note to its right
   * edge, where the funnel of the side view starts: its top and its bottom in pixels from the top of the preview, while
   * the side view shows the funnels; else undefined ([R-SIDE-007](../../docs/requirements.md#r-side-007)).
   * @param env - The environment of the rendering.
   */
  funnelOf?(env: unknown): readonly [number, number] | undefined;
}

/** PreviewNote is the meta of the token that opens a note, after the core rule, and of the tokens of its icons. */
interface PreviewNote extends NoteMeta {
  /** id is the ID of the element of the callout, which the icons name, and of the selection. */
  id: string;
  /** line is the index of the first line of the definition in the document. */
  line: number;
  /** answers are the headers of the answers of the thread, each with the index of the answer that it replies to. */
  answers: (Header & { parent: number | undefined })[];
  /** bodies are the tokens of the body of each answer. */
  bodies: Token[][];
  /** referenced tells whether the text holds a reference of the note, where its icon shows. */
  referenced: boolean;
}

/** IconLook is how the icons of a rendering show. */
interface IconLook {
  /** hover tells whether the pointer on an icon shows its callout. */
  hover: boolean;
  /** shown tells whether the icons show. */
  shown: boolean;
  /** selected is the selected note of the document and the number of a request to scroll to it, or undefined. */
  selected: { label: string | undefined; reveal: number | undefined } | undefined;
  /** deselect is the link that deselects the selected note, or undefined. */
  deselect: string | undefined;
  /** funnel is the end of the band of the selected note at the right edge of the preview, or undefined for no band. */
  funnel: readonly [number, number] | undefined;
}

/** IconMeta is the meta of the token of an icon at a reference. */
interface IconMeta {
  note: PreviewNote;
  /** ends tells whether the icon ends the selection of the note, which then starts at a start marker or at the start of the block. */
  ends: boolean;
}

/** glyph is the image of the icon: a speech bubble in the color of the text. */
const glyph =
  '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2.5 2h11A1.5 1.5 0 0 1 15 3.5v7a1.5 1.5 0 0 1-1.5 1.5H8.2L5 14.7V12H2.5A1.5 1.5 0 0 1 1 10.5v-7A1.5 1.5 0 0 1 2.5 2Z"/></svg>';

/** counts holds the number of notes of each parsing, by its environment, for the IDs of the callouts. */
const counts = new WeakMap<object, number>();

/** noEnvironment stands for the environment of a parsing without one. */
const noEnvironment = {};

/**
 * nextId returns a new ID of a callout of a parsing. The IDs count for each environment of a parsing, so each ID is
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
 * hideLines removes the lines of a token of a callout: its map, the attribute `data-line` and the class `code-line`,
 * which the preview adds for the scrolling with the editor. A callout is hidden or floats above the page, so the
 * scrolling must not use its elements.
 * @param token - The token.
 */
function hideLines(token: Token): void {
  token.map = null;
  if (token.attrs) {
    token.attrs = token.attrs
      .filter(([name]) => name !== 'data-line')
      .map(([name, value]): [string, string] => [name, name === 'class' ? value.split(' ').filter((part) => part !== 'code-line').join(' ') : value])
      .filter(([name, value]) => name !== 'class' || value !== '');
  }
}

/**
 * removeHeaderLine removes the header line at the start of a paragraph: the whole paragraph when the header is its only
 * line, else the first line of its text.
 * @param tokens - The tokens of the note.
 * @param index - The index of the token that opens the paragraph.
 */
function removeHeaderLine(tokens: Token[], index: number): void {
  const inline = tokens[index + 1];
  const lineBreak = inline.content.indexOf('\n');
  if (lineBreak < 0) {
    tokens.splice(index, 3);
    return;
  }
  inline.content = inline.content.slice(lineBreak + 1);
  const children = inline.children ?? [];
  const end = children.findIndex((child) => child.type === 'softbreak' || child.type === 'hardbreak');
  inline.children = children.slice(end + 1);
}

/**
 * headerAt returns the header at the start of the paragraph that a token opens, or undefined.
 * @param tokens - The tokens.
 * @param index - The index of the token.
 */
function headerAt(tokens: readonly Token[], index: number): Header | undefined {
  const [open, inline] = [tokens[index], tokens[index + 1]];
  return open?.type === 'paragraph_open' && inline?.type === 'inline' ? readHeader(inline.content.split('\n')[0]) : undefined;
}

/**
 * opensComment tells whether a text of HTML opens a comment that it does not close. Such a comment in a callout would
 * hide the rest of the page, because the callout stands in the page before the blocks after the note.
 * @param html - The text of HTML.
 */
function opensComment(html: string): boolean {
  let position = 0;
  for (;;) {
    const start = html.indexOf('<!--', position);
    if (start < 0) {
      return false;
    }
    // `<!-->` and `<!--->` are comments too, so the end can start in the opening.
    const end = html.indexOf('-->', start + 2);
    if (end < 0) {
      return true;
    }
    position = end + 3;
  }
}

/**
 * bodiesOf returns the tokens of the body of each answer of a note: of the first answer without its header line, and of
 * each reply without its block quote and its header line. A block quote that starts with a header is a reply to the
 * answer whose blocks hold it ([R-NOTE-004](../../docs/requirements.md#r-note-004)). The headers of the answers and
 * their places in the tree go to the note.
 * @param tokens - The tokens between the token that opens the note and the token that closes it.
 * @param note - The note.
 * @param level - The level of the blocks of the note.
 */
function bodiesOf(tokens: Token[], note: PreviewNote, level: number): Token[][] {
  note.answers = [{ author: note.author, date: note.date, parent: undefined }];
  if (headerAt(tokens, 0)) {
    removeHeaderLine(tokens, 0);
  }
  const bodies: Token[][] = [[]];
  /** open are the answers whose blocks the tokens are in, with the level of their blocks, from the first answer. */
  const open = [{ index: 0, level }];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    hideLines(token);
    const current = open.at(-1)!;
    if (open.length > 1 && token.type === 'blockquote_close' && token.level === current.level - 1) {
      open.pop();
      continue;
    }
    const header = token.type === 'blockquote_open' && token.level === current.level ? headerAt(tokens, index + 1) : undefined;
    if (header) {
      note.answers.push({ ...header, parent: current.index });
      bodies.push([]);
      removeHeaderLine(tokens, index + 1);
      open.push({ index: note.answers.length - 1, level: token.level + 1 });
      continue;
    }
    if (token.type === 'html_block' && opensComment(token.content)) {
      token.type = openCommentType;
    }
    bodies[current.index].push(token);
  }
  return bodies;
}

/**
 * iconsInText turns the references of notes in the text of a block into icons, and their start markers into the
 * starts of their selections. The first reference of a note ends its selection: from its start marker, or from the
 * start of the block without one. A start marker directly before the reference makes a point, without a selection.
 * Each further reference of a note shows its icon too, and every other start marker shows nothing.
 * @param inline - The inline token of the block.
 * @param notes - The notes of the document, by their labels.
 */
function iconsInText(inline: Token, notes: ReadonlyMap<string, PreviewNote>): void {
  const children = inline.children ?? [];
  const starts = new Set<Token>();
  children.forEach((child, index) => {
    const meta = child.meta as InlineMeta;
    const note = child.type === referenceType ? notes.get(meta.label) : undefined;
    if (!note) {
      return;
    }
    const first = !note.referenced;
    note.referenced = true;
    const marker = first ? children.slice(0, index).find((candidate) => candidate.type === markerType && (candidate.meta as InlineMeta).label === meta.label) : undefined;
    const point = marker !== undefined && (marker.meta as InlineMeta).end === meta.start;
    if (marker && !point) {
      starts.add(marker);
      marker.type = edgeTokenType;
      marker.meta = note;
    }
    child.type = iconTokenType;
    child.meta = { note, ends: first && !point } satisfies IconMeta;
  });
  // The start markers of no selection show nothing.
  inline.children = children.filter((child) => child.type !== markerType || starts.has(child));
}

/**
 * transform is the core rule of the plugin: it turns the notes of a document into callouts, and their references and
 * start markers into icons and selections.
 * @param state - The state of the core rule.
 */
function transform(state: StateCore): void {
  const notes = new Map<string, PreviewNote>();
  const output: Token[] = [];
  const tokens = state.tokens;
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type !== noteOpenType) {
      output.push(token);
      continue;
    }
    let close = index + 1;
    while (close < tokens.length && !(tokens[close].type === noteCloseType && tokens[close].level === token.level)) {
      close++;
    }
    const meta = token.meta as NoteMeta;
    const note: PreviewNote = { ...meta, id: nextId(state.env), line: token.map?.[0] ?? 0, answers: [], bodies: [], referenced: false };
    if (!meta.duplicate) {
      notes.set(meta.label, note);
    }
    // The tokens of the note leave the tokens of the document, so that the lines of the preview never reach them.
    note.bodies = bodiesOf(tokens.slice(index + 1, close), note, token.level + 1);
    token.meta = note;
    hideLines(token);
    output.push(token);
    index = close;
  }
  output.forEach((token, index) => {
    if (token.type === 'inline' && textParents.has(output[index - 1]?.type)) {
      iconsInText(token, notes);
    }
  });
  state.tokens = output;
}

/**
 * labelOf returns the label of a note: its first author and the number of its answers.
 * @param note - The note.
 */
function labelOf(note: PreviewNote): string {
  const count = note.answers.length;
  return `Note by ${note.author}${count > 1 ? `, ${count} answers` : ''}`;
}

/**
 * colorClassOf returns the class of the color of a note, which the icon, the callout and the highlight of its selection
 * share.
 * @param number - The number of the note, from 1.
 */
const colorClassOf = (number: number): string => `${noteClass}-color-${colorIndexOf(number) + 1}`;

/**
 * iconHtml returns the HTML of the icon of a note: a link that opens the note in the side view, or without a link an
 * element that takes the focus, which shows the callout too. The attribute `data-note` holds the label of the note. The
 * script of the preview reads the attributes `data-hover="off"` of an icon whose callout the pointer does not show,
 * `data-icon="hidden"` of an icon that does not show, and of the icon of the selected note `data-selected`, with a
 * request to scroll to it `data-reveal` with its number, `data-deselect` with the link that deselects it, and
 * `data-funnel` with the top and the bottom of the end of its band at the right edge of the preview.
 * @param md - The markdown-it instance.
 * @param note - The note.
 * @param link - The link, or undefined.
 * @param look - How the icons show.
 */
function iconHtml(md: MarkdownIt, note: PreviewNote, link: string | undefined, look: IconLook): string {
  const escape = md.utils.escapeHtml;
  const count = note.answers.length > 1 ? `<span class="${noteClass}-count">${note.answers.length}</span>` : '';
  const { selected, deselect, funnel } = look;
  const chosen =
    selected?.label === note.label
      ? ` data-selected="true"${selected.reveal === undefined ? '' : ` data-reveal="${selected.reveal}"`}${deselect === undefined ? '' : ` data-deselect="${escape(deselect)}"`}${funnel === undefined ? '' : ` data-funnel="${funnel.join(' ')}"`}`
      : '';
  const attributes = `class="${noteClass}-icon ${colorClassOf(note.number)}" aria-label="${escape(labelOf(note))}" aria-describedby="${note.id}" data-note="${escape(note.label)}"${look.hover ? '' : ' data-hover="off"'}${look.shown ? '' : ' data-icon="hidden"'}${chosen}`;
  return link === undefined
    ? `<span ${attributes} role="img" tabindex="0">${glyph}${count}</span>`
    : `<a ${attributes} href="${md.utils.escapeHtml(link)}">${glyph}${count}</a>`;
}

/**
 * edgeHtml returns the HTML of the start or the end of the selection of a note.
 * @param note - The note.
 * @param edge - The start or the end.
 */
const edgeHtml = (note: PreviewNote, edge: 'start' | 'end'): string =>
  `<span class="${noteClass}-edge" data-selection="${note.id}" data-edge="${edge}" data-color="${colorIndexOf(note.number) + 1}"></span>`;

/**
 * headerHtml returns the HTML of the header of an answer: the author and the date in the local time of the reader,
 * with the date in the local time of the author as the tooltip ([R-NOTE-002](../../docs/requirements.md#r-note-002)).
 * @param md - The markdown-it instance.
 * @param header - The header of the answer.
 */
function headerHtml(md: MarkdownIt, header: Header): string {
  const escape = md.utils.escapeHtml;
  const date = `<time class="${noteClass}-date" datetime="${escape(isoDate(header.date))}" title="${escape(authorDate(header.date))}">${escape(displayDate(header.date))}</time>`;
  return `<div class="${noteClass}-header"><span class="${noteClass}-author">${escape(header.author)}</span>${date}</div>`;
}

/**
 * calloutHtml returns the HTML of the hidden callout of a note: each answer with its header and its body, and the
 * replies to each answer after it ([R-NOTE-004](../../docs/requirements.md#r-note-004)). The replies to the first
 * answer follow it, and the replies to a reply stand in a part of the reply of their own, which shows indented.
 * @param md - The markdown-it instance.
 * @param note - The note.
 * @param render - Renders the tokens of the body of an answer.
 */
function calloutHtml(md: MarkdownIt, note: PreviewNote, render: (tokens: Token[]) => string): string {
  const repliesTo = (parent: number): number[] => note.answers.flatMap((answer, index) => (answer.parent === parent ? [index] : []));
  const answerHtml = (index: number, nested: boolean): string => {
    const replies = nested ? repliesTo(index).map((reply) => answerHtml(reply, true)) : [];
    const part = replies.length > 0 ? `<div class="${noteClass}-replies">\n${replies.join('')}</div>\n` : '';
    return `<div class="${noteClass}-answer">\n${headerHtml(md, note.answers[index])}\n<div class="${noteClass}-body">\n${render(note.bodies[index] ?? [])}</div>\n${part}</div>\n`;
  };
  const answers = [answerHtml(0, false), ...repliesTo(0).map((reply) => answerHtml(reply, true))];
  const attributes = `class="${noteClass} ${colorClassOf(note.number)}" id="${note.id}" role="note" aria-label="${md.utils.escapeHtml(labelOf(note))}"`;
  return `<div ${attributes} hidden>\n${answers.join('')}</div>\n`;
}

/**
 * renderBody renders the tokens of the body of an answer with the rules of the renderer (R-GEN-007).
 *
 * It calls the method `render` of the class of the renderer, not the method of the renderer itself: a plugin can wrap
 * the method of the renderer to frame the whole page, as the extension "Markdown Preview Github Styling" does, and a
 * body is no page. The body has the environment of the page, so that its footnotes are the footnotes of the page.
 * @param renderer - The renderer of the page.
 * @param tokens - The tokens of the body.
 * @param options - The options of the renderer.
 * @param env - The environment of the page.
 */
function renderBody(renderer: Renderer, tokens: Token[], options: Options, env: unknown): string {
  return (Object.getPrototypeOf(renderer) as Renderer).render.call(renderer, tokens, options, env);
}

/**
 * withFileLinks renders the tokens of a body with other addresses of the links that name files. The tokens keep their
 * addresses, because the Markdown extension of VS Code keeps the tokens of a document for its next rendering.
 * @param tokens - The tokens of the body.
 * @param address - Returns the new address of a link, or undefined to keep it.
 * @param render - Renders the tokens.
 */
function withFileLinks(tokens: Token[], address: (href: string) => string | undefined, render: () => string): string {
  const changed: [Token, string][] = [];
  for (const token of tokens.flatMap((block) => block.children ?? [])) {
    const href = token.type === 'link_open' ? token.attrGet('href') : null;
    const replaced = href === null ? undefined : address(href);
    if (href !== null && replaced !== undefined) {
      changed.push([token, href]);
      token.attrSet('href', replaced);
    }
  }
  try {
    return render();
  } finally {
    for (const [token, href] of changed) {
      token.attrSet('href', href);
    }
  }
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
  const lookOf = (env: unknown): IconLook => {
    const settings = options.settingsOf(env);
    return {
      hover: settings.showCalloutOnHover ?? true,
      shown: settings.showIconsInPreview ?? true,
      selected: options.selectedOf?.(env),
      deselect: options.deselectLinkOf?.(env),
      funnel: options.funnelOf?.(env),
    };
  };
  md.renderer.rules[noteOpenType] = (tokens, index, rendererOptions, env, self) => {
    const note = tokens[index].meta as PreviewNote;
    if (!shows(env)) {
      return '';
    }
    // A note without a reference shows its icon in the margin.
    const anchor = note.referenced ? '' : `<div class="${noteClass}-anchor">${iconHtml(md, note, options.linkOf(env, note.line), lookOf(env))}</div>\n`;
    const render = (body: Token[]) => withFileLinks(body, (href) => options.fileLinkOf(env, href), () => renderBody(self, body, rendererOptions, env));
    return `${anchor}${calloutHtml(md, note, render)}`;
  };
  md.renderer.rules[iconTokenType] = (tokens, index, _options, env) => {
    const { note, ends } = tokens[index].meta as IconMeta;
    return shows(env) ? `${ends ? edgeHtml(note, 'end') : ''}${iconHtml(md, note, options.linkOf(env, note.line), lookOf(env))}` : '';
  };
  md.renderer.rules[edgeTokenType] = (tokens, index, _options, env) => (shows(env) ? edgeHtml(tokens[index].meta as PreviewNote, 'start') : '');
  // A reference that the core rule did not reach, such as one in a note, shows as written, and a start marker nothing.
  md.renderer.rules[referenceType] = (tokens, index) => md.utils.escapeHtml(referenceText((tokens[index].meta as InlineMeta).label));
  md.renderer.rules[markerType] = () => '';
  md.renderer.rules[openCommentType] = (tokens, index) => `<p>${md.utils.escapeHtml(tokens[index].content.trimEnd()).replace(/\n/g, '<br>\n')}</p>\n`;
  return md;
}
