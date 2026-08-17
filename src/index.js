/**
 * ============================================================================
 * RATE CALCULATOR MODULE — ENTRY POINT
 * ============================================================================
 *
 * This file is the single entry point bundled by esbuild into dist/index.js
 * (loaded via CDN). It contains only imports and the top-level wiring that
 * initializes each feature on page load.
 *
 * Feature modules (src/features/):
 *   - cargo-dropdown.js        → Cargo type dropdown
 *   - location-autocomplete.js → Origin & Destination autocomplete
 *   - date-picker.js           → Ready Date custom date picker
 *   - transport-checkboxes.js  → Sea / Air / Train checkboxes
 *   - validation.js            → Calculate-button validation
 *
 * Services (src/services/):
 *   - url-builder.js           → Calculate redirect URL
 *   - sync-modules.js          → Multi-instance sync
 *
 * Shared helpers (src/lib/):
 *   - combobox.js              → WAI-ARIA keyboard navigation for dropdowns
 *   - dropdown.js              → Shared open/close/outside-click behaviour
 *
 * Styles (src/styles/):
 *   - flatpickr-css.js         → Flatpickr CSS inlined as a JS string and
 *                                injected into the page (see date-picker.js).
 *                                No separate CSS file request is made.
 *
 * Each module is reusable: it initializes every matching element on the page,
 * so the module works correctly if the rate module is duplicated.
 * ============================================================================
 */

import { initCargoDropdown } from './features/cargo-dropdown.js';
import { initDatePicker } from './features/date-picker.js';
import { initLocationAutocomplete } from './features/location-autocomplete.js';
import { initTransportCheckboxes } from './features/transport-checkboxes.js';
import { initValidation } from './features/validation.js';
import { initModuleSync } from './services/sync-modules.js';
import { initUrlBuilder } from './services/url-builder.js';

window.addEventListener('load', async () => {
  // Cargo type dropdown.
  initCargoDropdown();

  // Ready Date custom date picker.
  initDatePicker();

  // Sea / Air / Train transport checkboxes.
  initTransportCheckboxes();

  // Origin & Destination location autocomplete.
  await initLocationAutocomplete();

  // Calculate-button validation.
  initValidation();

  // Calculate redirect URL construction.
  initUrlBuilder();

  // Multi-instance sync.
  initModuleSync();
});
