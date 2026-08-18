/**
 * ============================================================================
 * URL CONSTRUCTION — CALCULATE REDIRECT
 * ============================================================================
 *
 * Implements the Calculate redirect:
 *   - On a valid submission, redirects the user to the base URL from the

 *     Calculate button's href, with these query parameters:
 *       origin         → City, Country
 *       destination    → City, Country
 *       transportDate  → yyyy-MM-dd
 *       transportMode  → comma-separated selection, e.g. sea,air
 *       containerType  → the container value, except the two special cases:
 *                         - Other FCL (FCL): included with an empty value
 *                           (containerType=)
 *                         - Other LCL (LCL): omitted from the URL entirely
 *
 * The constructed URL is written to the Calculate button's href, so the
 * native anchor navigation performs the redirect. This module only runs on
 * click; the validation module (../features/validation.js) is responsible for
 * blocking navigation when any field is invalid.
 *
 * MULTI-INSTANCE:
 *   - Every [data-rate-module] wrapper is handled independently. Each module
 *     has its own Calculate button, form, and [data-url-debug] paragraph, so
 *     all field reads and the debug output are scoped to the module.
 *
 * DEBUGGING:
 *   Add a paragraph with [data-url-debug] inside a module. Its text is updated
 *   live with the full constructed link as the user fills the form (and again
 *   on Calculate click), e.g.:
 *     /calculator?origin=Rotterdam%2C+Netherlands&destination=Shanghai%2C+China&transportDate=2026-11-15&transportMode=sea&containerType=HC_40
 *
 * SELECTORS (attribute based, no hard-coded IDs, no CSS classes):
 *   [data-rate-module]      → the module wrapper
 *   [data-calculate-button] → the Calculate button (an <a>)
 *   [data-url-debug]        → (optional) paragraph that shows the link text
 *   [data-rate-form]        → the form element (its native submit is blocked)
 *
 * Field values are read from the SAME attributes the feature modules use:
 *   - Location fields → every [data-location-input] with a `name` is added as
 *                       a URL param keyed by the name minus the `cargo_`
 *                       prefix, e.g. name="cargo_origin" → origin,
 *                       name="cargo_origin2" → origin2.
 *   - Date        → [data-date-input] (data-date-iso holds yyyy-MM-dd)
 *   - Transport   → getSelectedTransportModes(module) from ../features/transport-checkboxes.js
 *   - Cargo       → [data-cargo-select]

 *
 * This is reusable: every [data-calculate-button] is handled independently.
 * ============================================================================
 */

import { getSelectedTransportModes } from '../features/transport-checkboxes.js';

// Container values that need special handling in the URL.
const CONTAINER_OMIT = 'LCL'; // Other LCL → parameter omitted entirely

const CONTAINER_EMPTY = 'FCL'; // Other FCL → parameter included with empty value

export function initUrlBuilder() {
  const modules = document.querySelectorAll('[data-rate-module]');
  modules.forEach((module) => initModuleUrlBuilder(module));
}

/**
 * Wires up URL construction for a single rate module.
 * @param {HTMLElement} module
 */
function initModuleUrlBuilder(module) {
  const calculateButton = module.querySelector('[data-calculate-button]');
  if (!calculateButton) return;

  const debugEl = module.querySelector('[data-url-debug]');
  const form = module.querySelector('[data-rate-form]');

  // Block the form's native GET submission so it doesn't submit the raw form
  // fields and interfere with the redirect. The redirect is handled by the
  // Calculate button's href (set below).
  if (form) {
    form.addEventListener('submit', (e) => e.preventDefault());
  }

  // Rebuild the URL and update the debug paragraph live whenever any field in
  // this module changes, so the debug link stays in sync as the user fills it.
  const refreshDebug = () => {
    if (!debugEl) return;
    debugEl.textContent = buildRedirectUrl(calculateButton, module);
  };

  // Origin & Destination inputs. Refresh on typing AND when a suggestion is
  // picked (the autocomplete dispatches a custom 'location-selected' event,
  // not an 'input' event, so the debug link updates immediately on selection).
  module.querySelectorAll('[data-location-input]').forEach((input) => {
    input.addEventListener('input', refreshDebug);
    input.addEventListener('location-selected', refreshDebug);
  });

  // Date input (fires when a date is picked).
  module
    .querySelectorAll('[data-date-input]')
    .forEach((input) => input.addEventListener('change', refreshDebug));
  // Cargo select.
  module
    .querySelectorAll('[data-cargo-select]')
    .forEach((select) => select.addEventListener('change', refreshDebug));
  // Transport checkboxes.
  module
    .querySelectorAll('[data-transport-checkbox]')
    .forEach((checkbox) => checkbox.addEventListener('change', refreshDebug));

  calculateButton.addEventListener('click', (e) => {
    const url = buildRedirectUrl(calculateButton, module);
    if (debugEl) debugEl.textContent = url;
    // Write the constructed URL to the button's href so the native anchor
    // navigation redirects correctly on a valid submission.
    calculateButton.href = url;

    // Only redirect when the form is valid. The validation module sets the
    // button's `disabled` attribute to true while any field is invalid, so a
    // non-disabled button means every field is valid. When valid, prevent the
    // default anchor navigation and redirect explicitly to the constructed URL.
    if (!calculateButton.disabled) {
      e.preventDefault();
      window.location.assign(url);
    }
  });
}

/**
 * Builds the full redirect URL from the current field values in a module.
 * @param {HTMLAnchorElement} calculateButton
 * @param {HTMLElement} module
 * @returns {string}
 */
function buildRedirectUrl(calculateButton, module) {
  // The base URL comes from the Calculate button's href. Fall back to
  // /calculator if the href is empty or just the root, so the

  // redirect always lands on the results page.
  const rawBase = calculateButton.getAttribute('href') || '';
  const baseUrl = !rawBase || rawBase === '/' || rawBase === '#' ? '/calculator' : rawBase;

  const params = new URLSearchParams();

  // Add every location field as a URL param, keyed by its name minus the
  // `cargo_` prefix (e.g. name="cargo_origin" → origin, name="cargo_origin2" →
  // origin2). This is fully dynamic — any [data-location-input] with a `name`
  // is included.
  module.querySelectorAll('[data-location-input]').forEach((input) => {
    const name = input.getAttribute('name') || '';
    const key = name.replace(/^cargo_/, '');
    if (!key) return;
    const value = input.value.trim();
    if (value) params.set(key, value);
  });

  const transportDate = getDateIso(module);
  const transportMode = getSelectedTransportModes(module);
  const containerType = getFieldValue(module, '[data-cargo-select]');

  if (transportDate) params.set('transportDate', transportDate);
  if (transportMode) params.set('transportMode', transportMode);

  // containerType special cases:
  //   - LCL → omit the parameter entirely

  //   - FCL → include with an empty value (containerType=)
  //   - otherwise → include the container value
  if (containerType && containerType !== CONTAINER_OMIT) {
    params.set('containerType', containerType === CONTAINER_EMPTY ? '' : containerType);
  }

  const queryString = params.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Reads the value of the first element matching the selector within a module.
 * @param {HTMLElement} module
 * @param {string} selector
 * @returns {string}
 */
function getFieldValue(module, selector) {
  const el = module.querySelector(selector);
  return el ? el.value.trim() : '';
}

/**
 * Reads the yyyy-MM-dd date from the date input's data-date-iso attribute
 * (set by ../features/date-picker.js on selection).
 * @param {HTMLElement} module
 * @returns {string}
 */
function getDateIso(module) {
  const input = module.querySelector('[data-date-input]');
  return input?.dataset.dateIso || '';
}
