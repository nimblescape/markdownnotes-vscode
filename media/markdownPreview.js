// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The script of the notes in the built-in Markdown preview (R-PREV-002). The
// markdown-it plugin of the extension writes each note as an icon with a
// hidden callout, which the icon names in its attribute aria-describedby. The
// script shows the callout next to the icon while the pointer rests on the
// icon or on the callout, or while the icon has the keyboard focus, and hides
// it with Escape, on scrolling and when the preview gets new content. The
// listeners are on the document, so they also work for the content of a
// later update of the preview. A click on the icon follows its link, which
// opens the note in the side view of the extension (R-PREV-003). An icon with
// the attribute data-hover="off" (setting showCalloutOnHover off) shows its
// callout only with the keyboard focus, not under the pointer.
//
// The plugin writes the start and the end of the selection of a note as two
// empty elements with the ID of the selection (R-NOTE-006). The script
// highlights the text between them in the color of the note, with the CSS
// Custom Highlight API, which changes no element of the page. A selection
// without a start begins at the start of the block of its end. While the
// callout of a note shows, its selection has a stronger highlight. A click on
// the highlighted text of a selection follows the link of the icon of its
// note, as a click on the icon does; a click on a link in the selection, or
// the end of a drag that selects text, does not.
//
// The icon of the selected note of the side view has the attribute
// data-selected: its selection has a strong highlight and a frame of thin
// lines in the color of the note, one for each line of the text. An icon
// with the attribute data-reveal asks the preview to scroll to the note; the
// script scrolls once for each number of the attribute.

