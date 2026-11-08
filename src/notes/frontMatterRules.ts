// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The rules of the front matter in the clean editing view
 * ([R-TEXT-009](../../docs/requirements.md#r-text-009), decision 75). The
 * front matter is text in the view. Another extension, for example
 * nimblescape Markdown Paper, can give the rules of the front matter of a
 * file: its JSON schema (draft 2020-12) and the keys whose lines are
 * read-only. With rules, an edit of a YAML front matter keeps its two fences,
 * keeps each key of the schema at the start of its line, in its order, and
 * keeps the lines of each read-only key as they are. So only the text after a
 * key changes, and new keys can be added, also a key of the schema that is
 * missing. A front matter in TOML or JSON keeps all its lines while it has
 * rules. The problems of the front matter against its schema come with quick
 * fixes, and the schema gives the suggestions of the keys and of their values.
 * A file without rules has a front matter that changes like any other text.
 * The module uses no API of VS Code.
 */

import { checkFrontMatter, frontMatterOf, type FrontMatterFormat, type JsonSchema, type JsonSchemaObject, readFrontMatter, schemaAt, typeOf } from '@nimblescape/markdowntext';

/** FrontMatterRules are the rules of the front matter of a file that another extension gives. */
export interface FrontMatterRules {
  /** schema is the JSON schema (draft 2020-12) of the front matter. */
  schema: Record<string, unknown>;
  /** readOnly are the keys whose lines stay as they are, besides the keys that the schema marks `readOnly`. */
  readOnly?: readonly string[];
}

/** Place is a place in a text: the index of its line and the number of characters before it on the line. */
export interface Place {
  line: number;
  character: number;
}

/** FrontMatterFix is a quick fix of a problem: it replaces the text between two places. */
export interface FrontMatterFix {
  title: string;
  from: Place;
  to: Place;
  text: string;
  /** preferred tells whether the fix uses the default value of the key. */
  preferred: boolean;
}

/** FrontMatterIssue is a problem of a front matter against its schema, at its place, with its quick fixes. */
export interface FrontMatterIssue {
  from: Place;
  to: Place;
  message: string;
  fixes: FrontMatterFix[];
}

/** FrontMatterCompletion is a suggestion of a key or of a value: it replaces the text between two places. */
export interface FrontMatterCompletion {
  label: string;
  kind: 'key' | 'value';
  /** text is the text that the suggestion writes. */
  text: string;
  /** snippet is the text as a snippet of VS Code, with the values of a key as a choice, or undefined. */
  snippet?: string;
  /** filter is the text that VS Code compares with the typed text. */
  filter: string;
  detail?: string;
  documentation?: string;
  from: Place;
  to: Place;
  /** preferred tells whether the suggestion is the default value of the key. */
  preferred: boolean;
}

/** KeyLine is a line of a YAML front matter that starts with a key of its top level. */
export interface KeyLine {
  /** key is the name of the key, without quotes. */
  key: string;
  /** line is the index of the line in the text. */
  line: number;
  /** prefix is the start of the line up to the colon after the key, with the colon. */
  prefix: string;
  /** last is the index of the last line of the value of the key that is not empty, or its own line. */
  last: number;
}

/**
 * keyPattern matches a key of the top level at the start of a line of YAML, in double quotes, in single quotes or plain,
 * with its colon. A plain key does not start with a character that starts another part of YAML, such as `#`, `-` with a
 * space, or `[`.
 */
const keyPattern = /^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^\s#'"?:,[\]{}&*!|>%@`-][^:]*?|-[^\s:][^:]*?)[ \t]*:/;

/**
 * linesOf returns the lines of a text, without their line breaks.
 * @param text - The text.
 */
const linesOf = (text: string): string[] => text.split(/\r\n|\r|\n/);

/**
 * nameOf returns the name of a key as it stands in the text, without its quotes.
 * @param raw - The key in the text.
 */
function nameOf(raw: string): string {
  if (raw.startsWith('"')) {
    try {
      return String(JSON.parse(raw));
    } catch {
      return raw.slice(1, -1);
    }
  }
  return raw.startsWith("'") ? raw.slice(1, -1).replace(/''/g, "'") : raw.trim();
}

/**
 * keyLinesOf returns the lines of a YAML front matter that start with a key of its top level, each with the last line
 * of its value: the lines after it that are empty, indented, or items of a list.
 * @param lines - The lines of the text.
 * @param end - The number of lines of the front matter, with its fences.
 */
export function keyLinesOf(lines: readonly string[], end: number): KeyLine[] {
  const keys: KeyLine[] = [];
  let current: KeyLine | undefined;
  for (let index = 1; index < end - 1; index++) {
    const line = lines[index];
    const match = keyPattern.exec(line);
    if (match) {
      current = { key: nameOf(match[1]), line: index, prefix: match[0], last: index };
      keys.push(current);
    } else if (current && (line.trim() === '' || /^[ \t]/.test(line) || /^-(?:[ \t]|$)/.test(line))) {
      if (line.trim() !== '') {
        current.last = index;
      }
    } else {
      current = undefined;
    }
  }
  return keys;
}

/** Head is the front matter of a text: the lines of the text, the number of lines of the front matter, its format and its keys. */
interface Head {
  lines: string[];
  end: number;
  format: FrontMatterFormat;
  keys: KeyLine[];
}

/**
 * headOf returns the front matter of a text, or undefined for a text without a front matter.
 * @param text - The text.
 */
function headOf(text: string): Head | undefined {
  const lines = linesOf(text);
  const frontMatter = frontMatterOf(lines);
  return frontMatter && { lines, end: frontMatter.lines, format: frontMatter.format, keys: frontMatter.format === 'yaml' ? keyLinesOf(lines, frontMatter.lines) : [] };
}

/**
 * keysOf returns the keys of the top level that the schema of rules names, in its order, and the read-only keys.
 * @param rules - The rules.
 */
function keysOf(rules: FrontMatterRules): { named: string[]; readOnly: Set<string> } {
  const schema = rules.schema as JsonSchema;
  const named = Object.keys(schemaAt(schema, [])?.properties ?? {});
  return { named, readOnly: new Set([...(rules.readOnly ?? []), ...named.filter((key) => schemaAt(schema, [key])?.readOnly === true)]) };
}

/**
 * sameFrontMatter tells whether two texts have the same front matter: the same lines, or no front matter.
 * @param before - The lines of the first text.
 * @param after - The lines of the second text.
 */
function sameFrontMatter(before: readonly string[], after: readonly string[]): boolean {
  const kept = before.slice(0, frontMatterOf(before)?.lines ?? 0);
  const changed = after.slice(0, frontMatterOf(after)?.lines ?? 0);
  return kept.length === changed.length && kept.every((line, index) => line === changed[index]);
}

/**
 * blockOf returns the lines of a key with its value.
 * @param lines - The lines of the text.
 * @param key - The key.
 */
const blockOf = (lines: readonly string[], key: KeyLine): string => lines.slice(key.line, key.last + 1).join('\n');

/**
 * keepsRules tells whether an edit of a file keeps the rules of its front matter. Without rules (null), every edit
 * keeps them. While the rules load (undefined), and for a front matter in TOML or JSON, the front matter keeps all its
 * lines. A YAML front matter keeps its fences, each key of the schema keeps the start of its line in the same order,
 * no key comes twice, no read-only key is added, and the lines of each read-only key stay as they are.
 * @param before - The text of the file before the edit.
 * @param after - The text of the file after the edit.
 * @param rules - The rules of the front matter, null without rules, or undefined while they load.
 */
export function keepsRules(before: string, after: string, rules: FrontMatterRules | null | undefined): boolean {
  if (rules === null) {
    return true;
  }
  const kept = linesOf(before);
  const changed = linesOf(after);
  const old = frontMatterOf(kept);
  if (rules === undefined || old?.format !== 'yaml') {
    return sameFrontMatter(kept, changed);
  }
  const now = frontMatterOf(changed);
  if (now?.format !== 'yaml' || kept[0] !== changed[0] || kept[old.lines - 1] !== changed[now.lines - 1]) {
    return false;
  }
  const { named, readOnly } = keysOf(rules);
  const guarded = new Set([...named, ...readOnly]);
  const was = keyLinesOf(kept, old.lines).filter((key) => guarded.has(key.key));
  const is = keyLinesOf(changed, now.lines).filter((key) => guarded.has(key.key));
  // Each key of the schema keeps the start of its line, in the same order; a missing key of the schema can be added.
  const matched: KeyLine[] = [];
  let next = 0;
  for (const key of was) {
    while (next < is.length && (is[next].key !== key.key || is[next].prefix !== key.prefix)) {
      next++;
    }
    if (next === is.length) {
      return false;
    }
    matched.push(is[next++]);
  }
  for (const key of guarded) {
    const count = was.filter((candidate) => candidate.key === key).length;
    if (is.filter((candidate) => candidate.key === key).length > (readOnly.has(key) ? count : Math.max(count, 1))) {
      return false;
    }
  }
  return was.every((key, index) => !readOnly.has(key.key) || blockOf(kept, key) === blockOf(changed, matched[index]));
}

/**
 * scalarOf returns the text of a value of YAML: a text as it is when YAML reads it back as the same text, else in double
 * quotes; a number or yes or no as it is.
 * @param value - The value.
 */
export function scalarOf(value: unknown): string {
  if (typeof value !== 'string') {
    return value === null || value === undefined ? '' : String(value);
  }
  if (value !== '' && value.trim() === value && !/[\r\n]/.test(value)) {
    try {
      if ((readFrontMatter(`---\nkey: ${value}\n---`, 'yaml') as Record<string, unknown>).key === value) {
        return value;
      }
    } catch {
      // The value needs quotes.
    }
  }
  return JSON.stringify(value);
}

/**
 * keyText returns the text of a key of YAML: plain when it is a simple name, else in double quotes.
 * @param key - The name of the key.
 */
const keyText = (key: string): string => (/^[A-Za-z_][\w-]*$/.test(key) ? key : JSON.stringify(key));

/**
 * isScalar tells whether a value is a text, a number or yes or no.
 * @param value - The value.
 */
const isScalar = (value: unknown): boolean => typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

/**
 * valuesOf returns the values that the schema of a key allows, for the quick fixes and the suggestions: the values of
 * `enum`, the value of `const`, yes and no for `boolean`, or else the default value.
 * @param schema - The schema of the key.
 */
function valuesOf(schema: JsonSchemaObject | undefined): unknown[] {
  if (Array.isArray(schema?.enum)) {
    return schema.enum.filter(isScalar);
  }
  if (isScalar(schema?.const)) {
    return [schema!.const];
  }
  if (typeOf(schema) === 'boolean') {
    return [true, false];
  }
  return isScalar(schema?.default) ? [schema!.default] : [];
}

/**
 * valueStartOf returns the character on the line of a key where its value starts: after the colon and the spaces.
 * @param head - The front matter.
 * @param key - The key.
 */
const valueStartOf = (head: Head, key: KeyLine): number => key.prefix.length + (/^[ \t]*/.exec(head.lines[key.line].slice(key.prefix.length))?.[0].length ?? 0);

/**
 * insertionOf returns the line before which a missing key of the schema goes, in the order of the schema: after the key
 * of the schema before it, or before the key after it, or before the closing fence.
 * @param head - The front matter.
 * @param named - The keys of the schema, in its order.
 * @param key - The missing key.
 */
function insertionOf(head: Head, named: readonly string[], key: string): number {
  const index = named.indexOf(key);
  const present = (name: string): KeyLine | undefined => head.keys.find((candidate) => candidate.key === name);
  for (let before = index - 1; before >= 0; before--) {
    const found = present(named[before]);
    if (found) {
      return found.last + 1;
    }
  }
  for (let after = index + 1; after < named.length; after++) {
    const found = present(named[after]);
    if (found) {
      return found.line;
    }
  }
  return head.end - 1;
}

/**
 * fixesOf returns the quick fixes of the problems of a key of the top level: a missing key gets a fix for each value
 * that its schema allows, or for its default value, or one that adds the key without a value; a key with a value that
 * the schema does not allow gets a fix for each allowed value; an empty value gets the default value; and a number or
 * yes or no where the schema needs a text gets quotes.
 * @param head - The front matter.
 * @param rules - The rules.
 * @param key - The name of the key.
 * @param data - The data of the front matter.
 */
function fixesOf(head: Head, rules: FrontMatterRules, key: string, data: Record<string, unknown>): FrontMatterFix[] {
  const { named, readOnly } = keysOf(rules);
  const schema = schemaAt(rules.schema as JsonSchema, [key]);
  if (!schema || readOnly.has(key) || head.format !== 'yaml') {
    return [];
  }
  const values = valuesOf(schema);
  const present = head.keys.find((candidate) => candidate.key === key);
  if (!present) {
    if (!named.includes(key)) {
      return [];
    }
    const at = { line: insertionOf(head, named, key), character: 0 };
    return (values.length > 0 ? values : [undefined]).map((value) => ({
      title: value === undefined ? `Add the key "${key}"` : `Add "${keyText(key)}: ${scalarOf(value)}"`,
      from: at,
      to: at,
      text: `${keyText(key)}:${value === undefined ? '' : ` ${scalarOf(value)}`}\n`,
      preferred: value !== undefined && value === schema.default,
    }));
  }
  const from = { line: present.line, character: present.prefix.length };
  const to = { line: present.last, character: head.lines[present.last].length };
  const current = data[key];
  const write = (title: string, value: unknown): FrontMatterFix => ({ title, from, to, text: ` ${scalarOf(value)}`, preferred: value === schema.default });
  if (Array.isArray(schema.enum) || schema.const !== undefined) {
    return values.filter((value) => value !== current).map((value) => write(`Change to ${scalarOf(value)}`, value));
  }
  if ((current === undefined || current === null || current === '') && isScalar(schema.default)) {
    return [write(`Set the default value ${scalarOf(schema.default)}`, schema.default)];
  }
  if (typeOf(schema) === 'string' && (typeof current === 'number' || typeof current === 'boolean')) {
    const text = head.lines[present.line].slice(valueStartOf(head, present)).trim();
    return [{ ...write('Write the value as text', text), preferred: true }];
  }
  return [];
}

/**
 * pathText returns the text of the path of a value, for example "authors", 0, "name".
 * @param path - The path.
 */
const pathText = (path: readonly (string | number)[]): string => path.map((segment) => (typeof segment === 'number' ? String(segment) : `"${segment}"`)).join(', ');

/**
 * frontMatterIssues returns the problems of the front matter of a text against the schema of its rules: a front matter
 * that does not parse, at the line of the problem, and each value that the schema does not allow, at its key, or at the
 * first fence for a missing key. The first problem of each key of the top level has the quick fixes of the key.
 * @param text - The text.
 * @param rules - The rules.
 */
export function frontMatterIssues(text: string, rules: FrontMatterRules): FrontMatterIssue[] {
  const head = headOf(text);
  if (!head) {
    return [];
  }
  const whole = (line: number): Pick<FrontMatterIssue, 'from' | 'to'> => ({ from: { line, character: 0 }, to: { line, character: head.lines[line].length } });
  let data: unknown;
  try {
    data = readFrontMatter(head.lines.slice(0, head.end).join('\n'), head.format);
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error).replace(/:$/, '.');
    // The YAML parser counts the lines from the line after the first fence, which is line 1 of the text.
    const line = head.format === 'yaml' ? Number(/at line (\d+)/.exec(message)?.[1] ?? 0) : 0;
    return [{ ...whole(line > 0 && line < head.end - 1 ? line : 0), message: `The front matter does not parse: ${message}`, fixes: [] }];
  }
  const map = data !== null && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  const fixed = new Set<string>();
  return checkFrontMatter(data, rules.schema as JsonSchema).map((problem) => {
    const [first] = problem.path;
    const key = typeof first === 'string' ? head.keys.find((candidate) => candidate.key === first) : undefined;
    let place = whole(key?.line ?? 0);
    if (key && problem.path.length === 1) {
      const start = valueStartOf(head, key);
      const end = head.lines[key.line].trimEnd().length;
      place = start < end ? { from: { line: key.line, character: start }, to: { line: key.line, character: end } } : { from: { line: key.line, character: 0 }, to: { line: key.line, character: key.prefix.replace(/[ \t]*:$/, '').length } };
    }
    const fixes = typeof first === 'string' && problem.path.length === 1 && !fixed.has(first) ? fixesOf(head, rules, first, map) : [];
    if (typeof first === 'string' && problem.path.length === 1) {
      fixed.add(first);
    }
    return { ...place, message: problem.path.length > 0 ? `${pathText(problem.path)}: ${problem.message}` : problem.message, fixes };
  });
}

/**
 * choiceText returns a value for a choice of a snippet of VS Code, with a backslash before each character that the
 * choice reads otherwise.
 * @param text - The text of the value.
 */
const choiceText = (text: string): string => text.replace(/[\\$}|,]/g, (character) => `\\${character}`);

