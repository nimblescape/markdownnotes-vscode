// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The manifest of the npm package of the formatter on the command line (R-FMT-004), from scripts/npm-package.mjs.
import * as fs from 'fs';
import { describe, expect, it } from 'vitest';
import { BIN, NODE, npmManifestOf } from './npm-package.mjs';

const extension = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const manifest = npmManifestOf(extension);

describe('the npm package', () => {
  it('has the name and the version of the extension, and its program has the name of the package, for npx', () => {
    expect(manifest.name).toBe('nimblescape-markdown-notes');
    expect(manifest.version).toBe(extension.version);
    expect(manifest.bin).toEqual({ [manifest.name]: BIN });
  });

  it('holds only the bundle and the notices besides the README and the license, and has no dependency', () => {
    expect(manifest.files).toEqual(['cli.js', 'THIRD-PARTY-NOTICES.md']);
    for (const field of ['dependencies', 'devDependencies', 'scripts', 'main', 'contributes']) {
      expect(manifest).not.toHaveProperty(field);
    }
    expect(manifest.license).toBe('MIT');
    expect(manifest.repository).toEqual(extension.repository);
  });

  it('needs the Node.js release that esbuild.mjs builds the bundle for', () => {
    expect(manifest.engines).toEqual({ node: `>=${NODE}` });
    expect(fs.readFileSync(new URL('../esbuild.mjs', import.meta.url), 'utf8')).toContain(
      `outfile: 'dist/cli.js', target: 'node${NODE}'`,
    );
  });

  it('links to the section of the guide that its README and the guide name', () => {
    const guide = fs.readFileSync(new URL('../docs/guide.md', import.meta.url), 'utf8');
    expect(manifest.homepage).toBe(
      'https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/guide.md#formatter-on-the-command-line',
    );
    expect(guide).toContain('### Formatter on the command line');
    const readme = fs.readFileSync(new URL('../npm/README.md', import.meta.url), 'utf8');
    expect(readme).toContain(`npx -y ${manifest.name} format`);
    expect(readme).toContain(`Node.js ${NODE} or later`);
  });
});
