<!--
SPDX-License-Identifier: MIT
© 2026 Hannes Stauss (scalarion@nimblescape.com)
Licensed under the MIT License. See LICENSE in the repository root for details.
-->

# User guide

This guide describes the features of nimblescape Markdown Notes and how to use
them. The extension adds notes to Markdown files. A note is a Markdown
footnote with a header line, so GitHub shows each note as a footnote at the
end of the page. Each note is a thread of answers of one or more authors, who
can also answer each other. VS Code shows the notes in the text editor, in the
Comments view, in the side view "Notes" and in the Markdown preview.

The table shows each feature, where it works and its state, and
[requirements.md](requirements.md) defines each feature exactly; the ID in
the last column links to its definition. The key combinations are those of
Windows and Linux; on macOS, use Cmd instead of Ctrl.

| Feature | Where | State | Requirements |
| --- | --- | --- | --- |
| [Syntax of a note](#write-a-note) | the Markdown file | available | [R-NOTE-001](requirements.md#r-note-001) |
| [Author and date](#author-and-date) | the header of each answer | available | [R-NOTE-002](requirements.md#r-note-002) |
| [Label of a note](#label-of-a-note) | the Markdown file | available | [R-NOTE-003](requirements.md#r-note-003) |
| [Threads of answers](#threads) | the Markdown file | available | [R-NOTE-004](requirements.md#r-note-004) |
| [Place of a note](#place-of-a-note) | the Markdown file | available | [R-NOTE-005](requirements.md#r-note-005) |
| [Notes on a selection](#notes-on-a-selection) | the Markdown file, text editor, preview | available | [R-NOTE-006](requirements.md#r-note-006) |
| [GitHub sign-in](#github-sign-in) | VS Code | available | [R-GEN-006](requirements.md#r-gen-006) |
| [Footnotes in the preview](#footnotes-in-the-preview) | Markdown preview | available | [R-GEN-008](requirements.md#r-gen-008) |
| [Boxes of the notes](#notes-in-the-text-editor) | text editor | available | [R-TEXT-001](requirements.md#r-text-001), [R-TEXT-002](requirements.md#r-text-002) |
| [Collapsed notes with markers](#collapsed-notes) | text editor | available | [R-TEXT-005](requirements.md#r-text-005), [R-TEXT-006](requirements.md#r-text-006) |
| [Rendered header lines](#rendered-header-lines) | text editor | available | [R-TEXT-007](requirements.md#r-text-007) |
| [Warnings](#warnings) | text editor, Problems view | available | [R-TEXT-008](requirements.md#r-text-008) |
| [Dimmed source](#dimmed-source) | text editor | available | [R-TEXT-003](requirements.md#r-text-003) |
| [Markdown inside a note](#notes-in-the-text-editor) | text editor | planned | [R-TEXT-004](requirements.md#r-text-004) |
| [List of the notes](#comments-view) | Comments view | available | [R-VIEW-001](requirements.md#r-view-001) |
| [Side view "Notes"](#side-view-notes) | secondary side bar | available | [R-SIDE-001](requirements.md#r-side-001), [R-SIDE-002](requirements.md#r-side-002), [R-SIDE-003](requirements.md#r-side-003), [R-SIDE-005](requirements.md#r-side-005), [R-SIDE-006](requirements.md#r-side-006) |
| [Badges and funnels](#funnels) | side view | available | [R-SIDE-007](requirements.md#r-side-007) |
| [Edit and save an answer](#edit-an-answer) | text editor, side view | available | [R-EDIT-001](requirements.md#r-edit-001), [R-EDIT-002](requirements.md#r-edit-002) |
| [Add a note](#add-a-note) | text editor, side view | available | [R-EDIT-003](requirements.md#r-edit-003) |
| [Answer a note or an answer](#answer-a-note) | text editor, side view | available | [R-EDIT-005](requirements.md#r-edit-005) |
| [Delete an answer or a note](#delete-an-answer-or-a-note) | text editor, side view | available | [R-EDIT-004](requirements.md#r-edit-004) |
| [Icons and callouts](#icons-and-callouts-in-the-markdown-preview) | Markdown preview | available | [R-PREV-001](requirements.md#r-prev-001) to [R-PREV-005](requirements.md#r-prev-005) |
| [Modes of a Markdown file](#modes-of-a-markdown-file) | modes "Markdown Preview" and "Markdown Editor" of VS Code | Markdown Preview: available; Markdown Editor: side view only, because VS Code offers no API for extensions there | [R-GEN-001](requirements.md#r-gen-001), [R-PREV-006](requirements.md#r-prev-006) |
| [Settings](#settings) | VS Code | available | [R-GEN-009](requirements.md#r-gen-009), [R-GEN-010](requirements.md#r-gen-010) |

## Write a note

A note is a footnote: a reference in the text, and a definition after the
block of the reference. The first line of the definition is the header of the
note, with the author and the date. The body of the note follows in normal
Markdown syntax, with each line indented by four spaces:

```markdown
The agents <!--[note-7k2q-->change the work of teams[^note-7k2q] in three ways.

[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00

    Check the **dates** with the team before Friday:

    - Marketing
    - Support
```

- `[^note-7k2q]` is the reference. It ends the passage that the note is
  about, and `<!--[note-7k2q-->` starts it ([Notes on a selection](#notes-on-a-selection)).
- `[^note-7k2q]:` starts the definition. A blank line stands before and after
  it.
- The body can hold all of Markdown: paragraphs, lists, task lists, quotes,
  code blocks, headings, links, emoji and footnotes.

You do not need to write these lines yourself: the extension writes them when
you add or answer a note ([Add a note](#add-a-note)). A footnote is a note
only when its label has the form `note-` and four small letters or digits,
and its first line is a header. Every other footnote, for example `[^1]`,
stays a footnote: the extension shows it nowhere and never changes it.

GitHub and other Markdown tools show each note as a footnote: a small number
at the reference, and the header and the body at the end of the page. The
file [example.md](example.md) holds notes with replies, code blocks and a task
list; open it on GitHub to see how GitHub shows them.

### Author and date

The header of an answer is the GitHub login of its author in bold, a middle
dot, and the date and time in minutes:

```markdown
**hannes** · 2026-10-28 10:15+01:00
```

The date is the local time of the author with the offset of the zone, or `Z`
for UTC, for example `2026-10-28 09:15Z`. The extension writes it for each
new note and answer ([GitHub sign-in](#github-sign-in)). VS Code shows the
date in your local time: the note above shows "2026-10-28 10:15" in Vienna
and "2026-10-28 17:15" in Shenzhen. The tooltip of the date in the preview and
in the side view, and the hover of the header line in the text editor, show
the local time of the author, for example "2026-10-28 10:15 at the author
(UTC+01:00)". The box of the text editor shows the time since the date, for
example "2 hours ago".

### Label of a note

The label of a note is `note-` and four random small letters or digits, for
example `note-7k2q`. The extension draws the label of a new note until no
footnote of the file uses it, so that the notes of two branches of a
repository hardly ever get the same label. The label never changes. It is not
the number of the note in the text editor and the side view, which changes
when a note is added before it.

### Threads

Different authors can answer a note and each other, so a note is a thread: its
first answer, the text of the note, and a tree of replies, as in a discussion
on Reddit. Each reply is a block quote with its own header. A reply to an
answer stands in the block quote of that answer, after its body:

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

Anna and Bob reply to the note, and Hannes replies to Anna. GitHub shows the
tree as nested block quotes. The side view and the callouts of the preview
show the replies to a reply indented below it. The boxes of the text editor
show the answers one below the other, in the order of the file, with the label
"Reply to anna" at a reply to a reply.

A block quote whose first line is a header starts a reply. A block quote that
starts with any other text is part of the body of its answer.

### Place of a note

The extension writes the definition of a note after the outermost block of its
reference: after the paragraph, after the whole list, after the whole table or
after the whole block quote, at the start of the line, with a blank line
before and after it. The notes of one block stand in the order of their
references. Each further line of a note is indented by four spaces. In this
form, GitHub and the other Markdown tools read the note as a footnote, and the
text after the note stays outside it. The text editor warns at other forms
([Warnings](#warnings)).

A reference in a code block, in a code span, in the front matter of the
document or in a block of HTML is no reference, and a footnote there is no
note. The extension reads the file as the Markdown preview does, with the same
parser, so the text editor and the preview always show the same notes.

### Notes on a selection

A note belongs to an exact passage of the text, its selection: from the
hidden start marker `<!--[note-7k2q-->` to the reference `[^note-7k2q]`.

- Without a start marker, the selection starts at the start of the text of its
  paragraph, its heading or its table cell.
- A start marker directly before the reference, `<!--[note-7k2q-->[^note-7k2q]`,
  is a point: a note at a place in the text, without a passage.
- The start marker is a comment inside the line, so GitHub and other
  renderers show the paragraph without it.
- The start marker never starts a line: a comment at the start of a line ends
  the paragraph on GitHub. When the passage starts at the start of a line, the
  start marker stands at the end of the line before it. At the start of a
  paragraph it is left out.
- In the text editor the start marker and the reference vanish. A thin bar in
  the color of the note stands at the start and at the end of the selection, a
  dot at a point, and the passage has a highlight in the color of the note.
  They stay hidden also on the line of the cursor, because the extension
  writes them and you do not edit them:
  - The cursor steps over a hidden marker as over one place, with the arrow
    keys and with a click.
  - Backspace and Delete next to a hidden marker delete the character on the
    other side of it, and Ctrl+Backspace and Ctrl+Delete the word on the other
    side of it. No key changes a marker. "Find and Replace" of VS Code still
    changes the text of the file as it is.
- A click with the mouse on the passage in the text editor selects its note in
  the side view "Notes", and opens the side view when it is closed.
- The preview highlights the passage in the color of the note and shows the
  icon of the note at its reference. While the callout of the note shows, the
  highlight is stronger. A click on the passage selects its note in the side
  view, as a click on its icon does.
- The note that is selected in the side view has a strong highlight with a
  frame in its color, in the text editor and in the preview, so that you see
  which passage the selected thread belongs to.

The extension writes the start marker and the reference itself when you add a
note ([Add a note](#add-a-note)).

### Comment of the format

A file with notes starts with a comment that names the format of the notes,
like a DOCTYPE. It tells programs, for example AI agents, that the file holds
notes, and links to the [specification of the format](format.md), so that an
agent can read, answer and add notes itself:

```markdown
<!-- nimblescape-markdown-notes format=1 spec=https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/format.md
This comment marks a Markdown file with notes of the VS Code extension nimblescape Markdown Notes.
AI agents: read the spec above before you read, change or add a note, and keep this comment as it is.
…
-->
```

- The first line names the format, its version `format=1` and the address of
  the specification `spec=`. Short lines of words follow, and `-->` ends the
  comment. GitHub and the Markdown preview do not show it, and the text
  editor folds it into its first line.
- The comment stands at the top of the file with a blank line after it. A
  front matter stays the first block of the file: the comment follows the
  line `---` or `+++` that ends it.
- The extension writes the comment only together with a change of a note:
  the first note of a file brings it, and the last note takes it away. Undo
  removes the comment with the note. Opening a file never changes it.
- A file without the comment, for example an older file, has notes too.
- When the comment names a newer version of the format than the extension
  knows, the extension changes no note of the file and says that you update
  the extension.

### Footnotes in the preview

The Markdown preview of VS Code shows no footnotes on its own. The extension
therefore comes with the extension "Markdown Footnotes" of Matt Bierner: VS Code
installs it together with nimblescape Markdown Notes. It shows the other
footnotes of a file, for example `[^1]`, in the preview, and never the notes,
which the extension shows as icons. You can disable or uninstall it; the
notes keep working, and the preview then shows the other footnotes as text.

#### Recommend the extension in a repository

A repository of documents can ask everyone who opens it in VS Code to install
the extension. Add the file `.vscode/extensions.json` to the repository:

```json
{
  "recommendations": ["nimblescape.nimblescape-markdown-notes"]
}
```

VS Code then shows a message with the button "Install", and the extension
appears under "Workspace Recommendations" in the Extensions view.

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

The text of the notes shows in one place: in the side view "Notes", which is
the default, or in boxes in the text editor. The setting
`nimblescape.markdownNotes.showNotesIn` chooses it:

- `sideView` (the default): the side view "Notes" shows the threads. The text
  editor shows the markers, the highlights and the folds of the notes, but no
  boxes, and you add a note in the side view.
- `inline`: the text editor shows each note with the comments of VS Code, as
  the extension GitHub Pull Requests shows the comments of a pull request. A
  mark in the gutter shows the lines of the selection of the note, and a box
  below the selection shows each answer of the thread as Markdown, with its
  author and date. The box has the title "Markdown note". The side view
  "Notes" and its button do not show, and a click on the icon of a note in the
  preview opens its box.

The boxes are collapsed when a file opens, so that the text stays readable; a
click on the mark opens a box, and the arrow in the title of the box closes
it. The setting `nimblescape.markdownNotes.expandInEditor` opens all boxes
when a file opens.

### Collapsed notes

The text editor collapses the notes of a file the first time the file is in
the active editor, so that each note vanishes and the text reads as if the
note were not there:

- The definition of a note folds into the last line of text before it,
  together with the blank lines before it. VS Code shows "⋯" at the end of
  this line. The blank lines after the note stay.
- Notes with only blank lines between them share one fold.
- After a heading or a list, the fold starts on the blank line before the
  note, and one blank line stays.

A marker in the left margin, where VS Code shows its comment markers, shows
where the note is: a speech bubble with the number of the note, in its color.
The overview ruler at the right edge of the editor has a mark in the same
color. The folding arrow next to the marker opens the note again.

- The box of a note has the button "Hide Note Text" while the text of the
  note shows, and "Show Note Text" while it is folded.
- The Command Palette has "Markdown Notes: Collapse All Notes", "Markdown
  Notes: Expand All Notes" and "Markdown Notes: Collapse Note" (the note at
  the cursor).
- A note that you add, and a note that you opened, stay open. The notes of a
  file collapse again only after you close and open the file again.
- The setting `nimblescape.markdownNotes.collapseInEditor` with the value
  `false` keeps all notes open.
- The setting `nimblescape.markdownNotes.keepNotesCollapsed` with the value
  `true` keeps the notes collapsed: they collapse when a file opens, also with
  `collapseInEditor` set to `false`, and nothing opens them. A click on the
  folding arrow, a search or "Go to Line" may open a note for a moment; the
  extension collapses it again and moves the cursor out of it. The buttons
  "Hide Note Text" and "Show Note Text" and the command "Expand All Notes" do
  not show. The text of the notes shows in the side view, or in the boxes
  with `showNotesIn` set to `inline`.
- The cursor does not stay in the lines of a collapsed note: a move with the
  arrow keys goes past the note to the next line of text.
- VS Code gives a folded line a background color. The setting
  `editor.foldingHighlight` of VS Code with the value `false` turns it off.

The boxes follow the text: when you type, each box moves with its note after a
short pause, and an open box stays open. A box goes away when you remove its
note from the text.

### Rendered header lines

The extension writes the header of each answer itself, and you do not need to
edit it. When a note is open in the text editor, each header line therefore
shows rendered in italics, with the author and the date in your local time,
for example "hannes · 2026-10-28 10:15", and not as its Markdown. The label
`[^note-7k2q]:` of the first answer vanishes with it; the quote markers `>`
of a reply stay. The hover of the line shows the local time of the author.

The header line shows rendered also when the cursor comes to it, because you
do not edit it: the cursor does not stay on a header line and goes to the next
line in the direction of its move, and Backspace or Delete that would join a
line with a header line changes nothing. When you save a changed answer, the
extension writes the date of the save into its header and keeps its author
([Edit an answer](#edit-an-answer)).

### Warnings

The text editor and the Problems view warn at each form of a note that GitHub
or another Markdown tool shows differently from the extension:

| Warning | Why |
| --- | --- |
| Put a blank line before the note, or after it | Without the blank line after it, a line of text after the note belongs to the note. |
| Indent each line of a note by four spaces (a hint) | A line without the indentation directly after a line of the note still belongs to the note; after a blank line, it ends the note. |
| Another note of the file has the label | The references name the first note of the label. |
| The file has no note … | GitHub shows the reference as text. |
| No reference names this note | GitHub does not show a footnote without a reference. |
| GitHub does not show a footnote in a block quote | Move the note after the block quote. |
| A reference in the text of a link breaks the link | GitHub shows no link with a reference in its text. |
| A note holds no note | A reference in the text of a note names no note. |
| A reference in a heading changes the anchor of the heading (a hint) | Links to the heading stop working on GitHub. |
| A start marker at the start of a line ends the paragraph | GitHub reads a comment at the start of a line as a block of HTML. |

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
of a Markdown file opens and closes it with one click, also in Zen Mode and
in the modes "Markdown Preview" and "Markdown Editor" of VS Code. A click on
an icon or a highlighted passage of the preview opens it too, and so does a
click with the mouse on the passage of a note in the text editor. The view is
the editor of the notes:

- The view shows the name of the active Markdown file, the GitHub account,
  and the threads of the file, each with the line of the note and its answers
  rendered as Markdown with author and date. The replies to a reply stand
  indented below it. The tooltip of a date shows the local time of the
  author. The active Markdown file is the file of the text editor, of the
  Markdown preview, or of the mode "Markdown Editor" of VS Code.
- The view selects the thread at the cursor of the text editor, and the
  thread whose icon or passage you clicked in the preview, and scrolls to it.
- Each thread shows a badge with the number of its note, in the color of the
  note, the same as the marker in the left margin of the text editor; the
  left side of the thread has this color too.
- A click on "Line N" of a thread shows the note where the file is open, and
  a click elsewhere on the thread does the same and keeps the focus in the
  view. The file stays in its mode:
  - In the text editor, the cursor goes to the start of the selection of the
    note, or to the note when it has no selection. With `showNotesIn` set to
    `inline`, the box of the note opens.
  - When only the Markdown preview shows the file, the preview stays and
    scrolls to the passage of the note, which gets the strong highlight.
  - In the mode "Markdown Editor" of VS Code, the passage of the note is
    selected there.
- Each answer has "Reply", "Edit" and "Delete", each thread "Answer" and
  "Delete Thread", and the view "Add Note".
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

### Funnels

The left edge of the side view, next to the text editor, has a narrow strip
that stands for the whole file, from its first line at the top to its last
line at the bottom:

- a mark in the color of each note, at the lines of its selection, or at the
  lines of the note when it has no selection;
- a frame around the part of the file that the text editor shows.

A funnel in the color of the note leads from the selected thread to its
mark, so you see which place of the file the thread belongs to. The text
editor and the preview show the passage of this note with a strong highlight
and a frame in its color. The buttons "Hide Funnels" and "Show Funnels"
(the eye) in the title of the view hide and show the strip and the funnels.
They change the setting `nimblescape.markdownNotes.showFunnels`: in the
settings of the workspace when they hold a value, else in your user
settings. VS Code does not let a view draw into the text editor, so the
funnels end at the edge of the view.

### Editors of the side view

The editor of a text in the side view has the tabs "Write" (the Markdown
text) and "Preview" (the text rendered as the Markdown preview renders it).
"Save" or Ctrl+Enter writes the text; "Cancel" or Escape keeps the note as it
is. When the extension refuses a text, the editor stays open and shows why.

## Edit an answer

In the text editor:

1. Open the box of the note.
2. Click "Edit" (pencil) at the answer. The answer turns into an editor of
   Markdown, with the highlighting of Markdown, without the indentation and
   the quote markers of the file.
3. Change the text. Click "Save", or press Ctrl+Enter. "Cancel" closes the
   editor and keeps the answer as it is.

In the side view, click "Edit" at the answer, change the text, and click
"Save".

"Save" writes the text back into the answer in the note, with the
indentation of four spaces and the quote markers of the answer. The header of
the answer keeps its author and gets the date and time of the save, because
the text changed; a text that you save unchanged keeps its date. The text gets
the line breaks of the file. The file then has unsaved changes: save it as usual.
Undo in the text editor takes the change back.

The extension writes the text only when the Markdown preview reads the changed
text as the same note with the same answers. A block quote whose first line is
a header (`**login** · date`) would start a reply, so the extension refuses
such a text, and it refuses an empty text. It shows why and keeps the text in
the editor.

## Add a note

In the text editor:

1. Select the passage that the note is about, or put the cursor on a line.
2. Move the mouse over the gutter, left of the text, and click the `+`, as
   for the comment of a pull request. The command "Comments: Add Comment on
   Current Selection" does the same.
3. Write the text of the note in the box, in Markdown.
4. Click "Add Note", or press Ctrl+Enter. "Cancel" removes the box.

In the side view, select the passage or put the cursor of the text editor on
the line, click "Add Note", write the text, and click "Add Note" below the
text.

The extension writes the new note:

- With selected text, the note belongs to exactly this passage: the
  extension writes the start marker before it, the reference after it, and
  the definition after the outermost block of the passage
  ([Place of a note](#place-of-a-note)). A selection that spans several
  blocks belongs to the block of its end.
- Without selected text, on a line of a paragraph, a heading, a list item or
  a table cell, it writes a point at the end of the text of the line.
- On another line, for example in a code block or on a blank line, the
  extension adds no note and says why.
- The reference never stands in the text of a link or in a code span: the
  extension writes it after the link or the code span.

The new note has a new label and a header with the GitHub login of the author
and your local date and time with the offset of the zone, for example
`**hannes** · 2026-10-28 10:15+01:00`. An empty text adds no note.

## Answer a note

You can reply to the note, or to one of its answers:

- **Reply to the note:** in the text editor, write the text in the reply
  field at the end of the box of the note, and click "Answer" or press
  Ctrl+Enter. In the side view, click "Answer" in the thread, write the text,
  and click "Answer" below it.
- **Reply to an answer:** click "Reply" (the arrow) at the answer, in the box
  or in the side view, write the text, and click "Save" in the box or "Reply"
  in the side view.

The extension writes the reply after the replies to the same answer, one level
deeper ([Threads](#threads)), with its own header: the GitHub login of the
author and the date and time. A refused text stays in an editor, so that you
can correct it and save it, or cancel it.

## Delete an answer or a note

- "Delete" (trash can) at an answer removes that answer from the note. Its
  replies stay: they move up one level. When you delete the first answer, its
  first reply becomes the first answer. Deleting the only answer removes the
  whole note.
- "Delete Thread" (trash can in the title of the box, or in the side view)
  removes the note with all its answers.

When a note goes, its definition goes with one blank line, and its reference
and its start marker leave the text. Undo in the text editor brings the
answer or the note back.

## Icons and callouts in the Markdown preview

The built-in Markdown preview (Ctrl+Shift+V, or Ctrl+K V to the side) shows
each note as a small, unobtrusive icon at its reference, at the end of its
selection, which has a highlight in the color of the note. A note without a
reference shows its icon in the left margin of the preview, at the height of
its definition. The notes never show as footnotes at the end of the page.

Each icon has the color of its note, the same color as the marker of the note
in the text editor.

The icon shows the number of answers of a thread with more than one answer.
When the pointer rests on the icon, or the icon has the keyboard focus (Tab),
the preview shows the note as a callout next to the icon. The setting
`nimblescape.markdownNotes.showCalloutOnHover` with the value `false` shows
the callout only for the keyboard focus, not for the pointer. The callout is
a box with a colored bar at its left side, and each answer with its author,
its date in your local time and its body rendered as Markdown with the
plugins of the preview. The replies to a reply stand indented below it, and the tooltip of a
date shows the local time of the author. The callout uses the colors of the
theme of VS Code. Escape closes it.

A click on the icon, or on the highlighted passage of the note, opens the
note in the side view "Notes", where you can edit and answer it. The icon is a
link of the scheme `vscode://` to the extension; VS Code may ask once whether
the extension may open it. The note that is selected in the side view has a
strong highlight with a frame in its color, and a click on its thread scrolls
the preview to it.

Outside the notes, the preview shows the file as without the extension. The
button "Hide Notes in Preview" (the eye) in the title of the preview hides
the notes, and the button "Show Notes in Preview" shows them again; the
Command Palette has the same commands. The preview then shows the text
without the notes, icons and callouts. The buttons change the setting
`nimblescape.markdownNotes.showInPreview`: in the settings of the workspace
when they hold a value, else in your user settings. A change of the setting
renders the open previews again.

## Modes of a Markdown file

VS Code 1.143 shows a Markdown file in one of three modes. The switch at the
top right of the editor, or "Reopen Editor With…", changes the mode:

| Mode | Notes |
| --- | --- |
| Text Editor | All features of this guide. |
| Markdown Preview | The icons, the callouts and the highlights, as in the preview to the side. The buttons "Show or Hide Notes" and "Hide Notes in Preview" are in its title. The side view "Notes" shows the notes of the file, and a click on a thread keeps the mode and scrolls to the note. |
| Markdown Editor | The side view "Notes" shows the notes of the file, and a click on a thread selects its passage in the Markdown Editor. The Markdown Editor itself shows no notes. |

The Markdown Editor renders the file with its own engine, which takes no
plugin of an extension, and its comments come from an API that only the
extensions of VS Code may use; the Marketplace refuses an extension that uses
such an API. The Markdown Editor therefore shows a start marker as a gap, a
reference as its text, for example `[^note-7k2q]`, and the text of a note as
a code block. The notes stay in the file as they are. Use the text editor or
the mode "Markdown Preview" to read the notes in the text.

## Settings

| Setting | Default | Effect |
| --- | --- | --- |
| `nimblescape.markdownNotes.showNotesIn` | `sideView` | Where the text of the notes shows: `sideView` in the side view "Notes", `inline` in the boxes of the text editor, never in both ([Notes in the text editor](#notes-in-the-text-editor)). |
| `nimblescape.markdownNotes.collapseInEditor` | `true` | Collapses the notes in the text editor the first time a file is in the active editor, so that each note vanishes and only its marker in the left margin shows. The value `false` keeps the notes open. A note that you add stays open. A folder of a workspace can have its own value. |
| `nimblescape.markdownNotes.keepNotesCollapsed` | `false` | Keeps the notes collapsed in the text editor: nothing opens them, and the buttons and the command that open them do not show ([Collapsed notes](#collapsed-notes)). |
| `nimblescape.markdownNotes.showFunnels` | `true` | Shows the strip with the marks of the notes and the funnel from the selected thread to its mark in the side view "Notes". The buttons "Show Funnels" and "Hide Funnels" in the title of the view change it. |
| `nimblescape.markdownNotes.expandInEditor` | `false` | Opens the box of each note in the text editor when the file opens, with `showNotesIn` set to `inline`. The value `false` shows only a mark at each note; a click on the mark opens the box. A folder of a workspace can have its own value. |
| `nimblescape.markdownNotes.showInPreview` | `true` | Shows the notes as icons with callouts in the Markdown preview. The value `false` shows the preview without the notes, icons and callouts. The buttons of the preview change it. A folder of a workspace can have its own value. |
| `nimblescape.markdownNotes.showCalloutOnHover` | `true` | Shows the callout of a note in the preview while the pointer rests on its icon. The value `false` shows it only for the keyboard focus; a click on the icon or the passage still selects the note in the side view. |
| `nimblescape.markdownNotes.openLinksIn` | `newWindow` | Where a link in a note to a file opens: `newWindow` in a new window of VS Code, so that the Markdown file and its preview stay as they are; `editor` in the editor of VS Code; `system` with the program of your system, for example the PDF viewer. A link to a web page or an e-mail address always opens with your system. |

## Limits

- The mode "Markdown Editor" of VS Code shows no notes, only the side view
  does; the section [Modes of a Markdown file](#modes-of-a-markdown-file)
  explains why.
- A note needs a reference in the text of a paragraph, a heading, a list item
  or a table cell. A note in a block quote shows in VS Code, but not on
  GitHub.
- The text editor of VS Code shows the lines of a note, which are indented by
  four spaces, in the color of a code block. The highlighting of Markdown
  inside the notes is planned.
- On GitHub, the notes share the numbers of the footnotes of the page, and
  GitHub shows them at the end of the page with the other footnotes.
- The notes of the older form `<!-- note … -->` are not converted; the
  extension no longer reads them.
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
- VS Code 1.143 draws Mermaid diagrams in the preview itself. When the
  extension "Markdown Preview Mermaid Support" is also active, the preview
  draws no diagram; this happens also without this extension.

---

© 2026 Hannes Stauss (scalarion@nimblescape.com) ·
[MIT License](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/LICENSE).
