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
// opens the note in the side view of the extension (R-PREV-003).
//
// The plugin writes the start and the end of the selection of a note as two
// empty elements with the ID of the selection (R-NOTE-006). The script
// highlights the text between them in the color of the note, with the CSS
// Custom Highlight API, which changes no element of the page. A selection
// without a start begins at the start of the block of its end. While the
// callout of a note shows, its selection has a stronger highlight.

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
   * targetOf returns the element of an event.
   * @param {Event} event
   * @returns {Element | null}
   */
  const targetOf = (event) => (event.target instanceof Element ? event.target : null);

  document.addEventListener('mouseover', (event) => {
    const target = targetOf(event);
    const icon = target?.closest(iconSelector);
    if (icon) {
      show(icon);
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
    if (targetOf(event)?.closest(iconSelector)) {
      hide();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      hide();
    }
  });
  window.addEventListener('scroll', hide, { passive: true });
  window.addEventListener('vscode.markdown.updateContent', () => {
    hide();
    highlight();
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', highlight);
  } else {
    highlight();
  }
})();
