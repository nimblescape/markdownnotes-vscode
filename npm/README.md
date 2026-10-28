<!--
SPDX-License-Identifier: MIT
© 2026 Hannes Stauss (scalarion@nimblescape.com)
Licensed under the MIT License. See LICENSE in the repository root for details.
-->

# nimblescape-markdown-notes

The Markdown formatter of the VS Code extension
[nimblescape Markdown Notes](https://github.com/nimblescape/nimblescape-markdown-notes)
on the command line, for programs and AI agents that change a Markdown file
outside VS Code. It formats a file as the extension does on save, so that a
file that an agent changed and a file that a person saved in VS Code look the
same. It needs Node.js 20 or later and has no dependencies.

```sh
npx -y nimblescape-markdown-notes format paper.md notes/*.md
npx -y nimblescape-markdown-notes format --check paper.md
cat paper.md | npx -y nimblescape-markdown-notes format -
```

## What it changes

- Each paragraph stands on one line, also in a list item or a block quote. A
  hard line break stays: two spaces or a backslash at the end of a line.
- The columns of a table are aligned, after the alignment of its delimiter
  row, by the width that the text editor of VS Code shows.
- No line ends with spaces, apart from a hard line break; one blank line
  stands between two blocks and around each heading with `#`; the file ends
  with one line break.

It keeps code blocks, HTML and comments, a front matter, math blocks (`$$`),
containers (`:::`), headings underlined with `===` or `---`, and the notes of
the extension as they are. When the formatted text would show other blocks or
another text in a Markdown preview, it keeps the text as it was. A file keeps
its line breaks (LF or CRLF) and its byte order mark.

## Commands

| Command | Effect |
| --- | --- |
| `format <file>...` | Formats the files and writes only those that change. |
| `format --check <file>...` | Changes no file; names each file that is not formatted on the standard error. |
| `format -` | Formats the standard input to the standard output. |
| `--help` | Shows the help. |
| `--version` | Shows the version of the tool and of the format of the notes. |

The exit code is 0 when all files are formatted, 1 when `--check` found a file
to format, and 2 for a wrong command or option, no file, or a file that cannot
be read or written.

## The notes

A file with notes of the extension starts with a comment that names the
format of the notes and links to its
[specification](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/format.md).
An AI agent reads it before it reads, changes or adds a note, and runs this
formatter after the change.

## License

[MIT License](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/LICENSE).
The tool contains the Markdown parser markdown-it with the packages that it
uses; THIRD-PARTY-NOTICES.md names their licenses.
