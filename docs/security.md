<!--
SPDX-License-Identifier: MIT
© 2026 Hannes Stauss (scalarion@nimblescape.com)
Licensed under the MIT License. See LICENSE in the repository root for details.
-->

# Security model

This document describes what nimblescape Markdown Notes does on your
computer, what it protects, how, and where its protection ends. The user
guide is [guide.md](guide.md); how the parts work together is in
[CONTRIBUTING.md](../CONTRIBUTING.md). Report a security problem by e-mail,
as [SUPPORT.md](../SUPPORT.md#security-problems) describes, not in a public
issue.

## What the extension does on your computer

The README and the Marketplace page list these behaviors at the top. Each item
links to its details.

- **When it works.** The extension activates when a Markdown file opens
  (`onLanguage:markdown`), or when VS Code passes it a link of the preview
  (`onUri`). The manifest has no `browser` entry, so the extension does not
  run in VS Code for the Web. See [Trust boundaries](#trust-boundaries).
- **Markdown files.** The extension reads the text of the open Markdown
  files to find their notes. It changes the text of a file only when you
  save, add, answer or delete a note, and only the footnote of that note, its
  reference, its start marker and the comment of the format at the top of the
  file. The file then has unsaved changes, which you save as usual. A file
  that an editor only shows keeps its text. The formatter of the extension
  formats a Markdown file with notes when you save it and adds a missing
  comment of the format (settings `nimblescape.markdownNotes.formatOnSave`
  and `nimblescape.markdownNotes.addFormatComment`). It formats every
  Markdown file when you run "Format Document", because the manifest makes
  it the default formatter of Markdown. See [Changes of a file](#changes-of-a-file).
- **GitHub sign-in.** New notes and answers need a GitHub session of VS Code
  with the scope `read:user`. The extension reads only the name of the
  account, the GitHub login, and sends no request to GitHub. See
  [GitHub sign-in](#github-sign-in).
- **Markdown preview.** The extension adds a markdown-it plugin, a style
  sheet and a script to the built-in Markdown preview of VS Code
  (`markdown.markdownItPlugins`, `markdown.previewStyles`,
  `markdown.previewScripts`). The plugin changes only the footnotes that are
  notes. See [Rendering](#rendering).
- **Extension pack.** VS Code installs the extension "Markdown Footnotes" of
  Matt Bierner (`bierner.markdown-footnotes`) together with this extension
  (`extensionPack`). It is an extension of its own, with its own markdown-it
  plugin for the preview; you can disable or uninstall it.
- **Links of the preview.** A click on the highlight of a note opens a link
  `vscode://nimblescape.nimblescape-markdown-notes/select?document=…&line=…`,
  and a double click a link with the path `/open`.
  The extension opens only a Markdown file that is open or that belongs to
  the workspace, and only shows its notes. See
  [Links to the extension](#links-to-the-extension).
- **Side view.** The side view "Notes" is a webview with a policy that runs
  only the script of the extension. A click on a link of a note opens a web
  or mail link with the system, a file in VS Code, and a link of another
  scheme only after you agree; it never runs a command. See
  [Side view](#side-view) and [Links of the notes](#links-of-the-notes).
- **Network.** The code of the extension connects to no address, runs no
  program and collects no telemetry. See [Rendering](#rendering).
- **Restricted Mode and virtual workspaces.** The extension works with all
  features in both, because it changes only the text of Markdown files and
  runs no program of the workspace. See
  [Workspace trust and virtual workspaces](#workspace-trust-and-virtual-workspaces).

## The trust model

**The text of a note is data.** The extension reads the text of the open
Markdown files and shows the body of each answer as Markdown in the side
view, rendered with the renderer of the Markdown preview. The preview shows
only the highlights of the notes, not their text. A note cannot start a program,
read a file or connect to an address through the extension.

A note from a stranger can still:

- show what Markdown can show, for example a link or an image, also an image
  from the internet (see [Known limits](#known-limits));
- name any author and any date. The extension writes the GitHub login of the
  signed-in user into each new note and answer, but the header stays text
  that anyone who can change the file can write; it proves nobody's
  identity.

## Trust boundaries

| Part | Runs as | Trusts |
| --- | --- | --- |
| The extension (`dist/extension.js`) | Your user, in the extension host of VS Code, where the workspace is | VS Code. It reads the documents only as text. |
| The light bulb action "Add Note" (`src/addNoteAction.ts`) | The Code Actions of VS Code, in the VS Code window | A fixed title and the command "Add Note" of the extension, without arguments; it holds no text of the file |
| The slash commands (`src/slashCommands.ts`) | The suggestions of VS Code, in the VS Code window | Fixed labels, the date and the time, the text that the typed slash replaced, and commands of the extension with the document, a range and a label as arguments |
| The side view (`media/notesView.js`) | A webview of VS Code, in the VS Code window | The state that the extension sends: the answers and their HTML, which the Markdown preview renderer made from the text of the file |
| The markdown-it plugin, the styles and the script of the preview (`media/markdownPreview.css`, `media/markdownPreview.js`) | The Markdown extension of VS Code, which renders the page of the Markdown preview, with the security policy of the Markdown preview | The Markdown text of the document |

In a remote window (SSH, WSL, a container), the extension runs where the
workspace is, and the hovers, the side view and the previews show in the
VS Code window of your computer. The text of a note then goes over the
connection of VS Code, as the text of an open file does.

## Rendering

- **The Markdown preview.** The plugin (`src/markdown/markdownIt.ts`) takes
  the notes out of the page and writes the start and the end of each
  highlight as empty elements, with the number of the color, the label of the
  note and the link to the extension as escaped attributes. The extension
  does not change the security setting of the Markdown preview.
- **The script of the preview.** `media/markdownPreview.js` only paints the
  highlights with the CSS Custom Highlight API, which changes no element of
  the page, and draws the frame of the selected note. For the time of a click
  on a highlight, it gives the link of the end of the highlight, which the
  plugin wrote, to a link around the content of the page, so that VS Code
  passes the click to the extension
  ([Links to the extension](#links-to-the-extension)). It gives only a link
  to the extension, with the scheme of VS Code, the host
  `nimblescape.nimblescape-markdown-notes` and the path `/open`, `/select`,
  `/deselect` or `/add`, because a document can write an element with the same classes
  in raw HTML. It sends no message. It reads the text of the page only for
  "Add Note" of the preview: a click on the button "Add Note" above selected
  text puts the selected text and the text of its block before it into the
  link to the extension.
- **The files of the preview of the clean editing view.** The file system
  `markdown-notes` of the extension gives the preview of a clean document
  its images and style sheets as they are, read only, and never writes them.
  The preview loads files only from the folder of the document; an image
  from elsewhere loads under the folder `~markdown-notes~` there, by its path
  in the folder of the workspace of the file, and only from inside that
  folder of the workspace, as the preview of the file itself does.
- **The light bulb action of the selected text.** The Code Action "Add
  Note" has a fixed title and runs the command "Add Note" of the extension
  without arguments, which opens the editor of a new note in the side view;
  it changes no text by itself and holds no text of the file. The extension
  shows no hover with HTML or command links over the selected text.
- **The slash commands.** The suggestions after a typed slash are plain
  text: the labels of the commands, the date and the time, and for `/note`
  and `/todo` the text that the slash replaced, which goes back to its place.
  Their commands are no links of a page; only the list of suggestions runs
  them, for the document of the text editor. The extension keeps the last
  selected text of each open Markdown document in memory, to put it back.
- **No network.** The extension has no network code and starts no program.

## Side view

- The page of the side view has a content security policy:
  `default-src 'none'`, scripts only with a nonce that the extension creates
  for each page (`script-src 'nonce-…'`), styles only from the style sheet
  of the extension (`style-src` without `'unsafe-inline'`), and images of the
  extension, of `https:` and of `data:`. So no script of a note runs, also not
  an event attribute such as `onerror`, and no style element or style
  attribute of a note applies. The script of the view sets its own styles
  through the CSS object model, which the policy allows.
- The webview loads files only from the folder `media` of the extension
  (`localResourceRoots`), and has no command links (`enableCommandUris` is not
  set).
- The extension renders the body of each answer with the Markdown preview of
  VS Code (`markdown.api.render`). Before the script shows the HTML, it
  removes the elements that run code or load another page (for example
  `script`, `iframe`, `object`, `form`, `meta`, `base`), the attributes of
  events, the attributes `style`, as GitHub does, and the addresses of the
  schemes `javascript:` and `vbscript:`. So a note cannot place an element
  over the view, for example a false button. The box of each rendered text
  also clips what it holds (`contain: paint`).
- The script sends the actions of the user to the extension as messages. The
  extension checks each text before it writes it
  ([Changes of a file](#changes-of-a-file)), and gives a color to a note
  only when its name is one of the six colors of the notes. A message names
  an answer by its index, its author, its date and its text, and the
  extension changes nothing when the answer at that index is another one,
  for example after a second click on "Delete" or after a change of the file
  by a collaborator.
- A click on a link of a rendered text does not load the address in the page
  of the view: the script stops the click and sends the address to the
  extension ([Links of the notes](#links-of-the-notes)).

## Links of the notes

The author of a note decides its links, and the author can be anyone who can
change the file. So a click on a link in the side view opens:

- a link of the schemes `http:`, `https:` and `mailto:`, and a link of the
  scheme of VS Code (`vscode:`), with `vscode.env.openExternal`, as the
  Markdown preview does. VS Code asks before it opens a web address outside
  the trusted domains;
- a link to a file in VS Code, with `vscode.open` or the text editor: a
  relative path from the folder of the Markdown file, and a path that starts
  with `/` from the folder of the workspace. The extension opens no file that
  does not exist, and shows a folder in the Explorer;
- a link of another scheme, for example `zotero:`, with the program of the
  system only after a question that names the whole link;
- never a link of the schemes `command:`, `javascript:`, `vbscript:`,
  `data:`, `blob:`, `vscode-webview:` and `vscode-resource:`: such a link
  would run a command or code, or hold its own content.

## Links to the extension

The Markdown preview opens only links of some schemes; a click on a
highlight opens a link of the scheme `vscode://` to the extension, which
VS Code passes to the URI handler of the extension. VS Code may ask once whether the extension may
open it. Such a link can also come from outside VS Code, for example from a
web page, so the extension:

- handles only the paths `/open` and `/select` with a document and the index
  of a line, the path `/deselect` with a document, and the path `/add` with a
  document, the index of a line and two texts;
- opens only a document that is open in VS Code, or a file of a folder of the
  workspace, and only when it is a Markdown document that can have notes;
  `/deselect` and `/add` take only a document that is open;
- only shows the notes of the document in the side view, deselects its
  selected note, or opens the editor of a new note in the side view, which
  adds the note only when the user writes its text and clicks "Add Note". A
  link changes no file and runs no command.

## Changes of a file

- The extension changes a document on a click on "Save", "Add Note",
  "Answer", "Reply", "Delete" or "Delete Thread" or on a color in the side
  view, and on "Save" of the text view of a note, with one edit of the
  document (`vscode.workspace.applyEdit`),
  and when it adds the comment of the format (below).
  Backspace and Delete next to a hidden marker run a command of the
  extension instead of the command of VS Code, which deletes the character
  or the word on the other side of the marker in the active text editor
  (`TextEditor.edit`); the keybindings apply only in a Markdown file, without
  a selection, while the cursor is next to a hidden marker.
  The comment of the format at the top of a file with notes
  (`src/notes/doctype.ts`) comes in the same edit as the change of a note:
  the first note brings it, and the last note removes it. The save of a file
  with notes without the comment adds it in the edit of the save, unless the
  setting `nimblescape.markdownNotes.addFormatComment` is `false`; an editor
  that only shows a file never changes it. Its text is fixed in the code; it
  holds the address of the specification, which the extension never opens.
  The extension writes a comment anew only when its own version is higher
  than the version in the file. A file whose comment names a higher major
  version of the format gets no change of a note and no comment.
  The formatter (`src/format/format.ts`, `src/formatter.ts`) gives VS Code
  one edit of the lines that it formats, on "Format Document", and before
  the save of a Markdown file with notes or with the comment of the format
  (`vscode.workspace.onWillSaveTextDocument`); a Markdown file without notes
  keeps its text on a save. It keeps code blocks, blocks of HTML, a front
  matter and the answers of the notes as they are, and returns the text unchanged when the
  formatted text would show other blocks or another text in the Markdown
  preview. The setting `nimblescape.markdownNotes.formatOnSave` turns off
  the format on save, and another `editor.defaultFormatter` of VS Code for
  `[markdown]` turns off both.
  Undo in the text editor takes the edit back. The extension saves no file:
  the document has unsaved changes, unless you use the automatic save of
  VS Code.
- Before it writes a text, the extension checks it: the changed document
  must hold the same note at the same place, with the same answers, headers,
  bodies and depths in the tree of answers, when the parser of the Markdown
  preview reads it (`src/notes/edits.ts`). So a saved note never ends early,
  never starts another answer and never changes the Markdown around it. The
  text view of a note must stay the definition of the same note, with its
  label and header, and must add or remove no other note.
- The extension shows the notes in the text editor and the side view, and
  so writes, only for Markdown documents of a writable file system and for
  new documents that were not saved yet (`untitled`). A version of a file in
  Git and a Markdown cell of a notebook get no notes there.

## GitHub sign-in

The author of each new note and answer is the GitHub login of the user. The
extension asks VS Code for a session of the authentication provider `github`
of VS Code with the scope `read:user`
(`vscode.authentication.getSession`):

- When you add or answer a note without a session, VS Code asks you to sign
  in, and asks once whether the extension may use the account. Without a
  session, the extension writes nothing.
- The side view asks only for an existing session (`silent`), to show the
  account, and asks for a sign-in only on a click on "Sign in with GitHub".
- The extension reads only the name of the account (`account.label`), which
  is the GitHub login. It does not read or store the access token of the
  session, and sends no request to GitHub. VS Code stores the session.

## Workspace trust and virtual workspaces

The manifest declares `untrustedWorkspaces` and `virtualWorkspaces` as
supported. In Restricted Mode and in a virtual workspace, the extension
activates with all features, because it only reads and changes the text of
the open Markdown documents and runs no program of the workspace. It changes
the text of a document on an action of a note and on a save of a file with
notes, with its formatter and the comment of the format
([Changes of a file](#changes-of-a-file)). A file that an editor only shows
keeps its text. The settings
of the extension can come from the settings of a workspace
(`.vscode/settings.json`): `showHighlights` hides the highlights, and
`openLinksIn` chooses where a link to a file opens; a link of another scheme
still needs your agreement.

## Stored data

| Data | Where | How long |
| --- | --- | --- |
| The notes of the open documents, with their places | The memory of the extension host | Until the document closes, or VS Code closes |
| The rendered HTML of up to 200 texts for the side view | The memory of the extension host | Until VS Code closes |
| The last selected text of each open Markdown document, for `/note` | The memory of the extension host | Until the document closes, or VS Code closes |
| The filters of the side view | The state of the page of the side view, which VS Code keeps | Until VS Code closes the view |
| The settings of the extension | The settings of VS Code, when you change them | Until you change them |
| The GitHub session | VS Code, which stores it in its secret storage | Until you sign out in the accounts menu of VS Code |

The extension writes no file of its own, uses neither `globalState` nor
`workspaceState` of VS Code, stores no secret, and sends nothing to any
address.

## Known limits

- The side view and the Markdown preview show the images
  that the body of a note names, also from an `https:` address of the
  internet, as the Markdown preview does for the rest of the file. VS Code
  then loads the image from that address.
- The header of an answer proves nobody's identity: anyone who can change
  the file can write any author and any date.
- A note that a text from outside VS Code changes, for example a `git pull`,
  shows its new text after VS Code reloads the document.

---

© 2026 Hannes Stauss (scalarion@nimblescape.com) ·
[MIT License](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/LICENSE).
