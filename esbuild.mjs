// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// Bundle the extension into dist/extension.js, and the command markdownnotes,
// the formatter on the command line (docs/requirements.md, R-FMT-004), into
// cli/dist/markdownnotes.js, and the library of the formatter into
// cli/dist/index.js, the files of the npm package @nimblescape/markdownnotes of
// cli/, for Node.js 22 or later (engines of cli/package.json). npm puts the
// license of the folder of a package into the package, so the build copies
// LICENSE and THIRD-PARTY-NOTICES.md into cli/.
// The package of the extension holds no file of cli/. VS Code provides the module
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
const bundles = [
  { entryPoints: ['src/extension.ts'], outfile: 'dist/extension.js', target: 'node24' },
  { entryPoints: ['src/cli/main.ts'], outfile: 'cli/dist/markdownnotes.js', target: 'node22', banner: { js: '#!/usr/bin/env node' } },
  { entryPoints: ['src/cli/index.ts'], outfile: 'cli/dist/index.js', target: 'node22' },
];

fs.mkdirSync('cli/dist', { recursive: true });
fs.copyFileSync('LICENSE', 'cli/LICENSE');
fs.copyFileSync('THIRD-PARTY-NOTICES.md', 'cli/THIRD-PARTY-NOTICES.md');

for (const bundle of bundles) {
  // A production build writes no source map: remove the map of an earlier
  // development build, so that no map that does not match the bundle of the
  // production build stays in dist/.
  if (production) {
    fs.rmSync(`${bundle.outfile}.map`, { force: true });
  }
  await esbuild.build({
    ...bundle,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['vscode'],
    sourcemap: !production,
    minify: false,
    logLevel: 'info',
  });
}

// The visual editor of the side view (R-SIDE-004) runs in the page of the view: a bundle for the browser in
// dist/visualEditor.js, and its styles with the icon font of the editor in dist/visualEditor.css and
// dist/codicon.ttf. The editor loads `node:fs/promises` only on Node.js, which the page never runs, so the bundle
// leaves it out.
if (production) {
  fs.rmSync('dist/visualEditor.js.map', { force: true });
}
await esbuild.build({
  entryPoints: ['src/webview/visualEditor.ts'],
  outfile: 'dist/visualEditor.js',
  bundle: true,
  platform: 'browser',
  format: 'iife',
  target: 'chrome120',
  external: ['node:fs/promises'],
  sourcemap: !production,
  minify: false,
  logLevel: 'info',
});
await esbuild.build({
  entryPoints: ['src/webview/visualEditor.css'],
  outfile: 'dist/visualEditor.css',
  bundle: true,
  loader: { '.ttf': 'file' },
  assetNames: '[name]',
  minify: false,
  logLevel: 'info',
});
