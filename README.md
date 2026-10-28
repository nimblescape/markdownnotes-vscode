# nimblescape Markdown Notes

Adds notes to Markdown files in VS Code. A note is a Markdown footnote with a
header line, so the file stays plain Markdown and GitHub shows each note as a
footnote at the end of the page. Several authors can answer a note and each
other, so each note is a thread with a tree of replies. The text editor shows
each thread in a collapsible box below the note, as GitHub pull requests show
their comments. The Markdown preview shows each note as a small icon, which
shows the note on hover and opens it in the side view "Notes" on a click. The
side view is the editor of the notes. Every change goes back into the
footnote in the file, with the GitHub login of the author.

![VS Code with the extension: on the left, the text editor with the highlighted passage of a note, its open box with the answers of hannes and anna and the reply of hannes labeled Reply to anna, and the dimmed footnote of the note with its rendered header lines; in the middle, the Markdown preview with the icon of the note at the end of the passage and its callout on hover, with the reply indented below the answer of anna; on the right, the side view Notes with both threads and their funnels](https://raw.githubusercontent.com/nimblescape/nimblescape-markdown-notes/main/docs/images/notes.png)

## What the extension does on your computer

- **When it works.** The extension starts when a Markdown file opens, or when
  you click the icon of a note in the Markdown preview. It does not run in
  VS Code for the Web.
- **Markdown files.** The extension reads the open Markdown files to find
  their notes. It changes the text of a file only when you save, add, answer
  or delete a note, and only the footnote of that note, its reference and its
  start marker; you save the file as usual, and Undo takes the change back.
  Other footnotes, for example `[^1]`, stay as they are.
- **GitHub sign-in.** New notes and answers need a sign-in with GitHub, so
  that the author is always known. The extension uses the GitHub sign-in of
  VS Code (the scope `read:user`) and reads only the login of your account.
  It sends no request to GitHub itself.
- **Markdown preview.** The extension adds a markdown-it plugin, a style
  sheet and a script to the built-in Markdown preview of VS Code. The plugin
  changes only the footnotes that are notes; the script shows the callout of
  an icon.
- **Extension pack.** VS Code installs the extension "Markdown Footnotes"
  (`bierner.markdown-footnotes`) together with this extension, so that the
  preview shows the other footnotes of a file. You can disable it; the notes
  keep working.
- **Side view.** The side view "Notes" is a webview of the extension. Its
  page runs only the script of the extension.
- **Network.** The extension's own code connects to no address, runs no
  program and collects no telemetry.
- **Restricted Mode and virtual workspaces.** The extension works with all
  features in both, because it only reads and changes the text of the open
  Markdown files.

[Security](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/security.md#what-the-extension-does-on-your-computer)
describes each step and where its protection ends.

## Features

- **Threads.** Each note is a thread: its first answer and a tree of replies,
  as in a discussion on Reddit. Each answer has a header with the GitHub login
  of its author and the date.
- **Notes in the text editor.** A box below each note shows its answers as
  Markdown, with the author and the date, and can be collapsed and expanded.
  The editor dims the notes while the cursor is outside them, and everything
  outside a note while the cursor is in it.
- **Collapsed notes.** The text editor collapses the notes when a file opens,
  so that each note vanishes. A numbered marker in the color of the note
  stays in the left margin, where VS Code shows its comment markers; its
  folding arrow opens the note.
- **Rendered header lines.** In an open note, the header of each answer
  shows as one rendered line with the date in your local time, for example
  "hannes · 2026-10-28 10:15". The hover shows the time of the author.
- **Edit, reply, delete.** "Edit" turns an answer into an editor of Markdown,
  and "Save" writes the text back into the note. The reply field of a box
  answers the note, and "Reply" at an answer replies to this answer.
  "Delete" removes an answer and keeps its replies, and "Delete Thread"
  removes the whole note.
- **New notes.** The `+` adds a note, as for the comment of a pull request:
  on selected text, a note that belongs to exactly this passage; on a line
  of a paragraph, a heading, a list item or a table cell, a note at a point
  at the end of the line.
- **Notes on a selection.** A hidden start marker `<!--[note-7k2q-->` and the
  reference `[^note-7k2q]` stand around the passage. The text editor hides
  them behind thin bars in the color of the note and highlights the passage;
  the preview highlights it and shows the icon of the note at its end.
  GitHub shows the paragraph without the marker.
- **Side view "Notes".** The view lists the threads of the active Markdown
  file and selects the thread at the cursor. Each answer has "Reply", "Edit"
  and "Delete", each thread "Answer" and "Delete Thread". The editor has the
  tabs "Write" and "Preview". "Add Note" adds a note at the cursor. The links
  of the notes open. The view is in the secondary side bar, beside the chat,
  so the Explorer stays usable; the button "Show or Hide Notes" in the title
  of the Markdown editors opens and closes it with one click, also in Zen
  Mode. Each thread has a badge with the number and the color of its note,
  and a funnel leads from each thread to the mark of its note in a strip that
  stands for the whole file.
- **Icons in the Markdown preview.** The preview shows each note as a small
  icon at its reference, and never as a footnote at the end of the page. On
  hover or keyboard focus, the icon shows the rendered callout with all
  answers. A click opens the note in the side view. The eye in the title of
  the preview hides and shows the notes.
- **Comments view.** The Comments view lists the notes of the open Markdown
  files; a click goes to the note.
- **Warnings.** The text editor and the Problems view warn at each form of a
  note that GitHub shows differently, for example a note without a blank
  line after it, or a reference in the text of a link.

## Usage

A note is a footnote: a reference in the text, and a definition after the
paragraph of the reference. The first line of the definition is the header,
with the GitHub login of the author in bold and the date with the offset of
the time zone. The body follows in normal Markdown, indented by four spaces:

```markdown
The agents <!--[note-7k2q-->change the work of teams[^note-7k2q] in three ways.

[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00

    Which three ways?

    > **anna** · 2026-10-28 11:02+01:00
    >
    > The ways of the plan.
    >
    > > **hannes** · 2026-10-28 11:30+01:00
    > >
    > > Thanks, then I change the text.
```

- `<!--[note-7k2q-->` starts the passage of the note, and the reference
  `[^note-7k2q]` ends it. Without a start marker, the passage starts at the
  start of the paragraph; `<!--[note-7k2q-->[^note-7k2q]` is a note at a
  point.
- Each reply is a block quote with its own header. A reply to a reply stands
  in the block quote of the answer it replies to: above, Anna replies to the
  note and Hannes replies to Anna.
- A footnote is a note only when its label is `note-` and four small letters
  or digits, and its first line is a header. Every other footnote stays a
  footnote.

You do not need to write these lines yourself: the extension writes them when
you add or answer a note. In the text editor:

| Action | How |
| --- | --- |
| Open the box of a note | Click the mark in the gutter at the note, or a note in the Comments view. |
| Edit an answer | Click "Edit" (pencil) at the answer, change the text, then click "Save" or press Ctrl+Enter. "Cancel" keeps the answer as it is. |
| Answer a note | Write the text in the reply field of its box, then click "Answer". |
| Reply to an answer | Click "Reply" (arrow) at the answer, write the text, then click "Save". |
| Add a note | Select a passage or put the cursor on a line, click the `+` in the gutter, write the text, then click "Add Note". |
| Delete an answer or a note | Click "Delete" (trash can) at the answer, or "Delete Thread" (trash can) in the title of the box. Undo brings it back. |

In the Markdown preview (Ctrl+K V opens it to the side), move the pointer to
the icon of a note to see the note, and click the icon to open it in the side
view "Notes". VS Code may ask once whether the extension may open the link.

The first time you add or answer a note, VS Code asks you to sign in with
GitHub. On macOS, use Cmd instead of Ctrl. The
[user guide](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/guide.md)
describes every feature, also how a repository of documents recommends the
extension to everyone who opens it.

## Settings

| Setting | Default | Effect |
| --- | --- | --- |
| `nimblescape.markdownNotes.collapseInEditor` | `true` | Collapses the notes in the text editor the first time a file is in the active editor, so that each note vanishes and only its marker in the left margin shows. The value `false` keeps the notes open. |
| `nimblescape.markdownNotes.showFunnels` | `true` | Shows the strip with the marks of the notes and the funnels from the threads to them in the side view "Notes". |
| `nimblescape.markdownNotes.expandInEditor` | `false` | Opens the box of each note in the text editor. The value `false` shows only the mark at each note. |
| `nimblescape.markdownNotes.showInPreview` | `true` | Shows the notes as icons with callouts in the Markdown preview. The value `false` shows the preview without the notes. The eye in the title of the preview changes it. |

## Limits

- The Markdown Editor of VS Code (the visual editor) offers extensions no API
  for this. The extension shows no notes there; use the text editor and the
  Markdown preview.
- GitHub shows the notes as footnotes at the end of the page, numbered
  together with the other footnotes. GitHub shows no footnote in a block
  quote, so the extension writes each note after the outermost block.
- The text editor shows the lines of a note, which are indented by four
  spaces, in the color of a code block.
- The notes of the older form `<!-- note … -->` are not converted; the
  extension no longer reads them.
- The text editor, the Comments view and the side view show the notes of the
  Markdown files that are open in VS Code, not of every file of the workspace.
- A file of a read-only file system, for example an older version of a file
  in a Git diff, shows no boxes. The preview shows its icons.

---

[Change log](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/CHANGELOG.md) · [Contributing](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/CONTRIBUTING.md) · [User guide](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/guide.md) · [Support](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/SUPPORT.md) · [Issues](https://github.com/nimblescape/nimblescape-markdown-notes/issues) · [Source](https://github.com/nimblescape/nimblescape-markdown-notes)

© 2026 Hannes Stauss (scalarion@nimblescape.com) · [MIT License](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/LICENSE).
