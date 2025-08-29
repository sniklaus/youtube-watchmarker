/*
 * Minimal cross-browser polyfill for Firefox compatibility.
 * - Maps `browser.*` to `chrome.*` when `chrome` is missing.
 * - Adds `storage.[local|sync].getKeys()` if not available by deriving keys
 *   from a full-area `get(null)` call.
 *
 * This keeps existing Chrome-style code (`await chrome.*`) working in Firefox,
 * where Promise-based `chrome` is not guaranteed.
 */
(function () {
  try {
    const g = (typeof globalThis !== 'undefined') ? globalThis : window;

    // If running in Firefox, prefer the Promise-based `browser` API.
    if (typeof g.browser !== 'undefined' && typeof g.chrome === 'undefined') {
      g.chrome = g.browser;
    }

    // Polyfill storage.getKeys for browsers that don't support it.
    const addGetKeys = (areaName) => {
      const areaBrowser = g.browser && g.browser.storage && g.browser.storage[areaName];
      const areaChrome = g.chrome && g.chrome.storage && g.chrome.storage[areaName];

      // Helper to derive keys by fetching everything
      const deriveKeys = async () => {
        // Prefer Promise-based access through `browser` if available
        if (areaBrowser && typeof areaBrowser.get === 'function') {
          const all = await areaBrowser.get(null);
          return Object.keys(all || {});
        }
        // Fallback: try callback-style `chrome` and wrap in a Promise
        if (areaChrome && typeof areaChrome.get === 'function') {
          return await new Promise((resolve) => {
            try {
              areaChrome.get(null, (all) => resolve(Object.keys(all || {})));
            } catch (_) {
              resolve([]);
            }
          });
        }
        return [];
      };

      // Attach getKeys to browser.* if missing
      if (areaBrowser && typeof areaBrowser.getKeys !== 'function') {
        areaBrowser.getKeys = deriveKeys;
      }
      // Mirror to chrome.* as well
      if (areaChrome && typeof areaChrome.getKeys !== 'function') {
        areaChrome.getKeys = deriveKeys;
      }
    };

    addGetKeys('local');
    addGetKeys('sync');
  } catch (_) {
    // Best-effort polyfill; ignore errors.
  }
})();

