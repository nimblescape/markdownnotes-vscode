// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The syntax of a note ([R-NOTE-001](../../docs/requirements.md#r-note-001)):
 * an HTML comment of a Markdown text that starts with `<!-- note` on a line of
 * its own. The text of the note starts on the next line: an optional front
 * matter that names the author and the date
 * ([R-NOTE-002](../../docs/requirements.md#r-note-002)), then the body in
 * Markdown, then `-->`:
 *
 * ```markdown
 * <!-- note
 * ---
 * author: Hannes Stauss
 * date: 2026-10-28T10:15+01:00
 * ---
 * The text of the note, in **Markdown**.
 * -->
 * ```
 *
 * Every other comment is no note and stays as it is. The module reads and
 * writes the text of one comment, and finds the comments of a text as
 * markdown-it 14, the parser of the Markdown preview, finds them. The text of
 * a note must not contain another comment
 * ([R-NOTE-003](../../docs/requirements.md#r-note-003)). The module uses no
 * API of VS Code, so that the extension and the markdown-it plugin share it.
 */

import type { StateInline } from 'markdown-it';

/** commentStart is the text that starts an HTML comment. */
export const commentStart = '<!--';

/** commentEnd is the text that ends an HTML comment. */
export const commentEnd = '-->';

/** noteStart is the first line of the comment of a note. */
export const noteStart = '<!-- note';

/**
 * noteKeyword matches the first line of the text of a comment that is a note: the word `note`, in small or capital
 * letters, alone on the line of `<!--`. The text of the note starts on the next line.
 */
const noteKeyword = /^[ \t]*note[ \t]*\n/i;

/**
 * forbiddenTexts are the texts that the text of a note must not contain
 * ([R-NOTE-003](../../docs/requirements.md#r-note-003)): the start and the end of a comment, and `--!>`, at which a
 * browser ends a comment too.
 */
export const forbiddenTexts = [commentStart, commentEnd, '--!>'] as const;

/**
 * commentEndAt returns the offset after the end of the HTML comment that starts at an offset of a text, with the rule
 * of markdown-it 14 for an inline comment: `<!-->` and `<!--->` are empty comments, and every other comment ends at
 * the first `-->`. The result is -1 when no comment starts at the offset or when the comment does not end.
 * @param text - The text.
 * @param start - The offset of the `<` of `<!--`.
 */
export function commentEndAt(text: string, start: number): number {
  if (!text.startsWith(commentStart, start)) {
    return -1;
  }
  if (text.startsWith('>', start + 4)) {
    return start + 5;
  }
  if (text.startsWith('->', start + 4)) {
    return start + 6;
  }
  const end = text.indexOf(commentEnd, start + 4);
  return end < 0 ? -1 : end + commentEnd.length;
}

/**
 * innerText returns the text of a comment between `<!--` and `-->`. The empty comments `<!-->` and `<!--->` have an
 * empty text.
 * @param comment - The comment, from `<!--` to `-->`.
 */
export function innerText(comment: string): string {
  return comment === '<!-->' || comment === '<!--->' ? '' : comment.slice(commentStart.length, -commentEnd.length);
}

/** Span is a part of a text, by the offset of its first character and the offset after its last character. */
export interface Span {
  start: number;
  end: number;
}

/**
 * onlyComments returns the comments of the text of an HTML block when the block holds nothing but comments and white
 * space. A block with other HTML, or with a comment that does not end, holds no note, and the result is undefined.
 * markdown-it starts such a block at a line that starts with `<!--` and ends it at the first line with `-->`.
 * @param content - The text of the HTML block.
 */
export function onlyComments(content: string): Span[] | undefined {
  const spans: Span[] = [];
  let position = 0;
  for (;;) {
    while (position < content.length && /\s/.test(content[position])) {
      position++;
    }
    if (position >= content.length) {
      return spans;
    }
    const end = commentEndAt(content, position);
    if (end < 0) {
      return undefined;
    }
    spans.push({ start: position, end });
    position = end;
  }
}

/** noteTokenType is the type of the markdown-it token of an inline comment, which the inline rule writes. */
export const noteTokenType = 'nimblescape_note';

/** InlineNoteMeta is the meta of a token of an inline comment: its span in the text of the inline token. */
export type InlineNoteMeta = Span;

/**
 * inlineNoteRule is a markdown-it rule for the inline comments of a Markdown text. It runs before the rule
 * `html_inline` and reads a comment as that rule does, so the editor and the preview find the same comments. Its token keeps the span of the comment in the text of the inline token, by which the extension finds the
 * comment in the Markdown text. The markdown-it plugin turns each token into a note, or back into the token
 * `html_inline` that markdown-it writes without the rule.
 * @param state - The state of the inline parser.
 * @param silent - Whether the rule only tells whether it matches.
 */
export function inlineNoteRule(state: StateInline, silent: boolean): boolean {
  const start = state.pos;
  // The conditions of html_inline: HTML is on, the comment fits into the text, and no earlier comment of the text
  // stayed open (skipHtmlSpecial, which html_inline sets).
  const skipped = (state as StateInline & { skipHtmlSpecial?: boolean }).skipHtmlSpecial;
  if (!state.md.options.html || skipped || start + 2 >= state.posMax || !state.src.startsWith(commentStart, start)) {
    return false;
  }
  const end = commentEndAt(state.src, start);
  if (end < 0) {
    // html_inline handles a comment that does not end: it remembers it, and the rest of the text has no comment.
    return false;
  }
  if (!silent) {
    const token = state.push(noteTokenType, '', 0);
    token.content = state.src.slice(start, end);
    token.meta = { start, end } satisfies InlineNoteMeta;
  }
  state.pos = end;
  return true;
}

/** FrontMatter is the front matter of a note: the lines from the opening `---` to the closing `---`, and its fields. */
export interface FrontMatter {
  /** lines are the lines of the front matter, with both fences, as the comment holds them. */
  lines: string[];
  /** fields are the values of the fields by their names in small letters, for example `author` and `date`. */
  fields: Record<string, string>;
}

/** NoteText is the content of the text of the comment of a note. */
export interface NoteText {
  /** frontMatter is the front matter of the note, or undefined. */
  frontMatter: FrontMatter | undefined;
  /** author is the value of the field `author`, or undefined. */
  author: string | undefined;
  /** date is the value of the field `date` as written, or undefined. */
  date: string | undefined;
  /** body is the Markdown text of the note, without its front matter and without blank lines around it. */
  body: string;
  /** bodyLine is the index of the line of the text of the comment where the body starts; the line of `<!-- note` is 0. */
  bodyLine: number;
  /** nested tells whether the text holds the start of another comment, which a note must not contain. */
  nested: boolean;
}

/** fence is a line of the front matter that opens or closes it. */
const fence = /^[ \t]*---[ \t]*$/;

/** field is a line of the front matter with a field: a name, a colon and a value. */
const field = /^[ \t]*([A-Za-z][\w-]*)[ \t]*:(.*)$/;

/**
 * fieldValue returns the value of a field of the front matter: the text after the colon without the spaces around it
 * and without the quotes around it.
 * @param raw - The text after the colon.
 */
function fieldValue(raw: string): string {
  const value = raw.trim();
  const quoted = /^"(.*)"$|^'(.*)'$/.exec(value);
  return quoted ? (quoted[1] ?? quoted[2]) : value;
}

/**
 * readFrontMatter returns the front matter of a note and the index of the line after it. The front matter starts with
 * a line `---` right after the line of `<!-- note`, and ends at the next line `---`; each line between holds a field
 * or nothing. Other lines are no front matter; the note then has none, and the lines are its body.
 * @param lines - The lines of the text of the comment; the first one is the line of `<!-- note`.
 */
function readFrontMatter(lines: readonly string[]): { frontMatter: FrontMatter; next: number } | undefined {
  const open = 1;
  if (open >= lines.length || !fence.test(lines[open])) {
    return undefined;
  }
  const fields: Record<string, string> = {};
  for (let index = open + 1; index < lines.length; index++) {
    if (fence.test(lines[index])) {
      return { frontMatter: { lines: lines.slice(open, index + 1), fields }, next: index + 1 };
    }
    const match = field.exec(lines[index]);
    if (match) {
      fields[match[1].toLowerCase()] ??= fieldValue(match[2]);
    } else if (lines[index].trim() !== '') {
      return undefined;
    }
  }
  return undefined;
}

/**
 * readNote reads the text of a comment: its front matter, the author and the date of the front matter, and the body.
 * The body loses the blank lines before and after it, the spaces before its first line and after its last line. A
 * comment that does not start with `<!-- note` on a line of its own is no note, and the result is undefined.
 * @param text - The text of the comment between `<!--` and `-->`.
 */
export function readNote(text: string): NoteText | undefined {
  if (!noteKeyword.test(text)) {
    return undefined;
  }
  const lines = text.split('\n');
  const read = readFrontMatter(lines);
  let first = read?.next ?? 1;
  let last = lines.length - 1;
  while (first <= last && lines[first].trim() === '') {
    first++;
  }
  while (last >= first && lines[last].trim() === '') {
    last--;
  }
  const body = lines.slice(first, last + 1);
  if (body.length > 0) {
    body[0] = body[0].trimStart();
    body[body.length - 1] = body[body.length - 1].trimEnd();
  }
  const fields = read?.frontMatter.fields ?? {};
  return {
    frontMatter: read?.frontMatter,
    author: fields.author || undefined,
    date: fields.date || undefined,
    body: body.join('\n'),
    bodyLine: first <= last ? first : lines.length - 1,
    nested: text.includes(commentStart),
  };
}

/**
 * bodyProblem returns the first forbidden text that a body holds, or undefined
 * ([R-NOTE-003](../../docs/requirements.md#r-note-003)).
 * @param body - The Markdown text of a note.
 */
export const bodyProblem = (body: string): string | undefined => forbiddenTexts.find((text) => body.includes(text));

/**
 * normalizeBody turns the text of the editor of a note into the body of the note: line breaks as `\n`, and no blank
 * lines and no white space before and after the text.
 * @param text - The text of the editor.
 */
export function normalizeBody(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let first = 0;
  let last = lines.length - 1;
  while (first <= last && lines[first].trim() === '') {
    first++;
  }
  while (last >= first && lines[last].trim() === '') {
    last--;
  }
  const body = lines.slice(first, last + 1);
  if (body.length > 0) {
    body[0] = body[0].trimStart();
    body[body.length - 1] = body[body.length - 1].trimEnd();
  }
  return body.join('\n');
}

/**
 * Fields are the fields of the front matter of a new note
 * ([R-EDIT-003](../../docs/requirements.md#r-edit-003)).
 */
export interface Fields {
  author?: string;
  date?: string;
}

/**
 * frontMatterLines returns the lines of the front matter of a new note. A field without a value has no line. The
 * line breaks of a value become spaces, because a field has one line.
 * @param fields - The fields.
 */
export function frontMatterLines(fields: Fields): string[] | undefined {
  const entries = Object.entries(fields).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim() !== '');
  if (entries.length === 0) {
    return undefined;
  }
  return ['---', ...entries.map(([name, value]) => `${name}: ${value.replace(/\s+/g, ' ').trim()}`), '---'];
}

/**
 * commentText returns the comment of a note, from `<!--` to `-->`, with `\n` as line breaks and without the prefixes
 * of the lines: `<!-- note` on a line of its own, the lines of the front matter, the body, and `-->` on a line of its
 * own.
 * @param frontMatter - The lines of the front matter, or undefined.
 * @param body - The body.
 */
export function commentText(frontMatter: readonly string[] | undefined, body: string): string {
  return [noteStart, ...(frontMatter ?? []), ...(body === '' ? [] : [body]), commentEnd].join('\n');
}

/**
 * Timestamp is a date of a note in the forms of ISO 8601 that a front matter takes: `2026-10-28`, `2026-10-28 10:15`,
 * `2026-10-28T10:15`, with or without seconds, and with or without a zone such as `Z` or `+01:00`.
 */
const timestamp = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * parseDate returns the point in time of a date of a front matter, or undefined for a text of another form or an
 * impossible date. A date or a time without a zone is a local date or time.
 * @param value - The date as written.
 */
export function parseDate(value: string): Date | undefined {
  const match = timestamp.exec(value.trim());
  if (!match) {
    return undefined;
  }
  const [, year, month, day, hour = '0', minute = '0', second = '0', zone] = match;
  const parts = [year, month, day, hour, minute, second].map(Number);
  let date: Date;
  if (zone) {
    const offset = zone === 'Z' ? 'Z' : `${zone.slice(0, 3)}:${zone.slice(-2)}`;
    date = new Date(`${year}-${month}-${day}T${hour.padStart(2, '0')}:${minute}:${second.padStart(2, '0')}${offset}`);
  } else {
    date = new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
  }
  // An impossible date such as 2026-02-31 rolls over to another day.
  const check = new Date(parts[0], parts[1] - 1, parts[2]);
  const valid = check.getFullYear() === parts[0] && check.getMonth() === parts[1] - 1 && check.getDate() === parts[2];
  return valid && parts[3] < 24 && parts[4] < 60 && parts[5] < 60 && !Number.isNaN(date.getTime()) ? date : undefined;
}

/**
 * displayDate returns a date of a front matter as the preview shows it: a date and time of ISO 8601 as date and time
 * with a space, without seconds and without the zone, and every other text as written.
 * @param value - The date as written.
 */
export function displayDate(value: string): string {
  const match = timestamp.exec(value.trim());
  if (!match || match[4] === undefined) {
    return value.trim();
  }
  return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}`;
}

/**
 * formatDate writes a point in time as the date of a new note: the local date and time in minutes with the offset of
 * the local zone, for example `2026-10-28T10:15+01:00`.
 * @param date - The point in time.
 */
export function formatDate(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  const offset = -date.getTimezoneOffset();
  const sign = offset < 0 ? '-' : '+';
  const zone = `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}${zone}`;
}
