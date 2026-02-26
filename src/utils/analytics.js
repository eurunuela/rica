/**
 * GoatCounter analytics utility.
 *
 * Tracks dataset-load events via GoatCounter's pixel endpoint (GET request
 * via a 1×1 Image object).  Fire-and-forget: failures from ad-blockers or
 * offline/local usage are silently ignored so they never affect the user.
 *
 * NOTE: We intentionally avoid adding an external <script> tag because the
 * Gulp build pipeline (gulpfile.js) inlines all .js script tags and would
 * fail trying to inline an external URL.
 */

const GOATCOUNTER_ENDPOINT = "https://rica-fmri.goatcounter.com/count";

function trackEvent(path, title) {
  // Skip tracking in local/development environments
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return;
  }

  const params = new URLSearchParams({
    p: path,
    t: title || document.title,
    r: document.referrer,
  });

  // Pixel approach: no CORS issues, fire-and-forget
  const img = new Image();
  img.src = `${GOATCOUNTER_ENDPOINT}?${params.toString()}`;
}

/**
 * Track a successful dataset load event.
 * Call this when a user finishes loading a dataset (server or file picker).
 */
export function trackDatasetLoaded() {
  trackEvent("/dataset-loaded", "Dataset Loaded");
}
