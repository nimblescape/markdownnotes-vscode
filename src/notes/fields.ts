// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The values of the front matter of a Markdown text in its text
 * ([R-XREF-004](../../docs/requirements.md#r-xref-004)).
 *
 * A field is the value of a key of the front matter between two hidden
 * markers, for example `<wbr><!--{title}-->A paper<!--{/title}-->`. GitHub and
 * the Markdown preview show only the value, the clean editing view hides the
 * markers, and the formatter writes the current value of the key between them.
 * The start marker has `<wbr>` before it, as the start marker of a note: a
 * line that starts with a comment of HTML is a block of HTML, which GitHub
 * shows without the Markdown of the paragraph.
 * The module reads the simple forms of YAML and TOML that a front matter of a
 * paper uses: a key with a value, keys under a key, and lists. It uses no API
 * of VS Code.
 */

import { frontMatterEnd } from './doctype';
import { readFootnotes } from './footnotes';
import { codeLines } from './figures';
import { parse, readNotes } from './notes';

/** Field is a field of a line: its key, the columns of its markers, and its value. */
export interface Field {
  key: string;
  line: number;
  /** start and end are the columns of the start marker and the end marker, from the start of the start marker to the end of the end marker. */
  start: number;
  end: number;
  /** valueStart and valueEnd are the columns of the value between the markers. */
  valueStart: number;
  valueEnd: number;
}

/** keyPattern is the source of the pattern of a key: letters, digits, `_` and `-`, with `.` between the keys of a path. */
const keyPattern = String.raw`[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)*`;

/**
 * fieldSearch matches a field of a line: the start marker with or without `<wbr>`, the value without a marker, and
 * the end marker of the same key.
 */
const fieldSearch = new RegExp(String.raw`(?:<wbr>)?<!--\{(${keyPattern})\}-->((?:(?!<!--\{).)*?)<!--\{/\1\}-->`, 'g');

/** hasField tells quickly whether a text can hold a field. */
export const hasField = (text: string): boolean => text.includes('<!--{');

/** fieldMarkers returns the start marker, with `<wbr>`, and the end marker of a key. */
export const fieldMarkers = (key: string): [string, string] => [`<wbr><!--{${key}}-->`, `<!--{/${key}}-->`];

/**
 * unquote returns a scalar of YAML or TOML without its quotes and without a comment after it.
 * @param text - The text of the scalar.
 */
function unquote(text: string): string {
  const value = text.trim();
  const quoted = /^"((?:[^"\\]|\\.)*)"|^'((?:[^']|'')*)'/.exec(value);
  if (quoted) {
    return quoted[1] !== undefined ? quoted[1].replace(/\\(.)/g, '$1') : quoted[2].replace(/''/g, "'");
  }
  return value.replace(/\s+#.*$/, '').trim();
}

/**
 * scalarOf returns the value of a key as a text: a scalar, or the items of a flow list `[a, b]` joined by commas.
 * @param text - The text after the key.
 */
