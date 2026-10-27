import test from "node:test";
import assert from "node:assert/strict";
import { mergeInviteeImport } from "./mergeInviteeImport.mjs";

const existing = [{ _id: "a", name: "Ada", email: "ADA@example.com", mobile: "+1 555 0100", invitationStatus: "PENDING", rsvpStatus: "PENDING", sessionAccess: [{ sessionId: "s1", allowed: true }, { sessionId: "s2", allowed: false }] }];
const sessions = [{ id: "s1", name: "Entry" }, { id: "s2", name: "Dinner" }];
const row = (id, email, phone, name = "Guest") => ({ id, name, email, phone, company: "" });

test("reupload and overlap keep existing invitees and add only new contacts", () => {
  const result = mergeInviteeImport([row("2", "ada@example.com", "+1 (555) 0100"), row("3", "new@example.com", "")], existing, sessions);
  assert.equal(result.retained, 1);
  assert.equal(result.added, 1);
  assert.equal(result.rows[0].sessions.Dinner, false);
});

test("duplicate rows in one upload and identifier conflicts are counted", () => {
  const result = mergeInviteeImport([row("2", "a@example.com", "1111111"), row("3", "a@example.com", "1111111"), row("4", "A@example.com", "2222222"), row("5", "new@example.com", "")], existing, sessions);
  assert.equal(result.duplicateInUpload, 1);
  assert.equal(result.conflicts, 1);
});

test("rows with no contact key stay present for explicit row validation", () => {
  const result = mergeInviteeImport([row("2", "", "", "Same Name")], existing, sessions);
  assert.equal(result.rows.length, 2);
  assert.equal(result.added, 0);
});
