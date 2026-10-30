// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the parts of the extension that are files, not code: the
 * name and the entry point of the manifest, the contributions to the Markdown
 * preview, the commands and their buttons, the side view, the hover of the
 * selected text, the settings and their documentation, the files of the package, the third-party notices, the links
 * of the documents and the links to the requirements. No installed editor is
 * touched.
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import * as esbuild from 'esbuild';
import { expect, test, vi } from 'vitest';
import { cleanCommands } from './cleanView';
import { deselectPath, extensionId, footnoteCommands, footnotesContext, highlightCommands, highlightsContext, openPath } from './extension';
import { deleteCommands, markerContexts } from './noteEditor';
import { notesViewId, viewCommands } from './notesView';
import { defaultSettings, linkTargets, settingsSection } from './settings';
import { snippetCommands } from './snippets';
import { usedSnippetCommands, usedSnippetContexts } from './usedSnippets';

// The modules of the extension import the editor API; these tests read only their constants.
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

/**
 * repositoryName is the name of the repository of the extension on GitHub. It gets the name markdownnotes-vscode when
 * the implementation is complete (R-GEN-005); until then it keeps its name of 2026-10-28.
 */
const repositoryName = 'nimblescape-markdown-notes';

test('the manifest follows the naming scheme of the publisher nimblescape', () => {
  expect(manifest.publisher).toBe('nimblescape');
  expect(manifest.name).toBe('nimblescape-markdownnotes');
  expect(manifest.displayName).toBe('nimblescape Markdown Notes');
  expect(manifest.repository.url).toBe(`https://github.com/nimblescape/${repositoryName}.git`);
  expect(manifest.bugs.url).toBe(`https://github.com/nimblescape/${repositoryName}/issues`);
  expect(manifest.qna).toBe(`https://github.com/nimblescape/${repositoryName}/issues`);
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
  // The clean editing view (R-TEXT-009) reads its documents from the file system of the extension, also when
  // VS Code opens one of them again after a restart.
  expect(manifest.activationEvents).toEqual(['onLanguage:markdown', 'onFileSystem:markdownnotes', 'onUri']);
  expect(manifest.contributes['markdown.markdownItPlugins']).toBe(true);
  expect(manifest.contributes['markdown.previewStyles']).toEqual(['./media/markdownPreview.css']);
  expect(manifest.contributes['markdown.previewScripts']).toEqual(['./media/markdownPreview.js']);
  for (const file of ['media/markdownPreview.css', 'media/markdownPreview.js']) {
    expect(fs.existsSync(path.join(repository, file)), file).toBe(true);
  }
});

test('the script of the preview arms only the addresses of the extension for a click on a highlight (R-PREV-003)', () => {
  const script = fs.readFileSync(path.join(repository, 'media/markdownPreview.js'), 'utf8');
  const source = /const ownLink = \/(.+)\/;/.exec(script)?.[1];
  expect(source).toBeDefined();
  const ownLink = new RegExp(source!);
  for (const scheme of ['vscode', 'vscode-insiders']) {
    expect(ownLink.test(`${scheme}://${extensionId}${openPath}?document=file%3A%2F%2F%2Fa.md&line=4`)).toBe(true);
    expect(ownLink.test(`${scheme}://${extensionId}${deselectPath}?document=file%3A%2F%2F%2Fa.md`)).toBe(true);
  }
  for (const other of ['https://example.com/', `vscode://other.extension${openPath}?line=1`, `vscode://${extensionId}/install?x=1`, `https://example.com/?${extensionId}${openPath}`]) {
    expect(ownLink.test(other), other).toBe(false);
  }
});

test('the manifest contributes the side view "Notes" in a container of its own in the secondary side bar only (R-SIDE-001)', () => {
  // The secondary side bar holds the chat of VS Code; the primary side bar stays free for the Explorer.
  expect(Object.keys(manifest.contributes.viewsContainers)).toEqual(['secondarySidebar']);
  const [container] = manifest.contributes.viewsContainers.secondarySidebar;
  expect(manifest.contributes.viewsContainers.secondarySidebar).toHaveLength(1);
  expect(container).toMatchObject({ id: 'nimblescape-markdownnotes', title: 'Markdown Notes', icon: 'resources/notes-view.svg' });
  expect(read(container.icon)).toMatch(/^<svg [^>]*viewBox="0 0 24 24"/m);
  // The side view is the only place of the text of the notes.
  expect(manifest.contributes.views).toEqual({ [container.id]: [{ type: 'webview', id: notesViewId, name: 'Notes' }] });
  for (const file of ['media/notesView.js', 'media/notesView.css']) {
    expect(fs.existsSync(path.join(repository, file)), file).toBe(true);
  }
});

