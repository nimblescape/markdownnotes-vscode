// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The script of the side view "Notes" (R-SIDE-001 to R-SIDE-003), the note
// editor of the extension (src/notesView.ts). The extension sends the state
// of the view: the Markdown file, the GitHub login of the user, the selected
// thread and the threads with their answers, already rendered as HTML. The
// script shows them, and sends each action of the user to the extension,
// which writes the change into the file and sends the new state.
//
// The buttons are small icons with a tooltip, as the buttons in the title of an
// editor of VS Code; the icons are codicons of VS Code. An editor of a text
// has the tabs "Visual", the visual editor of dist/visualEditor.js, which the
// page loads before this script (R-SIDE-004), and "Markdown", which switches
// between writing and the preview. Save (or Ctrl+Enter) sends the
// text; the editor stays open with the message of the extension when the
// extension refuses the text, and closes when the extension wrote it. Escape
// cancels. The open editors keep their texts when a new state arrives, and the
// focus stays in its text field.
//
// "Show as Text" switches a thread to its text view: the whole text of the
// note, as the text editor shows the file, in the font of the text editor.
// Save writes it back, and the thread stays in its text view; Cancel drops
// the change and shows the rendered note again. "Color" opens the colors of
// the notes below the header of the thread; a click on a color gives it to
// the note.
//
// The editor of a new note shows in its title the text that the note
// highlights, the selected text of the text editor, and the colors of the
// notes, from which the user chooses the color of the note.
//
// The rendered HTML of a text can hold the HTML of the text itself. The
// policy of the page runs no script of it; the script also removes the
// elements and attributes that run code or load other pages before it shows
// the HTML, as the Markdown preview of VS Code does. A click on a link of
// the HTML sends the link to the extension, which opens it (R-SIDE-005).
//
// The answers of a thread show as a tree: each reply after the answer that it
// replies to, and the replies to a reply indented below it (R-NOTE-004). The
// button "Reply" of an answer opens an editor of a reply to it below it, and
// the button "Answer" of a thread an editor of a reply to the note.
//
// Each thread shows the color of its note, and a click on a thread, outside
// its buttons and editors, selects its note in the text editor (R-SIDE-007). The view dims the other threads while a
// thread is selected. A click on the empty part of the view, or Escape
// outside an editor, deselects the thread.
//
// The view is a list of the threads in the order of the file, which the user
// scrolls on its own. It scrolls itself only when the selected thread changes,
// for a click on a highlight or a move of the cursor into a highlight: the
// selected thread scrolls to the top of the view. A hidden view cannot scroll:
// when the selected thread changed while it was hidden, the extension sends the
// message "scroll" after it shows again. An empty part after the last thread
// lets also the last thread scroll to the top. The editor of a new note stands
// at the top of the list.
//
// The buttons, the colors, the line of a thread and the dates have tooltips,
// which the script shows itself, from the attribute data-tooltip: VS Code
// showed no tooltip of the attribute title in the view. A tooltip shows below
// its element as the hover of VS Code shows the tooltip of a button in the
// title of an editor: after half a second under the pointer, at once when the
// pointer comes from another tooltip, and when a key moves the focus to the
// element.
//
// The header of the view stays at the top while the list scrolls (R-SIDE-008):
// the name of the file, the todo filter, the colors of the notes as dots and
// "Clear Filter" in its first row, the search field in its second row. The
// view shows the threads that match each filter that is on, and always the
// selected thread. The header is built once, so that the search field keeps
// its text and the focus while the list changes; the filters stay in the state
// of the page. A todo note (R-NOTE-008) has a check box at the start of its
// header, which marks it completed or open.
//
// The standard footnotes of the file (R-FOOT-001) stand in the list as
// threads too, at the place of their first reference, in a neutral color:
// the label as the file holds it, whose tooltip gives the numbers of GitHub
// and of the Markdown preview, and the rendered text of the definition, with
// "Edit" and "Delete", as a note (R-FOOT-002). The filters of the
// todos and of the colors hide them, and the search finds their text. The
// editor of a new footnote (R-FOOT-003) names in its title the text before
// the place of its reference, which follows the cursor of the text editor.

