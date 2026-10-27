const emailKey = (value) => String(value || "").trim().toLowerCase();
const phoneKey = (value) => String(value || "").replace(/\D/g, "");
const validIdentity = (row) => emailKey(row.email) || phoneKey(row.phone);

// The existing import endpoint replaces the staged list. Build a merged sheet in the browser
// so reuploads are incremental while retaining session access on existing pending invitees.
export function mergeInviteeImport(uploadedRows, existingInvitees, sessionNames) {
  const staged = existingInvitees.filter((invitee) => invitee.invitationStatus === "PENDING" && invitee.rsvpStatus === "PENDING");
  const existingByEmail = new Map(staged.filter((i) => emailKey(i.email)).map((i) => [emailKey(i.email), i]));
  const existingByPhone = new Map(staged.filter((i) => phoneKey(i.mobile)).map((i) => [phoneKey(i.mobile), i]));
  const seenEmails = new Map();
  const seenPhones = new Map();
  const newRows = [];
  let duplicateInUpload = 0;
  let conflicts = 0;
  let matchedExisting = 0;

  for (const row of uploadedRows) {
    const email = emailKey(row.email);
    const phone = phoneKey(row.phone);
    if (!email && !phone) {
      newRows.push(row); // Keep invalid rows visible to the API's row-level validation.
      continue;
    }

    const existingEmailMatch = email ? existingByEmail.get(email) : undefined;
    const existingPhoneMatch = phone ? existingByPhone.get(phone) : undefined;
    if (existingEmailMatch && existingPhoneMatch && String(existingEmailMatch._id) !== String(existingPhoneMatch._id)) {
      conflicts++;
      continue;
    }
    const existingMatch = existingEmailMatch || existingPhoneMatch;
    if (existingMatch) {
      const conflictingIdentifier = (email && emailKey(existingMatch.email) && email !== emailKey(existingMatch.email)) ||
        (phone && phoneKey(existingMatch.mobile) && phone !== phoneKey(existingMatch.mobile));
      if (conflictingIdentifier) conflicts++;
      // This event-scoped contact already exists; keep its stored fields and session access intact.
      matchedExisting++;
      continue;
    }

    const emailMatch = email ? seenEmails.get(email) : undefined;
    const phoneMatch = phone ? seenPhones.get(phone) : undefined;
    const byEmail = !!emailMatch;
    const byPhone = !!phoneMatch;
    if (byEmail || byPhone) {
      const conflict = (emailMatch && phone && phoneKey(emailMatch.phone) && phoneKey(emailMatch.phone) !== phone) ||
        (phoneMatch && email && emailKey(phoneMatch.email) && emailKey(phoneMatch.email) !== email);
      if (conflict) conflicts++;
      else duplicateInUpload++;
      continue;
    }
    if (email) seenEmails.set(email, row);
    if (phone) seenPhones.set(phone, row);
    newRows.push(row);
  }

  const preserved = staged.map((invitee, index) => {
    const sessions = Object.fromEntries(sessionNames.map((name) => {
      const target = invitee.sessionAccess?.find((item) => String(item.sessionId?._id || item.sessionId) === name.id);
      return [name.name, !target || target.allowed !== false];
    }));
    return {
      id: `existing-${invitee._id || index}`,
      name: invitee.name || "",
      email: emailKey(invitee.email),
      phone: invitee.mobile || "",
      company: invitee.companyName || invitee.company || "",
      sessions,
    };
  });

  return {
    rows: [...preserved, ...newRows],
    added: newRows.filter((row) => validIdentity(row)).length,
    retained: staged.length,
    duplicateInUpload,
    conflicts,
    matchedExisting,
    invalidRows: uploadedRows.filter((row) => !String(row.name || "").trim() || (!emailKey(row.email) && !phoneKey(row.phone))).length,
  };
}
