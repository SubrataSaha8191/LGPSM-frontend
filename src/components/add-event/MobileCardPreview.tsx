"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SelectedTemplate } from "./eventDraft";
import { templateService, TemplatePreviewPayload } from "@/services/templateService";
import CustomDropdown from "@/components/common/CustomDropdown";
import InvitationCardImage from "@/components/events/InvitationCardImage";

interface MobileCardPreviewProps {
  template: SelectedTemplate | null;
  eventTitle: string;
  eventStart: string;
  eventEnd: string;
  venue: string;
  logoKey: string | null;
  categoryName: string;
  subcategoryName: string;
  onOpenTemplateModal: () => void;
}

const ZOOM_SCALE: Record<string, number> = { "100%": 1, "75%": 0.75, "50%": 0.5 };

function formatEventDateRange(start: string, end: string): string | null {
  if (!start || !end) return null;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;
  const format = (date: Date) => new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
  return `${format(startDate)} – ${format(endDate)}`;
}

export default function MobileCardPreview({
  template,
  eventTitle,
  eventStart,
  eventEnd,
  venue,
  logoKey,
  categoryName,
  subcategoryName,
  onOpenTemplateModal,
}: MobileCardPreviewProps) {
  const [zoomLevel, setZoomLevel] = useState("100%");

  // The card is always the real one: the server renders the chosen template with what has been entered so far (title,
  // dates, address, event type, image), so the wording written for this kind of event is visible while filling in the
  // form and follows every change. Nothing static or made up is shown in its place.
  const payload = useMemo<TemplatePreviewPayload>(
    () => ({
      title: eventTitle.trim() || undefined,
      startIso: eventStart || undefined,
      endIso: eventEnd || undefined,
      venue: venue.trim() || undefined,
      categoryName: categoryName || undefined,
      subcategoryName: subcategoryName || undefined,
      logoKey: logoKey && /^media:[0-9a-fA-F]{24}$/.test(logoKey) ? logoKey : undefined,
    }),
    [eventTitle, eventStart, eventEnd, venue, categoryName, subcategoryName, logoKey]
  );
  const [live, setLive] = useState<{ key: string; url: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const liveUrl = useRef<string | null>(null);

  useEffect(() => {
    // No template chosen: the card is still shown, in the design that suits the event type
    const templateId = template?.id ?? null;
    const key = templateId ?? "by-event-type";
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      templateService
        .previewCard(templateId, payload, controller.signal)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          if (liveUrl.current) URL.revokeObjectURL(liveUrl.current);
          liveUrl.current = url;
          setLive({ key, url });
          setFailed(false);
        })
        .catch(() => {
          if (!controller.signal.aborted) setFailed(true);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [template?.id, payload, attempt]);

  useEffect(
    () => () => {
      if (liveUrl.current) URL.revokeObjectURL(liveUrl.current);
    },
    []
  );

  const showLive = live?.key === (template?.id ?? "by-event-type");
  const usesSamplePhoto = !payload.logoKey;
  const eventDateRange = formatEventDateRange(eventStart, eventEnd);

  return (
    <div className="h-full bg-[#F7F3F0] p-4 sm:p-6 flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-4">
        <span className="text-xs font-medium px-3 py-1 bg-white border border-[#E0E0E0] rounded-md text-gray-800">Preview</span>
        <div className="w-28">
          <CustomDropdown
            value={zoomLevel}
            onChange={setZoomLevel}
            options={Object.keys(ZOOM_SCALE).map((z) => ({ value: z, label: z }))}
            ariaLabel="Preview zoom"
          />
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div
          className="relative w-[230px] sm:w-[250px] aspect-[9/18.5] bg-[#1E2A33] rounded-[38px] p-2 shadow-xl origin-top transition-transform"
          style={{ transform: `scale(${ZOOM_SCALE[zoomLevel] ?? 1})` }}
          aria-label="Invitation card preview"
        >
          <div className="relative w-full h-full rounded-[30px] overflow-hidden bg-[#EFEFEF]">
            {showLive && live && (
              <InvitationCardImage src={live.url} alt={`${template?.name || "Template"} invitation card`} imageClassName="object-cover" />
            )}
            {loading && (
              <div role="status" aria-label="Updating preview" className="absolute top-3 right-3 h-6 w-6 rounded-full bg-white/90 shadow flex items-center justify-center">
                <svg className="h-4 w-4 animate-spin text-[#FF5B22]" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                </svg>
              </div>
            )}
            {!showLive && !failed && <div aria-hidden className="absolute inset-0 animate-pulse bg-gradient-to-b from-[#F3F3F3] to-[#E4E4E4]" />}
            {!showLive && failed && (
              <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 text-center">
                <p className="text-xs text-[#4B4F52]">The card preview could not be loaded.</p>
                <button type="button" onClick={() => { setFailed(false); setAttempt((n) => n + 1); }} className="px-3 py-1.5 text-xs font-medium bg-white border border-[#E0E0E0] rounded-md cursor-pointer hover:bg-gray-50">
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenTemplateModal}
          className="mt-5 px-4 py-2 bg-white hover:bg-gray-50 border border-[#E0E0E0] text-gray-900 text-sm font-medium rounded-md shadow-xs cursor-pointer"
        >
          {template ? "Change Template" : "Select Template"}
        </button>
        <p className="mt-2 text-xs text-[#4B4F52] text-center break-words">
          {template ? `Template: ${template.name}` : "No template chosen: the design follows the event type."}
        </p>
        {eventDateRange && (
          <p className="mt-1 text-xs font-medium text-[#25216F] text-center" aria-label="Event date range">
            {eventDateRange}
          </p>
        )}
        {showLive && (
          <p className="mt-1 text-[11px] text-[#828282] text-center max-w-[260px]">
            {usesSamplePhoto ? "Sample photo, guest and QR. Add an event image to use your own." : "Sample guest and QR."} Each guest gets their own QR when invitations are sent.
          </p>
        )}
        <p className="text-xs text-[#4B4F52] mt-3 text-center">
          Looking for custom card design?{" "}
          <Link href="/contact" className="text-[#16A34A] font-medium underline">
            Contact us
          </Link>
        </p>
      </div>
    </div>
  );
}