test('the manifest contributes the commands of the side view, of the highlights, of the footnotes, of the keys next to a hidden marker, of the snippets and of the used snippets, and no other', () => {
  const contributed = manifest.contributes.commands.map((command: { command: string }) => command.command);
  expect([...contributed].sort()).toEqual(
    [...Object.values(viewCommands), ...Object.values(highlightCommands), ...Object.values(footnoteCommands), ...Object.values(deleteCommands), ...Object.values(cleanCommands), snippetCommands.add, usedSnippetCommands.show, usedSnippetCommands.hide, usedSnippetCommands.rename, usedSnippetCommands.remove, usedSnippetCommands.keep].sort(),
  );
});

test('Backspace and Delete next to a hidden marker run the commands of the extension, which the Command Palette does not show (R-NOTE-006)', () => {
  const base = 'editorTextFocus && !editorReadonly && editorLangId == markdown && !editorHasSelection && !editorHasMultipleSelections';
  expect(manifest.contributes.keybindings.slice(2, 6)).toEqual([
    { command: deleteCommands.left, key: 'backspace', when: `${base} && ${markerContexts.left}` },
    { command: deleteCommands.right, key: 'delete', when: `${base} && ${markerContexts.right}` },
    { command: deleteCommands.wordLeft, key: 'ctrl+backspace', mac: 'alt+backspace', when: `${base} && ${markerContexts.left}` },
    { command: deleteCommands.wordRight, key: 'ctrl+delete', mac: 'alt+delete', when: `${base} && ${markerContexts.right}` },
  ]);
  expect(manifest.contributes.menus.commandPalette).toEqual(expect.arrayContaining(Object.values(deleteCommands).map((command) => ({ command, when: 'false' }))));
});

test('Backspace and Delete next to a mark line of a snippet in a source file do nothing, so that no key joins the hidden mark with the code (R-CODE-004)', () => {
  const base = 'editorTextFocus && !editorReadonly && editorLangId != markdown && !editorHasSelection && !editorHasMultipleSelections';
  const keep = usedSnippetCommands.keep;
  expect(manifest.contributes.keybindings.slice(6)).toEqual([
    { command: keep, key: 'backspace', when: `${base} && ${usedSnippetContexts.left}` },
    { command: keep, key: 'ctrl+backspace', mac: 'alt+backspace', when: `${base} && ${usedSnippetContexts.left}` },
    { command: keep, key: 'delete', when: `${base} && ${usedSnippetContexts.right}` },
    { command: keep, key: 'ctrl+delete', mac: 'alt+delete', when: `${base} && ${usedSnippetContexts.right}` },
  ]);
  const palette = manifest.contributes.menus.commandPalette;
  const sources = `editorLangId != markdown && !editorReadonly && ${usedSnippetContexts.has}`;
  expect(palette).toEqual(expect.arrayContaining([{ command: keep, when: 'false' }, { command: usedSnippetCommands.rename, when: sources }, { command: usedSnippetCommands.remove, when: sources }]));
});

test('Add Note is a button of the title of the side view, an item of the context menu of the text editor and a shortcut, and needs selected text (R-EDIT-003, R-EDIT-006)', () => {
  const menus = manifest.contributes.menus;
  // There is no way to add a note without highlighting text.
  const editor = 'editorLangId == markdown && !editorReadonly && editorHasSelection';
  expect(menus['view/title']).toEqual(expect.arrayContaining([{ command: viewCommands.newNote, group: 'navigation@1', when: `view == ${notesViewId}` }]));
  expect(menus['editor/context']).toEqual(expect.arrayContaining([{ command: viewCommands.newNote, group: 'nimblescape@1', when: editor }]));
  expect(menus.commandPalette).toEqual(expect.arrayContaining([{ command: viewCommands.newNote, when: editor }]));
  const added = manifest.contributes.commands.find((command: { command: string }) => command.command === viewCommands.newNote);
  expect(added).toMatchObject({ title: 'Add Note', icon: '$(add)' });
  // The shortcut works only with selected text too. It has no Ctrl+Alt on Windows and Linux, which is AltGr there and
  // types characters such as @ or µ on a German keyboard, and no Option on a Mac, which types characters too
  // (decision 22). A test in VS Code checks that VS Code has no shortcut of its own on these keys.
  expect(manifest.contributes.keybindings[0]).toEqual({
    command: viewCommands.newNote,
    key: 'shift+alt+n',
    mac: 'cmd+k n',
    when: 'editorTextFocus && editorLangId == markdown && editorHasSelection && !editorReadonly',
  });
});

