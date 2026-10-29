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
  Other footnotes stay footnotes, which the side view edits too.
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
  of their notes, with a good contrast, also while the side view "Notes" is
  closed. "Hide Highlights" and "Show Highlights" in the title of the
  editors, with the icon of a highlighter pen, change the setting
  `nimblescape.markdownNotes.showHighlights`, leave the side view as it is,
  and deselect the selected note.
  A hidden highlight shows while the pointer is on it. A click on a highlight
  selects its note, and a double click opens the side view. The highlight of
  the selected note is strong with a frame, and the other highlights are
  dimmed; a click outside the highlights, or the cursor that leaves the
  highlight, deselects the note.
- The side view "Notes" is the only place of the text of the notes. It
  lists the threads of the active Markdown file, also in the modes "Markdown
  Preview" and "Markdown Editor" of VS Code, with their trees of replies.
  The list scrolls on its own, and a click on a highlight or a move of the
  cursor into it scrolls its thread to the top, also when the view opens
  after the selection; each thread that is not selected is dimmed. A click on
  a thread scrolls the text editor or the preview smoothly to its note, over
  the whole way: the extension scrolls the text editor itself in small steps
  while `editor.smoothScrolling` is on, which it turns on for Markdown
  files. Its buttons are icons with
  tooltips: "Reply", "Edit" and
  "Delete" at each answer; the color, "Show as Text", "Answer" and "Delete
  Thread" at each thread; "Add Note" in its title. "Show as Text" shows the
  whole note as the file holds it, for a change of the whole text. The editor
  of a text switches between "Write" and "Preview". The links of the notes
  open: web and mail links with the system, files in VS Code at a line or a
  heading. The view is in the secondary side bar, and the button "Show or
  Hide Notes" in the title of the Markdown editors opens and closes it, also
  in Zen Mode. Its header stays at the top, with the name of the file, the
  todo filter (the open or the completed todos), the colors as dots, "Clear
  Filter" and a search field for the text and the authors of the answers;
  the filters that are on combine.
- Standard footnotes in the side view: each footnote that is no note, for
  example `[^1]`, is a thread of the list at the place of its first
  reference, with its label, the numbers that GitHub and the Markdown
  preview show in the tooltip of the label, and its rendered text. "Edit"
  writes its definition, and
  "Delete" asks first and then removes the definition and every reference.
  The cursor on a reference or in a definition selects the footnote, also a
  reference inside the highlight of a note. "Add Footnote" (Shift+Alt+B,
  Cmd+K B on a Mac, in the title of the side view, the context menu and the
  Command Palette) opens the editor of a new footnote for the place of the
  cursor, and writes its reference with the next free number and its
  definition after the last footnote. "Hide Footnotes" and "Show Footnotes"
  in the title of the side view change the setting
  `nimblescape.markdownNotes.showFootnotes`. While the side view shows the
  footnotes, the clean editing view of a file with notes hides the
  definitions of the footnotes that have a reference, as the definitions of
  the notes. A change of a footnote adds no comment of the format.
- Todo notes: the header of the first answer of a note ends with ` · todo`
  for an open task and ` · done` for a completed one; a check box in the side
  view changes it.
- Slash commands in the text editor: a `/` at the start of a line or after a
  space offers `/note` for the text that the slash replaced, `/todo` for that
  text or the sentence before it, `/footnote` for a standard footnote after
  the word before it, in the editor of the side view, `/date`, `/time` and
  `/user` for the GitHub login of the user, in the list
  of suggestions of VS Code; Tab or Enter takes the chosen command.
- New notes: the user selects text and chooses "Add Note" in the light bulb
  at the selected text (Ctrl+.), with the shortcut Shift+Alt+N (Cmd+K N on a
  Mac), in the context menu of the text editor, or in the title of the side
  view, and in the Markdown preview with the button "Add Note" above the
  selected text; the editor of the new note opens in the side view, with the
  colors of the notes. Nothing shows by itself over the selected text. There is no note
  without highlighted text.
- New notes and answers need a GitHub sign-in of VS Code, and name the GitHub
  login of the user as their author. VS Code shows each date in the local
  time of the reader, and its tooltip or hover the local time of the author.
  A saved change of an answer gets the date of the save.
- The clean editing view: a Markdown file with notes opens in a text editor
  of its text without the notes markup, which behaves as in a file without
  notes; the extension writes each change into the file and keeps each note
  at its text, also for Undo, and the save of the view saves the file. Its
  Markdown preview shows the highlights, and the images and the style sheets
  of `markdown.styles` as the preview of the file. "Open File with Markup" in
  the Command Palette opens the file itself.
- The text editor of the file itself, for example in the view of the changes
  of git, never shows the text of a note and its markers: it collapses the
  notes, and collapses again a note that VS Code opens; the cursor steps over
  a hidden marker, and Backspace and Delete never change it. A header line
  that shows, for example of a note in the first line of the file, shows
  rendered with the author and the date.
- The Markdown preview shows the highlights, and never a note as a footnote.
- A comment at the top of each file with notes, after a front matter, names
  the format of the notes with its version and links to the specification
  `docs/format.md`, so that programs and AI agents know how to read and add
  notes. The extension writes it with each change of a note and with the
  save of a file with notes, unless the setting
  `nimblescape.markdownNotes.addFormatComment` is off for the save; an
  editor that only shows a file never changes it. It removes the comment
  with the last note. The version `v1.0.0` is a semantic version: the
  extension writes a comment anew only when its own version is higher, and
  changes no note of a file whose comment names a higher major version.
- The text editor and the Problems view warn at each form of a note that
  GitHub shows differently or that breaks a rule of the notes: no blank line
  before or after the note, lines without the indentation of four spaces, a
  second note of a label, a reference without a note or a note without a
  reference, a note in a block quote, a reference in the text of a link, in
  a heading or in a note, a note without a start marker or without
  highlighted text, and a start marker without `<wbr>` at the start of a
  line.
- An own Markdown formatter, the default for "Format Document" of Markdown
  files and the format on save of a Markdown file with notes or with the
  comment of the format; other Markdown files keep their text on a save
  (setting `nimblescape.markdownNotes.formatOnSave`): each paragraph on one line with its hard line
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
  `nimblescape.markdownNotes.showFootnotes`,
  `nimblescape.markdownNotes.openLinksIn`,
  `nimblescape.markdownNotes.addFormatComment` and
  `nimblescape.markdownNotes.formatOnSave`.
