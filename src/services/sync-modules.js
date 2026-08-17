/**
 * ============================================================================
 * MULTI-INSTANCE SYNC — KEEP DUPLICATED RATE MODULES IN SYNC
 * ============================================================================
 *
 * Implements reusability + synchronization:
 *   - The module may appear multiple times on a page. Add a [data-rate-module]

 *     attribute to each module wrapper so the code knows how many instances
 *     exist. This is the ONLY thing that marks an element as a rate module —
 *     no CSS classes are referenced anywhere in the code.
 *   - When multiple rate modules exist, their inputs are kept synchronized:
 *     changing a value in one instance immediately updates the same field in
 *     all other instances.
 *
 * SYNC APPROACH:
 *   - All field data is stored in a shared `state` object.
 *   - On the same triggers the validation module uses for its error stats:
 *       origin / destination → blur (and immediately on suggestion pick)
 *       cargo                → change
 *       date                 → change (and blur)
 *       transport            → change
 *   - When a field changes in one instance, its value is written to `state`,
 *     then propagated to the same field in every other instance.
 *
 * LOOP PREVENTION:
 *   - Syncing dispatches events on the target instances (so the validation and
 *     transport modules update). Those events would otherwise re-trigger this
 *     module's own listeners and cause an infinite loop. A shared `syncing`
 *     flag guards every sync handler so a sync-in-progress is never re-entered.
 *
 * SELECTORS (attribute based, no hard-coded IDs, no CSS classes):
 *   [data-rate-module] → the module wrapper (add this attribute in Webflow)
 *
 * Field values are read from the SAME attributes the feature modules use:
 *   - Origin      → [data-location-input][name="cargo_origin"]
 *   - Destination → [data-location-input][name="cargo_destination"]
 *   - Cargo       → [data-cargo-select] + [data-cargo-input] (display label)
 *   - Date        → [data-date-input] (data-date-iso holds yyyy-MM-dd)
 *   - Transport   → [data-transport-checkbox]
 *
 * NOTE: The date field is synced through the Flatpickr instance attached to
 * each input (input._flatpickr), so the calendar stays in sync too.
 * ============================================================================
 */

