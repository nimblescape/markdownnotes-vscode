# Change log

Each section lists the changes of one released version. The release workflow
takes the section of a version as the notes of its GitHub release.

## 0.1.0

The first version.

- Notes in Markdown files: HTML comments that start with `<!-- note` on a
  line of their own, with an optional front matter that names the author and
  the date, and a body in Markdown.
- The text editor shows each note in a box with its author and date, and can
  fold each note of several lines. The Comments view lists the notes of the
  open Markdown files.
- "Edit Note" turns the box into an editor of Markdown, and "Save" writes the
  text back into the comment of the note. The `+` in the gutter adds a note
  with the author and the date, and "Delete Note" removes a note.
- The built-in Markdown preview shows each note as a callout. A note inside a
  paragraph shows as a number in the text, with its callout after the
  paragraph.
- A note must not contain another comment: the extension refuses such a text
  and warns at such a note in the file.
- The settings `nimblescape.markdownNotes.author`,
  `nimblescape.markdownNotes.expandInEditor` and
  `nimblescape.markdownNotes.showInPreview`.
