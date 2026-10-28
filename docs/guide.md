<!--
SPDX-License-Identifier: MIT
© 2026 Hannes Stauss (scalarion@nimblescape.com)
Licensed under the MIT License. See LICENSE in the repository root for details.
-->

# User guide

This guide describes the features of nimblescape Markdown Notes and how to use
them. The extension adds notes to Markdown files: HTML comments that start
with `<!-- note`. VS Code shows them in the text editor, in the Comments view
and in the Markdown preview.

The table shows each feature, where it works and its state, and
[requirements.md](requirements.md) defines each feature exactly; the ID in
the last column links to its definition. The key combinations are those of
Windows and Linux; on macOS, use Cmd instead of Ctrl.

| Feature | Where | State | Requirements |
| --- | --- | --- | --- |
| [Syntax of a note](#write-a-note) | the Markdown file | available | [R-NOTE-001](requirements.md#r-note-001) |
| [Author and date](#author-and-date) | the front matter of a note | available | [R-NOTE-002](requirements.md#r-note-002) |
| [No comment in a note](#no-comment-in-a-note) | everywhere | available | [R-NOTE-003](requirements.md#r-note-003) |
| [Boxes of the notes](#notes-in-the-text-editor) | text editor | available | [R-TEXT-001](requirements.md#r-text-001) |
| [List of the notes](#comments-view) | Comments view | available | [R-VIEW-001](requirements.md#r-view-001) |
| [Edit and save a note](#edit-a-note) | text editor | available | [R-EDIT-001](requirements.md#r-edit-001), [R-EDIT-002](requirements.md#r-edit-002) |
| [Add a note](#add-a-note) | text editor | available | [R-EDIT-003](requirements.md#r-edit-003) |
| [Delete a note](#delete-a-note) | text editor | available | [R-EDIT-004](requirements.md#r-edit-004) |
| [Callouts](#callouts-in-the-markdown-preview) | Markdown preview | available | [R-PREV-001](requirements.md#r-prev-001), [R-PREV-002](requirements.md#r-prev-002), [R-PREV-003](requirements.md#r-prev-003) |
| [Markdown Editor](#markdown-editor) | Markdown Editor of VS Code | not possible: no API for extensions | [R-GEN-001](requirements.md#r-gen-001) |

## Write a note

A note is an HTML comment that starts with `<!-- note` on a line of its own.
The text of the note starts on the next line: an optional front matter, then
the body in normal Markdown syntax. The comment ends with `-->`.

```markdown
<!-- note
---
author: Hannes Stauss
date: 2026-10-28T10:15+01:00
---
Check the **dates** with the team before Friday:

- Marketing
- Support
-->
```

Without a front matter, the body starts right on the next line:

```markdown
<!-- note
A short note.
-->
```

The word `note` may be in small or capital letters, and spaces may follow
it, but nothing else may stand on its line. Every other comment is no note:
the extension shows it nowhere and never changes it. These comments are no
notes:

```markdown
<!-- note -->
<!-- note: a text on the same line -->
<!-- TODO
note
-->
```

GitHub and other Markdown tools hide HTML comments, so they show the file
without its notes.

### Where a note can stand

A note can stand on lines of its own, also in a block quote or in a list
item. Each line of such a note starts with the markers of its block quote or
the indentation of its list item:

```markdown
> A quote.
>
> <!-- note
> A note in the quote.
> -->
```

A note can also stand inside the text of a paragraph. It then has no front
matter and no blank line, because a line `---` below a line of text turns
the text into a heading, and a blank line ends the paragraph:

```markdown
Version 2.0 comes out in November. <!-- note
Which day exactly?
--> The beta starts one week before.
```

A comment in a code block, in a code span, in the front matter of the
document, in a table cell or in a block of other HTML is no note. The
extension reads the file as the Markdown preview does, with the same parser,
so the text editor and the preview always show the same notes.

### Author and date

The front matter of a note starts with a line `---` right after the line
`<!-- note` and ends with the next line `---`. Each line between holds a
field, `name: value`, or nothing:

| Field | Value |
| --- | --- |
| `author` | The name of the author. The box and the callout show it; without it, they show "Note". |
| `date` | The date in a form of ISO 8601: `2026-10-28`, `2026-10-28T10:15`, `2026-10-28 10:15`, with or without seconds, and with or without a zone such as `Z` or `+01:00`. A date without a zone is local time. The box shows the time since the date, for example "2 hours ago"; the callout shows the date and time without seconds and zone. A date of another form shows as written. |

Other fields may stand in the front matter too. The extension keeps the whole
front matter as it is when it saves a note. A front matter with a line that is
no field, or without its closing line `---`, is no front matter: its lines are
part of the body.

### No comment in a note

The text of a note must not contain another comment: not the start of a
comment `<!--`, not its end `-->`, and not `--!>`, at which a browser ends a
comment too. A `-->` in the text would end the note early, and the rest of
the text would show in the file as normal Markdown.

The extension refuses to save or add a note with such a text. It shows why,
and the box opens the editor again with your text, so that you can correct
it. A note in a file that already contains `<!--` gets a warning in the text
editor and in the Problems view. The preview shows the text of such a note as
it is, with a message, so that the rest of the page stays visible.

## Notes in the text editor

The text editor shows each note of an open Markdown file with the comments
of VS Code. A mark in the gutter shows the lines of the note, and a box below
the note shows its body as Markdown, with the author and the date. The boxes
are collapsed when a file opens, so that the text stays readable; a click on
the mark opens a box, and the arrow in the title of the box closes it. The
setting `nimblescape.markdownNotes.expandInEditor` opens all boxes when a file
opens.

The editor can fold each note of several lines on lines of its own, with the
arrow left of the line `<!-- note`, or with the command "Fold All Block
Comments" (Ctrl+K Ctrl+/).

The boxes follow the text: when you type, each box moves with its note after a
short pause, and an open box stays open. A box goes away when you remove its
note from the text.

## Comments view

The Comments view (in the panel, or with the command "View: Show Comments")
lists the notes of the Markdown files that are open in VS Code, with the
author, the date and the start of the text. A click on a note opens its file
and its box.

## Edit a note

1. Open the box of the note.
2. Click "Edit Note" (pencil). The body turns into an editor of Markdown, with
   the highlighting of Markdown.
3. Change the text. Click "Save", or press Ctrl+Enter. "Cancel" closes the
   editor and keeps the note as it is.

"Save" writes the text back into the comment of the note in the file. The
front matter stays as it is, with its author and date. A note in a block quote
or in a list item keeps the markers of its lines, and the text gets the line
breaks of the file. The file then has unsaved changes: save it as usual. Undo
in the text editor takes the change back.

The extension writes the text only when the Markdown preview reads the changed
text as the same note. A blank line in a note inside a paragraph would end the
paragraph, so the extension refuses it, as it refuses a text with a comment.
Put such a note on lines of its own instead.

## Add a note

1. Move the mouse over the gutter of a line, left of the text, and click the
   `+`.
2. Write the text of the note in the box, in Markdown.
3. Click "Add Note", or press Ctrl+Enter. "Cancel" removes the box.

The extension writes the note on lines of its own after the block of the
line, for example after the whole paragraph, so that no paragraph splits. In
a block quote or in a list item, the note stays in it. The new note has a
front matter with the author and the date:

- The author is the setting `nimblescape.markdownNotes.author`. When the setting
  is empty, it is `user.name` of the Git configuration of the repository of
  the file, which the extension reads through the Git extension of VS Code.
  In Restricted Mode, VS Code turns the Git extension off. Without both,
  the front matter names no author.
- The date is the local date and time in minutes with the offset of the zone,
  for example `2026-10-28T10:15+01:00`.

## Delete a note

Click "Delete Note" (trash can) in the box of a note. The extension removes
the comment of the note from the file. A note on lines of its own loses its
lines; a note inside a paragraph loses its comment and one space before it.
Undo in the text editor brings the note back.

## Callouts in the Markdown preview

The built-in Markdown preview (Ctrl+Shift+V, or Ctrl+K V to the side) shows
each note on lines of its own as a callout at its place: a box with a colored
bar at its left side, a header with the author (or "Note") and the date, and
the body rendered as Markdown with the plugins of the preview. The callout
uses the colors of the theme of VS Code. The scrolling of the preview follows
the text editor also in the body of a note.

A note inside a paragraph shows as a small number in the text, and its
callout with the same number follows the paragraph. The notes of a file count
from 1 in the order of the text.

Outside the notes, the preview shows the file as without the extension. The
setting `nimblescape.markdownNotes.showInPreview` turns the callouts off; the
preview then shows the file without the notes, as GitHub does. A change of the
setting renders the open previews again.

## Markdown Editor

VS Code also has a visual Markdown Editor (Reopen Editor With… > Markdown
Editor). It offers extensions no stable API to show or edit content: its
comments come from an API that only the extensions of VS Code may use. The
extension therefore shows no notes in the Markdown Editor; the notes stay in
the file as they are. Use the text editor and the Markdown preview for the
notes.

## Settings

| Setting | Default | Effect |
| --- | --- | --- |
| `nimblescape.markdownNotes.author` | `""` | The author that a new note names in its front matter (`author:`). When the value is empty, the extension takes `user.name` of the Git configuration of the file; without one, a new note names no author. A note that exists keeps its author. |
| `nimblescape.markdownNotes.expandInEditor` | `false` | Opens the box of each note in the text editor when the file opens. The value `false` shows only a mark at each note; a click on the mark opens the box. A folder of a workspace can have its own value. |
| `nimblescape.markdownNotes.showInPreview` | `true` | Shows the notes as callouts in the Markdown preview. The value `false` shows the preview as without the extension, without the notes. A folder of a workspace can have its own value. |

## Limits

- The extension shows no notes in the Markdown Editor of VS Code; the section
  [Markdown Editor](#markdown-editor) explains why.
- A note inside a paragraph has no front matter and no blank line. A note in
  a table cell, in a code block or in a block of other HTML is no note.
- The text editor and the Comments view show the notes of the open Markdown
  files only.
- A file of a read-only file system, for example the older version of a file
  in a Git diff, shows no boxes; the preview shows its callouts.
- The box of a note shows the HTML of its body only as far as the comments of
  VS Code allow it; the preview shows all of it.

---

© 2026 Hannes Stauss (scalarion@nimblescape.com) ·
[MIT License](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/LICENSE).
