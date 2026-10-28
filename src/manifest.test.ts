// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the parts of the extension that are files, not code: the
 * name and the entry point of the manifest, the contributions to the Markdown
 * preview, the commands and the buttons of the boxes, the side view, the
 * settings and their documentation, the files of the package, the third-party notices, the links
 * of the documents and the links to the requirements. No installed editor is
 * touched.
 */

import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import * as esbuild from 'esbuild';
import { expect, test, vi } from 'vitest';
import { extensionId, openPath, previewCommands } from './extension';
import { deleteCommands, editorCommands, markerContexts } from './noteEditor';
import { commands, controllerId, draftContext, foldedContext, noteContext } from './noteThreads';
import { notesViewId, viewCommands } from './notesView';
import { defaultSettings, linkTargets, notePlaces, settingsSection } from './settings';

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
  expect(manifest.name).toBe('nimblescape-markdown-notes');
  expect(manifest.displayName).toBe('nimblescape Markdown Notes');
  expect(manifest.repository.url).toBe(`https://github.com/nimblescape/${manifest.name}.git`);
  expect(manifest.bugs.url).toBe(`https://github.com/nimblescape/${manifest.name}/issues`);
  expect(manifest.qna).toBe(`https://github.com/nimblescape/${manifest.name}/issues`);
  expect(manifest.license).toBe('MIT');
});

test('the identifier of the extension in the links of the preview is the publisher and the name of the manifest (R-PREV-003)', () => {
  expect(extensionId).toBe(`${manifest.publisher}.${manifest.name}`);
  expect(openPath).toBe('/open');
  // VS Code starts the extension for a link of the preview also before a Markdown file opens.
  expect(manifest.activationEvents).toContain('onUri');
});

test('the entry point is the bundle that esbuild.mjs writes', () => {
  expect(manifest.main).toBe('./dist/extension.js');
  expect(read('esbuild.mjs')).toContain(`entryPoints: ['src/extension.ts'], outfile: '${manifest.main.slice(2)}'`);
});

test('the icon is a PNG of 256 × 256 pixels, because the Marketplace takes no SVG icon', () => {
  expect(manifest.icon).toBe('resources/icon.png');
  const png = fs.readFileSync(path.join(repository, manifest.icon));
  expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([256, 256]);
});

test('the extension starts with the Markdown files, and adds its plugin, its styles and its script to the Markdown preview (R-PREV-001, R-PREV-002)', () => {
  expect(manifest.activationEvents).toEqual(['onLanguage:markdown', 'onUri']);
  expect(manifest.contributes['markdown.markdownItPlugins']).toBe(true);
  expect(manifest.contributes['markdown.previewStyles']).toEqual(['./media/markdownPreview.css']);
  expect(manifest.contributes['markdown.previewScripts']).toEqual(['./media/markdownPreview.js']);
  for (const file of ['media/markdownPreview.css', 'media/markdownPreview.js']) {
    expect(fs.existsSync(path.join(repository, file)), file).toBe(true);
  }
});

test('the manifest contributes the side view "Notes" in a container of its own in the secondary side bar only (R-SIDE-001)', () => {
  // The secondary side bar holds the chat of VS Code; the primary side bar stays free for the Explorer.
  expect(Object.keys(manifest.contributes.viewsContainers)).toEqual(['secondarySidebar']);
  const [container] = manifest.contributes.viewsContainers.secondarySidebar;
  expect(manifest.contributes.viewsContainers.secondarySidebar).toHaveLength(1);
  expect(container).toMatchObject({ id: 'nimblescape-markdown-notes', title: 'Markdown Notes', icon: 'resources/notes-view.svg' });
  expect(read(container.icon)).toMatch(/^<svg [^>]*viewBox="0 0 24 24"/m);
  // The setting showNotesIn "inline" shows the text of the notes only in the boxes, without the side view (R-GEN-009).
  expect(manifest.contributes.views).toEqual({
    [container.id]: [{ type: 'webview', id: notesViewId, name: 'Notes', when: `config.${settingsSection}.showNotesIn != inline` }],
  });
  for (const file of ['media/notesView.js', 'media/notesView.css']) {
    expect(fs.existsSync(path.join(repository, file)), file).toBe(true);
  }
});

