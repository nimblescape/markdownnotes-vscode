// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the parts of the extension that are files, not code: the
 * name and the entry point of the manifest, the contributions to the Markdown
 * preview, the commands and the buttons of the boxes, the settings and their
 * documentation, the files of the package, the third-party notices, the links
 * of the documents and the links to the requirements. No installed editor is
 * touched.
 */

import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import * as esbuild from 'esbuild';
import { expect, test, vi } from 'vitest';
import { commands, controllerId, noteContext } from './noteThreads';
import { defaultSettings, settingsSection } from './settings';

// The module of the threads imports the editor API; these tests read only its constants.
vi.mock('vscode', () => ({}));

/** repository is the root folder of this repository, which holds the manifest and the documents. */
const repository = path.resolve(__dirname, '..');

/**
 * read returns the text of a file of the repository.
 * @param file - The path of the file, relative to the repository.
 */
const read = (file: string): string => fs.readFileSync(path.join(repository, file), 'utf8');

/** manifest is the extension manifest. */
const manifest = JSON.parse(read('package.json'));

/**
 * markdownLinks returns the targets of the inline links of a Markdown text outside code blocks and code spans.
 * @param text - The Markdown text.
 */
const markdownLinks = (text: string): string[] => {
  const prose = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
  return [...prose.matchAll(/\]\(([^)\s]+)\)/g)].map((match) => match[1]);
};

/**
 * anchorOf returns the anchor of a heading as GitHub writes it: lower case, without punctuation, with hyphens for
 * spaces.
 * @param heading - The text of the heading.
 */
const anchorOf = (heading: string): string => `#${heading.toLowerCase().replace(/[^\p{L}\p{N} -]/gu, '').replace(/ /g, '-')}`;

/**
 * sourceFiles returns the TypeScript files of a folder of the repository and its subfolders.
 * @param folder - The folder, relative to the repository.
 */
