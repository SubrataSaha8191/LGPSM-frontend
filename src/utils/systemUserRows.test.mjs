// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { filterSystemUsers, USERS_ON_EVENT, ALL_SYSTEM_USERS } from "./systemUserRows.ts";

const asn = (eventId, ids) => ({ assignmentId: "a", eventId, eventName: "E", sessions: ids.map((id) => ({ id, name: id })) });
const users = [
  { id: "whole", assignments: [asn("ev", [])] },
  { id: "keynote", assignments: [asn("ev", ["k"])] },
  { id: "two", assignments: [asn("ev", ["k", "w"])] },
  { id: "elsewhere", assignments: [asn("other", ["k"])] },
  { id: "free", assignments: [] },
];
const ids = (l) => l.map((u) => u.id);

test("everyone on the event, whatever their sessions", () => assert.deepEqual(ids(filterSystemUsers(users, "ev", USERS_ON_EVENT)), ["whole", "keynote", "two"]));
test("one session: people assigned to it, plus people who cover the whole event", () => {
  assert.deepEqual(ids(filterSystemUsers(users, "ev", "k")), ["whole", "keynote", "two"]);
  assert.deepEqual(ids(filterSystemUsers(users, "ev", "w")), ["whole", "two"]);
  assert.deepEqual(ids(filterSystemUsers(users, "ev", "closing")), ["whole"]);
});
test("a person assigned to another event never shows under this event's sessions", () => assert.ok(!ids(filterSystemUsers(users, "ev", "k")).includes("elsewhere")));
test("all system users includes people with no assignment", () => assert.equal(filterSystemUsers(users, "ev", ALL_SYSTEM_USERS).length, 5));
