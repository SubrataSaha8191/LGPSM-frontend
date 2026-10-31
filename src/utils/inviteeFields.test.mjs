// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { expectedColumnsFor, excelColumnsFor, inviteeConfigFor, inviteeFieldsFor, templateRow, EXCEL_HEADER } from "./inviteeFields.ts";

const configs = [
  {},
  { company: true },
  { identity: true },
  { dietary: true },
  { company: true, identity: true, dietary: true },
];

test("the generated Excel columns are exactly the fields the manual form shows, for every configuration", () => {
  for (const c of configs) {
    const fromForm = inviteeFieldsFor(c).map((k) => EXCEL_HEADER[k]);
    assert.deepEqual(Object.keys(templateRow(c)), fromForm);
    assert.deepEqual(excelColumnsFor(c), fromForm);
  }
});

test("Professional Identity appears only when the card uses it, in both the sample and the form", () => {
  assert.ok(!inviteeFieldsFor({}).includes("identity"));
  assert.ok(!("Professional Identity" in templateRow({})));
  const cfg = inviteeConfigFor({ cardInfo: { primary: "INVITEE_NAME", secondary: "PROFESSIONAL_IDENTITY" } });
  assert.ok(inviteeFieldsFor(cfg).includes("identity"));
  assert.ok("Professional Identity" in templateRow(cfg));
});

test("Company Name is always offered, but a sheet is only required to have it when the event shows it", () => {
  assert.ok(inviteeFieldsFor({}).includes("company"));
  assert.ok("Company Name" in templateRow({}));
  assert.ok(!expectedColumnsFor({}).some((c) => c.key === "company"));
  assert.ok(expectedColumnsFor({ company: true }).some((c) => c.key === "company"));
});

test("company is required for corporate events or when chosen for the card; dietary is no column", () => {
  assert.ok(inviteeConfigFor({ corporate: true }).company);
  assert.ok(inviteeConfigFor({ cardInfo: { primary: "COMPANY_NAME", secondary: null } }).company);
  assert.ok(!inviteeConfigFor({ cardInfo: { primary: "INVITEE_NAME", secondary: null } }).company);
  assert.ok(!inviteeConfigFor({}).dietary);
  assert.ok(inviteeConfigFor({ dietaryEnabled: true }).dietary);
});

test("the food choice is never a column or a form field, even when the event asks guests for one", () => {
  const cfg = inviteeConfigFor({ dietaryEnabled: true });
  assert.ok(!excelColumnsFor(cfg).some((h) => /diet|food/i.test(h)));
  assert.ok(!("Dietary Preference" in templateRow(cfg)));
});

test("name, email and mobile are always the first three columns", () => {
  assert.deepEqual(excelColumnsFor({ company: true, identity: true, dietary: true }).slice(0, 3), ["Name", "Email", "Mobile"]);
});
