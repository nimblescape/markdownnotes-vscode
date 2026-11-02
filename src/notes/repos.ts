// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * The sources of listings in other repositories ([R-CODE-006](../../docs/requirements.md#r-code-006)).
 *
 * The front matter of a paper names each other repository as a GitHub reference with a rev under `repos`, for example
 * `server: org/server@v2.1.0`, and a listing names a reference and a path, `<!-- listing: server:src/api.ts#read -->`.
 * The command `mp get` of nimblescape Markdown Paper clones each reference, detached at its rev, into
 * `.markdownpaper/repos/<name>/` of the project: the module finds the clone in the folder of the Markdown file or in a
 * folder above it, reads the file there, and gives the link of the caption the address of the file on GitHub at the
 * commit of the clone, `https://github.com/org/server/blob/<commit>/src/api.ts`, so that the link shows the code of the
 * code block, also for a reference to a branch. It reads the files only through a `Source`, so it works the same way in
 * VS Code and on the command line, and uses no API of VS Code.
 */

import { frontMatterEnd } from './doctype';
import type { Source } from './listings';

/** Reference is a reference of the front matter to another repository on GitHub, `owner/repo@rev`. */
export interface Reference {
  readonly owner: string;
  readonly repo: string;
  /** rev is the tag, the commit or the branch after `@`, or undefined for the default branch. */
  readonly rev?: string;
}

/**
 * referenceValue matches the value of a reference: the owner, the repository and the optional rev after `@`, also with
 * the older prefix `github:`, which `mp get` reads too.
 */
