// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { POLICY_FLAGS, policyOptions, policyOf, POLICY_LABEL } from "./checkInPolicy.ts";

const all = { acceptInvitedAttendees: true, chooseNotRespondedInvitees: true, chooseRSVPDeclinedInvitees: true };

test("every choice round-trips through the flags the server enforces", () => {
  for (const key of Object.keys(POLICY_FLAGS)) assert.equal(policyOf(POLICY_FLAGS[key]), key);
});

test("the dropdown offers what the platform settings allow", () => {
  assert.deepEqual(policyOptions(all), ["ACCEPTED_ONLY", "ACCEPTED_AND_NOT_RESPONDED", "ALL_INVITED", "EVERYONE"]);
  assert.deepEqual(policyOptions({ acceptInvitedAttendees: false, chooseNotRespondedInvitees: false, chooseRSVPDeclinedInvitees: true }), ["ACCEPTED_ONLY"]);
  assert.deepEqual(policyOptions({ acceptInvitedAttendees: true, chooseNotRespondedInvitees: false, chooseRSVPDeclinedInvitees: false }), ["ACCEPTED_ONLY", "ALL_INVITED"]);
});

test("declined guests are admitted only by the most permissive choice", () => {
  assert.equal(POLICY_FLAGS.EVERYONE.allowDeclined, true);
  for (const k of ["ACCEPTED_ONLY", "ACCEPTED_AND_NOT_RESPONDED", "ALL_INVITED"]) assert.equal(POLICY_FLAGS[k].allowDeclined, false);
});

test("only the first choice refuses guests who have not responded", () => {
  assert.equal(POLICY_FLAGS.ACCEPTED_ONLY.allowNotResponded || POLICY_FLAGS.ACCEPTED_ONLY.allowAllInvited, false);
  assert.ok(POLICY_LABEL.ACCEPTED_ONLY.length > 0);
});
