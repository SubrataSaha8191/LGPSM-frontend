// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { effectiveAdmissionIso, validateAdmission, admissionPayload } from "./admissionWindow.ts";

const start = "2026-10-31T04:30:00.000Z"; // 10:00 IST
const end = "2026-10-31T11:30:00.000Z"; // 17:00 IST
const opens = "2026-10-31T03:30:00.000Z"; // 09:00 IST

test("empty fields follow the event: opens at the start, closes at the end", () => {
  const w = effectiveAdmissionIso({ start, end, opens: null, closes: null });
  assert.equal(w.opensAt, start);
  assert.equal(w.closesAt, end);
  assert.equal(w.opensIsDefault && w.closesIsDefault, true);
});

test("an earlier opening time is kept and the closing time stays at the end", () => {
  const w = effectiveAdmissionIso({ start, end, opens, closes: null });
  assert.equal(w.opensAt, opens);
  assert.equal(w.closesAt, end);
  assert.equal(w.opensIsDefault, false);
});

test("defaults and an early opening are valid", () => {
  assert.deepEqual(validateAdmission({ start, end, opens: null, closes: null }), {});
  assert.deepEqual(validateAdmission({ start, end, opens, closes: null }), {});
});

test("opening must come before closing", () => {
  assert.match(validateAdmission({ start, end, opens: end, closes: null }).admissionOpens, /before the event ends/);
  assert.match(validateAdmission({ start, end, opens, closes: opens }).admissionCloses, /after it opens/);
  assert.match(validateAdmission({ start, end, opens: null, closes: "2026-10-31T04:00:00.000Z" }).admissionCloses, /after it opens/);
});

test("a later closing time (an overrunning event) is allowed", () => {
  assert.deepEqual(validateAdmission({ start, end, opens, closes: "2026-10-31T13:30:00.000Z" }), {});
});

test("garbage is rejected rather than sent", () => {
  assert.ok(validateAdmission({ start, end, opens: "not a date", closes: null }).admissionOpens);
});

test("payload sends nulls for defaults so a cleared field really resets", () => {
  assert.deepEqual(admissionPayload({ opens: null, closes: null }), { opensAt: null, closesAt: null });
  assert.deepEqual(admissionPayload({ opens, closes: null }), { opensAt: opens, closesAt: null });
});
