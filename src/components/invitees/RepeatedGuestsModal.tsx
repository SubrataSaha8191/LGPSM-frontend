"use client";

import React, { useEffect } from "react";
import Icon from "@/components/icons/Icon";
import type { RepeatedGuest } from "@/utils/repeatedGuests";

/**
 * Shown before an upload when the same email or mobile number appears more than once in the file. If a repeat is a mistake the guest would be
 * checked in as someone else; the organizer either fixes the Excel and uploads again, or confirms (the first row of each guest is kept and the
 * repeats are skipped).
 */
export default function RepeatedGuestsModal({ repeats, onFix, onConfirm }: { repeats: RepeatedGuest[] | null; onFix: () => void; onConfirm: () => void }) {
  useEffect(() => {
    if (!repeats) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onFix(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [repeats, onFix]);
  if (!repeats) return null;
  const shown = repeats.slice(0, 8);
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="repeats-title">
      <div className="w-full max-w-[520px] bg-white border border-[#E5E5E5] rounded-lg overflow-hidden">
        <div className="flex items-end gap-5 px-6 py-5 border-b border-[#E0E0E0]">
          <h2 id="repeats-title" className="flex-1 text-base font-medium text-[#15191C]">Same email or mobile number found more than once</h2>
          <button type="button" onClick={onFix} aria-label="Close" className="shrink-0 cursor-pointer"><Icon name="events/close" width={16} height={16} /></button>
        </div>
        <div className="flex flex-col gap-4 px-6 py-6">
          <p className="text-sm text-[#15191C]/80">
            <b>{repeats.length}</b> {repeats.length === 1 ? "row uses" : "rows use"} an email or mobile number that is already in this file. If this is a mistake, a guest may be checked in under someone else&apos;s details.
          </p>
          <ul className="max-h-[200px] overflow-auto border border-[#E5E5E5] rounded-lg divide-y divide-[#EEE] text-sm">
            {shown.map((r) => (
              <li key={r.row} className="px-3 py-2 flex flex-wrap gap-x-2">
                <span className="font-medium text-[#15191C]">Row {r.row}: {r.name}</span>
                <span className="text-[#6B6B6B] break-all">{r.value} (first used in row {r.firstRow})</span>
              </li>
            ))}
            {repeats.length > shown.length ? <li className="px-3 py-2 text-[#6B6B6B]">and {repeats.length - shown.length} more</li> : null}
          </ul>
          <p className="text-sm text-[#15191C]/80">Choose <b>Confirm</b> to continue: the first row of each guest is kept and the repeated rows are skipped. Or fix the Excel and upload it again.</p>
        </div>
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[#E5E5E5]">
          <button type="button" onClick={onFix} className="px-6 py-[11px] bg-white border border-[#DDD] rounded-lg text-base font-semibold text-black cursor-pointer">Fix the Excel</button>
          <button type="button" onClick={onConfirm} style={{ backgroundImage: "linear-gradient(180deg, #1F65FF 0%, #2071FF 33%, #2181FF 69%, #1F65FF 100%)" }} className="px-6 py-[11px] rounded-lg text-base font-semibold text-white cursor-pointer hover:brightness-95">Confirm</button>
        </div>
      </div>
    </div>
  );
}
