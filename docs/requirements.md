<!--
SPDX-License-Identifier: MIT
© 2026 Hannes Stauss (scalarion@nimblescape.com)
Licensed under the MIT License. See LICENSE in the repository root for details.
-->

# Requirements

This document lists what nimblescape Markdown Notes must do. Each requirement
has an ID as its heading, so that code, tests and pull requests can link to
it, for example `[R-NOTE-001](docs/requirements.md#r-note-001)`.

The extension adds notes to Markdown files. A note is a footnote of the
Markdown text ([decision 8](#decisions)), so the file stays plain Markdown:
GitHub, the main target, and other Markdown tools show each note as a
footnote at the end of the page. Several authors can answer a note and each
other, so a note is a tree of answers. VS Code shows the text of the notes in
one place, the side view "Notes" of the extension, next to the text that each
note is about: its highlight in the text editor and in the Markdown preview,
as the highlights of a marker pen on paper.

[docs/specification.md](specification.md) summarizes every requirement that
is still valid, in short; this document holds the full text of each
requirement, the plan and the decisions of Hannes.

## Plan

| Step | Content | Requirements | State |
| --- | --- | --- | --- |
| 1 | Setup: manifest, build, CI, release workflows, license notices, the same structure as the other nimblescape extensions | [R-GEN-001](#r-gen-001) to [R-GEN-005](#r-gen-005) | done |
| 2 | The note, its header, its label | [R-NOTE-001](#r-note-001) to [R-NOTE-003](#r-note-003) | done; as a footnote since step 17 |
| 3 | The text editor and the Comments view: show, edit, save, add and delete notes | [R-TEXT-001](#r-text-001), [R-VIEW-001](#r-view-001), [R-EDIT-001](#r-edit-001) to [R-EDIT-004](#r-edit-004) | done; the boxes and the Comments view dropped in step 24 |
| 4 | The Markdown preview: callouts | [R-PREV-001](#r-prev-001) | done; dropped in step 24 |
| 5 | Name `nimblescape-markdown-notes`, GitHub sign-in for the author | [R-GEN-005](#r-gen-005), [R-GEN-006](#r-gen-006), [R-NOTE-002](#r-note-002) | done |
| 6 | Notes in the text, threads of answers | [R-NOTE-004](#r-note-004), [R-NOTE-005](#r-note-005), [R-EDIT-005](#r-edit-005) | done; as footnotes and a tree of answers since step 17 |
| 7 | Text editor: dimmed comment source, collapsible notes as in GitHub pull requests | [R-TEXT-001](#r-text-001) to [R-TEXT-003](#r-text-003) | done; dropped in step 24 |
| 8 | Preview: icon, callout on hover, click opens the editor, the text without the notes | [R-PREV-001](#r-prev-001) to [R-PREV-005](#r-prev-005) | done; the icons and the callouts dropped in step 24 |
| 9 | Side view: the note editor | [R-SIDE-001](#r-side-001) to [R-SIDE-003](#r-side-003) | done |
| 10 | Tests, tests in a real VS Code, README, user guide, screenshot | all | done |
| 11 | Links in the side view, the side view in the secondary side bar with the buttons that show and hide it, the button of the preview | [R-SIDE-001](#r-side-001), [R-SIDE-005](#r-side-005), [R-SIDE-006](#r-side-006), [R-PREV-005](#r-prev-005) | done |
| 12 | Text editor: Markdown inside the notes, dimming after the cursor, collapsed notes with a marker, rendered header lines | [R-TEXT-003](#r-text-003) to [R-TEXT-007](#r-text-007) | done: collapsed notes and rendered header lines; the dimming, the markers in the left margin and the highlighting of Markdown inside the notes dropped in step 24 |
| 13 | Number and color of each note, common selection, funnels | [R-TEXT-006](#r-text-006), [R-SIDE-007](#r-side-007) | done; the numbers and the funnels replaced in step 24 |
| 14 | Visual editing of the rendered Markdown in the side view | [R-SIDE-002](#r-side-002), [R-SIDE-004](#r-side-004) | planned |
| 15 | Tests together with other Markdown extensions | [R-GEN-007](#r-gen-007) | done |
| 16 | Notes for an exact selection of the text | [R-NOTE-006](#r-note-006), [R-EDIT-003](#r-edit-003) | done |
| 17 | Notes as Markdown footnotes, without a migration of the old comments; a tree of answers; the time zone of the author; warnings; the extension Markdown Footnotes in the extension pack | [R-NOTE-001](#r-note-001) to [R-NOTE-006](#r-note-006), [R-TEXT-008](#r-text-008), [R-GEN-008](#r-gen-008) | done |
| 18 | The collapse at the start of VS Code, the buttons "Hide Note Text" and "Show Note Text", the marker beside the comment mark, the settings `showNotesIn` and `openLinksIn`, the funnel of the selected thread | [R-GEN-009](#r-gen-009), [R-GEN-010](#r-gen-010), [R-TEXT-005](#r-text-005), [R-TEXT-006](#r-text-006), [R-SIDE-007](#r-side-007) | done; replaced in step 24, apart from `openLinksIn` and the collapse at the start |
| 19 | The text of the notes in one place, hidden markers and header lines that never open, the setting `keepNotesCollapsed`, a click on a highlight that selects its note, the strong highlight of the selected note, the setting `showCalloutOnHover`, the date of a changed answer, the modes of VS Code 1.143 | [R-GEN-009](#r-gen-009), [R-NOTE-006](#r-note-006), [R-TEXT-005](#r-text-005), [R-TEXT-007](#r-text-007), [R-SIDE-001](#r-side-001), [R-SIDE-007](#r-side-007), [R-EDIT-002](#r-edit-002), [R-PREV-002](#r-prev-002), [R-PREV-003](#r-prev-003), [R-PREV-006](#r-prev-006) | done; the settings `keepNotesCollapsed` and `showCalloutOnHover` dropped in step 24 |
| 20 | The comment of the format at the top of each file with notes, with the link to the specification for AI agents, written as soon as an editor shows a file with notes, and the setting `addFormatComment` | [R-NOTE-007](#r-note-007) | done; written only with a change of a note or a save since step 27 |
| 21 | A click on a highlight of the preview that keeps the page, no callout on a click, a click outside a highlight that deselects the note, the selected thread at the top of the view, the other notes dimmed, the faint highlights of the preview, the setting `showIconsInPreview`, the Markdown formatter | [R-NOTE-006](#r-note-006), [R-SIDE-001](#r-side-001), [R-SIDE-007](#r-side-007), [R-PREV-002](#r-prev-002), [R-PREV-003](#r-prev-003), [R-PREV-007](#r-prev-007), [R-FMT-001](#r-fmt-001) to [R-FMT-003](#r-fmt-003) | done; the setting `showIconsInPreview` dropped in step 24 |
| 22 | The funnel that follows the highlight of the selected note: the band of the preview from the highlight to its right edge, and the start of the funnel at the rows of the highlight in the text editor | [R-SIDE-007](#r-side-007) | done; replaced in step 24 |
| 23 | The formatter on the command line for programs and AI agents as the npm package `@nimblescape/markdownnotes`, and its call in the specification of the format | [R-FMT-004](#r-fmt-004) | done; on npmjs.com after the first release |
| 24 | The side view as the only place of the notes, aligned to the text editor, with a line only for the selected thread; the highlights of the notes in colors with good contrast, the buttons "Show Highlights" and "Hide Highlights", the highlight under the pointer, no highlights while the side view is closed; a start marker with `<wbr>` and the color for every note; the hover over the selected text with the colors, which adds a note; the text view and the color of a thread, icon buttons; no boxes, Comments view, callouts, icons of the preview, markers in the left margin and funnels | [R-GEN-009](#r-gen-009), [R-GEN-011](#r-gen-011), [R-NOTE-006](#r-note-006), [R-TEXT-005](#r-text-005), [R-TEXT-006](#r-text-006), [R-SIDE-002](#r-side-002), [R-SIDE-007](#r-side-007), [R-EDIT-003](#r-edit-003), [R-EDIT-006](#r-edit-006), [R-PREV-001](#r-prev-001), [R-PREV-005](#r-prev-005), [R-FMT-002](#r-fmt-002) | done; the hover over the selected text replaced in step 28, the view aligned to the text editor in step 36, the highlights only with the side view in step 39 |
| 25 | The fixes of the code review: no change from an outdated side view, the open editors and the selected note kept after a change of a setting, no inline styles in the side view, links of the preview only to the extension | [R-EDIT-007](#r-edit-007), [R-SIDE-002](#r-side-002), [R-PREV-003](#r-prev-003) | done |
| 26 | Format on save only for a Markdown file with notes or with the comment of the format, and the setting `formatOnSave` | [R-FMT-001](#r-fmt-001) | done |
| 27 | The comment of the format only with a change of a note or the save of a file with notes; its version `v1.0.0` as a semantic version, written anew only by a higher version | [R-GEN-003](#r-gen-003), [R-NOTE-007](#r-note-007) | done |
| 28 | The light bulb action "Add Note" and the shortcut of the selected text in place of the hover over the selected text | [R-SIDE-003](#r-side-003), [R-EDIT-003](#r-edit-003), [R-EDIT-006](#r-edit-006) | done |
| 29 | The hidden form of the notes of a file: each note an HTML comment, the end marker a comment, the word `hidden` in the comment of the format, the escape of `-->`, both forms in all readers and writers, the specification for programs, a check with the renderer of GitHub | [R-HIDE-001](#r-hide-001), [R-HIDE-003](#r-hide-003), [R-NOTE-007](#r-note-007) | planned; before the first release |
| 30 | The icon at the top of the side view that hides the notes of the file from other viewers or shows them, its commands, and the setting `hideNotesInNewFiles` | [R-HIDE-002](#r-hide-002) | planned; before the first release |
| 31 | The text without notes for publishing: `markdownnotes strip` on the command line, "Copy without Notes" and "Save Copy without Notes" in VS Code | [R-HIDE-004](#r-hide-004), [R-FMT-004](#r-fmt-004) | planned |
| 32 | The standard footnotes in the side view: show, edit, delete and reveal, the buttons "Show Footnotes" and "Hide Footnotes" and the setting `showFootnotes`; `/footnote` opens the editor of the new footnote in the side view | [R-NOTE-001](#r-note-001), [R-FOOT-001](#r-foot-001), [R-FOOT-002](#r-foot-002), [R-EDIT-008](#r-edit-008) | done |
| 33 | "Add Footnote" at the cursor, with its shortcut | [R-FOOT-003](#r-foot-003) | done |
| 34 | The checks of the footnotes and "Renumber Footnotes" | [R-FOOT-004](#r-foot-004), [R-FOOT-005](#r-foot-005) | planned |
| 35 | "Make Footnote": a note becomes a standard footnote | [R-FOOT-006](#r-foot-006) | planned |
| 36 | The side view as a list that scrolls on its own, in place of the view aligned to the text editor; the tooltips that the view draws itself; the lighter dimming of the other threads | [R-SIDE-001](#r-side-001), [R-SIDE-002](#r-side-002), [R-SIDE-007](#r-side-007) | done |
| 37 | The highlighter pen as the icon of the buttons "Show Highlights" and "Hide Highlights", in an icon font of the extension | [R-GEN-011](#r-gen-011) | done |
| 38 | The clean editing view: the text editor edits the text of a file without the notes markup, and the extension writes each change into the file; a file with notes always opens in it (decision 27) | [R-TEXT-009](#r-text-009), [R-TEXT-005](#r-text-005) | done |
| 39 | The highlights without the side view (decision 28); a click on a thread selects it in the side view also in the clean editing view, and keeps the mode "Markdown Preview" or "Markdown Editor" of its tab; the icon of the Markdown preview on the button "Preview" of the editors of the side view | [R-GEN-011](#r-gen-011), [R-PREV-001](#r-prev-001), [R-SIDE-002](#r-side-002), [R-SIDE-007](#r-side-007) | done |
| 40 | "Add Note" for selected text in the Markdown preview | [R-PREV-008](#r-prev-008), [R-EDIT-003](#r-edit-003) | done |
| 41 | A click on a highlight selects its note, a double click opens the side view; the cursor that leaves a highlight deselects its note; each thread that is not selected dimmed ([decision 29](#decisions)) | [R-SIDE-007](#r-side-007), [R-PREV-003](#r-prev-003), [R-NOTE-006](#r-note-006) | done |
| 42 | Todo notes: the state `todo` or `done` in the header of the first answer, the check box of a todo thread in the side view ([decision 30](#decisions)) | [R-NOTE-008](#r-note-008), [R-EDIT-004](#r-edit-004) | done |
| 43 | The slash commands `/note`, `/todo`, `/footnote`, `/date`, `/time` and `/user` of the text editor | [R-EDIT-008](#r-edit-008), [R-FOOT-003](#r-foot-003) | done |
| 44 | The header of the side view that stays at the top, with the todo filter, the color filter, the search field and "Clear Filter" | [R-SIDE-008](#r-side-008), [R-SIDE-001](#r-side-001) | done |
| 45 | The citations and the metadata of the sources of a document in the style of the PHT (APA 7), the render hint in the comment of the format, the slash commands `/research` and `/source`, and the words for AI agents on `(RESEARCH)` | [R-EDIT-008](#r-edit-008) | moved to nimblescape Markdown Paper ([decision 32](#decisions)); built there on the API of [R-GEN-012](#r-gen-012) |
| 46 | Smooth scrolling of the text editor and the preview to a note that the side view selects; a double click whose first click VS Code does not report; the start of a highlight in the clean editing view; the view that scrolls to the thread that was selected while it was hidden | [R-SIDE-007](#r-side-007) | done |
| 47 | The extension ID `nimblescape.nimblescape-markdownnotes`, and version 1 of the API for other extensions with `fileOf` | [R-GEN-005](#r-gen-005), [R-GEN-012](#r-gen-012) | done; the repository gets its new name `markdownnotes-vscode` when the implementation is complete |
| 48 | Version 1 of the API with `registerFormatStep`, `registerHiddenBlocks` and `registerSlashCommand` | [R-GEN-012](#r-gen-012), [R-FMT-001](#r-fmt-001), [R-TEXT-009](#r-text-009), [R-EDIT-008](#r-edit-008) | done |
| 49 | The names without a hyphen: the npm package `@nimblescape/markdownnotes`, the command `markdownnotes`, the format `nimblescape-markdownnotes` and the scheme `markdownnotes` of the clean editing view; the library `formatMarkdown` of the npm package | [R-FMT-004](#r-fmt-004), [R-NOTE-007](#r-note-007), [R-GEN-005](#r-gen-005) | done |
| 50 | The slash commands `/figure` and `/table`, which add a figure and a table, and `/ref`, which links them; the numbers of the links from the formatter; the anchors hidden in the clean editing view | [R-XREF-001](#r-xref-001), [R-XREF-002](#r-xref-002), [R-EDIT-008](#r-edit-008) | done |
| 51 | `/ref` also links a section with the numbers of its chapter, for example `[Chapter 2.1](#sec-methods)`, with the anchor at the end of its heading; replaced by step 56 | [R-XREF-003](#r-xref-003), [R-XREF-002](#r-xref-002) | done |
| 52 | `/ref` also inserts a value of the front matter between hidden markers, which the formatter fills with the current value | [R-XREF-004](#r-xref-004), [R-FMT-002](#r-fmt-002), [R-TEXT-009](#r-text-009) | done |
| 53 | `/listing` adds the code of a file or of a symbol of a file as a listing, whose code the formatter keeps current, also on the command line; `/ref` links the listings; the format on save of a file with parts that the formatter keeps current | [R-CODE-001](#r-code-001), [R-CODE-002](#r-code-002), [R-XREF-001](#r-xref-001), [R-FMT-001](#r-fmt-001) | done; the symbols are removed in step 60 |
| 54 | Snippets between marks in the source code, which a listing names; `/snippet` and "Add Snippet" in a source file; the comment of a listing as a link to its source | [R-CODE-003](#r-code-003) | done, in the form that Claude recommended; the card on the form of the marks is open |
| 55 | The highlights, the selection and "Add Note" in the pages of a paper of nimblescape Markdown Paper in the Markdown preview | [R-PREV-009](#r-prev-009) | done |
| 56 | `/ref` links a section by the ID that GitHub gives its heading, for example `[Chapter 2.1](#methods)`, without an anchor; the formatter numbers these links; the rules "close to Markdown" and "decisions as requirements" ([decision 36](#decisions)) | [R-XREF-003](#r-xref-003), [R-XREF-002](#r-xref-002), [R-GEN-013](#r-gen-013), [R-GEN-014](#r-gen-014) | done |
| 57 | Snippets and listings in more file types: the comment forms of more than 80 types, among them JSONC, YAML, TOML, `.env`, CSS, SCSS, HTML, Dockerfile and Makefile; symbols only in the languages with braces and in Python | [R-CODE-003](#r-code-003), [R-CODE-001](#r-code-001) | done; the symbols are removed in step 60 |
| 58 | Snippets in any language that VS Code knows, through its command "Add Line Comment"; the tag of each snippet as a code lens with the listings that show it (in place of the marks since step 62); the dimmed marks; the buttons "Show Used Snippets" and "Hide Used Snippets" ([decision 37](#decisions)) | [R-CODE-003](#r-code-003), [R-CODE-004](#r-code-004) | done |
| 59 | The frame of a highlight in the pages of a paper only in the text area of each page; "Add Note" without the soft hyphens of the pages | [R-PREV-009](#r-prev-009) | done |
| 60 | Listings of whole files and snippets only: no symbols of a language in `/listing`, the formatter and the links of the listings; a warning at a listing whose file or snippet is not found ([decision 38](#decisions)) | [R-CODE-005](#r-code-005), [R-CODE-001](#r-code-001), [R-CODE-002](#r-code-002), [R-CODE-003](#r-code-003) | done |
| 61 | Symbols of a listing with tree-sitter parsers for Go, TypeScript, TSX, JavaScript, JSX, Python, HTML, CSS, YAML, JSON, JSONC and shell scripts, in VS Code and on the command line | [R-CODE-005](#r-code-005) | planned |
| 62 | The marks of a snippet as tags in the look of a code lens in place of the mark lines; the cursor jumps over them; a click on an end tag goes to the start; "Rename Snippet" and "Remove Snippet" in the light bulb ([decision 37](#decisions)) | [R-CODE-004](#r-code-004) | done |

## General

### R-GEN-001

**Built-in editors.** The extension extends the editors that VS Code has for
Markdown files: the text editor and the Markdown preview. It adds one view of
its own, the side view of [R-SIDE-001](#r-side-001), and uses no comment
threads of VS Code and no Comments view ([R-GEN-009](#r-gen-009)). It
changes no other part of a Markdown file than the parts of a note: its
definition, its reference and its start marker, and the comment of the format
at the top of a file with notes ([R-NOTE-007](#r-note-007)).

The Markdown Editor of VS Code (the visual editor `vscode.markdown.editor`)
offers extensions no stable API to show or edit content there: it renders
with its own engine, `@vscode/markdown-editor`, which takes no markdown-it
plugin; its comments come from the proposed API `agentEditorComments`, which
only extensions of VS Code may use; and its only contribution point is
`markdown.codeBlockEditorProviders` for code blocks. Until VS Code offers a
stable API, the extension does not show notes in the Markdown Editor
([R-GEN-002](#r-gen-002)). The notes stay in the file there as they are, and
the side view works with it ([R-PREV-006](#r-prev-006)).

### R-GEN-002

**Marketplace rules.** The extension follows the rules of the Visual Studio
Marketplace. It uses no proposed VS Code API, because the Marketplace does
not accept extensions that use one. It supports VS Code 1.125 and later.

### R-GEN-003

**Restricted Mode and privacy.** The extension works in Restricted Mode and in
virtual workspaces. It runs no program and collects no telemetry. Its own code
connects to no address; the sign-in of [R-GEN-006](#r-gen-006) goes through the
GitHub authentication of VS Code. It changes a file only when the user saves,
adds, answers or deletes a note; the save of a file with notes formats it and
adds the comment of the format ([R-FMT-001](#r-fmt-001),
[R-NOTE-007](#r-note-007)). A file that an editor only shows keeps its text.

### R-GEN-004

**Licenses.** `THIRD-PARTY-NOTICES.md` names every package that the build
bundles into the package, with its version, its license and the place of its
source code, and holds the text of each license.

### R-GEN-005

**Name and release.** The name is `nimblescape-markdownnotes`, the display
name "nimblescape Markdown Notes", and the extension ID
`nimblescape.nimblescape-markdownnotes` (Hannes, 2026-10-30, 02:04; before
it, `nimblescape.nimblescape-markdown-notes` of 2026-10-28). The repository
gets the name `nimblescape/markdownnotes-vscode` when the implementation is
complete ("will be renamed when impl is completed"); until then it is
`nimblescape/nimblescape-markdown-notes`. Its sister extension nimblescape
Markdown Paper is `nimblescape.nimblescape-markdownpaper` in
`nimblescape/markdownpaper-vscode` (Hannes, 2026-10-30, 02:01). All other
names have no hyphen in "markdownnotes" either ([decision 33](#decisions)):
the npm package `@nimblescape/markdownnotes` and its command `markdownnotes`
([R-FMT-004](#r-fmt-004)), the name `nimblescape-markdownnotes` of the format
in the comment of the format ([R-NOTE-007](#r-note-007)) and the scheme
`markdownnotes` of the clean editing view. The settings and commands keep
the form `nimblescape.markdownNotes.*`. The repository gets its new name
before the first publish of the npm package, because the trusted publisher of
npmjs.com names the repository. The
publisher is `nimblescape`. The release uses the same workflows and checks as the other
extensions of the publisher (`release.yml`, `release-dry-run.yml`,
`marketplace-identity.yml`, `scripts/release-checks.mjs`) and follows the
[release rules](../CONTRIBUTING.md#release-rules) of the publisher. Nobody
publishes the extension until Hannes asks for it.

### R-GEN-006

**GitHub sign-in.** The extension requires a sign-in with GitHub, so that the
author of every note and every answer is always known. It uses the GitHub
authentication of VS Code (the accounts menu of VS Code). Before the user adds
or answers a note, the extension asks for the sign-in when the user is not
signed in; without a sign-in, it writes no new note and no answer. The
author of a new note or answer is the GitHub login of the signed-in account.
The user cannot type another author. Reading, editing and deleting need no
sign-in ([decision 3](#decisions)).

### R-GEN-007

**Only additions.** The extension only adds to the Markdown support of
VS Code, as an overlay, and replaces no part of it (Hannes, 2026-10-28). The
text editor, the Markdown preview and the Markdown extensions of other
publishers work as without it, for example the extensions of Matt Bierner for
Mermaid diagrams, emoji, footnotes, checkboxes and the GitHub styles of the
preview. The extension adds:

- decorations, folding ranges, hovers and warnings in the text editor;
- a markdown-it plugin that changes only the footnotes that are notes, with
  their references and start markers, and gives every other token to the
  rules of the preview and of the other plugins;
- styles and a script of the preview that apply only to its own elements;
- the side view ([R-SIDE-001](#r-side-001));
- a formatter of Markdown files ([R-FMT-001](#r-fmt-001)), which the user can
  replace with another one.

The tests render the notes together with the markdown-it plugins of these
extensions, in both orders of the plugins: markdown-it-footnote,
markdown-it-emoji and markdown-it-task-lists in the major versions of the
extensions, the fences of Mermaid, and the frame of the GitHub styles around
the page. The rules of the notes run before the rules of markdown-it-footnote,
so that plugin never shows a note as a footnote, and the plugin of the
extension never renders the other footnotes itself: two footnote plugins
would write the list of the footnotes twice. A footnote in the text of a note
is a footnote of the page. A check in VS Code 1.143 with the five extensions
of Matt Bierner showed the emoji, the footnotes, the checkboxes, a Mermaid
diagram and the GitHub styles in the text.

### R-GEN-008

**Footnotes in the preview.** The Markdown preview of VS Code shows no
footnotes without an extension. The extension therefore names the extension
"Markdown Footnotes" of Matt Bierner (`bierner.markdown-footnotes`) in its
`extensionPack`: VS Code installs it together with the extension, and the
user can disable or uninstall it on its own. The extension works without it;
the preview then shows the other footnotes of a file as text. A repository of
documents can recommend the extension to everyone who opens it, in its file
`.vscode/extensions.json` ([user guide](guide.md#recommend-the-extension-in-a-repository)).

### R-GEN-009

**Where the text of the notes shows.** The text of the notes shows in one
place only, the side view ([R-SIDE-001](#r-side-001)) (Hannes, 2026-10-28:
"we completely drop the inline view", [decision 15](#decisions)):

- The text editor never shows the text of a note and its markers (Hannes,
  2026-10-28: "in the text view we never show the notes and the markers"):
  the notes are always collapsed ([R-TEXT-005](#r-text-005)), and the start
  markers and the references are hidden ([R-NOTE-006](#r-note-006)). It shows
  no boxes of comments, no `+` for a new note and no icons in the left margin
  (Hannes: "drop all colored icons on the left").
- The Markdown preview shows no icon and no callout of a note (Hannes: "we
  completely drop the callouts on hover view", "we completely drop the
  callout icons in the preview view"), only the highlights
  ([R-PREV-001](#r-prev-001)).
- The text editor and the preview show the highlight of each note, the text
  that the note is about, also while the side view is closed
  ([R-GEN-011](#r-gen-011)), and a click on a highlight selects its note,
  and a double click on it opens the side view
  ([R-SIDE-007](#r-side-007), [decision 29](#decisions)).

The side view shows the whole text of a note also as the file holds it, in
its text view ([R-SIDE-002](#r-side-002)). The settings `showNotesIn`,
`expandInEditor`, `collapseInEditor`, `keepNotesCollapsed`,
`showCalloutOnHover`, `showInPreview`, `showIconsInPreview` and
`showFunnels` of earlier versions have no effect.

### R-GEN-010

**Where a link of a note opens.** A click on a link to a file in the text of
a note opens the file in a new window of VS Code, so that the Markdown file
and its preview stay as they are (Hannes, 2026-10-28). The text of the notes
shows only in the side view ([R-SIDE-005](#r-side-005)). The setting
`nimblescape.markdownNotes.openLinksIn` chooses the place:

- `newWindow` (the default): a new window of VS Code. A file that a tab of
  VS Code shows already opens in that tab, also in another window.
- `editor`: the editor of VS Code.
- `system`: the program of the system for the file, for example the PDF
  viewer. A file that is no document or image, which could be a program,
  opens only after the user agrees.

A web link or a mail link opens with the system in each case, and a link to a
place of the Markdown file itself in its editor.

### R-GEN-011

**Show and hide the highlights.** The highlight of a note is the text from
its start marker to its reference ([R-NOTE-006](#r-note-006)), as the
highlight of a marker pen on paper (Hannes, 2026-10-28: "it is Highlights you
would on paper do with a marker pen"). The highlights can show or be hidden,
and while they show, they have a good contrast (Hannes: "the selections can
be viewed or hidden, when viewd make it good constrast"):

- The setting `nimblescape.markdownNotes.showHighlights` (on by default)
  shows the highlights in the text editor and in the Markdown preview.
- The highlights do not depend on the side view "Notes": they show also
  while it is closed, and opening or closing it does not change them (Hannes,
  2026-10-29: "clicking the highlight button, opens the side view, it shall
  not open the side view but only show the highlights. when a highlight is
  clicked, then the side view shall open"). This replaces the rule of
  2026-10-28 "closing the side view, also hides the highlights"
  ([decision 28](#decisions)).
- The title of the text editor and of the preview of a Markdown file has the
  button "Hide Highlights" (a highlighter pen with a stroke) while the
  highlights show, which turns the setting off, and else the button "Show
  Highlights" (a highlighter pen over its line), which turns the setting on
  and does not open the side view. The icon shows what a click does, and the tooltip
  names it. The pen is an icon font of the extension, so that VS Code draws
  it in the icon color of the theme, as its own codicons (Hannes,
  2026-10-29: "propose a better icon for the show highlights button";
  [decision 26](#decisions)). The button changes the
  setting in the settings of the workspace when they hold a value, else in the
  settings of the user. The Command Palette has the same commands.
- A hidden highlight shows while the pointer rests on its text, in the text
  editor and in the preview (Hannes, 2026-10-28: "even when the higlights are
  not are hidden, hover over a highlight always shows the higlight"), and a
  click on it selects its note ([R-SIDE-007](#r-side-007)). In the preview it
  goes away when the pointer leaves the text. VS Code tells an extension the
  place of the pointer in the text editor only when it asks the hover
  providers, and tells no event when the pointer leaves the text; so in the
  text editor the highlight stays until the pointer rests on other text, the
  cursor moves or the side view opens.
- The highlight of the selected note of the side view always shows, strong
  and with a frame in the color of the note ([R-NOTE-006](#r-note-006)).
- A change of the setting deselects the selected note of every document, in
  the text editor, in the preview and in the side view (Hannes, 2026-10-29
  19:51: "when a highlight is selected, and the higlight view is toggled, it
  shall unselect the selected highligt"). The open editors of the side view
  stay.

A change of the setting renders the open previews again.

### R-GEN-012

**API for other extensions.** The extension gives other extensions a
versioned API, so that nimblescape Markdown Paper adds its parts to a
Markdown file with notes without this extension knowing anything of papers
(Hannes, 2026-10-29, 22:11: "we want a clean split and and the notes shall
still be markdown related"; 22:15: "it is also the slash commands"; 22:16:
"and maybe even more things"):

- The export of the extension has `getAPI(version)`, as the Git extension of
  VS Code: `getAPI(1)` returns version 1 of the API, and a version that the
  extension does not know returns `undefined`.
- Version 1 has `fileOf(uri)`: the URI of the file behind a document of the
  clean editing view ([R-TEXT-009](#r-text-009)), or `undefined` for another
  document, because the page preview and the PDF of Markdown Paper read the
  file with its notes and footnotes.
- Each further part has a call that registers it and returns a disposable that
  removes it again (Hannes, 2026-10-30, 02:25: the citations go to Markdown
  Paper, [decision 32](#decisions)):
  - `registerFormatStep({ applies(lines, file), format(lines, file) })`: a
    step of the formatter after the steps of the notes, in "Format Document"
    of a file and in the format on save ([R-FMT-001](#r-fmt-001)). `file` is
    the URI of the file. A Markdown file that a step formats gets the format
    on save also without notes. A step that fails, or returns no lines,
    changes nothing. In the clean editing view, the steps run with the save
    of the file, not in "Format Document" of the view.
  - `registerHiddenBlocks({ find(lines) })`: blocks of whole lines at the end
    of a file that the clean editing view leaves out
    ([R-TEXT-009](#r-text-009)), such as the database of the sources of
    Markdown Paper. Text typed in the view goes before them, and a file that
    the view writes anew keeps them at the end. A file with such a block
    opens in the view too.
  - `registerSlashCommand({ label, description, detail, run(editor, range) })`:
    a slash command after the commands of the notes ([R-EDIT-008](#r-edit-008)),
    with the same rules. The label is a slash and small letters that no other
    command has, or the call throws. `run` gets the text editor at the place
    of the removed command; an edit of the clean editing view goes into the
    file, as every edit of the view. A command that fails shows a message.
- Checks of other extensions need no call: an extension sets its diagnostics
  on the file that `fileOf` names, as the notes do. Markdown Paper writes no
  lines into the comment of the format: a paper names its layout in its front
  matter. A part that changes the meaning of an earlier one raises the
  version.
- The command `markdownpaper format` of Markdown Paper calls the library of
  the npm package of the notes ([R-FMT-004](#r-fmt-004)) and then its own
  steps, so that one command formats a file of a paper project
  ([decision 34](#decisions)).

### R-GEN-013

**Close to Markdown.** Each new form that the extension writes into a
Markdown file stays as close to plain Markdown as it can (Hannes, 2026-10-30,
03:29: "we shall stay as close to markdown as possible"; "isn't it just a
markdown link?"): a form of plain Markdown comes before a hidden comment of
HTML or an anchor, and a hidden part comes only where plain Markdown has no
form for it. GitHub, the Markdown preview and other Markdown tools then show
the text without the extension. A link to a section, for example, names the
ID that GitHub gives its heading and adds no anchor
([R-XREF-003](#r-xref-003), [decision 36](#decisions)).

### R-GEN-014

**Decisions as requirements.** Each decision of Hannes on the extension gets
a requirement in this document, with its words, its date and the choice that
it replaced, in the same change that builds it, and an entry in
[Decisions](#decisions) (Hannes, 2026-10-30, 03:48, for every repository:
"document any decision as a requirement"). A decision that changes an
earlier requirement changes its text, so that this document describes the
extension as it is.

## Notes

### R-NOTE-001

**Syntax.** A note is a footnote of a Markdown file
([decision 8](#decisions)): a reference in the text, and a definition after
the block of the reference, whose first line is the header of the note
([R-NOTE-002](#r-note-002)). The body of the note follows in normal Markdown
syntax, with each line indented by four spaces:

```markdown
The agents <wbr><!--[note-7k2q-->change the work of teams[^note-7k2q] in three ways.

[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00

    Which three ways?
```

The start marker `<wbr><!--[note-7k2q-->` before the text and the reference
`[^note-7k2q]` after it mark the highlight of the note
([R-NOTE-006](#r-note-006)). A footnote is a note only when its label has the form of the label of a note
([R-NOTE-003](#r-note-003)) and its first line is a header. Every other
footnote is no note but a standard footnote, which the side view shows and
edits as a footnote ([R-FOOT-001](#r-foot-001)).

The extension finds the notes as the Markdown preview does, with markdown-it
and the options of the preview. So a footnote or a reference in a code block,
in a code span, in the front matter of the document and in a block of HTML is
no note. A note holds no note: a reference in the text of a note names no
note.

### R-NOTE-002

**Header.** Each answer of a note starts with a header line: the GitHub login
of the author in bold ([R-GEN-006](#r-gen-006)), a middle dot, and the date
and time of the answer in minutes, in the local time of the author with the
offset of the zone, or `Z` for UTC (Hannes, 2026-10-28):

```markdown
**hannes** · 2026-10-28 10:15+01:00
```

The extension shows the date in the local time of the reader, for example
`2026-10-28 09:15` for a reader in UTC, and the local time of the author as
the tooltip of the date, for example "2026-10-28 10:15 at the author
(UTC+01:00)". GitHub shows the header line as it is. The extension writes the
header itself and keeps it as it is when it saves an answer.

### R-NOTE-003

**Label.** The label of a note is `note-` and four random small letters or
digits, for example `note-7k2q` (Hannes, 2026-10-28). The extension draws the
label of a new note anew until no footnote of the file uses it, so that two
notes of different branches of a repository hardly ever get the same label.
A label never changes, also when a note is added before it, and the user
does not see it: the side view names a thread by the line of its note.

### R-NOTE-004

**Threads.** Different authors can answer a note and each other, as in a
discussion on Reddit (Hannes, 2026-10-28). A note is therefore a thread: its
first answer, the text of the note, and a tree of replies
([decision 9](#decisions)). Each reply is a block quote with its own header
and body, after the answer that it replies to. A reply to a reply stands in
the block quote of that answer, so its depth is the number of its quote
markers:

```markdown
[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00

    Which teams?

    > **anna** · 2026-10-28 11:02+01:00
    >
    > The teams of the plan.
    >
    > > **hannes** · 2026-10-28 11:30+01:00
    > >
    > > Thanks, then I change the text.

    > **bob** · 2026-10-28 12:00+01:00
    >
    > Another answer to the note.
```

A block quote whose first line is a header starts a reply; every other block
quote belongs to the body of its answer. The replies to an answer stand in
the order of the file, after the body of the answer. The side view shows the
tree: the replies to a reply indented below it. GitHub shows the tree as
nested block quotes.

### R-NOTE-005

**Place of a note.** The definition of a note stands after the outermost
block that holds its reference: after the whole list, the whole table or the
whole block quote, at the start of the line, with a blank line before and
after it. The notes of one block stand in the order of their references. The
lines of a note after its header are indented by four spaces, also the blank
lines of a block quote of a reply. In this form, GitHub and the other
Markdown viewers read the note as a footnote, and the text after it stays
outside the note.

The reference never stands in the text of a link, where it breaks the link on
GitHub, nor in a code span: the extension writes it after the link or the code
span. A reference in a heading changes the anchor of the heading on GitHub,
so the extension warns at it ([R-TEXT-008](#r-text-008)).

### R-NOTE-006

**Highlight of a note.** A note belongs to an exact text, its highlight, as
the highlight of a marker pen on paper (Hannes, 2026-10-28: "it is Highlights
you would on paper do with a marker pen"): from its start marker
`<wbr><!--[note-7k2q-->` to its reference `[^note-7k2q]`, the end marker of
the highlight (Hannes: "the end marker is always the footnote markdown?"). The
user selects the text in the text editor and adds the note
([R-EDIT-003](#r-edit-003)).

- Every note has one start marker (Hannes, 2026-10-28: "there should never be
  a note without a start marker"). The start marker is `<wbr>` and a comment
  with `[` and the label of the note, inside the line, so it ends no
  paragraph, and GitHub and other renderers show the text without it.
- The start marker holds the color of the note after the label, for example
  `<wbr><!--[note-7k2q green-->` ([R-TEXT-006](#r-text-006)). A marker
  without a color name has the default color.
- The start marker always starts with `<wbr>` (Hannes, 2026-10-28: "why not
  always start with <wbr>"). GitHub (cmark-gfm) reads a comment at the start
  of a line as an HTML block, which ends the paragraph and shows the rest of
  the line without Markdown; the empty element `<wbr>` before the comment
  keeps the line a line of the paragraph, also at the start of a paragraph, a
  list item or a block quote. A reader also accepts a start marker without
  `<wbr>` inside a line. The text editor warns at a start marker without
  `<wbr>` at the start of a line, and at a note without a start marker
  ([R-TEXT-008](#r-text-008)); "Format Document" adds both
  ([R-FMT-002](#r-fmt-002)).
- A highlight holds text: a start marker directly before the reference
  highlights no text, which the text editor warns at, and the text editor and
  the preview show no highlight for it. The extension adds no note without a
  highlight (Hannes, 2026-10-28: "there shall be no way to add a note without
  highlighting text").
- A highlight stays in one block of text: its paragraph, its heading, its
  list item or its table cell. The highlights of several notes can overlap.
- While the setting `showHighlights` is on
  ([R-GEN-011](#r-gen-011)), the text editor and the preview show each
  highlight in the color of its note, with a background and a line below the
  text, so that it stands out of the text. In the preview a highlight is
  strong under the pointer. The highlight of the note that the side view
  selects is strong, with a frame in the color of the note, in the text
  editor and in the preview ([decision 10](#decisions)), also while the other
  highlights are hidden. While a note is selected, the highlights of the
  other notes are dimmed (Hannes, 2026-10-28: "other notes shall be dimmed
  when one note is selected"). The overview ruler of the text editor has a
  mark in the color of each highlight that shows.
- In the text editor the start marker and the reference never show, also not
  on the line of the cursor, because the extension writes them and the user
  does not edit them (Hannes, 2026-10-28: "there is no reason to make the
  markers editable at all", "in the text view we never show the notes and the
  markers"):
  - The cursor steps over a hidden marker as over one place: a move into a
    marker goes to its edge in the direction of the move, and past the
    markers that follow it directly; a click goes to the nearer edge.
  - Backspace and Delete next to a hidden marker delete the character on the
    other side of the marker, and the keys that delete a word
    (Ctrl+Backspace and Ctrl+Delete, on macOS Alt) the word there. No key
    deletes a part of a marker. Other edits of the file, for example "Find
    and Replace", still change the text as it is.
- A click with the mouse on a highlight in the text editor or in the preview,
  also on a hidden highlight, selects its note, and a double click on it
  opens the side view (Hannes, 2026-10-29: "only a double click on a
  selected highlight shall open the side view", "in both text and preview";
  [decision 29](#decisions)). In the text editor the cursor stays in the
  text.

This is [decision 6](#decisions), with [decision 16](#decisions) and
[decision 17](#decisions).

### R-NOTE-007

**Comment of the format.** Each file with notes holds a comment that names
the format of the notes, like a DOCTYPE, so that a program knows that the file
is a document with notes and how to read it (Hannes, 2026-10-28: "the
extension shall leave a hint for ai agents on how to process the notes as a
comment in the file", "this comment is also the "DOCTYPE" so the extension
always knows it is a notes md document"). The
[specification of the format](format.md) is a file of the repository (Hannes:
"the public specification is a file in the github repo").

- The first line names the format, its version and the address of the
  specification: `<!-- nimblescape-markdownnotes v1.0.0
  spec=https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/format.md`.
  The name of the format has no hyphen in "markdownnotes" since 2026-10-30
  ([decision 33](#decisions)); a comment of the earlier name
  `nimblescape-markdown-notes` counts as older and is written anew.
  Short lines of words follow, which tell an AI agent to read the
  specification before it reads, changes or adds a note, and the last line is
  `-->`. GitHub and the Markdown preview do not show the comment.
- In a file whose notes are hidden from other viewers
  ([R-HIDE-001](#r-hide-001)), the first line holds the word `hidden` after
  the version: `<!-- nimblescape-markdownnotes v1.0.0 hidden spec=…`. A
  first line without the word means the visible form. The words of the
  comment say that in a file with `hidden`, each note is an HTML comment.
- The comment stands at the top of the file, with a blank line after it. It
  does not interfere with a front matter (Hannes: "it shall not interfere with
  frontmatter"): a YAML (`---`) or TOML (`+++`) front matter stays the first
  block of the file, and the comment follows it.
- The extension writes the comment with a change of a note and with the save
  of a file with notes, never because an editor only shows a file
  ([decision 20](#decisions)): a file that an editor, a diff view or the
  Markdown preview only shows keeps its text. Each change of a note that the
  extension writes brings the comment too: the first note brings it, and the
  last note takes it away with the blank line after it. Undo removes the
  comment with the note. The save of a file with notes adds a missing
  comment; the auto save after a delay and "Save without Formatting" do not.
  The setting `nimblescape.markdownNotes.addFormatComment` (on by default)
  turns this off for the save; a change of a note still brings the comment.
- The version is a semantic version ([decision 21](#decisions)): a higher
  major version is a form of the notes that an older version reads wrongly,
  and has its own specification; a higher minor version adds optional
  elements that an older version reads and keeps; a higher patch version
  changes only the words of the comment or of the specification. After the
  first release, each change of the form of the notes raises the version.
- The extension writes a comment anew only when its own version is higher
  than the version of the comment in the file. A comment of an equal or
  higher version stays as it is, also when its words differ, so that two
  versions of the extension do not change it back and forth. A comment
  without a version counts as older.
- A file without the comment has notes too, for example a file from before
  this version: the extension reads its notes as always
  ([decision 11](#decisions)).
- When the comment names a higher major version of the format than the
  extension knows, the extension changes no note of the file and says why,
  and its formatter keeps the file as it is. A higher minor or patch version
  does not stop it.
- The text editor folds the comment into its first line, as it folds a note
  ([R-TEXT-005](#r-text-005)).

### R-NOTE-008

**Todo notes.** A note can be a todo, a task that the user marks completed
(Hannes, 2026-10-29: "/todo in the text adds a special todo note", "a todo
can be marked completed", [decision 30](#decisions)). The header of the first
answer of a todo note ends with a middle dot and its state: `todo` while it
is open, `done` when it is completed:

```markdown
[^note-7k2q]: **hannes** · 2026-10-29 18:30+01:00 · todo
```

- GitHub shows the header as it is, so a reader there sees the state too.
- `/todo` in the text editor adds a todo note ([R-EDIT-008](#r-edit-008)).
- The side view shows a check box at the start of the header of a todo
  thread: empty while the todo is open, checked when it is completed. A click
  on it changes the state, and the extension writes `done` or `todo` into the
  header. The date of the answer stays.
- Only the first answer holds the state. The extension writes no state into
  the header of a reply, and keeps the header of a reply as the file holds
  it. When the first answer goes, its state goes to the answer that takes its
  place ([R-EDIT-004](#r-edit-004)).
- The todo filter of the side view shows the open or the completed todos
  ([R-SIDE-008](#r-side-008)).

## Text editor

### R-TEXT-001

**Notes in the text editor.** Dropped ([decision 15](#decisions)). The text
editor showed each note in a box of the comments API of VS Code below the
note, as the extension GitHub Pull Requests shows the comments of a pull
request. The side view is the only place of the text of the notes
([R-GEN-009](#r-gen-009)).

### R-TEXT-002

**Collapsible boxes.** Dropped with the boxes of
[R-TEXT-001](#r-text-001), and with them the setting `expandInEditor`.

### R-TEXT-003

**Dimming after the cursor.** Dropped: the text editor never shows the text
of a note ([R-TEXT-005](#r-text-005)), so there is no note to dim or to
stand out.

### R-TEXT-004

**Markdown inside a note.** Dropped: the text editor never shows the text of
a note. The side view shows it rendered, and as the file holds it in the
text view of a thread ([R-SIDE-002](#r-side-002)).

### R-TEXT-005

**Collapsed notes.** A Markdown file with notes opens in the clean editing
view, which shows no markup ([R-TEXT-009](#r-text-009)). The text editor of
the file itself, after "Open File with Markup", never shows the text of a note
either (Hannes, 2026-10-28: "in the text view we never show the notes and the
markers"):
every note is collapsed, and nothing expands it. The editor folds the lines
of the definition of the note together with the blank lines before it into
the last line of text before the note, so that this line stays and the note
does not. VS Code shows the end of this line with "⋯" and, after the setting
`editor.foldingHighlight`, with the background of a folded line.

- The fold keeps the blank lines after the note, so that the paragraph break
  after the block of the note stays.
- Notes with only blank lines between them share one fold.
- After a list item of one line, the fold starts on the line of the item.
- After a heading, a list item of more lines, a block quote, a table, a code
  block or HTML, the Markdown extension of VS Code has a fold of its own that
  starts or ends on that line, so the fold of the note starts on the last
  blank line before the note and also takes the blank lines after it. The
  blank lines before the note stay where the text had them.
- Before a heading, the fold leaves the last blank line before the heading,
  where the fold of the section of a heading before the note ends. Else
  VS Code drops the fold of the note and folds the section.
- A note in the first line of the file has no line before it; its first line
  stays, and the extension hides the text of that line and shows its header
  rendered ([R-TEXT-007](#r-text-007)).

The notes collapse when a file shows in the text editor the first time. VS Code
itself opens a fold for a click on its arrow, for a search or for a cursor in
it; the extension then moves the cursor out of the note and collapses it
again, after VS Code read the folds of the current version of the file, so
that the fold command acts on the fold of the note and not on a fold around
it. The cursor does not stay in the lines of a collapsed note: a move down
goes to the next line after the note, a move up to the end of the line
before it. The text of the notes shows in the side view
([R-GEN-009](#r-gen-009)). The settings `collapseInEditor` and
`keepNotesCollapsed`, the buttons "Hide Note Text" and "Show Note Text" and
the commands "Collapse All Notes" and "Expand All Notes" of earlier versions
are dropped.

VS Code reads the folds of all extensions again when an extension adds its
folding provider, and a fold during the reading before has no effect. At the
start of VS Code with a Markdown file open, the Markdown extension of VS Code
adds its provider after this extension collapsed the notes, so the notes
stayed open (Hannes, 2026-10-28). The extension therefore collapses the notes
again each time VS Code reads the folds of the unchanged file, for 10 seconds
after the first collapse.

### R-TEXT-006

**Color of a note.** Every note has the same color by default, and the user
gives a note another color in the side view (Hannes, 2026-10-28: "notes can
be colored in the notes editor, by default they get all the same color"):
the button with the color of a thread opens the colors, and the editor of a
new note offers them for the new note ([R-SIDE-003](#r-side-003)).
The six colors are blue (the default), green, orange, purple, red and teal,
which show on light and on dark themes. The file keeps the
color in the start marker of the note, after its label, for example
`<wbr><!--[note-7k2q green-->`; the default color has no name in the marker
([R-NOTE-006](#r-note-006), [decision 16](#decisions)). The color shows in
the highlight of the note in the text editor and in the preview, in its mark
in the overview ruler, and at the thread in the side view
([R-SIDE-007](#r-side-007)). The text editor shows no marker of a note in
its left margin (Hannes, 2026-10-28: "drop all colored icons on the left"),
and a note has no number.

### R-TEXT-007

**Rendered header lines.** The extension writes the header of each answer
itself, and the user does not edit it (Hannes, 2026-10-28). Where the text
editor shows a header line, on the line that stays of a note in the first
line of the file ([R-TEXT-005](#r-text-005)) or while VS Code opens a note
for a moment, it shows the line rendered, with the author and the date in
the local time of the reader, for example "hannes · 2026-10-28 10:15", and
the local time of the author as its hover ([R-NOTE-002](#r-note-002)). The
label of the first answer and the markup of the header vanish with it; the
quote markers of a reply stay. The header line shows rendered also on the line
of the cursor (Hannes, 2026-10-28: "the title must never be editable, also
not in text mode"): the cursor does not stay on a header line and goes to the
next free line in the direction of its move, and Backspace or Delete that
would join a line with a header line changes nothing. A changed answer gets
the date of its save ([R-EDIT-002](#r-edit-002)).

### R-TEXT-008

**Warnings.** The text editor and the Problems view warn at each form of a
note that GitHub or another Markdown viewer shows differently from the
extension ([R-NOTE-005](#r-note-005)), or that breaks a rule of the notes
([R-NOTE-006](#r-note-006)):

- a definition without a blank line before or after it;
- a line of a note without the indentation of four spaces (a hint);
- a second definition of a label;
- a reference without a note, and a note without a reference, which GitHub
  does not show;
- a note in a block quote, which GitHub does not show;
- a reference in the text of a link, which breaks the link on GitHub;
- a reference in the text of a note, which names no note;
- a reference in a heading, which changes the anchor of the heading on GitHub
  (a hint);
- a note without a start marker;
- a note whose highlight holds no text, a start marker directly before the
  reference;
- a start marker without `<wbr>` at the start of a line, which ends the
  paragraph.

"Format Document" adds a missing start marker and a missing `<wbr>`
([R-FMT-002](#r-fmt-002)).

### R-TEXT-009

**Clean editing view.** The text editor of a Markdown file with notes edits
the text of the file without the notes markup (Hannes, 2026-10-29: "all notes
markup must not have effects on the editing, the editor must behave as if
there was no notes markup at all in the document"; [decision 27](#decisions)):
without the start markers, the references, the definitions of the notes and
the comment of the format. The line breaks, the cursor, the word moves, the
search, the copy and Undo count only the characters of the text, as in a file
without notes. The extension writes each change of the view into the file at
once, and keeps each note at its text:

- While the side view shows the standard footnotes
  ([R-FOOT-001](#r-foot-001)), the view also leaves out the definition of each
  standard footnote that has a reference, as the definitions of the notes
  (Hannes, 2026-10-29 20:42: "the definition can even be hidden, same as for
  the note, it does not make sense to show it"); the side view shows and
  edits it. The references stay in the text, and a definition without a
  reference stays too, so that the user sees it. A definition that the user
  types in the view, or that gets its first reference there, stays in the
  view until the view reads the file anew: when it opens, after a change of
  the file from elsewhere, for example in the side view, and after a change
  of the setting `showFootnotes`. A file with standard footnotes and no notes
  opens in its own text editor, with its definitions.

- The view also leaves out the blocks at the end of a file that other
  extensions hide through the API ([R-GEN-012](#r-gen-012)), such as the
  database of the sources of nimblescape Markdown Paper, and the anchors of
  the figures and tables ([R-XREF-001](#r-xref-001)): each anchor outside
  code and the definitions, also one that an edit moved away from the end of
  its line. Text typed at the end of the line of an anchor goes before it.
- Text typed at the start or the end of a highlight stays outside of it; text
  typed inside a highlight stays in it, also when it replaces the first or the
  last word of the highlight, letter by letter.
- A deleted text never deletes a note: a highlight whose whole text goes
  becomes a point, which the checks report ([R-TEXT-008](#r-text-008)).
- A paragraph break inside a highlight ends the highlight before the break, and
  the definition of the note moves after the block of its reference; two
  joined paragraphs take the definitions of the first one after the joined
  block.
- Undo and Redo bring back the file as it was, with each note at its place.
- A save of the view saves the file, with the format on save
  ([R-FMT-001](#r-fmt-001)) and the comment of the format
  ([R-NOTE-007](#r-note-007)); a change of the file from elsewhere, for example
  a note of the side view, shows in the view. A view that closes without a
  save ("Don't Save") brings the file back to its text on disk.
- The view shows the highlights of the notes as the text editor of the file
  does ([R-GEN-011](#r-gen-011)), the selected note strong
  ([R-SIDE-007](#r-side-007)), and the light bulb action "Add Note" at the
  selected text ([R-EDIT-006](#r-edit-006)). The side view follows the cursor
  of the view and names the lines of the view.
- The Markdown preview of the view renders the file with its notes, and
  scrolls with the view. It shows the images of the file and the style
  sheets of the setting `markdown.styles` as the preview of the file itself
  does (Hannes, 2026-10-29: the warning "Could not load 'markdown.styles'").
  The preview loads files only from the folder of the document, so the file
  system of the view gives the files there as they are: an image by its path
  in the folder of the workspace of the file, and a style sheet with a
  relative path from the folder of the workspace.
- A relative link of the view, for example to another Markdown file, opens
  the file of the link: in its view when it has notes, else in its own text
  editor.

A Markdown file with notes, or with the comment of the format, always opens in
the view (Hannes, 2026-10-29: "we always want our markdown notes be in
cleanview - always not with a separate command"): from the Explorer, a search,
a link, the tabs of the last session, and when a file gets its first note.
The view takes the place of the text editor of the file in its group, with
the same selection and the same first visible line, and the tab of the file
closes. VS Code keeps a tab of each file with changes that are not saved, also
when only its view changed it: that tab stays behind the view, a click on it
shows the view, and it closes after the save, or after a close of the view
without a save. The view of the changes of git shows the file itself, because
git compares the file.

The command "Open File with Markup" of the Command Palette opens the file
itself beside the view, for rare cases such as a conflict of git in a note;
that file stays in its own text editor until its tab closes. The text editor
of the file collapses the notes and hides the markers
([R-TEXT-005](#r-text-005), [R-NOTE-006](#r-note-006)).

Limits of the view, which the text editor of the file does not have: Undo
of the view takes back the changes of the view only, not a change of the side
view, which leaves the clean text as it is (Undo in the text editor of the
file itself takes it back); the warnings of the notes
([R-TEXT-008](#r-text-008)) show in the Problems view only; the view shows no changes of git at the left edge; a hidden highlight
does not show under the pointer ([R-GEN-011](#r-gen-011)); "Format Document"
formats the text of the view, and the save formats the whole file; an edit
that opens a comment or a code block over a note changes how the file reads,
and the view then shows the markup that is no longer a note, until Undo; the
preview of the view does not show an image of HTML (`<img>`) from outside the
folder of the file, nor a style sheet of `markdown.styles` with an absolute
path.

### R-VIEW-001

**Comments view.** Dropped with the boxes of [R-TEXT-001](#r-text-001)
([decision 15](#decisions)). The Comments view of VS Code listed the notes
of the open Markdown files. The side view lists the notes of the active
Markdown file ([R-SIDE-001](#r-side-001)).

## Side view

### R-SIDE-001

**The view "Notes".** The extension has a view "Notes" in the secondary
side bar, the side bar of VS Code that also holds the chat (Hannes,
2026-10-28). The view is not in the primary side bar, so that the Explorer
stays usable while the view is open. The container "Markdown Notes" of the
view is in the secondary side bar only; the user can still move the view as
any view of VS Code. The view is the only place of the text of the notes
([R-GEN-009](#r-gen-009)). It shows the threads of the active Markdown file,
each with the answers rendered as Markdown, with author and date. The active
Markdown file is the file of the active text editor, or of the active tab in
the mode "Markdown Preview" or "Markdown Editor" of VS Code
([R-PREV-006](#r-prev-006)), also of a clean editing view
([R-TEXT-009](#r-text-009)); another editor keeps the file of the view. The
selected thread is the note at the cursor of the text editor, or the note
that the user clicked in the preview ([R-PREV-003](#r-prev-003)).

The view is a list of the threads in the order of the file, below a header
with the name of the file and the filters ([R-SIDE-008](#r-side-008)), with
the GitHub account at its top, which the user scrolls on its own
([R-SIDE-007](#r-side-007), [decision 25](#decisions)). It shows the
selected thread at its top (Hannes, 2026-10-28: "selecting in the editor
shall always scroll the side view so the selected note is on top"); an
empty part after the last thread lets also the last thread scroll to the
top.

### R-SIDE-002

**Note editor.** The side view is the editor of the notes. Its buttons are
small icons with a tooltip, the codicons of VS Code, as the buttons in the
title of an editor of VS Code (Hannes, 2026-10-28: "exchange all the buttons
on the note editor with icons", "similar as the header icons of the tab where
you dan switch between preview and text mode"). The view draws the tooltips
itself, in the colors of the hovers of VS Code, because the tooltips of the
browser did not show in the view (Hannes, 2026-10-29, on macOS: "add
tooltips to the icons"): a tooltip shows below its button after half a
second under the pointer, at once when the pointer comes from another
tooltip, and when a key moves the focus to the button. The colors, the line
of a thread and the dates have tooltips too. The buttons:

- Each answer has "Reply", "Edit" and "Delete".
- Each thread has the button with its color, which opens the colors of the
  notes ([R-TEXT-006](#r-text-006)), the line of its note, which shows the
  note in the text editor, and "Show as Text", "Answer" (a reply to the note,
  [R-EDIT-005](#r-edit-005)) and "Delete Thread".
- "Show as Text" switches the thread to its text view: the whole text of the
  note, the lines of its definition as the file holds them, in the font of
  the text editor (Hannes, 2026-10-28: "the text editor view of the notes
  toggles the complete note in the side view in a text view", decided with
  the option "Button on each thread"). The user changes the text there.
  "Save" writes it into the file when it stays the definition of the same
  note: it starts with the label and the header, ends where the note ends,
  and adds or removes no other note. "Cancel" drops the change, and "Show the
  Rendered Note" switches back.

The view shows the answers as a tree, with the date of each answer in the
local time of the reader and the local time of the author as its tooltip
([R-NOTE-002](#r-note-002), [R-NOTE-004](#r-note-004)). The editor of an
answer switches between "Write" (the Markdown text) and "Preview" (the text
rendered as the preview renders it), with the icon of the mode "Markdown
Preview" of VS Code (Hannes, 2026-10-29: "this is the preview icon, the side
view shows a wrong one"). "Save" (or Ctrl+Enter) writes the text
into the note ([R-EDIT-002](#r-edit-002)); "Cancel" (or Escape) keeps the
note as it is. The visual editing of [R-SIDE-004](#r-side-004) is planned.

### R-SIDE-003

**New note from the side view.** The title of the side view has the button
"Add Note" (`+`), and the context menu of the text editor has the command
"Add Note" while text is selected. Both open the editor of a new note in the
side view for the selected text of the text editor
([R-EDIT-003](#r-edit-003)): its title shows the text that the note will
highlight, and the colors let the user choose the color of the note. Without
selected text, "Add Note" opens no editor and shows a message that asks the
user to select the text that the note is about (Hannes, 2026-10-28: "there
shall be no way to add a note without highlighting text"); when the user
removes the selection while the editor is open, its title asks for it, and
"Add Note" of the editor adds no note. The light bulb action and the shortcut
of the selected text open the same editor ([R-EDIT-006](#r-edit-006)).

### R-SIDE-004

**Visual editing.** In the tab "Visual", the user edits the rendered text of
an answer, as in the Markdown Editor of VS Code (Hannes, 2026-10-28):
headings, paragraphs, emphasis, links, lists, block quotes and code show as
rendered text, and the toolbar and the keys of the editor change them. "Save"
writes the text back as Markdown. The tab writes a changed Markdown text only
after the user changed something in it. A text with Markdown that the visual
editor cannot show without a change, for example a table or HTML, opens in
the tab "Markdown", with a message why.

### R-SIDE-005

**Links in the side view.** A click on a link of a rendered text in the side
view opens the link, as a click in the Markdown preview does, and a file at
the place of the setting `openLinksIn` ([R-GEN-010](#r-gen-010)):

- a web link or a mail link with the system, through VS Code;
- a link to a file in VS Code: a relative path from the folder of the Markdown
  file, a path that starts with `/` from the folder of the workspace; a
  fragment `#L12` or `#L12,5` goes to the line, and a fragment of a Markdown
  file to its heading; a file that is no text, for example a PDF, opens in the
  editor that VS Code has for it;
- a link of another scheme, for example `zotero:`, with the system after the
  user agrees;
- never a link that runs a command or holds its own content (`command:`,
  `data:`, `javascript:`).

### R-SIDE-006

**Show and hide the side view.** The view opens and closes with one click,
also in Zen Mode (Hannes, 2026-10-28):

- The title of the text editor and of the preview of a Markdown file has the
  button "Show or Hide Notes", which opens the secondary side bar at the view,
  or closes it while the view shows. The Command Palette has the same
  command.
- The title of the secondary side bar has the button "Hide Secondary Side
  Bar" of VS Code while the activity bar has its default place. For the other
  places of the activity bar, the title of the view has the button "Hide
  Notes" of the extension, which closes the secondary side bar.

### R-SIDE-007

**The view next to the text.** When the side view is open, the user sees
which thread of the view belongs to which highlight of the text (Hannes,
2026-10-28), through the selection that the view and the text share
([decision 25](#decisions)):

- **A list that scrolls freely:** the view lists the threads in the order of
  the file, in the text editor and in the Markdown preview alike, and the
  user scrolls it on its own, smoothly, to find a note (Hannes, 2026-10-29:
  "the side view cannot be scrolled individually to find a note"). The view
  scrolls itself only when the selected thread changes: the selected thread
  scrolls to the top of the view ([R-SIDE-001](#r-side-001)). A hidden view
  cannot scroll: when the selected thread changed while the view was hidden,
  the view scrolls to it when it shows again (Hannes, 2026-10-29: "the side
  view is opened but it does not scroll to the right position"). It does not
  follow the scrolling of the text editor or of the preview. The editor of a
  new note stands at the top of the list, and an editor that opens scrolls
  into the view.
- **Common selection:** the selected thread of the view and its note in the
  text are highlighted together: the highlight of the note is strong, with a
  frame in its color, in the text editor and in the preview
  ([decision 10](#decisions)), also while the other highlights are hidden
  ([R-GEN-011](#r-gen-011)). A click on a thread selects it in the view and
  its note in the text (Hannes, 2026-10-29: "when selecting a note in the
  sideview, it gets not select in the sideview"), and shows the note where
  the file is open, and the focus stays in the view; the file keeps its mode,
  also in the clean editing view ([R-TEXT-009](#r-text-009)) (Hannes,
  2026-10-28: "it shall stay in the mode the view is"; 2026-10-29: "it shall
  stay in the currently selected view"):
  - in the text editor, the editor scrolls to the note, with the cursor at
    the start of its highlight;
  - when no text editor shows the file but the Markdown preview does, the
    preview scrolls to the highlight;
  - the text editor and the preview scroll smoothly, as the view (Hannes,
    2026-10-29: "can you also use smooth scrolling as in the side view when
    the side view selects a note and the main view scrolls to that, in text
    view and in preview mode"). The text editor scrolls over the whole way
    in about half a second, slowly at the start and at the end, as the
    preview does (19:50: "only the preview main window scrolls smoothly, the
    text window not"): VS Code scrolls a text editor in 125 milliseconds
    and jumps over most of a long way, so the extension scrolls it itself,
    in small steps. It does so while the setting `editor.smoothScrolling` is
    on, which the extension turns on for Markdown files; with the setting
    off, the text editor goes to the note at once. A click or a key in the
    text editor stops the scroll. The preview scrolls smoothly unless the
    system asks for less motion;
  - in the mode "Markdown Editor" of VS Code, that editor selects the text of
    the highlight.

  A move of the cursor into a highlight selects its thread, also with the
  keys, and the view scrolls to it (Hannes, 2026-10-29: "navigating to a
  highlight selects that highlight and scrolls in the side view to that
  highlight"); a double click on a highlight opens the view
  ([R-NOTE-006](#r-note-006), [decision 29](#decisions)). VS Code tells an
  extension no double click: the extension reads one from the second click,
  which selects the word at the cursor of the first one. A first click on the
  place of the cursor changes nothing, so VS Code reports only the word, also
  long after the click that put the cursor there (Hannes, 2026-10-29:
  "doubleclick does not open the side view"). In the clean editing view, the
  cursor at the start of a highlight is in the highlight. The position of the cursor, not only its
  line, names the note, because the highlights of several notes can share a
  line; of several highlights at the position, the one that starts last is
  the note (Hannes, 2026-10-28: a click selected the note above).
- **Deselect:** a click with the mouse into the text outside the highlights,
  in the text editor or in the preview ([R-PREV-003](#r-prev-003)),
  deselects the selected note (Hannes, 2026-10-28: "clicking somewhere in the
  text shall deselect the selected note"); the cursor that leaves the
  highlight of the selected note, also with the keys, deselects it (Hannes,
  2026-10-29: "moving the cursor out of the highlight again shall deselect
  both the highlight and the side view"). A move of the cursor with the keys
  outside the notes keeps a note that the user selected in the view. In the
  view, a click on its empty part, outside the threads, or Escape outside an
  editor deselects it too.
- **Dimming:** the view dims each thread that is not selected a little, to
  70 % (Hannes, 2026-10-29: "dimming of the non selected tags is too dark
  when one is selected"), also while no thread is selected and under the
  pointer (Hannes, 2026-10-29: "deselected items in the side view are
  dimmed", "it shall stay dimmed as long as it is not selected").

VS Code lets no view draw into the text editor, tells an extension only the
whole rows that a text editor shows, after it scrolled, and tells no place
of the text of the preview. The threads beside the text editor of
[decision 14](#decisions) therefore moved in steps of a row and after the
text, and the view could not scroll on its own (Hannes, 2026-10-29: "the side
view really has no smooth scrolling and is laggy"). The view aligned to the
text editor, its marks of the highlights and the line of the selected thread
are dropped, as the badges with the number of a note, the strip of the whole
file and the funnels of earlier versions ([decision 12](#decisions)), with
the setting `showFunnels`.

### R-SIDE-008

**Header with filters.** The top of the side view is a header that stays at
the top while the list scrolls (Hannes, 2026-10-29: "all of this in the
header which must be sticky on the top"). Its first row holds the name of
the file, the two buttons of the todo filter, the colors of the notes as
dots and the button "Clear Filter" at its right end; its second row is the
search field over the full width (Hannes, 18:07: "filename [ ] [X] (R) (B)
(G) X / [ filter ]"):

- **Todo filter:** the button with an empty box shows the open todos, the
  button with a checked box the completed todos (Hannes, 18:04: "the todo
  filter is just a checked or unchecked box icon beneath the color
  filter") ([R-NOTE-008](#r-note-008)). The two buttons exclude each other:
  a click on one turns the other one off (Hannes, 19:48: "the checked and
  unchecked todo filters are exclusive").
- **Color filter:** a click on a dot shows the notes of its color; several
  dots show the notes of each of their colors (Hannes, 17:56: "add a color
  filter by showing all the colors").
- **Search:** the search field shows the notes whose answers hold the typed
  words in their text or their author, without regard to case; each word
  must be in the note (17:56: "a search field to do a full text search in
  the notes").
- The filters combine (17:56: "the color filter, todo filter and text filter
  are and"): the view shows the threads that match each filter that is on.
  A filter that is off lets all notes through.
- "Clear Filter" turns all filters off (17:56: "a clear filter button
  exists"); it is disabled while no filter is on. Escape in the search field
  clears its text.
- The selected thread shows also when the filters hide it, so that the note
  that the user selects in the text always shows. A hint shows when no
  thread matches. The editor of a new note shows above the list, always.
- The filters stay when the view shows another file, and when VS Code hides
  and shows the view.
- The GitHub account of the user stands below the header, at the top of the
  list ([R-SIDE-001](#r-side-001)).

## Editing

### R-EDIT-001

**Edit.** The user can edit each answer of a note in the side view, with
the button "Edit" of the answer, and the whole note in the text view of its
thread ([R-SIDE-002](#r-side-002)). This includes the answers of other
authors ([decision 2](#decisions)).

### R-EDIT-002

**Save.** "Save" writes the text of the editor back into the answer in the
note, with the line breaks of the file and the indentation and the quote
markers of the answer ([R-NOTE-005](#r-note-005)). The header of the answer
keeps its author, and gets the local date and time of the save with the
offset of the zone when the text changed (Hannes, 2026-10-28: "updating a
text updates the date time"); an unchanged text keeps its date. A note in a block quote or in a list item keeps the markers of
its lines. The extension writes the text only when the Markdown preview reads
the changed text as the same note with the same answers: a text that would
change the note, for example a block quote whose first line is a header,
which would start a reply, is refused, and so is an empty text. The extension
then shows why and keeps the text in the editor. The editor of the file can
undo the change.

### R-EDIT-003

**Add a note.** The user selects the text that the note is about in the text
editor and adds the note: with the light bulb action or the shortcut of the
selected text ([R-EDIT-006](#r-edit-006)), or with "Add Note" in the title of
the side view or in the context menu of the text editor
([R-SIDE-003](#r-side-003)). In the Markdown preview, the button "Add Note"
above the selected text adds it ([R-PREV-008](#r-prev-008)). The user
chooses its color in the editor of the new note. The
note belongs to exactly this text, its highlight ([R-NOTE-006](#r-note-006)):
the extension writes the start marker with `<wbr>` and the color before it,
the reference after it, and the definition after the outermost block of the
highlight ([R-NOTE-005](#r-note-005)). A selection that spans several blocks
belongs to the block of its end, and its highlight starts at the start of
the text of that block. The reference never stands in a code span or a link,
and moves after it. There is no way to add a note without selected text
(Hannes, 2026-10-28: "there shall be no way to add a note without
highlighting text"): without selected text, or on a line without text of a
paragraph, a heading, a list item or a table cell, for example in a code
block, the extension adds no note and says why. The new note has a new label
([R-NOTE-003](#r-note-003)) and a header with the GitHub login of the author
([R-GEN-006](#r-gen-006)) and the local date and time with the offset of the
zone ([R-NOTE-002](#r-note-002)). An empty text adds no note, and "Cancel"
in the editor of a new note leaves the file as it is.

### R-EDIT-004

**Delete.** The user deletes an answer with "Delete", also an answer of
another author ([decision 2](#decisions)). The extension removes the answer
from the note. Its replies stay: they move up one level and reply to the
answer that the removed answer replied to. After the first answer, its first
reply becomes the first answer, with the state of a todo note
([R-NOTE-008](#r-note-008)). Deleting the only answer, or the whole thread
with "Delete Thread", removes the note: its definition with one blank line,
its reference and its start marker, and the last note also the comment of the
format ([R-NOTE-007](#r-note-007)). The editor of the file can undo the
change.

### R-EDIT-005

**Answer.** The user answers a thread with "Answer" of the side view, which
adds a reply to the note. The button "Reply" of an answer in the side view
adds a reply to this answer. The extension writes the reply after the replies to
the same answer, one level deeper ([R-NOTE-004](#r-note-004)), with its own
header: the GitHub login of the author and the date and time
([R-NOTE-002](#r-note-002)).

### R-EDIT-006

**Light bulb and shortcut of the selected text.** The selected text offers
"Add Note" in the standard ways of VS Code, which show only when the user
asks for them, and nothing shows by itself over the selected text
([decision 22](#decisions), Hannes, 2026-10-29: "Is there a better mechanism
we could use to add a note?", "go with your proposal"):

- **Light bulb:** "Add Note" is a Code Action of the selected text, so VS
  Code shows its light bulb at the selection. A click on the light bulb, or
  Ctrl+. (Cmd+. on a Mac), lists "Add Note" as the first entry, under "Quick
  Fix": its kind is `quickfix.markdownNotes.addNote`, and VS Code lists the
  quick fixes before its own actions for selected text, such as "Rewrite" and
  "Surround With".
- **Shortcut:** Shift+Alt+N on Windows and Linux, Cmd+K N on a Mac, while
  the text editor of a Markdown file has the focus, text is selected and the
  file can be changed. VS Code uses these keys for nothing else, also in VS
  Code for the Web. The shortcut has no Ctrl+Alt on Windows and Linux,
  because Ctrl+Alt is AltGr there, which types characters such as @ or µ on
  a German keyboard, and no Option without Cmd on a Mac, which types
  characters too.
- Both open the editor of a new note in the side view, as "Add Note" of the
  side view does, and open the side view when it is closed
  ([R-SIDE-003](#r-side-003)); the user chooses the color there, and the
  note is added when the user saves its text.
- The light bulb offers "Add Note" only for one selection that starts and
  ends in one block of text that a note can highlight, in a Markdown file
  that the extension can change. Without selected text, the shortcut does
  nothing; "Add Note" of a menu shows the message of
  [R-SIDE-003](#r-side-003).

### R-EDIT-007

**No change from an outdated view.** A change from the side view writes only
into the answer or the note that the user saw. "Save", "Reply" and "Delete"
of an answer name the answer by its place in the note, its author, its date
and its text; "Save" of the text view names the whole text of the note that
the view showed. When the file holds another answer at that place, or another text,
for example after a second click on "Delete" before the view showed the new
state, or after a change of the file by a collaborator, the extension writes
nothing and shows a message that asks the user to look at the note again.
An open editor stays at its answer when an earlier answer goes, and closes
when its own answer goes. A change of a setting keeps the open editors and
the selected note.

### R-EDIT-008

**Slash commands.** A slash (`/`) at the start of a line or after a space
offers commands in the text editor of a Markdown file, also in the clean
editing view ([R-TEXT-009](#r-text-009)) (Hannes, 2026-10-29: "the / command
allows tab completion", "all slash commands are intended for the text
editor"). The list of suggestions of VS Code shows the commands that start
with the typed letters; Tab or Enter takes the chosen one, and Escape closes
the list. VS Code shows the list after a slash also in a Markdown file, where
it shows no suggestions while the user types words.

- `/note` adds a note to the selected text (Hannes, 18:30: "selecting and
  /note creates a note", "/note is not available when no text is
  selected"). VS Code replaces selected text with the slash that the user
  types, so the list offers `/note` only right after a slash that replaced
  selected text: `/note` puts that text back, selects it and opens the editor
  of the new note in the side view, as "Add Note" does
  ([R-SIDE-003](#r-side-003)).
- `/todo` adds a todo note ([R-NOTE-008](#r-note-008)): to the text that
  the slash replaced, as `/note`, or else to the sentence before the
  command, from the end of the sentence before it (`.`, `!` or `?`) in the
  same block, or from the start of the block. It removes the typed command
  with the space before it, selects the text and opens the editor of the new
  todo note ([decision 30](#decisions)). The list offers `/todo` only where a
  note can highlight that text.
- `/footnote` adds a standard footnote at the cursor (Hannes, 18:30:
  "/footnote creates a footnote"). It removes the typed command with the
  spaces before it and opens the editor of the new footnote in the side
  view, as `/note` does and as "Add Footnote" does
  ([R-FOOT-003](#r-foot-003)) (Hannes, 18:51: "since footnotes are also
  available in the side view, it just goes to the side view editor, similar
  to the /notes command"). The list names the label of the new footnote, the
  next free number, for example `[^3]`. "Add Footnote" in the editor writes
  the reference after the word before the command, and the definition after
  the last definition of a standard footnote, or at the end of the file. The
  list offers `/footnote` only after a word, where a reference can stand:
  not in a code span, a code block, the text of a link or a marker of a
  note.
- `/date` inserts the current date, for example `2026-10-29` (Hannes, 18:29:
  "date inserts the current date at the place where the cursor is").
- `/time` inserts the current date and time in the local time, in minutes,
  for example `2026-10-29 19:29` ("/time the date and time in local time
  format").
- `/user` inserts the GitHub login of the user, for example `hannes`, the
  name that the notes give their author ([R-GEN-006](#r-gen-006)) (Hannes,
  2026-10-29, 18:29: "/user insert the current user name"). The list shows
  the login. Without a GitHub session, the list shows "Sign in with GitHub":
  `/user` then asks for the sign-in of VS Code and inserts the login after
  it, and inserts nothing when the user cancels the sign-in.

- `/figure` and `/table` add a figure and a table, and `/ref` adds a link to
  a figure, a table or a section of the file, or a value of its front matter
  ([R-XREF-001](#r-xref-001), [R-XREF-003](#r-xref-003),
  [R-XREF-004](#r-xref-004); Hannes,
  2026-10-30, 02:32: "there is also the /table and /figure slash commands,
  these are commands in markdownnotes", 02:45: "lets rethink which command
  adds an entry in the directory which adds a reference to it";
  [decision 35](#decisions)). `/figure` and `/table` show on a line of their
  own, outside code blocks; `/ref` shows in text where a reference of a
  footnote can stand, in a file with figures or tables.
- `/listing` adds the code of a file of the workspace, or of a snippet of
  the file, as a listing ([R-CODE-001](#r-code-001)).
  It shows on a line of its own, outside code blocks, as `/figure` and
  `/table`.

The editors of the side view have no slash commands (Hannes, 18:40), so
`/todo` at the start of a new note, which [decision 30](#decisions) named,
is dropped. `/research` and `/source` for the sources of a document (Hannes,
18:33 to 18:39) are commands of nimblescape Markdown Paper, which adds them
through the API ([R-GEN-012](#r-gen-012), [decision 32](#decisions)), with
the citations, the metadata of the sources and the citation style of the
PHT (APA 7).

## Markdown preview

### R-PREV-001

**Highlights in the preview.** The built-in Markdown preview shows the
highlight of each note ([R-NOTE-006](#r-note-006)) in the color of the note,
with a background and a line below the text, while the setting
`showHighlights` is on ([R-GEN-011](#r-gen-011)). The highlight
is strong under the pointer; a hidden highlight shows while the pointer is on
its text. The preview shows no icon and no callout of a note (Hannes,
2026-10-28: "we completely drop the callouts on hover view", "we completely
drop the callout icons in the preview view", [decision 15](#decisions)); the
side view shows the text of the notes. The script of the preview paints the
highlights with the CSS Custom Highlight API, which changes no element of the
page. Outside the highlights, the preview shows the file as without the
extension.

### R-PREV-002

**Callout on hover.** Dropped ([decision 15](#decisions)), with the setting
`showCalloutOnHover`. The preview showed the note as a callout next to its
icon.

### R-PREV-003

**Click selects the note.** A click on a highlight, also on a hidden one
under the pointer, selects its note ([R-SIDE-001](#r-side-001)), and a
double click on it opens the side view ([decision 29](#decisions)), where
the user can edit and answer the note. The second click of the double click
selects no word, and the double click does not open the text editor. A click
on the text outside the highlights while a note is selected deselects it
([R-SIDE-007](#r-side-007)). The page of the preview stays as it is (Hannes,
2026-10-28: "clicking a selection in preview breaks the view"). A click on a
link or a button in the highlight, a click that ends a selection of text, and
a double click on other text, which opens the text editor, do what they
always do.

The Markdown preview lets a page open only some kinds of links, and VS Code
passes a click to the extension only when the user clicks a link. The script
of the preview therefore gives the content of the page, for the time of the
click, a link of the scheme `vscode://` to the extension, without a change of
the page; VS Code may ask once whether the extension may open such a link.
The script gives only a link to the extension itself, also when the HTML of
the document holds an element with the same classes and another address.

### R-PREV-004

**The text without the notes.** The preview shows the text without the
notes: the definition of a note leaves the page, and its reference and its
start marker leave the text. A note never shows as a footnote, also with the
extension Markdown Footnotes ([R-GEN-008](#r-gen-008)), and every other
footnote shows as that extension shows it. A footnote that a note names in
its text stays in the list of the footnotes of the page. The scrolling of
the preview still follows the lines of the text editor.

### R-PREV-005

**Show and hide the highlights of the preview.** The title of the Markdown
preview has the buttons "Hide Highlights" and "Show Highlights" of
[R-GEN-011](#r-gen-011), as the title of the text editor has. A change of
the setting `showHighlights` and the opening and closing of the side view
render the open previews again. Without the highlights, the preview shows the
text without the notes ([R-PREV-004](#r-prev-004)), the highlight of the
selected note, and the highlight under the pointer. The setting
`showInPreview` and the buttons "Hide Notes in Preview" and "Show Notes in
Preview" of earlier versions are dropped.

### R-PREV-006

**Modes of a Markdown file.** VS Code 1.143 shows a Markdown file in one of
three modes, which the switch in the title of its editor changes (Hannes,
2026-10-28: "it is all the same preview, it is the new markdown handling in
vscode that has the text mode, the preview mode and the rendered markdown
editor mode"):

- **Text Editor:** the text editor, with every requirement of this document.
- **Markdown Preview** (the custom editor `vscode.markdown.preview.editor`):
  the preview of the file in the place of its text editor. It renders with
  the markdown-it plugin, the styles and the script of the extension, as the
  preview to the side does ([R-PREV-001](#r-prev-001) to
  [R-PREV-005](#r-prev-005)). Its title has the buttons "Show or Hide Notes"
  ([R-SIDE-006](#r-side-006)) and "Hide Highlights" or "Show Highlights"
  ([R-GEN-011](#r-gen-011)).
- **Markdown Editor** (the custom editor `vscode.markdown.editor`): the
  visual editor, which shows no notes and no highlights
  ([R-GEN-001](#r-gen-001)). Its title has the buttons "Show or Hide Notes"
  and "Hide Highlights" or "Show Highlights", and the side view shows the
  notes of the file.

In each mode, the side view follows the file, and a click on a thread keeps
the mode ([R-SIDE-007](#r-side-007)).

### R-PREV-007

**Show and hide the icons of the preview.** Dropped with the icons
([decision 15](#decisions)), and with them the setting `showIconsInPreview`.

### R-PREV-008

**Add a note in the preview.** The user adds a note to selected text also in
the Markdown preview, in the preview to the side and in the mode "Markdown
Preview" of VS Code, also of the clean editing view
([R-TEXT-009](#r-text-009); Hannes, 2026-10-29: "notes cannot be added in
the preview view, but this should be possible as well"):

- When the user releases the mouse button after selecting text of one
  paragraph, heading, list item or table cell, a button "Add Note" shows above
  the selected text. Selected text over two blocks, or in a code block, shows
  no button. The press on the button keeps the selection.
- A click on the button opens the editor of the new note in the side view,
  as "Add Note" of the text editor does ([R-EDIT-003](#r-edit-003),
  [R-EDIT-006](#r-edit-006)), with the selected text in its title. The tab of
  the preview keeps its mode. The button stays hidden until the user selects
  other text.
- The preview shows the text without the markup of Markdown and HTML, so the
  extension finds the selected text in the file by its letters and digits,
  after the text of its block before it (`src/notes/rendered.ts`). Text that
  the extension does not find in the file, such as a formula, adds no note,
  and a message tells the user to select the text in the text editor.

Built in step 40.

### R-PREV-009

**The notes in the pages of a paper.** nimblescape Markdown Paper shows the
pages of a paper document in the Markdown preview of VS Code, and the
functions of the notes work in the pages as in the preview of any other
file (Hannes, 2026-10-30, 03:55: "all plugin functionality shall work in the
rendered aper as well, such as marking a passage and adding a comment to it
etc.", "as it would in the rendered markdown preview"): the highlights, the
click that selects a note, the double click that opens the side view, and
"Add Note" above selected text ([R-PREV-001](#r-prev-001) to
[R-PREV-008](#r-prev-008)).

- The script of Markdown Paper copies the content of the preview into its
  pages in the element `.nimblescape-paper-pages` and hides the content
  itself. The script of the notes then looks for the highlights and the
  address of "Add Note" in the pages, which the user sees, and finds them
  again after the event `nimblescape-paper-rendered` of each new set of
  pages.
- The frame of a selected highlight covers only the text area of each page,
  `.pagedjs_page_content`: a highlight over two pages leaves out the
  margins, the footer and the header between them.
- "Add Note" leaves out the soft hyphens (U+00AD) of the hyphenation of the
  pages, which the Markdown text does not have.
- The PDF has no notes: the renderer of Markdown Paper makes it without the
  plugin, the script and the style of the notes.

Built in step 55; the text area and the soft hyphens in step 59.

## Formatter

### R-FMT-001

**Format on save.** The extension brings its own Markdown formatter (Hannes,
2026-10-28: "guess the plugin must bring the own formatter", "it shall format
on save tables and other reasonable defaults"). The manifest makes it the
default formatter of Markdown files, so VS Code runs it on "Format Document"
for every Markdown file. A save formats only a Markdown file with notes or
with the comment of the format ([R-NOTE-007](#r-note-007)), so that the
Markdown files of other projects keep their text (Hannes, 2026-10-29: "Only
files with notes", [decision 19](#decisions)). A file with parts whose text
the formatter keeps current counts as a file with notes: a listing
([R-CODE-002](#r-code-002)), a value of the front matter
([R-XREF-004](#r-xref-004)), or a figure, a table, a listing or a section
with an anchor ([R-XREF-002](#r-xref-002)). The save of such a file
formats it while the setting `nimblescape.markdownNotes.formatOnSave` is on
(the default), unless:

- the save is an automatic save after a delay, which VS Code also saves
  without its format on save, or "Save without Formatting";
- the user turned on `editor.formatOnSave` for Markdown, so that VS Code
  runs the formatter on each save itself, of every Markdown file;
- the user chose another `editor.defaultFormatter` for Markdown.

The formatter changes only the lines that it formats, in one edit, with the
line breaks of the file, so that Undo takes the whole change back. Other
extensions add steps after the steps of the notes through the API
([R-GEN-012](#r-gen-012)); a file that such a step formats gets the format
on save too.

### R-FMT-002

**What the formatter changes.**

- Each paragraph stands on one line, also in a list item and a block quote,
  and keeps its hard line breaks: two spaces or a backslash at the end of a
  line (Hannes, 2026-10-28: "but else have no hard linebreaks").
- The columns of a table are aligned, with the alignment of its delimiter
  row, by the width that the text editor shows: without the hidden start
  markers and references of the notes, and with two columns for each wide
  character, such as Chinese characters and emoji. A table in a block quote
  or a list keeps its form.
- No line ends with white space, apart from a hard line break.
- One blank line stands between two blocks and around each ATX heading, no
  blank line at the start of the file, and the file ends with one line break.
- Each start marker of a note starts with `<wbr>`, so that a start marker at
  the start of a line ends no paragraph on GitHub, and a note without a start
  marker gets one at the start of the text of the block of its reference
  ([R-NOTE-006](#r-note-006)). The color of a marker stays.
- The number in the text of each link to a figure, a table, a listing or a
  section follows their order in the file ([R-XREF-002](#r-xref-002)).
- Each value of the front matter in the text gets the current value of its
  key ([R-XREF-004](#r-xref-004)).
- Each listing gets the current code of its source, in VS Code and on the
  command line ([R-CODE-002](#r-code-002)).

### R-FMT-003

**What the formatter keeps.** The formatter keeps as they are: code blocks,
blocks of HTML (also comments and the comment of the format of the notes,
[R-NOTE-007](#r-note-007)), a front matter, blocks of math (`$$`),
containers (`:::`), setext headings and the answers of the notes; of a
note, it changes only the start marker ([R-FMT-002](#r-fmt-002)). The
definition of a footnote stays on a line of its own. It reads the text as the
Markdown preview reads it, and keeps the text as it was when the formatted
text would show other blocks or another text in the preview.

### R-FMT-004

**The formatter on the command line.** Programs and AI agents that change a
Markdown file outside VS Code run the same formatter on the command line
(Hannes, 2026-10-28: "make the formatter accessible for agents"). The command
`markdownnotes` is a script of Node.js 22 or later without dependencies,
built from the code of the formatter of
[R-FMT-001](#r-fmt-001) to [R-FMT-003](#r-fmt-003), so that it formats a file
as the extension does on save.

- `markdownnotes format <file>...` formats each file and
  writes only the files that change, with the line breaks and the byte order
  mark of the file.
- `--check` changes no file, writes `<file>: not formatted` to the standard
  error for each file that the formatter would change, and exits with 1.
- `-` in place of a file formats the standard input to the standard output.
- A file whose comment of the format names a higher major version than the
  tool knows stays as it is ([R-NOTE-007](#r-note-007)); the tool writes why
  to the standard error, and `-` writes such a text unchanged.
- The exit code is 0 when all files are formatted, 1 when `--check` found a
  file to format, and 2 for an unknown command or option, no file, a file
  that cannot be read or written, or a file of a higher major version; the
  tool then still formats the other files.
- `--help` shows the help, and `--version` the version of the tool and of the
  format of the notes ([R-NOTE-007](#r-note-007)).

The command `markdownnotes strip` writes the text of a file without its
notes, for a website or a document that is published
([R-HIDE-004](#r-hide-004)).

The npm package also is a library for programs (Hannes, 2026-10-30, 02:26:
"now we do not have a single formatter command anymore, how to handle this",
"in npmjs"; [decision 34](#decisions)): `formatMarkdown(lines)` returns the
formatted lines, with `require` and `import`, and loading it runs nothing.
Its types name no other package, because the package has no dependencies.
The command `markdownpaper format` of nimblescape Markdown Paper calls it
before its own steps, so that a paper project has one formatter command.

The command is the npm package `@nimblescape/markdownnotes` in the folder
`cli/` of this repository, as the npm package `@nimblescape/typescript` of
the extension nimblescape TypeScript (Hannes, 2026-10-28: "same as with the
typescript extension, we have the extension and the npm package in the same
repo and publish it to npmjs"). It has the version of the extension, and the
release publishes it to npmjs.com, so that
`npx -y @nimblescape/markdownnotes format <file>` runs it without an
installation. The specification of the format of the notes for AI agents
([docs/format.md](format.md)) tells agents to run the tool after a change of
a file with notes.

## Footnotes

### R-FOOT-001

**Footnotes in the side view.** The side view also shows the standard
footnotes of the active Markdown file, the footnotes that are no note
([R-NOTE-001](#r-note-001)), so that the extension is a rich editor of
footnotes too (Hannes, 2026-10-29: "the extension could serve as a rich ui
for editing footnotes", [decision 24](#decisions)):

- Each footnote stands in the list at the place of its first reference, in
  the order of the file, as a thread ([R-SIDE-007](#r-side-007)). A footnote
  without a reference stands at the place of its definition.
- It shows its label as the file holds it, for example `1`, and the
  rendered text of its definition. It has no author, no date, no replies, no
  color and no highlight. GitHub numbers all footnotes of a file in the
  order of their first reference, also the notes of the visible form, and
  the Markdown preview numbers only the standard footnotes, so the tooltip of
  the label gives both numbers when they differ. In
  [docs/example.md](example.md), GitHub shows `[^1]` as footnote 4 and the
  preview as footnote 1. A footnote without a reference has no number.
- The cursor on a reference or in a definition selects the footnote, as it
  selects a note. A reference of a standard footnote may stand inside the
  highlight of a note, for example a citation `[^hong2024]` in the
  highlighted text (Hannes, 2026-10-29, 20:12: "these citations can be in a
  highlight region with a note"): the reference belongs to the highlight, the
  cursor on the reference selects the footnote, and the cursor on the rest
  of the highlight selects the note.
- The button "Show Footnotes" or "Hide Footnotes" in the title of the side
  view, and the setting `nimblescape.markdownNotes.showFootnotes` (on by
  default), show or hide the footnotes in the side view. The notes stay.
- The side view shows footnotes also in a Markdown file without notes. Such
  a file stays a file without notes: it gets no comment of the format
  ([R-NOTE-007](#r-note-007)) and no format on save
  ([R-FMT-001](#r-fmt-001)). The formatter changes a standard footnote only
  as any Markdown text, and never adds a start marker to it
  ([R-FMT-002](#r-fmt-002)).
- A footnote stays visible in a file whose notes are hidden
  ([R-HIDE-001](#r-hide-001)): it is a part of the text.
- The clean editing view of a file with notes hides the definitions of the
  footnotes that have a reference while the side view shows the footnotes
  ([R-TEXT-009](#r-text-009)).

### R-FOOT-002

**Edit a footnote.** Each footnote in the side view has the buttons "Edit"
and "Delete", as a note:

- "Edit" opens the editor of the side view with "Write" and "Preview"
  ([R-SIDE-002](#r-side-002)) with the text of the definition. "Save" writes
  the text into the definition: the first line after `[^1]: `, and each
  further line indented by four spaces, as Markdown needs it for a footnote
  of more than one paragraph.
- "Save" writes only while the definition still holds the text that the
  editor started from, as for a note ([R-EDIT-007](#r-edit-007)).
- "Delete" asks first, because it changes the text of the document, and then
  removes the definition and every reference to it, in one edit that Undo
  takes back.
- A click on the footnote shows its first reference in the text editor, or
  its definition when it has no reference. The view has no button "Go to
  Definition", because it shows and edits the whole text of the footnote, as
  the text of a note (Hannes, 2026-10-29, 20:26: "why go to definition? we
  do not have that for notes").

### R-FOOT-003

**Add a footnote.** The command "Add Footnote" adds a standard footnote at
the cursor of the text editor. It is in the title of the side view, in the
menu of the right mouse button of the text editor, and in the Command
Palette, and it has a keyboard shortcut with the rules of the shortcut of
"Add Note" ([R-EDIT-006](#r-edit-006)): Shift+Alt+B on Windows and Linux,
Cmd+K B on a Mac, while the text editor of a Markdown file has the focus and
the file can be changed. VS Code uses these keys for nothing else.

- It needs no selected text: a footnote names a place, not a passage. The
  reference goes after the word when the cursor stands in a word, or else
  after the text before the cursor without the spaces before the cursor,
  and with selected text at the end of the selected text. The title of the
  editor shows the text before that place, for example "New footnote after
  “a second”".
- It opens the editor of the new footnote in the side view. "Save" writes
  the reference and the definition in one edit; "Cancel" writes nothing.
- The label is the next free number: one more than the highest label of the
  file that is a number, and never a label that the file already uses.
- The definition stands after the last definition of a standard footnote of
  the file, or at the end of the file when it has none, with a blank line
  before it.
- No reference goes into a code span, a code block, the text of a link or a
  marker of a note: the command then says why and writes nothing.

### R-FOOT-004

**Checks of the footnotes.** The text editor shows a warning for a
reference without a definition, for a definition without a reference, and
for two definitions with the same label. The quick fixes "Add Definition"
(it opens the editor of a new definition for the label) and "Delete
Definition" (for a definition without a reference) repair them. The checks
cover the standard footnotes; the notes have their own warnings.

### R-FOOT-005

**Renumber the footnotes.** The command "Renumber Footnotes" gives the
standard footnotes whose labels are numbers the labels 1, 2, 3 … in the
order of their first reference, in the references and the definitions, in
one edit that Undo takes back. A label that is a word, for example
`[^smith-2020]`, stays, and so do the labels of the notes
([R-NOTE-003](#r-note-003)). The numbers that a reader sees do not depend on
the labels; the command makes the labels of the file match them.

### R-FOOT-006

**A note becomes a footnote.** The button "Make Footnote" of a thread in the
side view turns a note into a standard footnote, for a note whose text the
authors accept into the document: the text of the first answer becomes the
text of the footnote, the reference at the end of the highlight gets the
next free number as its label ([R-FOOT-003](#r-foot-003)), and the start
marker and the replies go. It asks first when the note has replies. Undo
brings the note back.

## Figures, tables and sections

### R-XREF-001

**Figures, tables and links to them.** The slash commands named by a noun
add an entry, and `/ref` adds a reference to it ([R-EDIT-008](#r-edit-008),
[decision 35](#decisions); Hannes, 2026-10-30, 02:33: "it adds a references
to the figure or table in the text", "technically it is a link to it";
02:45: "that take on the first idea of the "/figure" command looking up all
figures in the folder"). The numbers of the figures and tables in a paper
and their lists are parts of nimblescape Markdown Paper; Markdown Notes adds
and links them. The form, proposed on 2026-10-30 at 02:33:

```markdown
Table: Participants by grade<a id="tab-grades"></a>

| Grade | Participants |
| --- | --- |
| 5 | 12 |

As [Table 1](#tab-grades) shows, …
```

- A figure is an image that stands alone in its paragraph; its caption is the
  text of the image. A table has a caption: a paragraph that starts with
  `Table:` directly before it. A listing of code ([R-CODE-001](#r-code-001))
  has the caption `Listing:` before its comment and its code block, an
  anchor `lst-…`, and the word "Listing" in its links.
- `/figure` lists the images of the workspace (PNG, JPEG, GIF, SVG, WebP and
  AVIF) by their paths from the folder of the file, and inserts the chosen
  one as a figure, `![Caption](images/plan.png)`, with the caption selected
  for typing; a path with spaces or parentheses is encoded. Without images,
  it inserts the same form with a path to fill in.
- `/table` inserts a table of two columns with its caption line
  `Table: Caption` and a blank line before it, with the caption selected for
  typing.
- `/ref` lists the figures and tables of the file by their numbers and
  captions, and inserts a link to the chosen one, for example
  `[Table 1](#tab-grades)`. A figure or a table without an anchor first gets
  one at the end of the line of its image or its caption:
  `<a id="fig-…"></a>` or `<a id="tab-…"></a>`, with up to three words of
  its caption as its name, in small letters and without small words such as
  "by", "the" and "der", for example `tab-participants-grade`. In the clean editing view, which hides the
  anchors, the extension writes the anchor into the file after the view
  wrote the link there.
- The word of the link stays as it is written, for example "Table" or
  "Tabelle"; `/ref` takes the word of the last link of the same kind in the
  file, else the word of the language of VS Code (German or English).
- GitHub shows the link with its number, and a click on it goes to the
  anchor. The clean editing view hides the anchors
  ([R-TEXT-009](#r-text-009)); a file with an anchor opens in it, as a file
  with notes. `/source` and `/cite`, which add a source and cite it, are
  commands of nimblescape Markdown Paper.

### R-XREF-002

**The numbers of the links.** The formatter writes the number in the text of
each link to a figure, a table, a listing ([R-CODE-001](#r-code-001)) or a
section anew from the order of the figures, the tables, the listings and the
headings in the file: a link to an anchor, and a link to the ID of a heading
with the word of a section ([R-XREF-003](#r-xref-003)), so that a moved table keeps
the right number in every link ([R-FMT-002](#r-fmt-002)). Markdown Paper can
number them by the rules of its layout with its own step of the formatter,
for example A1 for the first table of an appendix, no number for the table
of contents, or the chapters of several files ([R-GEN-012](#r-gen-012)).

### R-XREF-003

**Links to sections.** `/ref` also lists the sections of the file, the parts
of the text under the headings, with the numbers of their chapters, and
inserts a link to the chosen one, for example `[Chapter 2.1](#methods)`
(Hannes, 2026-10-30, 02:47 and 03:19: "/ref also adds chapter numbers").

- The sections start at the top level: the highest level of a heading that
  more than one heading has, or else the highest level of a heading. A
  heading above it, such as the one title `#` of a document whose chapters
  have `##`, has no number and no link. Headings in code blocks, HTML, the
  front matter and the notes do not count.
- The number of a section is the numbers of the sections around it and its
  own, for example 2.1 for the first section of the second chapter; a level
  that the text skips counts 0, for example 2.0.1.
- The link names the ID that GitHub gives the heading, and the heading gets
  no anchor (Hannes, 2026-10-30, 03:28: "why do headings required
  anchors?"; [R-GEN-013](#r-gen-013), [decision 36](#decisions)). The ID is
  the text of the heading as the page shows it, in small letters, without
  the characters that are no letter, digit, `_`, `-` or space, with a `-`
  for each space; a second heading of the same ID gets `-1`, a third one
  `-2`. For example, `## Ergebnisse & Diskussion` has the ID
  `ergebnisse--diskussion`. The link works on GitHub and in the Markdown
  preview of VS Code without a hidden part. A heading whose text changes
  gets a new ID, and its links break as on GitHub.
- The formatter writes the number only in a link whose word is "Chapter",
  "Kapitel", "Section" or "Abschnitt", so that a link such as
  `[Step 2](#install)` keeps its text ([R-XREF-002](#r-xref-002)).
- A heading with an anchor of the earlier form,
  `## Methods<a id="sec-methods"></a>`, keeps it, and `/ref` links it by its
  anchor.
- The word of the link is the word of the last link to a section in the file,
  else "Chapter", or "Kapitel" in a VS Code in German.
- Markdown Paper numbers the sections of a paper by its layout, for example
  without numbers for the table of contents and the reference list, and
  with letters for the appendices.

### R-XREF-004

**Values of the front matter in the text.** `/ref` also lists the keys of the
front matter of the file with their values, and inserts the chosen value
between two hidden markers (Hannes, 2026-10-30, 03:10: "anything from
frontmatter can be references in the document"; the form proposed at 03:20):

```markdown
---
title: A paper
author:
  name: Hannes Stauss
---

This is <wbr><!--{title}-->A paper<!--{/title}--> of <wbr><!--{author.name}-->Hannes Stauss<!--{/author.name}-->.
```

- The key of a value under another key is the path of the keys with `.`,
  for example `author.name`. A list is its items joined by commas, and a
  block scalar (`|` or `>`) its lines joined by spaces. The front matter is
  YAML (`---`) or TOML (`+++`).
- The start marker has `<wbr>` before it, as the start marker of a note
  ([R-NOTE-006](#r-note-006)): a line that starts with a comment of HTML is
  a block of HTML, which GitHub shows without the Markdown of its paragraph.
- GitHub and the Markdown preview show only the value. The clean editing view
  hides the markers ([R-TEXT-009](#r-text-009)); text typed at the start or
  the end of a value stays outside of it.
- The formatter writes the current value of the key between the markers on
  each format, also on the command line, and adds a missing `<wbr>`
  ([R-FMT-002](#r-fmt-002)). A value of a key that the front matter does not
  have stays as it is. A field in a code block, a code span, the front
  matter or the text of a note does not count.

## Listings of code

### R-CODE-001

**Code of a source file in the text.** A Markdown file can live in a
repository with other source code, and `/listing` adds code of a file of
the repository to it (Hannes, 2026-10-30, 02:58: "a paper can be in a repo
along with other source code", "there is a new slash command for that which
"imports" a code block", "it is also part of the notes extension"; 03:03:
"we may mark single functions but also complete source code files"; 03:10:
"it is part of notes"). The form, proposed in the thread on 2026-10-30:

````markdown
Listing: Reading the fields<a id="lst-reading-fields"></a>

<!-- listing: ../src/notes/fields.ts#read-fields -->

```typescript
export function readFields(lines: readonly string[]): Map<string, string> {
  …
}
```
````

- A listing is a fenced code block with a comment of HTML on the line
  before it, with a blank line or none between them, that names its
  source: a whole file, `<!-- listing: ../src/fields.ts -->`, or a snippet
  of the file, `<!-- listing: ../src/fields.ts#read-fields -->`
  ([R-CODE-003](#r-code-003)), and no symbol of the language
  ([R-CODE-005](#r-code-005)). The path is relative to the Markdown file, with `/`, and encodes spaces
  and other characters as in a link. A listing in the text of a note does
  not count.
- GitHub and the Markdown preview show the code block; the comment is
  hidden there and stays visible in the text editor and the clean editing
  view.
- `/listing` lists the source files of the workspace by their paths from the
  folder of the Markdown file, then "Whole file" and the snippets of the
  chosen file. It inserts the caption line `Listing: Caption`, the comment
  and the code block with the language of the file, with the caption
  selected for typing. A file without snippets gives its whole text.
- `/ref` links a listing as a figure or a table, for example
  `[Listing 1](#lst-reading-fields)` ([R-XREF-001](#r-xref-001)).

### R-CODE-002

**The formatter keeps the code current.** On each format, the formatter
reads the source of each listing again and writes its current code into the
code block (Hannes, 2026-10-30, 02:59: "the formatter assures the source code
references / code blocks are uptodate").

- A snippet is found by its marks the same way in VS Code and on the
  command line, so that both write the same code
  ([R-CODE-003](#r-code-003)). The formatter finds no symbol of a language,
  such as a function or a class ([R-CODE-005](#r-code-005)).
- The code of a snippet loses the indentation that all its lines have; a
  whole file and a snippet lose their blank lines at the start and the end.
  The code block keeps its fence, its indentation and its info string; the
  fence gets longer when the code holds a fence of its length.
- In VS Code, the formatter reads a source from its open document, so that
  a change that is not saved yet counts, or else from the disk. On the
  command line, it reads the source relative to the Markdown file, or to
  the current folder for the standard input.
- A listing whose file or snippet is not found keeps its code. The text
  editor and the Problems view show a warning at its comment
  ([R-CODE-005](#r-code-005)). The command line names it on the standard
  error, for example
  `paper.md:12: the source ../src/gone.ts of the listing was not found`, and
  with `--check` the file counts as not formatted, so that a check of a pull
  request finds it.
- The library of the npm package takes the reader of the sources as the
  option `source` of `formatMarkdown` ([R-FMT-004](#r-fmt-004)).

### R-CODE-003

**Snippets in the source code.** Code of a source file, such as a function,
a class or a part of a function, is a snippet between two marks in comments
of the source file, which a listing names (Hannes, 2026-10-30, 03:03: "in the source code i want
to add marks / tags that can later be referenced by the markdown"; 03:20: "a
slash command in the source code editor /snippet adds the mark, but the mark
must be more clear it belongs to the notes plugin, do not like the
begin-snippet tag, whereas snippet is the correct name for it", "propose
something that is better aligned with what we already have"). The form,
proposed on 2026-10-30 at about 04:10:

```ts
// markdownnotes: snippet parse-notes
export function parse(lines: readonly string[]): Token[] {
  …
}
// markdownnotes: /snippet parse-notes
```

- The marks name the extension as the command and the format do, without a
  hyphen ([decision 33](#decisions)), and the end mark has the `/` of the
  end marker of a value of the front matter ([R-XREF-004](#r-xref-004)).
  The name has small letters and digits, with `-` between them. The other
  form on the card is `@snippet` and `@endsnippet`.
- The marks stand in the comment form of the type of the file (Hannes,
  2026-10-30, 04:29: "we also may have jsonc and yaml, toml, .env files,
  etc.", "css, html, jsx, tsx, etc."): `//` (TypeScript, JavaScript, JSX,
  TSX, Java, C#, C, C++, Go, Rust, Kotlin, Swift, Scala, PHP, Dart, Groovy,
  Zig, Protocol Buffers, JSONC, JSON5, SCSS, Less), `#` (Python, R, Ruby,
  Perl, Elixir, Julia, shell, PowerShell, YAML, TOML, `.env`, `.cfg`,
  `.conf`, `.properties`, Dockerfile, Makefile, CMake, Terraform, GraphQL),
  `--` (SQL, Lua, Haskell, Elm), `%` (LaTeX, MATLAB, Erlang), `;` (INI,
  Clojure, Lisp, Scheme), `<!-- -->` (HTML, XML, SVG, XSLT), `/* */` (CSS),
  `REM` (batch files) and `'` (Visual Basic). A file is of its type by its
  extension, or by its name: `.env` and `.env.*`, `Dockerfile` and
  `Makefile`. A file of another type gets the marks in the comment form
  that VS Code knows for its language, through its command "Add Line
  Comment", so that the marks work in any source (Hannes, 04:30: "it can be
  any sources"). JSON has no comments, and a language for which VS Code
  knows no comment leaves the file as it was, with a message: such a file
  gets no marks, and a listing shows it whole. The formatter finds the marks
  by their text in any comment, also on the command line.
- A listing names a snippet after `#`,
  `<!-- listing: ../src/notes/notes.ts#parse-notes -->`. The code of every
  listing, also of a whole file, leaves out the marks of all snippets. A start mark
  without its end mark is no snippet; of two snippets of one name, the first
  one counts.
- In a source file, the user selects lines and types `/`: VS Code replaces
  them with the slash, and `/snippet` puts them back, asks for the name (the
  first declared name of the lines, in small letters, is the default), and
  writes the marks around the lines with the indentation of the first one.
  "Add Snippet" in the Command Palette and in the light bulb of selected
  lines (a refactoring) does the same.
- `/listing` lists the snippets of the chosen file after "Whole file".
- The comment of a listing in a Markdown file is a link, as a Markdown link
  to a file (Hannes, 03:20: "it is like markdown links extension"):
  Ctrl+Click opens the source file at the first line of the snippet, or at
  the start of the file for a name that is no snippet. Ctrl+Click stays the
  only gesture, as for every link in VS Code; a double click, which opens
  the side view at a highlight of a note, does not open the source (Hannes,
  06:15, "ok" to this proposal).
- `/snippet` shows once the extension is active, after a Markdown file was
  opened; "Add Snippet" in the Command Palette starts the extension.
- "Add Snippet" takes the name as an optional third argument, after the URI
  of the file and the range of the lines, for a keyboard shortcut or another
  extension; without it, the command asks for the name.

### R-CODE-004

**The snippets in the text editor of a source file.** The text editor shows
each mark of a snippet as a small tag in place of the mark line, and a
button highlights the snippets that a listing shows (Hannes, 2026-10-30,
04:34, on open question 2 of the concept document: "the editor shall sow it
as a rendered tag, unobstrusive, similar to the small font annotations that
are there sometimes", "the source code text editor gets an icon toggle
button the highlights the used snippets in a source code view"; 05:49: "what
about B but in a rendered way", "we do not want it to be editable", "it is a
whole line comment so jumping cursors is not a problem"; 05:53: "can t we
just jump over it?"; 05:57: "the complete mark shall appear as a code lens
line instead of the line itself", "the clicking the end tag jumps to the
start tag"; [decision 37](#decisions)):

- Each mark line shows a tag in the small gray letters of a code lens, the
  line that VS Code shows as "3 references" above a function, in place of
  the comment. The tag of the start mark has the name of the snippet and the
  listings of the Markdown files of the workspace that show it, for example
  `snippet keep-lines · Listing 2 in paper/paper.md`, or `in no listing`; the
  tag of the end mark is `/snippet keep-lines`. The indentation of the line
  stays, and the line keeps the height of a line of code, because the API of
  VS Code for extensions cannot remove a line or make it lower.
- The extension changes no character of the source file: it only hides the
  comment, because the source must stay exact for the compiler and for git.
- The cursor jumps over a mark line in the direction of its move, with the
  arrow keys, Page Up, Page Down and a click, as over the header line of a
  note ([R-TEXT-009](#r-text-009)). Backspace and Delete next to a mark line,
  which would join the two lines, do nothing. A selection of text that
  covers a mark line stays as it is. The hidden characters fill a whole line
  and never stand between visible characters, which caused the bugs of the
  cursor at the hidden markers of the notes.
- A click on the tag of a start mark opens the Markdown file at the comment
  of the listing; with several listings, the user chooses one first. A click
  on the tag of an end mark puts the cursor on the first line of the code of
  the snippet and scrolls the start tag into view, when it is not visible.
- The light bulb of the code of a snippet has "Rename Snippet", which renames
  the snippet in both marks and in the listings of the Markdown files of the
  workspace that show it, in one change of the workspace, and "Remove
  Snippet", which deletes both mark lines and asks first when a listing
  shows the snippet. The Command Palette has both commands.
- The title of the text editor of a source file with snippets has the button
  "Show Used Snippets" or "Hide Used Snippets", with the highlighter pen of
  "Show Highlights" ([R-GEN-011](#r-gen-011)). While they show, the lines of
  each snippet that a listing names get a yellow background and a mark in
  the overview ruler. The Command Palette has both commands.
- A listing counts with the caption line directly before its comment, or one
  blank line before it; it then has its word and number, for example
  "Listing 2". The uses come from the Markdown files of the workspace,
  without `node_modules` and `.git`, an open file as it stands, and are read
  again half a second after a change of a Markdown file.

### R-CODE-005

**Whole files and snippets, no symbols.** A listing shows a whole file or a
snippet, and never a symbol of a language by its name, such as a function, a
class or a method (Hannes, 2026-10-30, 04:43, on open question 3 of the
concept document: "it will only reliably work when we use ast parsers";
05:38: "but I agree, for now, whole files and snippets are sufficient";
[decision 38](#decisions)):

- A function, a class or a method is a listing through a snippet around it
  ([R-CODE-003](#r-code-003)). A snippet works in every language with
  comments, and the command line finds it as VS Code does.
- A listing whose name after `#` is no snippet of its file, for example
  `#readFields` or `#NotesView.addFromText`, is not found: it keeps its code,
  and the command line names it ([R-CODE-002](#r-code-002)). The text editor
  and the Problems view show a warning at its comment, with the hint to mark
  the code in the source file with `/snippet`, and also at a listing whose
  file is not found. The warnings are read again with each change of the
  Markdown file.
- Later, symbols come with a real parser of each language: tree-sitter, with
  the "tags" query of each grammar, which GitHub uses for its code
  navigation, the same in VS Code and on the command line. The file types
  that must have symbols then (Hannes, 05:36: "must have: go, typescript,
  javascript, python, html, css, yaml, tsx, jsx, json, jsonc", "shell
  script"): Go, TypeScript, TSX, JavaScript, JSX, Python, HTML, CSS, YAML,
  JSON, JSONC and shell scripts. The proposal for their names: functions,
  classes and methods with `.` between a container and its member (in Go, a
  method after the type of its receiver, for example `Reader.Read`), the
  functions of a shell script, the key paths of YAML, JSON and JSONC (for
  example `services.web`), a rule of CSS by its selector, and an element of
  HTML by its `id`.

## Hidden notes

### R-HIDE-001

**The hidden form.** The notes of a file are in the visible form, which
GitHub and other viewers show as footnotes ([decision 8](#decisions)), or in
the hidden form, which every Markdown viewer hides, also GitHub (Hannes,
2026-10-29: "when the users decides to hide the notes that also GitHub shall
hide the notes with A", [decision 23](#decisions)). The extension shows the notes
of both forms in the same way.

- The first line of the comment of the format holds the word `hidden`
  ([R-NOTE-007](#r-note-007)). A file in the hidden form always has the
  comment.
- The start marker stays as it is, because it is already a comment. The end
  marker is the comment `<!--note-7k2q]-->` in place of the reference
  `[^note-7k2q]`.
- The definition of each note is an HTML comment of its own: a line `<!--`,
  the definition as in the visible form, and a line `-->`, with a blank line
  before and after the comment:

  ````markdown
  The agents <wbr><!--[note-7k2q-->change the work of teams<!--note-7k2q]--> in three ways.

  <!--
  [^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00

      Which three ways?
  -->
  ````

- **Escape** (Hannes: "is there an escape mechanism for the --> problem?"):
  an HTML comment has no escape of its own, and `-->` ends it, as `--!>`
  does in a browser. Inside the comment of a hidden note, each place where
  `--` or `--!` is followed by any number of backslashes and then `>` gets
  one more backslash before the `>`: `-->` becomes `--\>`, and `--\>` becomes
  `--\\>`. When the extension reads the note, it removes one backslash from
  each such place. So a note can hold any text, also HTML code with `-->`, and the
  side view, the text view and every editor show the text as the user wrote
  it.
- The text view of a thread ([R-SIDE-002](#r-side-002)) shows the
  definition without the lines `<!--` and `-->` and without the escape, as in
  the visible form.

### R-HIDE-002

**Hide the notes from other viewers.** An icon at the top of the side view
decides whether other viewers show the notes of the active file (Hannes,
2026-10-29: "a top level icon on the side view decides about hiding the
notes by other viewers"):

- The icon shows the form of the file: an eye for the visible form, an eye
  with a stroke for the hidden form. Its tooltip says the state and what a
  click does, for example "Other viewers show the notes, also GitHub. Click
  to hide them."
- A click writes all notes of the file in the other form in one edit, which
  Undo takes back: it puts each definition into its comment or takes it
  out, exchanges the end markers, applies or removes the escape, and sets or
  removes the word `hidden`. The commands "Hide Notes from Other Viewers" and
  "Show Notes in Other Viewers" of the Command Palette do the same.
- The icon shows only for a file with notes. The setting
  `nimblescape.markdownNotes.hideNotesInNewFiles` (off by default) chooses
  the form of a file that gets its first note.
- After the change, the extension writes each new note and answer in the
  form of the file.

### R-HIDE-003

**Both forms everywhere.** The extension reads the notes of both forms in
the side view, the highlights of the text editor and of the preview, the
checks, the formatter and the command line tool. The formatter writes each
note in the form of its file, for example a visible note that a merge or an
AI agent added to a file in the hidden form ([R-FMT-002](#r-fmt-002)). The
specification for programs ([docs/format.md](format.md)) describes the
hidden form and its escape. The step that builds the form checks with the
renderer of GitHub that a file in the hidden form shows no part of a note,
and that its paragraphs, lists, block quotes and tables stay whole.

### R-HIDE-004

**The text without notes.** For a website, a PDF or another place where a
text is published, the extension writes the text of a file without its notes
(Hannes, 2026-10-29: option B):

- `markdownnotes strip <file>` ([R-FMT-004](#r-fmt-004)) writes the text to
  the standard output; `-` reads the standard input, and `--out <folder>`
  writes a copy of each file into the folder. The command never changes a
  file itself.
- The commands "Copy without Notes" (to the clipboard) and "Save Copy without
  Notes" (with a dialog for the file) of VS Code do the same for the active
  Markdown file.
- The text has no definitions of notes with the blank line after each, no
  start and end markers and no comment of the format, in both forms. The
  standard footnotes, all other comments and the rest of the text stay as
  they are. A test compares the rendering of the text without notes with
  the rendering of the Markdown preview, which leaves the notes out.
- A file whose comment names a higher major version stays unread: the
  command writes nothing for it, says why, and exits with 2, as `format`
  does.

## Decisions

Hannes decided these questions from 2026-10-28 to 2026-10-30. The
requirements above follow them.

1. **Storage of answers** ([R-NOTE-004](#r-note-004)): one note holds the
   whole thread. The other choice was one note for each answer, directly
   after the note.
2. **Rights** ([R-EDIT-001](#r-edit-001), [R-EDIT-004](#r-edit-004)): every
   user who can change the file can edit and delete every answer, also the
   answers of other authors, as in the file itself. The other choice was
   that the buttons "Edit" and "Delete" show only at the answers of the
   signed-in author.
3. **Work without sign-in** ([R-GEN-006](#r-gen-006)): the text editor, the
   side view and the preview show the notes also without a GitHub sign-in,
   and the user can edit and delete answers without it. Only adding a note
   or an answer needs the sign-in, because only these write an author.
   Editing and deleting an answer keep or remove its header. The other
   choice was that editing and deleting need the sign-in too.
4. **Markdown in the notes** ([R-NOTE-001](#r-note-001)): a note holds
   headings, paragraphs, lists, code blocks and every other Markdown, so it
   stands on lines of its own, and collapses so that it vanishes
   ([R-TEXT-005](#r-text-005)). The other choice was a note on one line inside
   the line of the text, which holds no headings and no paragraphs; the notes
   of Hannes hold both.
5. **What is hidden by default** ([R-PREV-005](#r-prev-005),
   [R-TEXT-005](#r-text-005)): the text editor collapses the notes by
   default; the Markdown preview shows them by default and has a button that
   hides them. Since [decision 15](#decisions), the notes are always collapsed
   in the text editor, and the preview shows the highlights by default
   ([R-GEN-011](#r-gen-011)).
6. **Form of a highlight** ([R-NOTE-006](#r-note-006)): a hidden start marker
   with the label of the note before the highlighted text, and the reference
   of the note as its end. The other choices were a quote of the highlighted
   text in the note, which no longer finds the text after a change of it or
   when the text occurs twice, and a second hidden marker at the end.
7. **Where the text of a note shows** ([R-TEXT-001](#r-text-001),
   [R-SIDE-001](#r-side-001), [R-GEN-009](#r-gen-009)): in one place only,
   the side view by default, and the setting `showNotesIn` chooses the boxes
   of the comments API in the text editor instead (Hannes, 2026-10-28: "by
   default we always open the side view", "we only have one, either the
   inline or the side view"). Before, both showed by default (Hannes, 12:00),
   and the setting also chose both (Hannes, 14:55). The other choices were the
   side view with a setting for the boxes that is off by default, and the
   boxes with the Comments panel of VS Code without the side view.
   [Decision 15](#decisions) replaces this decision: only the side view
   shows the text of the notes.
8. **Notes as footnotes** ([R-NOTE-001](#r-note-001), Hannes, 12:47): a note
   is a Markdown footnote with a header, not an HTML comment, because GitHub
   is the main target and shows a footnote, while it hides a comment. The
   notes of the older form `<!-- note` are not converted. The other choices
   were the HTML comments, which only the extension shows, and links to a
   separate file of notes.
9. **Tree of answers** ([R-NOTE-004](#r-note-004), Hannes, 13:27): a reply
   to an answer stands in the block quote of that answer, so that GitHub shows
   the tree too. The other choices were a flat list of answers, each reply
   with a line that names the answer that it replies to, and a flat list
   first with the tree later.
10. **The highlight of the selected note** ([R-SIDE-007](#r-side-007),
    [R-NOTE-006](#r-note-006), Hannes, 2026-10-28: "the funnel shall go to
    the selection not the side bar"): VS Code lets no view draw into the text
    editor, so the funnel stays between the thread and the strip of the view,
    and the highlight of the selected note gets a strong color and a
    frame in its color in the text editor and in the preview. VS Code tells
    an extension which lines the editor shows, not where they stand on the
    screen, so a funnel cannot end exactly at the highlight. The other choices
    were a funnel without the strip that ends at the edge of the view at an
    estimated height, which is wrong where lines wrap, and the strong
    highlight without the strip and the funnel. The strong highlight with the
    frame stays; [decision 14](#decisions) replaces the strip and the
    funnel.
11. **Place of the comment of the format** ([R-NOTE-007](#r-note-007),
    Hannes, 2026-10-28, 16:32): the comment stands at the top of the file, after a
    front matter, and the notes of a file without it work as before. The
    other choices were the top with notes only in files that hold the
    comment, which hides the notes of older files, and the end of the file,
    where a program finds it only after it read the whole file.
12. **The funnel reaches the highlight** ([R-SIDE-007](#r-side-007), Hannes,
    2026-10-28, 17:16, confirmed 17:21): the preview draws its part of the
    funnel, a band from the highlight to its right edge that follows the
    scrolling, and the side view continues it to the thread; the two parts
    meet at the top, where the selected thread stands. In the text editor,
    the funnel starts at the rows of the highlight, which the extension
    computes from the visible lines, an estimate where lines wrap. This
    replaces the part of decision 10 that keeps the funnel at the strip. The
    other choices were the start at the computed rows in the text editor
    only, with the strip in the preview, and the strip in both.
    [Decision 14](#decisions) replaces this decision (Hannes, 19:23: "the
    current implementation is not what we want").
13. **The formatter for agents** ([R-FMT-004](#r-fmt-004), Hannes,
    2026-10-28, 19:05): an npm package in the folder `cli/` of this
    repository, which the release publishes to npmjs.com with the version of
    the extension, as the extension nimblescape TypeScript does. The other
    choices were a run with npx from the GitHub repository, without npmjs.com,
    and a tool for the agents in VS Code only.
14. **The view next to the text** ([R-SIDE-007](#r-side-007), Hannes,
    2026-10-28, 19:50): the side view stands aligned to the text editor, as
    the compare view of VS Code shows two texts side by side: each thread at
    the height of its highlight, with the scrolling of the text. Only the
    selected thread has a line to its highlight (Hannes, 19:51: "only the
    selected one has the connection"). [Decision 25](#decisions) replaces
    this decision. The places are estimates where lines
    wrap, and the view lists the threads next to the preview, which tells an
    extension no place of its text. The other choices were a compare layout
    in the preview, with the text on the left and the notes at the exact
    height of their text on the right; an editor of the extension in a tab
    with the text and the notes side by side; and the compare editor of
    VS Code with the text without the notes against the file. This replaces
    [decision 12](#decisions) and the strip of [decision 10](#decisions).
15. **Only the side view** ([R-GEN-009](#r-gen-009), Hannes, 2026-10-28,
    19:58 to 20:07): "we completely drop the inline view", "we completely drop
    the callouts on hover view", "we completely drop the callout icons in the
    preview view", "drop all colored icons on the left", "in the text view we
    never show the notes and the markers". The side view is the only place of
    the text of the notes: no boxes of the comments API and no Comments view,
    no icons and callouts in the preview, no markers in the left margin of the
    text editor, and the notes always collapsed in the text editor. A button
    on each thread switches it to the text view of its note (decided with the
    option "Button on each thread"; the other choices were one button for the
    view that switches all threads, and the text view next to the text
    editor and the rendered answers next to the preview, without a button).
    The buttons of the side view are icons (Hannes, 20:06: "exchange all the
    buttons on the note editor with icons"). This replaces
    [decision 7](#decisions).
16. **The color of a note** ([R-TEXT-006](#r-text-006), Hannes, 2026-10-28,
    20:03: "notes can be colored in the notes editor, by default they get all
    the same color"; 20:10): all notes have the default color blue, and the
    start marker keeps another color after the label:
    `<wbr><!--[note-7k2q green-->`. The other choices were a comment at the
    end of the header line, `<!-- color: green -->`, and the name of the color
    as a word at the end of the header, which GitHub shows.
17. **Start and end of a highlight** ([R-NOTE-006](#r-note-006), Hannes,
    2026-10-28, 20:09 to 20:25): "there should never be a note without a
    start marker"; "why not always start with <wbr>"; the end marker is
    always the reference of the footnote; "there shall be no way to add a
    note without highlighting text". The text of a note is its highlight
    (Hannes, 20:22: "it is Highlights you would on paper do with a marker
    pen"), not a passage or a selection. Every note has one start marker,
    which always starts with `<wbr>`, so that it ends no paragraph on GitHub
    also at the start of a line. Before, a note without a start marker began
    at the start of its block, and the extension wrote no start marker
    there, or wrote it at the end of the line before.
18. **Highlights with the side view** ([R-GEN-011](#r-gen-011),
    [R-EDIT-006](#r-edit-006), Hannes, 2026-10-28, 20:00 to 20:32): the
    setting `showHighlights` and the buttons "Show Highlights" and "Hide
    Highlights" show and hide the highlights, with a good contrast; the
    highlights show only while the side view is open ("closing the side view,
    also hides the highlights"); a hidden highlight shows under the pointer,
    and a click on it opens the side view; the hover over the selected text
    offered the colors for a new note (replaced by
    [decision 22](#decisions)). Closing the side view keeps the
    setting, and "Show Highlights" also opens the side view, so that one
    click shows the highlights. [Decision 28](#decisions) replaced the rule
    that the highlights show only with the side view.
19. **Format on save only for files with notes** ([R-FMT-001](#r-fmt-001),
    Hannes, 2026-10-29, option "Only files with notes" of decision D1 of the
    code review): a save formats only a Markdown file with notes or with the
    comment of the format; "Format Document" still formats every Markdown
    file. The code review found that the format on save of every Markdown
    file changed 74 % of 436 README and CHANGELOG files on their first save,
    also in projects without notes. The other choices were format on save
    for every Markdown file, as before, and no format on save by default.
20. **The comment of the format without a change of the file on open**
    ([R-NOTE-007](#r-note-007), Hannes, 2026-10-29, "D2: ok" of the code
    review): the extension writes the comment with a change of a note or the
    save of a file with notes, not when an editor only shows the file. Before,
    each file with notes got an unsaved change when an editor, a diff view or
    the Markdown preview showed it, and auto save then saved it.
21. **A semantic version in the comment of the format**
    ([R-NOTE-007](#r-note-007), [format.md](format.md#11-the-version-of-the-format),
    Hannes, 2026-10-29, D3 of the code review: "only if the format version I
    would write is higher then mine one", "it would avoid the ping pong
    between new and older version", "we could make semantic versioning",
    "then make it just v1.0.0"): the first line names `v1.0.0` in place of
    `format=1`; a new major version points to its own specification ("an new
    format would point to another instruction file"); only a higher version
    writes a comment anew, and only a higher major version stops the changes
    of the notes. Before, each change of the words of the comment wrote the
    comment anew in every file, also back to the words of an older version.
22. **The light bulb and a shortcut in place of the hover over the selected
    text** ([R-EDIT-006](#r-edit-006), Hannes, 2026-10-29, D4 of the code
    review: "Is there a better mechanism we could use to add a note?", "go
    with your proposal"): "Add Note" is a Code Action of the selected text,
    which the light bulb and Ctrl+. list, and has the shortcut Shift+Alt+N
    (Cmd+K N on a Mac); the color is chosen in the editor of the new note.
    VS Code has no toolbar that floats over selected text. Before, a hover
    with the colors showed by itself over each selection in each Markdown
    file, also when the user selected text only to copy or change it. The
    other choice was the hover only while the side view is open.
23. **Hidden notes** ([R-HIDE-001](#r-hide-001) to [R-HIDE-004](#r-hide-004),
    Hannes, 2026-10-29: "also think of a mechanism to hide notes for other
    markdown viewers", "A and B, when the users decides to hide the notes
    that also GitHub shall hide the notes with A", "a top level icon on the
    side view decides about hiding the notes by other viewers"): an icon of
    the side view switches a file to a hidden form, in which each note is an
    HTML comment that every viewer hides, also GitHub; and the command line
    and VS Code write a text without notes for publishing. The visible form
    of [decision 8](#decisions) stays the default. The other choice was
    plugins for other renderers (remark, Pandoc, MkDocs), which help only in
    those tools. The hidden form is part of format v1.0.0, so it comes before
    the first release.
24. **Footnotes in the side view** ([R-FOOT-001](#r-foot-001) to
    [R-FOOT-006](#r-foot-006), Hannes, 2026-10-29: "how could we integrate
    standard footnotes into the side view edit as well?", "the extension
    could serve as a rich ui for editing footnotes"): the side view also
    shows, edits, adds, checks and renumbers the standard footnotes of a
    file, and turns an accepted note into a footnote. Before, the extension
    showed no footnote that is no note and never changed one.
25. **A list that scrolls freely** ([R-SIDE-007](#r-side-007), Hannes,
    2026-10-29, 09:06, decided with the option "List that scrolls freely"):
    the side view is a list of the threads in the order of the file, which
    the user scrolls on its own, and which moves only when the selected
    thread changes, for a click or a move of the cursor into a highlight. It
    has no line to the text. This replaces [decision 14](#decisions), whose
    threads followed the text editor in steps and late, and which the user
    could not scroll (Hannes: "the side view really has no smooth scrolling
    and is laggy", "the side view cannot be scrolled individually to find a
    note", "the linking is not implemented for the preview"). The other
    choices were the list with the notes in a margin of the Markdown
    preview, the aligned view with a scroll of its own, and an editor of the
    extension with the text and the notes side by side.
26. **The icon of the highlights** ([R-GEN-011](#r-gen-011), Hannes,
    2026-10-29, 09:35, decided with the option "A Highlighter pen (own
    icon)"): the buttons "Show Highlights" and "Hide Highlights" show a
    highlighter pen over its line and the same pen with a stroke, from an
    icon font of the extension. No codicon of VS Code shows such a pen, and
    the eye stays free for the icon of the hidden notes
    ([R-HIDE-002](#r-hide-002)). Before, the buttons showed an open and a
    closed eye. The other choices were the codicons "layers-active" and
    "layers", and "circle-large-filled" and "circle-large-outline".
27. **The clean editing view** ([R-TEXT-005](#r-text-005),
    [R-NOTE-006](#r-note-006), Hannes, 2026-10-29, 09:17: "all notes markup
    must not have effects on the editing, the editor must behave as if there
    was no notes markup at all in the document"; decided at 09:37 with the
    option "Clean editing view"): the text editor edits a copy of the file
    without the start markers, the references, the definitions of the notes
    and the comment of the format, and the extension writes each change into
    the file and keeps each note at its text. The line breaks, the cursor,
    the word moves, the search and the copy then count only the characters
    of the text. The format of the file and the notes on GitHub stay as they
    are; the text editor of the copy shows no marks of git. Before, the text
    editor showed the file with hidden markers, and VS Code counted the
    hidden characters for the line breaks and the cursor, so that a row
    could end early and the cursor could stand in a gap (Hannes, 09:10: "the
    cursor is in a position where nothing is there, editing there breaks the
    format"). No decoration and no API of VS Code for extensions changes that
    count. A prototype came first, checked in VS Code and shown to Hannes
    (10:20). For the full build, Hannes decided at 11:11: "we always want our
    markdown notes be in cleanview - always not with a separate command", so
    a file with notes always opens in the view
    ([R-TEXT-009](#r-text-009)). The choice comes before steps 29 and 30, because
    the hidden form changes the markup that the copy leaves out. The other
    choices were the notes outside the text, which name their text by a
    quote, at the end of the file or in a file beside it (a new format,
    GitHub shows no notes, and a change outside VS Code can lose a note), and
    the markers kept with a cursor that never stands in a hidden marker or a
    gap (the line breaks still count the hidden characters).
28. **Highlights without the side view** ([R-GEN-011](#r-gen-011),
    [R-PREV-001](#r-prev-001), Hannes, 2026-10-29, 16:33: "clicking the
    highlight button, opens the side view, it shall not open the side view
    but only show the highlights. when a highlight is clicked, then the side
    view shall open"): the setting `showHighlights` and the buttons "Show
    Highlights" and "Hide Highlights" alone show and hide the highlights; the
    side view does not change them, and "Show Highlights" does not open it.
    A click on a highlight still selects its note and opens the side view
    (replaced by [decision 29](#decisions): a double click opens it). This
    replaces the rule of [decision 18](#decisions) that the highlights show
    only while the side view is open.
29. **A double click opens the side view** ([R-SIDE-007](#r-side-007),
    [R-PREV-003](#r-prev-003), [R-NOTE-006](#r-note-006), Hannes,
    2026-10-29, 17:49: "only a double click on a selected highlight shall
    open the side view", "in both text and preview"): a click on a
    highlight, in the text editor or in the preview, only selects its note;
    a double click on it opens the side view, and in the preview does not
    open the text editor. The cursor that leaves the highlight of the
    selected note deselects it (17:48: "keeps it selected when the cursor
    goes out of it again"), and each thread that is not selected is dimmed
    (18:12). This replaces the last rule of [decision 28](#decisions).

30. **Todo notes** ([R-NOTE-008](#r-note-008), [R-EDIT-008](#r-edit-008),
    Hannes, 2026-10-29, 17:56: "/todo in the text adds a special todo note",
    "a todo can be marked completed"; 17:58, decided with the option
    "Both"): `/todo` works in the Markdown text, where it highlights the
    sentence before it and opens the editor of a new todo note, and at the
    start of the text of a new note in the side view. A todo note has its
    state in the header of its first answer: `todo` while it is open, `done`
    when it is completed; a check box in the side view changes it. The other
    choices were `/todo` only in the text and only in the side view. At
    18:40 Hannes wrote "all slash commands are intended for the text
    editor", so the side view part is dropped.

31. **Citations as footnotes with CSL** ([R-EDIT-008](#r-edit-008),
    [R-NOTE-007](#r-note-007), Hannes, 2026-10-29, 20:48, decided with the
    option "Footnotes [^hong2024] with CSL"; 20:50: "in text and preview the
    extension shall render according to the DOCTYPE citation format. for
    now only APA7, with instructions linked for Agents equally to the
    format"): a citation is a reference to a standard footnote, such as
    `[^hong2024]`, and the definition of the footnote holds the metadata of
    the source as CSL JSON in a hidden comment; the side view edits it. The
    text editor and the preview show each citation and the list of the
    sources in the citation style that the comment of the format names. For
    now the only style is APA 7 in the form of the PHT. The comment of the
    format links to an instruction file of the style for AI agents, as it
    links to the format. GitHub shows the citations as numbered footnotes,
    which APA 7 does not use. The other choices were hidden CSL tags with
    the visible APA 7 text, Pandoc citations with CSL in the front matter,
    and Pandoc citations with a CSL JSON file. At 21:43 Hannes chose
    citations as links to their entries in a written reference list, with the
    data in the title of the link, in place of the footnotes. [Decision
    32](#decisions) moves the citations to nimblescape Markdown Paper, whose
    specification holds their form.

32. **Citations in nimblescape Markdown Paper** ([R-GEN-012](#r-gen-012),
    [R-EDIT-008](#r-edit-008), Hannes, 2026-10-29, 22:07: "one markdonw-paper
    that creates and scaffolds all the paper workflow / then the
    markdownnotes which has its value on its own", 22:11: "we want a clean
    split and and the notes shall still be markdown related"; 2026-10-30,
    02:25, decided with the option "Into markdown-paper"): the citations, the
    database of the sources, the citation style, `/source` and `/research`
    go to nimblescape Markdown Paper, which adds them through the API of this
    extension: a step of the formatter, the database as a hidden block at
    the end of the file, and its slash commands. The format of the notes
    stays `v1.0.0`. The other choice was the citations in Markdown Notes, as
    format `v1.1.0`.
33. **Names without a hyphen** ([R-GEN-005](#r-gen-005),
    [R-FMT-004](#r-fmt-004), [R-NOTE-007](#r-note-007), Hannes, 2026-10-30,
    02:04: the extension ID `nimblescape.nimblescape-markdownnotes`; 02:27:
    "it will be renamed to markdownnotes", about the npm package; 02:30:
    "markdown-notes" → "markdownnotes"): the npm package
    `@nimblescape/markdownnotes`, the command `markdownnotes`, the name
    `nimblescape-markdownnotes` of the format and the scheme `markdownnotes`
    of the clean editing view. The addresses of the repository keep its old
    name until its rename to `markdownnotes-vscode`.
34. **One formatter command for a paper project** ([R-FMT-004](#r-fmt-004),
    [R-GEN-012](#r-gen-012), Hannes, 2026-10-30, 02:26: "now we do not have
    a single formatter command anymore, how to handle this", "in npmjs";
    agreed with a thumb on the proposal): `@nimblescape/markdownpaper`
    depends on `@nimblescape/markdownnotes` and calls its library
    `formatMarkdown` before its own steps, so that
    `npx -y @nimblescape/markdownpaper format <file>` formats every file of a
    paper project, and `markdownnotes format` stays the command for notes
    only. In VS Code, Markdown Notes stays the one default formatter of
    Markdown, and Markdown Paper adds its steps through the API.
35. **Entries by noun, references by /ref and /cite**
    ([R-XREF-001](#r-xref-001), [R-XREF-002](#r-xref-002),
    [R-EDIT-008](#r-edit-008), Hannes, 2026-10-30, 02:32 to 02:47, decided
    with the option "Entries by noun, /ref and /cite link"): the slash
    commands named by a noun add an entry: `/figure` an image of the folder
    as a figure, `/table` a table with its caption, and `/source` of
    Markdown Paper a file of the folder `bib/` as a source of the reference
    list. `/ref` adds a link to a figure or a table ("technically it is a
    link to it"), and `/cite` of Markdown Paper a citation. The anchor at the
    end of the caption line, the link text with the word and the number, and
    the numbers from the formatter are the proposal of 02:33. The other
    choice was the links by noun (`/figure`, `/table`, `/source`) and the
    entries by `/addfigure`, `/addtable` and `/addsource`.
36. **Links to headings by their GitHub IDs** ([R-XREF-003](#r-xref-003),
    [R-GEN-013](#r-gen-013), Hannes, 2026-10-30, 03:28: "why do headings
    required anchors?"; 03:29: "we shall stay as close to markdown as
    possible"): a link to a section names the ID that GitHub gives its
    heading, such as `[Chapter 2.1](#methods)`, and the heading gets no
    anchor; nimblescape Markdown Paper uses the same IDs (its decision 16).
    The other choice, built first in step 51, was an anchor at the end of
    the heading, `## Methods<a id="sec-methods"></a>`, which keeps its links
    when the text of the heading changes.
37. **The tag of a snippet and the used snippets** ([R-CODE-004](#r-code-004),
    Hannes, 2026-10-30, 04:34, on open question 2 of the concept document
    "Listings and snippets"; 05:49 and 05:57): the text editor of a source
    file shows each mark line of a snippet as an unobtrusive tag in the
    small gray letters of a code lens in place of the comment, the cursor
    jumps over the mark lines, and a toggle button highlights the snippets
    that a listing shows. No character of the source changes. The other
    forms were the dimmed marks without a tag, and a code lens above the
    dimmed start mark, built first in step 58, which needed one more line
    and let the cursor stand in the marks.
38. **Symbols of a listing** ([R-CODE-005](#r-code-005), open question 3 of
    the concept document "Listings and snippets"): for now, a listing shows
    a whole file or a snippet, and the extension finds no symbols of a
    language. Symbols come later with tree-sitter parsers, first for Go,
    TypeScript, TSX, JavaScript, JSX, Python, HTML, CSS, YAML, JSON, JSONC
    and shell scripts. The other proposals were the rules of the
    declarations, built in step 57 and removed in step 60, because only a
    parser knows the code, and the parsers now.

---

© 2026 Hannes Stauss (scalarion@nimblescape.com) ·
[MIT License](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/LICENSE).
