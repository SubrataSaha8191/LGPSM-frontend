// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { isFinished, pollDelayMs, describeGenerationError, variantBadge, variantImageKey, canSave, jobSummary, newIdempotencyKey, presetLabel, usageLabel, usageExhausted } from "./aiTemplate.ts";

test("only SUCCEEDED, CONCEPT_ONLY and FAILED stop polling", () => {
  for (const s of ["SUCCEEDED", "CONCEPT_ONLY", "FAILED"]) assert.equal(isFinished(s), true);
  for (const s of ["QUEUED", "RUNNING", undefined]) assert.equal(isFinished(s), false);
});

test("polling backs off but never gets slower than 6 seconds", () => {
  assert.equal(pollDelayMs(0), 2500);
  assert.ok(pollDelayMs(3) > pollDelayMs(0));
  assert.equal(pollDelayMs(500), 6000);
});

test("provider, quota, validation and network problems each get their own state", () => {
  assert.equal(describeGenerationError({ code: "PROVIDER_UNAVAILABLE" }).kind, "unavailable");
  assert.equal(describeGenerationError({ code: "PROVIDER_AUTH" }).retryable, false);
  assert.equal(describeGenerationError({ code: "QUOTA_EXCEEDED", message: "Used all 15" }).kind, "quota");
  assert.equal(describeGenerationError({ code: "QUOTA_EXCEEDED", message: "Used all 15" }).message, "Used all 15");
  assert.equal(describeGenerationError({ code: "RATE_LIMITED" }).retryable, true);
  assert.equal(describeGenerationError({ code: "PROVIDER_TIMEOUT" }).retryable, true);
  assert.equal(describeGenerationError({ code: "JOB_ACTIVE" }).kind, "busy");
  assert.equal(describeGenerationError({ code: "INVALID_REQUEST", message: "Too short" }).kind, "validation");
  assert.equal(describeGenerationError({ status: 0 }).kind, "network");
  assert.equal(describeGenerationError({ status: 429 }).kind, "quota");
  assert.equal(describeGenerationError({ status: 500 }).kind, "other");
});

test("a concept that is not converted is never presented as a template", () => {
  const concept = { ready: false, conceptImageKey: "media:c", previewImageKey: undefined };
  const ready = { ready: true, conceptImageKey: "media:c", previewImageKey: "media:p" };
  assert.deepEqual(variantBadge(concept), { label: "Concept only", tone: "concept" });
  assert.deepEqual(variantBadge(ready), { label: "Ready to use", tone: "ready" });
  assert.deepEqual(variantBadge({ ...ready, templateId: "t1" }), { label: "Saved", tone: "saved" });
  assert.equal(canSave(concept), false);
  assert.equal(canSave(ready), true);
  assert.equal(variantImageKey(ready), "media:p");
  assert.equal(variantImageKey(concept), "media:c");
  assert.equal(variantImageKey({ ready: false }), null);
});

test("job summaries say what happened", () => {
  assert.match(jobSummary({ status: "RUNNING", variants: [] }), /Designing/);
  assert.equal(jobSummary({ status: "SUCCEEDED", variants: [{ ready: true }] }), "1 design ready");
  assert.equal(jobSummary({ status: "SUCCEEDED", variants: [{ ready: true }, { ready: false }] }), "1 of 2 designs ready to use");
  assert.match(jobSummary({ status: "CONCEPT_ONLY", variants: [{ ready: false }] }), /could not be turned into a template/);
});

test("idempotency keys are unique and accepted by the backend's pattern", () => {
  const a = newIdempotencyKey();
  assert.notEqual(a, newIdempotencyKey());
  assert.match(a, /^[A-Za-z0-9_-]{8,80}$/);
});

test("size labels include the pixel size", () => {
  assert.equal(presetLabel({ label: "A4 poster", width: 1654, height: 2339 }), "A4 poster · 1654 × 2339");
});

test("the daily counter says how many generations are really left", () => {
  assert.equal(usageLabel({ used: 2, limit: 15, remaining: 13 }), "13 of 15 generations left today");
  assert.equal(usageLabel({ used: 14, limit: 15, remaining: 1 }), "1 of 15 generations left today");
  assert.match(usageLabel({ used: 15, limit: 15, remaining: 0 }), /Daily limit reached/);
  assert.equal(usageLabel({ used: 40, limit: null, remaining: null }), "No daily limit");
  assert.equal(usageLabel(null), "");
  assert.equal(usageExhausted({ used: 15, limit: 15, remaining: 0 }), true);
  assert.equal(usageExhausted({ used: 3, limit: 15, remaining: 12 }), false);
  assert.equal(usageExhausted({ used: 99, limit: null, remaining: null }), false);
  assert.equal(usageExhausted(undefined), false);
});
