// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the listings of a Markdown text (R-CODE-001, R-CODE-002): the code blocks with the comment of their
 * source before them, the symbols that the module finds in the source code of several languages, and the current code
 * that the formatter writes into each listing.
 */

import { describe, expect, test } from 'vitest';
import { formatMarkdown, keptCurrent } from '../format/format';
import { anchorName, findItems, numberLinks } from './figures';
import { codeOf, findListings, isSnippetName, languageOf, listingBlock, missingListings, refreshListings, snippetLines, snippetsOf, type Source, sourceFiles, symbolLines } from './listings';

/** typescript is a file of TypeScript with a function, a class with a method, an interface and a constant. */
const typescript = [
  '// A comment that names readFields();',
  "import { parse } from './notes';",
  '',
  '/** readFields reads the fields. */',
  'export function readFields(lines: readonly string[]): Map<string, string> {',
  '  const values = new Map<string, string>();',
  "  const text = '}';",
  '  if (lines.length > 0) {',
  '    values.set(`a`, "{");',
  '  }',
  '  return values;',
  '}',
  '',
  'export class NotesView {',
  '  private readonly items: string[] = [];',
  '',
  '  @logged()',
  '  async addFromText(text: string): Promise<void> {',
  '    readFields([text]);',
  '    this.items.push(text);',
  '  }',
  '}',
  '',
  'export interface Field {',
  '  key: string;',
  '}',
  '',
  'export const usage = [',
  "  'one',",
  '];',
  '',
  'export const double = (value: number): number => value * 2;',
].join('\n');

/** python is a file of Python with a decorated function and a class with a method. */
const python = ['import os', '', '@cache', 'def read(path):', '    """Read a file."""', '    with open(path) as file:', '', '        return file.read()', '', 'class Reader:', '    def read(self, path):', '        return path', '', 'print(read("a"))'].join('\n');

/** others are files of Java, Go and Rust with a method or a function each. */
const java = ['public class Grades {', '  @Override', '  public int average(int[] grades) throws Exception {', '    return grades.length;', '  }', '}'].join('\n');
const go = ['package main', '', 'func Average(grades []int) int {', '\treturn len(grades)', '}', '', 'func main() {', '\tAverage(nil)', '}'].join('\n');
const rust = ['#[inline]', 'pub fn average(grades: &[i32]) -> i32 {', '    grades.len() as i32', '}'].join('\n');

describe('the symbols of a source', () => {
  test('are found by their declarations and end with their braces, also with braces in strings, comments and decorators (R-CODE-001)', () => {
    const lines = typescript.split('\n');
    expect(symbolLines(lines, 'readFields')).toEqual({ first: 4, last: 11 });
    expect(symbolLines(lines, 'NotesView')).toEqual({ first: 13, last: 21 });
    expect(symbolLines(lines, 'NotesView.addFromText')).toEqual({ first: 16, last: 20 });
    expect(symbolLines(lines, 'Field')).toEqual({ first: 23, last: 25 });
    expect(symbolLines(lines, 'usage')).toEqual({ first: 27, last: 29 });
    expect(symbolLines(lines, 'double')).toEqual({ first: 31, last: 31 });
    expect(symbolLines(lines, 'missing')).toBeUndefined();
    expect(symbolLines(lines, 'NotesView.missing')).toBeUndefined();
    expect(codeOf(typescript, 'NotesView.addFromText')).toEqual(['@logged()', 'async addFromText(text: string): Promise<void> {', '  readFields([text]);', '  this.items.push(text);', '}']);
  });

  test('of Python end with their indentation, and those of Java, Go and Rust with their braces (R-CODE-001)', () => {
    expect(codeOf(python, 'read')).toEqual(['@cache', 'def read(path):', '    """Read a file."""', '    with open(path) as file:', '', '        return file.read()']);
    expect(codeOf(python, 'Reader.read')).toEqual(['def read(self, path):', '    return path']);
    expect(codeOf(java, 'Grades.average')).toEqual(['@Override', 'public int average(int[] grades) throws Exception {', '  return grades.length;', '}']);
    expect(codeOf(go, 'Average')).toEqual(['func Average(grades []int) int {', '\treturn len(grades)', '}']);
    expect(codeOf(rust, 'average')).toEqual(rust.split('\n'));
  });

  test('give the whole file without a symbol, without its blank lines at the start and the end (R-CODE-001)', () => {
    expect(codeOf('﻿\n\nline 1\r\n\r\nline 2\n\n')).toEqual(['line 1', '', 'line 2']);
  });
});

