"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/icons/Icon";
import { MAX_UPLOAD_GUESTS } from "@/utils/uploadLimits";

/**
 * Shown when an Excel file holds more invitees than one upload allows. Nothing was uploaded; the way forward is to contact us, so the main
 * button goes to the Contact page.
 */
export default function UploadTooLargeModal({ count, onClose }: { count: number | null; onClose: () => void }) {
  const router = useRouter();
  useEffect(() => {
    if (count === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [count, onClose]);
  if (count === null) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="too-large-title">
      <div className="w-full max-w-[460px] bg-white border border-[#E5E5E5] rounded-lg overflow-hidden">
        <div className="flex items-end gap-5 px-6 py-5 border-b border-[#E0E0E0]">
          <h2 id="too-large-title" className="flex-1 text-base font-medium text-[#15191C]">Your list is larger than one upload allows</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 cursor-pointer"><Icon name="events/close" width={16} height={16} /></button>
        </div>
        <div className="flex flex-col items-center gap-4 px-6 py-8 text-center">
          <Icon name="events/warning" width={34} height={32} />
          <p className="text-sm text-[#15191C]/80 max-w-[360px]">
            One upload can hold up to <b>{MAX_UPLOAD_GUESTS.toLocaleString("en-IN")}</b> invitees, and your file has <b>{count.toLocaleString("en-IN")}</b>. For a bigger guest list, please contact us and we will help you set it up. Nothing has been uploaded.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 p-4 border-t border-[#E5E5E5]">
          <button type="button" onClick={onClose} className="px-6 py-[11px] bg-white border border-[#DDD] rounded-lg text-base font-semibold text-black cursor-pointer">Close</button>
          <button type="button" onClick={() => { onClose(); router.push("/contact"); }} style={{ backgroundImage: "linear-gradient(180deg, #1F65FF 0%, #2071FF 33%, #2181FF 69%, #1F65FF 100%)" }} className="px-6 py-[11px] rounded-lg text-base font-semibold text-white cursor-pointer hover:brightness-95">Contact us</button>
        </div>
      </div>
    </div>
  );
}
