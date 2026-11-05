// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The visual editor of an answer, a new note or a footnote in the side view "Notes"
 * ([R-SIDE-004](../../docs/requirements.md#r-side-004)). It is the editor of rendered Markdown of nimblescape Markdown,
 * the npm package `@nimblescape/markdowneditor`: it shows the Markdown text rendered and changes only the text of the
 * blocks that the user changes, so that the rest of the text stays as the file holds it. Its toolbar, its format bar
 * over the selected text, its slash commands and its keys, for example Ctrl+B, are those of the editor.
 *
 * The bundle `dist/visualEditor.js` runs in the page of the side view before the script of the view
 * (media/notesView.js), and gives it the function `nimblescapeVisualEditor.create`. The script keeps one editor for
 * each open editor of an answer, and moves its element into the page each time it shows the view again.
 */

import { MarkdownEditor } from '@nimblescape/markdowneditor';

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
  /** open opens a link of the text, as a click on a link of a rendered text of the view does: Ctrl+Click. */
  readonly open: (href: string) => void;
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

/**
 * styleNonce is the nonce of the scripts of the page, which the policy of the page also allows for style elements: the
 * editor gives it to the style elements that it adds, the base styles of Tiptap. The script reads it while the page
 * runs it.
 */
const styleNonce = document.currentScript instanceof HTMLScriptElement ? document.currentScript.nonce : undefined;

/** inField is true for an event in a field of the editor, for example the field of the address of a link. */
const inField = (event: Event): boolean => event.target instanceof Element && event.target.closest('input, textarea, select') !== null;

/** isUndoRedo is true for the keys of Undo and Redo: Ctrl or Cmd with Z or Y. */
const isUndoRedo = (event: KeyboardEvent): boolean => (event.ctrlKey || event.metaKey) && ['z', 'y'].includes(event.key.toLowerCase());

/**
 * create creates a visual editor of a Markdown text.
 * @param text - The Markdown text.
 * @param options - The callbacks to the script of the view.
 */
const create = (text: string, options: Options): VisualEditor => {
  const element = document.createElement('div');
  element.className = 'visual';
  const editor = new MarkdownEditor(element, {
    markdown: text,
    // An answer is a part of a file: it has no front matter, and the side view edits it.
    frontMatterForm: false,
    readOnlyToggle: false,
    threadIcons: false,
    ...(styleNonce ? { styleNonce } : {}),
    onChange: (changed) => options.changed(changed.getMarkdown()),
  });
  editor.tiptap.view.dom.setAttribute('aria-label', options.label);

  // Ctrl+Enter saves before the editor gets the key, which would add a line break; in a field of the editor, the field
  // keeps the key.
  element.addEventListener(
    'keydown',
    (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !inField(event)) {
        event.preventDefault();
        event.stopPropagation();
        options.save();
      }
    },
    true,
  );
  // Escape that no menu or field of the editor took cancels the editor. A key that the editor handled, and Undo and
  // Redo, do not go on to the window of the view, which hands each key to VS Code: Ctrl+B there would also show or
  // hide the side bar of VS Code.
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !event.defaultPrevented && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      options.cancel();
    }
    if (event.defaultPrevented || isUndoRedo(event)) {
      event.stopPropagation();
    }
  });
  // Ctrl+Click (Cmd+Click on macOS) on a link opens it; a click puts the cursor into the link.
  element.addEventListener(
    'click',
    (event) => {
      const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (link && element.contains(link) && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        event.stopPropagation();
        options.open(link.getAttribute('href') ?? '');
      }
    },
    true,
  );

  return {
    element,
    text: () => editor.getMarkdown(),
    focus: () => editor.tiptap.commands.focus(),
    dispose: () => {
      editor.destroy();
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
