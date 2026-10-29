import test from "node:test";
import assert from "node:assert/strict";
import { eventIdFromPath } from "./eventRoute.mjs";

test("route names under /events are not treated as event ids (no /api/v1/events/select request)", () => {
  assert.equal(eventIdFromPath("/events/select/invitees"), null);
  assert.equal(eventIdFromPath("/events/add"), null);
  assert.equal(eventIdFromPath("/events"), null);
  assert.equal(eventIdFromPath("/dashboard"), null);
});

test("a real event id is found on every event tab", () => {
  const id = "6ae2c9447fd8513f3b22ff71";
  for (const tab of ["", "/edit", "/sessions", "/invitees", "/assign-users"]) assert.equal(eventIdFromPath(`/events/${id}${tab}`), id);
});
