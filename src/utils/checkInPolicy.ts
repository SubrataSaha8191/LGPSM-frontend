// "Who can check in": one choice instead of three checkboxes. It maps onto the event's three RSVP flags, which the server
// enforces at the door (checkIn.service.validateInviteeEligibility): a guest who declined is refused unless `allowDeclined`; a
// guest who has not answered is refused unless `allowNotResponded` or `allowAllInvited`.

export type CheckInPolicy = "ACCEPTED_ONLY" | "ACCEPTED_AND_NOT_RESPONDED" | "ALL_INVITED" | "EVERYONE";

export interface PolicyFlags { allowAllInvited: boolean; allowNotResponded: boolean; allowDeclined: boolean }
export interface PolicyFeatures { acceptInvitedAttendees: boolean; chooseNotRespondedInvitees: boolean; chooseRSVPDeclinedInvitees: boolean }

export const POLICY_FLAGS: Record<CheckInPolicy, PolicyFlags> = {
  ACCEPTED_ONLY: { allowAllInvited: false, allowNotResponded: false, allowDeclined: false },
  ACCEPTED_AND_NOT_RESPONDED: { allowAllInvited: false, allowNotResponded: true, allowDeclined: false },
  ALL_INVITED: { allowAllInvited: true, allowNotResponded: true, allowDeclined: false },
  EVERYONE: { allowAllInvited: true, allowNotResponded: true, allowDeclined: true },
};

export const POLICY_LABEL: Record<CheckInPolicy, string> = {
  ACCEPTED_ONLY: "Only guests who accepted",
  ACCEPTED_AND_NOT_RESPONDED: "Guests who accepted or have not responded",
  ALL_INVITED: "All invited guests (except those who declined)",
  EVERYONE: "Everyone invited, including those who declined",
};

/** The choices the platform settings allow. "Only guests who accepted" is always available. */
export function policyOptions(f: PolicyFeatures): CheckInPolicy[] {
  const out: CheckInPolicy[] = ["ACCEPTED_ONLY"];
  if (f.chooseNotRespondedInvitees) out.push("ACCEPTED_AND_NOT_RESPONDED");
  if (f.acceptInvitedAttendees) out.push("ALL_INVITED");
  if (f.acceptInvitedAttendees && f.chooseRSVPDeclinedInvitees) out.push("EVERYONE");
  return out;
}

/** Which choice the saved flags correspond to (older events with other combinations fall to the closest one that is no more permissive). */
export function policyOf(flags: PolicyFlags): CheckInPolicy {
  if (flags.allowDeclined && flags.allowAllInvited) return "EVERYONE";
  if (flags.allowAllInvited) return "ALL_INVITED";
  if (flags.allowNotResponded) return "ACCEPTED_AND_NOT_RESPONDED";
  return "ACCEPTED_ONLY";
}
