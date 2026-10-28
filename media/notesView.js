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
// the HTML, as the Markdown preview of VS Code does.

(() => {
  'use strict';

  const vscode = acquireVsCodeApi();
  const root = document.getElementById('notes');

  /**
   * @typedef {{ author: string, date: string, body: string, html: string }} AnswerState
   * @typedef {{ id: string, line: number, kind: 'block' | 'inline', nested: boolean, answers: AnswerState[] }} ThreadState
   * @typedef {{ file: string | undefined, line: number | undefined, account: string | undefined, selected: string | undefined, threads: ThreadState[] }} State
   * @typedef {{ text: string, tab: 'write' | 'preview', preview: string | undefined, problem: string | undefined, request: number | undefined }} Editor
   */

  /** @type {State} */
  let state = { file: undefined, line: undefined, account: undefined, selected: undefined, threads: [] };

  /** editors holds the open editors by their keys: `new`, `answer:<thread>:<index>` and `reply:<thread>`. @type {Map<string, Editor>} */
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
    const article = element('article', 'answer');
    const header = element('div', 'answer-header');
    header.append(element('span', 'author', answer.author || 'Unknown author'));
    if (answer.date) {
      header.append(element('span', 'date', answer.date));
    }
    if (!editors.has(key)) {
      const actions = element('span', 'actions');
      actions.append(
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
    const header = element('div', 'thread-header');
    header.append(
      button(`Line ${thread.line + 1}`, 'link reveal', () => vscode.postMessage({ type: 'reveal', id: thread.id }), { title: 'Show the note in the text editor' }),
      element('span', 'kind', thread.kind === 'inline' ? 'inline note' : 'note'),
      button('Delete Thread', 'link delete', () => vscode.postMessage({ type: 'deleteNote', id: thread.id })),
    );
    section.append(header);
    if (thread.nested) {
      section.append(element('p', 'problem', 'This note contains the start of another comment, "<!--". Remove it in the text editor.'));
    }
    thread.answers.forEach((answer, index) => section.append(answerOf(thread, answer, index)));
    const key = `reply:${thread.id}`;
    if (editors.has(key)) {
      section.append(editorOf(key, 'Text of the answer, in Markdown', 'Answer', (request, text) => ({ type: 'answer', request, id: thread.id, text })));
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
    const key = focusKey ?? activeKey;
    const field = key ? root.querySelector(`.editor[data-key="${CSS.escape(key)}"] textarea`) : null;
    if (field instanceof HTMLTextAreaElement) {
      field.focus();
      if (!focusKey && selection) {
        field.setSelectionRange(selection[0], selection[1]);
      }
    }
  };

  /** scrollToSelected scrolls the selected thread into the view. */
  const scrollToSelected = () => {
    root.querySelector('.thread.selected')?.scrollIntoView({ block: 'nearest' });
  };

  window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.type === 'state') {
      const selectionChanged = message.selected !== state.selected;
      state = message;
      // The editors of threads and answers that the file no longer holds close.
      for (const key of [...editors.keys()]) {
        const [kind, id, index] = key.split(':');
        const thread = state.threads.find((candidate) => candidate.id === id);
        if ((kind === 'answer' && !thread?.answers[Number(index)]) || (kind === 'reply' && !thread)) {
          editors.delete(key);
        }
      }
      show();
      if (selectionChanged) {
        scrollToSelected();
      }
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

  show();
  vscode.postMessage({ type: 'ready' });
})();
