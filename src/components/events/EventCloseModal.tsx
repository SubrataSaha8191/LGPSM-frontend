"use client";

import React, { useState } from "react";
import { eventService } from "@/services/eventService";

interface EventCloseModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle?: string;
  onClosed: () => void;
}

/** Closing marks the event completed. It is non-destructive: every record is kept. */
export default function EventCloseModal({ isOpen, onClose, eventId, eventTitle, onClosed }: EventCloseModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await eventService.closeEvent(eventId);
      if (res.success) onClosed();
      else setError(res.message || "Could not close the event.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not close the event.");
    }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true" aria-labelledby="close-event-title">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 space-y-4">
        <h3 id="close-event-title" className="text-base font-medium text-gray-900">Close event</h3>
        <p className="text-sm text-[#4B4F52] break-words">Mark “{eventTitle || "this event"}” as completed?</p>
        <ul className="text-sm text-[#4B4F52] list-disc pl-5 space-y-1">
          <li><strong className="font-medium text-gray-900">Kept:</strong> guests, invitations, RSVPs, sessions, check-ins, reports and the activity log.</li>
          <li><strong className="font-medium text-gray-900">Changes:</strong> the event can no longer be edited, and it cannot be re-opened.</li>
          <li>Nothing is deleted.</li>
        </ul>
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={busy} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 cursor-pointer disabled:opacity-50">Keep open</button>
          <button type="button" onClick={submit} disabled={busy} className="px-4 py-2 bg-[#FF651D] hover:bg-[#E5520F] text-white rounded-md text-sm font-medium cursor-pointer disabled:opacity-50">{busy ? "Closing…" : "Close event"}</button>
        </div>
      </div>
    </div>
  );
}
