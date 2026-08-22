/**
 * ============================================================================
 * ORIGIN & DESTINATION LOCATION AUTOCOMPLETE
 * ============================================================================
 *
 * Implements the Origin and Destination fields:
 *   - Autocompletes locations using the Google Maps Places API
 *     (google.maps.places.AutocompleteSuggestion / Place).
 *   - After 2+ characters, shows a suggestion list of unique City, Country
 *     combinations (e.g. "Rotterdam, Netherlands").
 *   - Clicking a suggestion fills the field and closes the list.
 *   - A field is only valid when a suggestion was selected.
 *
 * Each suggestion is resolved via the new Place API to read its typed
 * addressComponents, so street addresses / zip codes / POIs all resolve to
 * a real City, Country.
 *
 * SELECTORS (attribute based, no hard-coded IDs):
 *   [data-location-input]   → the text input
 *   [data-location-field]   → the field container (wrapper + outside-click
 *                             detection). The dropdown list and error are
 *                             direct children of this element.
 *   [data-location-list]    → dropdown list container
 *   [data-location-item]    → template item cloned for each suggestion
 *   [data-location-city]    → city text element
 *   [data-location-country] → country text element
 *   [data-location-error]   → error message element
 *
 * This is reusable: every [data-location-input] is initialized independently.
 * ============================================================================
 */

import { createDropdown } from '../lib/dropdown.js';

