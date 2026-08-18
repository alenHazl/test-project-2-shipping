# Rate Calculator Module

A reusable Webflow module that powers the cargo quote form: origin/destination
autocomplete, a cargo-type dropdown, a custom date picker, transport checkboxes,
form validation, and the Calculate redirect URL.

Built with the [Finsweet Developer Starter](https://github.com/finsweet/developer-starter)
toolchain (esbuild + pnpm) and bundled into a single `dist/index.js` loaded via CDN.

---

## 📋 Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Setup](#setup)
- [Development](#development)
- [Webflow Integration](#webflow-integration)
- [Deployment](#deployment)
- [Common Commands](#common-commands)

---

## Features

| #   | Feature                                               | Module                                  |
| --- | ----------------------------------------------------- | --------------------------------------- |
| 1   | Origin & Destination autocomplete (Google Places)     | `src/features/location-autocomplete.js` |
| 2   | Cargo type dropdown                                   | `src/features/cargo-dropdown.js`        |
| 3   | Ready Date custom date picker (Flatpickr)             | `src/features/date-picker.js`           |
| 4   | Sea / Air / Train transport checkboxes                | `src/features/transport-checkboxes.js`  |
| 5   | Calculate-button validation                           | `src/features/validation.js`            |
| 6   | Calculate redirect URL construction                   | `src/services/url-builder.js`           |
| 7   | Multi-instance sync (duplicated modules stay in sync) | `src/services/sync-modules.js`          |

---

## Project Structure

```
src/
├── index.js                 # Entry point (imports + init wiring)
├── features/                # One module per form feature
│   ├── cargo-dropdown.js
│   ├── date-picker.js
│   ├── location-autocomplete.js
│   ├── transport-checkboxes.js
│   └── validation.js
├── lib/                     # Shared, reusable helpers
│   ├── combobox.js          # WAI-ARIA keyboard navigation for dropdowns
│   └── dropdown.js          # Shared open/close/outside-click behaviour
├── services/                # Cross-cutting concerns
│   ├── url-builder.js
│   └── sync-modules.js
└── styles/
    └── flatpickr-css.js     # Flatpickr CSS inlined as a JS string
```

---

## How It Works

### Entry point

`src/index.js` imports every module and initializes them on the `window` `load`
event. Each module is **reusable**: it queries every matching element on the page
by `data-*` attribute (no hard-coded IDs or CSS classes), so the module works
correctly if the rate module is duplicated.

### Markup reference

Every module targets elements purely by `data-*` attributes — no hard-coded IDs
or CSS classes. Add these attributes to the Webflow markup exactly where
described below. All fields are located by the same attributes their feature
module uses, so the validation and URL modules stay decoupled from the markup.

#### Module wrapper

| Attribute          | Where it goes                                                                        | Purpose                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-rate-module` | The outer wrapper that contains one full rate module (all fields + Calculate button) | Marks one module instance. Required for multi-instance sync, validation, and URL building. Add it to **every** copy of the module on the page. |

#### Origin & Destination (location autocomplete)

| Attribute               | Where it goes                                                                    | Purpose                                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `data-location-field`   | The field container (the wrapper that holds the input, dropdown list, and error) | Scopes the field. The dropdown list and error must be **direct children** of this element.                    |
| `data-location-input`   | The text `<input>`                                                               | The autocomplete target. Add `name="cargo_origin"` for Origin and `name="cargo_destination"` for Destination. |
| `data-location-list`    | The dropdown list container                                                      | Holds the suggestion items.                                                                                   |
| `data-location-item`    | A template item inside the list                                                  | Cloned once per suggestion.                                                                                   |
| `data-location-city`    | A text element inside each item                                                  | Receives the city name.                                                                                       |
| `data-location-country` | A text element inside each item                                                  | Receives the country name.                                                                                    |

> The error message for each location field is not part of the autocomplete
> itself — it is wired up by the validation module. Use `data-field-error-origin`
> on the Origin error element and `data-field-error-destination` on the
> Destination error element (see the "Calculate button, form & errors" table).

> If an item has neither `data-location-city` nor `data-location-country`, the
> whole item's text is set to `"City, Country"`.

#### Cargo type dropdown

| Attribute           | Where it goes                   | Purpose                                        |
| ------------------- | ------------------------------- | ---------------------------------------------- |
| `data-cargo-field`  | The field container             | Scopes the dropdown (outside-click detection). |
| `data-cargo-input`  | The visible text `<input>`      | Display + click target.                        |
| `data-cargo-select` | A hidden `<select>`             | Holds the option values and validity.          |
| `data-cargo-list`   | The dropdown list container     | Holds the option items.                        |
| `data-cargo-item`   | A template item inside the list | Cloned once per option.                        |
| `data-cargo-text`   | A text element inside each item | The option label.                              |
| `data-cargo-value`  | A text element inside each item | The option value.                              |

#### Ready Date (date picker)

| Attribute         | Where it goes      | Purpose                                                                                                                                 |
| ----------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `data-date-input` | The text `<input>` | The Flatpickr target. On selection the `yyyy-MM-dd` value is stored in the input's `data-date-iso` attribute (used by the URL builder). |

#### Transport checkboxes

| Attribute                 | Where it goes                               | Purpose                                                                                                                                                  |
| ------------------------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data-transport-checkbox` | Each checkbox `<input>` (Sea / Air / Train) | Marks a transport option.                                                                                                                                |
| `data-transport-value`    | On each checkbox                            | The URL value **on the attribute itself**, e.g. `data-transport-value="sea"` for Sea, `"air"` for Air, `"rail"` for Train. Sent in the URL when checked. |

#### Calculate button, form & errors

| Attribute                      | Where it goes                         | Purpose                                                                                    |
| ------------------------------ | ------------------------------------- | ------------------------------------------------------------------------------------------ |
| `data-calculate-button`        | The Calculate button (an `<a>`)       | The URL builder writes the constructed link to its `href`; validation enables/disables it. |
| `data-rate-form`               | The `<form>` element                  | Its native submit is blocked so the module controls navigation.                            |
| `data-field-error-origin`      | The Origin error message element      | Shown when Origin is invalid.                                                              |
| `data-field-error-destination` | The Destination error message element | Shown when Destination is invalid.                                                         |
| `data-field-error-cargo`       | The Cargo error message element       | Shown when Cargo is invalid.                                                               |
| `data-field-error-date`        | The Date error message element        | Shown when Date is invalid.                                                                |
| `data-field-error-transport`   | The Transport error message element   | Shown when no transport is selected.                                                       |

#### Optional debug helpers

| Attribute               | Where it goes                 | Purpose                                                                 |
| ----------------------- | ----------------------------- | ----------------------------------------------------------------------- |
| `data-url-debug`        | A paragraph inside the module | Live-updates with the full constructed link as the user fills the form. |
| `data-validation-debug` | A paragraph inside the module | Live-updates with the validation status of the module's fields.         |

#### Runtime flags (set by the code, not the markup)

| Attribute       | Where it is set       | Purpose                                                                 |
| --------------- | --------------------- | ----------------------------------------------------------------------- |
| `data-is-valid` | On each field's input | `"true"` when a valid value is selected; read by the validation module. |
| `data-date-iso` | On the date input     | The `yyyy-MM-dd` value used in the URL.                                 |

### Validation & URL flow

- Each field sets a `data-is-valid` flag on its input when a valid value is
  selected (e.g. a picked suggestion, a chosen date, a selected cargo option).
- `validation.js` reads those flags to enable/disable the Calculate button and
  show/hide per-field error messages.
- `url-builder.js` reads the field values on Calculate click and writes the
  constructed URL to the button's `href`, then redirects.

### Multi-instance sync

When more than one `[data-rate-module]` exists on a page, `sync-modules.js`
keeps their inputs synchronized through a shared `state` object, guarded by a
`syncing` flag to prevent infinite loops.

---

## Setup

Prerequisites: **Node.js v18+**, **pnpm**, and **GitHub Desktop** (optional).

```bash
# 1. Install dependencies
pnpm install

# 2. Start the development server
pnpm dev
```

The dev server serves the bundle at `http://localhost:3000/index.js` and
rebuilds automatically on save.

---

## Development

1. Create a feature branch (never commit directly to `master`).
2. Edit files in `src/`.
3. Test locally by adding `?staging=true` to the Webflow page URL (loads from
   `localhost:3000`), or in a standalone HTML file that includes
   `http://localhost:3000/index.js`.
4. Check code quality before committing:

```bash
pnpm lint        # ESLint + Prettier check
pnpm lint:fix    # Auto-fix linting issues
pnpm check       # TypeScript type check (even for JS files)
pnpm format      # Prettier write
```

---

## Webflow Integration

Add the built bundle to **Project Settings → Custom Code → Head Code** (or the
page's custom code) as a `<script>` tag pointing at the jsDelivr CDN URL:

```html
<script src="https://cdn.jsdelivr.net/gh/alenHazl/test-project-2-shipping@master/dist/index.js"></script>
```

The bundle is served from the GitHub repo via jsDelivr, so after a change you
must `pnpm build`, commit, and push the updated `dist/index.js` to GitHub.
jsDelivr caches the repo, so a fresh push can take a short while to appear.

### Google Maps setup

The Origin & Destination autocomplete uses the Google Maps Places API. The
Google Maps JS API script and its API key are **added separately in Webflow**
(Project Settings → Custom Code → Head Code), not in this repository, so the
key is never committed to source control:

```html
<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places"></script>
```

The code uses the new `google.maps.places.AutocompleteSuggestion` and
`google.maps.places.Place` APIs, loaded via `google.maps.importLibrary('places')`.
It expects `google.maps` to already be loaded globally on the page. If the Maps
script is missing, the autocomplete logs an error and the Origin/Destination
fields simply won't suggest locations — the rest of the module still works.

> **Note:** The new Places API requires the **Places API (New)** to be enabled
> in the Google Cloud Console for the API key. The legacy `libraries=places`
> script tag is no longer used — the Places library is loaded dynamically via
> `importLibrary('places')`.

#### Optional configuration

By default the autocomplete uses the **browser's language** and shows up to
**5 suggestions**. You can type any place (city, zip code, address, POI) and
every suggestion is resolved to a **City, Country** for display. To override
the defaults, add a small config script **below** the bundle script tag:

```html
<script src="https://cdn.jsdelivr.net/gh/alenHazl/test-project-2-shipping@master/dist/index.js"></script>
<script>
  window.RateModuleConfig = {
    language: 'en', // optional — defaults to the browser's language
    regionCode: 'uk', // optional — biases results toward a country
    includedRegionCodes: ['uk'], // optional — strictly limits results to these countries
    maxSuggestions: 3, // optional — defaults to 5
  };
</script>
```

- `language` — a [BCP-47 language tag](https://developers.google.com/maps/faq#languagesupport)
  (e.g. `'en'`, `'sl'`, `'de'`). When omitted, Google returns results in the
  browser's language. This controls the **suggestion text** shown in the
  dropdown, including the country name (e.g. `'en'` shows "London, UK" rather
  than the browser-localized "London, Združeno kraljestvo").

- `regionCode` — a two-character [ccTLD](https://en.wikipedia.org/wiki/Country_code_top-level_domain)
  code (e.g. `'uk'`, `'fr'`, `'de'`, `'si'`) that **biases** results toward that
  country (nearby results from other countries may still appear). When omitted,
  no region bias is applied. (Internally this is sent to the Maps JavaScript API
  as `region`, which is that API's name for the same parameter.)

- `includedRegionCodes` — an array of two-character
  [ccTLD](https://en.wikipedia.org/wiki/Country_code_top-level_domain) codes
  (e.g. `['si']`, `['uk', 'fr']`) that **strictly restricts** results to only
  those countries. Results from any other country are excluded. When omitted,
  no country restriction is applied. Use this instead of `regionCode` when you
  want a hard filter rather than a bias.

- `maxSuggestions` — a positive integer capping how many suggestions are shown.
  When omitted, defaults to `5`. **Important:** the Places API returns at most
  **5** suggestions, so this can only be set to show **fewer** than 5 — it can
  never show more than the API returns.

---

## Deployment

The bundle is served directly from the GitHub repo via jsDelivr — there is no
separate build/deploy pipeline. To ship a change:

1. Build the production bundle: `pnpm build`
2. Commit and push the updated `dist/index.js` to `master`.
3. jsDelivr serves the latest `master` build automatically (after its cache
   refreshes).

The CDN URL in Webflow points at `master`, so no version bump or republish is
needed after a push. If you ever switch to a versioned URL (e.g. a git tag or
commit hash), update the `<script src>` in Webflow's custom code accordingly.

---

## Common Commands

```bash
pnpm install      # Install dependencies
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm lint         # Check code quality
pnpm lint:fix     # Auto-fix linting issues
pnpm check        # Type check
pnpm changeset    # Create a changeset for versioning
```

---

## Attribution

Based on the [Finsweet Developer Starter](https://github.com/finsweet/developer-starter)
template.
