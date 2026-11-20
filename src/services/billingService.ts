import { apiClient } from "./apiClient";
import type { Invoice } from "@/components/billing/billingStatement";

export interface EventBill {
  eventId: string;
  eventName: string;
  eventStart?: string;
  invitesSent: number;
  ratePerInvitee: number | null;
  billed: number;
  paid: number;
  due: number;
  dueInvitees: number;
  dueSubtotal?: number;
  dueTax?: number;
  gstPercent?: number;
  currency: string;
}
export interface BillQuote { invitees: number; rate: number | null; subtotal: number; gstPercent: number; tax: number; total: number; currency: string; selected: number; alreadyPaid: number; payable: boolean }
export interface EventBills { currency: string; totalDue: number; totalPaid: number; events: EventBill[] }
export interface PaymentStart { keyId: string; providerOrderId: string; amount: number; currency: string; eventId: string; eventName: string; invitees: number; subtotal: number; tax: number; total: number; gstPercent: number }

export const billingService = {
  getEventBills: () => apiClient<EventBills>("/api/v1/billing/events", { method: "GET" }, true),
  /** The bill for sending to these guests (invitations x rate, GST, total); creates nothing */
  quote: (eventId: string, inviteeIds: string[]) => apiClient<BillQuote>("/api/v1/billing/quote", { method: "POST", body: JSON.stringify({ eventId, inviteeIds }) }, true),
  /** Starts the Razorpay payment: for these guests when given, otherwise for what is due on invitations already sent */
  startPayment: (eventId: string, inviteeIds?: string[]) => apiClient<PaymentStart>("/api/v1/billing/pay", { method: "POST", body: JSON.stringify({ eventId, inviteeIds }) }, true),
  confirmPayment: (p: { providerOrderId: string; providerPaymentId: string; signature: string }) =>
    apiClient<unknown>("/api/v1/payments/verify", { method: "POST", body: JSON.stringify(p) }, true),
  getInvoices: () => apiClient<Invoice[]>("/api/v1/billing/invoices", { method: "GET" }, true),
};
