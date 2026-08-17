/**
 * ============================================================================
 * FORM VALIDATION
 * ============================================================================
 *
 * Implements the form validation:
 *   - On page load, no error messages are shown.

 *   - Error messages and the debug paragraph update on the same trigger:
 *       - Origin / Destination → on blur or Calculate press.
 *       - Cargo / Date / Transport → on change (instantly).

 *
 *   - The Calculate button is disabled (via the `disabled` attribute, so it
 *     matches the `:disabled` pseudo-class) until every field is valid.
 *
 * Validation rules:
 *   - Origin contains a valid selected location (not just typed text).
 *   - Destination contains a valid selected location.
 *   - A cargo type is selected (one of the dropdown values, not typed text).
 *   - A date is selected.
 *   - At least one transport option is checked.
 *
 * MULTI-INSTANCE:
 *   - Every [data-rate-module] wrapper is validated independently. Each module
 *     has its own Calculate button, error messages, and debug paragraph, so
 *     all validation is scoped to the module it belongs to.
 *   - Every `isValid` function takes the module and reads the field it needs
 *     from within it, so the signature is consistent across all fields.
 *
 * Each field is located by the SAME attributes its feature module already
 * uses. Each error message element is located by a field-specific attribute:
 *   - Origin      → [data-location-input][name="cargo_origin"]      + [data-field-error-origin]
 *   - Destination → [data-location-input][name="cargo_destination"] + [data-field-error-destination]
 *   - Cargo       → [data-cargo-select]                             + [data-field-error-cargo]
 *   - Date        → [data-date-input]                               + [data-field-error-date]
 *   - Transport   → [data-transport-checkbox]                       + [data-field-error-transport]
 *
 * The error text itself already lives in the HTML — this module only shows
 * and hides it (never creates it). Whenever a field is invalid, the `.is-error`
 * class is also added to its input element(s) (and removed when valid), using
 * the exact same triggers as the error text.
 *
 * DEBUGGING:
 *   Add a paragraph with [data-validation-debug] inside a module. Its text is
 *   updated with the live validation status of that module's fields, e.g.:
 *     origin: true | destination: false | cargo: true | date: false | transport: true
 *
 * SELECTORS (attribute based, no hard-coded IDs, no CSS classes):
 *   [data-rate-module]       → the module wrapper
 *   [data-calculate-button]  → the Calculate button (an <a>)
 *   [data-field-error-*]     → each field's error message element
 *   [data-validation-debug]  → (optional) paragraph that shows live status
 *
 * This is reusable: every matching module is validated independently.
 * ============================================================================
 */

import { getSelectedTransportModes } from './transport-checkboxes.js';

// Default delay for a field's deferred blur check, used when a config defers
// its blur check but doesn't specify its own delay (see blurCheckDelayMs).
const DEFAULT_BLUR_CHECK_DELAY_MS = 100;

// Delay for the location fields' deferred blur check. When the user clicks the
// cargo dropdown button (chevron) after focusing Origin/Destination, the field
// blurs and validation would otherwise run immediately. Deferring it by 200ms
// gives the dropdown interaction room to complete before the error shows.
const LOCATION_BLUR_CHECK_DELAY_MS = 200;

