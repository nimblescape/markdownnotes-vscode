// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

import { describe, expect, test } from 'vitest';
import { missingMessage, referencePath, referencesOf, sourceFilesOf } from './repos';

/** commit and other are commits of the clone of a test. */
const commit = 'a'.repeat(40);
const other = 'b'.repeat(40);

/** paper is the front matter of a paper with two references, as `mp get` writes it. */
const paper = ['---', 'title: The server of the project', 'layout: majikmate/markdownpaper-layout-pht/thesis@main', 'repos:', '  server: org/server@v2.1.0', '  client: org/client', '---', '', '# Title'];

/**
 * sourceOf returns a source that reads the files of a map, by their paths relative to the Markdown file.
 * @param files - The texts by their paths.
 */
const sourceOf = (files: Record<string, string>) => (path: string) => files[path];

describe('the references of the front matter (R-CODE-006)', () => {
  test('are the entries under repos, with the owner, the repository and the rev', () => {
    expect(referencesOf(paper)).toEqual(
      new Map([
        ['server', { owner: 'org', repo: 'server', rev: 'v2.1.0' }],
        ['client', { owner: 'org', repo: 'client' }],
      ]),
    );
  });

  test('can be quoted, have comments, and stand in a map of a flow', () => {
    expect(referencesOf(['---', 'repos:  # the other repositories', '  # the server first', '  "server": \'org/server@main\'  ', '  api: org/api.git@1234567 # pinned', 'title: x', '---'])).toEqual(
      new Map([
        ['server', { owner: 'org', repo: 'server', rev: 'main' }],
        ['api', { owner: 'org', repo: 'api', rev: '1234567' }],
      ]),
    );
    expect(referencesOf(['---', 'repos: { server: org/server@v2.1.0, client: org/client }', '---'])).toEqual(
      new Map([
        ['server', { owner: 'org', repo: 'server', rev: 'v2.1.0' }],
        ['client', { owner: 'org', repo: 'client' }],
      ]),
    );
  });

  test('can have the older prefix github:, which mp get reads too', () => {
    expect(referencesOf(['---', 'repos:', '  server: github:org/server@v2.1.0', '---'])).toEqual(new Map([['server', { owner: 'org', repo: 'server', rev: 'v2.1.0' }]]));
  });

  test('leave out values that are no references, and a text without a YAML front matter has none', () => {
    expect(referencesOf(['---', 'repos:', '  server: https://github.com/org/server', '  ../x: org/x', '  ok: org/ok@v1', '---'])).toEqual(new Map([['ok', { owner: 'org', repo: 'ok', rev: 'v1' }]]));
    expect(referencesOf(['# Title', '', 'repos:', '  server: org/server'])).toEqual(new Map());
    expect(referencesOf(['+++', 'repos = 1', '+++'])).toEqual(new Map());
    expect(referencesOf(['---', 'title: x', '---', 'repos:', '  server: org/server'])).toEqual(new Map());
  });

  test('a path of a listing names a reference before a colon, and a path of the paper repository has none', () => {
    expect(referencePath('server:src/api.ts')).toEqual({ name: 'server', path: 'src/api.ts' });
    expect(referencePath('server:./src/api.ts')).toEqual({ name: 'server', path: 'src/api.ts' });
    expect(referencePath('../src/api.ts')).toBeUndefined();
    expect(referencePath('https://example.com/a.ts')).toBeUndefined();
  });
});

describe('the files of the listings (R-CODE-006)', () => {
  test('of the paper repository keep their paths', () => {
    const files = sourceFilesOf(paper, sourceOf({}));
    expect(files('../src/fields.ts')).toEqual({ path: '../src/fields.ts', address: '../src/fields.ts', pattern: '\\.\\./src/fields\\.ts' });
  });

  test('of another repository are in its clone in the folder of the file or above it, with the address on GitHub at the commit of the clone', () => {
    const files = sourceFilesOf(paper, sourceOf({ '../../.markdownpaper/repos/server/.git/HEAD': `${commit}\n` }));
    expect(files('server:src/api.ts')).toEqual({
      path: '../../.markdownpaper/repos/server/src/api.ts',
      address: `https://github.com/org/server/blob/${commit}/src/api.ts`,
      pattern: 'https://github\\.com/org/server/blob/[^/\\s()]+/src/api\\.ts',
      reference: 'server',
    });
    // The clone in the folder of the file comes first.
    const near = sourceFilesOf(paper, sourceOf({ '.markdownpaper/repos/server/.git/HEAD': other, '../../.markdownpaper/repos/server/.git/HEAD': commit }));
    expect(near('server:src/api.ts')).toMatchObject({ path: '.markdownpaper/repos/server/src/api.ts', address: `https://github.com/org/server/blob/${other}/src/api.ts` });
  });

  test('take the commit of the branch of a clone that is not detached, from refs or from packed-refs', () => {
    const loose = sourceFilesOf(paper, sourceOf({ '.markdownpaper/repos/server/.git/HEAD': 'ref: refs/heads/main\n', '.markdownpaper/repos/server/.git/refs/heads/main': `${commit}\n` }));
    expect(loose('server:a.ts')).toMatchObject({ address: `https://github.com/org/server/blob/${commit}/a.ts` });
    const packed = sourceFilesOf(
      paper,
      sourceOf({ '.markdownpaper/repos/server/.git/HEAD': 'ref: refs/heads/main', '.markdownpaper/repos/server/.git/packed-refs': `# pack-refs with: peeled fully-peeled sorted\n${other} refs/heads/main\n` }),
    );
    expect(packed('server:a.ts')).toMatchObject({ address: `https://github.com/org/server/blob/${other}/a.ts` });
    // Without a commit, the address takes the rev of the reference.
    const unknown = sourceFilesOf(paper, sourceOf({ '.markdownpaper/repos/server/.git/HEAD': 'ref: refs/heads/gone' }));
    expect(unknown('server:a.ts')).toMatchObject({ address: 'https://github.com/org/server/blob/v2.1.0/a.ts' });
  });

  test('of a name that the front matter does not name, of a reference without a clone, or with .. in the path are missing, with messages that name the commands of the agents', () => {
    const files = sourceFilesOf(paper, sourceOf({ '.markdownpaper/repos/server/.git/HEAD': commit }));
    expect(files('tools:a.ts')).toEqual({ problem: 'reference', reference: 'tools' });
    expect(files('client:a.ts')).toEqual({ problem: 'clone', reference: 'client' });
    expect(files('server:../secret.ts')).toEqual({ problem: 'path', reference: 'server' });
    expect(missingMessage({ problem: 'reference', reference: 'tools' })).toBe('"tools" is no reference under repos in the front matter. Add it with: npx -y @nimblescape/markdownpaper get owner/repo@rev --name tools, and the path of the Markdown file when the project has more than one paper.');
    expect(missingMessage({ problem: 'clone', reference: 'client' })).toBe('The repository "client" is not cloned. Clone it with: npx -y @nimblescape/markdownpaper get');
  });
});
