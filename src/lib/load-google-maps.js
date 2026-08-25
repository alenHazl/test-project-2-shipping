/**
 * ============================================================================
 * GOOGLE MAPS LOADER - CACHE-PROOF
 * ============================================================================
 * Ensures the CURRENT Google Maps loader (the one that exposes
 * google.maps.importLibrary) is present on the page, no matter what the
 * browser's cache served for maps.googleapis.com.
 *
 * Why this exists: browsers cache maps/api/js aggressively. An old cached
 * bootstrap predates google.maps.importLibrary(), so calling it throws
 * "google.maps.importLibrary is not a function" and the autocomplete silently
 * stops working (a hard refresh "fixes" it until the stale copy is reused).
 * This loader re-injects the script with a version-pinned URL (v=weekly) - a
 * different URL than any cached copy - and waits for importLibrary to appear.
 * ============================================================================
 */

const MAPS_API_URL = 'https://maps.googleapis.com/maps/api/js';
const MAPS_VERSION = 'weekly'; // rolling release; always exposes importLibrary

/**
 * Resolves once google.maps.importLibrary is available.
 * Uses the page's existing loader if it already supports importLibrary,
 * otherwise injects a fresh, version-pinned script tag.
 *
 * The API key is never stored in this repo: it is read at runtime from the
 * page - either from window.RateModuleConfig.googleMapsApiKey or from the
 * existing maps/api/js script tag in the page's own HTML.
 */
export async function ensureGoogleMaps() {
  if (window.google?.maps?.importLibrary) return;

  const key = getApiKey();
  if (!key) {
    throw new Error(
      'Google Maps API key not found. Add a script tag such as ' +
        '<script src="https://maps.googleapis.com/maps/api/js?key=YOUR_KEY" async></script> ' +
        'to the page, or set window.RateModuleConfig.googleMapsApiKey.'
    );
  }

  const src = `${MAPS_API_URL}?key=${encodeURIComponent(key)}&loading=async&v=${MAPS_VERSION}`;

  // Avoid injecting duplicates if ensureGoogleMaps runs more than once.
  if (!document.querySelector(`script[src="${src}"]`)) {
    await injectScript(src);
  }

  // The bootstrap defines importLibrary when it executes; poll to cover slow
  // networks or any other script redefining window.google first.
  await waitForImportLibrary();
}

// Reads the API key from the existing maps/api/js script tag already on the
// page (no key in the repo), falling back to an explicit embedder override.
function getApiKey() {
  const configKey = window.RateModuleConfig?.googleMapsApiKey;
  if (typeof configKey === 'string' && configKey) return configKey;

  const existing = Array.from(
    document.querySelectorAll('script[src*="maps.googleapis.com/maps/api/js"]')
  )[0];
  if (existing) {
    const match = existing.src.match(/[?&]key=([^&]+)/);
    if (match) return decodeURIComponent(match[1]);
  }

  return null;
}

function injectScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load Google Maps API script (${src}).`));
    document.head.appendChild(script);
  });
}

function waitForImportLibrary(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    const poll = () => {
      if (window.google?.maps?.importLibrary) {
        resolve();
      } else if (Date.now() - startedAt > timeoutMs) {
        reject(new Error('Timed out waiting for google.maps.importLibrary to become available.'));
      } else {
        setTimeout(poll, 100);
      }
    };

    poll();
  });
}
