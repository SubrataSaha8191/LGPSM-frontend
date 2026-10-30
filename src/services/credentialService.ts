import { apiClient, ApiResponse } from "./apiClient";

// Individual access passes (revoke / replace / history). The server decides who may do what; see utils/credentialUi.ts for wording.

export type ReasonCategory = "LOST_OR_COMPROMISED" | "FORWARDED_OR_SHARED" | "DUPLICATE_OR_INCORRECT" | "ACCESS_WITHDRAWN" | "ATTENDEE_REQUESTED_REPLACEMENT" | "OTHER";
export type CredentialStatus = "NOT_ISSUED" | "ACTIVE" | "REVOKED" | "EXPIRED";

export interface NoticeChannelState { status: "NOT_USED" | "PENDING" | "SENDING" | "SENT" | "FAILED" | "UNAVAILABLE" | "UNKNOWN"; failureReason?: string; attempts?: number }

export interface CredentialHistoryRow {
  _id: string;
  inviteeId: string;
  inviteeName: string;
  /** EXPIRED rows are derived from the event's own state (nothing is stored for them) */
  type: "ISSUED" | "ACTIVATED" | "REPLACED" | "REVOKED" | "EXPIRED";
  version: number;
  previousVersion?: number;
  /** The pass this row is about, and for a replacement the one it replaced (ids only, never the secret) */
  credentialId?: string;
  previousCredentialId?: string;
  result?: "SUCCESS";
  derived?: boolean;
  source: "SEND" | "RESEND" | "REPLACE" | "REVOKE" | "EVENT";
  reasonCategory?: ReasonCategory | "EVENT_CANCELLED" | "EVENT_COMPLETED" | "ADMISSION_CLOSED";
  note?: string;
  reviewConfirmed?: boolean;
  actor?: string;
  at: string;
  notice?: { kind: "REPLACED" | "REVOKED"; email: NoticeChannelState; whatsapp: NoticeChannelState };
}

export interface PassActionBody { category: ReasonCategory; note?: string; reviewConfirmed?: boolean }

export const credentialService = {
  revoke(inviteeId: string, body: PassActionBody): Promise<ApiResponse<{ credentialStatus: CredentialStatus; alreadyRevoked?: boolean }>> {
    return apiClient(`/api/v1/invitees/${inviteeId}/revoke`, { method: "POST", body: JSON.stringify({ category: body.category, note: body.note }) }, true);
  },
  replace(inviteeId: string, body: PassActionBody): Promise<ApiResponse<{ credentialStatus: CredentialStatus; version: number }>> {
    return apiClient(`/api/v1/invitees/${inviteeId}/replace`, { method: "POST", body: JSON.stringify(body) }, true);
  },
  history(eventId: string, inviteeId?: string): Promise<ApiResponse<CredentialHistoryRow[]>> {
    return apiClient(`/api/v1/events/${eventId}/invitees/credential-events${inviteeId ? `?inviteeId=${inviteeId}` : ""}`, { method: "GET" }, true);
  },
  /** includeUnknown also retries messages whose earlier attempt may already have gone out (a duplicate is possible): explicit opt-in */
  retryNotices(eventId: string, opts: { inviteeId?: string; includeUnknown?: boolean } = {}): Promise<ApiResponse<unknown>> {
    return apiClient(`/api/v1/events/${eventId}/invitees/pass-notices/retry`, { method: "POST", body: JSON.stringify(opts) }, true);
  },
};
