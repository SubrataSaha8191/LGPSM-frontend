import { apiClient, API_BASE_URL, type ApiResponse } from "./apiClient";

export interface CardPlan {
  planId: string; total: number; zips: number; sizes: number[];
  /** the smaller zips' names, when the file holds several */
  fileNames: string[];
  /** the ONE file the person downloads: "Event_Session.zip", or just "Event.zip" for all sessions */
  fileName: string;
  /** true when that file holds smaller zips (more than 100 guests); false when it holds the PDFs directly */
  nested: boolean;
}
export interface CardJobStatus { status: "RUNNING" | "DONE" | "FAILED"; total: number; zips: number; doneGuests: number; doneParts: number; fileName: string; nested: boolean; size?: number; error?: string }

export const cardDownloadService = {
  /** Keeps the chosen guests and says how big the download is: the system splits them evenly into zips of at most 100 guests */
  plan: (eventId: string, inviteeIds: string[], sessionId?: string) =>
    apiClient<CardPlan>(`/api/v1/events/${eventId}/invitation-cards/plan`, { method: "POST", body: JSON.stringify({ inviteeIds, sessionId: sessionId || undefined }) }, true),

  /** Starts building the cards in the background (answers at once). A repeat while one runs returns that job (code JOB_ALREADY_RUNNING, jobId). */
  start: (eventId: string, planId: string) =>
    apiClient<{ jobId: string }>(`/api/v1/events/${eventId}/invitation-cards/jobs`, { method: "POST", body: JSON.stringify({ planId }) }, true) as Promise<ApiResponse<{ jobId: string }> & { jobId?: string }>,

  /** Progress; not served from the short read cache, it is asked for fresh every time */
  status: (eventId: string, jobId: string) =>
    apiClient<CardJobStatus>(`/api/v1/events/${eventId}/invitation-cards/jobs/${jobId}`, { method: "GET", cache: "no-store" }, true),

  /** When it is ready: starts the browser's own download of the single zip (it goes straight to disk, nothing is held in the page) */
  async download(eventId: string, jobId: string): Promise<{ ok: true } | { ok: false; message: string }> {
    const t = await apiClient<{ path: string }>(`/api/v1/events/${eventId}/invitation-cards/jobs/${jobId}/ticket`, { method: "POST" }, true);
    if (!t.success || !t.data) return { ok: false, message: t.message || "The download could not be started. Please try again." };
    const a = document.createElement("a");
    a.href = `${API_BASE_URL}${t.data.path}`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return { ok: true };
  },
};
