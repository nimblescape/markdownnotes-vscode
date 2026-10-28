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
- Highlights: each note belongs to a text of the file, its highlight, from
  its start marker `<wbr><!--[note-7k2q-->` to its reference. Every note has
  a start marker, and `<wbr>` keeps the paragraph whole on GitHub also when
  the marker starts a line. The start marker keeps the color of the note,
  for example `<wbr><!--[note-7k2q green-->`; all notes have the same color,
  blue, until the user gives a note one of six colors.
- The text editor and the Markdown preview show the highlights in the colors
  of their notes, with a good contrast, while the side view "Notes" is open.
  "Hide Highlights" and "Show Highlights" in the title of the editors change
  the setting `nimblescape.markdownNotes.showHighlights`; "Show Highlights"
  also opens the side view, and closing the side view hides the highlights.
  A hidden highlight shows while the pointer is on it. A click on a highlight
  selects its note in the side view and opens the side view. The highlight of
  the selected note is strong with a frame, and the other highlights are
  dimmed; a click outside the highlights deselects the note.
- The side view "Notes" is the only place of the text of the notes. It
  lists the threads of the active Markdown file, also in the modes "Markdown
  Preview" and "Markdown Editor" of VS Code, with their trees of replies.
  Next to the text editor, each thread stands at the height of its highlight
  and moves with the text, and only the selected thread has a line to its
  highlight. Its buttons are icons with tooltips: "Reply", "Edit" and
  "Delete" at each answer; the color, "Show as Text", "Answer" and "Delete
  Thread" at each thread; "Add Note" in its title. "Show as Text" shows the
  whole note as the file holds it, for a change of the whole text. The editor
  of a text switches between "Write" and "Preview". The links of the notes
  open: web and mail links with the system, files in VS Code at a line or a
  heading. The view is in the secondary side bar, and the button "Show or
  Hide Notes" in the title of the Markdown editors opens and closes it, also
  in Zen Mode.
- New notes: the user selects text, and a hover over the selected text shows
  "Add Note" and the six colors; a click on a color opens the editor of the
  new note in the side view. "Add Note" in the title of the side view and in
  the context menu of the text editor does the same. There is no note
  without highlighted text.
- New notes and answers need a GitHub sign-in of VS Code, and name the GitHub
  login of the user as their author. VS Code shows each date in the local
  time of the reader, and its tooltip or hover the local time of the author.
  A saved change of an answer gets the date of the save.
- The text editor never shows the text of a note and its markers: it
  collapses the notes, and collapses again a note that VS Code opens; the
  cursor steps over a hidden marker, and Backspace and Delete never change
  it. A header line that shows, for example of a note in the first line of
  the file, shows rendered with the author and the date.
- The Markdown preview shows the highlights, and never a note as a footnote.
- A comment at the top of each file with notes, after a front matter, names
  the format of the notes with its version and links to the specification
  `docs/format.md`, so that programs and AI agents know how to read and add
  notes. The extension writes it as soon as an editor shows a file with
  notes, unless the setting `nimblescape.markdownNotes.addFormatComment` is
  off, and with each change of a note; it removes it with the last note, and
  changes no note of a file whose comment names a newer version.
- The text editor and the Problems view warn at each form of a note that
  GitHub shows differently or that breaks a rule of the notes: no blank line
  before or after the note, lines without the indentation of four spaces, a
  second note of a label, a reference without a note or a note without a
  reference, a note in a block quote, a reference in the text of a link, in
  a heading or in a note, a note without a start marker or without
  highlighted text, and a start marker without `<wbr>` at the start of a
  line.
- An own Markdown formatter for "Format Document" and format on save, the
  default for Markdown files: each paragraph on one line with its hard line
  breaks, aligned columns of the tables, no white space at the end of a line,
  one blank line between blocks, one line break at the end of the file,
  `<wbr>` before each start marker, and a start marker for each note without
  one. It keeps code blocks, HTML, a front matter, math, containers and the
  notes, and keeps the text as it was when the preview would show it
  differently.
- The formatter on the command line for programs and AI agents: the command
  `markdown-notes` of the npm package `@nimblescape/markdown-notes`, with
  Node.js 22 or later. `npx -y @nimblescape/markdown-notes format <file>...`
  formats the files, `--check` changes nothing and exits with 1 when a file
  is not formatted, and `-` formats the standard input. The specification of
  the format of the notes tells AI agents to run it after a change.
- The extension pack installs "Markdown Footnotes" of Matt Bierner, so that
  the preview shows the other footnotes of a file.
- The notes work together with the Markdown extensions of other publishers,
  for example the extensions of Matt Bierner for Mermaid diagrams, emoji,
  footnotes, checkboxes and the GitHub styles. A footnote in a note is a
  footnote of the page.
- The settings `nimblescape.markdownNotes.showHighlights`,
  `nimblescape.markdownNotes.openLinksIn` and
  `nimblescape.markdownNotes.addFormatComment`.
