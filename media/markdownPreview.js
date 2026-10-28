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

(() => {
  'use strict';

  const iconSelector = '.nimblescape-note-icon';

  /** hideDelay is the time in milliseconds after which a callout goes when the pointer left it and its icon. */
  const hideDelay = 300;

  /** gap is the distance in pixels between an icon and its callout, and between a callout and the window border. */
  const gap = 6;

  /** @type {{ icon: Element, callout: HTMLElement } | undefined} */
  let open;

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

  /** hide hides the open callout. */
  const hide = () => {
    clearTimeout(timer);
    if (open) {
      open.callout.hidden = true;
      open.icon.removeAttribute('aria-expanded');
      open = undefined;
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
  window.addEventListener('vscode.markdown.updateContent', hide);
})();
