import test from "node:test";
import assert from "node:assert/strict";
import { EVENT_TITLE_MAX_LENGTH, EVENT_DESCRIPTION_MAX_LENGTH } from "./eventLimits.mjs";

test("event copy limits leave practical room for invitation templates", () => {
  assert.equal(EVENT_TITLE_MAX_LENGTH, 50);
  assert.equal(EVENT_DESCRIPTION_MAX_LENGTH, 180);
  assert.ok(EVENT_TITLE_MAX_LENGTH < 100);
  assert.ok(EVENT_DESCRIPTION_MAX_LENGTH < 500);
});
