<!-- nimblescape-markdownnotes v1.0.0 hidden spec=https://github.com/nimblescape/markdownnotes-vscode/blob/main/docs/format.md
This comment marks a Markdown file with notes of the VS Code extension nimblescape Markdown Notes.
AI agents: read the spec above before you read, change or add a note, and keep this comment as it is.
A note is a footnote with the label "note-" and four small letters or digits, for example [^note-7k2q].
Its reference ends the highlight of the note. Its start marker starts the highlight: <wbr> and an HTML
comment with "[", the label and an optional color name. Every note has one. The definition follows the
block of the highlight: "[^note-7k2q]: **login** · date", a blank line, and the body indented by four
spaces. Each reply is a block quote with its own header. With the word "hidden" in the first line, each
definition is in an HTML comment of its own, the reference is the comment with the label and "]", and the
text of a note escapes each end of a comment with one more backslash before its ">".
-->

<!--
SPDX-License-Identifier: MIT
© 2026 Hannes Stauss (scalarion@nimblescape.com)
Licensed under the MIT License. See LICENSE in the repository root for details.
-->

# Example of hidden notes

This file shows notes of nimblescape Markdown Notes in the hidden form, as GitHub shows them: not at all. Each note is an HTML comment, so GitHub and every other Markdown viewer hide it, and the text around it stays as it is. The file [example.md](example.md) shows notes in the visible form. The eye at the top of the side view "Notes" switches a file between the two forms, and VS Code shows the notes of both forms in the same way.

## Release

<wbr><!--[note-k7q2-->Version 2.0 comes out in November.<!--note-k7q2]--> The agents <wbr><!--[note-m3x8 green-->change the work of teams<!--note-m3x8]--> in three ways.

<!--
[^note-k7q2]: **hannes** · 2026-10-28 10:15+01:00

    Which day exactly?

    > **anna** · 2026-10-28 11:02+01:00
    >
    > Friday, **November 13**.
-->

<!--
[^note-m3x8]: **anna** · 2026-10-28 09:40Z

    Which three ways? The page of the plan has a comment:

    ```html
    <!-- the three ways --\>
    <p>Faster reviews</p>
    ```

    > **hannes** · 2026-10-28 12:05+01:00
    >
    > A browser also ends a comment at `--!\>`, so the note escapes it too.
-->

## Tasks

- Update the user guide.
- Test the <wbr><!--[note-p4d1 orange-->side view<!--note-p4d1]--> on Windows.

<!--
[^note-p4d1]: **anna** · 2026-10-28 14:20+01:00

    - [ ] Windows 11
    - [ ] Windows 10
-->

## A table and a quote

| Grade | Participants |
| ----- | ------------ |
| 5     | <wbr><!--[note-t5q1-->12<!--note-t5q1]-->           |
| 6     | 15           |

<!--
[^note-t5q1]: **bob** · 2026-10-28 09:00-02:00

    Is 12 the number after the second count?
-->

> The quote keeps its <wbr><!--[note-q9z3-->highlight<!--note-q9z3]--> and stays one block.

<!--
[^note-q9z3]: **hannes** · 2026-10-28 15:00+01:00

    Quote checked.
-->

The other footnotes of a file stay footnotes.[^1]

[^1]: A footnote of the document, which is no note.
