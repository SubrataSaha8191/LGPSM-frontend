"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CancellationNotices, eventService } from "@/services/eventService";
import { channelLine, needsAttention } from "@/utils/cancellationSummary";

/** What happened to the "event cancelled" messages for a cancelled event: counts per channel, the ones that did not go, and a retry. */
export default function CancellationNoticesPanel({ eventId }: { eventId: string }) {
  const [data, setData] = useState<CancellationNotices | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await eventService.getCancellationNotices(eventId);
      if (res.success && res.data) { setData(res.data); setError(null); } else setError(res.message || "Could not load the cancellation notices.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the cancellation notices.");
    }
  }, [eventId]);

  useEffect(() => {
    void Promise.resolve().then(load);
    // messages are sent a moment after cancelling: look again while any are still waiting
    const timer = setInterval(() => { if (data && data.channels.email.PENDING + data.channels.email.SENDING + data.channels.whatsapp.PENDING + data.channels.whatsapp.SENDING > 0) load(); }, 4000);
    return () => clearInterval(timer);
  }, [load, data]);

  const retry = async () => {
    setRetrying(true);
    try {
      const res = await eventService.retryCancellationNotices(eventId);
      if (res.success && res.data) setData(res.data); else setError(res.message || "Retry failed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed.");
    }
    setRetrying(false);
  };

  return (
    <section aria-labelledby="cancel-notices-title" className="border border-[#E0E0E0] rounded-lg p-5 space-y-3 bg-white">
      <h3 id="cancel-notices-title" className="text-base font-medium text-gray-900">Cancellation notices</h3>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      {!data && !error && <p className="text-sm text-[#828282]">Loading…</p>}
      {data && (
        <>
          {data.guests === 0 ? (
            <p className="text-sm text-[#4B4F52]">No guests had been sent an invitation, so no notices were needed.</p>
          ) : (
            <ul className="text-sm text-[#4B4F52] space-y-1">
              <li>{data.guests} {data.guests === 1 ? "guest" : "guests"} to notify</li>
              {[channelLine("Email", data.channels.email), channelLine("WhatsApp", data.channels.whatsapp)].filter(Boolean).map((l) => <li key={l}>{l}</li>)}
            </ul>
          )}
          {data.problems.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 space-y-1">
              <p className="font-medium">Not sent</p>
              <ul className="space-y-0.5">
                {data.problems.map((p) => (
                  <li key={`${p.inviteeId}-${p.channel}`} className="break-words">{p.name || "Guest"} — {p.channel === "email" ? "email" : "WhatsApp"}: {p.reason || (p.status === "FAILED" ? "failed" : "unavailable")}</li>
                ))}
              </ul>
            </div>
          )}
          {needsAttention(data) && (
            <button type="button" onClick={retry} disabled={retrying} className="px-4 py-2 border border-[#FF651D] text-[#FF651D] hover:bg-[#FFF3EC] rounded-md text-sm font-medium cursor-pointer disabled:opacity-50">
              {retrying ? "Retrying…" : "Retry unsent notices"}
            </button>
          )}
          <p className="text-xs text-[#828282]">“Accepted by the provider” means the email or WhatsApp service took the message; delivery to the guest is not confirmed. Messages already accepted are never sent again.</p>
        </>
      )}
    </section>
  );
}
