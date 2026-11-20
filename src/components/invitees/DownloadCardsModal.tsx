"use client";

import React, { useEffect, useState } from "react";
import Icon from "@/components/icons/Icon";
import { cardDownloadService, type CardPlan } from "@/services/cardDownloadService";

interface DownloadCardsModalProps {
  eventId: string;
  eventTitle: string;
  /** the ticked guests: cards are made for these and nobody else */
  inviteeIds: string[];
  onClose: () => void;
}

const btn = "px-6 py-[11px] rounded-lg text-base font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed";

/**
 * Printable cards for the ticked guests. The system decides the split: zips of at most 100 guests, filled evenly, so a large selection
 * is a few zips and never a flood of small ones. They download one after another.
 */
export default function DownloadCardsModal({ eventId, eventTitle, inviteeIds, onClose }: DownloadCardsModalProps) {
  const [plan, setPlan] = useState<CardPlan | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [state, setState] = useState<{ running: boolean; part: number; done: number; error: string | null; finished: boolean }>({ running: false, part: 0, done: 0, error: null, finished: false });

  useEffect(() => {
    let live = true;
    cardDownloadService.plan(eventId, inviteeIds).then((r) => {
      if (!live) return;
      if (r.success && r.data) setPlan(r.data); else setPlanError(r.message || "The cards could not be planned.");
    });
    return () => { live = false; };
    // the selection is fixed while this window is open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !state.running) onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, state.running]);

  const start = async () => {
    if (!plan) return;
    setState({ running: true, part: 1, done: 0, error: null, finished: false });
    try {
      for (let part = 1; part <= plan.zips; part++) {
        setState((s) => ({ ...s, part }));
        await cardDownloadService.downloadPart(eventId, plan.planId, part);
        setState((s) => ({ ...s, done: part }));
      }
      setState((s) => ({ ...s, running: false, finished: true }));
    } catch (e) {
      setState((s) => ({ ...s, running: false, error: e instanceof Error ? e.message : "The cards could not be produced." }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="download-cards-title">
      <div className="w-full max-w-[460px] bg-white border border-[#E5E5E5] rounded-lg overflow-y-auto max-h-[calc(100dvh-2rem)]">
        <div className="flex items-end gap-5 px-6 py-5 border-b border-[#E0E0E0]">
          <h2 id="download-cards-title" className="flex-1 min-w-0 text-base font-medium text-[#15191C] break-words">Download Cards for {eventTitle}</h2>
          <button type="button" onClick={onClose} disabled={state.running} aria-label="Close" className="shrink-0 cursor-pointer disabled:opacity-40"><Icon name="events/close" width={16} height={16} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-[#4B4F52]">
            Cards for the {inviteeIds.length} guest{inviteeIds.length === 1 ? "" : "s"} you ticked. Each zip has one print-ready PDF per guest, with their own details and entry QR code. Large selections are split into zips of at most 100 guests.
          </p>
          <div className="rounded-md bg-[#F5F8FF] border border-[#D6E4FF] px-4 py-3 text-sm text-[#15191C]" aria-live="polite">
            {planError ? <span className="text-[#D92D20]">{planError}</span>
              : plan ? <><b>{plan.total}</b> guest{plan.total === 1 ? "" : "s"} → <b>{plan.zips}</b> zip file{plan.zips === 1 ? "" : "s"}{plan.zips > 1 ? ` (about ${plan.sizes[0]} guests each)` : ""}</>
              : "Working out the zips…"}
          </div>
          {state.running && <p className="text-sm text-[#1F65FF] font-medium" role="status">Preparing zip {state.part} of {plan?.zips}… keep this window open.</p>}
          {state.finished && <p className="text-sm text-[#15803D] font-medium" role="status">Done: {plan?.zips} zip file{plan?.zips === 1 ? "" : "s"} downloaded. They are in your browser&apos;s download folder.</p>}
          {state.error && <p role="alert" className="text-sm text-[#D92D20]">{state.error}{state.done > 0 ? ` (${state.done} zip${state.done === 1 ? "" : "s"} already downloaded.)` : ""}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-[#E5E5E5]">
          <button type="button" onClick={onClose} disabled={state.running} className={`${btn} bg-white border border-[#DDD] text-black`}>{state.finished ? "Close" : "Cancel"}</button>
          {!state.finished && (
            <button type="button" onClick={start} disabled={state.running || !plan}
              style={{ backgroundImage: "linear-gradient(180deg, #1F65FF 0%, #2071FF 33%, #2181FF 69%, #1F65FF 100%)" }} className={`${btn} text-white hover:brightness-95`}>
              {state.running ? "Preparing…" : "Download"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
