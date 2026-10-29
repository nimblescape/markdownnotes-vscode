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
| 20 | The comment of the format at the top of each file with notes, with the link to the specification for AI agents, written as soon as an editor shows a file with notes, and the setting `addFormatComment` | [R-NOTE-007](#r-note-007) | done |
| 21 | A click on a highlight of the preview that keeps the page, no callout on a click, a click outside a highlight that deselects the note, the selected thread at the top of the view, the other notes dimmed, the faint highlights of the preview, the setting `showIconsInPreview`, the Markdown formatter | [R-NOTE-006](#r-note-006), [R-SIDE-001](#r-side-001), [R-SIDE-007](#r-side-007), [R-PREV-002](#r-prev-002), [R-PREV-003](#r-prev-003), [R-PREV-007](#r-prev-007), [R-FMT-001](#r-fmt-001) to [R-FMT-003](#r-fmt-003) | done; the setting `showIconsInPreview` dropped in step 24 |
| 22 | The funnel that follows the highlight of the selected note: the band of the preview from the highlight to its right edge, and the start of the funnel at the rows of the highlight in the text editor | [R-SIDE-007](#r-side-007) | done; replaced in step 24 |
| 23 | The formatter on the command line for programs and AI agents as the npm package `@nimblescape/markdown-notes`, and its call in the specification of the format | [R-FMT-004](#r-fmt-004) | done; on npmjs.com after the first release |
| 24 | The side view as the only place of the notes, aligned to the text editor, with a line only for the selected thread; the highlights of the notes in colors with good contrast, the buttons "Show Highlights" and "Hide Highlights", the highlight under the pointer, no highlights while the side view is closed; a start marker with `<wbr>` and the color for every note; the hover over the selected text with the colors, which adds a note; the text view and the color of a thread, icon buttons; no boxes, Comments view, callouts, icons of the preview, markers in the left margin and funnels | [R-GEN-009](#r-gen-009), [R-GEN-011](#r-gen-011), [R-NOTE-006](#r-note-006), [R-TEXT-005](#r-text-005), [R-TEXT-006](#r-text-006), [R-SIDE-002](#r-side-002), [R-SIDE-007](#r-side-007), [R-EDIT-003](#r-edit-003), [R-EDIT-006](#r-edit-006), [R-PREV-001](#r-prev-001), [R-PREV-005](#r-prev-005), [R-FMT-002](#r-fmt-002) | done |
| 25 | The fixes of the code review: no change from an outdated side view, the open editors and the selected note kept after a change of a setting, no inline styles in the side view, links of the preview only to the extension | [R-EDIT-007](#r-edit-007), [R-SIDE-002](#r-side-002), [R-PREV-003](#r-prev-003) | done |
| 26 | Format on save only for a Markdown file with notes or with the comment of the format, and the setting `formatOnSave` | [R-FMT-001](#r-fmt-001) | done |

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
  that the note is about, while the side view is open
  ([R-GEN-011](#r-gen-011)), and a click on a highlight selects its note in
  the side view and opens the side view when it is closed
  ([R-SIDE-007](#r-side-007)).

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
- The highlights show only while the side view "Notes" is open (Hannes,
  2026-10-28: "closing the side view, also hides the highlights"). Closing the
  side view hides them and does not change the setting; opening it shows
  them again.
- The title of the text editor and of the preview of a Markdown file has the
  button "Hide Highlights" (a closed eye) while the highlights show, which
  turns the setting off, and else the button "Show Highlights" (an open eye),
  which turns the setting on and opens the side view. The button changes the
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

A change of the setting renders the open previews again.

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
- While the side view is open and the setting `showHighlights` is on
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
  also on a hidden highlight, selects its note in the side view, and opens
  the side view when it is closed (Hannes, 2026-10-28: "hovering over a
  highlight and clicking it opens the side view"). In the text editor the
  cursor stays in the text.

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

**Collapsed notes.** The text editor never shows the text of a note (Hannes,
2026-10-28: "in the text view we never show the notes and the markers"):
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
the button with the color of a thread opens the colors, and the hover over
the selected text offers them for a new note ([R-EDIT-006](#r-edit-006)).
The six colors are blue (the default), green, orange, purple, red and teal,
which show on light and on dark themes. The file keeps the
color in the start marker of the note, after its label, for example
`<wbr><!--[note-7k2q green-->`; the default color has no name in the marker
([R-NOTE-006](#r-note-006), [decision 16](#decisions)). The color shows in
the highlight of the note in the text editor and in the preview, in its mark
in the overview ruler, and at the thread and at its mark in the side view
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
([R-PREV-006](#r-prev-006)); another editor keeps the file of the view. The
selected thread is the note at the cursor of the text editor, or the note
that the user clicked in the preview ([R-PREV-003](#r-prev-003)).

While a text editor shows the file, the view stands aligned to it
([R-SIDE-007](#r-side-007)). While no text editor shows the file, for
example in the Markdown preview, the view lists the threads with the file
and the GitHub account at its top, and shows the selected thread at its top
(Hannes, 2026-10-28: "selecting in the editor shall always scroll the side
view so the selected note is on top"); an empty part after the last thread
lets also the last thread scroll to the top.

### R-SIDE-002

**Note editor.** The side view is the editor of the notes. Its buttons are
small icons with a tooltip, the codicons of VS Code, as the buttons in the
title of an editor of VS Code (Hannes, 2026-10-28: "exchange all the buttons
on the note editor with icons", "similar as the header icons of the tab where
you dan switch between preview and text mode"):

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
rendered as the preview renders it). "Save" (or Ctrl+Enter) writes the text
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
"Add Note" of the editor adds no note. The hover over the selected text opens
the same editor with the color that the user chose there
([R-EDIT-006](#r-edit-006)).

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
2026-10-28). The view stands aligned to the text editor, as the compare view
of VS Code shows two texts side by side ([decision 14](#decisions)):

- **Aligned threads:** while a text editor shows the file, each thread
  stands at the height of the rows of its highlight in the text editor, and
  moves with the text when the editor scrolls. Threads that would overlap
  move apart: the thread that the user works on stays at its highlight, the
  editor of a new note or else the selected thread or else the first thread
  whose highlight the editor shows; the threads before it move up and the
  threads after it move down. The editor of a new note stands at the row of
  the cursor. The view does not scroll itself: the mouse wheel over the view
  scrolls the text editor.
- **Marks and connection:** the left edge of the view, next to the editor,
  has a mark in the color of each note at the rows of its highlight. Only the
  selected thread has a line from its mark to the thread (Hannes,
  2026-10-28: "only the selected one has the connection").
- **Common selection:** the selected thread of the view and its note in the
  text are highlighted together: the highlight of the note is strong, with a
  frame in its color, in the text editor and in the preview
  ([decision 10](#decisions)), also while the other highlights are hidden
  ([R-GEN-011](#r-gen-011)). A click on a thread selects its note and shows
  it where the file is open, and the focus stays in the view; the file keeps
  its mode (Hannes, 2026-10-28: "it shall stay in the mode the view is"):
  - in the text editor, the editor scrolls to the note, with the cursor at
    the start of its highlight;
  - when no text editor shows the file but the Markdown preview does, the
    preview scrolls to the highlight;
  - in the mode "Markdown Editor" of VS Code, that editor selects the text of
    the highlight.

  A move of the cursor into a highlight selects its thread, and a click with
  the mouse on a highlight also opens the view when it is closed
  ([R-NOTE-006](#r-note-006)). The position of the cursor, not only its
  line, names the note, because the highlights of several notes can share a
  line; of several highlights at the position, the one that starts last is
  the note (Hannes, 2026-10-28: a click selected the note above).
- **Deselect:** a click with the mouse into the text outside the highlights,
  in the text editor or in the preview ([R-PREV-003](#r-prev-003)),
  deselects the selected note (Hannes, 2026-10-28: "clicking somewhere in the
  text shall deselect the selected note"); a move of the cursor with the keys
  keeps it. In the view, a click on its empty part, outside the threads, or
  Escape outside an editor deselects it too.
- **Dimming:** while a thread is selected, the view dims the other threads;
  a thread under the pointer or with the focus shows clear.

VS Code lets no view draw into the text editor, and tells no extension where
a line of the text is on the screen, so the line of the selected thread ends
at the edge of the view. VS Code tells an extension the rows that the text
editor shows, also inside a wrapped line; the extension counts the rows from
there, so the places of the threads are exact without wrapped lines, apart
from a part of a row at the top. Where the editor wraps lines at its width,
the extension estimates the number of columns of a row from the rows that
fill the editor, and wraps the lines by words. The heights of the bars of
VS Code come from VS Code 1.143 with its default settings; the extension
reads the settings of the tabs, the breadcrumbs, the font and the wrapping,
but not other changes of the layout, for example an open panel below the
editor. The Markdown preview tells an extension no place of its text, so the
view stands aligned only to the text editor; next to the preview, it lists
the threads ([R-SIDE-001](#r-side-001)).

The badges with the number of a note, the strip of the whole file and the
funnels of earlier versions ([decision 12](#decisions)), with the setting
`showFunnels`, are dropped.

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
editor and adds the note: with a color of the hover over the selected text
([R-EDIT-006](#r-edit-006)), or with "Add Note" in the title of the side view
or in the context menu of the text editor ([R-SIDE-003](#r-side-003)). The
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
reply becomes the first answer. Deleting the only answer, or the whole thread
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

**Hover over the selected text.** When the user selects text in the text
editor, a hover over the selected text offers to add a note (Hannes,
2026-10-28: "selecting text shows a hover over the selected text with color
icons that allow to create the note"):

- The hover shows "Add Note" and an icon of each color of the notes
  ([R-TEXT-006](#r-text-006)), each with the name of its color as its
  tooltip. A click on an icon opens the editor of a new note in the side view
  in this color, and opens the side view when it is closed
  ([R-SIDE-003](#r-side-003)); the note is added when the user saves its
  text.
- The hover shows 600 milliseconds after the user stopped selecting the text
  with the mouse or the keys, at the cursor, which stands at an edge of the
  selection, and also while the pointer rests on the selected text.
- It shows only for one selection that starts and ends in one block of text
  that a note can highlight, in a Markdown file that the extension can
  change, and not after a command or an edit changed the selection, so that
  "Select All" shows no hover.
- The hover takes no focus, so the keys keep working in the text editor, and
  Escape or a move of the cursor closes it as any hover of VS Code.

The hover is a hover of VS Code, which shows only Markdown: each icon is a
codicon in the color of its note, and a link that runs the command "Add
Note" with the name of the color.

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

## Markdown preview

### R-PREV-001

**Highlights in the preview.** The built-in Markdown preview shows the
highlight of each note ([R-NOTE-006](#r-note-006)) in the color of the note,
with a background and a line below the text, while the side view is open and
the setting `showHighlights` is on ([R-GEN-011](#r-gen-011)). The highlight
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
under the pointer, selects its note in the side view
([R-SIDE-001](#r-side-001)), and opens the side view when it is closed
(Hannes, 2026-10-28: "hovering over a highlight and clicking it opens the
side view"), where the user can edit and answer the note. A click on the text
outside the highlights while a note is selected deselects it
([R-SIDE-007](#r-side-007)). The page of the preview stays as it is (Hannes,
2026-10-28: "clicking a selection in preview breaks the view"). A click on a
link or a button in the highlight, a click that ends a selection of text, and
a double click, which opens the text editor, do what they always do.

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

## Formatter

### R-FMT-001

**Format on save.** The extension brings its own Markdown formatter (Hannes,
2026-10-28: "guess the plugin must bring the own formatter", "it shall format
on save tables and other reasonable defaults"). The manifest makes it the
default formatter of Markdown files, so VS Code runs it on "Format Document"
for every Markdown file. A save formats only a Markdown file with notes or
with the comment of the format ([R-NOTE-007](#r-note-007)), so that the
Markdown files of other projects keep their text (Hannes, 2026-10-29: "Only
files with notes", [decision 19](#decisions)). The save of such a file
formats it while the setting `nimblescape.markdownNotes.formatOnSave` is on
(the default), unless:

- the save is an automatic save after a delay, which VS Code also saves
  without its format on save, or "Save without Formatting";
- the user turned on `editor.formatOnSave` for Markdown, so that VS Code
  runs the formatter on each save itself, of every Markdown file;
- the user chose another `editor.defaultFormatter` for Markdown.

The formatter changes only the lines that it formats, in one edit, with the
line breaks of the file, so that Undo takes the whole change back.

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
`markdown-notes` is a script of Node.js 22 or later without dependencies,
built from the code of the formatter of
[R-FMT-001](#r-fmt-001) to [R-FMT-003](#r-fmt-003), so that it formats a file
as the extension does on save.

- `markdown-notes format <file>...` formats each file and
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

The command is the npm package `@nimblescape/markdown-notes` in the folder
`cli/` of this repository, as the npm package `@nimblescape/typescript` of
the extension nimblescape TypeScript (Hannes, 2026-10-28: "same as with the
typescript extension, we have the extension and the npm package in the same
repo and publish it to npmjs"). It has the version of the extension, and the
release publishes it to npmjs.com, so that
`npx -y @nimblescape/markdown-notes format <file>` runs it without an
installation. The specification of the format of the notes for AI agents
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
    selected one has the connection"). The places are estimates where lines
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
    offers the colors for a new note. Closing the side view keeps the
    setting, and "Show Highlights" also opens the side view, so that one
    click shows the highlights.
19. **Format on save only for files with notes** ([R-FMT-001](#r-fmt-001),
    Hannes, 2026-10-29, option "Only files with notes" of decision D1 of the
    code review): a save formats only a Markdown file with notes or with the
    comment of the format; "Format Document" still formats every Markdown
    file. The code review found that the format on save of every Markdown
    file changed 74 % of 436 README and CHANGELOG files on their first save,
    also in projects without notes. The other choices were format on save
    for every Markdown file, as before, and no format on save by default.

---

© 2026 Hannes Stauss (scalarion@nimblescape.com) ·
[MIT License](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/LICENSE).
