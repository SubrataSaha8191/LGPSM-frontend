"use client";

import React from "react";
import { SessionOption } from "@/hooks/useEventSessions";
import { Skeleton, SkeletonRegion } from "@/components/common/Skeleton";

interface SessionScopePickerProps {
  sessions: SessionOption[];
  loading?: boolean;
  error?: string | null;
  // null = every session of the event (sent to the backend as an empty list);
  // an array = only those sessions (an empty array is an incomplete choice the caller must block)
  value: string[] | null;
  onChange: (value: string[] | null) => void;
  label?: string;
}

// Dropdown for a staff member's session access: All Sessions (default) or one session.
// An older assignment covering several sessions is kept as-is until the organizer picks something else.
export default function SessionScopePicker({
  sessions,
  loading = false,
  error,
  value,
  onChange,
  label = "Session access",
}: SessionScopePickerProps) {
  const valid = (value || []).filter((id) => sessions.some((s) => s.id === id));
  const multi = value !== null && valid.length > 1;
  const current = value === null ? "all" : multi ? "multi" : valid[0] || "none";

  return (
    <div className="space-y-1.5">
      <label htmlFor="session-scope" className="block text-xs font-semibold text-gray-800">{label}</label>
      {loading ? (
        <SkeletonRegion label="Loading sessions" className="space-y-2"><Skeleton className="h-9" /></SkeletonRegion>
      ) : error ? (
        <p className="text-xs text-rose-600 break-words">{error}</p>
      ) : (
        <>
          <select
            id="session-scope"
            value={current}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "all") onChange(null);
              else if (v === "multi") onChange(valid);
              else onChange([v]);
            }}
            className="w-full h-10 px-3 bg-white border border-gray-200 rounded-md text-xs text-gray-800 focus:outline-none focus:border-[#FF5B22]"
          >
            <option value="all">All Sessions{sessions.length ? ` (${sessions.length})` : ""}</option>
            {multi && <option value="multi">{valid.length} sessions (current)</option>}
            {current === "none" && <option value="none" disabled>Select a session</option>}
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {current === "none" && <p className="text-[11px] text-amber-700">Select a session, or choose &quot;All Sessions&quot;.</p>}
          {sessions.length === 0 && <p className="text-[11px] text-gray-400">This event has no sessions yet; staff can check guests in at the event entry.</p>}
        </>
      )}
    </div>
  );
}
