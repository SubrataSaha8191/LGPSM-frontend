"use client";

import React, { useState } from "react";

/** The GST (%) added to every invitation bill. A new value applies to bills made from now on. */
export default function GstCard({ current, saving, onSave }: { current: number; saving?: boolean; onSave: (gst: number) => void }) {
  const [text, setText] = useState(String(current));
  const value = Number(text);
  const valid = text.trim() !== "" && Number.isFinite(value) && value >= 0 && value <= 50;

  return (
    <div className="bg-white rounded-lg border border-[#E0E0E0] p-6 space-y-4">
      <div>
        <h2 className="text-xl font-medium text-[#15191C]">GST</h2>
        <p className="text-xs text-[#4B4F52] mt-0.5">Added on top of the per-head charge in the bill organisers see when they send invitations. Currently {current}%.</p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="gst-percent" className="block text-xs font-medium tracking-wide text-[#4B4F52] uppercase mb-2">GST percentage</label>
          <div className="flex items-center h-[47px] w-[160px] bg-[#FAFAFA] border border-[#E0E0E0] rounded-md focus-within:border-[#1F65FF]">
            <input id="gst-percent" type="number" inputMode="decimal" min={0} max={50} step="0.01" value={text} onChange={(e) => setText(e.target.value)} className="w-full h-full bg-transparent px-3 text-sm font-medium text-[#15191C] outline-none" />
            <span className="pr-3 text-sm font-medium text-[#6B6B6B]">%</span>
          </div>
        </div>
        <button type="button" onClick={() => onSave(value)} disabled={saving || !valid || value === current} className="disabled:opacity-50 disabled:cursor-not-allowed h-[47px] px-5 bg-[#1F65FF] text-white text-sm font-semibold rounded-md hover:bg-[#1A56DB] cursor-pointer">
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      {!valid && text.trim() !== "" && <p role="alert" className="text-xs text-[#D92D20]">Enter a percentage from 0 to 50.</p>}
    </div>
  );
}
