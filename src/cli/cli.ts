// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The command markdownnotes, the formatter on the command line ([R-FMT-004](../../docs/requirements.md#r-fmt-004)), for
 * programs and AI agents that change a Markdown file outside VS Code. It is the npm package @nimblescape/markdownnotes
 * of cli/. The command `format` formats each file as the formatter of the extension does on save
 * ([src/format/format.ts](../format/format.ts)), with the line breaks of the file; `-` formats the standard input to
 * the standard output. It writes the current code of each listing from its file of source code, by its path relative to
 * the Markdown file, or to the current folder for the standard input, and reports a listing whose source it does not
 * find ([R-CODE-002](../../docs/requirements.md#r-code-002)). With `--check` it changes no file and lists the files
 * that are not formatted, also a file with a listing whose source it does not find. A file whose comment of the format
 * names a higher major version stays as it is, as in the extension. The exit code is 0 when all files are formatted, 1
 * when `--check` found a file to format, and 2 for a wrong command, a file that cannot be read or written, or a file of
 * a higher major version. The command `strip` writes the text of a file without its notes, for a text that is
 * published ([R-HIDE-004](../../docs/requirements.md#r-hide-004)): to the standard output, or with `--out` a copy of each
 * file into a folder; it never changes a file itself, and writes nothing for a file of a higher major version. The
 * module uses no API of VS Code, and main.ts runs it in Node.js.
 */

import * as path from 'node:path';
import { version } from '../../package.json';
import { formatMarkdown } from '../format/format';
import { missingListings, type Source } from '../notes/listings';
import { isMissing, missingMessage, sourceFilesOf } from '../notes/repos';
import { formatVersion, newerFormat, type Version, versionText } from '../notes/doctype';
import { stripText } from '../notes/strip';

export { stripText };

/** command is the name of the command, the `bin` of cli/package.json, as the shell calls it. */
export const command = 'markdownnotes';

/** usage is the help of the tool. */
export const usage = [
  `Usage: ${command} format [--check] <file>...`,
  `       ${command} strip <file>`,
  `       ${command} strip --out <folder> <file>...`,
  '',
  'Formats Markdown files as the extension nimblescape Markdown Notes does on save in VS Code:',
  'each paragraph on one line, aligned tables, no white space at the end of a line, one blank',
  'line between blocks, and <wbr> before each start marker of a note; a note without a start marker',
  'gets one. It keeps code blocks, HTML, front matter, math, containers and the answers of the notes.',
  'It writes the current code of each listing (<!-- listing: path#snippet --> before a code block)',
  'from its file, by its path relative to the Markdown file.',
  '',
  'Options:',
  '  --check    change no file; list the files that are not formatted, and exit with 1',
  '  -          format the standard input to the standard output',
  '',
  'strip writes the text of a file without its notes, for a website or a document that is published:',
  'without the notes, their markers and the comment of the format, in both forms of the notes.',
  'The standard footnotes, the other comments and the rest of the text stay. It never changes a file.',
  '',
  '  --out <folder>  write a copy of each file without its notes into the folder',
  '  -               read the standard input; the text goes to the standard output',
  '',
  '  --help     show this help',
  '  --version  show the version of the tool and of the format of the notes',
].join('\n');

/** Io is what the tool reads and writes: the files, the standard input and output, and its messages. */
export interface Io {
  readFile(path: string): string;
  writeFile(path: string, text: string): void;
  readStdin(): string;
  /** makeFolder creates a folder and the folders above it that do not exist. */
  makeFolder(path: string): void;
  /** writeStdout writes a formatted text to the standard output as it is. */
  writeStdout(text: string): void;
  /** out writes a line of a message to the standard output, and err to the standard error. */
  out(line: string): void;
  err(line: string): void;
}

/**
 * formatText returns a formatted Markdown text, with the line breaks of the text and its byte order mark.
 * @param text - The text.
 * @param source - Reads the files of the listings of the text.
 */
export function formatText(text: string, source?: Source): string {
  const bom = text.startsWith('﻿') ? '﻿' : '';
  const body = text.slice(bom.length);
  const eol = /\r\n/.test(body) ? '\r\n' : '\n';
  return bom + formatMarkdown(body.split(/\r\n|\r|\n/), { source }).join(eol);
}

/**
 * sourceFor returns the reader of the files of the listings of a Markdown file: a path relative to the folder of the
 * file, with `%` escapes for spaces and other characters, or relative to the current folder for the standard input.
 * @param file - The path of the Markdown file, or `-`.
 * @param io - The files.
 */
const sourceFor =
  (file: string, io: Io): Source =>
  (relative) => {
    try {
      return io.readFile(path.join(file === '-' ? '.' : path.dirname(file), decodeURIComponent(relative)));
    } catch {
      return undefined;
    }
  };

/**
 * newerMessage returns the message for a text whose comment of the format names a higher major version.
 * @param newer - The version of the comment.
 * @param name - The command that ran.
 */
const newerMessage = (newer: Version, name = 'format'): string =>
  `the file uses version ${versionText(newer)} of the format of the notes, and this version of ${command} knows only the versions ${formatVersion.major}.x, so ${
    name === 'format' ? 'the file stays as it is' : 'it writes no text without notes for it'
  }. Run the newest version: npx -y @nimblescape/markdownnotes@latest ${name}`;

/**
 * messageOf returns the message of an error.
 * @param error - The error.
 */
const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

/**
 * run runs the tool with the arguments of its command line and returns its exit code.
 * @param args - The arguments, without the program and the script.
 * @param io - The files and the streams.
 */
export function run(args: readonly string[], io: Io): number {
  const [name, ...rest] = args;
  if (name === undefined) {
    io.err(usage);
    return 2;
  }
  if (name === '--help' || name === '-h' || name === 'help') {
    io.out(usage);
    return 0;
  }
  if (name === '--version') {
    io.out(`${command} ${version} (format ${versionText(formatVersion)})`);
    return 0;
  }
  if (name === 'strip') {
    return strip(rest, io);
  }
  if (name !== 'format') {
    io.err(`Unknown command "${name}".\n\n${usage}`);
    return 2;
  }
  const check = rest.includes('--check');
  const unknown = rest.find((arg) => arg.startsWith('-') && arg !== '-' && arg !== '--check');
  const files = rest.filter((arg) => arg !== '--check');
  if (unknown !== undefined || files.length === 0) {
    io.err(`${unknown === undefined ? 'No file to format.' : `Unknown option "${unknown}".`}\n\n${usage}`);
    return 2;
  }
  let failed = false;
  let unformatted = false;
  for (const file of files) {
    try {
      const text = file === '-' ? io.readStdin() : io.readFile(file);
      const newer = newerFormat(text.split(/\r\n|\r|\n/));
      if (newer !== undefined) {
        // The text stays as it is, also on the standard output.
        if (file === '-' && !check) {
          io.writeStdout(text);
        }
        io.err(`${file}: ${newerMessage(newer)}`);
        failed = true;
        continue;
      }
      const source = sourceFor(file, io);
      const formatted = formatText(text, source);
      const formattedLines = formatted.split(/\r\n|\r|\n/);
      const files = sourceFilesOf(formattedLines, source);
      for (const listing of missingListings(formattedLines, source)) {
        const missing = files(listing.path);
        const reason = isMissing(missing) ? `: ${missingMessage(missing)}` : '';
        io.err(`${file}:${listing.line + 1}: the source ${listing.path}${listing.snippet ? `#${listing.snippet}` : ''} of the listing was not found${reason}`);
        unformatted ||= check;
      }
      if (file === '-') {
        unformatted ||= formatted !== text;
        if (!check) {
          io.writeStdout(formatted);
        }
      } else if (formatted !== text) {
        unformatted = true;
        if (check) {
          io.err(`${file}: not formatted`);
        } else {
          io.writeFile(file, formatted);
        }
      }
    } catch (error) {
      io.err(`${file}: ${messageOf(error)}`);
      failed = true;
    }
  }
  return failed ? 2 : check && unformatted ? 1 : 0;
}

/**
 * strip runs the command strip ([R-HIDE-004](../../docs/requirements.md#r-hide-004)) and returns its exit code: 0 when
 * it wrote the text of each file, 2 for a wrong command, a file that cannot be read or written, a copy that would
 * replace its file, or a file of a higher major version, whose text it does not write.
 * @param args - The arguments after the command.
 * @param io - The files and the streams.
 */
function strip(args: readonly string[], io: Io): number {
  const at = args.indexOf('--out');
  const folder = at < 0 ? undefined : args[at + 1];
  const rest = at < 0 ? args : args.filter((_, index) => index !== at && index !== at + 1);
  const unknown = rest.find((arg) => arg.startsWith('-') && arg !== '-');
  const problem =
    at >= 0 && (folder === undefined || folder.startsWith('-'))
      ? 'The option --out needs a folder.'
      : unknown !== undefined
        ? `Unknown option "${unknown}".`
        : rest.length === 0
          ? 'No file to strip.'
          : folder === undefined && rest.length > 1
            ? 'Several files need --out <folder>.'
            : folder !== undefined && rest.includes('-')
              ? 'The standard input goes to the standard output, without --out.'
              : undefined;
  if (problem !== undefined) {
    io.err(`${problem}\n\n${usage}`);
    return 2;
  }
  let failed = false;
  const inputs = new Set(rest.filter((file) => file !== '-').map((file) => path.resolve(file)));
  const targets = new Set<string>();
  for (const file of rest) {
    try {
      const text = file === '-' ? io.readStdin() : io.readFile(file);
      const newer = newerFormat(text.split(/\r\n|\r|\n/));
      const stripped = newer === undefined ? stripText(text) : undefined;
      if (stripped === undefined) {
        io.err(`${file}: ${newerMessage(newer ?? formatVersion, 'strip')}`);
        failed = true;
        continue;
      }
      if (folder === undefined) {
        io.writeStdout(stripped);
        continue;
      }
      const target = path.join(folder, path.basename(file));
      const resolved = path.resolve(target);
      if (inputs.has(resolved) || targets.has(resolved)) {
        const replaced = resolved === path.resolve(file) ? 'the file itself' : inputs.has(resolved) ? 'another file of the command' : 'the copy of another file of the same name';
        io.err(`${file}: the copy ${target} would replace ${replaced}; choose another folder`);
        failed = true;
        continue;
      }
      targets.add(resolved);
      io.makeFolder(folder);
      io.writeFile(target, stripped);
    } catch (error) {
      io.err(`${file}: ${messageOf(error)}`);
      failed = true;
    }
  }
  return failed ? 2 : 0;
}
