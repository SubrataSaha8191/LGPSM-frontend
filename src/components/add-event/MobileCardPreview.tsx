"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SelectedTemplate } from "./eventDraft";
import { formatDateTime } from "@/utils/dateTime";
import { resolveImageUrl } from "@/utils/mediaUrl";
import { templateService, TemplatePreviewPayload } from "@/services/templateService";
import CustomDropdown from "@/components/common/CustomDropdown";

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

// Live invitation preview built only from what is in the form: the chosen template image, the
// event logo, and the entered title, date, venue and category.
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

  // The real card, rendered by the server from the chosen template and what has been entered so far, so the wording
  // written for this kind of event is visible while filling in the form. Re-requested (debounced) as the form changes.
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
  const [live, setLive] = useState<{ templateId: string; url: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const liveUrl = useRef<string | null>(null);

  useEffect(() => {
    const templateId = template?.id;
    if (!templateId) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      templateService
        .previewCard(templateId, payload, controller.signal)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          if (liveUrl.current) URL.revokeObjectURL(liveUrl.current);
          liveUrl.current = url;
          setLive({ templateId, url });
        })
        .catch(() => {
          // keep whatever is shown (the template's own preview image) when the live card cannot be made
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 600);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [template?.id, payload]);

  useEffect(
    () => () => {
      if (liveUrl.current) URL.revokeObjectURL(liveUrl.current);
    },
    []
  );

  const showLive = !!template && live?.templateId === template.id;
  const templateUrl = resolveImageUrl(template?.previewKey);
  const logoUrl = resolveImageUrl(logoKey);
  const categoryLine = [categoryName, subcategoryName].filter(Boolean).join(" · ");

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
          <div className="relative w-full h-full rounded-[30px] overflow-hidden bg-[#D9D9D9]">
            {showLive && live && (
              // eslint-disable-next-line @next/next/no-img-element -- a blob URL from the server-rendered card; next/image cannot optimise it
              <img src={live.url} alt={`${template?.name || "Template"} invitation card`} className="absolute inset-0 w-full h-full object-cover" />
            )}
            {!showLive && templateUrl && <Image src={templateUrl} alt={template?.name || "Template"} fill unoptimized sizes="250px" className="object-cover" />}
            {template && loading && (
              <div role="status" aria-label="Updating preview" className="absolute top-3 right-3 h-6 w-6 rounded-full bg-white/90 shadow flex items-center justify-center">
                <svg className="h-4 w-4 animate-spin text-[#FF5B22]" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                </svg>
              </div>
            )}
            {/* Until the live card is ready (or if it cannot be made), the template's own picture with the typed details on top */}
            <div className={`absolute inset-x-3 bottom-3 rounded-xl bg-white/90 p-3 text-center space-y-1 ${showLive ? "hidden" : ""}`}>
              {logoUrl && (
                <div className="relative mx-auto h-8 w-24">
                  <Image src={logoUrl} alt="Event logo" fill unoptimized sizes="96px" className="object-contain" />
                </div>
              )}
              {categoryLine && <p className="text-[10px] font-medium uppercase tracking-wider text-[#E5520F] truncate">{categoryLine}</p>}
              <p className="text-sm font-semibold text-gray-900 leading-tight break-words line-clamp-2">{eventTitle.trim() || "Your event title"}</p>
              <p className="text-[11px] text-[#4B4F52]">{formatDateTime(eventStart, "Date to be set")}</p>
              {venue.trim() && <p className="text-[10px] text-[#828282] break-words line-clamp-2">{venue}</p>}
            </div>
            {!templateUrl && (
              <p className="absolute top-1/3 inset-x-4 text-center text-xs text-[#4B4F52]">
                {template ? "This template has no preview image" : "Choose a template to see your card"}
              </p>
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
        {template && <p className="mt-2 text-xs text-[#4B4F52] text-center break-words">Template: {template.name}</p>}
        {showLive && <p className="mt-1 text-[11px] text-[#828282] text-center">Sample guest and QR. Each guest gets their own when invitations are sent.</p>}
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
