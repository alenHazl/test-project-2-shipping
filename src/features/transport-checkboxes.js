/**
 * ============================================================================
 * TRANSPORT OPTIONS — SEA / AIR / TRAIN CHECKBOXES
 * ============================================================================
 *
 * Implements the "Transport options" checkboxes:
 *   - Function as checkboxes. Multiple can be selected at the same time.
 *   - Sea is checked by default on page load.
 *   - The selected values are read from the DOM so they can be used in the
 *     URL and validation.

 *
 * URL values (read from data-transport-value on each checkbox):
 *   - Sea   → sea
 *   - Air   → air
 *   - Train → rail
 *
 * MULTI-INSTANCE:
 *   - Each [data-rate-module] wrapper is read independently, so duplicated
 *     modules don't mix their checked checkboxes together.
 *
 * SELECTORS (attribute based, no hard-coded IDs, no CSS classes):
 *   [data-rate-module]        → the module wrapper
 *   [data-transport-checkbox] → the checkbox input (Sea / Air / Train)
 *   [data-transport-value]    → the URL value on each checkbox (sea/air/rail)
 *
 * This is reusable: every [data-transport-checkbox] is initialized
 * independently.
 * ============================================================================
 */

export function initTransportCheckboxes() {
  const modules = document.querySelectorAll('[data-rate-module]');

  modules.forEach((module) => {
    const checkboxes = module.querySelectorAll('[data-transport-checkbox]');

    // Sea is checked by default on page load.
    checkboxes.forEach((checkbox) => {
      if (checkbox.dataset.transportValue === 'sea') {
        checkbox.checked = true;
      }
    });

    checkboxes.forEach((checkbox) => {
      // The checkbox input is visually hidden (opacity: 0), so keyboard focus
      // on it is invisible. Show a focus ring on the label so keyboard users
      // can see where they are when tabbing through the options. A neutral
      // gray is used so the ring reads as a focus indicator, not a checked
      // state (a bright color would look like the box is selected).
      //
      // The ring only shows for keyboard navigation: `:focus-visible` matches
      // only when focus comes from the keyboard (Tab), not from a mouse click,
      // so the outline doesn't flash when a checkbox is clicked.
      const label = checkbox.closest('label');
      if (label) {
        checkbox.addEventListener('focus', () => {
          if (checkbox.matches(':focus-visible')) {
            label.style.outline = '2px solid #9ca3af';
            label.style.outlineOffset = '2px';
          }
        });
        checkbox.addEventListener('blur', () => {
          label.style.outline = '';
          label.style.outlineOffset = '';
        });
      }

      // Space already toggles the checkbox natively; also let Enter toggle it.
      // Setting .checked manually doesn't fire a native change event, so
      // dispatch one so validation and the URL builder stay in sync.
      checkbox.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });
  });
}

/**
 * Returns the selected transport values as a comma-separated string for the
 * URL, e.g. "sea" or "sea,air".

 * @param {HTMLElement} [module] The module to read from. If omitted, reads all
 *   checked checkboxes on the page (single-module usage).
 * @returns {string}
 */
export function getSelectedTransportModes(module) {
  const scope = module || document;
  return Array.from(scope.querySelectorAll('[data-transport-checkbox]:checked'))
    .map((checkbox) => checkbox.dataset.transportValue)
    .filter(Boolean)
    .join(',');
}
