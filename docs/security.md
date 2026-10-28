<!--
SPDX-License-Identifier: MIT
© 2026 Hannes Stauss (scalarion@nimblescape.com)
Licensed under the MIT License. See LICENSE in the repository root for details.
-->

# Security model

This document describes what nimblescape Markdown Note does on your
computer, what it protects, how, and where its protection ends. The user
guide is [guide.md](guide.md); how the parts work together is in
[CONTRIBUTING.md](../CONTRIBUTING.md). Report a security problem by e-mail,
as [SUPPORT.md](../SUPPORT.md#security-problems) describes, not in a public
issue.

## What the extension does on your computer

The README and the Marketplace page list these behaviors at the top. Each item
links to its details.

- **When it works.** The extension activates when a Markdown file opens
  (`onLanguage:markdown`). The manifest has no `browser` entry, so the
  extension does not run in VS Code for the Web. See
  [Trust boundaries](#trust-boundaries).
- **Markdown files.** The extension reads the text of the open Markdown
  files to find their notes. It changes the text of a file only when you click
  "Save", "Add Note" or "Delete Note", and only the comment of that note; the
  file then has unsaved changes, which you save as usual. See
  [Changes of a file](#changes-of-a-file).
- **Markdown preview.** The extension adds a markdown-it plugin and a style
  sheet to the built-in Markdown preview of VS Code
  (`markdown.markdownItPlugins`, `markdown.previewStyles`). The plugin changes
  only the comments that are notes. See [Rendering](#rendering).
- **Author of a new note.** For a new note, the extension reads the setting
  `nimblescape.markdownNote.author`, or else `user.name` of the Git
  configuration of the file through the Git extension of VS Code. See
  [Author of a new note](#author-of-a-new-note).
- **Network.** The extension connects to no address, runs no program and
  collects no telemetry. See [Rendering](#rendering).
- **Restricted Mode and virtual workspaces.** The extension works with all
  features in both. See
  [Workspace trust and virtual workspaces](#workspace-trust-and-virtual-workspaces).

## The trust model

**The text of a note is data.** The extension reads the text of the open
Markdown files and shows the body of each note as Markdown: in the box of the
note, with the comments of VS Code, and in the Markdown preview, with the
renderer of the preview. A note cannot start a program, read a file or
connect to an address through the extension.

A note from a stranger can still:

- show what Markdown can show, for example a link or an image, also an image
  from the internet (see [Known limits](#known-limits));
- name any author and any date. The front matter is text that anyone who can
  change the file can write; it proves nobody's identity.

## Trust boundaries

| Part | Runs as | Trusts |
| --- | --- | --- |
| The extension (`dist/extension.js`) | Your user, in the extension host of VS Code, where the workspace is | VS Code. It reads the documents only as text. |
| The boxes of the notes | The comments of VS Code, in the VS Code window | The Markdown text that the extension gives to VS Code, which renders it as an untrusted Markdown string |
| The markdown-it plugin and the styles | The Markdown extension of VS Code, which renders the page of the Markdown preview, with the security policy of the Markdown preview | The Markdown text of the document |

In a remote window (SSH, WSL, a container), the extension runs where the
workspace is, and the boxes and the previews show in the VS Code window of
your computer. The text of a note then goes over the connection of VS Code,
as the text of an open file does.

## Rendering

- **The boxes.** The extension gives the body of a note to VS Code as a
  Markdown string (`vscode.MarkdownString`) with HTML on (`supportHtml`) and
  without trust (`isTrusted` is not set). VS Code then shows only the HTML
  elements and attributes of its allow list, runs no script, and runs no
  command link of the body. The relative links and images of the body start
  at the folder of the document (`baseUri`).
- **The Markdown preview.** The plugin (`src/markdown/markdownIt.ts`) renders
  the body of a note with the same markdown-it instance as the rest of the
  document, so the body gets the same options, plugins and security policy of
  the preview as the rest of the file. The extension writes the author and the
  date as escaped text. A note that contains `<!--` shows its text as escaped
  text, because as Markdown it would open an HTML comment that hides the rest
  of the page. The extension does not change the security setting of the
  Markdown preview.
- **No network.** The extension has no network code and starts no program.

## Changes of a file

- The extension changes a document only on a click on "Save", "Add Note" or
  "Delete Note" in the box of a note, with one edit of the document
  (`vscode.workspace.applyEdit`). Undo in the text editor takes the edit back.
  The extension saves no file: the document has unsaved changes, unless you
  use the automatic save of VS Code.
- Before it writes a text, the extension checks it: the text must not contain
  `<!--`, `-->` or `--!>`, and the changed document must hold the same note at
  the same place, with the same front matter and the same body, when the
  parser of the Markdown preview reads it (`src/notes/edits.ts`). So a saved
  note never ends early, never opens another comment and never changes the
  Markdown around it.
- The extension shows boxes, and so writes, only for Markdown documents of a
  writable file system and for new documents that were not saved yet
  (`untitled`). A version of a file in Git and a Markdown cell of a notebook
  get no boxes.

## Author of a new note

When the setting `nimblescape.markdownNote.author` is empty, the extension
asks the Git extension of VS Code (`vscode.git`, API version 1) for the
repository of the file and reads `user.name` of its configuration, or else of
the global configuration. When the Git extension is not active, the extension
activates it. The Git extension runs the program `git` for this; the extension
itself runs no program. When the Git extension is off or the file is in no
repository, the new note names no author. In Restricted Mode, VS Code turns
the Git extension off, so a new note then names the author of the setting
only.

## Workspace trust and virtual workspaces

The manifest declares `untrustedWorkspaces` and `virtualWorkspaces` as
supported. In Restricted Mode and in a virtual workspace, the extension
activates with all features, because it only reads and changes the text of
the open Markdown documents and runs no program of the workspace. The settings
of the extension can come from the settings of a workspace
(`.vscode/settings.json`): `author` sets the author of the new notes,
`expandInEditor` opens the boxes, and `showInPreview` turns the callouts off.

## Stored data

| Data | Where | How long |
| --- | --- | --- |
| The notes of the open documents, with their places | The memory of the extension host | Until the document closes, or VS Code closes |
| The settings of the extension | The settings of VS Code, when you change them | Until you change them |

The extension writes no file of its own, uses neither `globalState` nor
`workspaceState` of VS Code, stores no secret, and sends nothing to any
address.

## Known limits

- The box of a note and the Markdown preview show the images that the body of
  a note names, also from an `https:` address of the internet, as the Markdown
  preview does for the rest of the file. VS Code then loads the image from
  that address.
- The front matter of a note proves nobody's identity: anyone who can change
  the file can write any author and any date.
- A note that a text from outside VS Code changes, for example a `git pull`,
  shows its new text after VS Code reloads the document.

---

© 2026 Hannes Stauss (scalarion@nimblescape.com) ·
[MIT License](https://github.com/nimblescape/nimblescape-markdown-note/blob/main/LICENSE).