test('the manifest contributes the commands of the boxes, of the folds, of the side view and of the preview, and no other', () => {
  const contributed = manifest.contributes.commands.map((command: { command: string }) => command.command);
  expect([...contributed].sort()).toEqual(
    [
      ...Object.values(commands),
      ...Object.values(editorCommands),
      ...Object.values(deleteCommands),
      ...Object.values(viewCommands),
      ...Object.values(previewCommands),
    ].sort(),
  );
});

test('Backspace and Delete next to a hidden marker run the commands of the extension, which the Command Palette does not show (R-NOTE-006)', () => {
  const base = 'editorTextFocus && !editorReadonly && editorLangId == markdown && !editorHasSelection && !editorHasMultipleSelections';
  expect(manifest.contributes.keybindings).toEqual([
    { command: deleteCommands.left, key: 'backspace', when: `${base} && ${markerContexts.left}` },
    { command: deleteCommands.right, key: 'delete', when: `${base} && ${markerContexts.right}` },
    { command: deleteCommands.wordLeft, key: 'ctrl+backspace', mac: 'alt+backspace', when: `${base} && ${markerContexts.left}` },
    { command: deleteCommands.wordRight, key: 'ctrl+delete', mac: 'alt+delete', when: `${base} && ${markerContexts.right}` },
  ]);
  expect(manifest.contributes.menus.commandPalette).toEqual(expect.arrayContaining(Object.values(deleteCommands).map((command) => ({ command, when: 'false' }))));
});

test('the manifest contributes the buttons of the boxes, for the comment controller of the notes only', () => {
  const menus = manifest.contributes.menus;
  const items = ['comments/commentThread/context', 'comments/commentThread/title', 'comments/comment/title', 'comments/comment/context'].flatMap(
    (menu) => menus[menu],
  );
  // A box has the buttons "Hide Note Text" and "Show Note Text" of the folds besides the buttons of the threads.
  expect(items.map((item: { command: string }) => item.command).sort()).toEqual([...Object.values(commands), editorCommands.collapseNote, editorCommands.expandNote].sort());
  for (const item of items) {
    expect(item.when, item.command).toMatch(new RegExp(`^commentController == ${controllerId.replace(/\./g, '\\.')}( |$)`));
  }
  // Edit and Delete are buttons of a written answer only, and Delete Thread of a written note only, whose text shows or
  // is folded, not of a text that was not written yet. "Hide Note Text" shows while the text of the note shows, and
  // "Show Note Text" while it is folded.
  for (const item of menus['comments/comment/title']) {
    expect(item.when, item.command).toContain(`comment == ${noteContext}`);
  }
  const titles = Object.fromEntries(
    menus['comments/commentThread/title'].map((item: { command: string; when: string }) => [item.command, item.when.replace(/^commentController == \S+ && /, '')]),
  );
  // The setting keepNotesCollapsed hides both, because then the text of a note shows in the side view only (R-TEXT-005).
  const kept = `!config.${settingsSection}.keepNotesCollapsed`;
  expect(titles).toEqual({
    [editorCommands.collapseNote]: `commentThread == ${noteContext} && ${kept}`,
    [editorCommands.expandNote]: `commentThread == ${foldedContext} && ${kept}`,
    [commands.deleteNote]: expect.stringMatching(/^commentThread =~ \/.*\/$/),
  });
  const written = new RegExp(/^commentThread =~ \/(.*)\/$/.exec(titles[commands.deleteNote])![1]);
  expect([noteContext, foldedContext, draftContext].map((value) => written.test(value))).toEqual([true, true, false]);
  // The first button of a box is its primary button, which Ctrl+Enter in the editor of the box runs: Add Note in a new
  // thread, Answer in the thread of a note.
  const replies = menus['comments/commentThread/context'];
  expect(replies.find((item: { when: string }) => / commentThreadIsEmpty$/.test(item.when)).command).toBe(commands.addNote);
  expect(replies.find((item: { when: string }) => /!commentThreadIsEmpty$/.test(item.when)).command).toBe(commands.answer);
  expect(menus['comments/comment/context'][0].command).toBe(commands.saveAnswer);
  // The buttons need the box of their note, so the Command Palette shows none of the commands.
  expect(menus.commandPalette).toEqual(expect.arrayContaining(Object.values(commands).map((command) => ({ command, when: 'false' }))));
  expect(menus.commandPalette).toEqual(
    expect.arrayContaining([
      { command: editorCommands.collapseNote, when: `editorLangId == markdown && ${kept}` },
      { command: editorCommands.collapseAll, when: 'editorLangId == markdown' },
      { command: editorCommands.expandAll, when: `editorLangId == markdown && ${kept}` },
    ]),
  );
});

