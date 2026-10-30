// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The listings of a Markdown text: code blocks whose code comes from a file of source code
 * ([R-CODE-001](../../docs/requirements.md#r-code-001)).
 *
 * A listing is a code block with a comment of HTML directly before it that names its source: a whole file,
 * `<!-- listing: ../src/fields.ts -->`, or a snippet of the file, `<!-- listing: ../src/fields.ts#parse-notes -->`. The
 * formatter reads the source again and writes its code into the block, the same way in VS Code and on the command line.
 *
 * A snippet is code between two marks in comments of the source ([R-CODE-003](../../docs/requirements.md#r-code-003)):
 * `// markdownnotes: snippet parse-notes` and `// markdownnotes: /snippet parse-notes`, in the comment form of the
 * language. A listing of a function, a class or a method is a snippet around it: the module finds no symbols of a
 * language, because only a parser of the language finds them reliably
 * ([R-CODE-005](../../docs/requirements.md#r-code-005)). The code of a listing leaves out the marks of all snippets. It
 * uses no API of VS Code.
 */

import { parse } from './notes';
import { noteCloseType, noteOpenType } from './syntax';

/** Listing is a listing of a text: the line of its comment, its source, and the lines of its code block. */
export interface Listing {
  /** line is the index of the line of the comment. */
  line: number;
  /** path is the path of the file of the source, relative to the Markdown file, with `/`. */
  path: string;
  /** snippet is the name of the snippet after `#`, or undefined for the whole file. */
  snippet?: string;
  /** open and close are the indexes of the opening and the closing line of the fence of the code block. */
  open: number;
  close: number;
}

/**
 * listingComment matches the comment of a listing, with the path and the optional name after `#`. It also takes a name
 * that is no name of a snippet, such as `Reader.open`, so that the formatter reports the listing as not found.
 */
const listingComment = /^\s*<!--\s*listing:\s*([^\s#]+)(?:#([A-Za-z0-9_$.-]+))?\s*-->\s*$/;

/** listingText returns the comment of a listing for a path and the name of a snippet. */
export const listingText = (path: string, snippet?: string): string => `<!-- listing: ${path}${snippet ? `#${snippet}` : ''} -->`;

/**
 * findListings returns the listings of a text: each comment of a listing on a line of its own that a fenced code block
 * follows, outside the texts of the notes.
 * @param lines - The lines of the text.
 */
export function findListings(lines: readonly string[]): Listing[] {
  if (!lines.some((line) => line.includes('listing:'))) {
    return [];
  }
  const tokens = parse(lines);
  const listings: Listing[] = [];
  let depth = 0;
  tokens.forEach((token, index) => {
    if (token.type === noteOpenType) {
      depth++;
    } else if (token.type === noteCloseType) {
      depth--;
    }
    const match = token.type === 'html_block' && depth === 0 && token.map && token.map[1] - token.map[0] === 1 ? listingComment.exec(lines[token.map[0]]) : null;
    const fence = tokens[index + 1];
    if (match && fence?.type === 'fence' && fence.map && fence.map[1] - fence.map[0] >= 2 && lines[fence.map[1] - 1].trim().startsWith(fence.markup[0])) {
      listings.push({ line: token.map![0], path: match[1], ...(match[2] ? { snippet: match[2] } : {}), open: fence.map[0], close: fence.map[1] - 1 });
    }
  });
  return listings;
}

/**
 * dedent returns lines without the white space at their start that all lines that are not blank have.
 * @param lines - The lines.
 */
export function dedent(lines: readonly string[]): string[] {
  const indents = lines.filter((line) => line.trim() !== '').map((line) => /^[ \t]*/.exec(line)![0]);
  let common = indents[0] ?? '';
  for (const indent of indents) {
    while (!indent.startsWith(common)) {
      common = common.slice(0, -1);
    }
  }
  return lines.map((line) => (line.trim() === '' ? '' : line.slice(common.length)));
}

/** trimBlank returns lines without the blank lines at their start and their end. */
function trimBlank(lines: readonly string[]): string[] {
  let first = 0;
  let last = lines.length - 1;
  while (first <= last && lines[first].trim() === '') {
    first++;
  }
  while (last >= first && lines[last].trim() === '') {
    last--;
  }
  return lines.slice(first, last + 1);
}

/** snippetName is the source of the pattern of the name of a snippet: small letters and digits, with `-` between them. */
const snippetName = '[a-z0-9]+(?:-[a-z0-9]+)*';

/** snippetMark matches a line with a mark of a snippet, in any form of a comment: `/` before `snippet` closes it. */
const snippetMark = new RegExp(String.raw`\bmarkdownnotes:\s*(\/?)snippet\s+(${snippetName})\b`);

/** isSnippetName tells whether a text is the name of a snippet. */
export const isSnippetName = (name: string): boolean => new RegExp(`^${snippetName}$`).test(name);

/**
 * snippetText returns the text of the marks of a snippet, without the form of the comment: the start and the end.
 * @param name - The name of the snippet.
 */
export const snippetText = (name: string): [string, string] => [`markdownnotes: snippet ${name}`, `markdownnotes: /snippet ${name}`];

/** comments are the forms of a comment of a line by the extensions of the files: the text before and after it. */
const comments: Record<string, [string, string]> = {
  ...Object.fromEntries(
    ['c', 'cc', 'cjs', 'cpp', 'cs', 'cts', 'dart', 'go', 'gradle', 'groovy', 'h', 'hpp', 'java', 'js', 'json5', 'jsonc', 'jsx', 'kt', 'kts', 'less', 'mjs', 'mts', 'php', 'proto', 'rs', 'scala', 'scss', 'swift', 'ts', 'tsx', 'zig'].map(
      (type) => [type, ['// ', '']],
    ),
  ),
  ...Object.fromEntries(
    ['bash', 'cfg', 'cmake', 'conf', 'dockerfile', 'env', 'ex', 'exs', 'fish', 'gql', 'graphql', 'hcl', 'jl', 'makefile', 'mk', 'pl', 'properties', 'ps1', 'py', 'r', 'rb', 'sh', 'tf', 'toml', 'yaml', 'yml', 'zsh'].map(
      (type) => [type, ['# ', '']],
    ),
  ),
  ...Object.fromEntries(['elm', 'hs', 'lua', 'sql'].map((type) => [type, ['-- ', '']])),
  ...Object.fromEntries(['erl', 'm', 'sty', 'tex'].map((type) => [type, ['% ', '']])),
  ...Object.fromEntries(['clj', 'ini', 'lisp', 'scm'].map((type) => [type, ['; ', '']])),
  ...Object.fromEntries(['htm', 'html', 'md', 'plist', 'svg', 'xhtml', 'xml', 'xsl', 'xslt'].map((type) => [type, ['<!-- ', ' -->']])),
  bat: ['REM ', ''],
  cmd: ['REM ', ''],
  css: ['/* ', ' */'],
  vb: ["' ", ''],
};

/**
 * fileTypeOf returns the type of a file for its comments and its language: its extension in small letters, or a name
 * for a file that its name marks, such as `env` for `.env` and `.env.local`, `dockerfile` for `Dockerfile` and
 * `makefile` for `Makefile`.
 * @param path - The path of the file.
 */
export function fileTypeOf(path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
  if (name === '.env' || name.startsWith('.env.')) {
    return 'env';
  }
  if (name === 'dockerfile' || name.startsWith('dockerfile.') || name.endsWith('.dockerfile')) {
    return 'dockerfile';
  }
  if (name === 'makefile' || name === 'gnumakefile') {
    return 'makefile';
  }
  return /\.([^.]+)$/.exec(name)?.[1] ?? '';
}

/**
 * snippetLines returns the marks of a snippet in the comment form of the language of a file, or undefined for a file
 * whose language has no comment of a line, such as JSON.
 * @param path - The path of the file.
 * @param name - The name of the snippet.
 * @param indent - The white space before the marks.
 */
export function snippetLines(path: string, name: string, indent = ''): [string, string] | undefined {
  const form = comments[fileTypeOf(path)];
  return form ? (snippetText(name).map((text) => `${indent}${form[0]}${text}${form[1]}`) as [string, string]) : undefined;
}

/**
 * snippetsOf returns the snippets of the lines of a source: the name, and the index of the first and the last line of
 * its code between its marks, in the order of their start marks. A start mark without an end mark after it is no
 * snippet; of two snippets of one name, the first one counts.
 * @param lines - The lines of the source.
 */
export function snippetsOf(lines: readonly string[]): { name: string; first: number; last: number }[] {
  const snippets: { name: string; first: number; last: number }[] = [];
  const open = new Map<string, number>();
  lines.forEach((line, index) => {
    const mark = snippetMark.exec(line);
    if (!mark) {
      return;
    }
    const [, close, name] = mark;
    if (!close && !open.has(name) && !snippets.some((snippet) => snippet.name === name)) {
      open.set(name, index);
    } else if (close && open.has(name)) {
      snippets.push({ name, first: open.get(name)! + 1, last: index - 1 });
      open.delete(name);
    }
  });
  return snippets.sort((a, b) => a.first - b.first);
}

/**
 * codeOf returns the code of the source of a listing: the whole text of the file, or the lines of its snippet without
 * their common indentation, without the marks of the snippets and without blank lines at the start and the end;
 * undefined when the snippet is not in it.
 * @param text - The text of the file.
 * @param snippet - The name of the snippet, or undefined for the whole file.
 */
export function codeOf(text: string, snippet?: string): string[] | undefined {
  const lines = text.replace(/^﻿/, '').split(/\r\n|\r|\n/);
  const code = (part: readonly string[]) => trimBlank(dedent(part.filter((line) => !snippetMark.test(line))));
  if (snippet === undefined) {
    return code(lines);
  }
  const range = snippetsOf(lines).find(({ name }) => name === snippet);
  return range ? code(lines.slice(range.first, range.last + 1)) : undefined;
}

/** Source reads the text of a file of source code by its path relative to the Markdown file, or returns undefined. */
export type Source = (path: string) => string | undefined;

/**
 * missingListings returns the listings of a text whose file or snippet the source does not have.
 * @param lines - The lines of the text.
 * @param source - Reads the files of the listings.
 */
export function missingListings(lines: readonly string[], source: Source): Listing[] {
  return findListings(lines).filter((listing) => {
    const text = source(listing.path);
    return text === undefined || codeOf(text, listing.snippet) === undefined;
  });
}

/**
 * refreshListings returns the lines of a text with the current code of the source of each listing in its code block
 * ([R-CODE-002](../../docs/requirements.md#r-code-002)). The fence gets longer when the code holds a fence of its
 * length. A listing whose file or snippet the source does not have keeps its code.
 * @param lines - The lines of the text.
 * @param source - Reads the files of the listings.
 */
export function refreshListings(lines: readonly string[], source: Source): string[] {
  const listings = findListings(lines);
  if (listings.length === 0) {
    return [...lines];
  }
  const output = [...lines];
  for (const listing of [...listings].reverse()) {
    const text = source(listing.path);
    const code = text === undefined ? undefined : codeOf(text, listing.snippet);
    if (!code) {
      continue;
    }
    const opening = /^(\s*)(`{3,}|~{3,})(.*)$/.exec(lines[listing.open])!;
    const [, indent, fence, info] = opening;
    const longest = Math.max(0, ...code.map((line) => (line.trim().startsWith(fence[0]) ? /^\s*([`~]+)/.exec(line)![1].length : 0)));
    const marker = fence[0].repeat(Math.max(fence.length, longest + 1));
    output.splice(listing.open, listing.close - listing.open + 1, `${indent}${marker}${info}`, ...code.map((line) => (line === '' ? '' : `${indent}${line}`)), `${indent}${marker}`);
  }
  return output;
}

/** languages are the languages of the code blocks by the types of the files (`fileTypeOf`). */
const languages: Record<string, string> = {
  bash: 'bash', bat: 'bat', c: 'c', cc: 'cpp', cfg: 'ini', cjs: 'javascript', clj: 'clojure', cmake: 'cmake', cmd: 'bat', conf: 'ini', cpp: 'cpp', cs: 'csharp', css: 'css',
  cts: 'typescript', dart: 'dart', dockerfile: 'dockerfile', elm: 'elm', env: 'ini', erl: 'erlang', ex: 'elixir', exs: 'elixir', fish: 'fish', go: 'go', gql: 'graphql',
  gradle: 'groovy', graphql: 'graphql', groovy: 'groovy', h: 'c', hcl: 'hcl', hpp: 'cpp', hs: 'haskell', htm: 'html', html: 'html', ini: 'ini', java: 'java', jl: 'julia',
  js: 'javascript', json: 'json', json5: 'json5', jsonc: 'jsonc', jsx: 'jsx', kt: 'kotlin', kts: 'kotlin', less: 'less', lisp: 'lisp', lua: 'lua', m: 'matlab',
  makefile: 'makefile', md: 'markdown', mjs: 'javascript', mk: 'makefile', mts: 'typescript', php: 'php', pl: 'perl', plist: 'xml', properties: 'properties',
  proto: 'protobuf', ps1: 'powershell', py: 'python', r: 'r', rb: 'ruby', rs: 'rust', scala: 'scala', scm: 'scheme', scss: 'scss', sh: 'bash', sql: 'sql', sty: 'latex',
  svelte: 'svelte', svg: 'xml', swift: 'swift', tex: 'latex', tf: 'hcl', toml: 'toml', ts: 'typescript', tsx: 'tsx', vb: 'vbnet', vue: 'vue', xhtml: 'html', xml: 'xml',
  xsl: 'xml', xslt: 'xml', yaml: 'yaml', yml: 'yaml', zig: 'zig', zsh: 'bash',
};

/** fileNames are the patterns of the files that their names mark, for `sourceFiles`. */
const fileNames = ['.env', '.env.*', 'Dockerfile', 'Dockerfile.*', '*.dockerfile', 'Makefile', 'GNUmakefile'];

/**
 * sourceFiles is the pattern of the files that `/listing` lists: the files of the types above, without Markdown, as one
 * group of patterns without nested braces.
 */
export const sourceFiles = `{${[
  ...Object.keys(languages)
    .filter((type) => type !== 'md' && type !== 'env' && type !== 'dockerfile' && type !== 'makefile')
    .map((type) => `**/*.${type}`),
  ...fileNames.map((name) => `**/${name}`),
].join(',')}}`;

/**
 * languageOf returns the language of a code block for the path of a file, for example `typescript` for `fields.ts`,
 * or an empty text.
 * @param path - The path.
 */
export const languageOf = (path: string): string => languages[fileTypeOf(path)] ?? '';

/**
 * listingBlock returns the lines of a new listing: its caption line, its comment and its code block, with a blank line
 * between them, as the formatter writes them.
 * @param caption - The caption.
 * @param path - The path of the file of the source.
 * @param snippet - The name of the snippet, or undefined for the whole file.
 * @param code - The code.
 */
export function listingBlock(caption: string, path: string, snippet: string | undefined, code: readonly string[]): string[] {
  const longest = Math.max(0, ...code.map((line) => (line.trim().startsWith('`') ? /^\s*(`+)/.exec(line)![1].length : 0)));
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return [`Listing: ${caption}`, '', listingText(path, snippet), '', `${fence}${languageOf(path)}`, ...code, fence];
}
