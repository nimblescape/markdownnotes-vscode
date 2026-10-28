// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// Bundle the extension into dist/extension.js. VS Code provides the module
// `vscode` at run time, so the bundle leaves it out; markdown-it, which the
// extension uses to find the notes of a document as the preview does, is part
// of the bundle. The bundle is readable JavaScript: not minified, so that it
// keeps the names of the source and anyone can read the code of the package
// and compare it with the source (CONTRIBUTING.md, "Reviewing the package").
// The option `keepNames` stays off: without minification the names of the
// source stay, and no code of the extension reads the name of a function at
// run time. Only a development build writes a source map; a production build
// (--production, which vscode:prepublish passes) has none.

import * as fs from 'fs';
import * as esbuild from 'esbuild';

const production = process.argv.includes('--production');
const outfile = 'dist/extension.js';

// A production build writes no source map: remove the map of an earlier
// development build, so that no map that does not match the bundle of the
// production build stays in dist/.
if (production) {
  fs.rmSync(`${outfile}.map`, { force: true });
}

await esbuild.build({
  entryPoints: ['src/extension.ts'],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node24',
  external: ['vscode'],
  sourcemap: !production,
  minify: false,
  logLevel: 'info',
});