export function initModuleSync() {
  // Find every rate module via the [data-rate-module] attribute only. No CSS
  // classes are referenced, so the code is fully reusable regardless of styling.
  const modules = document.querySelectorAll('[data-rate-module]');
  // Nothing to sync when there is only one (or zero) instance.
  if (modules.length < 2) return;

  // Prevents infinite loops: while a sync is propagating to other instances,
  // the events it dispatches must not re-enter this module's own handlers.
  let syncing = false;

  // Shared state, keyed by field name.
  const state = {
    origin: { value: '', valid: false },
    destination: { value: '', valid: false },
    cargo: { value: '', label: '', valid: false },
    date: { value: '', iso: '', valid: false },
    transport: [],
  };

  modules.forEach((module) => {
    wireLocation(module, 'cargo_origin', 'origin');
    wireLocation(module, 'cargo_destination', 'destination');
    wireCargo(module);
    wireDate(module);
    wireTransport(module);
  });

  /**
   * Origin & Destination location inputs. Syncs on blur (the validation
   * trigger) and immediately when a suggestion is picked (location-selected).
   */
  function wireLocation(module, name, key) {
    const input = module.querySelector(`[data-location-input][name="${name}"]`);
    if (!input) return;

    const sync = () => {
      if (syncing) return;
      syncing = true;
      try {
        state[key] = { value: input.value, valid: input.dataset.isValid === 'true' };
        modules.forEach((m) => {
          if (m === module) return;
          const target = m.querySelector(`[data-location-input][name="${name}"]`);
          if (!target || target === document.activeElement) return;
          target.value = state[key].value;
          target.dataset.isValid = state[key].valid ? 'true' : 'false';
          // Notify the validation module so the target's button state updates.
          target.dispatchEvent(new CustomEvent('location-selected', { bubbles: true }));
        });
      } finally {
        syncing = false;
      }
    };

    input.addEventListener('blur', sync);
    input.addEventListener('location-selected', sync);
  }

  /**
   * Cargo field. Syncs on change (the validation trigger). Updates both the
   * hidden select value and the display input label.
   */
  function wireCargo(module) {
    const select = module.querySelector('[data-cargo-select]');
    const display = module.querySelector('[data-cargo-input]');
    if (!select) return;

    const sync = () => {
      if (syncing) return;
      syncing = true;
      try {
        state.cargo = {
          value: select.value,
          label: display ? display.value : '',
          valid: select.dataset.isValid === 'true',
        };
        modules.forEach((m) => {
          if (m === module) return;
          const targetSelect = m.querySelector('[data-cargo-select]');
          const targetDisplay = m.querySelector('[data-cargo-input]');
          if (!targetSelect) return;
          targetSelect.value = state.cargo.value;
          targetSelect.dataset.isValid = state.cargo.valid ? 'true' : 'false';
          if (targetDisplay) targetDisplay.value = state.cargo.label;
          // Notify the validation module so the target's button state updates.
          targetSelect.dispatchEvent(new Event('change', { bubbles: true }));
        });
      } finally {
        syncing = false;
      }
    };

    select.addEventListener('change', sync);
  }

  /**
   * Ready Date field. Syncs on change (when a date is picked) and on blur.
   * Uses the Flatpickr instance attached to each input so the calendar stays
   * in sync, not just the displayed text.
   */
  function wireDate(module) {
    const input = module.querySelector('[data-date-input]');
    if (!input) return;

    const sync = () => {
      if (syncing) return;
      syncing = true;
      try {
        state.date = {
          value: input.value,
          iso: input.dataset.dateIso || '',
          valid: input.dataset.isValid === 'true',
        };
        modules.forEach((m) => {
          if (m === module) return;
          const target = m.querySelector('[data-date-input]');
          if (!target || target === document.activeElement) return;
          if (target._flatpickr && state.date.iso) {
            target._flatpickr.setDate(state.date.iso, false, 'Y-m-d');
          } else {
            target.value = state.date.value;
          }
          target.dataset.dateIso = state.date.iso;
          target.dataset.isValid = state.date.valid ? 'true' : 'false';
          // Notify the validation module so the target's button state updates.
          target.dispatchEvent(new Event('change', { bubbles: true }));
        });
      } finally {
        syncing = false;
      }
    };

    input.addEventListener('change', sync);
    input.addEventListener('blur', sync);
  }

  /**
   * Transport checkboxes. Syncs on change (the validation trigger). Copies the
   * checked state of each checkbox to the other instances.
   */
  function wireTransport(module) {
    const checkboxes = module.querySelectorAll('[data-transport-checkbox]');
    if (checkboxes.length === 0) return;

    const sync = () => {
      if (syncing) return;
      syncing = true;
      try {
        state.transport = Array.from(
          module.querySelectorAll('[data-transport-checkbox]:checked')
        ).map((cb) => cb.dataset.transportValue);

        modules.forEach((m) => {
          if (m === module) return;
          const targetCheckboxes = m.querySelectorAll('[data-transport-checkbox]');

          targetCheckboxes.forEach((cb) => {
            const shouldCheck = state.transport.includes(cb.dataset.transportValue);
            cb.checked = shouldCheck;
          });

          // Notify the transport + validation modules so the target's state
          // and button update.
          targetCheckboxes.forEach((cb) => {
            cb.dispatchEvent(new Event('change', { bubbles: true }));
          });

          // Webflow's custom checkbox handler listens for `change` and toggles
          // the `w--redirected-checked` class on the sibling visual div, which
          // leaves it out of sync with the input's checked state. Run AFTER the
          // change dispatch so we override Webflow's toggle and force the
          // visual to exactly match the input's checked state.
          targetCheckboxes.forEach((cb) => {
            const shouldCheck = state.transport.includes(cb.dataset.transportValue);
            const visual = cb.previousElementSibling;
            if (visual && visual.classList.contains('w-checkbox-input')) {
              visual.classList.toggle('w--redirected-checked', shouldCheck);
            }
          });
        });
      } finally {
        syncing = false;
      }
    };

    checkboxes.forEach((cb) => {
      cb.addEventListener('change', sync);
      // Webflow's custom checkbox handler calls preventDefault() and toggles
      // the input's `checked` property manually, which does NOT fire a native
      // `change` event. So also sync on click (scheduled after the toggle) to
      // guarantee the other instances update on every user interaction.
      const label = cb.closest('label');
      if (label) {
        label.addEventListener('click', () => setTimeout(sync, 0));
      }
    });
  }
}
