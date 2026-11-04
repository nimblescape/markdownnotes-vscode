// @vitest-environment happy-dom
// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The tests of the plugin of the figures, the tables, the listings and the references for the editor of nimblescape
// Markdown (src/webview/figuresPlugin.ts), beside the values of the front matter in the text, which every editor of
// nimblescape Markdown has: the markup keeps its text byte for byte and is hidden, the parts that the formatter writes
// are read-only (R-TEXT-010), the guard keeps the anchors and the comments of the listings, and the renderer keeps only
// the anchors.

import { undo } from '@tiptap/pm/history';
import { TextSelection } from '@tiptap/pm/state';
import { createMarkdownIt, frontMatterValuesPlugin, MarkdownEditor, valueNodeName } from '@nimblescape/markdowneditor';
import { TextSource } from '@nimblescape/markdowntext';
import { afterEach, describe, expect, it } from 'vitest';
import { analysisOf, extendMarkdownIt, figuresPlugin, nodeNames } from './figuresPlugin';
import { notesPlugin } from './notesPlugin';

let editors: MarkdownEditor[] = [];
afterEach(() => {
  editors.forEach((editor) => editor.destroy());
  editors = [];
  document.body.replaceChildren();
  document.head.querySelectorAll('style[data-nsmd-plugin]').forEach((style) => style.remove());
});

/** open returns an editor with a text, the plugin of the figures and the plugin of the notes. */
function open(markdown: string, source?: TextSource): MarkdownEditor {
  const element = document.createElement('div');
  document.body.append(element);
  const editor = new MarkdownEditor(element, { ...(source ? { source } : { markdown }), plugins: [notesPlugin, figuresPlugin] });
  editors.push(editor);
  return editor;
}

/** positionOf returns the position of the document before a text, or after it with `after`. */
function positionOf(editor: MarkdownEditor, text: string, after = false): number {
  let found = -1;
  editor.tiptap.state.doc.descendants((node, pos) => {
    if (found < 0 && node.isText && node.text!.includes(text)) {
      found = pos + node.text!.indexOf(text) + (after ? text.length : 0);
    }
    return found < 0;
  });
  if (found < 0) {
    throw new Error(`No text ${text}`);
  }
  return found;
}

/** select puts the cursor or the selection at positions of the document. */
function select(editor: MarkdownEditor, from: number, to = from): void {
  const { view } = editor.tiptap;
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, from, to)));
}

/** type types a text at the cursor, as the browser does. */
function type(editor: MarkdownEditor, text: string): void {
  const { view } = editor.tiptap;
  for (const character of text) {
    const { from, to } = view.state.selection;
    const used = view.someProp('handleTextInput', (handle) => handle(view, from, to, character, () => view.state.tr.insertText(character, from, to)));
    if (!used) {
      view.dispatch(view.state.tr.insertText(character, from, to));
    }
  }
}

/** key sends a key to the editor as the browser does, and returns true when the editor used it. */
function key(editor: MarkdownEditor, name: string): boolean {
  const { view } = editor.tiptap;
  return view.someProp('handleKeyDown', (handle) => handle(view, new KeyboardEvent('keydown', { key: name }))) ?? false;
}

/** generatedTexts returns the texts of the generated parts of an editor, in their order. */
function generatedTexts(editor: MarkdownEditor): string[] {
  const doc = editor.tiptap.state.doc;
  return analysisOf(doc).parts.map((part) => doc.textBetween(part.from, part.to, '\n'));
}

/** text is a paper with a value of the front matter, a figure, a table, a listing, references and two chapters. */
const text = [
  '---',
  'title: The study of agents',
  '---',
  '',
  '# Thesis',
  '',
  '## Introduction',
  '',
  'The title is <wbr><!--{title}-->The study of agents<!--{/title}-->, by <wbr><!--{author}-->Ann<!--{/author}-->.',
  'See [Figure 1](#fig-plan-study), [Table 1](#tab-grades), [Listing 1](#lst-reading-fields), [Chapter 2](#methods) and [the plan](#fig-plan-study).',
  '',
  'Figure 1: Plan of the study<a id="fig-plan-study"></a>',
  '',
  '![Plan](plan.png)',
  '',
  'Table 1: Grades<a id="tab-grades"></a>',
  '',
  '| A | B |',
  '| --- | --- |',
  '| 1 | 2 |',
  '',
  '## Methods',
  '',
  'Listing 1: [Reading the fields](../src/fields.ts#L12-L30) (fields.ts, L12-L30)<a id="lst-reading-fields"></a>',
  '',
  '<!-- listing: ../src/fields.ts#read -->',
  '```ts',
  'const a = 1;',
  '```',
  '',
  'Text after.',
  '',
].join('\n');

