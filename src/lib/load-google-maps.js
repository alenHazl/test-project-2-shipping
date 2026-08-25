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
 * When no maps/api/js tag exists on the page, this module injects one, with a
 * version-pinned URL (v=weekly) so the browser never reuses a stale cached
 * bootstrap. If the page has its own tag, it is never duplicated - loading the
 * API twice corrupts Google's internals and crashes the Places autocomplete.
 * ============================================================================
 */

const MAPS_API_URL = 'https://maps.googleapis.com/maps/api/js';
const MAPS_VERSION = 'weekly'; // rolling release; always exposes importLibrary

/**
 * Resolves once google.maps.importLibrary is available.
 *
 * Guarantees the API is loaded AT MOST ONCE:
 *   - If the page already has a maps/api/js script tag, waits for its loader
 *     to expose importLibrary (never injects a second copy).
 *   - Otherwise injects exactly one cache-proof, version-pinned script tag.
 *
 * The API key is never stored in this repo: it is read at runtime from the
 * page - either from window.RateModuleConfig.googleMapsApiKey or from the
 * existing maps/api/js script tag in the page's own HTML.
 */
export async function ensureGoogleMaps() {
  if (window.google?.maps?.importLibrary) return;

  // NEVER load the Maps API twice. If the page already has a maps/api/js
  // script tag, wait for ITS loader to become ready instead of injecting a
  // second one. Double-loading corrupts Google's internals (duplicate gmp-*
  // custom elements, broken request interceptors) and crashes the Places
  // autocomplete, so a second tag must never be added.
  const existingTag = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
  if (existingTag) {
    await waitForImportLibrary();
    return;
  }

  const key = getApiKey();
  if (!key) {
    throw new Error(
      'Google Maps API key not found. Set window.RateModuleConfig.googleMapsApiKey ' +
        'to let the module load the Maps API itself.'
    );
  }

  const src = `${MAPS_API_URL}?key=${encodeURIComponent(key)}&loading=async&v=${MAPS_VERSION}`;

  if (!document.querySelector(`script[src="${src}"]`)) {
    await injectScript(src);
  }

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
        reject(
          new Error(
            'google.maps.importLibrary is not available. If your page has its own ' +
              'Google Maps script tag, add &v=weekly to its URL so it loads the ' +
              'current loader (stale cached copies lack importLibrary).'
          )
        );
      } else {
        setTimeout(poll, 100);
      }
    };

    poll();
  });
}
