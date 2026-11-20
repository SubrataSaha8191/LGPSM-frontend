import { apiClient, API_BASE_URL } from "./apiClient";
import { tokenStorage } from "./tokenStorage";

export const MAX_PER_ZIP = 100;
export interface CardPlan { total: number; perZip: number; zips: number }

export const cardDownloadService = {
  /** How many guests the cards are for and how many zip files that makes */
  plan: (eventId: string, perZip: number, inviteeIds?: string[]) =>
    apiClient<CardPlan>(`/api/v1/events/${eventId}/invitation-cards/plan`, { method: "POST", body: JSON.stringify({ perZip, inviteeIds }) }, true),

  /** One zip (part n of the guests) of printable PDFs, one per guest; saved through the browser's normal download */
  async downloadPart(eventId: string, perZip: number, part: number, inviteeIds?: string[]): Promise<void> {
    const token = tokenStorage.getAccessToken();
    const res = await fetch(`${API_BASE_URL}/api/v1/events/${eventId}/invitation-cards/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ perZip, part, inviteeIds }),
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
