"use client";

import React from "react";

interface ReportsStatsCardsProps {
  totalInvitees?: number;
  totalAttendees?: number;
  totalSessions?: number;
  systemUsers?: number;
}

export default function ReportsStatsCards({
  totalInvitees = 0,
  totalAttendees = 0,
  totalSessions = 0,
  systemUsers = 0,
}: ReportsStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Card 1: Total Invitees */}
      <div className="bg-white border border-gray-200 rounded-md p-5 shadow-2xs relative space-y-3">
        <div>
          <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{totalInvitees}</h3>
          <p className="text-xs font-medium text-gray-500 mt-0.5">Total Invitees</p>
        </div>
      </div>

      {/* Card 2: Total Attendees */}
      <div className="bg-white border border-gray-200 rounded-md p-5 shadow-2xs relative space-y-3">
        <div>
          <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{totalAttendees}</h3>
          <p className="text-xs font-medium text-gray-500 mt-0.5">Total Attendees</p>
        </div>
      </div>

      {/* Card 3: Total Sessions */}
      <div className="bg-white border border-gray-200 rounded-md p-5 shadow-2xs relative space-y-3">
        <div>
          <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{String(totalSessions).padStart(2, "0")}</h3>
          <p className="text-xs font-medium text-gray-500 mt-0.5">Total Sessions</p>
        </div>
      </div>

      {/* Card 4: System Users */}
      <div className="bg-white border border-gray-200 rounded-md p-5 shadow-2xs relative space-y-3">
        <div>
          <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{systemUsers}</h3>
          <p className="text-xs font-medium text-gray-500 mt-0.5">System Users</p>
        </div>
      </div>
    </div>
  );
}
