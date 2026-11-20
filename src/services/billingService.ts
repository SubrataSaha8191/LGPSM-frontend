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
  currency: string;
}
export interface EventBills { currency: string; totalDue: number; totalPaid: number; events: EventBill[] }
export interface PaymentStart { keyId: string; providerOrderId: string; amount: number; currency: string; eventId: string; eventName: string; invitees: number }

export const billingService = {
  getEventBills: () => apiClient<EventBills>("/api/v1/billing/events", { method: "GET" }, true),
  startPayment: (eventId: string) => apiClient<PaymentStart>("/api/v1/billing/pay", { method: "POST", body: JSON.stringify({ eventId }) }, true),
  confirmPayment: (p: { providerOrderId: string; providerPaymentId: string; signature: string }) =>
    apiClient<unknown>("/api/v1/payments/verify", { method: "POST", body: JSON.stringify(p) }, true),
  getInvoices: () => apiClient<Invoice[]>("/api/v1/billing/invoices", { method: "GET" }, true),
};
