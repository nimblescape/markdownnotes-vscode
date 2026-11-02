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
import {
  captionLinkOf,
  captionsOf,
  codeOf,
  fileTypeOf,
  findListings,
  isSnippetName,
  languageOf,
  listingBlock,
  listingCite,
  listingTarget,
  missingListings,
  refreshListings,
  snippetLines,
  snippetsOf,
  type Source,
  sourceFiles,
} from './listings';

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
    expect(refreshed[0]).toBe('Listing: [Reading the fields](../src/fields.ts#L6-L13) (fields.ts, L6-L13)<a id="lst-reading-fields"></a>');
    expect(refreshed.slice(1, 4)).toEqual(paper.slice(1, 4));
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
    // The caption of a listing is the text of the link to its source.
    expect(findItems(formatted).map(({ caption }) => caption)).toEqual(['Reading the fields']);
    // The formatter writes the number of the caption.
    expect(formatted[0]).toBe('Listing 1: [Reading the fields](../src/fields.ts#L6-L13) (fields.ts, L6-L13)<a id="lst-reading-fields"></a>');
    expect(formatMarkdown(formatted, { source })).toEqual(formatted);
    const plain = findItems(['Listing: Reading the fields', '', '```', 'x', '```', '']);
    expect(anchorName(plain[0], plain)).toBe('lst-reading-fields');
    expect(numberLinks(paper)[8]).toBe('See [Listing 1](#lst-reading-fields).');
  });

  test('are written by /listing with their caption line, their comment and the language of their file (R-CODE-001)', () => {
    const marked = '// markdownnotes: snippet read-fields\n```\nx\n// markdownnotes: /snippet read-fields\n';
    expect(listingBlock('Reading', '../src/fields.ts', 'read-fields', marked)).toEqual([
      'Listing: [Reading](../src/fields.ts#L2-L3) (fields.ts, L2-L3)',
      '',
      '<!-- listing: ../src/fields.ts#read-fields -->',
      '',
      '````typescript',
      '```',
      'x',
      '````',
    ]);
    expect(listingBlock('All', 'a.py', undefined, 'x = 1\n')).toEqual(['Listing: [All](a.py) (a.py)', '', '<!-- listing: a.py -->', '', '```python', 'x = 1', '```']);
    expect(languageOf('a/b.PY')).toBe('python');
    expect([languageOf('Makefile'), languageOf('LICENSE')]).toEqual(['makefile', '']);
    expect([languageOf('.env.local'), languageOf('Dockerfile'), languageOf('tsconfig.jsonc'), languageOf('a.vue')]).toEqual(['ini', 'dockerfile', 'jsonc', 'vue']);
    // One group of patterns without nested braces, which the search of VS Code takes.
    expect(sourceFiles).toMatch(/^\{\*\*\/\*\.bash,.*,\*\*\/\*\.ts,.*,\*\*\/\.env,\*\*\/\.env\.\*,\*\*\/Dockerfile,.*\}$/);
    expect(sourceFiles.slice(1, -1)).not.toMatch(/[{}]/);
    expect(sourceFiles).not.toContain('*.md,');
  });
});

describe('the caption of a listing', () => {
  /** listed returns a text with a caption and a listing of a snippet of fields.ts. */
  const listed = (caption: string[]) => [...caption, '', '<!-- listing: ../src/fields.ts#read-fields -->', '', '```typescript', '```', ''];

  test('is a link to the lines of the snippet in the source, or to the whole file (R-CODE-001)', () => {
    expect(listingTarget('../src/fields.ts', typescript, 'read-fields')).toBe('../src/fields.ts#L6-L13');
    expect(listingTarget('../src/fields.ts', typescript)).toBe('../src/fields.ts');
    expect(listingTarget('a.ts', 'a\n// markdownnotes: snippet one\nb\n// markdownnotes: /snippet one\n', 'one')).toBe('a.ts#L3');
    expect(listingTarget('a.ts', 'a\n', 'missing')).toBe('a.ts');
    // The cite after the caption names the file and its lines, as the reader of a printed page needs them.
    expect(listingCite('../src/read%20me.ts#L2-L4')).toBe('(read me.ts, L2-L4)');
    expect([listingCite('a.py'), listingCite('a.ts#L3'), listingCite('50%.ts')]).toEqual(['(a.py)', '(a.ts, L3)', '(50%.ts)']);
    const lines = listed(['Listing: [Reading the fields](../src/fields.ts#L6-L13)<a id="lst-reading"></a>']);
    const [caption] = captionsOf(lines, findItems(lines), findListings(lines));
    expect(captionLinkOf(lines, caption!)).toEqual({ open: { line: 0, start: 9, end: 10 }, close: { line: 0, start: 28, end: 54 }, target: '../src/fields.ts#L6-L13' });
    // The cite after the link belongs to the end of the link, which the clean editing view hides.
    const cited = listed(['Listing: [Reading the fields](../src/fields.ts#L6-L13) (fields.ts, L6-L13)']);
    expect(captionLinkOf(cited, captionsOf(cited, findItems(cited), findListings(cited))[0]!)?.close).toEqual({ line: 0, start: 28, end: 74 });
    // A caption that is not one link, and a listing without a caption.
    const two = listed(['Listing: [A](a.ts) and [B](b.ts)']);
    expect(captionLinkOf(two, captionsOf(two, findItems(two), findListings(two))[0]!)).toBeUndefined();
    const bare = ['<!-- listing: a.ts -->', '```', '```', ''];
    expect(captionsOf(bare, findItems(bare), findListings(bare))).toEqual([undefined]);
  });

  test('gets its link and the current lines from the formatter; its text stays as written (R-CODE-001, R-CODE-002)', () => {
    const link = 'Listing: [Reading the fields](../src/fields.ts#L6-L13) (fields.ts, L6-L13)';
    expect(refreshListings(listed(['Listing: Reading the fields']), source)[0]).toBe(link);
    expect(refreshListings(listed(['Listing: [Reading the fields](../src/fields.ts#L1-L2)<a id="lst-reading"></a>']), source)[0]).toBe(`${link}<a id="lst-reading"></a>`);
    // An old cite after the link gets the current lines, and a cite written by hand gets the cite of the source.
    expect(refreshListings(listed(['Listing: [Reading the fields](../src/fields.ts#L1-L2) (fields.ts, L1-L2)']), source)[0]).toBe(link);
    expect(refreshListings(listed(['Listing: [Reading the fields](../src/fields.ts#L6-L13) (my file)']), source)[0]).toBe(link);
    // A link of the person to another target gets the target of the source.
    expect(refreshListings(listed(['Listing: [Reading the fields](https://example.com)']), source)[0]).toBe(link);
    // Text typed outside of the old link goes into the new link.
    expect(refreshListings(listed(['Listing: New [Reading the fields](../src/fields.ts#L1-L2) here']), source)[0]).toBe('Listing: [New Reading the fields here](../src/fields.ts#L6-L13) (fields.ts, L6-L13)');
    // A caption of two lines, two blank lines before the comment, and a caption without text.
    const wrapped = refreshListings(['Listing: Reading', 'the fields', '', ...listed([]).slice(0)], source);
    expect(wrapped.slice(0, 2)).toEqual(['Listing: [Reading', 'the fields](../src/fields.ts#L6-L13) (fields.ts, L6-L13)']);
    expect(refreshListings(listed(['Listing:']), source)[0]).toBe('Listing:');
    // A listing whose source is missing keeps its caption.
    const missing = ['Listing: Gone', '', '<!-- listing: ../src/gone.ts -->', '', '```', 'kept', '```', ''];
    expect(refreshListings(missing, source)).toEqual(missing);
  });
});

