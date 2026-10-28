// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The markdown-it plugin of the built-in Markdown preview
 * ([R-PREV-001](../../docs/requirements.md#r-prev-001)). It shows each note as
 * a callout: a box with a header that names the author and the date, and the
 * body of the note rendered as Markdown, with the plugins of the preview. A
 * note on lines of its own shows at its place. A note in a paragraph or a
 * heading shows as a number in the text, and its callout follows the
 * paragraph or the heading ([R-PREV-002](../../docs/requirements.md#r-prev-002)).
 * A note in another place, such as a table cell, stays a comment, as in the
 * text editor ([notes.ts](../notes/notes.ts)). Every other token
 * keeps the output of the preview, and a comment that is no note stays an
 * HTML comment, which the preview does not show.
 *
 * The plugin adds the inline rule of the notes ([syntax.ts](../notes/syntax.ts))
 * and a core rule after the rules of markdown-it. The core rule turns each HTML
 * block that holds only notes into callout tokens, and each inline note into a
 * number token and a callout token after its block. It parses the body of each
 * note with the same markdown-it instance, and moves the lines of the body
 * tokens to the lines of the document. The preview gives every token with
 * lines the attribute `data-line` and the class `code-line` after the core
 * rule, for the scrolling with the editor; the body tokens get them in their
 * own parse, and the plugin moves `data-line` with the lines.
 */

import type MarkdownIt from 'markdown-it';
import type { StateCore, Token } from 'markdown-it';
import { inlineParents } from '../notes/notes';
import { displayDate, innerText, inlineNoteRule, noteTokenType, type NoteText, onlyComments, readNote } from '../notes/syntax';

/** noteClass is the class of the element of a callout. */
export const noteClass = 'nimblescape-note';

/** calloutTokenType is the type of the token of a callout. */
const calloutTokenType = 'nimblescape_note_callout';

/** referenceTokenType is the type of the token of the number of an inline note in its text. */
const referenceTokenType = 'nimblescape_note_reference';

/** PreviewSettings are the settings of the extension that change the preview. */
export interface PreviewSettings {
  /** showInPreview shows the notes as callouts ([R-PREV-003](../../docs/requirements.md#r-prev-003)). */
  showInPreview: boolean;
}

/** CalloutMeta is the meta of a callout token. */
interface CalloutMeta {
  /** note is the content of the comment. */
  note: NoteText;
  /** number is the number of an inline note, or undefined for a note on lines of its own. */
  number: number | undefined;
  /** tokens are the tokens of the body. */
  tokens: Token[];
}

/**
 * diffMarker matches an empty element that the rendered diff of VS Code inserts into the Markdown text at the start
 * or at the end of a changed part of a line (extensions/markdown-language-features/src/preview/documentRenderer.ts).
 * In the body it marks the change; in the author and the date it would show as text.
 */
const diffMarker = /<span data-diff-(?:start|end)="\d+"><\/span>/g;

/**
 * shiftLines moves the lines of tokens and of the attribute `data-line` by a number of lines.
 * @param tokens - The tokens of a body.
 * @param offset - The index of the line of the document where the body starts.
 */
function shiftLines(tokens: readonly Token[], offset: number): void {
  for (const token of tokens) {
    if (token.map) {
      token.map = [token.map[0] + offset, token.map[1] + offset];
      if (token.attrGet('data-line') !== null) {
        token.attrSet('data-line', String(token.map[0]));
      }
    }
  }
}

/**
 * calloutToken builds the token of the callout of a note.
 * @param state - The state of the core rule.
 * @param note - The content of the comment.
 * @param lines - The index of the first line of the comment and of the line after it.
 * @param level - The nesting level of the token.
 * @param number - The number of an inline note, or undefined.
 */
function calloutToken(state: StateCore, note: NoteText, lines: [number, number], level: number, number: number | undefined): Token {
  const token = new state.Token(calloutTokenType, 'div', 0);
  token.block = true;
  token.level = level;
  token.map = lines;
  token.attrJoin('class', noteClass);
  let tokens: Token[] = [];
  // A note that holds the start of another comment shows its text as it is: as Markdown, that start would open an
  // HTML comment in the page and hide the rest of the page.
  if (!note.nested && note.body !== '') {
    tokens = state.md.parse(note.body, state.env);
    shiftLines(tokens, lines[0] + note.bodyLine);
  }
  token.meta = { note, number, tokens } satisfies CalloutMeta;
  return token;
}

/**
 * lineOf returns the index of the line of an offset of a text.
 * @param text - The text.
 * @param offset - The offset.
 */
const lineOf = (text: string, offset: number): number => text.slice(0, offset).split('\n').length - 1;

/**
 * transform is the core rule of the plugin: it turns the notes of a document into callouts.
 * @param state - The state of the core rule.
 * @param settings - The settings of the document.
 */
function transform(state: StateCore, settings: PreviewSettings): void {
  if (!settings.showInPreview) {
    for (const token of state.tokens) {
      for (const child of token.children ?? []) {
        if (child.type === noteTokenType) {
          child.type = 'html_inline';
        }
      }
    }
    return;
  }
  const output: Token[] = [];
  /** pending holds the callouts of inline notes by the index of the token after which they go. */
  const pending = new Map<number, Token[]>();
  let count = 0;
  state.tokens.forEach((token, index) => {
    if (token.type === 'html_block' && token.map) {
      // The comments of the block that are no notes show nothing, with or without the block.
      const notes = (onlyComments(token.content) ?? []).flatMap((span) => {
        const note = readNote(innerText(token.content.slice(span.start, span.end)));
        return note ? [{ span, note }] : [];
      });
      if (notes.length > 0) {
        for (const { span, note } of notes) {
          const first = token.map[0] + lineOf(token.content, span.start);
          output.push(calloutToken(state, note, [first, token.map[0] + lineOf(token.content, span.end) + 1], token.level, undefined));
        }
        return;
      }
    } else if (token.type === 'inline' && token.map) {
      const inParagraph = inlineParents.has(state.tokens[index - 1]?.type);
      for (const child of token.children ?? []) {
        if (child.type !== noteTokenType) {
          continue;
        }
        const { start, end } = child.meta as { start: number; end: number };
        const note = inParagraph ? readNote(innerText(child.content)) : undefined;
        if (!note) {
          child.type = 'html_inline';
          continue;
        }
        count++;
        child.type = referenceTokenType;
        child.meta = { number: count };
        // The callout follows the closing token of the paragraph or the heading.
        const close = index + 1;
        const lines: [number, number] = [token.map[0] + lineOf(token.content, start), token.map[0] + lineOf(token.content, end) + 1];
        const level = state.tokens[close].level;
        pending.set(close, [...(pending.get(close) ?? []), calloutToken(state, note, lines, level, count)]);
      }
    }
    output.push(token);
    output.push(...(pending.get(index) ?? []));
  });
  state.tokens = output;
}

/**
 * headerOf returns the HTML of the header of a callout: the number of an inline note, the author or the word "Note",
 * and the date.
 * @param md - The markdown-it instance.
 * @param meta - The meta of the callout.
 */
function headerOf(md: MarkdownIt, meta: CalloutMeta): string {
  const escape = md.utils.escapeHtml;
  const author = meta.note.author?.replace(diffMarker, '');
  const date = meta.note.date?.replace(diffMarker, '');
  const parts = [
    meta.number === undefined ? '' : `<span class="${noteClass}-number">${meta.number}</span>`,
    `<span class="${noteClass}-author">${escape(author || 'Note')}</span>`,
    date ? `<time class="${noteClass}-date" datetime="${escape(date)}">${escape(displayDate(date))}</time>` : '',
  ];
  return `<div class="${noteClass}-header">${parts.join('')}</div>\n`;
}

/**
 * extendMarkdownIt adds the notes to a markdown-it instance of the Markdown preview.
 * @param md - The markdown-it instance.
 * @param settingsOf - Returns the settings for the environment of a rendering, which names its document.
 * @returns The same instance.
 */
export function extendMarkdownIt(md: MarkdownIt, settingsOf: (env: unknown) => PreviewSettings): MarkdownIt {
  md.inline.ruler.before('html_inline', noteTokenType, inlineNoteRule);
  md.core.ruler.push('nimblescape_notes', (state) => transform(state, settingsOf(state.env)));
  // A comment that the core rule did not reach renders as markdown-it renders an inline comment: as it is.
  md.renderer.rules[noteTokenType] = (tokens, index) => tokens[index].content;
  md.renderer.rules[referenceTokenType] = (tokens, index) =>
    `<sup class="${noteClass}-reference"><span class="${noteClass}-number">${(tokens[index].meta as { number: number }).number}</span></sup>`;
  md.renderer.rules[calloutTokenType] = (tokens, index, options, env, self) => {
    const token = tokens[index];
    const meta = token.meta as CalloutMeta;
    const author = meta.note.author?.replace(diffMarker, '');
    const label = `${meta.number === undefined ? 'Note' : `Note ${meta.number}`}${author ? ` by ${author}` : ''}`;
    const body = meta.note.nested
      ? `<p class="${noteClass}-problem">This note contains the start of another comment, <code>&lt;!--</code>, and shows its text as it is.</p>\n<pre class="${noteClass}-text">${md.utils.escapeHtml(meta.note.body)}</pre>\n`
      : self.render(meta.tokens, options, env);
    return `<div${self.renderAttrs(token)} role="note" aria-label="${md.utils.escapeHtml(label)}">\n${headerOf(md, meta)}<div class="${noteClass}-body">\n${body}</div>\n</div>\n`;
  };
  return md;
}
