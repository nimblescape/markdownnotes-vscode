// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The tests of the links to places of the file itself in the text editor (R-TEXT-011).

import { describe, expect, it } from 'vitest';
import { project, toClean } from './clean';
import type { Position } from './notes';
import { placeLinks } from './places';

/** linked returns each link as the text of its range and the text of the line of its target. */
function linked(lines: readonly string[], file?: readonly string[], toShown?: (position: Position) => Position | undefined): string[] {
  return placeLinks(lines, file, toShown).map((link) => `${lines[link.line].slice(link.start, link.end)} -> ${link.target.line}:${link.target.character} ${lines[link.target.line]}`);
}

describe('the links to places of the file', () => {
  it('go from a link to the heading with its GitHub ID, also to a second heading with the same text, and to an anchor of HTML', () => {
    const lines = ['# Report', '', '- [Methods](#methods)', '- [Again](#methods-1)', '- [Figure 1](#fig-plan "Plan")', '', '## Methods', '', '## Methods', '', 'Figure 1: Plan<a id="fig-plan"></a>'];
    expect(linked(lines)).toEqual([
      '[Methods](#methods) -> 6:0 ## Methods',
      '[Again](#methods-1) -> 8:0 ## Methods',
      '[Figure 1](#fig-plan "Plan") -> 10:14 Figure 1: Plan<a id="fig-plan"></a>',
    ]);
  });

  it('leave out a link without a target, a link to another file and a link in code', () => {
    const lines = ['[Gone](#gone) [Other](other.md#methods) `[Code](#methods)`', '', '```', '[Fence](#methods)', '```', '', '## Methods'];
    expect(linked(lines)).toEqual([]);
  });

  it('go from a footnote reference to its definition and from the label of the definition to its first reference', () => {
    const lines = ['Text.[^1] More.[^1]', '', '[^1]: The footnote.'];
    expect(linked(lines)).toEqual(['[^1] -> 2:0 [^1]: The footnote.', '[^1] -> 2:0 [^1]: The footnote.', '[^1] -> 0:5 Text.[^1] More.[^1]']);
  });

  it('find an anchor that the clean text hides in the text of the file, at the start of its line in the clean text', () => {
    const file = ['<!-- nimblescape-markdown-notes v1 -->', '', 'See [Figure 1](#fig-plan).', '', '![Plan](plan.png)', '', 'Figure 1: Plan<a id="fig-plan"></a>', ''];
    const projection = project(file.join('\n'));
    const clean = projection.clean.split('\n');
    expect(clean.join('\n')).not.toContain('<a id');
    const starts = file.map((_, line) => file.slice(0, line).join('\n').length + (line > 0 ? 1 : 0));
    const toShown = (position: Position): Position => {
      const offset = toClean(projection, starts[position.line] + position.character);
      const before = projection.clean.slice(0, offset).split('\n');
      return { line: before.length - 1, character: before.at(-1)!.length };
    };
    expect(linked(clean, file, toShown)).toEqual([`[Figure 1](#fig-plan) -> ${clean.indexOf('Figure 1: Plan')}:0 Figure 1: Plan`]);
  });
});
