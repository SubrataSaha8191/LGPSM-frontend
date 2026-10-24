// Decides whether a request for the public home page should go straight to the dashboard instead.
// Dependency-free so it can be unit-tested.

/**
 * A signed-in person who opens the site fresh (typed address, bookmark, new tab, a link from elsewhere) should land
 * in the app, not on the marketing page. A click on a link inside the site (same-origin / same-site navigation, and
 * the router's own prefetches) is left alone, so the marketing pages stay reachable on purpose.
 *
 * `fetchSite` is the browser's Sec-Fetch-Site request header; it is absent in very old browsers, which count as fresh.
 */
export function shouldOpenDashboardInstead(input: { pathname: string; hasSession: boolean; fetchSite?: string | null }): boolean {
  if (input.pathname !== "/" || !input.hasSession) return false;
  const site = (input.fetchSite || "").toLowerCase();
  return site !== "same-origin" && site !== "same-site";
}
