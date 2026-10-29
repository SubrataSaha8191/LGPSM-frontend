import test from "node:test";
import assert from "node:assert/strict";
import { pageWindow, paginate } from "./pagination.mjs";

test("page numbers keep the ends and the current page's neighbours", () => {
  assert.deepEqual(pageWindow(1, 1), [1]);
  assert.deepEqual(pageWindow(1, 0), []);
  assert.deepEqual(pageWindow(1, 3), [1, 2, 3]);
  assert.deepEqual(pageWindow(5, 10), [1, "...", 4, 5, 6, "...", 10]);
  assert.deepEqual(pageWindow(1, 10), [1, 2, "...", 10]);
  assert.deepEqual(pageWindow(3, 5), [1, 2, 3, 4, 5]);
});

test("paginate returns the right rows and clamps out-of-range pages", () => {
  const items = Array.from({ length: 23 }, (_, i) => i + 1);
  assert.deepEqual(paginate(items, 1, 10), { current: 1, totalPages: 3, rows: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] });
  assert.deepEqual(paginate(items, 3, 10).rows, [21, 22, 23]);
  assert.equal(paginate(items, 99, 10).current, 3);
  assert.deepEqual(paginate([], 1, 10), { current: 1, totalPages: 1, rows: [] });
});
