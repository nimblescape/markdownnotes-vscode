// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// Builds the npm package of the formatter on the command line (docs/requirements.md, R-FMT-004), so that programs and
// AI agents run it with `npx -y nimblescape-markdown-notes format <file>`. The package holds the bundle dist/cli.js of
// a production build (`node esbuild.mjs --production`, which `npm run package:npm` runs first), its manifest with the
// name and the version of the extension, npm/README.md as its README, the license and the third-party notices, and no
// dependency. The script writes the files to out/npm/ and packs them with `npm pack` into
// nimblescape-markdown-notes-<version>.tgz in the root of the repository, which ci.yml keeps and the release
// publishes to npm. It publishes nothing.
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
/** The folder of the files of the package. */
export const OUT = 'out/npm';
/** The name of the program in the package, which is the name of the package, so that npx finds it. */
export const BIN = 'cli.js';
/** The oldest Node.js release that runs the tool; esbuild.mjs builds dist/cli.js for it. */
export const NODE = '20';

/**
 * The manifest of the npm package, from the manifest of the extension.
 * @param {Record<string, any>} extension - The manifest of the extension, package.json.
 * @returns {Record<string, any>}
 */
export function npmManifestOf(extension) {
  return {
    name: extension.name,
    version: extension.version,
    description:
      'The Markdown formatter of the VS Code extension nimblescape Markdown Notes on the command line, for programs and AI agents: paragraphs on one line, aligned tables, the notes kept as they are.',
    keywords: ['markdown', 'formatter', 'notes', 'footnotes', 'cli', 'ai-agents'],
    author: extension.author,
    license: extension.license,
    homepage: `${extension.repository.url.replace(/\.git$/, '')}/blob/main/docs/guide.md#formatter-on-the-command-line`,
    repository: extension.repository,
    bugs: extension.bugs,
    bin: { [extension.name]: BIN },
    files: [BIN, 'THIRD-PARTY-NOTICES.md'],
    engines: { node: `>=${NODE}` },
  };
}

// The tests import the parts above; only a start as a program builds the package.
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const extension = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const bundle = fs.readFileSync(path.join(ROOT, 'dist/cli.js'), 'utf8');
  if (!bundle.startsWith('#!/usr/bin/env node\n') || bundle.includes('//# sourceMappingURL=')) {
    console.error('dist/cli.js is not the bundle of a production build: run `node esbuild.mjs --production` first.');
    process.exit(1);
  }
  const out = path.join(ROOT, OUT);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'package.json'), `${JSON.stringify(npmManifestOf(extension), null, 2)}\n`);
  fs.writeFileSync(path.join(out, BIN), bundle, { mode: 0o755 });
  fs.copyFileSync(path.join(ROOT, 'npm/README.md'), path.join(out, 'README.md'));
  fs.copyFileSync(path.join(ROOT, 'LICENSE'), path.join(out, 'LICENSE'));
  fs.copyFileSync(path.join(ROOT, 'THIRD-PARTY-NOTICES.md'), path.join(out, 'THIRD-PARTY-NOTICES.md'));
  // npm runs as npm.cmd on Windows, which needs a shell.
  execFileSync('npm', ['pack', '--pack-destination', ROOT], { cwd: out, stdio: 'inherit', shell: process.platform === 'win32' });
}
