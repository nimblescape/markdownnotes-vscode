// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The comment that marks a Markdown file with notes, its "DOCTYPE"
 * ([R-NOTE-007](../../docs/requirements.md#r-note-007)). Its first line names
 * the format of the notes with its version and the address of the
 * specification, so that a program, for example an AI agent, knows how to read,
 * change and add the notes; the further lines say it in short words. The
 * comment stands at the top of the file, after a front matter, and GitHub and
 * the Markdown preview do not show it. The extension writes it together with
 * its own writes of a note and on the save of a file with notes, and removes it
 * with the last note.
 *
 * The version of the format is a semantic version, `v1.0.0`. The extension
 * writes a comment anew only when its own version is higher than the version of
 * the comment in the file, so that two versions of the extension do not change
 * the comment back and forth. The module uses no API of VS Code.
 */

import type { Position } from './notes';

/**
 * Version is a semantic version of the format of the notes. A higher major version is a form of the notes that an
 * older version reads wrongly, and has a specification of its own; a higher minor version adds optional elements that
 * an older version reads and keeps; a higher patch version changes only the words of the comment or of the
 * specification.
 */
export interface Version {
  major: number;
  minor: number;
  patch: number;
}

/** formatVersion is the version of the format of the notes that the extension reads and writes. */
export const formatVersion: Version = { major: 1, minor: 0, patch: 0 };

/**
 * versionText returns the text of a version, for example 1.0.0.
 * @param version - The version.
 */
export const versionText = (version: Version): string => `${version.major}.${version.minor}.${version.patch}`;

/**
 * compareVersions returns a negative number when a version is lower than another, 0 when they are equal, and a positive
 * number when it is higher.
 * @param a - The version.
 * @param b - The other version.
 */
export const compareVersions = (a: Version, b: Version): number => a.major - b.major || a.minor - b.minor || a.patch - b.patch;

/** specUrl is the address of the specification of the format, docs/format.md of the repository on the branch main. */
export const specUrl = 'https://github.com/nimblescape/nimblescape-markdown-notes/blob/main/docs/format.md';

/** doctypeName is the name of the format in the first line of the comment. */
export const doctypeName = 'nimblescape-markdownnotes';

/**
 * doctypeLines are the lines of the comment. No line holds `-->` before the last line, which would end the comment,
 * so the hint describes the start marker in words.
 */
export const doctypeLines: readonly string[] = [
  `<!-- ${doctypeName} v${versionText(formatVersion)} spec=${specUrl}`,
  'This comment marks a Markdown file with notes of the VS Code extension nimblescape Markdown Notes.',
  'AI agents: read the spec above before you read, change or add a note, and keep this comment as it is.',
  'A note is a footnote with the label "note-" and four small letters or digits, for example [^note-7k2q].',
  'Its reference ends the highlight of the note. Its start marker starts the highlight: <wbr> and an HTML',
  'comment with "[", the label and an optional color name. Every note has one. The definition follows the',
  'block of the highlight: "[^note-7k2q]: **login** · date", a blank line, and the body indented by four',
  'spaces. Each reply is a block quote with its own header.',
  '-->',
];

/** Doctype is the place of the comment in the lines of a text, and the version of the format that it names. */
export interface Doctype {
  /** start is the index of its first line. */
  start: number;
  /** end is the index of its last line, the line with `-->`. */
  end: number;
  /** version is the version of the format, or undefined when the first line names none. */
  version: Version | undefined;
}

/**
 * doctypeStart matches the first line of the comment, with the name and the version of the format. It also matches the
 * name `nimblescape-markdown-notes` of the versions before 2026-10-30, whose comment counts as older.
 */
const doctypeStart = /^<!--\s*(nimblescape-markdown-?notes)(?:\s+v(\d+)\.(\d+)\.(\d+))?(?:\s|$)/;

/** fence matches the line that opens or closes a fenced code block, with its fence. */
const fence = /^ {0,3}(`{3,}|~{3,})/;

/**
 * findDoctype returns the place of the comment in the lines of a text: the first comment whose first line starts with
 * the name of the format, at the start of a line outside the fenced code blocks, anywhere in the text; undefined
 * without one. A comment of the earlier name has no version, so that the extension writes it anew.
 * @param lines - The lines of the text.
 */
export function findDoctype(lines: readonly string[]): Doctype | undefined {
  let open: string | undefined;
  const start = lines.findIndex((line) => {
    const mark = fence.exec(line)?.[1];
    if (mark && (open === undefined || (mark[0] === open[0] && mark.length >= open.length))) {
      open = open === undefined ? mark : undefined;
      return false;
    }
    return open === undefined && doctypeStart.test(line);
  });
  if (start < 0) {
    return undefined;
  }
  let end = start;
  while (end < lines.length - 1 && !lines[end].includes('-->', end === start ? 4 : 0)) {
    end++;
  }
  const [, name, major, minor, patch] = doctypeStart.exec(lines[start]) ?? [];
  return { start, end, version: major === undefined || name !== doctypeName ? undefined : { major: Number(major), minor: Number(minor), patch: Number(patch) } };
}

/**
 * newerFormat returns the version of the format that the comment of a text names when its major version is higher than
 * the major version that the extension knows, or undefined. The extension then changes no note of the text, because a
 * change could break the notes of the newer format. A higher minor or patch version reads as the version of the
 * extension.
 * @param lines - The lines of the text.
 */
export function newerFormat(lines: readonly string[]): Version | undefined {
  const version = findDoctype(lines)?.version;
  return version !== undefined && version.major > formatVersion.major ? version : undefined;
}

/** frontMatterFences are the first lines of a front matter, YAML or TOML, with the lines that end it. */
const frontMatterFences: Record<string, readonly string[]> = { '---': ['---', '...'], '+++': ['+++'] };

/**
 * frontMatterEnd returns the index of the first line after the front matter of a text, or 0 without one: a front
 * matter starts in the first line with `---` (YAML) or `+++` (TOML) and ends with its closing line.
 * @param lines - The lines of the text.
 */
export function frontMatterEnd(lines: readonly string[]): number {
  const closing = frontMatterFences[lines[0]?.trimEnd() ?? ''];
  if (!closing) {
    return 0;
  }
  const end = lines.findIndex((line, index) => index > 0 && closing.includes(line.trimEnd()));
  return end < 0 ? 0 : end + 1;
}

/** DoctypeEdit is a change of the text for the comment, with the number of lines that it adds, or removes when negative. */
export interface DoctypeEdit {
  start: Position;
  end: Position;
  text: string;
  /** lines is the number of lines that the edit adds. */
  lines: number;
}

/**
 * doctypeEdit returns the change of a text for the comment, or undefined when the text needs none. A text with notes
 * gets the comment at its top, after its front matter, with a blank line after it. A comment of a lower version, or
 * without a version, is written anew; a comment of the same or a higher version stays as it is, also with another
 * text. A text without notes loses the comment and the blank line after it.
 * @param lines - The lines of the text.
 * @param hasNotes - Whether the text has notes after the change of the extension.
 */
export function doctypeEdit(lines: readonly string[], hasNotes: boolean): DoctypeEdit | undefined {
  const found = findDoctype(lines);
  if (found && !hasNotes) {
    const end = lines[found.end + 1] === '' ? found.end + 2 : found.end + 1;
    if (end < lines.length) {
      return { start: { line: found.start, character: 0 }, end: { line: end, character: 0 }, text: '', lines: found.start - end };
    }
    // The comment ends the text: the line break before it goes with it.
    const start = found.start > 0 ? { line: found.start - 1, character: lines[found.start - 1].length } : { line: 0, character: 0 };
    return { start, end: { line: lines.length - 1, character: lines[lines.length - 1].length }, text: '', lines: start.line - (lines.length - 1) };
  }
  if (!hasNotes) {
    return undefined;
  }
  const text = doctypeLines.join('\n');
  if (found) {
    return found.version !== undefined && compareVersions(formatVersion, found.version) <= 0
      ? undefined
      : { start: { line: found.start, character: 0 }, end: { line: found.end, character: lines[found.end].length }, text, lines: doctypeLines.length - 1 - (found.end - found.start) };
  }
  const at = frontMatterEnd(lines);
  if (at >= lines.length) {
    // The text is only its front matter.
    const last = lines.length - 1;
    return { start: { line: last, character: lines[last].length }, end: { line: last, character: lines[last].length }, text: `\n${text}`, lines: doctypeLines.length };
  }
  const blank = lines[at].trim() === '' ? '' : '\n';
  return { start: { line: at, character: 0 }, end: { line: at, character: 0 }, text: `${text}\n${blank}`, lines: doctypeLines.length + (blank ? 1 : 0) };
}