describe('the markup', () => {
  it('keeps the text of the file byte for byte, also after an edit of another block', () => {
    const editor = open(text);
    expect(editor.getMarkdown()).toBe(text);
    select(editor, positionOf(editor, 'after.'));
    type(editor, 'new ');
    expect(editor.getMarkdown()).toBe(text.replace('Text after.', 'Text new after.'));
  });

  it('hides the anchors, the markers of the values and the comment of the listing', () => {
    const editor = open(text);
    const names: string[] = [];
    editor.tiptap.state.doc.descendants((node) => {
      names.push(node.type.name);
      return true;
    });
    expect(names.filter((name) => name === nodeNames.anchor)).toHaveLength(3);
    expect(names.filter((name) => name === valueNodeName)).toHaveLength(4);
    expect(names.filter((name) => name === nodeNames.listing)).toHaveLength(1);
    expect(names).not.toContain('htmlInline');
    expect(names).not.toContain('htmlBlock');
    const shown = document.body.textContent ?? '';
    for (const markup of ['<a id', '<!--{', 'listing:', '<wbr>']) {
      expect(shown).not.toContain(markup);
    }
    expect(shown).toContain('Plan of the study');
  });

  it('keeps a lone marker or another anchor as HTML', () => {
    const lone = 'A <!--{title}--> marker and <a id="x"></a> a link.\n';
    const editor = open(lone);
    expect(editor.getMarkdown()).toBe(lone);
    expect(editor.tiptap.state.doc.firstChild!.content.content.map((node) => node.type.name)).toContain('htmlInline');
  });
});

describe('the generated parts', () => {
  it('are the numbers of the captions, the references, the code and the cite of the listing, beside the values of the front matter that it has', () => {
    const editor = open(text);
    expect(generatedTexts(editor)).toEqual([
      'Figure 1',
      'Table 1',
      'Listing 1',
      'Chapter 2',
      '1',
      '1',
      '1',
      '(fields.ts, L12-L30)',
      'const a = 1;',
    ]);
    // The editor makes the value of the title read-only. "Ann" has no key in the front matter, and "the plan" has no
    // number: the user writes them.
    const shown = [...document.querySelectorAll('.nsmd-generated')].map((part) => part.textContent);
    expect(shown).toContain('The study of agents');
    expect(shown).not.toContain('Ann');
    expect(document.querySelector('.nsmd-generated-block')?.textContent).toBe('const a = 1;');
  });

  it('take a section by its GitHub ID only with a word such as "Chapter", and no title above the chapters', () => {
    const editor = open('# Title\n\n## One\n\n## Two\n\nSee [Chapter 1](#two), [Step 2](#two), [Chapter 1](#title) and [Kapitel 2](#two-1).\n\n## Two\n');
    expect(generatedTexts(editor)).toEqual(['Chapter 1', 'Kapitel 2']);
  });

  it('drop typing in a part, and let the user edit the text of a caption', () => {
    const editor = open(text);
    const { view } = editor.tiptap;
    for (const inside of [positionOf(editor, 'Table 1') + 3, positionOf(editor, 'study of agents') + 3, positionOf(editor, 'const a') + 2, positionOf(editor, 'L12-L30)') + 1]) {
      view.dispatch(view.state.tr.insertText('x', inside));
    }
    expect(editor.getMarkdown()).toBe(text);
    // A cursor in a part goes to its edge, where typed text stays out of the part.
    select(editor, positionOf(editor, 'Table 1') + 3);
    expect(view.state.selection.head).toBe(positionOf(editor, 'Table 1'));
    select(editor, positionOf(editor, 'Plan of the study') + 'Plan of the '.length);
    type(editor, 'new ');
    expect(editor.getMarkdown()).toBe(text.replace('Plan of the study<a', 'Plan of the new study<a'));
  });

  it('go to the target of a reference with Ctrl+click', () => {
    const editor = open(text);
    const { view } = editor.tiptap;
    view.someProp('handleClick', (handle) => handle(view, positionOf(editor, 'Chapter 2') + 2, new MouseEvent('click', { ctrlKey: true })));
    expect(view.state.selection.$head.parent.textContent).toBe('Methods');
    view.someProp('handleClick', (handle) => handle(view, positionOf(editor, 'Table 1') + 2, new MouseEvent('click', { ctrlKey: true })));
    expect(view.state.selection.$head.parent.textContent).toBe('Table 1: Grades');
  });

  it('come again after the formatter writes new numbers from outside', () => {
    const source = new TextSource(text);
    const editor = open('', source);
    const moved = text.replace('Table 1: Grades', 'Table 2: Grades').replace('[Table 1](#tab-grades)', '[Table 2](#tab-grades)');
    source.setText(moved, { kind: 'program', name: 'formatter' });
    expect(editor.getMarkdown()).toBe(moved);
    expect(generatedTexts(editor)).toContain('Table 2');
  });
});

