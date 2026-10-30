// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { previewLines, channelLine, needsAttention, safeRetryCount, unknownCount, UNKNOWN_WARNING } from "./cancellationSummary.ts";

const none = { PENDING: 0, SENDING: 0, SENT: 0, FAILED: 0, UNAVAILABLE: 0, UNKNOWN: 0 };

test("nobody invited: says so and promises nothing", () => {
  const lines = previewLines({ invitedGuests: 0, byChannel: { email: 0, whatsapp: 0, unknownChannel: 0 }, notInvited: 4, whatsappNoticesAvailable: false });
  assert.match(lines[0], /nobody will be notified/);
  assert.match(lines[1], /4 guests on your list never received an invitation/);
});

test("counts and channels come straight from the server numbers", () => {
  const lines = previewLines({ invitedGuests: 6, byChannel: { email: 4, whatsapp: 3, unknownChannel: 0 }, notInvited: 1, whatsappNoticesAvailable: true });
  assert.match(lines[0], /6 guests were sent an invitation .*4 by email, 3 by WhatsApp.*whatever their RSVP/);
  assert.match(lines[1], /1 guest on your list never/);
  assert.equal(lines.length, 2);
});

test("a missing WhatsApp setup is stated rather than hidden", () => {
  const lines = previewLines({ invitedGuests: 1, byChannel: { email: 0, whatsapp: 1, unknownChannel: 0 }, notInvited: 0, whatsappNoticesAvailable: false });
  assert.ok(lines.some((l) => /WhatsApp cancellation messages are not set up/.test(l)));
});

test("a single guest uses the singular", () => {
  assert.match(previewLines({ invitedGuests: 1, byChannel: { email: 1, whatsapp: 0, unknownChannel: 0 }, notInvited: 0, whatsappNoticesAvailable: true })[0], /^1 guest was sent/);
});

test("'sent' is reported as accepted by the provider, never as delivered", () => {
  const line = channelLine("Email", { ...none, SENT: 3, FAILED: 1 });
  assert.equal(line, "Email: 3 accepted by the provider, 1 failed");
  assert.ok(!/deliver/i.test(line));
  assert.equal(channelLine("WhatsApp", none), null);
});

test("failed or unavailable notices need attention; sent and waiting ones do not", () => {
  assert.equal(needsAttention({ channels: { email: { ...none, SENT: 2, PENDING: 1 }, whatsapp: none } }), false);
  assert.equal(needsAttention({ channels: { email: none, whatsapp: { ...none, UNAVAILABLE: 1 } } }), true);
});

test("an unknown outcome is shown as unknown, not as a failure, and is kept apart from the safe retries", () => {
  const channels = { email: { ...none, SENT: 2, FAILED: 1, UNKNOWN: 2 }, whatsapp: { ...none, UNAVAILABLE: 1 } };
  assert.equal(channelLine("Email", channels.email), "Email: 2 accepted by the provider, 1 failed, 2 outcome unknown");
  assert.equal(safeRetryCount({ channels }), 2);
  assert.equal(unknownCount({ channels }), 2);
  assert.equal(needsAttention({ channels: { email: { ...none, UNKNOWN: 1 }, whatsapp: none } }), true);
  assert.match(UNKNOWN_WARNING, /may already have received/);
  assert.match(UNKNOWN_WARNING, /second one/);
});