test('the title of the Markdown preview has the buttons that show or hide its notes, after the setting showInPreview, and its icons, after the setting showIconsInPreview (R-PREV-005, R-PREV-007)', () => {
  const setting = `config.${settingsSection}.showInPreview`;
  const icons = `config.${settingsSection}.showIconsInPreview`;
  // VS Code shows a Markdown file in the preview to the side, or in the modes "Markdown Preview" and "Markdown Editor"
  // of its editor, which are custom editors; the mode "Markdown Editor" does not render the notes (R-PREV-005).
  const preview = "activeWebviewPanelId == 'markdown.preview' || activeCustomEditorId == 'vscode.markdown.preview.editor'";
  const markdown = `editorLangId == markdown || ${preview} || activeCustomEditorId == 'vscode.markdown.editor'`;
  expect(manifest.contributes.menus['editor/title']).toEqual([
    { command: viewCommands.toggle, group: 'navigation', when: `(${markdown}) && config.${settingsSection}.showNotesIn != inline` },
    { command: previewCommands.show, group: 'navigation', when: `(${preview}) && !${setting}` },
    { command: previewCommands.hide, group: 'navigation', when: `(${preview}) && ${setting}` },
    // The buttons of the icons show only while the preview shows the notes.
    { command: previewCommands.showIcons, group: 'navigation', when: `(${preview}) && ${setting} && !${icons}` },
    { command: previewCommands.hideIcons, group: 'navigation', when: `(${preview}) && ${setting} && ${icons}` },
  ]);
  expect(manifest.contributes.menus.commandPalette).toEqual(
    expect.arrayContaining([
      { command: previewCommands.show, when: `!${setting}` },
      { command: previewCommands.hide, when: setting },
      { command: previewCommands.showIcons, when: `${setting} && !${icons}` },
      { command: previewCommands.hideIcons, when: `${setting} && ${icons}` },
    ]),
  );
  const iconOf = (command: string) => manifest.contributes.commands.find((item: { command: string }) => item.command === command).icon;
  expect([previewCommands.show, previewCommands.hide].map(iconOf)).toEqual(['$(eye)', '$(eye-closed)']);
  expect([previewCommands.showIcons, previewCommands.hideIcons].map(iconOf)).toEqual(['$(comment-draft)', '$(comment)']);
});

