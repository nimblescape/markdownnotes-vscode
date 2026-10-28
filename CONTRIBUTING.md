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
| `src/extension.ts` | The editor wiring: activation starts the threads of the notes, returns the markdown-it plugin for the Markdown preview with the settings of the rendered document, finds the author of a new note (the setting, or `user.name` of Git), and refreshes the previews and the threads when a setting of the extension changes. |
| `src/settings.ts` | The settings of the extension, their defaults, and the check of their values. It uses no API of VS Code. |
| `src/notes/syntax.ts` | The syntax of one note: which comment is a note, its front matter with the author and the date, its body, the texts that a note must not contain, the comments of a text as markdown-it 14 finds them, the inline rule of markdown-it for the comments, and the dates of a front matter. It uses no API of VS Code, so the extension and the plugin share it. |
| `src/notes/notes.ts` | The notes of a Markdown text by their places (line and column), with the prefix of their lines in a block quote or a list item, found with markdown-it as the preview finds them; and the place of a new note. It uses no API of VS Code. |
| `src/notes/edits.ts` | The edits of the text when a note is saved, added or deleted, with the check that the changed text holds the same note. It uses no API of VS Code. |
| `src/noteThreads.ts` | The notes in the text editor and in the Comments view: the comment controller, one comment thread for each note of an open Markdown document, the commands of the buttons of the boxes, the warning at a nested note, and the folding of the notes. |
| `src/markdown/markdownIt.ts` | The markdown-it plugin of the Markdown preview: writes each note as a callout, and the number of a note inside a paragraph, and leaves every other token as it is. |
| `media/markdownPreview.css` | The styles of the callouts in the Markdown preview, with the colors of the theme of VS Code. |
| `resources/icon.png`, `resources/icon.svg` | The Marketplace icon (256 × 256 PNG, because the Marketplace takes no SVG icon) and its source: a page with a note as a callout on the tile of the nimblescape extensions. |
| `src/**/*.test.ts` | The unit tests, with vitest: the manifest, the package contents, the third-party notices and the documents (`src/manifest.test.ts`), the syntax, the notes and the edits, the markdown-it plugin with the source map rule of the preview, the settings, and the activation and the threads with a fake of the editor API (`src/extension.test.ts`). |
| `test/vscode/` | The tests in a real VS Code: the threads of the notes, the save, the refused text, the delete, and the callouts of the Markdown preview of VS Code (`markdown.api.render`). |
| `dist/` | The bundle `dist/extension.js`, built by `esbuild.mjs` and kept out of Git. |
| `out/`, `.vscode-test/` | The bundled tests in VS Code (`scripts/build-vscode-tests.mjs`) and the VS Code that `@vscode/test-cli` downloads for them, kept out of Git. |
| `docs/guide.md` | The user guide: every feature, how to use it, and its state. |
| `docs/requirements.md` | The requirements, each with an ID as its heading, and the plan of the steps. |
| `docs/security.md` | The security model: what the extension does on your computer, what it protects, and where its protection ends. The section "What the extension does on your computer" at the top of the README lists the same behaviors in short. |
| `docs/images/` | The image of the README: `notes.png`, a screenshot of VS Code 1.143 in the theme Dark Modern under Xvfb, with the editor of a note in its box, the Markdown preview with two callouts and the Comments view. PNG and GIF files only, because the Marketplace shows no SVG image. The README links its images with full addresses on the branch `main`, which the Marketplace requires; they are not part of the package. A test checks that each image of the README is a GIF or PNG file in this folder. |
| `THIRD-PARTY-NOTICES.md` | The packages that the bundle contains, their licenses and the places of their source code. |
| `SUPPORT.md` | Where to ask questions and report problems, and what a report contains. |
| `esbuild.mjs` | Bundles `src/extension.ts` with markdown-it into `dist/extension.js` for Node.js. The editor API stays outside the bundle. The bundle is readable JavaScript, not minified (see [Reviewing the package](#reviewing-the-package)); a production build (`--production`) has no source map. |
| `tsconfig.json` | The settings of the type check: strict, and no output, because esbuild builds the bundle. It covers `src/` and `test/`. |
| `vitest.config.mts` | The settings of the unit tests: the files `src/**/*.test.ts` and `scripts/**/*.test.mjs` on Node. |
| `.vscode-test.mjs` | The settings of the tests in VS Code: the VS Code version (`VSCODE_TEST_VERSION`, stable by default), the files of `out/test/vscode/`, and mocha. |
| `package.json` | The extension manifest. The section [Manifest](#manifest) explains it. |
| `package-lock.json` | The locked development tools. npm writes this file, and nobody edits it by hand. |
| `.node-version` | The Node release of the development tools. `actions/setup-node` in the workflows and local Node version managers read it. |
| `.vscodeignore` | Lists the files of the package: `dist/extension.js`, `media/markdownPreview.css`, `resources/icon.png`, `package.json`, `README.md`, `CHANGELOG.md`, `SUPPORT.md`, `LICENSE` and `THIRD-PARTY-NOTICES.md`. |
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
| `npm run package` | Builds `nimblescape-markdown-note-<version>.vsix` with vsce, which first runs the production build (`vscode:prepublish`). vsce also validates the manifest and the README. |
| `npm run install-local` | Builds the package and installs it into every profile of the VS Code of this computer; `-- --profile <name>` installs into one profile. Reload the window after an update of an active extension. |
| `npm run uninstall-local` | Removes `nimblescape.nimblescape-markdown-note` from every profile of the VS Code of this computer; `-- --profile <name>` removes it from one profile. |

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

- The name and the publisher define the extension ID `nimblescape.nimblescape-markdown-note`; the section [Naming](#naming) explains the name.
- The description, the keywords, the categories, the banner (`galleryBanner`), `preview` and `qna` make the page of the Marketplace. vsce turns some words of the description into search tags; a test checks that the description adds no tag. `preview` shows the label "Preview" on the page, and `qna` sends the questions of the page to the GitHub issues.
- The version is the only source of the package version, and the tag of a release names it.
- The engine range defines the compatible VS Code versions. `@types/vscode` stays at the lowest version of that range, so that the code compiles only with the API of that version. The manifest enables no proposed API (`enabledApiProposals`), because the Marketplace does not accept an extension that uses one. A test checks both.
- `main` selects the bundle `dist/extension.js`. A test checks it.
- `.vscodeignore` lists the files of the package, not a `files` field: it ignores everything and keeps the bundle, the styles of the preview, the icon and the documents. A test checks the list.
- `icon` is `resources/icon.png`, a PNG, because the Marketplace takes no SVG icon. `resources/icon.svg` is its source; after a change of the source, render it again as a PNG of 256 × 256 pixels with a transparent background, for example with a screenshot of the SVG in Chromium. A test checks the size.
- `extensionKind` selects the workspace host, where the documents are.
- The activation event `onLanguage:markdown` starts the extension when a Markdown file opens.
- The contributions `markdown.markdownItPlugins` and `markdown.previewStyles` connect the extension with the built-in Markdown preview. The Markdown extension of VS Code activates the extension and reads its export `extendMarkdownIt`. The section [Markdown preview](#markdown-preview) explains it.
- The commands are the buttons of the boxes of the notes. The menus `comments/commentThread/context` (the buttons of a new note), `comments/comment/title` (the buttons in the title of a note) and `comments/comment/context` (the buttons below the editor of a box) show them, each only for the comment controller `nimblescape.markdownNote`. The first button of each menu is the primary button, which Ctrl+Enter runs: "Add Note" and "Save". The Command Palette shows none of the commands, because each one needs its box. A test checks the commands and the menus against `src/noteThreads.ts`.
- The configuration contribution declares the settings of `src/settings.ts` in the section `nimblescape.markdownNote`; `expandInEditor` and `showInPreview` have the scope `resource`, so that a folder of a workspace can have its own value. A test keeps the defaults equal to `src/settings.ts`, and a test checks that the README and the guide name every setting.
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
is a comment whose text starts with the word `note` alone on the line of
`<!--` ([R-NOTE-001](docs/requirements.md#r-note-001)). The extension and the
plugin find the comments with markdown-it, the parser of the preview, with
its options (`html: true`) and with the inline rule `nimblescape_note`, which
runs before `html_inline` and reads a comment as that rule does. So the text
editor and the preview always agree on the notes:

- An HTML block that holds only comments and white space holds notes on lines
  of their own. markdown-it starts such a block at a line that starts with
  `<!--` and ends it at the first line with `-->`.
- A comment of the inline rule in a paragraph or a heading is a note inside
  the text. A comment in a table cell is no note, because the text of a cell
  has one line.
- `src/notes/notes.ts` adds the rule for the front matter of a document that
  the Markdown preview of VS Code has, so a comment in it is no note.

markdown-it keeps the line of each block, not the column of a comment, and
the text of a block in a block quote or a list item loses the prefix of each
line. The module therefore finds each line of the text of a block at the end
of its line of the document, and from it the column of the comment. A note
also keeps the prefix of its further lines (the markers `>` and the
indentation of list items), which an edit puts before each line it writes.

`src/notes/edits.ts` returns one edit for a save, an addition or a deletion.
It writes a text only when the changed document holds the same note at the
same place with the same front matter and body, when `findNotes` reads it
again ([R-EDIT-002](docs/requirements.md#r-edit-002)). This one check refuses
a text that would end the comment early, open another comment
([R-NOTE-003](docs/requirements.md#r-note-003)), or change the Markdown around
the note. A new note goes after the leaf block (paragraph, heading, code
block, HTML block, table, rule or front matter) that holds the line of the
`+`, or after the leaf block before it
([R-EDIT-003](docs/requirements.md#r-edit-003)).

## Text editor

`src/noteThreads.ts` uses the comments API of VS Code, which has the boxes in
the text editor and the Comments view. One comment controller
(`nimblescape.markdownNote`) has a commenting range of every line of a
Markdown document of a writable file system, and one comment thread for each
note, with one comment. The comment has the body of the note as a
`MarkdownString`, the author and the date of the front matter (`timestamp`,
or `label` for a date of another form), and a context value, which the menus
read: `nimblescape.markdownNote.note` for a note, and
`nimblescape.markdownNote.draft` for a new note that was not written yet.

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
  of the note.

After each change of a document, and a pause of 300 ms, the extension reads
the notes again. A thread keeps its note when the note is at the position
where the extension just wrote it, or when the comment has the same text as
before; so an open box stays open while the user types elsewhere. The
extension also gives a warning (a diagnostic) at a note that contains `<!--`,
and a folding range of the kind `Comment` for each note of several lines on
lines of its own.

## Markdown preview

The version of `markdown-it` and `@types/markdown-it` follows the version that
the built-in Markdown preview of VS Code uses (the `markdown-it` dependency of
[extensions/markdown-language-features/package.json](https://github.com/microsoft/vscode/blob/main/extensions/markdown-language-features/package.json),
version 14 on 2026-10-28), so that the extension finds the notes as the
preview does. Dependabot offers no major versions of them
(`.github/dependabot.yml`); move to a new major version only when VS Code does.

The plugin `src/markdown/markdownIt.ts` adds the inline rule of the notes and
the core rule `nimblescape_notes` after the rules of markdown-it:

- An HTML block of notes becomes one callout token for each note. A callout
  renders as a `div` with the class `nimblescape-note`, `role="note"`, a
  header with the author and the date, and the body, which the plugin parses
  with the same markdown-it instance and the same environment as the
  document, so that the plugins of the preview apply to it.
- A note inside a paragraph becomes a number in the text (`sup`), and its
  callout follows the closing token of the paragraph.
- A comment that is no note renders as without the plugin.

The preview gives every token with lines the attribute `data-line` and the
class `code-line` after the plugins of the extensions, for the scrolling with
the editor. The callout gets them from the preview. The tokens of a body get
them in their own parse, with the lines of the body; the plugin then moves the
lines and `data-line` of these tokens to the lines of the document. The
rendered diff of VS Code inserts empty elements
`<span data-diff-start="N"></span>` and `<span data-diff-end="N"></span>` into
the Markdown text; the plugin removes them from the author and the date.

The plugin reads the setting `showInPreview` for the document that the
preview names in `currentDocument` of the render environment. The preview
renders again only when its document or a setting of the Markdown extension
changes, so the extension runs the command `markdown.preview.refresh` when
one of its own settings changes, but only while the Markdown extension is
active: no Markdown preview is open before, and the command would start that
extension.

The Markdown Editor of VS Code (`vscode.markdown.editor`) has no extension
point for this: its comments come from the proposed API
`agentEditorComments`, and its only contribution point is
`markdown.codeBlockEditorProviders` for code blocks
([R-GEN-001](docs/requirements.md#r-gen-001)).

## Tests in VS Code

`npm run test:vscode` runs the tests of `test/vscode/` in a real VS Code with
the extension of the development build. The tests open Markdown files of a
temporary folder, run the commands of the buttons with the comments of the
threads (the export `threadsOf` of the extension gives the threads), and
render the documents with the command `markdown.api.render` of the Markdown
extension, which uses the markdown-it plugins of the extensions as the
preview does. CI runs them under `xvfb-run` with the stable VS Code, and the
workflow "VS Code versions" once per week with VS Code Insiders and with the
lowest supported version.

## Naming

Every extension of the publisher `nimblescape` uses one name,
`nimblescape-<name>`, for the repository, the package and the extension:

| What | Form | This extension |
| --- | --- | --- |
| Repository | `nimblescape/nimblescape-<name>` | `nimblescape/nimblescape-markdown-note` |
| `name` in `package.json` | `nimblescape-<name>` | `nimblescape-markdown-note` |
| Extension ID | `nimblescape.nimblescape-<name>` | `nimblescape.nimblescape-markdown-note` |
| Package file | `nimblescape-<name>-<version>.vsix` | `nimblescape-markdown-note-<version>.vsix` |
| Display name | `nimblescape <Title>` | `nimblescape Markdown Note` |

The repository was created as `nimblescape/nimblescape-markdown`. Rename it
to `nimblescape/nimblescape-markdown-note` (Settings > General > Repository
name) before the [Marketplace setup](#setup-of-a-repository), because
`scripts/marketplace-setup.sh` requires that the name of the repository equals
the `name` of `package.json`, and the links of the documents already use the
new name. GitHub forwards the old address to the new one.

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
| Subject | `repo:nimblescape@156021698/nimblescape-markdown-note@1436834257:environment:marketplace` |
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