function scalarOf(text: string): string {
  const value = text.trim();
  const flow = /^\[(.*)\]$/.exec(value.replace(/\s+#.*$/, ''));
  return flow ? flow[1].split(',').map(unquote).filter((item) => item !== '').join(', ') : unquote(value);
}

/**
 * readFields returns the values of the keys of the front matter of a text, by their paths, for example `author.name`
 * for the key `name` under the key `author`. A list is its items, joined by commas; a block scalar (`|` or `>`) is its
 * lines, joined by spaces. A text without a front matter has no values.
 * @param lines - The lines of the text.
 */
export function readFields(lines: readonly string[]): Map<string, string> {
  const end = frontMatterEnd(lines);
  const values = new Map<string, string>();
  if (end === 0) {
    return values;
  }
  const body = lines.slice(1, end - 1);
  if (lines[0].trimEnd() === '+++') {
    // TOML: `key = value`, and tables `[author]` for the keys under a key.
    let table = '';
    for (const line of body) {
      const header = /^\s*\[([^\]]+)\]\s*$/.exec(line);
      const pair = /^\s*([A-Za-z0-9_-]+)\s*=\s*(.*)$/.exec(line);
      if (header) {
        table = `${header[1].trim()}.`;
      } else if (pair) {
        values.set(`${table}${pair[1]}`, scalarOf(pair[2]));
      }
    }
    return values;
  }
  // YAML: the keys of each indentation, the items of a list, and the lines of a block scalar.
  const path: { indent: number; key: string }[] = [];
  let open: { key: string; indent: number; items: string[]; block: boolean } | undefined;
  const close = () => {
    if (open && open.items.length > 0) {
      values.set(open.key, open.items.join(open.block ? ' ' : ', '));
    }
    open = undefined;
  };
  for (const line of body) {
    if (line.trim() === '' || line.trim().startsWith('#')) {
      continue;
    }
    const indent = line.length - line.trimStart().length;
    if (open && indent > open.indent) {
      const item = /^\s*-\s+(.*)$/.exec(line);
      if (open.block || item) {
        open.items.push(open.block ? line.trim() : unquote(item![1]));
        continue;
      }
    }
    const item = open && /^\s*-\s+(.*)$/.exec(line);
    if (open && item && indent === open.indent) {
      // A list of YAML can stand at the indentation of its key.
      open.items.push(unquote(item[1]));
      continue;
    }
    close();
    const pair = /^(\s*)([A-Za-z0-9_-]+|"[^"]*"|'[^']*')\s*:(?:\s+(.*))?$/.exec(line);
    if (!pair) {
      continue;
    }
    while (path.length > 0 && path.at(-1)!.indent >= indent) {
      path.pop();
    }
    const key = [...path.map((part) => part.key), unquote(pair[2])].join('.');
    const rest = (pair[3] ?? '').trim();
    if (rest === '' || /^[|>][+-]?$/.test(rest)) {
      path.push({ indent, key: unquote(pair[2]) });
      open = { key, indent, items: [], block: rest !== '' };
    } else {
      values.set(key, scalarOf(rest));
    }
  }
  close();
  return values;
}

/**
 * skippedLines returns the indexes of the lines that hold no field: the front matter, the code blocks, the blocks of
 * HTML, and the definitions of the notes and the footnotes.
 * @param lines - The lines of the text.
 */
function skippedLines(lines: readonly string[]): Set<number> {
  const skipped = codeLines(lines);
  const skip = (first: number, last: number) => {
    for (let line = first; line <= last; line++) {
      skipped.add(line);
    }
  };
  skip(0, frontMatterEnd(lines) - 1);
  readNotes(lines).notes.forEach((note) => skip(note.start.line, note.end.line));
  readFootnotes(lines).forEach(({ definition }) => skip(definition.first, definition.last));
  return skipped;
}

/**
 * codeSpansOf returns the column ranges of the code spans of a line.
 * @param line - The line.
 */
function codeSpansOf(line: string): [number, number][] {
  return [...line.matchAll(/(`+)[^]*?\1/g)].map((match) => [match.index, match.index + match[0].length]);
}

/**
 * findFields returns the fields of a text, outside the front matter, the code blocks, the code spans, the blocks of HTML
 * and the definitions of the notes and the footnotes.
 * @param lines - The lines of the text.
 */
export function findFields(lines: readonly string[]): Field[] {
  if (!lines.some(hasField)) {
    return [];
  }
  const skipped = skippedLines(lines);
  return lines.flatMap((line, index) => {
    if (skipped.has(index) || !hasField(line)) {
      return [];
    }
    const spans = codeSpansOf(line);
    return [...line.matchAll(fieldSearch)]
      .filter((match) => !spans.some(([start, end]) => start <= match.index && match.index < end))
      .map((match) => {
        const valueStart = match.index + match[0].length - match[2].length - `<!--{/${match[1]}}-->`.length;
        return { key: match[1], line: index, start: match.index, end: match.index + match[0].length, valueStart, valueEnd: valueStart + match[2].length };
      });
  });
}

/**
 * repairFields returns the lines of a text with `<wbr>` before each start marker of a field that has none, outside the
 * front matter, the code blocks and the code spans. A field at the start of a line without it makes its paragraph a
 * block of HTML, in which no field counts.
 * @param lines - The lines of the text.
 */
function repairFields(lines: readonly string[]): string[] {
  if (!lines.some(hasField)) {
    return [...lines];
  }
  const code = new Set<number>();
  for (const token of parse(lines)) {
    if ((token.type === 'fence' || token.type === 'code_block' || token.type === 'front_matter') && token.map) {
      for (let line = token.map[0]; line < token.map[1]; line++) {
        code.add(line);
      }
    }
  }
  return lines.map((line, index) => {
    if (code.has(index) || !hasField(line)) {
      return line;
    }
    const spans = codeSpansOf(line);
    return line.replace(new RegExp(String.raw`(<wbr>)?(<!--\{(${keyPattern})\}-->)(?=(?:(?!<!--\{).)*?<!--\{/\3\}-->)`, 'g'), (whole: string, wbr: string | undefined, marker: string, _key: string, offset: number) =>
      wbr || spans.some(([start, end]) => start <= offset && offset < end) ? whole : `<wbr>${marker}`,
    );
  });
}

/**
 * fillFields returns the lines of a text with the current value of the front matter in each field
 * ([R-XREF-004](../../docs/requirements.md#r-xref-004)), and `<wbr>` before each start marker. A field of a key that
 * the front matter does not have keeps its text.
 * @param lines - The lines of the text.
 */
export function fillFields(lines: readonly string[]): string[] {
  const repaired = repairFields(lines);
  const fields = findFields(repaired);
  if (fields.length === 0) {
    return repaired;
  }
  const values = readFields(repaired);
  const output = [...repaired];
  // From the end of each line, so that the columns of the fields before stay.
  for (const field of [...fields].reverse()) {
    const value = values.get(field.key);
    if (value !== undefined) {
      const line = output[field.line];
      output[field.line] = line.slice(0, field.valueStart) + value + line.slice(field.valueEnd);
    }
  }
  return output;
}
