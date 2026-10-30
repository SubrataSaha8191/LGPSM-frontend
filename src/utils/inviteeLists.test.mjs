// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { canManageInviteeLists, howAdded, stateExplanation, restoreOutcome } from "./inviteeLists.ts";

test("only organizers and admins manage invitee lists; System Users and anyone else do not", () => {
  assert.equal(canManageInviteeLists("ORGANIZER"), true);
  assert.equal(canManageInviteeLists("ADMIN"), true);
  assert.equal(canManageInviteeLists("SYSTEM_USER"), false);
  assert.equal(canManageInviteeLists(undefined), false);
});

test("how a list was added", () => {
  assert.equal(howAdded({ source: "EXCEL", mode: "REPLACE" }), "Replaced list");
  assert.equal(howAdded({ source: "EXCEL", mode: "APPEND" }), "Added to list");
  assert.match(howAdded({ source: "MANUAL", mode: "APPEND" }), /by hand/);
});

test("a locked list says what locked it and that unsent guests are kept too", () => {
  const t = stateExplanation({ locked: true, lockReasons: { sentGuests: 2, answeredRsvp: 1, checkedIn: 0 }, failed: 0, unknown: 0, replaceableGuests: 0 });
  assert.match(t, /^Locked: 2 invitations sent, 1 RSVP answered\./);
  assert.match(t, /including guests who have not been sent anything yet/);
});

test("an open list with failed or unresolved sends keeps them and says so", () => {
  const t = stateExplanation({ locked: false, lockReasons: null, failed: 1, unknown: 2, replaceableGuests: 3 });
  assert.match(t, /^Open:/);
  assert.match(t, /1 guest has a failed send \(kept, can be retried\)/);
  assert.match(t, /2 guests have unresolved deliveries/);
  assert.match(t, /set aside 3 guests who were never invited/);
});

test("restore outcome names the guest they clash with and never promises an invitation", () => {
  const res = { restored: 1, alreadyActive: 0, refused: 1, notFound: 0, results: [{ id: "a", status: "RESTORED" }, { id: "b", status: "DUPLICATE_ACTIVE", conflictsWith: { name: "Rival Ray", matchedOn: "mobile" } }] };
  const out = restoreOutcome(res, (id) => (id === "b" ? "Dee Draft" : "x"));
  assert.equal(out.tone, "warning");
  assert.match(out.message, /1 guest restored as Not sent \(no invitation was sent and no access pass was created\)/);
  assert.equal(out.conflicts.length, 1);
  assert.match(out.conflicts[0], /Dee Draft was not restored: Rival Ray on the active list has the same mobile number/);
});

test("when nothing could be restored the outcome is an error", () => {
  const out = restoreOutcome({ restored: 0, alreadyActive: 0, refused: 1, notFound: 0, results: [{ id: "b", status: "DUPLICATE_ACTIVE", conflictsWith: { name: "R", matchedOn: "email" } }] }, () => "G");
  assert.equal(out.tone, "error");
});
