// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { assignableEvents, selectionLabel, eligibleSelection, describeAssignResult } from "./bulkAssign.ts";

test("cancelled and completed events are not offered for assignment", () => {
  const events = [{ id: "1", name: "A", status: "PUBLISHED" }, { id: "2", name: "B", status: "CANCELLED" }, { id: "3", name: "C", status: "completed" }, { id: "4", name: "D" }];
  assert.deepEqual(assignableEvents(events).map((e) => e.id), ["1", "4"]);
});

test("the toolbar says how many users are selected", () => {
  assert.equal(selectionLabel(1), "1 user selected");
  assert.equal(selectionLabel(3), "3 users selected");
});

test("a stale or duplicated selection is reduced to users still in the list", () => {
  assert.deepEqual(eligibleSelection(["a", "b", "b", "gone"], ["a", "b", "c"]), ["a", "b"]);
  assert.deepEqual(eligibleSelection([], ["a"]), []);
  assert.deepEqual(eligibleSelection(["x"], []), []);
});

test("results are reported as success, partial or failure with the reasons", () => {
  assert.deepEqual(describeAssignResult(1, []), { kind: "success", message: "1 user was assigned." });
  assert.equal(describeAssignResult(3, []).message, "3 users were assigned.");
  const partial = describeAssignResult(3, [{ name: "Ravi", message: "User is already assigned to this event" }]);
  assert.equal(partial.kind, "partial");
  assert.match(partial.message, /2 of 3 users were assigned/);
  assert.match(partial.message, /Ravi: User is already assigned/);
  const none = describeAssignResult(2, [{ name: "A", message: "x" }, { name: "B", message: "y" }]);
  assert.equal(none.kind, "failure");
  assert.match(none.message, /^No one was assigned/);
});