const sourceFiles = (folder: string): string[] =>
  fs
    .readdirSync(path.join(repository, folder), { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith('.ts'))
    .map((file) => path.join(folder, file));

test('the manifest follows the naming scheme of the publisher nimblescape', () => {
  expect(manifest.publisher).toBe('nimblescape');
  expect(manifest.name).toBe('nimblescape-markdown-note');
  expect(manifest.displayName).toBe('nimblescape Markdown Note');
  expect(manifest.repository.url).toBe(`https://github.com/nimblescape/${manifest.name}.git`);
  expect(manifest.bugs.url).toBe(`https://github.com/nimblescape/${manifest.name}/issues`);
  expect(manifest.qna).toBe(`https://github.com/nimblescape/${manifest.name}/issues`);
  expect(manifest.license).toBe('MIT');
});

test('the entry point is the bundle that esbuild.mjs writes', () => {
  expect(manifest.main).toBe('./dist/extension.js');
  expect(read('esbuild.mjs')).toContain(`const outfile = '${manifest.main.slice(2)}';`);
});

test('the icon is a PNG of 256 × 256 pixels, because the Marketplace takes no SVG icon', () => {
  expect(manifest.icon).toBe('resources/icon.png');
  const png = fs.readFileSync(path.join(repository, manifest.icon));
  expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([256, 256]);
});

test('the extension starts with the Markdown files, and adds its plugin and its styles to the Markdown preview (R-PREV-001)', () => {
  expect(manifest.activationEvents).toEqual(['onLanguage:markdown']);
  expect(manifest.contributes['markdown.markdownItPlugins']).toBe(true);
  expect(manifest.contributes['markdown.previewStyles']).toEqual(['./media/markdownPreview.css']);
  expect(fs.existsSync(path.join(repository, 'media/markdownPreview.css'))).toBe(true);
});

test('the manifest contributes the commands of the buttons of the boxes, for the comment controller of the notes only', () => {
  const contributed = manifest.contributes.commands.map((command: { command: string }) => command.command);
  expect([...contributed].sort()).toEqual(Object.values(commands).sort());
  const menus = manifest.contributes.menus;
  const items = ['comments/commentThread/context', 'comments/comment/title', 'comments/comment/context'].flatMap((menu) => menus[menu]);
  expect(items.map((item: { command: string }) => item.command).sort()).toEqual(Object.values(commands).sort());
  for (const item of items) {
    expect(item.when, item.command).toMatch(new RegExp(`^commentController == ${controllerId.replace(/\./g, '\\.')}( |$)`));
  }
  // Edit Note and Delete Note are buttons of a written note only, not of a new note that was not written yet.
  for (const item of menus['comments/comment/title']) {
    expect(item.when, item.command).toContain(`comment == ${noteContext}`);
  }
  // The first button of a box is its primary button, which Ctrl+Enter in the editor of the box runs.
  expect(menus['comments/commentThread/context'][0].command).toBe(commands.addNote);
  expect(menus['comments/comment/context'][0].command).toBe(commands.saveNote);
  // The buttons need the box of their note, so the Command Palette shows none of the commands.
  expect(menus.commandPalette).toEqual(Object.values(commands).map((command) => ({ command, when: 'false' })));
});

test('the extension uses no proposed API, and the API of the oldest VS Code version that it supports (R-GEN-002)', () => {
  // The Marketplace does not accept an extension that enables a proposed API.
  expect(manifest).not.toHaveProperty('enabledApiProposals');
  // The types of the API are those of the version in engines.vscode, so the code compiles only with its API.
  expect(manifest.engines.vscode).toMatch(/^\^\d+\.\d+\.0$/);
  expect(manifest.devDependencies['@types/vscode']).toBe(`~${manifest.engines.vscode.slice(1)}`);
});

test('the extension runs in Restricted Mode and in virtual workspaces (R-GEN-003)', () => {
  expect(manifest.capabilities.untrustedWorkspaces.supported).toBe(true);
  expect(manifest.capabilities.virtualWorkspaces.supported).toBe(true);
  expect(manifest.extensionKind).toEqual(['workspace']);
});

test('the manifest contributes the settings of src/settings.ts with their defaults', () => {
  const properties = manifest.contributes.configuration.properties;
  const contributed = Object.fromEntries(Object.entries<any>(properties).map(([key, value]) => [key, value.default]));
  const expected = Object.fromEntries(Object.entries(defaultSettings).map(([key, value]) => [`${settingsSection}.${key}`, value]));
  expect(contributed).toEqual(expected);
});

test('the README and the guide name every setting that the manifest contributes', () => {
  for (const setting of Object.keys(manifest.contributes.configuration.properties)) {
    expect(read('README.md'), `README.md does not name ${setting}`).toContain(`\`${setting}\``);
    expect(read('docs/guide.md'), `docs/guide.md does not name ${setting}`).toContain(`\`${setting}\``);
  }
});

test('the package holds the bundle, the preview styles, the icon and the documents only', () => {
  const patterns = read('.vscodeignore')
    .split('\n')
    .filter((line) => line && !line.startsWith('#'));
  expect(patterns).toEqual([
    '**',
    '!dist/extension.js',
    '!media/markdownPreview.css',
    '!resources/icon.png',
    '!package.json',
    '!README.md',
    '!CHANGELOG.md',
    '!SUPPORT.md',
    '!LICENSE',
    '!THIRD-PARTY-NOTICES.md',
  ]);
  for (const pattern of patterns.filter((pattern) => pattern.startsWith('!') && !pattern.startsWith('!dist/'))) {
    expect(fs.existsSync(path.join(repository, pattern.slice(1))), pattern).toBe(true);
  }
});

test('the package needs no dependency at run time, because the bundle holds markdown-it', () => {
  expect(manifest).not.toHaveProperty('dependencies');
  expect(manifest.scripts.package).toBe('vsce package --no-dependencies');
});

test('the third-party notices name every package that the build bundles, with its version and license (R-GEN-004)', async () => {
  const notices = read('THIRD-PARTY-NOTICES.md');
  const result = await esbuild.build({
    entryPoints: [path.join(repository, 'src/extension.ts')],
    bundle: true,
    platform: 'node',
    external: ['vscode'],
    write: false,
    metafile: true,
    logLevel: 'silent',
  });
  const packages = new Set<string>();
  for (const input of Object.keys(result.metafile.inputs)) {
    // The folder of the package is the part of the path up to the name after the last node_modules.
    const folder = /^(.*node_modules\/(?:@[^/]+\/)?[^/]+)\//.exec(input)?.[1];
    if (folder) {
      packages.add(folder);
    }
  }
  expect(packages.size).toBeGreaterThan(0);
  const headings = [...notices.matchAll(/^## (.+)$/gm)].map((match) => anchorOf(match[1]));
  for (const folder of packages) {
    const { name, version, license } = JSON.parse(fs.readFileSync(path.join(repository, folder, 'package.json'), 'utf8'));
    const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const row = new RegExp(String.raw`^\| \[${escape(name)}\]\((#[^)]+)\) \| ${escape(version)} \| ${escape(license)} \|$`, 'm').exec(notices);
    expect(row, name).not.toBeNull();
    expect(headings, name).toContain(row![1]);
    expect(notices, name).toContain(`\n## ${name}\n`);
  }
});

test('the documents of the package use full links, so that each link works in the repository, in the package and on the Marketplace', () => {
  for (const file of ['README.md', 'CHANGELOG.md', 'SUPPORT.md']) {
    for (const target of markdownLinks(read(file))) {
      expect(target, `${file}: ${target}`).toMatch(/^https:\/\//);
    }
  }
});

test('the images of the README are GIF or PNG files of docs/images/ on the branch main, as the Marketplace requires', () => {
  // The Marketplace shows no SVG image and no image with a relative address.
  const base = `https://raw.githubusercontent.com/nimblescape/${manifest.name}/main/`;
  const signatures = { gif: 'GIF8', png: '\x89PNG' };
  const images = [...read('README.md').matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)].map((match) => match[1]);
  expect(images.length).toBeGreaterThan(0);
  for (const image of images) {
    const match = new RegExp(String.raw`^${base.replace(/[.]/g, '\\.')}docs/images/[\w-]+\.(gif|png)$`).exec(image);
    expect(match, image).not.toBe(null);
    const file = fs.readFileSync(path.join(repository, image.slice(base.length)));
    expect(file.subarray(0, 4).toString('latin1'), `${image} is no ${match![1]} file`).toBe(signatures[match![1] as 'gif' | 'png']);
  }
});

test('the description adds no search tag, for example of another programming language', async () => {
  // vsce adds a tag for each of its keywords that the description contains, for example "java" for "Java".
  const { TagsProcessor } = createRequire(__filename)('@vscode/vsce/out/package');
  const tags = async (description: string): Promise<string[]> => {
    const processor = new TagsProcessor({ ...manifest, description });
    await processor.onEnd();
    return processor.tags;
  };
  expect(await tags(manifest.description)).toEqual(await tags(''));
});

test('every requirement has a unique ID, and every link to a requirement names an existing one', () => {
  const requirements = read('docs/requirements.md');
  const ids = [...requirements.matchAll(/^### (R-[A-Z]+-\d{3})$/gm)].map((match) => match[1]);
  expect(ids.length).toBeGreaterThan(0);
  expect(new Set(ids).size).toBe(ids.length);
  const anchors = new Set(ids.map((id) => `#${id.toLowerCase()}`));
  for (const target of markdownLinks(requirements).filter((target) => target.startsWith('#r-'))) {
    expect(anchors.has(target), target).toBe(true);
  }
  for (const file of ['docs/guide.md', 'docs/security.md', 'CONTRIBUTING.md']) {
    for (const target of markdownLinks(read(file)).filter((target) => /requirements\.md#/.test(target))) {
      expect(anchors.has(target.slice(target.indexOf('#'))), `${file}: ${target}`).toBe(true);
    }
  }
  // The comments of the code link to the requirements that the code implements.
  for (const file of sourceFiles('src')) {
    for (const [, target] of read(file).matchAll(/\]\((?:\.\.\/)+docs\/requirements\.md(#[^)]+)\)/g)) {
      expect(anchors.has(target), `${file}: ${target}`).toBe(true);
    }
  }
  // An ID that a test or the code names without a link exists too.
  for (const file of [...sourceFiles('src'), ...sourceFiles('test')]) {
    for (const [id] of read(file).matchAll(/\bR-[A-Z]+-\d{3}\b/g)) {
      expect(ids, `${file}: ${id}`).toContain(id);
    }
  }
});

test('every link of the user guide to one of its sections names an existing heading', () => {
  const guide = read('docs/guide.md');
  const anchors = new Set([...guide.matchAll(/^#{2,4} (.+)$/gm)].map((match) => anchorOf(match[1])));
  for (const target of markdownLinks(guide).filter((target) => target.startsWith('#'))) {
    expect(anchors.has(target), target).toBe(true);
  }
});
