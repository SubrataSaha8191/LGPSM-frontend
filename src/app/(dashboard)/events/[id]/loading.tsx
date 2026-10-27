"use client";

import React from "react";
import { useParams, usePathname } from "next/navigation";
import PageHeader from "@/components/common/PageHeader";

// Shown at once when switching between the event's tabs, while the next tab's page is fetched
export default function EventTabLoading() {
  const params = useParams();
  const pathname = usePathname() || "";
  const eventId = (params?.id as string) || "";
  const last = pathname.split("/").pop() || "";
  // /events/<id>/edit and the sidebar "select" flow have no tab strip
  const showTabs = eventId !== "select" && last !== "edit";

  return (
    <div className="w-full min-h-full bg-white">
      <PageHeader title="Event" />
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-5 pb-24" aria-busy="true">
        {showTabs && <div className="h-10 w-full max-w-xl border-b border-gray-200" aria-hidden />}
        <div className="space-y-3 animate-pulse" role="status" aria-label="Loading">
          <div className="h-10 w-full max-w-md rounded-md bg-gray-100" />
          <div className="h-12 w-full rounded-md bg-gray-100" />
          <div className="h-12 w-full rounded-md bg-gray-100" />
          <div className="h-12 w-3/4 rounded-md bg-gray-100" />
        </div>
      </div>
    </div>
  );
}