test('the title of the side view has the button "Hide Notes" where VS Code shows none, and the Markdown editors the button "Show or Hide Notes" (R-SIDE-006)', () => {
  const [container] = manifest.contributes.viewsContainers.secondarySidebar;
  const item = manifest.contributes.menus['view/title'].find((candidate: { command: string }) => candidate.command === viewCommands.hide);
  expect(item).toMatchObject({ command: viewCommands.hide, group: 'navigation@9' });
  // VS Code shows its own button "Hide Secondary Side Bar" in the title of the secondary side bar while the activity bar
  // has its default place, so the button of the view shows only for another place, and only while the view is there.
  expect(item.when).toBe(`view == ${notesViewId} && activeAuxiliary == 'workbench.view.extension.${container.id}' && config.workbench.activityBar.location != 'default'`);
  expect(manifest.contributes.menus.commandPalette).toEqual(expect.arrayContaining([{ command: viewCommands.hide, when: 'false' }]));
  expect(manifest.contributes.menus.commandPalette.some((item: { command: string }) => item.command === viewCommands.toggle)).toBe(false);
  // The button in the title of the text editor and of the preview of a Markdown file shows a codicon.
  expect(manifest.contributes.menus['editor/title']).toEqual(expect.arrayContaining([expect.objectContaining({ command: viewCommands.toggle })]));
  expect(manifest.contributes.commands.find((command: { command: string }) => command.command === viewCommands.toggle).icon).toBe('$(comment-discussion)');
});

test('the title of the side view has the button "Show Funnels" or "Hide Funnels" after the setting showFunnels (R-SIDE-007)', () => {
  const buttons = manifest.contributes.menus['view/title'].filter((item: { command: string }) => item.command !== viewCommands.hide);
  expect(buttons).toEqual([
    { command: viewCommands.showFunnels, group: 'navigation@1', when: `view == ${notesViewId} && !config.${settingsSection}.showFunnels` },
    { command: viewCommands.hideFunnels, group: 'navigation@1', when: `view == ${notesViewId} && config.${settingsSection}.showFunnels` },
  ]);
  expect(manifest.contributes.menus.commandPalette).toEqual(
    expect.arrayContaining([
      { command: viewCommands.showFunnels, when: `!config.${settingsSection}.showFunnels` },
      { command: viewCommands.hideFunnels, when: `config.${settingsSection}.showFunnels` },
    ]),
  );
});

test('the extension is the default formatter of Markdown files, which VS Code runs on each save, and the user can change both (R-FMT-001)', () => {
  expect(manifest.contributes.configurationDefaults['[markdown]']).toEqual({ 'editor.defaultFormatter': extensionId, 'editor.formatOnSave': true });
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
  // A setting of a choice offers the values that src/settings.ts takes, each with a description.
  for (const [key, values] of [
    ['showNotesIn', notePlaces],
    ['openLinksIn', linkTargets],
  ] as const) {
    const property = properties[`${settingsSection}.${key}`];
    expect(property.enum, key).toEqual([...values]);
    expect(property.enumDescriptions, key).toHaveLength(values.length);
  }
});

test('the README and the guide name every setting that the manifest contributes', () => {
  for (const setting of Object.keys(manifest.contributes.configuration.properties)) {
    expect(read('README.md'), `README.md does not name ${setting}`).toContain(`\`${setting}\``);
    expect(read('docs/guide.md'), `docs/guide.md does not name ${setting}`).toContain(`\`${setting}\``);
  }
});

test('the package holds the bundle, the styles and the scripts of the preview and the side view, the icons and the documents only', () => {
  const patterns = read('.vscodeignore')
    .split('\n')
    .filter((line) => line && !line.startsWith('#'));
  expect(patterns).toEqual([
    '**',
    '!dist/extension.js',
    '!media/markdownPreview.css',
    '!media/markdownPreview.js',
    '!media/notesView.css',
    '!media/notesView.js',
    '!resources/icon.png',
    '!resources/notes-view.svg',
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

test('the extension pack installs the footnotes of the Markdown preview, which the user can disable, and the extension depends on no extension (R-GEN-008)', () => {
  expect(manifest.extensionPack).toEqual(['bierner.markdown-footnotes']);
  expect(manifest).not.toHaveProperty('extensionDependencies');
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
