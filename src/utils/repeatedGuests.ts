// Guests who appear more than once in the same Excel file (the same email or the same mobile number). The import keeps the first row and skips
// the repeats, so the organizer is told before anything is uploaded and can fix the file or go on.

export interface RepeatedGuest {
  /** row number in the sheet of the repeat */
  row: string;
  name: string;
  /** what repeats: the email, the mobile, or both */
  value: string;
  /** row number of the first time the guest appears */
  firstRow: string;
}

const mobileKey = (v: string) => v.replace(/\D/g, "").slice(-10);

export function findRepeatedGuests(rows: { id: string; name: string; email: string; phone: string }[]): RepeatedGuest[] {
  const emails = new Map<string, string>();
  const mobiles = new Map<string, string>();
  const out: RepeatedGuest[] = [];
  for (const r of rows) {
    const email = (r.email || "").trim().toLowerCase();
    const mob = mobileKey(r.phone || "");
    const byEmail = email ? emails.get(email) : undefined;
    const byMobile = mob.length >= 7 ? mobiles.get(mob) : undefined;
    if (byEmail || byMobile) {
      const both = byEmail && byMobile;
      out.push({ row: r.id, name: r.name, value: both ? `${email} · ${r.phone}` : byEmail ? email : r.phone, firstRow: (byEmail || byMobile)! });
      continue; // a skipped repeat does not register again
    }
    if (email) emails.set(email, r.id);
    if (mob.length >= 7) mobiles.set(mob, r.id);
  }
  return out;
}
