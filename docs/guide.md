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
can also answer each other. Each note belongs to a text of the file, its
highlight, as the highlight of a marker pen on paper. VS Code shows the text
of the notes in one place, the side view "Notes", next to their highlights in
the text editor and in the Markdown preview.

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
| [Highlights](#highlights) | the Markdown file, text editor, preview | available | [R-NOTE-006](requirements.md#r-note-006) |
| [Colors](#colors) | the Markdown file, side view | available | [R-TEXT-006](requirements.md#r-text-006) |
| [Show and hide the highlights](#show-and-hide-the-highlights) | text editor, preview | available | [R-GEN-011](requirements.md#r-gen-011), [R-PREV-005](requirements.md#r-prev-005) |
| [GitHub sign-in](#github-sign-in) | VS Code | available | [R-GEN-006](requirements.md#r-gen-006) |
| [Footnotes in the preview](#footnotes-in-the-preview) | Markdown preview | available | [R-GEN-008](requirements.md#r-gen-008) |
| [Clean editing view](#clean-editing-view) | text editor | available | [R-TEXT-009](requirements.md#r-text-009) |
| [Collapsed notes](#collapsed-notes) | text editor of the file itself | available | [R-GEN-009](requirements.md#r-gen-009), [R-TEXT-005](requirements.md#r-text-005) |
| [Rendered header lines](#rendered-header-lines) | text editor of the file itself | available | [R-TEXT-007](requirements.md#r-text-007) |
| [Warnings](#warnings) | text editor, Problems view | available | [R-TEXT-008](requirements.md#r-text-008) |
| [Side view "Notes"](#side-view-notes) | secondary side bar | available | [R-SIDE-001](requirements.md#r-side-001), [R-SIDE-002](requirements.md#r-side-002), [R-SIDE-005](requirements.md#r-side-005), [R-SIDE-006](requirements.md#r-side-006) |
| [The view next to the text](#the-view-next-to-the-text) | side view, text editor | available | [R-SIDE-007](requirements.md#r-side-007) |
| [Filters of the side view](#filters-of-the-side-view) | side view | available | [R-SIDE-008](requirements.md#r-side-008) |
| [Add a note](#add-a-note) | text editor, side view | available | [R-SIDE-003](requirements.md#r-side-003), [R-EDIT-003](requirements.md#r-edit-003), [R-EDIT-006](requirements.md#r-edit-006) |
| [Todo notes](#todo-notes) | text editor, side view | available | [R-NOTE-008](requirements.md#r-note-008) |
| [Slash commands](#slash-commands) | text editor | `/note`, `/todo`, `/footnote`, `/figure`, `/table`, `/listing`, `/ref`, `/date`, `/time`, `/user`: available; commands of other extensions, such as `/cite` of nimblescape Markdown Paper | [R-EDIT-008](requirements.md#r-edit-008) |
| [Edit and save an answer](#edit-an-answer) | side view | available | [R-EDIT-001](requirements.md#r-edit-001), [R-EDIT-002](requirements.md#r-edit-002) |
| [Text view of a note](#text-view-of-a-note) | side view | available | [R-SIDE-002](requirements.md#r-side-002) |
| [Answer a note or an answer](#answer-a-note) | side view | available | [R-EDIT-005](requirements.md#r-edit-005) |
| [Delete an answer or a note](#delete-an-answer-or-a-note) | side view | available | [R-EDIT-004](requirements.md#r-edit-004), [R-EDIT-007](requirements.md#r-edit-007) |
| [Hide the notes from other viewers](#hide-the-notes-from-other-viewers), also from GitHub | side view, the Markdown file, formatter | available | [R-HIDE-001](requirements.md#r-hide-001) to [R-HIDE-003](requirements.md#r-hide-003) |
| [Copy the text without notes](#copy-the-text-without-notes), for publishing | side view, Command Palette, command line | available | [R-HIDE-004](requirements.md#r-hide-004) |
| [Figures, tables and links to them](#figures-tables-and-links-to-them), also to sections | text editor, formatter | available | [R-XREF-001](requirements.md#r-xref-001) to [R-XREF-003](requirements.md#r-xref-003) |
| [Values of the front matter](#values-of-the-front-matter) | text editor, formatter | available | [R-XREF-004](requirements.md#r-xref-004) |
| [Listings of code](#listings-of-code) | text editor, formatter, command line | available | [R-CODE-001](requirements.md#r-code-001) to [R-CODE-003](requirements.md#r-code-003) |
| [Footnotes in the side view](#footnotes-in-the-side-view): show, edit, delete, add | side view, text editor | available | [R-FOOT-001](requirements.md#r-foot-001) to [R-FOOT-003](requirements.md#r-foot-003) |
| [Checks of the footnotes](#checks-of-the-footnotes), [Renumber Footnotes](#renumber-the-footnotes) | text editor, Problems view, Command Palette, side view | available | [R-FOOT-004](requirements.md#r-foot-004), [R-FOOT-005](requirements.md#r-foot-005) |
| [Make a note a footnote](#make-a-note-a-footnote) | side view | available | [R-FOOT-006](requirements.md#r-foot-006) |
| [Highlights in the Markdown preview](#highlights-in-the-markdown-preview) | Markdown preview | available | [R-PREV-001](requirements.md#r-prev-001), [R-PREV-003](requirements.md#r-prev-003), [R-PREV-004](requirements.md#r-prev-004) |
| [Modes of a Markdown file](#modes-of-a-markdown-file) | modes "Markdown Preview" and "Markdown Editor" of VS Code | Markdown Preview: available; Markdown Editor: side view only, because VS Code offers no API for extensions there | [R-GEN-001](requirements.md#r-gen-001), [R-PREV-006](requirements.md#r-prev-006) |
| [Formatter](#formatter) | text editor, on save; [command line](#formatter-on-the-command-line) for programs and AI agents | available | [R-FMT-001](requirements.md#r-fmt-001) to [R-FMT-004](requirements.md#r-fmt-004) |
| [Settings](#settings) | VS Code | available | [R-GEN-010](requirements.md#r-gen-010), [R-GEN-011](requirements.md#r-gen-011), [R-NOTE-007](requirements.md#r-note-007), [R-FOOT-001](requirements.md#r-foot-001), [R-HIDE-002](requirements.md#r-hide-002) |
| Visual editing of an answer | side view | planned | [R-SIDE-004](requirements.md#r-side-004) |

Earlier versions also showed the notes in boxes of the text editor, in the
Comments view of VS Code and as icons with callouts in the Markdown preview,
with markers in the left margin of the text editor and funnels in the side
view. These features are dropped: the side view is the only place of the
text of the notes ([R-GEN-009](requirements.md#r-gen-009)).

## Write a note

A note is a footnote: a reference in the text, and a definition after the
block of the reference. The first line of the definition is the header of the
note, with the author and the date. The body of the note follows in normal
Markdown syntax, with each line indented by four spaces:

```markdown
The agents <wbr><!--[note-7k2q-->change the work of teams[^note-7k2q] in three ways.

[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00

    Check the **dates** with the team before Friday:

    - Marketing
    - Support
```

- `<wbr><!--[note-7k2q-->` is the start marker: it starts the highlight, the
  text that the note is about ([Highlights](#highlights)).
- `[^note-7k2q]` is the reference. It ends the highlight: it is the end
  marker.
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
at the reference, and the header and the body at the end of the page. They
do not show the start marker. The file [example.md](example.md) holds notes
with replies, code blocks, a task list and colors; open it on GitHub to see
how GitHub shows them.

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
and "2026-10-28 17:15" in Shenzhen. The tooltip of the date in the side view,
and the hover of a header line in the text editor, show the local time of
the author, for example "2026-10-28 10:15 at the author (UTC+01:00)".

### Label of a note

The label of a note is `note-` and four random small letters or digits, for
example `note-7k2q`. The extension draws the label of a new note until no
footnote of the file uses it, so that the notes of two branches of a
repository hardly ever get the same label. The label never changes. The side
view names a note by the line of its definition, for example "Line 5".

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
tree as nested block quotes. The side view shows the replies to a reply
indented below it.

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

### Highlights

A note belongs to an exact text, its highlight: from the start marker
`<wbr><!--[note-7k2q-->` to the reference `[^note-7k2q]`.

- Every note has one start marker. It is the empty element `<wbr>` and a
  comment with `[` and the label, inside the line, so GitHub and other
  renderers show the paragraph without it.
- The start marker always starts with `<wbr>`. A comment alone at the start
  of a line would end the paragraph on GitHub, which reads it as a block of
  HTML; with `<wbr>` before it, the line stays a line of the paragraph, also
  at the start of a paragraph, a list item or a block quote.
- A highlight holds text, and it stays in one block: a paragraph, a heading,
  a list item or a table cell. The highlights of several notes can overlap.
- In the text editor the start marker and the reference never show, also not
  on the line of the cursor, because the extension writes them and you do not
  edit them:
  - The cursor steps over a hidden marker as over one place, with the arrow
    keys and with a click.
  - Backspace and Delete next to a hidden marker delete the character on the
    other side of it, and Ctrl+Backspace and Ctrl+Delete the word on the other
    side of it. No key changes a marker. "Find and Replace" of VS Code still
    changes the text of the file as it is.
- The text editor and the preview show each highlight in the color of its
  note, with a background and a line below the text
  ([Show and hide the highlights](#show-and-hide-the-highlights)), also while
  the side view "Notes" is closed.
  The overview ruler at the right edge of the text editor has a mark in the
  same color.
- A click with the mouse on a highlight, in the text editor or in the
  preview, selects its note, and a double click on it opens the side view. In
  the text editor the cursor stays in the text.
- The note that is selected in the side view has a strong highlight with a
  frame in its color, in the text editor and in the preview, so that you see
  which text the selected thread belongs to. The highlights of the other
  notes are dimmed.
- A click with the mouse into the text outside the highlights, in the text
  editor or in the preview, deselects the note, and so does the cursor that
  leaves the highlight of the selected note, also with the keys. A note that
  you selected in the side view stays selected while the keys move the
  cursor outside the notes.

The extension writes the start marker and the reference itself when you add a
note ([Add a note](#add-a-note)). An older file can have a note without a
start marker, or a start marker without `<wbr>`; the text editor warns at
them, and "Format Document" adds what is missing ([Formatter](#formatter)).

### Colors

Every note has the same color, blue, until you give it another one. The
colors are blue, green, orange, purple, red and teal. The file keeps the color
in the start marker, after the label; blue has no name there:

```markdown
The agents <wbr><!--[note-7k2q green-->change the work of teams[^note-7k2q] in three ways.
```

You choose the color of a new note in the editor of the new note
([Add a note](#add-a-note)). The button with the
color of a thread in the side view, at its left, opens the colors; a click on
a color gives it to the note.

### Comment of the format

A file with notes starts with a comment that names the format of the notes,
like a DOCTYPE. It tells programs, for example AI agents, that the file holds
notes, and links to the [specification of the format](format.md), so that an
agent can read, answer and add notes itself:

```markdown
<!-- nimblescape-markdownnotes v1.0.0 spec=https://github.com/nimblescape/markdownnotes-vscode/blob/main/docs/format.md
This comment marks a Markdown file with notes of the VS Code extension nimblescape Markdown Notes.
AI agents: read the spec above before you read, change or add a note, and keep this comment as it is.
…
-->
```

- The first line names the format, its version `v1.0.0` and the address of
  the specification `spec=`. In a file whose notes are hidden from other
  viewers, the word `hidden` follows the version
  ([Hide the notes from other viewers](#hide-the-notes-from-other-viewers)).
  Short lines of words follow, and `-->` ends the comment. GitHub and the Markdown preview do not show it, and the text
  editor folds it into its first line.
- The comment stands at the top of the file with a blank line after it. A
  front matter stays the first block of the file: the comment follows the
  line `---` or `+++` that ends it.
- A change of a note brings the comment: the first note of a file brings it,
  and the last note takes it away. Undo removes the comment with the note.
- When you save a file with notes without the comment, for example a file
  into which you wrote a note yourself, the save adds it. The auto save after
  a delay and "Save without Formatting" do not add it. An editor, a diff view
  or the Markdown preview that only shows a file never changes it.
- The setting `nimblescape.markdownNotes.addFormatComment` set to `false`
  keeps the files as they are on a save; a change of a note still brings the
  comment.
- A file without the comment, for example an older file, has notes too.
- The version is a semantic version, MAJOR.MINOR.PATCH. The extension writes
  the comment anew only when its own version is higher than the version in
  the file, so that an older version of the extension never changes the
  comment of a newer one back. When the comment names a higher major version
  of the format than the extension knows, the extension changes no note of
  the file, its formatter keeps the file as it is, and it says that you
  update the extension. The
  [specification](format.md#11-the-version-of-the-format) has the rules.

### Footnotes in the preview

The Markdown preview of VS Code shows no footnotes on its own. The extension
therefore comes with the extension "Markdown Footnotes" of Matt Bierner: VS Code
installs it together with nimblescape Markdown Notes. It shows the other
footnotes of a file, for example `[^1]`, in the preview, and never the notes,
whose text shows in the side view. You can disable or uninstall it; the
notes keep working, and the preview then shows the other footnotes as text.

#### Recommend the extension in a repository

A repository of documents can ask everyone who opens it in VS Code to install
the extension. Add the file `.vscode/extensions.json` to the repository:

```json
{
  "recommendations": ["nimblescape.nimblescape-markdownnotes"]
}
```

VS Code then shows a message with the button "Install", and the extension
appears under "Workspace Recommendations" in the Extensions view.

## Show and hide the highlights

The highlights show while the setting
`nimblescape.markdownNotes.showHighlights` is on, which is the default, also
while the side view "Notes" is closed. They have a clear background and a
line below the text, so that they stand out of the text.

- The button "Hide Highlights" (a highlighter pen with a stroke) in the title
  of the text editor and of the preview hides them. It turns the setting off: in the settings of
  the workspace when they hold a value, else in your user settings.
- The button "Show Highlights" (a highlighter pen over its line) shows them
  again. It turns the setting on, and leaves the side view as it is.
- Opening or closing the side view does not change the highlights.
- A hidden highlight shows while the pointer rests on its text, a click on
  it selects its note, and a double click opens the side view. In the preview it goes
  away when the pointer leaves the text. VS Code tells an extension no event
  when the pointer leaves the text of the text editor, so there it stays
  until the pointer rests on other text or the cursor moves.
- The highlight of the selected note always shows, strong and with a frame.
- "Show Highlights" and "Hide Highlights" deselect the selected note, in the
  text editor, in the preview and in the side view.

The Command Palette has the commands "Markdown Notes: Show Highlights" and
"Markdown Notes: Hide Highlights".

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

A Markdown file with notes, or with the comment of the format, opens in the
clean editing view: the text editor shows the text of the file without the
notes markup, and behaves as in a file without notes. The side view shows
the text of the notes. The view shows the highlights, and the light bulb at
the selected text adds a note ([Add a note](#add-a-note)).

### Clean editing view

The view opens by itself: from the Explorer, a search, a link, the tabs of
the last session, and when a file gets its first note. It takes the place of
the text editor of the file, at the same place, and its tab has the name of
the file. The line breaks, the cursor, the word moves, the search, the copy
and Undo count only the characters of the text. Each change in the view goes
into the file at once, and each note stays at its text:

- The view also hides the anchors of the figures and the tables, for example
  `<a id="tab-grades"></a>`
  ([Figures, tables and links to them](#figures-tables-and-links-to-them)).
- While the side view shows the footnotes, the view also hides the
  definition of each standard footnote that has a reference
  ([Footnotes in the side view](#footnotes-in-the-side-view)); the reference,
  for example `[^1]`, stays in the text. A definition that you type in the
  view stays there until the view reads the file anew, for example after a
  change in the side view.
- Text typed at the start or the end of a highlight stays outside of it;
  text typed inside a highlight stays in it, also when you type over its
  first or its last word.
- Deleting text never deletes a note: a highlight whose whole text you delete
  becomes a point, and the Problems view warns about it.
- A paragraph break inside a highlight ends the highlight there, and the note
  moves after the paragraph of its highlight.
- Undo and Redo bring back the file as it was, with each note at its place.
- A save of the view saves the file, with the format on save and the comment
  of the format. "Don't Save" at the close of the view brings the file back
  to its text on disk.
- A relative link of the view opens the file of the link: in its view when it
  has notes, else in its own text editor.
- The Markdown preview of the view shows the highlights and scrolls with the
  view. It shows the images and the style sheets of the setting
  `markdown.styles` as the preview of the file itself does.

While the view has changes that are not saved, VS Code shows a second tab
with the name of the file, because VS Code keeps a tab of each file with
changes that are not saved. A click on it shows the view, and it closes
after the save.

The view of the changes of git shows the file itself, with its markup,
because git compares the file. To open the file itself, for example for a
conflict of git in a note, choose "Markdown Notes: Open File with Markup" in
the Command Palette. The file then stays in its own text editor until you
close its tab. The next sections describe the text editor of the file itself:
it never shows the text of a note and its markers, the notes are collapsed
and the markers are hidden.

### Collapsed notes

The text editor of the file itself collapses the notes of a file the first
time the file is in the text editor, so that each note vanishes and the text
reads as if the note were not there:

- The definition of a note folds into the last line of text before it,
  together with the blank lines before it. VS Code shows "⋯" at the end of
  this line. The blank lines after the note stay.
- Notes with only blank lines between them share one fold.
- After a list item of one line, the fold starts on the line of the item.
- After a heading, a list item of more lines, a block quote, a table or code,
  the fold starts on the blank line before the note, and the blank line
  stays. Before a heading, the blank line before the heading stays too.
- A note in the first line of the file has no line before it: its first line
  stays and shows its header rendered.

Nothing opens a note. A click on the folding arrow, a search or "Go to Line"
may open a note for a moment; the extension collapses it again and moves the
cursor out of it. The cursor does not stay in the lines of a collapsed note:
a move with the arrow keys goes past the note to the next line of text. To
read or change the whole text of a note as the file holds it, use the
[text view of the note](#text-view-of-a-note) in the side view.

VS Code gives a folded line a background color. The setting
`editor.foldingHighlight` of VS Code with the value `false` turns it off.

### Rendered header lines

The extension writes the header of each answer itself, and you do not need to
edit it. Where the text editor shows a header line, for example the first
line of a note at the start of the file, the line shows rendered in italics,
with the author and the date in your local time, for example
"hannes · 2026-10-28 10:15", and not as its Markdown. The label
`[^note-7k2q]:` of the first answer vanishes with it; the quote markers `>`
of a reply stay. The hover of the line shows the local time of the author.

The cursor does not stay on a header line and goes to the next line in the
direction of its move, and Backspace or Delete that would join a line with a
header line changes nothing. When you save a changed answer, the extension
writes the date of the save into its header and keeps its author
([Edit an answer](#edit-an-answer)).

### Warnings

The text editor and the Problems view warn at each form of a note that GitHub
or another Markdown tool shows differently from the extension, or that breaks
a rule of the notes:

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
| The note has no start marker | Every note has a start marker; "Format Document" adds it at the start of the text of the block. |
| The note highlights no text | The start marker stands directly before the reference; move it to the start of the text that the note is about. |
| A start marker at the start of a line ends the paragraph | GitHub reads a comment at the start of a line as a block of HTML; "Format Document" puts `<wbr>` before it. |

The standard footnotes have warnings of their own
([Checks of the footnotes](#checks-of-the-footnotes)).

## Side view "Notes"

The side view "Notes" is in the secondary side bar, at the right of the
window, where VS Code also shows the chat. The Explorer and the other views
of the primary side bar stay usable while it is open. The button "Show or Hide
Notes" (two speech bubbles) in the title of the text editor and of the preview
of a Markdown file opens and closes it with one click, also in Zen Mode and
in the modes "Markdown Preview" and "Markdown Editor" of VS Code. A double
click on a highlight in the text editor or in the preview opens it too, and
the view scrolls to the thread of the note. The view is the only place of the
text of the notes, and their editor:

- The view shows the threads of the active Markdown file, each with the line
  of the note and its answers rendered as Markdown with author and date. The
  replies to a reply stand indented below it. The tooltip of a date shows the
  local time of the author. The active Markdown file is the file of the text
  editor, of the Markdown preview, or of the mode "Markdown Editor" of
  VS Code.
- The buttons are small icons with a tooltip, as the buttons in the title of
  an editor of VS Code. Each answer has "Reply" (an arrow), "Edit" (a pencil)
  and "Delete" (a trash can). Each thread has its color, "Line N", "Show as
  Text", "Answer" (a speech bubble), "Make Footnote" (a numbered list) and
  "Delete Thread" (a trash can); a
  todo note has its check box before its color ([Todo notes](#todo-notes)).
  The title of the view has "Add Note" (`+`), "Add Footnote" (`+¹`) and,
  for a file with notes, the eye, which hides the notes from other viewers
  or shows them
  ([Hide the notes from other viewers](#hide-the-notes-from-other-viewers)).
  Its menu "…" has "Hide Footnotes" or "Show Footnotes"
  ([Footnotes in the side view](#footnotes-in-the-side-view)), and "Copy
  without Notes" and "Save Copy without Notes"
  ([Copy the text without notes](#copy-the-text-without-notes)). At the
  default width of the secondary side bar, VS Code shows three buttons in
  the title and puts further buttons into the menu.
- The view selects the thread at the cursor of the text editor, and the
  thread whose highlight you clicked in the preview. Each thread that is not
  selected is dimmed, also under the pointer.
  A click on the empty part of the view, or Escape outside an editor,
  deselects the thread, as a click into the text outside the highlights does.
- A click on "Line N" of a thread shows the note where the file is open, and
  a click elsewhere on the thread does the same and keeps the focus in the
  view. The file stays in its mode:
  - In the text editor, the cursor goes to the start of the highlight of the
    note.
  - When only the Markdown preview shows the file, the preview stays and
    scrolls to the highlight of the note, which gets the strong highlight.
  - In the mode "Markdown Editor" of VS Code, the text of the highlight is
    selected there.

  The text editor and the preview scroll smoothly to the note, over the
  whole way in about half a second. A click or a key in the text editor
  stops the scroll. The text editor scrolls so while the setting
  `editor.smoothScrolling` of VS Code is on, which the extension turns on
  for Markdown files; set it to `false` under `"[markdown]"` in your
  settings to go to the note without the animation.
- A click on a link of a rendered text opens it, as in the Markdown preview:
  a web link or a mail link with your system, and a link to a file at the
  place of the setting `openLinksIn` ([Settings](#settings)). A relative path
  starts at the folder of the Markdown file, a path with `/` at the folder of
  the workspace. A fragment `#L12` goes to line 12, and a fragment of a
  Markdown file to its heading, for example `notes.md#abstract`. A file that
  is no text, such as a PDF, opens in the editor that VS Code has for it. A
  link of another scheme, such as `zotero:`, opens with your system after you
  agree. A link of the schemes `command:`, `data:` or `javascript:` never
  opens.
- The button "Hide Secondary Side Bar" (×) of VS Code in the title of the
  secondary side bar closes it. When you move the activity bar to the top, to
  the bottom, or hide it, VS Code shows no such button; the view then has its
  own button "Hide Notes" (×). The command "Markdown Notes: Show or Hide
  Notes" of the Command Palette shows or hides the view.

> [!IMPORTANT]
> **Zen Mode: turn on the fixed width.** In Zen Mode, VS Code centers the
> text editor and gives it a share of the width of the editor area. When the
> side view opens, the editor area gets smaller, so the text editor gets
> narrower and the lines of the text wrap again. Turn on the fixed width of
> the centered layout of VS Code in your user settings:
>
> ```json
> "workbench.editor.centeredLayoutFixedWidth": true
> ```
>
> The text editor then keeps its width when the side view opens, while the
> window has room for it. The extension does not change this setting for
> you, because it changes the centered layout of all files, not only of
> Markdown files.

### The view next to the text

The side view is a list of the threads in the order of the file, below its
header with the name of the file and the filters
([Filters of the side view](#filters-of-the-side-view)), with your GitHub
account at the top of the list, next to the text editor and next to the
Markdown preview alike:

- You scroll the list on its own, with the mouse wheel over the view, to find
  a note. The list does not follow the scrolling of the text editor.
- A click on a highlight, or a move of the cursor into it, also with the
  keys, selects its thread and scrolls the thread to the top of the view. A click on a thread selects
  it, with a frame, and shows its highlight where the file is open: in the
  text editor, the preview, or the mode "Markdown Preview" or "Markdown
  Editor" of its tab, which stays as it is.
- Each thread that is not selected is dimmed a little.
- The editor of a new note stands at the top of the list.

VS Code tells an extension only the whole rows that a text editor shows, and
only after it scrolled, and no place of the text of the preview, so the view
cannot stand at the height of each highlight and move smoothly with the
text.

### Filters of the side view

The header of the side view stays at the top while you scroll the list. Its
first row shows the name of the file, the todo filter, the colors of the
notes as dots, and "Clear Filter" (×) at its right end; its second row is the
search field:

```text
notes.md   [ ] [x]  (blue) (green) (orange) (purple) (red) (teal)   ×
[ Search the notes                                                   ]
```

- **Todo filter:** the empty box shows the open todos, the checked box the
  completed todos ([Todo notes](#todo-notes)). Only one of the two boxes is
  on: a click on one box turns the other one off.
- **Color filter:** a click on a dot shows the notes of its color; several
  dots show the notes of each of their colors. A second click turns a dot
  off.
- **Search:** type words to see the notes whose answers hold each word in
  their text or as their author, without regard to case. Escape clears the
  search field.
- The filters combine: the view shows the notes that match each filter that
  is on. A button of a filter that is on has a frame, as an option of the
  find widget of VS Code.
- "Clear Filter" (×) turns all filters off.
- The selected note shows also when the filters hide it, and the view tells
  you when no note matches. The filters stay when you open another file.

### Editors of the side view

The editor of a text in the side view has two tabs:

- **Visual:** you edit the rendered text, with the editor of the mode
  "Markdown Editor" of VS Code. The text shows as the preview shows it, and
  the paragraph, list or quote with the cursor shows its Markdown marks, for
  example `**` around bold text, so that you see and change them. The rest
  of the text stays exactly as you wrote it. The toolbar above the text, or
  the keys Ctrl+B (bold), Ctrl+I (italic), Ctrl+E (code) and Ctrl+K (link),
  put the marks around the selected text, or take them away; the buttons
  "List", "Numbered List" and "Quote" put their marks in front of the
  selected lines. Ctrl+Z takes a change back. A click on a link of a
  rendered paragraph opens the link; in the paragraph with the cursor,
  Ctrl+Click opens it.
- **Markdown:** you edit the Markdown text in a plain text field. The button
  "Preview", with the icon of the mode "Markdown Preview" of VS Code, shows
  the text rendered as the side view renders it, and "Write" switches back.

A change of the tab keeps the text, and the next editor opens in the tab that
you chose last. "Save" (a check mark) or Ctrl+Enter writes the text;
"Cancel" (×) or Escape keeps the note as it is. When the extension refuses a
text, the editor stays open and shows why.

A change writes only into the answer or the note that the view showed. When
the file changed in the meantime, for example when a collaborator changed
the note or a second click on "Delete" came before the view showed the new
state, the extension changes nothing and shows a message: look at the note
again, and repeat the change if it is still needed. A change of a setting,
for example with "Hide Highlights", keeps the open editors and their texts;
"Hide Highlights" and "Show Highlights" deselect the selected note.

## Add a note

Every note highlights text, so you first select the text that the note is
about in the text editor or in the Markdown preview. In the text editor:

- **With the light bulb:** VS Code shows a light bulb at the selected text.
  Click it, or press Ctrl+. (Cmd+. on a Mac), and choose "Add Note", the
  first entry of the list, under "Quick Fix". VS Code lists its own actions
  for the selected text below it, for example "Surround With".
- **With the shortcut:** press Shift+Alt+N on Windows and Linux, or Cmd+K
  and then N on a Mac. The shortcut works while the text editor of a Markdown
  file has the focus and text is selected. VS Code uses these keys for
  nothing else; the keyboard shortcuts of VS Code (Ctrl+K Ctrl+S) change
  them.
- **With "Add Note" in a menu:** click "Add Note" (`+`) in the title of the
  side view, or choose "Add Note" in the context menu of the text editor.
- **With a slash command:** type `/` over the selected text, then `note`,
  and press Tab ([Slash commands](#slash-commands)).

Nothing shows by itself over the selected text of the text editor, so a
selection for a copy or a change of the text stays as it is.

In the Markdown preview, to the side or in the mode "Markdown Preview":
select the text with the mouse. When you release the mouse button, a button
"Add Note" shows above the selected text; click it. The selected text must
stay in one paragraph, heading, list item or table cell, and text in a code
block shows no button. The preview shows the text without the markup of
Markdown, so the extension finds the selected text in the file by its letters
and digits. For text that it does not find, such as a formula, it adds no
note and asks you to select the text in the text editor.

The editor of the new note shows the selected text in its title, and the
colors, where you can change the color. Write the text of the note in
Markdown, and click "Add Note" (a check mark) or press Ctrl+Enter. "Cancel"
or Escape closes the editor and leaves the file as it is.

The extension writes the new note:

- The note belongs to exactly the selected text: the extension writes the
  start marker with `<wbr>` and the color before it, the reference after it,
  and the definition after the outermost block of the text
  ([Place of a note](#place-of-a-note)).
- A selection that spans several blocks belongs to the block of its end, and
  the highlight starts at the start of the text of that block. The light
  bulb offers "Add Note" only for a selection in one block.
- The reference never stands in the text of a link or in a code span: the
  extension writes it after the link or the code span.
- Without selected text, or for a selection without text of a paragraph, a
  heading, a list item or a table cell, for example in a code block, the
  extension adds no note and says why.

The new note has a new label and a header with the GitHub login of the author
and your local date and time with the offset of the zone, for example
`**hannes** · 2026-10-28 10:15+01:00`. An empty text adds no note.

## Todo notes

A todo note is a note for a task, which you mark completed when it is done.
Type `/todo` at the end of a sentence in the text editor and press Tab
([Slash commands](#slash-commands)): the sentence before the command is
selected, and the side view opens the editor of the new todo note ("New todo
on …"). Write the task and click "Add Todo" (a check mark).

- The header of the first answer of a todo note ends with ` · todo` while
  the task is open, and with ` · done` when it is completed:
  `[^note-7k2q]: **hannes** · 2026-10-29 18:30+01:00 · todo`. GitHub shows
  the header as it is.
- In the side view, a todo note has a check box at the start of its header:
  empty while the task is open, checked when it is completed. A click on it
  changes the state; the date of the answer stays.
- The todo filter of the side view shows the open or the completed todos
  ([Filters of the side view](#filters-of-the-side-view)).
- Only the first answer holds the state; the replies have none. When you
  delete the first answer, the state goes to the answer that takes its place.

## Slash commands

A slash (`/`) at the start of a line or after a space shows the slash
commands in the list of suggestions of VS Code, in the text editor of a
Markdown file, also in the clean editing view. Type the first letters of a
command to narrow the list, and press Tab or Enter to run the chosen
command; Escape closes the list. The editors of the side view have no slash
commands.

| Command | What it does |
| --- | --- |
| `/note` | Adds a note to the selected text. Select the text, type `/`: VS Code replaces the selected text with the slash, and `/note` puts the text back, selects it and opens the editor of the new note in the side view. The list shows `/note` only after a slash that replaced selected text. |
| `/todo` | Adds a [todo note](#todo-notes): to the selected text, as `/note`, or else to the sentence before the command, from the end of the sentence before it (`.`, `!` or `?`) in the same paragraph, or from the start of the paragraph. It removes the command with the space before it. The list shows `/todo` only where a note can highlight the sentence. |
| `/footnote` | Adds a standard footnote after the word before the command. It removes the command with the space before it and opens the editor of the new footnote in the side view, as "Add Footnote" does ([Footnotes in the side view](#footnotes-in-the-side-view)). The list names the label of the new footnote, the next free number, for example `[^3]`. Write the text and click "Add Footnote". The list shows `/footnote` only after a word where a reference can stand. |
| `/figure` | Adds a figure: lists the images of the workspace by their paths from the folder of the file, and inserts the chosen one as a figure: its caption line with the next number, for example `Figure 2: Caption`, a blank line and the image, with the caption selected for typing ([Figures, tables and links to them](#figures-tables-and-links-to-them)). The list shows `/figure` only on an empty line outside a code block. |
| `/table` | Adds a table: its caption line with the next number, for example `Table 1: Caption`, a blank line and a table of two columns, with the caption selected for typing. The list shows `/table` only on an empty line outside a code block. |
| `/listing` | Adds code of a file of the workspace as a listing: lists the source files, then "Whole file" and the snippets of the chosen file, and inserts the caption line with the next number, `Listing 2: [Caption](…) (…)`, with the link to the source and its cite, the comment of the source and the code block, with the caption selected for typing ([Listings of code](#listings-of-code)). The list shows `/listing` only on an empty line outside a code block. |
| `/ref` | Adds a link to a figure, a table, a listing or a section of the file, for example `[Table 1](#tab-grades)` or `[Chapter 2.1](#methods)`: lists them by their numbers and captions or headings. A figure, a table or a listing without an anchor gets one first; a link to a heading names the ID that GitHub gives it. The list also has the keys of the front matter, whose value `/ref` inserts ([Values of the front matter](#values-of-the-front-matter)). The list shows `/ref` only in a file with figures, tables, headings or a front matter, where a link can stand. |
| `/date` | Inserts the current date, for example `2026-10-29`. |
| `/time` | Inserts the current date and the local time, for example `2026-10-29 19:29`. |
| `/user` | Inserts your GitHub login, for example `hannes`, the name that your notes give their author. The list shows the login. Without a sign-in, the list shows "Sign in with GitHub": VS Code asks you to sign in, and the login follows ([GitHub sign-in](#github-sign-in)). |

The commands named by a noun add an entry, and `/ref` adds a reference to
it ([decision 35](requirements.md#decisions)). Other extensions add their own
slash commands after these, for example `/cite` and `/research` of
nimblescape Markdown Paper: `/cite` adds a citation of a source, and
`/research` on selected text marks a claim for which an AI agent researches
evidence.

## Figures, tables and links to them

A figure, a table and a listing have a caption: a paragraph that starts with
a word, a number and a colon, directly before the image, the table or the
listing, for example `Figure 1: Plan of the study`. A figure is an image that
stands alone in its paragraph after its caption; an image without a caption
is no figure. A link to a figure or a table goes to its anchor, which stands
at the end of its caption:

```markdown
Figure 1: Plan of the study<a id="fig-plan-study"></a>

![Plan of the study](images/plan.png)

Table 1: Participants by grade<a id="tab-participants-grade"></a>

| Grade | Participants |
| ----- | ------------ |
| 5     | 12           |

As [Table 1](#tab-participants-grade) and [Figure 1](#fig-plan-study) show, …
```

- `/figure` and `/table` add the figure and the table; `/ref` adds the link
  ([Slash commands](#slash-commands)). `/ref` gives a figure or a table
  without an anchor an anchor with up to three words of its caption, in small
  letters and without small words such as "by" and "the", for example
  `tab-participants-grade`.
- The text of a link is a word and a number. The word stays as you write it,
  for example "Tabelle" in a German text; `/ref` takes the word of the last
  link of the same kind in the file, or else the word of the language of VS
  Code (German or English).
- The formatter writes the number of each caption and of each link anew
  from the order of the figures and the tables in the file, so that a moved
  table keeps the right number in its caption and in every link
  ([Formatter](#formatter)). You can write a caption without a number, for
  example `Table: Grades`; the formatter adds it. The words of a caption are
  "Figure" or "Abbildung", "Table" or "Tabelle", and "Listing". A link in a
  code block or a code span, and a link to an anchor that the file does not
  have, stay as they are.
- The file holds the numbers, so GitHub and every other viewer of Markdown
  show them. Headings get no numbers, because a number would change the ID
  that GitHub gives the heading and break the links of other files
  ([R-GEN-016](requirements.md#r-gen-016)).
- An image of the older form, with an anchor at its end and without a
  caption, gets a caption line with the text of the image from the
  formatter.
- When the file holds a generated list of figures, tables or listings of
  nimblescape Markdown Paper, between `<!-- lof -->` and `<!-- /lof -->`
  (`lot`, `lol`), the formatter gives each caption of that kind an anchor, so
  that each entry of the list links to it.
- The clean editing view hides the anchors, and a file with an anchor opens
  in it ([Clean editing view](#clean-editing-view)).
- `/ref` also links a section, the part of the text under a heading, with
  the numbers of its chapter, for example `[Chapter 2.1](#methods)`. The link
  is a plain Markdown link to the ID that GitHub and the Markdown preview
  give the heading, and the heading gets no anchor. The chapters are the
  headings of the highest level that more than one heading has; a single
  title `#` above them gets no number. The word is "Chapter", or "Kapitel"
  in a VS Code in German, until a link of the file uses another one
  ([R-XREF-003](requirements.md#r-xref-003)).
- When you change the text of a heading, its ID changes, and its links
  break, as on GitHub. Change a heading with F2 (Rename Symbol) of VS Code
  instead: it updates the links to the heading in the workspace. The setting
  `markdown.validate.enabled` of VS Code reports a link whose heading is
  gone, and `/ref` inserts it anew. The formatter numbers a
  link to a heading only when its word is "Chapter", "Kapitel", "Section" or
  "Abschnitt", so that a link such as `[Step 2](#install)` keeps its text.
- GitHub and the Markdown preview show the link with its number, and a click
  on it goes to the figure, the table or the section. The captions themselves have no
  number in GitHub and the preview; nimblescape Markdown Paper numbers them
  in the PDF of a paper, for example "Table 1: Participants by grade".

## Values of the front matter

`/ref` lists the keys of the front matter of the file with their values,
after the figures, tables and sections, and inserts the value of the chosen
key between two hidden markers:

```markdown
---
title: A paper
author:
  name: Hannes Stauss
---

This is <wbr><!--{title}-->A paper<!--{/title}--> of <wbr><!--{author.name}-->Hannes Stauss<!--{/author.name}-->.
```

- GitHub and the Markdown preview show only the value. The clean editing
  view hides the markers; text typed at the start or the end of a value
  stays outside of it.
- The formatter writes the current value of the key between the markers, so
  a change of the front matter reaches every place of the value with the
  next format or save. Text typed inside a value goes with the next format.
- A key under another key has the path of the keys, for example
  `author.name`; a list shows its items with commas.

## Listings of code

A Markdown file can live in a repository with other source code, for
example a paper in the folder `paper/` of a project. `/listing` adds code of
a file of the repository, or a snippet of it, and the formatter keeps it
current:

````markdown
Listing 1: [Reading the fields](../src/notes/fields.ts#L12-L30) (fields.ts, L12-L30)<a id="lst-reading-fields"></a>

<!-- listing: ../src/notes/fields.ts#read-fields -->

```typescript
export function readFields(lines: readonly string[]): Map<string, string> {
  …
}
```
````

- On an empty line, type `/listing` and choose the file, then "Whole file"
  or a snippet of it ([Snippets](#snippets)); a file without snippets gives
  its whole text. Type the caption, which is selected.
- The caption after `Listing 1:` is your own text, and a link to the source:
  a click on it on GitHub opens the source file at the lines of the
  snippet. After the link, the formatter writes the cite of the source, the
  file and the lines, for example `(fields.ts, L12-L30)`, for a reader of a
  printed page. It keeps the link and the cite current; you write only the
  text.
- The comment before the code block names the source: the path from the
  Markdown file, and after `#` the name of a snippet, for example
  `#read-fields`. You can also write the comment yourself before a code
  block.
- The formatter writes the current code of the source into the code block on
  each format and each save, also on the command line. It reads an open
  source file as it stands in VS Code, also before you save it. A listing
  whose file or snippet it does not find keeps its code; the text editor and
  the Problems view show a warning at its comment, the command line names
  it, and `--check` fails.
- A listing of a function, a class or a method is a snippet around it. The
  name after `#` never names a function by itself, for example
  `#readFields`: such a listing is not found. Only a parser of the language
  finds functions reliably, and these come later.
- `/listing` lists the files of more than 80 types: the programming
  languages, the configuration files (JSON, JSONC, YAML, TOML, `.env`, INI, Dockerfile,
  Makefile), CSS, SCSS, HTML, XML, SQL, shell scripts and others.
- GitHub and the Markdown preview show the caption and the code block,
  without the comment. `/ref` links a listing, for example
  `[Listing 1](#lst-reading-fields)`. The formatter writes the numbers into
  the captions and the links.
- The clean editing view shows only the text of the caption and the code
  block: it hides the comment, and the link around the caption with the
  cite. Ctrl+Click
  (Cmd+Click on a Mac) on the caption there, or on the path in the comment
  in the text editor of the file with markup, opens the source file at the
  snippet.

### Snippets

A snippet is a part of a source file, for example a function, a class or a
few lines of a function. Two comments mark it:

```ts
export function parse(lines: readonly string[]): Token[] {
  // markdownnotes: snippet keep-lines
  const kept = lines.filter(Boolean);
  // markdownnotes: /snippet keep-lines
  return kept;
}
```

- Select the lines in the source file and type `/`, then choose `/snippet`;
  or choose "Add Snippet" in the light bulb or the Command Palette. Type the
  name: small letters and digits, with `-` between them. The extension
  writes the two marks in the comment form of the type of the file, for
  example `#` in Python, YAML, TOML and `.env`, `//` in JSONC and SCSS,
  `/* */` in CSS and `<!-- -->` in HTML. In a file type that the extension
  does not know, VS Code writes the comments, as with "Add Line Comment".
  JSON has no comments, so a JSON file has no snippets.
- `/listing` lists the snippets of a file after "Whole file". A listing
  names a snippet after `#`:
  `<!-- listing: ../src/parse.ts#keep-lines -->`.
- The code of a listing never shows the marks of the snippets.
- `/snippet` shows from the start in a workspace that holds a Markdown
  file, because the extension starts with it; "Add Snippet" in the Command
  Palette works in any window.
- In the text editor of a source file, each mark line shows a small gray tag
  in place of the comment. The start tag names the snippet and the listings
  that show it, for example
  `snippet keep-lines · Listing 2 in paper/paper.md`; click it to open the
  Markdown file at the caption of the listing. The end tag is `/snippet keep-lines`; click
  it to go to the start of the snippet. The file itself does not change.
- The cursor jumps over the mark lines, and Backspace and Delete next to
  them do nothing. To change the marks, put the cursor in the code of the
  snippet and open the light bulb (Ctrl+.): "Rename Snippet" also renames
  the snippet in the listings that show it, and "Remove Snippet" deletes
  both marks.
- The highlighter pen in the title of the text editor of a source file with
  snippets, "Show Used Snippets", gives each snippet that a listing shows a
  yellow background; "Hide Used Snippets" removes it.

## Edit an answer

In the side view, click "Edit" (the pencil) at the answer, change the text,
and click "Save" (the check mark), or press Ctrl+Enter. "Cancel" closes the
editor and keeps the answer as it is.

"Save" writes the text back into the answer in the note, with the
indentation of four spaces and the quote markers of the answer. The header of
the answer keeps its author and gets the date and time of the save, because
the text changed; a text that you save unchanged keeps its date. The text gets
the line breaks of the file. The file then has unsaved changes: save it as
usual. Undo in the text editor of the file itself takes the change back; in
the clean editing view, choose "Open File with Markup" first
([Limits](#limits)).

The extension writes the text only when the Markdown preview reads the changed
text as the same note with the same answers. A block quote whose first line is
a header (`**login** · date`) would start a reply, so the extension refuses
such a text, and it refuses an empty text. It shows why and keeps the text in
the editor.

## Text view of a note

"Show as Text" of a thread in the side view shows the whole text of its note
as the file holds it: the header lines, the block quotes of the replies and
the Markdown, in the font of the text editor. You can change the text there,
also the headers, and click "Save" (the check mark) or press Ctrl+Enter to
write it into the file. The extension writes the text only when it stays the
definition of the same note: it starts with the label and the header, ends
where the note ends, and adds or removes no other note. "Cancel" drops the
change, and "Show the Rendered Note" switches the thread back to its rendered
answers.

## Answer a note

You can reply to the note, or to one of its answers:

- **Reply to the note:** click "Answer" (the speech bubble) in the thread,
  write the text, and click "Answer" below it.
- **Reply to an answer:** click "Reply" (the arrow) at the answer, write the
  text, and click "Reply" below it.

The extension writes the reply after the replies to the same answer, one level
deeper ([Threads](#threads)), with its own header: the GitHub login of the
author and the date and time. A refused text stays in an editor, so that you
can correct it and save it, or cancel it.

## Delete an answer or a note

- "Delete" (the trash can) at an answer removes that answer from the note. Its
  replies stay: they move up one level. When you delete the first answer, its
  first reply becomes the first answer. Deleting the only answer removes the
  whole note.
- "Delete Thread" (the trash can in the header of the thread) removes the
  note with all its answers.

When a note goes, its definition goes with one blank line, and its reference
and its start marker leave the text. Undo in the text editor of the file
itself brings the answer or the note back; in the clean editing view, choose
"Open File with Markup" first ([Limits](#limits)).

## Hide the notes from other viewers

GitHub and other Markdown viewers show the notes as footnotes at the end of
the page. When other readers of a file must not see the notes, for example
the readers of a text on GitHub, hide the notes of the file from other
viewers. VS Code with the extension shows the notes of both forms in the
same way: in the side view, as highlights, in the preview and in the clean
editing view.

- The eye in the title of the side view shows the form of the active file:
  an open eye while other viewers show the notes, an eye with a stroke while
  they hide them. Its tooltip says the state and what a click does. The eye
  shows only for a file with notes.
- A click on the eye writes all notes of the file in the other form, in one
  edit that Undo takes back. Each thread of the side view keeps its note.
  The commands "Markdown Notes: Hide Notes from Other Viewers" and "Markdown
  Notes: Show Notes in Other Viewers" of the Command Palette do the same.
- In the hidden form, the text of each note is an HTML comment of its own,
  and the end of the highlight is a comment too, so that no viewer shows any
  part of a note. The first line of the comment of the format holds the
  word `hidden` ([Comment of the format](#comment-of-the-format)):

  ````markdown
  The agents <wbr><!--[note-7k2q green-->change the work of teams<!--note-7k2q]--> in three ways.

  <!--
  [^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00

      Which three ways?
  -->
  ````

- An HTML comment ends at `-->`. When the text of a note holds `-->`, for
  example in HTML code, the file holds `--\>` instead, and the side view
  shows `-->` again. You write the text as always; the extension adds and
  removes the backslash. The
  [specification](format.md#11-the-hidden-form) has the exact rule.
- New notes and answers go into the form of their file. The setting
  `nimblescape.markdownNotes.hideNotesInNewFiles` chooses the form of a file
  that gets its first note; a workspace or a folder can set it, so that a
  repository keeps the notes of its new files hidden.
- When a note of the other form gets into a file, for example from a merge
  or from an AI agent, the text editor shows a hint at the note, and the
  formatter writes it in the form of the file ([Formatter](#formatter)).
- Hidden notes are not secret. Everyone who opens the source of the file
  reads them, for example in the view "Code" of GitHub or in the history of
  the file. For a text that others must not read with its notes, publish a
  copy without the notes
  ([Copy the text without notes](#copy-the-text-without-notes)).

[example-hidden.md](example-hidden.md) is a file whose notes are hidden.
GitHub shows its text without any part of its five notes.

## Copy the text without notes

For a website, a PDF or another place where a text is published, copy the
text of a file without its notes. The file itself does not change.

- "Copy without Notes" writes the text of the active Markdown file without
  its notes to the clipboard.
- "Save Copy without Notes" asks for a new file and writes the text into it.
  The dialog proposes the folder of the file and the name of the file with
  `-without-notes` before the extension, for example
  `paper-without-notes.md`. It does not replace the file itself; after the
  save, "Open" opens the copy.

Both commands are in the menu "…" of the title of the side view and in the
Command Palette, as "Markdown Notes: Copy without Notes" and "Markdown
Notes: Save Copy without Notes". They take the text of the open file, also
with changes that are not saved, also from the clean editing view and the
Markdown preview.

The text has no part of the notes, in both forms
([Hide the notes from other viewers](#hide-the-notes-from-other-viewers)):
no definitions of notes, also of notes without a highlight, each with the
blank line after it, no start markers, no references or end markers, and no
comment of the format. The standard footnotes, all other comments, the
anchors of figures and tables, the values of the front matter, the listings
and the rest of the text stay as they are, with the line breaks of the file.
A note in a code block is code, so it stays too. The text renders as the
Markdown preview shows the file, without the highlights.

A file whose comment of the format names a higher major version than the
extension knows gets a warning and no copy
([Comment of the format](#comment-of-the-format)).

On the command line, `markdownnotes strip` writes the same text
([Formatter on the command line](#formatter-on-the-command-line)).

## Footnotes in the side view

The side view also shows the standard footnotes of the file, the footnotes
that are no note, for example `[^1]` or `[^hong2024]`, so that you write and
change them as the notes, with "Write" and "Preview". The file stays plain
Markdown:

```markdown
Agents change the work of teams.[^1]

[^1]: Hong et al. (2024) describe three ways.
```

- Each footnote is a thread of the list, at the place of its first
  reference, in the order of the file, between the notes. A footnote without
  a reference stands at the place of its definition.
- The thread shows the label as the file holds it, for example `[^1]`,
  "Line N" and the rendered text of the definition. It has no author, no
  date, no color and no replies. The tooltip of the label tells the number
  that GitHub and the Markdown preview show: GitHub numbers the notes and the
  footnotes together, the preview only the footnotes, so the numbers can
  differ.
- The cursor on a reference or in a definition selects the footnote. A
  reference may stand inside the highlight of a note, for example a
  citation in the text that a note is about: the cursor on the reference
  selects the footnote, and the cursor on the rest of the highlight selects
  the note.
- A click on the thread, or on "Line N", shows the first reference in the
  text editor, or the definition of a footnote without a reference.
- "Edit" (the pencil) opens the editor with the text of the definition.
  "Save" writes it back: the first line after `[^1]: `, each further line
  indented by four spaces, as Markdown needs it for a footnote of several
  paragraphs. When the footnote changed in the meantime, the extension
  changes nothing and says so.
- "Delete" (the trash can) asks first, then removes the definition and every
  reference to it in one change. Undo in the text editor of the file takes
  it back; in the clean editing view, choose "Open File with Markup" first
  ([Limits](#limits)).
- "Hide Footnotes" in the menu "…" of the title of the side view hides the
  footnotes, and "Show Footnotes" shows them again; the notes stay. The same
  menu has "Renumber Footnotes" ([Renumber the footnotes](#renumber-the-footnotes)). Both change the setting
  `nimblescape.markdownNotes.showFootnotes` ([Settings](#settings)).
- In the [clean editing view](#clean-editing-view) of a file with notes, the
  definitions of the footnotes that have a reference are hidden while the
  side view shows the footnotes, as the definitions of the notes; "Hide
  Footnotes" shows them in the text again. A file without notes shows its
  definitions in its own text editor.

A change of a footnote adds no comment of the format, and a file without
notes stays a file without notes.

### Add a footnote

Put the cursor where the reference goes, then choose "Add Footnote":

- press Shift+Alt+B on Windows and Linux, or Cmd+K and then B on a Mac;
- click "Add Footnote" (`+¹`) in the title of the side view;
- choose "Add Footnote" in the context menu of the text editor or in the
  Command Palette;
- or type `/footnote` after a word ([Slash commands](#slash-commands)).

The side view opens the editor of the new footnote. Its title shows the text
before the place of the reference, for example "New footnote after “Agents
change the work of teams.”".
Write the text in Markdown and click "Add Footnote" (the check mark) or press
Ctrl+Enter; "Cancel" or Escape writes nothing. The extension then writes, in
one change:

- the reference with the next free number, one more than the highest label
  of the file that is a number, for example `[^3]`. It goes after the word
  when the cursor stands in a word, after the text before the spaces before
  the cursor, or at the end of the selected text;
- the definition `[^3]: ` with your text after the last definition of a
  standard footnote, or at the end of the file, with a blank line before it.

No reference goes into a code span, a code block, the text of a link or a
marker of a note; the editor then asks you to put the cursor into the text,
and the extension writes nothing.

### Checks of the footnotes

The text editor and the Problems view warn at each form of a standard
footnote that GitHub and the Markdown preview show differently from what you
meant. Click the light bulb, or press Ctrl+. (Cmd+. on a Mac), for the quick
fix:

| Warning | Why | Quick fix |
| --- | --- | --- |
| The file has no footnote … | The reference shows as text. | "Add Definition" opens the editor of a new definition for the label in the side view. Write the text and click "Add Definition"; the extension writes the definition after the last definition of a standard footnote and selects the footnote. |
| No reference … names this footnote | GitHub and the preview do not show a footnote without a reference. A reference in its own definition does not count. | "Delete Definition" removes the definition with the blank line after it. Undo takes it back. |
| An earlier footnote of the file has the label … | The references name the first definition of the label. | None: give the second footnote a label of its own, or delete it. |

For a file in the [clean editing view](#clean-editing-view), the warnings
show in the Problems view only.

### Renumber the footnotes

"Renumber Footnotes" gives the footnotes whose labels are numbers the labels
1, 2, 3 … in the order of their first reference, after you added, moved or
deleted footnotes. It changes the references and the definitions in one
change, which Undo takes back. Before and after:

```markdown
First[^3], then[^1].

[^1]: One.

[^3]: Three.
```

```markdown
First[^1], then[^2].

[^2]: One.

[^1]: Three.
```

- Choose it in the Command Palette for the active Markdown file, also in the
  clean editing view, or in the menu "…" of the title of the side view.
- The footnotes with a number but without a reference follow, in the order
  of their definitions. A label that is a word, for example `[^hong2024]`,
  stays, and so do the labels of the notes.
- When a reference of a number has no definition, or a number has a second
  definition, the command changes nothing and names the line: a new label
  could name another footnote. Repair it first
  ([Checks of the footnotes](#checks-of-the-footnotes)).
- The numbers that GitHub and the preview show do not depend on the labels;
  the command makes the labels of the file match the order of the text.

### Make a note a footnote

When the authors accept the text of a note into the document, "Make
Footnote" (the numbered list in the header of the thread) turns the note into
a standard footnote. Before and after:

```markdown
The agents <wbr><!--[note-7k2q-->change the work[^note-7k2q] of teams[^1].

[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00

    A source for this claim.

    > **anna** · 2026-10-28 11:02+01:00
    >
    > Agreed.

[^1]: One.
```

```markdown
The agents change the work[^2] of teams[^1].

[^1]: One.

[^2]: A source for this claim.
```

- The text of the first answer becomes the text of the footnote. The
  reference of the note at the end of the highlight becomes the reference of
  the footnote, with the next free number as its label, as for
  [a new footnote](#footnotes-in-the-side-view); its definition goes after
  the last definition of a footnote, or at the end of the file.
- The start marker, the definition of the note and its replies go. A note
  with replies asks first. The side view then selects the new footnote.
- A note of the hidden form becomes a footnote that every viewer shows.
- A note without a reference in the text, or whose first answer has no text,
  stays, and a message says why.
- Undo in the text editor of the file itself brings the note back; in the
  clean editing view, choose "Open File with Markup" first
  ([Limits](#limits)). "Renumber Footnotes" then puts the numbers in the
  order of the text ([Renumber the footnotes](#renumber-the-footnotes)).

## Highlights in the Markdown preview

The built-in Markdown preview (Ctrl+Shift+V, or Ctrl+K V to the side) shows
the highlight of each note in the color of the note
([Show and hide the highlights](#show-and-hide-the-highlights)). It shows
no icon and no callout: the text of the notes shows in the side view. The
notes never show as footnotes at the end of the page, and their markers leave
the text.

- Under the pointer, a highlight is strong, and the pointer shows a hand.
- A click on a highlight selects its note, and a double click on it opens
  the side view, where you can edit and answer the note. That double click
  selects no word and does not open the text editor.
- A click on the text outside the highlights deselects the note.
- Selected text gets the button "Add Note" above it, which adds a note to it
  ([Add a note](#add-a-note)).
- A click on a link of the text, a drag that selects text and a double click
  on other text, which opens the text editor, work as without the extension.
- The note that is selected in the side view has a strong highlight with a
  frame in its color, the other highlights are dimmed, and a click on its
  thread scrolls the preview to it.

The preview passes a click to the extension as a link of the scheme
`vscode://` to the extension; VS Code may ask once whether the extension may
open it. Outside the highlights, the preview shows the file as without the
extension.

For a paper document, nimblescape Markdown Paper shows the pages of its
layout in the Markdown preview. The highlights, the selection of a note and
"Add Note" work in these pages in the same way; the PDF of the paper has no
notes.

## Modes of a Markdown file

VS Code 1.143 shows a Markdown file in one of three modes. The switch at the
top right of the editor, or "Reopen Editor With…", changes the mode:

| Mode | Notes |
| --- | --- |
| Text Editor | All features of this guide. |
| Markdown Preview | The highlights, as in the preview to the side. The buttons "Show or Hide Notes" and "Hide Highlights" or "Show Highlights" are in its title. The side view "Notes" lists the notes of the file, and a click on a thread keeps the mode and scrolls to the note. |
| Markdown Editor | The side view "Notes" lists the notes of the file, and a click on a thread selects the text of its highlight in the Markdown Editor. The Markdown Editor itself shows no notes and no highlights. |

The Markdown Editor renders the file with its own engine, which takes no
plugin of an extension, and its comments come from an API that only the
extensions of VS Code may use; the Marketplace refuses an extension that uses
such an API. The Markdown Editor therefore shows a start marker as a gap, a
reference as its text, for example `[^note-7k2q]`, and the text of a note as
a code block. The notes stay in the file as they are. Use the text editor or
the mode "Markdown Preview" to see the highlights.

## Formatter

The extension brings a formatter of Markdown files. It is the default
formatter of Markdown, so "Format Document" (Shift+Alt+F) formats every
Markdown file with it. When you save a Markdown file with notes, with the
comment of the format, or with a part whose text the formatter keeps current
(a listing, a value of the front matter, an anchor of a figure, a table, a
listing or a section), the extension formats it too; another Markdown file
keeps its text on a save. It changes:

- Each paragraph stands on one line, also in a list item or a block quote.
  A hard line break stays: two spaces or a backslash at the end of a line.
  Turn on the word wrap of VS Code (Alt+Z) to read long lines.
- The columns of a table are aligned, after the alignment of its delimiter
  row, by the width that the text editor shows: the hidden markers of the
  notes count nothing, and a wide character, such as a Chinese character or
  an emoji, counts two columns.
- No line ends with spaces, apart from a hard line break; one blank line
  stands between two blocks and around each heading with `#`; the file ends
  with one line break.
- Each start marker of a note starts with `<wbr>`, and a note without a start
  marker gets one at the start of the text of its block, so that GitHub
  shows the paragraph whole and every note has its highlight.
- The number of each link to a figure, a table, a listing or a section
  follows their order in the file
  ([Figures, tables and links to them](#figures-tables-and-links-to-them)).
- Each value of the front matter in the text gets the current value of its
  key ([Values of the front matter](#values-of-the-front-matter)).
- Each listing gets the current code of its source
  ([Listings of code](#listings-of-code)).

It keeps code blocks, HTML and comments (also the comment of the format of
the notes), a front matter, math blocks (`$$`), containers (`:::`), headings
underlined with `===` or `---`, and the answers of the notes as they are; of
a note, it changes only the start marker. When the formatted text would show
other blocks or another text in the preview, it changes nothing. Undo takes a change back.

The setting `nimblescape.markdownNotes.formatOnSave` turns the format on save
off; "Save without Formatting" saves one file without it, and an automatic
save after a delay never formats. To format every Markdown file on a save,
add to your settings (`settings.json`):

```json
"[markdown]": {
  "editor.formatOnSave": true
}
```

Another formatter takes over with `"editor.defaultFormatter"` in the same
block, for example `"esbenp.prettier-vscode"`; then the extension formats no
file on a save.

### Formatter on the command line

Programs and AI agents that change a Markdown file outside VS Code run the
same formatter on the command line: the command `markdownnotes` of the npm
package `@nimblescape/markdownnotes`, with Node.js 22 or later. For now
there is no release, so the package is not on npmjs.com: install it from
GitHub, with a clone of the repository at a fixed commit, as
[CONTRIBUTING.md](../CONTRIBUTING.md#npm-package) shows. Then the command
runs as follows:

```sh
markdownnotes format paper.md notes/*.md
markdownnotes format --check paper.md
cat paper.md | markdownnotes format -
markdownnotes strip paper.md > public/paper.md
markdownnotes strip --out public paper.md notes/*.md
```

After a release, `npx -y @nimblescape/markdownnotes format paper.md` runs it
from npmjs.com without an installation.

The first command formats the files and writes only those that change. With
`--check` it changes no file, names each file that is not formatted, and
exits with 1, for example in a check of a pull request. It reads the source
of each listing relative to the Markdown file, or to the current folder for
the standard input, and names each listing whose source it does not find; with
`--check`, such a file counts as not formatted. `-` formats the
standard input to the standard output. The exit code 2 means a wrong command
or a file that cannot be read or written. The specification of the format
for AI agents ([docs/format.md](format.md)) tells them to run the command
after a change of a file with notes.

`markdownnotes strip` writes the text of a file without its notes, as "Copy
without Notes" does ([Copy the text without notes](#copy-the-text-without-notes)):
with one file to the standard output, with `-` from the standard input, and
with `--out <folder>` a copy of each file into the folder, under the name of
the file. Several files need `--out`. The command never changes a file
itself: it refuses a copy that would replace one of its files, or the copy of
another file of the same name, and exits with 2. A program calls the same
code as `stripNotes(lines)` of the library of the npm package.

## Settings

| Setting | Default | Effect |
| --- | --- | --- |
| `nimblescape.markdownNotes.showHighlights` | `true` | Shows the highlight of each note in its color in the text editor and in the Markdown preview, also while the side view "Notes" is closed. The value `false` hides them; the highlight of the selected note and a highlight under the pointer still show. The buttons "Hide Highlights" and "Show Highlights" change it ([Show and hide the highlights](#show-and-hide-the-highlights)). |
| `nimblescape.markdownNotes.showFootnotes` | `true` | Shows the standard footnotes of the file, for example `[^1]`, in the side view, where you edit and delete them ([Footnotes in the side view](#footnotes-in-the-side-view)). The value `false` shows the notes only. "Hide Footnotes" and "Show Footnotes" in the menu "…" of the title of the side view change it. |
| `nimblescape.markdownNotes.addFormatComment` | `true` | Adds the comment of the format of the notes at the top of a file with notes when you save it ([Comment of the format](#comment-of-the-format)). The value `false` adds it only with a change of a note. An editor that only shows a file never adds it. |
| `nimblescape.markdownNotes.formatOnSave` | `true` | Formats a Markdown file with notes, or with the comment of the format, when you save it ([Formatter](#formatter)). The value `false` formats a file only with "Format Document". |
| `nimblescape.markdownNotes.hideNotesInNewFiles` | `false` | The value `true` hides the notes of a file that gets its first note from other viewers, also from GitHub ([Hide the notes from other viewers](#hide-the-notes-from-other-viewers)). A file that has notes keeps its form; the eye in the title of the side view changes it. A folder of a workspace can have its own value. |
| `nimblescape.markdownNotes.openLinksIn` | `newWindow` | Where a link in a note to a file opens from the side view: `newWindow` in a new window of VS Code, so that the Markdown file and its preview stay as they are; `editor` in the editor of VS Code; `system` with the program of your system, for example the PDF viewer. A link to a web page or an e-mail address always opens with your system. A folder of a workspace can have its own value. |

For Zen Mode, turn on the setting
`"workbench.editor.centeredLayoutFixedWidth": true` of VS Code, so that the
text editor keeps its width when the side view opens
([Side view "Notes"](#side-view-notes)).

The settings `showNotesIn`, `expandInEditor`, `collapseInEditor`,
`keepNotesCollapsed`, `showCalloutOnHover`, `showInPreview`,
`showIconsInPreview` and `showFunnels` of earlier versions have no effect;
you can remove them from your settings.

## Limits

- In the [clean editing view](#clean-editing-view), Undo takes back the
  changes of the view only, not a change of the side view, such as a new,
  changed or deleted note or footnote. "Open File with Markup" and Undo there take it back. The warnings of
  the notes show in the Problems view only, the left edge shows no changes of
  git, and a hidden highlight does not show under the pointer. "Format Document"
  formats the text of the view; the save formats the whole file. An edit
  that opens a comment or a code block over a note changes how the file
  reads, and the view then shows the markup that is no longer a note, until
  Undo. Its Markdown preview does not show an image of HTML (`<img>`) from
  outside the folder of the file, nor a style sheet of `markdown.styles` with
  an absolute path; use a relative path from the folder of the workspace.
- The mode "Markdown Editor" of VS Code shows no notes and no highlights,
  only the side view does; the section
  [Modes of a Markdown file](#modes-of-a-markdown-file) explains why.
- A note needs a reference in the text of a paragraph, a heading, a list item
  or a table cell. A note in a block quote shows in VS Code, but not on
  GitHub.
- On GitHub, the notes share the numbers of the footnotes of the page, and
  GitHub shows them at the end of the page with the other footnotes, unless
  the notes of the file are hidden
  ([Hide the notes from other viewers](#hide-the-notes-from-other-viewers)).
- The notes of the older form `<!-- note … -->` are not converted; the
  extension no longer reads them.
- A listing shows a whole file or a snippet, and never a function, a class
  or a method by its name: mark it as a snippet.
- The text editor and the side view show the notes of the open Markdown files
  only.
- The side view stands next to the text editor only; next to the preview it
  lists the threads. Where lines wrap, the heights of the threads are
  estimates.
- In Zen Mode, the text editor gets narrower when the side view opens,
  unless you turn on the fixed width with
  `"workbench.editor.centeredLayoutFixedWidth": true` in your user settings
  ([Side view "Notes"](#side-view-notes)).
- A hidden highlight in the text editor stays visible after the pointer left
  it, until the pointer rests on other text or the cursor moves.
- In the Markdown preview, the button above the selected text adds a note;
  the light bulb, the shortcut and the context menu work in the text editor
  only, because VS Code tells an extension no selected text of the preview.
  "Add Footnote" works in the text editor only, for the same reason.
  A double click in the preview opens the text editor, so select the text
  with a drag.
- The buttons "Show or Hide Notes" and "Hide Notes" close the secondary side
  bar. When you move the view to the primary side bar or to the panel, close
  it there as any other view.
- The buttons "Show Highlights" and "Hide Highlights" change the setting of
  the workspace or of the user, not the value of a folder of the workspace.
- A file of a read-only file system, for example the older version of a file
  in a Git diff, shows no notes in the text editor and in the side view,
  because the extension cannot change it; the preview shows its highlights.
- VS Code 1.143 draws Mermaid diagrams in the preview itself. When the
  extension "Markdown Preview Mermaid Support" is also active, the preview
  draws no diagram; this happens also without this extension.

---

© 2026 Hannes Stauss (scalarion@nimblescape.com) ·
[MIT License](https://github.com/nimblescape/markdownnotes-vscode/blob/main/LICENSE).
