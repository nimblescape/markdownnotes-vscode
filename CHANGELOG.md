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
  of a text has the tabs "Visual" and "Markdown". "Visual" edits the
  rendered text with the editor of the mode "Markdown Editor" of VS Code:
  the block with the cursor shows its Markdown marks, the rest of the text
  stays as it was, and a toolbar and Ctrl+B, Ctrl+I, Ctrl+E and Ctrl+K put
  bold, italic, code and a link around the selected text. "Markdown"
  switches between "Write" and "Preview". The links of the notes open: web and mail links with the system, files in VS Code at a line or a
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
  in the menu "…" of the title of the side view change the setting
  `nimblescape.markdownNotes.showFootnotes`. While the side view shows the
  footnotes, the clean editing view of a file with notes hides the
  definitions of the footnotes that have a reference, as the definitions of
  the notes. A change of a footnote adds no comment of the format.
- Checks of the standard footnotes: the text editor and the Problems view
  warn at a reference without a definition, at a definition without a
  reference and at a second definition of a label. The quick fix "Add
  Definition" opens the editor of a new definition for the label in the side
  view, and "Delete Definition" removes a definition without a reference.
  "Renumber Footnotes" (Command Palette, menu "…" of the side view) gives the
  footnotes whose labels are numbers the labels 1, 2, 3 … in the order of
  their first reference, in one change; labels that are words stay.
- "Make Footnote" at a thread of the side view turns a note whose text the
  authors accept into a standard footnote: the text of the first answer
  becomes the footnote, the reference of the note gets the next free number,
  and the definition goes after the last one; the start marker and the
  replies go. A note with replies asks first.
- Listings of files of other repositories: the front matter of a paper names
  each other repository under `repos` as a GitHub reference with a rev, for
  example `server: org/server@v2.1.0`, which the command `mp get` of
  nimblescape Markdown Paper clones into `.markdownpaper/repos/server/`. A
  listing `<!-- listing: server:src/api.ts#read -->` gets its code from the
  clone, and its caption links to the file on GitHub at the commit of the
  clone. `/listing` lists the files of the clones by their references, and a
  missing reference or clone gets a warning with the command that fixes it.
- Two changes of the notes of one file run one after the other. A change
  that VS Code does not write into the file, and a new note or footnote
  whose place an earlier change moved while it waited, are not saved, and
  their messages say why.
- Todo notes: the header of the first answer of a note ends with ` · todo`
  for an open task and ` · done` for a completed one; a check box in the side
  view changes it.
- Slash commands in the text editor: a `/` at the start of a line or after a
  space offers `/note` for the text that the slash replaced, `/todo` for that
  text or the sentence before it, `/footnote` for a standard footnote after
  the word before it, in the editor of the side view, `/date`, `/time` and
  `/user` for the GitHub login of the user, in the list
  of suggestions of VS Code; Tab or Enter takes the chosen command.
- Figures, tables and links to them: `/figure` inserts a chosen image of the
  workspace as a figure, an image alone in its paragraph after its caption
  line `Figure 1: Caption`, `/table` a table after its caption line
  `Table 1: Caption`, and `/ref` a link to a figure or a table of the file,
  for example `[Table 1](#tab-grades)`, after it gave the target an anchor
  `<a id="tab-grades"></a>` at the end of its caption. `/ref` also links a
  section with the numbers of its chapter, for example
  `[Chapter 2.1](#methods)`, by the ID that GitHub gives its heading,
  without an anchor. The formatter writes the number of each caption and of
  each link from the order of the figures, the tables, the listings and the
  headings in the file, gives an image of the older form with an anchor a
  caption line, and gives each caption an anchor when the file holds the
  generated list of its kind; the clean editing view hides the anchors. The
  file is document driven: it holds the numbers, and headings get none.
- Values of the front matter in the text: `/ref` inserts the value of a key
  of the front matter between hidden markers, for example
  `<wbr><!--{title}-->A paper<!--{/title}-->`, and the formatter writes the
  current value into it on each format.
- Listings of code: `/listing` inserts the code of a source file of the
  workspace, or of a snippet of it, as a code block with its caption line
  and the comment of its source, for example
  `<!-- listing: ../src/fields.ts#read-fields -->`. The caption is free
  text and a link to the lines of the source, with the cite of the source
  after it, for example
  `Listing 1: [Reading](../src/fields.ts#L12-L30) (fields.ts, L12-L30)`. The
  formatter writes the current code of the source into each listing and the
  current lines into the link of its caption and its cite, in VS Code and on the command line, which names
  a listing whose source it does not find; the text editor shows a warning
  at such a listing. The clean editing view shows only the text of the
  caption and the code block; Ctrl+Click on the caption opens the source.
  `/ref` links a listing, for example `[Listing 1](#lst-reading-fields)`.
