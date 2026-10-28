// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The syntax of a note ([R-NOTE-001](../../docs/requirements.md#r-note-001)):
 * an HTML comment of a Markdown text that starts with `<!-- note` (a block
 * note) or `<!-- note inline` (an inline note,
 * [R-NOTE-005](../../docs/requirements.md#r-note-005)) on a line of its own.
 * The text of the note starts on the next line. It is a thread of answers
 * ([R-NOTE-004](../../docs/requirements.md#r-note-004)): each answer starts
 * with a front matter that names its author and its date
 * ([R-NOTE-002](../../docs/requirements.md#r-note-002)), and its body in
 * Markdown follows:
 *
 * ```markdown
 * <!-- note
 * ---
 * author: hannes
 * date: 2026-10-28T10:15+01:00
 * ---
 * Check the dates.
 * ---
 * author: anna
 * date: 2026-10-28T11:02+01:00
 * ---
 * Friday works.
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

import type { StateBlock, StateInline } from 'markdown-it';

/** commentStart is the text that starts an HTML comment. */
export const commentStart = '<!--';

/** commentEnd is the text that ends an HTML comment. */
export const commentEnd = '-->';

/** Kind tells how a note starts: `block` for `<!-- note`, `inline` for `<!-- note inline`. */
export type Kind = 'block' | 'inline';

/** keywords are the words after `<!--` on the first line of a note, by its kind. */
export const keywords: Readonly<Record<Kind, string>> = { block: 'note', inline: 'note inline' };

/**
 * keywordLine matches the first line of the text of a comment that is a note: the word `note`, or the words
 * `note inline`, in small or capital letters, alone on the line of `<!--`. The text of the note starts on the next
 * line.
 */
const keywordLine = /^[ \t]*note(?:[ \t]+(inline))?[ \t]*$/i;

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
 * `html_inline` and reads a comment as that rule does, so the editor and the preview find the same comments. Its
 * token keeps the span of the comment in the text of the inline token, by which the extension finds the comment in
 * the Markdown text. The markdown-it plugin turns each token into a note, or back into the token `html_inline` that
 * markdown-it writes without the rule.
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

/** noteLinesTokenType is the type of the markdown-it token of an inline note on lines of its own, which the block rule writes. */
export const noteLinesTokenType = 'nimblescape_note_lines';

/** NoteLinesMeta is the meta of a token of an inline note on lines of its own: the span of its comment in the source text. */
export type NoteLinesMeta = Span;

/** inlineNoteLine matches the first line of an inline note on lines of its own: `<!-- note inline` alone on the line. */
const inlineNoteLine = /^<!--[ \t]*note[ \t]+inline[ \t]*$/i;

/**
 * noteLinesRule is a markdown-it block rule for an inline note that starts on a line of its own
 * ([R-NOTE-005](../../docs/requirements.md#r-note-005)): a line `<!-- note inline` in a paragraph or between two
 * blocks. Without the rule, the rule `html_block` reads the comment as an HTML block, which ends the paragraph before
 * it. The rule runs before `html_block`, ends a paragraph as `html_block` does, and ends the comment at the first
 * `-->`. Its token keeps the comment without the prefixes of its lines, and the span of the comment in the source
 * text. A text after `-->` on the last line starts the next block, so that the plugin of the preview can join it to
 * the paragraph before the note.
 * @param state - The state of the block parser.
 * @param startLine - The index of the line where the rule starts.
 * @param endLine - The index of the line after the text.
 * @param silent - Whether the rule only tells whether it matches.
 */
export function noteLinesRule(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  // The conditions of html_block: HTML is on, and the line is no line of an indented code block.
  if (!state.md.options.html || state.sCount[startLine] - state.blkIndent >= 4) {
    return false;
  }
  const start = state.bMarks[startLine] + state.tShift[startLine];
  if (!inlineNoteLine.test(state.src.slice(start, state.eMarks[startLine]))) {
    return false;
  }
  let line = startLine + 1;
  let end = -1;
  for (; line < endLine; line++) {
    // A line with less indentation ends the block of the comment, as in html_block; an empty line does not.
    if (state.sCount[line] < state.blkIndent && !state.isEmpty(line)) {
      return false;
    }
    const lineStart = state.bMarks[line] + state.tShift[line];
    const index = state.src.slice(lineStart, state.eMarks[line]).indexOf(commentEnd);
    if (index >= 0) {
      end = lineStart + index + commentEnd.length;
      break;
    }
  }
  if (end < 0) {
    return false;
  }
  if (silent) {
    return true;
  }
  const token = state.push(noteLinesTokenType, '', 0);
  token.block = true;
  token.map = [startLine, line + 1];
  const text = state.getLines(startLine, line + 1, state.blkIndent, false);
  const open = text.indexOf(commentStart);
  token.content = text.slice(open, text.indexOf(commentEnd, open + commentStart.length) + commentEnd.length);
  token.meta = { start, end } satisfies NoteLinesMeta;
  let rest = end;
  while (rest < state.eMarks[line] && (state.src[rest] === ' ' || state.src[rest] === '\t')) {
    rest++;
  }
  if (rest < state.eMarks[line]) {
    // The rest of the last line starts the next block.
    state.bMarks[line] = rest;
    state.tShift[line] = 0;
    state.sCount[line] = state.blkIndent;
    state.bsCount[line] = 0;
    state.line = line;
  } else {
    state.line = line + 1;
  }
  return true;
}

/** FrontMatter is the front matter of an answer: the lines from the opening `---` to the closing `---`, and its fields. */
export interface FrontMatter {
  /** lines are the lines of the front matter, with both fences, as the comment holds them. */
  lines: string[];
  /** fields are the values of the fields by their names in small letters, for example `author` and `date`. */
  fields: Record<string, string>;
}

/**
 * Answer is one answer of the thread of a note: its front matter with the author and the date, and its body. The
 * lines are lines of the text of the comment, where the line of `<!-- note` is 0.
 */
export interface Answer {
  /** frontMatter is the front matter of the answer, or undefined. */
  frontMatter: FrontMatter | undefined;
  /** author is the value of the field `author`, or undefined. */
  author: string | undefined;
  /** date is the value of the field `date` as written, or undefined. */
  date: string | undefined;
  /** body is the Markdown text of the answer, without its front matter and without blank lines around it. */
  body: string;
  /** start is the index of the first line of the answer: the line of its front matter, or of its body. */
  start: number;
  /** bodyLine is the index of the line where the body starts. */
  bodyLine: number;
  /** end is the index of the line after the last line of the body, or of the front matter when the body is empty. */
  end: number;
}

/** NoteText is the content of the text of the comment of a note. */
export interface NoteText {
  /** kind tells how the note starts. */
  kind: Kind;
  /** keyword is the text of the first line after `<!--`, without the spaces around it, for example `note inline`. */
  keyword: string;
  /** answers are the answers of the thread, in the order of the text; a note has at least one. */
  answers: Answer[];
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
 * frontMatterAt returns the front matter that starts at a line, and the index of the line after it. A front matter
 * starts with a line `---`, holds at least one field and otherwise blank lines, and ends with the next line `---`.
 * @param lines - The lines of the text of the comment.
 * @param open - The index of the line.
 */
function frontMatterAt(lines: readonly string[], open: number): { frontMatter: FrontMatter; next: number } | undefined {
  if (open >= lines.length || !fence.test(lines[open])) {
    return undefined;
  }
  const fields: Record<string, string> = {};
  let found = false;
  for (let index = open + 1; index < lines.length; index++) {
    if (fence.test(lines[index])) {
      return found ? { frontMatter: { lines: lines.slice(open, index + 1), fields }, next: index + 1 } : undefined;
    }
    const match = field.exec(lines[index]);
    if (match) {
      fields[match[1].toLowerCase()] ??= fieldValue(match[2]);
      found = true;
    } else if (lines[index].trim() !== '') {
      return undefined;
    }
  }
  return undefined;
}

/**
 * answerOf builds an answer from its lines: the body loses the blank lines before and after it, the spaces before its
 * first line and after its last line.
 * @param lines - The lines of the text of the comment.
 * @param start - The index of the first line of the answer.
 * @param frontMatter - The front matter, or undefined.
 * @param bodyStart - The index of the line after the front matter, or the first line without one.
 * @param bodyEnd - The index of the line where the next answer starts, or the number of lines.
 */
function answerOf(lines: readonly string[], start: number, frontMatter: FrontMatter | undefined, bodyStart: number, bodyEnd: number): Answer {
  let first = bodyStart;
  let last = bodyEnd - 1;
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
  const fields = frontMatter?.fields ?? {};
  return {
    frontMatter,
    author: fields.author || undefined,
    date: fields.date || undefined,
    body: body.join('\n'),
    start,
    bodyLine: first <= last ? first : bodyStart,
    end: first <= last ? last + 1 : bodyStart,
  };
}

/**
 * readAnswers reads the answers of the text of a note ([R-NOTE-004](../../docs/requirements.md#r-note-004)). Each
 * front matter starts an answer, and the first answer may have none. An empty first answer without a front matter
 * before a front matter is no answer: the text of the note then starts with a blank line.
 * @param lines - The lines of the text of the comment; the first one is the line of `<!-- note`.
 */
function readAnswers(lines: readonly string[]): Answer[] {
  const answers: Answer[] = [];
  let start = 1;
  let read = frontMatterAt(lines, start);
  for (;;) {
    const bodyStart = read?.next ?? start;
    let next: ReturnType<typeof frontMatterAt>;
    let line = bodyStart;
    for (; line < lines.length; line++) {
      next = frontMatterAt(lines, line);
      if (next) {
        break;
      }
    }
    const answer = answerOf(lines, start, read?.frontMatter, bodyStart, line);
    if (!(answers.length === 0 && next && !answer.frontMatter && answer.body === '')) {
      answers.push(answer);
    }
    if (!next) {
      return answers;
    }
    start = line;
    read = next;
  }
}

/**
 * readNote reads the text of a comment: its kind and the answers of its thread. A comment that does not start with
 * `<!-- note` or `<!-- note inline` on a line of its own is no note, and the result is undefined.
 * @param text - The text of the comment between `<!--` and `-->`.
 */
export function readNote(text: string): NoteText | undefined {
  const lines = text.split('\n');
  const match = lines.length > 1 ? keywordLine.exec(lines[0]) : null;
  if (!match) {
    return undefined;
  }
  return {
    kind: match[1] ? 'inline' : 'block',
    keyword: lines[0].trim(),
    answers: readAnswers(lines),
    nested: text.includes(commentStart),
  };
}

/**
 * bodyProblem returns the first forbidden text that a body holds, or undefined
 * ([R-NOTE-003](../../docs/requirements.md#r-note-003)).
 * @param body - The Markdown text of an answer.
 */
export const bodyProblem = (body: string): string | undefined => forbiddenTexts.find((text) => body.includes(text));

/**
 * normalizeBody turns the text of the editor of an answer into the body of the answer: line breaks as `\n`, and no
 * blank lines and no white space before and after the text.
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
 * Fields are the fields of the front matter of a new answer
 * ([R-EDIT-003](../../docs/requirements.md#r-edit-003), [R-EDIT-005](../../docs/requirements.md#r-edit-005)).
 */
export interface Fields {
  author?: string;
  date?: string;
}

/**
 * frontMatterLines returns the lines of the front matter of a new answer. A field without a value has no line. The
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
 * answerLines returns the lines of an answer: the lines of its front matter, then the lines of its body.
 * @param frontMatter - The lines of the front matter, or undefined.
 * @param body - The body.
 */
export const answerLines = (frontMatter: readonly string[] | undefined, body: string): string[] => [...(frontMatter ?? []), ...(body === '' ? [] : body.split('\n'))];

/**
 * commentText returns the comment of a new note, from `<!--` to `-->`, with `\n` as line breaks and without the
 * prefixes of the lines: `<!-- note` or `<!-- note inline` on a line of its own, the lines of the front matter, the
 * body, and `-->` on a line of its own.
 * @param kind - The kind of the note.
 * @param frontMatter - The lines of the front matter, or undefined.
 * @param body - The body.
 */
export function commentText(kind: Kind, frontMatter: readonly string[] | undefined, body: string): string {
  return [`${commentStart} ${keywords[kind]}`, ...answerLines(frontMatter, body), commentEnd].join('\n');
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
 * formatDate writes a point in time as the date of a new answer: the local date and time in minutes with the offset
 * of the local zone, for example `2026-10-28T10:15+01:00`.
 * @param date - The point in time.
 */
export function formatDate(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  const offset = -date.getTimezoneOffset();
  const sign = offset < 0 ? '-' : '+';
  const zone = `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}${zone}`;
}