export async function initLocationAutocomplete() {
  const locationInputs = document.querySelectorAll('[data-location-input]');
  if (locationInputs.length === 0) return;

  // Optional embedder configuration via window.RateModuleConfig:
  //   { language: 'en', regionCode: 'uk', includedRegionCodes: ['uk'], maxSuggestions: 5 }
  // language defaults to the browser's language (not passed to Google).
  // regionCode biases results toward a country (e.g. 'uk', 'fr', 'de').
  // includedRegionCodes strictly restricts results to the listed countries.
  // maxSuggestions defaults to 5 (the API returns at most 5, so this can only
  // reduce the count below 5, never raise it).
  const config = window.RateModuleConfig || {};
  const language = typeof config.language === 'string' ? config.language : undefined;
  const regionCode = typeof config.regionCode === 'string' ? config.regionCode : undefined;
  const includedRegionCodes = Array.isArray(config.includedRegionCodes)
    ? config.includedRegionCodes.filter((c) => typeof c === 'string')
    : undefined;
  const maxSuggestions =
    Number.isInteger(config.maxSuggestions) && config.maxSuggestions > 0
      ? config.maxSuggestions
      : 5;

  // Uses the new google.maps.places API (AutocompleteSuggestion / Place),
  // loaded via google.maps.importLibrary('places'). If the library fails to
  // load, log an error and bail — the rest of the module still works.
  let AutocompleteSuggestion, Place;
  try {
    const placesLib = await google.maps.importLibrary('places');
    AutocompleteSuggestion = placesLib.AutocompleteSuggestion;
    Place = placesLib.Place;
  } catch (err) {
    console.error('Failed to initialize Google Places Autocomplete:', err);
    return;
  }

  locationInputs.forEach((input) => {
    initLocationField(
      input,
      AutocompleteSuggestion,
      Place,
      language,
      regionCode,
      includedRegionCodes,
      maxSuggestions
    );
  });

  function initLocationField(
    input,
    AutocompleteSuggestion,
    Place,
    language,
    regionCode,
    includedRegionCodes,
    maxSuggestions
  ) {
    // The [data-location-field] element is the wrapper. The dropdown list and
    // error are direct children of it.

    const fieldContainer = input.closest('[data-location-field]');
    if (!fieldContainer) return;

    const dropdownList = fieldContainer.querySelector('[data-location-list]');
    const templateItem = dropdownList ? dropdownList.querySelector('[data-location-item]') : null;

    if (!dropdownList || !templateItem) return;

    const templateClone = templateItem.cloneNode(true);
    dropdownList.innerHTML = '';
    dropdownList.classList.remove('show');
    dropdownList.style.display = 'none';

    let debounceTimer = null;
    let requestToken = 0; // guards against out-of-order async responses

    input.dataset.isValid = 'false';

    input.addEventListener('input', (e) => {
      const query = e.target.value.trim();

      input.dataset.isValid = 'false';
      clearTimeout(debounceTimer);

      if (query.length < 2) {
        dropdown.hide();
        return;
      }

      debounceTimer = setTimeout(() => {
        fetchCitySuggestions(query);
      }, 250);
    });

    // Clicking the field with enough text already in it shows the suggestions
    // immediately — no need to type again. fetchCitySuggestions renders the
    // list and shows the dropdown once results arrive.
    input.addEventListener('click', () => {
      const query = input.value.trim();
      if (query.length >= 2) {
        fetchCitySuggestions(query);
      }
    });

    // Tabbing / keyboard-navigating to the field also shows the suggestions
    // when it already has enough text (2+ chars). If the input is empty or has
    // only a single letter, nothing is fetched and no dropdown appears; if the
    // query returns no results, fetchCitySuggestions hides the list.
    input.addEventListener('focus', () => {
      const query = input.value.trim();
      if (query.length >= 2) {
        fetchCitySuggestions(query);
      }
    });

    // Shared open/close/toggle + keyboard + outside-click behaviour.

    const dropdown = createDropdown({
      input,
      list: dropdownList,
      getItems: () => Array.from(dropdownList.querySelectorAll('[data-location-item]')),
      onSelect: (item) => item._select && item._select(),
      onOpen: () => {
        const query = input.value.trim();
        if (query.length >= 2) {
          fetchCitySuggestions(query);
        }
        // The list is shown by renderSuggestions once results arrive.
        return false;
      },
    });

    // Builds the autocomplete request. Searches all place types (cities, zip
    // codes, addresses, POIs...) so the user can type anything; each result is
    // still resolved to a City, Country for display. Optionally:
    //   - regionCode biases results toward a country. Note: the Maps JavaScript
    //     API expects this as `region` (the Web Service REST API calls it
    //     `regionCode`), so we map the config value to `region` here.
    //   - includedRegionCodes strictly restricts results to the listed
    //     countries.
    // `withLanguage` controls whether the configured language is sent, so the
    // fallback can retry without it if the API rejects it.
    function buildAutocompleteRequest(query, withLanguage) {
      return {
        input: query,
        ...(regionCode && { region: regionCode }),
        ...(includedRegionCodes && includedRegionCodes.length > 0 && { includedRegionCodes }),
        ...(withLanguage && language && { language }),
      };
    }

    async function fetchCitySuggestions(query) {
      requestToken += 1;
      const token = requestToken;

      // Try with the configured language first; if that fails (e.g. the API
      // key doesn't support it), fall back to the browser's default language
      // so the autocomplete never breaks.
      let suggestions;
      try {
        const res = await AutocompleteSuggestion.fetchAutocompleteSuggestions(
          buildAutocompleteRequest(query, true)
        );
        suggestions = res.suggestions;
      } catch (err) {
        if (language) {
          console.error(
            `Autocomplete failed with language "${language}", retrying without it:`,
            err
          );
          try {
            const res = await AutocompleteSuggestion.fetchAutocompleteSuggestions(
              buildAutocompleteRequest(query, false)
            );
            suggestions = res.suggestions;
          } catch (err2) {
            console.error('Failed to fetch autocomplete suggestions:', err2);
            dropdown.hide();
            return;
          }
        } else {
          console.error('Failed to fetch autocomplete suggestions:', err);
          dropdown.hide();
          return;
        }
      }

      // Bail if a newer keystroke has already started a new request.
      if (token !== requestToken) return;

      if (!suggestions || suggestions.length === 0) {
        dropdown.hide();
        return;
      }

      // Cap how many we resolve to details — each one is a billed call.
      const candidates = suggestions.slice(0, maxSuggestions);

      // Dedupe by place ID first. When both regionCode and includedRegionCodes
      // are set, the API can return the same place multiple times (e.g. once as
      // a city prediction and once as a broader region prediction). placeId is
      // the canonical unique identifier, so this prevents resolving (and
      // billing) the same place twice.
      const seenIds = new Set();
      const uniqueCandidates = [];
      candidates.forEach((s) => {
        const id = s.placePrediction?.placeId;
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          uniqueCandidates.push(s);
        }
      });

      const resolved = await Promise.all(
        uniqueCandidates.map((s) =>
          getCityCountryFromPlaceId(
            s.placePrediction.placeId,
            s.placePrediction.text?.text,
            s.placePrediction.structuredFormat
          )
        )
      );

      // Bail if a newer keystroke has already started a new request.
      if (token !== requestToken) return;

      // Secondary safety net: collapse any distinct place IDs that resolve to
      // the same City, Country.
      const uniqueLocations = [];
      const seen = new Set();

      resolved.forEach((loc) => {
        if (!loc) return;
        const key = `${loc.city}-${loc.country}`.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          uniqueLocations.push(loc);
        }
      });

      renderSuggestions(uniqueLocations);
    }

    // Resolve a place_id to a real, typed city + country.
    //
    // Prefers the suggestion's `structuredFormat` (mainText = city,
    // secondaryText = country), which is returned in the requested language and
    // needs no extra API call. Falls back to the suggestion's full text for the
    // country, and finally to the Place API's addressComponents for the city.
    // fetchFields does NOT accept a `language` parameter, so its address
    // components follow the Maps script tag / browser language — hence it's only
    // used as a last resort.
    async function getCityCountryFromPlaceId(placeId, suggestionText, structuredFormat) {
      let city = null;
      let country = null;

      // 1) structuredFormat — cleanest, no extra API call.
      if (structuredFormat) {
        city = structuredFormat.mainText?.text || null;
        const secondary = structuredFormat.secondaryText?.text;
        if (secondary) country = extractCountryFromText(secondary);
      }

      // 2) Fall back to the full suggestion text for the country.
      if (!country && suggestionText) {
        country = extractCountryFromText(suggestionText);
      }

      // 3) Last resort: resolve the city via the Place API.
      if (!city) {
        try {
          const place = new Place({ id: placeId });
          await place.fetchFields({ fields: ['addressComponents'] });
          if (place.addressComponents) {
            const structured = extractCityCountry(place.addressComponents);
            if (structured) {
              city = structured.city;
              if (!country) country = structured.country;
            }
          }
        } catch (err) {
          console.error('Failed to fetch place details:', err);
        }
      }

      if (!city || !country) return null;
      return { city, country };
    }

    // Pulls the country out of a suggestion's display text, e.g.
    // "London, UK" → "UK", "New York, NY, USA" → "USA". The country is the
    // segment after the last comma. Returns null if there's no comma.
    function extractCountryFromText(text) {
      const lastComma = text.lastIndexOf(',');
      if (lastComma === -1) return null;
      const country = text.slice(lastComma + 1).trim();
      return country || null;
    }

    /**
     * Reads the typed addressComponents Google returns for ANY place
     * (city, postal code, street address, POI...) and pulls out a real
     * city + country. Falls back through broader locality types when a
     * precise 'locality' isn't present (common for rural addresses).
     */
    function extractCityCountry(components) {
      const findType = (type) => components.find((c) => c.types.includes(type))?.longText || null;

      const city =
        findType('locality') ||
        findType('postal_town') ||
        findType('sublocality') ||
        findType('administrative_area_level_3') ||
        findType('administrative_area_level_2') ||
        findType('administrative_area_level_1');

      const country = findType('country');

      if (!city || !country) return null;

      return { city, country };
    }

    function renderSuggestions(locations) {
      dropdownList.innerHTML = '';

      if (locations.length === 0) {
        dropdown.hide();
        return;
      }

      locations.forEach(({ city, country }, index) => {
        const item = templateClone.cloneNode(true);

        const cityEl = item.querySelector('[data-location-city]');
        const countryEl = item.querySelector('[data-location-country]');

        if (cityEl) cityEl.textContent = city;
        if (countryEl) countryEl.textContent = country;

        if (!cityEl && !countryEl) {
          item.textContent = `${city}, ${country}`;
        }

        const fullString = `${city}, ${country}`;

        // Give each option a stable id so the input's aria-activedescendant can
        // point at the highlighted one.
        item.id = `${input.id || 'location'}-option-${index}`;
        item.setAttribute('role', 'option');

        // Store the select callback on the element so the keyboard helper can
        // invoke it when Enter is pressed on a highlighted item.
        item._select = () => selectLocation(fullString);

        item.addEventListener('click', (e) => {
          e.preventDefault();
          selectLocation(fullString);
        });

        dropdownList.appendChild(item);
      });

      dropdown.show();
    }

    function selectLocation(locationStr) {
      input.value = locationStr;
      input.dataset.isValid = 'true';
      dropdown.hide();
      // Notify the validation module so the Calculate button state updates
      // immediately. A custom event is used (not 'input') so the autocomplete's
      // own input handler doesn't reset data-is-valid back to 'false'.
      input.dispatchEvent(new CustomEvent('location-selected', { bubbles: true }));
    }

    dropdown.bindOutsideClick(fieldContainer);
  }
}
