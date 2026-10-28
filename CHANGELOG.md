# Change log

Each section lists the changes of one released version. The release workflow
takes the section of a version as the notes of its GitHub release.

## 0.1.0

The first version.

- Notes in Markdown files: HTML comments that start with `<!-- note` (a
  block note) or `<!-- note inline` (an inline note in the text of a
  paragraph). Each note is a thread of answers, and each answer has a front
  matter with its author and date and a body in Markdown.
- New notes and answers need a GitHub sign-in of VS Code, and name the GitHub
  login of the user as their author.
- The text editor shows each thread in a collapsible box below the note, with
  one comment for each answer. It dims the notes while the cursor is outside
  them, and everything outside a note while the cursor is in it. It collapses
  the notes when a file opens, so that they vanish without a paragraph break,
  with a numbered marker in the color of the note in the left margin; "Collapse
  Note", "Collapse All Notes" and "Expand All Notes" fold them. The Comments
  view lists the notes of the open Markdown files.
- "Edit" turns an answer into an editor of Markdown, and "Save" writes the
  text back into the comment. The reply field adds an answer, the `+` in the
  gutter adds a note, "Delete" removes an answer, and "Delete Thread" removes
  a note.
- The side view "Notes" lists the threads of the active Markdown file, with
  "Edit", "Delete", "Answer", "Delete Thread" and "Add Note", and an editor
  with the tabs "Write" and "Preview". The links of the notes open: web and
  mail links with the system, files in VS Code at a line or a heading. The
  view is in the secondary side bar, and the button "Show or Hide Notes" in
  the title of the Markdown editors opens and closes it, also in Zen Mode.
- The built-in Markdown preview shows each note as a small icon: an inline
  note in the text, a block note in the left margin. The icon shows the note
  as a callout on hover and keyboard focus, and opens it in the side view on
  a click. An inline note never ends a paragraph: the preview removes it with
  its blanks and blank lines, so that the paragraph stays one paragraph,
  without a line break. The eye in the title of the preview hides and shows
  the notes.
- A note must not contain another comment: the extension refuses such a text
  and warns at such a note in the file.
- The settings `nimblescape.markdownNotes.collapseInEditor`,
  `nimblescape.markdownNotes.expandInEditor` and
  `nimblescape.markdownNotes.showInPreview`.
