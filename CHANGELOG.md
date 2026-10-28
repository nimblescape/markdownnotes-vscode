# Change log

Each section lists the changes of one released version. The release workflow
takes the section of a version as the notes of its GitHub release.

## 0.1.0

The first version.

- Notes in Markdown files: a note is a Markdown footnote with the label
  `note-` and four random small letters or digits, for example
  `[^note-7k2q]`, and a header line with the GitHub login of the author and
  the date with the offset of the time zone, for example
  `**hannes** · 2026-10-28 10:15+01:00`. The body is Markdown, indented by
  four spaces. GitHub shows each note as a footnote at the end of the page.
  Other footnotes stay footnotes.
- Threads: each note is a thread with a tree of replies. A reply is a block
  quote with its own header, and a reply to a reply stands in the block quote
  of the answer it replies to.
- New notes and answers need a GitHub sign-in of VS Code, and name the GitHub
  login of the user as their author. VS Code shows each date in the local
  time of the reader, and its tooltip or hover the local time of the author.
- The text of the notes shows in the side view "Notes", or with the setting
  `nimblescape.markdownNotes.showNotesIn` set to `inline` in a collapsible box
  below each note in the text editor, with one comment for each answer and
  the label "Reply to …" at a reply to a reply. The text editor dims the
  notes while the cursor is outside them, and everything outside a note while
  the cursor is in it. It collapses the notes when a file opens, so that they
  vanish, with a numbered marker in the color of the note in the left margin;
  "Hide Note Text", "Show Note Text", "Collapse All Notes" and "Expand All
  Notes" fold them, and the setting
  `nimblescape.markdownNotes.keepNotesCollapsed` keeps them collapsed. The
  Comments view lists the notes of the open Markdown files.
- "Edit" turns an answer into an editor of Markdown, and "Save" writes the
  text back into the note. The reply field answers the note, "Reply" at an
  answer replies to this answer, the `+` in the gutter adds a note, "Delete"
  removes an answer and keeps its replies, and "Delete Thread" removes a
  note.
- The side view "Notes" lists the threads of the active Markdown file, also
  in the modes "Markdown Preview" and "Markdown Editor" of VS Code, with
  their trees of replies, with "Reply", "Edit", "Delete", "Answer", "Delete
  Thread" and "Add Note", and an editor with the tabs "Write" and "Preview".
  The links of the notes open: web and mail links with the system, files in
  VS Code at a line or a heading. The view is in the secondary side bar, and
  the button "Show or Hide Notes" in the title of the Markdown editors opens
  and closes it, also in Zen Mode.
- The side view shows a badge with the number and the color of each note,
  and a funnel from the selected thread to the mark of its note in a strip
  that stands for the whole file; "Show Funnels" and "Hide Funnels" in its
  title turn them on and off. A click on a thread selects its note and shows
  it in the mode of the file, and the passage of the selected note has a
  strong highlight with a frame in the text editor and the preview.
- A saved change of an answer gets the date of the save.
- The text editor shows the header line of each answer as one rendered line
  with the author and the date, for example "hannes · 2026-10-28 10:15",
  also on the line of the cursor; the cursor does not stay on it.
- Notes on a selection: a hidden start marker `<!--[note-7k2q-->` starts the
  passage of a note and its reference ends it; without the marker, the
  passage starts at the start of its paragraph, and the marker directly
  before the reference is a point. The `+` on selected text adds such a note,
  as for the comment of a pull request. The text editor hides the marker and
  the reference behind thin bars or a dot in the color of the note and
  highlights the passage; the preview highlights it and shows the icon of the
  note at its end. The cursor steps over a hidden marker, and Backspace and
  Delete never change it. A click on the passage selects its note in the side
  view.
- The built-in Markdown preview shows each note as a small icon at its
  reference, and never as a footnote. The icon shows the note as a callout on
  hover and keyboard focus, and opens it in the side view on a click, as a
  click on the highlighted passage does. The eye
  in the title of the preview hides and shows the notes.
- A comment at the top of each file with notes, after a front matter, names
  the format of the notes with its version and links to the specification
  `docs/format.md`, so that programs and AI agents know how to read and add
  notes. The extension writes it with the first note and removes it with the
  last one, and changes no note of a file whose comment names a newer
  version.
- The text editor and the Problems view warn at each form of a note that
  GitHub shows differently: no blank line before or after the note, lines
  without the indentation of four spaces, a second note of a label, a
  reference without a note or a note without a reference, a note in a block
  quote, a reference in the text of a link, in a heading or in a note, and a
  start marker at the start of a line.
- The extension pack installs "Markdown Footnotes" of Matt Bierner, so that
  the preview shows the other footnotes of a file.
- The notes work together with the Markdown extensions of other publishers,
  for example the extensions of Matt Bierner for Mermaid diagrams, emoji,
  footnotes, checkboxes and the GitHub styles: in the text and in the
  callouts. A footnote in a note is a footnote of the page.
- The settings `nimblescape.markdownNotes.showNotesIn`,
  `nimblescape.markdownNotes.collapseInEditor`,
  `nimblescape.markdownNotes.keepNotesCollapsed`,
  `nimblescape.markdownNotes.expandInEditor`,
  `nimblescape.markdownNotes.showFunnels`,
  `nimblescape.markdownNotes.showInPreview`,
  `nimblescape.markdownNotes.showCalloutOnHover` and
  `nimblescape.markdownNotes.openLinksIn`.
