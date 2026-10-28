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

## General

### R-GEN-001

**Built-in editors.** The extension extends the editors that VS Code has for
Markdown files: the text editor, the Comments view and the Markdown preview.
It adds one view of its own, the side view of [R-SIDE-001](#r-side-001). It
changes no other part of a Markdown file than the parts of a note: its
definition, its reference and its start marker.

The Markdown Editor of VS Code (the visual editor `vscode.markdown.editor`)
offers extensions no stable API to show or edit content there: its comments
come from the proposed API `agentEditorComments`, which only extensions of
VS Code may use, and its only contribution point is
`markdown.codeBlockEditorProviders` for code blocks. Until VS Code offers a
stable API, the extension does not show notes in the Markdown Editor
([R-GEN-002](#r-gen-002)). The notes stay in the file there as they are.

### R-GEN-002

**Marketplace rules.** The extension follows the rules of the Visual Studio
Marketplace. It uses no proposed VS Code API, because the Marketplace does
not accept extensions that use one. It supports VS Code 1.125 and later.

### R-GEN-003

**Restricted Mode and privacy.** The extension works in Restricted Mode and in
virtual workspaces. It runs no program and collects no telemetry. Its own code
connects to no address; the sign-in of [R-GEN-006](#r-gen-006) goes through the
GitHub authentication of VS Code. It changes a file only when the user saves,
adds, answers or deletes a note.

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
  note at its reference, and the highlight is stronger while the callout of
  the note shows.
- In the text editor the start marker and the reference vanish: a thin bar in
  the color of the note stands at the start and at the end of the selection,
  and a dot at a point. On the line of the cursor they show as they are,
  dimmed, so that the cursor never moves through hidden text (Hannes,
  2026-10-28).
- The box of the comments API of a note belongs to its selection, as the
  comment of a pull request belongs to its lines ([R-TEXT-001](#r-text-001)).

This is [decision 6](#decisions).

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
notes open. The box of a note has the button "Collapse Note", and the
Command Palette has the commands "Collapse All Notes" and "Expand All Notes".
A note that the user adds stays open.

### R-TEXT-006

**Number and color of a note.** Each note of a file has a number, its place
in the file from the top, and a color from a list of six colors that show a
white number on light and on dark themes. The number and the color show in
the marker of the note in the left margin of the text editor, at the first
line of the note or at the line that stays of a collapsed note, as a mark in
the overview ruler of the editor, and at the thread in the side view
([R-SIDE-007](#r-side-007)). A note with a selection
([R-NOTE-006](#r-note-006)) has its marker at the first line of the
selection, and while the note is open also at the first line of the note.

### R-TEXT-007

**Rendered header lines.** The extension writes the header of each answer
itself, and the user does not edit it (Hannes, 2026-10-28). The text editor
therefore shows each header line rendered, with the author and the date in
the local time of the reader, for example "hannes · 2026-10-28 10:15", and
the local time of the author as its hover ([R-NOTE-002](#r-note-002)). The
label of the first answer and the markup of the header vanish with it; the
quote markers of a reply stay. On the line of the cursor, the header line
shows as it is, for a correction by hand.

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
any view of VS Code. The view lists the threads of the active Markdown file, each with the answers rendered
as Markdown, with author and date. It shows and scrolls to the selected
thread: the note at the cursor of the text editor, or the note that the user
clicked in the preview ([R-PREV-003](#r-prev-003)).

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
view opens the link, as a click in the Markdown preview does:

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
  text editor are highlighted together. A click on a thread selects its note
  and scrolls the text editor to it, with the cursor at the start of its
  selection, and the focus stays in the view; a move of the cursor into a
  note or into its selection selects its thread.
- **Funnel:** the left edge of the view, next to the text editor, has a
  narrow strip that stands for the whole file, with a mark for each note and
  the part of the file that the text editor shows. A funnel leads from each
  thread to the mark of its note; for a note with a selection
  ([R-NOTE-006](#r-note-006)), the mark and the funnel span the lines of the
  selection (Hannes, 2026-10-28).
- **Option:** the title of the view has a button that shows or hides the
  funnels (Hannes, 2026-10-28). The buttons "Show Funnels" and "Hide
  Funnels" change the setting `nimblescape.markdownNotes.showFunnels`, which
  is on by default.

VS Code lets no view draw into the text editor and tells no extension where a
line of the text is on the screen, so the funnel ends at the edge of the
view.

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
stays as it is. A note in a block quote or in a list item keeps the markers of
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
its reference and its start marker. The editor of the file can undo the
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
the theme of VS Code.

### R-PREV-003

**Click opens the editor.** A click on the icon opens the note in the side
view ([R-SIDE-001](#r-side-001)), where the user can edit and answer it. The
Markdown preview lets a page open only some kinds of links; the icon is a link
of the scheme `vscode://` to the extension, for which VS Code may ask once
whether the extension may open it.

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
   [R-SIDE-001](#r-side-001)): for now both, the boxes of the comments API
   in the text editor and the side view (Hannes, 12:00). The other choices
   were the side view alone, with a setting for the boxes that is off by
   default, and the boxes with the Comments panel of VS Code without the
   side view.
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

---

© 2026 Hannes Stauss (scalarion@nimblescape.com) ·
[MIT License](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/LICENSE).
