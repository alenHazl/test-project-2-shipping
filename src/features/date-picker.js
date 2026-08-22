/**
 * ============================================================================
 * READY DATE FIELD — CUSTOM DATE PICKER
 * ============================================================================
 *
 * Implements the "Ready Date" field:
 *   - Clicking the input field opens a custom date picker.
 *   - The user can select a year, month, and day.
 *   - The earliest selectable date is today (based on the user's local
 *     timezone) — past dates are disabled.
 *   - The user cannot type a date manually; clicking opens the calendar.
 *   - After selection, the input displays the date as dd-MM-yyyy
 *     (e.g. 15-11-2026).
 *   - The yyyy-MM-dd value (e.g. 2026-11-15) is stored as a data attribute
 *     on the input (`data-date-iso`) so it can be used in the URL.

 *
 * LIBRARY — Flatpicr
 *   - Bundled here via esbuild (JS + CSS).
 *   - The Flatpickr CSS is inlined as a JS string (see ../styles/flatpickr-css.js)
 *     and injected into the page with a <style> tag. This avoids a separate CSS
 *     file request, which is blocked by Private Network Access when the page
 *     is served from a public origin (e.g. Webflow) and the bundle from
 *     localhost.
 *
 * SELECTORS (attribute based, no hard-coded IDs):
 *   [data-date-input]  → the text input (Flatpickr target)
 *
 * The yyyy-MM-dd value for the URL is stored as a data attribute on the input
 * itself (`data-date-iso`), so no separate hidden input is needed. The field
 * displays dd-MM-yyyy, but the URL needs yyyy-MM-dd, so the ISO value is kept
 * separately.
 *
 * This is reusable: every [data-date-input] is initialized independently.
 * ============================================================================
 */

import flatpickr from 'flatpickr';

import { flatpickrCss } from '../styles/flatpickr-css.js';

// Custom overrides appended to the Flatpickr stylesheet:
//   - Text color #002d28 (brand dark teal) for the calendar text.
//   - Square corners (no border radius) and a cut-corner highlight on the
//     selected day, matching the design system.
const flatpickrOverrides = `
.flatpickr-months .flatpickr-month{color:#002d28}
.flatpickr-day{color:#002d28}

span.flatpickr-weekday{color:#002d28}
.flatpickr-calendar{border-radius:0}
.flatpickr-day.selected,.flatpickr-day.startRange,.flatpickr-day.endRange,.flatpickr-day.selected.inRange,.flatpickr-day.startRange.inRange,.flatpickr-day.endRange.inRange,.flatpickr-day.selected:focus,.flatpickr-day.startRange:focus,.flatpickr-day.endRange:focus,.flatpickr-day.selected:hover,.flatpickr-day.startRange:hover,.flatpickr-day.endRange:hover,.flatpickr-day.selected.prevMonthDay,.flatpickr-day.startRange.prevMonthDay,.flatpickr-day.endRange.prevMonthDay,.flatpickr-day.selected.nextMonthDay,.flatpickr-day.startRange.nextMonthDay,.flatpickr-day.endRange.nextMonthDay{border-radius:0;background:#39f2af;color:#002d28;border-color:#39f2af;--corner-size:8px;clip-path:polygon(0 0,calc(100% - var(--corner-size)) 0,100% var(--corner-size),100% 100%,var(--corner-size) 100%,0 calc(100% - var(--corner-size)))}
`;

// Inject the Flatpickr CSS into the page. Bundled as a string into the JS, so
// no separate CSS file request is needed (avoids Private Network Access blocks).
function injectFlatpickrCss() {
  if (document.getElementById('flatpickr-css')) return;

  const style = document.createElement('style');
  style.id = 'flatpickr-css';
  style.textContent = flatpickrCss + flatpickrOverrides;
  document.head.appendChild(style);
}

export function initDatePicker() {
  injectFlatpickrCss();

  const dateInputs = document.querySelectorAll('[data-date-input]');

  dateInputs.forEach((input) => {
    flatpickr(input, {
      // Display the date as dd-MM-yyyy in the field.
      dateFormat: 'd-m-Y',
      // Earliest selectable date is today (local timezone).
      minDate: 'today',
      // The user cannot type a date manually.
      allowInput: false,
      // Clicking the input opens the calendar.
      clickOpens: true,
      // Use the custom picker on mobile too (consistent behavior).
      disableMobile: true,
      // Store the yyyy-MM-dd value for the URL.
      onChange: (selectedDates) => {
        if (selectedDates.length === 0) return;
        // Store the ISO value on the input itself (no hidden input needed).
        input.dataset.dateIso = toISODate(selectedDates[0]);
        input.dataset.isValid = 'true';
        // Notify the validation module immediately. Dispatching `change` here
        // (after data-is-valid is set) guarantees the error hides the moment a
        // valid date is picked, regardless of Flatpickr's internal event
        // ordering. The validation module validates the date field on blur, but
        // clears the error on `change` (when a valid date is picked).
        input.dispatchEvent(new Event('change', { bubbles: true }));
      },
    });
  });
}

/**
 * Formats a Date as yyyy-MM-dd (e.g. 2026-11-15) for the URL.
 * @param {Date} date
 * @returns {string}
 */
function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
