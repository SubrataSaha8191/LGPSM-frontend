export function mergeInviteeImport(
  uploadedRows: Array<{ id: string; name: string; email: string; phone: string; company: string; sessions?: Record<string, boolean> }>,
  existingInvitees: Array<{ _id: string; name: string; email?: string; mobile?: string; companyName?: string; company?: string; invitationStatus: string; rsvpStatus: string; sessionAccess?: Array<{ sessionId: string | { _id: string }; allowed?: boolean }> }>,
  sessionNames: Array<{ id: string; name: string }>
): { rows: Array<{ id: string; name: string; email: string; phone: string; company: string; sessions?: Record<string, boolean> }>; added: number; retained: number; duplicateInUpload: number; conflicts: number; matchedExisting: number; invalidRows: number };
