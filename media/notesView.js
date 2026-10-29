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
// scrolls on its own (Hannes, 2026-10-29, decision 25: "List that scrolls
// freely"). It scrolls itself only when the selected thread changes, for a
// click on a highlight or a move of the cursor into a highlight: the selected
// thread scrolls to the top of the view. An empty part after the last thread
// lets also the last thread scroll to the top. The editor of a new note
// stands at the top of the list.
//
// The buttons, the colors, the line of a thread and the dates have tooltips,
// which the script shows itself, from the attribute data-tooltip: VS Code
// showed no tooltip of the attribute title in the view (Hannes, 2026-10-29,
// on macOS: "add tooltips to the icons"). A tooltip shows below its element
// as the hover of VS Code shows the tooltip of a button in the title of an
// editor: after half a second under the pointer, at once when the pointer
// comes from another tooltip, and when a key moves the focus to the element.

(() => {
  'use strict';

  const vscode = acquireVsCodeApi();
  const root = document.getElementById('notes');

  /**
   * @typedef {{ author: string, date: string, authorDate: string, written: string, body: string, html: string, depth: number, parent: number | undefined }} AnswerState
   * @typedef {{ id: string, line: number, color: string, colorName: string, text: string, answers: AnswerState[] }} ThreadState
   * @typedef {{ file: string | undefined, line: number | undefined, highlight: string | undefined, account: string | undefined, selected: string | undefined, threads: ThreadState[], colors: { name: string, color: string }[] }} State
   * @typedef {{ text: string, tab: 'write' | 'preview', preview: string | undefined, problem: string | undefined, request: number | undefined, original?: string }} Editor
   */

  /** @type {State} */
  let state = { file: undefined, line: undefined, highlight: undefined, account: undefined, selected: undefined, threads: [], colors: [] };

  const svgNamespace = 'http://www.w3.org/2000/svg';

  /**
   * editors holds the open editors by their keys: `new`, `answer:<thread>:<answer>`, `reply:<thread>` for a reply to the
   * note, `reply:<thread>:<answer>` for a reply to an answer, and `text:<thread>` for the changed text of the text view
   * of a thread, with `original`, the text of the note when the change started. `<answer>` names an answer by its author
   * and its date (answerKeyOf), so that an open editor stays with its answer when an answer before it goes away.
   * @type {Map<string, Editor>}
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
      { 'data-tooltip': `Color: ${thread.colorName}`, 'aria-label': `Color of the note: ${thread.colorName}`, 'aria-expanded': String(palettes.has(thread.id)) },
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

  /** motion returns how the view scrolls itself: smoothly, unless the system asks for less motion. */
  const motion = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

  /**
   * show shows the state and the open editors, and puts the focus back into the text field that had it. The list keeps
   * its scroll position, and an editor that opens scrolls into the view.
   * @param {string} [focusKey] - The key of an editor whose text field gets the focus.
   */
  const show = (focusKey) => {
    const active = document.activeElement;
    const activeKey = active instanceof HTMLTextAreaElement ? active.closest('.editor')?.getAttribute('data-key') : undefined;
    const selection = active instanceof HTMLTextAreaElement ? [active.selectionStart, active.selectionEnd] : undefined;
    const scrolled = window.scrollY;
    root.replaceChildren();
    const top = element('div', 'top');
    top.append(element('div', 'file', state.file ?? 'No Markdown file', { 'data-tooltip': state.file ?? '' }));
    const account = element('div', 'account');
    if (state.account) {
      account.textContent = `Signed in to GitHub as ${state.account}`;
    } else {
      account.append(element('span', undefined, 'New notes and answers need a GitHub sign-in. '), button('Sign in with GitHub', 'link', () => vscode.postMessage({ type: 'signIn' })));
    }
    top.append(account);
    root.append(top);
    if (state.file !== undefined && editors.has('new')) {
      root.append(newNoteOf());
    }
    if (state.file === undefined) {
      root.append(element('p', 'hint', 'Open a Markdown file to see its notes.'));
    } else if (state.threads.length === 0 && !editors.has('new')) {
      root.append(element('p', 'hint', 'This file has no notes yet. Select text in the text editor, then choose "Add Note" in the light bulb or the context menu of the text editor, or "Add Note" (+) in the title of the view.'));
    }
    for (const thread of state.threads) {
      root.append(threadOf(thread));
    }
    document.body.classList.toggle('with-selection', state.threads.some((thread) => thread.id === state.selected));
    if (anchor && !anchor.isConnected) {
      hideTooltip();
    }
    if (window.scrollY !== scrolled) {
      window.scrollTo({ top: scrolled });
    }
    const key = focusKey ?? activeKey;
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
   * scrollToSelected scrolls the selected thread to the top of the view (Hannes, 2026-10-28: "so the selected note is on
   * top").
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
        const [kind, id, answer] = key.split(':');
        const thread = state.threads.find((candidate) => candidate.id === id);
        const hasAnswer = thread !== undefined && thread.answers.some((_, index) => answerKeyOf(thread, index) === answer);
        if (((kind === 'answer' || (kind === 'reply' && answer !== undefined)) && !hasAnswer) || ((kind === 'reply' || kind === 'text') && !thread)) {
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
    } else if (message.type === 'new') {
      // An open editor of a new note keeps its text and its color.
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

  show();
  vscode.postMessage({ type: 'ready' });
})();