describe('the snippets of a source', () => {
  /** marked is a file with a snippet in a function, a snippet of the same name as a function, and a mark without an end. */
  const marked = [
    'export function parse(lines: string[]): string[] {',
    '  const kept: string[] = [];',
    '  // markdownnotes: snippet keep-lines',
    '  for (const line of lines) {',
    '    kept.push(line);',
    '  }',
    '  // markdownnotes: /snippet keep-lines',
    '  return kept;',
    '}',
    '',
    '# markdownnotes: snippet parse',
    'other = 1',
    '# markdownnotes: /snippet parse',
    '/* markdownnotes: snippet open-only */',
  ].join('\n');

  test('are the lines between their marks in any form of a comment, and win over a symbol of the same name (R-CODE-003)', () => {
    expect(snippetsOf(marked.split('\n'))).toEqual([
      { name: 'keep-lines', first: 3, last: 5 },
      { name: 'parse', first: 11, last: 11 },
    ]);
    expect(codeOf(marked, 'keep-lines')).toEqual(['for (const line of lines) {', '  kept.push(line);', '}']);
    expect(codeOf(marked, 'parse')).toEqual(['other = 1']);
    expect(codeOf(marked, 'open-only')).toBeUndefined();
  });

  test('leave their marks out of the code of a symbol and of a whole file (R-CODE-003)', () => {
    expect(symbolLines(marked.split('\n'), 'parse')).toEqual({ first: 0, last: 8 });
    expect(codeOf(marked)).not.toContain('  // markdownnotes: snippet keep-lines');
    expect(codeOf(marked)!.filter((line) => line.includes('markdownnotes:'))).toEqual([]);
  });

  test('get marks in the comment form of the language of their file (R-CODE-003)', () => {
    expect(snippetLines('src/a.ts', 'keep-lines', '  ')).toEqual(['  // markdownnotes: snippet keep-lines', '  // markdownnotes: /snippet keep-lines']);
    expect(snippetLines('a.py', 'x')).toEqual(['# markdownnotes: snippet x', '# markdownnotes: /snippet x']);
    expect(snippetLines('a.html', 'x')).toEqual(['<!-- markdownnotes: snippet x -->', '<!-- markdownnotes: /snippet x -->']);
    expect(snippetLines('a.css', 'x')).toEqual(['/* markdownnotes: snippet x */', '/* markdownnotes: /snippet x */']);
    expect(snippetLines('a.json', 'x')).toBeUndefined();
    expect([isSnippetName('parse-notes'), isSnippetName('Parse'), isSnippetName('a--b'), isSnippetName('')]).toEqual([true, false, false, false]);
  });
});

/** paper is a Markdown text with a listing of a symbol, a listing of a file, and a listing in a note. */
const paper = [
  'Listing: Reading the fields<a id="lst-reading-fields"></a>',
  '',
  '<!-- listing: ../src/fields.ts#readFields -->',
  '',
  '```typescript {.numbered}',
  'old code',
  '```',
  '',
  'See [Listing 3](#lst-reading-fields).',
  '',
  '<!-- listing: ../src/read%20me.py -->',
  '~~~',
  'old',
  '~~~',
  '',
  '<!-- listing: ../src/gone.ts -->',
  '',
  '```',
  'kept',
  '```',
  '',
  '<!-- no listing -->',
  '',
  '```',
  'code',
  '```',
  '',
];

/** source reads the files of the paper. */
const source: Source = (path) => ({ '../src/fields.ts': typescript, '../src/read%20me.py': python })[path];

describe('the listings of a text', () => {
  test('are the comments of a source with a fenced code block after them (R-CODE-001)', () => {
    expect(findListings(paper)).toEqual([
      { line: 2, path: '../src/fields.ts', symbol: 'readFields', open: 4, close: 6 },
      { line: 10, path: '../src/read%20me.py', open: 11, close: 13 },
      { line: 15, path: '../src/gone.ts', open: 17, close: 19 },
    ]);
    expect(missingListings(paper, source).map((listing) => listing.path)).toEqual(['../src/gone.ts']);
    expect(findListings(['<!-- listing: a.ts -->', '', 'Text.', ''])).toEqual([]);
  });

  test('get the current code of their source from the formatter, with a longer fence for code with a fence (R-CODE-002)', () => {
    const refreshed = refreshListings(paper, source);
    expect(refreshed.slice(4, 14)).toEqual(['```typescript {.numbered}', ...codeOf(typescript, 'readFields')!, '```']);
    expect(refreshed.slice(14, 34)).toEqual(['', 'See [Listing 3](#lst-reading-fields).', '', '<!-- listing: ../src/read%20me.py -->', '~~~', ...python.split('\n'), '~~~']);
    expect(refreshed.slice(34)).toEqual(paper.slice(14));
    expect(refreshListings(refreshed, source)).toEqual(refreshed);
    const fenced: Source = () => 'Text\n````\ncode\n````\n';
    expect(refreshListings(['<!-- listing: a.md -->', '```', '```', ''], fenced)).toEqual(['<!-- listing: a.md -->', '`````', 'Text', '````', 'code', '````', '`````', '']);
  });

  test('are formatted with the source, numbered by /ref and kept current on save (R-CODE-002, R-XREF-002, R-FMT-001)', () => {
    const formatted = formatMarkdown(paper, { source });
    expect(formatted.join('\n')).toContain('See [Listing 1](#lst-reading-fields).');
    expect(formatted.slice(5, 13)).toEqual(codeOf(typescript, 'readFields'));
    expect(formatMarkdown(paper).slice(5, 6)).toEqual(['old code']);
    expect(keptCurrent(paper)).toBe(true);
    expect(keptCurrent(['Text.', '', '```', 'code', '```', ''])).toBe(false);
    const items = findItems(paper);
    expect(items.map(({ kind, caption, line }) => [kind, caption, line])).toEqual([['listing', 'Reading the fields', 0]]);
    const plain = findItems(['Listing: Reading the fields', '', '```', 'x', '```', '']);
    expect(anchorName(plain[0], plain)).toBe('lst-reading-fields');
    expect(numberLinks(paper)[8]).toBe('See [Listing 1](#lst-reading-fields).');
  });

  test('are written by /listing with their caption line, their comment and the language of their file (R-CODE-001)', () => {
    expect(listingBlock('Reading', '../src/fields.ts', 'readFields', ['```', 'x'])).toEqual(['Listing: Reading', '', '<!-- listing: ../src/fields.ts#readFields -->', '', '````typescript', '```', 'x', '````']);
    expect(languageOf('a/b.PY')).toBe('python');
    expect(languageOf('Makefile')).toBe('');
    expect(sourceFiles).toMatch(/^\*\*\/\*\.\{c,.*ts,.*\}$/);
    expect(sourceFiles).not.toContain(',md,');
  });
});
