# nimblescape Markdown Notes

Adds notes to Markdown files in VS Code. A note is an HTML comment that
starts with `<!-- note`, so the file stays plain Markdown. The text editor
shows each note in a box with its author and date, where you edit the note as
Markdown; the Comments view lists the notes; and the Markdown preview shows
them as callouts. Every change of a note goes back into its comment in the
file.

![VS Code with the extension: on the left, a Markdown file with a note, whose box below the note shows the editor of the note with Markdown highlighting and the buttons Cancel and Save; on the right, the Markdown preview with the note as a callout with its author and date, and a note inside a paragraph as the number 1 with its callout below the paragraph; at the bottom, the Comments view with both notes](https://raw.githubusercontent.com/nimblescape/nimblescape-markdown-notes/main/docs/images/notes.png)

## What the extension does on your computer

- **When it works.** The extension starts when a Markdown file opens. It
  does not run in VS Code for the Web.
- **Markdown files.** The extension reads the open Markdown files to find
  their notes. It changes the text of a file only when you save, add or
  delete a note, and only the comment of that note; you save the file as
  usual, and Undo takes the change back. Comments that do not start with
  `<!-- note` stay as they are.
- **Markdown preview.** The extension adds a markdown-it plugin and a style
  sheet to the built-in Markdown preview of VS Code. The plugin changes only
  the comments that are notes.
- **Author of a new note.** A new note names the author of the setting
  `nimblescape.markdownNotes.author`, or else `user.name` of the Git
  configuration of the file, which the extension reads through the Git
  extension of VS Code.
- **Network.** The extension connects to no address, runs no program and
  collects no telemetry.
- **Restricted Mode and virtual workspaces.** The extension works with all
  features in both, because it only reads and changes the text of the open
  Markdown files. In Restricted Mode, VS Code turns the Git extension off, so
  a new note names only the author of the setting.

[Security](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/security.md#what-the-extension-does-on-your-computer)
describes each step and where its protection ends.

## Features

- **Notes in the text editor.** A mark in the gutter shows each note, and a
  box below the note shows its body as Markdown, with the author and the
  date. The editor can fold each note of several lines.
- **Editor of a note.** "Edit Note" turns the box into an editor of
  Markdown. "Save" writes the text back into the comment of the note, with
  its front matter unchanged.
- **New notes.** The `+` in the gutter of a line adds a note after the block
  of that line, with a front matter that names the author and the date.
- **Comments view.** The Comments view lists the notes of the open Markdown
  files; a click goes to the note.
- **Callouts in the Markdown preview.** The preview shows each note as a box
  with the author, the date and the body rendered as Markdown. A note inside
  a paragraph shows as a number in the text, and its callout follows the
  paragraph.
- **No comment in a note.** A note must not contain another comment. The
  extension refuses such a text and warns at such a note in the file.

## Usage

Write a note as an HTML comment that starts with `<!-- note` on a line of its
own. The text of the note starts on the next line, with an optional front
matter and then normal Markdown:

```markdown
<!-- note
---
author: Hannes Stauss
date: 2026-10-28T10:15+01:00
---
Check the **dates** with the team before Friday.
-->
```

A note can also stand inside the text of a paragraph, without a front matter:

```markdown
Version 2.0 comes out in November. <!-- note
Which day exactly?
--> The beta starts one week before.
```

In the text editor:

| Action | How |
| --- | --- |
| Open the box of a note | Click the mark in the gutter at the note, or a note in the Comments view. |
| Edit a note | Click "Edit Note" (pencil) in its box, change the text, then click "Save" or press Ctrl+Enter. "Cancel" keeps the note as it is. |
| Add a note | Click the `+` in the gutter of a line, write the text, then click "Add Note". |
| Delete a note | Click "Delete Note" (trash can) in its box. Undo brings it back. |
| Show the preview | Markdown: Open Preview to the Side (Ctrl+K V). |

On macOS, use Cmd instead of Ctrl. The
[user guide](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/guide.md)
describes every feature.

## Settings

| Setting | Default | Effect |
| --- | --- | --- |
| `nimblescape.markdownNotes.author` | `""` | The author that a new note names in its front matter. Empty: `user.name` of the Git configuration of the file; without one, a new note names no author. |
| `nimblescape.markdownNotes.expandInEditor` | `false` | Opens the box of each note in the text editor. The value `false` shows only the mark at each note. |
| `nimblescape.markdownNotes.showInPreview` | `true` | Shows the notes as callouts in the Markdown preview. The value `false` shows the preview as without the extension. |

## Limits

- The Markdown Editor of VS Code (the visual editor) offers extensions no API
  for this. The extension shows no notes there; use the text editor and the
  Markdown preview.
- A note inside a paragraph cannot have a front matter and must not contain
  a blank line, because both would change the Markdown of the paragraph. A
  note in a table cell, in a code block or in a block of other HTML is no
  note, as the Markdown preview does not show it as a comment of Markdown.
- The text editor and the Comments view show the notes of the Markdown files
  that are open in VS Code, not of every file of the workspace.
- A file of a read-only file system, for example an older version of a file
  in a Git diff, shows no boxes. The preview shows its callouts.

---

[Change log](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/CHANGELOG.md) · [Contributing](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/CONTRIBUTING.md) · [User guide](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/guide.md) · [Support](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/SUPPORT.md) · [Issues](https://github.com/nimblescape/nimblescape-markdown-notes/issues) · [Source](https://github.com/nimblescape/nimblescape-markdown-notes)

© 2026 Hannes Stauss (scalarion@nimblescape.com) · [MIT License](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/LICENSE).
