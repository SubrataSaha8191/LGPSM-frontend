"use client";

import React, { useEffect, useRef, useState } from "react";
import { invitationService } from "@/services/invitationService";
import InvitationCardImage from "@/components/events/InvitationCardImage";

interface EventCardPreviewProps {
  eventId: string;
  /** Changes whenever something that affects the card changes (the event's last update), so the card re-renders */
  refreshKey?: string;
  /** Shown in the image's alt text */
  label: string;
  /** Height of the preview box; the card is fitted inside it */
  heightClassName?: string;
}

// The event's own invitation card, rendered by the server exactly as guests receive it (its template, or the design that
// suits its type), so the event pages never show a stand-in picture.
export default function EventCardPreview({ eventId, refreshKey, label, heightClassName = "h-52 sm:h-60" }: EventCardPreviewProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const current = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    invitationService
      .previewCard(eventId, undefined, { width: 700 })
      .then(({ blob }) => {
        if (cancelled) return;
        const next = URL.createObjectURL(blob);
        if (current.current) URL.revokeObjectURL(current.current);
        current.current = next;
        setUrl(next);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId, refreshKey, attempt]);

  useEffect(
    () => () => {
      if (current.current) URL.revokeObjectURL(current.current);
    },
    []
  );

  return (
    <div className={`relative w-full ${heightClassName} bg-[#F4F5F8]`}>
      {url ? (
        <InvitationCardImage src={url} alt={`${label} invitation card`} />
      ) : failed ? (
        <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
          <p className="text-xs text-[#4B4F52]">The card preview could not be loaded.</p>
          <button type="button" onClick={() => { setFailed(false); setAttempt((n) => n + 1); }} className="px-3 py-1.5 text-xs font-medium bg-white border border-[#E0E0E0] rounded-md cursor-pointer hover:bg-gray-50">
            Try again
          </button>
        </div>
      ) : (
        <div aria-hidden className="absolute inset-0 animate-pulse bg-gradient-to-b from-[#F3F3F3] to-[#E4E4E4]" />
      )}
    </div>
  );
}
