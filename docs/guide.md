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
| [Add a note](#add-a-note) | text editor, side view | available | [R-SIDE-003](requirements.md#r-side-003), [R-EDIT-003](requirements.md#r-edit-003), [R-EDIT-006](requirements.md#r-edit-006) |
| [Edit and save an answer](#edit-an-answer) | side view | available | [R-EDIT-001](requirements.md#r-edit-001), [R-EDIT-002](requirements.md#r-edit-002) |
| [Text view of a note](#text-view-of-a-note) | side view | available | [R-SIDE-002](requirements.md#r-side-002) |
| [Answer a note or an answer](#answer-a-note) | side view | available | [R-EDIT-005](requirements.md#r-edit-005) |
| [Delete an answer or a note](#delete-an-answer-or-a-note) | side view | available | [R-EDIT-004](requirements.md#r-edit-004), [R-EDIT-007](requirements.md#r-edit-007) |
| [Highlights in the Markdown preview](#highlights-in-the-markdown-preview) | Markdown preview | available | [R-PREV-001](requirements.md#r-prev-001), [R-PREV-003](requirements.md#r-prev-003), [R-PREV-004](requirements.md#r-prev-004) |
| [Modes of a Markdown file](#modes-of-a-markdown-file) | modes "Markdown Preview" and "Markdown Editor" of VS Code | Markdown Preview: available; Markdown Editor: side view only, because VS Code offers no API for extensions there | [R-GEN-001](requirements.md#r-gen-001), [R-PREV-006](requirements.md#r-prev-006) |
| [Formatter](#formatter) | text editor, on save; [command line](#formatter-on-the-command-line) for programs and AI agents | available | [R-FMT-001](requirements.md#r-fmt-001) to [R-FMT-004](requirements.md#r-fmt-004) |
| [Settings](#settings) | VS Code | available | [R-GEN-010](requirements.md#r-gen-010), [R-GEN-011](requirements.md#r-gen-011), [R-NOTE-007](requirements.md#r-note-007) |
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
- While the side view "Notes" is open, the text editor and the preview show
  each highlight in the color of its note, with a background and a line below
  the text ([Show and hide the highlights](#show-and-hide-the-highlights)).
  The overview ruler at the right edge of the text editor has a mark in the
  same color.
- A click with the mouse on a highlight, in the text editor or in the
  preview, selects its note in the side view, and opens the side view when it
  is closed. In the text editor the cursor stays in the text.
- The note that is selected in the side view has a strong highlight with a
  frame in its color, in the text editor and in the preview, so that you see
  which text the selected thread belongs to. The highlights of the other
  notes are dimmed.
- A click with the mouse into the text outside the highlights, in the text
  editor or in the preview, deselects the note. A move of the cursor with the
  keys keeps it.

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
<!-- nimblescape-markdown-notes v1.0.0 spec=https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/format.md
This comment marks a Markdown file with notes of the VS Code extension nimblescape Markdown Notes.
AI agents: read the spec above before you read, change or add a note, and keep this comment as it is.
…
-->
```

- The first line names the format, its version `v1.0.0` and the address of
  the specification `spec=`. Short lines of words follow, and `-->` ends the
  comment. GitHub and the Markdown preview do not show it, and the text
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
  "recommendations": ["nimblescape.nimblescape-markdown-notes"]
}
```

VS Code then shows a message with the button "Install", and the extension
appears under "Workspace Recommendations" in the Extensions view.

## Show and hide the highlights

The highlights show while the side view "Notes" is open and the setting
`nimblescape.markdownNotes.showHighlights` is on, which is the default. They
have a clear background and a line below the text, so that they stand out of
the text.

- The button "Hide Highlights" (a highlighter pen with a stroke) in the title
  of the text editor and of the preview hides them. It turns the setting off: in the settings of
  the workspace when they hold a value, else in your user settings.
- The button "Show Highlights" (a highlighter pen over its line) shows them
  again. It turns the
  setting on, and opens the side view when it is closed.
- Closing the side view also hides the highlights, and keeps the setting.
  Opening the side view shows them again.
- A hidden highlight shows while the pointer rests on its text, and a click
  on it selects its note and opens the side view. In the preview it goes
  away when the pointer leaves the text. VS Code tells an extension no event
  when the pointer leaves the text of the text editor, so there it stays
  until the pointer rests on other text, the cursor moves or the side view
  opens.
- The highlight of the selected note always shows, strong and with a frame.

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
  view.

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

## Side view "Notes"

The side view "Notes" is in the secondary side bar, at the right of the
window, where VS Code also shows the chat. The Explorer and the other views
of the primary side bar stay usable while it is open. The button "Show or Hide
Notes" (two speech bubbles) in the title of the text editor and of the preview
of a Markdown file opens and closes it with one click, also in Zen Mode and
in the modes "Markdown Preview" and "Markdown Editor" of VS Code. A click on
a highlight in the text editor or in the preview opens it too. The view is
the only place of the text of the notes, and their editor:

- The view shows the threads of the active Markdown file, each with the line
  of the note and its answers rendered as Markdown with author and date. The
  replies to a reply stand indented below it. The tooltip of a date shows the
  local time of the author. The active Markdown file is the file of the text
  editor, of the Markdown preview, or of the mode "Markdown Editor" of
  VS Code.
- The buttons are small icons with a tooltip, as the buttons in the title of
  an editor of VS Code. Each answer has "Reply" (an arrow), "Edit" (a pencil)
  and "Delete" (a trash can). Each thread has its color, "Line N", "Show as
  Text", "Answer" (a speech bubble) and "Delete Thread" (a trash can). The
  title of the view has "Add Note" (`+`).
- The view selects the thread at the cursor of the text editor, and the
  thread whose highlight you clicked in the preview. The other threads are
  dimmed while a thread is selected; a thread under the pointer shows clear.
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

### The view next to the text

The side view is a list of the threads in the order of the file, with the
name of the file and your GitHub account at its top, next to the text editor
and next to the Markdown preview alike:

- You scroll the list on its own, with the mouse wheel over the view, to find
  a note. The list does not follow the scrolling of the text editor.
- A click on a highlight, or a move of the cursor into it, selects its thread
  and scrolls the thread to the top of the view. A click on a thread shows its
  highlight in the text editor or the preview.
- While a thread is selected, the other threads are dimmed a little.
- The editor of a new note stands at the top of the list.

VS Code tells an extension only the whole rows that a text editor shows, and
only after it scrolled, and no place of the text of the preview, so the view
cannot stand at the height of each highlight and move smoothly with the
text.

### Editors of the side view

The editor of a text in the side view switches between "Write" (the Markdown
text) and "Preview" (the text rendered as the Markdown preview renders it).
"Save" (a check mark) or Ctrl+Enter writes the text; "Cancel" (×) or Escape
keeps the note as it is. When the extension refuses a text, the editor stays
open and shows why.

A change writes only into the answer or the note that the view showed. When
the file changed in the meantime, for example when a collaborator changed
the note or a second click on "Delete" came before the view showed the new
state, the extension changes nothing and shows a message: look at the note
again, and repeat the change if it is still needed. A change of a setting,
for example with "Hide Highlights", keeps the open editors and their texts.

## Add a note

Every note highlights text, so you first select the text that the note is
about in the text editor. Then:

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

Nothing shows by itself over the selected text, so a selection for a copy or
a change of the text stays as it is.

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

## Highlights in the Markdown preview

The built-in Markdown preview (Ctrl+Shift+V, or Ctrl+K V to the side) shows
the highlight of each note in the color of the note, while the side view is
open ([Show and hide the highlights](#show-and-hide-the-highlights)). It shows
no icon and no callout: the text of the notes shows in the side view. The
notes never show as footnotes at the end of the page, and their markers leave
the text.

- Under the pointer, a highlight is strong, and the pointer shows a hand.
- A click on a highlight selects its note in the side view, and opens the
  side view when it is closed, where you can edit and answer the note.
- A click on the text outside the highlights deselects the note.
- A click on a link of the text, a drag that selects text and a double click,
  which opens the text editor, work as without the extension.
- The note that is selected in the side view has a strong highlight with a
  frame in its color, the other highlights are dimmed, and a click on its
  thread scrolls the preview to it.

The preview passes a click to the extension as a link of the scheme
`vscode://` to the extension; VS Code may ask once whether the extension may
open it. Outside the highlights, the preview shows the file as without the
extension.

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
Markdown file with it. When you save a Markdown file with notes, or with the
comment of the format, the extension formats it too; a Markdown file without
notes keeps its text on a save. It changes:

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
same formatter on the command line: the command `markdown-notes` of the npm
package [`@nimblescape/markdown-notes`](https://www.npmjs.com/package/@nimblescape/markdown-notes),
with Node.js 22 or later. `npx` runs it without an installation:

```sh
npx -y @nimblescape/markdown-notes format paper.md notes/*.md
npx -y @nimblescape/markdown-notes format --check paper.md
cat paper.md | npx -y @nimblescape/markdown-notes format -
```

After `npm install --global @nimblescape/markdown-notes`, the command is
`markdown-notes format paper.md`.

The first command formats the files and writes only those that change. With
`--check` it changes no file, names each file that is not formatted, and
exits with 1, for example in a check of a pull request. `-` formats the
standard input to the standard output. The exit code 2 means a wrong command
or a file that cannot be read or written. The specification of the format
for AI agents ([docs/format.md](format.md)) tells them to run the command
after a change of a file with notes.

## Settings

| Setting | Default | Effect |
| --- | --- | --- |
| `nimblescape.markdownNotes.showHighlights` | `true` | Shows the highlight of each note in its color in the text editor and in the Markdown preview, while the side view "Notes" is open. The value `false` hides them; the highlight of the selected note and a highlight under the pointer still show. The buttons "Hide Highlights" and "Show Highlights" change it ([Show and hide the highlights](#show-and-hide-the-highlights)). |
| `nimblescape.markdownNotes.addFormatComment` | `true` | Adds the comment of the format of the notes at the top of a file with notes when you save it ([Comment of the format](#comment-of-the-format)). The value `false` adds it only with a change of a note. An editor that only shows a file never adds it. |
| `nimblescape.markdownNotes.formatOnSave` | `true` | Formats a Markdown file with notes, or with the comment of the format, when you save it ([Formatter](#formatter)). The value `false` formats a file only with "Format Document". |
| `nimblescape.markdownNotes.openLinksIn` | `newWindow` | Where a link in a note to a file opens from the side view: `newWindow` in a new window of VS Code, so that the Markdown file and its preview stay as they are; `editor` in the editor of VS Code; `system` with the program of your system, for example the PDF viewer. A link to a web page or an e-mail address always opens with your system. A folder of a workspace can have its own value. |

The settings `showNotesIn`, `expandInEditor`, `collapseInEditor`,
`keepNotesCollapsed`, `showCalloutOnHover`, `showInPreview`,
`showIconsInPreview` and `showFunnels` of earlier versions have no effect;
you can remove them from your settings.

## Limits

- In the [clean editing view](#clean-editing-view), Undo takes back the
  changes of the view only, not a change of the side view, such as a new,
  changed or deleted note, because that change leaves the text of the view as
  it is. "Open File with Markup" and Undo there take it back. The warnings of
  the notes show in the Problems view only, the left edge shows no changes of
  git, and a hidden highlight does not show under the pointer. "Format Document"
  formats the text of the view; the save formats the whole file. An edit
  that opens a comment or a code block over a note changes how the file
  reads, and the view then shows the markup that is no longer a note, until
  Undo.
- The mode "Markdown Editor" of VS Code shows no notes and no highlights,
  only the side view does; the section
  [Modes of a Markdown file](#modes-of-a-markdown-file) explains why.
- A note needs a reference in the text of a paragraph, a heading, a list item
  or a table cell. A note in a block quote shows in VS Code, but not on
  GitHub.
- On GitHub, the notes share the numbers of the footnotes of the page, and
  GitHub shows them at the end of the page with the other footnotes.
- The notes of the older form `<!-- note … -->` are not converted; the
  extension no longer reads them.
- The text editor and the side view show the notes of the open Markdown files
  only.
- The side view stands next to the text editor only; next to the preview it
  lists the threads. Where lines wrap, the heights of the threads are
  estimates.
- A hidden highlight in the text editor stays visible after the pointer left
  it, until the pointer rests on other text or the cursor moves.
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
[MIT License](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/LICENSE).
