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
// The buttons are small icons with a tooltip, as the buttons in the title of
// an editor of VS Code (Hannes, 2026-10-28: "exchange all the buttons on the
// note editor with icons"); the icons are codicons of VS Code. An editor of a
// text switches between writing and the preview. Save (or Ctrl+Enter) sends
// the text; the editor stays open with the message of the extension when the
// extension refuses the text, and closes when the extension wrote it. Escape
// cancels. The open editors keep their texts when a new state arrives, and
// the focus stays in its text field.
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
// notes, with the color that the hover of the selected text chose.
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
// While a text editor shows the file, the view stands aligned to it, as the
// compare view of VS Code shows two texts side by side (decision 14): the
// extension sends the places of the highlights of the notes, in pixels
// from the top of the view, and the script puts each thread at the height of
// its highlight. Threads that would overlap move apart: the thread that the
// user works on stays at its highlight, the editor of a new note or else
// the selected thread or else the first thread whose highlight the editor
// shows, and the threads before it move up and the threads after it move
// down. The left edge of the view has a mark in the color of each note at the
// rows of its highlight, and only the selected thread has a line from its mark to the
// thread (Hannes, 2026-10-28: "only the selected one has the connection").
// The page does not scroll: the mouse wheel scrolls the text editor, whose
// new places the extension sends. The editor of a new note stands at the row
// of the cursor. While no text editor shows the file, the view lists the
// threads and scrolls the selected thread to its top. The script places the
// threads again on each change of the state, of the places, of the size of
// the view and of the height of a thread, and tells the extension its
// height.

