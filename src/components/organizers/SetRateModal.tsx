"use client";

import React, { useEffect, useState } from "react";
import Icon from "@/components/icons/Icon";
import { userService, type OrganizerRate } from "@/services/userService";
import { formatMoney } from "@/utils/money";

/** Admin: a per-invitee rate for one organizer. Without one, the platform rate (Settings, Price Rate) applies to them. */
export default function SetRateModal({ organizerId, organizerName, onClose, onSaved }: { organizerId: string; organizerName: string; onClose: () => void; onSaved?: (r: OrganizerRate) => void }) {
  const [rate, setRate] = useState<OrganizerRate | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    userService.getOrganizerRate(organizerId).then((r) => {
      if (!live) return;
      if (r.success && r.data) { setRate(r.data); setText(r.data.customRate !== null ? String(r.data.customRate) : ""); }
      else setError(r.message || "The rate could not be loaded.");
    });
    return () => { live = false; };
  }, [organizerId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const value = Number(text);
  const valid = text.trim() !== "" && Number.isFinite(value) && value >= 0 && value <= 1000;

  const save = async (next: number | null) => {
    setBusy(true); setError(null); setDone(null);
    const r = await userService.setOrganizerRate(organizerId, next);
    setBusy(false);
    if (r.success && r.data) {
      setRate(r.data); setText(r.data.customRate !== null ? String(r.data.customRate) : "");
      setDone(next === null ? "This organizer now uses the platform rate." : `${organizerName} is now charged ${formatMoney(next)} per invitee.`);
      onSaved?.(r.data);
    } else setError(r.message || "The rate could not be saved, so it is unchanged.");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="set-rate-title">
      <div className="w-full max-w-[440px] bg-white border border-[#E5E5E5] rounded-lg overflow-y-auto max-h-[calc(100dvh-2rem)]">
        <div className="flex items-end gap-5 px-6 py-5 border-b border-[#E0E0E0]">
          <h2 id="set-rate-title" className="flex-1 min-w-0 text-base font-medium text-[#15191C] break-words">Set Rate for {organizerName}</h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="shrink-0 cursor-pointer disabled:opacity-40"><Icon name="events/close" width={16} height={16} /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-[#4B4F52]">
            Every organizer is charged the platform rate{rate ? <> (<b>{rate.defaultRate !== null ? `${formatMoney(rate.defaultRate)} per invitee` : "not set yet"}</b>)</> : ""} unless you give them a rate of their own. A rate set here applies to this organizer&apos;s invitation bills from now on.
          </p>
          <div>
            <label htmlFor="org-rate" className="block text-xs font-medium text-[#15191C] mb-2">Rate per invitee (₹)<span className="text-[#D92D20]">*</span></label>
            <input id="org-rate" type="number" inputMode="decimal" min={0} max={1000} step="0.01" value={text} disabled={busy || !rate} placeholder={rate?.defaultRate !== null && rate ? String(rate.defaultRate) : "e.g. 3"} onChange={(e) => { setText(e.target.value); setDone(null); }}
              className="w-full h-[47px] px-3 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-sm font-medium text-[#15191C] focus:outline-none focus:border-[#1F65FF]" />
            {text.trim() !== "" && !valid && <p role="alert" className="mt-1.5 text-xs text-[#D92D20]">Enter an amount from 0 to 1000.</p>}
          </div>
          {rate?.customRate !== null && rate && (
            <button type="button" onClick={() => save(null)} disabled={busy} className="text-xs text-[#1F65FF] underline cursor-pointer disabled:opacity-50">Remove this organizer&apos;s own rate (use the platform rate)</button>
          )}
          {done && <p role="status" className="text-sm font-medium text-[#15803D]">{done}</p>}
          {error && <p role="alert" className="text-sm text-[#D92D20]">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[#E5E5E5]">
          <button type="button" onClick={onClose} disabled={busy} className="px-6 py-[11px] bg-white border border-[#DDD] rounded-lg text-base font-semibold text-black cursor-pointer disabled:opacity-50">{done ? "Close" : "Cancel"}</button>
          <button type="button" onClick={() => save(value)} disabled={busy || !valid || !rate || value === rate.customRate}
            style={{ backgroundImage: "linear-gradient(180deg, #1F65FF 0%, #2071FF 33%, #2181FF 69%, #1F65FF 100%)" }} className="px-6 py-[11px] rounded-lg text-base font-semibold text-white cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:brightness-95">
            {busy ? "Saving…" : "Save Rate"}
          </button>
        </div>
      </div>
    </div>
  );
}
