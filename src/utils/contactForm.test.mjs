// Run with: npm test   (Node's built-in test runner; Node >= 22.18 strips the TypeScript types natively)
import test from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_CONTACT_FORM,
  hasErrors,
  interpretContactResponse,
  toContactPayload,
  validateContactForm,
} from "./contactForm.ts";

const valid = {
  ...EMPTY_CONTACT_FORM,
  name: "Riya Sharma",
  email: "riya@example.com",
  phone: "+91 98765-43210",
  message: "Hello, I would like to know more about your plans.",
};

test("a complete, valid form has no errors", () => {
  assert.deepEqual(validateContactForm(valid), {});
  assert.equal(hasErrors(validateContactForm(valid)), false);
});

test("phone is optional but validated when present", () => {
  assert.deepEqual(validateContactForm({ ...valid, phone: "" }), {});
  assert.deepEqual(validateContactForm({ ...valid, phone: "   " }), {});
  assert.match(validateContactForm({ ...valid, phone: "12345" }).phone, /7–15 digits/);
  assert.match(validateContactForm({ ...valid, phone: "1".repeat(16) }).phone, /7–15 digits/);
});

test("required fields and length limits mirror the backend rules", () => {
  assert.match(validateContactForm({ ...valid, name: "" }).name, /Enter your name/);
  assert.match(validateContactForm({ ...valid, name: "R" }).name, /at least 2/);
  assert.match(validateContactForm({ ...valid, email: "" }).email, /Enter your email/);
  assert.match(validateContactForm({ ...valid, email: "nope" }).email, /valid email/);
  assert.match(validateContactForm({ ...valid, email: "a@b" }).email, /valid email/);
  assert.match(validateContactForm({ ...valid, message: "" }).message, /how we can help/);
  assert.match(validateContactForm({ ...valid, message: "too short" }).message, /at least 10/);
  assert.match(validateContactForm({ ...valid, message: "x".repeat(2001) }).message, /at most 2000/);
  assert.match(
    validateContactForm({ ...valid, message: "see http://a.example http://b.example http://c.example please" }).message,
    /remove links/
  );
});

test("payload is trimmed, omits an empty phone, and forwards the honeypot untouched", () => {
  assert.deepEqual(
    toContactPayload({ ...valid, name: "  Riya  ", phone: "  ", message: "  hello there friend  ", website: "" }),
    { name: "Riya", email: "riya@example.com", message: "hello there friend", website: "" }
  );
  assert.equal(toContactPayload({ ...valid, website: "bot.example" }).website, "bot.example");
  assert.equal(toContactPayload(valid).phone, "+91 98765-43210");
});

test("success is reported only when the API confirms acceptance", () => {
  const ok = interpretContactResponse({ success: true, message: "Thanks!", data: { id: "1", duplicate: false } });
  assert.deepEqual(ok, { kind: "success", duplicate: false, message: "Thanks!" });

  const retry = interpretContactResponse({ success: true, data: { id: "1", duplicate: true } });
  assert.equal(retry.kind, "success");
  assert.equal(retry.duplicate, true);
});

test("never reports success for a failed or missing response", () => {
  for (const res of [null, undefined, {}, { success: false, status: 500 }, { status: 200 }, { success: "true" }]) {
    assert.notEqual(interpretContactResponse(res).kind, "success");
  }
});

test("network failures keep the user informed and mention their input is preserved", () => {
  for (const res of [{ success: false, status: 0, message: "Failed to fetch" }, { success: false, message: "x" }]) {
    const out = interpretContactResponse(res);
    assert.equal(out.kind, "network");
    assert.match(out.message, /couldn't reach the server/i);
    assert.match(out.message, /still here/i);
    assert.doesNotMatch(out.message, /Failed to fetch/); // raw browser errors are not shown
  }
});

test("rate limiting surfaces the server's message", () => {
  const out = interpretContactResponse({ success: false, status: 429, message: "Too many messages sent from this network. Please try again in 15 minutes." });
  assert.equal(out.kind, "rate-limited");
  assert.match(out.message, /15 minutes/);
  assert.equal(interpretContactResponse({ success: false, status: 429 }).kind, "rate-limited");
});

test("backend validation issues are mapped back onto the right fields", () => {
  const out = interpretContactResponse({
    success: false,
    status: 400,
    message: "Enter a valid email address",
    details: [
      { path: ["body", "email"], message: "Enter a valid email address" },
      { path: ["body", "email"], message: "second email issue is ignored" },
      { path: ["body", "message"], message: "Message must be at least 10 characters" },
      { path: ["body", "somethingElse"], message: "unknown fields are dropped" },
    ],
  });
  assert.equal(out.kind, "validation");
  assert.deepEqual(out.fieldErrors, { email: "Enter a valid email address", message: "Message must be at least 10 characters" });
  assert.equal(out.message, "Enter a valid email address");
  assert.equal(interpretContactResponse({ success: false, status: 400, details: "garbage" }).kind, "validation");
});

test("server errors are generic and never leak internals", () => {
  const out = interpretContactResponse({ success: false, status: 500, message: "E11000 duplicate key secret detail" });
  assert.equal(out.kind, "server");
  assert.doesNotMatch(out.message, /E11000|secret/);
  assert.match(out.message, /still here/i);
  assert.equal(interpretContactResponse({ success: false, status: 503 }).kind, "server");
});
