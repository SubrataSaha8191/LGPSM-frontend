// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { applyRememberChoice, forgetRememberedEmail, readRememberedEmail, saveRememberedEmail } from "./rememberedLogin.ts";

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), dump: () => [...m.entries()] };
};

test("a remembered email comes back next time", () => {
  const s = memory();
  saveRememberedEmail(s, "organizer", "  Riya@Example.com ");
  assert.equal(readRememberedEmail(s, "organizer"), "Riya@Example.com");
});

test("each portal remembers its own email", () => {
  const s = memory();
  saveRememberedEmail(s, "admin", "boss@example.com");
  saveRememberedEmail(s, "organizer", "riya@example.com");
  assert.equal(readRememberedEmail(s, "admin"), "boss@example.com");
  assert.equal(readRememberedEmail(s, "organizer"), "riya@example.com");
});

test("unticking remember me forgets the saved email", () => {
  const s = memory();
  applyRememberChoice(s, "organizer", "riya@example.com", true);
  assert.equal(readRememberedEmail(s, "organizer"), "riya@example.com");
  applyRememberChoice(s, "organizer", "riya@example.com", false);
  assert.equal(readRememberedEmail(s, "organizer"), "");
});

test("only the email is ever stored (no password, no token)", () => {
  const s = memory();
  applyRememberChoice(s, "organizer", "riya@example.com", true);
  assert.deepEqual(s.dump().map(([, v]) => v), ["riya@example.com"]);
});

test("junk or invalid values are not saved and are ignored when read", () => {
  const s = memory();
  saveRememberedEmail(s, "organizer", "not-an-email");
  assert.equal(s.dump().length, 0);
  s.setItem("lgpsm_remembered_login:organizer", "<script>alert(1)</script>");
  assert.equal(readRememberedEmail(s, "organizer"), "");
  s.setItem("lgpsm_remembered_login:organizer", `${"a".repeat(260)}@example.com`);
  assert.equal(readRememberedEmail(s, "organizer"), "");
});

test("blocked or failing storage never throws", () => {
  const broken = { getItem() { throw new Error("denied"); }, setItem() { throw new Error("denied"); }, removeItem() { throw new Error("denied"); } };
  assert.equal(readRememberedEmail(broken, "organizer"), "");
  assert.doesNotThrow(() => saveRememberedEmail(broken, "organizer", "riya@example.com"));
  assert.doesNotThrow(() => forgetRememberedEmail(broken, "organizer"));
});
