"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/icons/Icon";
import { formatMoney } from "@/utils/money";
import type { BillQuote } from "@/services/billingService";

interface SendBillModalProps {
  quote: BillQuote;
  /** the payment (Razorpay) is in progress */
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onFinish: () => void;
}

const rupees = (n: number) => formatMoney(n, { minFractionDigits: 0, maxFractionDigits: 2 });
const gstLabel = (p: number) => `${Number.isInteger(p) ? p : p.toFixed(2)}%`;

/**
 * The bill shown when invitations are sent (Figma 2001:2467 "Make Payment"): per-head price, how many invitees, the subtotal, GST and
 * the total. The figures come from the server (the admin's per-head rate and GST), so they follow whatever the admin sets.
 */
export default function SendBillModal({ quote, busy, error, onCancel, onFinish }: SendBillModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [showAgreeError, setShowAgreeError] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) onCancel(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, busy]);

  const finish = () => {
    if (!agreed) { setShowAgreeError(true); return; }
    onFinish();
  };

  const row = "flex items-center justify-between gap-2 py-3";
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="send-bill-title">
      <div className="w-full max-w-[400px] bg-white border border-[#E5E5E5] rounded-lg overflow-y-auto max-h-[calc(100dvh-2rem)]">
        <div className="flex items-end gap-5 px-6 py-5 border-b border-[#E0E0E0]">
          <h2 id="send-bill-title" className="flex-1 text-base font-medium text-[#15191C]">Make Payment</h2>
          <button type="button" onClick={onCancel} disabled={busy} aria-label="Close" className="shrink-0 cursor-pointer disabled:opacity-40">
            <Icon name="events/close" width={16} height={16} />
          </button>
        </div>

        <div className="px-[26px] pt-1 pb-4">
          <p className="py-4 text-base font-medium text-[#15191C] border-b border-[#EAEAEA]">Payment Info</p>
          <div className="border-b border-dashed border-black/15 text-sm font-medium text-[#15191C]/50">
            <div className={row}><span>Per Head Price</span><span>{rupees(quote.rate ?? 0)}</span></div>
            <div className={row}><span>Total Invitees</span><span>{quote.invitees}</span></div>
          </div>
          <div className="border-b border-dashed border-black/15 text-sm font-medium text-[#15191C]/50">
            <div className={row}><span>Subtotal</span><span>{rupees(quote.subtotal)}</span></div>
            <div className={row}><span>Tax ({gstLabel(quote.gstPercent)} GST)</span><span>{rupees(quote.tax)}</span></div>
          </div>
          <div className="flex items-center justify-between gap-2 py-4 border-b border-[#EAEAEA] text-base">
            <span className="font-medium text-[#15191C]">Total Amount</span>
            <span className="font-bold text-[#1F65FF]">{rupees(quote.total)}</span>
          </div>

          <div className="mt-4 flex items-start gap-1.5">
            <input
              id="bill-agree"
              type="checkbox"
              checked={agreed}
              onChange={(e) => { setAgreed(e.target.checked); if (e.target.checked) setShowAgreeError(false); }}
              className="mt-0.5 size-[18px] shrink-0 cursor-pointer check-green"
            />
            <label htmlFor="bill-agree" className="text-[13px] font-medium text-[#15191C]/50 cursor-pointer">
              I agree to the <Link href="/contact" target="_blank" className="underline">Terms and conditions</Link> &amp; <Link href="/contact" target="_blank" className="underline">Privacy policy</Link>
            </label>
          </div>
          {showAgreeError && !agreed && <p role="alert" className="mt-2 text-[13px] font-medium text-[#D92D20]">Please select the checkbox</p>}
          {error && <p role="alert" className="mt-3 text-[13px] font-medium text-[#D92D20]">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t border-[#E5E5E5]">
          <button type="button" onClick={onCancel} disabled={busy} className="px-6 py-[11px] bg-white border border-[#DDD] rounded-lg text-base font-semibold text-black cursor-pointer disabled:opacity-50">Cancel</button>
          <button
            type="button"
            onClick={finish}
            disabled={busy}
            style={{ backgroundImage: "linear-gradient(180deg, #1F65FF 0%, #2071FF 33%, #2181FF 69%, #1F65FF 100%)" }}
            className="px-6 py-[11px] rounded-lg text-base font-semibold text-white cursor-pointer disabled:opacity-60 hover:brightness-95"
          >
            {busy ? "Processing…" : `Pay ${rupees(quote.total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
