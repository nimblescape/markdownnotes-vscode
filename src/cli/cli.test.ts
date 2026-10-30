// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the command line tool of the formatter (R-FMT-004): the command `format` writes only the files
 * that change, with their line breaks and byte order mark, the current code of the listings (R-CODE-002), `--check`
 * changes no file and exits with 1, `-` formats the standard input, and a wrong command, a wrong option, a file that
 * cannot be read or a file of a higher major version of the format exits with 2.
 */

import { describe, expect, test } from 'vitest';
import { version } from '../../package.json';
import { formatVersion, versionText } from '../notes/doctype';
import { command, formatText, type Io, run, usage } from './cli';

/** Fake is an Io in memory, with the files, the standard input, and what the tool wrote. */
interface Fake extends Io {
  files: Map<string, string>;
  written: string[];
  stdout: string[];
  errors: string[];
}

/**
 * fakeOf returns an Io in memory with files and a standard input.
 * @param files - The files by their paths.
 * @param stdin - The standard input.
 */
function fakeOf(files: Record<string, string>, stdin = ''): Fake {
  const fake: Fake = {
    files: new Map(Object.entries(files)),
    written: [],
    stdout: [],
    errors: [],
    readFile: (path) => {
      const text = fake.files.get(path);
      if (text === undefined) {
        throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      }
      return text;
    },
    writeFile: (path, text) => {
      fake.files.set(path, text);
      fake.written.push(path);
    },
    readStdin: () => stdin,
    writeStdout: (text) => fake.stdout.push(text),
    out: (line) => fake.stdout.push(`${line}\n`),
    err: (line) => fake.errors.push(line),
  };
  return fake;
}

/** unformatted is a paragraph on two lines and a table whose columns are not aligned. */
const unformatted = 'A paragraph\non two lines.\n\n| a | b |\n|-|-|\n| long cell | x |\n';
/** formatted is the formatted text of unformatted. */
const formatted = 'A paragraph on two lines.\n\n| a         | b   |\n| --------- | --- |\n| long cell | x   |\n';

