// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The script of the notes in the built-in Markdown preview (R-PREV-001). The
// preview shows no text, no icon and no callout of a note (Hannes,
// 2026-10-28: "we completely drop the callouts on hover view", "we completely
// drop the callout icons in the preview view"); the side view shows the
// notes. The markdown-it plugin of the extension writes the start and the end
// of the highlight of each note, the text from its start marker to its
// reference, as two empty elements with the ID of the highlight (R-NOTE-006).
// The script paints the text between them in the color of the note, with the
// CSS Custom Highlight API, which changes no element of the page: a clear
// highlight with a line below it, so that it stands out of the text (Hannes,
// 2026-10-28: "when viewed make it good contrast"), and a strong one under
// the pointer. An end with the attribute data-hidden (setting showHighlights
// off) shows no highlight, unless its note is selected or the pointer is on its
// text (Hannes, 2026-10-28: "even when the highlights are hidden, hover over a
// highlight always shows the highlight"). A highlight without a start begins
// at the start of the block of its end.
//
// VS Code passes a click in the preview to the extension only when the click
// of the user is on a link: the page follows any other link itself, also a
// link of a click of a script, which leaves the page empty. So the script
// puts the content of the page into a link of an open shadow tree of the
// body: a link with the CSS `display: contents` around the slot of the
// content, so the page shows and works as before. The link has an address
// only for the time of a click: when the user presses the mouse button on a
// highlight, also a hidden one, the address of its end (data-href) with the
// path that only selects the note (R-PREV-003); for the second press of a
// double click on a highlight, the address itself, which also opens the side
// view (Hannes, 2026-10-29: "only a double click on a selected highlight shall
// open the side view", "in both text and preview"); on the text outside a
// highlight while a note is selected, the address that deselects the note.
// The second press of a double click on a highlight selects no word, and its
// double click does not open the text editor, as a double click on other text
// does. The script arms only an address of this extension (ownLink), so that
// HTML of a file with the same attributes opens no other address with a click.
// A click on a link of the text, the end of a drag that selects text, and a
// double click on other text open no address of the script.
// Chromium sends no click when the element of the press leaves the page
// before the release, so the script moves no element of the page; and the
// path of an event, where VS Code looks for the link, holds no element of a
// closed shadow tree, so the shadow tree is open.
//
// Selected text that a note can highlight, text of one block, gets the button
// "Add Note" above it (R-PREV-008; Hannes, 2026-10-29: "notes cannot be added
// in the preview view, but this should be possible as well"). Its click goes
// to the extension through the link of the page as well: the address of the
// hidden element of the plugin at the end of the page, with the line of the
// block, the text of the block before the selected text, and the selected
// text. The extension finds the text in the file and opens the editor of the
// new note in the side view. The press on the button keeps the selection.
//
// The end of the highlight of the selected note of the side view has the
// attribute data-selected: its highlight is strong with a frame of thin lines
// in the color of the note, one for each line of the text, and the highlights
// of the other notes are dimmed. An end with the attribute data-reveal asks
// the preview to scroll to the note; the script scrolls once for each number
// of the attribute, smoothly as the side view (Hannes, 2026-10-29: "use smooth
// scrolling as in the side view"), unless the system asks for less motion.