describe('the guard', () => {
  it('puts text typed at the end of a caption before its anchor, and Enter there keeps the anchor in the caption', () => {
    const editor = open(text);
    const caption = positionOf(editor, 'Plan of the study', true);
    select(editor, caption + 1);
    type(editor, '!');
    expect(editor.getMarkdown()).toBe(text.replace('study<a id="fig-plan-study">', 'study!<a id="fig-plan-study">'));
    expect(key(editor, 'Enter')).toBe(true);
    type(editor, 'Next');
    expect(editor.getMarkdown()).toContain('Figure 1: Plan of the study!<a id="fig-plan-study"></a>\n\nNext\n');
  });

  it('jumps over an anchor with Backspace, and deletes a whole value of the front matter', () => {
    const editor = open(text);
    const { view } = editor.tiptap;
    // The key moves the cursor before the anchor, and the browser deletes the character before it.
    select(editor, positionOf(editor, 'Grades', true) + 1);
    key(editor, 'Backspace');
    expect(view.state.selection.head).toBe(positionOf(editor, 'Grades', true));
    // The end of the value of the title, after its end marker.
    select(editor, positionOf(editor, 'The study of agents', true) + 1);
    expect(key(editor, 'Backspace')).toBe(true);
    expect(editor.getMarkdown()).toContain('The title is , by <wbr><!--{author}-->Ann<!--{/author}-->.');
  });

  it('keeps the anchor at the end of a caption whose text the user replaces', () => {
    const editor = open(text);
    const start = positionOf(editor, 'Plan of the study');
    const end = editor.tiptap.state.doc.resolve(start).end();
    select(editor, start, end);
    type(editor, 'Steps');
    expect(editor.getMarkdown()).toContain('\nFigure 1: Steps<a id="fig-plan-study"></a>\n');
  });

  it('deletes the comment of a listing with its code block', () => {
    const editor = open(text);
    select(editor, positionOf(editor, 'Text after.'));
    expect(key(editor, 'Backspace')).toBe(true);
    expect(editor.getMarkdown()).toContain('(fields.ts, L12-L30)<a id="lst-reading-fields"></a>\n\nText after.\n');
    expect(editor.getMarkdown()).not.toContain('listing:');
    undo(editor.tiptap.state, editor.tiptap.view.dispatch);
    expect(editor.getMarkdown()).toBe(text);
  });
});

describe('the renderer', () => {
  it('keeps the anchors and leaves out the markers and the comments of the listings', () => {
    const html = createMarkdownIt([extendMarkdownIt, (md) => frontMatterValuesPlugin.extendMarkdownIt?.(md)]).render(text);
    expect(html).toContain('<p>Figure 1: Plan of the study<a id="fig-plan-study"></a></p>');
    expect(html).toContain('The title is The study of agents, by Ann.');
    expect(html).not.toContain('<!--');
    expect(html).toContain('<code class="language-ts">const a = 1;\n</code>');
  });
});