describe('the command format', () => {
  test('writes only the files that change, and exits with 0', () => {
    const fake = fakeOf({ 'a.md': unformatted, 'b.md': formatted });
    expect(run(['format', 'a.md', 'b.md'], fake)).toBe(0);
    expect(fake.written).toEqual(['a.md']);
    expect(fake.files.get('a.md')).toBe(formatted);
    expect(fake.errors).toEqual([]);
  });

  test('keeps the line breaks of the file and its byte order mark', () => {
    const crlf = unformatted.replaceAll('\n', '\r\n');
    expect(formatText(crlf)).toBe(formatted.replaceAll('\n', '\r\n'));
    expect(formatText(`﻿${unformatted}`)).toBe(`﻿${formatted}`);
  });

  test('keeps the notes and the comment of the format', () => {
    const text = [
      '<!-- nimblescape-markdownnotes v1.0.0 spec=https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/format.md',
      '-->',
      '',
      'Some <!--[note-7k2q-->text[^note-7k2q] of',
      'a paragraph.',
      '',
      '[^note-7k2q]: **hannes** · 2026-10-28 18:03+01:00',
      '',
      '    Please check.',
      '',
    ].join('\n');
    const result = formatText(text).split('\n');
    expect(result.slice(0, 2)).toEqual(text.split('\n').slice(0, 2));
    expect(result[3]).toBe('Some <wbr><!--[note-7k2q-->text[^note-7k2q] of a paragraph.');
    expect(result.slice(4)).toEqual(['', '[^note-7k2q]: **hannes** · 2026-10-28 18:03+01:00', '', '    Please check.', '']);
  });

  test('with --check changes no file, lists the files to format, and exits with 1', () => {
    const fake = fakeOf({ 'a.md': unformatted, 'b.md': formatted });
    expect(run(['format', '--check', 'a.md', 'b.md'], fake)).toBe(1);
    expect(fake.written).toEqual([]);
    expect(fake.errors).toEqual(['a.md: not formatted']);
    expect(run(['format', 'b.md', '--check'], fake)).toBe(0);
  });

  test('formats the standard input to the standard output with -', () => {
    const fake = fakeOf({}, unformatted);
    expect(run(['format', '-'], fake)).toBe(0);
    expect(fake.stdout).toEqual([formatted]);
    const check = fakeOf({}, unformatted);
    expect(run(['format', '--check', '-'], check)).toBe(1);
    expect(check.stdout).toEqual([]);
  });

  test('exits with 2 for a file that it cannot read, and formats the other files', () => {
    const fake = fakeOf({ 'a.md': unformatted });
    expect(run(['format', 'missing.md', 'a.md'], fake)).toBe(2);
    expect(fake.errors).toEqual(["missing.md: ENOENT: no such file or directory, open 'missing.md'"]);
    expect(fake.files.get('a.md')).toBe(formatted);
  });

  test('keeps a file of a higher major version of the format as it is, formats the other files, and exits with 2', () => {
    const newer = ['<!-- nimblescape-markdownnotes v2.0.0 spec=https://example.com/format-v2.md', '-->', '', unformatted].join('\n');
    const fake = fakeOf({ 'new.md': newer, 'a.md': unformatted }, newer);
    expect(run(['format', 'new.md', 'a.md'], fake)).toBe(2);
    expect(fake.written).toEqual(['a.md']);
    expect(fake.files.get('new.md')).toBe(newer);
    expect(fake.errors).toEqual([
      'new.md: the file uses version 2.0.0 of the format of the notes, and this version of markdownnotes knows only the versions 1.x, so the file stays as it is. Run the newest version: npx -y @nimblescape/markdownnotes@latest format',
    ]);
    expect(run(['format', '-'], fake)).toBe(2);
    expect(fake.stdout).toEqual([newer]);
    const minor = newer.replace('v2.0.0', 'v1.1.0');
    expect(formatText(minor)).toBe(minor.replace(unformatted, formatted));
  });

  test('writes the current code of each listing from its file, and reports a listing whose source it does not find (R-CODE-002)', () => {
    const paper = ['Listing: Reading', '', '<!-- listing: ../src/read%20me.ts#read -->', '', '```typescript', 'old', '```', '', '<!-- listing: ../src/gone.ts -->', '', '```', 'kept', '```', ''].join('\n');
    const code = '// markdownnotes: snippet read\nexport function read(path: string): string {\n  return path;\n}\n// markdownnotes: /snippet read\n\nexport const other = 1;\n';
    const fake = fakeOf({ 'paper/a.md': paper, 'src/read me.ts': code }, paper);
    expect(run(['format', 'paper/a.md'], fake)).toBe(0);
    const formatted = paper.replace('old', 'export function read(path: string): string {\n  return path;\n}');
    expect(fake.files.get('paper/a.md')).toBe(formatted);
    expect(fake.errors).toEqual(['paper/a.md:11: the source ../src/gone.ts of the listing was not found']);
    // --check fails for a listing without its source, and the standard input reads the sources from the current folder.
    expect(run(['format', '--check', 'paper/a.md'], fake)).toBe(1);
    expect(run(['format', '-'], fake)).toBe(0);
    expect(fake.stdout).toEqual([paper]);
  });

  test('exits with 2 for a file that it cannot write', () => {
    const fake = fakeOf({ 'a.md': unformatted });
    fake.writeFile = () => {
      throw new Error('EACCES: permission denied');
    };
    expect(run(['format', 'a.md'], fake)).toBe(2);
    expect(fake.errors).toEqual(['a.md: EACCES: permission denied']);
  });
});

describe('the command line', () => {
  test('shows the help with --help, and on the standard error without a command', () => {
    const help = fakeOf({});
    expect(run(['--help'], help)).toBe(0);
    expect(help.stdout).toEqual([`${usage}\n`]);
    const none = fakeOf({});
    expect(run([], none)).toBe(2);
    expect(none.errors).toEqual([usage]);
  });

  test('shows the version of the tool and of the format', () => {
    const fake = fakeOf({});
    expect(run(['--version'], fake)).toBe(0);
    expect(fake.stdout).toEqual([`${command} ${version} (format ${versionText(formatVersion)})\n`]);
  });

  test('exits with 2 for an unknown command, an unknown option, and no file', () => {
    const fake = fakeOf({ 'a.md': unformatted });
    expect(run(['lint', 'a.md'], fake)).toBe(2);
    expect(run(['format', '--fix', 'a.md'], fake)).toBe(2);
    expect(run(['format'], fake)).toBe(2);
    expect(run(['format', '--check'], fake)).toBe(2);
    expect(fake.errors.map((error) => error.split('\n')[0])).toEqual([
      'Unknown command "lint".',
      'Unknown option "--fix".',
      'No file to format.',
      'No file to format.',
    ]);
    expect(fake.written).toEqual([]);
  });
});
