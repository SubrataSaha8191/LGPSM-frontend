// Wording and small decisions for the "Invitee Lists" modal, kept apart from the component so they can be tested.
// The server decides whether a list is Locked; nothing here recomputes it.

export const canManageInviteeLists = (role?: string | null): boolean => role === "ORGANIZER" || role === "ADMIN";

export const howAdded = (set: { source: string; mode: string }): string =>
  set.source === "MANUAL" ? "Added by hand / earlier uploads" : set.mode === "REPLACE" ? "Replaced list" : "Added to list";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Why the list is Open or Locked, in words the organizer can act on. */
export function stateExplanation(set: { locked: boolean; lockReasons: { sentGuests: number; answeredRsvp: number; checkedIn: number } | null; failed: number; unknown: number; replaceableGuests: number }): string {
  if (set.locked && set.lockReasons) {
    const parts = [
      set.lockReasons.sentGuests ? plural(set.lockReasons.sentGuests, "invitation sent", "invitations sent") : "",
      set.lockReasons.answeredRsvp ? plural(set.lockReasons.answeredRsvp, "RSVP answered", "RSVPs answered") : "",
      set.lockReasons.checkedIn ? plural(set.lockReasons.checkedIn, "guest checked in", "guests checked in") : "",
    ].filter(Boolean);
    return `Locked: ${parts.join(", ")}. The whole list is kept as it is, including guests who have not been sent anything yet.`;
  }
  const notes = [
    set.failed ? `${plural(set.failed, "guest has a failed send", "guests have failed sends")} (kept, can be retried)` : "",
    set.unknown ? `${plural(set.unknown, "guest has an unresolved delivery", "guests have unresolved deliveries")} (kept; they may have received it)` : "",
  ].filter(Boolean);
  const base = "Open: no invitation has been sent successfully from this list, nobody has answered and nobody has checked in.";
  const replace = set.replaceableGuests ? ` A Replace can set aside ${plural(set.replaceableGuests, "guest who was never invited", "guests who were never invited")}.` : "";
  return base + (notes.length ? ` ${notes.join("; ")}.` : "") + replace;
}

export type RestoreOutcome = { tone: "success" | "warning" | "error"; message: string; conflicts: string[] };

const matchedOn = (m: "email" | "mobile") => (m === "email" ? "email address" : "mobile number");

/** One line for the whole restore, plus one line per refused guest naming who they clash with. */
export function restoreOutcome(res: { restored: number; alreadyActive: number; refused: number; notFound: number; results: Array<{ id: string; status: string; conflictsWith?: { name: string; matchedOn: "email" | "mobile" } }> }, nameOf: (id: string) => string): RestoreOutcome {
  const conflicts = res.results
    .filter((r) => r.status === "DUPLICATE_ACTIVE" && r.conflictsWith)
    .map((r) => `${nameOf(r.id)} was not restored: ${r.conflictsWith!.name} on the active list has the same ${matchedOn(r.conflictsWith!.matchedOn)}. Edit or remove that guest first, then restore again.`);
  const parts = [
    res.restored ? `${plural(res.restored, "guest restored", "guests restored")} as Not sent (no invitation was sent and no access pass was created)` : "",
    res.alreadyActive ? `${plural(res.alreadyActive, "guest was", "guests were")} already active` : "",
    res.refused ? `${plural(res.refused, "guest", "guests")} could not be restored` : "",
    res.notFound ? `${plural(res.notFound, "guest was", "guests were")} not found` : "",
  ].filter(Boolean);
  return { tone: res.refused || res.notFound ? (res.restored ? "warning" : "error") : "success", message: parts.join("; ") + ".", conflicts };
}

export const DELIVERY_LABEL: Record<string, string> = { NOT_SENT: "Not sent", SENT: "Sent", FAILED: "Sending failed", UNKNOWN: "Outcome unknown" };

/** Maps an API refusal to the sentence shown to the organizer. */
export function restoreErrorMessage(message?: string): string {
  return message || "The guests could not be restored. Nothing was changed.";
}
