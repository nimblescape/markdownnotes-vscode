// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

/**
 * These tests check the smooth scroll of a text editor to a note (R-SIDE-007)
 * with a fake of the editor API: the steps from the middle of the visible text
 * to the place, which start and end slowly, the scroll at once without
 * `editor.smoothScrolling`, and the end of a scroll by a click or a new scroll.
 */

import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { Fake, FakeEditor, FakePosition, FakeRange } from './testing/fakeVscode';

vi.mock('vscode', () => ({}));

/** fake is the fake API of the test. */
let fake: Fake;

beforeEach(() => {
  vi.useFakeTimers();
  fake = new Fake();
  vi.resetModules();
  vi.doMock('vscode', () => fake.api);
});

afterEach(() => {
  vi.useRealTimers();
});

/** editor returns a text editor of a document of 200 lines that shows the lines 0 to 20. */
const editor = () => {
  const shown = new FakeEditor(fake.open('Line.\n'.repeat(200)));
  shown.visibleRanges = [new FakeRange(0, 0, 20, 0)];
  return shown;
};

test('a scroll goes in steps from the middle of the visible text to the place, slowly at the start and at the end (R-SIDE-007)', async () => {
  const { scrollTime, scrollTo } = await import('./scrolling');
  const shown = editor();
  const done = scrollTo(shown as never, new FakePosition(150, 0) as never);
  expect(shown.revealed).toEqual([]);
  await vi.advanceTimersByTimeAsync(scrollTime);
  await done;
  const lines = shown.revealed.map((range) => range.start.line);
  expect(lines.at(-1)).toBe(150);
  expect(lines).toEqual([...lines].sort((one, other) => one - other));
  const moves = lines.slice(1).map((line, index) => line - lines[index]);
  const middle = Math.floor(moves.length / 2);
  expect(lines[0] - 10).toBeLessThan(3);
  expect(moves[0]).toBeLessThan(moves[middle]);
  expect(moves.at(-1)).toBeLessThan(moves[middle]);
});

test('without editor.smoothScrolling, a scroll goes to the place at once (R-SIDE-007)', async () => {
  const { scrollTo } = await import('./scrolling');
  fake.settings.set('', { 'editor.smoothScrolling': false });
  const shown = editor();
  await scrollTo(shown as never, new FakePosition(150, 0) as never);
  expect(shown.revealed).toEqual([new FakeRange(150, 0, 150, 0)]);
});

test('a click into the text editor stops a scroll, and so does a new scroll of the same editor (R-SIDE-007)', async () => {
  const { scrollTime, scrollTo } = await import('./scrolling');
  const shown = editor();
  void scrollTo(shown as never, new FakePosition(150, 0) as never);
  await vi.advanceTimersByTimeAsync(scrollTime / 3);
  const count = shown.revealed.length;
  expect(count).toBeGreaterThan(0);
  fake.fire('selection', { textEditor: shown, kind: 2 });
  await vi.advanceTimersByTimeAsync(scrollTime);
  expect(shown.revealed).toHaveLength(count);
  void scrollTo(shown as never, new FakePosition(150, 0) as never);
  await vi.advanceTimersByTimeAsync(scrollTime / 3);
  void scrollTo(shown as never, new FakePosition(5, 0) as never);
  await vi.advanceTimersByTimeAsync(scrollTime);
  expect(shown.revealed.at(-1)!.start.line).toBe(5);
});
