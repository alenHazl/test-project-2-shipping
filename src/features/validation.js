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
 *   - The Calculate button is never disabled. Its `data-valid` attribute
 *     tracks whether every field is valid, and pressing it validates every
 *     field (showing errors for invalid ones) and blocks navigation until all
 *     are valid.

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
 *   - Location fields → [data-location-input][name="cargo_<key>"] + [data-field-error-<key>]
 *                       (any location input with a `name` is validated; the
 *                        error element is derived by stripping the `cargo_`
 *                        prefix, e.g. name="cargo_origin2" → [data-field-error-origin2])
 *   - Cargo           → [data-cargo-select]                        + [data-field-error-cargo]
 *   - Date            → [data-date-input]                          + [data-field-error-date]
 *   - Transport       → [data-transport-checkbox]                  + [data-field-error-transport]

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

// Static configs for the non-location fields (cargo, date, transport). Each
// config locates the field by the existing attributes its feature module uses:
// `inputSelector` finds the field's input; `errorSelector` finds its error
// message element; `isValid(module)` reads the field's validity flag from
// within the module; `trigger` controls when the error + debug update
// ('blur' or 'change').
const STATIC_FIELD_CONFIGS = [
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

/**
 * Derives a validation config for each location input in a module. Location
 * fields are fully dynamic: any [data-location-input] with a `name` is
 * validated. The error element is derived from the name by stripping the
 * `cargo_` prefix, e.g. name="cargo_origin" → [data-field-error-origin],
 * name="cargo_origin2" → [data-field-error-origin2].
 * @param {HTMLElement} module
 * @returns {object[]}
 */
function getLocationFieldConfigs(module) {
  return Array.from(module.querySelectorAll('[data-location-input]'))
    .map((input) => {
      const name = input.getAttribute('name') || '';
      // Strip the "cargo_" prefix to get the error key (e.g. origin, origin2).
      const key = name.replace(/^cargo_/, '');
      if (!key) return null;
      return {
        name: key,
        inputSelector: `[data-location-input][name="${name}"]`,
        errorSelector: `[data-field-error-${key}]`,
        event: 'input',
        trigger: 'blur',
        // Defer the blur check so clicking the cargo dropdown button (which
        // blurs this field) doesn't run validation immediately — see
        // LOCATION_BLUR_CHECK_DELAY_MS.
        deferBlurCheck: true,
        blurCheckDelayMs: LOCATION_BLUR_CHECK_DELAY_MS,
        isValid: (module) =>
          module.querySelector(`[data-location-input][name="${name}"]`)?.dataset.isValid === 'true',
      };
    })
    .filter(Boolean);
}

/**
 * Returns every field config for a module: the dynamic location configs plus
 * the static cargo/date/transport configs.
 * @param {HTMLElement} module
 * @returns {object[]}
 */
function getFieldConfigs(module) {
  return [...getLocationFieldConfigs(module), ...STATIC_FIELD_CONFIGS];
}

export function initValidation() {
  const modules = document.querySelectorAll('[data-rate-module]');
  modules.forEach((module) => initModuleValidation(module, modules));
}

/**
 * Wires up validation for a single rate module.
 * @param {HTMLElement} module
 * @param {NodeList} allModules every rate module on the page
 */
function initModuleValidation(module, allModules) {
  const calculateButton = module.querySelector('[data-calculate-button]');
  const debugEl = module.querySelector('[data-validation-debug]');

  // On page load, hide every error message in this module and clear the
  // `.is-error` class from its inputs.
  getFieldConfigs(module).forEach((config) => {
    hideError(module.querySelector(config.errorSelector), getErrorInputs(module, config));
  });

  // The Calculate button is never disabled (no `disabled` attribute). Instead
  // its `data-valid` attribute tracks whether every field in this module is
  // valid. The url-builder reads it on click to decide whether to navigate,
  // and this module blocks navigation + shows errors when anything is invalid.
  const updateButtonValidity = () => {
    if (!calculateButton) return;
    const allValid = getFieldConfigs(module).every((config) => config.isValid(module));
    calculateButton.dataset.valid = String(allValid);
  };

  // Pressing Calculate validates every field in EVERY module on the page (not
  // just this one), so errors show on all components. Navigation is blocked if
  // any module is invalid. The clicked button's data-valid reflects the overall
  // state so the url-builder blocks navigation when any module is invalid.
  if (calculateButton) {
    calculateButton.addEventListener('click', (e) => {
      const allValid = validateAllModules(allModules);
      calculateButton.dataset.valid = String(allValid);
      if (!allValid) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }

  // Wire up each field within this module.
  getFieldConfigs(module).forEach((config) => {
    const inputs = module.querySelectorAll(config.inputSelector);
    if (inputs.length === 0) return;

    const errorEl = module.querySelector(config.errorSelector);

    if (config.trigger === 'blur') {
      // Blur-triggered fields: the error only appears on blur (if the value is
      // invalid) and disappears as soon as the value changes (typing or picking
      // a suggestion), regardless of validity. It reappears on blur if still
      // invalid.
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
        updateButtonValidity();
        // The error disappears as soon as the value changes, regardless of
        // validity. It reappears on blur if the value is still invalid.
        hideError(errorEl, getErrorInputs(module, config));
        updateDebug(debugEl, readAllFieldStates(module));
      };
      inputs.forEach((input) => {
        input.addEventListener(config.event, onFieldChange);

        // Location inputs dispatch a custom 'location-selected' event when a
        // suggestion is picked (valid) and when the sync module propagates a
        // value to another instance (which may be valid or invalid). Show/hide
        // the error based on the field's actual validity so a synced invalid
        // value correctly shows its error on the other components (the target
        // input is never focused, so it would never blur and never show the
        // error otherwise). Refresh the button validity and debug right away.
        if (input.hasAttribute('data-location-input')) {
          input.addEventListener('location-selected', () => {
            if (config.isValid(module)) {
              hideError(errorEl, getErrorInputs(module, config));
            } else {
              showError(errorEl, getErrorInputs(module, config));
            }
            updateButtonValidity();
            updateDebug(debugEl, readAllFieldStates(module));
          });
        }
      });
    } else {
      // Change-triggered fields (cargo, transport): show/hide the error,
      // update the debug, and refresh the button validity on change.
      const onFieldChange = () => {
        if (config.isValid(module)) {
          hideError(errorEl, getErrorInputs(module, config));
        } else {
          showError(errorEl, getErrorInputs(module, config));
        }
        updateButtonValidity();
        updateDebug(debugEl, readAllFieldStates(module));
      };

      inputs.forEach((input) => {
        input.addEventListener(config.event, onFieldChange);
      });
    }
  });

  // Set the initial button validity (fields start empty/invalid, so false).
  updateButtonValidity();
}

/**
 * Validates every field in a module, shows/hides its error, and returns a map
 * of field name → boolean validity.
 * @param {HTMLElement} module
 * @returns {Record<string, boolean>}
 */
function validateAllFields(module) {
  const results = {};

  getFieldConfigs(module).forEach((config) => {
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
 * Validates every field in every module on the page, showing/hiding errors and
 * updating each module's debug paragraph and Calculate button validity. Returns
 * whether ALL modules are valid (used to block navigation when any is invalid).
 * @param {NodeList} modules every rate module on the page
 * @returns {boolean}
 */
function validateAllModules(modules) {
  let allValid = true;
  modules.forEach((module) => {
    const results = validateAllFields(module);
    const debugEl = module.querySelector('[data-validation-debug]');
    updateDebug(debugEl, results);
    const moduleValid = Object.values(results).every(Boolean);
    const btn = module.querySelector('[data-calculate-button]');
    if (btn) btn.dataset.valid = String(moduleValid);
    if (!moduleValid) allValid = false;
  });
  return allValid;
}

/**
 * Reads the current validity of every field in a module without touching the
 * error elements (used for the live debug output).
 * @param {HTMLElement} module
 * @returns {Record<string, boolean>}
 */
function readAllFieldStates(module) {
  const states = {};
  getFieldConfigs(module).forEach((config) => {
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