(() => {
  'use strict';

  /** edgeSelector finds the empty elements at the start and the end of a highlight. */
  const edgeSelector = '.nimblescape-note-edge';

  /** endSelector finds the ends of the highlights, which hold the attributes of their notes. */
  const endSelector = `${edgeSelector}[data-edge="end"]`;

  /** blockSelector finds the block of the end of a highlight without a start. */
  const blockSelector = 'p, li, h1, h2, h3, h4, h5, h6, td, th, dd, dt';

  /** pageSelector finds the hidden element of the plugin that holds the address of "Add Note" for the page. */
  const pageSelector = '.nimblescape-note-page';

  /** textSelector finds the element of the text that a note can highlight: a table cell, or a block with its line. */
  const textSelector = 'td, th, [data-line]';

  /** controlSelector finds the elements whose click is their own: links and form controls. */
  const controlSelector = 'a, button, input, textarea, select, summary, label, [contenteditable]';

  /** @type {Map<Element, { range: Range, color: string, shown: boolean }>} the range, the color and the visibility of the highlight of each end. */
  let highlights = new Map();

  /** @type {string | undefined} the number of the last request to scroll to a note, which the script did. */
  let revealed;

  /** @type {string | undefined} the selected note that a click outside its highlight deselected: its label and its request to scroll. */
  let dismissed;

  /** @type {Element | undefined} the end of the highlight under the pointer. */
  let hovered;

  /** @type {HTMLAnchorElement | undefined} the link of the script around the content of the page, in the shadow tree of the body. */
  let pageLink;

  /** @type {'open' | 'select' | 'deselect' | 'add' | undefined} what the address of the link of the page does. */
  let armed;

  /** @type {string | undefined} the address of the button "Add Note": the address of the page with the selected text. */
  let addHref;

  /** @type {string | undefined} the address of the last click on "Add Note": its button stays hidden until the selection changes. */
  let added;

  /** @type {boolean} whether the user holds the mouse button down, for example while selecting text. */
  let pressed = false;

  /** addButton is the button "Add Note" above the selected text. */
  const addButton = (() => {
    const button = document.createElement('div');
    button.className = 'nimblescape-note-add';
    button.setAttribute('role', 'button');
    button.title = 'Add a note to the selected text';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    // The icon "comment" of the codicons 0.0.46-24.
    path.setAttribute(
      'd',
      'M1 4.5C1 3.11929 2.11929 2 3.5 2H12.5C13.8807 2 15 3.11929 15 4.5V9.5C15 10.8807 13.8807 12 12.5 12H8.68787L5.62533 14.6797C4.99168 15.2342 4 14.7842 4 13.9422V12H3.5C2.11929 12 1 10.8807 1 9.5V4.5ZM3.5 3C2.67157 3 2 3.67157 2 4.5V9.5C2 10.3284 2.67157 11 3.5 11H5V13.8981L8.31213 11H12.5C13.3284 11 14 10.3284 14 9.5V4.5C14 3.67157 13.3284 3 12.5 3H3.5Z',
    );
    svg.append(path);
    const label = document.createElement('span');
    label.textContent = 'Add Note';
    button.append(svg, label);
    return button;
  })();

  /** frames holds the frame of the highlight of the selected note: one element for each line of its text. */
  const frames = document.createElement('div');
  frames.className = 'nimblescape-note-frames';
  frames.setAttribute('aria-hidden', 'true');

  /**
   * registryOf returns the highlights of the page, or undefined in a browser without the CSS Custom Highlight API.
   * @returns {HighlightRegistry | undefined}
   */
  const registryOf = () => (typeof CSS !== 'undefined' && CSS.highlights && typeof Highlight === 'function' ? CSS.highlights : undefined);

  /** motion returns how the preview scrolls to a note: smoothly, as the side view, unless the system asks for less motion. */
  const motion = () => (window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth');

  /**
   * keyOf returns the key of the selected note of an end: its label and its request to scroll.
   * @param {Element} end
   */
  const keyOf = (end) => `${end.getAttribute('data-note') ?? ''} ${end.getAttribute('data-reveal') ?? ''}`;

  /**
   * chosen returns the end of the highlight of the selected note of the side view, unless a click outside its highlight
   * deselected it.
   * @returns {Element | undefined}
   */
  const chosen = () => {
    const end = document.querySelector(`${endSelector}[data-selected]`) ?? undefined;
    return end && keyOf(end) !== dismissed ? end : undefined;
  };

  /**
   * rangeOf returns the range of the highlight that ends at an end: from its start, or from the start of the block of
   * the end, to the end.
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

  /** highlight finds the highlight of each note, and paints them. */
  const highlight = () => {
    highlights = new Map();
    for (const end of document.querySelectorAll(endSelector)) {
      const range = rangeOf(end);
      if (range) {
        highlights.set(end, { range, color: end.getAttribute('data-color') ?? '1', shown: !end.hasAttribute('data-hidden') });
      }
    }
    if (!document.querySelector(`${endSelector}[data-selected]`)) {
      dismissed = undefined;
    }
    // The link of the page exists before the first click, so that a click changes nothing of the page.
    if (document.body && (highlights.size > 0 || document.querySelector(pageSelector))) {
      linkOfPage();
    }
    hovered = undefined;
    paint();
  };

  /**
   * paint paints the highlight of each note in the color of the note: clear, or dimmed while another note is selected;
   * the selected note strong with a frame, and the highlight under the pointer strong. A hidden highlight shows only
   * while its note is selected or the pointer is on it. It scrolls to the selected note on a request.
   */
  const paint = () => {
    const selected = chosen();
    document.documentElement.toggleAttribute('data-nimblescape-chosen', selected !== undefined);
    const registry = registryOf();
    if (registry) {
      for (const name of [...registry.keys()]) {
        if (name.startsWith('nimblescape-note-')) {
          registry.delete(name);
        }
      }
      /** @type {Map<string, { ranges: Range[], priority: number }>} */
      const named = new Map();
      /**
       * add adds a range to a highlight of the registry.
       * @param {string} name
       * @param {Range} range
       * @param {number} priority
       */
      const add = (name, range, priority) => named.set(name, { ranges: [...(named.get(name)?.ranges ?? []), range], priority });
      for (const [end, { range, color, shown }] of highlights) {
        if (end === selected) {
          add(`nimblescape-note-${color}-selected`, range, 2);
        } else {
          if (shown) {
            add(`nimblescape-note-${color}${selected ? '-dim' : ''}`, range, 0);
          }
          if (end === hovered) {
            add(`nimblescape-note-${color}-active`, range, 1);
          }
        }
      }
      for (const [name, { ranges, priority }] of named) {
        const painted = new Highlight(...ranges);
        painted.priority = priority;
        registry.set(name, painted);
      }
    }
    const own = selected ? highlights.get(selected) : undefined;
    frame(own?.range, own?.color ?? '');
    const request = selected?.getAttribute('data-reveal') ?? undefined;
    if (selected && request !== undefined && request !== revealed) {
      revealed = request;
      (frames.firstElementChild ?? selected).scrollIntoView({ block: 'center', behavior: motion() });
    }
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

  /**
   * highlightAt returns the end of the highlight at a point of the window, also of a hidden one: of the highlight that
   * starts last, so that a highlight inside another one wins, or undefined.
   * @param {number} x
   * @param {number} y
   * @returns {Element | undefined}
   */
  const highlightAt = (x, y) => {
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
    for (const [end, { range }] of highlights) {
      if (range.isPointInRange(caret.offsetNode, caret.offset) && (!found || range.compareBoundaryPoints(Range.START_TO_START, found.range) > 0)) {
        found = { end, range };
      }
    }
    return found?.end;
  };

  /**
   * targetOf returns the element of an event.
   * @param {Event} event
   * @returns {Element | null}
   */
  const targetOf = (event) => (event.target instanceof Element ? event.target : null);

  /**
   * linkOfPage returns the link around the content of the page, which it creates the first time, or undefined when the
   * body has a shadow tree of another script.
   * @returns {HTMLAnchorElement | undefined}
   */
  const linkOfPage = () => {
    if (!pageLink && typeof document.body.attachShadow === 'function' && !document.body.shadowRoot) {
      const root = document.body.attachShadow({ mode: 'open' });
      const link = document.createElement('a');
      link.style.cssText = 'display: contents; color: inherit; text-decoration: inherit; cursor: inherit; outline: none;';
      link.draggable = false;
      link.append(document.createElement('slot'));
      root.append(link);
      pageLink = link;
    }
    return pageLink;
  };

  /**
   * ownLink matches the addresses of the extension that the plugin writes: a URI of VS Code for the extension that opens,
   * selects or deselects a note, or adds one.
   */
  const ownLink = /^[a-z][a-z0-9+.-]*:\/\/nimblescape\.nimblescape-markdownnotes\/(open|select|deselect|add)(\?|$)/;

  /**
   * selectLink returns the address that only selects the note of the address of the end of a highlight, which also
   * opens the side view.
   * @param {string} href - The address of the end of the highlight.
   */
  const selectLink = (href) => href.replace(/^([a-z][a-z0-9+.-]*:\/\/nimblescape\.nimblescape-markdownnotes)\/open(?=\?|$)/, '$1/select');

  /**
   * arm gives the link of the page an address of the extension for the time of a click.
   * @param {string} href - The address.
   * @param {'open' | 'select' | 'deselect' | 'add'} kind - What the address does.
   */
  const arm = (href, kind) => {
    const link = linkOfPage();
    if (link && ownLink.test(href)) {
      link.href = href;
      armed = kind;
    }
  };

  /** disarm takes the address from the link of the page, so that a click opens no address of the script. */
  const disarm = () => {
    pageLink?.removeAttribute('href');
    armed = undefined;
  };

  /**
   * elementOf returns the element of a node: the node, or the element that holds it.
   * @param {Node} node
   * @returns {Element | null}
   */
  const elementOf = (node) => (node instanceof Element ? node : node.parentElement);

  /**
   * selectedText returns the address of "Add Note" for the selected text of the page, and the rectangles of its lines;
   * or undefined when no text is selected, the text is not in one block, or the page can have no notes. A selection to
   * the start of the next block, as of a triple click, holds the text to the end of its block.
   * @returns {{ href: string, rects: DOMRect[] } | undefined}
   */
  const selectedText = () => {
    const base = [...document.querySelectorAll(pageSelector)].at(-1)?.getAttribute('data-add');
    const selection = document.getSelection();
    if (!base || !ownLink.test(base) || !selection || selection.rangeCount !== 1 || selection.isCollapsed) {
      return undefined;
    }
    const range = selection.getRangeAt(0).cloneRange();
    const block = elementOf(range.startContainer)?.closest(textSelector);
    if (!block || block.closest('pre') || addButton.contains(range.startContainer) || frames.contains(range.startContainer)) {
      return undefined;
    }
    if (elementOf(range.endContainer)?.closest(textSelector) !== block) {
      const own = document.createRange();
      own.setStart(range.startContainer, range.startOffset);
      own.setEnd(block, block.childNodes.length);
      if (own.toString().trim() !== range.toString().trim()) {
        return undefined;
      }
      range.setEnd(block, block.childNodes.length);
    }
    const text = range.toString();
    const lined = block.closest('[data-line]');
    const line = lined?.getAttribute('data-line');
    if (text.trim() === '' || !lined || !line) {
      return undefined;
    }
    const before = document.createRange();
    before.setStart(lined, 0);
    before.setEnd(range.startContainer, range.startOffset);
    const query = new URLSearchParams({ line, before: before.toString(), text }).toString();
    return { href: `${base}&${query}`, rects: [...range.getClientRects()].filter((rect) => rect.width > 0 && rect.height > 0) };
  };

  /** hideAdd takes the button "Add Note" from the page. */
  const hideAdd = () => {
    addHref = undefined;
    addButton.remove();
  };

  /**
   * showAdd shows the button "Add Note" above the first line of the selected text that a note can highlight, or below
   * its last line at the top of the page, and else hides it. It waits while the user holds the mouse button down, and
   * after a click on the button it waits for another selection.
   */
  const showAdd = () => {
    const place = pressed ? undefined : selectedText();
    const first = place?.rects[0];
    const last = place?.rects.at(-1);
    if (place?.href !== added) {
      added = undefined;
    }
    if (!place || !first || !last || added !== undefined) {
      hideAdd();
      return;
    }
    addHref = place.href;
    document.body.append(addButton);
    addButton.style.left = '0px';
    addButton.style.top = '0px';
    const origin = addButton.getBoundingClientRect();
    const above = first.top - origin.height - 4;
    const top = above >= 0 ? above : last.bottom + 4;
    const left = Math.max(0, Math.min(above >= 0 ? first.left : last.left, document.documentElement.clientWidth - origin.width));
    addButton.style.left = `${left - origin.left}px`;
    addButton.style.top = `${top - origin.top}px`;
  };

  /** @type {number | undefined} the timer of showAdd after a change of the selection. */
  let addTimer;

  /** showAddLater shows or hides the button "Add Note" after the changes of the selection of this moment. */
  const showAddLater = () => {
    clearTimeout(addTimer);
    addTimer = setTimeout(showAdd, 50);
  };

  /** dismiss deselects the selected note in the preview, until the side view selects a note again. */
  const dismiss = () => {
    const end = chosen();
    if (end) {
      dismissed = keyOf(end);
      paint();
    }
  };

  document.addEventListener('mousemove', (event) => {
    const target = targetOf(event);
    const end = target && !target.closest(controlSelector) && !addButton.contains(target) ? highlightAt(event.clientX, event.clientY) : undefined;
    if (end !== hovered) {
      hovered = end;
      document.documentElement.toggleAttribute('data-nimblescape-highlight', end !== undefined);
      paint();
    }
  });
  document.documentElement.addEventListener('mouseleave', () => {
    if (hovered) {
      hovered = undefined;
      document.documentElement.removeAttribute('data-nimblescape-highlight');
      paint();
    }
  });
  // The script listens on the window before the preview and VS Code listen on the document and on the window.
  window.addEventListener(
    'mousedown',
    (event) => {
      disarm();
      const target = targetOf(event);
      // The press on "Add Note" keeps the selection and the focus.
      if (target && addButton.contains(target)) {
        event.preventDefault();
        if (event.button === 0 && addHref) {
          arm(addHref, 'add');
        }
        return;
      }
      if (event.button === 0) {
        pressed = true;
      }
      if (event.button !== 0 || !target || target === document.body || target === document.documentElement || target.closest(controlSelector) || frames.contains(target)) {
        return;
      }
      const end = highlightAt(event.clientX, event.clientY);
      const href = end?.getAttribute('data-href');
      if (event.detail > 1) {
        // The second press of a double click on a highlight opens the side view and selects no word; on other text it
        // opens no address, so that the double click opens the text editor.
        if (href) {
          event.preventDefault();
          arm(href, 'open');
        }
        return;
      }
      const deselect = end ? undefined : chosen()?.getAttribute('data-deselect');
      if (href) {
        arm(selectLink(href), 'select');
      } else if (deselect) {
        arm(deselect, 'deselect');
      }
    },
    true,
  );
  window.addEventListener(
    'click',
    (event) => {
      if (!pageLink?.hasAttribute('href') || !event.composedPath().includes(pageLink)) {
        return;
      }
      // The page never follows the address itself; VS Code opens it, also after preventDefault. The address goes after
      // the click, when VS Code has read it.
      event.preventDefault();
      const kind = armed;
      setTimeout(disarm, 0);
      if (kind === 'add') {
        added = addHref;
        setTimeout(hideAdd, 0);
      } else if (!document.getSelection()?.isCollapsed) {
        event.stopImmediatePropagation();
      } else if (kind === 'deselect') {
        dismiss();
      }
    },
    true,
  );
  window.addEventListener(
    'mouseup',
    () => {
      setTimeout(disarm, 0);
      if (pressed) {
        pressed = false;
        showAddLater();
      }
    },
    true,
  );
  // A double click on a highlight opens the side view, not the text editor as the preview does for other text.
  window.addEventListener(
    'dblclick',
    (event) => {
      const target = targetOf(event);
      if (event.button === 0 && target && !target.closest(controlSelector) && !addButton.contains(target) && highlightAt(event.clientX, event.clientY)?.getAttribute('data-href')) {
        event.stopImmediatePropagation();
      }
    },
    true,
  );
  window.addEventListener('dragstart', disarm, true);
  window.addEventListener('blur', () => {
    pressed = false;
  });
  document.addEventListener('selectionchange', () => {
    if (!pressed) {
      showAddLater();
    }
  });
  window.addEventListener('resize', () => {
    paint();
    showAddLater();
  });
  window.addEventListener('vscode.markdown.updateContent', () => {
    highlight();
    showAddLater();
  });
  // The preview loads this script with `async`, and its own script adds the content to the page when the page is
  // parsed. This script can run before or after that, so it highlights now, when the page is parsed and when it is
  // loaded; highlight replaces the highlights of before.
  highlight();
  document.addEventListener('DOMContentLoaded', highlight);
  window.addEventListener('load', highlight);
})();
