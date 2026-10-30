// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parseInviteeSheet, rowsToSheetFile } from "./inviteeSheet.ts";

const fileOf = (rows) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Invitees");
  return new File([XLSX.write(wb, { type: "array", bookType: "xlsx" })], "list.xlsx");
};

test("the preview reads the Professional Identity column", async () => {
  const parsed = await parseInviteeSheet(fileOf([["Name", "Email", "Professional Identity"], ["Pia Roy", "pia@x.com", "Employee ID: 4521"], ["Quin Das", "quin@x.com", ""]]));
  assert.deepEqual(parsed.rows.map((r) => r.identity), ["Employee ID: 4521", ""]);
  assert.equal(parsed.problems.length, 0);
});

test("an edited preview row keeps its Professional Identity when it is turned back into a file", async () => {
  const parsed = await parseInviteeSheet(fileOf([["Name", "Email", "Professional Identity"], ["Pia Roy", "pia@x.com", "Licence 77"]]));
  const again = await parseInviteeSheet(rowsToSheetFile(parsed.rows, "list.xlsx"));
  assert.equal(again.rows[0].identity, "Licence 77");
});

test("a sheet without the column still parses, with no identity", async () => {
  const parsed = await parseInviteeSheet(fileOf([["Name", "Email"], ["Pia Roy", "pia@x.com"]]));
  assert.equal(parsed.rows[0].identity, "");
});
