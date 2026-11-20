import { apiClient, API_BASE_URL } from "./apiClient";
import { tokenStorage } from "./tokenStorage";

export interface CardPlan { planId: string; total: number; zips: number; sizes: number[] }

export const cardDownloadService = {
  /** Keeps the chosen guests and says how many zip files they make: the system splits them evenly, at most 100 guests per zip */
  plan: (eventId: string, inviteeIds: string[]) =>
    apiClient<CardPlan>(`/api/v1/events/${eventId}/invitation-cards/plan`, { method: "POST", body: JSON.stringify({ inviteeIds }) }, true),

  /** One zip (part n) of printable PDFs, one per guest; saved through the browser's normal download */
  async downloadPart(eventId: string, planId: string, part: number): Promise<void> {
    const token = tokenStorage.getAccessToken();
    const res = await fetch(`${API_BASE_URL}/api/v1/events/${eventId}/invitation-cards/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ planId, part }),
    });
    if (!res.ok) {
      let message = "The cards could not be produced. Please try again.";
      try { const body = await res.json(); if (body?.message) message = body.message; } catch { /* not JSON */ }
      throw new Error(message);
    }
    const blob = await res.blob();
    const name = /filename="?([^";]+)"?/i.exec(res.headers.get("Content-Disposition") || "")?.[1] || `invitation-cards-${part}.zip`;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },
};