(() => {
  'use strict';

  const vscode = acquireVsCodeApi();
  const root = document.getElementById('notes');

  /**
   * @typedef {{ author: string, date: string, authorDate: string, written: string, body: string, html: string, depth: number, parent: number | undefined }} AnswerState
   * @typedef {{ label: string, html: string, github?: number, preview?: number }} FootnoteState
   * @typedef {{ id: string, line: number, color: string, colorName: string, text: string, todo?: 'todo' | 'done', answers: AnswerState[], footnote?: FootnoteState }} ThreadState
   * @typedef {{ file: string | undefined, line: number | undefined, highlight: string | undefined, footnotePlace?: string, account: string | undefined, selected: string | undefined, threads: ThreadState[], colors: { name: string, color: string }[] }} State
   * @typedef {{ text: string, tab: 'visual' | 'write' | 'preview', preview: string | undefined, problem: string | undefined, request: number | undefined, original?: string }} Editor
   * @typedef {{ element: HTMLElement, text: () => string, focus: () => void, dispose: () => void }} VisualEditor
   */

  /** @type {State} */
  let state = { file: undefined, line: undefined, highlight: undefined, account: undefined, selected: undefined, threads: [], colors: [] };

  const svgNamespace = 'http://www.w3.org/2000/svg';

  /**
   * editors holds the open editors by their keys: `new`, `answer:<thread>:<answer>`, `reply:<thread>` for a reply to the
   * note, `reply:<thread>:<answer>` for a reply to an answer, and `text:<thread>` for the changed text of the text view
   * of a thread, with `original`, the text of the note when the change started; `edit:<thread>` for the text of a
   * standard footnote, with its text when the editor opened, and `newFootnote` for a new footnote. `<answer>` names an answer by its author
   * and its date (answerKeyOf), so that an open editor stays with its answer when an answer before it goes away.
   * @type {Map<string, Editor>}
   */
  const editors = new Map();

  /**
   * visuals holds the visual editors of the open editors in the tab "Visual" by their keys (R-SIDE-004). A visual
   * editor keeps its text, its selection and its Undo while the view shows again, so the script moves its element into
   * each new page of the view, and removes it when its editor closes or leaves the tab.
   * @type {Map<string, VisualEditor>}
   */
  const visuals = new Map();

  /**
   * visualEditor is the visual editor of the bundle dist/visualEditor.js, which the page loads before this script, or
   * undefined when the bundle did not load: the editors then show the tab "Markdown" only.
   */
  const visualEditor = window.nimblescapeVisualEditor;

  /**
   * tabOf returns the tab of a new editor: the tab that the user chose last, "Visual" at first.
   * @returns {'visual' | 'write'}
   */
  const tabOf = () => (visualEditor && vscode.getState()?.tab !== 'write' ? 'visual' : 'write');

  /**
   * forget closes an editor without showing the view again: it removes its text and its visual editor.
   * @param {string} key
   */
  const forget = (key) => {
    editors.delete(key);
    visuals.get(key)?.dispose();
    visuals.delete(key);
  };

  /** texts holds the identifiers of the threads that show their text views. @type {Set<string>} */
  const texts = new Set();

  /** palettes holds the identifiers of the threads that show their colors. @type {Set<string>} */
  const palettes = new Set();

  /** @type {string | undefined} the name of the color of the new note, or undefined for the default color. */
  let newColor;

  /** newTodo tells whether the new note is a todo, for `/todo` of the text editor (R-NOTE-008). */
  let newTodo = false;

  /**
   * newFootnoteLabel is the label of a reference without a definition while the editor of a new footnote writes its
   * definition, for the quick fix "Add Definition" (R-FOOT-004), and undefined for "Add Footnote".
   * @type {string | undefined}
   */
  let newFootnoteLabel;

  /**
   * icons are the paths of the codicons of VS Code that the buttons show (https://github.com/microsoft/vscode-codicons,
   * CC BY 4.0, version 0.0.46-24, which VS Code 1.144 shows), each drawn in a square of 16 units: "reply", "edit",
   * "trash", "comment", "check", "close", "preview" (the button of the mode "Markdown Preview" of VS Code),
   * and "go-to-file"; the buttons of the toolbar of the visual editor, from version 0.0.46-36 of the codicons, which
   * the package of the visual editor holds: "bold", "italic", "code", "link", "list-unordered", "list-ordered" and
   * "quote"; and the boxes of the todo notes, drawn for the view: an empty box for an open todo, and a box with a
   * check mark for a completed one.
   */
  const icons = {
    reply:
      'M6.35355 3.64645C6.54882 3.84171 6.54882 4.15829 6.35355 4.35355L3.70711 7H8.5C11.5376 7 14 9.46243 14 12.5C14 12.7761 13.7761 13 13.5 13C13.2239 13 13 12.7761 13 12.5C13 10.0147 10.9853 8 8.5 8H3.70711L6.35355 10.6464C6.54882 10.8417 6.54882 11.1583 6.35355 11.3536C6.15829 11.5488 5.84171 11.5488 5.64645 11.3536L2.14645 7.85355C1.95118 7.65829 1.95118 7.34171 2.14645 7.14645L5.64645 3.64645C5.84171 3.45118 6.15829 3.45118 6.35355 3.64645Z',
    edit:
      'M14.236 1.76386C13.2123 0.740172 11.5525 0.740171 10.5289 1.76386L2.65722 9.63549C2.28304 10.0097 2.01623 10.4775 1.88467 10.99L1.01571 14.3755C0.971767 14.5467 1.02148 14.7284 1.14646 14.8534C1.27144 14.9783 1.45312 15.028 1.62432 14.9841L5.00978 14.1151C5.52234 13.9836 5.99015 13.7168 6.36433 13.3426L14.236 5.47097C15.2596 4.44728 15.2596 2.78755 14.236 1.76386ZM11.236 2.47097C11.8691 1.8378 12.8957 1.8378 13.5288 2.47097C14.162 3.10413 14.162 4.1307 13.5288 4.76386L12.75 5.54269L10.4571 3.24979L11.236 2.47097ZM9.75002 3.9569L12.0429 6.24979L5.65722 12.6355C5.40969 12.883 5.10023 13.0595 4.76117 13.1465L2.19447 13.8053L2.85327 11.2386C2.9403 10.8996 3.1168 10.5901 3.36433 10.3426L9.75002 3.9569Z',
    trash:
      'M14 2H10C10 0.897 9.103 0 8 0C6.897 0 6 0.897 6 2H2C1.724 2 1.5 2.224 1.5 2.5C1.5 2.776 1.724 3 2 3H2.54L3.349 12.708C3.456 13.994 4.55 15 5.84 15H10.159C11.449 15 12.543 13.993 12.65 12.708L13.459 3H13.999C14.275 3 14.499 2.776 14.499 2.5C14.499 2.224 14.275 2 13.999 2H14ZM8 1C8.551 1 9 1.449 9 2H7C7 1.449 7.449 1 8 1ZM11.655 12.625C11.591 13.396 10.934 14 10.16 14H5.841C5.067 14 4.41 13.396 4.346 12.625L3.544 3H12.458L11.656 12.625H11.655ZM7 5.5V11.5C7 11.776 6.776 12 6.5 12C6.224 12 6 11.776 6 11.5V5.5C6 5.224 6.224 5 6.5 5C6.776 5 7 5.224 7 5.5ZM10 5.5V11.5C10 11.776 9.776 12 9.5 12C9.224 12 9 11.776 9 11.5V5.5C9 5.224 9.224 5 9.5 5C9.776 5 10 5.224 10 5.5Z',
    comment:
      'M1 4.5C1 3.11929 2.11929 2 3.5 2H12.5C13.8807 2 15 3.11929 15 4.5V9.5C15 10.8807 13.8807 12 12.5 12H8.68787L5.62533 14.6797C4.99168 15.2342 4 14.7842 4 13.9422V12H3.5C2.11929 12 1 10.8807 1 9.5V4.5ZM3.5 3C2.67157 3 2 3.67157 2 4.5V9.5C2 10.3284 2.67157 11 3.5 11H5V13.8981L8.31213 11H12.5C13.3284 11 14 10.3284 14 9.5V4.5C14 3.67157 13.3284 3 12.5 3H3.5Z',
    check:
      'M13.6572 3.13573C13.8583 2.9465 14.175 2.95614 14.3643 3.15722C14.5535 3.35831 14.5438 3.675 14.3428 3.86425L5.84277 11.8642C5.64597 12.0494 5.33756 12.0446 5.14648 11.8535L1.64648 8.35351C1.45121 8.15824 1.45121 7.84174 1.64648 7.64647C1.84174 7.45121 2.15825 7.45121 2.35351 7.64647L5.50976 10.8027L13.6572 3.13573Z',
    close:
      'M8.70701 8.00001L12.353 4.35401C12.548 4.15901 12.548 3.84201 12.353 3.64701C12.158 3.45201 11.841 3.45201 11.646 3.64701L8.00001 7.29301L4.35401 3.64701C4.15901 3.45201 3.84201 3.45201 3.64701 3.64701C3.45201 3.84201 3.45201 4.15901 3.64701 4.35401L7.29301 8.00001L3.64701 11.646C3.45201 11.841 3.45201 12.158 3.64701 12.353C3.74501 12.451 3.87301 12.499 4.00101 12.499C4.12901 12.499 4.25701 12.45 4.35501 12.353L8.00101 8.70701L11.647 12.353C11.745 12.451 11.873 12.499 12.001 12.499C12.129 12.499 12.257 12.45 12.355 12.353C12.55 12.158 12.55 11.841 12.355 11.646L8.70901 8.00001H8.70701Z',
    preview:
      'M12.5 1H3.5C2.122 1 1 2.122 1 3.5V12.5C1 13.878 2.122 15 3.5 15H12.5C13.878 15 15 13.878 15 12.5V3.5C15 2.122 13.878 1 12.5 1ZM14 12.5C14 13.327 13.327 14 12.5 14H3.5C2.673 14 2 13.327 2 12.5V3.5C2 2.673 2.673 2 3.5 2H12.5C13.327 2 14 2.673 14 3.5V12.5ZM12 3H4C3.448 3 3 3.448 3 4V6C3 6.552 3.448 7 4 7H12C12.552 7 13 6.552 13 6V4C13 3.448 12.552 3 12 3ZM12 6H4V4H12V6ZM12 8H9C8.448 8 8 8.448 8 9V12C8 12.552 8.448 13 9 13H12C12.552 13 13 12.552 13 12V9C13 8.448 12.552 8 12 8ZM12 12H9V9H12V12ZM7 8.5C7 8.776 6.776 9 6.5 9H3.5C3.224 9 3 8.776 3 8.5C3 8.224 3.224 8 3.5 8H6.5C6.776 8 7 8.224 7 8.5ZM7 10.5C7 10.776 6.776 11 6.5 11H3.5C3.224 11 3 10.776 3 10.5C3 10.224 3.224 10 3.5 10H6.5C6.776 10 7 10.224 7 10.5ZM7 12.5C7 12.776 6.776 13 6.5 13H3.5C3.224 13 3 12.776 3 12.5C3 12.224 3.224 12 3.5 12H6.5C6.776 12 7 12.224 7 12.5Z',
    source:
      'M8.58594 1.00098C8.98394 1.00098 9.36646 1.15943 9.64746 1.44043L12.5605 4.35352C12.8415 4.63552 13.001 5.01704 13.001 5.41504V13.001C13.001 14.106 12.106 15.001 11.001 15.001H5.00098C3.89599 15.001 3.00098 14.106 3.00098 13.001V6.00098H4.00098V13.001C4.00098 13.553 4.44899 14.001 5.00098 14.001H11.001C11.553 14.001 12.001 13.553 12.001 13.001V6.00098H9.50098C8.67299 6.00096 8.00098 5.32897 8.00098 4.50098V2.00098C7.99198 1.97699 7.98265 1.9527 7.97266 1.92871C7.89674 1.74704 7.78717 1.5812 7.64746 1.44238L7.20605 1.00098H8.58594ZM9 4.5C9 4.776 9.224 5 9.5 5H11.793L9 2.20703V4.5Z M4.5 0C4.63299 0 4.75952 0.0534683 4.85352 0.147461L6.85352 2.14746C6.90042 2.19336 6.93789 2.24775 6.96289 2.30859C6.98789 2.36959 7.00097 2.43498 7.00098 2.50098C7.00098 2.56698 6.98789 2.63236 6.96289 2.69336C6.93789 2.75323 6.90043 2.80956 6.85352 2.85547L4.85352 4.85547C4.75956 4.94917 4.63278 5.00195 4.5 5.00195C4.36722 5.00195 4.24044 4.94917 4.14648 4.85547C4.05248 4.76147 3.99902 4.63398 3.99902 4.50098C3.99903 4.36799 4.05249 4.24146 4.14648 4.14746L5.29297 3.00098H2.5C2.10201 3.00098 1.72045 3.15944 1.43945 3.44043C1.15846 3.72242 1.00001 4.10298 1 4.50098V5.50098C1 5.63398 0.947516 5.76147 0.853516 5.85547C0.759563 5.94817 0.632774 6.00098 0.5 6.00098C0.367225 6.00098 0.240437 5.94917 0.146484 5.85547C0.0534844 5.76147 0 5.63398 0 5.50098V4.50098C6.17892e-06 3.83799 0.263427 3.20239 0.732422 2.7334C1.20142 2.26441 1.83701 2.00098 2.5 2.00098H5.29297L4.14648 0.855469C4.05248 0.761469 3.99902 0.633977 3.99902 0.500977C3.99903 0.367985 4.05249 0.241455 4.14648 0.147461C4.24048 0.0534683 4.36701 0 4.5 0Z',
    bold:
      'M4 3.1C4 2.5 4.5 2 5.1 2H8.1C10.2 2 11.5 3.4 11.5 5.4C11.5 6.3 11.2 7.4 10.8 8C11.6 8.6 12.2 9.2 12.2 10.5C12.2 13.2 10.1 14 8.6 14H5.1C4.5 14 4 13.5 4 12.9V3.1ZM6 9V12H8.4C9.1 12 9.9 11.5 9.9 10.5C9.9 9.5 9.1 9 8.4 9H6ZM6 7H8.2C9.1 7 9.7 6.3 9.7 5.5C9.7 4.7 9.1 4 8.3 4H6V7Z',
    italic:
      'M13 2.00014H7C6.72386 2.00014 6.5 2.22399 6.5 2.50014C6.5 2.77628 6.72386 3.00014 7 3.00014H9.47388L5.65575 13L3 13.0001C2.72386 13.0001 2.5 13.224 2.5 13.5001C2.5 13.7763 2.72386 14.0001 3 14.0001H5.98833C5.99606 14.0003 6.00378 14.0003 6.01148 14.0001H9C9.27614 14.0001 9.5 13.7763 9.5 13.5001C9.5 13.224 9.27614 13.0001 9 13.0001L6.72617 13L10.5443 3.00014H13C13.2761 3.00014 13.5 2.77628 13.5 2.50014C13.5 2.22399 13.2761 2.00014 13 2.00014Z',
    code:
      'M9.80307 3.0431C10.0554 3.15525 10.1691 3.45073 10.0569 3.70307L6.05691 12.7031C5.94475 12.9554 5.64927 13.0691 5.39693 12.9569C5.14459 12.8448 5.03094 12.5493 5.14309 12.2969L9.14309 3.29693C9.25525 3.04459 9.55073 2.93094 9.80307 3.0431ZM4.33218 5.3763C4.53857 5.55976 4.55716 5.87579 4.3737 6.08218L2.66898 8L4.3737 9.91782C4.55716 10.1242 4.53857 10.4402 4.33218 10.6237C4.12579 10.8072 3.80975 10.7886 3.6263 10.5822L1.6263 8.33218C1.4579 8.14274 1.4579 7.85726 1.6263 7.66782L3.6263 5.41782C3.80975 5.21143 4.12579 5.19284 4.33218 5.3763ZM11.6678 5.3763C11.8742 5.19284 12.1902 5.21143 12.3737 5.41782L14.3737 7.66782C14.5421 7.85726 14.5421 8.14274 14.3737 8.33218L12.3737 10.5822C12.1902 10.7886 11.8742 10.8072 11.6678 10.6237C11.4614 10.4402 11.4428 10.1242 11.6263 9.91782L13.331 8L11.6263 6.08218C11.4428 5.87579 11.4614 5.55976 11.6678 5.3763Z',
    link:
      'M9.49999 4H10.5C12.433 4 14 5.567 14 7.5C14 9.36856 12.5357 10.8951 10.6941 10.9948L10.5023 11L9.5023 11.0046C9.22616 11.0059 9.00127 10.783 8.99999 10.5069C8.99888 10.2614 9.17481 10.0565 9.40787 10.0131L9.4977 10.0046L10.5 10C11.8807 10 13 8.88071 13 7.5C13 6.17452 11.9685 5.08996 10.6644 5.00532L10.5 5H9.49999C9.22386 5 8.99999 4.77614 8.99999 4.5C8.99999 4.25454 9.17687 4.05039 9.41012 4.00806L9.49999 4H10.5H9.49999ZM5.5 4H6.5C6.77614 4 7 4.22386 7 4.5C7 4.74546 6.82312 4.94961 6.58988 4.99194L6.5 5H5.5C4.11929 5 3 6.11929 3 7.5C3 8.82548 4.03154 9.91004 5.33562 9.99468L5.5 10H6.5C6.77614 10 7 10.2239 7 10.5C7 10.7455 6.82312 10.9496 6.58988 10.9919L6.5 11H5.5C3.567 11 2 9.433 2 7.5C2 5.63144 3.46428 4.10487 5.30796 4.00518L5.5 4H6.5H5.5ZM5.50023 7L10.5002 7.0023C10.7764 7.00242 11.0001 7.22638 11 7.50252C10.9999 7.74798 10.8229 7.95205 10.5897 7.99428L10.4998 8.0023L5.49977 8C5.22363 7.99987 4.99987 7.77591 5 7.49977C5.00011 7.25431 5.17708 7.05024 5.41035 7.00801L5.50023 7Z',
    'list-unordered':
      'M2 4.5C2.55228 4.5 3 4.05228 3 3.5C3 2.94772 2.55228 2.5 2 2.5C1.44772 2.5 1 2.94772 1 3.5C1 4.05228 1.44772 4.5 2 4.5ZM2 9C2.55228 9 3 8.55228 3 8C3 7.44772 2.55228 7 2 7C1.44772 7 1 7.44772 1 8C1 8.55228 1.44772 9 2 9ZM3 12.5C3 13.0523 2.55228 13.5 2 13.5C1.44772 13.5 1 13.0523 1 12.5C1 11.9477 1.44772 11.5 2 11.5C2.55228 11.5 3 11.9477 3 12.5ZM5.5 3C5.22386 3 5 3.22386 5 3.5C5 3.77614 5.22386 4 5.5 4H14.5C14.7761 4 15 3.77614 15 3.5C15 3.22386 14.7761 3 14.5 3H5.5ZM5 8C5 7.72386 5.22386 7.5 5.5 7.5H14.5C14.7761 7.5 15 7.72386 15 8C15 8.27614 14.7761 8.5 14.5 8.5H5.5C5.22386 8.5 5 8.27614 5 8ZM5.5 12C5.22386 12 5 12.2239 5 12.5C5 12.7761 5.22386 13 5.5 13H14.5C14.7761 13 15 12.7761 15 12.5C15 12.2239 14.7761 12 14.5 12H5.5Z',
    'list-ordered':
      'M3.68423 1.01091C3.87729 1.05479 4.01368 1.2207 4.01368 1.41166V4.70581C4.01368 4.93322 3.82219 5.11757 3.58596 5.11757C3.34974 5.11757 3.15825 4.93322 3.15825 4.70581V2.57963C2.97169 2.73831 2.75056 2.89181 2.49409 3.01526C2.28281 3.11697 2.02589 3.03452 1.92025 2.83112C1.81461 2.62771 1.90025 2.38037 2.11153 2.27867C2.46535 2.10836 2.74051 1.84713 2.93118 1.61767C3.02531 1.50441 3.09555 1.40286 3.1415 1.33097C3.1627 1.2978 3.18339 1.26423 3.20219 1.22973C3.29453 1.06158 3.48853 0.966435 3.68423 1.01091ZM2.15471 7.05586C1.98767 6.89507 1.98765 6.63435 2.15467 6.47354L2.15572 6.47253L2.15693 6.47137L2.15988 6.46859L2.16776 6.46129C2.17391 6.45568 2.18184 6.44859 2.19152 6.44025C2.21087 6.42357 2.23731 6.40176 2.27057 6.3766C2.33688 6.32642 2.43152 6.26193 2.55214 6.19802C2.79299 6.07042 3.1454 5.94109 3.58393 5.94111L3.59112 5.94117C3.91125 5.94637 4.25871 6.0263 4.53792 6.22535C4.83289 6.43563 5.02344 6.76107 5.02344 7.17649C5.02344 7.62757 4.81618 7.94311 4.53538 8.16839C4.32073 8.34059 4.04529 8.47067 3.82121 8.5765C3.78525 8.59348 3.7506 8.60985 3.7177 8.62568C3.45144 8.75385 3.24954 8.86678 3.10777 9.01691C3.05092 9.07712 2.99998 9.14746 2.96119 9.23535H4.59572C4.83194 9.23535 5.02344 9.4197 5.02344 9.64712C5.02344 9.87453 4.83146 10.0589 4.59524 10.0589H2.45713C2.22091 10.0589 2.02941 9.87453 2.02941 9.64712C2.02941 9.13717 2.19981 8.75415 2.4748 8.46294C2.73402 8.18843 3.06676 8.01827 3.33515 7.88909C3.37811 7.86841 3.41971 7.84859 3.45892 7.8299C3.69012 7.71973 3.85827 7.6396 3.98775 7.53573C4.10794 7.4393 4.168 7.34307 4.168 7.17649C4.168 7.02774 4.11074 6.94556 4.02884 6.88718C3.93179 6.81799 3.77468 6.76838 3.58027 6.76465C3.3214 6.76534 3.1117 6.84157 2.9646 6.91951C2.89091 6.95855 2.83494 6.99702 2.7992 7.02406C2.78144 7.0375 2.76901 7.04787 2.76223 7.05372L2.7566 7.05867C2.58935 7.21663 2.32076 7.2157 2.15471 7.05586ZM3.09366 12.9412C3.09366 12.7137 3.28516 12.5294 3.52138 12.5294C3.81461 12.5294 3.97666 12.4498 4.05829 12.3786C4.13892 12.3083 4.17203 12.221 4.1686 12.1331C4.1624 11.9737 4.00959 11.7059 3.52138 11.7059C3.16851 11.7059 2.98575 11.7896 2.9032 11.8426C2.85995 11.8703 2.8367 11.8944 2.82745 11.9051L2.82395 11.9093C2.82756 11.9032 2.83103 11.8969 2.83435 11.8906L2.83348 11.8922L2.83236 11.8943L2.83029 11.8981L2.82682 11.9042C2.82481 11.9077 2.82222 11.9116 2.82222 11.9116L2.82395 11.9093C2.71246 12.0985 2.46527 12.1726 2.2608 12.0742C2.04952 11.9725 1.96388 11.7251 2.06952 11.5217L2.07013 11.5205L2.07077 11.5193L2.07213 11.5168L2.07516 11.5112L2.08257 11.4982C2.08813 11.4888 2.09495 11.4778 2.10316 11.4655C2.11958 11.4409 2.14161 11.411 2.17029 11.3779C2.22786 11.3114 2.31154 11.2325 2.42869 11.1574C2.66693 11.0045 3.01882 10.8823 3.52138 10.8823C4.40187 10.8823 4.99757 11.438 5.02344 12.1022C5.03523 12.4048 4.92247 12.7081 4.68433 12.9412C4.92247 13.1743 5.03523 13.4775 5.02344 13.7801C4.99757 14.4443 4.40187 15 3.52138 15C3.01882 15 2.66693 14.8779 2.42869 14.725C2.31154 14.6498 2.22786 14.5709 2.17029 14.5044C2.14161 14.4713 2.11958 14.4414 2.10316 14.4168C2.09495 14.4045 2.08813 14.3935 2.08257 14.3841L2.07516 14.3711L2.07213 14.3655L2.07077 14.363L2.07013 14.3618L2.06952 14.3606C1.96388 14.1572 2.04952 13.9099 2.2608 13.8082C2.46527 13.7098 2.71246 13.7838 2.82395 13.973L2.82745 13.9772C2.8367 13.9879 2.85995 14.012 2.9032 14.0397C2.98575 14.0927 3.16851 14.1765 3.52138 14.1765C4.00959 14.1765 4.1624 13.9086 4.1686 13.7493C4.17203 13.6613 4.13892 13.574 4.05829 13.5037C3.97666 13.4325 3.81461 13.3529 3.52138 13.3529C3.28516 13.3529 3.09366 13.1686 3.09366 12.9412ZM7.5 3C7.22386 3 7 3.22386 7 3.5C7 3.77614 7.22386 4 7.5 4H13.5C13.7761 4 14 3.77614 14 3.5C14 3.22386 13.7761 3 13.5 3H7.5ZM7.5 7C7.22386 7 7 7.22386 7 7.5C7 7.77614 7.22386 8 7.5 8H13.5C13.7761 8 14 7.77614 14 7.5C14 7.22386 13.7761 7 13.5 7H7.5ZM7.5 11C7.22386 11 7 11.2239 7 11.5C7 11.7761 7.22386 12 7.5 12H13.5C13.7761 12 14 11.7761 14 11.5C14 11.2239 13.7761 11 13.5 11H7.5Z',
    quote:
      'M5.99902 2.99902C6.55101 2.99904 6.99902 3.44703 6.99902 3.99902V4.99902C6.99902 7.59102 6.47153 9.73354 4.35254 11.8525C4.15754 12.0475 3.84148 12.0475 3.64648 11.8525C3.45148 11.6575 3.45148 11.3415 3.64648 11.1465C5.03348 9.76049 5.65377 8.38594 5.88477 6.79395C5.61781 6.9259 5.31794 7 5 7H4C3.448 7 3 6.552 3 6V4C3.00001 3.44801 3.44801 3 4 3H6L5.99902 2.99902ZM11.999 2.99902C12.551 2.99904 12.999 3.44703 12.999 3.99902V4.99902C12.999 7.59102 12.4715 9.73354 10.3525 11.8525C10.1575 12.0475 9.84148 12.0475 9.64648 11.8525C9.45148 11.6575 9.45148 11.3415 9.64648 11.1465C11.0335 9.76049 11.6538 8.38594 11.8848 6.79395C11.6178 6.9259 11.3179 7 11 7H10C9.448 7 9 6.552 9 6V4C9.00001 3.44801 9.44801 3 10 3H12L11.999 2.99902Z',
  };

  const box = 'M4 2H12C13.1046 2 14 2.89543 14 4V12C14 13.1046 13.1046 14 12 14H4C2.89543 14 2 13.1046 2 12V4C2 2.89543 2.89543 2 4 2ZM4 3C3.44772 3 3 3.44772 3 4V12C3 12.5523 3.44772 13 4 13H12C12.5523 13 13 12.5523 13 12V4C13 3.44772 12.5523 3 12 3H4Z';
  icons.todoOpen = box;
  icons.todoDone = `${box}M11.3536 5.64645C11.5488 5.84171 11.5488 6.15829 11.3536 6.35355L7.35355 10.3536C7.15829 10.5488 6.84171 10.5488 6.64645 10.3536L4.64645 8.35355C4.45118 8.15829 4.45118 7.84171 4.64645 7.64645C4.84171 7.45118 5.15829 7.45118 5.35355 7.64645L7 9.29289L10.6464 5.64645C10.8417 5.45118 11.1583 5.45118 11.3536 5.64645Z`;

  /** requests holds the keys of the editors whose texts the extension handles, by the number of the request. @type {Map<number, string>} */
  const requests = new Map();

  let count = 0;

  /** removedTags are the elements of a rendered text that the script removes with their content. */
  const removedTags = new Set([
    ...['SCRIPT', 'STYLE', 'IFRAME', 'FRAME', 'FRAMESET', 'OBJECT', 'EMBED', 'APPLET', 'NOSCRIPT', 'TEMPLATE'],
    ...['FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'META', 'LINK', 'BASE'],
  ]);

  /** linkAttributes are the attributes that hold an address. */
  const linkAttributes = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'srcset', 'poster']);

  /**
   * safeHtml returns the content of a rendered text without the elements that run code or load another page, without
   * the attributes of events and of styles, as GitHub shows a note, and without addresses of the schemes javascript:
   * and vbscript:. The policy of the page allows no style attribute either.
   * @param {string} html
   */
  const safeHtml = (html) => {
    const template = document.createElement('template');
    template.innerHTML = html;
    for (const node of [...template.content.querySelectorAll('*')]) {
      if (removedTags.has(node.tagName.toUpperCase())) {
        node.remove();
        continue;
      }
      for (const attribute of [...node.attributes]) {
        const name = attribute.name.toLowerCase();
        const address = attribute.value.replace(/[\s\u0000-\u001f]/g, '').toLowerCase();
        if (name.startsWith('on') || name === 'srcdoc' || name === 'style' || (linkAttributes.has(name) && /(^|,)(javascript|vbscript):/.test(address))) {
          node.removeAttribute(attribute.name);
        }
      }
    }
    return template.content;
  };

  /**
   * element creates an element with a class, a text and attributes.
   * @param {string} tag
   * @param {string} [className]
   * @param {string} [text]
   * @param {Record<string, string>} [attributes]
   */
  const element = (tag, className, text, attributes = {}) => {
    const created = document.createElement(tag);
    if (className) {
      created.className = className;
    }
    if (text !== undefined) {
      created.textContent = text;
    }
    for (const [name, value] of Object.entries(attributes)) {
      created.setAttribute(name, value);
    }
    return created;
  };

  /**
   * button creates a button that runs an action.
   * @param {string} label
   * @param {string} className
   * @param {() => void} action
   * @param {Record<string, string>} [attributes]
   */
  const button = (label, className, action, attributes = {}) => {
    const created = element('button', className, label, { type: 'button', ...attributes });
    created.addEventListener('click', action);
    return created;
  };

  /**
   * iconButton creates a button with an icon and a tooltip, as the buttons in the title of an editor of VS Code.
   * @param {keyof typeof icons} icon
   * @param {string} label - The tooltip, which a screen reader reads too.
   * @param {() => void} action
   * @param {Record<string, string>} [attributes]
   */
  const iconButton = (icon, label, action, attributes = {}) => {
    const created = button('', 'icon', action, { 'data-tooltip': label, 'aria-label': label, ...attributes });
    const svg = document.createElementNS(svgNamespace, 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS(svgNamespace, 'path');
    path.setAttribute('d', icons[icon]);
    path.setAttribute('fill-rule', 'evenodd');
    svg.append(path);
    created.append(svg);
    return created;
  };

  /**
   * send sends the text of an editor to the extension.
   * @param {string} key
   * @param {(request: number, text: string) => object} message
   */
  const send = (key, message) => {
    const editor = editors.get(key);
    if (!editor || editor.request !== undefined) {
      return;
    }
    const request = ++count;
    editor.request = request;
    editor.problem = undefined;
    requests.set(request, key);
    vscode.postMessage(message(request, editor.text));
    show();
  };

  /**
   * open opens an editor with a text.
   * @param {string} key
   * @param {string} text
   * @param {string} [original] - The text of the file that the editor started from, which a save of the editor names.
   */
  const open = (key, text, original) => {
    if (!editors.has(key)) {
      editors.set(key, { text, tab: tabOf(), preview: undefined, problem: undefined, request: undefined, ...(original === undefined ? {} : { original }) });
    }
    show(key);
  };

  /**
   * close closes an editor.
   * @param {string} key
   */
  const close = (key) => {
    forget(key);
    if (key === 'new') {
      newColor = undefined;
      newTodo = false;
    } else if (key === 'newFootnote') {
      newFootnoteLabel = undefined;
      // The extension stops following the place of the reference for the title of the editor.
      vscode.postMessage({ type: 'footnoteClosed' });
    }
    show();
  };

  /**
   * tabsOf creates the tabs of an editor: "Visual", the visual editor of the rendered text, and "Markdown", the
   * Markdown text with its preview (R-SIDE-004). A change of the tab keeps the text, and the next editor opens in the
   * tab that the user chose.
   * @param {string} key
   * @param {Editor} editor
   */
  const tabsOf = (key, editor) => {
    const tabs = element('div', 'tabs', undefined, { role: 'tablist', 'aria-label': 'Editor' });
    for (const [tab, name, tooltip] of [
      ['visual', 'Visual', 'Edit the rendered text'],
      ['write', 'Markdown', 'Edit the Markdown text'],
    ]) {
      const chosen = tab === 'visual' ? editor.tab === 'visual' : editor.tab !== 'visual';
      const created = button(name, chosen ? 'tab chosen' : 'tab', () => {
        if (chosen) {
          return;
        }
        if (editor.tab === 'visual') {
          editor.text = visuals.get(key)?.text() ?? editor.text;
          visuals.get(key)?.dispose();
          visuals.delete(key);
        }
        editor.tab = tab;
        vscode.setState({ ...(vscode.getState() ?? {}), tab });
        show(key);
      }, { role: 'tab', 'aria-selected': String(chosen), 'data-tooltip': tooltip });
      tabs.append(created);
    }
    return tabs;
  };

  /**
   * editorOf creates the elements of an open editor.
   * @param {string} key
   * @param {string} label - The name of the text field for a screen reader.
   * @param {string} saveLabel
   * @param {(request: number, text: string) => object} message - The message of the text.
   */
  const editorOf = (key, label, saveLabel, message) => {
    const editor = editors.get(key);
    const box = element('div', 'editor', undefined, { 'data-key': key });
    if (visualEditor) {
      box.append(tabsOf(key, editor));
    }
    if (editor.tab === 'visual') {
      let visual = visuals.get(key);
      if (!visual) {
        visual = visualEditor.create(editor.text, {
          label,
          changed: (text) => {
            editor.text = text;
          },
          save: () => send(key, message),
          cancel: () => close(key),
          open: (href) => vscode.postMessage({ type: 'openLink', href }),
          button: (icon, tooltip, action) => iconButton(icon, tooltip, action),
        });
        visuals.set(key, visual);
      }
      box.append(visual.element);
    } else if (editor.tab === 'write') {
      const field = element('textarea', 'text', undefined, { 'aria-label': label, rows: '5', placeholder: 'The text, in Markdown' });
      field.value = editor.text;
      field.addEventListener('input', () => {
        editor.text = field.value;
      });
      field.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          send(key, message);
        } else if (event.key === 'Escape') {
          event.preventDefault();
          close(key);
        }
      });
      box.append(field);
    } else {
      const preview = element('div', 'preview markdown-body', editor.preview === undefined ? 'Rendering…' : undefined);
      if (editor.preview !== undefined) {
        preview.replaceChildren(editor.text.trim() === '' ? element('p', 'hint', 'Nothing to preview.') : safeHtml(editor.preview));
      }
      box.append(preview);
    }
    if (editor.problem) {
      box.append(element('p', 'problem', editor.problem, { role: 'alert' }));
    }
    const buttons = element('div', 'buttons');
    const pending = editor.request !== undefined ? { disabled: '' } : {};
    const writing = editor.tab === 'write';
    if (editor.tab !== 'visual') {
      buttons.append(
        iconButton(writing ? 'preview' : 'edit', writing ? 'Preview' : 'Write', () => {
          editor.tab = writing ? 'preview' : 'write';
          if (writing) {
            editor.preview = undefined;
            const request = ++count;
            requests.set(request, key);
            vscode.postMessage({ type: 'render', request, text: editor.text });
          }
          show(writing ? undefined : key);
        }),
      );
    }
    buttons.append(
      element('span', 'spacer'),
      iconButton('check', `${saveLabel} (Ctrl+Enter)`, () => send(key, message), pending),
      iconButton('close', 'Cancel (Escape)', () => close(key), pending),
    );
    box.append(buttons);
    return box;
  };

  /**
   * textViewOf creates the text view of a thread: the whole text of its note in the font of the text editor, with Save
   * and Cancel. A changed text stays in the editor `text:<thread>` until Save or Cancel.
   * @param {ThreadState} thread
   */
  const textViewOf = (thread) => {
    const key = `text:${thread.id}`;
    const box = element('div', 'editor text-view', undefined, { 'data-key': key });
    const editor = editors.get(key);
    const field = element('textarea', 'text source', undefined, { 'aria-label': 'The whole text of the note, as the file holds it', spellcheck: 'false', wrap: 'off' });
    field.value = editor?.text ?? thread.text;
    field.rows = Math.min(Math.max(field.value.split('\n').length + 1, 4), 30);
    /** @param {number} request @param {string} text */
    const message = (request, text) => ({ type: 'saveText', request, id: thread.id, text, original: editors.get(key)?.original ?? thread.text });
    /** cancel drops the change and shows the rendered note again. */
    const cancel = () => {
      texts.delete(thread.id);
      close(key);
    };
    field.addEventListener('input', () => {
      const changed = editors.get(key);
      if (changed) {
        changed.text = field.value;
      } else {
        editors.set(key, { text: field.value, tab: 'write', preview: undefined, problem: undefined, request: undefined, original: thread.text });
      }
    });
    field.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        if (editors.has(key)) {
          send(key, message);
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      }
    });
    box.append(field);
    if (editor?.problem) {
      box.append(element('p', 'problem', editor.problem, { role: 'alert' }));
    }
    const buttons = element('div', 'buttons');
    const pending = editor?.request !== undefined ? { disabled: '' } : {};
    buttons.append(
      element('span', 'spacer'),
      iconButton('check', 'Save (Ctrl+Enter)', () => (editors.has(key) ? send(key, message) : undefined), pending),
      iconButton('close', 'Cancel (Escape)', cancel, pending),
    );
    box.append(buttons);
    return box;
  };

  /**
   * paletteOf creates the colors of the notes: a button for each color, which gives it to the note.
   * @param {string | undefined} chosen - The name of the color of the note.
   * @param {(color: string | undefined) => void} choose - Gives the note a color: its name, or undefined for the default color.
   */
  const paletteOf = (chosen, choose) => {
    const palette = element('div', 'palette', undefined, { role: 'group', 'aria-label': 'Colors of the note' });
    for (const { name, color } of state.colors) {
      const swatch = button('', 'swatch', () => choose(name === state.colors[0]?.name ? undefined : name), { 'data-tooltip': name, 'aria-label': name, 'aria-pressed': String(name === chosen) });
      swatch.style.setProperty('--swatch', color);
      palette.append(swatch);
    }
    return palette;
  };

  /**
   * answerKeyOf returns the name of an answer of a thread in the keys of its editors: its author, its date as the file
   * holds it, and its number among the earlier answers with both.
   * @param {ThreadState} thread
   * @param {number} index
   */
  const answerKeyOf = (thread, index) => {
    const answer = thread.answers[index];
    const earlier = thread.answers.slice(0, index).filter((other) => other.author === answer.author && other.written === answer.written).length;
    return encodeURIComponent(`${answer.author} ${answer.written} ${earlier}`);
  };

  /**
   * answerRefOf returns the answer of a thread for a message of a change: its index, and its author, its date and its
   * body as the file holds them, so that the extension changes it only while the file still has this answer at this
   * index.
   * @param {ThreadState} thread
   * @param {number} index
   */
  const answerRefOf = (thread, index) => {
    const answer = thread.answers[index];
    return { index, author: answer.author, date: answer.written, body: answer.body };
  };

  /**
   * answerOf creates the elements of an answer of a thread.
   * @param {ThreadState} thread
   * @param {AnswerState} answer
   * @param {number} index
   */
  const answerOf = (thread, answer, index) => {
    const key = `answer:${thread.id}:${answerKeyOf(thread, index)}`;
    const replyKey = `reply:${thread.id}:${answerKeyOf(thread, index)}`;
    const article = element('article', 'answer');
    // The first answer and the replies to it stand at the left edge, and each further level of replies is indented.
    article.style.setProperty('--depth', String(Math.max(answer.depth - 1, 0)));
    if (answer.depth > 1) {
      article.classList.add('reply');
    }
    const header = element('div', 'answer-header');
    header.append(element('span', 'author', answer.author || 'Unknown author'));
    if (answer.date) {
      header.append(element('span', 'date', answer.date, { 'data-tooltip': answer.authorDate }));
    }
    if (!editors.has(key)) {
      const actions = element('span', 'actions');
      const author = answer.author || 'an unknown author';
      actions.append(
        iconButton('reply', 'Reply', () => open(replyKey, ''), { 'aria-label': `Reply to the answer of ${author}` }),
        iconButton('edit', 'Edit', () => open(key, answer.body), { 'aria-label': `Edit the answer of ${author}` }),
        iconButton('trash', 'Delete', () => vscode.postMessage({ type: 'deleteAnswer', id: thread.id, answer: answerRefOf(thread, index) }), { 'aria-label': `Delete the answer of ${author}` }),
      );
      header.append(actions);
    }
    article.append(header);
    if (editors.has(key)) {
      article.append(editorOf(key, 'Text of the answer, in Markdown', 'Save', (request, text) => ({ type: 'save', request, id: thread.id, answer: answerRefOf(thread, index), text })));
    } else {
      const body = element('div', 'answer-body markdown-body');
      body.replaceChildren(safeHtml(answer.html));
      article.append(body);
    }
    if (editors.has(replyKey)) {
      article.append(
        editorOf(replyKey, `Text of the reply to ${answer.author || 'an unknown author'}, in Markdown`, 'Reply', (request, text) => ({ type: 'answer', request, id: thread.id, text, parent: answerRefOf(thread, index) })),
      );
    }
    return article;
  };

  /**
   * sectionOf creates the box of a thread, which a click outside its buttons, links and editors selects: the focus stays
   * in the view, the thread shows its frame at once, and the state of the extension follows.
   * @param {ThreadState} thread
   * @param {string} className
   * @param {string} label - The name of the box for a screen reader.
   */
  const sectionOf = (thread, className, label) => {
    const section = element('section', `${className}${thread.id === state.selected ? ' selected' : ''}`, undefined, { 'data-id': thread.id, 'aria-label': label });
    section.style.setProperty('--note-color', thread.color);
    section.addEventListener('click', (event) => {
      if (!(event.target instanceof Element) || !event.target.closest('button, a, textarea, .editor')) {
        if (state.selected !== thread.id) {
          state.selected = thread.id;
          show();
        }
        vscode.postMessage({ type: 'reveal', id: thread.id, focus: false });
      }
    });
    return section;
  };

  /**
   * labelTooltipOf returns the tooltip of the label of a standard footnote: the numbers that GitHub and the Markdown
   * preview show for it, or that neither shows a footnote without a reference (R-FOOT-001).
   * @param {FootnoteState} footnote
   */
  const labelTooltipOf = (footnote) => {
    if (footnote.github === undefined) {
      return 'No reference in the text: GitHub and the Markdown preview do not show this footnote';
    }
    if (footnote.github === footnote.preview) {
      return String(footnote.github) === footnote.label ? `Footnote ${footnote.label} on GitHub and in the Markdown preview` : `GitHub and the Markdown preview show it as footnote ${footnote.github}`;
    }
    return `GitHub shows it as footnote ${footnote.github}, because GitHub counts the notes too; the Markdown preview shows it as footnote ${footnote.preview}`;
  };

  /**
   * footnoteOf creates the elements of the thread of a standard footnote (R-FOOT-001, R-FOOT-002): its label, the
   * line of its first reference, "Edit" and "Delete", and its rendered text or its editor.
   * @param {ThreadState} thread
   * @param {FootnoteState} footnote
   */
  const footnoteOf = (thread, footnote) => {
    const section = sectionOf(thread, 'thread footnote', `Footnote ${footnote.label} at line ${thread.line + 1}`);
    const key = `edit:${thread.id}`;
    const header = element('div', 'thread-header');
    header.append(
      element('span', 'footnote-label', `[^${footnote.label}]`, { 'data-tooltip': labelTooltipOf(footnote) }),
      button(`Line ${thread.line + 1}`, 'link reveal', () => vscode.postMessage({ type: 'reveal', id: thread.id }), {
        'data-tooltip': footnote.github === undefined ? 'Show the definition in the text editor' : 'Show the first reference in the text editor',
      }),
    );
    if (!editors.has(key)) {
      const actions = element('span', 'actions');
      actions.append(
        iconButton('edit', 'Edit', () => open(key, thread.text, thread.text), { 'aria-label': `Edit the footnote ${footnote.label}` }),
        iconButton('trash', 'Delete', () => vscode.postMessage({ type: 'deleteFootnote', id: thread.id }), { 'aria-label': `Delete the footnote ${footnote.label}` }),
      );
      header.append(actions);
    }
    section.append(header);
    if (editors.has(key)) {
      section.append(editorOf(key, 'Text of the footnote, in Markdown', 'Save', (request, text) => ({ type: 'saveFootnote', request, id: thread.id, text, original: editors.get(key)?.original ?? thread.text })));
    } else {
      const body = element('div', 'answer-body markdown-body');
      body.replaceChildren(safeHtml(footnote.html));
      section.append(body);
    }
    return section;
  };

  /**
   * threadOf creates the elements of a thread.
   * @param {ThreadState} thread
   */
  const threadOf = (thread) => {
    if (thread.footnote) {
      return footnoteOf(thread, thread.footnote);
    }
    const section = sectionOf(thread, 'thread', `Note at line ${thread.line + 1}`);
    const header = element('div', 'thread-header');
    const asText = texts.has(thread.id);
    const swatch = button(
      '',
      'swatch',
      () => {
        if (!palettes.delete(thread.id)) {
          palettes.add(thread.id);
        }
        show();
      },
      { 'data-tooltip': `Color: ${thread.colorName}`, 'aria-label': `Color of the note: ${thread.colorName}`, 'aria-expanded': String(palettes.has(thread.id)) },
    );
    swatch.style.setProperty('--swatch', thread.color);
    if (thread.todo) {
      const done = thread.todo === 'done';
      const check = iconButton(
        done ? 'todoDone' : 'todoOpen',
        done ? 'Mark as Open' : 'Mark as Completed',
        () => {
          // The box shows the new state at once; the state of the extension follows.
          thread.todo = done ? 'todo' : 'done';
          vscode.postMessage({ type: 'todo', id: thread.id, done: !done });
          show();
        },
        { role: 'checkbox', 'aria-checked': String(done), 'aria-label': done ? 'Completed todo: mark as open' : 'Open todo: mark as completed' },
      );
      check.classList.add('todo');
      header.append(check);
    }
    const actions = element('span', 'actions');
    actions.append(
      iconButton(asText ? 'preview' : 'source', asText ? 'Show the Rendered Note' : 'Show as Text', () => {
        if (asText) {
          texts.delete(thread.id);
        } else {
          texts.add(thread.id);
        }
        show(asText ? undefined : `text:${thread.id}`);
      }),
      iconButton('comment', 'Answer', () => {
        texts.delete(thread.id);
        open(`reply:${thread.id}`, '');
      }),
      iconButton('trash', 'Delete Thread', () => vscode.postMessage({ type: 'deleteNote', id: thread.id })),
    );
    header.append(swatch, button(`Line ${thread.line + 1}`, 'link reveal', () => vscode.postMessage({ type: 'reveal', id: thread.id }), { 'data-tooltip': 'Show the note in the text editor' }), actions);
    section.append(header);
    if (palettes.has(thread.id)) {
      section.append(
        paletteOf(thread.colorName, (color) => {
          palettes.delete(thread.id);
          vscode.postMessage({ type: 'color', id: thread.id, color });
          show();
        }),
      );
    }
    if (asText) {
      section.append(textViewOf(thread));
      return section;
    }
    thread.answers.forEach((answer, index) => section.append(answerOf(thread, answer, index)));
    const key = `reply:${thread.id}`;
    if (editors.has(key)) {
      section.append(editorOf(key, 'Text of the answer, in Markdown', 'Answer', (request, text) => ({ type: 'answer', request, id: thread.id, text })));
    }
    return section;
  };

  /**
   * newTitle returns the title of the editor of a new note: the text that the note highlights, or what to do without
   * one.
   */
  const newTitle = () => (state.highlight === undefined ? 'Select the text in the text editor that the new note is about' : `New ${newTodo ? 'todo' : 'note'} on “${state.highlight}”`);

  /**
   * newNoteOf creates the elements of the editor of a new note, with the text that it highlights in its title, and its
   * colors.
   */
  const newNoteOf = () => {
    const section = element('section', 'new-note', undefined, { 'data-id': 'new' });
    section.append(element('h2', 'new-title', newTitle()));
    section.append(
      paletteOf(newColor ?? state.colors[0]?.name, (color) => {
        newColor = color;
        show();
      }),
    );
    section.append(editorOf('new', 'Text of the new note, in Markdown', newTodo ? 'Add Todo' : 'Add Note', (request, text) => ({ type: 'add', request, text, color: newColor, todo: newTodo })));
    return section;
  };

  /**
   * newFootnoteTitle returns the title of the editor of a new standard footnote: the text before the place of its
   * reference at the cursor of the text editor, or what to do where no reference can stand (R-FOOT-003).
   */
  const newFootnoteTitle = () => {
    if (newFootnoteLabel !== undefined) {
      return `New definition of the footnote [^${newFootnoteLabel}]`;
    }
    if (state.footnotePlace === undefined) {
      return 'Put the cursor into the text where the footnote goes';
    }
    return state.footnotePlace === '' ? 'New footnote at the start of the line' : `New footnote after “${state.footnotePlace}”`;
  };

  /** newFootnoteOf creates the elements of the editor of a new standard footnote, with the place of its reference in its title. */
  const newFootnoteOf = () => {
    const section = element('section', 'new-note new-footnote', undefined, { 'data-id': 'newFootnote' });
    section.append(element('h2', 'new-title', newFootnoteTitle()));
    const label = newFootnoteLabel;
    section.append(
      label === undefined
        ? editorOf('newFootnote', 'Text of the new footnote, in Markdown', 'Add Footnote', (request, text) => ({ type: 'addFootnote', request, text }))
        : editorOf('newFootnote', 'Text of the footnote, in Markdown', 'Add Definition', (request, text) => ({ type: 'addFootnote', request, text, label })),
    );
    return section;
  };

  /** tooltip is the element that shows the tooltip of the element under the pointer or with the focus of a key. */
  const tooltip = element('div', 'tooltip', undefined, { id: 'tooltip', role: 'tooltip' });
  tooltip.hidden = true;
  document.body.append(tooltip);

  /** tooltipDelay is the time in milliseconds under the pointer before a tooltip shows, the default of VS Code. */
  const tooltipDelay = 500;

  /** @type {Element | undefined} the element of the shown or the coming tooltip */
  let anchor;
  /** @type {Element | undefined} the element that the user pressed, which shows no tooltip until the pointer leaves it */
  let pressed;
  /** @type {number | undefined} the timer of the coming tooltip */
  let timer;
  /** hiddenAt is the time at which the last tooltip hid. */
  let hiddenAt = -Infinity;

  /** hideTooltip hides the tooltip, or stops the coming one. */
  const hideTooltip = () => {
    clearTimeout(timer);
    timer = undefined;
    if (!tooltip.hidden) {
      tooltip.hidden = true;
      hiddenAt = performance.now();
    }
    anchor?.removeAttribute('aria-describedby');
    anchor = undefined;
  };

  /** placeTooltip shows the tooltip of the anchor below it and inside the view, or above it without room below. */
  const placeTooltip = () => {
    timer = undefined;
    const text = anchor?.isConnected ? anchor.getAttribute('data-tooltip') : null;
    if (!anchor || !text) {
      hideTooltip();
      return;
    }
    tooltip.textContent = text;
    tooltip.style.left = '0px';
    tooltip.style.top = '0px';
    tooltip.hidden = false;
    const margin = 4;
    const box = anchor.getBoundingClientRect();
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const left = Math.max(Math.min(box.left + (box.width - width) / 2, window.innerWidth - width - margin), margin);
    const below = box.bottom + margin;
    const top = below + height <= window.innerHeight - margin ? below : Math.max(box.top - height - margin, margin);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    // A screen reader reads the tooltip of an element without a label of its own, such as the time of the author of a date.
    if (!anchor.hasAttribute('aria-label')) {
      anchor.setAttribute('aria-describedby', tooltip.id);
    }
  };

  /**
   * tooltipFor shows the tooltip of an element after the delay, or at once while a tooltip shows or just hid.
   * @param {Element} target
   */
  const tooltipFor = (target) => {
    if (target === anchor) {
      return;
    }
    const recent = !tooltip.hidden || performance.now() - hiddenAt < tooltipDelay;
    hideTooltip();
    anchor = target;
    if (recent) {
      placeTooltip();
    } else {
      timer = setTimeout(placeTooltip, tooltipDelay);
    }
  };

  /**
   * tooltipTarget returns the element with a tooltip that holds the target of an event, or null.
   * @param {EventTarget | null} target
   */
  const tooltipTarget = (target) => {
    const found = target instanceof Element ? target.closest('[data-tooltip]') : null;
    return found?.getAttribute('data-tooltip') ? found : null;
  };

  document.addEventListener('pointerover', (event) => {
    const target = tooltipTarget(event.target);
    if (target !== pressed) {
      pressed = undefined;
    }
    if (target && target !== pressed) {
      tooltipFor(target);
    } else {
      hideTooltip();
    }
  });
  // The pointer leaves the view.
  document.addEventListener('pointerout', (event) => {
    if (event.relatedTarget === null) {
      pressed = undefined;
      hideTooltip();
    }
  });
  // A click hides the tooltip, as in VS Code.
  document.addEventListener(
    'pointerdown',
    (event) => {
      pressed = tooltipTarget(event.target) ?? undefined;
      hideTooltip();
    },
    true,
  );
  // A key that moves the focus to an element shows its tooltip; a click that focuses it does not.
  document.addEventListener('focusin', (event) => {
    const target = tooltipTarget(event.target);
    if (target && target === event.target && target.matches(':focus-visible')) {
      tooltipFor(target);
    }
  });
  document.addEventListener('focusout', (event) => {
    if (event.target === anchor) {
      hideTooltip();
    }
  });
  document.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        hideTooltip();
      }
    },
    true,
  );
  // A scroll of the view or of a text field moves the element away from its tooltip.
  document.addEventListener('scroll', hideTooltip, true);
  window.addEventListener('blur', hideTooltip);

  /**
   * filter is the filter of the list (R-SIDE-008): the open or the completed todos, the names of the colors, and the
   * text of the search field. A filter that is off lets every thread through, and the filters that are on combine. The
   * two todo filters exclude each other. The state of the page keeps it while VS Code hides the view and after a reload
   * of the view.
   * @type {{ open: boolean, done: boolean, colors: string[], text: string }}
   */
  const filter = (() => {
    const saved = vscode.getState()?.filter;
    return {
      open: saved?.open === true,
      done: saved?.done === true && saved?.open !== true,
      colors: Array.isArray(saved?.colors) ? saved.colors.filter((name) => typeof name === 'string') : [],
      text: typeof saved?.text === 'string' ? saved.text : '',
    };
  })();

  /** filtering tells whether a filter is on. */
  const filtering = () => filter.open || filter.done || filter.colors.length > 0 || filter.text.trim() !== '';

  /**
   * matches tells whether a thread matches each filter that is on: a todo in a chosen state, a note in a chosen color,
   * and each word of the search field in the text or the author of an answer, or in the label or the text of a
   * footnote, without regard to case. A footnote has no state of a todo and no color.
   * @param {ThreadState} thread
   */
  const matches = (thread) => {
    if ((filter.open || filter.done) && !((filter.open && thread.todo === 'todo') || (filter.done && thread.todo === 'done'))) {
      return false;
    }
    if (filter.colors.length > 0 && !filter.colors.includes(thread.colorName)) {
      return false;
    }
    const text = (thread.footnote ? `[^${thread.footnote.label}]\n${thread.text}` : thread.answers.map((answer) => `${answer.author}\n${answer.body}`).join('\n')).toLowerCase();
    return filter.text.toLowerCase().split(/\s+/).filter(Boolean).every((word) => text.includes(word));
  };

  /** changed keeps the filter in the state of the page and shows the list anew. */
  const changed = () => {
    vscode.setState({ ...(vscode.getState() ?? {}), filter });
    show();
  };

  /** header is the header of the view, which stays at the top while the list scrolls, with the name of the file and the filters. */
  const header = element('header', 'top');
  const fileName = element('div', 'file');
  const openTodos = iconButton('todoOpen', 'Open Todos', () => {
    filter.open = !filter.open;
    if (filter.open) {
      filter.done = false;
    }
    changed();
  });
  const doneTodos = iconButton('todoDone', 'Completed Todos', () => {
    filter.done = !filter.done;
    if (filter.done) {
      filter.open = false;
    }
    changed();
  });
  const dots = element('span', 'dots', undefined, { role: 'group', 'aria-label': 'Colors of the notes' });
  const search = element('input', 'search', undefined, { type: 'search', placeholder: 'Search the notes', 'aria-label': 'Search the notes', spellcheck: 'false' });
  const clear = iconButton('close', 'Clear Filter', () => {
    Object.assign(filter, { open: false, done: false, colors: [], text: '' });
    search.value = '';
    changed();
  });
  const firstRow = element('div', 'top-row');
  firstRow.append(fileName, openTodos, doneTodos, dots, clear);
  header.append(firstRow, search);
  document.body.insertBefore(header, root);
  search.addEventListener('input', () => {
    filter.text = search.value;
    changed();
  });
  // Escape in the search field clears its text.
  search.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && search.value !== '') {
      event.preventDefault();
      search.value = '';
      filter.text = '';
      changed();
    }
  });
  // A thread that scrolls to the top of the view stands below the header.
  new ResizeObserver(() => document.documentElement.style.setProperty('--header', `${header.offsetHeight}px`)).observe(header);

  /** showHeader shows the name of the file and the filters in the header. */
  const showHeader = () => {
    fileName.textContent = state.file ?? 'No Markdown file';
    fileName.setAttribute('data-tooltip', state.file ?? '');
    openTodos.setAttribute('aria-pressed', String(filter.open));
    doneTodos.setAttribute('aria-pressed', String(filter.done));
    if (dots.childElementCount !== state.colors.length) {
      dots.replaceChildren(
        ...state.colors.map(({ name, color }) => {
          const dot = button(
            '',
            'swatch',
            () => {
              filter.colors = filter.colors.includes(name) ? filter.colors.filter((other) => other !== name) : [...filter.colors, name];
              changed();
            },
            { 'data-tooltip': `Notes in ${name}`, 'aria-label': `Notes in ${name}`, 'data-color': name },
          );
          dot.style.setProperty('--swatch', color);
          return dot;
        }),
      );
    }
    for (const dot of dots.children) {
      dot.setAttribute('aria-pressed', String(filter.colors.includes(dot.getAttribute('data-color') ?? '')));
    }
    if (search.value !== filter.text) {
      search.value = filter.text;
    }
    clear.disabled = !filtering();
  };

  /** motion returns how the view scrolls itself: smoothly, unless the system asks for less motion. */
  const motion = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

  /**
   * show shows the state and the open editors, and puts the focus back into the text field that had it. The list keeps
   * its scroll position, and an editor that opens scrolls into the view.
   * @param {string} [focusKey] - The key of an editor whose text field gets the focus.
   */
  const show = (focusKey) => {
    const active = document.activeElement;
    const activeKey = active instanceof HTMLTextAreaElement || active?.closest('.visual') ? active.closest('.editor')?.getAttribute('data-key') : undefined;
    const selection = active instanceof HTMLTextAreaElement ? [active.selectionStart, active.selectionEnd] : undefined;
    const scrolled = window.scrollY;
    root.replaceChildren();
    showHeader();
    const account = element('div', 'account');
    if (state.account) {
      account.textContent = `Signed in to GitHub as ${state.account}`;
    } else {
      account.append(element('span', undefined, 'New notes and answers need a GitHub sign-in. '), button('Sign in with GitHub', 'link', () => vscode.postMessage({ type: 'signIn' })));
    }
    root.append(account);
    if (state.file !== undefined && editors.has('new')) {
      root.append(newNoteOf());
    }
    if (state.file !== undefined && editors.has('newFootnote')) {
      root.append(newFootnoteOf());
    }
    if (state.file === undefined) {
      root.append(element('p', 'hint', 'Open a Markdown file to see its notes.'));
    } else if (state.threads.length === 0 && !editors.has('new') && !editors.has('newFootnote')) {
      root.append(element('p', 'hint', 'This file has no notes yet. Select text in the text editor, then choose "Add Note" in the light bulb or the context menu of the text editor, or "Add Note" (+) in the title of the view.'));
    }
    // The selected thread shows also when the filter hides it.
    const shown = state.threads.filter((thread) => thread.id === state.selected || matches(thread));
    if (state.threads.length > 0 && shown.length === 0) {
      root.append(element('p', 'hint', 'No note matches the filter.'));
    }
    for (const thread of shown) {
      root.append(threadOf(thread));
    }
    if (anchor && !anchor.isConnected) {
      hideTooltip();
    }
    if (window.scrollY !== scrolled) {
      window.scrollTo({ top: scrolled });
    }
    const key = focusKey ?? activeKey;
    const visual = key ? visuals.get(key) : undefined;
    if (visual?.element.isConnected) {
      // A visual editor keeps its selection while it moves into the new page.
      visual.focus();
      if (focusKey) {
        (visual.element.closest('.new-note') ?? visual.element.closest('.editor'))?.scrollIntoView({ block: 'nearest', behavior: motion() });
      }
    }
    const field = key ? root.querySelector(`.editor[data-key="${CSS.escape(key)}"] textarea`) : null;
    if (field instanceof HTMLTextAreaElement) {
      field.focus({ preventScroll: true });
      if (!focusKey && selection) {
        field.setSelectionRange(selection[0], selection[1]);
      }
      if (focusKey) {
        (field.closest('.new-note') ?? field.closest('.editor'))?.scrollIntoView({ block: 'nearest', behavior: motion() });
      }
    }
  };

  /**
   * scrollToSelected scrolls the selected thread to the top of the view.
   */
  const scrollToSelected = () => {
    root.querySelector('.thread.selected')?.scrollIntoView({ block: 'start', behavior: motion() });
  };

  // A click on the empty part of the view, outside the threads and the controls, deselects the selected thread.
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (state.selected !== undefined && (!target || !target.closest('.thread, .new-note, .top, button, a, textarea, .editor'))) {
      vscode.postMessage({ type: 'deselect' });
    }
  });
  // Escape outside an editor deselects the selected thread; in an editor it cancels the editor.
  document.addEventListener('keydown', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (event.key === 'Escape' && !event.defaultPrevented && state.selected !== undefined && !target?.closest('textarea, input, .editor')) {
      vscode.postMessage({ type: 'deselect' });
    }
  });

  // A click on a link of a rendered text opens the link through the extension: the page of the view would resolve a
  // relative link against its own address, and VS Code opens only some schemes from a webview. The listener runs
  // before the one of VS Code on the window, and stops the click there.
  root.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    // The visual editor opens its links itself: a click on a link of the block with the cursor puts the cursor there.
    if (!link || !root.contains(link) || link.closest('.visual')) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    vscode.postMessage({ type: 'openLink', href: link.getAttribute('href') });
  });

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.type === 'state') {
      const selectionChanged = message.selected !== state.selected;
      state = message;
      // The editors of threads and answers that the file no longer holds close.
      for (const key of [...editors.keys()]) {
        const [kind, id, answer] = key.split(':');
        const thread = state.threads.find((candidate) => candidate.id === id);
        const hasAnswer = thread !== undefined && thread.answers.some((_, index) => answerKeyOf(thread, index) === answer);
        if (((kind === 'answer' || (kind === 'reply' && answer !== undefined)) && !hasAnswer) || ((kind === 'reply' || kind === 'text' || kind === 'edit') && !thread)) {
          forget(key);
        }
      }
      for (const set of [texts, palettes]) {
        for (const id of [...set]) {
          if (!state.threads.some((thread) => thread.id === id)) {
            set.delete(id);
          }
        }
      }
      show();
      if (selectionChanged) {
        scrollToSelected();
      }
    } else if (message.type === 'scroll') {
      // The view shows again after the selected thread changed while it was hidden, and has its size in the next frame.
      requestAnimationFrame(scrollToSelected);
    } else if (message.type === 'new') {
      // An open editor of a new note keeps its text and its color; `/todo` of the text editor makes the note a todo.
      newTodo = message.todo === true;
      open('new', editors.get('new')?.text ?? '');
    } else if (message.type === 'newFootnote') {
      // An open editor of a new footnote keeps its text; the label of "Add Definition" makes it the editor of a definition.
      newFootnoteLabel = message.label;
      open('newFootnote', editors.get('newFootnote')?.text ?? '');
    } else if (message.type === 'line') {
      state.line = message.line;
      state.highlight = message.highlight;
      state.footnotePlace = message.footnotePlace;
      const title = root.querySelector('.new-note:not(.new-footnote) .new-title');
      if (title) {
        title.textContent = newTitle();
      }
      const footnoteTitle = root.querySelector('.new-footnote .new-title');
      if (footnoteTitle) {
        footnoteTitle.textContent = newFootnoteTitle();
      }
    } else if (message.type === 'result') {
      const key = requests.get(message.request);
      requests.delete(message.request);
      const editor = key ? editors.get(key) : undefined;
      if (editor) {
        editor.request = undefined;
        if (message.message) {
          editor.problem = message.message;
          show(key);
        } else {
          close(key);
        }
      }
    } else if (message.type === 'rendered') {
      const key = requests.get(message.request);
      requests.delete(message.request);
      const editor = key ? editors.get(key) : undefined;
      if (editor && editor.tab === 'preview') {
        editor.preview = message.html;
        show();
      }
    }
  });

  show();
  vscode.postMessage({ type: 'ready' });
})();
