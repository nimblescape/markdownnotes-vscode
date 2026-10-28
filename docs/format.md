<!--
SPDX-License-Identifier: MIT
© 2026 Hannes Stauss (scalarion@nimblescape.com)
Licensed under the MIT License. See LICENSE in the repository root for details.
-->

# Format of the notes

This document specifies format 1 of the notes in Markdown files, which the
VS Code extension nimblescape Markdown Notes reads and writes. It is for
people and for programs, for example AI agents, that read, change or add
notes without the extension. A file that follows it stays plain Markdown:
GitHub shows each note as a footnote at the end of the page.

The [requirements](requirements.md) define how the extension shows the notes;
this document defines only the text of a file. The words "must" and "must
not" are rules: a program that breaks one writes a file that the extension
or GitHub does not show as intended.

## Example

```markdown
<!-- nimblescape-markdown-notes format=1 spec=https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/format.md
This comment marks a Markdown file with notes of the VS Code extension nimblescape Markdown Notes.
AI agents: read the spec above before you read, change or add a note, and keep this comment as it is.
A note is a footnote with the label "note-" and four small letters or digits, for example [^note-7k2q].
Its reference ends the passage of the note; an HTML comment with "[" and the label directly before the
passage starts it. The definition follows the block of the passage: "[^note-7k2q]: **login** · date",
a blank line, and the body indented by four spaces. Each reply is a block quote with its own header.
-->

# Title

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

The next paragraph.
```

The note `note-7k2q` belongs to the passage "change the work of teams". Hannes
wrote the note, Anna replied to it, and Hannes replied to Anna.

## 1. The comment of the format

A file with notes starts with a comment that names the format, like a
DOCTYPE. GitHub and the Markdown preview do not show it.

- The first line is exactly `<!-- nimblescape-markdown-notes format=1
  spec=https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/format.md`,
  on one line. `format=1` is the version of this format, and `spec=` is the
  address of this document.
- The lines after it are a short hint in words. They must not hold `-->`,
  because `-->` ends the comment, and they hold no blank line.
- The last line is `-->`.
- The comment is the first line of the file. A file with a front matter keeps
  the front matter as its first block: then the comment starts on the line
  after the line that ends the front matter (`---` or `...` for YAML, `+++`
  for TOML). A blank line follows the comment.
- A file has one such comment. A program that adds the first note of a file
  adds the comment; a program that removes the last note removes it. Other
  programs keep it as it is.
- A file without the comment can have notes too, for example an older file:
  the rules below find them. A program that knows only an older version than
  the `format=` of a file must not change its notes.

## 2. The label of a note

- The label is `note-` and four small letters or digits, for example
  `note-7k2q`: it matches `^note-[a-z0-9]{4}$`.
- The four characters are random.
- No other footnote of the file has the label, and no other note.
- A footnote with another label, for example `[^1]`, is no note and stays a
  footnote.

## 3. The reference

- The reference `[^note-7k2q]` ends the passage of the note, its selection.
- It stands in the text of a paragraph, a heading, a list item or a table
  cell, after the last character of the passage.
- It must not stand in a code span, in a code block, in the text of a link
  (it then stands directly after the link) or in the text of a note.
- Each note has one reference.

## 4. The start marker

- The start marker `<!--[note-7k2q-->` stands directly before the first
  character of the passage, in the same block as the reference.
- It must not stand at the start of a line. GitHub reads a comment at the
  start of a line as a block of HTML, which ends the paragraph. When the
  passage starts at the start of a line, the marker stands at the end of the
  line before it, in the same paragraph.
- When the passage starts at the start of the text of its block, the marker
  is left out: without a marker, the passage starts there.
- A marker directly before the reference, `<!--[note-7k2q-->[^note-7k2q]`, is
  a point: a note at a place of the text, without a passage.
- Passages of different notes can overlap.

## 5. The definition

The definition is the note itself: the first answer and its replies.

- It stands after the outermost block that holds the reference: after the
  paragraph or the heading, after the whole list, after the whole block quote,
  after the table. GitHub shows no footnote that is defined in a block quote.
  The definitions of several notes of one block follow each other in the
  order of their references.
- A blank line stands before and after it.
- Its first line is the label and the header of the first answer:
  `[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00`.
- A blank line and the body of the first answer follow, each line indented by
  four spaces. A blank line of the body is empty.

### The header of an answer

- The header is `**login** · date`: the GitHub login of the author in bold, a
  space, a middle dot (U+00B7), a space, and the date.
- The login starts with a letter or a digit and has at most 39 letters,
  digits, `-` and `_`.
- The date is the local date and time of the author with the offset of the
  time zone: `YYYY-MM-DD HH:MM+HH:MM`, `YYYY-MM-DD HH:MM-HH:MM`, or
  `YYYY-MM-DD HH:MMZ` for UTC.

### The body of an answer

The body is Markdown: paragraphs, headings, lists, code, links, tables and
so on. A block quote whose first line is a header must not stand in a body,
because it starts a reply.

## 6. The replies

The answers of a note are a tree, as in a discussion on Reddit.

- A reply to the note is a block quote in the definition, after the body of
  the first answer: a blank line, then `    > **anna** · date`, a line
  `    >`, and the body with `    > ` before each line; a blank line of the
  body is `    >`.
- A reply to a reply stands in the block quote of the answer that it replies
  to, one level deeper: a line `    >`, then `    > > **hannes** · date`, a
  line `    > >`, and the body with `    > > ` before each line.
- A reply stands after the answer that it replies to and after the earlier
  replies to that answer with their replies, so that the file reads from the
  first answer to the last reply in the order of the tree.

## 7. Rules for a program

A program, for example an AI agent, follows these steps:

- **Read the notes:** find the definitions whose label is a label of a note
  and whose first line has a header; the passage of each note is the text
  from its start marker, or the start of its block, to its reference.
- **Add a note:** choose a new label; write the start marker and the
  reference around the passage; write the definition after the outermost
  block of the passage, with the login of the author and the current local
  time with the offset; add the comment of the format when the file has none.
- **Answer:** write the reply at its place in the tree, with its own header.
- **Change an answer:** change its body, keep its author, and write the
  current local time with the offset as its date.
- **Delete an answer:** remove its header and body; its replies stay and move
  one level up. Deleting the only answer deletes the note.
- **Delete a note:** remove its definition with one blank line next to it, its
  reference and its start marker, only when the user asks for it.
- Never change a label, never put a start marker at the start of a line, never
  put a definition into a block quote, and never write a note into a code
  block.

An AI agent writes as the author the GitHub login of the person that it works
for, or a GitHub login of its own; the author of an answer is always known.

---

© 2026 Hannes Stauss (scalarion@nimblescape.com) ·
[MIT License](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/LICENSE).
