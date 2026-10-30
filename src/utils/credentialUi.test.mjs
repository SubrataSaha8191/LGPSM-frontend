// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { REASONS, reasonsFor, validatePassForm, STATUS_PILL, revokeAvailability, replaceAvailability, historyTitle, noticeText, hasUnsent, hasUnknown } from "./credentialUi.ts";

test("the six reason categories are offered; 'Access withdrawn' is not a reason to replace", () => {
  assert.deepEqual(REASONS.map((r) => r.label), ["Lost or compromised pass", "Pass forwarded or shared", "Duplicate or incorrectly issued pass", "Access withdrawn", "Attendee requested replacement", "Other"]);
  assert.equal(reasonsFor("REVOKE").length, 6);
  assert.equal(reasonsFor("REPLACE").some((r) => r.value === "ACCESS_WITHDRAWN"), false);
});

test("a category is required, the explanation is optional, Other needs one", () => {
  assert.deepEqual(validatePassForm("REVOKE", { category: "", note: "" }), { category: "Choose a reason." });
  assert.deepEqual(validatePassForm("REVOKE", { category: "ACCESS_WITHDRAWN", note: "" }), {});
  assert.match(validatePassForm("REVOKE", { category: "OTHER", note: "  " }).note, /Explain/);
  assert.deepEqual(validatePassForm("REVOKE", { category: "OTHER", note: "why" }), {});
  assert.ok(validatePassForm("REPLACE", { category: "ACCESS_WITHDRAWN", note: "x" }).category);
  assert.match(validatePassForm("REVOKE", { category: "LOST_OR_COMPROMISED", note: "x".repeat(501) }).note, /500/);
});

test("pass status is its own vocabulary and 'Replaced' is not a current status", () => {
  assert.deepEqual(Object.values(STATUS_PILL).map((p) => p.label).sort(), ["Active", "Expired", "Not issued", "Revoked"]);
});

test("revoke is offered only for an issued, not-yet-revoked pass on a published event", () => {
  assert.equal(revokeAvailability({ credentialStatus: "ACTIVE" }, "PUBLISHED").allowed, true);
  assert.equal(revokeAvailability({ credentialStatus: "EXPIRED" }, "PUBLISHED").allowed, true);
  assert.equal(revokeAvailability({ credentialStatus: "REVOKED" }, "PUBLISHED").allowed, false);
  assert.equal(revokeAvailability({ credentialStatus: "NOT_ISSUED" }, "PUBLISHED").allowed, false);
  assert.equal(revokeAvailability({ credentialStatus: "ACTIVE" }, "CANCELLED").allowed, false);
});

test("replace follows the revocation reason: allowed, prohibited, or needs review", () => {
  assert.equal(replaceAvailability({ credentialStatus: "ACTIVE" }, "PUBLISHED").allowed, true);
  for (const category of ["LOST_OR_COMPROMISED", "FORWARDED_OR_SHARED", "DUPLICATE_OR_INCORRECT", "ATTENDEE_REQUESTED_REPLACEMENT"]) {
    assert.deepEqual(replaceAvailability({ credentialStatus: "REVOKED", credentialRevocation: { category } }, "PUBLISHED"), { allowed: true });
  }
  assert.equal(replaceAvailability({ credentialStatus: "REVOKED", credentialRevocation: { category: "ACCESS_WITHDRAWN" } }, "PUBLISHED").allowed, false);
  assert.deepEqual(replaceAvailability({ credentialStatus: "REVOKED", credentialRevocation: { category: "OTHER" } }, "PUBLISHED"), { allowed: true, needsReview: true });
  assert.equal(replaceAvailability({ credentialStatus: "EXPIRED" }, "PUBLISHED").allowed, false);
  assert.equal(replaceAvailability({ credentialStatus: "NOT_ISSUED" }, "PUBLISHED").allowed, false);
});

test("history rows read as events, with a replaced pass shown as history and the new pass as Active", () => {
  assert.equal(historyTitle({ type: "ISSUED", version: 1, source: "SEND" }), "Pass 1 issued");
  assert.equal(historyTitle({ type: "REVOKED", version: 1, source: "REVOKE" }), "Pass 1 revoked");
  assert.equal(historyTitle({ type: "REPLACED", version: 2, previousVersion: 1, source: "REPLACE" }), "Pass 1 replaced → pass 2 (Active)");
});

test("message outcomes are stated honestly: accepted is not delivered, unknown is not failed", () => {
  assert.equal(noticeText("Email", { status: "SENT" }), "Email: accepted by the provider");
  assert.match(noticeText("WhatsApp", { status: "UNAVAILABLE", failureReason: "WhatsApp is not set up on the server" }), /not sent — WhatsApp is not set up/);
  assert.match(noticeText("Email", { status: "UNKNOWN" }), /outcome unknown.*may already have been sent/);
  assert.equal(noticeText("Email", { status: "NOT_USED" }), null);
  assert.equal(hasUnsent([{ notice: { email: { status: "FAILED" }, whatsapp: { status: "NOT_USED" } } }]), true);
  assert.equal(hasUnknown([{ notice: { email: { status: "UNKNOWN" }, whatsapp: { status: "NOT_USED" } } }]), true);
  assert.equal(hasUnsent([{ notice: { email: { status: "UNKNOWN" }, whatsapp: { status: "SENT" } } }]), false);
});
