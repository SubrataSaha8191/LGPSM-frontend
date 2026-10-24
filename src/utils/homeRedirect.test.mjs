// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { shouldOpenDashboardInstead as go } from "./homeRedirect.ts";

test("a signed-in person who opens the site fresh goes to the dashboard", () => {
  assert.equal(go({ pathname: "/", hasSession: true, fetchSite: "none" }), true); // typed address, bookmark, new tab
  assert.equal(go({ pathname: "/", hasSession: true, fetchSite: "cross-site" }), true); // a link from another site
  assert.equal(go({ pathname: "/", hasSession: true, fetchSite: null }), true); // older browsers send no header
  assert.equal(go({ pathname: "/", hasSession: true }), true);
});

test("a click inside the site keeps the marketing page reachable", () => {
  assert.equal(go({ pathname: "/", hasSession: true, fetchSite: "same-origin" }), false);
  assert.equal(go({ pathname: "/", hasSession: true, fetchSite: "same-site" }), false);
  assert.equal(go({ pathname: "/", hasSession: true, fetchSite: "SAME-ORIGIN" }), false);
});

test("visitors without a session, and every other page, are never redirected", () => {
  assert.equal(go({ pathname: "/", hasSession: false, fetchSite: "none" }), false);
  for (const pathname of ["/signin", "/pricing", "/features", "/contact", "/dashboard", "/invitation/abc"]) assert.equal(go({ pathname, hasSession: true, fetchSite: "none" }), false, pathname);
});
