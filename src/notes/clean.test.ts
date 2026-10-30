// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the clean text of a file with notes for the clean editing
 * view ([R-TEXT-009](../../docs/requirements.md#r-text-009)): the text without the start markers, the
 * references, the definitions and the comment of the format, the highlights in
 * it, and the edits of the file for the edits of the clean text: typed text at
 * the edge of a highlight stays outside, deleted text never deletes a note, a
 * paragraph break ends a highlight, and random edits keep the clean text and
 * every note. While the side view shows the standard footnotes, the clean text
 * also leaves out their definitions. Blocks that other extensions hide stay at
 * the end of the file (R-GEN-012).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, expect, test } from 'vitest';
import { applyClean, type BlockFinder, cleanLines, editOptions, endsHighlight, labelsOf, project, rebuild } from './clean';

/** example is the example of the notes in the documents, with the comment of the format and three notes. */
const example = fs.readFileSync(path.resolve(__dirname, '../../docs/example.md'), 'utf8');

/** text is a short file with two notes in one paragraph and a paragraph after their definitions. */
const text = [
  'The agents <wbr><!--[note-7k2q green-->change the work[^note-7k2q] of <wbr><!--[note-m3x8-->teams[^note-m3x8] in three ways.',
  '',
  '[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00',
  '',
  '    Which three ways?',
  '',
  '[^note-m3x8]: **anna** · 2026-10-28 11:02+01:00',
  '',
  '    All teams?',
  '',
  'The next paragraph.',
  '',
].join('\n');

/**
 * edit returns the new file and the new clean text for an edit of the clean text at a text of it.
 * @param file - The text of the file.
 * @param at - The text of the clean text where the edit starts, or its offset.
 * @param length - The number of characters that the edit replaces.
 * @param insert - The new text.
 * @param after - Whether the edit starts after the text of at.
 */
const edit = (file: string, at: string, length: number, insert: string, after = false) => {
  const projection = project(file);
  const start = projection.clean.indexOf(at) + (after ? at.length : 0);
  const result = applyClean(projection, start, start + length, insert);
  return { ...result, clean: project(result.text).clean, expected: projection.clean.slice(0, start) + insert + projection.clean.slice(start + length) };
};

describe('the clean text', () => {
  test('has no start marker, reference, definition or comment of the format, and keeps one blank line between the blocks', () => {
    expect(project(text).clean).toBe('The agents change the work of teams in three ways.\n\nThe next paragraph.\n');
    const clean = project(example).clean;
    expect(clean).not.toMatch(/<wbr>|<!--\[note-|\[\^note-|nimblescape-markdownnotes v/);
    // Other footnotes stay in the text.
    expect(clean).toContain('[^1]');
  });

  test('has the highlights of the notes at their text', () => {
    const projection = project(text);
    expect(projection.highlights.map((highlight) => [highlight.label, highlight.color, projection.clean.slice(highlight.start, highlight.end)])).toEqual([
      ['note-7k2q', 'green', 'change the work'],
      ['note-m3x8', undefined, 'teams'],
    ]);
  });

  test('names the line in the clean text of each line of the file, for the Markdown preview', () => {
    // The definitions go to the line of the blank line where they stood, and the paragraph after them moves up.
    expect(cleanLines(project(text))).toEqual([0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3]);
  });

  test('leaves out the definitions at the end of the file with the blank lines before them', () => {
    const file = 'One <wbr><!--[note-7k2q-->two[^note-7k2q].\n\n[^note-7k2q]: **ann** · 2026-10-28 10:15+01:00\n\n    Body.\n';
    expect(project(file).clean).toBe('One two.\n');
  });
});

describe('an edit of the clean text', () => {
  test('types text at the end of a highlight after its reference, and at its start before its start marker', () => {
    expect(edit(text, 'change the work', 0, ' and more', true).text).toContain('change the work[^note-7k2q] and more of');
    expect(edit(text, 'teams', 0, 'all ').text).toContain('of all <wbr><!--[note-m3x8-->teams[^note-m3x8]');
  });

  test('types text inside a highlight into it, and a replacement of its first or last word stays in it', () => {
    expect(edit(text, 'work', 0, 'whole ').text).toContain('change the whole work[^note-7k2q]');
    expect(edit(text, 'change', 6, 'alter').text).toContain('<!--[note-7k2q green-->alter the work[^note-7k2q]');
    expect(edit(text, 'work', 4, 'job').text).toContain('change the job[^note-7k2q]');
    expect(edit(text, 'teams', 5, 'groups').text).toContain('<!--[note-m3x8-->groups[^note-m3x8]');
  });

  test('keeps the next letters in a highlight when they continue text typed at its end, as VS Code types over a selection', () => {
    // VS Code types "job" over "work" as a replacement with "j" and the insertions of "o" and "b".
    let file = edit(text, 'work', 4, 'j').text;
    let at = project(file).clean.indexOf('j') + 1;
    expect(endsHighlight(project(file), at)).toBe(true);
    for (const letter of ['o', 'b']) {
      file = applyClean(project(file), at, at, letter, true).text;
      at++;
    }
    expect(file).toContain('change the job[^note-7k2q] of');
    // Without the letters before, typed text at the end of a highlight stays outside.
    expect(applyClean(project(file), at, at, 's').text).toContain('change the job[^note-7k2q]s of');
  });

  test('keeps the notes when it deletes their text: a highlight without text is a point', () => {
    const result = edit(text, 'change the work of teams', 'change the work of teams'.length, '');
    expect(result.clean).toBe(result.expected);
    expect(labelsOf(result.text)).toEqual(['note-7k2q', 'note-m3x8']);
  });

  test('ends a highlight before a paragraph break in it, and puts its definition after its block', () => {
    const result = edit(text, 'change the', 0, '\n\n', true);
    expect(result.clean).toBe(result.expected);
    expect(result.way).toBe('rebuilt');
    expect(result.text).toContain('change the[^note-7k2q]\n\n[^note-7k2q]:');
    expect(labelsOf(result.text)).toEqual(['note-7k2q', 'note-m3x8']);
  });

  test('joins a paragraph to the paragraph before its definitions, and moves the definitions after the joined block', () => {
    const projection = project(text);
    const start = projection.clean.indexOf('\n\nThe next');
    const result = applyClean(projection, start, start + 2, ' ');
    expect(project(result.text).clean).toBe('The agents change the work of teams in three ways. The next paragraph.\n');
    expect(labelsOf(result.text)).toEqual(['note-7k2q', 'note-m3x8']);
  });

  test('types at the start of the file after the comment of the format', () => {
    const result = edit(example, '', 0, 'Draft. ');
    expect(result.clean).toBe(result.expected);
    expect(result.text.startsWith('<!-- nimblescape-markdownnotes v1.0.0')).toBe(true);
  });

  test('keeps the clean text and every note for random edits, except an edit that makes the notes part of a comment or a code block', () => {
    let seed = 7;
    const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
    const labels = labelsOf(example);
    let kept = 0;
    let lost = 0;
    for (let round = 0; round < 60; round++) {
      let file = example;
      for (let step = 0; step < 12; step++) {
        const projection = project(file);
        // Most edits start at a hidden part, where the mapping has a choice.
        const start = random() < 0.6 ? pick(projection.at) : Math.floor(random() * (projection.clean.length + 1));
        const length = pick([0, 0, 1, 5, 40]);
        const end = Math.min(projection.clean.length, start + length);
        const insert = pick(['', 'x', ' ', 'word', '\n', '\n\n', 'pasted\n\nparagraph']);
        const result = applyClean(projection, start, end, insert);
        const opensBlock = /-->|<!--|```/.test(projection.clean.slice(Math.max(0, start - 3), end + 3));
        if (result.way !== 'none') {
          expect(project(result.text).clean).toBe(projection.clean.slice(0, start) + insert + projection.clean.slice(end));
          kept++;
          file = result.text;
        } else {
          expect(opensBlock, JSON.stringify({ start, end, insert, around: projection.clean.slice(start - 30, end + 30) })).toBe(true);
        }
      }
      lost += labelsOf(file).join() === labels.join() ? 0 : 1;
    }
    expect(lost).toBe(0);
    // Edits at the hidden comment of the listing of the example stand before the fence of its code block, and an edit
    // that ends the code block may fail.
    expect(kept).toBeGreaterThan(650);
  });
});

describe('the definitions of the standard footnotes', () => {
  /** footnoted is a file with a note, two standard footnotes with references and one without a reference. */
  const footnoted = [
    'The agents <wbr><!--[note-7k2q-->change the work[^note-7k2q] of teams.[^1] Other work.[^src]',
    '',
    '[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00',
    '',
    '    Which work?',
    '',
    '[^1]: A source,',
    'with a second line.',
    '',
    '    And a second paragraph.',
    '',
    'The next paragraph.',
    '',
    '[^src]: Another source.',
    '',
    '[^alone]: A footnote without a reference.',
    '',
  ].join('\n');

  test('are left out with the option footnotes, while the side view shows them; their references and a definition without a reference stay (R-TEXT-009)', () => {
    expect(project(footnoted).clean).toContain('[^1]: A source,');
    const projection = project(footnoted, { footnotes: true });
    expect(projection.clean).toBe('The agents change the work of teams.[^1] Other work.[^src]\n\nThe next paragraph.\n\n[^alone]: A footnote without a reference.\n');
    expect(projection.footnotes).toEqual(['1', 'src']);
    expect(projection.hidden.filter((part) => part.kind === 'footnote')).toHaveLength(2);
    // A file with standard footnotes and no note has no markup of the notes: it opens as it is.
    expect(project('Text.[^1]\n\n[^1]: A source.\n').hidden).toEqual([]);
  });

  test('stay in the clean text when an edit there makes one, and go when the view reads the file anew (R-TEXT-009)', () => {
    const projection = project(footnoted, { footnotes: true });
    const start = projection.clean.indexOf('[^alone]');
    const insert = '[^2]: A new source.\n\n';
    // The text gets a reference [^2] first, then its definition, as the user types them.
    const reference = applyClean(projection, projection.clean.indexOf(' Other'), projection.clean.indexOf(' Other'), '[^2]');
    const referenced = project(reference.text, editOptions(projection));
    const typed = applyClean(referenced, start + 4, start + 4, insert);
    expect(typed.way).toBe('direct');
    const after = project(typed.text, editOptions(referenced));
    expect(after.clean).toContain('[^2]: A new source.');
    expect(after.footnotes).toEqual(['1', 'src']);
    expect(project(typed.text, { footnotes: true }).clean).not.toContain('[^2]: A new source.');
  });

  test('come back into the clean text when an edit deletes the last reference, and the file keeps them (R-TEXT-009)', () => {
    const projection = project(footnoted, { footnotes: true });
    const at = projection.clean.indexOf('[^src]');
    const result = applyClean(projection, at, at + '[^src]'.length, '');
    expect(result.way).toBe('none');
    expect(result.text).toContain('[^src]: Another source.');
    expect(project(result.text, editOptions(projection)).clean).toContain('[^src]: Another source.');
  });

  test('are kept for random edits, also when the file is written anew (R-TEXT-009)', () => {
    let seed = 7;
    const random = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];
    let kept = 0;
    let rebuilt = 0;
    for (let round = 0; round < 40; round++) {
      let file = footnoted;
      let projection = project(file, { footnotes: true });
      for (let step = 0; step < 10; step++) {
        const start = random() < 0.6 ? pick(projection.at) : Math.floor(random() * (projection.clean.length + 1));
        const end = Math.min(projection.clean.length, start + pick([0, 0, 1, 5]));
        const insert = pick(['', 'x', ' ', '\n', '\n\n', 'pasted\n\nparagraph']);
        if (/\[\^[^\]]*\]/.test(projection.clean.slice(Math.max(0, start - 8), end + 8))) {
          // An edit at a reference can change the footnotes; the test above checks that.
          continue;
        }
        const result = applyClean(projection, start, end, insert);
        if (result.way === 'none') {
          continue;
        }
        const next = project(result.text, editOptions(projection));
        expect(next.clean).toBe(projection.clean.slice(0, start) + insert + projection.clean.slice(end));
        rebuilt += result.way === 'rebuilt' ? 1 : 0;
        kept++;
        file = result.text;
        projection = next;
      }
      // The hidden definitions stay as they are; the visible one can change with the edits.
      expect(file).toContain('[^1]: A source,\nwith a second line.\n\n    And a second paragraph.\n');
      expect(file).toContain('[^src]: Another source.\n');
      expect(labelsOf(file)).toEqual(['note-7k2q']);
    }
    expect(kept).toBeGreaterThan(200);
    expect(rebuilt).toBeGreaterThan(0);
  });
});

describe('the blocks of other extensions', () => {
  /** sourced is a file with a note and a database of sources at its end, as nimblescape Markdown Paper writes it. */
  const sourced = [
    'The agents <wbr><!--[note-7k2q-->change the work[^note-7k2q] of teams ([Hong et al., 2024](#hong2024)).',
    '',
    '[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00',
    '',
    '    Which work?',
    '',
    '<!-- nimblescape-sources',
    '{"id":"hong2024","type":"book","title":"MetaGPT"}',
    '-->',
    '',
  ].join('\n');
  /** database is the end of the file with the database. */
  const database = '\n\n<!-- nimblescape-sources\n{"id":"hong2024","type":"book","title":"MetaGPT"}\n-->\n';
  /** sources finds the database: a comment that starts with nimblescape-sources and whose last line is only `-->`. */
  const sources: BlockFinder = (lines) => {
    const first = lines.findIndex((line) => line.startsWith('<!-- nimblescape-sources'));
    const last = first < 0 ? -1 : lines.findIndex((line, index) => index > first && line.trim() === '-->');
    return last < 0 ? [] : [{ first, last }];
  };
  /**
   * blockEdit applies an edit of the clean text of a file whose blocks the finder hides, at the first place of a text.
   * @param at - The text at the place of the edit.
   * @param length - The length of the replaced text.
   * @param insert - The new text.
   * @param after - Whether the edit starts after the text.
   */
  const blockEdit = (at: string, length: number, insert: string, after = false) => {
    const projection = project(sourced, { blocks: sources });
    const start = projection.clean.indexOf(at) + (after ? at.length : 0);
    const result = applyClean(projection, start, start + length, insert);
    return { ...result, clean: project(result.text, { blocks: sources }).clean, expected: projection.clean.slice(0, start) + insert + projection.clean.slice(start + length) };
  };

  test('are left out of the clean text, also in a file without notes, and a finder that fails or names no lines of the file hides nothing (R-GEN-012)', () => {
    const projection = project(sourced, { blocks: sources });
    expect(projection.clean).toBe('The agents change the work of teams ([Hong et al., 2024](#hong2024)).\n');
    expect(projection.hidden.map((part) => part.kind)).toEqual(['marker', 'reference', 'block']);
    expect(project('Text.\n\n<!-- nimblescape-sources\n{"id":"a"}\n-->\n', { blocks: sources }).clean).toBe('Text.\n');
    expect(project(sourced).clean).toContain('nimblescape-sources');
    const failing: BlockFinder = () => {
      throw new Error('broken');
    };
    expect(project('Text.\n', { blocks: failing }).clean).toBe('Text.\n');
    expect(project('Text.\n', { blocks: () => [{ first: 0, last: 5 }, { first: 1, last: 0 }] }).clean).toBe('Text.\n');
    // The options of an edit keep the finder.
    expect(editOptions(projection).blocks).toBe(sources);
  });

  test('stay at the end of the file for an edit in the text and when the file is written anew (R-GEN-012)', () => {
    const typed = blockEdit('teams', 0, 'all ');
    expect(typed.way).toBe('direct');
    expect(typed.text.endsWith(`    Which work?${database}`)).toBe(true);
    const split = blockEdit('change the', 0, '\n\n', true);
    expect(split.way).toBe('rebuilt');
    expect(split.clean).toBe(split.expected);
    expect(split.text.endsWith(database)).toBe(true);
    const appended = blockEdit('(#hong2024)).', 0, '\n\nA new paragraph.', true);
    expect(appended.clean).toBe(appended.expected);
    expect(appended.text).toMatch(/A new paragraph\.[^]*<!-- nimblescape-sources/);
  });
});

describe('the anchors of the figures and tables', () => {
  /** captioned is a file with a note, a table with an anchor at the end of its caption line, and a link to it. */
  const captioned = [
    'As [Table 1](#tab-grades) <wbr><!--[note-7k2q-->shows[^note-7k2q], the plan works.',
    '',
    '[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00',
    '',
    '    Which plan?',
    '',
    'Table: Participants by grade<a id="tab-grades"></a>',
    '',
    '| Grade | Participants |',
    '| --- | --- |',
    '| 5 | 12 |',
    '',
  ].join('\n');

  test('are left out of the clean text, also in a file without notes (R-XREF-001)', () => {
    expect(project(captioned).clean).toBe('As [Table 1](#tab-grades) shows, the plan works.\n\nTable: Participants by grade\n\n| Grade | Participants |\n| --- | --- |\n| 5 | 12 |\n');
    expect(project('![Plan](plan.png)<a id="fig-plan"></a>\n').clean).toBe('![Plan](plan.png)\n');
    // An anchor in a code block is text.
    expect(project('```\nTable: A<a id="tab-a"></a>\n```\n').hidden).toEqual([]);
  });

  test('stay at the end of their caption lines for text typed there, and when the file is written anew (R-XREF-001)', () => {
    const typed = edit(captioned, 'Participants by grade', 0, ' and age', true);
    expect(typed.way).toBe('direct');
    expect(typed.text).toContain('Table: Participants by grade and age<a id="tab-grades"></a>\n');
    const projection = project(captioned);
    const start = projection.clean.indexOf('shows') + 2;
    const rebuilt = rebuild(projection, start, start, '\n\n')!;
    expect(project(rebuilt).clean).toBe(`${projection.clean.slice(0, start)}\n\n${projection.clean.slice(start)}`);
    expect(rebuilt).toContain('Table: Participants by grade<a id="tab-grades"></a>\n');
  });
});

describe('the values of the front matter', () => {
  /** titled is a file with a front matter, a field in a highlight of a note, and a field at the start of a line. */
  const titled = [
    '---',
    'title: A paper',
    '---',
    '',
    'This is <wbr><!--[note-7k2q-->the paper <wbr><!--{title}-->A paper<!--{/title}-->[^note-7k2q] of the plan.',
    '',
    '[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00',
    '',
    '    Which plan?',
    '',
    '<wbr><!--{title}-->A paper<!--{/title}--> starts here.',
    '',
  ].join('\n');

  test('show without their markers in the clean text (R-XREF-004)', () => {
    expect(project(titled).clean).toBe('---\ntitle: A paper\n---\n\nThis is the paper A paper of the plan.\n\nA paper starts here.\n');
    // A field in a code span is text.
    expect(project('`<wbr><!--{t}-->x<!--{/t}-->`\n').hidden).toEqual([]);
  });

  test('keep text typed before and after a value outside of it, and text typed in it in it (R-XREF-004)', () => {
    const before = edit(titled, 'A paper starts', 0, 'Now ');
    expect(before.text).toContain('\nNow <wbr><!--{title}-->A paper<!--{/title}--> starts here.\n');
    const deleted = edit(titled, 'A paper starts', 'A paper'.length, '');
    expect(deleted.text).toContain('\n<wbr><!--{title}--><!--{/title}--> starts here.\n');
    const replaced = edit(titled, 'A paper of', 'A paper'.length, 'The plan');
    expect(replaced.clean).toBe(replaced.expected);
    expect(replaced.text).toContain('the paper <wbr><!--{title}-->The plan<!--{/title}-->[^note-7k2q] of');
    const appended = edit(titled, ' of the plan', 0, '!');
    expect(appended.text).toContain('<!--{title}-->A paper<!--{/title}-->[^note-7k2q]! of the plan');
    const projection = project(titled);
    const start = projection.clean.indexOf(' of the plan');
    const rebuilt = rebuild(projection, start, start, '\n\n')!;
    expect(project(rebuilt).clean).toBe(`${projection.clean.slice(0, start)}\n\n${projection.clean.slice(start)}`);
    expect(rebuilt).toContain('the paper <wbr><!--{title}-->A paper<!--{/title}-->[^note-7k2q]');
  });
});

describe('the listings of code', () => {
  /** listed is a file with a note, a listing whose caption is a link to its source, and a paragraph after it. */
  const listed = [
    'The code <wbr><!--[note-7k2q-->reads[^note-7k2q] the fields.',
    '',
    '[^note-7k2q]: **hannes** · 2026-10-28 10:15+01:00',
    '',
    '    Which fields?',
    '',
    'Listing: [Reading the fields](../src/fields.ts#L6-L13)<a id="lst-reading-fields"></a>',
    '',
    '<!-- listing: ../src/fields.ts#read-fields -->',
    '',
    '```typescript',
    'const fields = read();',
    '```',
    '',
    'The end.',
    '',
  ].join('\n');

  test('show only the text of the caption and the code block: the link around the caption and the comment are left out (R-CODE-001)', () => {
    expect(project(listed).clean).toBe('The code reads the fields.\n\nListing: Reading the fields\n\n```typescript\nconst fields = read();\n```\n\nThe end.\n');
    // A listing without a caption, in a file without notes.
    expect(project('<!-- listing: a.py -->\n```python\nx = 1\n```\n').clean).toBe('```python\nx = 1\n```\n');
    // A caption that is not one link, and a comment without a code block, stay.
    expect(project('Listing: [A](a.py) and [B](b.py)\n\n<!-- listing: a.py -->\n\n```python\n```\n').clean).toBe('Listing: [A](a.py) and [B](b.py)\n\n```python\n```\n');
    expect(project('<!-- listing: a.py -->\n\nText.\n').hidden).toEqual([]);
  });

  test('keep the text typed in the caption in its link, and the comment before the code block (R-CODE-001)', () => {
    const start = edit(listed, 'Reading the fields', 0, 'Code: ');
    expect(start.way).toBe('direct');
    expect(start.text).toContain('\nListing: [Code: Reading the fields](../src/fields.ts#L6-L13)<a id="lst-reading-fields"></a>\n');
    const end = edit(listed, 'Reading the fields', 0, ' and values', true);
    expect(end.text).toContain('\nListing: [Reading the fields and values](../src/fields.ts#L6-L13)<a id="lst-reading-fields"></a>\n');
    const replaced = edit(listed, 'Reading the fields', 'Reading the fields'.length, 'Parsing');
    expect(replaced.text).toContain('\nListing: [Parsing](../src/fields.ts#L6-L13)<a id="lst-reading-fields"></a>\n\n<!-- listing: ../src/fields.ts#read-fields -->\n\n```typescript\n');
    const code = edit(listed, 'const fields', 0, '// ');
    expect(code.text).toContain('\n<!-- listing: ../src/fields.ts#read-fields -->\n\n```typescript\n// const fields = read();\n```\n');
    const projection = project(listed);
    const at = projection.clean.indexOf(' the fields.') + 4;
    const rebuilt = rebuild(projection, at, at, '\n\n')!;
    expect(project(rebuilt).clean).toBe(`${projection.clean.slice(0, at)}\n\n${projection.clean.slice(at)}`);
    expect(rebuilt).toContain('\nListing: [Reading the fields](../src/fields.ts#L6-L13)<a id="lst-reading-fields"></a>\n\n<!-- listing: ../src/fields.ts#read-fields -->\n\n```typescript\n');
  });

  test('lose the comment and the link of the caption with the text around them, and keep the notes (R-CODE-001)', () => {
    const from = 'Listing: Reading the fields\n\n```typescript\nconst fields = read();\n```\n\n';
    const deleted = edit(listed, from, from.length, '');
    expect(deleted.clean).toBe(deleted.expected);
    expect(deleted.text).not.toContain('listing:');
    expect(deleted.text).not.toContain('](../src/fields.ts');
    expect(labelsOf(deleted.text)).toEqual(['note-7k2q']);
    const line = edit(listed, 'Listing: Reading the fields', 'Listing: Reading the fields'.length, 'Listing: Parsing');
    expect(line.clean).toBe(line.expected);
    expect(line.text).toContain('\nListing: Parsing<a id="lst-reading-fields"></a>\n\n<!-- listing: ../src/fields.ts#read-fields -->\n');
  });
});
