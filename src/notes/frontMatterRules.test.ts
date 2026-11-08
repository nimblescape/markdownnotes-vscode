// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the rules of the front matter in the clean editing view
 * ([R-TEXT-009](../../docs/requirements.md#r-text-009), decision 75): which
 * edits keep the keys of the schema and the read-only keys, the problems
 * against the schema with their quick fixes, and the suggestions of the keys
 * and of their values.
 */

import { describe, expect, test } from 'vitest';
import { type FrontMatterRules, frontMatterCompletions, frontMatterIssues, keepsRules, keyLinesOf, scalarOf } from './frontMatterRules';

/** rules are the rules of a paper as nimblescape Markdown Paper gives them: layout read-only, repos read-only, a choice and a required key. */
const rules: FrontMatterRules = {
  schema: {
    type: 'object',
    properties: {
      layout: { type: 'string', readOnly: true },
      title: { type: 'string', description: 'The title of the paper.' },
      kind: { type: 'string', enum: ['Bachelor', 'Master'], default: 'Bachelor' },
      year: { type: 'string' },
      lang: { type: 'string', default: 'de-AT' },
    },
    required: ['layout', 'title', 'kind'],
  },
  readOnly: ['repos'],
};

/** paper is a paper with all keys of the schema but year and lang, a key of another extension and the repositories. */
const paper = ['---', 'layout: pht/thesis', 'title: A paper', 'kind: Bachelor', 'notes: mine', 'repos:', '  app: https://github.com/a/app', '---', '', 'Text.', ''].join('\n');

/**
 * replaced returns a text with a part replaced.
 * @param text - The text.
 * @param part - The part.
 * @param by - Its replacement.
 */
const replaced = (text: string, part: string, by: string): string => {
  expect(text).toContain(part);
  return text.replace(part, by);
};

describe('the keys of a YAML front matter', () => {
  test('start their lines, in quotes or plain, each with the lines of its value', () => {
    const lines = ['---', 'title: A', '"two words": B', "'it''s': C", 'list:', '- a', '  - b', '', '# A comment', 'tags: [a, b]', '---'];
    expect(keyLinesOf(lines, lines.length).map((key) => [key.key, key.line, key.prefix, key.last])).toEqual([
      ['title', 1, 'title:', 1],
      ['two words', 2, '"two words":', 2],
      ["it's", 3, "'it''s':", 3],
      ['list', 4, 'list:', 6],
      ['tags', 9, 'tags:', 9],
    ]);
  });
});

describe('an edit of the front matter', () => {
  test('changes the text after a key, also of a key of the schema, and adds keys (decision 75)', () => {
    expect(keepsRules(paper, replaced(paper, 'title: A paper', 'title: The plan'), rules)).toBe(true);
    expect(keepsRules(paper, replaced(paper, 'title: A paper', 'title:'), rules)).toBe(true);
    expect(keepsRules(paper, replaced(paper, 'notes: mine', 'notes: ours\nother: more'), rules)).toBe(true);
    // A missing key of the schema can be added, once.
    expect(keepsRules(paper, replaced(paper, 'kind: Bachelor\n', 'kind: Bachelor\nyear: 2026\n'), rules)).toBe(true);
    expect(keepsRules(paper, replaced(paper, 'kind: Bachelor\n', 'kind: Bachelor\nyear: 2026\nyear: 2027\n'), rules)).toBe(false);
    // A key of another extension can be renamed and removed.
    expect(keepsRules(paper, replaced(paper, 'notes: mine\n', ''), rules)).toBe(true);
    // The text after the front matter.
    expect(keepsRules(paper, replaced(paper, 'Text.', 'More text.'), rules)).toBe(true);
  });

  test('goes back when it changes, removes or moves a key of the schema (decision 75)', () => {
    expect(keepsRules(paper, replaced(paper, 'title: A paper', 'titles: A paper'), rules)).toBe(false);
    expect(keepsRules(paper, replaced(paper, 'title: A paper', ' title: A paper'), rules)).toBe(false);
    expect(keepsRules(paper, replaced(paper, 'title: A paper\n', ''), rules)).toBe(false);
    expect(keepsRules(paper, replaced(paper, 'title: A paper\nkind: Bachelor', 'kind: Bachelor\ntitle: A paper'), rules)).toBe(false);
    expect(keepsRules(paper, replaced(paper, 'kind: Bachelor', 'kind: Bachelor\ntitle: Twice'), rules)).toBe(false);
  });

  test('goes back when it changes a read-only key or its value, or adds one (decision 75)', () => {
    expect(keepsRules(paper, replaced(paper, 'layout: pht/thesis', 'layout: pht/concept'), rules)).toBe(false);
    expect(keepsRules(paper, replaced(paper, '  app: https://github.com/a/app', '  app: https://github.com/b/app'), rules)).toBe(false);
    expect(keepsRules(paper, replaced(paper, '  app: https://github.com/a/app\n', '  app: https://github.com/a/app\n  lib: x\n'), rules)).toBe(false);
    const without = replaced(paper, 'repos:\n  app: https://github.com/a/app\n', '');
    expect(keepsRules(without, replaced(without, 'notes: mine', 'notes: mine\nrepos:'), rules)).toBe(false);
  });

  test('keeps the fences of the front matter, and with rules of a front matter in TOML all its lines', () => {
    expect(keepsRules(paper, replaced(paper, '---\n\nText.', '--\n\nText.'), rules)).toBe(false);
    expect(keepsRules(paper, replaced(paper, '---\nlayout', '\nlayout'), rules)).toBe(false);
    expect(keepsRules(paper, replaced(paper, '---\n\nText.', '...\n\nText.'), rules)).toBe(false);
    const toml = '+++\ntitle = "A"\n+++\n\nText.\n';
    expect(keepsRules(toml, replaced(toml, '"A"', '"B"'), rules)).toBe(false);
    expect(keepsRules(toml, replaced(toml, 'Text.', 'More.'), rules)).toBe(true);
  });

  test('changes everything without rules, and nothing of the front matter while the rules load', () => {
    expect(keepsRules(paper, replaced(paper, 'layout: pht/thesis\n', ''), null)).toBe(true);
    expect(keepsRules(paper, replaced(paper, 'title: A paper', 'title: The plan'), undefined)).toBe(false);
    expect(keepsRules(paper, replaced(paper, 'Text.', 'More text.'), undefined)).toBe(true);
  });
});

describe('the problems of the front matter', () => {
  test('show each value that the schema does not allow at its value, and a missing key at the first fence, with quick fixes', () => {
    const text = replaced(replaced(paper, 'kind: Bachelor', 'kind: Doctor'), 'title: A paper\n', '');
    const issues = frontMatterIssues(text, rules);
    expect(issues.map((issue) => [issue.from, issue.to, issue.message])).toEqual([
      [{ line: 0, character: 0 }, { line: 0, character: 3 }, '"title": A value is required.'],
      [{ line: 2, character: 6 }, { line: 2, character: 12 }, '"kind": The value must be one of: Bachelor, Master.'],
    ]);
    // The missing key goes after the key before it in the order of the schema.
    expect(issues[0].fixes).toEqual([{ title: 'Add the key "title"', from: { line: 2, character: 0 }, to: { line: 2, character: 0 }, text: 'title:\n', preferred: false }]);
    expect(issues[1].fixes.map((fix) => [fix.title, fix.text, fix.preferred])).toEqual([
      ['Change to Bachelor', ' Bachelor', true],
      ['Change to Master', ' Master', false],
    ]);
    expect(issues[1].fixes[0]).toMatchObject({ from: { line: 2, character: 5 }, to: { line: 2, character: 12 } });
  });

  test('count an empty value as no value: the key stays and shows the problem at its name', () => {
    const text = replaced(paper, 'kind: Bachelor', 'kind:');
    const [issue] = frontMatterIssues(text, rules);
    expect(issue).toMatchObject({ from: { line: 3, character: 0 }, to: { line: 3, character: 4 }, message: '"kind": A value is required.' });
    expect(issue.fixes.map((fix) => fix.title)).toEqual(['Change to Bachelor', 'Change to Master']);
  });

  test('give a missing key of a choice a fix for each value, a number where the schema needs a text quotes, and an empty key its default', () => {
    const numbered = replaced(paper, 'notes: mine', 'year: 2026');
    const [quoted] = frontMatterIssues(numbered, rules);
    expect(quoted.message).toBe('"year": The value must be a text.');
    expect(quoted.fixes.map((fix) => [fix.title, fix.text])).toEqual([['Write the value as text', ' "2026"']]);
    const missing = frontMatterIssues(replaced(paper, 'kind: Bachelor\n', ''), rules);
    expect(missing[0].fixes.map((fix) => [fix.title, fix.from.line, fix.text, fix.preferred])).toEqual([
      ['Add "kind: Bachelor"', 3, 'kind: Bachelor\n', true],
      ['Add "kind: Master"', 3, 'kind: Master\n', false],
    ]);
    const lang = { ...rules, schema: { ...rules.schema, required: ['lang'] } };
    const [empty] = frontMatterIssues(replaced(paper, 'notes: mine', 'lang:'), lang);
    expect(empty.fixes.map((fix) => [fix.title, fix.text])).toEqual([['Set the default value de-AT', ' de-AT']]);
  });

  test('show a front matter that does not parse at the line of the problem, and nothing without a front matter', () => {
    const [issue] = frontMatterIssues(replaced(paper, 'notes: mine', 'notes mine'), rules);
    expect(issue.from.line).toBe(4);
    expect(issue.message).toMatch(/^The front matter does not parse: /);
    expect(issue.fixes).toEqual([]);
    expect(frontMatterIssues('Text.\n', rules)).toEqual([]);
  });
});

describe('the suggestions of the front matter', () => {
  test('give the values of a choice after its key, also after the colon without a space', () => {
    const line = 3;
    const values = frontMatterCompletions(paper, { line, character: 'kind: '.length }, rules);
    expect(values.map((value) => [value.label, value.text, value.preferred])).toEqual([
      ['Bachelor', 'Bachelor', true],
      ['Master', 'Master', false],
    ]);
    expect(values[0]).toMatchObject({ kind: 'value', from: { line, character: 6 }, to: { line, character: 14 } });
    const bare = replaced(paper, 'kind: Bachelor', 'kind:');
    expect(frontMatterCompletions(bare, { line, character: 5 }, rules).map((value) => value.text)).toEqual([' Bachelor', ' Master']);
  });

  test('give the missing keys of the schema on an empty line, with their values as a choice, but no read-only key', () => {
    const text = replaced(paper, 'notes: mine', '');
    const keys = frontMatterCompletions(text, { line: 4, character: 0 }, rules);
    expect(keys.map((key) => [key.label, key.snippet, key.text])).toEqual([
      ['year', 'year: $0', 'year: '],
      ['lang', 'lang: ${1:de-AT}', 'lang: de-AT'],
    ]);
    const choice = frontMatterCompletions(replaced(text, 'kind: Bachelor\n', ''), { line: 3, character: 0 }, rules).find((key) => key.label === 'kind');
    expect(choice).toMatchObject({ snippet: 'kind: ${1|Bachelor,Master|}', detail: 'required' });
  });

  test('give nothing for a read-only key, before the colon, outside the front matter, or in TOML', () => {
    expect(frontMatterCompletions(paper, { line: 1, character: 8 }, rules)).toEqual([]);
    expect(frontMatterCompletions(paper, { line: 3, character: 2 }, rules)).toEqual([]);
    expect(frontMatterCompletions(paper, { line: 9, character: 0 }, rules)).toEqual([]);
    expect(frontMatterCompletions('+++\n\n+++\n', { line: 1, character: 0 }, rules)).toEqual([]);
  });
});

test('writes a value of YAML plain when it reads back the same, else in double quotes', () => {
  expect(scalarOf('Bachelor')).toBe('Bachelor');
  expect(scalarOf('de-AT')).toBe('de-AT');
  expect(scalarOf('2026')).toBe('"2026"');
  expect(scalarOf('true')).toBe('"true"');
  expect(scalarOf('a: b')).toBe('"a: b"');
  expect(scalarOf('a #b')).toBe('"a #b"');
  expect(scalarOf('')).toBe('""');
  expect(scalarOf(true)).toBe('true');
  expect(scalarOf(3)).toBe('3');
});
