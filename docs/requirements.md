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
signed in; without a sign-in, it writes nothing. The author of a new note or
answer is the GitHub login of the signed-in account. The user cannot type
another author.

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
per thread is the decision of Hannes (2026-10-28).

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

In Markdown, a comment that starts a line ends the paragraph before it. The
rendered view therefore removes the inline note together with the blanks
before and after it (spaces, tabs and line breaks), so that the text before
and after the note stays one paragraph, with one space between the two parts
([R-PREV-004](#r-prev-004)). The place of the note shows as an icon
([R-PREV-001](#r-prev-001)).

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

**Collapsible notes.** Each box can be collapsed and expanded, as a comment
of a pull request can. The boxes are collapsed when a file opens; the setting
`nimblescape.markdownNotes.expandInEditor` opens them all. The editor can also
fold the lines of each note of several lines.

### R-TEXT-003

**Dimmed source.** The text editor shows the source of the comment of each
note dimmed, so that the Markdown of the document outside the notes stands
out, and the rendered box shows the note.

### R-VIEW-001

**Comments view.** The Comments view lists the notes of the open Markdown
files with their author, date and text, and the number of answers. A click on
a note goes to the note in the text editor.

## Side view

### R-SIDE-001

**The view "Notes".** The extension has a view "Notes" in the side bar. It
lists the threads of the active Markdown file, each with the answers rendered
as Markdown, with author and date. It shows and scrolls to the selected
thread: the note at the cursor of the text editor, or the note that the user
clicked in the preview ([R-PREV-003](#r-prev-003)).

### R-SIDE-002

**Note editor.** The side view is the editor of the notes. Each answer has
the buttons "Edit" and "Delete", and each thread a field "Answer". The editor
of an answer is a Markdown editor with the tabs "Write" (the Markdown text)
and "Preview" (the text rendered as the preview renders it). "Save" (or
Ctrl+Enter) writes the text into the comment of the note
([R-EDIT-002](#r-edit-002)); "Cancel" keeps the note as it is.

### R-SIDE-003

**New note from the side view.** The side view has a button "Add Note" that
adds a note at the line of the cursor of the text editor
([R-EDIT-003](#r-edit-003)).

## Editing

### R-EDIT-001

**Edit.** The user can edit each answer of a note: in the side view
([R-SIDE-002](#r-side-002)), and in the box of the text editor with the button
"Edit", which turns the answer into an editor of Markdown.

### R-EDIT-002

**Save.** "Save" writes the text of the editor back into the answer in the
comment of the note, with the line breaks of the file. The front matter of
the answer stays as it is. A note in a block quote or in a list item keeps the
markers of its lines. The extension writes the text only when the Markdown
preview reads the changed text as the same note with the same answers; a
text that would change the Markdown around the note is refused as in
[R-NOTE-003](#r-note-003). The editor of the file can undo the change.

### R-EDIT-003

**Add a note.** The user adds a note at a line: with the `+` in the gutter of
the text editor, or with "Add Note" of the side view. On a line of a
paragraph, the extension writes an inline note after that line
([R-NOTE-005](#r-note-005)), so that the note keeps its exact place in the
text. On another line, it writes a block note after the block of the line,
in the block quote or the list item of the block. The new note has a front
matter with the GitHub login of the author ([R-GEN-006](#r-gen-006)) and the
local date and time in minutes with the offset of the zone.

### R-EDIT-004

**Delete.** The user deletes an answer with "Delete". The extension removes
the answer from the comment. Deleting the only answer, or the whole thread
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
blanks before and after it, so that the paragraph stays one paragraph with
one space between the text before and after the note
([R-NOTE-005](#r-note-005)). The scrolling of the preview still follows the
lines of the text editor.

### R-PREV-005

**Setting of the preview.** The setting
`nimblescape.markdownNotes.showInPreview` turns the icons off. The preview
then shows the file as without the extension, without the notes; inline notes
are still removed with their blanks, so that the paragraphs stay whole. A
change of the setting renders the open previews again.

## Open questions

1. **Storage of answers** ([R-NOTE-004](#r-note-004)). Decided by Hannes on
   2026-10-28: one comment holds the whole thread. The other choice was one
   comment `<!-- note reply` for each answer, directly after the note.
2. **Rights.** This document assumes that every user who can change the file
   can edit and delete every answer, also the answers of other authors, as in
   the file itself. The other choice is that the buttons "Edit" and "Delete"
   show only at the answers of the signed-in author.
3. **Reading without sign-in.** This document assumes that the text editor,
   the side view and the preview show the notes also without a GitHub
   sign-in, and that only adding a note or an answer needs it, because only
   these write an author ([R-GEN-006](#r-gen-006)). Editing and deleting an
   answer keep or remove its front matter, so they need no sign-in.

---

© 2026 Hannes Stauss (scalarion@nimblescape.com) ·
[MIT License](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/LICENSE).
