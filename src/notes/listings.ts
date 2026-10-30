// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The listings of a Markdown text: code blocks whose code comes from a file of source code
 * ([R-CODE-001](../../docs/requirements.md#r-code-001)). Hannes, 2026-10-30: "a paper can be in a repo along with other
 * source code", "there is a new slash command for that which "imports" a code block", "the formatter assures the
 * source code references / code blocks are uptodate", "we may mark single functions but also complete source code
 * files".
 *
 * A listing is a code block with a comment of HTML directly before it that names its source: a whole file,
 * `<!-- listing: ../src/fields.ts -->`, or a symbol of the file, such as a function, a class or a method,
 * `<!-- listing: ../src/fields.ts#readFields -->`, with `.` between a class and its method. The formatter reads the
 * source again and writes its code into the block. The module finds a symbol by its declaration and its end by the
 * braces or, in Python, by the indentation, the same way in VS Code and on the command line, so that both write the
 * same code.
 *
 * Code that is no symbol, such as a part of a function, is a snippet between two marks in comments of the source
 * ([R-CODE-003](../../docs/requirements.md#r-code-003); Hannes, 2026-10-30, 03:20: "a slash command in the source code
 * editor /snippet adds the mark, but the mark must be more clear it belongs to the notes plugin", "snippet is the correct
 * name for it"): `// markdownnotes: snippet parse-notes` and `// markdownnotes: /snippet parse-notes`, in the comment
 * form of the language. A listing names a snippet as a symbol, and a snippet wins over a symbol of the same name. The
 * code of a listing leaves out the marks of all snippets. It uses no API of VS Code.
 */

import { parse } from './notes';
import { noteCloseType, noteOpenType } from './syntax';

/** Listing is a listing of a text: the line of its comment, its source, and the lines of its code block. */
export interface Listing {
  /** line is the index of the line of the comment. */
  line: number;
  /** path is the path of the file of the source, relative to the Markdown file, with `/`. */
  path: string;
  /** symbol is the name of the symbol, with `.` between a container and its member, or undefined for the whole file. */
  symbol?: string;
  /** open and close are the indexes of the opening and the closing line of the fence of the code block. */
  open: number;
  close: number;
}

/** listingComment matches the comment of a listing, with the path and the optional symbol. */
const listingComment = /^\s*<!--\s*listing:\s*([^\s#]+)(?:#([A-Za-z0-9_$.-]+))?\s*-->\s*$/;

/** listingText returns the comment of a listing for a path and a symbol. */
export const listingText = (path: string, symbol?: string): string => `<!-- listing: ${path}${symbol ? `#${symbol}` : ''} -->`;

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
      listings.push({ line: token.map![0], path: match[1], ...(match[2] ? { symbol: match[2] } : {}), open: fence.map[0], close: fence.map[1] - 1 });
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

/** escaped returns a name as the source of a regular expression. */
const escaped = (name: string): string => name.replace(/[$.]/g, '\\$&');

/** modifiers are the words that can stand before the name of a declared method or field. */
const modifiers = String.raw`(?:(?:export|default|public|private|protected|internal|static|async|override|abstract|readonly|final|virtual|declare|get|set|unsafe|pub(?:\([a-z]+\))?|extern|inline|const)\s+)*`;

/**
 * declarationOf returns the index of the line that declares a name between two lines, or undefined: a function, a
 * class, an interface, a type, a constant or a method of TypeScript, JavaScript, Java, C#, Go, Rust, Kotlin or Python.
 * @param lines - The lines of the source.
 * @param name - The name.
 * @param from - The first line to search.
 * @param to - The line after the last line to search.
 */
function declarationOf(lines: readonly string[], name: string, from: number, to: number): number | undefined {
  const word = escaped(name);
  const patterns = [
    new RegExp(String.raw`\b(?:function\*?|class|interface|enum|type|struct|trait|impl|def|fn|fun|func|module|namespace|record|object|union)\s+(?:\([^)]*\)\s*)?${word}(?![\w$])`),
    new RegExp(String.raw`\b(?:const|let|var|val)\s+${word}\s*[:=]`),
    new RegExp(String.raw`^\s*${modifiers}(?:[\w$<>\[\],.?]+\s+)?\*?${word}\s*(?:<[^>]*>)?\s*\(.*[)\w,]\s*(?:[:{]|=>|throws|$)`),
  ];
  for (let line = from; line < to; line++) {
    const text = lines[line];
    // A call ends with `;`, a declaration does not, and a comment is no declaration.
    if (/^\s*(?:\/\/|\*|\/\*|#)/.test(text) || (/;\s*$/.test(text) && !/\b(?:const|let|var|val|type)\s/.test(text))) {
      continue;
    }
    if (patterns.some((pattern) => pattern.test(text))) {
      return line;
    }
  }
  return undefined;
}

/**
 * endOf returns the index of the last line of the declaration that starts at a line: the line of the brace that closes
 * its first `{`, or of a `;` before it, or in Python the last line of its indented body.
 * @param lines - The lines of the source.
 * @param start - The line of the declaration.
 * @param to - The line after the last line that the declaration can have.
 */
function endOf(lines: readonly string[], start: number, to: number): number {
  let depth = 0;
  let parens = 0;
  let opened = false;
  let quote: string | undefined;
  let block = false;
  for (let line = start; line < to; line++) {
    const text = lines[line];
    for (let column = 0; column < text.length; column++) {
      const char = text[column];
      if (block) {
        if (text.startsWith('*/', column)) {
          block = false;
          column++;
        }
      } else if (quote) {
        if (char === '\\') {
          column++;
        } else if (char === quote) {
          quote = undefined;
        }
      } else if (text.startsWith('//', column)) {
        break;
      } else if (text.startsWith('/*', column)) {
        block = true;
        column++;
      } else if (char === '"' || char === "'" || char === '`') {
        quote = char;
      } else if (char === '(' || char === '[') {
        parens++;
      } else if (char === ')' || char === ']') {
        parens--;
      } else if (char === '{') {
        depth++;
        opened = true;
      } else if (char === '}') {
        depth--;
        if (opened && depth === 0) {
          return line;
        }
      } else if (char === ';' && depth === 0 && parens === 0) {
        return line;
      }
    }
    if (quote !== '`') {
      quote = undefined;
    }
    // Python: a declaration whose signature ends with `:` has the lines indented deeper than it as its body.
    if (!opened && parens === 0 && /:\s*(?:#.*)?$/.test(text) && /^\s*(?:async\s+)?(?:def|class)\s/.test(lines[start])) {
      const indent = /^\s*/.exec(lines[start])![0].length;
      let last = line;
      for (let next = line + 1; next < to; next++) {
        if (lines[next].trim() === '') {
          continue;
        }
        if (/^\s*/.exec(lines[next])![0].length <= indent) {
          break;
        }
        last = next;
      }
      return last;
    }
  }
  return start;
}

/**
 * symbolLines returns the index of the first and the last line of a symbol of a source, with the decorators and
 * attributes directly before it, or undefined when the source has no such symbol. A name with `.` names a member of a
 * container, for example `NotesView.addFromText`.
 * @param lines - The lines of the source.
 * @param symbol - The name of the symbol.
 */
export function symbolLines(lines: readonly string[], symbol: string): { first: number; last: number } | undefined {
  let from = 0;
  let to = lines.length;
  let found: { first: number; last: number } | undefined;
  for (const name of symbol.split('.')) {
    const start = declarationOf(lines, name, from, to);
    if (start === undefined) {
      return undefined;
    }
    const last = endOf(lines, start, to);
    let first = start;
    while (first > from && /^\s*(?:@|#\[)/.test(lines[first - 1])) {
      first--;
    }
    found = { first, last };
    from = start + 1;
    to = last + 1;
  }
  return found;
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
  ...Object.fromEntries(['c', 'cc', 'cpp', 'cs', 'go', 'h', 'hpp', 'java', 'js', 'jsx', 'kt', 'mjs', 'cjs', 'php', 'rs', 'scala', 'swift', 'ts', 'tsx'].map((extension) => [extension, ['// ', '']])),
  ...Object.fromEntries(['py', 'r', 'rb', 'sh', 'ps1', 'toml', 'yaml', 'yml'].map((extension) => [extension, ['# ', '']])),
  ...Object.fromEntries(['sql'].map((extension) => [extension, ['-- ', '']])),
  ...Object.fromEntries(['m', 'tex'].map((extension) => [extension, ['% ', '']])),
  ...Object.fromEntries(['html', 'xml', 'md'].map((extension) => [extension, ['<!-- ', ' -->']])),
  css: ['/* ', ' */'],
};

/**
 * snippetLines returns the marks of a snippet in the comment form of the language of a file, or undefined for a file
 * whose language has no comment of a line, such as JSON.
 * @param path - The path of the file.
 * @param name - The name of the snippet.
 * @param indent - The white space before the marks.
 */
export function snippetLines(path: string, name: string, indent = ''): [string, string] | undefined {
  const form = comments[/\.([^./]+)$/.exec(path)?.[1].toLowerCase() ?? ''];
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
 * codeOf returns the code of the source of a listing: the whole text of the file, or the lines of its snippet or its
 * symbol without their common indentation, without the marks of the snippets and without blank lines at the start and
 * the end; undefined when the snippet or the symbol is not in it.
 * @param text - The text of the file.
 * @param symbol - The name of the symbol, or undefined for the whole file.
 */
export function codeOf(text: string, symbol?: string): string[] | undefined {
  const lines = text.replace(/^﻿/, '').split(/\r\n|\r|\n/);
  const code = (part: readonly string[]) => trimBlank(dedent(part.filter((line) => !snippetMark.test(line))));
  if (symbol === undefined) {
    return code(lines);
  }
  const range = snippetsOf(lines).find((snippet) => snippet.name === symbol) ?? symbolLines(lines, symbol);
  return range ? code(lines.slice(range.first, range.last + 1)) : undefined;
}

/** Source reads the text of a file of source code by its path relative to the Markdown file, or returns undefined. */
export type Source = (path: string) => string | undefined;

/**
 * missingListings returns the listings of a text whose file or symbol the source does not have.
 * @param lines - The lines of the text.
 * @param source - Reads the files of the listings.
 */
export function missingListings(lines: readonly string[], source: Source): Listing[] {
  return findListings(lines).filter((listing) => {
    const text = source(listing.path);
    return text === undefined || codeOf(text, listing.symbol) === undefined;
  });
}

/**
 * refreshListings returns the lines of a text with the current code of the source of each listing in its code block
 * ([R-CODE-002](../../docs/requirements.md#r-code-002)). The fence gets longer when the code holds a fence of its
 * length. A listing whose file or symbol the source does not have keeps its code.
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
    const code = text === undefined ? undefined : codeOf(text, listing.symbol);
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

/** languages are the languages of the code blocks by the extensions of the files. */
const languages: Record<string, string> = {
  c: 'c', cc: 'cpp', cpp: 'cpp', cs: 'csharp', css: 'css', go: 'go', h: 'c', hpp: 'cpp', html: 'html', java: 'java', js: 'javascript', json: 'json', jsx: 'jsx', kt: 'kotlin',
  m: 'matlab', md: 'markdown', mjs: 'javascript', cjs: 'javascript', php: 'php', ps1: 'powershell', py: 'python', r: 'r', rb: 'ruby', rs: 'rust', scala: 'scala', sh: 'bash',
  sql: 'sql', swift: 'swift', tex: 'latex', toml: 'toml', ts: 'typescript', tsx: 'tsx', xml: 'xml', yaml: 'yaml', yml: 'yaml',
};

/** sourceFiles is the pattern of the files that `/listing` lists: the files of the languages above, without Markdown. */
export const sourceFiles = `**/*.{${Object.keys(languages)
  .filter((extension) => extension !== 'md')
  .join(',')}}`;

/**
 * languageOf returns the language of a code block for the path of a file, for example `typescript` for `fields.ts`,
 * or an empty text.
 * @param path - The path.
 */
export const languageOf = (path: string): string => languages[/\.([^./]+)$/.exec(path)?.[1].toLowerCase() ?? ''] ?? '';

/**
 * listingBlock returns the lines of a new listing: its caption line, its comment and its code block, with a blank line
 * between them, as the formatter writes them.
 * @param caption - The caption.
 * @param path - The path of the file of the source.
 * @param symbol - The name of the symbol, or undefined for the whole file.
 * @param code - The code.
 */
export function listingBlock(caption: string, path: string, symbol: string | undefined, code: readonly string[]): string[] {
  const longest = Math.max(0, ...code.map((line) => (line.trim().startsWith('`') ? /^\s*(`+)/.exec(line)![1].length : 0)));
  const fence = '`'.repeat(Math.max(3, longest + 1));
  return [`Listing: ${caption}`, '', listingText(path, symbol), '', `${fence}${languageOf(path)}`, ...code, fence];
}
