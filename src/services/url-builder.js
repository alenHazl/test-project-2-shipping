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

  // Ensure the Calculate button is always in the tab order. It's an <a> with a
  // valid href, but the module's cut-corner clip-path (and duplicate IDs when
  // the module is duplicated on a page) can cause the browser to skip it on the
  // first tab pass. Explicitly setting tabindex="0" forces it into the tab
  // order so keyboard users can always reach it.
  calculateButton.setAttribute('tabindex', '0');

  const debugEl = module.querySelector('[data-url-debug]');
  const form = module.querySelector('[data-rate-form]');

  // The Calculate button is an <a> whose cut-corner design uses `clip-path`,
  // which clips any outline/box-shadow applied directly to the button. So the
  // focus ring is drawn on the button's parent wrapper instead (the embedder
  // wraps the button in a container). A neutral blue ring is used — clearly
  // visible but not garish — and set with !important so it can't be suppressed
  // by Webflow's own styles.
  //
  // The ring only shows for keyboard navigation: `:focus-visible` matches only
  // when focus comes from the keyboard (Tab), not from a mouse click, so the
  // outline doesn't flash when the button is clicked.
  const focusTarget = calculateButton.parentElement || calculateButton;
  calculateButton.addEventListener('focus', () => {
    if (calculateButton.matches(':focus-visible')) {
      focusTarget.style.setProperty('outline', '2px solid #2563eb', 'important');
      focusTarget.style.setProperty('outline-offset', '2px', 'important');
    }
  });
  calculateButton.addEventListener('blur', () => {
    focusTarget.style.removeProperty('outline');
    focusTarget.style.removeProperty('outline-offset');
  });

  // Block the form's native GET submission so it doesn't submit the raw form
  // fields and interfere with the redirect. The redirect is handled by the
  // Calculate button's href (set below).
  if (form) {
    form.addEventListener('submit', (e) => e.preventDefault());
  }

  // Rebuild the URL, update the debug paragraph, and keep the Calculate
  // button's href in sync live whenever any field in this module changes, so
  // the href always holds the current constructed URL (not just on click).
  const refreshUrl = () => {
    const url = buildRedirectUrl(calculateButton, module);
    if (debugEl) debugEl.textContent = url;
    calculateButton.href = url;
  };

  // Origin & Destination inputs. Refresh on typing AND when a suggestion is
  // picked (the autocomplete dispatches a custom 'location-selected' event,
  // not an 'input' event, so the debug link updates immediately on selection).
  module.querySelectorAll('[data-location-input]').forEach((input) => {
    input.addEventListener('input', refreshUrl);
    input.addEventListener('location-selected', refreshUrl);
  });

  // Date input. Refresh on `change` (when a date is picked) and on the custom
  // `date-synced` event (when the sync module propagates a value to another
  // instance), so the URL debug stays in sync on every module.
  module.querySelectorAll('[data-date-input]').forEach((input) => {
    input.addEventListener('change', refreshUrl);
    input.addEventListener('date-synced', refreshUrl);
  });

  // Cargo select. Refresh on `change` (when an option is picked) and on the
  // custom `cargo-synced` event (when the sync module propagates a value to
  // another instance), so the URL debug stays in sync on every module.
  module.querySelectorAll('[data-cargo-select]').forEach((select) => {
    select.addEventListener('change', refreshUrl);
    select.addEventListener('cargo-synced', refreshUrl);
  });

  // Transport checkboxes.
  module
    .querySelectorAll('[data-transport-checkbox]')
    .forEach((checkbox) => checkbox.addEventListener('change', refreshUrl));

  calculateButton.addEventListener('click', (e) => {
    // Rebuild the URL (keeps the href + debug in sync) and redirect if valid.
    refreshUrl();

    // Only redirect when the form is valid. The validation module keeps the
    // button's `data-valid` attribute in sync and shows errors for invalid
    // fields on click; when invalid it has already prevented default
    // navigation. When valid, prevent the default anchor navigation and
    // redirect explicitly to the constructed URL.
    if (calculateButton.dataset.valid === 'true') {
      e.preventDefault();
      window.location.assign(calculateButton.href);
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

  // redirect always lands on the results page. Strip any existing query string
  // from the href first: the href is updated live with the constructed URL, so
  // without this the next rebuild would treat the previous query params as part
  // of the base and append duplicates.
  const rawBase = calculateButton.getAttribute('href') || '';
  const basePath = rawBase.split('?')[0];
  const baseUrl = !basePath || basePath === '/' || basePath === '#' ? '/calculator' : basePath;

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
