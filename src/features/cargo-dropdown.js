/**
 * ============================================================================
 * CARGO TYPE DROPDOWN
 * ============================================================================
 *
 * Implements the "Cargo" field dropdown:
 *   - Clicking the input field opens a dropdown list below it showing the
 *     container options.
 *   - Clicking an option displays its label in the field and closes the list.
 *   - The option's value is stored in the hidden <select> so it can be used
 *     in the URL.
 *   - No option is preselected.

 *
 * The options are read from the hidden <select> element that already exists
 * in the Webflow markup, so the source of truth stays in the DOM.
 *
 * SELECTORS (attribute based, no hard-coded IDs):
 *   [data-cargo-field]   → the field container (outside-click detection)
 *   [data-cargo-input]   → the text input (display + click target)
 *   [data-cargo-select]  → the hidden select holding the option values
 *   [data-cargo-list]    → the dropdown list container
 *   [data-cargo-item]    → the template item cloned for each option
 *   [data-cargo-text]    → the option label text element
 *   [data-cargo-value]   → the option value text element
 *
 * This is reusable: every [data-cargo-field] is initialized independently.

 * ============================================================================
 */

import { createDropdown } from '../lib/dropdown.js';

export function initCargoDropdown() {
  const fields = document.querySelectorAll('[data-cargo-field]');

  fields.forEach((field) => {
    const input = field.querySelector('[data-cargo-input]');
    const select = field.querySelector('[data-cargo-select]');
    const dropdownList = field.querySelector('[data-cargo-list]');

    const templateItem = dropdownList ? dropdownList.querySelector('[data-cargo-item]') : null;

    if (!input || !select || !dropdownList || !templateItem) return;

    // The field is read-only: users can click it to open the dropdown and pick
    // an option, but cannot type text into it manually. The value is only ever
    // set programmatically when an option is selected.
    input.readOnly = true;

    // Clone the template and clear the list.
    const templateClone = templateItem.cloneNode(true);
    dropdownList.innerHTML = '';
    dropdownList.style.display = 'none';

    // No option is preselected.
    select.selectedIndex = -1;
    // No option selected yet → field is invalid until the user picks one.
    select.dataset.isValid = 'false';

    // Populate the dropdown with the options from the hidden select.
    Array.from(select.options).forEach((option, index) => {
      const item = templateClone.cloneNode(true);

      const textEl = item.querySelector('[data-cargo-text]');
      const valueEl = item.querySelector('[data-cargo-value]');

      if (textEl) textEl.textContent = option.textContent;
      if (valueEl) valueEl.textContent = option.value;

      // Give each option a stable id so the input's aria-activedescendant can
      // point at the highlighted one.
      item.id = `${input.id || 'cargo'}-option-${index}`;
      item.setAttribute('role', 'option');

      // Store the select callback on the element so the keyboard helper can
      // invoke it when Enter is pressed on a highlighted item.
      item._select = () => {
        // Show the label in the field.
        input.value = option.textContent;
        // Store the value for the URL.
        select.value = option.value;

        // Mark the field as valid (used by the validation module).
        select.dataset.isValid = 'true';
        // Notify the validation module so the error can clear immediately.
        select.dispatchEvent(new Event('change', { bubbles: true }));
        dropdown.hide();
      };

      item.addEventListener('click', (e) => {
        e.preventDefault();
        item._select();
      });

      dropdownList.appendChild(item);
    });

    // Shared open/close/toggle + keyboard + outside-click behaviour.
    const dropdown = createDropdown({
      input,
      list: dropdownList,
      getItems: () => Array.from(dropdownList.querySelectorAll('[data-cargo-item]')),
      onSelect: (item) => item._select && item._select(),
    });

    // Clicking the input toggles the dropdown.
    input.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.toggle();
    });

    // Only values picked from the dropdown are valid. If the user types in
    // the field, invalidate the selection and notify the validation module
    // so the error/debug/button update immediately.
    input.addEventListener('input', () => {
      select.dataset.isValid = 'false';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Close the dropdown when clicking outside the field.
    dropdown.bindOutsideClick(field);
  });
}