- Snippets in the source code: `/snippet` after selected lines of a source
  file, or "Add Snippet", writes the marks
  `// markdownnotes: snippet <name>` and `// markdownnotes: /snippet <name>`
  around them in the comment form of the type of the file, also in
  configuration files such as JSONC, YAML, TOML and `.env`, and in any
  other language that VS Code knows, and a listing names the snippet as
  `#<name>`. In the text editor of the source file, each mark line shows as
  a small gray tag in place of the comment, the start tag with the listings
  that show the snippet; the cursor jumps over the mark lines, a click on
  the end tag goes to the start, "Rename Snippet" and "Remove Snippet" are
  in the light bulb, and the button "Show Used Snippets" colors the used
  snippets. A
  function, a class or a method is a listing through a snippet around it.
  Ctrl+Click on the comment of a listing opens its source at the snippet.
- The notes in the pages of a paper: the highlights, the selection of a
  note and "Add Note" work in the pages that nimblescape Markdown Paper shows
  in the Markdown preview.
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
- Hidden notes: the eye in the title of the side view writes all notes of a
  file in the hidden form, which GitHub and every other Markdown viewer
  hide, or back in the visible form, in one edit that Undo takes back. In
  the hidden form, each definition of a note is an HTML comment of its own,
  the end of a highlight is the comment `<!--note-7k2q]-->`, the comment of
  the format holds the word `hidden`, and the text of a note escapes `-->`
  with a backslash, `--\>`. The extension shows the notes of both forms in
  the same way, and writes new notes in the form of the file. The commands
  "Hide Notes from Other Viewers" and "Show Notes in Other Viewers" do the
  same as the eye, and the setting
  `nimblescape.markdownNotes.hideNotesInNewFiles` chooses the form of a
  file that gets its first note.
- The text without notes, for publishing: "Copy without Notes" and "Save
  Copy without Notes", in the Command Palette and in the menu "…" of the
  title of the side view, write the text of the active Markdown file without
  its notes, their markers and the comment of the format, to the clipboard
  or to a new file. The standard footnotes, the other comments and the rest
  of the text stay as they are. The file itself does not change.
- The text editor and the Problems view warn at each form of a note that
  GitHub shows differently or that breaks a rule of the notes: no blank line
  before or after the note, lines without the indentation of four spaces, a
  second note of a label, a reference without a note or a note without a
  reference, a note in a block quote, a reference in the text of a link, in
  a heading or in a note, a note without a start marker or without
  highlighted text, a start marker without `<wbr>` at the start of a
  line, and an end marker of a hidden note at the start of a line. A hint
  marks a note in the other form than its file.
- An own Markdown formatter, the default for "Format Document" of Markdown
  files and the format on save of a Markdown file with notes or with the
  comment of the format; other Markdown files keep their text on a save
  (setting `nimblescape.markdownNotes.formatOnSave`): each paragraph on one line with its hard line
  breaks, aligned columns of the tables, no white space at the end of a line,
  one blank line between blocks, one line break at the end of the file,
  `<wbr>` before each start marker, a start marker for each note without
  one, the numbers of the links to figures, tables, listings and sections,
  the current values of the front matter, the current code of the
  listings, and each note in the form of its file. A file with a listing, a value of the front matter or an anchor
  is formatted on a save as a file with notes. It keeps code blocks, HTML, a front matter, math, containers and the
  notes, and keeps the text as it was when the preview would show it
  differently.
- The formatter on the command line for programs and AI agents: the command
  `markdownnotes` of the npm package `@nimblescape/markdownnotes`, with
  Node.js 22 or later. `npx -y @nimblescape/markdownnotes format <file>...`
  formats the files, `--check` changes nothing and exits with 1 when a file
  is not formatted, and `-` formats the standard input. The specification of
  the format of the notes tells AI agents to run it after a change. Programs
  call the same formatter as the library `formatMarkdown(lines)` of the
  package, with its types. `markdownnotes strip <file>` writes the text of a
  file without its notes to the standard output, and `--out <folder>` writes
  copies of several files; the library has `stripNotes(lines)`.
- The extension pack installs "Markdown Footnotes" of Matt Bierner, so that
  the preview shows the other footnotes of a file.
- The notes work together with the Markdown extensions of other publishers,
  for example the extensions of Matt Bierner for Mermaid diagrams, emoji,
  footnotes, checkboxes and the GitHub styles. A footnote in a note is a
  footnote of the page.
- An API for other extensions, such as nimblescape Markdown Paper:
  `getAPI(1)` of the export of the extension, with `fileOf`, which names the
  file behind a clean editing view, `registerFormatStep` for a step of the
  formatter after the steps of the notes, which run again while the steps
  change the text, `registerHiddenBlocks` for blocks
  at the end of a file and `registerHiddenMarkers` for markers in its lines
  that the clean editing view leaves out, and `registerSlashCommand` for a
  slash command, also one on selected text.
- The settings `nimblescape.markdownNotes.showHighlights`,
  `nimblescape.markdownNotes.showFootnotes`,
  `nimblescape.markdownNotes.openLinksIn`,
  `nimblescape.markdownNotes.addFormatComment`,
  `nimblescape.markdownNotes.formatOnSave` and
  `nimblescape.markdownNotes.hideNotesInNewFiles`.
