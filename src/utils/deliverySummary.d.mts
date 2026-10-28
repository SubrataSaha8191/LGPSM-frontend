export interface DeliveryOutcome {
  status: string;
  failureReason?: string;
  emailStatus?: string;
  whatsappStatus?: string;
}
export function summarizeDelivery(
  results: DeliveryOutcome[],
  verb: string,
  channel: "EMAIL" | "WHATSAPP" | "BOTH"
): { type: "success" | "error" | "info"; message: string; details?: string[] };
