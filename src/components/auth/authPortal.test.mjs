// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { parsePortalMode, portalForRole, portalRole } from "./authPortal.ts";

test("the web has only the admin and organizer portals", () => {
  assert.equal(parsePortalMode("admin").mode, "admin");
  assert.equal(parsePortalMode("organizer").mode, "organizer");
  assert.equal(parsePortalMode("user").mode, "organizer"); // legacy alias
});

test("retired system-user links fall back to the organizer sign-in instead of a dead page", () => {
  for (const raw of ["system_user", "assigned_user", "app", "system", "SYSTEM_USER", "nonsense", "", null, undefined]) {
    assert.equal(parsePortalMode(raw).mode, "organizer", String(raw));
  }
  assert.equal(parsePortalMode("app", "admin").mode, "admin"); // the caller's fallback is respected
});

test("the portal never asks the backend to sign in a system user", () => {
  assert.equal(portalRole("admin"), "ADMIN");
  assert.equal(portalRole("organizer"), "ORGANIZER");
  assert.equal(portalForRole("SYSTEM_USER"), "organizer");
  assert.equal(portalForRole("ADMIN"), "admin");
  assert.equal(portalForRole(undefined), "organizer");
});

test("the parsed portal no longer carries a mobile-only flag", () => {
  assert.deepEqual(Object.keys(parsePortalMode("admin")), ["mode"]);
});

import { clearExplicitLogout, flagExplicitLogout, isExplicitLogout, loginRedirectPath } from "./authPortal.ts";

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};

test("a deliberate logout is remembered until the next sign-in clears it", () => {
  const s = memory();
  assert.equal(isExplicitLogout(s), false);
  flagExplicitLogout(s);
  assert.equal(isExplicitLogout(s), true);
  clearExplicitLogout(s);
  assert.equal(isExplicitLogout(s), false);
});

test("blocked storage never throws", () => {
  const broken = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); }, removeItem() { throw new Error("denied"); } };
  assert.doesNotThrow(() => flagExplicitLogout(broken));
  assert.equal(isExplicitLogout(broken), false);
  assert.doesNotThrow(() => clearExplicitLogout(broken));
  assert.equal(isExplicitLogout(null), false);
});

test("a redirect without a page carries no return path", () => {
  const url = loginRedirectPath();
  assert.doesNotMatch(url, /from=/);
  assert.match(loginRedirectPath("/settings/account"), /from=%2Fsettings%2Faccount/);
});
