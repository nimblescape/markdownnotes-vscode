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
// An editor of a text has the tabs "Write" and "Preview". Save (or
// Ctrl+Enter) sends the text; the editor stays open with the message of the
// extension when the extension refuses the text, and closes when the
// extension wrote it. Escape cancels. The open editors keep their texts when
// a new state arrives, and the focus stays in its text field.
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
// Each thread shows the badge with the number and the color of its note, and
// a click on a thread, outside its buttons and editors, selects its note in
// the text editor (R-SIDE-007). While the setting showFunnels is on, the left
// edge of the view has a strip that stands for the whole file, with a mark
// for each note and a frame for the part of the file that the text editor
// shows, and a funnel leads from each visible thread to the mark of its note.
// The script draws them again on each change of the state, of the visible
// part of the file, of the scrolling of the view and of its size.

(() => {
  'use strict';

  const vscode = acquireVsCodeApi();
  const root = document.getElementById('notes');

  /**
   * @typedef {{ author: string, date: string, authorDate: string, body: string, html: string, depth: number, parent: number | undefined }} AnswerState
   * @typedef {{ id: string, line: number, number: number, color: string, mark: [number, number], answers: AnswerState[] }} ThreadState
   * @typedef {{ lines: [number, number] | undefined, lineCount: number }} Visible
   * @typedef {{ file: string | undefined, line: number | undefined, account: string | undefined, selected: string | undefined, threads: ThreadState[], funnels: boolean, visible: Visible }} State
   * @typedef {{ text: string, tab: 'write' | 'preview', preview: string | undefined, problem: string | undefined, request: number | undefined }} Editor
   */

  /** @type {State} */
  let state = { file: undefined, line: undefined, account: undefined, selected: undefined, threads: [], funnels: false, visible: { lines: undefined, lineCount: 1 } };

  const svgNamespace = 'http://www.w3.org/2000/svg';

  /** strip is the strip at the left edge of the view that stands for the whole file. */
  const strip = document.createElement('div');
  strip.className = 'strip';
  strip.setAttribute('aria-hidden', 'true');

  /** funnels is the drawing of the funnels between the strip and the threads. */
  const funnels = document.createElementNS(svgNamespace, 'svg');
  funnels.setAttribute('class', 'funnels');
  funnels.setAttribute('aria-hidden', 'true');
  document.body.prepend(strip, funnels);

  /** stripWidth is the width of the strip in pixels, and funnelEnd the left edge of the threads, where a funnel ends. */
  const stripWidth = 6;
  const funnelEnd = 28;

  /** @type {number | undefined} */
  let frame;

  /**
   * editors holds the open editors by their keys: `new`, `answer:<thread>:<index>`, `reply:<thread>` for a reply to the
   * note, and `reply:<thread>:<index>` for a reply to an answer. @type {Map<string, Editor>}
   */
  const editors = new Map();

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
    const tabs = element('div', 'tabs', undefined, { role: 'tablist' });
    for (const [tab, name] of [
      ['write', 'Write'],
      ['preview', 'Preview'],
    ]) {
      tabs.append(
        button(
          name,
          'tab',
          () => {
            editor.tab = tab;
            if (tab === 'preview') {
              editor.preview = undefined;
              const request = ++count;
              requests.set(request, key);
              vscode.postMessage({ type: 'render', request, text: editor.text });
            }
            show(tab === 'write' ? key : undefined);
          },
          { role: 'tab', 'aria-selected': String(editor.tab === tab) },
        ),
      );
    }
    box.append(tabs);
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
    buttons.append(button(saveLabel, 'primary', () => send(key, message), pending), button('Cancel', 'secondary', () => close(key), pending));
    box.append(buttons);
    return box;
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
      actions.append(
        button('Reply', 'link', () => open(replyKey, ''), { 'aria-label': `Reply to the answer of ${answer.author || 'an unknown author'}` }),
        button('Edit', 'link', () => open(key, answer.body), { 'aria-label': `Edit the answer of ${answer.author || 'an unknown author'}` }),
        button('Delete', 'link', () => vscode.postMessage({ type: 'deleteAnswer', id: thread.id, index }), {
          'aria-label': `Delete the answer of ${answer.author || 'an unknown author'}`,
        }),
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
      'aria-label': `Note ${thread.number} at line ${thread.line + 1}`,
    });
    section.style.setProperty('--note-color', thread.color);
    // A click on the thread outside its buttons, links and editors selects its note, and the focus stays in the view.
    section.addEventListener('click', (event) => {
      if (!(event.target instanceof Element) || !event.target.closest('button, a, textarea, .editor')) {
        vscode.postMessage({ type: 'reveal', id: thread.id, focus: false });
      }
    });
    const header = element('div', 'thread-header');
    header.append(
      element('span', 'badge', String(thread.number), { title: `Note ${thread.number}` }),
      button(`Line ${thread.line + 1}`, 'link reveal', () => vscode.postMessage({ type: 'reveal', id: thread.id }), { title: 'Show the note in the text editor' }),
      button('Delete Thread', 'link delete', () => vscode.postMessage({ type: 'deleteNote', id: thread.id })),
    );
    section.append(header);
    thread.answers.forEach((answer, index) => section.append(answerOf(thread, answer, index)));
    const key = `reply:${thread.id}`;
    if (editors.has(key)) {
      section.append(editorOf(key, 'Text of the answer, in Markdown', 'Answer', (request, text) => ({ type: 'answer', request, id: thread.id, text, parent: 0 })));
    } else {
      section.append(button('Answer', 'secondary answer-button', () => open(key, '')));
    }
    return section;
  };

  /**
   * show shows the state and the open editors, and puts the focus back into the text field that had it.
   * @param {string} [focusKey] - The key of an editor whose text field gets the focus.
   */
  const show = (focusKey) => {
    const active = document.activeElement;
    const activeKey = active instanceof HTMLTextAreaElement ? active.closest('.editor')?.getAttribute('data-key') : undefined;
    const selection = active instanceof HTMLTextAreaElement ? [active.selectionStart, active.selectionEnd] : undefined;
    root.replaceChildren();
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
    if (state.file !== undefined) {
      if (editors.has('new')) {
        const lineText = state.line === undefined ? 'the start of the file' : `line ${state.line + 1}`;
        root.append(element('h2', 'new-title', `New note at ${lineText}`));
        root.append(editorOf('new', 'Text of the new note, in Markdown', 'Add Note', (request, text) => ({ type: 'add', request, text })));
      } else {
        root.append(button('Add Note', 'primary add', () => open('new', ''), { title: 'Add a note at the line of the cursor in the text editor' }));
      }
    }
    if (state.file === undefined) {
      root.append(element('p', 'hint', 'Open a Markdown file to see its notes.'));
    } else if (state.threads.length === 0) {
      root.append(element('p', 'hint', 'This file has no notes yet.'));
    }
    for (const thread of state.threads) {
      root.append(threadOf(thread));
    }
    drawLater();
    const key = focusKey ?? activeKey;
    const field = key ? root.querySelector(`.editor[data-key="${CSS.escape(key)}"] textarea`) : null;
    if (field instanceof HTMLTextAreaElement) {
      field.focus();
      if (!focusKey && selection) {
        field.setSelectionRange(selection[0], selection[1]);
      }
    }
  };

  /**
   * place returns the place of a line of the file in the strip, in pixels from the top of the view.
   * @param {number} line
   * @param {number} height - The height of the view.
   */
  const place = (line, height) => (line / Math.max(state.visible.lineCount, 1)) * height;

  /** draw draws the strip and the funnels, or removes them while the setting showFunnels is off. */
  const draw = () => {
    frame = undefined;
    const shown = state.funnels && state.file !== undefined;
    document.body.classList.toggle('with-funnels', shown);
    strip.replaceChildren();
    funnels.replaceChildren();
    if (!shown) {
      return;
    }
    const height = window.innerHeight;
    funnels.setAttribute('viewBox', `0 0 ${funnelEnd} ${height}`);
    if (state.visible.lines) {
      const [first, last] = state.visible.lines;
      const visible = element('div', 'visible');
      visible.style.top = `${place(first, height)}px`;
      visible.style.height = `${Math.max(place(last + 1, height) - place(first, height), 4)}px`;
      strip.append(visible);
    }
    for (const thread of state.threads) {
      const top = place(thread.mark[0], height);
      const bottom = Math.max(place(thread.mark[1] + 1, height), top + 3);
      const mark = element('div', `mark${thread.id === state.selected ? ' selected' : ''}`);
      mark.style.top = `${top}px`;
      mark.style.height = `${bottom - top}px`;
      mark.style.backgroundColor = thread.color;
      strip.append(mark);
      const section = root.querySelector(`.thread[data-id="${CSS.escape(thread.id)}"]`);
      const card = section?.getBoundingClientRect();
      if (!card || card.bottom <= 0 || card.top >= height) {
        continue;
      }
      // The funnel leads from the mark in the strip to the visible part of the thread, with curved sides.
      const cardTop = Math.max(card.top, 0);
      const cardBottom = Math.min(card.bottom, height);
      const middle = (stripWidth + funnelEnd) / 2;
      const path = document.createElementNS(svgNamespace, 'path');
      path.setAttribute(
        'd',
        `M ${stripWidth} ${top} C ${middle} ${top} ${middle} ${cardTop} ${funnelEnd} ${cardTop} L ${funnelEnd} ${cardBottom} C ${middle} ${cardBottom} ${middle} ${bottom} ${stripWidth} ${bottom} Z`,
      );
      path.setAttribute('class', thread.id === state.selected ? 'funnel selected' : 'funnel');
      path.setAttribute('fill', thread.color);
      funnels.append(path);
    }
  };

  /** drawLater draws the strip and the funnels before the next frame, once for several changes. */
  const drawLater = () => {
    if (frame === undefined) {
      frame = requestAnimationFrame(draw);
    }
  };

  /** scrollToSelected scrolls the selected thread into the view. */
  const scrollToSelected = () => {
    root.querySelector('.thread.selected')?.scrollIntoView({ block: 'nearest' });
  };

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
        if (((kind === 'answer' || (kind === 'reply' && index !== undefined)) && !thread?.answers[Number(index)]) || (kind === 'reply' && !thread)) {
          editors.delete(key);
        }
      }
      show();
      if (selectionChanged) {
        scrollToSelected();
      }
    } else if (message.type === 'visible') {
      state.visible = message.visible;
      drawLater();
    } else if (message.type === 'line') {
      state.line = message.line;
      const title = root.querySelector('.new-title');
      if (title) {
        title.textContent = `New note at line ${message.line + 1}`;
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

  window.addEventListener('scroll', drawLater, { passive: true });
  window.addEventListener('resize', drawLater);

  show();
  vscode.postMessage({ type: 'ready' });
})();
