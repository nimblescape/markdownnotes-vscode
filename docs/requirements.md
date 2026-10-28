<!--
SPDX-License-Identifier: MIT
© 2026 Hannes Stauss (scalarion@nimblescape.com)
Licensed under the MIT License. See LICENSE in the repository root for details.
-->

# Requirements

This document lists what nimblescape Markdown Note must do. Each requirement
has an ID as its heading, so that code, tests and pull requests can link to
it, for example `[R-NOTE-001](docs/requirements.md#r-note-001)`.

The extension adds notes to Markdown files. A note is an HTML comment in the
Markdown text, so the file stays plain Markdown: every Markdown tool that
hides HTML comments, for example GitHub, shows the file without the notes.
VS Code shows each note in the text editor, in the Comments view and in the
Markdown preview.

## Plan

| Step | Content | Requirements |
| --- | --- | --- |
| 1 | Setup: manifest, build, CI, release workflows, license notices, the same structure as the other nimblescape extensions | [R-GEN-001](#r-gen-001) to [R-GEN-005](#r-gen-005) |
| 2 | The syntax of a note, its front matter, and no comment in a note | [R-NOTE-001](#r-note-001) to [R-NOTE-003](#r-note-003) |
| 3 | The text editor and the Comments view: show, edit, save, add and delete notes | [R-TEXT-001](#r-text-001), [R-VIEW-001](#r-view-001), [R-EDIT-001](#r-edit-001) to [R-EDIT-004](#r-edit-004) |
| 4 | The Markdown preview: callouts | [R-PREV-001](#r-prev-001) to [R-PREV-003](#r-prev-003) |
| 5 | Tests, tests in a real VS Code, README, user guide, icon, and a release workflow that is ready but not run | all |

## General

### R-GEN-001

**Built-in editors.** The extension extends the editors that VS Code has for
Markdown files: the text editor, the Comments view and the Markdown preview.
It has no editor of its own and changes no other part of a Markdown file than
the comment of a note.

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

**Restricted Mode and privacy.** The extension works with all features in
Restricted Mode and in virtual workspaces. It runs no program, connects to no
address and collects no telemetry. It changes a file only when the user saves,
adds or deletes a note.

### R-GEN-004

**Licenses.** `THIRD-PARTY-NOTICES.md` names every package that the build
bundles into the package, with its version, its license and the place of its
source code, and holds the text of each license.

### R-GEN-005

**Release.** The publisher is `nimblescape`, and the extension ID is
`nimblescape.nimblescape-markdown-note`. The release uses the same workflows
and checks as the other extensions of the publisher (`release.yml`,
`release-dry-run.yml`, `marketplace-identity.yml`,
`scripts/release-checks.mjs`) and follows the
[release rules](../CONTRIBUTING.md#release-rules) of the publisher. Nobody
publishes the extension until Hannes asks for it.

## Notes

### R-NOTE-001

**Syntax.** A note is an HTML comment of a Markdown file that starts with
`<!-- note` on a line of its own. The text of the note starts on the next
line: an optional front matter ([R-NOTE-002](#r-note-002)), then the body in
normal Markdown syntax. The comment ends with `-->`, on a line of its own
when the extension writes it.

```markdown
<!-- note
---
author: Hannes Stauss
date: 2026-10-28T10:15+01:00
---
The body of the note, in **Markdown**.
-->
```

The word `note` may be in small or capital letters. Every other comment is
no note: the extension shows it nowhere and never changes it.

A note can stand on lines of its own, also in a block quote or in a list item,
or inside the text of a paragraph. The extension finds the notes as the
Markdown preview does, with markdown-it and the options of the preview. So a
comment in a code block, in a code span, in the front matter of the document,
in a block of other HTML and in a table cell is no note, because the preview
does not show it as a comment of Markdown there.

### R-NOTE-002

**Front matter.** A note can start with a front matter: a line `---` right
after the line `<!-- note`, lines of the form `name: value`, and a line
`---`. The field `author` names the author, and the field `date` the date and
time in a form of ISO 8601, for example `2026-10-28`, `2026-10-28T10:15` or
`2026-10-28T10:15+01:00`. A date without a zone is local time. A date of
another form shows as written. The extension keeps the other fields and the
whole front matter as they are when it saves a note.

### R-NOTE-003

**No comment in a note.** The text of a note must not contain another
comment: not the start of a comment `<!--`, not its end `-->`, and not
`--!>`, at which a browser ends a comment too. The extension refuses to write
such a text: it shows why and keeps the text in the editor of the box. A note
in a file that already contains `<!--` gets a warning in the text editor and
the Problems view, and the preview shows its text as it is, so that the rest
of the page stays visible.

## Text editor and Comments view

### R-TEXT-001

**Notes in the text editor.** The text editor shows each note of an open
Markdown file with the comments API of VS Code: a mark in the gutter at the
lines of the note, and a box below it that shows the body as Markdown, with
the author and the date of the front matter. The boxes are collapsed, so that
the text stays readable; a click on the mark opens a box. The setting
`nimblescape.markdownNote.expandInEditor` opens all boxes. The editor can fold
each note of several lines on lines of its own. The boxes follow the text:
after a change of the file, each box moves with its note, and an open box
stays open.

### R-VIEW-001

**Comments view.** The Comments view lists the notes of the open Markdown
files with their author, date and text. A click on a note goes to the note in
the text editor.

## Editing

### R-EDIT-001

**Editor of a note.** The button "Edit Note" of a box turns the body into an
editor of Markdown, with the highlighting of Markdown. The buttons "Save" and
"Cancel" end the editing; Ctrl+Enter (Cmd+Enter on macOS) saves.

### R-EDIT-002

**Save.** "Save" writes the text of the editor back into the comment of the
note in the file, with the line breaks of the file. The front matter stays as
it is. A note in a block quote or in a list item keeps the markers of its
lines. The extension writes the text only when the Markdown preview reads the
changed text as the same note: a text that would change the Markdown around
the note, for example a blank line in a note inside a paragraph, is refused
as in [R-NOTE-003](#r-note-003). The editor of the file can undo the change.

### R-EDIT-003

**Add a note.** The `+` in the gutter of a line of a Markdown file opens a
box for a new note. "Add Note" writes the note on lines of its own after the
block of the line, for example after the whole paragraph, so that no
paragraph splits, in the block quote or the list item of the block. The new
note has a front matter with the author and the date: the author is the
setting `nimblescape.markdownNote.author`, or else `user.name` of the Git
configuration of the file; without both, the front matter names no author.
The date is the local date and time in minutes with the offset of the zone.

### R-EDIT-004

**Delete a note.** The button "Delete Note" of a box removes the comment of
the note from the file. A note on lines of its own loses its lines. The
editor of the file can undo the change.

## Markdown preview

### R-PREV-001

**Callouts.** The built-in Markdown preview shows each note on lines of its
own as a callout at its place: a box with a colored bar at its left side, a
header with the author (or "Note") and the date, and the body rendered as
Markdown with the plugins of the preview. The callout uses the colors of the
theme of VS Code. The scrolling of the preview follows the text editor in the
body of a note too. Outside the notes, the preview shows the file as without
the extension.

### R-PREV-002

**Notes in a paragraph.** A note inside the text of a paragraph shows as a
small number in the text, and its callout with the same number follows the
paragraph.

### R-PREV-003

**Setting of the preview.** The setting `nimblescape.markdownNote.showInPreview`
turns the callouts off. The preview then shows the file as without the
extension, without the notes. A change of the setting renders the open
previews again.

---

© 2026 Hannes Stauss (scalarion@nimblescape.com) ·
[MIT License](https://github.com/nimblescape/nimblescape-markdown-note/blob/main/LICENSE).
