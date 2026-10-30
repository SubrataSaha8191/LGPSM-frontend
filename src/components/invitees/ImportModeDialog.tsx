"use client";

import React from "react";
import type { ImportMode } from "@/services/inviteeService";

interface Props {
  fileName: string;
  rowCount: number;
  /** Lists an invitation has already been dispatched from; null while it is being looked up */
  sentSets: number | null;
  busy?: boolean;
  onCancel: () => void;
  onChoose: (mode: ImportMode) => void;
}

export const SENT_SETS_NOTICE = "Previously sent invitation sets will be preserved. Only unsent invitees will be replaced.";

// Asked when an event already has invitees: add the new file to the list, or replace the not-yet-invited part of it.
export default function ImportModeDialog({ fileName, rowCount, sentSets, busy, onCancel, onChoose }: Props) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="import-mode-title">
      <div className="bg-white rounded-lg max-w-lg w-full p-6 shadow-2xl space-y-4">
        <div>
          <h2 id="import-mode-title" className="text-lg font-semibold text-[#15191C]">How should this list be imported?</h2>
          <p className="text-sm text-[#828282] mt-1 break-words">{fileName} · {rowCount} row{rowCount === 1 ? "" : "s"}</p>
        </div>

        {sentSets !== null && sentSets > 0 && (
          <p role="note" className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{SENT_SETS_NOTICE}</p>
        )}

        <div className="space-y-3">
          <button type="button" disabled={busy} onClick={() => onChoose("APPEND")} className="w-full text-left rounded-lg border border-[#E0E0E0] hover:border-[#FF651D] px-4 py-3 cursor-pointer disabled:opacity-60">
            <span className="block text-sm font-semibold text-[#15191C]">Add to existing invitees</span>
            <span className="block text-xs text-[#828282] mt-0.5">Everyone already on the list stays. Only people who are not already invited are added; duplicates are skipped.</span>
          </button>
          <button type="button" disabled={busy} onClick={() => onChoose("REPLACE")} className="w-full text-left rounded-lg border border-[#E0E0E0] hover:border-[#FF651D] px-4 py-3 cursor-pointer disabled:opacity-60">
            <span className="block text-sm font-semibold text-[#15191C]">Replace the not-yet-invited list</span>
            <span className="block text-xs text-[#828282] mt-0.5">
              Invitees who have never been invited and are not in this file are set aside (kept, not deleted, and restorable from Invitee Lists). Guests with a failed or unresolved send are always kept. {sentSets ? "Lists you have already sent from are left as they are." : "Anyone already invited is never removed."}
            </span>
          </button>
        </div>

        <div className="flex justify-end">
          <button type="button" onClick={onCancel} disabled={busy} className="px-4 py-2 border border-[#E0E0E0] rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}
