import test from "node:test";
import assert from "node:assert/strict";
import { summarizeDelivery } from "./deliverySummary.mjs";

test("All delivery reports per-channel counts and guests skipped for having no contact", () => {
  const r = summarizeDelivery([
    { status: "SENT", emailStatus: "SENT" },
    { status: "SENT", whatsappStatus: "SENT" },
    { status: "SENT", emailStatus: "SENT", whatsappStatus: "FAILED" },
    { status: "SKIPPED", failureReason: "No email address or WhatsApp number" },
  ], "sent", "BOTH");
  assert.equal(r.message, "3 sent, 0 failed, 1 skipped (no email or WhatsApp number).");
  assert.equal(r.type, "info");
  assert.deepEqual(r.details.slice(0, 2), ["Email: 2 sent, 0 failed, 2 skipped", "WhatsApp: 1 sent, 1 failed, 2 skipped"]);
});

test("a partial failure lists each distinct reason once", () => {
  const r = summarizeDelivery([{ status: "SENT" }, { status: "FAILED", failureReason: "MISSING_EMAIL" }, { status: "FAILED", failureReason: "MISSING_EMAIL" }], "resent", "EMAIL");
  assert.equal(r.message, "1 resent, 2 failed.");
  assert.deepEqual(r.details, ["MISSING_EMAIL"]);
});

test("nothing to report is an error, everything sent is a success", () => {
  assert.equal(summarizeDelivery([], "sent", "EMAIL").type, "error");
  assert.deepEqual(summarizeDelivery([{ status: "SENT" }], "sent", "WHATSAPP"), { type: "success", message: "1 invitation(s) sent." });
});
