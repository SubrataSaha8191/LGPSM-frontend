import test from "node:test";
import assert from "node:assert/strict";
import { awayTooLong, AWAY_LIMIT_MS } from "./awayLimit.ts";

test("an hour is the limit: just under stays, just over goes to the dashboard", () => {
  const now = 1_000_000_000_000;
  assert.equal(awayTooLong(now - 30 * 60_000, now), false);
  assert.equal(awayTooLong(now - AWAY_LIMIT_MS, now), false);
  assert.equal(awayTooLong(now - AWAY_LIMIT_MS - 1, now), true);
  assert.equal(awayTooLong(now - 5 * 3600_000, now), true);
});

test("nothing stamped yet (a fresh sign-in) is never away", () => {
  assert.equal(awayTooLong(null, Date.now()), false);
});