// Each field is located by the existing attributes its feature module uses.
// `inputSelector` finds the field's input; `errorSelector` finds its error
// message element; `isValid(module)` reads the field's validity flag from
// within the module; `trigger` controls when the error + debug update
// ('blur' or 'change').
const FIELD_CONFIGS = [
  {
    name: 'origin',
    inputSelector: '[data-location-input][name="cargo_origin"]',
    errorSelector: '[data-field-error-origin]',
    event: 'input',
    trigger: 'blur',
    // Defer the blur check so clicking the cargo dropdown button (which blurs
    // this field) doesn't run validation immediately — see
    // LOCATION_BLUR_CHECK_DELAY_MS.
    deferBlurCheck: true,
    blurCheckDelayMs: LOCATION_BLUR_CHECK_DELAY_MS,
    isValid: (module) =>
      module.querySelector('[data-location-input][name="cargo_origin"]')?.dataset.isValid ===
      'true',
  },
  {
    name: 'destination',
    inputSelector: '[data-location-input][name="cargo_destination"]',
    errorSelector: '[data-field-error-destination]',
    event: 'input',
    trigger: 'blur',
    // Same deferred blur check as origin.
    deferBlurCheck: true,
    blurCheckDelayMs: LOCATION_BLUR_CHECK_DELAY_MS,
    isValid: (module) =>
      module.querySelector('[data-location-input][name="cargo_destination"]')?.dataset.isValid ===
      'true',
  },

  {
    name: 'cargo',
    inputSelector: '[data-cargo-select]',
    // The visible input the user sees is [data-cargo-input]; the hidden
    // [data-cargo-select] is only used for the value + validity. The `.is-error`
    // class must go on the visible input.
    errorInputSelector: '[data-cargo-input]',
    errorSelector: '[data-field-error-cargo]',
    event: 'change',
    trigger: 'change',
    isValid: (module) => module.querySelector('[data-cargo-select]')?.dataset.isValid === 'true',
  },
  {
    name: 'date',
    inputSelector: '[data-date-input]',
    errorSelector: '[data-field-error-date]',
    event: 'change',
    // Validate on change (not blur). Flatpickr fires a native `change` event
    // on the input AFTER it sets data-is-valid in its onChange, so the error
    // hides the moment a valid date is picked. Validating on blur instead
    // caused a race: the blur fired before Flatpickr marked the field valid,
    // so a correct date could briefly flash a false error.
    trigger: 'change',
    isValid: (module) => module.querySelector('[data-date-input]')?.dataset.isValid === 'true',
  },

  {
    name: 'transport',
    inputSelector: '[data-transport-checkbox]',
    errorSelector: '[data-field-error-transport]',
    event: 'change',
    trigger: 'change',
    isValid: (module) => getSelectedTransportModes(module) !== '',
  },
];

export function initValidation() {
  const modules = document.querySelectorAll('[data-rate-module]');
  modules.forEach((module) => initModuleValidation(module));
}

/**
 * Wires up validation for a single rate module.
 * @param {HTMLElement} module
 */
