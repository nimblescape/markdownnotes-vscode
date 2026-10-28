// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The syntax of a note ([R-NOTE-001](../../docs/requirements.md#r-note-001)):
 * a Markdown footnote whose label is a note label, `note-` and four small
 * letters or digits, and whose first line is the header of an answer, the
 * author in bold and the date ([R-NOTE-002](../../docs/requirements.md#r-note-002)).
 * The note is a thread of answers
 * ([R-NOTE-004](../../docs/requirements.md#r-note-004)): the body of the first
 * answer follows the header, indented by four spaces, and each further answer
 * is a block quote of its own that starts with its own header. The reference
 * of the note ends the highlight of the note, the text that the note belongs
 * to, and its hidden start marker starts it, with the name of the color of the note when
 * it has one ([R-NOTE-006](../../docs/requirements.md#r-note-006)). Every
 * note has a start marker (Hannes, 2026-10-28: "there should never be a note
 * without a start marker"), and `<wbr>` stands before the comment of each
 * marker, so that it never starts a block of HTML at the start of a line:
 *
 * ```markdown
 * The agents <wbr><!--[note-7k2q-->change the work[^note-7k2q] of teams.
 * <wbr><!--[note-p3x9 green-->Each team[^note-p3x9] has a plan.
 *
 * [^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00
 *
 *     Which teams?
 *
 *     > **anna** · 2026-10-28 11:02+01:00
 *     >
 *     > The teams of the plan.
 *
 * [^note-p3x9]: **anna** · 2026-10-28 11:05+01:00
 *
 *     All teams?
 * ```
 *
 * Every other footnote is no note and stays as it is, for the footnotes of
 * the Markdown preview of other extensions. The module reads and writes the
 * lines of one note, and has the markdown-it rules that find the notes, their
 * references and their start markers as markdown-it 14, the parser of the
 * Markdown preview, finds footnotes. The module uses no API of VS Code, so
 * that the extension and the markdown-it plugin share it.
 */

import type MarkdownIt from 'markdown-it';
import type { StateBlock, StateInline } from 'markdown-it';
import { colorNames } from './colors';

/** labelCharacters are the characters of the four random characters of the label of a new note. */
const labelCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * newLabel returns the label of a new note: `note-` and four random small letters or digits, which no footnote of the
 * text uses ([R-NOTE-001](../../docs/requirements.md#r-note-001)). Random labels do not clash when two people add notes
 * to the same file at the same time, for example on two branches.
 * @param used - The labels of all footnotes of the text.
 * @param random - Returns a random number from 0 to below 1.
 */
export function newLabel(used: ReadonlySet<string>, random: () => number = Math.random): string {
  for (let attempt = 0; attempt < 100; attempt++) {
    const characters = Array.from({ length: 4 }, () => labelCharacters[Math.floor(random() * labelCharacters.length) % labelCharacters.length]);
    const label = `note-${characters.join('')}`;
    if (!used.has(label)) {
      return label;
    }
  }
  // A text with very many notes: the first free label.
  for (let number = 0; ; number++) {
    const label = `note-${number.toString(36).padStart(4, '0')}`;
    if (!used.has(label)) {
      return label;
    }
  }
}

/** footnoteLabels matches the labels of the footnote references and definitions of a text, for example `[^1]`. */
const footnoteLabels = /\[\^([^\]\s]+)\]/g;

/**
 * usedLabels returns the labels of all footnotes of a text, notes and other footnotes.
 * @param lines - The lines of the text.
 */
export const usedLabels = (lines: readonly string[]): Set<string> => new Set(lines.flatMap((line) => [...line.matchAll(footnoteLabels)].map((match) => match[1])));

/** dateText is the form of the date of a header: the local date and time of the author with the offset of the zone, or `Z` for UTC. */
const dateText = String.raw`\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})`;

/**
 * headerPattern matches the header of an answer: the GitHub login of the author in bold, a middle dot, and the date,
 * for example `**hannes** · 2026-10-28 10:15+01:00`.
 */
const headerPattern = new RegExp(String.raw`^\*\*([A-Za-z0-9][A-Za-z0-9_-]{0,38})\*\* · (${dateText})[ \t]*$`);

/** Header is the author and the date of an answer. */
export interface Header {
  author: string;
  /** date is the date as written, for example `2026-10-28 10:15+01:00`. */
  date: string;
}

/**
 * readHeader reads the header of an answer, or returns undefined for another text.
 * @param text - The text of the line, without the prefix of the line.
 */
export function readHeader(text: string): Header | undefined {
  const match = headerPattern.exec(text.trim());
  return match ? { author: match[1], date: match[2] } : undefined;
}

/**
 * headerText returns the header of an answer.
 * @param header - The author and the date.
 */
export const headerText = (header: Header): string => `**${header.author}** · ${header.date}`;

/** definitionPattern matches the first line of the definition of a note: the label, a colon and the header. */
const definitionPattern = /^\[\^(note-[a-z0-9]{4})\]:[ \t]+(.*)$/;

/** Definition is the first line of the definition of a note: its label and the header of its first answer. */
export interface Definition extends Header {
  label: string;
}

/**
 * readDefinition reads the first line of the definition of a note, or returns undefined for another line.
 * @param line - The line, without the prefix of its block quotes and list items.
 */
export function readDefinition(line: string): Definition | undefined {
  const match = definitionPattern.exec(line);
  const header = match ? readHeader(match[2]) : undefined;
  return match && header ? { label: match[1], ...header } : undefined;
}

/**
 * referenceText returns the reference of a note in the text.
 * @param label - The label of the note.
 */
export const referenceText = (label: string): string => `[^${label}]`;

/**
 * breakText stands before the comment of each start marker: an empty element that no Markdown viewer shows. GitHub
 * reads a comment at the start of a line as a block of HTML, which ends the paragraph; after `<wbr>`, the comment is
 * part of the text of the line, wherever the marker stands (Hannes, 2026-10-28: "why not always start with <wbr>").
 */
export const breakText = '<wbr>';

/**
 * markerText returns the start marker of the selection of a note: `<wbr>` and a comment, which no Markdown viewer
 * shows, with the name of the color of the note after the label, for example `<wbr><!--[note-7k2q green-->`, and
 * without it for the default color.
 * @param label - The label of the note.
 * @param color - The name of the color, or undefined for the default color.
 */
export const markerText = (label: string, color?: string): string => `${breakText}<!--[${label}${color && color !== colorNames[0] ? ` ${color}` : ''}-->`;

/** markerPattern matches a start marker of a selection at the start of a text, with `<wbr>` before it or without. */
const markerPattern = /^(?:<wbr>)?<!--\[(note-[a-z0-9]{4})(?: ([a-z]+))?-->/;

/** MarkerText is a start marker as written: its label, the name of its color, and its length with `<wbr>` before it. */
export interface MarkerText {
  label: string;
  /** color is the name of the color after the label, or undefined. */
  color: string | undefined;
  length: number;
}

/**
 * readMarker reads a comment, or `<wbr>` and a comment, as the start marker of a selection, or returns undefined for
 * another text.
 * @param text - The text, which starts with the marker.
 */
export function readMarker(text: string): MarkerText | undefined {
  const match = markerPattern.exec(text);
  return match ? { label: match[1], color: match[2], length: match[0].length } : undefined;
}

/** indent is the indentation of the further lines of a note. */
export const indent = '    ';

/**
 * Answer is one answer of the thread of a note: its header, its body, and its place in the tree of the thread
 * ([R-NOTE-004](../../docs/requirements.md#r-note-004)). The first answer is the text of the note. A reply stands in
 * a block quote after the body of the answer that it replies to, so its depth is the number of its quote markers. The
 * lines are lines of the definition of the note, where its first line is 0.
 */
export interface Answer extends Header {
  /** body is the Markdown text of the answer, without the indentation and the quote markers, without blank lines around it. */
  body: string;
  /** depth is 0 for the first answer, 1 for a reply to it, 2 for a reply to a reply, and so on. */
  depth: number;
  /** parent is the index of the answer that the answer replies to, or undefined for the first answer. */
  parent: number | undefined;
  /** start is the index of the line of the header. */
  start: number;
  /** end is the index of the line after the last line of the body, or after the header when the body is empty. */
  end: number;
}

/** NoteText is the content of the definition of a note. */
export interface NoteText {
  label: string;
  /** answers are the answers of the thread in the order of the text, each answer before its replies; a note has at least one. */
  answers: Answer[];
}

/**
 * unindent removes the indentation of a further line of a note: four spaces or a tab. A line with less indentation is a
 * lazy line of a paragraph and loses its leading white space.
 * @param line - The line.
 */
function unindent(line: string): string {
  if (line.startsWith(indent)) {
    return line.slice(indent.length);
  }
  return line.startsWith('\t') ? line.slice(1) : line.trimStart();
}

/** quoteMarker matches one quote marker at the start of a line, with the space after it. */
const quoteMarker = /^ {0,3}>[ \t]?/;

/**
 * quoteDepth returns the number of the quote markers at the start of a line, and the text after them.
 * @param line - The line.
 * @param most - The most quote markers to remove.
 */
function quoteDepth(line: string, most = Number.MAX_SAFE_INTEGER): { depth: number; rest: string } {
  let depth = 0;
  let rest = line;
  for (let match = quoteMarker.exec(rest); match && depth < most; match = quoteMarker.exec(rest)) {
    rest = rest.slice(match[0].length);
    depth++;
  }
  return { depth, rest };
}

/**
 * trimmedBody returns the body of lines: without blank lines around it, and without white space before the first line
 * and after the last line. It also returns the index of the line after the last line of text, or undefined.
 * @param lines - The lines.
 */
function trimmedBody(lines: readonly string[]): { body: string; last: number | undefined } {
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
  return { body: body.join('\n'), last: first <= last ? last : undefined };
}

/**
 * readNote reads the definition of a note: its label and the answers of its thread. A line of a block quote whose text
 * is a header starts a reply: to the answer of the block quote around it, or to the first answer. The lines of its
 * block quote are the body of the reply, up to the next reply in it. A line with fewer quote markers ends the reply
 * after a blank line; directly after a line of text, it is a lazy line of the paragraph of the reply, as in Markdown.
 * A definition that does not start with the label of a note and a header is no note, and the result is undefined.
 * @param lines - The lines of the definition, without the prefix of its block quotes and list items.
 */
export function readNote(lines: readonly string[]): NoteText | undefined {
  const definition = readDefinition(lines[0] ?? '');
  if (!definition) {
    return undefined;
  }
  const content = lines.map((line, index) => (index === 0 ? '' : unindent(line)));
  /** Reading is an answer while its lines are read: its number of quote markers and its lines with their indices. */
  type Reading = { header: Header; level: number; depth: number; parent: number | undefined; start: number; lines: { index: number; text: string }[] };
  const answers: Reading[] = [{ header: definition, level: 0, depth: 0, parent: undefined, start: 0, lines: [] }];
  /** open are the indices of the answers whose block quotes are open, from the first answer. */
  const open = [0];
  let previousText = false;
  content.forEach((line, index) => {
    if (index === 0) {
      return;
    }
    const { depth: level, rest } = quoteDepth(line);
    const header = level > 0 ? readHeader(rest) : undefined;
    if (header) {
      while (answers[open.at(-1)!].level >= level) {
        open.pop();
      }
      const parent = open.at(-1)!;
      answers.push({ header, level, depth: answers[parent].depth + 1, parent, start: index, lines: [] });
      open.push(answers.length - 1);
      previousText = false;
      return;
    }
    const blank = rest.trim() === '';
    // A line with fewer quote markers ends the replies of more, unless it continues the paragraph of the line before.
    if (!(previousText && !blank)) {
      while (open.length > 1 && answers[open.at(-1)!].level > level) {
        open.pop();
      }
    }
    const owner = answers[open.at(-1)!];
    owner.lines.push({ index, text: quoteDepth(line, owner.level).rest });
    previousText = !blank;
  });
  return {
    label: definition.label,
    answers: answers.map(({ header, depth, parent, start, lines: own }): Answer => {
      const { body, last } = trimmedBody(own.map((line) => line.text));
      const end = last === undefined ? start + 1 : own.filter((line) => line.text.trim() !== '').at(-1)!.index + 1;
      return { author: header.author, date: header.date, body, depth, parent, start, end };
    }),
  };
}

/**
 * AnswerText is the header and the body of an answer that the extension writes, and its depth in the tree of the
 * thread: 0 for the first answer, and by default 1 for every other one.
 */
export type AnswerText = Header & { body: string; depth?: number };

/**
 * quotePrefix returns the quote markers of the lines of an answer of a depth.
 * @param depth - The depth.
 */
const quotePrefix = (depth: number): string => '> '.repeat(depth);

/**
 * noteLines returns the lines of the definition of a note, without the prefix of its block quotes and list items
 * ([R-NOTE-001](../../docs/requirements.md#r-note-001)): the label and the header of the first answer, a blank line
 * and its body indented by four spaces, and each reply as a block quote after the answer that it replies to, with a
 * line before it that is blank in the block quote around it, its header, a line `>`, and its body.
 * @param label - The label of the note.
 * @param answers - The answers in the order of the text, each answer before its replies; at least one.
 */
export function noteLines(label: string, answers: readonly AnswerText[]): string[] {
  const indented = (line: string): string => (line === '' ? '' : indent + line);
  return answers.flatMap((answer, index) => {
    const body = answer.body === '' ? [] : answer.body.split('\n');
    if (index === 0) {
      return [`${referenceText(label)}: ${headerText(answer)}`, ...(body.length > 0 ? ['', ...body.map(indented)] : [])];
    }
    const depth = Math.max(answer.depth ?? 1, 1);
    const prefix = quotePrefix(depth);
    return [
      indented(quotePrefix(depth - 1).trimEnd()),
      indented(`${prefix}${headerText(answer)}`),
      ...(body.length > 0 ? [indented(prefix.trimEnd()), ...body.map((line) => indented(line === '' ? prefix.trimEnd() : `${prefix}${line}`))] : []),
    ];
  });
}

/**
 * normalizeBody turns the text of the editor of an answer into the body of the answer: line breaks as `\n`, and no
 * blank lines and no white space before and after the text.
 * @param text - The text of the editor.
 */
export const normalizeBody = (text: string): string => trimmedBody(text.replace(/\r\n?/g, '\n').split('\n')).body;

/**
 * Timestamp is a date of a note in the forms of ISO 8601: `2026-10-28`, `2026-10-28 10:15`, `2026-10-28T10:15`, with
 * or without seconds, and with or without a zone such as `Z` or `+01:00`. A header holds the form
 * `2026-10-28 10:15+01:00`.
 */
const timestamp = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?(Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * parseDate returns the point in time of a date of a note, or undefined for a text of another form or an impossible
 * date. A date or a time without a zone is a local date or time.
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

/** pad writes a number with two digits. */
const pad = (value: number): string => String(value).padStart(2, '0');

/**
 * displayDate returns a date of a note as the extension shows it: a date and time with a zone in the local time of
 * the reader, as date and time with a space and without seconds, for example `2026-10-28 10:15`; a date and time
 * without a zone as written without seconds; and every other text as written.
 * @param value - The date as written.
 */
export function displayDate(value: string): string {
  const match = timestamp.exec(value.trim());
  if (!match || match[4] === undefined) {
    return value.trim();
  }
  const date = match[7] ? parseDate(value) : undefined;
  if (!date) {
    return `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}`;
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** headerDate matches the date of a header: the local date and time of the author and the offset of the zone. */
const headerDate = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2})(Z|[+-]\d{2}:\d{2})$/;

/**
 * authorDate returns the date of a header in the local time of its author, with the offset of the zone, for example
 * `2026-10-28 10:00 at the author (UTC−02:00)`, and every other text as written. The extension shows it next to the
 * date in the local time of the reader, for example as a tooltip
 * ([R-NOTE-002](../../docs/requirements.md#r-note-002)).
 * @param value - The date as written.
 */
export function authorDate(value: string): string {
  const match = headerDate.exec(value.trim());
  if (!match) {
    return value.trim();
  }
  const zone = match[2] === 'Z' ? 'UTC' : `UTC${match[2].replace('-', '\u2212')}`;
  return `${match[1]} at the author (${zone})`;
}

/**
 * formatDate writes a point in time as the date of a new answer: the local date and time in minutes with the offset
 * of the local zone, for example `2026-10-28 10:15+01:00`, or with `Z` in the zone of UTC.
 * @param date - The point in time.
 */
export function formatDate(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset < 0 ? '-' : '+';
  const zone = offset === 0 ? 'Z' : `${sign}${pad(Math.floor(Math.abs(offset) / 60))}:${pad(Math.abs(offset) % 60)}`;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}${zone}`;
}

/** noteOpenType and noteCloseType are the types of the markdown-it tokens around the definition of a note. */
export const noteOpenType = 'nimblescape_note_open';
export const noteCloseType = 'nimblescape_note_close';

/** referenceType is the type of the markdown-it token of the reference of a note. */
export const referenceType = 'nimblescape_note_reference';

/** markerType is the type of the markdown-it token of the start marker of the selection of a note. */
export const markerType = 'nimblescape_note_marker';

/** NoteMeta is the meta of the token that opens the definition of a note. */
export interface NoteMeta extends Definition {
  /** number is the number of the note in the document, from 1, by the order of the definitions. */
  number: number;
  /** duplicate tells whether an earlier note of the document has the same label, which the references name. */
  duplicate: boolean;
}

/**
 * InlineMeta is the meta of the token of a reference or a start marker: its label and its span in the text of its
 * inline token, and of a start marker the name of its color.
 */
export interface InlineMeta {
  label: string;
  start: number;
  end: number;
  color?: string;
}

/** Registry is what a parsing knows of the notes of its document: the meta of the first note of each label. */
interface Registry {
  notes: Map<string, NoteMeta>;
  count: number;
  /** depth is the number of definitions of notes that the block parser reads at the moment. */
  depth: number;
}

/** registries holds the registry of each parsing, by its environment. */
const registries = new WeakMap<object, Registry>();

/** noEnvironment stands for the environment of a parsing without one. */
const noEnvironment = {};

/**
 * registryOf returns the registry of the environment of a parsing.
 * @param env - The environment.
 */
function registryOf(env: unknown): Registry {
  const key = typeof env === 'object' && env !== null ? env : noEnvironment;
  let registry = registries.get(key);
  if (!registry) {
    registry = { notes: new Map(), count: 0, depth: 0 };
    registries.set(key, registry);
  }
  return registry;
}

/**
 * notesOfParsing returns the meta of the notes that a parsing found so far, by their labels.
 * @param env - The environment of the parsing.
 */
export const notesOfParsing = (env: unknown): ReadonlyMap<string, NoteMeta> => registryOf(env).notes;

/** allReferences is the field of the environment of a parsing that takes every reference of the form of a note, also without a note. */
export const allReferences = 'nimblescapeAllReferences';

/**
 * resetRule is the core rule that starts the registry of a parsing anew, because the preview can parse a document
 * with the same environment more than once.
 * @param state - The state of the core rule.
 */
function resetRule(state: { env: unknown }): void {
  const registry = registryOf(state.env);
  registry.notes.clear();
  registry.count = 0;
  registry.depth = 0;
}

/**
 * noteRule is the markdown-it block rule of the definition of a note. It reads the definition as markdown-it-footnote
 * reads a footnote: the text after the colon and the lines indented by four spaces are blocks of the note, also a
 * lazy line of a paragraph. Its tokens stand between a token of the type noteOpenType, whose meta is a NoteMeta and
 * whose lines are the lines of the definition without the blank lines after it, and a token of the type
 * noteCloseType. A definition whose label is not the label of a note, or whose first line is no header, stays for the
 * rule of footnotes.
 * @param state - The state of the block parser.
 * @param startLine - The index of the line where the rule starts.
 * @param endLine - The index of the line after the text.
 * @param silent - Whether the rule only tells whether it matches.
 */
export function noteRule(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  const start = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  if (state.sCount[startLine] - state.blkIndent >= 4 || state.src.charCodeAt(start) !== 0x5b) {
    return false;
  }
  const definition = readDefinition(state.src.slice(start, max));
  const registry = registryOf(state.env);
  // A note holds no note: a definition in a note stays for the rule of footnotes.
  if (!definition || registry.depth > 0) {
    return false;
  }
  if (silent) {
    return true;
  }
  const duplicate = registry.notes.has(definition.label);
  const meta: NoteMeta = { ...definition, number: ++registry.count, duplicate };
  if (!duplicate) {
    registry.notes.set(definition.label, meta);
  }
  const open = state.push(noteOpenType, 'div', 1);
  open.block = true;
  open.meta = meta;
  // The text after the colon starts the blocks of the note, as in markdown-it-footnote.
  let position = start + referenceText(definition.label).length + 1;
  const afterColon = position;
  const initial = state.sCount[startLine] + position - start;
  let offset = initial;
  while (position < max && (state.src[position] === ' ' || state.src[position] === '\t')) {
    offset += state.src[position] === '\t' ? 4 - (offset % 4) : 1;
    position++;
  }
  const saved = { bMark: state.bMarks[startLine], tShift: state.tShift[startLine], sCount: state.sCount[startLine], parentType: state.parentType };
  state.tShift[startLine] = position - afterColon;
  state.sCount[startLine] = offset - initial;
  state.bMarks[startLine] = afterColon;
  state.blkIndent += 4;
  state.parentType = 'footnote' as typeof state.parentType;
  if (state.sCount[startLine] < state.blkIndent) {
    state.sCount[startLine] += state.blkIndent;
  }
  registry.depth++;
  state.md.block.tokenize(state, startLine, endLine);
  registry.depth--;
  state.parentType = saved.parentType;
  state.blkIndent -= 4;
  state.tShift[startLine] = saved.tShift;
  state.sCount[startLine] = saved.sCount;
  state.bMarks[startLine] = saved.bMark;
  let last = Math.max(state.line, startLine + 1);
  while (last > startLine + 1 && state.isEmpty(last - 1)) {
    last--;
  }
  open.map = [startLine, last];
  const close = state.push(noteCloseType, 'div', -1);
  close.block = true;
  return true;
}

/** referencePattern matches the reference of a note at the start of a text. */
const referencePattern = /^\[\^(note-[a-z0-9]{4})\]/;

/**
 * referenceRule is the markdown-it inline rule of the reference of a note: `[^note-7k2q]` for a note of the document.
 * Every other reference stays for the rule of footnotes. Its token keeps the span of the reference in the text of the
 * inline token.
 * @param state - The state of the inline parser.
 * @param silent - Whether the rule only tells whether it matches.
 */
export function referenceRule(state: StateInline, silent: boolean): boolean {
  const start = state.pos;
  if (state.src.charCodeAt(start) !== 0x5b || state.src.charCodeAt(start + 1) !== 0x5e) {
    return false;
  }
  const match = referencePattern.exec(state.src.slice(start, state.posMax));
  const env = state.env as Record<string, unknown> | undefined;
  if (!match || (!notesOfParsing(state.env).has(match[1]) && env?.[allReferences] !== true)) {
    return false;
  }
  if (!silent) {
    const token = state.push(referenceType, '', 0);
    token.meta = { label: match[1], start, end: start + match[0].length } satisfies InlineMeta;
  }
  state.pos = start + match[0].length;
  return true;
}

/**
 * markerRule is the markdown-it inline rule of the start marker of a selection, `<wbr><!--[note-7k2q-->`, also
 * without `<wbr>`. It runs before the rule `html_inline` and takes only a start marker, with the conditions of
 * that rule: HTML is on, and no comment of the text before stayed open. Its token keeps the span of the marker in the
 * text of the inline token, and the name of its color.
 * @param state - The state of the inline parser.
 * @param silent - Whether the rule only tells whether it matches.
 */
export function markerRule(state: StateInline, silent: boolean): boolean {
  const start = state.pos;
  const skipped = (state as StateInline & { skipHtmlSpecial?: boolean }).skipHtmlSpecial;
  if (!state.md.options.html || skipped || state.src.charCodeAt(start) !== 0x3c) {
    return false;
  }
  const marker = readMarker(state.src.slice(start, state.posMax));
  if (!marker) {
    return false;
  }
  const end = start + marker.length;
  if (!silent) {
    const token = state.push(markerType, '', 0);
    token.content = state.src.slice(start, end);
    token.meta = { label: marker.label, start, end, color: marker.color } satisfies InlineMeta;
  }
  state.pos = end;
  return true;
}

/**
 * ruleNames returns the names of the rules of a ruler.
 * @param ruler - The ruler.
 */
const ruleNames = (ruler: unknown): string[] => ((ruler as { __rules__: { name: string }[] }).__rules__ ?? []).map((rule) => rule.name);

/**
 * addNoteRules adds the rules of the notes to a markdown-it instance. They run before the rules of footnotes of
 * markdown-it-footnote, the plugin of the extension "Markdown Footnotes", when the instance has them, and else before
 * the rules of link references and links, so that the rules of footnotes never see a note, also when that plugin
 * comes after this one: it adds its rules directly before or after these rules
 * ([R-GEN-007](../../docs/requirements.md#r-gen-007)).
 * @param md - The markdown-it instance.
 */
export function addNoteRules(md: MarkdownIt): void {
  md.core.ruler.after('normalize', 'nimblescape_notes_reset', resetRule);
  const block = ruleNames(md.block.ruler).includes('footnote_def') ? 'footnote_def' : 'reference';
  md.block.ruler.before(block, 'nimblescape_note', noteRule, { alt: ['paragraph', 'reference'] });
  const inline = ruleNames(md.inline.ruler).includes('footnote_ref') ? 'footnote_ref' : 'link';
  md.inline.ruler.before(inline, 'nimblescape_note_reference', referenceRule);
  md.inline.ruler.before('html_inline', 'nimblescape_note_marker', markerRule);
}