(() => {
  'use strict';

  const iconSelector = '.nimblescape-note-icon';

  /** hideDelay is the time in milliseconds after which a callout goes when the pointer left it and its icon. */
  const hideDelay = 300;

  /** gap is the distance in pixels between an icon and its callout, and between a callout and the window border. */
  const gap = 6;

  /** edgeSelector finds the empty elements at the start and the end of a selection. */
  const edgeSelector = '.nimblescape-note-edge';

  /** blockSelector finds the block of the end of a selection without a start. */
  const blockSelector = 'p, li, h1, h2, h3, h4, h5, h6, td, th, dd, dt';

  /** @type {{ icon: Element, callout: HTMLElement } | undefined} */
  let open;

  /** @type {Map<Element, { range: Range, name: string }>} the range and the name of the highlight of the selection of each icon. */
  let selections = new Map();

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;

  /** @type {string | undefined} the number of the last request to scroll to a note, which the script did. */
  let revealed;

  /** frames holds the frame of the selection of the selected note: one element for each line of its text. */
  const frames = document.createElement('div');
  frames.className = 'nimblescape-note-frames';
  frames.setAttribute('aria-hidden', 'true');

  /**
   * calloutOf returns the callout of an icon.
   * @param {Element} icon
   * @returns {HTMLElement | null}
   */
  const calloutOf = (icon) => {
    const id = icon.getAttribute('aria-describedby');
    return id ? document.getElementById(id) : null;
  };

  /**
   * highlightsOf returns the highlights of the page, or undefined in a browser without the CSS Custom Highlight API.
   * @returns {HighlightRegistry | undefined}
   */
  const highlightsOf = () => (typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight === 'function' ? CSS.highlights : undefined);

  /**
   * rangeOf returns the range of the selection that ends at an end edge: from its start edge, or from the start of the
   * block of the end, to the end edge.
   * @param {Element} end
   * @returns {Range | undefined}
   */
  const rangeOf = (end) => {
    const id = end.getAttribute('data-selection');
    const start = [...document.querySelectorAll(edgeSelector)].find(
      (edge) => edge.getAttribute('data-selection') === id && edge.getAttribute('data-edge') === 'start' && edge.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING,
    );
    const block = start ? undefined : end.closest(blockSelector);
    if (!start && !block) {
      return undefined;
    }
    const range = document.createRange();
    if (start) {
      range.setStartAfter(start);
    } else if (block) {
      range.setStart(block, 0);
    }
    range.setEndBefore(end);
    return range.collapsed ? undefined : range;
  };

  /** highlight highlights the selection of each note in the color of the note. */
  const highlight = () => {
    const highlights = highlightsOf();
    if (!highlights) {
      return;
    }
    for (const name of [...highlights.keys()]) {
      if (name.startsWith('nimblescape-note-')) {
        highlights.delete(name);
      }
    }
    selections = new Map();
    /** @type {Map<string, Range[]>} */
    const byColor = new Map();
    for (const end of document.querySelectorAll(`${edgeSelector}[data-edge="end"]`)) {
      const range = rangeOf(end);
      if (!range) {
        continue;
      }
      const name = `nimblescape-note-${end.getAttribute('data-color')}`;
      byColor.set(name, [...(byColor.get(name) ?? []), range]);
      // The icon of the note follows the end of its selection.
      const icon = end.nextElementSibling;
      if (icon?.matches(iconSelector)) {
        selections.set(icon, { range, name });
      }
    }
    for (const [name, ranges] of byColor) {
      highlights.set(name, new Highlight(...ranges));
    }
    choose();
  };

  /**
   * frame draws the frame of a range: one element for each line of its text, placed from the corner of the element of
   * the frames, so that the frame scrolls with the page.
   * @param {Range | undefined} range
   * @param {string} color - The number of the color of the note.
   */
  const frame = (range, color) => {
    frames.replaceChildren();
    if (!range) {
      frames.remove();
      return;
    }
    document.body.append(frames);
    const origin = frames.getBoundingClientRect();
    /** @type {Map<number, { left: number, top: number, right: number, bottom: number }>} */
    const lines = new Map();
    for (const rect of range.getClientRects()) {
      if (rect.width === 0 || rect.height === 0) {
        continue;
      }
      const key = Math.round(rect.top + rect.height / 2);
      const line = lines.get(key);
      lines.set(key, line ? { left: Math.min(line.left, rect.left), top: Math.min(line.top, rect.top), right: Math.max(line.right, rect.right), bottom: Math.max(line.bottom, rect.bottom) } : { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom });
    }
    for (const line of lines.values()) {
      const box = document.createElement('div');
      box.className = `nimblescape-note-frame nimblescape-note-color-${color}`;
      box.style.left = `${line.left - origin.left - 1}px`;
      box.style.top = `${line.top - origin.top - 1}px`;
      box.style.width = `${line.right - line.left + 2}px`;
      box.style.height = `${line.bottom - line.top + 2}px`;
      frames.append(box);
    }
  };

  /** choose gives the selection of the selected note the strong highlight and the frame, and scrolls to it on a request. */
  const choose = () => {
    const highlights = highlightsOf();
    for (const name of [...(highlights?.keys() ?? [])]) {
      if (name.endsWith('-selected')) {
        highlights?.delete(name);
      }
    }
    const icon = document.querySelector(`${iconSelector}[data-selected]`);
    const selection = icon ? selections.get(icon) : undefined;
    if (highlights && selection) {
      const strong = new Highlight(selection.range);
      strong.priority = 2;
      highlights.set(`${selection.name}-selected`, strong);
    }
    frame(selection?.range, selection ? selection.name.replace('nimblescape-note-', '') : '');
    const request = icon?.getAttribute('data-reveal') ?? undefined;
    if (icon && request !== undefined && request !== revealed) {
      revealed = request;
      icon.scrollIntoView({ block: 'center' });
    }
  };

  /**
   * emphasize gives the selection of an icon the stronger highlight, or removes it.
   * @param {Element | undefined} icon
   */
  const emphasize = (icon) => {
    const highlights = highlightsOf();
    if (!highlights) {
      return;
    }
    for (const name of [...highlights.keys()]) {
      if (name.endsWith('-active')) {
        highlights.delete(name);
      }
    }
    const selection = icon && selections.get(icon);
    if (selection) {
      const active = new Highlight(selection.range);
      active.priority = 1;
      highlights.set(`${selection.name}-active`, active);
    }
  };

  /** hide hides the open callout. */
  const hide = () => {
    clearTimeout(timer);
    if (open) {
      open.callout.hidden = true;
      open.icon.removeAttribute('aria-expanded');
      open = undefined;
      emphasize(undefined);
    }
  };

  /** hideLater hides the open callout after hideDelay. */
  const hideLater = () => {
    clearTimeout(timer);
    timer = setTimeout(hide, hideDelay);
  };

  /**
   * show shows the callout of an icon below the icon, or above it when there is no room below.
   * @param {Element} icon
   */
  const show = (icon) => {
    clearTimeout(timer);
    const callout = calloutOf(icon);
    if (!callout) {
      return;
    }
    if (open && open.callout !== callout) {
      hide();
    }
    open = { icon, callout };
    icon.setAttribute('aria-expanded', 'true');
    emphasize(icon);
    callout.hidden = false;
    const place = icon.getBoundingClientRect();
    const width = callout.offsetWidth;
    const height = callout.offsetHeight;
    const left = Math.max(gap, Math.min(place.left, window.innerWidth - width - gap));
    const below = place.bottom + gap;
    const above = place.top - gap - height;
    callout.style.left = `${left}px`;
    callout.style.top = `${below + height > window.innerHeight - gap && above >= gap ? above : below}px`;
  };

  /**
   * selectionAt returns the icon of the selection at a point of the window: the selection that starts last, so that a
   * selection inside another one wins, or undefined.
   * @param {number} x
   * @param {number} y
   * @returns {Element | undefined}
   */
  const selectionAt = (x, y) => {
    /** @type {{ offsetNode: Node, offset: number } | null} */
    const caret =
      typeof document.caretPositionFromPoint === 'function'
        ? document.caretPositionFromPoint(x, y)
        : (() => {
            const range = typeof document.caretRangeFromPoint === 'function' ? document.caretRangeFromPoint(x, y) : null;
            return range ? { offsetNode: range.startContainer, offset: range.startOffset } : null;
          })();
    if (!caret) {
      return undefined;
    }
    let found;
    for (const [icon, { range }] of selections) {
      if (range.isPointInRange(caret.offsetNode, caret.offset) && (!found || range.compareBoundaryPoints(Range.START_TO_START, found.range) > 0)) {
        found = { icon, range };
      }
    }
    return found?.icon;
  };

  /**
   * targetOf returns the element of an event.
   * @param {Event} event
   * @returns {Element | null}
   */
  const targetOf = (event) => (event.target instanceof Element ? event.target : null);

  document.addEventListener('mouseover', (event) => {
    const target = targetOf(event);
    const icon = target?.closest(iconSelector);
    if (icon && icon.getAttribute('data-hover') !== 'off') {
      show(icon);
    } else if (icon) {
      // The callout of an icon without hover stays as it is.
    } else if (open && target && open.callout.contains(target)) {
      clearTimeout(timer);
    } else if (open) {
      hideLater();
    }
  });
  document.addEventListener('focusin', (event) => {
    const icon = targetOf(event)?.closest(iconSelector);
    if (icon) {
      show(icon);
    }
  });
  document.addEventListener('focusout', (event) => {
    if (targetOf(event)?.closest(iconSelector)) {
      hideLater();
    }
  });
  document.addEventListener('click', (event) => {
    const target = targetOf(event);
    if (target?.closest(iconSelector)) {
      hide();
      return;
    }
    if (event.button !== 0 || target?.closest('a, button, input, textarea, select, summary') || !document.getSelection()?.isCollapsed) {
      return;
    }
    const icon = selectionAt(event.clientX, event.clientY);
    if (icon instanceof HTMLElement) {
      // The click of the icon goes to the link handler of the preview, as a click of the user does.
      icon.click();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      hide();
    }
  });
  window.addEventListener('scroll', hide, { passive: true });
  window.addEventListener('resize', choose);
  window.addEventListener('vscode.markdown.updateContent', () => {
    hide();
    highlight();
  });
  // The preview loads this script with `async`, and its own script adds the content to the page when the page is
  // parsed. This script can run before or after that, so it highlights now, when the page is parsed and when it is
  // loaded; highlight replaces the highlights of before.
  highlight();
  document.addEventListener('DOMContentLoaded', highlight);
  window.addEventListener('load', highlight);
})();
