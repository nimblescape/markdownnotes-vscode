// @vitest-environment happy-dom
// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The tests of the plugin of Notes for the editor of nimblescape Markdown (src/webview/notesPlugin.ts): the notes keep
// their text byte for byte, their markup is hidden, their highlights show in their colors, the guard keeps every note
// at its text (R-TEXT-009), and the renderer removes the notes.

import { undo } from '@tiptap/pm/history';
import { TextSelection } from '@tiptap/pm/state';
import { createMarkdownIt, MarkdownEditor } from '@nimblescape/markdowneditor';
import { TextSource } from '@nimblescape/markdowntext';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PageMessage } from '../notes/editorMessages';
import { doctypeLines } from '../notes/doctype';
import { figuresPlugin } from './figuresPlugin';
import { addNote, createNotesPlugin, extendMarkdownIt, noteAt, nodeNames, notesPlugin, partsOf } from './notesPlugin';

let editors: MarkdownEditor[] = [];
afterEach(() => {
  editors.forEach((editor) => editor.destroy());
  editors = [];
  document.body.replaceChildren();
  document.head.querySelectorAll('style[data-nsmd-plugin]').forEach((style) => style.remove());
});

/** open returns an editor with a text and the plugin of Notes. */
function open(markdown: string, source?: TextSource): MarkdownEditor {
  const element = document.createElement('div');
  document.body.append(element);
  const editor = new MarkdownEditor(element, { ...(source ? { source } : { markdown }), plugins: [notesPlugin] });
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

/** deleteRange deletes a range of the document as the user does. */
function deleteRange(editor: MarkdownEditor, from: number, to: number): void {
  const { view } = editor.tiptap;
  view.dispatch(view.state.tr.delete(from, to));
}

const doctype = doctypeLines.join('\n');

/** text is a file with the comment of the format and two notes, one with a color. */
const text = [
  doctype,
  '',
  '# Title',
  '',
  'The agents <wbr><!--[note-7k2q-->change the work[^note-7k2q] of teams.',
  '',
  '[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00',
  '',
  '    Which teams?',
  '',
  '    > **anna** · 2026-10-28 11:02+01:00',
  '    >',
  '    > The teams of the plan.',
  '',
  '<wbr><!--[note-p3x9 green-->Each team[^note-p3x9] has a plan.',
  '',
  '[^note-p3x9]: **anna** · 2026-10-28 11:05+01:00',
  '',
  '    All teams?',
  '',
].join('\n');

/** hiddenText is a file whose note is in the hidden form. */
const hiddenText = [
  'A text <wbr><!--[note-ab12-->with a note<!--note-ab12]--> here.',
  '',
  '<!--',
  '[^note-ab12]: **hannes** · 2026-10-28 10:15+01:00',
  '',
  '    Is this --\\> right?',
  '-->',
  '',
].join('\n');

describe('the markup of the notes', () => {
  it('keeps the text of a file with notes byte for byte', () => {
    expect(open(text).getMarkdown()).toBe(text);
    expect(open(hiddenText).getMarkdown()).toBe(hiddenText);
  });

  it('reads the start markers, the references, the definitions and the comment of the format as nodes of their own', () => {
    const editor = open(text);
    const parts = partsOf(editor.tiptap.state.doc);
    expect([...parts.markers.keys()]).toEqual(['note-7k2q', 'note-p3x9']);
    expect([...parts.references.keys()]).toEqual(['note-7k2q', 'note-p3x9']);
    expect([...parts.definitions.keys()]).toEqual(['note-7k2q', 'note-p3x9']);
    expect(parts.formats).toHaveLength(1);
    expect(parts.markers.get('note-p3x9')!.node.attrs.color).toBe('green');
    const lines = text.split('\n');
    const start = lines.indexOf('[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00');
    expect(parts.definitions.get('note-7k2q')!.node.attrs.text).toBe(lines.slice(start, start + 7).join('\n'));
  });

  it('reads the hidden form, with the end marker in place of the reference', () => {
    const editor = open(hiddenText);
    const parts = partsOf(editor.tiptap.state.doc);
    expect(parts.references.get('note-ab12')!.node.attrs.hidden).toBe(true);
    expect(parts.definitions.get('note-ab12')!.node.attrs.text).toBe(hiddenText.split('\n').slice(2, 7).join('\n'));
  });

  it('hides the markup of the notes and shows the text alone', () => {
    const editor = open(text);
    const dom = editor.tiptap.view.dom as HTMLElement;
    expect(dom.querySelectorAll('.nsmd-notes-hidden')).toHaveLength(3);
    expect(dom.textContent).not.toContain('note-');
    expect(dom.textContent).not.toContain('hannes');
    expect(dom.querySelector('p')!.textContent).toBe('The agents change the work of teams.');
  });

  it('writes a changed paragraph with its notes as the file has them', () => {
    const editor = open(text);
    select(editor, positionOf(editor, 'agents'), positionOf(editor, 'agents', true));
    type(editor, 'people');
    expect(editor.getMarkdown()).toBe(text.replace('The agents', 'The people'));
    select(editor, positionOf(editor, 'has a plan.', true));
    type(editor, '!');
    expect(editor.getMarkdown()).toBe(text.replace('The agents', 'The people').replace('has a plan.', 'has a plan.!'));
  });

  it('writes the end marker of the hidden form in a changed paragraph', () => {
    const editor = open(hiddenText);
    select(editor, positionOf(editor, ' here.', true));
    type(editor, '!');
    expect(editor.getMarkdown()).toBe(hiddenText.replace(' here.', ' here.!'));
  });
});

describe('the highlights', () => {
  it('shows the highlight of each note in its color', () => {
    const editor = open(text);
    const dom = editor.tiptap.view.dom as HTMLElement;
    const first = [...dom.querySelectorAll('[data-note="note-7k2q"].nsmd-note')].map((element) => element.textContent).join('');
    expect(first).toBe('change the work');
    expect(dom.querySelector('[data-note="note-p3x9"].nsmd-note')!.className).toContain('nsmd-note-1');
    expect(document.head.querySelector('style[data-nsmd-plugin="notes"]')!.textContent).toContain('.nsmd-notes-hidden { display: none; }');
  });

  it('shows the selected note strong and the others faint, and hides the others with the highlights', () => {
    const editor = open(text);
    const dom = editor.tiptap.view.dom as HTMLElement;
    expect(editor.runCommand('notes.select', 'note-p3x9')).toBe(true);
    expect(dom.querySelector('[data-note="note-p3x9"].nsmd-note')!.className).toContain('nsmd-note-strong');
    expect(dom.querySelector('[data-note="note-7k2q"].nsmd-note')!.className).toContain('nsmd-note-faint');
    editor.runCommand('notes.showHighlights', false);
    expect(dom.querySelector('[data-note="note-7k2q"].nsmd-note')).toBeNull();
    expect(dom.querySelector('[data-note="note-p3x9"].nsmd-note')).not.toBeNull();
    editor.runCommand('notes.select');
    expect(dom.querySelector('.nsmd-note')).toBeNull();
  });

  it('finds the note at a position', () => {
    const editor = open(text);
    const doc = editor.tiptap.state.doc;
    expect(noteAt(doc, positionOf(editor, 'the work'))).toBe('note-7k2q');
    expect(noteAt(doc, positionOf(editor, 'of teams'))).toBeUndefined();
  });
});

describe('the guard of the notes', () => {
  it('keeps a note whose whole text goes as a point', () => {
    const editor = open(text);
    deleteRange(editor, positionOf(editor, 'agents'), positionOf(editor, 'of teams', true));
    expect(editor.getMarkdown()).toBe(text.replace('agents <wbr><!--[note-7k2q-->change the work[^note-7k2q] of teams', '<wbr><!--[note-7k2q-->[^note-7k2q]'));
    expect(editor.tiptap.view.dom.querySelector('.nsmd-note-point[data-note="note-7k2q"]')).not.toBeNull();
  });

  it('keeps the start marker when the first word of a highlight is replaced, and the text in the highlight', () => {
    const editor = open(text);
    select(editor, positionOf(editor, 'agents ', true) - 1, positionOf(editor, 'change', true));
    type(editor, 'X');
    expect(editor.getMarkdown()).toBe(text.replace('agents <wbr><!--[note-7k2q-->change the work', 'agents<wbr><!--[note-7k2q-->X the work'));
  });

  it('keeps the reference when the last word of a highlight is replaced, and the text in the highlight', () => {
    const editor = open(text);
    select(editor, positionOf(editor, 'work'), positionOf(editor, 'work', true) + 2);
    type(editor, 'job');
    expect(editor.getMarkdown()).toBe(text.replace('work[^note-7k2q] of', 'job[^note-7k2q]of'));
  });

  it('keeps the letters that replace the last word of a highlight in it', () => {
    const editor = open(text);
    select(editor, positionOf(editor, 'work'), positionOf(editor, 'work', true));
    type(editor, 'job');
    expect(editor.getMarkdown()).toContain('change the job[^note-7k2q] of teams.');
    select(editor, positionOf(editor, 'of teams'));
    select(editor, positionOf(editor, 'job', true));
    type(editor, 's');
    expect(editor.getMarkdown()).toContain('change the job[^note-7k2q]s of teams.');
  });

  it('deletes the character beyond the hidden markup with Backspace and Delete', () => {
    const editor = open(text);
    select(editor, positionOf(editor, 'change'));
    expect(key(editor, 'Backspace')).toBe(false);
    expect(editor.tiptap.state.selection.from).toBe(positionOf(editor, 'change') - 1);
    select(editor, positionOf(editor, 'the work', true));
    expect(key(editor, 'Delete')).toBe(false);
    expect(editor.tiptap.state.selection.from).toBe(positionOf(editor, ' of teams'));
  });

  it('puts back a definition that a deleted text took after the block of its reference', () => {
    const editor = open(text);
    deleteRange(editor, positionOf(editor, 'teams.', true) - 1, positionOf(editor, 'Each') - 1);
    const markdown = editor.getMarkdown();
    expect(markdown).toContain('of teams<wbr><!--[note-p3x9 green-->Each team[^note-p3x9] has a plan.');
    expect(markdown).toContain('[^note-7k2q]: **hannes**');
    expect(markdown.indexOf('[^note-7k2q]: **hannes**')).toBeGreaterThan(markdown.indexOf('has a plan.'));
    expect(partsOf(editor.tiptap.state.doc).definitions.size).toBe(2);
  });

  it('puts back the comment of the format', () => {
    const editor = open(text);
    const { view } = editor.tiptap;
    view.dispatch(view.state.tr.delete(0, view.state.doc.content.size));
    const markdown = editor.getMarkdown();
    expect(markdown.startsWith(doctype)).toBe(true);
    expect(partsOf(editor.tiptap.state.doc).definitions.size).toBe(2);
    expect(partsOf(editor.tiptap.state.doc).markers.size).toBe(2);
  });

  it('puts text typed at the start or the end of a highlight outside of it', () => {
    const editor = open(text);
    select(editor, positionOf(editor, 'change'));
    type(editor, 'A');
    select(editor, positionOf(editor, 'the work', true));
    type(editor, 'B');
    expect(editor.getMarkdown()).toBe(text.replace('<wbr><!--[note-7k2q-->change the work[^note-7k2q] of', 'A<wbr><!--[note-7k2q-->change the work[^note-7k2q]B of'));
  });

  it('keeps text typed inside a highlight in it', () => {
    const editor = open(text);
    select(editor, positionOf(editor, ' the work'));
    type(editor, 's');
    expect(editor.getMarkdown()).toContain('<wbr><!--[note-7k2q-->changes the work[^note-7k2q]');
  });

  it('ends a highlight before a paragraph break inside it, and moves its definition after its block', () => {
    const editor = open(text);
    select(editor, positionOf(editor, 'the work'));
    expect(key(editor, 'Enter')).toBe(true);
    const markdown = editor.getMarkdown();
    expect(markdown).toContain('The agents <wbr><!--[note-7k2q-->change [^note-7k2q]\n\n[^note-7k2q]: **hannes**');
    expect(markdown).toContain('    > The teams of the plan.\n\nthe work of teams.');
    expect(editor.tiptap.state.selection.$from.parent.textContent).toBe('the work of teams.');
  });

  it('moves the start marker after a paragraph break at the start of a highlight', () => {
    const editor = open(text);
    select(editor, positionOf(editor, 'change'));
    expect(key(editor, 'Enter')).toBe(true);
    expect(editor.getMarkdown()).toContain('The agents \n\n<wbr><!--[note-7k2q-->change the work[^note-7k2q] of teams.');
  });

  it('joins two paragraphs over the definitions of the first one, which then follow the joined block', () => {
    const editor = open(text);
    select(editor, positionOf(editor, 'Each') - 1);
    expect(key(editor, 'Backspace')).toBe(true);
    const markdown = editor.getMarkdown();
    expect(markdown).toContain('change the work[^note-7k2q] of teams.<wbr><!--[note-p3x9 green-->Each team[^note-p3x9] has a plan.\n\n[^note-7k2q]:');
    expect(markdown.indexOf('[^note-p3x9]: **anna**')).toBeGreaterThan(markdown.indexOf('[^note-7k2q]: **hannes**'));
  });

  it('joins with Delete at the end of a paragraph in the same way', () => {
    const editor = open(text);
    select(editor, positionOf(editor, 'of teams.', true));
    expect(key(editor, 'Delete')).toBe(true);
    expect(editor.getMarkdown()).toContain('of teams.<wbr><!--[note-p3x9 green-->Each team');
  });

  it('lets Undo bring back the text as it was', () => {
    const editor = open(text);
    deleteRange(editor, positionOf(editor, 'agents'), positionOf(editor, 'of teams', true));
    const { view } = editor.tiptap;
    undo(view.state, view.dispatch);
    expect(editor.getMarkdown()).toBe(text);
  });

  it('lets a change from outside remove a note', () => {
    const source = new TextSource(text);
    const editor = open('', source);
    const without = text
      .replace('<wbr><!--[note-7k2q-->change the work[^note-7k2q]', 'change the work')
      .replace(/\[\^note-7k2q\]: [^]*?The teams of the plan\.\n\n/, '');
    source.setText(without, { kind: 'program', name: 'vscode' });
    expect(editor.getMarkdown()).toBe(without);
    expect(partsOf(editor.tiptap.state.doc).markers.has('note-7k2q')).toBe(false);
  });
});

describe('the command addNote', () => {
  it('adds a note to the selected text, with its definition after the block', () => {
    const editor = open('# Title\n\nOne two three.\n\nNext.\n');
    select(editor, positionOf(editor, 'two'), positionOf(editor, 'two', true));
    const label = addNote(editor, { label: 'note-zz99', color: 'red', author: 'hannes', date: '2026-11-02 10:00+01:00', body: 'Why two?' });
    expect(label).toBe('note-zz99');
    expect(editor.getMarkdown()).toBe(
      '# Title\n\nOne <wbr><!--[note-zz99 red-->two[^note-zz99] three.\n\n[^note-zz99]: **hannes** · 2026-11-02 10:00+01:00\n\n    Why two?\n\nNext.\n',
    );
    expect(editor.tiptap.view.dom.querySelector('[data-note="note-zz99"].nsmd-note-strong')).not.toBeNull();
  });

  it('adds a note in the hidden form, with a new label', () => {
    const editor = open('One two three.\n');
    select(editor, positionOf(editor, 'two'), positionOf(editor, 'two', true));
    expect(editor.runCommand('notes.addNote', { author: 'anna', date: '2026-11-02 10:00Z', hidden: true })).toBe(true);
    const markdown = editor.getMarkdown();
    expect(markdown).toMatch(/^One <wbr><!--\[(note-[a-z0-9]{4})-->two<!--\1\]--> three\.\n\n<!--\n\[\^\1\]: \*\*anna\*\* · 2026-11-02 10:00Z\n-->\n$/);
  });

  it('adds no note without a selected text', () => {
    const editor = open('One two three.\n');
    select(editor, positionOf(editor, 'two'));
    expect(editor.runCommand('notes.addNote', { author: 'anna', date: '2026-11-02 10:00Z' })).toBe(false);
  });
});

describe('the threads', () => {
  it('finds the thread of each note with the number of its answers', () => {
    const editor = open(text);
    const threads = notesPlugin.threads!.find(editor.tiptap.state.doc);
    expect(threads.map((thread) => [thread.id, thread.count, thread.label])).toEqual([
      ['note-7k2q', 2, 'Note of hannes'],
      ['note-p3x9', 1, 'Note of anna'],
    ]);
  });

  it('shows the answers of a note in the panel', () => {
    const editor = open(hiddenText);
    const [thread] = notesPlugin.threads!.find(editor.tiptap.state.doc);
    const panel = document.createElement('div');
    notesPlugin.threads!.open(thread, panel, editor);
    expect(panel.querySelector('.nsmd-note-answer-header')!.textContent).toContain('hannes');
    expect(panel.querySelector('.nsmd-note-answer-body')!.textContent).toBe('Is this --> right?');
  });
});

describe('the renderer', () => {
  it('removes the notes from the output', () => {
    const html = createMarkdownIt([extendMarkdownIt]).render(text);
    expect(html).toContain('<p>The agents change the work of teams.</p>');
    expect(html).toContain('<p>Each team has a plan.</p>');
    expect(html).not.toContain('note-');
    expect(html).not.toContain('hannes');
    expect(createMarkdownIt([extendMarkdownIt]).render(hiddenText)).toBe('<p>A text with a note here.</p>\n');
  });

  it('names the nodes of the plugin', () => {
    expect(Object.values(nodeNames)).toEqual(['noteMarker', 'noteReference', 'notesHidden']);
  });
});

describe('the slash commands of Notes in the editor of a whole file (R-EDIT-008, decision 79)', () => {
  /** opened returns an editor with the slash commands of Notes, the messages that it sends and a function that sends it a message. */
  function opened(markdown: string): { editor: MarkdownEditor; sent: PageMessage[]; send: (message: unknown) => void } {
    const sent: PageMessage[] = [];
    const listeners: ((message: unknown) => void)[] = [];
    const element = document.createElement('div');
    document.body.append(element);
    const editor = new MarkdownEditor(element, {
      source: new TextSource(markdown),
      plugins: [createNotesPlugin({ comment: true, slashCommands: true }), figuresPlugin],
      host: {
        platform: 'vscode',
        channel: () => ({
          post: (message) => sent.push(message as PageMessage),
          onMessage: (listener) => {
            listeners.push(listener);
            return () => undefined;
          },
        }),
      },
    });
    editors.push(editor);
    return { editor, sent, send: (message) => listeners.forEach((listener) => listener(message)) };
  }

  /** labels returns the labels of the items of the open menu. */
  const labels = (): string[] => [...document.querySelectorAll('.nsmd-menu-item .nsmd-menu-label')].map((item) => item.textContent ?? '');

  it('add a note or a todo note to the text that a slash was typed on, which the editor selects again', () => {
    const { editor, sent } = opened('Some text here.\n');
    select(editor, positionOf(editor, 'text'), positionOf(editor, 'text', true));
    type(editor, '/');
    expect(labels()).toEqual(['Add Note', 'Add Todo']);
    type(editor, 'todo');
    expect(key(editor, 'Enter')).toBe(true);
    expect(editor.getMarkdown()).toBe('Some text here.\n');
    expect(sent.at(-2)).toEqual({ type: 'selection', anchor: 5, head: 9, mouse: false });
    expect(sent.at(-1)).toEqual({ type: 'comment', todo: true });
  });

  it('insert the date and the time, offer the figure, the table with its caption and the listing in a paragraph of their own, and /todo, /footnote and /ref after text', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 29, 19, 29));
    try {
      const { editor } = opened('Text\n\n\n');
      select(editor, positionOf(editor, 'Text', true));
      type(editor, ' /');
      // The footnote of Notes takes the place of the footnote of the editor; the commands of Notes follow the items of the editor.
      expect(labels().slice(-6)).toEqual(['Footnote', 'Date: 2026-10-29', 'Time: 2026-10-29 19:29', 'Add Todo to the sentence before', 'Link a Figure, Table or Section', 'Your GitHub login']);
      expect(labels().filter((label) => label === 'Footnote')).toHaveLength(1);
      type(editor, 'time');
      key(editor, 'Enter');
      expect(editor.getMarkdown()).toBe('Text 2026-10-29 19:29\n');
      editor.tiptap.commands.enter();
      type(editor, '/');
      expect(labels()).toEqual(expect.arrayContaining(['Figure', 'Table with caption', 'Listing']));
      expect(labels()).not.toContain('Table');
      expect(labels()).not.toContain('Footnote');
    } finally {
      vi.useRealTimers();
    }
  });

  it('ask the extension for /figure with the text of the file and the cursor, and make the change that it sends back as a change of the user', () => {
    const { editor, sent, send } = opened('# Results\n\nMore.\n');
    select(editor, positionOf(editor, 'Results', true));
    editor.tiptap.commands.enter();
    type(editor, '/figure');
    expect(labels()[0]).toBe('Figure');
    key(editor, 'Enter');
    const request = sent.at(-1) as Extract<PageMessage, { type: 'slash' }>;
    expect(request).toMatchObject({ type: 'slash', request: 1, command: 'figure' });
    expect(request.text).toBe(editor.getMarkdown());
    // The empty paragraph has no text in the file: its place is the end of the heading, and the change has the blank lines.
    expect(request.text).toBe('# Results\n\nMore.\n');
    expect(request.at).toBe('# Results'.length);
    const insert = 'Figure 1: Caption\n\n![Caption](images/plan.png)';
    send({ type: 'change', request: 1, patches: [{ from: request.at, to: request.at, insert: `\n\n${insert}` }], select: { from: request.at + 12, to: request.at + 19 } });
    expect(editor.getMarkdown()).toBe(`# Results\n\n${insert}\n\nMore.\n`);
    const { from, to } = editor.tiptap.state.selection;
    expect(editor.tiptap.state.doc.textBetween(from, to)).toBe('Caption');
    // A change for an older text or another request changes nothing.
    send({ type: 'change', request: 1, patches: [{ from: 0, to: 0, insert: 'x' }] });
    expect(editor.getMarkdown()).toBe(`# Results\n\n${insert}\n\nMore.\n`);
    undo(editor.tiptap.state, editor.tiptap.view.dispatch);
    expect(editor.getMarkdown()).not.toContain('Figure 1');
  });

  it('make the change of /ref, with the anchor of the caption that the editor hides, and put the cursor after the link', () => {
    const text = 'Table 1: Grades\n\n| A |\n| --- |\n\nSee more.\n';
    const { editor, sent, send } = opened(text);
    select(editor, positionOf(editor, 'See', true));
    type(editor, ' /ref');
    key(editor, 'Enter');
    const request = sent.at(-1) as Extract<PageMessage, { type: 'slash' }>;
    // The typed command goes, and the space before it stays, as in the text editor.
    expect(request).toMatchObject({ command: 'ref', text: text.replace('See more', 'See  more'), at: text.indexOf(' more') + 1 });
    const anchor = '<a id="tab-grades"></a>';
    const link = '[Table 1](#tab-grades)';
    const caption = 'Table 1: Grades'.length;
    send({
      type: 'change',
      request: request.request,
      patches: [
        { from: caption, to: caption, insert: anchor },
        { from: request.at, to: request.at, insert: link },
      ],
      select: { from: request.at + anchor.length + link.length, to: request.at + anchor.length + link.length },
    });
    expect(editor.getMarkdown()).toBe(`Table 1: Grades${anchor}\n\n| A |\n| --- |\n\nSee ${link} more.\n`);
    expect(editor.tiptap.state.doc.textBetween(editor.tiptap.state.selection.from, editor.tiptap.state.selection.from + 5)).toBe(' more');
  });
});
