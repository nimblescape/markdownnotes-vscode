// SPDX-License-Identifier: MIT
// © 2026 Hannes Stauss (scalarion@nimblescape.com)
// Licensed under the MIT License. See LICENSE in the repository root for details.

// The script of the notes in the built-in Markdown preview (R-PREV-002). The
// markdown-it plugin of the extension writes each note as an icon with a
// hidden callout, which the icon names in its attribute aria-describedby. The
// script shows the callout next to the icon while the pointer rests on the
// icon or on the callout, or while the icon has the keyboard focus, and hides
// it with Escape, on scrolling and when the preview gets new content. A click
// with the mouse on the icon shows no callout: it follows the link of the
// icon, which opens the note in the side view of the extension (R-PREV-003).
// The listeners are on the document, so they also work for the content of a
// later update of the preview. An icon with the attribute data-hover="off"
// (setting showCalloutOnHover off) shows its callout only with the keyboard
// focus, not under the pointer. An icon with the attribute data-icon="hidden"
// (setting showIconsInPreview off) does not show; its passage still does.
//
// The plugin writes the start and the end of the selection of a note, its
// passage, as two empty elements with the ID of the selection (R-NOTE-006).
// The script highlights the text between them in the color of the note, with
// the CSS Custom Highlight API, which changes no element of the page. A
// selection without a start begins at the start of the block of its end. Each
// passage has a faint highlight, and the passage under the pointer, or of the
// note whose callout shows, a strong one.
//
// VS Code passes a click in the preview to the extension only when the click
// of the user is on a link: the page follows any other link itself, also a
// link of a click of a script, which leaves the page empty. So the script
// puts the content of the page into a link of an open shadow tree of the
// body: a link with the CSS `display: contents` around the slot of the
// content, so the page shows and works as before. The link has an address
// only for the time of a click: when the user presses the mouse button on the
// text of a passage, the address of the icon of its note, so that the click
// selects the note in the side view, as a click on its icon does; on the text
// outside a passage while a note is selected, the address that deselects the
// note. A click on a link of the text, the end of a drag that selects text,
// and a double click, which opens the text editor, open no address of the
// script. Chromium sends no click when the element of the press leaves the
// page before the release, so the script moves no element of the page; and
// the path of an event, where VS Code looks for the link, holds no element of
// a closed shadow tree, so the shadow tree is open.
//
// The icon of the selected note of the side view has the attribute
// data-selected: its selection has a strong highlight and a frame of thin
// lines in the color of the note, one for each line of the text, and the
// passages and the icons of the other notes are dimmed. An icon with the
// attribute data-reveal asks the preview to scroll to the note; the script
// scrolls once for each number of the attribute.

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

  /** controlSelector finds the elements whose click is their own: links, form controls and the callouts. */
  const controlSelector = 'a, button, input, textarea, select, summary, label, [contenteditable], .nimblescape-note';

  /** @type {{ icon: Element, callout: HTMLElement } | undefined} */
  let open;

  /** @type {Map<Element, { range: Range, color: string }>} the range and the color of the selection of each icon. */
  let selections = new Map();

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;

  /** @type {string | undefined} the number of the last request to scroll to a note, which the script did. */
  let revealed;

  /** @type {string | undefined} the selected note that a click outside its passage deselected: its label and its request to scroll. */
  let dismissed;

  /** @type {Element | undefined} the icon of the passage under the pointer. */
  let hovered;

  /** @type {HTMLAnchorElement | undefined} the link of the script around the content of the page, in the shadow tree of the body. */
  let pageLink;

  /** @type {boolean} whether the address of the link of the page deselects the selected note. */
  let deselects = false;

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
   * keyOf returns the key of the selected note of an icon: its label and its request to scroll.
   * @param {Element} icon
   */
  const keyOf = (icon) => `${icon.getAttribute('data-note') ?? ''} ${icon.getAttribute('data-reveal') ?? ''}`;

  /**
   * chosen returns the icon of the selected note of the side view, unless a click outside its passage deselected it.
   * @returns {Element | undefined}
   */
  const chosen = () => {
    const icon = document.querySelector(`${iconSelector}[data-selected]`) ?? undefined;
    return icon && keyOf(icon) !== dismissed ? icon : undefined;
  };

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

  /** highlight finds the selection of each note, and paints them. */
  const highlight = () => {
    selections = new Map();
    for (const end of document.querySelectorAll(`${edgeSelector}[data-edge="end"]`)) {
      const range = rangeOf(end);
      // The icon of the note follows the end of its selection.
      const icon = end.nextElementSibling;
      if (range && icon?.matches(iconSelector)) {
        selections.set(icon, { range, color: end.getAttribute('data-color') ?? '1' });
      }
    }
    if (!document.querySelector(`${iconSelector}[data-selected]`)) {
      dismissed = undefined;
    }
    // The link of the page exists before the first click, so that a click changes nothing of the page.
    if (document.body && document.querySelector(iconSelector)) {
      linkOfPage();
    }
    hovered = undefined;
    paint();
  };

  /**
   * paint highlights the selection of each note in the color of the note: faint, or dimmed while another note is
   * selected; the selected note strong with a frame, and the passage under the pointer or of the open callout strong.
   * It scrolls to the selected note on a request.
   */
  const paint = () => {
    const icon = chosen();
    document.documentElement.toggleAttribute('data-nimblescape-chosen', icon !== undefined);
    const highlights = highlightsOf();
    if (highlights) {
      for (const name of [...highlights.keys()]) {
        if (name.startsWith('nimblescape-note-')) {
          highlights.delete(name);
        }
      }
      /** @type {Map<string, { ranges: Range[], priority: number }>} */
      const named = new Map();
      /**
       * add adds a range to a highlight.
       * @param {string} name
       * @param {Range} range
       * @param {number} priority
       */
      const add = (name, range, priority) => named.set(name, { ranges: [...(named.get(name)?.ranges ?? []), range], priority });
      const active = open?.icon ?? hovered;
      for (const [owner, { range, color }] of selections) {
        add(`nimblescape-note-${color}${icon && owner !== icon ? '-dim' : ''}`, range, 0);
        if (owner === icon) {
          add(`nimblescape-note-${color}-selected`, range, 2);
        }
        if (owner === active) {
          add(`nimblescape-note-${color}-active`, range, 1);
        }
      }
      for (const [name, { ranges, priority }] of named) {
        const painted = new Highlight(...ranges);
        painted.priority = priority;
        highlights.set(name, painted);
      }
    }
    const selection = icon ? selections.get(icon) : undefined;
    frame(selection?.range, selection?.color ?? '');
    const request = icon?.getAttribute('data-reveal') ?? undefined;
    if (icon && request !== undefined && request !== revealed) {
      revealed = request;
      (selection ? frames.firstElementChild ?? icon : icon).scrollIntoView({ block: 'center' });
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

  /** hide hides the open callout. */
  const hide = () => {
    clearTimeout(timer);
    if (open) {
      open.callout.hidden = true;
      open.icon.removeAttribute('aria-expanded');
      open = undefined;
      paint();
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
    paint();
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
   * arm gives the link of the page an address for the time of a click.
   * @param {string} href - The address.
   * @param {boolean} deselecting - Whether the address deselects the selected note.
   */
  const arm = (href, deselecting) => {
    const link = linkOfPage();
    if (link) {
      link.href = href;
      deselects = deselecting;
    }
  };

  /** disarm takes the address from the link of the page, so that a click opens no address of the script. */
  const disarm = () => {
    pageLink?.removeAttribute('href');
    deselects = false;
  };

  /** dismiss deselects the selected note in the preview, until the side view selects a note again. */
  const dismiss = () => {
    const icon = chosen();
    if (icon) {
      dismissed = keyOf(icon);
      paint();
    }
  };

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
  document.addEventListener('mousemove', (event) => {
    const target = targetOf(event);
    const icon = target && !target.closest(controlSelector) ? selectionAt(event.clientX, event.clientY) : undefined;
    if (icon !== hovered) {
      hovered = icon;
      document.documentElement.toggleAttribute('data-nimblescape-passage', icon !== undefined);
      paint();
    }
  });
  document.documentElement.addEventListener('mouseleave', () => {
    if (hovered) {
      hovered = undefined;
      document.documentElement.removeAttribute('data-nimblescape-passage');
      paint();
    }
  });
  document.addEventListener('focusin', (event) => {
    const icon = targetOf(event)?.closest(iconSelector);
    // Only the keyboard focus shows the callout; the focus of a click on the icon does not.
    if (icon?.matches(':focus-visible')) {
      show(icon);
    }
  });
  document.addEventListener('focusout', (event) => {
    if (targetOf(event)?.closest(iconSelector)) {
      hideLater();
    }
  });
  // The script listens on the window before the preview and VS Code listen on the document and on the window.
  window.addEventListener(
    'mousedown',
    (event) => {
      disarm();
      const target = targetOf(event);
      // The second press of a double click opens no address, so that the double click opens the text editor.
      if (event.button !== 0 || event.detail > 1 || !target || target === document.body || target === document.documentElement || target.closest(controlSelector) || frames.contains(target)) {
        return;
      }
      const icon = selectionAt(event.clientX, event.clientY);
      const href = icon?.getAttribute('href');
      const deselect = icon ? undefined : chosen()?.getAttribute('data-deselect');
      if (href) {
        arm(href, false);
      } else if (deselect) {
        arm(deselect, true);
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
      setTimeout(disarm, 0);
      if (!document.getSelection()?.isCollapsed) {
        event.stopImmediatePropagation();
      } else if (deselects) {
        dismiss();
      }
    },
    true,
  );
  window.addEventListener('mouseup', () => setTimeout(disarm, 0), true);
  window.addEventListener('dragstart', disarm, true);
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
  window.addEventListener('resize', paint);
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
