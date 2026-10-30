// Check-in ("admission") window of an event, as the organizer sees and edits it.
//
// The event's schedule says when it is held; the check-in window says when guests may be let in. Left empty, the window
// follows the schedule: it opens when the event starts and closes when it ends. The server checks the window on every
// scan with its own clock, so nothing here decides who gets in: this only helps the organizer set it up correctly.

export interface AdmissionFields {
  start: string;
  end: string;
  /** ISO instant, or null to open at the event start */
  opens: string | null;
  /** ISO instant, or null to close at the event end */
  closes: string | null;
}

export interface AdmissionErrors {
  admissionOpens?: string;
  admissionCloses?: string;
}

const time = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
};

/** The window that will apply, falling back to the schedule for any side left empty. */
export function effectiveAdmissionIso(f: AdmissionFields): { opensAt: string | null; closesAt: string | null; opensIsDefault: boolean; closesIsDefault: boolean } {
  return {
    opensAt: f.opens || f.start || null,
    closesAt: f.closes || f.end || null,
    opensIsDefault: !f.opens,
    closesIsDefault: !f.closes,
  };
}

export function validateAdmission(f: AdmissionFields): AdmissionErrors {
  const errors: AdmissionErrors = {};
  if (f.opens && time(f.opens) === null) errors.admissionOpens = "Choose a valid check-in opening time.";
  if (f.closes && time(f.closes) === null) errors.admissionCloses = "Choose a valid check-in closing time.";
  if (errors.admissionOpens || errors.admissionCloses) return errors;
  const opens = time(f.opens || f.start);
  const closes = time(f.closes || f.end);
  if (opens !== null && closes !== null && opens >= closes) {
    // point at the side the organizer actually typed in; if both are defaults the schedule's own error shows instead
    if (f.closes) errors.admissionCloses = "Check-in must close after it opens.";
    else if (f.opens) errors.admissionOpens = "Check-in must open before the event ends.";
  }
  return errors;
}

/** The request body for `PATCH /events/:id/admission` and the `admission` part of create/update. */
export function admissionPayload(f: Pick<AdmissionFields, "opens" | "closes">): { opensAt: string | null; closesAt: string | null } {
  return { opensAt: f.opens || null, closesAt: f.closes || null };
}

/** IANA zone of this browser, shown next to every time so organizers know what they are setting. */
export function browserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "your local time";
  } catch {
    return "your local time";
  }
}