/**
 * placeholderText returns a text for a placeholder of a snippet of VS Code, with a backslash before each character that
 * the placeholder reads otherwise.
 * @param text - The text.
 */
const placeholderText = (text: string): string => text.replace(/[\\$}]/g, (character) => `\\${character}`);

/**
 * frontMatterCompletions returns the suggestions of the schema at a place of a YAML front matter: after a key of the
 * schema, the values that its schema allows; on an empty line, or on a line with only the start of a name, the keys of
 * the schema that the front matter does not have yet, each with the values of its schema as a choice. A read-only key
 * gets no suggestion, and its values none.
 * @param text - The text.
 * @param at - The place of the cursor.
 * @param rules - The rules.
 */
export function frontMatterCompletions(text: string, at: Place, rules: FrontMatterRules): FrontMatterCompletion[] {
  const head = headOf(text);
  if (head?.format !== 'yaml' || at.line <= 0 || at.line >= head.end - 1) {
    return [];
  }
  const line = head.lines[at.line];
  const { named, readOnly } = keysOf(rules);
  const schemaOf = (key: string): JsonSchemaObject | undefined => schemaAt(rules.schema as JsonSchema, [key]);
  const key = head.keys.find((candidate) => candidate.line === at.line);
  if (key) {
    if (at.character < key.prefix.length || readOnly.has(key.key) || !named.includes(key.key)) {
      return [];
    }
    const schema = schemaOf(key.key);
    const start = valueStartOf(head, key);
    const from = { line: at.line, character: Math.min(start, at.character) };
    const to = { line: at.line, character: Math.max(from.character, line.trimEnd().length) };
    const space = from.character === key.prefix.length ? ' ' : '';
    return valuesOf(schema).map((value) => ({
      label: typeof value === 'string' ? value : scalarOf(value),
      kind: 'value' as const,
      text: `${space}${scalarOf(value)}`,
      filter: `${space}${scalarOf(value)}`,
      ...(value === schema?.default ? { detail: 'default' } : {}),
      from,
      to,
      preferred: value === schema?.default,
    }));
  }
  if (!/^[A-Za-z0-9_-]*$/.test(line)) {
    return [];
  }
  const present = new Set(head.keys.map((candidate) => candidate.key));
  const required = new Set(schemaAt(rules.schema as JsonSchema, [])?.required ?? []);
  return named
    .filter((name) => !present.has(name) && !readOnly.has(name))
    .map((name) => {
      const schema = schemaOf(name);
      const values = valuesOf(schema).map(scalarOf);
      const written = `${keyText(name)}: `;
      const snippet =
        values.length > 1
          ? `${placeholderText(written)}\${1|${values.map(choiceText).join(',')}|}`
          : values.length > 0
            ? `${placeholderText(written)}\${1:${placeholderText(values[0])}}`
            : `${placeholderText(written)}$0`;
      return {
        label: name,
        kind: 'key' as const,
        text: `${written}${values[0] ?? ''}`,
        snippet,
        filter: name,
        ...(required.has(name) ? { detail: 'required' } : {}),
        ...(typeof schema?.description === 'string' ? { documentation: schema.description } : {}),
        from: { line: at.line, character: 0 },
        to: { line: at.line, character: line.length },
        preferred: false,
      };
    });
}
