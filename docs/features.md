<!--
SPDX-License-Identifier: MIT
© 2026 Hannes Stauss (scalarion@nimblescape.com)
Licensed under the MIT License. See LICENSE in the repository root for details.
-->

# Requested features and their state

This document lists each feature that Hannes asked for in the threads of the
project, with the date of the request, the requirement of the
[specification](requirements.md) that describes it, and its state on
2026-10-29. The [user guide](guide.md) describes how to use the features that
are built; the [format](format.md) describes the notes in the file.

Of 91 requested features, 68 are built, among them the clean editing view
([decision 27](requirements.md#decisions)), which fixes the bug of the line
breaks and the cursor next to the hidden markers in the text editor, and
the standard footnotes in the side view. 10 features are planned but not built: the features of the section
[Planned features](#planned-features). Two need Hannes: the npm package with
the first release, and a setting of VS Code for the width of the text editor
in Zen Mode. 11 requests were replaced or dropped by later decisions of
Hannes; each row names the decision.

The main gaps are the visual editing in the side view, the hidden form of the
notes, the checks of the footnotes, and the citations and sources
in the style of the PHT (APA 7) with the slash commands `/research` and
`/source`. Hannes chose their form on 2026-10-29 at 20:48: footnotes with
the metadata of the source as CSL
([decision 31](requirements.md#decisions)).

The columns of the tables:

- **Request**: what Hannes asked for, in his words where a quote helps.
- **Asked**: the date (month-day) and, where known, the time (UTC) of the
  request.
- **Spec**: the requirement or requirements that describe the feature.
- **State**: Built (in the branch of the pull request), Bug (built, with an
  open bug), Planned (in the specification and the [plan](requirements.md#plan),
  not built), Needs Hannes (an action that only Hannes can take), Replaced (a
  later decision changed the request), Dropped (a later decision removed it).
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
| The view as the only place of the text of the notes: "we completely drop the inline view" | 10-28 19:58 | [R-GEN-009](requirements.md#r-gen-009) | Built | |
| Answers of different authors as a tree, as on Reddit | 10-28 13:27 | [R-NOTE-004](requirements.md#r-note-004) | Built | |
| Icons for all buttons, with tooltips: "add tooltips to the icons" | 10-28 20:06, 10-29 09:00 | [R-SIDE-002](requirements.md#r-side-002) | Built | The tooltips of the browser did not show on macOS; the view now draws its own |
| The text view of the whole note, which the user can change | 10-28 20:06 | [R-SIDE-002](requirements.md#r-side-002) | Built | |
| A color for each note, chosen in the view: "by default they get all the same color" | 10-28 20:03 | [R-TEXT-006](requirements.md#r-text-006) | Built | |
| Links in the notes open, files in a new window | 10-28 14:38 | [R-SIDE-005](requirements.md#r-side-005) | Built | Setting `openLinksIn` |
| "Add Note" (+) in the title of the view | 10-28 19:58 | [R-SIDE-003](requirements.md#r-side-003) | Built | |
| The selected note at the top of the view: "so the selected note is on top" | 10-28 | [R-SIDE-001](requirements.md#r-side-001) | Built | |
| A click on the empty part of the view, or Escape, deselects the note | 10-28 | [R-SIDE-007](requirements.md#r-side-007) | Built | |
| The other notes dimmed while one is selected; on 10-29: "too dark" | 10-28, 10-29 09:06 | [R-SIDE-007](requirements.md#r-side-007) | Built | Opacity 70 % instead of 50 % |
| Each thread that is not selected dimmed, also under the pointer; with the view open, the cursor that moves into a highlight selects its thread and scrolls the view to it | 10-29 18:12 | [R-SIDE-007](requirements.md#r-side-007) | Built | The view showed a new selection late: it asked VS Code for the GitHub session each time; now once for each change of the sessions |
| Which thread belongs to which highlight: first a funnel, then the view aligned to the text with a line: "only the selected one has the connection" | 10-28 11:38, 19:50 | [R-SIDE-007](requirements.md#r-side-007) | Replaced | By [decision 25](requirements.md#decisions) (10-29 09:06): a list that scrolls freely |
| The view scrolls on its own and smoothly: "cannot be scrolled individually to find a note", "laggy" | 10-29 09:03 | [R-SIDE-007](requirements.md#r-side-007) | Built | The list follows only a click or a move of the cursor into a highlight |
| A click on a thread selects it in the view: "when selecting a note in the sideview, it gets not select in the sideview" | 10-29 16:30 | [R-SIDE-007](requirements.md#r-side-007) | Built | A bug of the clean editing view: the view got no new state after the click |
| The icon of the Markdown preview on the button "Preview" of the editors: "the side view shows a wrong one" | 10-29 16:32 | [R-SIDE-002](requirements.md#r-side-002) | Built | The codicon "preview" of the mode "Markdown Preview" in place of "open-preview" (to the side); all icons of the view as VS Code 1.144 draws them |
| A header that stays at the top of the view while the list scrolls: "filename [ ] [X] (R) (B) (G) ... X", the search field in a second row over the full width | 10-29 17:56, 18:07 | [R-SIDE-008](requirements.md#r-side-008) | Built | The name of the file, the todo filter, the color filter and "Clear Filter" in the first row |
| A filter by the color of the notes | 10-29 17:56 | [R-SIDE-008](requirements.md#r-side-008) | Built | One dot for each color that the notes of the file use; more than one dot shows the notes of each pressed color |
| A search in the full text of the notes | 10-29 17:56 | [R-SIDE-008](requirements.md#r-side-008) | Built | The text and the authors of all answers, without regard to case; each typed word must be in the note; Escape clears the field |
| A todo filter: "an empty box for open todos and a checked box for completed todos" | 10-29 17:56, 18:04 | [R-SIDE-008](requirements.md#r-side-008) | Built | |
| The two todo filters exclude each other: "the checked and unchecked todo filters are exclusive" | 10-29 19:48 | [R-SIDE-008](requirements.md#r-side-008) | Built | A click on one box turns the other one off; before, both together showed all todo notes |
| The filters together, and a button that clears them: "the filters are combined with AND" | 10-29 17:56 | [R-SIDE-008](requirements.md#r-side-008) | Built | "Clear Filter" (X); the selected thread always shows; the filter stays when the view is hidden and shown again |
| Smooth scrolling of the text: "use smooth scrolling as in the side view when the side view selects a note and the main view scrolls to that, in text view and in preview mode" | 10-29 19:01 | [R-SIDE-007](requirements.md#r-side-007) | Built | VS Code scrolls a text editor smoothly only with its setting `editor.smoothScrolling`, which the extension now turns on for Markdown files; the preview scrolls smoothly unless the system asks for less motion |
| The text editor scrolls smoothly over the whole way: "only the preview main window scrolls smoothly, the text window not" | 10-29 19:50 | [R-SIDE-007](requirements.md#r-side-007) | Built | VS Code scrolls a text editor in 125 milliseconds and jumps over most of a long way; the extension now scrolls it itself in small steps, in about half a second, slowly at the start and at the end (checked in VS Code 1.144) |
| The view that a double click opens scrolls to the note: "the side view is opened but it does not scroll to the right position" | 10-29 19:26 | [R-SIDE-007](requirements.md#r-side-007) | Built | A hidden view cannot scroll; the view now scrolls to a thread that was selected while it was hidden when it shows again |
| The width of the text editor in Zen Mode when the side view opens: "keep the main view the same width in zen view when a side view opens as long as the main view has enough space" | 10-29 19:29 | [R-SIDE-001](requirements.md#r-side-001) | Needs Hannes | The setting `"workbench.editor.centeredLayoutFixedWidth": true` of VS Code keeps the width (checked in VS Code 1.144: 900 pixels with the side view, 701 in place of 884 without the setting); it changes the centered layout of all files, so the extension does not set it |

## Text editor

The text editor has what Hannes asked for. Since 2026-10-29, a Markdown file
with notes opens in the clean editing view, which fixes the bug of the line
breaks and the cursor next to the hidden markers.

| Request | Asked | Spec | State | Detail |
| --- | --- | --- | --- | --- |
| Line breaks and editing next to the hidden markers: "the cursor is in a position where nothing is there, editing there breaks the format" | 10-29 09:09 | [R-TEXT-005](requirements.md#r-text-005) | Built | VS Code wraps a line by all its characters, also the hidden ones, so a row ended early. Fixed by the clean editing view of [decision 27](requirements.md#decisions) (10-29 09:37), which shows no hidden characters |
| The notes markup has no effect on the editing: "the editor must behave as if there was no notes markup at all in the document" | 10-29 09:17 | [R-TEXT-009](requirements.md#r-text-009) | Built | [Decision 27](requirements.md#decisions): the clean editing view, step 38 of the plan; a prototype shown at 10:20, the full build checked in VS Code 1.144. Its limits are in [R-TEXT-009](requirements.md#r-text-009) |
| A file with notes always in the clean editing view: "we always want our markdown notes be in cleanview - always not with a separate command" | 10-29 11:11 | [R-TEXT-009](requirements.md#r-text-009) | Built | From the Explorer, a search, a link, the last session and the first note; "Open File with Markup" in the Command Palette shows the file itself, and the view of the changes of git shows the file |
| A better icon for "Show Highlights" | 10-29 08:57 | [R-GEN-011](requirements.md#r-gen-011) | Built | [Decision 26](requirements.md#decisions) (10-29 09:35): a highlighter pen from an icon font of the extension, in place of the eye; commit [8ab9937](https://github.com/nimblescape/nimblescape-markdown-notes/commit/8ab9937) |
| Notes always collapsed: "in the text view we never show the notes and the markers" | 10-28 20:02 | [R-TEXT-005](requirements.md#r-text-005) | Built | Also at the start of VS Code (10-28 14:37) |
| Markers and header lines never editable; the cursor steps over them; Backspace and Delete act on the other side | 10-28 | [R-NOTE-006](requirements.md#r-note-006) | Built | In the text editor of the file itself; the clean editing view shows no markers |
| The header of an answer written by the extension and shown rendered | 10-28 11:51 | [R-TEXT-007](requirements.md#r-text-007) | Built | |
| Highlights, as with a marker pen, with good contrast, and buttons that show and hide them | 10-28 20:00, 20:18 | [R-GEN-011](requirements.md#r-gen-011) | Built | Setting `showHighlights` |
| A hidden highlight shows under the pointer | 10-28 20:29 | [R-GEN-011](requirements.md#r-gen-011) | Built | |
| "Show Highlights" and "Hide Highlights" deselect the note: "when a highlight is selected, and the higlight view is toggled, it shall unselect the selected highligt" | 10-29 19:51 | [R-GEN-011](requirements.md#r-gen-011) | Built | In the text editor, the preview and the side view; the open editors of the side view stay |
| Closing the side view hides the highlights | 10-28 20:31 | [R-GEN-011](requirements.md#r-gen-011) | Replaced | By [decision 28](requirements.md#decisions) (10-29 16:33): the highlights do not depend on the side view |
| "Show Highlights" only shows the highlights: "it shall not open the side view but only show the highlights. when a highlight is clicked, then the side view shall open" | 10-29 16:33 | [R-GEN-011](requirements.md#r-gen-011) | Built | [Decision 28](requirements.md#decisions), step 39 of the plan |
| A click on a highlight selects its note and opens the side view; a click outside deselects it | 10-28, 20:32 | [R-SIDE-007](requirements.md#r-side-007) | Replaced | By [decision 29](requirements.md#decisions) (10-29 17:49): a click selects, a double click opens the side view |
| Only a double click opens the side view: "only a double click on a selected highlight shall open the side view", "in both text and preview"; at 18:59: "doubleclick does not open the side view" | 10-29 17:49, 18:59 | [R-SIDE-007](requirements.md#r-side-007), [R-PREV-003](requirements.md#r-prev-003) | Built | [Decision 29](requirements.md#decisions), step 41 of the plan. VS Code tells an extension no double click in the text editor: the extension reads one from the word that the second click selects. Two bugs fixed in step 46: VS Code reports no first click on the place of the cursor, and the cursor at the start of a highlight in the clean editing view stood outside the note |
| The cursor that leaves a highlight deselects its note: "moving the cursor into a highlight shows the highlight but keeps it selected when the cursor goes out of it again" | 10-29 17:48, 18:12 | [R-SIDE-007](requirements.md#r-side-007) | Built | Also with the keys; a note that the user selected in the side view stays while the keys move outside the notes |
| A note only for selected text: "there shall be no way to add a note without highlighting text" | 10-28 20:25 | [R-EDIT-003](requirements.md#r-edit-003) | Built | |
| "Add Note" at the selected text: the light bulb (Ctrl+.), Shift+Alt+N (Cmd+K N on macOS), the context menu | 10-29 07:47 | [R-EDIT-006](requirements.md#r-edit-006) | Built | |
| A hover with color icons over the selected text | 10-28 20:27 | [R-EDIT-006](requirements.md#r-edit-006) | Replaced | By the light bulb above (10-29 07:47) |
| Warnings where GitHub shows a note differently | 10-28 | [R-TEXT-008](requirements.md#r-text-008) | Built | |
| Comment boxes as in GitHub pull requests, the Comments view | 10-28 | [R-TEXT-001](requirements.md#r-text-001) | Dropped | "we completely drop the inline view" (10-28 19:58) |
| Colored numbers in the left margin | 10-28 14:51 | [R-TEXT-006](requirements.md#r-text-006) | Dropped | "drop all colored icons on the left" (10-28 20:01) |
| Markdown highlighting inside a note, dimming after the cursor | 10-28 | [R-TEXT-004](requirements.md#r-text-004) | Dropped | The text editor never shows a note |
| Todo notes: "/todo in the text adds a special todo note", "a todo can be marked completed" | 10-29 17:56 | [R-NOTE-008](requirements.md#r-note-008) | Built | [Decision 30](requirements.md#decisions) (10-29 17:58). The state `todo` or `done` stands in the header of the first answer; a check box in the side view marks a todo completed or open again |
| Slash commands in the text editor with completion: "the / command allows tab completion" | 10-29 18:28 | [R-EDIT-008](requirements.md#r-edit-008) | Built | A slash at the start of a line or after a space shows the list of VS Code; Tab or Enter takes a command. "all slash commands are intended for the text editor" (18:40) |
| `/date` and `/time` | 10-29 18:29 | [R-EDIT-008](requirements.md#r-edit-008) | Built | The local date `2026-10-29`, and the local date and time in minutes `2026-10-29 19:29` |
| "/user insert the current user name" | 10-29 18:29 | [R-EDIT-008](requirements.md#r-edit-008) | Built | The GitHub login of the user, the author of the notes; without a session, the sign-in of VS Code first |
| "/footnote creates a footnote" | 10-29 18:30 | [R-EDIT-008](requirements.md#r-edit-008), [R-FOOT-003](requirements.md#r-foot-003) | Built | After a word: the reference with the next free number and the definition after the last standard footnote. Since step 32, through the editor of the side view ([Footnotes](#footnotes)) |
| "selecting and /note creates a note", "/note is not available when no text is selected" | 10-29 18:30 | [R-EDIT-008](requirements.md#r-edit-008) | Built | The slash that replaced the selected text offers `/note` and `/todo`; the text comes back and the side view opens the editor of the new note. `/todo` without selected text takes the sentence before the slash |
| `/todo` at the start of the text of a new note in the side view | 10-29 17:58 | [R-NOTE-008](requirements.md#r-note-008) | Dropped | The part "in the side view" of [decision 30](requirements.md#decisions): "all slash commands are intended for the text editor" (18:40) |

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
| "Add Note" for selected text in the Markdown preview: "notes cannot be added in the preview view, but this should be possible as well" | 10-29 16:38 | [R-PREV-008](requirements.md#r-prev-008) | Built | A button "Add Note" above the selected text, in the preview to the side and in the mode "Markdown Preview" |
| The style sheets of `markdown.styles` in the preview of the clean editing view: a warning "Could not load 'markdown.styles': .vscode/markdown-serif.css" | 10-29 17:43 | [R-TEXT-009](requirements.md#r-text-009) | Built | A bug of the clean editing view: its preview looked for the style sheet in the folder of the file, and showed no images; the file system of the view now gives the preview these files |
| The buttons "Show Highlights" and "Hide Highlights" in the title of the preview | 10-28 20:00 | [R-PREV-005](requirements.md#r-prev-005) | Built | |
| The text without the notes; other footnotes as before | 10-28 | [R-PREV-004](requirements.md#r-prev-004) | Built | Markdown Footnotes in the extension pack ([R-GEN-008](requirements.md#r-gen-008)) |
| The side view follows the modes "Markdown Preview" and "Markdown Editor": "it shall stay in the mode the view is" | 10-28 | [R-PREV-006](requirements.md#r-prev-006) | Built | The mode "Markdown Editor" shows no highlights: it has no API for extensions |
| A click on a thread keeps the mode of the tab also in the clean editing view: "it shall stay in the currently selected view" | 10-29 16:35 | [R-SIDE-007](requirements.md#r-side-007), [R-PREV-006](requirements.md#r-prev-006) | Built | A bug of the clean editing view: the tab of a mode holds the URI of the view, not of the file |
| Only additions: other Markdown extensions keep working | 10-28 | [R-GEN-007](requirements.md#r-gen-007) | Built | |
| A link from a highlight in the preview to its note: "the linking is not implemented for the preview" | 10-29 09:03 | [R-SIDE-007](requirements.md#r-side-007) | Replaced | By [decision 25](requirements.md#decisions): the list; the click selects the note |
| Icons and callouts of the notes in the preview | 10-28 | [R-PREV-002](requirements.md#r-prev-002) | Dropped | "we completely drop the callouts on hover view" (10-28 19:59) |

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
| An own formatter with format on save: tables, blank lines, one line per paragraph | 10-28 | [R-FMT-001](requirements.md#r-fmt-001) | Built | Also [R-FMT-002](requirements.md#r-fmt-002), [R-FMT-003](requirements.md#r-fmt-003) |
| Format on save only for files with notes | 10-29 06:37 | [R-FMT-001](requirements.md#r-fmt-001) | Built | Setting `formatOnSave` |
| The formatter for agents on the command line, as an npm package | 10-28 18:03, 19:05 | [R-FMT-004](requirements.md#r-fmt-004) | Built | `npx -y @nimblescape/markdown-notes format` |
| The package on npmjs.com and the first release of the extension | 10-28 19:05 | [R-GEN-005](requirements.md#r-gen-005) | Needs Hannes | After the merge; the thread "Publish formatter to npmjs" has the steps |

## Footnotes

The side view is also the editor of the standard footnotes of a file, the
footnotes that are no note, since the evening of 2026-10-29 (steps 32 and 33
of the plan). The checks of the footnotes, "Renumber Footnotes" and "Make
Footnote" are in the section [Planned features](#planned-features).

| Request | Asked | Spec | State | Detail |
| --- | --- | --- | --- | --- |
| Standard footnotes in the side view: "the extension could serve as a rich ui for editing footnotes"; show, edit, delete | 10-29 07:48 | [R-FOOT-001](requirements.md#r-foot-001), [R-FOOT-002](requirements.md#r-foot-002) | Built | Each footnote at the place of its first reference, with its label and the numbers of GitHub and of the preview in the tooltip; "Delete" asks first and removes the definition and every reference; no "Go to Definition", as for a note ("why go to definition? we do not have that for notes", 20:26). Setting `showFootnotes` and the buttons "Hide Footnotes" and "Show Footnotes" in the title of the view |
| "Add Footnote" at the cursor | 10-29 08:01 | [R-FOOT-003](requirements.md#r-foot-003) | Built | Shift+Alt+B (Cmd+K B on macOS), the title of the side view, the context menu and the Command Palette; the editor of the new footnote in the side view, with the text before the place in its title |
| `/footnote` opens the editor of the new footnote in the side view: "it just goes to the side view editor, similar to the /notes command" | 10-29 18:51 | [R-EDIT-008](requirements.md#r-edit-008), [R-FOOT-003](requirements.md#r-foot-003) | Built | The command leaves the text, and "Add Footnote" in the editor writes the reference and the definition |
| Citations as footnotes inside the highlight of a note: "these citations can be in a highlight region with a note. does that work?" | 10-29 20:12 | [R-FOOT-001](requirements.md#r-foot-001) | Built | It worked for GitHub, the preview and the formatter; the fix: the cursor on the reference selects the footnote, and the rest of the highlight the note. Hannes chose the form of the citations at 20:48: footnotes with CSL ([decision 31](requirements.md#decisions), step 45) |
| The definitions of the footnotes hidden in the text: "the definition can even be hidden, same as for the note, it does not make sense to show it" | 10-29 20:42 | [R-TEXT-009](requirements.md#r-text-009), [R-FOOT-001](requirements.md#r-foot-001) | Built | In the clean editing view of a file with notes, while the side view shows the footnotes; the references stay, and a definition without a reference too. A definition typed in the view stays until the view reads the file anew. A file with only standard footnotes opens in its own text editor, with its definitions |

## Planned features

10 features are in the specification and the plan, but not built. Steps 29
and 30 must come before the first release, because they change the format
`v1.0.0`. Step 38, the clean editing view, comes before them, because the
hidden form changes the markup that the clean view leaves out.

| Request | Asked | Spec | Plan step | State |
| --- | --- | --- | --- | --- |
| The hidden form of the notes, which every viewer hides, also GitHub: "when the users decides to hide the notes that also GitHub shall hide the notes" | 10-29 08:01 | [R-HIDE-001](requirements.md#r-hide-001), [R-HIDE-003](requirements.md#r-hide-003) | 29, before the first release | Planned |
| An icon at the top of the side view that hides the notes from other viewers | 10-29 08:02 | [R-HIDE-002](requirements.md#r-hide-002) | 30, before the first release | Planned |
| The text without notes for publishing: `markdown-notes strip`, "Copy without Notes" | 10-29 08:01 | [R-HIDE-004](requirements.md#r-hide-004) | 31 | Planned |
| Checks of the footnotes and "Renumber Footnotes" | 10-29 08:01 | [R-FOOT-004](requirements.md#r-foot-004), [R-FOOT-005](requirements.md#r-foot-005) | 34 | Planned |
| "Make Footnote": an accepted note becomes a standard footnote | 10-29 08:01 | [R-FOOT-006](requirements.md#r-foot-006) | 35 | Planned |
| Visual editing of the rendered Markdown in the side view, as in the Markdown Editor of VS Code | 10-28 | [R-SIDE-004](requirements.md#r-side-004) | 14, not started | Planned |
| A metadata format for the sources: "we need to find a suitable bibliography metadata definition, as we have with the note tags" | 10-29 18:55 | [R-EDIT-008](requirements.md#r-edit-008) | 45 | Planned |
| A render hint in the comment of the format, with a link to an instruction file of the style: "we use PHT style", "for now we only support this APA 7" | 10-29 19:18 | [R-EDIT-008](requirements.md#r-edit-008), [R-NOTE-007](requirements.md#r-note-007) | 45 | Planned |
| "/research" adds a (RESEARCH) source, which instructs AI agents to find a suitable source for the argument before it; the comment of the format explains to an agent what to do with it | 10-29 18:33-18:39 | [R-EDIT-008](requirements.md#r-edit-008), [R-NOTE-007](requirements.md#r-note-007) | 45 | Planned |
| "/source" only lists the existing sources of the document and inserts one | 10-29 18:33, 18:37 | [R-EDIT-008](requirements.md#r-edit-008) | 45 | Planned |

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
   the first release and the npm package: these need Hannes.
3. Step 45: the citations and sources in the style of the PHT (APA 7), the
   render hint, and the slash commands `/research` and `/source`, after the
   answer of Hannes on the form of the citations.
4. Steps 31, 34 and 35: the text without notes, the checks of the
   footnotes, "Renumber Footnotes" and "Make Footnote".
5. Step 14: the visual editing in the side view.

---

© 2026 Hannes Stauss (scalarion@nimblescape.com) ·
[MIT License](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/LICENSE).
