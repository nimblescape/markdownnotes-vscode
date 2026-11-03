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
    // The ES module of a package before its CommonJS file: the UMD file of jsonc-parser, which the adapter of
    // nimblescape Markdown brings in, loads its parts with a require that the bundle cannot resolve.
    mainFields: ['module', 'main'],
    external: ['vscode'],
    sourcemap: !production,
    minify: false,
    logLevel: 'info',
  });
}

// The visual editor of the side view (R-SIDE-004) runs in the page of the view: a bundle for the browser in
// dist/visualEditor.js with the editor of rendered Markdown of nimblescape Markdown, and its styles in
// dist/visualEditor.css. The icons of the editor are part of its script. The build removes the icon font of the
// editor of an earlier version, dist/codicon.ttf, so that no file of an earlier build stays in the package.
fs.rmSync('dist/codicon.ttf', { force: true });
// The editor of a whole file (R-TEXT-010) runs in the page of its custom editor: a bundle for the browser in
// dist/editor.js with the same editor and the plugin of the notes; it uses the styles of the visual editor.
for (const name of ['visualEditor', 'editor']) {
  if (production) {
    fs.rmSync(`dist/${name}.js.map`, { force: true });
  }
  await esbuild.build({
    entryPoints: [`src/webview/${name}.ts`],
    outfile: `dist/${name}.js`,
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: 'chrome120',
    sourcemap: !production,
    minify: false,
    logLevel: 'info',
  });
}
await esbuild.build({
  entryPoints: ['src/webview/visualEditor.css'],
  outfile: 'dist/visualEditor.css',
  bundle: true,
  minify: false,
  logLevel: 'info',
});
