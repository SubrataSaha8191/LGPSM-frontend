import test from "node:test";
import assert from "node:assert/strict";
import { MAX_UPLOAD_GUESTS, LIST_SIZE, isTooLarge, listsFor, splitNote, secondsLeft } from "./uploadLimits.ts";

test("5000 is the most one upload holds, in lists of 500", () => {
  assert.equal(MAX_UPLOAD_GUESTS, 5000);
  assert.equal(LIST_SIZE, 500);
  assert.equal(isTooLarge(5000), false);
  assert.equal(isTooLarge(5001), true);
});

test("how many lists an upload becomes", () => {
  assert.equal(listsFor(0), 0);
  assert.equal(listsFor(1), 1);
  assert.equal(listsFor(500), 1);
  assert.equal(listsFor(501), 2);
  assert.equal(listsFor(1200), 3);
  assert.equal(listsFor(5000), 10);
});

test("the note about splitting appears only when there is more than one list", () => {
  assert.equal(splitNote(300), "");
  assert.match(splitNote(1200), /3 lists of up to 500/);
});

test("seconds left never goes below zero and rounds up", () => {
  assert.equal(secondsLeft(10_000, 4_500), 6);
  assert.equal(secondsLeft(10_000, 10_000), 0);
  assert.equal(secondsLeft(10_000, 20_000), 0);
});
