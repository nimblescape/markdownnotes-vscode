// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The visual editor of an answer in the side view "Notes"
 * ([R-SIDE-004](../../docs/requirements.md#r-side-004)). It is the editor of the mode "Markdown Editor" of VS Code,
 * the package `@vscode/markdown-editor`: it shows the Markdown text rendered, and the block with the cursor with its
 * Markdown marks, and it changes the text only where the user types, so that the rest of the text stays as the file
 * holds it. A toolbar and the keys Ctrl+B, Ctrl+I and Ctrl+E put bold, italic and code around the selected text.
 *
 * The bundle `dist/visualEditor.js` runs in the page of the side view before the script of the view
 * (media/notesView.js), and gives it the function `nimblescapeVisualEditor.create`. The script keeps one editor for
 * each open editor of an answer, and moves its element into the page each time it shows the view again.
 */

import { EditorController, EditorModel, EditorView, LocalHistoryStrategy, OffsetRange, Selection, StringEdit, StringValue } from '@vscode/markdown-editor';
import { autorun, constObservable } from '@vscode/observables';
import { type Change, type Inline, link, toggleBlock, toggleInline } from './markup';

/** Options are the callbacks of a visual editor to the script of the view. */
export interface Options {
  /** label is the name of the editor for a screen reader. */
  readonly label: string;
  /** changed gets the text after each change of the user. */
  readonly changed: (text: string) => void;
  /** save saves the text: Ctrl+Enter. */
  readonly save: () => void;
  /** cancel drops the change: Escape. */
  readonly cancel: () => void;
  /** open opens a link of the text, as a click on a link of a rendered text of the view does. */
  readonly open: (href: string) => void;
  /** button creates a button of the toolbar, with the icon and the tooltip of the view. */
  readonly button: (icon: string, tooltip: string, action: () => void) => HTMLElement;
}

/** VisualEditor is a visual editor of a Markdown text. */
export interface VisualEditor {
  /** element is the element of the editor with its toolbar. */
  readonly element: HTMLElement;
  /** text returns the Markdown text of the editor. */
  readonly text: () => string;
  /** focus puts the focus into the editor. */
  readonly focus: () => void;
  /** dispose removes the editor. */
  readonly dispose: () => void;
}

/** tools are the buttons of the toolbar: the icon, the tooltip and the change of each. */
const tools: readonly (readonly [string, string, (text: string, start: number, end: number) => Change])[] = [
  ['bold', 'Bold (Ctrl+B)', (text, start, end) => toggleInline(text, start, end, 'bold')],
  ['italic', 'Italic (Ctrl+I)', (text, start, end) => toggleInline(text, start, end, 'italic')],
  ['code', 'Code (Ctrl+E)', (text, start, end) => toggleInline(text, start, end, 'code')],
  ['link', 'Link (Ctrl+K)', link],
  ['list-unordered', 'List', (text, start, end) => toggleBlock(text, start, end, 'bullets')],
  ['list-ordered', 'Numbered List', (text, start, end) => toggleBlock(text, start, end, 'numbers')],
  ['quote', 'Quote', (text, start, end) => toggleBlock(text, start, end, 'quote')],
];

/** keys are the inline marks of the keys with Ctrl (or Cmd on macOS), and `k` for a link. */
const keys: Record<string, Inline | 'link'> = { b: 'bold', i: 'italic', e: 'code', k: 'link' };

/**
 * create creates a visual editor of a Markdown text.
 * @param text - The Markdown text.
 * @param options - The callbacks to the script of the view.
 */
const create = (text: string, options: Options): VisualEditor => {
  const model = new EditorModel();
  model.sourceText.set(new StringValue(text), undefined);
  const view = new EditorView(model, {
    classNames: ['md-theme-vscode-default'],
    showReadonlyToggle: false,
    // The editor takes the width of the view, which is narrower than the width that the editor limits a text to.
    limitedWidth: constObservable(undefined),
    onOpenLink: (url) => options.open(url),
  });
  const history = new LocalHistoryStrategy(model);
  const controller = new EditorController(model, view, { historyStrategy: history, find: false });

  /**
   * apply applies a change of the toolbar or of a key to the text, as one step of Undo.
   * @param change - The change of the text at the selection.
   */
  const apply = (change: (text: string, start: number, end: number) => Change): void => {
    const source = model.sourceText.get().value;
    const range = model.selection.get()?.range ?? OffsetRange.emptyAt(source.length);
    const result = change(source, range.start, range.endExclusive);
    const edit = StringEdit.replace(OffsetRange.fromTo(result.start, result.end), result.text);
    history.record(() => model.applyEdit(edit, new Selection(result.selectionStart, result.selectionEnd)), edit);
    view.focus();
  };

  const toolbar = document.createElement('div');
  toolbar.className = 'visual-toolbar';
  toolbar.setAttribute('role', 'toolbar');
  toolbar.setAttribute('aria-label', 'Formatting');
  for (const [icon, tooltip, change] of tools) {
    const button = options.button(icon, tooltip, () => apply(change));
    // A press of a button keeps the focus and the selection in the editor.
    button.addEventListener('mousedown', (event) => event.preventDefault());
    toolbar.append(button);
  }

  const element = document.createElement('div');
  element.className = 'visual';
  view.element.setAttribute('aria-label', options.label);
  element.append(toolbar, view.element);

  // The keys of the editor run before the keys of the editor of VS Code, and do not go on to the window of the view,
  // which hands each key to VS Code: Ctrl+B there would also show or hide the side bar of VS Code.
  view.element.addEventListener(
    'keydown',
    (event) => {
      const control = event.ctrlKey || event.metaKey;
      const mark = control && !event.altKey && !event.shiftKey ? keys[event.key.toLowerCase()] : undefined;
      if (control && event.key === 'Enter') {
        options.save();
      } else if (event.key === 'Escape' && !control) {
        options.cancel();
      } else if (mark === 'link') {
        apply(link);
      } else if (mark) {
        apply((source, start, end) => toggleInline(source, start, end, mark));
      } else {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );

  let last = text;
  const changes = autorun((reader) => {
    const value = model.sourceText.read(reader).value;
    if (value !== last) {
      last = value;
      options.changed(value);
    }
  });

  return {
    element,
    text: () => model.sourceText.get().value,
    focus: () => view.focus(),
    dispose: () => {
      changes.dispose();
      controller.dispose();
      view.dispose();
      element.remove();
    },
  };
};

declare global {
  interface Window {
    nimblescapeVisualEditor: { readonly create: typeof create };
  }
}

window.nimblescapeVisualEditor = { create };
