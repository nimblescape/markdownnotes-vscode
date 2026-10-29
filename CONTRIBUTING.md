# Contributing

This guide explains the files, the development, the tests and the release of
the extension. The [README](README.md) describes the use in short, the
[user guide](docs/guide.md) describes every feature,
[docs/requirements.md](docs/requirements.md) lists what the extension must do,
each requirement with an ID, [docs/features.md](docs/features.md) lists the
requested features and their state, and [docs/security.md](docs/security.md)
describes its security model.

## Files

| File | Purpose |
| --- | --- |
| `src/extension.ts` | The editor wiring: activation starts the threads of the notes, the overlay of the text editor, the side view and the light bulb action of the selected text, returns the markdown-it plugin for the Markdown preview with the settings, the selected note and the links of the rendered document, handles the links of the highlights of the preview (`vscode://nimblescape.nimblescape-markdown-notes/open` and `/deselect`), the buttons "Show Highlights" and "Hide Highlights" with the context key `nimblescape.markdownNotes.highlightsShown`, and refreshes the previews and the threads when a setting of the extension or the visibility of the side view changes. |
| `src/github.ts` | The GitHub sign-in: the login of the GitHub session of VS Code, the author of new notes and answers. |
| `src/settings.ts` | The settings of the extension, their defaults, and the check of their values. It uses no API of VS Code. |
| `src/notes/syntax.ts` | The syntax of one note: the label `note-` and four random small letters or digits, the header line of an answer (`**login** · date`), the start marker `<wbr><!--[note-7k2q-->` with the name of a color, and the reference `[^note-7k2q]`, the tree of answers with their depths and parents, the lines of a note for a list of answers, the dates of a header in the local time of the reader and of the author, and the rules of markdown-it 14 for the definitions, the references and the start markers of the notes. It uses no API of VS Code, so the extension and the plugin share it. |
| `src/notes/notes.ts` | The notes of a Markdown text by their places (line and column), with the prefix of their lines in a block quote or a list item, found with markdown-it as the preview finds them; their references, start markers, colors and highlights; the blocks of text with the lines of their outermost blocks; and the references and markers that the warnings need. A text without `[^note-` has no notes, and `readNotes` reads it without markdown-it. It uses no API of VS Code. |
| `src/notes/colors.ts` | The six colors of the notes and their names, the default color blue, and the color of a note from its start marker, which the text editor, the preview and the side view share. It uses no API of VS Code. |
| `src/notes/edits.ts` | The edits of the text when an answer is saved, added as a reply or deleted, when a note is added, colored or deleted, and when the text view of the side view saves the whole text of a note, with the check that the changed text holds the same note with the expected tree of answers, and the place of the start marker, the reference and the definition of a new note. It uses no API of VS Code. |
| `src/notes/doctype.ts` | The comment of the format at the top of a file with notes, its "DOCTYPE": its lines with the semantic version of the format (`formatVersion`) and the address of the specification, its place after a front matter, its edit together with each change of a note, which writes an existing comment anew only for a higher version, and `newerFormat`, which finds a higher major version. It uses no API of VS Code. |
| `src/notes/checks.ts` | The warnings at the notes of a text: each form of a note that GitHub or another Markdown viewer shows differently from the extension, and each note without a start marker or without highlighted text. It uses no API of VS Code. |
| `src/noteThreads.ts` | The notes of the open Markdown documents: one thread for each note with an identifier that stays while the document is open, the reading of the notes after a change, the warnings of the notes as diagnostics, and the operations that write the changes of the side view. |
| `src/noteEditor.ts` | The overlay of the notes in the text editor: the folding ranges of the notes, their collapse and the collapse again of a note that VS Code opens, the highlights in the colors of the notes, the strong highlight of the selected note, the hidden highlight under the pointer, the hidden start markers and references, the cursor that steps over them, the commands of Backspace and Delete next to a marker, and the rendered header lines. |
| `src/cleanView.ts` | The clean editing view ([R-TEXT-009](docs/requirements.md#r-text-009)): the file system `markdown-notes` of the clean documents, whose URIs carry the path of the file and its scheme and authority, each change of a clean document written into the document of its file and each change of the file written back, Undo by the texts of the file, the save, the highlights in the view, the text editor of a file with notes that becomes the view, the command "Open File with Markup", the tabs that VS Code keeps behind a view, a close without a save, the text of the file for the Markdown preview of the view, and the files of that preview as they are. |
| `src/notes/clean.ts` | The clean text of a Markdown text with notes: the text without the start markers, the references, the definitions and the comment of the format, the highlights in it, the edit of the text for an edit of the clean text, which keeps each note at its text, and the line in the clean text of each line of the text. It uses no API of VS Code. |
| `src/notes/rendered.ts` | The place in the Markdown text of text that the user selected in the Markdown preview, for "Add Note" of the preview: the letters and digits of the text of the block without the parts that the page does not show, and the selected text after as many of them as the text before it holds, or the nearest occurrence. It uses no API of VS Code. |
| `src/notes/cursor.ts` | The cursor at the hidden markers and at the header lines: the step over a marker, the lines where the cursor does not stay, and the part of the text that Backspace and Delete delete next to a marker. It uses no API of VS Code. |
| `src/selectedNotes.ts` | The selected note of each document, which the side view sets and the text editor and the preview show with a strong highlight, and the request of the side view to scroll the preview to it. |
| `src/notes/folds.ts` | The folds of the collapsed notes: which line of a text stays visible and which lines a fold takes, so that a note vanishes; and the places of the header lines of the answers. It uses no API of VS Code. |
| `src/notesView.ts` | The side view "Notes" in the secondary side bar: the webview view provider, its page with the security policy, the active Markdown file of a text editor or of the modes "Markdown Preview" and "Markdown Editor" of VS Code, the state of its threads with the rendered answers, their colors and their whole texts, the places of the highlights beside the text editor, the actions of its script, and the commands "Add Note", "Hide Notes" and "Show or Hide Notes". |
| `src/addNoteAction.ts` | The light bulb action "Add Note" of the selected text in the text editor: a Code Action of the kind `quickfix.markdownNotes.addNote`, which runs "Add Note" of the side view. |
| `src/slashCommands.ts` | The slash commands of the text editor: the suggestions `/note`, `/todo`, `/footnote`, `/date` and `/time` after a typed slash, the selected text that a slash replaced, and the commands that the suggestions run. |
| `src/notes/slash.ts` | The text of the slash commands: the typed command, the sentence before it for `/todo`, the date and the time, and the label and the definition of the footnote of `/footnote`. It uses no API of VS Code. |
| `src/links.ts` | The links of the rendered notes in the side view: web and mail links with the system, files in VS Code at a line or a heading, other schemes after a question, and no command links. |
| `src/format/format.ts` | The Markdown formatter: each paragraph on one line with its hard line breaks, the aligned columns of the tables by the width that the text editor shows, the white space at the ends of the lines, the blank lines between the blocks and the line break at the end, read with markdown-it as the preview reads the text, and the check that the formatted text shows the same blocks in the preview. It uses no API of VS Code. |
| `src/formatter.ts` | The provider of "Format Document" for Markdown files, and the changes on the save of a Markdown file (`onWillSaveTextDocument`): the format of a file with notes or with the comment of the format, and a missing comment of the format of a file with notes, in one edit of the changed lines with the line breaks of the document. |
| `src/cli/cli.ts`, `src/cli/main.ts` | The command `markdown-notes` of the npm package, the formatter on the command line for programs and AI agents ([R-FMT-004](docs/requirements.md#r-fmt-004)): the commands `format`, `format --check` and `format -`, the help, the version and the exit codes, without an API of VS Code in `cli.ts`; `main.ts` runs it with the files and the standard streams of Node.js. |
| `src/markdown/markdownIt.ts` | The markdown-it plugin of the Markdown preview: takes the notes out of the page, writes the start marker and the first reference of each note as the empty start and end of its highlight, with the color, the link to the side view and the state of the highlight, and leaves every other token, also every other footnote, as it is. |
| `media/markdownPreview.css`, `media/markdownPreview.js` | The styles of the highlights in the Markdown preview, in the colors of the notes, and the script that paints the highlights with the CSS Custom Highlight API, shows a hidden highlight under the pointer, selects and deselects a note on a click, scrolls to the selected note, and shows the button "Add Note" above selected text. |
| `media/notesView.js`, `media/notesView.css` | The script and the styles of the side view: the threads with their colors and their icon buttons, the answers, the editors that switch between "Write" and "Preview", the text view of a thread, the colors of a note, the list that scrolls the selected thread to its top, the tooltips, and the messages to the extension. |
| `resources/notes-icons.ttf`, `resources/icons/highlighter.svg`, `scripts/icon-font.py` | The icon font of the buttons "Show Highlights" (U+E001) and "Hide Highlights" (U+E002), its source image, a highlighter pen over its line, and the script that builds the font from the image ([Icon font](#icon-font)). |
| `resources/notes-view.svg` | The icon of the container of the side view in the title of the secondary side bar: a speech bubble, which VS Code draws in the color of the title. |
| `resources/icon.png`, `resources/icon.svg` | The Marketplace icon (256 × 256 PNG, because the Marketplace takes no SVG icon) and its source: a page with a note as a callout on the tile of the nimblescape extensions. |
| `src/**/*.test.ts` | The unit tests, with vitest: the manifest, the package contents, the third-party notices and the documents (`src/manifest.test.ts`), the syntax, the notes, the edits and the warnings, the markdown-it plugin with the source map rule of the preview, the settings, the folds (`src/notes/folds.test.ts`), the activation and the threads (`src/extension.test.ts`), the overlay of the text editor (`src/noteEditor.test.ts`), the clean text (`src/notes/clean.test.ts`), the clean editing view (`src/cleanView.test.ts`) and the side view (`src/notesView.test.ts`) with a fake of the editor API (`src/testing/fakeVscode.ts`). |
| `test/cli/` | The tests of the built command `markdown-notes` (`cli/dist/markdown-notes.js`), with the Node.js of the tests in the temporary folder of the system. |
| `test/vscode/` | The tests in a real VS Code: the highlights and the hidden markers in the text editor, the comment of the format, the collapse of the notes, the side view with the buttons "Show Highlights" and "Hide Highlights", the light bulb action and the shortcut of "Add Note", the formatter, and the highlights of the Markdown preview of VS Code (`markdown.api.render`). |
| `dist/` | The bundle `dist/extension.js`, built by `esbuild.mjs` and kept out of Git. |
| `cli/package.json`, `cli/package-lock.json`, `cli/README.md` | The npm package `@nimblescape/markdown-notes`: its manifest, its lock file without dependencies and its page on npmjs.com. The build writes `cli/dist/markdown-notes.js` and copies `LICENSE` and `THIRD-PARTY-NOTICES.md` into `cli/`, all kept out of Git. The section [npm package](#npm-package) explains it. |
| `out/`, `.vscode-test/` | The bundled tests in VS Code (`scripts/build-vscode-tests.mjs`) and the VS Code that `@vscode/test-cli` downloads for them, kept out of Git. |
| `docs/guide.md` | The user guide: every feature, how to use it, and its state. |
| `docs/format.md` | The specification of the format of the notes, for people and programs such as AI agents. The comment of the format links to it on the branch `main`, so the file keeps its path. |
| `docs/example.md` | A document with notes of each kind: a tree of replies, code blocks, a task list, highlights in three colors, and a footnote that is no note. GitHub shows it as the readers of a repository see the notes. |
| `docs/requirements.md` | The requirements, each with an ID as its heading, and the plan of the steps. |
| `docs/features.md` | The features that Hannes asked for in the threads of the project, each with the date of the request, its requirement and its state: built, bug, planned, needs Hannes, replaced or dropped, and the open work in its order. A change of a feature or of its state updates its row. |
| `docs/security.md` | The security model: what the extension does on your computer, what it protects, and where its protection ends. The section "What the extension does on your computer" at the top of the README lists the same behaviors in short. |
| `docs/images/` | The image of the README: `notes.png`, a screenshot of VS Code 1.143 in the theme Dark Modern under Xvfb in the zone Europe/Vienna, with the text editor with the highlights of two notes and the list of the light bulb at the selected text (Ctrl+.), and the side view "Notes" beside it in the secondary side bar. PNG and GIF files only, because the Marketplace shows no SVG image. The README links its images with full addresses on the branch `main`, which the Marketplace requires; they are not part of the package. A test checks that each image of the README is a GIF or PNG file in this folder. |
| `THIRD-PARTY-NOTICES.md` | The packages that the bundle contains, their licenses and the places of their source code. |
| `SUPPORT.md` | Where to ask questions and report problems, and what a report contains. |
| `esbuild.mjs` | Bundles `src/extension.ts` with markdown-it into `dist/extension.js` for the Node.js of VS Code, and `src/cli/main.ts` with markdown-it into `cli/dist/markdown-notes.js` for Node.js 22 or later, and copies `LICENSE` and `THIRD-PARTY-NOTICES.md` into `cli/`. The editor API stays outside the bundles. The bundle is readable JavaScript, not minified (see [Reviewing the package](#reviewing-the-package)); a production build (`--production`) has no source map. |
| `tsconfig.json` | The settings of the type check: strict, and no output, because esbuild builds the bundle. It covers `src/` and `test/`. |
| `vitest.config.mts` | The settings of the unit tests: the files `src/**/*.test.ts` and `scripts/**/*.test.mjs` on Node. |
| `vitest.cli.config.mts` | The settings of the tests of the built command `markdown-notes`: the files `test/cli/**/*.test.ts`. |
| `.vscode-test.mjs` | The settings of the tests in VS Code: the VS Code version (`VSCODE_TEST_VERSION`, stable by default), the files of `out/test/vscode/`, and mocha. |
| `package.json` | The extension manifest. The section [Manifest](#manifest) explains it. |
| `package-lock.json` | The locked development tools. npm writes this file, and nobody edits it by hand. |
| `.node-version` | The Node release of the development tools. `actions/setup-node` in the workflows and local Node version managers read it. |
| `.vscodeignore` | Lists the files of the package: `dist/extension.js`, `media/markdownPreview.css`, `media/markdownPreview.js`, `media/notesView.css`, `media/notesView.js`, `resources/icon.png`, `resources/notes-icons.ttf`, `resources/notes-view.svg`, `package.json`, `README.md`, `CHANGELOG.md`, `SUPPORT.md`, `LICENSE` and `THIRD-PARTY-NOTICES.md`. |
| `.github/workflows/ci.yml` | Checks the types, runs all tests, packages the VSIX and the npm package for every push to `main`, every pull request and the commit of every release, and runs the tests of `markdown-notes` on Ubuntu and macOS with Node.js 22 and 26. The release publishes the packages of this workflow, so a change of it needs a dry run (rule 4 of the [release rules](#release-rules)). |
| `.github/workflows/vscode-versions.yml` | Runs `ci.yml` once per week with VS Code Insiders and with the lowest supported VS Code version. |
| `.github/workflows/release.yml` | Releases a version on a manual start: commits the version to a temporary branch, tests and packages it with `ci.yml`, and only then moves `main` to it, creates its tag and GitHub release and publishes it to the Marketplace and to npmjs.com. A dry run tests without a change. The section [Release](#release) explains it. |
| `.github/workflows/release-dry-run.yml` | Fails on a pull request that changes the release process (`release.yml`, `ci.yml` or `scripts/release-checks.mjs`) until a dry run on its branch tested the change (rule 4 of the [release rules](#release-rules)). |
| `.github/workflows/marketplace-identity.yml` | Prints the Marketplace member ID of the publishing identity, to check the setup of the repository. |
| `.github/dependabot.yml` | Proposes weekly updates of the development tools and of the pinned actions. |
| `scripts/build-vscode-tests.mjs` | Bundles each test of `test/vscode/` into `out/test/vscode/` for the tests in VS Code. |
| `scripts/install-local.mjs`, `scripts/uninstall-local.mjs` | Install the built package into every profile of the VS Code of this computer, and remove it again. |
| `scripts/marketplace-setup.sh` | Sets up the Marketplace publishing of the repository. The section [Setup of a repository](#setup-of-a-repository) explains it. |
| `scripts/npm-setup.sh` | Sets up the npm publishing of the package: the environment `npm`, the first version and the trusted publisher. The section [npmjs.com setup](#npmjscom-setup) explains it. |
| `scripts/release-checks.mjs`, `scripts/release-checks.test.mjs` | The check of rule 4 of the [release rules](#release-rules), which the workflows run, and its test. |
| `.vscode/launch.json`, `.vscode/tasks.json` | Build the bundle and start a VS Code window that loads the extension from this folder. |

## Development

The development tools are TypeScript, esbuild, vitest,
[`@vscode/test-cli`](https://github.com/microsoft/vscode-test-cli) for the
tests in VS Code, and [`@vscode/vsce`](https://github.com/microsoft/vscode-vsce),
the Microsoft tool that packages and publishes extensions. Everything runs on
Node.js 24: the release in `.node-version` for the tools and CI, and the
runtime of VS Code 1.125 and later (`engines.vscode`) for the extension. The
command `markdown-notes` of the npm package runs on the Node.js of the
`PATH`, Node.js 22 or later (`engines` of `cli/package.json`).

| Command | Effect |
| --- | --- |
| `npm ci --ignore-scripts` | Installs the locked development tools and runs no install script of a dependency. |
| `npm run typecheck` | Checks the types with `tsc`. esbuild does not check them. |
| `npm test` | Runs the unit tests with vitest. The tests touch no installed editor. |
| `npm run test:cli` | Builds the bundles and runs the tests of the built `markdown-notes` in the temporary folder of the system. |
| `npm run test:vscode` | Builds the bundle and the tests in VS Code, downloads VS Code to `.vscode-test/` and runs the tests in it. On Linux without a display, run it as `xvfb-run -a npm run test:vscode`. `VSCODE_TEST_VERSION=insiders` or a version such as `1.125.0` selects another VS Code. |
| `npm run build` | Bundles `dist/extension.js` and `cli/dist/markdown-notes.js` with source maps. `node cli/dist/markdown-notes.js format <file>` then runs the built `markdown-notes`. |
| `npm run package` | Builds `nimblescape-markdown-notes-<version>.vsix` with vsce, which first runs the production build (`vscode:prepublish`). vsce also validates the manifest and the README. |
| `npm pack ./cli` | Builds the npm package `nimblescape-markdown-notes-<version>.tgz` from `cli/`, after a production build (`node esbuild.mjs --production`). `npx -y ./nimblescape-markdown-notes-<version>.tgz format <file>` runs it. |
| `npm run install-local` | Builds the package and installs it into every profile of the VS Code of this computer; `-- --profile <name>` installs into one profile. Reload the window after an update of an active extension. |
| `npm run uninstall-local` | Removes `nimblescape.nimblescape-markdown-notes` from every profile of the VS Code of this computer; `-- --profile <name>` removes it from one profile. |

The launch configuration "Run the extension" builds the bundle and starts a
second VS Code window that loads the extension from this folder, so that a
change can be tried without a package.

## Reviewing the package

The VSIX holds the bundle `dist/extension.js` as readable JavaScript: not
minified, with the names of the source, and with a comment that names each
source file. To compare a VSIX with the sources, unpack it (a VSIX is a ZIP
file), run `npm ci --ignore-scripts` and `npm run vscode:prepublish` at the
tag of its version, and compare `extension/dist/` of the VSIX with `dist/`.
With the same sources and the locked versions of the tools, the build gives
the same file.

The npm package holds the bundle `cli/dist/markdown-notes.js` in
`package/dist/`; unpack it with `tar -xzf` and compare it with
`cli/dist/` in the same way. npmjs.com shows the provenance of each version
that the release workflow published: the repository, the workflow and the
commit of the build.

## Manifest

`package.json` is the extension manifest. It has these parts:

- The name and the publisher define the extension ID `nimblescape.nimblescape-markdown-notes`; the section [Naming](#naming) explains the name.
- The description, the keywords, the categories, the banner (`galleryBanner`), `preview` and `qna` make the page of the Marketplace. vsce turns some words of the description into search tags; a test checks that the description adds no tag. `preview` shows the label "Preview" on the page, and `qna` sends the questions of the page to the GitHub issues.
- The version is the only source of the package version, and the tag of a release names it.
- The engine range defines the compatible VS Code versions. `@types/vscode` stays at the lowest version of that range, so that the code compiles only with the API of that version. The manifest enables no proposed API (`enabledApiProposals`), because the Marketplace does not accept an extension that uses one. A test checks both.
- `main` selects the bundle `dist/extension.js`. A test checks it.
- `extensionPack` installs the extension "Markdown Footnotes" (`bierner.markdown-footnotes`) together with this extension, so that the preview shows the other footnotes of a file ([R-GEN-008](docs/requirements.md#r-gen-008)). It is a pack and no dependency (`extensionDependencies`): the user can disable or uninstall it, and the notes keep working. The plugin of this extension never renders other footnotes itself, because two plugins of footnotes would give two lists of footnotes. A test checks the pack.
- `.vscodeignore` lists the files of the package, not a `files` field: it ignores everything and keeps the bundle, the styles and the scripts of the preview and of the side view, the icons, the icon font and the documents. A test checks the list.
- `icon` is `resources/icon.png`, a PNG, because the Marketplace takes no SVG icon. `resources/icon.svg` is its source; after a change of the source, render it again as a PNG of 256 × 256 pixels with a transparent background, for example with a screenshot of the SVG in Chromium. A test checks the size.
- `extensionKind` selects the workspace host, where the documents are.
- The activation event `onLanguage:markdown` starts the extension when a Markdown file opens, `onFileSystem:markdown-notes` when VS Code opens a document of the clean editing view, for example from the tabs of the last session, and `onUri` when VS Code passes it a link of the highlight of a note.
- The command "Open File with Markup" (`nimblescape.markdownNotes.openWithMarkup`) shows in the Command Palette only for a document of the clean editing view (`resourceScheme == markdown-notes`).
- The contributions `markdown.markdownItPlugins`, `markdown.previewStyles` and `markdown.previewScripts` connect the extension with the built-in Markdown preview. The Markdown extension of VS Code activates the extension and reads its export `extendMarkdownIt`. The section [Markdown preview](#markdown-preview) explains it.
- `viewsContainers.secondarySidebar` and `views` contribute the side view "Notes" (`nimblescape.markdownNotes.notes`, a webview) in a container "Markdown Notes" of its own with the icon `resources/notes-view.svg`, in the secondary side bar only, so that the primary side bar stays free for the Explorer ([R-SIDE-001](docs/requirements.md#r-side-001)). VS Code 1.125, the oldest supported version, already knows this place. The section [Side view](#side-view) explains it.
- The command "Add Note" is the button `+` in the title of the side view (`view/title`) and an entry of the context menu of the text editor (`editor/context`) while text is selected (`editorHasSelection`); the Command Palette shows it only then. The commands "Show Highlights" and "Hide Highlights" are buttons in the title of the text editor, of the preview of a Markdown file and of the modes "Markdown Preview" and "Markdown Editor" of VS Code (`editor/title`); the context key `nimblescape.markdownNotes.highlightsShown`, which the extension sets while the setting `showHighlights` is on, shows one of them. The command "Show or Hide Notes" is a button in the same titles (`activeCustomEditorId` for the modes). A test checks the commands and the menus against `src/notesView.ts`, `src/extension.ts` and `src/noteEditor.ts`.
- The four commands "Delete Left of a Hidden Marker", "Delete Right of a Hidden Marker" and their word forms are the keybindings of Backspace, Delete, Ctrl+Backspace and Ctrl+Delete (on macOS Alt+Backspace and Alt+Delete) while the cursor is next to a hidden marker. The editor sets the context keys `nimblescape.markdownNotes.markerLeft` and `nimblescape.markdownNotes.markerRight` for this, only when their value changes. The Command Palette does not show them.
- The configuration contribution declares the settings of `src/settings.ts` in the section `nimblescape.markdownNotes`; `openLinksIn` has the scope `resource`, so that a folder of a workspace can have its own value, and `showHighlights` and `addFormatComment` the scope `window`. A test keeps the defaults equal to `src/settings.ts`, and a test checks that the README and the guide name every setting.
- `configurationDefaults` makes the extension the default formatter of Markdown files (`editor.defaultFormatter` for `[markdown]`), and turns on no `editor.formatOnSave`, because VS Code would then format every Markdown file on a save ([R-FMT-001](docs/requirements.md#r-fmt-001), decision 19). The extension formats a file with notes itself before its save: `changesOnSave` of `src/formatter.ts` decides and `saveEdits` returns the edits in `waitUntil` of `onWillSaveTextDocument`. It formats a Markdown file with notes or with the comment of the format while the setting `formatOnSave` is on, and not for an automatic save after a delay, nor when `editor.formatOnSave` is on for the document (VS Code runs the formatter then) or another default formatter is set. In the same edit it adds a missing comment of the format to a file with notes while the setting `addFormatComment` is on, also when another formatter formats the file, and not for an automatic save after a delay ([R-NOTE-007](docs/requirements.md#r-note-007), decision 20). The settings of the user and of a workspace for `[markdown]` win over these defaults. A test checks them.
- `icons` contributes the icons `nimblescape-highlights-show` and `nimblescape-highlights-hide`, the characters U+E001 and U+E002 of the icon font `resources/notes-icons.ttf`, and the commands "Show Highlights" and "Hide Highlights" show them as `$(nimblescape-highlights-show)` and `$(nimblescape-highlights-hide)` ([R-GEN-011](docs/requirements.md#r-gen-011), decision 26). VS Code draws an icon of a font in the icon color of the theme, as its codicons; an SVG file as the icon of a command would need a file for the light and one for the dark themes, with fixed colors. VS Code 1.125 already knows the contribution. A test checks the icons and that the font has both characters ([Icon font](#icon-font)).
- The untrusted-workspace and virtual-workspace capabilities state that the extension works in both.
- The package has no runtime dependency: the bundle contains markdown-it. The development dependencies are the build, test and packaging tools. `allowScripts` lists the install scripts of dependencies that npm 11.19 and later may run: those of esbuild and `@vscode/vsce-sign` in every version, because the build and the packaging (`npm run package`) run the code of both packages anyway and Dependabot updates them, and not the one of fsevents, an optional package for macOS that already contains its built binary.

`README.md` is the page of the Marketplace and `CHANGELOG.md` its tab
"Changelog". vsce checks their images: an image must come from an `https`
address and must not be an SVG. Both files and `SUPPORT.md` use full
`https://github.com/…` links outside code, so that every link works in the
repository, in the package and on the Marketplace. A test checks it, and a
test checks that the package script keeps the checks of vsce.

### Icon font

The buttons "Show Highlights" and "Hide Highlights" show a highlighter pen
over its line, and the same pen with a stroke from the top left to the
bottom right. `resources/icons/highlighter.svg` is the image of the pen, on
16 × 16 pixels with strokes of 1 pixel, as the codicons. The script
`scripts/icon-font.py` builds the font `resources/notes-icons.ttf` from it: it
turns the strokes into outlines, adds the stroke of "Hide Highlights" with a
gap of 1 pixel on both sides, and writes the font with the metrics of the
codicon font (300 units for 16 pixels). The font is in the repository, and
the package holds the font and not the image. After a change of the image,
build the font again and check both icons in VS Code, in a dark and in a
light theme:

```sh
python3 -m pip install fonttools picosvg skia-pathops
python3 scripts/icon-font.py
```

The same image gives the same font, because the script writes a fixed date
into it.

## npm package

`cli/` is the npm package `@nimblescape/markdown-notes`, in the scope of the
organization `nimblescape` on npmjs.com, with the command `markdown-notes`,
the formatter on the command line for programs and AI agents
([R-FMT-004](docs/requirements.md#r-fmt-004)). The npm package
`@nimblescape/typescript` of the extension nimblescape TypeScript has the
same form. Its manifest `cli/package.json` has these parts:

- The name `@nimblescape/markdown-notes` and the command `markdown-notes` (`bin`). The Marketplace has no scopes, so the extension keeps the form of [Naming](#naming).
- The version, which the release sets to the version of the extension. A test checks that both manifests and `cli/package-lock.json` have one version.
- `files` keeps the bundle of `dist/` and `THIRD-PARTY-NOTICES.md`, which the build copies into `cli/`, because the bundle holds markdown-it; npm adds `package.json`, `README.md` and `LICENSE`. A test checks the list with `npm pack --dry-run`.
- `engines.node` is `>=22`, and the package has no dependency: the bundle imports only modules of Node.js, which a test checks.
- `repository.directory` is `cli`, and `publishConfig.access` is `public`, which a scoped package needs for its first version.

`cli/README.md` is the page of the package on npmjs.com, with full
`https://…` links only. The package of the extension holds no file of
`cli/`: the extension formats with its own copy of the formatter.

## Notes

`src/notes/` reads and writes the notes, without the API of VS Code. A note
is a Markdown footnote whose label is `note-` and four small letters or
digits, and whose first line is the header of an answer, the GitHub login in
bold and the date: `[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00`
([R-NOTE-001](docs/requirements.md#r-note-001),
[R-NOTE-002](docs/requirements.md#r-note-002)). Every other footnote is no
note, and the extension never changes it. The extension and the plugin find
the notes with markdown-it, the parser of the preview, with its options
(`html: true`) and with the rules of the extension (`addNoteRules`). So the
text editor and the preview always agree on the notes:

- The block rule `nimblescape_note` reads the definition of a note as
  markdown-it-footnote reads a footnote: the lines indented by four spaces,
  and a lazy line of a paragraph, are blocks of the note. It runs before the
  rule `footnote_def` of markdown-it-footnote when the instance has it, and
  else before the rule `reference`, so that the rules of footnotes never see
  a note, in both orders of the plugins. Its tokens stand between the tokens
  `nimblescape_note_open` and `nimblescape_note_close`. A definition inside a
  note is no note, so a note holds no note.
- The inline rule `nimblescape_note_reference` runs before `footnote_ref`, or
  before `link`, and takes a reference `[^note-7k2q]` of a note of the
  document; a reference before its definition works, because markdown-it
  parses the blocks of the whole document before the text of the blocks. The
  reader of the extension takes every reference of the form of a note, also
  without a note, for the warnings (`nimblescapeAllReferences`).
- The inline rule `nimblescape_note_marker` runs before `html_inline` and
  takes a start marker `<wbr><!--[note-7k2q-->` or `<!--[note-7k2q-->` in the
  text of a block, with the name of its color.
- A core rule after `normalize` starts the registry of the notes of a parsing
  anew, because the preview can parse a document with the same environment
  more than once.
- `src/notes/notes.ts` adds the rule for the front matter of a document that
  the Markdown preview of VS Code has, so a footnote in it is no note.

**Threads** ([R-NOTE-004](docs/requirements.md#r-note-004)). `readNote` in
`src/notes/syntax.ts` reads the answers of a note as a tree. The body of the
first answer follows its header. Each further answer is a block quote whose
first line is a header; the number of its quote markers `>` is its depth,
and the answer before it with a lower depth is its parent. A line belongs to
the last answer whose depth is not greater than the number of its quote
markers, except a lazy line, which continues the paragraph before it.
`noteLines` writes the lines of a note for a list of answers in this order,
with a blank line at the level of the parent before each reply.

markdown-it keeps the line of each block, not the column of a reference, and
the text of a block in a block quote or a list item loses the prefix of each
line. `read` in `src/notes/notes.ts` therefore finds each line of the text of
a block at the end of its line of the document, and from it the column of a
reference or a start marker. A note also keeps the prefix of its lines (the
markers `>` and the indentation of list items), which an edit puts before
each line it writes.

`src/notes/edits.ts` returns one edit for the save, the reply or the deletion
of an answer, and for the addition or the deletion of a note. It writes a
text only when the changed document holds the same note at the same place
with the expected answers, headers, bodies and depths, when `findNotes`
reads it again ([R-EDIT-002](docs/requirements.md#r-edit-002)). This one
check refuses a text that would start another answer, end the note early or
change the Markdown around the note. A reply goes after the replies to the
same answer, one level deeper ([R-EDIT-005](docs/requirements.md#r-edit-005)).
Deleting an answer moves its replies up one level, and deleting the only
answer deletes the note ([R-EDIT-004](docs/requirements.md#r-edit-004)).

**Place of a new note** ([R-NOTE-005](docs/requirements.md#r-note-005),
[R-EDIT-003](docs/requirements.md#r-edit-003)). `placeFor` takes a range of
the editor in a paragraph, a heading, a list item or a table cell. The
reference goes at the end of the range, but never into the text of a link or
into a code span: then it goes after them. The definition goes after the
outermost block of the reference, such as the whole list or the whole block
quote, at the start of the line, after the notes of the references before it,
with a blank line before and after it. `newLabel` draws a label that no
footnote of the file uses.

**Highlights** ([R-NOTE-006](docs/requirements.md#r-note-006)). The
highlight of a note goes from the end of its start marker to the start of its
reference. `insertNote` always writes the start marker `<wbr><!--[note-7k2q-->`,
with the name of the color after the label for a color other than blue:
cmark-gfm, the renderer of GitHub, reads a comment at the start of a line as
an HTML block and ends the paragraph, and the empty element `<wbr>` before the
comment keeps the line in the paragraph. A note of an older file without a
start marker has the highlight from the start of the text of its block, for
the warning and for the formatter, which adds the marker there. `colorNote`
writes the color into the start marker. `deleteNote` removes the start marker
and the reference with the definition. The storage of the notes stays in
`src/notes/`, so that another form of storage changes only this folder.

**Warnings** ([R-TEXT-008](docs/requirements.md#r-text-008)). `checksOf` in
`src/notes/checks.ts` gives the warnings of the notes of a text from the
reading of `read`: no blank line before or after a note, a line of a note
without the indentation of four spaces, a second note of a label, a
reference without a note or a note without a reference, a note in a block
quote, a reference in the text of a link, in a heading or in a note, a
note without a start marker or without highlighted text, and a start marker
without `<wbr>` at the start of a line.

**Version of the format** ([R-NOTE-007](docs/requirements.md#r-note-007),
decision 21). `formatVersion` in `src/notes/doctype.ts` is the semantic
version that the comment of the format names, `v1.0.0` until the first
release. After the first release, each change of the form of the notes in
`src/notes/` or of the words of the comment raises it, together with
`docs/format.md`: MAJOR for a form that an older version reads wrongly, with
a new specification file that `specUrl` names, MINOR for optional elements
that an older version reads and keeps, PATCH for a change of only the words
of the comment or of the specification. `doctypeEdit` writes an existing
comment anew only when `formatVersion` is higher than its version, and
`newerFormat` stops the changes of the notes only for a higher major
version, so that two versions of the extension never change a comment back
and forth.

## Text editor

`src/noteThreads.ts` holds the notes of the open Markdown documents of a
writable file system: one thread for each note, with an identifier that the
side view uses. After each change of a document, and a pause of 300 ms, the
extension reads the notes again. A thread keeps its identifier when the note
is at the position where the extension just wrote it, or when the note has
the same text as before; so the side view keeps its selected thread and its
open editors while the user types elsewhere. The extension also gives the
warnings of `checksOf` as diagnostics. The extension uses no comments API of
VS Code ([R-GEN-009](docs/requirements.md#r-gen-009)).

`src/noteEditor.ts` adds the overlay of the notes to the text editor, with
decorations, folding ranges and a hover provider only, so that the editor and
the other extensions of Markdown stay as they are
([R-GEN-007](docs/requirements.md#r-gen-007)):

- **Folds** ([R-TEXT-005](docs/requirements.md#r-text-005)):
  `src/notes/folds.ts` computes a folding range of the kind `Comment` for each
  note on lines of its own, which starts on the last line of text before the
  note. VS Code keeps only one of two folding ranges that start on the same
  line, and drops a folding range that starts inside another one and ends
  after it. The Markdown extension of VS Code folds the section of each
  heading, each list item, block quote, table, code block and block of HTML,
  from its first line to its last line without one blank line at its end, and
  gives no fold of one line. A fold of a note therefore starts on the last
  line of a paragraph whose lines are text at the start of the lines, or on a
  list item of one line at the start of a line with one blank line after it,
  else on the last blank line before the note, else on the note itself; and
  it never takes the last blank line before a heading. The extension
  collapses the folds with the command `editor.fold` (`levels: 1`,
  `direction: 'down'`, `selectionLines`) the first time a document is in the
  text editor, after the edits that it makes then, such as the comment of the
  format. VS Code tells no extension which folds are collapsed; the extension
  reads it from `TextEditor.visibleRanges`, which split at a collapsed fold.
- **Kept folds** ([R-TEXT-005](docs/requirements.md#r-text-005)): the editor
  folds a note again when the visible ranges show it open, and moves a cursor
  out of it. `editor.fold` with `direction: 'down'` folds the innermost region
  at a line, which is the fold of a heading while VS Code has not read the
  folds of the note yet; the editor therefore folds again only for a version
  of the document whose folding ranges VS Code read, `keepTime` (300 ms)
  after the reading.
- **Highlights** ([R-NOTE-006](docs/requirements.md#r-note-006),
  [R-GEN-011](docs/requirements.md#r-gen-011)): one decoration type for each
  color highlights the text of the notes while the setting `showHighlights`
  is on and the side view is visible, with a mark in the overview ruler, one
  dimmed type for the other notes while a note is selected, and one strong
  type with an outline for the selected note of `src/selectedNotes.ts`, also
  while the others are hidden. The highlights are styles of the text, given
  with `textDecoration` (an underline and a background color), not
  `backgroundColor`: VS Code places the background of a line by the number of
  its characters, which counts the hidden markers, so that a background after
  a hidden marker stands too far to the right or does not show (measured in
  VS Code 1.143). A hidden highlight shows under the pointer: VS Code asks the
  hover providers for the place of the pointer, so the hover provider of the
  overlay learns the note under the pointer there and returns no hover.
- **Hidden markers** ([R-NOTE-006](docs/requirements.md#r-note-006)): the
  start markers and the references get the decoration type with
  `textDecoration: 'none; display: none;'`, which hides their text, also on
  the line of the cursor. `src/notes/cursor.ts` moves a cursor inside a
  marker to its edge in the direction of its move
  (`onDidChangeTextEditorSelection`), and the commands of Backspace and
  Delete next to a marker delete the character or the word on the other side
  of it.
- **Headers** ([R-TEXT-007](docs/requirements.md#r-text-007)): `headersOf` in
  `src/notes/folds.ts` gives the place of the header line of each answer:
  from the label `[^note-7k2q]:` of the first answer, or from the text after
  the quote markers of a reply, to the end of the line. Outside a closed
  fold, the header gets the hidden decoration and a `before` attachment with
  the author and the date in the local time of the reader, and the date in
  the local time of the author as its `hoverMessage`. VS Code shows the
  attachments of the hidden lines of a closed fold at the end of its first
  line, so the headers in a closed fold get none; a fold that starts on the
  first line of a note shows the header of that line. A cursor on a header
  line, or in the lines of a collapsed note, goes to the next free line in
  the direction of its move, and Backspace or Delete that would join a line
  with a header line does nothing.

`src/slashCommands.ts` registers a completion item provider for the language
`markdown` with the trigger character `/`
([R-EDIT-008](docs/requirements.md#r-edit-008)). VS Code asks it after a
typed slash also in a Markdown file, where `editor.quickSuggestions` is off;
each suggestion has its own range, from the slash, or from the spaces before
it for a command that removes its text, and its `filterText`, so the typed
letters narrow the list. VS Code replaces selected text with the typed
slash: the provider keeps the last selected text of each document with the
version of the document, and a change that replaces exactly that selection
with `/` in the next version makes the text that `/note` and `/todo` put
back. `/todo` and `/note` run `nimblescape.markdownNotes.slashNote`, which
calls `NotesView.addFromText`: it selects the text in the text editor and
opens the editor of the new note, as `addFromPreview` does, through
`newNoteAt`. `/footnote` writes the reference with its range and runs
`nimblescape.markdownNotes.slashFootnote`, which writes the definition with
`TextEditor.edit` without an undo stop before it, so that one Undo takes
both back, and puts the cursor into it. The two commands are in no menu and
not in the manifest.

`src/addNoteAction.ts` gives the selected text the Code Action "Add Note"
([R-EDIT-006](docs/requirements.md#r-edit-006), decision 22). VS Code asks
the provider with the selection of a text editor, for the light bulb after
each change of the selection and for Ctrl+.; the provider returns the action
for one selection of a visible text editor that `highlightFor` of
`src/notes/edits.ts` accepts, a selection in one block of text, and nothing
for another range, because the command adds the note to the selection. The
light bulb lists every kind but `source`, in groups by kind with the quick
fixes first, so the kind `quickfix.markdownNotes.addNote` puts "Add Note" at
the top, before "Rewrite" and "Surround With", which VS Code offers itself
for selected Markdown text (seen in VS Code 1.144). The keybinding of the
manifest runs the same command with Shift+Alt+N, on a Mac with Cmd+K N; a
test in VS Code checks against the default keybindings
(`vscode://defaultsettings/keybindings.json`) that VS Code binds no other
command to the key. `readNotes` reads a text without a note without
markdown-it and has no blocks for it, so the action and the side view use
`textReadingOf` of `NoteThreads`, which reads the blocks of such a text once
for each version.

The operations `saveAnswer`, `answer` (with the parent of a reply),
`addNote`, `colorNote`, `saveNoteText`, `deleteAnswer` and `deleteNote` of
`NoteThreads` write the changes of the side view. Each one reads the notes of
the document first, so that the edit fits the current text, and returns the
problem of a refused text, whose message `problemMessage` gives. The side view
names an answer with an `AnswerRef`: its index, and its author, its date and
its body as the file holds them. `saveAnswer`, `answer` and `deleteAnswer`
write nothing and return the problem `changed` when the answer at that index
has another author, date or body, for example after a second click on "Delete" before the view showed
the new state, or after a change of the file by a collaborator; `saveNoteText`
does the same when the text of the note is not the text that the text view
started with. A change of a setting keeps the threads and their IDs, so the
open editors and the selection of the side view stay. `NoteThreads` writes no
comment of the format on its own: the comment comes with the edit of a note
(`src/notes/edits.ts`) and with the save of a file with notes
(`saveEdits` of `src/formatter.ts`), never because an editor shows a file.

## GitHub sign-in

`src/github.ts` asks the authentication provider `github` of VS Code for a
session with the scope `read:user` and returns the name of its account, the
GitHub login ([R-GEN-006](docs/requirements.md#r-gen-006)). `answer` and
`addNote` ask with `createIfNone`, so that VS Code asks the user to sign in;
without a session, they return the problem `signIn` and write nothing. The
side view asks with `silent`, to show the account without a dialog, and
follows `vscode.authentication.onDidChangeSessions`. The extension never
reads the access token. The tests in VS Code add no note and no answer,
because a test cannot sign in; the unit tests cover them with the fake API.

## Clean editing view

`src/cleanView.ts` gives the text editor the clean text of a Markdown file
with notes ([R-TEXT-009](docs/requirements.md#r-text-009)), from the file
system `markdown-notes` of the extension. The URI of a clean document has the
path of its file, so that the tab shows the name of the file and VS Code
reads it as Markdown, and the scheme and the authority of the file in its
authority, so that a relative link of the view leads to the view of the file
of the link. `src/notes/clean.ts` projects the text of the file
(`project`): the clean text, the hidden parts and the highlights in the clean
text. Each change of a clean document goes into the model of its file at once,
change by change as VS Code reports them (`applyClean`), and the extension
writes the model into the document of the file with a workspace edit; a
change of the file from elsewhere, for example a note of the side view, goes
back into the clean document. VS Code types over a selection as a replacement
with the first letter and then single insertions, and reports the moves of
the cursor late, so the view keeps the range of the text typed at the end of
a highlight (`typing`), where the next letters stay in the highlight. Undo
and Redo of the view find the text of the file of the clean text in a
history. A save of the view saves the document of the file, so that the
format on save and the comment of the format run on the file.

The extension switches each visible text editor of a Markdown file with notes
to the view, in its group, when the active tab of the group shows the file:
`showTextDocument` with the selection and the first visible line of the
view, and then the tab of the file closes. A diff editor stays. VS Code
opens a tab of each document with changes that are not saved
(`TextFileEditorTracker`), also of a file that only its view changed; such a
tab closes after the save, and after a close of the view without a save,
when the extension writes the text on disk back into the file and saves it
(`reverts` skips the format and the comment of this save). VS Code closes the
document of a file when its last tab closes, and an extension that opened a
document that a text editor shows holds no reference to it, so the extension
opens the document of the file of an open view again when VS Code closes it;
then VS Code keeps it for some minutes. The Markdown preview parses the text
of a document without its URI, and caches the tokens by the version of the
document, so the plugin of the preview asks the view for the text of the file
by the clean text (`sourceOf`), and a change of the file from elsewhere
refreshes the previews.

The Markdown preview of a clean document loads files only from the folder of
the document (its `localResourceRoots`), because a clean document belongs to
no folder of the workspace, and it reads a relative path of
`markdown.styles` from that folder too. So the file system gives each clean
URI that names no clean text as the file itself, read only (`resourceOf`): a
file that is no Markdown file, such as an image beside the file or the file
of a link, which the view then shows in its own text editor; a style sheet
of `markdown.styles` with a relative path, from the folder of the workspace;
and a file under the folder `~markdown-notes~` beside the document, by its
path in the folder of the workspace. The plugin of the preview gives each
image of a clean rendering such an address (`imageOf`), after the image rule
of VS Code, which wraps the rules of the plugins and keeps the address of the
text in `data-src`. Only files inside the folder of the workspace of the file
load this way, as for the preview of the file itself.

## Side view

`src/notesView.ts` is the provider of the webview view
`nimblescape.markdownNotes.notes` ([R-SIDE-001](docs/requirements.md#r-side-001)).
It follows the active text editor of a Markdown document that can have notes
and the line of its cursor, and sends the state of the view to its script
`media/notesView.js`: the name of the file, the line of the cursor, the
account, the selected thread, the threads with their answers, colors and
whole texts, the selected text of the text editor for a new note, the colors
of the notes, and the places of the highlights beside the text editor. The
extension renders the body of each answer with the command
`markdown.api.render` of the Markdown extension, so the side view renders as
the preview does, and keeps up to 200 rendered texts.

- The page has a content security policy with `default-src 'none'`, a
  nonce for its one script and styles only from its style sheet, without
  `'unsafe-inline'`, and loads files only from `media/`. The script sets its
  styles through the CSS object model (`element.style`), which the policy
  allows, and never writes a `style` attribute. It removes the elements and
  attributes that run code, and the `style` attributes, from the rendered
  HTML before it shows it ([docs/security.md](docs/security.md#side-view)).
- The script sends the actions of the user as messages: `save` (with the
  `AnswerRef` of the answer), `answer` (with the `AnswerRef` of the answer
  that a reply replies to), `add` (with the name of a color, and `todo` for a
  todo note), `color`, `todo` (the check box of a todo note, with `done`),
  `saveText` (the text view, with the text that it started with),
  `deleteAnswer` (with the `AnswerRef`),
  `deleteNote`, `reveal`, `render` (the preview of an editor), `openLink` (a
  click on a link of a rendered text, which `src/links.ts` opens),
  `deselect`, `signIn` and `ready`. A message of an editor has the number of
  its request, and the extension answers with `result` and the message of a
  refused text, or with `rendered`. The script keeps the open editors and the
  focus when a new state arrives. The key of the editor of an answer holds
  the author and the date of the answer and how many earlier answers of the
  thread have both, not its index, so an editor stays at its answer when an
  earlier answer goes, and closes when its answer goes.
- A link of the highlight of a note in the preview selects the note: the URI
  handler of `src/extension.ts` checks the link
  ([docs/security.md](docs/security.md#links-to-the-extension)) and calls
  `NotesView.choose` for the path `/select` of a click, and `NotesView.show`
  for the path `/open` of a double click, which runs the command
  `nimblescape.markdownNotes.notes.focus`. In the text editor, VS Code tells
  an extension no double click: `NotesView.doubleClicked` reads one from a
  change of the selection with the mouse to the word around the cursor of
  the change before. `NotesView.follow` keeps the note at the cursor of each
  document (`atCursor`), so that the cursor that leaves the selected note
  deselects it. The view reads the GitHub login once for each change of the
  sessions (`account`), because VS Code can take seconds for a session.
- `retainContextWhenHidden` keeps the page, and so the open editors, while
  the view is hidden.
- **The header with the filters** ([R-SIDE-008](docs/requirements.md#r-side-008)):
  the script builds the header (`header.top`, `position: sticky`) once,
  outside the element of the list that it builds anew for each state, so
  that the search field keeps its text and the focus. It filters the threads
  of the state itself, without a message: the todo state of each thread
  (`todo` of `ThreadState`, from the header of its first answer), the name
  of its color, and the authors and the bodies of its answers. The filter
  stays in `vscode.setState`. A `ResizeObserver` gives the height of the
  header to the CSS variable `--header`, which `scroll-margin-top` of the
  threads and the editors uses, so that a thread that scrolls to the top
  stands below the header.
- The button "Show or Hide Notes" in the title of the Markdown editors runs
  `nimblescape.markdownNotes.notes.focus`, or
  `workbench.action.closeAuxiliaryBar` while the view shows, because VS Code
  has no command that closes one view
  ([R-SIDE-006](docs/requirements.md#r-side-006)). The button "Hide Notes"
  in the title of the view (`view/title`) runs the same close command. Its
  `when` clause shows it only while the view is in the secondary side bar and
  `workbench.activityBar.location` is not `default`: for the default place,
  VS Code shows its own button "Hide Secondary Side Bar" in the title of the
  secondary side bar.
- **The view next to the text** ([R-SIDE-007](docs/requirements.md#r-side-007),
  decision 25): the view is a list in the order of the file, which the user
  scrolls. The script scrolls the selected thread to the top of the page with
  `scrollIntoView` when the state names another selected thread, smoothly
  unless the system asks for reduced motion, and keeps the scroll position
  when it shows a new state. The extension sends no layout of the text
  editor: VS Code tells an extension only the whole visible rows of a text
  editor, after the scroll (decision 14, the view aligned to the text editor,
  moved in steps and late). A click on a thread sends `reveal` with
  `focus: false`, which shows the note with `preserveFocus`.
- **Tooltips** ([R-SIDE-002](docs/requirements.md#r-side-002)): the elements
  have the attribute `data-tooltip` and no `title`, because the tooltips of
  `title` did not show in the view on macOS. One element `#tooltip`
  (`role="tooltip"`) shows the text below its element, inside the page:
  after 500 ms under the pointer (the default of `workbench.hover.delay`), at
  once while another tooltip shows or just hid, and for the focus of a key
  (`:focus-visible`). A press, Escape, a scroll and a new state hide it. An
  element without `aria-label`, such as a date, gets `aria-describedby` while
  its tooltip shows.
- **New note** ([R-SIDE-003](docs/requirements.md#r-side-003)): "Add Note",
  the light bulb action and the shortcut run the command
  `nimblescape.markdownNotes.newNote`, which ignores its arguments, such as
  the URI that a menu passes. Without selected text, the command shows a
  message and opens no editor. Else it focuses the view and sends `new` to
  the script, or keeps the request until the script of a view that opens
  just now sends `ready`. The editor of the new note starts in the default
  color, and an open editor keeps its text and color.
- **Highlights with the view** ([R-GEN-011](docs/requirements.md#r-gen-011)):
  `onDidChangeVisibility` of the view tells `src/extension.ts` when the view
  shows or hides, which sets the context key of the buttons, decorates the
  text editors again and renders the previews again.

## Markdown preview

The version of `markdown-it` and `@types/markdown-it` follows the version that
the built-in Markdown preview of VS Code uses (the `markdown-it` dependency of
[extensions/markdown-language-features/package.json](https://github.com/microsoft/vscode/blob/main/extensions/markdown-language-features/package.json),
version 14 on 2026-10-28), so that the extension finds the notes as the
preview does. Dependabot offers no major versions of them
(`.github/dependabot.yml`); move to a new major version only when VS Code does.

The plugin `src/markdown/markdownIt.ts` adds the rules of the notes and the
core rule `nimblescape_notes` after the rules of markdown-it and of the other
plugins:

- The core rule takes the tokens of each note out of the tokens of the
  document, with the tokens `nimblescape_note_open` and
  `nimblescape_note_close`, so the preview shows no text of a note, no icon
  and no callout ([R-PREV-001](docs/requirements.md#r-prev-001)). A footnote
  that a note names in its text stays in the list of the footnotes of the
  page.
- The start marker of a note becomes the start of its highlight and its
  first reference the end: empty elements `span.nimblescape-note-edge` with
  the ID of the highlight (`data-selection`) and `data-edge="start"` or
  `"end"`. The end holds the number of the color (`data-color`), the label
  (`data-note`) and the link that selects the note in the side view
  (`data-href`, `vscode://nimblescape.nimblescape-markdown-notes/open` with
  the document and the line of the note,
  [R-PREV-003](docs/requirements.md#r-prev-003)); `data-hidden="true"` while
  the highlights are hidden, and for the selected note `data-selected`, the
  number of a request to scroll (`data-reveal`) and the link that deselects
  it (`data-deselect`). A note whose start marker stands directly before its
  reference has no highlight. A later reference of a note, a reference in a
  note and a start marker that is no start of a highlight show nothing. The
  notes never show as footnotes ([R-PREV-004](docs/requirements.md#r-prev-004)).
- Every other footnote renders as without the plugin.
- The core rule `nimblescape_page` adds a block token at the end of the
  page: a hidden element `div.nimblescape-note-page` with the link of "Add
  Note" of the preview (`data-add`, `vscode://nimblescape.nimblescape-markdown-notes/add`
  with the rendered document, [R-PREV-008](docs/requirements.md#r-prev-008)),
  for a document that is open and can have notes; else it renders nothing.

The script `media/markdownPreview.js` paints the text between the start and
the end of each highlight, or from the start of the block of the end when a
note has no start marker, with the CSS Custom Highlight API (`CSS.highlights`,
one highlight `nimblescape-note-N` for each color, a dimmed one for the other
notes while a note is selected, a strong one under the pointer, and one for
the selected note with a frame of thin lines for each line of the text),
which changes no element of the page; a browser without the API shows no
highlight. A highlight with `data-hidden` shows only while its note is
selected or the pointer is on its text. VS Code passes a click in the preview
to the extension only when the click is on a link, so the script puts the
content of the page into a link of an open shadow tree of the body, with the
CSS `display: contents`, and gives it the address of `data-href` or of
`data-deselect` only for the time of a click, and only when the address is a
link to the extension (`ownLink`: the scheme of VS Code, the host
`nimblescape.nimblescape-markdown-notes` and the path `/open`, `/deselect` or `/add`),
because a document can write such an element in raw HTML
([docs/security.md](docs/security.md#links-to-the-extension)). The preview
loads the scripts of the extensions with `async` and adds its content to the
page with a script of its own when the page is parsed, so the script paints
at its start, at `DOMContentLoaded`, at `load` and after each update of the
content (`vscode.markdown.updateContent`).

For selected text of one block (the closest table cell or element with
`data-line`; not in `pre`), the script shows the button
`div.nimblescape-note-add` above the selected text after the release of the
mouse button and after each change of the selection. Its press keeps the
selection (`preventDefault`), and its click gives the link of the page the
address of `data-add` of the last `div.nimblescape-note-page` with the
`data-line` of the block, the text of the block before the selected text and
the selected text (`Range.toString`, without the transform of CSS). The URI
handler (`openFromLink` of `src/extension.ts`) takes only an open document
and calls `addFromPreview` of the side view, which finds the text in the
rendered document with `renderedRange` of `src/notes/rendered.ts`, maps a
place of the clean editing view to the file, checks it with `highlightFor`
and opens the editor of the new note. The preview of the clean editing view
names the lines of the view in `data-line`, and its page shows the text of
the view, so the extension reads the text of the view.

`src/markdown/compatibility.test.ts` renders the notes together with the
markdown-it plugins of other Markdown extensions
([R-GEN-007](docs/requirements.md#r-gen-007)), in both orders of the plugins:
markdown-it-footnote, markdown-it-emoji and markdown-it-task-lists, which are
development dependencies in the major versions of the extensions of Matt
Bierner, and stand-ins for the fences of Mermaid and the frame of the GitHub
styles. `src/testing/markdownItPlugins.d.ts` declares the types of the three
packages, which have none.

The preview gives every token with lines the attribute `data-line` and the
class `code-line` after the plugins of the extensions, for the scrolling with
the editor. The plugin takes the tokens of the notes out of the tokens of the
document, so the scrolling uses only the elements of the document.

The preview parses a document once for each version, without the document in
the environment of the parsing, and renders it again for each change of a
setting. So the core rule does the same for every document, and the render
rules read the setting `showHighlights`
([R-PREV-005](docs/requirements.md#r-prev-005)), the selected note and the
links for the document
that the preview names in `currentDocument` of the render environment. The
preview renders again only when its document or a setting of the Markdown
extension changes, so the extension runs the command
`markdown.preview.refresh` when one of its own settings changes, but only
while the Markdown extension is active: no Markdown preview is open before,
and the command would start that extension.

The Markdown Editor of VS Code (`vscode.markdown.editor`) has no extension
point for this: it renders with `@vscode/markdown-editor` and no markdown-it
plugin, its comments come from the proposed API `agentEditorComments`, and
its only contribution point is `markdown.codeBlockEditorProviders` for code
blocks ([R-GEN-001](docs/requirements.md#r-gen-001)). The mode "Markdown
Preview" (`vscode.markdown.preview.editor`) renders with the plugin, the
styles and the script, as the preview to the side does, and
`markdown.preview.refresh` renders it again
([R-PREV-006](docs/requirements.md#r-prev-006)). The side view follows the
active tab of both modes (`TabInputCustom` with the `viewType` and the
`uri`), and a click on a thread keeps the mode: in the preview it selects the
note with a request to scroll (`data-reveal`), and in the Markdown Editor it
runs `vscode.openWith` with the selection, which that editor reveals.

## Unit tests with the editor API

`src/testing/fakeVscode.ts` is a fake of the part of the API of VS Code that
the extension uses. `src/extension.test.ts` and `src/notesView.test.ts`
create a new fake for each test, give it to `vi.doMock('vscode', …)` and
import the extension anew. The fake applies a workspace edit to its documents
and fires the change event as VS Code does, records the decorations, the
folds, the hovers of the hover providers, the messages to the side view, the
information messages and the GitHub sessions, and has a
GitHub login (`login`) and the login of a sign-in (`signIn`), so that the
tests cover the new notes and answers that the tests in VS Code cannot add.

## Tests in VS Code

`npm run test:vscode` runs the tests of `test/vscode/` in a real VS Code with
the extension of the development build. The tests open Markdown files of a
temporary folder, read their notes with the export `notesOf` of the
extension, check the highlights, the hidden markers and the collapse of the
notes in the text editor, open the side view and run the buttons "Show
Highlights" and "Hide Highlights", ask for the hover over a selected text
with `vscode.executeHoverProvider`, run the formatter with
`vscode.executeFormatDocumentProvider`, and render the documents with the
command `markdown.api.render` of the Markdown extension, which uses the
markdown-it plugins of the extensions as the preview does. CI runs them
under `xvfb-run` with the stable VS Code, and the workflow "VS Code
versions" once per week with VS Code Insiders and with the lowest supported
version.

## Naming

Every extension of the publisher `nimblescape` uses one name,
`nimblescape-<name>`, for the repository, the package and the extension:

| What | Form | This extension |
| --- | --- | --- |
| Repository | `nimblescape/nimblescape-<name>` | `nimblescape/nimblescape-markdown-notes` |
| `name` in `package.json` | `nimblescape-<name>` | `nimblescape-markdown-notes` |
| Extension ID | `nimblescape.nimblescape-<name>` | `nimblescape.nimblescape-markdown-notes` |
| Package file | `nimblescape-<name>-<version>.vsix` | `nimblescape-markdown-notes-<version>.vsix` |
| Display name | `nimblescape <Title>` | `nimblescape Markdown Notes` |

The repository was created as `nimblescape/nimblescape-markdown` and renamed
to `nimblescape/nimblescape-markdown-notes` on 2026-10-28, before the
[Marketplace setup](#setup-of-a-repository), because
`scripts/marketplace-setup.sh` requires that the name of the repository equals
the `name` of `package.json`. GitHub forwards the old address to the new one.

The prefix keeps the name apart from the names of other publishers, because
the Marketplace accepts a `name` only once. The Marketplace cannot rename an
extension ID: another `name` publishes a new extension, and the old one stays
with its installations. An extension that is no longer wanted is unpublished
(More Actions > Unpublish; this can be undone), never removed: the Marketplace
keeps the `name` of a removed extension reserved permanently, also for its own
publisher.

## Release

A released version is a tag `v<version>` whose `<version>` equals the version
in `package.json` and in `cli/package.json`. The workflow "Release" creates
the version, its tag, its GitHub release, its Marketplace version and its
version on npmjs.com in one run. To release a version,
follow these steps:

1. Optional: add a section `## <version>` to `CHANGELOG.md` on `main`. The section describes the changes for the users (see [Release rules](#release-rules)).
2. In the tab "Actions", choose the workflow "Release", then "Run workflow" on the branch `main`. Enter the version, for example `0.1.7`. When `CHANGELOG.md` has no section for the version, enter its notes too: they become the section. The GitHub website starts a workflow also in the browser of a phone.

The run has five jobs:

1. "Version commit" checks that the run starts from `main`, that the version has the form `<major>.<minor>.<patch>`, that it is not lower than the version in `package.json` and that its tag does not exist, and, in a release, that a dry run tested the files of the release process with `scripts/release-checks.mjs dry-run` (rule 4 of the [release rules](#release-rules)). It sets the version in `package.json`, `package-lock.json`, `cli/package.json` and `cli/package-lock.json`, adds the section of the notes to `CHANGELOG.md` when the file has none, commits the change as "Release `<version>`" and pushes it to the temporary branch `release/run-<run ID>`, not to `main`. When `main` holds the version and its section already, it commits nothing. It also deletes the temporary branches of earlier runs that failed.
2. "CI" runs the workflow `ci.yml` for the commit of the version, because a push with the token of a workflow starts no other workflow. The VSIX and the npm package that this job tests and builds are the files of the release, so the release repeats no test and no build.
3. "Main, tag and GitHub release" runs only when CI passed. It moves `main` to the commit of the version as a fast-forward and deletes the temporary branch. When `main` changed during the run, it stops before the tag. Then it creates the tag `v<version>` on the commit and the release of the tag with the GitHub CLI `gh`. The section of the version in `CHANGELOG.md` becomes the notes, and the VSIX and the npm package (`nimblescape-markdown-notes-<version>.tgz`) become the files of the release. A release that exists keeps its notes and receives only a file that it does not hold.
4. "Publish to the Visual Studio Marketplace" downloads the VSIX of the GitHub release, signs in to Microsoft Entra ID with the official [`azure/login`](https://github.com/Azure/login) action and publishes the VSIX with `vsce publish --azure-credential`.
5. "Publish to npmjs.com" downloads the npm package of the GitHub release and publishes it with `npm publish --access public`, with [trusted publishing](https://docs.npmjs.com/trusted-publishers): npm exchanges the OpenID Connect token of the job for a token of npmjs.com that can publish only this package, and adds the provenance of the build. It skips a version that npmjs.com holds already, and it stops with a message when the package does not exist yet (see [npmjs.com setup](#npmjscom-setup)). This job is the only part of this section that the other extension repositories of nimblescape do not have.

`main` receives the version commit only after CI passed. When CI fails,
`main`, the tags, the releases and the Marketplace stay unchanged, and the
version can still be released: fix the cause on `main` and start the release
of the same version again. The jobs move and push with the token of the
workflow, so a rule of `main` that blocks direct pushes stops the release.

A dry run tests a release without a change: choose "Dry run" when you start
the workflow. The run makes the version commit on its temporary branch, runs
CI for it and deletes the branch; it changes neither `main`, a tag, a release
nor the Marketplace. Its run name ends with "(dry run)". A dry run may start
from another branch than `main`, so it also tests a change of `release.yml` on
that branch before the change reaches `main`.

When a job fails, remove the cause and choose "Re-run failed jobs" on the
run. A re-run keeps the tag and the files that the GitHub release already
holds, and the Marketplace and the publish job of npm skip a version that
they already hold, so a re-run never publishes a version twice. When the publish job fails, for example
because the Marketplace refuses the package, the tag and the GitHub release
stay, and the re-run publishes the VSIX of the GitHub release. GitHub allows a
re-run only within 30 days of the run; after that, only a new version can
reach the Marketplace. A new run deletes the temporary branch of a failed run,
so a failed run can no longer be re-run after a new run started.

The Marketplace refuses a package with more than 30 tags, with the error "You
exceeded the number of allowed tags of 30", which the Microsoft publishing
guide names. The tags are the keywords of `package.json` and the tags that
vsce adds, for example the language of each `onLanguage` event in
`activationEvents`; the element `<Tags>` of `extension.vsixmanifest` in the
VSIX lists them. No job counts them before the tag.

The workflows `release.yml`, `release-dry-run.yml` and
`marketplace-identity.yml`, the script `scripts/release-checks.mjs` with its
test `scripts/release-checks.test.mjs`, and this section are the same in every
extension repository of nimblescape. A change to them goes into every
repository.

### Release rules

Every extension of nimblescape follows these rules. Only rule 4 has a check
in the workflows, `scripts/release-checks.mjs dry-run`; everyone follows the
other rules without a check.

1. **The ID never changes.** An extension keeps its ID `nimblescape.nimblescape-<name>` (see [Naming](#naming)), and nimblescape never publishes an extension under a new ID.
2. **No deletion.** nimblescape never deletes an extension or a version of the npm package. No workflow, npm script or file of `scripts/` runs `npm unpublish`, after which npmjs.com never accepts the number of that version again, or `vsce unpublish`, which deletes the extension on the Marketplace, or `vsce delete-publisher`, which deletes the publisher with all its extensions. On the publisher management page, nobody uses More Actions > Remove, which deletes the extension and keeps its name reserved permanently, or "Delete this version" (More Actions > Reports, tab Manage), after which the number of the version can never be used again. An extension that is no longer wanted is unpublished on the publisher management page, as [Naming](#naming) describes.
3. **Only changes for the users, at most one version in 7 days.** A version is published only when it changes something for the users, its section in `CHANGELOG.md` describes that change, and at least 7 days passed since the newest release; an urgent fix may come earlier. A change for the users changes the extension that VS Code runs: its code (`src/`, which the build bundles into `dist/`), another file of the package that is not a document, for example the icon of a view, or a field of `package.json` that changes how the extension works, for example `contributes`. A change only of the documents (for example the README), the Marketplace icon, the tests or the build tools (for example `esbuild.mjs`, `tsconfig.json` or a file of `scripts/`) does not count: it reaches the users with the next version that changes the extension. Images that only the README shows do not belong in the package: the README links them with full `https://github.com/…` links (see [Manifest](#manifest)). The section of the version in `CHANGELOG.md` does not say "maintenance release", "behaves as in" followed by a version, or a phrase of that kind.
4. **Dry run first.** A change of the release process is tested with a dry run before it reaches `main`. The files of the release process are `release.yml`, `ci.yml`, whose VSIX the release publishes, and `scripts/release-checks.mjs`. The workflow "Release dry run" runs on every pull request. When the pull request changes one of these files, also in an update by Dependabot, the check `dry-run` fails until a successful dry run, or the newest release, had these files as they are at the head of the pull request. Start the workflow "Release" on the branch of the pull request with "Dry run" and a version without a tag (with notes when `CHANGELOG.md` has no section for the version), then re-run the job "release dry run" of the pull request. A pull request from a fork cannot meet the rule, because the dry run needs a branch of this repository. The job "Version commit" of a release runs the check `dry-run` again, so a change that reached `main` without a dry run stops the release until a dry run tested it. Do not make "release dry run" a required check of `main`: the release moves `main` to its version commit, which has no result of the check.
5. **Only GitHub Actions with Microsoft Entra ID.** Only the job "Publish to the Visual Studio Marketplace" publishes, signed in with the app registration of [Marketplace setup](#marketplace-setup). No personal access token exists for the publisher. No other workflow, npm script or file of `scripts/` runs `vsce publish` or `vsce login`. Nobody uploads a VSIX on the publisher management page or runs `vsce publish`, `unpublish`, `delete-publisher` or `login` on a computer. In this repository, the job "Publish to npmjs.com" publishes the npm package in the same way, with trusted publishing and no token; only the first version of the package is published once by hand, with `scripts/npm-setup.sh`, because npmjs.com sets up a trusted publisher only for a package that exists.

## Marketplace setup

The workflow publishes with a Microsoft Entra ID token, as the
[Microsoft publishing guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension#secure-automated-publishing-to-visual-studio-marketplace)
recommends. It uses no personal access token, because Azure DevOps retires
the global personal access tokens that the Marketplace needs on
1 December 2026. The publishing identity is an app registration with a
federated credential for each repository: GitHub Actions proves the identity
of the job with an OpenID Connect token, so no secret is stored. An app
registration needs no Azure subscription. One app registration publishes
every extension of the publisher `nimblescape`, because the Marketplace
grants the role of a member for the whole publisher.

### What exists

| Part | Where | Value |
| --- | --- | --- |
| Publisher | [Marketplace publisher management](https://marketplace.visualstudio.com/manage) | `nimblescape`, the `publisher` in `package.json` |
| App registration | [Microsoft Entra admin center](https://entra.microsoft.com), "App registrations" | `vscode-marketplace-publisher`, a member of the publisher `nimblescape` with the role "Contributor" |
| Organization variables | GitHub organization `nimblescape`, "Secrets and variables", "Actions", "Variables" | `AZURE_CLIENT_ID` (the application ID of the app) and `AZURE_TENANT_ID` (its directory ID); identifiers, not secrets |
| Federated credential | the app, "Certificates & secrets", "Federated credentials" | one for each repository, named after it |
| Environment | the settings of each repository, "Environments" | `marketplace`, reachable from the tags `v*` and the branch `main` only |

### Setup of a repository

A new extension repository needs its federated credential and its
environment. The script `scripts/marketplace-setup.sh` sets both up for the
GitHub repository of the remote `origin` of the clone, whose name must be the
`name` of `package.json`; it needs the Azure CLI, the GitHub CLI and Node.js,
the two CLIs signed in with an account that may change the app registration
and the settings of the repository. It shows what it sets up and
asks before it changes anything. It changes nothing that already exists, so it
can run again:

```sh
az login --allow-no-subscriptions
gh auth login
scripts/marketplace-setup.sh
```

Then run the workflow "Marketplace identity" in the tab "Actions" of the
repository: it signs in like the publish job and prints the member ID of the
app, which shows that the setup works.

The script gives the credential these values. For this repository:

| Field of the federated credential | Value |
| --- | --- |
| Issuer | `https://token.actions.githubusercontent.com` |
| Subject | `repo:nimblescape@156021698/nimblescape-markdown-notes@1436834257:environment:marketplace` |
| Audience | `api://AzureADTokenExchange` |

GitHub puts the owner ID and the repository ID into the subject of every
repository created after 15 July 2026, so a new owner of a reused name gets no
token. The subject also holds the name of the repository: after a rename of
the repository, run the script again and delete the credential of the old
name. One app accepts at most 20 federated credentials.

### Setup from scratch

Only when the publisher, the app or the variables are lost:

1. Create the publisher `nimblescape` on the publisher management page, signed in with the Microsoft account of nimblescape e.U.
2. Register the app `vscode-marketplace-publisher` in the Entra admin center: "New registration", "Single tenant", no API permission, no secret.
3. Set the organization variables `AZURE_CLIENT_ID` and `AZURE_TENANT_ID` to the application ID and the directory ID of the app. Organization variables reach private repositories only on a paid GitHub plan.
4. Set up a repository with the script, and run its workflow "Marketplace identity".
5. On the publisher management page, open the publisher `nimblescape`, then "Members", and add the member ID that the workflow printed with the role "Contributor".

## npmjs.com setup

The job "Publish to npmjs.com" publishes with
[trusted publishing](https://docs.npmjs.com/trusted-publishers): npmjs.com
trusts the workflow `release.yml` of this repository in the environment
`npm`, and accepts the OpenID Connect token of its job instead of a token.
No npm token is stored in GitHub.

### What exists

| Part | Where | Value |
| --- | --- | --- |
| Organization | [npmjs.com](https://www.npmjs.com/org/nimblescape) | `nimblescape`, the scope of the package |
| Package | npmjs.com | `@nimblescape/markdown-notes`, public |
| Trusted publisher | the settings of the package on npmjs.com, "Trusted Publisher" | GitHub Actions, the repository `nimblescape/nimblescape-markdown-notes`, the workflow `release.yml`, the environment `npm` |
| Environment | the settings of the repository, "Environments" | `npm`, reachable from the tags `v*` and the branch `main` only |

### Setup

npmjs.com sets up a trusted publisher only for a package that exists, so
the first version is published once by hand, from the GitHub release of
that version. The script `scripts/npm-setup.sh` does all steps. It needs the
GitHub CLI and npm 11.15.0 or newer, both signed in: npm with an account
that may publish in the organization `nimblescape` and has two-factor
authentication, because `npm trust` and the first `npm publish` ask for the
second factor. It shows what it sets up and asks before it changes
anything. It changes nothing that already exists, so it can run again. It
shows the trusted publishers of the package and asks whether to add the
trusted publisher: npm lists them only after the second factor, in the
terminal, so the script cannot check them itself:

```sh
gh auth login
npm login
scripts/npm-setup.sh          # before the first release: the environment npm
scripts/npm-setup.sh 0.2.0    # after the release 0.2.0: its first version and the trusted publisher
```

The order for the first version of the package:

1. Run `scripts/npm-setup.sh` without a version, so the environment `npm` exists.
2. Release the version with the workflow "Release". The job "Publish to npmjs.com" fails, because the package does not exist yet; the Marketplace and the GitHub release are not affected.
3. Run `scripts/npm-setup.sh <version>`. It downloads the npm package of the GitHub release, publishes it, and adds the trusted publisher.
4. Re-run the failed job "Publish to npmjs.com". It finds the version on npmjs.com and ends without a change.

From the next version on, the release publishes to npmjs.com without a step
by hand. Optionally, set "Publishing access" of the package on npmjs.com to
"Require two-factor authentication and disallow tokens" after the setup:
trusted publishing still works, and no token can publish.

---

© 2026 Hannes Stauss (scalarion@nimblescape.com) · [MIT License](LICENSE).