test('Add Footnote is a button of the title of the side view, an item of the context menu of the text editor, a command of the Command Palette and a shortcut, and needs no selected text (R-FOOT-003)', () => {
  const menus = manifest.contributes.menus;
  // A footnote names a place, not a passage.
  const editor = 'editorLangId == markdown && !editorReadonly';
  expect(menus['view/title']).toEqual(expect.arrayContaining([{ command: viewCommands.newFootnote, group: 'navigation@2', when: `view == ${notesViewId}` }]));
  expect(menus['editor/context']).toEqual(expect.arrayContaining([{ command: viewCommands.newFootnote, group: 'nimblescape@2', when: editor }]));
  expect(menus.commandPalette).toEqual(expect.arrayContaining([{ command: viewCommands.newFootnote, when: editor }]));
  const added = manifest.contributes.commands.find((command: { command: string }) => command.command === viewCommands.newFootnote);
  expect(added).toMatchObject({ title: 'Add Footnote', icon: '$(nimblescape-footnote-add)' });
  // The shortcut follows the rules of the shortcut of "Add Note" (decision 22); a test in VS Code checks that VS Code
  // has no shortcut of its own on these keys.
  expect(manifest.contributes.keybindings[1]).toEqual({ command: viewCommands.newFootnote, key: 'shift+alt+b', mac: 'cmd+k b', when: 'editorTextFocus && editorLangId == markdown && !editorReadonly' });
});

test('the title of the side view has the button "Show Footnotes" or "Hide Footnotes" after the context key of the shown footnotes (R-FOOT-001)', () => {
  const view = `view == ${notesViewId}`;
  expect(manifest.contributes.menus['view/title']).toEqual(
    expect.arrayContaining([
      { command: footnoteCommands.show, group: 'navigation@3', when: `${view} && !${footnotesContext}` },
      { command: footnoteCommands.hide, group: 'navigation@3', when: `${view} && ${footnotesContext}` },
    ]),
  );
  expect(manifest.contributes.menus.commandPalette).toEqual(
    expect.arrayContaining([
      { command: footnoteCommands.show, when: `!${footnotesContext}` },
      { command: footnoteCommands.hide, when: footnotesContext },
    ]),
  );
  const iconOf = (command: string) => manifest.contributes.commands.find((item: { command: string }) => item.command === command).icon;
  expect([footnoteCommands.show, footnoteCommands.hide].map(iconOf)).toEqual(['$(nimblescape-footnotes-show)', '$(nimblescape-footnotes-hide)']);
});

test('the title of the text editor and of the preview of a Markdown file has the button "Show Highlights" or "Hide Highlights" after the context key of the shown highlights (R-GEN-011)', () => {
  // VS Code shows a Markdown file in the preview to the side, or in the modes "Markdown Preview" and "Markdown Editor"
  // of its editor, which are custom editors.
  const markdown =
    "editorLangId == markdown || activeWebviewPanelId == 'markdown.preview' || activeCustomEditorId == 'vscode.markdown.preview.editor' || activeCustomEditorId == 'vscode.markdown.editor'";
  // The highlights show while the setting showHighlights is on in the settings of the workspace or of the user, so the
  // buttons follow a context key of the extension that reads both, not the setting.
  expect(manifest.contributes.menus['editor/title']).toEqual([
    { command: viewCommands.toggle, group: 'navigation', when: `(${markdown})` },
    { command: highlightCommands.show, group: 'navigation', when: `(${markdown}) && !${highlightsContext}` },
    { command: highlightCommands.hide, group: 'navigation', when: `(${markdown}) && ${highlightsContext}` },
    // The text editor of a source file with snippets has the buttons of the used snippets (R-CODE-004).
    { command: usedSnippetCommands.show, group: 'navigation', when: `editorLangId != markdown && ${usedSnippetContexts.has} && !${usedSnippetContexts.shown}` },
    { command: usedSnippetCommands.hide, group: 'navigation', when: `editorLangId != markdown && ${usedSnippetContexts.has} && ${usedSnippetContexts.shown}` },
  ]);
  expect(manifest.contributes.menus.commandPalette).toEqual(
    expect.arrayContaining([
      { command: highlightCommands.show, when: `!${highlightsContext}` },
      { command: highlightCommands.hide, when: highlightsContext },
    ]),
  );
  const iconOf = (command: string) => manifest.contributes.commands.find((item: { command: string }) => item.command === command).icon;
  expect([highlightCommands.show, highlightCommands.hide, usedSnippetCommands.show, usedSnippetCommands.hide].map(iconOf)).toEqual([
    '$(nimblescape-highlights-show)',
    '$(nimblescape-highlights-hide)',
    '$(nimblescape-highlights-show)',
    '$(nimblescape-highlights-hide)',
  ]);
});