(() => {
  'use strict';

  const vscode = acquireVsCodeApi();
  const root = document.getElementById('notes');

  /**
   * @typedef {{ author: string, date: string, authorDate: string, body: string, html: string, depth: number, parent: number | undefined }} AnswerState
   * @typedef {{ id: string, line: number, color: string, colorName: string, text: string, answers: AnswerState[] }} ThreadState
   * @typedef {{ editor: [number, number], highlights: Record<string, [number, number]>, cursor: [number, number] | undefined, lineHeight: number }} Placement
   * @typedef {{ file: string | undefined, line: number | undefined, highlight: string | undefined, account: string | undefined, selected: string | undefined, threads: ThreadState[], colors: { name: string, color: string }[], placement: Placement | undefined }} State
   * @typedef {{ text: string, tab: 'write' | 'preview', preview: string | undefined, problem: string | undefined, request: number | undefined }} Editor
   */

  /** @type {State} */
  let state = { file: undefined, line: undefined, highlight: undefined, account: undefined, selected: undefined, threads: [], colors: [], placement: undefined };

  const svgNamespace = 'http://www.w3.org/2000/svg';

  /** marks holds the marks of the highlights at the left edge of the view. */
  const marks = document.createElement('div');
  marks.className = 'marks';
  marks.setAttribute('aria-hidden', 'true');

  /** connection is the drawing of the line from the mark of the selected note to its thread. */
  const connection = document.createElementNS(svgNamespace, 'svg');
  connection.setAttribute('class', 'connection');
  connection.setAttribute('aria-hidden', 'true');
  document.body.prepend(marks, connection);

  /** markWidth is the width of a mark in pixels, and gap the space between two threads. */
  const markWidth = 4;
  const gap = 6;

  /** rise is the distance in pixels from the top of a thread to the top of the row of its highlight, so that its header stands beside the row. */
  const rise = 4;

  /** sizes redraws the places when the height of a thread changes, for example when an image of a text loads. */
  const sizes = typeof ResizeObserver === 'function' ? new ResizeObserver(() => drawLater()) : undefined;

  /** @type {number | undefined} */
  let frame;

  /**
   * editors holds the open editors by their keys: `new`, `answer:<thread>:<index>`, `reply:<thread>` for a reply to the
   * note, `reply:<thread>:<index>` for a reply to an answer, and `text:<thread>` for the changed text of the text view of
   * a thread. @type {Map<string, Editor>}
   */
  const editors = new Map();

  /** texts holds the identifiers of the threads that show their text views. @type {Set<string>} */
  const texts = new Set();

  /** palettes holds the identifiers of the threads that show their colors. @type {Set<string>} */
  const palettes = new Set();

  /** @type {string | undefined} the name of the color of the new note, or undefined for the default color. */
  let newColor;

  /**
   * icons are the paths of the codicons of VS Code that the buttons show (https://github.com/microsoft/vscode-codicons,
   * CC BY 4.0), each drawn in a square of 16 units.
   */
  const icons = {
    reply:
      'M6.306 2.146l-4.02 4.02v.708l4.02 4.02.708-.707L3.807 6.98H5.69c2.813 0 4.605.605 5.705 1.729 1.102 1.125 1.615 2.877 1.615 5.421v.35h1v-.35c0-2.646-.527-4.72-1.9-6.121C10.735 6.605 8.617 5.98 5.69 5.98H3.887l3.127-3.126-.708-.708z',
    edit: 'M13.23 1h-1.46L3.52 9.25l-.16.22L1 13.59 2.41 15l4.12-2.36.22-.16L15 4.23V2.77L13.23 1zM2.41 13.59l1.51-3 1.45 1.45-2.96 1.55zm3.83-2.06L4.47 9.76l8-8 1.77 1.77-8 8z',
    trash:
      'M10 3h3v1h-1v9l-1 1H4l-1-1V4H2V3h3V2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v1zM9 2H6v1h3V2zM4 13h7V4H4v9zm2-8H5v7h1V5zm1 0h1v7H7V5zm2 0h1v7H9V5z',
    comment: 'M14.5 2h-13l-.5.5v9l.5.5H4v2.5l.854.354L7.707 12H14.5l.5-.5v-9l-.5-.5zm-.5 9H7.5l-.354.146L5 13.293V11.5l-.5-.5H2V3h12v8z',
    check: 'M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.764.646z',
    close: 'M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z',
    preview:
      'M3 1h11l1 1v5.3a3.21 3.21 0 0 0-1-.3V2H9v10.88L7.88 14H3l-1-1V2l1-1zm0 12h5V2H3v11zm10.379-4.998a2.53 2.53 0 0 0-1.19.348h-.03a2.51 2.51 0 0 0-.799 3.53L9 14.23l.71.71 2.35-2.36c.325.22.7.358 1.09.4a2.47 2.47 0 0 0 1.14-.13 2.51 2.51 0 0 0 1-.63 2.46 2.46 0 0 0 .58-1 2.63 2.63 0 0 0 .07-1.15 2.53 2.53 0 0 0-1.35-1.81 2.53 2.53 0 0 0-1.211-.258zm.24 3.992a1.5 1.5 0 0 1-.979-.244 1.55 1.55 0 0 1-.56-.68 1.49 1.49 0 0 1-.08-.86 1.49 1.49 0 0 1 1.18-1.18 1.49 1.49 0 0 1 .86.08c.276.117.512.311.68.56a1.5 1.5 0 0 1-1.1 2.324z',
    source:
      'M6 5.914l2.06-2.06v-.708L5.915 1l-.707.707.043.043.25.25 1 1h-3a2.5 2.5 0 0 0 0 5H4V7h-.5a1.5 1.5 0 1 1 0-3h3L5.207 5.293 5.914 6 6 5.914zM11 2H8.328l-1-1H12l.71.29 3 3L16 5v9l-1 1H6l-1-1V6.5l1 .847V14h9V6h-4V2zm1 0v3h3l-3-3z',
  };

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
   * the attributes of events, and without addresses of the schemes javascript: and vbscript:.
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
        if (name.startsWith('on') || name === 'srcdoc' || (linkAttributes.has(name) && /(^|,)(javascript|vbscript):/.test(address))) {
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
    const created = button('', 'icon', action, { title: label, 'aria-label': label, ...attributes });
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
   */
  const open = (key, text) => {
    if (!editors.has(key)) {
      editors.set(key, { text, tab: 'write', preview: undefined, problem: undefined, request: undefined });
    }
    show(key);
  };

  /**
   * close closes an editor.
   * @param {string} key
   */
  const close = (key) => {
    editors.delete(key);
    if (key === 'new') {
      newColor = undefined;
    }
    show();
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
    if (editor.tab === 'write') {
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
    // The aligned view has no account line at its top, so an editor of a new text tells about the sign-in itself.
    if (!state.account && state.placement && !key.startsWith('answer:')) {
      const hint = element('p', 'hint sign-in', 'New notes and answers need a GitHub sign-in. ');
      hint.append(button('Sign in with GitHub', 'link', () => vscode.postMessage({ type: 'signIn' })));
      box.append(hint);
    }
    const buttons = element('div', 'buttons');
    const pending = editor.request !== undefined ? { disabled: '' } : {};
    const writing = editor.tab === 'write';
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
    const message = (request, text) => ({ type: 'saveText', request, id: thread.id, text });
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
        editors.set(key, { text: field.value, tab: 'write', preview: undefined, problem: undefined, request: undefined });
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
      const swatch = button('', 'swatch', () => choose(name === state.colors[0]?.name ? undefined : name), { title: name, 'aria-label': name, 'aria-pressed': String(name === chosen) });
      swatch.style.setProperty('--swatch', color);
      palette.append(swatch);
    }
    return palette;
  };

  /**
   * answerOf creates the elements of an answer of a thread.
   * @param {ThreadState} thread
   * @param {AnswerState} answer
   * @param {number} index
   */
  const answerOf = (thread, answer, index) => {
    const key = `answer:${thread.id}:${index}`;
    const replyKey = `reply:${thread.id}:${index}`;
    const article = element('article', 'answer');
    // The first answer and the replies to it stand at the left edge, and each further level of replies is indented.
    article.style.setProperty('--depth', String(Math.max(answer.depth - 1, 0)));
    if (answer.depth > 1) {
      article.classList.add('reply');
    }
    const header = element('div', 'answer-header');
    header.append(element('span', 'author', answer.author || 'Unknown author'));
    if (answer.date) {
      header.append(element('span', 'date', answer.date, { title: answer.authorDate }));
    }
    if (!editors.has(key)) {
      const actions = element('span', 'actions');
      const author = answer.author || 'an unknown author';
      actions.append(
        iconButton('reply', 'Reply', () => open(replyKey, ''), { 'aria-label': `Reply to the answer of ${author}` }),
        iconButton('edit', 'Edit', () => open(key, answer.body), { 'aria-label': `Edit the answer of ${author}` }),
        iconButton('trash', 'Delete', () => vscode.postMessage({ type: 'deleteAnswer', id: thread.id, index }), { 'aria-label': `Delete the answer of ${author}` }),
      );
      header.append(actions);
    }
    article.append(header);
    if (editors.has(key)) {
      article.append(editorOf(key, 'Text of the answer, in Markdown', 'Save', (request, text) => ({ type: 'save', request, id: thread.id, index, text })));
    } else {
      const body = element('div', 'answer-body markdown-body');
      body.replaceChildren(safeHtml(answer.html));
      article.append(body);
    }
    if (editors.has(replyKey)) {
      article.append(
        editorOf(replyKey, `Text of the reply to ${answer.author || 'an unknown author'}, in Markdown`, 'Reply', (request, text) => ({ type: 'answer', request, id: thread.id, text, parent: index })),
      );
    }
    return article;
  };

  /**
   * threadOf creates the elements of a thread.
   * @param {ThreadState} thread
   */
  const threadOf = (thread) => {
    const section = element('section', `thread${thread.id === state.selected ? ' selected' : ''}`, undefined, {
      'data-id': thread.id,
      'aria-label': `Note at line ${thread.line + 1}`,
    });
    section.style.setProperty('--note-color', thread.color);
    // A click on the thread outside its buttons, links and editors selects its note, and the focus stays in the view.
    section.addEventListener('click', (event) => {
      if (!(event.target instanceof Element) || !event.target.closest('button, a, textarea, .editor')) {
        vscode.postMessage({ type: 'reveal', id: thread.id, focus: false });
      }
    });
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
      { title: `Color: ${thread.colorName}`, 'aria-label': `Color of the note: ${thread.colorName}`, 'aria-expanded': String(palettes.has(thread.id)) },
    );
    swatch.style.setProperty('--swatch', thread.color);
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
    header.append(swatch, button(`Line ${thread.line + 1}`, 'link reveal', () => vscode.postMessage({ type: 'reveal', id: thread.id }), { title: 'Show the note in the text editor' }), actions);
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
      section.append(editorOf(key, 'Text of the answer, in Markdown', 'Answer', (request, text) => ({ type: 'answer', request, id: thread.id, text, parent: 0 })));
    }
    return section;
  };

  /**
   * newTitle returns the title of the editor of a new note: the text that the note highlights, or what to do without one
   * (Hannes, 2026-10-28: "there shall be no way to add a note without highlighting text").
   */
  const newTitle = () => (state.highlight === undefined ? 'Select the text in the text editor that the new note is about' : `New note on “${state.highlight}”`);

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
    section.append(editorOf('new', 'Text of the new note, in Markdown', 'Add Note', (request, text) => ({ type: 'add', request, text, color: newColor })));
    return section;
  };

  /** aligned tells whether the view stands aligned to the text editor. */
  const aligned = () => state.placement !== undefined && state.file !== undefined;

  /**
   * show shows the state and the open editors, and puts the focus back into the text field that had it.
   * @param {string} [focusKey] - The key of an editor whose text field gets the focus.
   */
  const show = (focusKey) => {
    const active = document.activeElement;
    const activeKey = active instanceof HTMLTextAreaElement ? active.closest('.editor')?.getAttribute('data-key') : undefined;
    const selection = active instanceof HTMLTextAreaElement ? [active.selectionStart, active.selectionEnd] : undefined;
    root.replaceChildren();
    sizes?.disconnect();
    document.body.classList.toggle('aligned', aligned());
    if (!aligned()) {
      const top = element('div', 'top');
      top.append(element('div', 'file', state.file ?? 'No Markdown file', { title: state.file ?? '' }));
      const account = element('div', 'account');
      if (state.account) {
        account.textContent = `Signed in to GitHub as ${state.account}`;
      } else {
        account.append(element('span', undefined, 'New notes and answers need a GitHub sign-in. '), button('Sign in with GitHub', 'link', () => vscode.postMessage({ type: 'signIn' })));
      }
      top.append(account);
      root.append(top);
    }
    if (state.file !== undefined && editors.has('new')) {
      root.append(newNoteOf());
    }
    if (state.file === undefined) {
      root.append(element('p', 'hint', 'Open a Markdown file to see its notes.'));
    } else if (state.threads.length === 0 && !editors.has('new')) {
      root.append(element('p', 'hint', 'This file has no notes yet. Select text in the text editor, then choose a color in the hover over the selected text, or "Add Note" (+) in the title of the view.'));
    }
    for (const thread of state.threads) {
      root.append(threadOf(thread));
    }
    if (sizes && aligned()) {
      root.querySelectorAll('.thread, .new-note').forEach((item) => sizes.observe(item));
    }
    document.body.classList.toggle('with-selection', state.threads.some((thread) => thread.id === state.selected));
    draw();
    const key = focusKey ?? activeKey;
    const field = key ? root.querySelector(`.editor[data-key="${CSS.escape(key)}"] textarea`) : null;
    if (field instanceof HTMLTextAreaElement) {
      field.focus({ preventScroll: true });
      if (!focusKey && selection) {
        field.setSelectionRange(selection[0], selection[1]);
      }
    }
  };

  /**
   * layout returns the top of each item of the aligned view, by the element: each thread at the row of its highlight,
   * the editor of a new note at the row of the cursor, and the items apart by gap. The item that the user works on keeps
   * its place: the editor of a new note, or else the selected thread, or else the first thread whose highlight the
   * text editor shows; the items before it move up and the items after it move down.
   * @param {Placement} placement
   * @returns {Map<Element, number>}
   */
  const layout = (placement) => {
    /** @type {{ item: HTMLElement, anchor: number, height: number, id: string }[]} */
    const items = [];
    for (const item of root.querySelectorAll('.thread, .new-note')) {
      if (!(item instanceof HTMLElement)) {
        continue;
      }
      const id = item.getAttribute('data-id') ?? '';
      const place = id === 'new' ? placement.cursor : placement.highlights[id];
      if (place) {
        items.push({ item, anchor: place[0] - rise, height: item.offsetHeight, id });
      }
    }
    // The editor of a new note stands before the threads of its row.
    items.sort((a, b) => a.anchor - b.anchor || (a.id === 'new' ? -1 : b.id === 'new' ? 1 : 0));
    const [editorTop, editorBottom] = placement.editor;
    const visible = (id) => {
      const place = placement.highlights[id];
      return place !== undefined && place[1] > editorTop && place[0] < editorBottom;
    };
    let pivot = items.findIndex((entry) => entry.id === 'new');
    if (pivot < 0) {
      pivot = items.findIndex((entry) => entry.id === state.selected);
    }
    if (pivot < 0) {
      pivot = items.findIndex((entry) => visible(entry.id));
    }
    const tops = items.map((entry) => entry.anchor);
    for (let index = Math.max(pivot, 0) + 1; index < items.length; index++) {
      tops[index] = Math.max(items[index].anchor, tops[index - 1] + items[index - 1].height + gap);
    }
    for (let index = pivot - 1; index >= 0; index--) {
      tops[index] = Math.min(items[index].anchor, tops[index + 1] - items[index].height - gap);
    }
    return new Map(items.map((entry, index) => [entry.item, tops[index]]));
  };

  /**
   * draw places the threads of the aligned view, with the marks of the highlights and the line of the selected
   * thread, or removes the places, the marks and the line for the list.
   */
  const draw = () => {
    frame = undefined;
    marks.replaceChildren();
    connection.replaceChildren();
    const placement = aligned() ? state.placement : undefined;
    if (!placement) {
      root.querySelectorAll('.thread, .new-note').forEach((item) => {
        if (item instanceof HTMLElement) {
          item.style.top = '';
        }
      });
      return;
    }
    const tops = layout(placement);
    for (const [item, top] of tops) {
      if (item instanceof HTMLElement) {
        item.style.top = `${top}px`;
      }
    }
    root.querySelectorAll('.thread, .new-note').forEach((item) => {
      if (item instanceof HTMLElement && !tops.has(item)) {
        item.style.top = '-10000px';
      }
    });
    const [editorTop, editorBottom] = placement.editor;
    const height = window.innerHeight;
    connection.setAttribute('viewBox', `0 0 ${window.innerWidth} ${height}`);
    for (const thread of state.threads) {
      const place = placement.highlights[thread.id];
      if (!place) {
        continue;
      }
      const top = Math.max(place[0], editorTop);
      const bottom = Math.min(place[1], editorBottom);
      if (bottom <= top) {
        continue;
      }
      const selected = thread.id === state.selected;
      const mark = element('div', `mark${selected ? ' selected' : ''}`);
      mark.style.top = `${top}px`;
      mark.style.height = `${Math.max(bottom - top, 3)}px`;
      mark.style.backgroundColor = thread.color;
      marks.append(mark);
      // Only the selected thread has the line from its mark, so that the line shows which highlight the user works on.
      const section = selected ? root.querySelector(`.thread[data-id="${CSS.escape(thread.id)}"]`) : null;
      const card = section?.getBoundingClientRect();
      if (!card || card.bottom <= 0 || card.top >= height) {
        continue;
      }
      const from = (top + bottom) / 2;
      const to = Math.min(Math.max(card.top + rise + 10, 0), height);
      const middle = (markWidth + card.left) / 2;
      const path = document.createElementNS(svgNamespace, 'path');
      path.setAttribute('d', `M ${markWidth} ${from} C ${middle} ${from} ${middle} ${to} ${card.left} ${to}`);
      path.setAttribute('class', 'line');
      path.setAttribute('stroke', thread.color);
      connection.append(path);
    }
  };

  /** drawLater places the threads before the next frame, once for several changes. */
  const drawLater = () => {
    if (frame === undefined) {
      frame = requestAnimationFrame(draw);
    }
  };

  /**
   * scrollToSelected scrolls the selected thread of the list to the top of the view (Hannes, 2026-10-28: "so the
   * selected note is on top"); in the aligned view, the thread stands at its highlight.
   */
  const scrollToSelected = () => {
    if (!aligned()) {
      root.querySelector('.thread.selected')?.scrollIntoView({ block: 'start' });
    }
  };

  // A click on the empty part of the view, outside the threads and the controls, deselects the selected thread.
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (state.selected !== undefined && (!target || !target.closest('.thread, .new-note, .top, button, a, textarea, .editor, .marks'))) {
      vscode.postMessage({ type: 'deselect' });
    }
  });
  // Escape outside an editor deselects the selected thread; in an editor it cancels the editor.
  document.addEventListener('keydown', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (event.key === 'Escape' && !event.defaultPrevented && state.selected !== undefined && !target?.closest('textarea, .editor')) {
      vscode.postMessage({ type: 'deselect' });
    }
  });

  // A click on a link of a rendered text opens the link through the extension: the page of the view would resolve a
  // relative link against its own address, and VS Code opens only some schemes from a webview. The listener runs
  // before the one of VS Code on the window, and stops the click there.
  root.addEventListener('click', (event) => {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link || !root.contains(link)) {
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
        const [kind, id, index] = key.split(':');
        const thread = state.threads.find((candidate) => candidate.id === id);
        if (((kind === 'answer' || (kind === 'reply' && index !== undefined)) && !thread?.answers[Number(index)]) || ((kind === 'reply' || kind === 'text') && !thread)) {
          editors.delete(key);
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
    } else if (message.type === 'placement') {
      const wasAligned = aligned();
      state.placement = message.placement;
      if (wasAligned !== aligned()) {
        show();
      } else {
        drawLater();
      }
    } else if (message.type === 'new') {
      newColor = message.color;
      open('new', editors.get('new')?.text ?? '');
    } else if (message.type === 'line') {
      state.line = message.line;
      state.highlight = message.highlight;
      const title = root.querySelector('.new-title');
      if (title) {
        title.textContent = newTitle();
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

  /** told is the last height of the page that the script told the extension. */
  let told = 0;

  /** tellSize tells the extension the height of the page, from which it estimates the height of the text editor. */
  const tellSize = () => {
    if (window.innerHeight !== told) {
      told = window.innerHeight;
      vscode.postMessage({ type: 'size', height: told });
    }
  };

  /** wheel holds the pixels of the mouse wheel that did not yet scroll the text editor by a whole row. */
  let wheel = 0;

  // In the aligned view, the mouse wheel scrolls the text editor by rows, as the compare view scrolls both of its sides;
  // a text field that can scroll keeps the wheel.
  window.addEventListener(
    'wheel',
    (event) => {
      const placement = aligned() ? state.placement : undefined;
      const target = event.target instanceof Element ? event.target : null;
      const field = target?.closest('textarea, pre');
      if (!placement || (field && field.scrollHeight > field.clientHeight)) {
        return;
      }
      event.preventDefault();
      const lineHeight = Math.max(placement.lineHeight, 1);
      wheel += event.deltaMode === 1 ? event.deltaY * lineHeight : event.deltaMode === 2 ? event.deltaY * window.innerHeight : event.deltaY;
      const rows = Math.trunc(wheel / lineHeight);
      if (rows !== 0) {
        wheel -= rows * lineHeight;
        vscode.postMessage({ type: 'scroll', rows });
      }
    },
    { passive: false },
  );
  window.addEventListener('resize', () => {
    tellSize();
    drawLater();
  });

  show();
  vscode.postMessage({ type: 'ready' });
  tellSize();
})();
