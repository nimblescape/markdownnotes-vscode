# @nimblescape/markdownnotes

The command `markdownnotes` formats Markdown files as the VS Code extension
[nimblescape Markdown Notes](https://github.com/nimblescape/nimblescape-markdown-notes)
does on save. Programs and AI agents that change a Markdown file outside
VS Code run it after the change, so that a file that an agent changed and a
file that a person saved in VS Code look the same: `markdownnotes format
paper.md`.

## Install

```sh
npx -y @nimblescape/markdownnotes format paper.md
npm install --global @nimblescape/markdownnotes
```

`npx` runs the command without an installation. `markdownnotes` needs
Node.js 22 or newer and has no dependencies. Its tests run on Linux and
macOS.

## Usage

```sh
markdownnotes format paper.md notes/*.md
markdownnotes format --check paper.md
cat paper.md | markdownnotes format -
```

| Command | Effect |
| --- | --- |
| `format <file>...` | Formats the files and writes only those that change. |
| `format --check <file>...` | Changes no file; names each file that is not formatted on the standard error. |
| `format -` | Formats the standard input to the standard output. |
| `--help` | Shows the help. |
| `--version` | Shows the version of the command and of the format of the notes. |

The exit code is 0 when all files are formatted, 1 when `--check` found a
file to format, and 2 for a wrong command or option, no file, or a file that
cannot be read or written. With `--check`, the command fits a check of a pull
request.

## What it changes

- Each paragraph stands on one line, also in a list item or a block quote. A
  hard line break stays: two spaces or a backslash at the end of a line.
- The columns of a table are aligned, after the alignment of its delimiter
  row, by the width that the text editor of VS Code shows.
- No line ends with spaces, apart from a hard line break; one blank line
  stands between two blocks and around each heading with `#`; the file ends
  with one line break.
- Each start marker of a note of the extension starts with `<wbr>`, and a
  note without a start marker gets one at the start of the text of its block,
  so that GitHub shows the paragraph whole and every note has its highlight.
- Each caption of a figure, a table or a listing, such as
  `Table 1: Participants`, and each link to a figure, a table, a listing or
  a section, such as `[Table 1](#tab-grades)`, gets its number from the
  order in the file. An image of the older form with an anchor at its end
  gets a caption line before it, `Figure 1: <the text of the image>`.
- Each value of the front matter in the text,
  `<wbr><!--{title}-->A paper<!--{/title}-->`, gets the current value of its
  key.
- Each listing gets the current code of its source: a code block with a
  comment before it that names a file, `<!-- listing: ../src/fields.ts -->`,
  or a snippet of the file between the comments
  `markdownnotes: snippet <name>` and `markdownnotes: /snippet <name>`,
  `<!-- listing: ../src/fields.ts#read-fields -->`. The caption line before
  it, `Listing: Reading the fields`, becomes a link to the lines of the
  snippet in the source, `Listing 1: [Reading the fields](../src/fields.ts#L12-L30)`,
  which the command keeps current. The path is relative to the Markdown
  file, or to the current folder for the standard input. A listing whose
  source the command does not find keeps its code and its caption, and the
  command names it on the standard error; with `--check`, such a file counts
  as not formatted.

It keeps code blocks, HTML and comments, a front matter, math blocks (`$$`),
containers (`:::`), headings underlined with `===` or `---`, and the answers
of the notes of the extension as they are. When the formatted text would show other blocks or
another text in a Markdown preview, it keeps the text as it was. A file keeps
its line breaks (LF or CRLF) and its byte order mark.

## The notes

A file with notes of the extension starts with a comment that names the
format of the notes and links to its
[specification](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/format.md).
An AI agent reads it before it reads, changes or adds a note, and runs
`markdownnotes format` after the change.

## Library

Programs format Markdown text with the same formatter through the library of
the package, with `require` or `import`. Loading it runs nothing.

```js
import { formatMarkdown } from '@nimblescape/markdownnotes';

const lines = formatMarkdown(text.split(/\r?\n/));
```

`formatMarkdown(lines)` takes the lines of a text without their line breaks
and returns the formatted lines. The package has the types of TypeScript.
With the option `source`, it also writes the current code into the listings:

```js
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const source = (path) => {
  try {
    return readFileSync(join(dirname(file), decodeURIComponent(path)), 'utf8');
  } catch {
    return undefined;
  }
};
const lines = formatMarkdown(text.split(/\r?\n/), { source });
```

## Third-party code

The command contains the Markdown parser markdown-it with the packages that
it uses. `THIRD-PARTY-NOTICES.md` in the package names their licenses.

---

[Source and documentation](https://github.com/nimblescape/nimblescape-markdown-notes) ·
[Change log](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/CHANGELOG.md) ·
[Issues](https://github.com/nimblescape/nimblescape-markdown-notes/issues) ·
[Support](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/SUPPORT.md)

© 2026 Hannes Stauss (scalarion@nimblescape.com) ·
[MIT License](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/LICENSE).