function initModuleValidation(module) {
  const calculateButton = module.querySelector('[data-calculate-button]');
  const debugEl = module.querySelector('[data-validation-debug]');

  // On page load, hide every error message in this module and clear the
  // `.is-error` class from its inputs.
  FIELD_CONFIGS.forEach((config) => {
    hideError(module.querySelector(config.errorSelector), getErrorInputs(module, config));
  });

  // The Calculate button is an <a>, so the `disabled` attribute is used to
  // match the `:disabled` pseudo-class in Webflow. It does not natively block
  // clicks on an anchor, so we also block navigation in the click handler.
  // When disabled we also remove it from the tab order (tabindex="-1") and
  // expose aria-disabled so keyboard users can't focus/activate it.
  const setButtonDisabled = (disabled) => {
    if (!calculateButton) return;
    calculateButton.disabled = disabled;
    if (disabled) {
      calculateButton.setAttribute('aria-disabled', 'true');
      calculateButton.setAttribute('tabindex', '-1');
    } else {
      calculateButton.removeAttribute('aria-disabled');
      calculateButton.removeAttribute('tabindex');
    }
  };

  // Re-evaluate the button's disabled state from this module's field validity.
  const updateButtonState = () => {
    const allValid = FIELD_CONFIGS.every((config) => config.isValid(module));
    setButtonDisabled(!allValid);
  };

  // Pressing Calculate validates every field in this module: shows errors for
  // invalid ones, updates the debug, and blocks navigation if anything is
  // invalid.
  if (calculateButton) {
    calculateButton.addEventListener('click', (e) => {
      const results = validateAllFields(module);
      updateDebug(debugEl, results);
      if (!Object.values(results).every(Boolean)) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }

  // Wire up each field within this module.
  FIELD_CONFIGS.forEach((config) => {
    const inputs = module.querySelectorAll(config.inputSelector);
    if (inputs.length === 0) return;

    const errorEl = module.querySelector(config.errorSelector);

    if (config.trigger === 'blur') {
      // Blur-triggered fields: show/hide the error and update the debug on
      // blur. The change/input handler only refreshes the button state.
      inputs.forEach((input) => {
        input.addEventListener('blur', () => {
          // For fields that set their validity in a picker's onChange (which
          // fires after the blur), defer the check so the picker marks the
          // field valid first. Other blur-triggered fields check synchronously
          // to avoid a visible flash.
          const check = () => {
            if (config.isValid(module)) {
              hideError(errorEl, getErrorInputs(module, config));
            } else {
              showError(errorEl, getErrorInputs(module, config));
            }
            updateDebug(debugEl, readAllFieldStates(module));
          };
          if (config.deferBlurCheck) {
            setTimeout(check, config.blurCheckDelayMs || DEFAULT_BLUR_CHECK_DELAY_MS);
          } else {
            check();
          }
        });
      });

      const onFieldChange = () => {
        updateButtonState();
      };
      inputs.forEach((input) => {
        input.addEventListener(config.event, onFieldChange);
        // Location inputs dispatch a custom 'location-selected' event when a
        // suggestion is picked (and when the sync module propagates a value to
        // another instance), so the error + debug + button state update right
        // away (a plain 'input' event would reset the field's validity).
        // Show/hide the error based on the field's actual validity so an
        // invalid value synced from another module still shows its error.
        if (input.hasAttribute('data-location-input')) {
          input.addEventListener('location-selected', () => {
            if (config.isValid(module)) {
              hideError(errorEl, getErrorInputs(module, config));
            } else {
              showError(errorEl, getErrorInputs(module, config));
            }
            updateButtonState();
            updateDebug(debugEl, readAllFieldStates(module));
          });
        }
      });
    } else {
      // Change-triggered fields (cargo, transport): show/hide the error,
      // update the debug, and refresh the button state on change.
      const onFieldChange = () => {
        if (config.isValid(module)) {
          hideError(errorEl, getErrorInputs(module, config));
        } else {
          showError(errorEl, getErrorInputs(module, config));
        }
        updateButtonState();
        updateDebug(debugEl, readAllFieldStates(module));
      };

      inputs.forEach((input) => {
        input.addEventListener(config.event, onFieldChange);
      });
    }
  });

  // Set the initial button state (fields start empty/invalid, so disabled).
  updateButtonState();
}

/**
 * Validates every field in a module, shows/hides its error, and returns a map
 * of field name → boolean validity.
 * @param {HTMLElement} module
 * @returns {Record<string, boolean>}
 */
function validateAllFields(module) {
  const results = {};

  FIELD_CONFIGS.forEach((config) => {
    const valid = config.isValid(module);
    results[config.name] = valid;

    const errorEl = module.querySelector(config.errorSelector);
    if (valid) {
      hideError(errorEl, getErrorInputs(module, config));
    } else {
      showError(errorEl, getErrorInputs(module, config));
    }
  });

  return results;
}

/**
 * Reads the current validity of every field in a module without touching the
 * error elements (used for the live debug output).
 * @param {HTMLElement} module
 * @returns {Record<string, boolean>}
 */
function readAllFieldStates(module) {
  const states = {};
  FIELD_CONFIGS.forEach((config) => {
    states[config.name] = config.isValid(module);
  });
  return states;
}

/**
 * Returns the input element(s) that should receive the `.is-error` class for a
 * field. Defaults to the field's `inputSelector`, but a config may override it
 * with `errorInputSelector` (e.g. cargo's visible [data-cargo-input] instead of
 * the hidden [data-cargo-select]).
 * @param {HTMLElement} module
 * @param {object} config
 * @returns {NodeList}
 */
function getErrorInputs(module, config) {
  return module.querySelectorAll(config.errorInputSelector || config.inputSelector);
}

/**
 * Shows a field's error message and adds the `.is-error` class to its input
 * element(s). `inputs` may be a single element or a NodeList/array.
 * @param {HTMLElement|null} errorEl
 * @param {HTMLElement|NodeList|HTMLElement[]} [inputs]
 */
function showError(errorEl, inputs) {
  if (errorEl) {
    errorEl.style.display = 'block';
    errorEl.classList.remove('hide');
  }
  if (inputs) {
    const list = inputs.forEach ? inputs : [inputs];
    list.forEach((input) => input.classList.add('is-error'));
  }
}

/**
 * Hides a field's error message and removes the `.is-error` class from its
 * input element(s). `inputs` may be a single element or a NodeList/array.
 * @param {HTMLElement|null} errorEl
 * @param {HTMLElement|NodeList|HTMLElement[]} [inputs]
 */
function hideError(errorEl, inputs) {
  if (errorEl) {
    errorEl.style.display = 'none';
    errorEl.classList.add('hide');
  }
  if (inputs) {
    const list = inputs.forEach ? inputs : [inputs];
    list.forEach((input) => input.classList.remove('is-error'));
  }
}

/**
 * Writes the per-field validation status into the debug paragraph, e.g.
 *   origin: true | destination: false | cargo: true | date: false | transport: true
 * @param {HTMLElement|null} debugEl
 * @param {Record<string, boolean>} states
 */
function updateDebug(debugEl, states) {
  if (!debugEl) return;
  const parts = Object.entries(states).map(
    ([name, valid]) => `${name}: ${valid ? 'true' : 'false'}`
  );
  debugEl.textContent = parts.join(' | ');
}
