// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the listings of a Markdown text (R-CODE-001, R-CODE-002): the code blocks with the comment of their
 * source before them, the whole files and the snippets of the source code that they name, and the current code that the
 * formatter writes into each listing. A listing names no symbol of a language, such as a function (R-CODE-005).
 */

import { describe, expect, test } from 'vitest';
import { formatMarkdown, keptCurrent } from '../format/format';
import { anchorName, findItems, numberLinks } from './figures';
import { codeOf, fileTypeOf, findListings, isSnippetName, languageOf, listingBlock, missingListings, refreshListings, snippetLines, snippetsOf, type Source, sourceFiles } from './listings';

/** typescript is a file of TypeScript with a function in a snippet, a class with a method, an interface and a constant. */
const typescript = [
  '// A comment that names readFields();',
  "import { parse } from './notes';",
  '',
  '/** readFields reads the fields. */',
  '// markdownnotes: snippet read-fields',
  'export function readFields(lines: readonly string[]): Map<string, string> {',
  '  const values = new Map<string, string>();',
  "  const text = '}';",
  '  if (lines.length > 0) {',
  '    values.set(`a`, "{");',
  '  }',
  '  return values;',
  '}',
  '// markdownnotes: /snippet read-fields',
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

describe('the code of a listing', () => {
  test('is a whole file or a snippet, and never a symbol of the language, such as a function or a method (R-CODE-001, R-CODE-005)', () => {
    expect(codeOf(typescript, 'read-fields')).toEqual(typescript.split('\n').slice(5, 13));
    expect(codeOf(typescript, 'readFields')).toBeUndefined();
    expect(codeOf(typescript, 'NotesView.addFromText')).toBeUndefined();
    expect(codeOf(python, 'read')).toBeUndefined();
    expect(missingListings(['<!-- listing: a.ts#NotesView.addFromText -->', '```', '```', ''], () => typescript)).toHaveLength(1);
  });

  test('of a whole file has no blank lines at the start and the end (R-CODE-001)', () => {
    expect(codeOf('\ufeff\n\nline 1\r\n\r\nline 2\n\n')).toEqual(['line 1', '', 'line 2']);
  });
});

describe('the snippets of a source', () => {
  /** marked is a file with a snippet in a function, a snippet of the name of a function, and a mark without an end. */
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

  test('are the lines between their marks in any form of a comment, also with the name of a function (R-CODE-003)', () => {
    expect(snippetsOf(marked.split('\n'))).toEqual([
      { name: 'keep-lines', first: 3, last: 5 },
      { name: 'parse', first: 11, last: 11 },
    ]);
    expect(codeOf(marked, 'keep-lines')).toEqual(['for (const line of lines) {', '  kept.push(line);', '}']);
    expect(codeOf(marked, 'parse')).toEqual(['other = 1']);
    expect(codeOf(marked, 'open-only')).toBeUndefined();
  });

  test('leave their marks out of the code of a whole file (R-CODE-003)', () => {
    expect(codeOf(marked)).not.toContain('  // markdownnotes: snippet keep-lines');
    expect(codeOf(marked)!.filter((line) => line.includes('markdownnotes:'))).toEqual([]);
  });

  test('get marks in the comment form of the language of their file (R-CODE-003)', () => {
    expect(snippetLines('src/a.ts', 'keep-lines', '  ')).toEqual(['  // markdownnotes: snippet keep-lines', '  // markdownnotes: /snippet keep-lines']);
    expect(snippetLines('a.py', 'x')).toEqual(['# markdownnotes: snippet x', '# markdownnotes: /snippet x']);
    expect(snippetLines('a.html', 'x')).toEqual(['<!-- markdownnotes: snippet x -->', '<!-- markdownnotes: /snippet x -->']);
    expect(snippetLines('a.css', 'x')).toEqual(['/* markdownnotes: snippet x */', '/* markdownnotes: /snippet x */']);
    expect(snippetLines('a.json', 'x')).toBeUndefined();
    // Configuration files and other file types get the comment form of their type, also by the name of the file.
    const forms = ['tsconfig.jsonc', 'app.JSX', 'b.tsx', 'c.scss', 'd.yaml', 'e.toml', '.env', 'config/.env.local', 'Dockerfile', 'Makefile', 'f.ini', 'g.lua', 'h.svg', 'i.bat', 'j.vb'];
    expect(forms.map((path) => snippetLines(path, 'x')?.[1])).toEqual([
      '// markdownnotes: /snippet x',
      '// markdownnotes: /snippet x',
      '// markdownnotes: /snippet x',
      '// markdownnotes: /snippet x',
      '# markdownnotes: /snippet x',
      '# markdownnotes: /snippet x',
      '# markdownnotes: /snippet x',
      '# markdownnotes: /snippet x',
      '# markdownnotes: /snippet x',
      '# markdownnotes: /snippet x',
      '; markdownnotes: /snippet x',
      '-- markdownnotes: /snippet x',
      '<!-- markdownnotes: /snippet x -->',
      'REM markdownnotes: /snippet x',
      "' markdownnotes: /snippet x",
    ]);
    expect([fileTypeOf('a/.env.production'), fileTypeOf('Dockerfile.dev'), fileTypeOf('web.dockerfile'), fileTypeOf('GNUmakefile'), fileTypeOf('a.b/README'), fileTypeOf('x.Tar.GZ')]).toEqual([
      'env',
      'dockerfile',
      'dockerfile',
      'makefile',
      '',
      'gz',
    ]);
    expect([isSnippetName('parse-notes'), isSnippetName('Parse'), isSnippetName('a--b'), isSnippetName('')]).toEqual([true, false, false, false]);
  });
});

/** paper is a Markdown text with a listing of a snippet, a listing of a file, and a listing of a missing file. */
const paper = [
  'Listing: Reading the fields<a id="lst-reading-fields"></a>',
  '',
  '<!-- listing: ../src/fields.ts#read-fields -->',
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
      { line: 2, path: '../src/fields.ts', snippet: 'read-fields', open: 4, close: 6 },
      { line: 10, path: '../src/read%20me.py', open: 11, close: 13 },
      { line: 15, path: '../src/gone.ts', open: 17, close: 19 },
    ]);
    expect(missingListings(paper, source).map((listing) => listing.path)).toEqual(['../src/gone.ts']);
    expect(findListings(['<!-- listing: a.ts -->', '', 'Text.', ''])).toEqual([]);
  });

  test('get the current code of their source from the formatter, with a longer fence for code with a fence (R-CODE-002)', () => {
    const refreshed = refreshListings(paper, source);
    expect(refreshed.slice(4, 14)).toEqual(['```typescript {.numbered}', ...codeOf(typescript, 'read-fields')!, '```']);
    expect(refreshed.slice(14, 34)).toEqual(['', 'See [Listing 3](#lst-reading-fields).', '', '<!-- listing: ../src/read%20me.py -->', '~~~', ...python.split('\n'), '~~~']);
    expect(refreshed.slice(34)).toEqual(paper.slice(14));
    expect(refreshListings(refreshed, source)).toEqual(refreshed);
    const fenced: Source = () => 'Text\n````\ncode\n````\n';
    expect(refreshListings(['<!-- listing: a.md -->', '```', '```', ''], fenced)).toEqual(['<!-- listing: a.md -->', '`````', 'Text', '````', 'code', '````', '`````', '']);
  });

  test('are formatted with the source, numbered by /ref and kept current on save (R-CODE-002, R-XREF-002, R-FMT-001)', () => {
    const formatted = formatMarkdown(paper, { source });
    expect(formatted.join('\n')).toContain('See [Listing 1](#lst-reading-fields).');
    expect(formatted.slice(5, 13)).toEqual(codeOf(typescript, 'read-fields'));
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
    expect(listingBlock('Reading', '../src/fields.ts', 'read-fields', ['```', 'x'])).toEqual(['Listing: Reading', '', '<!-- listing: ../src/fields.ts#read-fields -->', '', '````typescript', '```', 'x', '````']);
    expect(languageOf('a/b.PY')).toBe('python');
    expect([languageOf('Makefile'), languageOf('LICENSE')]).toEqual(['makefile', '']);
    expect([languageOf('.env.local'), languageOf('Dockerfile'), languageOf('tsconfig.jsonc'), languageOf('a.vue')]).toEqual(['ini', 'dockerfile', 'jsonc', 'vue']);
    // One group of patterns without nested braces, which the search of VS Code takes.
    expect(sourceFiles).toMatch(/^\{\*\*\/\*\.bash,.*,\*\*\/\*\.ts,.*,\*\*\/\.env,\*\*\/\.env\.\*,\*\*\/Dockerfile,.*\}$/);
    expect(sourceFiles.slice(1, -1)).not.toMatch(/[{}]/);
    expect(sourceFiles).not.toContain('*.md,');
  });
});
