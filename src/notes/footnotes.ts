// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The standard footnotes of a Markdown text, the footnotes that are no note
 * ([R-FOOT-001](../../docs/requirements.md#r-foot-001)), and the changes of
 * the text when the side view saves, deletes or adds one
 * ([R-FOOT-002](../../docs/requirements.md#r-foot-002),
 * [R-FOOT-003](../../docs/requirements.md#r-foot-003)), the forms that the
 * checks warn about ([R-FOOT-004](../../docs/requirements.md#r-foot-004)),
 * the new labels of "Renumber Footnotes"
 * ([R-FOOT-005](../../docs/requirements.md#r-foot-005)), and the note that
 * becomes a footnote ([R-FOOT-006](../../docs/requirements.md#r-foot-006)).
 * A footnote is its definition, `[^1]: ` and its text, and the references
 * `[^1]` in the text:
 *
 * ```markdown
 * The agents change the work[^1] of teams.
 *
 * [^1]: A source, with a second paragraph:
 *
 *     indented by four spaces.
 * ```
 *
 * The module reads the definitions line by line, as markdown-it-footnote of
 * the Markdown preview and GitHub read them: a definition goes on with each
 * indented line, also after blank lines, and with each line of text right
 * after a line of it. It finds the references in the text of the blocks of the
 * reading of [notes.ts](notes.ts), in the definitions and in the notes, and
 * never in code. GitHub numbers all footnotes of a page in the order of their
 * first reference, also the notes of the visible form; the Markdown preview
 * shows no note, so that it numbers only the standard footnotes. A change of a
 * standard footnote changes no note, so it writes no comment of the format
 * ([R-NOTE-007](../../docs/requirements.md#r-note-007)). The module uses no API
 * of VS Code.
 */

import { frontMatterEnd } from './doctype';
import { blockAt, type Edit, applyEdit, editBetween, referenceAllowed, withoutNote } from './edits';
import { before, type Note, type Position, type Range, type Reading, read, same } from './notes';
import { normalizeBody, usedLabels } from './syntax';

/** Footnote is a standard footnote of a text: its label, its definition, and its references. */
export interface Footnote {
  label: string;
  /** definition is the first and the last line of the definition; the first definition of a label counts. */
  definition: { first: number; last: number };
  /** indent is the spaces before the label on the first line of the definition. */
  indent: string;
  /** text is the text of the definition without its label and without the indentation of its further lines. */
  text: string;
  /** references are the references of the footnote in the order of the text. */
  references: Range[];
  /** github is the number that GitHub shows, and preview the number of the Markdown preview; undefined without a reference. */
  github?: number;
  preview?: number;
}

/** noteLabel matches the label of a note, whose footnote is no standard footnote. */
const noteLabel = /^note-[a-z0-9]{4}$/;

/** definitionHead matches the first line of a definition: up to three spaces, the label in brackets and a colon. */
const definitionHead = /^( {0,3})\[\^([^\]\s]+)\]:[ \t]?/;

/** referenceSearch matches the references of footnotes in a line. */
const referenceSearch = /\[\^([^\]\s]+)\]/g;

/** codeSearch matches the code spans of a line, in which a reference is text. */
const codeSearch = /(`+)[^]*?(?<!`)\1(?!`)/g;

/** fence matches the line that opens or closes a fenced code block, with its fence. */
const fence = /^ {0,3}(`{3,}|~{3,})/;

/** indented matches a line that is indented by four spaces or a tab, which continues a definition. */
const indented = /^(?: {4}|\t)/;

/**
 * blockStart matches a line that starts another block and so ends a definition: a heading, a list item, a block
 * quote, a fence, a thematic break or HTML.
 */
const blockStart = /^ {0,3}(?:#{1,6}(?:\s|$)|[-*+](?:\s|$)|\d{1,9}[.)](?:\s|$)|>|`{3,}|~{3,}|(?:[-*_] *){3,}$|<)/;

/** wordCharacter matches a letter, a digit or an underscore. */
const wordCharacter = /[\p{L}\p{N}_]/u;

/** Definition is a definition of a footnote or a note, as the lines of the text hold it. */
interface Definition {
  label: string;
  first: number;
  last: number;
  indent: string;
  lines: string[];
}

/**
 * definitionsOf returns the definitions of the footnotes and the notes of a text, outside the front matter, the fenced
 * code blocks and the comments of HTML.
 * @param lines - The lines of the text.
 */
function definitionsOf(lines: readonly string[]): Definition[] {
  const definitions: Definition[] = [];
  let open: string | undefined;
  let comment = false;
  let current: Definition | undefined;
  /** blanks are the blank lines after the last line of the current definition, which belong to it only before an indented line. */
  let blanks = 0;
  for (let line = frontMatterEnd(lines); line < lines.length; line++) {
    const text = lines[line];
    if (current && open === undefined && !comment) {
      if (text.trim() === '') {
        blanks++;
        continue;
      }
      if (indented.test(text) || (blanks === 0 && !blockStart.test(text) && !definitionHead.test(text))) {
        current.lines.push(...Array<string>(blanks).fill(''), indented.test(text) ? text.replace(indented, '') : text.trimStart());
        current.last = line;
        blanks = 0;
        continue;
      }
      current = undefined;
    }
    const mark = fence.exec(text)?.[1];
    if (!comment && mark && (open === undefined || (mark[0] === open[0] && mark.length >= open.length))) {
      open = open === undefined ? mark : undefined;
      continue;
    }
    if (open !== undefined) {
      continue;
    }
    if (comment) {
      comment = !text.includes('-->');
      continue;
    }
    if (/^ {0,3}<!--/.test(text) && !text.includes('-->', text.indexOf('<!--') + 4)) {
      comment = true;
      continue;
    }
    const head = definitionHead.exec(text);
    if (head) {
      current = { label: head[2], first: line, last: line, indent: head[1], lines: [text.slice(head[0].length).trimStart()] };
      blanks = 0;
      definitions.push(current);
    }
  }
  return definitions;
}

/**
 * referencesIn returns the references of a part of a line that are no code, without the label of a definition at the
 * start of the line.
 * @param lines - The lines of the text.
 * @param line - The index of the line.
 * @param from - The column where the part starts.
 * @param to - The column where the part ends.
 */
function referencesIn(lines: readonly string[], line: number, from: number, to: number): { label: string; range: Range }[] {
  const text = lines[line];
  const code = [...text.matchAll(codeSearch)].map((match) => [match.index, match.index + match[0].length]);
  const head = definitionHead.exec(text);
  const found: { label: string; range: Range }[] = [];
  for (const match of text.matchAll(referenceSearch)) {
    const start = match.index;
    const end = start + match[0].length;
    if (start < from || end > to || code.some(([a, b]) => a <= start && end <= b) || (head && start === head[1].length)) {
      continue;
    }
    found.push({ label: match[1], range: { start: { line, character: start }, end: { line, character: end } } });
  }
  return found;
}

/**
 * standardReferences returns the references of the standard footnotes of a text in the order of the text, also of a
 * label without a definition: in the text of the blocks, in the definitions and in the notes, and never in code.
 * @param lines - The lines of the text.
 * @param reading - The reading of the lines, with their blocks of text.
 * @param definitions - The definitions of the footnotes and the notes of the text.
 */
function standardReferences(lines: readonly string[], reading: Reading, definitions: readonly Definition[]): { label: string; range: Range }[] {
  const seen = new Set<string>();
  const references: { label: string; range: Range }[] = [];
  /** add adds the references of a part of a line, once for each place. */
  const add = (line: number, from: number, to: number): void => {
    for (const reference of referencesIn(lines, line, from, to)) {
      const key = `${line}:${reference.range.start.character}`;
      if (!seen.has(key) && !noteLabel.test(reference.label)) {
        seen.add(key);
        references.push(reference);
      }
    }
  };
  for (const block of reading.blocks) {
    for (const [line, start] of block.starts) {
      add(line, start.character, block.ends.get(line)?.character ?? lines[line].length);
    }
  }
  // The text of the definitions and of the notes holds references too: a footnote in a note is a footnote of the page.
  for (const definition of definitions) {
    for (let line = definition.first; line <= definition.last; line++) {
      add(line, 0, lines[line].length);
    }
  }
  for (const note of reading.notes) {
    for (let line = note.start.line; line <= note.end.line; line++) {
      add(line, 0, lines[line].length);
    }
  }
  references.sort((a, b) => (before(a.range.start, b.range.start) ? (same(a.range.start, b.range.start) ? 0 : -1) : 1));
  return references;
}

/**
 * readFootnotes returns the standard footnotes of a text that have a definition, in the order of their first
 * reference in the text, or of their definition without a reference ([R-FOOT-001](../../docs/requirements.md#r-foot-001)).
 * @param lines - The lines of the text.
 * @param reading - The reading of the lines, with their blocks of text.
 */
export function readFootnotes(lines: readonly string[], reading: Reading = read(lines)): Footnote[] {
  const definitions = definitionsOf(lines);
  const standard = new Map<string, Definition>();
  for (const definition of definitions) {
    if (!noteLabel.test(definition.label) && !standard.has(definition.label)) {
      standard.set(definition.label, definition);
    }
  }
  if (standard.size === 0) {
    return [];
  }
  const references = standardReferences(lines, reading, definitions);
  const footnotes = [...standard.values()].map(
    (definition): Footnote => ({
      label: definition.label,
      definition: { first: definition.first, last: definition.last },
      indent: definition.indent,
      text: definition.lines.join('\n'),
      references: references.filter((reference) => reference.label === definition.label).map((reference) => reference.range),
    }),
  );
  /** keyOf returns the place of a footnote in the order of the text: its first reference, else its definition. */
  const keyOf = (footnote: Footnote): Position => footnote.references[0]?.start ?? { line: footnote.definition.first, character: 0 };
  footnotes.sort((a, b) => (same(keyOf(a), keyOf(b)) ? 0 : before(keyOf(a), keyOf(b)) ? -1 : 1));
  // The numbers of GitHub count the notes of the visible form too, in the order of the first references.
  const firsts = [
    ...footnotes.filter((footnote) => footnote.references.length > 0).map((footnote) => ({ footnote, at: footnote.references[0].start })),
    ...reading.notes.filter((note) => note.reference && !note.duplicate).map((note) => ({ footnote: undefined, at: note.reference!.start })),
  ].sort((a, b) => (same(a.at, b.at) ? 0 : before(a.at, b.at) ? -1 : 1));
  firsts.forEach(({ footnote }, index) => {
    if (footnote) {
      footnote.github = index + 1;
    }
  });
  footnotes.filter((footnote) => footnote.references.length > 0).forEach((footnote, index) => (footnote.preview = index + 1));
  return footnotes;
}

/**
 * firstReferences returns the first reference of each standard footnote in the text of the blocks of a text, in the
 * order of the text, also when the text holds no definition: the clean editing view puts the definitions that it hides
 * after the blocks of these references when it writes a file anew
 * ([R-TEXT-009](../../docs/requirements.md#r-text-009)).
 * @param lines - The lines of the text.
 * @param reading - The reading of the lines, with their blocks of text.
 */
export function firstReferences(lines: readonly string[], reading: Reading = read(lines)): { label: string; start: Position }[] {
  const firsts = new Map<string, Position>();
  for (const block of reading.blocks) {
    for (const [line, start] of block.starts) {
      for (const reference of referencesIn(lines, line, start.character, block.ends.get(line)?.character ?? lines[line].length)) {
        const known = firsts.get(reference.label);
        if (!noteLabel.test(reference.label) && (!known || before(reference.range.start, known))) {
          firsts.set(reference.label, reference.range.start);
        }
      }
    }
  }
  return [...firsts]
    .map(([label, start]) => ({ label, start }))
    .sort((a, b) => (same(a.start, b.start) ? 0 : before(a.start, b.start) ? -1 : 1));
}

/**
 * referenceAt returns the footnote of the reference that holds a position, also in the highlight of a note, for example
 * a citation in the text that a note highlights.
 * @param footnotes - The footnotes of the text.
 * @param position - The position.
 */
export const referenceAt = (footnotes: readonly Footnote[], position: Position): Footnote | undefined =>
  footnotes.find((footnote) => footnote.references.some((range) => before(range.start, position) && before(position, range.end)));

/**
 * footnoteAt returns the footnote at a position: the footnote of the reference that holds it, or of the definition that
 * holds its line.
 * @param footnotes - The footnotes of the text.
 * @param position - The position.
 */
export function footnoteAt(footnotes: readonly Footnote[], position: Position): Footnote | undefined {
  return referenceAt(footnotes, position) ?? footnotes.find((footnote) => footnote.definition.first <= position.line && position.line <= footnote.definition.last);
}

/**
 * definitionText returns the lines of a definition: the label, a colon, a space and the first line of the text, and
 * each further line indented by four spaces, as Markdown needs it for a footnote of more than one paragraph. A blank
 * line stays empty.
 * @param label - The label of the footnote.
 * @param text - The text, already normalized.
 * @param indent - The spaces before the label.
 */
const definitionText = (label: string, text: string, indent = ''): string[] =>
  text.split('\n').map((line, index) => (index === 0 ? `${indent}[^${label}]: ${line}` : line === '' ? '' : `    ${line}`));

/**
 * normalizedText returns the text of a definition as the file holds it: without blank lines at its start and its end,
 * and with empty blank lines.
 * @param text - The text of the editor.
 */
export const normalizedText = (text: string): string =>
  normalizeBody(text)
    .split('\n')
    .map((line) => (line.trim() === '' ? '' : line))
    .join('\n');

/** FootnoteResult is the edits of a change of a footnote, or the problem that prevents it. */
export type FootnoteResult = { edits: Edit[] } | { problem: 'empty' | 'structure' | 'place' | 'exists' };

/**
 * readsBack tells whether the lines after a change hold the definition of a footnote with a text at a line.
 * @param lines - The lines after the change.
 * @param label - The label of the footnote.
 * @param line - The first line of its definition.
 * @param text - The expected text.
 */
const readsBack = (lines: readonly string[], label: string, line: number, text: string): boolean =>
  definitionsOf(lines).some((definition) => definition.label === label && definition.first === line && definition.lines.join('\n') === text);

/**
 * replaceFootnote returns the edit that writes a text into the definition of a footnote
 * ([R-FOOT-002](../../docs/requirements.md#r-foot-002)). It writes only a text that Markdown reads back as this
 * definition.
 * @param lines - The lines of the text.
 * @param footnote - The footnote.
 * @param text - The text of the editor.
 */
export function replaceFootnote(lines: readonly string[], footnote: Footnote, text: string): FootnoteResult {
  const normalized = normalizedText(text);
  if (normalized === '') {
    return { problem: 'empty' };
  }
  const { first, last } = footnote.definition;
  const edit: Edit = { start: { line: first, character: 0 }, end: { line: last, character: lines[last].length }, text: definitionText(footnote.label, normalized, footnote.indent).join('\n') };
  return readsBack(applyEdit(lines, edit), footnote.label, first, normalized) ? { edits: [edit] } : { problem: 'structure' };
}

/**
 * deleteFootnote returns the edits that remove a footnote: its definition with the blank lines after it, and every
 * reference to it, with the spaces before a reference that stands between spaces or before a punctuation mark.
 * @param lines - The lines of the text.
 * @param footnote - The footnote.
 */
export function deleteFootnote(lines: readonly string[], footnote: Footnote): Edit[] {
  const { first, last } = footnote.definition;
  let next = last + 1;
  while (next < lines.length && lines[next].trim() === '') {
    next++;
  }
  let definition: Edit;
  if (next < lines.length) {
    definition = { start: { line: first, character: 0 }, end: { line: next, character: 0 }, text: '' };
  } else {
    // The definition at the end of the text: the blank lines before it go, and the line break at the end stays.
    let previous = first - 1;
    while (previous >= 0 && lines[previous].trim() === '') {
      previous--;
    }
    definition = previous >= 0 ? { start: { line: previous, character: lines[previous].length }, end: { line: last, character: lines[last].length }, text: '' } : { start: { line: first, character: 0 }, end: { line: last, character: lines[last].length }, text: '' };
  }
  const references = footnote.references
    .filter((range) => range.start.line < first || range.start.line > last)
    .map((range): Edit => {
      const line = lines[range.start.line];
      const spaces = /[ \t]+$/.exec(line.slice(0, range.start.character))?.[0].length ?? 0;
      const after = line[range.end.character] ?? '';
      const loose = spaces > 0 && range.start.character > spaces && (after === '' || /[\s.,;:!?)\]]/.test(after));
      return { start: { line: range.start.line, character: range.start.character - (loose ? spaces : 0) }, end: range.end, text: '' };
    });
  return [...references, definition].sort((a, b) => (before(a.start, b.start) ? -1 : 1));
}

/**
 * nextFootnoteLabel returns the label of a new standard footnote ([R-FOOT-003](../../docs/requirements.md#r-foot-003)):
 * the next free number, one more than the highest label of the text that is a number, and never a label that the text
 * already uses.
 * @param lines - The lines of the Markdown text.
 */
export function nextFootnoteLabel(lines: readonly string[]): string {
  const used = usedLabels(lines);
  let number = Math.max(0, ...[...used].filter((label) => /^\d+$/.test(label)).map(Number)) + 1;
  while (used.has(String(number))) {
    number++;
  }
  return String(number);
}

/** NewDefinition is the text of the definition of a new footnote and its place. */
export interface NewDefinition {
  /** at is the position where the text goes, and text the text: the line breaks, the label, a colon, a space and the text. */
  at: Position;
  text: string;
  /** cursor is the position after the space of the definition, where its text starts. */
  cursor: Position;
}

/**
 * footnoteDefinition returns the definition of a new standard footnote and its place
 * ([R-FOOT-003](../../docs/requirements.md#r-foot-003)): after the last definition of a standard footnote, or at the end
 * of the text, with a blank line before it.
 * @param lines - The lines of the Markdown text.
 * @param label - The label of the footnote.
 * @param text - The text of the footnote, already normalized; empty for a definition that the user writes.
 */
export function footnoteDefinition(lines: readonly string[], label: string, text = ''): NewDefinition {
  const own = definitionText(label, text).join('\n');
  const start = `[^${label}]: `;
  let last = definitionsOf(lines).filter((definition) => !noteLabel.test(definition.label)).at(-1)?.last ?? -1;
  if (last < 0) {
    last = lines.length - 1;
    while (last >= 0 && lines[last].trim() === '') {
      last--;
    }
  }
  if (last < 0) {
    return { at: { line: 0, character: 0 }, text: own, cursor: { line: 0, character: start.length } };
  }
  // The line after the place is blank or the end of the text: a line right after a definition goes on with it.
  return { at: { line: last, character: lines[last].length }, text: `\n\n${own}`, cursor: { line: last + 2, character: start.length } };
}

/**
 * referencePlace returns the place of the reference of a new footnote for a position of the cursor: after the word when
 * the cursor stands in a word, and after the text before the spaces before the cursor; undefined where no reference
 * can stand ([R-FOOT-003](../../docs/requirements.md#r-foot-003)).
 * @param lines - The lines of the Markdown text.
 * @param position - The position of the cursor, or the end of the selected text.
 * @param reading - The reading of the lines, with their blocks of text.
 */
export function referencePlace(lines: readonly string[], position: Position, reading: Reading = read(lines)): Position | undefined {
  const line = lines[position.line];
  if (line === undefined) {
    return undefined;
  }
  let character = Math.min(position.character, line.length);
  if (character > 0 && wordCharacter.test(line[character - 1]) && wordCharacter.test(line[character] ?? '')) {
    while (character < line.length && wordCharacter.test(line[character])) {
      character++;
    }
  } else {
    const start = blockAt(reading.blocks, position)?.starts.get(position.line)?.character ?? 0;
    const spaces = /[ \t]*$/.exec(line.slice(start, character))![0].length;
    if (character - spaces > start) {
      character -= spaces;
    }
  }
  const place = { line: position.line, character };
  return referenceAllowed(lines, place, reading) ? place : undefined;
}

/**
 * placeText returns the text before the place of a reference on its line, shortened at its start to whole words, for
 * the title of the editor of a new footnote.
 * @param lines - The lines of the Markdown text.
 * @param place - The place of the reference.
 * @param length - The highest number of characters.
 */
export function placeText(lines: readonly string[], place: Position, length = 40): string {
  const text = lines[place.line].slice(0, place.character).replace(/\s+/g, ' ').trim();
  if (text.length <= length) {
    return text;
  }
  const tail = text.slice(text.length - length + 1);
  // A word that the cut splits goes, unless it is the only word.
  const whole = text[text.length - length] === ' ' ? tail : tail.replace(/^\S*\s+(?=\S)/, '');
  return `…${whole.trimStart()}`;
}

/**
 * insertFootnote returns the edits that add a standard footnote with a text at the cursor
 * ([R-FOOT-003](../../docs/requirements.md#r-foot-003)): its reference with the next free number, and its definition,
 * in one change.
 * @param lines - The lines of the Markdown text.
 * @param position - The position of the cursor, or the end of the selected text.
 * @param text - The text of the footnote.
 * @param reading - The reading of the lines, with their blocks of text.
 */
export function insertFootnote(lines: readonly string[], position: Position, text: string, reading: Reading = read(lines)): FootnoteResult & { label?: string } {
  const normalized = normalizedText(text);
  if (normalized === '') {
    return { problem: 'empty' };
  }
  const place = referencePlace(lines, position, reading);
  if (!place) {
    return { problem: 'place' };
  }
  const label = nextFootnoteLabel(lines);
  const definition = footnoteDefinition(lines, label, normalized);
  const reference = `[^${label}]`;
  const edits: Edit[] = same(place, definition.at)
    ? [{ start: place, end: place, text: reference + definition.text }]
    : [
        { start: place, end: place, text: reference },
        { start: definition.at, end: definition.at, text: definition.text },
      ].sort((a, b) => (before(a.start, b.start) ? -1 : 1));
  // The edits refer to the lines before the change; the later one goes first, and a reference adds no line.
  let changed = [...lines];
  for (const edit of [...edits].reverse()) {
    changed = applyEdit(changed, edit);
  }
  const first = definition.at.line + (definition.text.startsWith('\n\n') ? 2 : 0);
  return readsBack(changed, label, first, normalized) ? { edits, label } : { problem: 'structure' };
}

/** FootnoteProblems are the forms of the standard footnotes of a text that the checks warn about. */
export interface FootnoteProblems {
  /** undefinedReferences are the references whose label has no definition, which show as text. */
  undefinedReferences: { label: string; range: Range }[];
  /** unreferenced are the definitions that no reference outside of them names, which no viewer shows. */
  unreferenced: { label: string; line: number }[];
  /** duplicates are the definitions of a label that an earlier definition has; the references name the first one. */
  duplicates: { label: string; line: number }[];
}

/**
 * footnoteProblemsOf returns the forms of the standard footnotes of a text that the checks warn about
 * ([R-FOOT-004](../../docs/requirements.md#r-foot-004)): a reference without a definition, a definition without a
 * reference, and a second definition of a label. The notes have their own checks.
 * @param lines - The lines of the text.
 * @param reading - The reading of the lines, with their blocks of text.
 */
export function footnoteProblemsOf(lines: readonly string[], reading: Reading = read(lines)): FootnoteProblems {
  const definitions = definitionsOf(lines);
  const first = new Map<string, Definition>();
  const duplicates: FootnoteProblems['duplicates'] = [];
  for (const definition of definitions.filter((candidate) => !noteLabel.test(candidate.label))) {
    if (first.has(definition.label)) {
      duplicates.push({ label: definition.label, line: definition.first });
    } else {
      first.set(definition.label, definition);
    }
  }
  const references = standardReferences(lines, reading, definitions);
  // A reference in the definition of its own footnote does not show the footnote.
  const unreferenced = [...first.values()]
    .filter((definition) => !references.some((reference) => reference.label === definition.label && (reference.range.start.line < definition.first || reference.range.start.line > definition.last)))
    .map((definition) => ({ label: definition.label, line: definition.first }));
  return { undefinedReferences: references.filter((reference) => !first.has(reference.label)), unreferenced, duplicates };
}

/**
 * addDefinition returns the edit that adds the definition of a footnote whose references have none, for the quick fix
 * "Add Definition" ([R-FOOT-004](../../docs/requirements.md#r-foot-004)): at the place of the definition of a new
 * footnote ([R-FOOT-003](../../docs/requirements.md#r-foot-003)). It writes only a text that Markdown reads back as
 * this definition, and nothing for a label that has a definition.
 * @param lines - The lines of the Markdown text.
 * @param label - The label of the footnote.
 * @param text - The text of the editor.
 */
export function addDefinition(lines: readonly string[], label: string, text: string): FootnoteResult {
  const normalized = normalizedText(text);
  if (normalized === '') {
    return { problem: 'empty' };
  }
  if (definitionsOf(lines).some((definition) => definition.label === label)) {
    return { problem: 'exists' };
  }
  const definition = footnoteDefinition(lines, label, normalized);
  const edit: Edit = { start: definition.at, end: definition.at, text: definition.text };
  const first = definition.at.line + (definition.text.startsWith('\n\n') ? 2 : 0);
  return readsBack(applyEdit(lines, edit), label, first, normalized) ? { edits: [edit] } : { problem: 'structure' };
}

/** MakeResult is the edit of "Make Footnote" with the label of the new footnote, or the problem that prevents it. */
export type MakeResult = { edit: Edit; label: string } | { problem: 'reference' | 'empty' | 'structure' };

/**
 * makeFootnote returns the edit of "Make Footnote" ([R-FOOT-006](../../docs/requirements.md#r-foot-006)): the note
 * becomes a standard footnote with the next free number as its label. The reference of the note at the end of its
 * highlight becomes the reference of the footnote, and the text of the first answer the text of its definition, at the
 * place of the definition of a new footnote ([R-FOOT-003](../../docs/requirements.md#r-foot-003)). The start marker and
 * the definition of the note with its replies go, as with "Delete Thread". It writes only a text that Markdown reads
 * back as this footnote with one reference, and without the note.
 * @param lines - The lines of the Markdown text.
 * @param note - The note.
 */
export function makeFootnote(lines: readonly string[], note: Note): MakeResult {
  if (!note.reference) {
    return { problem: 'reference' };
  }
  const text = normalizedText(note.answers[0]?.body ?? '');
  if (text === '') {
    return { problem: 'empty' };
  }
  const label = nextFootnoteLabel(lines);
  const next = withoutNote(lines, note, `[^${label}]`);
  const definition = footnoteDefinition(next, label, text);
  const changed = applyEdit(next, { start: definition.at, end: definition.at, text: definition.text });
  const first = definition.at.line + (definition.text.startsWith('\n\n') ? 2 : 0);
  const reading = read(changed);
  const references = readFootnotes(changed, reading).find((footnote) => footnote.label === label)?.references.length;
  const made = readsBack(changed, label, first, text) && references === 1 && !reading.notes.some((candidate) => candidate.label === note.label);
  return made ? { edit: editBetween(lines, changed), label } : { problem: 'structure' };
}

/** RenumberResult is the edits of "Renumber Footnotes", or why it changes nothing. */
export type RenumberResult = { edits: Edit[] } | { problem: 'numbered' } | { problem: 'undefined' | 'duplicate'; label: string; line: number };

/** numberLabel matches a label that is a number. */
const numberLabel = /^\d+$/;

/**
 * renumberFootnotes returns the edits of "Renumber Footnotes" ([R-FOOT-005](../../docs/requirements.md#r-foot-005)):
 * the standard footnotes whose labels are numbers get the labels 1, 2, 3 … in the order of their first reference, and
 * then the footnotes of such labels without a reference in the order of their definitions, in the references and the
 * definitions. A label that is a word stays, and so do the labels of the notes. A reference of a number without a
 * definition, or a second definition of a number, would take the new label of another footnote or leave unclear which
 * footnote gets it, so the function then changes nothing and names it.
 * @param lines - The lines of the Markdown text.
 * @param reading - The reading of the lines, with their blocks of text.
 */
export function renumberFootnotes(lines: readonly string[], reading: Reading = read(lines)): RenumberResult {
  const problems = footnoteProblemsOf(lines, reading);
  const duplicate = problems.duplicates.find((candidate) => numberLabel.test(candidate.label));
  if (duplicate) {
    return { problem: 'duplicate', label: duplicate.label, line: duplicate.line };
  }
  const missing = problems.undefinedReferences.find((candidate) => numberLabel.test(candidate.label));
  if (missing) {
    return { problem: 'undefined', label: missing.label, line: missing.range.start.line };
  }
  const numbered = readFootnotes(lines, reading).filter((footnote) => numberLabel.test(footnote.label));
  const ordered = [
    ...numbered.filter((footnote) => footnote.references.length > 0),
    ...numbered.filter((footnote) => footnote.references.length === 0).sort((a, b) => a.definition.first - b.definition.first),
  ];
  const edits: Edit[] = [];
  ordered.forEach((footnote, index) => {
    const label = String(index + 1);
    if (label === footnote.label) {
      return;
    }
    for (const range of footnote.references) {
      edits.push({ start: { line: range.start.line, character: range.start.character + 2 }, end: { line: range.end.line, character: range.end.character - 1 }, text: label });
    }
    const at = footnote.indent.length + 2;
    edits.push({ start: { line: footnote.definition.first, character: at }, end: { line: footnote.definition.first, character: at + footnote.label.length }, text: label });
  });
  return edits.length === 0 ? { problem: 'numbered' } : { edits: edits.sort((a, b) => (same(a.start, b.start) ? 0 : before(a.start, b.start) ? -1 : 1)) };
}
