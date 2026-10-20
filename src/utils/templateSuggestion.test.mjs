// Run with: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { suggestTemplate } from "./templateSuggestion.ts";

const T = (id, category, sub, extra = {}) => ({ _id: id, name: id, categoryId: category, subcategoryId: sub, ...extra });
const list = [
  T("birthday", "personal", "bday"),
  T("wedding", "personal", "wed"),
  T("rice", "personal", "rice"),
  T("corp-awards", "corporate", "awards"),
  T("corp-general", "corporate", undefined),
  T("tech", { _id: "tech" }, undefined),
];

test("the template made for the exact subcategory wins", () => {
  assert.equal(suggestTemplate(list, "personal", "wed")?._id, "wedding");
  assert.equal(suggestTemplate(list, "corporate", "awards")?._id, "corp-awards");
});

test("a template for the whole category is the next best", () => {
  assert.equal(suggestTemplate(list, "corporate", "summit")?._id, "corp-general");
  assert.equal(suggestTemplate(list, "corporate", "")?._id, "corp-general");
});

test("never suggests a template made for a different subcategory", () => {
  assert.equal(suggestTemplate(list, "personal", "anniversary"), null);
});

test("before a subcategory is chosen, any template of the category is a reasonable start", () => {
  assert.equal(suggestTemplate(list, "personal", "")?._id, "birthday");
});

test("understands a populated category reference", () => {
  assert.equal(suggestTemplate(list, "tech", "")?._id, "tech");
});

test("ignores drafts, deleted templates and other categories; nothing chosen means nothing suggested", () => {
  const some = [T("draft", "c", undefined, { isPublished: false }), T("gone", "c", undefined, { isActive: false }), T("other", "d", undefined)];
  assert.equal(suggestTemplate(some, "c", ""), null);
  assert.equal(suggestTemplate(list, "", ""), null);
  assert.equal(suggestTemplate([], "personal", "bday"), null);
});
