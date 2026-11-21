import test from "node:test";
import assert from "node:assert/strict";
import { findRepeatedGuests } from "./repeatedGuests.ts";

const r = (id: string, name: string, email: string, phone: string) => ({ id, name, email, phone });

test("flags a repeated email or mobile, first row is kept", () => {
  const out = findRepeatedGuests([r("2", "A", "a@x.com", "9000000001"), r("3", "B", "A@x.com", ""), r("4", "C", "", "+91 90000 00001"), r("5", "D", "d@x.com", "9000000004")]);
  assert.deepEqual(out.map((x) => [x.row, x.firstRow]), [["3", "2"], ["4", "2"]]);
});
test("no repeats", () => {
  assert.equal(findRepeatedGuests([r("2", "A", "a@x.com", ""), r("3", "B", "b@x.com", "")]).length, 0);
});
