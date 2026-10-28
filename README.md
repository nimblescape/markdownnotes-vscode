# nimblescape Markdown Notes

Adds notes to Markdown files in VS Code. A note is an HTML comment that
starts with `<!-- note` or `<!-- note inline`, so the file stays plain
Markdown. Several authors can answer a note, so each note is a thread of
answers. The text editor shows each thread in a collapsible box below the
note, as GitHub pull requests show their comments, and dims the source of the
comment. The Markdown preview shows each note as a small icon, which shows
the note on hover and opens it in the side view "Notes" on a click. The side
view is the editor of the notes. Every change goes back into the comment in
the file, with the GitHub login of the author.

![VS Code with the extension: on the left, the side view Notes with two threads, one with the answers of hannes and anna; in the middle, the text editor with the dimmed source of an inline note and its open box with both answers and the field Answer; on the right, the Markdown preview with the icon of the inline note in the text, its callout with both answers on hover, and the icon of a block note in the left margin](https://raw.githubusercontent.com/nimblescape/nimblescape-markdown-notes/main/docs/images/notes.png)

## What the extension does on your computer

- **When it works.** The extension starts when a Markdown file opens, or when
  you click the icon of a note in the Markdown preview. It does not run in
  VS Code for the Web.
- **Markdown files.** The extension reads the open Markdown files to find
  their notes. It changes the text of a file only when you save, add, answer
  or delete a note, and only the comment of that note; you save the file as
  usual, and Undo takes the change back. Comments that do not start with
  `<!-- note` stay as they are.
- **GitHub sign-in.** New notes and answers need a sign-in with GitHub, so
  that the author is always known. The extension uses the GitHub sign-in of
  VS Code (the scope `read:user`) and reads only the login of your account.
  It sends no request to GitHub itself.
- **Markdown preview.** The extension adds a markdown-it plugin, a style
  sheet and a script to the built-in Markdown preview of VS Code. The plugin
  changes only the comments that are notes; the script shows the callout of
  an icon.
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

- **Threads.** Each note is a thread of answers. Each answer has its own
  front matter with the GitHub login of its author and the date.
- **Notes in the text editor.** A box below each note shows its answers as
  Markdown, with the author and the date, and can be collapsed and expanded.
  The source of the comment is dimmed, so that the Markdown of the document
  stands out. The editor can fold each note of several lines.
- **Edit, answer, delete.** "Edit" turns an answer into an editor of
  Markdown, and "Save" writes the text back into the comment. The reply field
  of a box adds an answer. "Delete" removes an answer, and "Delete Thread"
  the whole note.
- **New notes.** The `+` in the gutter of a line adds a note: an inline note
  after a line of a paragraph, or a block note after another block.
- **Side view "Notes".** The view lists the threads of the active Markdown
  file and selects the thread at the cursor. Each answer has "Edit" and
  "Delete", each thread "Answer" and "Delete Thread". The editor has the tabs
  "Write" and "Preview". "Add Note" adds a note at the line of the cursor. The
  links of the notes open, and the button "Hide Notes" (×) closes the side
  bar with one click, also in Zen Mode.
- **Icons in the Markdown preview.** The preview shows each note as a small
  icon: an inline note in the text, a block note in the left margin. On hover
  or keyboard focus, the icon shows the rendered callout with all answers. A
  click opens the note in the side view. The eye in the title of the preview
  hides and shows the notes.
- **Inline notes.** An inline note never ends a paragraph: the preview
  removes it with the blanks and blank lines before and after it, so that
  the paragraph stays one paragraph, without a line break.
- **Comments view.** The Comments view lists the notes of the open Markdown
  files; a click goes to the note.
- **No comment in a note.** A note must not contain another comment. The
  extension refuses such a text and warns at such a note in the file.

## Usage

Write a block note as an HTML comment that starts with `<!-- note` on a line
of its own. Each answer starts with a front matter, then the text in normal
Markdown:

```markdown
<!-- note
---
author: hannes
date: 2026-10-28T10:15+01:00
---
Check the **dates** with the team before Friday.
---
author: anna
date: 2026-10-28T11:02+01:00
---
Friday works.
-->
```

An inline note `<!-- note inline` belongs to a place in the text of a
paragraph. The preview shows its icon there, and the paragraph stays one
paragraph:

```markdown
Version 2.0 comes out in November.
<!-- note inline
---
author: hannes
date: 2026-10-28T10:15+01:00
---
Which day exactly?
-->
The beta starts one week before.
```

In the text editor:

| Action | How |
| --- | --- |
| Open the box of a note | Click the mark in the gutter at the note, or a note in the Comments view. |
| Edit an answer | Click "Edit" (pencil) at the answer, change the text, then click "Save" or press Ctrl+Enter. "Cancel" keeps the answer as it is. |
| Answer a note | Write the text in the reply field of its box, then click "Answer". |
| Add a note | Click the `+` in the gutter of a line, write the text, then click "Add Note". |
| Delete an answer or a note | Click "Delete" (trash can) at the answer, or "Delete Thread" (trash can) in the title of the box. Undo brings it back. |

In the Markdown preview (Ctrl+K V opens it to the side), move the pointer to
the icon of a note to see the note, and click the icon to open it in the side
view "Notes". VS Code may ask once whether the extension may open the link.

The first time you add or answer a note, VS Code asks you to sign in with
GitHub. On macOS, use Cmd instead of Ctrl. The
[user guide](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/guide.md)
describes every feature.

## Settings

| Setting | Default | Effect |
| --- | --- | --- |
| `nimblescape.markdownNotes.expandInEditor` | `false` | Opens the box of each note in the text editor. The value `false` shows only the mark at each note. |
| `nimblescape.markdownNotes.showInPreview` | `true` | Shows the notes as icons with callouts in the Markdown preview. The value `false` shows the preview without the notes. The eye in the title of the preview changes it. |

## Limits

- The Markdown Editor of VS Code (the visual editor) offers extensions no API
  for this. The extension shows no notes there; use the text editor and the
  Markdown preview.
- A note that starts after the text of a line cannot have a front matter and
  must not contain a blank line, because both would change the Markdown of
  the paragraph. Such a note therefore takes no answers; the extension writes
  each new note on lines of its own. A note in a table cell, in a code block or in a block
  of other HTML is no note, as the Markdown preview does not show it as a
  comment of Markdown.
- The text editor, the Comments view and the side view show the notes of the
  Markdown files that are open in VS Code, not of every file of the workspace.
- A file of a read-only file system, for example an older version of a file
  in a Git diff, shows no boxes. The preview shows its icons.

---

[Change log](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/CHANGELOG.md) · [Contributing](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/CONTRIBUTING.md) · [User guide](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/guide.md) · [Support](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/SUPPORT.md) · [Issues](https://github.com/nimblescape/nimblescape-markdown-notes/issues) · [Source](https://github.com/nimblescape/nimblescape-markdown-notes)

© 2026 Hannes Stauss (scalarion@nimblescape.com) · [MIT License](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/LICENSE).
