// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";

// Minimal browser stand-ins; tokenStorage only touches window, localStorage and document.cookie
function installBrowser(protocol = "https:") {
  const store = new Map();
  const cookieWrites = [];
  globalThis.window = { location: { protocol } };
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { set cookie(v) { cookieWrites.push(v); }, get cookie() { return ""; } },
  });
  return { store, cookieWrites };
}

const { tokenStorage } = await import("./tokenStorage.ts");

test("the access token is never copied into a cookie", () => {
  const { cookieWrites } = installBrowser();
  const jwt = "eyJhbGciOiJIUzI1NiJ9.payload.signature";
  tokenStorage.setAccessToken(jwt);
  assert.ok(cookieWrites.length > 0);
  for (const c of cookieWrites) assert.equal(c.includes(jwt), false);
});

test("sign-in sets a Secure SameSite session marker on https and clears the legacy token cookie", () => {
  const { cookieWrites } = installBrowser("https:");
  tokenStorage.setAccessToken("t");
  const marker = cookieWrites.find((c) => c.startsWith("lgpsm_session=1"));
  assert.ok(marker, "session marker cookie is written");
  assert.match(marker, /SameSite=Lax/);
  assert.match(marker, /; Secure/);
  assert.ok(cookieWrites.some((c) => c.startsWith("lgpsm_access_token=;") && /expires=Thu, 01 Jan 1970/.test(c)));
});

test("the Secure flag is omitted on plain http so local development still works", () => {
  const { cookieWrites } = installBrowser("http:");
  tokenStorage.setAccessToken("t");
  assert.doesNotMatch(cookieWrites.find((c) => c.startsWith("lgpsm_session=1")), /Secure/);
});

test("sign-out removes the stored tokens and both cookies", () => {
  const { store, cookieWrites } = installBrowser();
  tokenStorage.setAccessToken("a");
  tokenStorage.setRefreshToken("r");
  cookieWrites.length = 0;
  tokenStorage.clearTokens();
  assert.equal(store.size, 0);
  assert.ok(cookieWrites.some((c) => c.startsWith("lgpsm_session=;")));
  assert.ok(cookieWrites.some((c) => c.startsWith("lgpsm_access_token=;")));
});
