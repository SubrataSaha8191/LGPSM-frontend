"use client";

import React from "react";
import { Skeleton, SkeletonRegion } from "@/components/common/Skeleton";

interface ReportsStatsCardsProps {
  totalInvitees?: number;
  totalAttendees?: number;
  totalSessions?: number;
  systemUsers?: number;
  loading?: boolean;
}

const ICONS = {
  invitees: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z",
  attendees: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  sessions: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  staff: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
};

// Figma report tiles (217:23715): tinted 48px icon, large count, 16px label — same tones as the event dashboard tiles
function Tile({ value, label, icon, tone }: { value: string | number; label: string; icon: keyof typeof ICONS; tone: string }) {
  return (
    <div className="bg-white border border-[#E0E0E0] rounded-lg p-5 flex flex-col gap-3 min-w-0">
      <span className={`size-12 rounded-full flex items-center justify-center ${tone}`}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d={ICONS[icon]} />
        </svg>
      </span>
      <div>
        <p className="text-[40px] leading-none font-medium text-black">{value}</p>
        <p className="mt-1.5 text-base font-medium text-[#15191C]">{label}</p>
      </div>
    </div>
  );
}

export default function ReportsStatsCards({
  totalInvitees = 0,
  totalAttendees = 0,
  totalSessions = 0,
  systemUsers = 0,
  loading = false,
}: ReportsStatsCardsProps) {
  if (loading) {
    return (
      <SkeletonRegion label="Loading report totals" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[158px] rounded-lg!" />)}
      </SkeletonRegion>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <Tile value={totalInvitees} label="Total Invitees" icon="invitees" tone="bg-[#FFDCCF] text-[#FF651D]" />
      <Tile value={totalAttendees} label="Total Attendees" icon="attendees" tone="bg-[#C9F6E6] text-[#16A34A]" />
      <Tile value={String(totalSessions).padStart(2, "0")} label="Total Sessions" icon="sessions" tone="bg-[#DCE1FF] text-[#2C2EB5]" />
      <Tile value={systemUsers} label="System Users" icon="staff" tone="bg-[#EBDDFF] text-[#9747FF]" />
    </div>
  );
}