describe('a listing of a file of another repository (R-CODE-006)', () => {
  /** commit is the commit of the clone of the reference server. */
  const commit = 'c'.repeat(40);

  /** paper is a paper with the reference server in its front matter and a listing of a snippet of its file api.ts. */
  const paper = ['---', 'repos:', '  server: org/server@main', '---', '', 'Listing: Reading the request', '', '<!-- listing: server:src/api.ts#read -->', '', '```typescript', 'old', '```', ''];

  /** api is the file api.ts of the clone, with the snippet read in its lines 2 to 3. */
  const api = 'export {};\n// markdownnotes: snippet read\nconst request = read();\nuse(request);\n// markdownnotes: /snippet read\n';

  /** cloned reads the clone of server in the folder .markdownpaper/repos/ above the folder of the paper. */
  const cloned = (path: string) => ({ '../.markdownpaper/repos/server/.git/HEAD': `${commit}\n`, '../.markdownpaper/repos/server/src/api.ts': api })[path];

  test('gets the code of the clone, and its caption links to the file on GitHub at the commit of the clone, with the cite of the file', () => {
    const refreshed = refreshListings(paper, cloned);
    expect(refreshed.slice(5, 12)).toEqual([
      `Listing: [Reading the request](https://github.com/org/server/blob/${commit}/src/api.ts#L3-L4) (api.ts, L3-L4)`,
      '',
      '<!-- listing: server:src/api.ts#read -->',
      '',
      '```typescript',
      'const request = read();',
      'use(request);',
    ]);
    expect(refreshListings(refreshed, cloned)).toEqual(refreshed);
    expect(missingListings(refreshed, cloned)).toEqual([]);
    // A new commit of the clone gives the link the new commit; text outside the old link goes into the new link.
    const moved = refreshed.map((line) => line.replace('Listing: [Reading', 'Listing: New [Reading').replace('(api.ts, L3-L4)', '(api.ts, L3-L4) here'));
    const next = (path: string) => (path === '../.markdownpaper/repos/server/.git/HEAD' ? 'd'.repeat(40) : cloned(path));
    expect(refreshListings(moved, next)[5]).toBe(`Listing: [New Reading the request here](https://github.com/org/server/blob/${'d'.repeat(40)}/src/api.ts#L3-L4) (api.ts, L3-L4)`);
  });

  test('without its clone or its reference keeps its code and its caption, and is missing', () => {
    expect(refreshListings(paper, () => undefined)).toEqual(paper);
    expect(missingListings(paper, () => undefined).map((listing) => listing.path)).toEqual(['server:src/api.ts']);
    const unnamed = paper.map((line) => line.replace('  server:', '  client:'));
    expect(refreshListings(unnamed, cloned)).toEqual(unnamed);
    expect(missingListings(unnamed, cloned)).toHaveLength(1);
  });

  test('is written by /listing with the path of its reference and the address of the file on GitHub', () => {
    expect(listingBlock('Reading', 'server:src/api.ts', 'read', api, `https://github.com/org/server/blob/${commit}/src/api.ts`).slice(0, 3)).toEqual([
      `Listing: [Reading](https://github.com/org/server/blob/${commit}/src/api.ts#L3-L4) (api.ts, L3-L4)`,
      '',
      '<!-- listing: server:src/api.ts#read -->',
    ]);
  });
});
