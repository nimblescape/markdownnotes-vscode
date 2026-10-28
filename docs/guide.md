<!--
SPDX-License-Identifier: MIT
© 2026 Hannes Stauss (scalarion@nimblescape.com)
Licensed under the MIT License. See LICENSE in the repository root for details.
-->

# User guide

This guide describes the features of nimblescape Markdown Notes and how to use
them. The extension adds notes to Markdown files: HTML comments that start
with `<!-- note` or `<!-- note inline`. Each note is a thread of answers of
one or more authors. VS Code shows the notes in the text editor, in the
Comments view, in the side view "Notes" and in the Markdown preview.

The table shows each feature, where it works and its state, and
[requirements.md](requirements.md) defines each feature exactly; the ID in
the last column links to its definition. The key combinations are those of
Windows and Linux; on macOS, use Cmd instead of Ctrl.

| Feature | Where | State | Requirements |
| --- | --- | --- | --- |
| [Syntax of a note](#write-a-note) | the Markdown file | available | [R-NOTE-001](requirements.md#r-note-001) |
| [Author and date](#author-and-date) | the front matter of each answer | available | [R-NOTE-002](requirements.md#r-note-002) |
| [No comment in a note](#no-comment-in-a-note) | everywhere | available | [R-NOTE-003](requirements.md#r-note-003) |
| [Threads of answers](#threads) | the Markdown file | available | [R-NOTE-004](requirements.md#r-note-004) |
| [Inline notes](#inline-notes) | the Markdown file | available | [R-NOTE-005](requirements.md#r-note-005) |
| [GitHub sign-in](#github-sign-in) | VS Code | available | [R-GEN-006](requirements.md#r-gen-006) |
| [Boxes of the notes](#notes-in-the-text-editor) | text editor | available | [R-TEXT-001](requirements.md#r-text-001), [R-TEXT-002](requirements.md#r-text-002) |
| [Collapsed notes with markers](#collapsed-notes) | text editor | available | [R-TEXT-005](requirements.md#r-text-005), [R-TEXT-006](requirements.md#r-text-006) |
| [Dimmed source](#dimmed-source) | text editor | available | [R-TEXT-003](requirements.md#r-text-003) |
| [List of the notes](#comments-view) | Comments view | available | [R-VIEW-001](requirements.md#r-view-001) |
| [Side view "Notes"](#side-view-notes) | secondary side bar | available | [R-SIDE-001](requirements.md#r-side-001), [R-SIDE-002](requirements.md#r-side-002), [R-SIDE-003](requirements.md#r-side-003), [R-SIDE-005](requirements.md#r-side-005), [R-SIDE-006](requirements.md#r-side-006) |
| [Edit and save an answer](#edit-an-answer) | text editor, side view | available | [R-EDIT-001](requirements.md#r-edit-001), [R-EDIT-002](requirements.md#r-edit-002) |
| [Add a note](#add-a-note) | text editor, side view | available | [R-EDIT-003](requirements.md#r-edit-003) |
| [Answer a note](#answer-a-note) | text editor, side view | available | [R-EDIT-005](requirements.md#r-edit-005) |
| [Delete an answer or a note](#delete-an-answer-or-a-note) | text editor, side view | available | [R-EDIT-004](requirements.md#r-edit-004) |
| [Icons and callouts](#icons-and-callouts-in-the-markdown-preview) | Markdown preview | available | [R-PREV-001](requirements.md#r-prev-001) to [R-PREV-005](requirements.md#r-prev-005) |
| [Markdown Editor](#markdown-editor) | Markdown Editor of VS Code | not possible: no API for extensions | [R-GEN-001](requirements.md#r-gen-001) |

## Write a note

A note is an HTML comment that starts with `<!-- note` or `<!-- note inline`
on a line of its own. The text of the note starts on the next line: a front
matter, then the body in normal Markdown syntax. The comment ends with `-->`.

```markdown
<!-- note
---
author: hannes
date: 2026-10-28T10:15+01:00
---
Check the **dates** with the team before Friday:

- Marketing
- Support
-->
```

A note that you write by hand can leave out the front matter. The body then
starts right on the next line, and the note names no author:

```markdown
<!-- note
A short note.
-->
```

The words `note` and `inline` may be in small or capital letters, and spaces
may follow them, but nothing else may stand on their line. Every other
comment is no note: the extension shows it nowhere and never changes it.
These comments are no notes:

```markdown
<!-- note -->
<!-- note: a text on the same line -->
<!-- TODO
note
-->
```

GitHub and other Markdown tools hide HTML comments, so they show the file
without its notes.

### Block notes and inline notes

There are two kinds of notes:

- A **block note** `<!-- note` stands between the blocks of the file, for
  example between two paragraphs. In Markdown, a comment that starts a line
  ends the paragraph before it, so a block note also ends a paragraph. The
  preview shows its icon in the left margin.
- An **inline note** `<!-- note inline` belongs to a place in the text of a
  paragraph, and never ends the paragraph. The preview removes it with the
  blanks and the blank lines before and after it, so that the paragraph stays
  one paragraph, and shows its icon in the text. See
  [Inline notes](#inline-notes).

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

A note can also start after the text of a line. It then has no front matter
and no blank line, because a line `---` below a line of text turns the text
into a heading, and a blank line ends the paragraph. Such a note takes no
answers:

```markdown
Version 2.0 comes out in November. <!-- note inline
Which day exactly?
--> The beta starts one week before.
```

A comment in a code block, in a code span, in the front matter of the
document, in a table cell or in a block of other HTML is no note. The
extension reads the file as the Markdown preview does, with the same parser,
so the text editor and the preview always show the same notes.

### Author and date

Each answer of a note starts with a front matter: a line `---`, the fields,
and a line `---`. Each line between holds a field, `name: value`, or nothing:

| Field | Value |
| --- | --- |
| `author` | The GitHub login of the author. The extension writes it for each new note and answer ([GitHub sign-in](#github-sign-in)). Without it, the boxes and the callouts show "Note". |
| `date` | The date in a form of ISO 8601: `2026-10-28`, `2026-10-28T10:15`, `2026-10-28 10:15`, with or without seconds, and with or without a zone such as `Z` or `+01:00`. A date without a zone is local time. The box shows the time since the date, for example "2 hours ago"; the callout and the side view show the date and time without seconds and zone. A date of another form shows as written. |

Other fields may stand in the front matter too. The extension keeps the whole
front matter as it is when it saves an answer.

### Threads

Different authors can answer a note, so a note is a thread: its first answer
and the answers after it, in the order of the file. One comment holds the
whole thread, and each answer starts with its own front matter:

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
next answer. A line `---` in the body of an answer that no field line follows
stays part of the body, for example a thematic break.

### Inline notes

An inline note belongs to a place in the text of a paragraph. It can stand on
lines of its own between two lines of the paragraph, with a front matter and
blank lines in its body:

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

The preview removes the inline note together with the blanks before and
after it (spaces, tabs, line breaks and blank lines), so that "Version 2.0
comes out in November. The beta starts one week before." stays one
paragraph, with one space and no line break between the two parts, also when
the setting `markdown.preview.breaks` is on. The icon of the note stands
after the word before the note.

An inline note never ends a paragraph, also when blank lines stand before or
after it: the text before and after the note is one paragraph in the
preview. A note between two paragraphs that keeps them apart is a block note
`<!-- note`.

### No comment in a note

The text of a note must not contain another comment: not the start of a
comment `<!--`, not its end `-->`, and not `--!>`, at which a browser ends a
comment too. A `-->` in the text would end the note early, and the rest of
the text would show in the file as normal Markdown.

The extension refuses to save or add such a text. It shows why and keeps the
text in the editor, so that you can correct it. A note in a file that already
contains `<!--` gets a warning in the text editor and in the Problems view.
The preview shows the text of such a note as it is, with a message, so that
the rest of the page stays visible.

## GitHub sign-in

The extension requires a sign-in with GitHub, so that the author of every
note and every answer is always known. The first time you add or answer a
note, VS Code asks whether the extension may use your GitHub account; the
side view also has the link "Sign in with GitHub". The extension uses the
GitHub sign-in of VS Code (the accounts menu at the bottom of the activity
bar), with the scope `read:user`, and reads only the login of the account.
It sends no request to GitHub itself.

The author of a new note or answer is the GitHub login of the signed-in
account. You cannot type another author. Without a sign-in, the extension
writes no new note and no answer, and keeps your text in the editor. You can
still read, edit and delete the notes of a file without a sign-in.

## Notes in the text editor

The text editor shows each note of an open Markdown file with the comments
of VS Code, as the extension GitHub Pull Requests shows the comments of a
pull request. A mark in the gutter shows the lines of the note, and a box
below the note shows each answer of the thread as Markdown, with its author
and date. The box has the title "Markdown note".

The boxes are collapsed when a file opens, so that the text stays readable; a
click on the mark opens a box, and the arrow in the title of the box closes
it. The setting `nimblescape.markdownNotes.expandInEditor` opens all boxes
when a file opens.

### Collapsed notes

The text editor collapses the notes of a file the first time the file is in
the active editor, so that each note vanishes and the text reads as if the
note were not there:

- A note folds into the last line of text before it, together with the blank
  lines before it. VS Code shows "⋯" at the end of this line.
- An inline note also takes the blank lines after it, so that the two parts of
  the paragraph show one below the other, without a blank line between them.
- After a heading or a list, the fold starts on the blank line before the
  note, and one blank line stays.

A marker in the left margin, where VS Code shows its comment markers, shows
where the note is: a speech bubble with the number of the note, in its color.
The overview ruler at the right edge of the editor has a mark in the same
color. The folding arrow next to the marker opens the note again.

- The box of a note has the button "Collapse Note" (the arrows that point to
  each other).
- The Command Palette has "Markdown Notes: Collapse All Notes", "Markdown
  Notes: Expand All Notes" and "Markdown Notes: Collapse Note" (the note at
  the cursor).
- A note that you add, and a note that you opened, stay open. The notes of a
  file collapse again only after you close and open the file again.
- The setting `nimblescape.markdownNotes.collapseInEditor` with the value
  `false` keeps all notes open.
- VS Code gives a folded line a background color. The setting
  `editor.foldingHighlight` of VS Code with the value `false` turns it off.

The boxes follow the text: when you type, each box moves with its note after a
short pause, and an open box stays open. A box goes away when you remove its
note from the text.

### Dimmed source

The text editor dims the part of the file that you do not work on. While the
cursor is outside the notes, it dims the source of each note, so that the
Markdown of the document stands out. While the cursor is in a note, it dims
everything outside this note, so that the note stands out. The box below the
note shows the note rendered.

## Comments view

The Comments view (in the panel, or with the command "View: Show Comments")
lists the notes of the Markdown files that are open in VS Code, with the
author, the date, the start of the text and the number of answers. A click on
a note opens its file and its box.

## Side view "Notes"

The side view "Notes" is in the secondary side bar, at the right of the
window, where VS Code also shows the chat. The Explorer and the other views
of the primary side bar stay usable while it is open. The button "Show or Hide
Notes" (two speech bubbles) in the title of the text editor and of the preview
of a Markdown file opens and closes it with one click, also in Zen Mode. A
click on an icon of the preview opens it too. The view is the editor of the
notes:

- The view shows the name of the active Markdown file, the GitHub account,
  and the threads of the file, each with the line of the note, its kind and
  its answers rendered as Markdown with author and date.
- The view selects the thread at the cursor of the text editor, and the
  thread whose icon you clicked in the preview, and scrolls to it.
- A click on "Line N" of a thread shows the note in the text editor and
  opens its box.
- Each answer has "Edit" and "Delete", each thread "Answer" and "Delete
  Thread", and the view "Add Note".
- A click on a link of a rendered text opens it, as in the Markdown preview:
  a web link or a mail link with your system, and a link to a file in
  VS Code. A relative path starts at the folder of the Markdown file, a path
  with `/` at the folder of the workspace. A fragment `#L12` goes to line 12,
  and a fragment of a Markdown file to its heading, for example
  `notes.md#abstract`. A file that is no text, such as a PDF, opens in the
  editor that VS Code has for it. A link of another scheme, such as
  `zotero:`, opens with your system after you agree. A link of the schemes
  `command:`, `data:` or `javascript:` never opens.
- The button "Hide Secondary Side Bar" (×) of VS Code in the title of the
  secondary side bar closes it. When you move the activity bar to the top, to
  the bottom, or hide it, VS Code shows no such button; the view then has its
  own button "Hide Notes" (×). The command "Markdown Notes: Show or Hide
  Notes" of the Command Palette shows or hides the view.

The editor of a text in the side view has the tabs "Write" (the Markdown
text) and "Preview" (the text rendered as the Markdown preview renders it).
"Save" or Ctrl+Enter writes the text; "Cancel" or Escape keeps the note as it
is. When the extension refuses a text, the editor stays open and shows why.

## Edit an answer

In the text editor:

1. Open the box of the note.
2. Click "Edit" (pencil) at the answer. The answer turns into an editor of
   Markdown, with the highlighting of Markdown.
3. Change the text. Click "Save", or press Ctrl+Enter. "Cancel" closes the
   editor and keeps the answer as it is.

In the side view, click "Edit" at the answer, change the text, and click
"Save".

"Save" writes the text back into the answer in the comment of the note. The
front matter of the answer stays as it is, with its author and date. A note
in a block quote or in a list item keeps the markers of its lines, and the
text gets the line breaks of the file. The file then has unsaved changes:
save it as usual. Undo in the text editor takes the change back.

The extension writes the text only when the Markdown preview reads the changed
text as the same note with the same answers. A blank line in a note that
starts after the text of a line would end the paragraph, and a front matter in
a text would start a new answer, so the extension refuses such a text, as it
refuses a text with a comment.

## Add a note

In the text editor:

1. Move the mouse over the gutter of a line, left of the text, and click the
   `+`.
2. Write the text of the note in the box, in Markdown.
3. Click "Add Note", or press Ctrl+Enter. "Cancel" removes the box.

In the side view, put the cursor of the text editor on the line, click "Add
Note", write the text, and click "Add Note" below the text.

The extension writes the new note on lines of its own:

- On a line of a paragraph, it writes an inline note after that line, so that
  the note keeps its exact place in the text and the paragraph does not
  split.
- On another line, it writes a block note after the block of the line, for
  example after a heading, a list or a code block. In a block quote or in a
  list item, the note stays in it.

The new note has a front matter with the GitHub login of the author and the
local date and time in minutes with the offset of the zone, for example
`2026-10-28T10:15+01:00`.

## Answer a note

In the text editor, write the text in the reply field at the end of the box
of the note, and click "Answer" or press Ctrl+Enter. In the side view, click
"Answer" in the thread, write the text, and click "Answer" below it.

The extension adds the answer at the end of the comment of the note, with its
own front matter: the GitHub login of the author and the date and time. A
refused text stays in an editor at the end of the thread, so that you can
correct it and save it, or cancel it.

## Delete an answer or a note

- "Delete" (trash can) at an answer removes that answer from the comment.
  Deleting the only answer removes the whole note.
- "Delete Thread" (trash can in the title of the box, or in the side view)
  removes the comment of the note with all its answers.

A note on lines of its own loses its lines; a note after the text of a line
loses its comment and one space before it. Undo in the text editor brings the
answer or the note back.

## Icons and callouts in the Markdown preview

The built-in Markdown preview (Ctrl+Shift+V, or Ctrl+K V to the side) shows
each note as a small, unobtrusive icon at its place:

- the icon of an inline note in the text, after the word before the note;
- the icon of a block note in the left margin of the preview, at the height
  of its place.

The icon shows the number of answers of a thread with more than one answer.
When the pointer rests on the icon, or the icon has the keyboard focus (Tab),
the preview shows the note as a callout next to the icon: a box with a
colored bar at its left side, and each answer with its author, its date and
its body rendered as Markdown with the plugins of the preview. The callout
uses the colors of the theme of VS Code. Escape closes it.

A click on the icon opens the note in the side view "Notes", where you can
edit and answer it. The icon is a link of the scheme `vscode://` to the
extension; VS Code may ask once whether the extension may open it.

Outside the notes, the preview shows the file as without the extension. The
button "Hide Notes in Preview" (the eye) in the title of the preview hides
the notes, and the button "Show Notes in Preview" shows them again; the
Command Palette has the same commands. The preview then shows the file
without the notes, as GitHub does, and the text around an inline note stays
one paragraph. The buttons change the setting
`nimblescape.markdownNotes.showInPreview`: in the settings of the workspace
when they hold a value, else in your user settings. A change of the setting
renders the open previews again.

## Markdown Editor

VS Code also has a visual Markdown Editor (Reopen Editor With… > Markdown
Editor). It offers extensions no stable API to show or edit content: its
comments come from an API that only the extensions of VS Code may use. The
extension therefore shows no notes in the Markdown Editor; the notes stay in
the file as they are. Use the text editor, the side view and the Markdown
preview for the notes.

## Settings

| Setting | Default | Effect |
| --- | --- | --- |
| `nimblescape.markdownNotes.collapseInEditor` | `true` | Collapses the notes in the text editor the first time a file is in the active editor, so that each note vanishes and only its marker in the left margin shows. The value `false` keeps the notes open. A note that you add stays open. A folder of a workspace can have its own value. |
| `nimblescape.markdownNotes.expandInEditor` | `false` | Opens the box of each note in the text editor when the file opens. The value `false` shows only a mark at each note; a click on the mark opens the box. A folder of a workspace can have its own value. |
| `nimblescape.markdownNotes.showInPreview` | `true` | Shows the notes as icons with callouts in the Markdown preview. The value `false` shows the preview without the notes. The buttons of the preview change it. A folder of a workspace can have its own value. |

## Limits

- The extension shows no notes in the Markdown Editor of VS Code; the section
  [Markdown Editor](#markdown-editor) explains why.
- A note that starts after the text of a line has no front matter and no
  blank line, and takes no answers. A note in a table cell, in a code block
  or in a block of other HTML is no note.
- The text editor, the Comments view and the side view show the notes of the
  open Markdown files only.
- The buttons "Show or Hide Notes" and "Hide Notes" close the secondary side
  bar. When you move the view to the primary side bar or to the panel, close
  it there as any other view.
- The buttons of the preview change the setting of the workspace or of the
  user, not the value of a folder of the workspace.
- A file of a read-only file system, for example the older version of a file
  in a Git diff, shows no boxes; the preview shows its icons.
- The box of a note shows the HTML of its body only as far as the comments of
  VS Code allow it; the preview and the side view show more of it.

---

© 2026 Hannes Stauss (scalarion@nimblescape.com) ·
[MIT License](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/LICENSE).
