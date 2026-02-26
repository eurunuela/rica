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

function trackEvent(path) {
  // Skip tracking in local/development environments
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return;
  }

  // Only send the path — no title, referrer, or other metadata
  const params = new URLSearchParams({ p: path });

  // Pixel approach: no CORS issues, fire-and-forget
  // referrerPolicy ensures the browser does not include a Referer header
  const img = new Image();
  img.referrerPolicy = "no-referrer";
  img.src = `${GOATCOUNTER_ENDPOINT}?${params.toString()}`;
}

/**
 * Track a successful dataset load event.
 * Call this when a user finishes loading a dataset (server or file picker).
 */
export function trackDatasetLoaded() {
  trackEvent("/dataset-loaded");
}
