<!--
SPDX-License-Identifier: MIT
© 2026 Hannes Stauss (scalarion@nimblescape.com)
Licensed under the MIT License. See LICENSE in the repository root for details.
-->

# Requested features and their state

This document lists each feature that Hannes asked for in the threads of the
project, with the date of the request, the requirement in
[requirements.md](requirements.md) that describes it, and its state on
2026-10-30. [specification.md](specification.md) summarizes the requirements
that are still valid. The requests for the paper workflow, such as the
layouts, the sections without chapter numbers, the lists of figures and
tables, the folders of a paper project and the citations, belong to
nimblescape Markdown Paper and its specification. The [user guide](guide.md) describes how to use the features that
are built; the [format](format.md) describes the notes in the file.

Of 125 requested features, 97 are built, among them the clean editing view
([decision 27](requirements.md#decisions)), which fixes the bug of the line
breaks and the cursor next to the hidden markers in the text editor, the
standard footnotes in the side view, the API for nimblescape Markdown
Paper, the figures, tables and sections with the links to them (to a
section by the ID that GitHub gives its heading), the
values of the front matter in the text, and the listings of code from the
source files of the repository with the snippets in them. 7 features are planned but not built: the features of the section
[Planned features](#planned-features). Four need Hannes: the npm package with
the first release, a setting of VS Code for the width of the text editor
in Zen Mode, the new name of the repository, and the question whether the
comment of the format becomes front matter. 11 requests were replaced or
dropped by later decisions of Hannes; each row names the decision. 6 requests
moved to nimblescape Markdown Paper: the citations, the sources, and the cite
and the line numbers of a rendered listing
([decision 32](requirements.md#decisions), [decision 35](requirements.md#decisions),
[decision 41](requirements.md#decisions)).

The main gaps are the visual editing in the side view, the hidden form of the
notes, and the checks of the footnotes.

The columns of the tables:

- **Request**: what Hannes asked for, as a short summary. The words of the
  requests stay in the discussion documents in Claude.
- **Asked**: the date (month-day) and, where known, the time (UTC) of the
  request.
- **Spec**: the requirement or requirements that describe the feature.
- **State**: Built (in the branch of the pull request), Bug (built, with an
  open bug), Planned (in the specification and the [plan](requirements.md#plan),
  not built), Needs Hannes (an action that only Hannes can take), Replaced (a
  later decision changed the request), Dropped (a later decision removed it),
  Moved (the request belongs to nimblescape Markdown Paper).
- **Detail**: the setting, the decision or the cause behind the state.

A change of a feature or of its state updates its row in this document.

## Side view

The side view has what Hannes asked for, apart from the visual editing,
which is in the section [Planned features](#planned-features). The
tooltips, the lighter dimming and the list that scrolls on its own came on
2026-10-29 (commit
[a508cdf](https://github.com/nimblescape/nimblescape-markdown-notes/commit/a508cdf)),
the header with the filters and the smooth scrolling of the text in the
evening of 2026-10-29.

| Request | Asked | Spec | State | Detail |
| --- | --- | --- | --- | --- |
| The view in the secondary side bar, beside the chat, so that the Explorer stays free | 10-28 11:33 | [R-SIDE-001](requirements.md#r-side-001) | Built | |
| One button that shows and hides the view, also in Zen Mode | 10-28 | [R-SIDE-006](requirements.md#r-side-006) | Built | "Show or Hide Notes" in the title of the editor |
| The view as the only place of the text of the notes | 10-28 19:58 | [R-GEN-009](requirements.md#r-gen-009) | Built | |
| Answers of different authors as a tree, as on Reddit | 10-28 13:27 | [R-NOTE-004](requirements.md#r-note-004) | Built | |
| Icons for all buttons, with tooltips | 10-28 20:06, 10-29 09:00 | [R-SIDE-002](requirements.md#r-side-002) | Built | The tooltips of the browser did not show on macOS; the view now draws its own |
| The text view of the whole note, which the user can change | 10-28 20:06 | [R-SIDE-002](requirements.md#r-side-002) | Built | |
| A color for each note, chosen in the view | 10-28 20:03 | [R-TEXT-006](requirements.md#r-text-006) | Built | |
| Links in the notes open, files in a new window | 10-28 14:38 | [R-SIDE-005](requirements.md#r-side-005) | Built | Setting `openLinksIn` |
| "Add Note" (+) in the title of the view | 10-28 19:58 | [R-SIDE-003](requirements.md#r-side-003) | Built | |
| The selected note at the top of the view | 10-28 | [R-SIDE-001](requirements.md#r-side-001) | Built | |
| A click on the empty part of the view, or Escape, deselects the note | 10-28 | [R-SIDE-007](requirements.md#r-side-007) | Built | |
| The other notes dimmed while one is selected | 10-28, 10-29 09:06 | [R-SIDE-007](requirements.md#r-side-007) | Built | Opacity 70 % instead of 50 % |
| Each thread that is not selected dimmed, also under the pointer; with the view open, the cursor that moves into a highlight selects its thread and scrolls the view to it | 10-29 18:12 | [R-SIDE-007](requirements.md#r-side-007) | Built | The view showed a new selection late: it asked VS Code for the GitHub session each time; now once for each change of the sessions |
| Which thread belongs to which highlight: first a funnel, then the view aligned to the text with a line | 10-28 11:38, 19:50 | [R-SIDE-007](requirements.md#r-side-007) | Replaced | By [decision 25](requirements.md#decisions) (10-29 09:06): a list that scrolls freely |
| The view scrolls on its own and smoothly | 10-29 09:03 | [R-SIDE-007](requirements.md#r-side-007) | Built | The list follows only a click or a move of the cursor into a highlight |
| A click on a thread selects it in the view | 10-29 16:30 | [R-SIDE-007](requirements.md#r-side-007) | Built | A bug of the clean editing view: the view got no new state after the click |
| The icon of the Markdown preview on the button "Preview" of the editors | 10-29 16:32 | [R-SIDE-002](requirements.md#r-side-002) | Built | The codicon "preview" of the mode "Markdown Preview" in place of "open-preview" (to the side); all icons of the view as VS Code 1.144 draws them |
| A header that stays at the top of the view while the list scrolls, the search field in a second row over the full width | 10-29 17:56, 18:07 | [R-SIDE-008](requirements.md#r-side-008) | Built | The name of the file, the todo filter, the color filter and "Clear Filter" in the first row |
| A filter by the color of the notes | 10-29 17:56 | [R-SIDE-008](requirements.md#r-side-008) | Built | One dot for each color that the notes of the file use; more than one dot shows the notes of each pressed color |
| A search in the full text of the notes | 10-29 17:56 | [R-SIDE-008](requirements.md#r-side-008) | Built | The text and the authors of all answers, without regard to case; each typed word must be in the note; Escape clears the field |
| A todo filter | 10-29 17:56, 18:04 | [R-SIDE-008](requirements.md#r-side-008) | Built | |
| The two todo filters exclude each other | 10-29 19:48 | [R-SIDE-008](requirements.md#r-side-008) | Built | A click on one box turns the other one off; before, both together showed all todo notes |
| The filters together, and a button that clears them | 10-29 17:56 | [R-SIDE-008](requirements.md#r-side-008) | Built | "Clear Filter" (X); the selected thread always shows; the filter stays when the view is hidden and shown again |
| Smooth scrolling of the text | 10-29 19:01 | [R-SIDE-007](requirements.md#r-side-007) | Built | VS Code scrolls a text editor smoothly only with its setting `editor.smoothScrolling`, which the extension now turns on for Markdown files; the preview scrolls smoothly unless the system asks for less motion |
| The text editor scrolls smoothly over the whole way | 10-29 19:50 | [R-SIDE-007](requirements.md#r-side-007) | Built | VS Code scrolls a text editor in 125 milliseconds and jumps over most of a long way; the extension now scrolls it itself in small steps, in about half a second, slowly at the start and at the end (checked in VS Code 1.144) |
| The view that a double click opens scrolls to the note | 10-29 19:26 | [R-SIDE-007](requirements.md#r-side-007) | Built | A hidden view cannot scroll; the view now scrolls to a thread that was selected while it was hidden when it shows again |
| The width of the text editor in Zen Mode when the side view opens | 10-29 19:29 | [R-SIDE-001](requirements.md#r-side-001) | Needs Hannes | The setting `"workbench.editor.centeredLayoutFixedWidth": true` of VS Code keeps the width (checked in VS Code 1.144: 900 pixels with the side view, 701 in place of 884 without the setting); it changes the centered layout of all files, so the extension does not set it |

## Text editor

The text editor has what Hannes asked for. Since 2026-10-29, a Markdown file
with notes opens in the clean editing view, which fixes the bug of the line
breaks and the cursor next to the hidden markers.

| Request | Asked | Spec | State | Detail |
| --- | --- | --- | --- | --- |
| Line breaks and editing next to the hidden markers | 10-29 09:09 | [R-TEXT-005](requirements.md#r-text-005) | Built | VS Code wraps a line by all its characters, also the hidden ones, so a row ended early. Fixed by the clean editing view of [decision 27](requirements.md#decisions) (10-29 09:37), which shows no hidden characters |
| The notes markup has no effect on the editing | 10-29 09:17 | [R-TEXT-009](requirements.md#r-text-009) | Built | [Decision 27](requirements.md#decisions): the clean editing view, step 38 of the plan; a prototype shown at 10:20, the full build checked in VS Code 1.144. Its limits are in [R-TEXT-009](requirements.md#r-text-009) |
| A file with notes always in the clean editing view | 10-29 11:11 | [R-TEXT-009](requirements.md#r-text-009) | Built | From the Explorer, a search, a link, the last session and the first note; "Open File with Markup" in the Command Palette shows the file itself, and the view of the changes of git shows the file |
| A better icon for "Show Highlights" | 10-29 08:57 | [R-GEN-011](requirements.md#r-gen-011) | Built | [Decision 26](requirements.md#decisions) (10-29 09:35): a highlighter pen from an icon font of the extension, in place of the eye; commit [8ab9937](https://github.com/nimblescape/nimblescape-markdown-notes/commit/8ab9937) |
| Notes always collapsed | 10-28 20:02 | [R-TEXT-005](requirements.md#r-text-005) | Built | Also at the start of VS Code (10-28 14:37) |
| Markers and header lines never editable; the cursor steps over them; Backspace and Delete act on the other side | 10-28 | [R-NOTE-006](requirements.md#r-note-006) | Built | In the text editor of the file itself; the clean editing view shows no markers |
| The header of an answer written by the extension and shown rendered | 10-28 11:51 | [R-TEXT-007](requirements.md#r-text-007) | Built | |
| Highlights, as with a marker pen, with good contrast, and buttons that show and hide them | 10-28 20:00, 20:18 | [R-GEN-011](requirements.md#r-gen-011) | Built | Setting `showHighlights` |
| A hidden highlight shows under the pointer | 10-28 20:29 | [R-GEN-011](requirements.md#r-gen-011) | Built | |
| "Show Highlights" and "Hide Highlights" deselect the note | 10-29 19:51 | [R-GEN-011](requirements.md#r-gen-011) | Built | In the text editor, the preview and the side view; the open editors of the side view stay |
| Closing the side view hides the highlights | 10-28 20:31 | [R-GEN-011](requirements.md#r-gen-011) | Replaced | By [decision 28](requirements.md#decisions) (10-29 16:33): the highlights do not depend on the side view |
| "Show Highlights" only shows the highlights | 10-29 16:33 | [R-GEN-011](requirements.md#r-gen-011) | Built | [Decision 28](requirements.md#decisions), step 39 of the plan |
| A click on a highlight selects its note and opens the side view; a click outside deselects it | 10-28, 20:32 | [R-SIDE-007](requirements.md#r-side-007) | Replaced | By [decision 29](requirements.md#decisions) (10-29 17:49): a click selects, a double click opens the side view |
| Only a double click opens the side view, in the text editor and in the preview | 10-29 17:49, 18:59 | [R-SIDE-007](requirements.md#r-side-007), [R-PREV-003](requirements.md#r-prev-003) | Built | [Decision 29](requirements.md#decisions), step 41 of the plan. VS Code tells an extension no double click in the text editor: the extension reads one from the word that the second click selects. Two bugs fixed in step 46: VS Code reports no first click on the place of the cursor, and the cursor at the start of a highlight in the clean editing view stood outside the note |
| The cursor that leaves a highlight deselects its note | 10-29 17:48, 18:12 | [R-SIDE-007](requirements.md#r-side-007) | Built | Also with the keys; a note that the user selected in the side view stays while the keys move outside the notes |
| A note only for selected text | 10-28 20:25 | [R-EDIT-003](requirements.md#r-edit-003) | Built | |
| "Add Note" at the selected text: the light bulb (Ctrl+.), Shift+Alt+N (Cmd+K N on macOS), the context menu | 10-29 07:47 | [R-EDIT-006](requirements.md#r-edit-006) | Built | |
| A hover with color icons over the selected text | 10-28 20:27 | [R-EDIT-006](requirements.md#r-edit-006) | Replaced | By the light bulb above (10-29 07:47) |
| Warnings where GitHub shows a note differently | 10-28 | [R-TEXT-008](requirements.md#r-text-008) | Built | |
| Comment boxes as in GitHub pull requests, the Comments view | 10-28 | [R-TEXT-001](requirements.md#r-text-001) | Dropped | (10-28 19:58) |
| Colored numbers in the left margin | 10-28 14:51 | [R-TEXT-006](requirements.md#r-text-006) | Dropped | (10-28 20:01) |
| Markdown highlighting inside a note, dimming after the cursor | 10-28 | [R-TEXT-004](requirements.md#r-text-004) | Dropped | The text editor never shows a note |
| Todo notes | 10-29 17:56 | [R-NOTE-008](requirements.md#r-note-008) | Built | [Decision 30](requirements.md#decisions) (10-29 17:58). The state `todo` or `done` stands in the header of the first answer; a check box in the side view marks a todo completed or open again |
| Slash commands in the text editor with completion | 10-29 18:28 | [R-EDIT-008](requirements.md#r-edit-008) | Built | A slash at the start of a line or after a space shows the list of VS Code; Tab or Enter takes a command. (18:40) |
| `/date` and `/time` | 10-29 18:29 | [R-EDIT-008](requirements.md#r-edit-008) | Built | The local date `2026-10-29`, and the local date and time in minutes `2026-10-29 19:29` |
| `/user` inserts the GitHub login of the user | 10-29 18:29 | [R-EDIT-008](requirements.md#r-edit-008) | Built | The GitHub login of the user, the author of the notes; without a session, the sign-in of VS Code first |
| `/footnote` creates a footnote | 10-29 18:30 | [R-EDIT-008](requirements.md#r-edit-008), [R-FOOT-003](requirements.md#r-foot-003) | Built | After a word: the reference with the next free number and the definition after the last standard footnote. Since step 32, through the editor of the side view ([Footnotes](#footnotes)) |
| `/note` for selected text, and only for selected text | 10-29 18:30 | [R-EDIT-008](requirements.md#r-edit-008) | Built | The slash that replaced the selected text offers `/note` and `/todo`; the text comes back and the side view opens the editor of the new note. `/todo` without selected text takes the sentence before the slash |
| `/figure` and `/table` | 10-30 02:32 | [R-XREF-001](requirements.md#r-xref-001), [R-EDIT-008](requirements.md#r-edit-008) | Built | Step 50. Both on an empty line outside code; `/table` inserts a table of two columns after its caption line `Table: Caption` |
| `/figure` lists the images of the folder | 10-30 02:45 | [R-XREF-001](requirements.md#r-xref-001) | Built | The images of the workspace (PNG, JPEG, GIF, SVG, WebP, AVIF) by their paths from the folder of the file; the chosen one becomes `![Caption](path)` with the caption selected |
| A link to a figure or a table | 10-30 02:33 | [R-XREF-001](requirements.md#r-xref-001), [R-XREF-002](requirements.md#r-xref-002) | Built | `/ref` lists the figures and tables of the file and inserts `[Table 1](#tab-grades)`; a figure or table without an anchor first gets `<a id="tab-…"></a>` at the end of its caption line. The formatter writes the numbers of the links from the order in the file; the clean editing view hides the anchors |
| Values of the front matter in the text | 10-30 03:10 | [R-XREF-004](requirements.md#r-xref-004) | Built | Step 52, the form proposed at 03:20: `/ref` inserts `<wbr><!--{title}-->A paper<!--{/title}-->`, the formatter writes the current value, the clean editing view hides the markers |
| The functions of the notes in the pages of a paper | 10-30 03:55 | [R-PREV-009](requirements.md#r-prev-009) | Built | Step 55: the script of the preview finds the highlights and "Add Note" in the pages of Markdown Paper, which copies the content of the preview into its pages; checked in Chromium with copied pages |
| Code of the source files in the text | 10-30 02:58, 03:03, 03:10 | [R-CODE-001](requirements.md#r-code-001) | Built | Step 53: `/listing` lists the source files, then "Whole file" and the snippets of the file (the symbols of step 53 are removed in step 60), and inserts `Listing: Caption`, `<!-- listing: ../src/x.ts#name -->` and the code block; `/ref` links it as `[Listing 1](#lst-…)` |
| Snippets in the source code that a listing names | 10-30 02:58, 03:03, 03:20 | [R-CODE-003](requirements.md#r-code-003) | Built | Step 54, in the form of the proposal, decided at 06:20 ([decision 39](requirements.md#decisions)): `// markdownnotes: snippet name` and `// markdownnotes: /snippet name`, with the name in both marks. `/snippet` and "Add Snippet" write the marks; Ctrl+Click on the comment of a listing opens the source |
| Snippets and listings in more file types | 10-30 04:29, 04:30 | [R-CODE-003](requirements.md#r-code-003), [R-CODE-001](requirements.md#r-code-001) | Built | Step 57: the marks in the comment form of more than 80 file types, also by the name of a file (`.env`, `Dockerfile`, `Makefile`); the symbols of the languages with braces and of Python are removed in step 60 |
| Snippets in any source | 10-30 04:30 | [R-CODE-003](requirements.md#r-code-003) | Built | Step 58: a file type that the extension does not know gets the comment form of VS Code for its language ("Add Line Comment") |
| The snippet as a tag in the source editor | 10-30 04:34 | [R-CODE-004](requirements.md#r-code-004) | Built | Step 58, [decision 37](requirements.md#decisions): a code lens above the start mark with the listings that show the snippet, the marks dimmed; replaced in step 62 by the tags in place of the mark lines |
| The mark as a tag in place of its line | 10-30 05:49, 05:57 | [R-CODE-004](requirements.md#r-code-004) | Built | Step 62: each mark line shows a tag in the small gray letters of a code lens in place of the comment, `snippet keep-lines · Listing 2 in paper/paper.md` and `/snippet keep-lines`; the line keeps its height, because VS Code cannot remove a line |
| Marks that cannot be edited | 10-30 05:49, 05:53 | [R-CODE-004](requirements.md#r-code-004) | Built | Step 62: the cursor jumps over the mark lines, Backspace and Delete next to them do nothing; "Rename Snippet" and "Remove Snippet" in the light bulb change the marks, and Rename also changes the listings |
| A click on the end tag | 10-30 05:57 | [R-CODE-004](requirements.md#r-code-004) | Built | Step 62: the cursor goes to the first line of the code of the snippet, and the start tag scrolls into view; a click on a start tag opens the listing |
| A toggle button that highlights the used snippets | 10-30 04:34 | [R-CODE-004](requirements.md#r-code-004) | Built | Step 58: "Show Used Snippets" and "Hide Used Snippets" in the title of the text editor of a source file with snippets |
| Listings of whole files and snippets, symbols only with parsers | 10-30 04:43, 05:38 | [R-CODE-005](requirements.md#r-code-005) | Built | Step 60, [decision 38](requirements.md#decisions): a listing shows a whole file or a snippet; the rules that found functions by their declarations are removed; the text editor warns at a listing whose file or snippet is not found |
| The formatter keeps the code blocks current | 10-30 02:59 | [R-CODE-002](requirements.md#r-code-002) | Built | Step 53: in VS Code (also from unsaved source files) and on the command line, which names a missing source and fails with `--check`; a snippet is found by its marks, the same way in both |
| The comment of a listing hidden in the clean editing view, and the caption as the link to the source | 10-30 06:36 | [R-CODE-001](requirements.md#r-code-001), [R-TEXT-009](requirements.md#r-text-009) | Built | Step 63, [decision 41](requirements.md#decisions): the view hides the comment and the `[` and `](…)` of the link of the caption, so that only the text of the caption is edited; Ctrl+Click on the caption opens the source at the snippet; `/listing` in the view writes the hidden parts into the file |
| The caption cites the source file and the lines, and the formatter keeps the lines current | 10-30 06:36, 06:40, 06:48 | [R-CODE-001](requirements.md#r-code-001), [R-CODE-002](requirements.md#r-code-002) | Built | Step 63: the caption is free text and a link to the source, `Listing: [Reading the fields](../src/fields.ts#L12-L30)`, so that a click on GitHub opens the lines; the formatter writes the link and its target, the text stays as written; no number in the caption |
| Line numbers in front of the code and a cite after the caption in the rendered listing | 10-30 06:30, 06:40, 06:43 | [R-CODE-001](requirements.md#r-code-001) | Moved | [Decision 41](requirements.md#decisions): options of the layout of nimblescape Markdown Paper, for example `(server.ts, L20-L40)` after the caption; the line numbers are off by default and start at 1 in each listing |
| `/ref` for sections | 10-30 02:47, 03:19 | [R-XREF-003](requirements.md#r-xref-003) | Built | Step 51, changed by step 56: `[Chapter 2.1](#methods)`; the chapters are the headings of the highest level that more than one heading has |
| Links to headings without anchors | 10-30 03:28 | [R-XREF-003](requirements.md#r-xref-003) | Built | Step 56, [decision 36](requirements.md#decisions): the link names the ID that GitHub gives the heading, and the heading gets no anchor; an anchor of the earlier form still counts |
| Plain Markdown first | 10-30 03:29 | [R-GEN-013](requirements.md#r-gen-013) | Built | A rule for each new form in the file; the links to headings follow it |
| Decisions in the specification | 10-30 03:48 | [R-GEN-014](requirements.md#r-gen-014) | Built | A rule for this document and the requirements |
| Which command adds an entry and which adds a reference | 10-30 02:45, 02:47 | [R-XREF-001](requirements.md#r-xref-001) | Built | [Decision 35](requirements.md#decisions): the commands named by a noun add an entry, `/ref` and `/cite` add a reference |
| `/todo` at the start of the text of a new note in the side view | 10-29 17:58 | [R-NOTE-008](requirements.md#r-note-008) | Dropped | The part of [decision 30](requirements.md#decisions) (18:40) |

## Markdown preview and the modes of VS Code

The preview shows the highlights, selects a note on a click, and adds a note
to selected text. A line from a
highlight in the preview to its note is not possible: the preview tells an
extension no place of its text, and Hannes chose the list
([decision 25](requirements.md#decisions)).

| Request | Asked | Spec | State | Detail |
| --- | --- | --- | --- | --- |
| The highlights in the preview, faint, strong under the pointer | 10-28 16:36, 20:00 | [R-PREV-001](requirements.md#r-prev-001) | Built | |
| A click on a highlight selects its note in the side view and opens the view; a click outside deselects it | 10-28 | [R-PREV-003](requirements.md#r-prev-003) | Replaced | By [decision 29](requirements.md#decisions) (10-29 17:49): a click selects, a double click opens the side view and not the text editor |
| "Add Note" for selected text in the Markdown preview | 10-29 16:38 | [R-PREV-008](requirements.md#r-prev-008) | Built | A button "Add Note" above the selected text, in the preview to the side and in the mode "Markdown Preview" |
| The style sheets of `markdown.styles` in the preview of the clean editing view: a warning "Could not load 'markdown.styles': .vscode/markdown-serif.css" | 10-29 17:43 | [R-TEXT-009](requirements.md#r-text-009) | Built | A bug of the clean editing view: its preview looked for the style sheet in the folder of the file, and showed no images; the file system of the view now gives the preview these files |
| The buttons "Show Highlights" and "Hide Highlights" in the title of the preview | 10-28 20:00 | [R-PREV-005](requirements.md#r-prev-005) | Built | |
| The text without the notes; other footnotes as before | 10-28 | [R-PREV-004](requirements.md#r-prev-004) | Built | Markdown Footnotes in the extension pack ([R-GEN-008](requirements.md#r-gen-008)) |
| The side view follows the modes "Markdown Preview" and "Markdown Editor" | 10-28 | [R-PREV-006](requirements.md#r-prev-006) | Built | The mode "Markdown Editor" shows no highlights: it has no API for extensions |
| A click on a thread keeps the mode of the tab also in the clean editing view | 10-29 16:35 | [R-SIDE-007](requirements.md#r-side-007), [R-PREV-006](requirements.md#r-prev-006) | Built | A bug of the clean editing view: the tab of a mode holds the URI of the view, not of the file |
| Only additions: other Markdown extensions keep working | 10-28 | [R-GEN-007](requirements.md#r-gen-007) | Built | |
| A link from a highlight in the preview to its note | 10-29 09:03 | [R-SIDE-007](requirements.md#r-side-007) | Replaced | By [decision 25](requirements.md#decisions): the list; the click selects the note |
| Icons and callouts of the notes in the preview | 10-28 | [R-PREV-002](requirements.md#r-prev-002) | Dropped | (10-28 19:59) |

## Note format, formatter and command line

The format and the formatter are built. The npm package and the first release
need Hannes after the merge of
[pull request #1](https://github.com/nimblescape/nimblescape-markdown-notes/pull/1).

| Request | Asked | Spec | State | Detail |
| --- | --- | --- | --- | --- |
| Notes as Markdown footnotes, which GitHub shows | 10-28 12:47 | [R-NOTE-001](requirements.md#r-note-001) | Built | |
| A header with the GitHub login and the date with the time zone of the author | 10-28 | [R-NOTE-002](requirements.md#r-note-002) | Built | Sign-in: [R-GEN-006](requirements.md#r-gen-006) |
| A start marker for every note, always with `<wbr>`, the color in the marker, the reference as the end marker | 10-28 20:09-20:24 | [R-NOTE-006](requirements.md#r-note-006) | Built | |
| The comment of the format for AI agents, with a link to the specification | 10-28 16:25 | [R-NOTE-007](requirements.md#r-note-007) | Built | |
| The comment only with a change or a save, with the version `v1.0.0` as a semantic version | 10-29 07:36, 07:40 | [R-NOTE-007](requirements.md#r-note-007) | Built | |
| The comment of the format as front matter | 10-30 02:49 | [R-NOTE-007](requirements.md#r-note-007) | Needs Hannes | Recommendation of 03:03: keep the comment, because GitHub shows the front matter of a Markdown file as a table at the top of the page; the front matter holds the data of a paper |
| An own formatter with format on save: tables, blank lines, one line per paragraph | 10-28 | [R-FMT-001](requirements.md#r-fmt-001) | Built | Also [R-FMT-002](requirements.md#r-fmt-002), [R-FMT-003](requirements.md#r-fmt-003) |
| Format on save only for files with notes | 10-29 06:37 | [R-FMT-001](requirements.md#r-fmt-001) | Built | Setting `formatOnSave` |
| The formatter for agents on the command line, as an npm package | 10-28 18:03, 19:05 | [R-FMT-004](requirements.md#r-fmt-004) | Built | `npx -y @nimblescape/markdownnotes format` |
| The package on npmjs.com and the first release of the extension | 10-28 19:05 | [R-GEN-005](requirements.md#r-gen-005) | Needs Hannes | After the merge; the thread "Publish formatter to npmjs" has the steps |
| The extension ID `nimblescape.nimblescape-markdownnotes` | 10-30 02:04 | [R-GEN-005](requirements.md#r-gen-005) | Built | Step 47 |
| The new name of the repository, `markdownnotes-vscode` | 10-30 02:04 | [R-GEN-005](requirements.md#r-gen-005) | Needs Hannes | Then the addresses of the repository change and the Marketplace setup runs again |
| An API for other extensions | 10-29 22:15-22:16 | [R-GEN-012](requirements.md#r-gen-012) | Built | Version 1 with `fileOf`, `registerFormatStep`, `registerHiddenBlocks` and `registerSlashCommand`, for nimblescape Markdown Paper (steps 47 and 48) |
| A clean split; the citations and the sources go into nimblescape Markdown Paper | 10-29 22:11, 10-30 02:25 | [R-GEN-012](requirements.md#r-gen-012) | Built | [Decision 32](requirements.md#decisions); the format of the notes stays `v1.0.0`, and Markdown Paper adds the citations through the API |
| Names without a hyphen, "markdown-notes" → "markdownnotes" | 10-30 02:27, 02:30 | [R-GEN-005](requirements.md#r-gen-005), [R-FMT-004](requirements.md#r-fmt-004), [R-NOTE-007](requirements.md#r-note-007) | Built | [Decision 33](requirements.md#decisions), step 49: `@nimblescape/markdownnotes`, the command `markdownnotes`, the format `nimblescape-markdownnotes`, the scheme `markdownnotes` |
| One formatter command with two packages | 10-30 02:26 | [R-FMT-004](requirements.md#r-fmt-004) | Built | [Decision 34](requirements.md#decisions): the library `formatMarkdown` of `@nimblescape/markdownnotes`, which `markdownpaper format` calls before its own steps |
| All specifications as a spec doc in the repository | 10-30 02:38, 02:39 | [specification.md](specification.md) | Built | The summary links each point to its requirement |

## Footnotes

The side view is also the editor of the standard footnotes of a file, the
footnotes that are no note, since the evening of 2026-10-29 (steps 32 and 33
of the plan). The checks of the footnotes, "Renumber Footnotes" and "Make
Footnote" are in the section [Planned features](#planned-features).

| Request | Asked | Spec | State | Detail |
| --- | --- | --- | --- | --- |
| Standard footnotes in the side view; show, edit, delete | 10-29 07:48 | [R-FOOT-001](requirements.md#r-foot-001), [R-FOOT-002](requirements.md#r-foot-002) | Built | Each footnote at the place of its first reference, with its label and the numbers of GitHub and of the preview in the tooltip; "Delete" asks first and removes the definition and every reference; no "Go to Definition", as for a note (, 20:26). Setting `showFootnotes` and the buttons "Hide Footnotes" and "Show Footnotes" in the title of the view |
| "Add Footnote" at the cursor | 10-29 08:01 | [R-FOOT-003](requirements.md#r-foot-003) | Built | Shift+Alt+B (Cmd+K B on macOS), the title of the side view, the context menu and the Command Palette; the editor of the new footnote in the side view, with the text before the place in its title |
| `/footnote` opens the editor of the new footnote in the side view | 10-29 18:51 | [R-EDIT-008](requirements.md#r-edit-008), [R-FOOT-003](requirements.md#r-foot-003) | Built | The command leaves the text, and "Add Footnote" in the editor writes the reference and the definition |
| Citations as footnotes inside the highlight of a note | 10-29 20:12 | [R-FOOT-001](requirements.md#r-foot-001) | Built | It worked for GitHub, the preview and the formatter; the fix: the cursor on the reference selects the footnote, and the rest of the highlight the note. The citations themselves moved to nimblescape Markdown Paper ([decision 32](requirements.md#decisions)) |
| The definitions of the footnotes hidden in the text | 10-29 20:42 | [R-TEXT-009](requirements.md#r-text-009), [R-FOOT-001](requirements.md#r-foot-001) | Built | In the clean editing view of a file with notes, while the side view shows the footnotes; the references stay, and a definition without a reference too. A definition typed in the view stays until the view reads the file anew. A file with only standard footnotes opens in its own text editor, with its definitions |

## Planned features

7 features are in the specification and the plan, or proposed, but not built. Steps 29
and 30 must come before the first release, because they change the format
`v1.0.0`. Step 38, the clean editing view, comes before them, because the
hidden form changes the markup that the clean view leaves out.

| Request | Asked | Spec | Plan step | State |
| --- | --- | --- | --- | --- |
| The hidden form of the notes, which every viewer hides, also GitHub | 10-29 08:01 | [R-HIDE-001](requirements.md#r-hide-001), [R-HIDE-003](requirements.md#r-hide-003) | 29, before the first release | Planned |
| An icon at the top of the side view that hides the notes from other viewers | 10-29 08:02 | [R-HIDE-002](requirements.md#r-hide-002) | 30, before the first release | Planned |
| The text without notes for publishing: `markdownnotes strip`, "Copy without Notes" | 10-29 08:01 | [R-HIDE-004](requirements.md#r-hide-004) | 31 | Planned |
| Checks of the footnotes and "Renumber Footnotes" | 10-29 08:01 | [R-FOOT-004](requirements.md#r-foot-004), [R-FOOT-005](requirements.md#r-foot-005) | 34 | Planned |
| "Make Footnote": an accepted note becomes a standard footnote | 10-29 08:01 | [R-FOOT-006](requirements.md#r-foot-006) | 35 | Planned |
| Visual editing of the rendered Markdown in the side view, as in the Markdown Editor of VS Code | 10-28 | [R-SIDE-004](requirements.md#r-side-004) | 14, not started | Planned |
| Symbols of a listing with parsers | 10-30 04:46, 05:36 | [R-CODE-005](requirements.md#r-code-005) | 61, later | Planned |

## Moved to nimblescape Markdown Paper

Hannes decided on 2026-10-30 at 02:25 that the citations and the sources go
into nimblescape Markdown Paper ([decision 32](requirements.md#decisions)),
and at 02:47 that `/source` and `/cite` of Markdown Paper add a source and a
citation ([decision 35](requirements.md#decisions)). Their code was built on 2026-10-29 in the form of links and handed to the
thread of Markdown Paper, which adds them through the API of this extension.

| Request | Asked | Spec | Plan step | State |
| --- | --- | --- | --- | --- |
| A metadata format for the sources | 10-29 18:55 | [R-EDIT-008](requirements.md#r-edit-008) | 45 | Moved |
| A render hint in the comment of the format, with a link to an instruction file of the style | 10-29 19:18 | [R-EDIT-008](requirements.md#r-edit-008) | 45 | Moved |
| "/research" adds a (RESEARCH) source, which instructs AI agents to find a suitable source for the argument before it | 10-29 18:33-18:39 | [R-EDIT-008](requirements.md#r-edit-008) | 45 | Moved |
| "/source" only lists the existing sources of the document and inserts one | 10-29 18:33, 18:37 | [R-EDIT-008](requirements.md#r-edit-008) | 45 | Moved |
| "/source" lists all files of the folder `bib/` | 10-30 02:45 | [R-XREF-001](requirements.md#r-xref-001) | | Moved |

The later fixes of the code review of 2026-10-28 are not in the
specification: a queue of writes for each file, tests of the script of the
side view, and ESLint.

## Open work and its order

The rule of 2026-10-29 09:17 is built: the clean editing view (step 38,
[decision 27](requirements.md#decisions)). The open work, in its order:

1. Steps 29 and 30: the hidden form of the notes and its icon, before the
   first release, because it changes the markup that the clean editing view
   leaves out.
2. The merge of
   [pull request #1](https://github.com/nimblescape/nimblescape-markdown-notes/pull/1),
   the new name of the repository, the first release and the npm package:
   these need Hannes. The rename comes before the first publish of the npm
   package, because the trusted publisher of npmjs.com names the repository.
3. Steps 31, 34 and 35: the text without notes, the checks of the
   footnotes, "Renumber Footnotes" and "Make Footnote".
4. Step 14: the visual editing in the side view.

---

© 2026 Hannes Stauss (scalarion@nimblescape.com) ·
[MIT License](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/LICENSE).
