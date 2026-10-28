"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { templateService, TemplatePreviewPayload } from "@/services/templateService";
import { CARD_INFO_OPTIONS, CardInfo, CardInfoField } from "../eventDraft";
import CustomDropdown from "@/components/common/CustomDropdown";

interface CustomizeInfoModalProps {
  isOpen: boolean;
  /** The saved choice, or null when none has been made yet */
  value: CardInfo | null;
  templateId: string | null;
  /** What the form has entered so far, so the card on the left is the real one */
  previewPayload: TemplatePreviewPayload;
  onSave: (value: CardInfo) => void;
  onClose: () => void;
}

// Figma "Customize Information" (Event_Add event-5 / Event_Edit event-4): the card on the left, and on the right the
// guest details to print on its two guest lines. The card re-renders with sample labels as the choice changes.
export default function CustomizeInfoModal({ isOpen, value, templateId, previewPayload, onSave, onClose }: CustomizeInfoModalProps) {
  const [primaryOn, setPrimaryOn] = useState(value ? value.primary !== null : true);
  const [secondaryOn, setSecondaryOn] = useState(value ? value.secondary !== null : true);
  const [primary, setPrimary] = useState<CardInfoField>(value?.primary ?? "INVITEE_NAME");
  const [secondary, setSecondary] = useState<CardInfoField>(value?.secondary ?? "PROFESSIONAL_IDENTITY");
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [cardFailed, setCardFailed] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const urlRef = useRef<string | null>(null);

  const choice: CardInfo = { primary: primaryOn ? primary : null, secondary: secondaryOn ? secondary : null };
  const choiceKey = JSON.stringify(choice);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      templateService
        .previewCard(templateId, { ...previewPayload, cardInfo: JSON.parse(choiceKey) }, controller.signal)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          if (urlRef.current) URL.revokeObjectURL(urlRef.current);
          urlRef.current = url;
          setCardUrl(url);
          setCardFailed(false);
        })
        .catch(() => { if (!controller.signal.aborted) setCardFailed(true); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [isOpen, templateId, previewPayload, choiceKey]);

  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") (expanded ? setExpanded(false) : onClose()); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, expanded, onClose]);

  if (!isOpen) return null;

  const row = (label: string, on: boolean, setOn: (v: boolean) => void, field: CardInfoField, setField: (v: CardInfoField) => void, id: string) => (
    <div className="border border-[#15191C] rounded-md p-4 flex flex-col gap-3">
      <label htmlFor={id} className="inline-flex items-center gap-2.5 text-sm font-medium text-[#15191C] cursor-pointer">
        <input id={id} type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="size-[18px] accent-[#1A9242] cursor-pointer" />
        {label}
      </label>
      <div className={on ? "" : "opacity-50 pointer-events-none"} aria-disabled={!on}>
        <CustomDropdown value={field} onChange={(v) => setField(v as CardInfoField)} options={CARD_INFO_OPTIONS} ariaLabel={label} />
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="customize-info-title">
      <div className="w-full max-w-[800px] max-h-[calc(100vh-2rem)] overflow-y-auto bg-white rounded-lg">
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#E0E0E0]">
          <h2 id="customize-info-title" className="text-base font-medium text-[#15191C]">Customize Information</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="cursor-pointer">
            <Image src="/icons/events/close.svg" alt="" width={16} height={16} />
          </button>
        </div>
        <div className="flex flex-col md:flex-row gap-8 p-6 md:p-8">
          <div className="relative w-full md:w-[302px] shrink-0 aspect-[302/524] max-h-[524px] rounded-md overflow-hidden bg-[#F4F5F8]">
            {cardUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- blob URL rendered by the API
              <img src={cardUrl} alt="Invitation card with the chosen guest details" className="absolute inset-0 w-full h-full object-contain" />
            ) : cardFailed ? (
              <p role="alert" className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-[#4B4F52]">The card preview could not be loaded.</p>
            ) : (
              <div aria-hidden className="absolute inset-0 animate-pulse bg-gradient-to-b from-[#F3F3F3] to-[#E4E4E4]" />
            )}
            {cardUrl && (
              <button type="button" onClick={() => setExpanded(true)} aria-label="Enlarge card" className="absolute top-2 right-2 p-1 rounded bg-black/50 text-white cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
              </button>
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-4">
            <h3 className="text-[22px] font-medium text-[#15191C]">Additional Information</h3>
            <p className="text-xs text-[#4B4F52] -mt-2">Printed on each guest’s card under the event name. A guest without that detail gets an empty line.</p>
            {row("Primary additional information", primaryOn, setPrimaryOn, primary, setPrimary, "card-info-primary")}
            {row("Secondary additional information", secondaryOn, setSecondaryOn, secondary, setSecondary, "card-info-secondary")}
            <div>
              <button type="button" onClick={() => onSave(choice)} className="px-6 py-[11px] bg-[#FF651D] hover:bg-[#E5520F] rounded-lg text-base font-semibold text-white cursor-pointer">Save</button>
            </div>
          </div>
        </div>
      </div>
      {expanded && cardUrl && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-6" onClick={() => setExpanded(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- blob URL rendered by the API */}
          <img src={cardUrl} alt="Invitation card, full size" className="max-h-full max-w-full object-contain" />
        </div>
      )}
    </div>
  );
}
