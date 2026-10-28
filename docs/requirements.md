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
other, so a note is a tree of answers. VS Code shows the notes in the text
editor, in the Comments view, in a side view of the extension and in the
Markdown preview.

## Plan

| Step | Content | Requirements | State |
| --- | --- | --- | --- |
| 1 | Setup: manifest, build, CI, release workflows, license notices, the same structure as the other nimblescape extensions | [R-GEN-001](#r-gen-001) to [R-GEN-005](#r-gen-005) | done |
| 2 | The note, its header, its label | [R-NOTE-001](#r-note-001) to [R-NOTE-003](#r-note-003) | done; as a footnote since step 17 |
| 3 | The text editor and the Comments view: show, edit, save, add and delete notes | [R-TEXT-001](#r-text-001), [R-VIEW-001](#r-view-001), [R-EDIT-001](#r-edit-001) to [R-EDIT-004](#r-edit-004) | done, changes in step 7 |
| 4 | The Markdown preview: callouts | [R-PREV-001](#r-prev-001) | done, changes in step 8 |
| 5 | Name `nimblescape-markdown-notes`, GitHub sign-in for the author | [R-GEN-005](#r-gen-005), [R-GEN-006](#r-gen-006), [R-NOTE-002](#r-note-002) | done |
| 6 | Notes in the text, threads of answers | [R-NOTE-004](#r-note-004), [R-NOTE-005](#r-note-005), [R-EDIT-005](#r-edit-005) | done; as footnotes and a tree of answers since step 17 |
| 7 | Text editor: dimmed comment source, collapsible notes as in GitHub pull requests | [R-TEXT-001](#r-text-001) to [R-TEXT-003](#r-text-003) | done |
| 8 | Preview: icon, callout on hover, click opens the editor, the text without the notes | [R-PREV-001](#r-prev-001) to [R-PREV-005](#r-prev-005) | done |
| 9 | Side view: the note editor | [R-SIDE-001](#r-side-001) to [R-SIDE-003](#r-side-003) | done |
| 10 | Tests, tests in a real VS Code, README, user guide, screenshot | all | done |
| 11 | Links in the side view, the side view in the secondary side bar with the buttons that show and hide it, the button of the preview | [R-SIDE-001](#r-side-001), [R-SIDE-005](#r-side-005), [R-SIDE-006](#r-side-006), [R-PREV-005](#r-prev-005) | done |
| 12 | Text editor: Markdown inside the notes, dimming after the cursor, collapsed notes with a marker, rendered header lines | [R-TEXT-003](#r-text-003) to [R-TEXT-007](#r-text-007) | in progress: dimming, collapsed notes, markers and rendered header lines done; the highlighting of Markdown inside the notes is planned |
| 13 | Number and color of each note, common selection, funnels | [R-TEXT-006](#r-text-006), [R-SIDE-007](#r-side-007) | done |
| 14 | Visual editing of the rendered Markdown in the side view | [R-SIDE-002](#r-side-002), [R-SIDE-004](#r-side-004) | planned |
| 15 | Tests together with other Markdown extensions | [R-GEN-007](#r-gen-007) | done |
| 16 | Notes for an exact selection of the text | [R-NOTE-006](#r-note-006), [R-EDIT-003](#r-edit-003) | done |
| 17 | Notes as Markdown footnotes, without a migration of the old comments; a tree of answers; the time zone of the author; warnings; the extension Markdown Footnotes in the extension pack | [R-NOTE-001](#r-note-001) to [R-NOTE-006](#r-note-006), [R-TEXT-008](#r-text-008), [R-GEN-008](#r-gen-008) | done |
| 18 | The collapse at the start of VS Code, the buttons "Hide Note Text" and "Show Note Text", the marker beside the comment mark, the settings `showNotesIn` and `openLinksIn`, the funnel of the selected thread | [R-GEN-009](#r-gen-009), [R-GEN-010](#r-gen-010), [R-TEXT-005](#r-text-005), [R-TEXT-006](#r-text-006), [R-SIDE-007](#r-side-007) | done |
| 19 | The text of the notes in one place, hidden markers and header lines that never open, the setting `keepNotesCollapsed`, a click on a passage that selects its note, the strong highlight of the selected note, the setting `showCalloutOnHover`, the date of a changed answer, the modes of VS Code 1.143 | [R-GEN-009](#r-gen-009), [R-NOTE-006](#r-note-006), [R-TEXT-005](#r-text-005), [R-TEXT-007](#r-text-007), [R-SIDE-001](#r-side-001), [R-SIDE-007](#r-side-007), [R-EDIT-002](#r-edit-002), [R-PREV-002](#r-prev-002), [R-PREV-003](#r-prev-003), [R-PREV-006](#r-prev-006) | done |
| 20 | The comment of the format at the top of each file with notes, with the link to the specification for AI agents, written as soon as an editor shows a file with notes, and the setting `addFormatComment` | [R-NOTE-007](#r-note-007) | done |
| 21 | A click on a passage of the preview that keeps the page, no callout on a click, a click outside a passage that deselects the note, the selected thread at the top of the view, the other notes dimmed, the faint passages of the preview, the setting `showIconsInPreview`, the Markdown formatter | [R-NOTE-006](#r-note-006), [R-SIDE-001](#r-side-001), [R-SIDE-007](#r-side-007), [R-PREV-002](#r-prev-002), [R-PREV-003](#r-prev-003), [R-PREV-007](#r-prev-007), [R-FMT-001](#r-fmt-001) to [R-FMT-003](#r-fmt-003) | done |
| 22 | The funnel that follows the passage of the selected note: the band of the preview from the passage to its right edge, and the start of the funnel at the rows of the passage in the text editor | [R-SIDE-007](#r-side-007) | done |
| 23 | The formatter on the command line for programs and AI agents, and its call in the specification of the format | [R-FMT-004](#r-fmt-004) | in progress |

## General

### R-GEN-001

**Built-in editors.** The extension extends the editors that VS Code has for
Markdown files: the text editor, the Comments view and the Markdown preview.
It adds one view of its own, the side view of [R-SIDE-001](#r-side-001). It
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
adds, answers or deletes a note, and when an editor shows a file with notes
without the comment of the format, which it then adds
([R-NOTE-007](#r-note-007)).

### R-GEN-004

**Licenses.** `THIRD-PARTY-NOTICES.md` names every package that the build
bundles into the package, with its version, its license and the place of its
source code, and holds the text of each license.

### R-GEN-005

**Name and release.** The name is `nimblescape-markdown-notes`, the display
name "nimblescape Markdown Notes", and the extension ID
`nimblescape.nimblescape-markdown-notes` (Hannes, 2026-10-28). The repository
gets the same name, `nimblescape/nimblescape-markdown-notes`. The publisher is
`nimblescape`. The release uses the same workflows and checks as the other
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

- decorations, folding ranges and comment threads in the text editor;
- a grammar that is injected into the Markdown grammar of VS Code and applies
  only inside a note ([R-TEXT-004](#r-text-004));
- a markdown-it plugin that changes only the footnotes that are notes, with
  their references and start markers, and gives every other token to the
  rules of the preview and of the other plugins;
- styles and a script of the preview that apply only to its own elements;
- the side view ([R-SIDE-001](#r-side-001)).

The tests render the notes together with the markdown-it plugins of these
extensions, in both orders of the plugins: markdown-it-footnote,
markdown-it-emoji and markdown-it-task-lists in the major versions of the
extensions, the fences of Mermaid, and the frame of the GitHub styles around
the page. The rules of the notes run before the rules of markdown-it-footnote,
so that plugin never shows a note as a footnote, and the plugin of the
extension never renders the other footnotes itself: two footnote plugins
would write the list of the footnotes twice. A footnote in the text of a note
is a footnote of the page. The callout of a note gets no frame of the page. A
check in VS Code 1.143 with the five extensions of Matt Bierner showed the
emoji, the footnotes, the checkboxes, a Mermaid diagram and the GitHub styles
in the text and in the callouts.

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
place only, never in two (Hannes, 2026-10-28: "we only have one, either the
inline or the side view", [decision 7](#decisions)). The setting
`nimblescape.markdownNotes.showNotesIn` chooses it:

- `sideView` (the default): in the side view ([R-SIDE-001](#r-side-001)).
  The text editor shows no boxes and no `+` for a new note; the user adds a
  note in the side view ([R-SIDE-003](#r-side-003)). A click on a selection
  opens the side view ([R-SIDE-007](#r-side-007)).
- `inline`: in the boxes of the text editor ([R-TEXT-001](#r-text-001)). The
  side view and the button "Show or Hide Notes" do not show, and a click on
  the icon of a note in the preview opens the box of the note in the text
  editor ([R-PREV-003](#r-prev-003)).

The markers, the folds, the warnings and the preview stay in each case. A
value of an older version, `both`, counts as `sideView`.

### R-GEN-010

**Where a link of a note opens.** A click on a link to a file in the text of
a note opens the file in a new window of VS Code, so that the Markdown file
and its preview stay as they are (Hannes, 2026-10-28). This holds for the
callouts of the preview, the boxes of the text editor and the side view
([R-SIDE-005](#r-side-005)). The setting
`nimblescape.markdownNotes.openLinksIn` chooses the place:

- `newWindow` (the default): a new window of VS Code. A file that a tab of
  VS Code shows already opens in that tab, also in another window.
- `editor`: the editor of VS Code.
- `system`: the program of the system for the file, for example the PDF
  viewer. A file that is no document or image, which could be a program,
  opens only after the user agrees.

A web link or a mail link opens with the system in each case, and a link to a
place of the Markdown file itself in its editor. A link of a callout is a URI
of VS Code for the extension, and a link of a box runs a command of the
extension; the extension opens such a link only for a Markdown document that
is open in VS Code. The editor of a box shows the links as the file holds
them.

## Notes

### R-NOTE-001

**Syntax.** A note is a footnote of a Markdown file
([decision 8](#decisions)): a reference in the text, and a definition after
the block of the reference, whose first line is the header of the note
([R-NOTE-002](#r-note-002)). The body of the note follows in normal Markdown
syntax, with each line indented by four spaces:

```markdown
The agents <!--[note-7k2q-->change the work of teams[^note-7k2q] in three ways.

[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00

    Which three ways?
```

A footnote is a note only when its label has the form of the label of a note
([R-NOTE-003](#r-note-003)) and its first line is a header. Every other
footnote is no note: the extension shows it nowhere and never changes it.

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
A label never changes. It is not the number of the note
([R-TEXT-006](#r-text-006)), which changes when a note is added before it.

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
the order of the file, after the body of the answer. The side view and the
preview show the tree: the replies to a reply indented below it. The boxes of
the text editor show the answers in the order of the file, each reply to a
reply with the label "Reply to" and the author of that answer, because a box
of VS Code has no tree. GitHub shows the tree as nested block quotes.

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

**Selection of a note.** A note belongs to an exact passage of the text, its
selection, as a note in the PDF preview of Apple does (Hannes, 2026-10-28):
from its start marker `<!--[note-7k2q-->` to its reference `[^note-7k2q]`.
The user selects the passage in the text editor and adds the note
([R-EDIT-003](#r-edit-003)).

- The start marker is a comment inside the line, so it ends no paragraph, and
  GitHub and other renderers show the text without it.
- Without a start marker, the selection starts at the start of the text of
  the block of the reference: its paragraph, its heading or its table cell.
- A start marker directly before the reference makes a point, a note at a
  place of the text without a passage.
- A start marker never starts a line. GitHub (cmark-gfm) reads a comment at
  the start of a line as an HTML block, which ends the paragraph and shows the
  rest of the line without Markdown. When a selection starts at the start of
  a line, the start marker goes to the end of the line before it; at the
  start of the block the extension leaves it out.
- Selections can overlap.
- The text editor and the preview highlight the selection in the color of its
  note, and the funnel of the side view leads from the thread to its
  selection ([R-SIDE-007](#r-side-007)). The preview shows the icon of the
  note at its reference. In the preview the highlight is faint, and strong
  under the pointer and while the callout of the note shows (Hannes,
  2026-10-28: "selected text appears dimmed but a hover highlights it"). The
  selection of the note that the side view selects has a strong highlight
  and a frame in the color of the note, in the text editor and in the preview
  ([decision 10](#decisions)). While a note is selected, the other notes are
  dimmed: their highlights, their bars and markers in the text editor, and
  their icons in the preview (Hannes, 2026-10-28: "other notes shall be
  dimmed when one note is selected").
- In the text editor the start marker and the reference vanish: a thin bar in
  the color of the note stands at the start and at the end of the selection,
  and a dot at a point. They never show, also not on the line of the cursor,
  because the extension writes them and the user does not edit them (Hannes,
  2026-10-28: "there is no reason to make the markers editable at all"):
  - The cursor steps over a hidden marker as over one place: a move into a
    marker goes to its edge in the direction of the move, and past the
    markers that follow it directly; a click goes to the nearer edge.
  - Backspace and Delete next to a hidden marker delete the character on the
    other side of the marker, and the keys that delete a word
    (Ctrl+Backspace and Ctrl+Delete, on macOS Alt) the word there. No key
    deletes a part of a marker. Other edits of the file, for example "Find
    and Replace", still change the text as it is.
- A click with the mouse on the selection in the text editor selects the note
  in the side view, and no longer shows the markers (Hannes, 2026-10-28: "it
  shall not expand, it shall select the note in the side view").
- The box of the comments API of a note belongs to its selection, as the
  comment of a pull request belongs to its lines ([R-TEXT-001](#r-text-001)).

This is [decision 6](#decisions).

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
  specification: `<!-- nimblescape-markdown-notes format=1
  spec=https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/format.md`.
  Short lines of words follow, which tell an AI agent to read the
  specification before it reads, changes or adds a note, and the last line is
  `-->`. GitHub and the Markdown preview do not show the comment.
- The comment stands at the top of the file, with a blank line after it. It
  does not interfere with a front matter (Hannes: "it shall not interfere with
  frontmatter"): a YAML (`---`) or TOML (`+++`) front matter stays the first
  block of the file, and the comment follows it.
- The extension writes the comment as soon as it finds a note in a file that
  an editor shows, also in the modes "Markdown Preview" and "Markdown Editor"
  (Hannes, 2026-10-28: "as soon as a note is detected, the "DOCTYPE" is
  written"): when the file opens, and when a note appears in it. The file
  then has an unsaved change. Undo removes the comment for good until the
  file opens again. The setting `nimblescape.markdownNotes.addFormatComment` (on by
  default) turns this off; the comment then comes only with a change of a
  note.
- Each change of a note that the extension writes brings the comment too: the
  first note brings it, a comment of another text or version is written anew,
  and the last note takes it away with the blank line after it. Undo removes
  the comment with the note.
- A file without the comment has notes too, for example a file from before
  this version: the extension reads its notes as always
  ([decision 11](#decisions)).
- When the comment names a newer version of the format than the extension
  knows, the extension changes no note of the file and says why.
- The text editor folds the comment into its first line, as it folds a note
  ([R-TEXT-005](#r-text-005)).

## Text editor and Comments view

### R-TEXT-001

**Notes in the text editor.** The text editor shows each note of an open
Markdown file directly in the text, as the extension GitHub Pull Requests
shows the comments of a pull request: a box below the note that shows the
answers of the thread rendered as normal Markdown, each with its author and
date, and a mark in the gutter at the lines of the note. The extension uses
the comments API of VS Code for this. The boxes follow the text: after a
change of the file, each box moves with its note, and an open box stays open.

### R-TEXT-002

**Collapsible boxes.** Each box can be collapsed and expanded, as a comment
of a pull request can. The boxes are collapsed when a file opens; the setting
`nimblescape.markdownNotes.expandInEditor` opens them all. The lines of the
note itself collapse as in [R-TEXT-005](#r-text-005).

### R-TEXT-003

**Dimming after the cursor.** The text editor dims the part of the file that
the user does not work on (Hannes, 2026-10-28): while the cursor is outside
the notes, it dims the notes, so that the Markdown of the document stands out;
while the cursor is in a note, it dims everything outside this note, so that
the note stands out as a Markdown text of its own ([R-TEXT-004](#r-text-004)).

### R-TEXT-004

**Markdown inside a note.** Inside a note, the text editor works as in a
Markdown file of its own, "Markdown within Markdown" (Hannes, 2026-10-28):
the body of each answer has the highlighting of Markdown, also on the lines
that are indented by four spaces, which the Markdown grammar of VS Code shows
as a code block otherwise. The extension adds this with a grammar that is
injected into the Markdown grammar of VS Code ([R-GEN-007](#r-gen-007)).

### R-TEXT-005

**Collapsed notes.** A note can be collapsed, so that it vanishes from the
text editor and only a marker shows where it is (Hannes, 2026-10-28). The
editor folds the lines of the definition of the note together with the blank
lines before it into the last line of text before the note, so that this line
stays and the note does not. VS Code shows the end of this line with "⋯" and, after the
setting `editor.foldingHighlight`, with the background of a folded line. The marker is a note icon in the left margin of this line, in
the color of the note ([R-TEXT-006](#r-text-006)), at the place where GitHub
and VS Code show their comment markers. The folding arrow of VS Code next to
the marker opens the note again, and so does a move of the cursor into it.

VS Code reads the folds of all extensions again when an extension adds its
folding provider, and a fold during the reading before has no effect. At the
start of VS Code with a Markdown file open, the Markdown extension of VS Code
adds its provider after this extension collapsed the notes, so the notes
stayed open (Hannes, 2026-10-28). The extension therefore collapses the notes
again each time VS Code reads the folds of the unchanged file, for 10 seconds
after the first collapse.

- The fold keeps the blank lines after the note, so that the paragraph break
  after the block of the note stays.
- Notes with only blank lines between them share one fold.
- After a heading, a list, a block quote, a code block or HTML, the fold of
  the Markdown extension of VS Code starts on that line, so the fold of the
  note starts on the first blank line before the note and also takes the
  blank lines after it. One blank line stays where the text had one.
- A note in the first line of the file has no line before it; its first line
  stays with the marker, and the extension hides the text of that line.

Every note is collapsed when a file opens; the setting
`nimblescape.markdownNotes.collapseInEditor` with the value `false` keeps the
notes open. The title of the box of a note has the button "Hide Note Text"
while the text of the note shows in the editor, and "Show Note Text" while
it is folded (Hannes, 2026-10-28: the button "Collapse Note" looked like a
button that closes the box, and it did nothing while the text was folded
already). "Show Note Text" scrolls the editor to the note. The arrow at the
right of the title of the box closes the box. The Command Palette has the
commands "Collapse All Notes" and "Expand All Notes". A note that the user
adds stays open.

The setting `nimblescape.markdownNotes.keepNotesCollapsed` (off by default)
keeps the notes collapsed (Hannes, 2026-10-28: "with it disabled, clicking a
selection does not expand and there is no way to expand the notes in the text
view"). The notes collapse when a file opens, also with `collapseInEditor`
off, and nothing expands them: the buttons "Hide Note Text" and "Show Note
Text" and the command "Expand All Notes" do not show, and the commands that
expand a note do nothing. VS Code itself opens a fold for a click on its
arrow, for a search or for a cursor in it; the extension then moves the
cursor out of the note and collapses it again, after VS Code read the folds
of the current version of the file, so that the fold command acts on the
fold of the note and not on a fold around it. The text of the notes shows in
the side view, or in the boxes ([R-GEN-009](#r-gen-009)).

The cursor does not stay in the lines of a collapsed note, which VS Code
would open for it: a move down goes to the next line after the note, a move up
to the end of the line before it.

### R-TEXT-006

**Number and color of a note.** Each note of a file has a number, its place
in the file from the top, and a color from a list of six colors that show a
white number on light and on dark themes. The number and the color show in
the marker of the note in the left margin of the text editor, at the first
line of the note or at the line that stays of a collapsed note, as a mark in
the overview ruler of the editor, and at the thread in the side view
([R-SIDE-007](#r-side-007)). A note with a selection
([R-NOTE-006](#r-note-006)) has its marker at the last line of the
selection, and while the note is open also at the first line of the note.
VS Code tells an extension of no click on a marker in the left margin, so the
marker stands beside the comment mark of VS Code (the gray speech bubble) at
the last line of the selection, whose click opens and closes the box
(Hannes, 2026-10-28).

### R-TEXT-007

**Rendered header lines.** The extension writes the header of each answer
itself, and the user does not edit it (Hannes, 2026-10-28). The text editor
therefore shows each header line rendered, with the author and the date in
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
extension ([R-NOTE-005](#r-note-005)):

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
- a start marker at the start of a line, which ends the paragraph.

### R-VIEW-001

**Comments view.** The Comments view lists the notes of the open Markdown
files with their author, date and text, and the number of answers. A click on
a note goes to the note in the text editor.

## Side view

### R-SIDE-001

**The view "Notes".** The extension has a view "Notes" in the secondary
side bar, the side bar of VS Code that also holds the chat (Hannes,
2026-10-28). The view is not in the primary side bar, so that the Explorer
stays usable while the view is open. The container "Markdown Notes" of the
view is in the secondary side bar only; the user can still move the view as
any view of VS Code. The view lists the threads of the active Markdown
file, each with the answers rendered as Markdown, with author and date. The
active Markdown file is the file of the active text editor, or of the active
tab in the mode "Markdown Preview" or "Markdown Editor" of VS Code
([R-PREV-006](#r-prev-006)); another editor keeps the file of the view. It
shows the selected thread at its top: the note at the cursor of the text
editor, or the note that the user clicked in the preview
([R-PREV-003](#r-prev-003)) (Hannes, 2026-10-28: "selecting in the editor
shall always scroll the side view so the selected note is on top"). An empty
part after the last thread lets also the last thread scroll to the top.

### R-SIDE-002

**Note editor.** The side view is the editor of the notes. Each answer has
the buttons "Reply", "Edit" and "Delete", and each thread the button
"Answer", a reply to the note ([R-EDIT-005](#r-edit-005)). The view shows the
answers as a tree, with the date of each answer in the local time of the
reader and the local time of the author as its tooltip
([R-NOTE-002](#r-note-002), [R-NOTE-004](#r-note-004)). The editor
of an answer has the tabs "Visual" (the rendered text, which the user edits
directly, [R-SIDE-004](#r-side-004)), "Markdown" (the Markdown text) and
"Preview" (the text rendered as the preview renders it). "Save" (or
Ctrl+Enter) writes the text into the note
([R-EDIT-002](#r-edit-002)); "Cancel" keeps the note as it is.

### R-SIDE-003

**New note from the side view.** The side view has a button "Add Note" that
adds a note for the selection of the text editor, or at the line of its
cursor ([R-EDIT-003](#r-edit-003)).

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

**Link between a callout and its note.** When the side view is open, the
user sees which callout of the view belongs to which note of the text
(Hannes, 2026-10-28):

- **Badge:** each thread shows the badge with the number and the color of its
  note ([R-TEXT-006](#r-text-006)).
- **Common selection:** the selected thread of the view and its note in the
  text editor are highlighted together: the selection of the note has a
  strong highlight and a frame in its color, in the text editor and in the
  preview ([decision 10](#decisions)). A click on a thread selects its note
  and shows it where the file is open, and the focus stays in the view; the
  file keeps its mode (Hannes, 2026-10-28: "it shall stay in the mode the
  view is"):
  - in the text editor, the editor scrolls to the note, with the cursor at
    the start of its selection;
  - when no text editor shows the file but the Markdown preview does, the
    preview scrolls to the selection and highlights it;
  - in the mode "Markdown Editor" of VS Code, that editor selects the passage.

  A move of the cursor into a note or into its selection selects its thread,
  and a click with the mouse into a selection also opens the view when it is
  closed and the setting `showNotesIn` is `sideView`. The position of the cursor,
  not only its line, names the note, because the selections of several notes
  can share a line; of several selections at the position, the one that
  starts last is the note (Hannes, 2026-10-28: a click selected the note
  above).
- **Deselect:** a click with the mouse into the text outside the notes, in the
  text editor or in the preview ([R-PREV-003](#r-prev-003)), deselects the
  selected note (Hannes, 2026-10-28: "clicking somewhere in the text shall
  deselect the selected note"); a move of the cursor with the keys keeps it.
  In the view, a click on its empty part, outside the threads, or Escape
  outside an editor deselects it too.
- **Dimming:** while a thread is selected, the view dims the other threads;
  a thread under the pointer or with the focus shows clear.
- **Strip:** the left edge of the view, next to the editor, has a narrow
  strip that stands for the whole file, with a mark for each note and the
  part of the file that the text editor shows; for a note with a selection
  ([R-NOTE-006](#r-note-006)), the mark spans the lines of the selection.
- **Funnel:** a funnel leads from the selected thread to the passage of its
  note (Hannes, 2026-10-28: only the selected one; "the funnel shall stick to
  the position of the selected item so when the text scrolls it directs to
  the selected item", "the funnel shall point to the green selected area";
  [decision 12](#decisions)):
  - While a Markdown preview of the file shows, the preview draws a band in
    the color of the note from the passage to its right edge, and draws it
    again when the page scrolls. The band ends at the top, where the
    selected thread stands in the view, and the funnel of the view starts at
    this end, so that both form one band.
  - Else the funnel starts at the left edge of the view at the rows of the
    passage in the text editor, and follows them when the text scrolls.
  - While the editor shows no row of the passage, the funnel starts at the
    mark of the note in the strip.
- **Option:** the title of the view has a button that shows or hides the
  funnels (Hannes, 2026-10-28). The buttons "Show Funnels" and "Hide
  Funnels" change the setting `nimblescape.markdownNotes.showFunnels`, which
  is on by default.

VS Code lets no view draw into the text editor and tells no extension where a
line of the text is on the screen, so the funnel ends at the edge of the
view. VS Code tells an extension the rows that the text editor shows,
also inside a wrapped line; the extension counts the rows from there, so
the start of the funnel is exact without wrapped lines, apart from a part
of a row at the top. Where the editor wraps lines at its width, the
extension estimates the number of columns of a row from the rows that fill
the editor, and wraps the lines by words. The heights of the bars of VS Code
come from VS Code 1.143 with its default settings; the extension reads the
settings of the tabs, the breadcrumbs, the font and the wrapping, but not
other changes of the layout, for example an open panel below the editor.

## Editing

### R-EDIT-001

**Edit.** The user can edit each answer of a note: in the side view
([R-SIDE-002](#r-side-002)), and in the box of the text editor with the button
"Edit", which turns the answer into an editor of Markdown. This includes the
answers of other authors ([decision 2](#decisions)).

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

**Add a note.** The user adds a note to the selected text or at a line: with
the `+` of the text editor, as for the comment of a pull request (Hannes,
2026-10-28), or with "Add Note" of the side view. With selected text, the
note belongs to exactly this selection ([R-NOTE-006](#r-note-006)): the
extension writes the start marker before it, the reference after it, and the
definition after the outermost block of the selection
([R-NOTE-005](#r-note-005)). A selection that spans several blocks belongs to
the block of its end. Without selected text, on a line of a paragraph, a
heading, a list item or a table cell, the extension writes a point at the end
of the text of the line. On another line, for example in a code block or on a
blank line, the extension adds no note and says why. The new note has a new
label ([R-NOTE-003](#r-note-003)) and a header with the GitHub login of the
author ([R-GEN-006](#r-gen-006)) and the local date and time with the offset
of the zone ([R-NOTE-002](#r-note-002)). An empty text adds no note, and
"Cancel" in a new box leaves the file as it is.

### R-EDIT-004

**Delete.** The user deletes an answer with "Delete", also an answer of
another author ([decision 2](#decisions)). The extension removes the answer
from the note. Its replies stay: they move up one level and reply to the
answer that the removed answer replied to. After the first answer, its first
reply becomes the first answer. Deleting the only answer, or the whole thread
with "Delete Thread", removes the note: its definition with one blank line,
its reference and its start marker, and the last note also the comment of the
format ([R-NOTE-007](#r-note-007)). The editor of the file can undo the
change.

### R-EDIT-005

**Answer.** The user answers a thread: in the reply field of the box in the
text editor, or with "Answer" of the side view, which adds a reply to the
note. The button "Reply" of an answer, in the box and in the side view, adds
a reply to this answer. The extension writes the reply after the replies to
the same answer, one level deeper ([R-NOTE-004](#r-note-004)), with its own
header: the GitHub login of the author and the date and time
([R-NOTE-002](#r-note-002)).

## Markdown preview

### R-PREV-001

**Icon.** The built-in Markdown preview shows each note as a small,
unobtrusive icon at its reference in the text, at the end of its selection. A
note without a reference shows its icon in the left margin of the preview, at
the height of its definition. The icon shows the number of answers of a
thread with more than one answer. Outside the notes, the preview shows the
file as without the extension.

### R-PREV-002

**Callout on hover.** When the pointer rests on the icon, or the icon has the
keyboard focus, the preview shows the note as a rendered callout next to the
icon: a box with a colored bar at its left side, and each answer with its
author, its date in the local time of the reader with the local time of the
author as the tooltip ([R-NOTE-002](#r-note-002)), and its body rendered as
Markdown with the plugins of the preview. The replies to a reply show
indented below it ([R-NOTE-004](#r-note-004)). The callout uses the colors of
the theme of VS Code. The setting `nimblescape.markdownNotes.showCalloutOnHover`
(on by default) with the value `false` shows the callout only for the
keyboard focus, not while the pointer rests on the icon (Hannes,
2026-10-28). A click with the mouse on the icon shows no callout, also not
by the focus that the click gives the icon; it selects the note
([R-PREV-003](#r-prev-003)) (Hannes, 2026-10-28: "a click on an icon when
showCalloutOnHover off shall not show a callout").

### R-PREV-003

**Click opens the editor.** A click on the icon, or on the highlighted
selection of the note (Hannes, 2026-10-28: "clicking a selection shall select
the note in the sideview, not only clicking the icon"), opens the note in the
side view ([R-SIDE-001](#r-side-001)), where the user can edit and answer it.
A click on the text outside the selections while a note is selected
deselects it ([R-SIDE-007](#r-side-007)). The page of the preview stays as it
is (Hannes, 2026-10-28: "clicking a selection in preview breaks the view").
A click on a link or a button in the selection, a click that ends a
selection of text, and a double click, which opens the text editor, do what
they always do. The Markdown preview lets a page open only some kinds of
links, and VS Code passes a click to the extension only when the user clicks
a link; the icon is a link of the scheme `vscode://` to the extension, for
which VS Code may ask once whether the extension may open it. For a click on
the text, the script of the preview gives the content of the page such a
link for the time of the click, without a change of the page.

### R-PREV-004

**The text without the notes.** The preview shows the text without the
notes: the definition of a note leaves the page, and its reference and its
start marker leave the text, where the icon stands
([R-PREV-001](#r-prev-001)). A note never shows as a footnote, also with the
extension Markdown Footnotes ([R-GEN-008](#r-gen-008)), and every other
footnote shows as that extension shows it. The scrolling of the preview still
follows the lines of the text editor, and never uses a callout.

### R-PREV-005

**Show and hide the notes of the preview.** The title of the Markdown
preview has a button that shows or hides the notes (Hannes, 2026-10-28):
"Hide Notes in Preview" while the preview shows them, "Show Notes in Preview"
while it hides them. The button changes the setting
`nimblescape.markdownNotes.showInPreview`: in the settings of the workspace
when they hold a value, else in the settings of the user. Without the notes,
the preview shows the text without the notes ([R-PREV-004](#r-prev-004)), and
without icons and callouts. A change of the setting renders the open previews
again. By default, the preview shows the
notes ([decision 5](#decisions)).

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
  ([R-SIDE-006](#r-side-006)), "Hide Notes in Preview" or "Show Notes in
  Preview", and "Hide Note Icons in Preview" or "Show Note Icons in Preview"
  ([R-PREV-007](#r-prev-007)).
- **Markdown Editor** (the custom editor `vscode.markdown.editor`): the
  visual editor, which shows no notes ([R-GEN-001](#r-gen-001)). Its title
  has the button "Show or Hide Notes", and the side view shows the notes of
  the file.

In each mode, the side view follows the file, and a click on a thread keeps
the mode ([R-SIDE-007](#r-side-007)).

### R-PREV-007

**Show and hide the icons of the preview.** The title of the Markdown
preview has a button that hides or shows the icons of the notes and keeps
their highlighted passages (Hannes, 2026-10-28: "in preview mode, a icon
shall allow to hide the callout icons"): "Hide Note Icons in Preview" while
the preview shows the icons, "Show Note Icons in Preview" while it hides
them, both only while the preview shows the notes
([R-PREV-005](#r-prev-005)). The button changes the setting
`nimblescape.markdownNotes.showIconsInPreview`, on by default, as the button
of R-PREV-005 changes its setting. Without the icons, a click on a passage
still opens its note ([R-PREV-003](#r-prev-003)); a note without a passage,
a point, then shows in the side view only.

## Formatter

### R-FMT-001

**Format on save.** The extension brings its own Markdown formatter (Hannes,
2026-10-28: "guess the plugin must bring the own formatter", "it shall format
on save tables and other reasonable defaults"). The manifest makes it the
default formatter of Markdown files, with format on save. VS Code runs it on
"Format Document" and when a Markdown file is saved. The user turns it off with
the settings of VS Code for `[markdown]`: `editor.formatOnSave` set to
`false`, or another `editor.defaultFormatter`. The formatter changes only the
lines that it formats, in one edit, with the line breaks of the file, so
that Undo takes the whole change back.

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
- A start marker of a note at the start of a line joins the paragraph before
  it, and the line after it joins too, so that GitHub shows the paragraph
  with the passage ([R-NOTE-006](#r-note-006)).

### R-FMT-003

**What the formatter keeps.** The formatter keeps as they are: code blocks,
blocks of HTML (also comments and the comment of the format of the notes,
[R-NOTE-007](#r-note-007)), a front matter, blocks of math (`$$`),
containers (`:::`), setext headings and the notes. The definition of a
footnote stays on a line of its own. It reads the text as the
Markdown preview reads it, and keeps the text as it was when the formatted
text would show other blocks or another text in the preview.

### R-FMT-004

**The formatter on the command line.** Programs and AI agents that change a
Markdown file outside VS Code run the same formatter on the command line
(Hannes, 2026-10-28: "make the formatter accessible for agents"). The tool
`nimblescape-markdown-notes` is a script of Node.js 20 or later without
dependencies, built from the code of the formatter of
[R-FMT-001](#r-fmt-001) to [R-FMT-003](#r-fmt-003), so that it formats a file
as the extension does on save.

- `nimblescape-markdown-notes format <file>...` formats each file and
  writes only the files that change, with the line breaks and the byte order
  mark of the file.
- `--check` changes no file, writes `<file>: not formatted` to the standard
  error for each file that the formatter would change, and exits with 1.
- `-` in place of a file formats the standard input to the standard output.
- The exit code is 0 when all files are formatted, 1 when `--check` found a
  file to format, and 2 for an unknown command or option, no file, or a file
  that cannot be read or written; the tool then still formats the other
  files.
- `--help` shows the help, and `--version` the version of the tool and of the
  format of the notes ([R-NOTE-007](#r-note-007)).

The specification of the format of the notes for AI agents
([docs/format.md](format.md)) tells agents to run the tool after a change of
a file with notes.

## Decisions

Hannes decided these questions on 2026-10-28. The requirements above follow
them.

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
   hides them.
6. **Form of a selection** ([R-NOTE-006](#r-note-006)): a hidden start marker
   with the label of the note before the passage, and the reference of the
   note as its end. The other choices were a quote of the passage in the
   note, which no longer finds the passage after a change of it or when the
   passage occurs twice, and a second hidden marker at the end.
7. **Where the text of a note shows** ([R-TEXT-001](#r-text-001),
   [R-SIDE-001](#r-side-001), [R-GEN-009](#r-gen-009)): in one place only,
   the side view by default, and the setting `showNotesIn` chooses the boxes
   of the comments API in the text editor instead (Hannes, 2026-10-28: "by
   default we always open the side view", "we only have one, either the
   inline or the side view"). Before, both showed by default (Hannes, 12:00),
   and the setting also chose both (Hannes, 14:55). The other choices were the
   side view with a setting for the boxes that is off by default, and the
   boxes with the Comments panel of VS Code without the side view.
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
10. **The passage of the selected note** ([R-SIDE-007](#r-side-007),
    [R-NOTE-006](#r-note-006), Hannes, 2026-10-28: "the funnel shall go to
    the selection not the side bar"): VS Code lets no view draw into the text
    editor, so the funnel stays between the thread and the strip of the view,
    and the selection of the selected note gets a strong highlight and a
    frame in its color in the text editor and in the preview. VS Code tells
    an extension which lines the editor shows, not where they stand on the
    screen, so a funnel cannot end exactly at the passage. The other choices
    were a funnel without the strip that ends at the edge of the view at an
    estimated height, which is wrong where lines wrap, and the strong
    highlight without the strip and the funnel.
11. **Place of the comment of the format** ([R-NOTE-007](#r-note-007),
    Hannes, 2026-10-28, 16:32): the comment stands at the top of the file, after a
    front matter, and the notes of a file without it work as before. The
    other choices were the top with notes only in files that hold the
    comment, which hides the notes of older files, and the end of the file,
    where a program finds it only after it read the whole file.
12. **The funnel reaches the passage** ([R-SIDE-007](#r-side-007), Hannes,
    2026-10-28, 17:16, confirmed 17:21): the preview draws its part of the
    funnel, a band from the passage to its right edge that follows the
    scrolling, and the side view continues it to the thread; the two parts
    meet at the top, where the selected thread stands. In the text editor,
    the funnel starts at the rows of the passage, which the extension
    computes from the visible lines, an estimate where lines wrap. This
    replaces the part of decision 10 that keeps the funnel at the strip. The
    other choices were the start at the computed rows in the text editor
    only, with the strip in the preview, and the strip in both.

---

© 2026 Hannes Stauss (scalarion@nimblescape.com) ·
[MIT License](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/LICENSE).
