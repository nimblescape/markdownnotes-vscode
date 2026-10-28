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
| `src/notes/syntax.ts` | The syntax of one note: which comment is a note and its kind (`note` or `note inline`), the markers of a selection (`<!--[a1-->`, `<!--a1]-->`, `<!--[a1]-->`) and the key `selection`, its answers with their front matters and bodies, the texts that a note must not contain, the comments of a text as markdown-it 14 finds them, the inline rule and the block rule of markdown-it for the notes, and the dates of a front matter. It uses no API of VS Code, so the extension and the plugin share it. |
| `src/notes/notes.ts` | The notes of a Markdown text by their places (line and column), with the prefix of their lines in a block quote or a list item, found with markdown-it as the preview finds them; the markers of the selections and the selection of each note; and the place of a new note and of the markers of its selection. It uses no API of VS Code. |
| `src/notes/colors.ts` | The color of each number of a note, which the text editor, the preview and the side view share. It uses no API of VS Code. |
| `src/notes/edits.ts` | The edits of the text when an answer is saved, added or deleted, and when a note is added or deleted, with the check that the changed text holds the same note with the expected answers. It uses no API of VS Code. |
| `src/noteThreads.ts` | The notes in the text editor and in the Comments view: the comment controller, one comment thread for each note of an open Markdown document with one comment for each answer, the commands of the buttons of the boxes, the warning at a nested note, and the operations that the side view uses too. |
| `src/noteEditor.ts` | The overlay of the notes in the text editor: the dimming after the cursor, the folding ranges of the notes, their collapse when a file is first in the active editor, the commands "Collapse Note", "Collapse All Notes" and "Expand All Notes", the numbered markers in the left margin and the overview ruler, and the highlight and the hidden markers of the selections. |
| `src/notes/folds.ts` | The folds of the collapsed notes: which line of a text stays visible and which lines a fold takes, so that a note vanishes without a paragraph break. It uses no API of VS Code. |
| `src/notesView.ts` | The side view "Notes" in the secondary side bar: the webview view provider, its page with the security policy, the state of the threads of the active Markdown file with the rendered answers, the actions of its script, and the commands "Hide Notes" and "Show or Hide Notes". |
| `src/links.ts` | The links of the rendered notes in the side view: web and mail links with the system, files in VS Code at a line or a heading, other schemes after a question, and no command links. |
| `src/markdown/markdownIt.ts` | The markdown-it plugin of the Markdown preview: writes each note as an icon with a hidden callout, removes the inline notes with their blanks from the paragraphs, and leaves every other token as it is. |
| `media/markdownPreview.css`, `media/markdownPreview.js` | The styles of the icons and the callouts in the Markdown preview, with the colors of the theme of VS Code and of the notes, and the script that shows the callout of an icon on hover and focus and highlights the selections. |
| `media/notesView.js`, `media/notesView.css` | The script and the styles of the side view: the threads, the answers, the editors with the tabs "Write" and "Preview", and the messages to the extension. |
| `resources/notes-view.svg` | The icon of the container of the side view in the title of the secondary side bar: a speech bubble, which VS Code draws in the color of the title. |
| `resources/icon.png`, `resources/icon.svg` | The Marketplace icon (256 × 256 PNG, because the Marketplace takes no SVG icon) and its source: a page with a note as a callout on the tile of the nimblescape extensions. |
| `src/**/*.test.ts` | The unit tests, with vitest: the manifest, the package contents, the third-party notices and the documents (`src/manifest.test.ts`), the syntax, the notes and the edits, the markdown-it plugin with the source map rule of the preview, the settings, the folds (`src/notes/folds.test.ts`), the activation and the threads (`src/extension.test.ts`), the overlay of the text editor (`src/noteEditor.test.ts`) and the side view (`src/notesView.test.ts`) with a fake of the editor API (`src/testing/fakeVscode.ts`). |
| `test/vscode/` | The tests in a real VS Code: the threads of the notes with their answers, the save, the refused text, the delete, the side view, and the icons and callouts of the Markdown preview of VS Code (`markdown.api.render`). |
| `dist/` | The bundle `dist/extension.js`, built by `esbuild.mjs` and kept out of Git. |
| `out/`, `.vscode-test/` | The bundled tests in VS Code (`scripts/build-vscode-tests.mjs`) and the VS Code that `@vscode/test-cli` downloads for them, kept out of Git. |
| `docs/guide.md` | The user guide: every feature, how to use it, and its state. |
| `docs/requirements.md` | The requirements, each with an ID as its heading, and the plan of the steps. |
| `docs/security.md` | The security model: what the extension does on your computer, what it protects, and where its protection ends. The section "What the extension does on your computer" at the top of the README lists the same behaviors in short. |
| `docs/images/` | The image of the README: `notes.png`, a screenshot of VS Code 1.143 in the theme Dark Modern under Xvfb, with the side view "Notes", the text editor with the dimmed source of a note and its open box with two answers, and the Markdown preview with the callout of an icon on hover. PNG and GIF files only, because the Marketplace shows no SVG image. The README links its images with full addresses on the branch `main`, which the Marketplace requires; they are not part of the package. A test checks that each image of the README is a GIF or PNG file in this folder. |
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
- `.vscodeignore` lists the files of the package, not a `files` field: it ignores everything and keeps the bundle, the styles and the scripts of the preview and of the side view, the icons and the documents. A test checks the list.
- `icon` is `resources/icon.png`, a PNG, because the Marketplace takes no SVG icon. `resources/icon.svg` is its source; after a change of the source, render it again as a PNG of 256 × 256 pixels with a transparent background, for example with a screenshot of the SVG in Chromium. A test checks the size.
- `extensionKind` selects the workspace host, where the documents are.
- The activation event `onLanguage:markdown` starts the extension when a Markdown file opens, and `onUri` when VS Code passes it a link of the icon of a note.
- The contributions `markdown.markdownItPlugins`, `markdown.previewStyles` and `markdown.previewScripts` connect the extension with the built-in Markdown preview. The Markdown extension of VS Code activates the extension and reads its export `extendMarkdownIt`. The section [Markdown preview](#markdown-preview) explains it.
- `viewsContainers.secondarySidebar` and `views` contribute the side view "Notes" (`nimblescape.markdownNotes.notes`, a webview) in a container "Markdown Notes" of its own with the icon `resources/notes-view.svg`, in the secondary side bar only, so that the primary side bar stays free for the Explorer ([R-SIDE-001](docs/requirements.md#r-side-001)). VS Code 1.125, the oldest supported version, already knows this place. The section [Side view](#side-view) explains it.
- The commands "Collapse Note", "Collapse All Notes" and "Expand All Notes" fold the notes (`src/noteEditor.ts`); "Collapse Note" is also a button in the title of a box (`comments/commentThread/title`). The command "Show or Hide Notes" is a button in the title of the text editor and of the preview of a Markdown file (`editor/title`).
- The commands are the buttons of the boxes of the notes. The menus `comments/commentThread/context` (the buttons of the reply box: "Add Note" and "Cancel" in a new thread, "Answer" in the thread of a note), `comments/commentThread/title` ("Delete Thread"), `comments/comment/title` ("Edit" and "Delete" of an answer) and `comments/comment/context` (the buttons below the editor of an answer) show them, each only for the comment controller `nimblescape.markdownNotes`. The first button of a reply box or an editor is its primary button, which Ctrl+Enter runs: "Add Note", "Answer" and "Save". The Command Palette shows none of these commands, because each one needs its box. A test checks the commands and the menus against `src/noteThreads.ts` and `src/noteEditor.ts`.
- The configuration contribution declares the settings of `src/settings.ts` in the section `nimblescape.markdownNotes`; `collapseInEditor`, `expandInEditor` and `showInPreview` have the scope `resource`, so that a folder of a workspace can have its own value. A test keeps the defaults equal to `src/settings.ts`, and a test checks that the README and the guide name every setting.
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
is a comment whose text starts with the word `note` or the words
`note inline` alone on the line of `<!--`
([R-NOTE-001](docs/requirements.md#r-note-001)). The text of the comment is a
thread of answers, each with its own front matter
([R-NOTE-004](docs/requirements.md#r-note-004)): a line `---` that field lines
and a closing `---` follow starts the next answer. The extension and the
plugin find the comments with markdown-it, the parser of the preview, with
its options (`html: true`) and with two rules of the extension
(`addNoteRules`). So the text editor and the preview always agree on the
notes:

- The block rule `nimblescape_note_lines` runs before `html_block` and reads
  an inline note `<!-- note inline` on lines of its own, also between two
  lines of a paragraph ([R-NOTE-005](docs/requirements.md#r-note-005)). It
  ends the paragraph before it as `html_block` does, and ends the comment at
  the first `-->`; a text after `-->` on the last line starts the next block.
  The plugin of the preview joins the paragraphs before and after the note
  again.
- An HTML block that holds only comments and white space holds block notes on
  lines of their own. markdown-it starts such a block at a line that starts
  with `<!--` and ends it at the first line with `-->`.
- The inline rule `nimblescape_note` runs before `html_inline` and reads a
  comment as that rule does. A note of this rule in a paragraph or a heading
  starts after the text of a line. A comment in a table cell is no note,
  because the text of a cell has one line.
- `src/notes/notes.ts` adds the rule for the front matter of a document that
  the Markdown preview of VS Code has, so a comment in it is no note.

markdown-it keeps the line of each block, not the column of a comment, and
the text of a block in a block quote or a list item loses the prefix of each
line. The module therefore finds each line of the text of a block at the end
of its line of the document, and from it the column of the comment. A note
also keeps the prefix of its further lines (the markers `>` and the
indentation of list items), which an edit puts before each line it writes.

`src/notes/edits.ts` returns one edit for the save, the addition or the
deletion of an answer, and for the addition or the deletion of a note. It
writes a text only when the changed document holds the same note at the same
place, of the same kind, with the expected answers, front matters and bodies,
when `findNotes` reads it again
([R-EDIT-002](docs/requirements.md#r-edit-002)). This one check refuses a text
that would end the comment early, open another comment
([R-NOTE-003](docs/requirements.md#r-note-003)), start another answer, or
change the Markdown around the note. A new note on a line of a paragraph is
an inline note after that line; on another line, it is a block note after the
leaf block (heading, code block, HTML block, table, rule or front matter) that
holds the line, or after the leaf block before it
([R-EDIT-003](docs/requirements.md#r-edit-003)). A new answer goes at the end
of the comment ([R-EDIT-005](docs/requirements.md#r-edit-005)), and deleting
the only answer deletes the note ([R-EDIT-004](docs/requirements.md#r-edit-004)).

**Selections** ([R-NOTE-006](docs/requirements.md#r-note-006)). `read` in
`src/notes/notes.ts` also reads the markers of the selections, from the
inline comments of every block and from the comments of HTML blocks, and
gives each note with the key `selection` in its first front matter the
selection with this ID: from the end of the opening marker, or from the start
of the block of the closing marker without one, to the start of the closing
marker; a point is an empty selection at its marker. `selectionPlaceFor`
gives the places of the markers of a new note for a range of the editor and
never puts a marker at the start of a line, because cmark-gfm, the renderer
of GitHub, reads a comment there as an HTML block and ends the paragraph.
`insertNote` writes the markers and the note in one edit, and `deleteNote`
removes the markers with the note; deleting the first answer moves the key
`selection` to the next answer. The storage of the notes and the markers
stays in `src/notes/`, so that another form of storage changes only this
folder.

## Text editor

`src/noteThreads.ts` uses the comments API of VS Code, which has the boxes in
the text editor and the Comments view. One comment controller
(`nimblescape.markdownNotes`) has a commenting range of every line of a
Markdown document of a writable file system, and one comment thread for each
note, with one comment for each answer
([R-TEXT-001](docs/requirements.md#r-text-001)). A comment has the body of
its answer as a `MarkdownString`, the author and the date of its front matter
(`timestamp`, or `label` for a date of another form), and a context value,
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
extension also gives a warning (a diagnostic) at a note that contains `<!--`.

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
  the overview ruler. The markers get the decoration type with
  `textDecoration: 'none; display: none;'`, which hides their text, and one
  decoration type draws a thin bar or a dot in the color of the note with a
  `before` attachment of each range (`renderOptions`) at the place of the
  marker. On the line of the cursor the markers are dimmed instead, so that
  the cursor never moves through hidden text. The thread of a note with a
  selection has the selection as its range; VS Code gives the `+` on
  selected text the exact characters of the selection.

The operations `saveAnswer`, `answer`, `addNote`, `deleteAnswer` and
`deleteNote` of `NoteThreads` write the changes for the boxes and for the side
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
- The script sends the actions of the user as messages: `save`, `answer`,
  `add`, `deleteAnswer`, `deleteNote`, `reveal`, `render` (the tab
  "Preview"), `openLink` (a click on a link of a rendered text, which
  `src/links.ts` opens), `signIn` and `ready`. A message of an editor has the number of
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

## Markdown preview

The version of `markdown-it` and `@types/markdown-it` follows the version that
the built-in Markdown preview of VS Code uses (the `markdown-it` dependency of
[extensions/markdown-language-features/package.json](https://github.com/microsoft/vscode/blob/main/extensions/markdown-language-features/package.json),
version 14 on 2026-10-28), so that the extension finds the notes as the
preview does. Dependabot offers no major versions of them
(`.github/dependabot.yml`); move to a new major version only when VS Code does.

The plugin `src/markdown/markdownIt.ts` adds the rules of the notes and the
core rule `nimblescape_notes` after the rules of markdown-it:

- An HTML block of block notes becomes one block token for each note: the
  icon in a `div` of the class `nimblescape-note-anchor`, which the styles put
  into the left margin, and the hidden callout
  ([R-PREV-001](docs/requirements.md#r-prev-001)).
- An inline note on lines of its own becomes an icon at the end of the text
  of the paragraph or heading before it, or at the start of the text after
  it, also across blank lines, because an inline note never ends a paragraph.
  A paragraph before and after the note becomes one paragraph again, with one
  space and no `softbreak` token between the two texts, so that the option
  `breaks` of the preview adds no line break
  ([R-PREV-004](docs/requirements.md#r-prev-004)).
- A note after the text of a line becomes an icon after the word before it,
  without the blanks before the note, and one space after the icon.
- The callout of an icon in a text follows the closing token of its block. A
  callout is a `div` with the class `nimblescape-note`, `role="note"`, the
  attribute `hidden`, and one part for each answer with the author, the date
  and the body, which the plugin parses with the same markdown-it instance
  and the same environment as the document, so that the plugins of the
  preview apply to it.
- The icon is a link `vscode://nimblescape.nimblescape-markdown-notes/open`
  with the document and the line of the note
  ([R-PREV-003](docs/requirements.md#r-prev-003)), and names its callout with
  `aria-describedby`. Without a document, for example when a text renders without a file, it is
  a `span` that takes the focus.
- A comment that is no note renders as without the plugin.

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
API shows no highlight.

The preview gives every token with lines the attribute `data-line` and the
class `code-line` after the plugins of the extensions, for the scrolling with
the editor. A callout is hidden or floats above the page, so the plugin
removes the lines of the tokens of its bodies; the scrolling uses only the
elements of the document. The rendered diff of VS Code inserts empty elements
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
point for this: its comments come from the proposed API
`agentEditorComments`, and its only contribution point is
`markdown.codeBlockEditorProviders` for code blocks
([R-GEN-001](docs/requirements.md#r-gen-001)).

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
