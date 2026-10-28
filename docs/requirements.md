<!--
SPDX-License-Identifier: MIT
© 2026 Hannes Stauss (scalarion@nimblescape.com)
Licensed under the MIT License. See LICENSE in the repository root for details.
-->

# Requirements

This document lists what nimblescape Markdown Notes must do. Each requirement
has an ID as its heading, so that code, tests and pull requests can link to
it, for example `[R-NOTE-001](docs/requirements.md#r-note-001)`.

The extension adds notes to Markdown files. A note is an HTML comment in the
Markdown text, so the file stays plain Markdown: every Markdown tool that
hides HTML comments, for example GitHub, shows the file without the notes.
Several authors can answer a note, so a note is a thread of answers. VS Code
shows the notes in the text editor, in the Comments view, in a side view of
the extension and in the Markdown preview.

## Plan

| Step | Content | Requirements | State |
| --- | --- | --- | --- |
| 1 | Setup: manifest, build, CI, release workflows, license notices, the same structure as the other nimblescape extensions | [R-GEN-001](#r-gen-001) to [R-GEN-005](#r-gen-005) | done |
| 2 | The note `<!-- note`, its front matter, no comment in a note | [R-NOTE-001](#r-note-001) to [R-NOTE-003](#r-note-003) | done |
| 3 | The text editor and the Comments view: show, edit, save, add and delete notes | [R-TEXT-001](#r-text-001), [R-VIEW-001](#r-view-001), [R-EDIT-001](#r-edit-001) to [R-EDIT-004](#r-edit-004) | done, changes in step 7 |
| 4 | The Markdown preview: callouts | [R-PREV-001](#r-prev-001) | done, changes in step 8 |
| 5 | Name `nimblescape-markdown-notes`, GitHub sign-in for the author | [R-GEN-005](#r-gen-005), [R-GEN-006](#r-gen-006), [R-NOTE-002](#r-note-002) | done |
| 6 | Inline notes `<!-- note inline`, threads of answers | [R-NOTE-004](#r-note-004), [R-NOTE-005](#r-note-005), [R-EDIT-005](#r-edit-005) | done |
| 7 | Text editor: dimmed comment source, collapsible notes as in GitHub pull requests | [R-TEXT-001](#r-text-001) to [R-TEXT-003](#r-text-003) | done |
| 8 | Preview: icon, callout on hover, click opens the editor, inline notes removed with their blanks | [R-PREV-001](#r-prev-001) to [R-PREV-005](#r-prev-005) | done |
| 9 | Side view: the note editor | [R-SIDE-001](#r-side-001) to [R-SIDE-003](#r-side-003) | done |
| 10 | Tests, tests in a real VS Code, README, user guide, screenshot | all | done |
| 11 | Links in the side view, the side view in the secondary side bar with the buttons that show and hide it, the button of the preview, inline notes without breaks | [R-SIDE-001](#r-side-001), [R-SIDE-005](#r-side-005), [R-SIDE-006](#r-side-006), [R-NOTE-005](#r-note-005), [R-PREV-004](#r-prev-004), [R-PREV-005](#r-prev-005) | done |
| 12 | Text editor: Markdown inside the notes, dimming after the cursor, collapsed notes with a marker, rendered front matter | [R-TEXT-003](#r-text-003) to [R-TEXT-007](#r-text-007) | in progress: dimming, collapsed notes, markers and rendered front matter done |
| 13 | Number and color of each note, common selection, funnels | [R-TEXT-006](#r-text-006), [R-SIDE-007](#r-side-007) | done |
| 14 | Visual editing of the rendered Markdown in the side view | [R-SIDE-002](#r-side-002), [R-SIDE-004](#r-side-004) | planned |
| 15 | Tests together with other Markdown extensions | [R-GEN-007](#r-gen-007) | done |
| 16 | Notes for an exact selection of the text | [R-NOTE-006](#r-note-006), [R-EDIT-003](#r-edit-003) | done; the command that converts inline notes waits for the decision on the storage form (footnotes are under study) |

## General

### R-GEN-001

**Built-in editors.** The extension extends the editors that VS Code has for
Markdown files: the text editor, the Comments view and the Markdown preview.
It adds one view of its own, the side view of [R-SIDE-001](#r-side-001). It
changes no other part of a Markdown file than the comment of a note.

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
  only inside the comment of a note ([R-TEXT-004](#r-text-004));
- a markdown-it plugin that changes only the comments that are notes, and
  gives every other token to the rules of the preview and of the other
  plugins;
- styles and a script of the preview that apply only to its own elements;
- the side view ([R-SIDE-001](#r-side-001)).

The tests render the notes together with the markdown-it plugins of these
extensions, in both orders of the plugins: markdown-it-footnote,
markdown-it-emoji and markdown-it-task-lists in the major versions of the
extensions, the fences of Mermaid, and the frame of the GitHub styles around
the page. The body of a note is a Markdown text of its own: it has its own
footnotes, with IDs of their own, and gets no frame of the page. A check in
VS Code 1.143 with the five extensions of Matt Bierner showed the emoji, the
footnotes, the checkboxes, a Mermaid diagram and the GitHub styles in the
text and in the callouts.

## Notes

### R-NOTE-001

**Syntax.** A note is an HTML comment of a Markdown file that starts with
`<!-- note` or `<!-- note inline` on a line of its own. The text of the note
starts on the next line: a front matter ([R-NOTE-002](#r-note-002)), which is
optional in a note that a person writes by hand, then the body in normal
Markdown syntax. The comment ends with `-->`, on a line of its own when the
extension writes it.

```markdown
<!-- note
---
author: hannes
date: 2026-10-28T10:15+01:00
---
The body of the note, in **Markdown**.
-->
```

The words `note` and `inline` may be in small or capital letters. Every
other comment is no note: the extension shows it nowhere and never changes
it.

- `<!-- note` is a **block note**. It stands between the blocks of the file,
  also in a block quote or in a list item.
- `<!-- note inline` is an **inline note** ([R-NOTE-005](#r-note-005)). It
  belongs to the text of a paragraph.

The extension finds the notes as the Markdown preview does, with markdown-it
and the options of the preview. So a comment in a code block, in a code span,
in the front matter of the document and in a block of other HTML is no note.

### R-NOTE-002

**Front matter.** Each answer of a note starts with a front matter: a line
`---`, lines of the form `name: value`, and a line `---`. The field `author`
holds the GitHub login of the author ([R-GEN-006](#r-gen-006)), and the field
`date` the date and time of the answer in a form of ISO 8601, for example
`2026-10-28T10:15+01:00`. A date without a zone is local time. A date of
another form shows as written. The extension keeps the other fields and the
whole front matter as they are when it saves an answer.

### R-NOTE-003

**No comment in a note.** The text of a note must not contain another
comment: not the start of a comment `<!--`, not its end `-->`, and not
`--!>`, at which a browser ends a comment too. The extension refuses to write
such a text: it shows why and keeps the text in the editor. A note in a file
that already contains `<!--` gets a warning in the text editor and the
Problems view, and the preview shows its text as it is, so that the rest of
the page stays visible.

### R-NOTE-004

**Threads.** Different authors can answer a note. A note is therefore a
thread: its first answer and the answers after it, in the order of the file.
Each answer has its own front matter with its author and date, and its own
body. One comment holds the whole thread:

```markdown
<!-- note
---
author: hannes
date: 2026-10-28T10:15+01:00
---
Check the dates.
---
author: anna
date: 2026-10-28T11:02+01:00
---
Friday works.
-->
```

A line `---` that is followed by field lines and a closing `---` starts the
next answer. The text editor, the side view and the preview show the answers
of a thread one below the other, each with its author and date. One comment
per thread is [decision 1](#decisions).

### R-NOTE-005

**Inline notes.** An inline note `<!-- note inline` belongs to a place in the
text of a paragraph. It can stand on lines of its own between two lines of
the paragraph, or start after the text of a line:

```markdown
Version 2.0 comes out in November.
<!-- note inline
---
author: hannes
date: 2026-10-28T10:15+01:00
---
Which day exactly?
-->
The beta starts one week before.
```

In Markdown, a comment that starts a line ends the paragraph before it. An
inline note never ends a paragraph (Hannes, 2026-10-28): the blanks before
and after it (spaces, tabs, line breaks and blank lines) belong to the note.
The rendered view therefore removes the inline note together with these
blanks, so that the text before and after the note is one paragraph, with one
space and without a line break between the two parts
([R-PREV-004](#r-prev-004)). The place of the note shows as an icon
([R-PREV-001](#r-prev-001)). A collapsed inline note vanishes from the text
editor in the same way ([R-TEXT-005](#r-text-005)). A note between two
paragraphs that keeps them apart is a block note `<!-- note`.

### R-NOTE-006

**Selection of a note.** A note can belong to an exact passage of the text,
its selection, as a note in the PDF preview of Apple does (Hannes,
2026-10-28). The user selects the passage in the text editor and adds the
note; the extension writes two hidden markers around the passage and the ID
of the selection into the front matter of the note, which stands after the
paragraph of the passage:

```markdown
The agents <!--[a3-->change the work of teams<!--a3]--> in three ways.

<!-- note
---
author: hannes
date: 2026-10-28T11:45+01:00
selection: a3
---
Which three ways?
-->
```

- The markers are comments inside the line, so they end no paragraph, and
  GitHub and other renderers show the text without them.
- The ID is short and unique in the file, and it never changes. It is not the
  number of the note ([R-TEXT-006](#r-text-006)), which changes when a note is
  added before it.
- Selections can overlap, and a note without `selection` stays as it is.
- A marker never starts a line. GitHub (cmark-gfm) reads a comment at the
  start of a line as an HTML block, which ends the paragraph and shows the
  rest of the line without Markdown. When a selection starts at the start of
  a line, the opening marker goes to the end of the line before it; at the
  start of a paragraph the extension leaves it out, and the selection starts
  at the start of the paragraph.
- A note at a place in the text, without a passage, has one point marker
  `<!--[a4]-->`, a selection without text. New notes in the text use this form
  in place of an inline note `<!-- note inline` ([R-NOTE-005](#r-note-005)),
  which the extension still reads.
- The text editor and the preview highlight the selection in the color of its
  note, and the funnel of the side view leads from the thread to its
  selection ([R-SIDE-007](#r-side-007)). The preview shows the icon of the
  note at the end of the selection, or at the point, and the highlight is
  stronger while the callout of the note shows.
- In the text editor the markers vanish: a thin bar in the color of the note
  stands at the start and at the end of the selection, and a dot at a point.
  On the line of the cursor the markers show as they are, dimmed, so that the
  cursor never moves through hidden text (Hannes, 2026-10-28).
- The box of the comments API of a note with a selection belongs to the
  selection, as the comment of a pull request belongs to its lines
  ([R-TEXT-001](#r-text-001)).

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

**Markdown inside a note.** Inside the comment of a note, the text editor
works as in a Markdown file of its own, "Markdown within Markdown" (Hannes,
2026-10-28): the text of each answer has the highlighting of Markdown, the
front matter the highlighting of YAML, and the marks `<!-- note`,
`<!-- note inline` and `-->` the highlighting of the marks of a comment. The
editing aids that VS Code turns off inside a comment, for example the closing
of brackets and quotes, work inside a note as in the rest of the Markdown
file. The extension adds this with a grammar that is injected into the
Markdown grammar of VS Code ([R-GEN-007](#r-gen-007)).

### R-TEXT-005

**Collapsed notes.** A note can be collapsed, so that it vanishes from the
text editor and only a marker shows where it is (Hannes, 2026-10-28). The
editor folds the lines of the note together with the blank lines before it
into the last line of text before the note, so that this line stays and the
note does not. VS Code shows the end of this line with "⋯" and, after the
setting `editor.foldingHighlight`, with the background of a folded line. The marker is a note icon in the left margin of this line, in
the color of the note ([R-TEXT-006](#r-text-006)), at the place where GitHub
and VS Code show their comment markers. The folding arrow of VS Code next to
the marker opens the note again, and so does a move of the cursor into it.

- An inline note never ends a paragraph ([R-NOTE-005](#r-note-005)): its
  folding also takes the blank lines after it, so that the text before and
  after the note shows without a paragraph break.
- A block note keeps the blank lines after it.
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

**Rendered front matter.** The extension writes the front matter of each
answer itself, and the user does not edit it (Hannes, 2026-10-28). The text
editor therefore shows each front matter as one rendered line with the author
and the date, for example "hannes · 2026-10-28 10:15", never as its raw lines:
the front matter has a fold of its own inside the fold of the note, which the
extension collapses the first time it sees it in the active editor, also when
the setting `collapseInEditor` is off. On the line of the cursor, the first
line of the front matter shows as it is, and the arrow of the fold opens the
front matter for a correction by hand.

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
the buttons "Edit" and "Delete", and each thread a field "Answer". The editor
of an answer has the tabs "Visual" (the rendered text, which the user edits
directly, [R-SIDE-004](#r-side-004)), "Markdown" (the Markdown text) and
"Preview" (the text rendered as the preview renders it). "Save" (or
Ctrl+Enter) writes the text into the comment of the note
([R-EDIT-002](#r-edit-002)); "Cancel" keeps the note as it is.

### R-SIDE-003

**New note from the side view.** The side view has a button "Add Note" that
adds a note at the line of the cursor of the text editor
([R-EDIT-003](#r-edit-003)).

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
comment of the note, with the line breaks of the file. The front matter of
the answer stays as it is. A note in a block quote or in a list item keeps the
markers of its lines. The extension writes the text only when the Markdown
preview reads the changed text as the same note with the same answers; a
text that would change the Markdown around the note is refused as in
[R-NOTE-003](#r-note-003). The editor of the file can undo the change.

### R-EDIT-003

**Add a note.** The user adds a note to the selected text or at a line: with
the `+` of the text editor, as for the comment of a pull request (Hannes,
2026-10-28), or with "Add Note" of the side view. With selected text, the
note belongs to exactly this selection ([R-NOTE-006](#r-note-006)): the
extension writes the two markers around it and the note after its paragraph.
Without selected text, on a line of a paragraph or a heading, the extension
writes a point marker at the end of the text of the line, so that the note
keeps its exact place in the text. On another line, it writes a block note
after the block of the line, in the block quote or the list item of the
block. The new note has a front matter with the GitHub login of the author
([R-GEN-006](#r-gen-006)), the local date and time in minutes with the offset
of the zone, and the ID of its selection.

### R-EDIT-004

**Delete.** The user deletes an answer with "Delete", also an answer of
another author ([decision 2](#decisions)). The extension removes the answer
from the comment. Deleting the only answer, or the whole thread
with "Delete Thread", removes the comment of the note; a note on lines of its
own loses its lines. The editor of the file can undo the change.

### R-EDIT-005

**Answer.** The user answers a thread: in the reply field of the box in the
text editor, or in the field "Answer" of the side view. The extension adds the
answer at the end of the comment, with its own front matter: the GitHub login
of the author and the date and time ([R-NOTE-004](#r-note-004)).

## Markdown preview

### R-PREV-001

**Icon.** The built-in Markdown preview shows each note as a small,
unobtrusive icon at its place: an inline note in the text, where the note
stood; a block note in the left margin of the preview, at the height of its
place. The icon shows the number of answers of a thread with more than one
answer. Outside the notes, the preview shows the file as without the
extension.

### R-PREV-002

**Callout on hover.** When the pointer rests on the icon, or the icon has the
keyboard focus, the preview shows the note as a rendered callout next to the
icon: a box with a colored bar at its left side, and each answer with its
author, its date and its body rendered as Markdown with the plugins of the
preview. The callout uses the colors of the theme of VS Code.

### R-PREV-003

**Click opens the editor.** A click on the icon opens the note in the side
view ([R-SIDE-001](#r-side-001)), where the user can edit and answer it. The
Markdown preview lets a page open only some kinds of links; the icon is a link
of the scheme `vscode://` to the extension, for which VS Code may ask once
whether the extension may open it.

### R-PREV-004

**Inline notes in the text.** The preview removes each inline note with the
blanks and the blank lines before and after it, so that the paragraph stays
one paragraph with one space between the text before and after the note, and
no line break, also when the setting `markdown.preview.breaks` turns line
breaks into breaks of the line ([R-NOTE-005](#r-note-005)). The scrolling of
the preview still follows the lines of the text editor.

### R-PREV-005

**Show and hide the notes of the preview.** The title of the Markdown
preview has a button that shows or hides the notes (Hannes, 2026-10-28):
"Hide Notes in Preview" while the preview shows them, "Show Notes in Preview"
while it hides them. The button changes the setting
`nimblescape.markdownNotes.showInPreview`: in the settings of the workspace
when they hold a value, else in the settings of the user. Without the notes,
the preview shows the file as without the extension; inline notes are still
removed with their blanks, so that the paragraphs stay whole. A change of the
setting renders the open previews again. By default, the preview shows the
notes ([decision 5](#decisions)).

## Decisions

Hannes decided these questions on 2026-10-28. The requirements above follow
them.

1. **Storage of answers** ([R-NOTE-004](#r-note-004)): one comment holds the
   whole thread. The other choice was one comment `<!-- note reply` for each
   answer, directly after the note.
2. **Rights** ([R-EDIT-001](#r-edit-001), [R-EDIT-004](#r-edit-004)): every
   user who can change the file can edit and delete every answer, also the
   answers of other authors, as in the file itself. The other choice was
   that the buttons "Edit" and "Delete" show only at the answers of the
   signed-in author.
3. **Work without sign-in** ([R-GEN-006](#r-gen-006)): the text editor, the
   side view and the preview show the notes also without a GitHub sign-in,
   and the user can edit and delete answers without it. Only adding a note
   or an answer needs the sign-in, because only these write an author.
   Editing and deleting an answer keep or remove its front matter. The other
   choice was that editing and deleting need the sign-in too.
4. **Form of inline notes** ([R-NOTE-005](#r-note-005)): an inline note keeps
   its lines of their own, and collapses so that it vanishes without a break
   ([R-TEXT-005](#r-text-005)). The other choice was an inline note on one
   line inside the line of the text, which adds no line break even when it is
   open, but holds no headings and no paragraphs; the notes of Hannes hold
   both.
5. **What is hidden by default** ([R-PREV-005](#r-prev-005),
   [R-TEXT-005](#r-text-005)): the text editor collapses the notes by
   default; the Markdown preview shows them by default and has a button that
   hides them.
6. **Form of a selection** ([R-NOTE-006](#r-note-006)): two hidden markers
   with an ID around the passage, `<!--[a3-->` and `<!--a3]-->`, and the key
   `selection` with the ID in the front matter of the note. The other choices
   were a quote of the passage in the front matter, which no longer finds the
   passage after a change of it or when the passage occurs twice, and one
   marker at the start of the passage with the inline note directly after the
   passage as its end, which allows no front matter and no answers.
7. **Where the text of a note shows** ([R-TEXT-001](#r-text-001),
   [R-SIDE-001](#r-side-001)): for now both, the boxes of the comments API
   in the text editor and the side view (Hannes, 12:00). The other choices
   were the side view alone, with a setting for the boxes that is off by
   default, and the boxes with the Comments panel of VS Code without the
   side view.

---

© 2026 Hannes Stauss (scalarion@nimblescape.com) ·
[MIT License](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/LICENSE).
