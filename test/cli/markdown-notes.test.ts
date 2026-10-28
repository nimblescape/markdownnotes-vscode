// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The tests of the built command markdown-notes (cli/dist/markdown-notes.js, npm run test:cli) on Linux and macOS
// (R-FMT-004). Each test writes Markdown files into a folder in the temporary folder of the system and runs the command
// there with the Node.js of the tests, as a program or an AI agent runs it after `npm install` or with npx.

import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const repository = path.resolve(import.meta.dirname, '../..');
const command = path.join(repository, 'cli', 'dist', 'markdown-notes.js');
const cli = JSON.parse(fs.readFileSync(path.join(repository, 'cli', 'package.json'), 'utf8'));

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) fs.rmSync(folder, { recursive: true, force: true });
});

/** A temporary folder with files, given by their names and their text. */
function tree(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'markdown-notes-cli-'));
  folders.push(root);
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(root, name), text);
  return root;
}

/** Runs the command in `cwd` with the arguments and the input; returns its exit code and its output. */
function run(cwd: string, args: string[], input = '') {
  const result = spawnSync(process.execPath, [command, ...args], { cwd, input, encoding: 'utf8', timeout: 30_000 });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

/** A paragraph on two lines and a table whose columns are not aligned, and the text that the formatter makes of it. */
const unformatted = 'A paragraph\non two lines.\n\n| a | b |\n|-|-|\n| long cell | x |\n';
const formatted = 'A paragraph on two lines.\n\n| a         | b   |\n| --------- | --- |\n| long cell | x   |\n';

describe('the command markdown-notes', () => {
  it('formats the files and writes only those that change, with their line breaks', () => {
    const folder = tree({ 'a.md': unformatted, 'b.md': formatted, 'c.md': unformatted.replaceAll('\n', '\r\n') });
    const before = fs.statSync(path.join(folder, 'b.md')).mtimeMs;
    const result = run(folder, ['format', 'a.md', 'b.md', 'c.md']);
    expect(result).toEqual({ code: 0, stdout: '', stderr: '' });
    expect(fs.readFileSync(path.join(folder, 'a.md'), 'utf8')).toBe(formatted);
    expect(fs.statSync(path.join(folder, 'b.md')).mtimeMs).toBe(before);
    expect(fs.readFileSync(path.join(folder, 'c.md'), 'utf8')).toBe(formatted.replaceAll('\n', '\r\n'));
  });

  it('with --check changes no file, names each file to format, and exits with 1', () => {
    const folder = tree({ 'a.md': unformatted, 'b.md': formatted });
    expect(run(folder, ['format', '--check', 'a.md', 'b.md'])).toEqual({ code: 1, stdout: '', stderr: 'a.md: not formatted\n' });
    expect(fs.readFileSync(path.join(folder, 'a.md'), 'utf8')).toBe(unformatted);
    expect(run(folder, ['format', '--check', 'b.md']).code).toBe(0);
  });

  it('formats the standard input to the standard output with -', () => {
    expect(run(tree({}), ['format', '-'], unformatted)).toEqual({ code: 0, stdout: formatted, stderr: '' });
  });

  it('exits with 2 for a file that it cannot read, an unknown command and no file', () => {
    const folder = tree({});
    const missing = run(folder, ['format', 'missing.md']);
    expect(missing.code).toBe(2);
    expect(missing.stderr).toMatch(/^missing\.md: ENOENT/);
    expect(run(folder, ['lint', 'a.md']).code).toBe(2);
    expect(run(folder, ['format']).code).toBe(2);
  });

  it('shows the version of the npm package and of the format of the notes', () => {
    expect(run(tree({}), ['--version'])).toEqual({ code: 0, stdout: `markdown-notes ${cli.version} (format 1)\n`, stderr: '' });
  });
});