/**
 * glyphOf returns the glyph of a character in a TrueType font after its character map (format 4), and the size of its
 * outline in bytes, which is 0 for an empty glyph.
 * @param font - The bytes of the font.
 * @param character - The code point of the character.
 */
const glyphOf = (font: Buffer, character: number): { glyph: number; size: number } => {
  const tables = new Map<string, number>();
  for (let index = 0; index < font.readUInt16BE(4); index++) {
    const record = 12 + 16 * index;
    tables.set(font.toString('latin1', record, record + 4), font.readUInt32BE(record + 8));
  }
  const cmap = tables.get('cmap')!;
  let glyph = 0;
  for (let index = 0; index < font.readUInt16BE(cmap + 2); index++) {
    const subtable = cmap + font.readUInt32BE(cmap + 4 + 8 * index + 4);
    if (font.readUInt16BE(subtable) !== 4) continue;
    const segments = font.readUInt16BE(subtable + 6) / 2;
    const ends = subtable + 14;
    const starts = ends + 2 * segments + 2;
    const deltas = starts + 2 * segments;
    const ranges = deltas + 2 * segments;
    for (let segment = 0; segment < segments; segment++) {
      if (character > font.readUInt16BE(ends + 2 * segment) || character < font.readUInt16BE(starts + 2 * segment)) continue;
      const range = font.readUInt16BE(ranges + 2 * segment);
      const delta = font.readUInt16BE(deltas + 2 * segment);
      const start = font.readUInt16BE(starts + 2 * segment);
      const id = range === 0 ? character : font.readUInt16BE(ranges + 2 * segment + range + 2 * (character - start));
      glyph = id === 0 ? 0 : (id + delta) & 0xffff;
    }
    if (glyph) break;
  }
  const loca = tables.get('loca')!;
  const long = font.readInt16BE(tables.get('head')! + 50) === 1;
  const offset = (index: number) => (long ? font.readUInt32BE(loca + 4 * index) : 2 * font.readUInt16BE(loca + 2 * index));
  return { glyph, size: glyph ? offset(glyph + 1) - offset(glyph) : 0 };
};

test('the buttons of the highlights show a highlighter pen, and the buttons of the footnotes a plus with the number 1 and a numbered list, of the icon font of the extension, which follows the icon color of the theme (R-GEN-011, R-FOOT-001)', () => {
  // The highlighter pen is the icon of the highlights (decision 26); the eye stays for the icon of the hidden notes (R-HIDE-002).
  const font = 'resources/notes-icons.ttf';
  const icons = { 'highlights-show': 0xe001, 'highlights-hide': 0xe002, 'footnote-add': 0xe003, 'footnotes-show': 0xe004, 'footnotes-hide': 0xe005 };
  expect(manifest.contributes.icons).toEqual(
    Object.fromEntries(
      Object.entries(icons).map(([name, character]) => [`nimblescape-${name}`, { description: expect.any(String), default: { fontPath: font, fontCharacter: `\\${character.toString(16).toUpperCase()}` } }]),
    ),
  );
  // The font maps each character to a glyph of its own with an outline; scripts/icon-font.py builds it from the images.
  const bytes = fs.readFileSync(path.join(repository, font));
  const glyphs = Object.values(icons).map((character) => glyphOf(bytes, character));
  for (const { glyph, size } of glyphs) {
    expect(glyph).toBeGreaterThan(0);
    expect(size).toBeGreaterThan(0);
  }
  expect(new Set(glyphs.map(({ glyph }) => glyph)).size).toBe(glyphs.length);
  for (const image of ['highlighter.svg', 'footnote-add.svg', 'footnotes.svg']) {
    expect(read('scripts/icon-font.py')).toContain(`'${image}'`);
    expect(fs.existsSync(path.join(repository, 'resources/icons', image)), image).toBe(true);
  }
});

