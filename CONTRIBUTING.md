# Contributing

This guide explains the files, the development, the tests and the release of
the extension. The [README](README.md) describes the use in short, the
[user guide](docs/guide.md) describes every feature,
[docs/requirements.md](docs/requirements.md) lists what the extension must do,
each requirement with an ID, and [docs/security.md](docs/security.md)
describes its security model.

## Files

| File | Purpose |
| --- | --- |
| `src/extension.ts` | The editor wiring: activation starts the threads of the notes and the side view, returns the markdown-it plugin for the Markdown preview with the settings and the links of the rendered document, handles the links of the icons of the preview (`vscode://nimblescape.nimblescape-markdown-notes/open`) and the buttons of the preview that show and hide its notes, and refreshes the previews and the threads when a setting of the extension changes. |
| `src/github.ts` | The GitHub sign-in: the login of the GitHub session of VS Code, the author of new notes and answers. |
| `src/settings.ts` | The settings of the extension, their defaults, and the check of their values. It uses no API of VS Code. |
| `src/notes/syntax.ts` | The syntax of one note: the label `note-` and four random small letters or digits, the header line of an answer (`**login** · date`), the start marker `<!--[note-7k2q-->` and the reference `[^note-7k2q]`, the tree of answers with their depths and parents, the lines of a note for a list of answers, the dates of a header in the local time of the reader and of the author, and the rules of markdown-it 14 for the definitions, the references and the start markers of the notes. It uses no API of VS Code, so the extension and the plugin share it. |
| `src/notes/notes.ts` | The notes of a Markdown text by their places (line and column), with the prefix of their lines in a block quote or a list item, found with markdown-it as the preview finds them; their references, start markers and selections; the blocks of text with the lines of their outermost blocks; and the references and markers that the warnings need. It uses no API of VS Code. |
| `src/notes/colors.ts` | The color of each number of a note, which the text editor, the preview and the side view share. It uses no API of VS Code. |
| `src/notes/edits.ts` | The edits of the text when an answer is saved, added as a reply or deleted, and when a note is added or deleted, with the check that the changed text holds the same note with the expected tree of answers, and the place of the start marker, the reference and the definition of a new note. It uses no API of VS Code. |
| `src/notes/doctype.ts` | The comment of the format at the top of a file with notes, its "DOCTYPE": its lines with the version of the format and the address of the specification, its place after a front matter, and its edit together with each change of a note. It uses no API of VS Code. |
| `src/notes/checks.ts` | The warnings at the notes of a text: each form of a note that GitHub or another Markdown viewer shows differently from the extension. It uses no API of VS Code. |
| `src/noteThreads.ts` | The notes in the text editor and in the Comments view: the comment controller, one comment thread for each note of an open Markdown document with one comment for each answer, the commands of the buttons of the boxes, the warnings of the notes as diagnostics, and the operations that the side view uses too. |
| `src/noteEditor.ts` | The overlay of the notes in the text editor: the dimming after the cursor, the folding ranges of the notes, their collapse when a file is first in the active editor and the setting `keepNotesCollapsed`, the commands "Collapse Note", "Collapse All Notes" and "Expand All Notes" and the buttons "Hide Note Text" and "Show Note Text", the numbered markers in the left margin and the overview ruler, the highlight, the strong highlight of the selected note and the hidden start markers and references of the selections, the cursor that steps over them, the commands of Backspace and Delete next to a marker, and the rendered header lines. |
| `src/notes/cursor.ts` | The cursor at the hidden markers and at the header lines: the step over a marker, the lines where the cursor does not stay, and the part of the text that Backspace and Delete delete next to a marker. It uses no API of VS Code. |
| `src/selectedNotes.ts` | The selected note of each document, which the side view sets and the text editor and the preview show with a strong highlight, and the request of the side view to scroll the preview to it. |
| `src/notes/folds.ts` | The folds of the collapsed notes: which line of a text stays visible and which lines a fold takes, so that a note vanishes; and the places of the header lines of the answers. It uses no API of VS Code. |
| `src/notesView.ts` | The side view "Notes" in the secondary side bar: the webview view provider, its page with the security policy, the active Markdown file of a text editor or of the modes "Markdown Preview" and "Markdown Editor" of VS Code, the state of its threads with the rendered answers, their numbers, colors and marks, the visible lines of the text editor, the start of the funnel of the selected thread, the actions of its script, and the commands "Hide Notes", "Show or Hide Notes", "Show Funnels" and "Hide Funnels". |
| `src/links.ts` | The links of the rendered notes in the side view: web and mail links with the system, files in VS Code at a line or a heading, other schemes after a question, and no command links. |
| `src/format/format.ts` | The Markdown formatter: each paragraph on one line with its hard line breaks, the aligned columns of the tables by the width that the text editor shows, the white space at the ends of the lines, the blank lines between the blocks and the line break at the end, read with markdown-it as the preview reads the text, and the check that the formatted text shows the same blocks in the preview. It uses no API of VS Code. |
| `src/formatter.ts` | The provider of "Format Document" for Markdown files, which VS Code also runs on save: one edit of the changed lines with the line breaks of the document. |
| `src/editorLayout.ts` | The rows of a passage in the text editor, where the funnel of the side view starts: the rows of the visible ranges, the lines wrapped by words, and the estimate of the number of columns of a row. It uses no API of VS Code. |
| `src/markdown/markdownIt.ts` | The markdown-it plugin of the Markdown preview: writes the reference of each note as an icon with a hidden callout, the start marker as the start of its selection, and leaves every other token, also every other footnote, as it is. |
| `media/markdownPreview.css`, `media/markdownPreview.js` | The styles of the icons and the callouts in the Markdown preview, with the colors of the theme of VS Code and of the notes, and the script that shows the callout of an icon on hover and focus, highlights the selections, selects and deselects a note on a click, and draws the band of the selected note to the right edge of the preview. |
| `media/notesView.js`, `media/notesView.css` | The script and the styles of the side view: the threads with their badges, the answers, the editors with the tabs "Write" and "Preview", the strip and the funnels, and the messages to the extension. |
| `resources/notes-view.svg` | The icon of the container of the side view in the title of the secondary side bar: a speech bubble, which VS Code draws in the color of the title. |
| `resources/icon.png`, `resources/icon.svg` | The Marketplace icon (256 × 256 PNG, because the Marketplace takes no SVG icon) and its source: a page with a note as a callout on the tile of the nimblescape extensions. |
| `src/**/*.test.ts` | The unit tests, with vitest: the manifest, the package contents, the third-party notices and the documents (`src/manifest.test.ts`), the syntax, the notes, the edits and the warnings, the markdown-it plugin with the source map rule of the preview, the settings, the folds (`src/notes/folds.test.ts`), the activation and the threads (`src/extension.test.ts`), the overlay of the text editor (`src/noteEditor.test.ts`) and the side view (`src/notesView.test.ts`) with a fake of the editor API (`src/testing/fakeVscode.ts`). |
| `test/vscode/` | The tests in a real VS Code: the threads of the notes with their answers, the save, the refused text, the delete, the side view, and the icons and callouts of the Markdown preview of VS Code (`markdown.api.render`). |
| `dist/` | The bundle `dist/extension.js`, built by `esbuild.mjs` and kept out of Git. |
| `out/`, `.vscode-test/` | The bundled tests in VS Code (`scripts/build-vscode-tests.mjs`) and the VS Code that `@vscode/test-cli` downloads for them, kept out of Git. |
| `docs/guide.md` | The user guide: every feature, how to use it, and its state. |
| `docs/format.md` | The specification of the format of the notes, for people and programs such as AI agents. The comment of the format links to it on the branch `main`, so the file keeps its path. |
| `docs/example.md` | A document with notes of each kind: a tree of replies, code blocks, a task list, a passage with a start marker, and a footnote that is no note. GitHub shows it as the readers of a repository see the notes. |
| `docs/requirements.md` | The requirements, each with an ID as its heading, and the plan of the steps. |
| `docs/security.md` | The security model: what the extension does on your computer, what it protects, and where its protection ends. The section "What the extension does on your computer" at the top of the README lists the same behaviors in short. |
| `docs/images/` | The image of the README: `notes.png`, a screenshot of VS Code 1.143 in the theme Dark Modern under Xvfb in the zone Europe/Vienna, with the text editor with a note and its open box with a tree of three answers, the Markdown preview with the callout of an icon on hover, and the side view "Notes" in the secondary side bar. PNG and GIF files only, because the Marketplace shows no SVG image. The README links its images with full addresses on the branch `main`, which the Marketplace requires; they are not part of the package. A test checks that each image of the README is a GIF or PNG file in this folder. |
| `THIRD-PARTY-NOTICES.md` | The packages that the bundle contains, their licenses and the places of their source code. |
| `SUPPORT.md` | Where to ask questions and report problems, and what a report contains. |
| `esbuild.mjs` | Bundles `src/extension.ts` with markdown-it into `dist/extension.js` for Node.js. The editor API stays outside the bundle. The bundle is readable JavaScript, not minified (see [Reviewing the package](#reviewing-the-package)); a production build (`--production`) has no source map. |
| `tsconfig.json` | The settings of the type check: strict, and no output, because esbuild builds the bundle. It covers `src/` and `test/`. |
| `vitest.config.mts` | The settings of the unit tests: the files `src/**/*.test.ts` and `scripts/**/*.test.mjs` on Node. |
| `.vscode-test.mjs` | The settings of the tests in VS Code: the VS Code version (`VSCODE_TEST_VERSION`, stable by default), the files of `out/test/vscode/`, and mocha. |
| `package.json` | The extension manifest. The section [Manifest](#manifest) explains it. |
| `package-lock.json` | The locked development tools. npm writes this file, and nobody edits it by hand. |
| `.node-version` | The Node release of the development tools. `actions/setup-node` in the workflows and local Node version managers read it. |
| `.vscodeignore` | Lists the files of the package: `dist/extension.js`, `media/markdownPreview.css`, `media/markdownPreview.js`, `media/notesView.css`, `media/notesView.js`, `resources/icon.png`, `resources/notes-view.svg`, `package.json`, `README.md`, `CHANGELOG.md`, `SUPPORT.md`, `LICENSE` and `THIRD-PARTY-NOTICES.md`. |
| `.github/workflows/ci.yml` | Checks the types, runs the unit tests and the tests in VS Code, and packages every push to `main`, every pull request and the commit of every release. The release publishes the VSIX of this workflow, so a change of it needs a dry run (rule 4 of the [release rules](#release-rules)). |
| `.github/workflows/vscode-versions.yml` | Runs `ci.yml` once per week with VS Code Insiders and with the lowest supported VS Code version. |
| `.github/workflows/release.yml` | Releases a version on a manual start: commits the version to a temporary branch, tests and packages it with `ci.yml`, and only then moves `main` to it, creates its tag and GitHub release and publishes it to the Marketplace. A dry run tests without a change. The section [Release](#release) explains it. |
| `.github/workflows/release-dry-run.yml` | Fails on a pull request that changes the release process (`release.yml`, `ci.yml` or `scripts/release-checks.mjs`) until a dry run on its branch tested the change (rule 4 of the [release rules](#release-rules)). |
| `.github/workflows/marketplace-identity.yml` | Prints the Marketplace member ID of the publishing identity, to check the setup of the repository. |
| `.github/dependabot.yml` | Proposes weekly updates of the development tools and of the pinned actions. |
| `scripts/build-vscode-tests.mjs` | Bundles each test of `test/vscode/` into `out/test/vscode/` for the tests in VS Code. |
| `scripts/install-local.mjs`, `scripts/uninstall-local.mjs` | Install the built package into every profile of the VS Code of this computer, and remove it again. |
| `scripts/marketplace-setup.sh` | Sets up the Marketplace publishing of the repository. The section [Setup of a repository](#setup-of-a-repository) explains it. |
| `scripts/release-checks.mjs`, `scripts/release-checks.test.mjs` | The check of rule 4 of the [release rules](#release-rules), which the workflows run, and its test. |
| `.vscode/launch.json`, `.vscode/tasks.json` | Build the bundle and start a VS Code window that loads the extension from this folder. |

## Development

The development tools are TypeScript, esbuild, vitest,
[`@vscode/test-cli`](https://github.com/microsoft/vscode-test-cli) for the
tests in VS Code, and [`@vscode/vsce`](https://github.com/microsoft/vscode-vsce),
the Microsoft tool that packages and publishes extensions. Everything runs on
Node.js 24: the release in `.node-version` for the tools and CI, and the
runtime of VS Code 1.125 and later (`engines.vscode`) for the extension.

| Command | Effect |
| --- | --- |
| `npm ci --ignore-scripts` | Installs the locked development tools and runs no install script of a dependency. |
| `npm run typecheck` | Checks the types with `tsc`. esbuild does not check them. |
| `npm test` | Runs the unit tests with vitest. The tests touch no installed editor. |
| `npm run test:vscode` | Builds the bundle and the tests in VS Code, downloads VS Code to `.vscode-test/` and runs the tests in it. On Linux without a display, run it as `xvfb-run -a npm run test:vscode`. `VSCODE_TEST_VERSION=insiders` or a version such as `1.125.0` selects another VS Code. |
| `npm run build` | Bundles `dist/extension.js` with a source map. |
| `npm run package` | Builds `nimblescape-markdown-notes-<version>.vsix` with vsce, which first runs the production build (`vscode:prepublish`). vsce also validates the manifest and the README. |
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

## Manifest

`package.json` is the extension manifest. It has these parts:

- The name and the publisher define the extension ID `nimblescape.nimblescape-markdown-notes`; the section [Naming](#naming) explains the name.
- The description, the keywords, the categories, the banner (`galleryBanner`), `preview` and `qna` make the page of the Marketplace. vsce turns some words of the description into search tags; a test checks that the description adds no tag. `preview` shows the label "Preview" on the page, and `qna` sends the questions of the page to the GitHub issues.
- The version is the only source of the package version, and the tag of a release names it.
- The engine range defines the compatible VS Code versions. `@types/vscode` stays at the lowest version of that range, so that the code compiles only with the API of that version. The manifest enables no proposed API (`enabledApiProposals`), because the Marketplace does not accept an extension that uses one. A test checks both.
- `main` selects the bundle `dist/extension.js`. A test checks it.
- `extensionPack` installs the extension "Markdown Footnotes" (`bierner.markdown-footnotes`) together with this extension, so that the preview shows the other footnotes of a file ([R-GEN-008](docs/requirements.md#r-gen-008)). It is a pack and no dependency (`extensionDependencies`): the user can disable or uninstall it, and the notes keep working. The plugin of this extension never renders other footnotes itself, because two plugins of footnotes would give two lists of footnotes. A test checks the pack.
- `.vscodeignore` lists the files of the package, not a `files` field: it ignores everything and keeps the bundle, the styles and the scripts of the preview and of the side view, the icons and the documents. A test checks the list.
- `icon` is `resources/icon.png`, a PNG, because the Marketplace takes no SVG icon. `resources/icon.svg` is its source; after a change of the source, render it again as a PNG of 256 × 256 pixels with a transparent background, for example with a screenshot of the SVG in Chromium. A test checks the size.
- `extensionKind` selects the workspace host, where the documents are.
- The activation event `onLanguage:markdown` starts the extension when a Markdown file opens, and `onUri` when VS Code passes it a link of the icon of a note.
- The contributions `markdown.markdownItPlugins`, `markdown.previewStyles` and `markdown.previewScripts` connect the extension with the built-in Markdown preview. The Markdown extension of VS Code activates the extension and reads its export `extendMarkdownIt`. The section [Markdown preview](#markdown-preview) explains it.
- `viewsContainers.secondarySidebar` and `views` contribute the side view "Notes" (`nimblescape.markdownNotes.notes`, a webview) in a container "Markdown Notes" of its own with the icon `resources/notes-view.svg`, in the secondary side bar only, so that the primary side bar stays free for the Explorer ([R-SIDE-001](docs/requirements.md#r-side-001)). VS Code 1.125, the oldest supported version, already knows this place. The section [Side view](#side-view) explains it.
- The commands "Collapse Note", "Collapse All Notes" and "Expand All Notes" fold the notes (`src/noteEditor.ts`); "Collapse Note" and "Expand Note" are also the buttons "Hide Note Text" and "Show Note Text" in the title of a box (`comments/commentThread/title`). With the setting `keepNotesCollapsed`, the buttons and the commands that expand a note do not show (`!config.nimblescape.markdownNotes.keepNotesCollapsed`). The command "Show or Hide Notes" is a button in the title of the text editor, of the preview of a Markdown file and of the modes "Markdown Preview" and "Markdown Editor" of VS Code (`editor/title`, `activeCustomEditorId`).
- The four commands "Delete Left of a Hidden Marker", "Delete Right of a Hidden Marker" and their word forms are the keybindings of Backspace, Delete, Ctrl+Backspace and Ctrl+Delete (on macOS Alt+Backspace and Alt+Delete) while the cursor is next to a hidden marker. The editor sets the context keys `nimblescape.markdownNotes.markerLeft` and `nimblescape.markdownNotes.markerRight` for this, only when their value changes. The Command Palette does not show them.
- The commands are the buttons of the boxes of the notes. The menus `comments/commentThread/context` (the buttons of the reply box: "Add Note" and "Cancel" in a new thread, "Answer" in the thread of a note), `comments/commentThread/title` ("Delete Thread"), `comments/comment/title` ("Reply", "Edit" and "Delete" of an answer) and `comments/comment/context` (the buttons below the editor of an answer) show them, each only for the comment controller `nimblescape.markdownNotes`. The first button of a reply box or an editor is its primary button, which Ctrl+Enter runs: "Add Note", "Answer" and "Save". "Reply" opens a new comment in the editing mode below the answer, whose "Save" writes the reply. The Command Palette shows none of these commands, because each one needs its box. A test checks the commands and the menus against `src/noteThreads.ts` and `src/noteEditor.ts`.
- The configuration contribution declares the settings of `src/settings.ts` in the section `nimblescape.markdownNotes`; `collapseInEditor`, `expandInEditor` and `showInPreview` have the scope `resource`, so that a folder of a workspace can have its own value. A test keeps the defaults equal to `src/settings.ts`, and a test checks that the README and the guide name every setting.
- `configurationDefaults` makes the extension the default formatter of Markdown files (`editor.defaultFormatter` for `[markdown]`) and turns on `editor.formatOnSave` for them ([R-FMT-001](docs/requirements.md#r-fmt-001)). The settings of the user and of a workspace for `[markdown]` win over these defaults. A test checks them.
- The untrusted-workspace and virtual-workspace capabilities state that the extension works in both.
- The package has no runtime dependency: the bundle contains markdown-it. The development dependencies are the build, test and packaging tools. `allowScripts` lists the install scripts of dependencies that npm 11.19 and later may run: those of esbuild and `@vscode/vsce-sign` in every version, because the build and the packaging (`npm run package`) run the code of both packages anyway and Dependabot updates them, and not the one of fsevents, an optional package for macOS that already contains its built binary.

`README.md` is the page of the Marketplace and `CHANGELOG.md` its tab
"Changelog". vsce checks their images: an image must come from an `https`
address and must not be an SVG. Both files and `SUPPORT.md` use full
`https://github.com/…` links outside code, so that every link works in the
repository, in the package and on the Marketplace. A test checks it, and a
test checks that the package script keeps the checks of vsce.

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
  takes a start marker `<!--[note-7k2q-->` in the text of a block.
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

**Selections** ([R-NOTE-006](docs/requirements.md#r-note-006)). The
selection of a note goes from the end of its start marker to the start of its
reference; without a start marker, from the start of the text of its block.
A start marker directly before the reference is a point. `insertNote` never
puts a start marker at the start of a line, because cmark-gfm, the renderer
of GitHub, reads a comment there as an HTML block and ends the paragraph:
then the marker goes to the end of the line before, and at the start of a
block it is left out. `deleteNote` removes the start marker and the
reference with the definition. The storage of the notes stays in
`src/notes/`, so that another form of storage changes only this folder.

**Warnings** ([R-TEXT-008](docs/requirements.md#r-text-008)). `checksOf` in
`src/notes/checks.ts` gives the warnings of the notes of a text from the
reading of `read`: no blank line before or after a note, a line of a note
without the indentation of four spaces, a second note of a label, a
reference without a note or a note without a reference, a note in a block
quote, a reference in the text of a link, in a heading or in a note, and a
start marker at the start of a line.

## Text editor

`src/noteThreads.ts` uses the comments API of VS Code, which has the boxes in
the text editor and the Comments view. One comment controller
(`nimblescape.markdownNotes`) has a commenting range of every line of a
Markdown document of a writable file system, and one comment thread for each
note, with one comment for each answer
([R-TEXT-001](docs/requirements.md#r-text-001)). A comment has the body of
its answer as a `MarkdownString`, the author and the date of its header
(`timestamp`), the label "Reply to" and the author of the parent at a reply to
a reply, and a context value,
which the menus read: `nimblescape.markdownNotes.note` for a written answer,
and `nimblescape.markdownNotes.draft` for a new note or a new answer that was
not written yet. The thread of a note has the context value
`nimblescape.markdownNotes.note` too, for "Delete Thread", and a reply box
(`canReply`) for "Answer".

The comments API works with these rules of VS Code (checked in VS Code 1.143):

- Before a command of a button runs, VS Code sets the `body` of the comment
  to the text of its editor, so "Save" reads the text from the comment.
- VS Code sends the changes of a thread to the window 100 ms after the last
  change, and opens or closes the editor of a box only when the mode of the
  comment changes. After a refused text, the comment therefore goes back to
  the preview mode, and to the editing mode 300 ms later, so that the editor
  opens again with the text.
- The `+` of a line creates a thread without comments, whose reply box has
  the buttons of `comments/commentThread/context`. "Add Note" receives the
  thread and the text, writes the note, and turns that thread into the thread
  of the note. "Answer" receives the thread of a note and the text of its
  reply box.

After each change of a document, and a pause of 300 ms, the extension reads
the notes again. A thread keeps its note when the note is at the position
where the extension just wrote it, or when the comment has the same text as
before; so an open box stays open while the user types elsewhere. The
extension also gives the warnings of `checksOf` as diagnostics.

`src/noteEditor.ts` adds the overlay of the notes to the text editor, with
decorations and folding ranges only, so that the editor and the other
extensions of Markdown stay as they are
([R-GEN-007](docs/requirements.md#r-gen-007)):

- **Dimming** ([R-TEXT-003](docs/requirements.md#r-text-003)): a decoration
  type with the opacity 0.55 dims the notes while the cursor is outside them,
  and the text before and after a note while the cursor is in it.
- **Folds** ([R-TEXT-005](docs/requirements.md#r-text-005)):
  `src/notes/folds.ts` computes a folding range of the kind `Comment` for each
  note on lines of its own, which starts on the last line of text before the
  note. VS Code keeps only one of two folding ranges that start on the same
  line, and the Markdown extension of VS Code folds headings, lists, block
  quotes, code blocks and HTML from their first line; a fold of a note
  therefore starts on a line of the text of a paragraph only, else on the
  first blank line before the note, else on the note itself. The extension
  collapses the folds with the command `editor.fold` (`levels: 1`,
  `direction: 'down'`, `selectionLines`) the first time a document is in the
  active editor. VS Code tells no extension which folds are collapsed; the
  extension reads it from `TextEditor.visibleRanges`, which split at a
  collapsed fold.
- **Markers** ([R-TEXT-006](docs/requirements.md#r-text-006)): one decoration
  type for each number of a note, with a gutter icon, an SVG speech bubble
  in the color of the number as a `data:` URI, and a mark in the overview
  ruler. VS Code 1.143 shows the `data:` URI in the left margin. A note of a
  collapsed fold has its marker at the line that stays of the fold. A note
  with a selection has it at the first line of the selection, and while it is
  open also at its first line.
- **Selections** ([R-NOTE-006](docs/requirements.md#r-note-006)): one
  decoration type for each color highlights the selections, with a mark in
  the overview ruler. The start markers and the references get the decoration type with
  `textDecoration: 'none; display: none;'`, which hides their text, and one
  decoration type draws a thin bar or a dot in the color of the note with a
  `before` attachment of each range (`renderOptions`) at the place of the
  marker. The markers stay hidden also on the line of the cursor:
  `src/notes/cursor.ts` moves a cursor inside a marker to its edge in the
  direction of its move (`onDidChangeTextEditorSelection`), and the commands
  of Backspace and Delete next to a marker delete the character or the word
  on the other side of it. The selection of the selected note of
  `src/selectedNotes.ts` gets a decoration type with a stronger background
  and a border in the color of the note. The thread of a note with a
  selection has the selection as its range; VS Code gives the `+` on
  selected text the exact characters of the selection.
- **Headers** ([R-TEXT-007](docs/requirements.md#r-text-007)): `headersOf` in
  `src/notes/folds.ts` gives the place of the header line of each answer:
  from the label `[^note-7k2q]:` of the first answer, or from the text after
  the quote markers of a reply, to the end of the line. The header gets the
  hidden decoration and a `before` attachment with the author and the date in
  the local time of the reader, and the date in the local time of the author
  as its `hoverMessage`, also on the line of the cursor. A cursor on a header
  line, or in the lines of a collapsed note, goes to the next free line in the
  direction of its move, and Backspace or Delete that would join a line with a
  header line does nothing.
- **Kept folds** ([R-TEXT-005](docs/requirements.md#r-text-005)): with the
  setting `keepNotesCollapsed`, the editor folds a note again when the
  visible ranges show it open, and moves a cursor out of it. `editor.fold`
  with `direction: 'down'` folds the innermost region at a line, which is the
  fold of a heading while VS Code has not read the folds of the note yet; the
  editor therefore folds again only for a version of the document whose
  folding ranges VS Code read, `keepTime` (300 ms) after the reading.

The operations `saveAnswer`, `answer` (with the index of the parent of a
reply), `addNote`, `deleteAnswer` and `deleteNote` of `NoteThreads` write the
changes for the boxes and for the side
view, so both check and write a text in the same way. Each one reads the notes
of the document first, so that the edit fits the current text, and returns
the problem of a refused text, whose message `problemMessage` gives.

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

## Side view

`src/notesView.ts` is the provider of the webview view
`nimblescape.markdownNotes.notes` ([R-SIDE-001](docs/requirements.md#r-side-001)).
It follows the active text editor of a Markdown document that can have notes
and the line of its cursor, and sends the state of the view to its script
`media/notesView.js`: the name of the file, the line of the cursor, the
account, the selected thread and the threads with their answers. The
extension renders the body of each answer with the command
`markdown.api.render` of the Markdown extension, so the side view renders as
the preview does, and keeps up to 200 rendered texts.

- The page has a content security policy with `default-src 'none'` and a
  nonce for its one script, and loads files only from `media/`. The script
  removes the elements and attributes that run code from the rendered HTML
  before it shows it ([docs/security.md](docs/security.md#side-view)).
- The script sends the actions of the user as messages: `save`, `answer`
  (with the index of the answer that a reply replies to), `add`, `deleteAnswer`, `deleteNote`, `reveal`, `render` (the tab
  "Preview"), `openLink` (a click on a link of a rendered text, which
  `src/links.ts` opens), `deselect`, `signIn`, `ready` and `size` (the height of the page). A message of an editor has the number of
  its request, and the extension answers with `result` and the message of a
  refused text, or with `rendered`. The script keeps the open editors and the
  focus when a new state arrives.
- A link of the icon of a note in the preview opens the view at the note: the
  URI handler of `src/extension.ts` checks the link
  ([docs/security.md](docs/security.md#links-to-the-extension)) and calls
  `NotesView.show`, which runs the command `nimblescape.markdownNotes.notes.focus`.
- `retainContextWhenHidden` keeps the page, and so the open editors, while
  the view is hidden.
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
- **Badges and funnels** ([R-SIDE-007](docs/requirements.md#r-side-007)):
  each thread of the state has the number and the color of its note
  (`src/notes/colors.ts`) and its mark, the lines of its selection or of the
  note; the state also has the setting `showFunnels`, the visible lines of
  the text editor and the start of the funnel of the selected thread, which
  the message `visible` updates on each scroll of the editor and each change
  of the tabs. The script draws the strip with `div` elements and the funnels
  as SVG paths in a fixed layer at the left edge, again on each change of the
  state, of the visible lines, of the scrolling of the view and of its size,
  and tells the extension its height with the message `size`.
- **Start of the funnel** ([R-SIDE-007](docs/requirements.md#r-side-007), decision 12):
  while a Markdown preview of the file is the active tab of a group, the
  funnel starts at the end of the band of the preview (`meeting` in
  `src/notesView.ts`, below the top of the preview by the bar of the tabs and,
  in the mode "Markdown Preview", the breadcrumbs). The plugin writes this end
  as `data-funnel` on the selected icon while the view is visible and
  `showFunnels` is on, and the previews render again when the view shows or
  hides. Else `src/editorLayout.ts` computes the rows of the passage in the
  text editor from `visibleRanges`, the settings `editor.fontSize`,
  `editor.lineHeight`, `editor.wordWrap` and `editor.wordWrapColumn`, and
  the height of the view. The sizes of the bars of VS Code (`workbench` in
  `src/notesView.ts`) are measured in VS Code 1.143 with its default
  settings; a later version of VS Code can change them.
  The buttons "Show Funnels" and "Hide Funnels" (`view/title`, with
  `when` clauses on `config.nimblescape.markdownNotes.showFunnels`) write the
  setting. A click on a thread sends `reveal` with `focus: false`, which
  shows the note with `preserveFocus`.

## Markdown preview

The version of `markdown-it` and `@types/markdown-it` follows the version that
the built-in Markdown preview of VS Code uses (the `markdown-it` dependency of
[extensions/markdown-language-features/package.json](https://github.com/microsoft/vscode/blob/main/extensions/markdown-language-features/package.json),
version 14 on 2026-10-28), so that the extension finds the notes as the
preview does. Dependabot offers no major versions of them
(`.github/dependabot.yml`); move to a new major version only when VS Code does.

The plugin `src/markdown/markdownIt.ts` adds the rules of the notes and the
core rule `nimblescape_notes` after the rules of markdown-it and of the other
plugins, so that their core rules, such as emoji and task lists, change the
bodies of the notes too:

- The core rule takes the tokens of each note out of the tokens of the
  document into the meta of its token `nimblescape_note_open`: one list of
  tokens for the body of each answer, without its header line, and for a
  reply without its block quote. It removes the token
  `nimblescape_note_close`. The open token renders the hidden callout at the
  place of the definition, and for a note without a reference also its icon
  in a `div` of the class `nimblescape-note-anchor`, which the styles put into
  the left margin ([R-PREV-001](docs/requirements.md#r-prev-001)).
- The first reference of a note becomes the end of its selection, an empty
  `span.nimblescape-note-edge`, and its icon; its start marker becomes the
  start of the selection. A later reference of the note becomes an icon only.
  A reference in a note shows as written, and a start marker that is no
  start of a selection shows nothing. The notes never show as footnotes
  ([R-PREV-004](docs/requirements.md#r-prev-004)).
- A callout is a `div` with the class `nimblescape-note`, `role="note"`, the
  attribute `hidden`, and one part for each answer with the author, the date
  in a `time` element and the body. The first answer comes first, then the
  replies to it; the replies to a reply stand in a `div` of the class
  `nimblescape-note-replies` in the part of the reply
  ([R-NOTE-004](docs/requirements.md#r-note-004)). The `title` of the date is
  the date in the local time of the author.
- A body renders with the same environment as the document, so that a
  footnote in a note is a footnote of the page, and with the method `render`
  of the class of the renderer, because a plugin can wrap the method of the
  renderer to frame the page, as the GitHub styles of Matt Bierner do.
- The icon is a link `vscode://nimblescape.nimblescape-markdown-notes/open`
  with the document and the line of the note
  ([R-PREV-003](docs/requirements.md#r-prev-003)), and names its callout with
  `aria-describedby`. Without a document, for example when a text renders without a file, it is
  a `span` that takes the focus.
- Every other footnote renders as without the plugin.

The title of the preview has the buttons "Show Notes in Preview" and "Hide
Notes in Preview" (`editor/title` with `activeWebviewPanelId ==
'markdown.preview'`); the `when` clause reads the setting with
`config.nimblescape.markdownNotes.showInPreview`, so the button of the other
state shows. The commands write the setting in the workspace when it holds a
value, else in the user settings
([R-PREV-005](docs/requirements.md#r-prev-005)).

The script `media/markdownPreview.js` shows the callout of an icon while the
pointer rests on it or it has the focus, and places it below the icon, or
above it when there is no room ([R-PREV-002](docs/requirements.md#r-prev-002)).
It hides the callout 300 ms after the pointer leaves the icon and the callout,
on Escape, on a scroll, and when the preview renders new content
(`vscode.markdown.updateContent`). The plugin writes the start and the end of
a selection as empty elements `span.nimblescape-note-edge` with the ID and the
color, and the icon of the note after the end. The script highlights each
selection with the CSS Custom Highlight API (`CSS.highlights`, one highlight
`nimblescape-note-N` for each color and a stronger one while the callout of
the note shows), which changes no element of the page; a browser without the
API shows no highlight. The preview loads the scripts of the extensions with
`async` and adds its content to the page with a script of its own when the
page is parsed, so the script highlights at its start, at `DOMContentLoaded`
and at `load`.

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
the editor. A callout is hidden or floats above the page, so the plugin
takes the tokens of its bodies out of the tokens of the document and removes
their lines; the scrolling uses only the elements of the document. The rendered diff of VS Code inserts empty elements
`<span data-diff-start="N"></span>` and `<span data-diff-end="N"></span>` into
the Markdown text; the plugin removes them from the author and the date.

The preview parses a document once for each version, without the document in
the environment of the parsing, and renders it again for each change of a
setting. So the core rule does the same for every document, and the render
rules read the setting `showInPreview`
([R-PREV-005](docs/requirements.md#r-prev-005)) and the link for the document
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
and fires the change event as VS Code does, records the threads, the
decorations, the messages to the side view and the GitHub sessions, and has a
GitHub login (`login`) and the login of a sign-in (`signIn`), so that the
tests cover the new notes and answers that the tests in VS Code cannot add.

## Tests in VS Code

`npm run test:vscode` runs the tests of `test/vscode/` in a real VS Code with
the extension of the development build. The tests open Markdown files of a
temporary folder, run the commands of the buttons with the comments and the
threads (the export `threadsOf` of the extension gives the threads), open the
side view, and render the documents with the command `markdown.api.render` of
the Markdown extension, which uses the markdown-it plugins of the extensions
as the preview does. CI runs them under `xvfb-run` with the stable VS Code,
and the workflow "VS Code versions" once per week with VS Code Insiders and
with the lowest supported version.

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
in `package.json`. The workflow "Release" creates the version, its tag, its
GitHub release and its Marketplace version in one run. To release a version,
follow these steps:

1. Optional: add a section `## <version>` to `CHANGELOG.md` on `main`. The section describes the changes for the users (see [Release rules](#release-rules)).
2. In the tab "Actions", choose the workflow "Release", then "Run workflow" on the branch `main`. Enter the version, for example `0.1.7`. When `CHANGELOG.md` has no section for the version, enter its notes too: they become the section. The GitHub website starts a workflow also in the browser of a phone.

The run has four jobs:

1. "Version commit" checks that the run starts from `main`, that the version has the form `<major>.<minor>.<patch>`, that it is not lower than the version in `package.json` and that its tag does not exist, and, in a release, that a dry run tested the files of the release process with `scripts/release-checks.mjs dry-run` (rule 4 of the [release rules](#release-rules)). It sets the version in `package.json` and `package-lock.json`, adds the section of the notes to `CHANGELOG.md` when the file has none, commits the change as "Release `<version>`" and pushes it to the temporary branch `release/run-<run ID>`, not to `main`. When `main` holds the version and its section already, it commits nothing. It also deletes the temporary branches of earlier runs that failed.
2. "CI" runs the workflow `ci.yml` for the commit of the version, because a push with the token of a workflow starts no other workflow. The VSIX that this job tests and builds is the VSIX of the release, so the release repeats no test and no build.
3. "Main, tag and GitHub release" runs only when CI passed. It moves `main` to the commit of the version as a fast-forward and deletes the temporary branch. When `main` changed during the run, it stops before the tag. Then it creates the tag `v<version>` on the commit and the release of the tag with the GitHub CLI `gh`. The section of the version in `CHANGELOG.md` becomes the notes, and the VSIX becomes the file of the release. A release that exists keeps its notes and receives the VSIX only when it holds none.
4. "Publish to the Visual Studio Marketplace" downloads the VSIX of the GitHub release, signs in to Microsoft Entra ID with the official [`azure/login`](https://github.com/Azure/login) action and publishes the VSIX with `vsce publish --azure-credential`.

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
run. A re-run keeps the tag and the VSIX that the GitHub release already
holds, and the Marketplace skips a version that it already holds, so a re-run
never publishes a version twice. When the publish job fails, for example
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
2. **No deletion.** nimblescape never deletes an extension. No workflow, npm script or file of `scripts/` runs `vsce unpublish`, which deletes the extension on the Marketplace, or `vsce delete-publisher`, which deletes the publisher with all its extensions. On the publisher management page, nobody uses More Actions > Remove, which deletes the extension and keeps its name reserved permanently, or "Delete this version" (More Actions > Reports, tab Manage), after which the number of the version can never be used again. An extension that is no longer wanted is unpublished on the publisher management page, as [Naming](#naming) describes.
3. **Only changes for the users, at most one version in 7 days.** A version is published only when it changes something for the users, its section in `CHANGELOG.md` describes that change, and at least 7 days passed since the newest release; an urgent fix may come earlier. A change for the users changes the extension that VS Code runs: its code (`src/`, which the build bundles into `dist/`), another file of the package that is not a document, for example the icon of a view, or a field of `package.json` that changes how the extension works, for example `contributes`. A change only of the documents (for example the README), the Marketplace icon, the tests or the build tools (for example `esbuild.mjs`, `tsconfig.json` or a file of `scripts/`) does not count: it reaches the users with the next version that changes the extension. Images that only the README shows do not belong in the package: the README links them with full `https://github.com/…` links (see [Manifest](#manifest)). The section of the version in `CHANGELOG.md` does not say "maintenance release", "behaves as in" followed by a version, or a phrase of that kind.
4. **Dry run first.** A change of the release process is tested with a dry run before it reaches `main`. The files of the release process are `release.yml`, `ci.yml`, whose VSIX the release publishes, and `scripts/release-checks.mjs`. The workflow "Release dry run" runs on every pull request. When the pull request changes one of these files, also in an update by Dependabot, the check `dry-run` fails until a successful dry run, or the newest release, had these files as they are at the head of the pull request. Start the workflow "Release" on the branch of the pull request with "Dry run" and a version without a tag (with notes when `CHANGELOG.md` has no section for the version), then re-run the job "release dry run" of the pull request. A pull request from a fork cannot meet the rule, because the dry run needs a branch of this repository. The job "Version commit" of a release runs the check `dry-run` again, so a change that reached `main` without a dry run stops the release until a dry run tested it. Do not make "release dry run" a required check of `main`: the release moves `main` to its version commit, which has no result of the check.
5. **Only GitHub Actions with Microsoft Entra ID.** Only the job "Publish to the Visual Studio Marketplace" publishes, signed in with the app registration of [Marketplace setup](#marketplace-setup). No personal access token exists for the publisher. No other workflow, npm script or file of `scripts/` runs `vsce publish` or `vsce login`. Nobody uploads a VSIX on the publisher management page or runs `vsce publish`, `unpublish`, `delete-publisher` or `login` on a computer.

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

---

© 2026 Hannes Stauss (scalarion@nimblescape.com) · [MIT License](LICENSE).
