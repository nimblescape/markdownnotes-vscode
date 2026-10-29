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

Of 62 requested features, 45 are built, among them the clean editing view
([decision 27](requirements.md#decisions)), which fixes the bug of the line
breaks and the cursor next to the hidden markers in the text editor. 8
features are planned but not built: the features of the section
[Planned features](#planned-features). The npm package with the first release
needs Hannes. 8 requests were replaced or dropped by later decisions of
Hannes; each row names the decision.

The main gaps are the visual editing in the side view, the hidden form of the
notes and the standard footnotes in the side view.

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
[a508cdf](https://github.com/nimblescape/nimblescape-markdown-notes/commit/a508cdf)).

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
| Which thread belongs to which highlight: first a funnel, then the view aligned to the text with a line: "only the selected one has the connection" | 10-28 11:38, 19:50 | [R-SIDE-007](requirements.md#r-side-007) | Replaced | By [decision 25](requirements.md#decisions) (10-29 09:06): a list that scrolls freely |
| The view scrolls on its own and smoothly: "cannot be scrolled individually to find a note", "laggy" | 10-29 09:03 | [R-SIDE-007](requirements.md#r-side-007) | Built | The list follows only a click or a move of the cursor into a highlight |
| A click on a thread selects it in the view: "when selecting a note in the sideview, it gets not select in the sideview" | 10-29 16:30 | [R-SIDE-007](requirements.md#r-side-007) | Built | A bug of the clean editing view: the view got no new state after the click |
| The icon of the Markdown preview on the button "Preview" of the editors: "the side view shows a wrong one" | 10-29 16:32 | [R-SIDE-002](requirements.md#r-side-002) | Built | The codicon "preview" of the mode "Markdown Preview" in place of "open-preview" (to the side); all icons of the view as VS Code 1.144 draws them |

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
| Closing the side view hides the highlights | 10-28 20:31 | [R-GEN-011](requirements.md#r-gen-011) | Replaced | By [decision 28](requirements.md#decisions) (10-29 16:33): the highlights do not depend on the side view |
| "Show Highlights" only shows the highlights: "it shall not open the side view but only show the highlights. when a highlight is clicked, then the side view shall open" | 10-29 16:33 | [R-GEN-011](requirements.md#r-gen-011) | Built | [Decision 28](requirements.md#decisions), step 39 of the plan |
| A click on a highlight selects its note and opens the side view; a click outside deselects it | 10-28, 20:32 | [R-SIDE-007](requirements.md#r-side-007) | Built | The selected highlight is strong, with a frame |
| A note only for selected text: "there shall be no way to add a note without highlighting text" | 10-28 20:25 | [R-EDIT-003](requirements.md#r-edit-003) | Built | |
| "Add Note" at the selected text: the light bulb (Ctrl+.), Shift+Alt+N (Cmd+K N on macOS), the context menu | 10-29 07:47 | [R-EDIT-006](requirements.md#r-edit-006) | Built | |
| A hover with color icons over the selected text | 10-28 20:27 | [R-EDIT-006](requirements.md#r-edit-006) | Replaced | By the light bulb above (10-29 07:47) |
| Warnings where GitHub shows a note differently | 10-28 | [R-TEXT-008](requirements.md#r-text-008) | Built | |
| Comment boxes as in GitHub pull requests, the Comments view | 10-28 | [R-TEXT-001](requirements.md#r-text-001) | Dropped | "we completely drop the inline view" (10-28 19:58) |
| Colored numbers in the left margin | 10-28 14:51 | [R-TEXT-006](requirements.md#r-text-006) | Dropped | "drop all colored icons on the left" (10-28 20:01) |
| Markdown highlighting inside a note, dimming after the cursor | 10-28 | [R-TEXT-004](requirements.md#r-text-004) | Dropped | The text editor never shows a note |

## Markdown preview and the modes of VS Code

The preview shows the highlights, selects a note on a click, and adds a note
to selected text. A line from a
highlight in the preview to its note is not possible: the preview tells an
extension no place of its text, and Hannes chose the list
([decision 25](requirements.md#decisions)).

| Request | Asked | Spec | State | Detail |
| --- | --- | --- | --- | --- |
| The highlights in the preview, faint, strong under the pointer | 10-28 16:36, 20:00 | [R-PREV-001](requirements.md#r-prev-001) | Built | |
| A click on a highlight selects its note in the side view and opens the view; a click outside deselects it | 10-28 | [R-PREV-003](requirements.md#r-prev-003) | Built | |
| "Add Note" for selected text in the Markdown preview: "notes cannot be added in the preview view, but this should be possible as well" | 10-29 16:38 | [R-PREV-008](requirements.md#r-prev-008) | Built | A button "Add Note" above the selected text, in the preview to the side and in the mode "Markdown Preview" |
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

## Planned features

Eight features are in the specification and the plan, but not built. Steps 29
and 30 must come before the first release, because they change the format
`v1.0.0`. Step 38, the clean editing view, comes before them, because the
hidden form changes the markup that the clean view leaves out.

| Request | Asked | Spec | Plan step | State |
| --- | --- | --- | --- | --- |
| The hidden form of the notes, which every viewer hides, also GitHub: "when the users decides to hide the notes that also GitHub shall hide the notes" | 10-29 08:01 | [R-HIDE-001](requirements.md#r-hide-001), [R-HIDE-003](requirements.md#r-hide-003) | 29, before the first release | Planned |
| An icon at the top of the side view that hides the notes from other viewers | 10-29 08:02 | [R-HIDE-002](requirements.md#r-hide-002) | 30, before the first release | Planned |
| The text without notes for publishing: `markdown-notes strip`, "Copy without Notes" | 10-29 08:01 | [R-HIDE-004](requirements.md#r-hide-004) | 31 | Planned |
| Standard footnotes in the side view: show, edit, delete, go to the definition | 10-29 07:48 | [R-FOOT-001](requirements.md#r-foot-001), [R-FOOT-002](requirements.md#r-foot-002) | 32 | Planned |
| "Add Footnote" at the cursor | 10-29 08:01 | [R-FOOT-003](requirements.md#r-foot-003) | 33 | Planned |
| Checks of the footnotes and "Renumber Footnotes" | 10-29 08:01 | [R-FOOT-004](requirements.md#r-foot-004), [R-FOOT-005](requirements.md#r-foot-005) | 34 | Planned |
| "Make Footnote": an accepted note becomes a standard footnote | 10-29 08:01 | [R-FOOT-006](requirements.md#r-foot-006) | 35 | Planned |
| Visual editing of the rendered Markdown in the side view, as in the Markdown Editor of VS Code | 10-28 | [R-SIDE-004](requirements.md#r-side-004) | 14, not started | Planned |

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
3. Steps 31 to 35: the text without notes, and the standard footnotes in the
   side view.
4. Step 14: the visual editing in the side view.

---

© 2026 Hannes Stauss (scalarion@nimblescape.com) ·
[MIT License](https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/LICENSE).
