/**
 * ============================================================================
 * DROPDOWN HELPER — SHARED OPEN/CLOSE/OUTSIDE-CLICK BEHAVIOUR
 * ============================================================================
 *
 * Encapsulates the common behaviour shared by the cargo dropdown and the
 * location autocomplete: opening/closing/toggling the list, closing on an
 * outside click, and wiring up keyboard navigation via the combobox helper.
 *
 * @param {Object} opts
 * @param {HTMLInputElement} opts.input       - the text input (combobox)
 * @param {HTMLElement} opts.list             - the dropdown list container
 * @param {() => HTMLElement[]} opts.getItems - returns the current option elements
 * @param {(item: HTMLElement) => void} opts.onSelect - called when Enter selects an item
 * @param {() => void} [opts.onOpen]          - called when the list should open (ArrowDown on closed)
 * ============================================================================
 */
import { wireComboboxKeyboard } from './combobox.js';

export function createDropdown({ input, list, getItems, onSelect, onOpen }) {
  function show() {
    list.style.display = 'block';
    list.classList.add('show');
    keyboard.setExpanded(true);
  }

  const keyboard = wireComboboxKeyboard({
    input,
    list,
    getItems,
    onSelect,
    onOpen: () => {
      // The caller's onOpen may manage showing itself (e.g. an async fetch
      // that renders suggestions before opening). If it returns false, skip
      // the automatic show.
      if (onOpen?.() !== false) {
        show();
      }
    },
    isOpen: () => list.style.display === 'block',
    onClose: hide,
  });

  function hide() {
    list.style.display = 'none';
    list.classList.remove('show');
    keyboard.setExpanded(false);
  }

  function toggle() {
    if (list.style.display === 'none') {
      show();
    } else {
      hide();
    }
  }

  /**
   * Closes the list when a click lands outside the given container.
   * @param {HTMLElement} container
   */
  function bindOutsideClick(container) {
    document.addEventListener('click', (e) => {
      if (!container.contains(e.target)) {
        hide();
      }
    });
  }

  return { show, hide, toggle, bindOutsideClick, keyboard };
}