const referenceValue = /^(?:github:)?([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)\/([A-Za-z0-9._-]+?)(?:\.git)?(?:@([^\s@]+))?$/;

/** referenceName matches the name of a reference: letters, digits, `.`, `_` and `-`, from a letter or a digit. */
const referenceName = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * scalarOf returns the text of a YAML scalar without its quotes and without a comment after it.
 * @param text - The scalar as the line holds it.
 */
const scalarOf = (text: string): string => {
  const value = text.trim();
  const quoted = /^(["'])(.*)\1$/.exec(value);
  return quoted ? quoted[2] : value.replace(/\s+#.*$/, '').trim();
};

/**
 * referencesOf returns the references under `repos` of the YAML front matter of a text, by their names: a map of a
 * block, one `name: owner/repo@rev` on each indented line, or a map of a flow, `repos: { server: org/server@v2.1.0 }`.
 * A value that is no reference is left out.
 * @param lines - The lines of the text.
 */
export function referencesOf(lines: readonly string[]): Map<string, Reference> {
  const references = new Map<string, Reference>();
  const end = frontMatterEnd(lines);
  if (end === 0 || lines[0].trimEnd() !== '---') {
    return references;
  }
  /** add adds an entry `name: value` when both are valid. */
  const add = (name: string, value: string) => {
    const key = scalarOf(name);
    const match = referenceValue.exec(scalarOf(value));
    if (referenceName.test(key) && match) {
      references.set(key, { owner: match[1], repo: match[2], ...(match[3] ? { rev: match[3] } : {}) });
    }
  };
  const start = lines.findIndex((line, index) => index > 0 && index < end - 1 && /^repos[ \t]*:/.test(line));
  if (start < 0) {
    return references;
  }
  const rest = lines[start].replace(/^repos[ \t]*:/, '').replace(/\s+#.*$/, '').trim();
  const flow = /^\{(.*)\}$/.exec(rest);
  if (flow) {
    for (const entry of flow[1].split(',')) {
      const colon = entry.indexOf(':');
      if (colon > 0) {
        add(entry.slice(0, colon), entry.slice(colon + 1));
      }
    }
    return references;
  }
  for (const line of lines.slice(start + 1, end - 1)) {
    if (line.trim() === '' || /^\s*#/.test(line)) {
      continue;
    }
    // The map ends at the next line without indentation.
    const entry = /^[ \t]+([^:#]+):[ \t]*(.*)$/.exec(line);
    if (!entry) {
      break;
    }
    add(entry[1], entry[2]);
  }
  return references;
}

/**
 * referencePath returns the name of the reference and the path in its repository of the path of a listing such as
 * `server:src/api.ts`, or undefined for a path in the repository of the paper.
 * @param path - The path of the listing.
 */
export function referencePath(path: string): { name: string; path: string } | undefined {
  const match = /^([A-Za-z0-9][A-Za-z0-9._-]*):(?!\/\/)(.+)$/.exec(path);
  return match ? { name: match[1], path: match[2].replace(/^(\.?\/)+/, '') } : undefined;
}

/** cloneFolder is the folder of the clones of `mp get` in the project, relative to the root of the project. */
export const cloneFolder = '.markdownpaper/repos';

/**
 * pinnedCloneOf returns the folder of the clone that holds a file, with a `/` at its end, when the clone is pinned to a
 * tag or a commit: a clone in `.markdownpaper/repos/<name>/` whose `.git/HEAD` names a commit and no branch. `mp get`
 * checks out a reference to a branch as that branch, so its clone is for changes, such as new snippets, and a pinned
 * clone is not ([decision 60](../../docs/requirements.md#decisions)). A file outside a clone, or in a clone on a branch,
 * gives undefined. In nested clones, the innermost one counts.
 * @param path - The path of the file, with `/` between its folders.
 * @param read - Reads a file by its path, or returns undefined.
 */
export function pinnedCloneOf(path: string, read: (path: string) => string | undefined): string | undefined {
  const clone = new RegExp(`^(.*/${escaped(cloneFolder)}/[^/]+/)`).exec(path)?.[1];
  const head = clone === undefined ? undefined : read(`${clone}.git/HEAD`)?.trim();
  return head !== undefined && /^[0-9a-f]{40}([0-9a-f]{24})?$/.test(head) ? clone : undefined;
}

/** levels is the number of folders above the Markdown file in which the module looks for the clones. */
const levels = 16;

/**
 * SourceFile is the file of a listing: its path relative to the Markdown file, which the source reads, the address of
 * the file for the link of its caption, and the pattern of the earlier addresses of the file, whose links the caption
 * drops.
 */
export interface SourceFile {
  readonly path: string;
  readonly address: string;
  readonly pattern: string;
  /** reference is the name of the reference of a file of another repository. */
  readonly reference?: string;
  /** clone is the folder of the clone of the reference, relative to the Markdown file, with a `/` at its end. */
  readonly clone?: string;
}

/** MissingFile is a file of a listing in another repository that cannot be read, and the reason. */
export interface MissingFile {
  /** problem is `reference` for a name that the front matter does not name, and `clone` for a missing clone. */
  readonly problem: 'reference' | 'clone' | 'path';
  readonly reference: string;
}

/** escaped returns a text with the characters of a regular expression escaped. */
const escaped = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * commitOf returns the commit of the clone in a folder: the commit of its detached head, or of the branch of its head
 * in the folder `refs` or in `packed-refs` of its Git folder, or undefined.
 * @param folder - The folder of the clone, relative to the Markdown file, with a `/` at its end.
 * @param source - Reads the files.
 */
function commitOf(folder: string, source: Source): string | undefined {
  const head = source(`${folder}.git/HEAD`)?.trim();
  if (head === undefined) {
    return undefined;
  }
  if (/^[0-9a-f]{40}([0-9a-f]{24})?$/.test(head)) {
    return head;
  }
  const ref = /^ref:\s*(refs\/\S+)$/.exec(head)?.[1];
  if (!ref) {
    return undefined;
  }
  const loose = source(`${folder}.git/${ref}`)?.trim();
  if (loose && /^[0-9a-f]{40}([0-9a-f]{24})?$/.test(loose)) {
    return loose;
  }
  return source(`${folder}.git/packed-refs`)
    ?.split(/\r?\n/)
    .map((line) => /^([0-9a-f]{40}(?:[0-9a-f]{24})?) (\S+)$/.exec(line))
    .find((match) => match?.[2] === ref)?.[1];
}

/**
 * sourceFilesOf returns the reader of the files of the listings of a text: a path in the repository of the paper stays
 * as it is; a path of a reference of the front matter, `server:src/api.ts`, goes to the clone of the reference in the
 * folder `.markdownpaper/repos/server/` of the folder of the text or of the first folder above it that has that clone,
 * with the address of the file on GitHub at the commit of the clone. A path of another repository with `..` in it, a
 * name that the front matter does not name, and a reference without a clone give a missing file.
 * @param lines - The lines of the text.
 * @param source - Reads the files, by their paths relative to the Markdown file.
 */
export function sourceFilesOf(lines: readonly string[], source: Source): (path: string) => SourceFile | MissingFile {
  const references = referencesOf(lines);
  const folders = new Map<string, { folder: string; commit: string | undefined } | undefined>();
  /** cloneOf returns the folder and the commit of the clone of a reference, once for each name. */
  const cloneOf = (name: string) => {
    if (!folders.has(name)) {
      let found: { folder: string; commit: string | undefined } | undefined;
      for (let level = 0; level <= levels && !found; level++) {
        const folder = `${'../'.repeat(level)}${cloneFolder}/${name}/`;
        if (source(`${folder}.git/HEAD`) !== undefined) {
          found = { folder, commit: commitOf(folder, source) };
        }
      }
      folders.set(name, found);
    }
    return folders.get(name);
  };
  return (path) => {
    const other = referencePath(path);
    if (!other) {
      return { path, address: path, pattern: escaped(path) };
    }
    const reference = references.get(other.name);
    if (!reference) {
      return { problem: 'reference', reference: other.name };
    }
    if (other.path.split('/').some((segment) => segment === '..')) {
      return { problem: 'path', reference: other.name };
    }
    const clone = cloneOf(other.name);
    if (!clone) {
      return { problem: 'clone', reference: other.name };
    }
    const repository = `https://github.com/${reference.owner}/${reference.repo}/blob/`;
    return {
      path: `${clone.folder}${other.path}`,
      address: `${repository}${clone.commit ?? reference.rev ?? 'HEAD'}/${other.path}`,
      pattern: `${escaped(repository)}[^/\\s()]+/${escaped(other.path)}`,
      reference: other.name,
      clone: clone.folder,
    };
  };
}

/**
 * isMissing tells whether the file of a listing cannot be read because of its reference.
 * @param file - The file.
 */
export const isMissing = (file: SourceFile | MissingFile): file is MissingFile => 'problem' in file;

/**
 * missingMessage returns the message of a file of another repository that cannot be read, for the warning in VS Code
 * and the message of the command; the commands that it names are those of the instructions for AI agents.
 * @param file - The missing file.
 */
export function missingMessage(file: MissingFile): string {
  switch (file.problem) {
    case 'reference':
      return `"${file.reference}" is no reference under repos in the front matter. Add it with: npx -y @nimblescape/markdownpaper get owner/repo@rev --name ${file.reference}, and the path of the Markdown file when the project has more than one paper.`;
    case 'clone':
      return `The repository "${file.reference}" is not cloned. Clone it with: npx -y @nimblescape/markdownpaper get`;
    case 'path':
      return `The path of a listing of the repository "${file.reference}" must stay inside the repository, without "..".`;
  }
}
