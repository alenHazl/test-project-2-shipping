/**
 * ============================================================================
 * ORIGIN & DESTINATION LOCATION AUTOCOMPLETE
 * ============================================================================
 *
 * Implements the Origin and Destination fields:
 *   - Autocompletes locations using the Google Maps Places API.

 *   - After 2+ characters, shows a suggestion list of unique City, Country
 *     combinations (e.g. "Rotterdam, Netherlands").
 *   - Clicking a suggestion fills the field and closes the list.
 *   - A field is only valid when a suggestion was selected.
 *
 * Each prediction is resolved via the Place Details API to read its typed
 * address_components, so street addresses / zip codes / POIs all resolve to
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

  let AutocompleteService, PlacesService, PlacesServiceStatus;
  try {
    const placesLib = await google.maps.importLibrary('places');
    AutocompleteService = placesLib.AutocompleteService;
    PlacesServiceStatus = placesLib.PlacesServiceStatus || google.maps.places.PlacesServiceStatus;
    // PlacesService needs an attribution node — a detached div works fine,
    // we never render anything into it.
    PlacesService = new placesLib.PlacesService(document.createElement('div'));
  } catch (err) {
    console.error('Failed to initialize Google Places Autocomplete:', err);
    return;
  }

  const autocompleteService = new AutocompleteService();

  locationInputs.forEach((input) => {
    initLocationField(input, autocompleteService, PlacesService, PlacesServiceStatus);
  });

  function initLocationField(input, autocompleteService, placesService, PlacesServiceStatus) {
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

    function fetchCitySuggestions(query) {
      requestToken += 1;
      const token = requestToken;

      const request = { input: query };

      autocompleteService.getPlacePredictions(request, async (predictions, status) => {
        if (status !== PlacesServiceStatus.OK || !predictions) {
          dropdown.hide();
          return;
        }

        // Cap how many we resolve to details — each one is a billed call.
        const candidates = predictions.slice(0, 5);

        const resolved = await Promise.all(
          candidates.map((p) => getCityCountryFromPlaceId(p.place_id))
        );

        // Bail if a newer keystroke has already started a new request.
        if (token !== requestToken) return;

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
      });
    }

    // Resolve a place_id to a real, typed city + country via address_components.
    function getCityCountryFromPlaceId(placeId) {
      return new Promise((resolve) => {
        placesService.getDetails({ placeId, fields: ['address_components'] }, (result, status) => {
          if (status !== PlacesServiceStatus.OK || !result?.address_components) {
            resolve(null);
            return;
          }
          resolve(extractCityCountry(result.address_components));
        });
      });
    }

    /**
     * Reads the typed address_components Google returns for ANY place
     * (city, postal code, street address, POI...) and pulls out a real
     * city + country. Falls back through broader locality types when a
     * precise 'locality' isn't present (common for rural addresses).
     */
    function extractCityCountry(components) {
      const findType = (type) => components.find((c) => c.types.includes(type))?.long_name || null;

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
