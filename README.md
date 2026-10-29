# nimblescape Markdown Notes

Adds notes to Markdown files in VS Code. A note is a Markdown footnote with a
header line, so the file stays plain Markdown and GitHub shows each note as a
footnote at the end of the page. Each note belongs to a text of the file, its
highlight, as the highlight of a marker pen on paper. Several authors can
answer a note and each other, so each note is a thread with a tree of
replies. The side view "Notes" shows the threads next to their highlights in
the text editor, and is the editor of the notes. You add a note by selecting
text and choosing "Add Note": in the light bulb at the selected text, with a
shortcut, or in the context menu. Every change goes back into the footnote in
the file, with the GitHub login of the author.

![VS Code with the extension: on the left, the text editor with the highlights of two collapsed notes in blue and green, and the list of the light bulb at the selected text with Add Note at the top; on the right, the side view Notes with the list of the two threads, the selected blue thread at its top with a frame, and the dimmed green thread](https://raw.githubusercontent.com/nimblescape/nimblescape-markdown-notes/main/docs/images/notes.png)

## What the extension does on your computer

- **When it works.** The extension starts when a Markdown file opens, or when
  you click the highlight of a note in the Markdown preview. It does not run in
  VS Code for the Web.
- **Markdown files.** The extension reads the open Markdown files to find
  their notes. It changes the text of a file only when you save, add, answer
  or delete a note, and only the footnote of that note, its reference, its
  start marker and the comment of the format at the top of the file. You
  save the file as usual, and Undo takes the change back. When you save a
  Markdown file with notes, the formatter of the extension formats it and
  adds a missing comment of the format; the settings
  `nimblescape.markdownNotes.formatOnSave` and
  `nimblescape.markdownNotes.addFormatComment` turn these off. A file that an
  editor only shows keeps its text, and a Markdown file without notes changes
  only with "Format Document".
  Other footnotes, for example `[^1]`, stay as they are.
- **GitHub sign-in.** New notes and answers need a sign-in with GitHub, so
  that the author is always known. The extension uses the GitHub sign-in of
  VS Code (the scope `read:user`) and reads only the login of your account.
  It sends no request to GitHub itself.
- **Markdown preview.** The extension adds a markdown-it plugin, a style
  sheet and a script to the built-in Markdown preview of VS Code. The plugin
  changes only the footnotes that are notes; the script paints the
  highlights and passes a click on a highlight to the side view.
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
  Markdown files, as described above, and runs no program of the workspace.

[Security](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/security.md#what-the-extension-does-on-your-computer)
describes each step and where its protection ends.

## Features

- **Threads.** Each note is a thread: its first answer and a tree of replies,
  as in a discussion on Reddit. Each answer has a header with the GitHub login
  of its author and the date.
- **Highlights.** A hidden start marker `<wbr><!--[note-7k2q-->` and the
  reference `[^note-7k2q]` stand around the text of a note, its highlight.
  The text editor and the Markdown preview show each highlight in the color
  of its note, with a good contrast, while the side view is open. The buttons
  "Hide Highlights" and "Show Highlights" in the title of the editor hide and
  show them; a hidden highlight shows while the pointer is on it. A click on
  a highlight selects its note in the side view and opens the side view. The
  highlight of the selected note is strong, with a frame, and the other
  highlights are dimmed.
- **Colors.** Every note has the same color, until you give it one of six
  colors. The start marker keeps the color, for example
  `<wbr><!--[note-7k2q green-->`.
- **Side view "Notes".** The only place of the text of the notes. The view
  is a list of the threads in the order of the file, which you scroll on its
  own; a click on a highlight or a move of the cursor into it scrolls its
  thread to the top. The buttons are icons with tooltips, as in the title of
  an editor:
  "Reply", "Edit" and "Delete" at each answer, the color, "Show as Text",
  "Answer" and "Delete Thread" at each thread. "Show as Text" shows the whole
  note as the file holds it, and you can change it there. The links of the
  notes open. The view is in the secondary side bar, beside the chat, so the
  Explorer stays usable; the button "Show or Hide Notes" in the title of the
  Markdown editors opens and closes it with one click, also in Zen Mode and
  in the modes "Markdown Preview" and "Markdown Editor" of VS Code.
- **New notes.** Select the text that the note is about, then choose "Add
  Note": in the light bulb at the selected text or with Ctrl+. (Cmd+. on a
  Mac), with Shift+Alt+N (Cmd+K N on a Mac), in the context menu of the text
  editor, or with "Add Note" (`+`) in the title of the side view. Each opens
  the editor of the new note in the side view, where you choose its color.
  Nothing shows by itself over the selected text, and there is no note
  without highlighted text.
- **The text stays readable.** The text editor never shows the text of a note
  and its markers: the notes are collapsed, the cursor steps over a hidden
  marker, and Backspace and Delete never change it. Where a header line
  shows, it shows rendered, with the date in your local time.
- **Markdown preview.** The preview shows the highlights, no icons and no
  callouts, and never a note as a footnote at the end of the page.
- **Formatter.** The extension formats a Markdown file with notes when you
  save it, and every Markdown file with "Format Document": each paragraph on
  one line with its hard line breaks, aligned tables,
  no spaces at the end of a line, one blank line between blocks, and `<wbr>`
  before each start marker, which every note gets. Code, HTML, a front matter
  and the answers of the notes stay as they are. Programs and AI agents run the same formatter on the command line
  with Node.js 22 or later, from the npm package `@nimblescape/markdown-notes`:
  `npx -y @nimblescape/markdown-notes format paper.md`, or with `--check`,
  which changes nothing and exits with 1 when a file is not formatted.
- **For AI agents.** A comment at the top of each file with notes names the
  format of the notes and its version, like a DOCTYPE, and links to its
  [specification](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/format.md),
  so that an AI agent can read, answer and add notes itself. A front matter
  stays the first block of the file.
- **Warnings.** The text editor and the Problems view warn at each form of a
  note that GitHub shows differently, for example a note without a blank
  line after it, a reference in the text of a link, or a note without a start
  marker.

## Usage

A note is a footnote: a reference in the text, and a definition after the
paragraph of the reference. The first line of the definition is the header,
with the GitHub login of the author in bold and the date with the offset of
the time zone. The body follows in normal Markdown, indented by four spaces:

```markdown
The agents <wbr><!--[note-7k2q-->change the work of teams[^note-7k2q] in three ways.

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

- The start marker `<wbr><!--[note-7k2q-->` starts the highlight of the note,
  and the reference `[^note-7k2q]` ends it. `<wbr>` keeps the paragraph whole
  on GitHub, also when the marker starts a line.
- Each reply is a block quote with its own header. A reply to a reply stands
  in the block quote of the answer it replies to: above, Anna replies to the
  note and Hannes replies to Anna.
- A footnote is a note only when its label is `note-` and four small letters
  or digits, and its first line is a header. Every other footnote stays a
  footnote.

You do not need to write these lines yourself: the extension writes them when
you add or answer a note. In the side view "Notes":

| Action | How |
| --- | --- |
| Add a note | Select the text in the text editor, then choose "Add Note" in the light bulb at the selected text (Ctrl+.), press Shift+Alt+N (Cmd+K N on a Mac), or click "Add Note" (`+`) in the title of the side view. Choose a color, write the text, then click "Add Note" (check mark) or press Ctrl+Enter. |
| Edit an answer | Click "Edit" (pencil) at the answer, change the text, then click "Save" (check mark) or press Ctrl+Enter. "Cancel" keeps the answer as it is. |
| Answer a note | Click "Answer" (speech bubble) at the thread, write the text, then click "Answer". |
| Reply to an answer | Click "Reply" (arrow) at the answer, write the text, then click "Reply". |
| Change the color | Click the color at the left of the thread, then a new color. |
| See the whole note | Click "Show as Text" at the thread. |
| Delete an answer or a note | Click "Delete" (trash can) at the answer, or "Delete Thread" (trash can) at the thread. Undo in the text editor brings it back. |

In the text editor or in the Markdown preview (Ctrl+K V opens it to the
side), click a highlight to open its note in the side view. In the preview,
VS Code may ask once whether the extension may open the link.

The first time you add or answer a note, VS Code asks you to sign in with
GitHub. On macOS, use Cmd instead of Ctrl. The
[user guide](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/guide.md)
describes every feature, also how a repository of documents recommends the
extension to everyone who opens it.

## Settings

| Setting | Default | Effect |
| --- | --- | --- |
| `nimblescape.markdownNotes.showHighlights` | `true` | Shows the highlights of the notes in the text editor and in the Markdown preview while the side view "Notes" is open. The buttons "Hide Highlights" and "Show Highlights" in the title of the editor change it. |
| `nimblescape.markdownNotes.addFormatComment` | `true` | Adds the comment of the format of the notes, with the link to their specification for AI agents, at the top of a file with notes when you save it. The value `false` adds it only with a change of a note. An editor that only shows a file never adds it. |
| `nimblescape.markdownNotes.openLinksIn` | `newWindow` | Where a link in a note to a file opens: `newWindow` in a new window of VS Code, `editor` in a tab of the editor of VS Code, `system` with the program of your system. |
| `nimblescape.markdownNotes.formatOnSave` | `true` | Formats a Markdown file with notes, or with the comment of the format, when you save it. Other Markdown files stay as they are on a save. |

The formatter is the default formatter of Markdown files, so "Format
Document" formats every Markdown file. With `"editor.formatOnSave": true` in
a `"[markdown]"` block of your settings, VS Code formats every Markdown file
on a save; "Save without Formatting" saves a file without the formatter.

## Limits

- The mode "Markdown Editor" of VS Code (the visual editor) offers
  extensions no API for this. It shows no notes and no highlights, only the
  side view does; use the text editor or the mode "Markdown Preview" to see
  the highlights.
- The side view stands next to the text editor only; next to the preview it
  lists the threads, because the preview tells an extension no place of its
  text. Where lines wrap, the heights of the threads are estimates.
- GitHub shows the notes as footnotes at the end of the page, numbered
  together with the other footnotes. GitHub shows no footnote in a block
  quote, so the extension writes each note after the outermost block.
- The notes of the older form `<!-- note … -->` are not converted; the
  extension no longer reads them.
- The text editor and the side view show the notes of the Markdown files that
  are open in VS Code, not of every file of the workspace.
- A file of a read-only file system, for example an older version of a file
  in a Git diff, shows no notes in the text editor and in the side view. The
  preview shows its highlights.

---

[Change log](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/CHANGELOG.md) · [Contributing](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/CONTRIBUTING.md) · [User guide](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/guide.md) · [Support](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/SUPPORT.md) · [Issues](https://github.com/nimblescape/nimblescape-markdown-notes/issues) · [Source](https://github.com/nimblescape/nimblescape-markdown-notes)

© 2026 Hannes Stauss (scalarion@nimblescape.com) · [MIT License](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/LICENSE).
