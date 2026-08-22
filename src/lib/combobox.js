/**
 * ============================================================================
 * COMBOBOX KEYBOARD HELPER — WAI-ARIA LIST NAVIGATION
 * ============================================================================
 *
 * Wires up full keyboard operability for a text input + dropdown list using the
 * WAI-ARIA combobox pattern. Used by the location autocomplete and the cargo
 * dropdown so both suggestion/option lists are keyboard-operable.
 *
 * KEYBOARD BEHAVIOUR:
 *   - ArrowDown  → open the list (if closed) and move highlight down
 *   - ArrowUp    → move highlight up
 *   - Enter      → select the highlighted item (or the first if none highlighted)
 *   - Escape     → close the list
 *   - Home / End → jump to the first / last item
 *   - Tab        → close the list and move focus on
 *
 * ARIA:
 *   - input: role="combobox", aria-expanded, aria-controls, aria-activedescendant
 *   - list:  role="listbox"
 *   - items: role="option", aria-selected
 *
 * The highlighted item is given a visible background via an inline style so no
 * CSS class or stylesheet is required.
 *
 * @param {Object} opts
 * @param {HTMLInputElement} opts.input       - the text input (combobox)
 * @param {HTMLElement} opts.list             - the dropdown list container
 * @param {() => HTMLElement[]} opts.getItems - returns the current option elements
 * @param {(item: HTMLElement) => void} opts.onSelect - called when Enter selects an item
 * @param {() => void} opts.onOpen            - called when the list should open (ArrowDown on closed)
 * @param {() => boolean} opts.isOpen         - whether the list is currently open
 * @param {() => void} opts.onClose           - called to close the list
 * @param {string} [opts.listId]              - id for aria-controls (defaults to list.id)
 * ============================================================================
 */
export function wireComboboxKeyboard(opts) {
  const { input, list, getItems, onSelect, onOpen, isOpen, onClose } = opts;
  const listId = opts.listId || list.id || '';

  let highlightedIndex = -1;

  // ARIA setup.
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-expanded', 'false');
  if (listId) input.setAttribute('aria-controls', listId);
  list.setAttribute('role', 'listbox');

  // Scrolls the list container (which has a max-height + overflow-y: auto) so
  // the given item is fully visible. Only the list is scrolled — not the page —
  // by adjusting list.scrollTop directly based on the item's position relative
  // to the list's visible area. If the item is already fully visible, nothing
  // happens.
  const scrollItemIntoView = (item) => {
    const listRect = list.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    if (itemRect.top < listRect.top) {
      // Item is above the visible area — scroll up.
      list.scrollTop -= listRect.top - itemRect.top;
    } else if (itemRect.bottom > listRect.bottom) {
      // Item is below the visible area — scroll down.
      list.scrollTop += itemRect.bottom - listRect.bottom;
    }
  };

  const setHighlight = (index) => {
    const items = getItems();
    highlightedIndex = index;
    items.forEach((item, i) => {
      const active = i === index;
      item.setAttribute('aria-selected', active ? 'true' : 'false');
      if (active) {
        item.style.backgroundColor = '#e6f0ff';
        if (item.id) input.setAttribute('aria-activedescendant', item.id);
        // Keep the highlighted item fully visible when navigating with the
        // arrow keys (the list scrolls, so a hidden item is brought into view).
        scrollItemIntoView(item);
      } else {
        item.style.backgroundColor = '';
      }
    });
  };

  const clearHighlight = () => {
    const items = getItems();
    items.forEach((item) => {
      item.setAttribute('aria-selected', 'false');
      item.style.backgroundColor = '';
    });
    highlightedIndex = -1;
    input.removeAttribute('aria-activedescendant');
  };

  const moveHighlight = (delta) => {
    const items = getItems();
    if (items.length === 0) return;
    const next = (highlightedIndex + delta + items.length) % items.length;
    setHighlight(next);
  };

  input.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen()) {
          onOpen();
          // After opening, highlight the first item.
          setTimeout(() => setHighlight(0), 0);
        } else {
          moveHighlight(1);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen()) {
          moveHighlight(-1);
        }
        break;
      case 'Enter':
        if (isOpen()) {
          e.preventDefault();
          const items = getItems();
          const target = highlightedIndex >= 0 ? items[highlightedIndex] : items[0];
          if (target) onSelect(target);
        }
        break;
      case 'Escape':
        if (isOpen()) {
          e.preventDefault();
          onClose();
          clearHighlight();
        }
        break;
      case 'Home':
        if (isOpen()) {
          e.preventDefault();
          setHighlight(0);
        }
        break;
      case 'End':
        if (isOpen()) {
          e.preventDefault();
          setHighlight(getItems().length - 1);
        }
        break;
      case 'Tab':
        if (isOpen()) {
          onClose();
          clearHighlight();
        }
        break;
    }
  });

  // Expose helpers so the module can sync ARIA state when the list opens/closes.
  return {
    setExpanded(expanded) {
      input.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    },
    clearHighlight,
    setHighlight,
  };
}