test('the title of the side view has the button "Hide Notes" where VS Code shows none, and the Markdown editors the button "Show or Hide Notes" (R-SIDE-006)', () => {
  const [container] = manifest.contributes.viewsContainers.secondarySidebar;
  const item = manifest.contributes.menus['view/title'].find((candidate: { command: string }) => candidate.command === viewCommands.hide);
  expect(manifest.contributes.menus['view/title'].map((candidate: { command: string }) => candidate.command)).toEqual([
    viewCommands.newNote,
    viewCommands.newFootnote,
    footnoteCommands.show,
    footnoteCommands.hide,
    viewCommands.hide,
  ]);
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

test('the extension is the default formatter of Markdown files, without format on save of VS Code for every Markdown file, and a Markdown editor scrolls smoothly; the user can change both (R-FMT-001, R-SIDE-007)', () => {
  // The extension formats only a file with notes on a save (setting formatOnSave), so it turns on no format on save of VS Code.
  // VS Code scrolls a text editor to a note that the side view selects smoothly only with editor.smoothScrolling.
  expect(manifest.contributes.configurationDefaults['[markdown]']).toEqual({ 'editor.defaultFormatter': extensionId, 'editor.smoothScrolling': true });
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
  for (const [key, values] of [['openLinksIn', linkTargets]] as const) {
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

test('the package holds the bundle, the styles and the scripts of the preview and the side view, the icons, the icon font and the documents only', () => {
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
    '!resources/notes-icons.ttf',
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

/** cli is the manifest of the npm package of the command markdownnotes (R-FMT-004). */
const cli = JSON.parse(read('cli/package.json'));

test('the npm package has the version of the extension, the command markdownnotes, the library of the formatter and a public scope (R-FMT-004)', () => {
  expect(cli.name).toBe('@nimblescape/markdownnotes');
  expect(cli.version, 'the release sets one version in both manifests').toBe(manifest.version);
  const lock = JSON.parse(read('cli/package-lock.json'));
  expect([lock.version, lock.packages[''].version]).toEqual([cli.version, cli.version]);
  expect(cli.bin).toEqual({ markdownnotes: 'dist/markdownnotes.js' });
  // The library has its own bundle, which runs nothing on its load, and types that name no other package.
  expect([cli.main, cli.types]).toEqual(['dist/index.js', 'index.d.ts']);
  expect(cli.exports).toEqual({ '.': { types: './index.d.ts', default: './dist/index.js' }, './package.json': './package.json' });
  expect(read('esbuild.mjs')).toContain(`entryPoints: ['src/cli/index.ts'], outfile: 'cli/${cli.main}', target: 'node22'`);
  expect(read('cli/index.d.ts')).not.toMatch(/\bimport\b|\brequire\(/);
  expect(cli.publishConfig).toEqual({ access: 'public' });
  expect(cli.license).toBe(manifest.license);
  expect(cli.repository).toEqual({ type: 'git', url: `git+${manifest.repository.url}`, directory: 'cli' });
  expect(cli.homepage).toBe(`${manifest.repository.url.replace(/\.git$/, '')}#readme`);
  expect(cli.bugs).toEqual(manifest.bugs);
  expect(cli.engines).toEqual({ node: '>=22' });
  expect(read('esbuild.mjs')).toContain(`outfile: 'cli/${cli.bin['markdownnotes']}', target: 'node22'`);
  expect(cli).not.toHaveProperty('dependencies');
});

test('the npm package holds exactly the bundles, the types, the notices, the README and the license (npm pack --dry-run)', () => {
  const listed = execFileSync('npm', ['pack', './cli', '--dry-run', '--json'], { cwd: repository, encoding: 'utf8' });
  const files = (JSON.parse(listed) as { files: { path: string }[] }[])[0].files.map((file) => file.path);
  // The build writes dist/, LICENSE and THIRD-PARTY-NOTICES.md (esbuild.mjs).
  const built = (file: string) => file === 'LICENSE' || file === 'THIRD-PARTY-NOTICES.md' || file.startsWith('dist/');
  const expected = ['LICENSE', 'README.md', 'THIRD-PARTY-NOTICES.md', 'package.json', 'index.d.ts', 'dist/markdownnotes.js', 'dist/index.js'].filter(
    (file) => !built(file) || fs.existsSync(path.join(repository, 'cli', file)),
  );
  expect(files.sort()).toEqual(expected.sort());
}, 60_000);

test('the bundle of the command markdownnotes imports only modules of Node.js, and the bundle of the library none (R-FMT-004)', async () => {
  const importsOf = async (entry: string): Promise<string[]> => {
    const result = await esbuild.build({
      entryPoints: [path.join(repository, entry)],
      bundle: true,
      platform: 'node',
      write: false,
      outdir: path.join(repository, 'out/manifest-test'),
      metafile: true,
      logLevel: 'silent',
    });
    return Object.values(result.metafile.outputs).flatMap((output) => output.imports.map((imported) => imported.path));
  };
  expect((await importsOf('src/cli/main.ts')).sort()).toEqual(['node:fs', 'node:path']);
  expect(await importsOf('src/cli/index.ts')).toEqual([]);
});

test('the extension pack installs the footnotes of the Markdown preview, which the user can disable, and the extension depends on no extension (R-GEN-008)', () => {
  expect(manifest.extensionPack).toEqual(['bierner.markdown-footnotes']);
  expect(manifest).not.toHaveProperty('extensionDependencies');
});

test('the third-party notices name every package that the build bundles, with its version and license (R-GEN-004)', async () => {
  const notices = read('THIRD-PARTY-NOTICES.md');
  // The command markdownnotes of the npm package bundles markdown-it too, and the package holds the notices.
  const result = await esbuild.build({
    entryPoints: [path.join(repository, 'src/extension.ts'), path.join(repository, 'src/cli/main.ts')],
    bundle: true,
    platform: 'node',
    external: ['vscode'],
    write: false,
    outdir: path.join(repository, 'out/manifest-test'),
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
  for (const file of ['README.md', 'CHANGELOG.md', 'SUPPORT.md', 'cli/README.md']) {
    for (const target of markdownLinks(read(file))) {
      expect(target, `${file}: ${target}`).toMatch(/^https:\/\//);
    }
  }
});

test('the images of the README are GIF or PNG files of docs/images/ on the branch main, as the Marketplace requires', () => {
  // The Marketplace shows no SVG image and no image with a relative address.
  const base = `https://raw.githubusercontent.com/nimblescape/${repositoryName}/main/`;
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

test('every requirement has a unique ID, and every link to a requirement or a section of the requirements names an existing one', () => {
  const requirements = read('docs/requirements.md');
  const ids = [...requirements.matchAll(/^### (R-[A-Z]+-\d{3})$/gm)].map((match) => match[1]);
  expect(ids.length).toBeGreaterThan(0);
  expect(new Set(ids).size).toBe(ids.length);
  // The sections, for example "Plan" and "Decisions", are targets too.
  const sections = [...requirements.matchAll(/^## (.+)$/gm)].map((match) => anchorOf(match[1]));
  const anchors = new Set([...ids.map((id) => `#${id.toLowerCase()}`), ...sections]);
  for (const target of markdownLinks(requirements).filter((target) => target.startsWith('#r-'))) {
    expect(anchors.has(target), target).toBe(true);
  }
  for (const file of ['docs/guide.md', 'docs/features.md', 'docs/security.md', 'CONTRIBUTING.md']) {
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

test('every link of the user guide and of the list of the features to one of their sections names an existing heading', () => {
  for (const file of ['docs/guide.md', 'docs/features.md']) {
    const text = read(file);
    const anchors = new Set([...text.matchAll(/^#{2,4} (.+)$/gm)].map((match) => anchorOf(match[1])));
    for (const target of markdownLinks(text).filter((target) => target.startsWith('#'))) {
      expect(anchors.has(target), `${file}: ${target}`).toBe(true);
    }
  }
});
