// The invitee fields an event collects, in one place: the Excel sample's columns, the Excel preview, and the manual Add
// Invitee form are all built from this list, so they can never drift apart.

export type InviteeFieldKey = "name" | "email" | "mobile" | "company" | "identity" | "dietary";

export interface InviteeFieldConfig {
  /** The event shows a company (corporate events, or company chosen for the invitation card) */
  company?: boolean;
  /** Professional identity chosen for the invitation card */
  identity?: boolean;
  /** The event asks guests for a food preference */
  dietary?: boolean;
}

/** Excel column heading for each field (the backend import recognises these) */
export const EXCEL_HEADER: Record<InviteeFieldKey, string> = {
  name: "Name",
  email: "Email",
  mobile: "Mobile",
  company: "Company Name",
  identity: "Professional Identity",
  dietary: "Dietary Preference",
};

export const EXCEL_EXAMPLE: Record<InviteeFieldKey, string> = {
  name: "Guest Name",
  email: "guest@example.com",
  mobile: "+919876543210",
  company: "Company",
  identity: "Employee ID: 4521",
  dietary: "Veg",
};

interface CardInfoLike { primary?: string | null; secondary?: string | null }

export function inviteeConfigFor(opts: { cardInfo?: CardInfoLike | null; dietaryEnabled?: boolean; corporate?: boolean }): InviteeFieldConfig {
  const chosen = [opts.cardInfo?.primary, opts.cardInfo?.secondary];
  return {
    company: Boolean(opts.corporate) || chosen.includes("COMPANY_NAME"),
    identity: chosen.includes("PROFESSIONAL_IDENTITY"),
    dietary: Boolean(opts.dietaryEnabled),
  };
}

export function inviteeFieldsFor(config: InviteeFieldConfig): InviteeFieldKey[] {
  return [
    "name", "email", "mobile",
    ...(config.company ? (["company"] as const) : []),
    ...(config.identity ? (["identity"] as const) : []),
    ...(config.dietary ? (["dietary"] as const) : []),
  ];
}

export const excelColumnsFor = (config: InviteeFieldConfig): string[] => inviteeFieldsFor(config).map((k) => EXCEL_HEADER[k]);

/** One example row for the Excel sample: a cell for every column, in the same order */
export function templateRow(config: InviteeFieldConfig = {}): Record<string, string> {
  return Object.fromEntries(inviteeFieldsFor(config).map((k) => [EXCEL_HEADER[k], EXCEL_EXAMPLE[k]]));
}
