<!--
SPDX-License-Identifier: MIT
© 2026 Hannes Stauss (scalarion@nimblescape.com)
Licensed under the MIT License. See LICENSE in the repository root for details.
-->

# Specification

This document summarizes every requirement of nimblescape Markdown Notes that
is still valid on 2026-10-30, from all requests of Hannes since 2026-10-28.
Requests that later decisions replaced or dropped are not in it. Each point
links to the full text of its requirement in [requirements.md](requirements.md),
which also holds the [plan](requirements.md#plan) and the
[decisions](requirements.md#decisions). [format.md](format.md) specifies the
form of the notes in a file for programs and AI agents, and
[features.md](features.md) gives the state of each request. A point marked
**planned** is specified but not built yet.

## 1. Purpose and scope

- The extension adds notes to Markdown files. A note is a Markdown footnote,
  so the file stays plain Markdown, and GitHub, the main target, shows each
  note as a footnote ([R-NOTE-001](requirements.md#r-note-001)).
- A note belongs to an exact text, its highlight, as the highlight of a marker
  pen on paper ([R-NOTE-006](requirements.md#r-note-006)). Several authors
  answer a note and each other, so a note is a tree of answers
  ([R-NOTE-004](requirements.md#r-note-004)).
- VS Code shows the text of the notes in one place, the side view "Notes"
  ([R-GEN-009](requirements.md#r-gen-009)). The text editor and the Markdown
  preview show only the highlights.
- The extension stays about notes in Markdown (decision 32). The paper
  workflow (layouts, page preview, PDF, citations and sources, lists of
  figures and tables) is the sister extension nimblescape Markdown Paper,
  which adds its parts through the API of this extension
  ([R-GEN-012](requirements.md#r-gen-012)).

## 2. General rules

- **Built-in editors only:** the extension extends the text editor and the
  Markdown preview of VS Code and adds only its side view. The visual
  Markdown Editor of VS Code has no stable API, so it shows no notes
  ([R-GEN-001](requirements.md#r-gen-001)).
- **Only additions:** the extension replaces no part of the Markdown support
  of VS Code; other Markdown extensions, for example those of Matt Bierner,
  work as without it ([R-GEN-007](requirements.md#r-gen-007)).
- **Marketplace:** no proposed API; VS Code 1.125 and later
  ([R-GEN-002](requirements.md#r-gen-002)).
- **Privacy:** works in Restricted Mode and in virtual workspaces, runs no
  program, collects no telemetry, connects to no address of its own, and
  changes a file only for an action of the user or a save
  ([R-GEN-003](requirements.md#r-gen-003)).
- **Licenses:** `THIRD-PARTY-NOTICES.md` names every bundled package
  ([R-GEN-004](requirements.md#r-gen-004)).
- **Names:** extension ID `nimblescape.nimblescape-markdownnotes`, display
  name "nimblescape Markdown Notes", npm package `@nimblescape/markdownnotes`
  with the command `markdownnotes`, format name `nimblescape-markdownnotes`;
  no hyphen in "markdownnotes". The repository is
  `nimblescape/markdownnotes-vscode` since 2026-10-30
  ([R-GEN-005](requirements.md#r-gen-005)).
- **Nothing published before the release:** no version goes to the
  Marketplace or to npmjs.com before the release, which Hannes starts. For
  now there is no release ([decision 48](requirements.md#decisions)). Until
  then, people, tests, AI agents and other repositories build the npm
  package from a clone of this repository at a fixed commit and install the
  file of `npm pack` ([R-GEN-017](requirements.md#r-gen-017)).
- **GitHub sign-in:** a new note or answer needs the GitHub sign-in of VS
  Code, and its author is the GitHub login; reading, editing and deleting
  need no sign-in ([R-GEN-006](requirements.md#r-gen-006)).
- **Footnotes in the preview:** the extension pack installs "Markdown
  Footnotes" of Matt Bierner for the other footnotes
  ([R-GEN-008](requirements.md#r-gen-008)).
- **Links of a note** open a file in a new window by default; the setting
  `openLinksIn` chooses the editor or the system
  ([R-GEN-010](requirements.md#r-gen-010)).

## 3. The notes in the file

- **Syntax:** a reference `[^note-7k2q]` in the text and a definition after
  the block of the reference, whose first line is the header; the body is
  Markdown indented by four spaces ([R-NOTE-001](requirements.md#r-note-001)).
- **Header:** `**login** · 2026-10-28 10:15+01:00`, the GitHub login and the
  local time of the author with the offset of the zone; VS Code shows the
  date in the local time of the reader
  ([R-NOTE-002](requirements.md#r-note-002)).
- **Label:** `note-` and four random small letters or digits, unique in the
  file, never changed ([R-NOTE-003](requirements.md#r-note-003)).
- **Tree of answers:** each reply is a block quote with its own header; a
  reply to a reply stands in the block quote of its answer
  ([R-NOTE-004](requirements.md#r-note-004)).
- **Place:** the definition stands after the outermost block of its
  reference, with blank lines around it; the reference never stands in a
  link or a code span ([R-NOTE-005](requirements.md#r-note-005)).
- **Highlight:** every note has one start marker `<wbr><!--[note-7k2q-->`,
  optionally with a color (`<wbr><!--[note-7k2q green-->`), and the
  reference is the end marker. A highlight holds text and stays in one block
  ([R-NOTE-006](requirements.md#r-note-006)).
- **Colors:** blue (the default), green, orange, purple, red and teal, chosen
  in the side view ([R-TEXT-006](requirements.md#r-text-006)).
- **Comment of the format:** a comment at the top of each file with notes,
  after a front matter, names the format `nimblescape-markdownnotes`, its
  semantic version `v1.0.0` and the address of [format.md](format.md), and
  tells AI agents to read it. The extension writes it with a change of a note
  or a save, rewrites it only for a higher version, and stops changes for a
  higher major version ([R-NOTE-007](requirements.md#r-note-007)).
- **Todo notes:** the header of the first answer ends with `· todo` or
  `· done`; a check box in the side view changes it
  ([R-NOTE-008](requirements.md#r-note-008)).
- **Hidden form:** each definition of a note is an HTML comment of its own,
  the end marker is the comment `<!--note-7k2q]-->`, and the comment of the
  format holds the word `hidden`, so that every viewer hides the notes, also
  GitHub; the text of a note escapes `-->` and `--!>` with one more
  backslash. All readers and writers accept both forms, and a file has one
  form; without the comment of the format, a file is hidden when all its
  notes are ([R-HIDE-001](requirements.md#r-hide-001),
  [R-HIDE-003](requirements.md#r-hide-003)).
- **Text without notes, planned:** `markdownnotes strip`, "Copy without Notes"
  and "Save Copy without Notes" write the text without the notes, for
  publishing ([R-HIDE-004](requirements.md#r-hide-004)).

## 4. Text editor

- **Clean editing view:** a Markdown file with notes, or with the comment of
  the format, always opens in a text editor of its text without the notes
  markup: no start markers, references, definitions of notes, comment of
  the format or anchors of figures and tables, and no blocks that other
  extensions hide. Line breaks, cursor,
  word moves, search, copy and Undo count only the text. Each change goes
  into the file at once and keeps every note at its text; a deleted text
  never deletes a note; a save saves the file; the preview and relative
  links work as for the file. While the side view shows the standard
  footnotes, their definitions are left out too. "Open File with Markup"
  shows the file itself ([R-TEXT-009](requirements.md#r-text-009)).
- **The file itself** (git changes, "Open File with Markup"): every note is
  collapsed into the line before it; the markers are hidden, and the cursor,
  Backspace and Delete never change them; header lines show rendered
  ([R-TEXT-005](requirements.md#r-text-005),
  [R-NOTE-006](requirements.md#r-note-006),
  [R-TEXT-007](requirements.md#r-text-007)).
- **Warnings** at each form of a note that GitHub shows differently or that
  breaks a rule, for example a note without a start marker or a start marker
  without `<wbr>` at the start of a line
  ([R-TEXT-008](requirements.md#r-text-008)).

## 5. Highlights and selection

- The setting `showHighlights` and the buttons "Show Highlights" and "Hide
  Highlights" (a highlighter pen) show the highlights in the text editor and
  the preview, also while the side view is closed; a hidden highlight shows
  under the pointer; a change deselects the selected note
  ([R-GEN-011](requirements.md#r-gen-011)).
- A click on a highlight selects its note, a double click opens the side
  view; the cursor that moves into a highlight selects its note, and the
  cursor that leaves it, or a click outside, deselects it. The selected note
  is strong with a frame, the other threads are dimmed
  ([R-NOTE-006](requirements.md#r-note-006),
  [R-SIDE-007](requirements.md#r-side-007)).

## 6. Side view "Notes"

- **Place and content:** a view in the secondary side bar with the threads
  of the active Markdown file, in all modes of VS Code
  ([R-SIDE-001](requirements.md#r-side-001),
  [R-PREV-006](requirements.md#r-prev-006)).
- **List:** the threads in the order of the file; the user scrolls it freely;
  the selected thread scrolls to the top
  ([R-SIDE-007](requirements.md#r-side-007)).
- **Header:** stays at the top, with the file name, the todo filter (two
  buttons that exclude each other), the color filter, the search field and
  "Clear Filter"; the filters combine
  ([R-SIDE-008](requirements.md#r-side-008)).
- **Editor:** icon buttons with tooltips: "Reply", "Edit", "Delete" for each
  answer; color, line, "Show as Text", "Answer" and "Delete Thread" for each
  thread; the tabs "Visual" and "Markdown" in each editor, and "Write" and
  "Preview" in the tab "Markdown" ([R-SIDE-002](requirements.md#r-side-002)).
- **New note:** "Add Note" in the title and in the context menu, only for
  selected text ([R-SIDE-003](requirements.md#r-side-003)).
- **Links** in rendered text open as in the preview, never `command:`,
  `data:` or `javascript:` ([R-SIDE-005](requirements.md#r-side-005)).
- **Show and hide** with one button, also in Zen Mode
  ([R-SIDE-006](requirements.md#r-side-006)).
- **Hide the notes from other viewers:** the eye in the title of the view,
  for a file with notes, shows its form and writes all its notes in the
  other form in one edit; the commands "Hide Notes from Other Viewers" and
  "Show Notes in Other Viewers"; the setting `hideNotesInNewFiles` chooses
  the form of a file that gets its first note
  ([R-HIDE-002](requirements.md#r-hide-002)).
- **Smooth scroll:** the text editor and the preview scroll smoothly to the
  note that the view selects ([R-SIDE-007](requirements.md#r-side-007)).
- **Visual editing:** the tab "Visual" of each editor edits the rendered
  text with the editor of the VS Code Markdown Editor, with a toolbar and
  Ctrl+B, Ctrl+I, Ctrl+E and Ctrl+K; the block with the cursor shows its
  Markdown marks, and the rest of the text stays as it was
  ([R-SIDE-004](requirements.md#r-side-004),
  [decision 52](requirements.md#decisions)).

## 7. Editing

- **Edit and save** each answer, also of other authors; a changed answer gets
  the date of its save; a text that would change the note is refused
  ([R-EDIT-001](requirements.md#r-edit-001),
  [R-EDIT-002](requirements.md#r-edit-002)).
- **Add a note** only to selected text, with its start marker, reference and
  definition ([R-EDIT-003](requirements.md#r-edit-003)).
- **Delete** an answer (its replies move up) or the whole thread
  ([R-EDIT-004](requirements.md#r-edit-004)).
- **Answer** a thread or reply to an answer
  ([R-EDIT-005](requirements.md#r-edit-005)).
- **Light bulb and shortcut:** "Add Note" is the first Code Action of
  selected text; Shift+Alt+N, Cmd+K N on a Mac
  ([R-EDIT-006](requirements.md#r-edit-006)).
- **No change from an outdated view:** each change names the answer that the
  user saw, and writes nothing when the file holds another one
  ([R-EDIT-007](requirements.md#r-edit-007)).
- **Slash commands** in the text editor, also in the clean editing view, with
  Tab completion: `/note`, `/todo`, `/footnote`, `/figure`, `/table`, `/ref`,
  `/date`, `/time`, `/user`; commands of other extensions after them, such as
  `/cite` and `/research` of Markdown Paper. A command named by a noun adds an
  entry, `/ref` and `/cite` add a reference
  ([R-EDIT-008](requirements.md#r-edit-008)).

## 8. Markdown preview

- Highlights in the color of each note, with the CSS Custom Highlight API
  ([R-PREV-001](requirements.md#r-prev-001)).
- A click selects, a double click opens the side view, a click outside
  deselects; the page stays as it is
  ([R-PREV-003](requirements.md#r-prev-003)).
- The text without the notes; a note never shows as a footnote
  ([R-PREV-004](requirements.md#r-prev-004)).
- The buttons of the highlights in the title
  ([R-PREV-005](requirements.md#r-prev-005)).
- "Add Note" above selected text of one block
  ([R-PREV-008](requirements.md#r-prev-008)).
- The same functions in the pages of a paper of nimblescape Markdown Paper,
  which it shows in the Markdown preview; the PDF has no notes
  ([R-PREV-009](requirements.md#r-prev-009)).

## 9. Formatter

- **Format on save** of a Markdown file with notes, with the comment of the
  format, with a part whose text the formatter keeps current (a listing, a
  value of the front matter, an anchor), or with a part that a step of
  another extension formats; "Format Document" for every Markdown file;
  setting `formatOnSave` ([R-FMT-001](requirements.md#r-fmt-001)).
- **Changes:** one line per paragraph with its hard line breaks, aligned
  tables, no white space at line ends, one blank line between blocks,
  `<wbr>` before each start marker, a start marker for each note, the
  numbers of the links to figures, tables, listings and sections, the
  current values of the front matter, the current code of the listings, and
  each note in the form of its file ([R-FMT-002](requirements.md#r-fmt-002),
  [R-HIDE-003](requirements.md#r-hide-003)).
- **Keeps** code blocks, HTML, front matter, math, containers, setext
  headings and the answers of the notes, and keeps the text when the result
  would render otherwise ([R-FMT-003](requirements.md#r-fmt-003)).
- **Command line and library:** `markdownnotes format [--check] <file>...`
  with Node.js 22 or later, installed from GitHub for now
  ([decision 48](requirements.md#decisions)), and the library
  `formatMarkdown(lines, { source })` for programs such as
  `markdownpaper format` ([R-FMT-004](requirements.md#r-fmt-004)).

## 10. Standard footnotes

- The side view shows the footnotes that are no note at the place of their
  first reference, and edits, deletes and reveals them; setting
  `showFootnotes` ([R-FOOT-001](requirements.md#r-foot-001),
  [R-FOOT-002](requirements.md#r-foot-002)).
- "Add Footnote" at the cursor: Shift+Alt+B, Cmd+K B on a Mac, and
  `/footnote` ([R-FOOT-003](requirements.md#r-foot-003)).
- **Planned:** the checks of the footnotes, "Renumber Footnotes" and "Make
  Footnote" ([R-FOOT-004](requirements.md#r-foot-004) to
  [R-FOOT-006](requirements.md#r-foot-006)).

## 11. Figures, tables, sections and listings

- `/figure` inserts a chosen image of the workspace as a figure after its
  caption line, such as `Figure 2: Caption`, `/table` a table with its
  caption line, such as `Table 1: Caption`, before it, and `/ref` a link to a
  figure or a table of the file, such as `[Table 1](#tab-grades)`, after it
  gave the target an anchor at the end of its caption line. An image without
  a caption is no figure. The clean editing view hides the anchors
  ([R-XREF-001](requirements.md#r-xref-001)).
- The file is document driven: the formatter writes the numbers into the
  captions and the links, the code and the links of the listings and the
  values of the front matter, and keeps them current, as far as it computes
  them from the file and its sources alone and changes nothing that other
  files link to. Headings get no numbers. The renderer of Markdown Paper
  adds only the look, and Markdown Paper writes the table of contents and
  the lists of the figures, the tables and the listings into the file
  between hidden markers ([R-GEN-016](requirements.md#r-gen-016),
  [decision 42](requirements.md#decisions)).
- `/ref` also links a section, the part of the text under a heading, with
  the numbers of its chapter, such as `[Chapter 2.1](#methods)`. The link
  names the ID that GitHub gives the heading, and the heading gets no anchor
  ([R-GEN-013](requirements.md#r-gen-013), "close to Markdown"). The sections
  start at the highest level that more than one heading has, so a single
  title `#` has no number ([R-XREF-003](requirements.md#r-xref-003)).
- The formatter writes the number of each caption and of each link from the
  order in the file: a link to an anchor, and a link to the ID of a heading whose word is
  "Chapter", "Kapitel", "Section" or "Abschnitt". Markdown Paper can number
  by the rules of its layout ([R-XREF-002](requirements.md#r-xref-002)).
- `/ref` also inserts a value of the front matter between hidden markers,
  such as `<wbr><!--{title}-->A paper<!--{/title}-->`; the formatter writes
  the current value of the key into it, and the clean editing view hides the
  markers ([R-XREF-004](requirements.md#r-xref-004)).
- `/listing` inserts the code of a file of the workspace, or of a snippet of
  it, as a listing: the caption line `Listing 2:` with the caption as a link
  to the lines of the source and the cite of the source after it,
  `[Reading](../src/fields.ts#L12-L30) (fields.ts, L12-L30)`, the
  comment `<!-- listing: ../src/fields.ts#read-fields -->` and the code
  block. The clean editing view shows only the text of the caption and the
  code block, and Ctrl+Click on the caption opens the source. `/ref` links
  it as `[Listing 1](#lst-…)` ([R-CODE-001](requirements.md#r-code-001)).
  Markdown Paper renders no cite of its own; line numbers in front of the
  code are an option of its layout ([decision 45](requirements.md#decisions)).
- A listing shows a whole file or a snippet, and no symbol of a language,
  such as a function: a function is a snippet around it. There is no
  tree-sitter for now ([decision 51](requirements.md#decisions)); when
  symbols come, they come with tree-sitter parsers for Go, TypeScript, TSX,
  JavaScript, JSX, Python, HTML, CSS, YAML, JSON, JSONC and shell scripts
  ([R-CODE-005](requirements.md#r-code-005)).
- The formatter writes the current code of the source into each listing,
  and the current lines into the link of its caption and into the cite
  after it, in VS Code and on the
  command line, which reports a missing source or
  snippet and fails with `--check`; the text editor and the Problems view
  show a warning at such a listing
  ([R-CODE-002](requirements.md#r-code-002)).
- A snippet is code between the marks `markdownnotes: snippet <name>` and
  `markdownnotes: /snippet <name>` in comments of a source file; `/snippet`
  and "Add Snippet" write them around selected lines in the comment form of
  the type of the file (more than 80 types, among them JSONC, YAML, TOML,
  `.env`, CSS, SCSS, HTML, Dockerfile and Makefile; not JSON), a listing
  names it as `#<name>`, and the comment of a listing is a link to its
  source ([R-CODE-003](requirements.md#r-code-003)). A file type that the
  extension does not know gets the comment form of VS Code for its language.
- The text editor of a source file shows each mark line of a snippet as a
  tag in the look of a code lens in place of the comment, with the listings
  that show the snippet in the start tag; the cursor jumps over the mark
  lines, a click on the end tag goes to the start, the light bulb has
  "Rename Snippet" and "Remove Snippet", and the buttons "Show Used
  Snippets" and "Hide Used Snippets" color the used snippets
  ([R-CODE-004](requirements.md#r-code-004), decision 37).
- **Sources in other repositories, planned:** each other repository of a
  project is a Git submodule of the repository of the paper, at a fixed
  commit; a listing names a file of it by its path, the tools read it from
  the disk, and the link of the caption goes to the other repository at
  the commit of the submodule, read from `.gitmodules`
  ([R-CODE-006](requirements.md#r-code-006), decision 46).

## 12. API for other extensions

The export has `getAPI(version)`; `getAPI(1)` gives `fileOf(uri)`,
`registerFormatStep`, `registerHiddenBlocks`, `registerHiddenMarkers` and
`registerSlashCommand`, each register call with a disposable. The clean
editing view hides the blocks and the markers of other extensions, such as
the start marker `<wbr><!--[research-->` of Markdown Paper; a slash command
with `selection: true` shows only after a slash that replaced selected text,
and gets the range of that text. The steps of the formatter of other
extensions run after the steps of the notes, and both run again while the
steps change the text, at most three times, so that one format is enough.
Checks of another extension go on the file that `fileOf` names
([R-GEN-012](requirements.md#r-gen-012)).

---

© 2026 Hannes Stauss (scalarion@nimblescape.com) ·
[MIT License](https://github.com/nimblescape/markdownnotes-vscode/blob/main/LICENSE).
