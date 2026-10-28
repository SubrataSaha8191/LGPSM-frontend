"use client";

import Image from "next/image";
import ListControls, { addButtonClass } from "@/components/common/ListControls";
import PageHeader from "@/components/common/PageHeader";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { userService } from "@/services/userService";
import { useAuth } from "@/context/AuthContext";
import { TableSkeletonRows } from "@/components/common/Skeleton";

interface OrganizerRow {
  id: string;
  name: string;
  accountName: string;
  email: string;
  phone: string;
  status: "Active" | "In Active" | "Deactivate";
}

export default function AllOrganizersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [organizers, setOrganizers] = useState<OrganizerRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOrganizers() {
      setLoading(true);
      let list: OrganizerRow[] = [];
      setLoadError(null);

      try {
        const res = await userService.getUsers("ORGANIZER");
        if (!res?.success) {
          setLoadError(res?.message || "Failed to load organizers.");
        }
        if (res?.success && Array.isArray(res.data)) {
          const organizerUsersOnly = res.data.filter((u: any) => u.role === "ORGANIZER");
          const apiOrgs = organizerUsersOnly.map((u: any, idx: number) => ({
            id: u._id || u.id || `org_${idx}`,
            name: u.profile?.organizationName || "Organisation not set",
            accountName: u.fullName || u.name || "Event Organizer",
            email: u.email || "--",
            phone: u.phone || u.contactNo || "--",
            status: (u.isActive === false ? "In Active" : "Active") as any,
          }));

          list = apiOrgs;
        }
      } catch (e) {
        setLoadError("Could not reach the server. Please try again.");
      }

      setOrganizers(list);
      setLoading(false);
    }

    loadOrganizers();
  }, []);

  const toggleSelectAll = () => {
    if (selectedIds.length === organizers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(organizers.map((o) => o.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const filteredOrganizers = organizers.filter(
    (o) =>
      o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.phone.includes(searchQuery)
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header */}
        <PageHeader title="Event Organizer" />

        {/* Page Content */}
        <main className="px-4 sm:px-6 pt-[30px] pb-24 w-full space-y-6">
          {/* Controls (Figma 462:10218) */}
          <ListControls label="Organizer" searchId="organizer-search" placeholder="Search organizers" value={searchQuery} onChange={setSearchQuery}>
            <Link href="/event-organizer/add" className={addButtonClass}>
              <Image src="/icons/events/add-white.svg" alt="" width={24} height={24} />
              Add Organizer
            </Link>
          </ListControls>

          {/* Stats tiles: separate bordered cards (Figma 462:10218) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Active Organizer */}
            <div className="bg-white border border-[#E0E0E0] rounded-lg p-5 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-[#15191C] block">Active Organizer</span>
                <span className="text-[32px] leading-tight font-semibold text-black mt-1 block">
                  {organizers.filter((o) => o.status === "Active").length}
                </span>
              </div>
              <div className="w-11 h-11 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>

            {/* 2. Inactive Organizers */}
            <div className="bg-white border border-[#E0E0E0] rounded-lg p-5 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-[#15191C] block">Inactive Organizers</span>
                <span className="text-[32px] leading-tight font-semibold text-black mt-1 block">
                  {organizers.filter((o) => o.status !== "Active").length}
                </span>
              </div>
              <div className="w-11 h-11 rounded-full bg-orange-50 text-orange-400 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>

            {/* 3. Earnings */}
            <div className="bg-white border border-[#E0E0E0] rounded-lg p-5 flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-[#15191C] block">Earnings</span>
                <span className="text-[32px] leading-tight font-semibold text-black mt-1 block">$0</span>
              </div>
              <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-gray-200 rounded-md shadow-2xs overflow-hidden">
            <div className="overflow-x-auto pb-16">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 font-medium text-[11px] bg-white">
                    <th className="py-3 px-4 w-10">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className={`w-4 h-4 rounded-sm flex items-center justify-center transition-colors border cursor-pointer ${
                          selectedIds.length === filteredOrganizers.length && filteredOrganizers.length > 0
                            ? "bg-[#10B981] border-[#10B981] text-white"
                            : "bg-white border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        {selectedIds.length === filteredOrganizers.length && filteredOrganizers.length > 0 && (
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-4 font-medium text-gray-400">Organizer</th>
                    <th className="py-3 px-4 font-medium text-gray-400">Email</th>
                    <th className="py-3 px-4 font-medium text-gray-400">Phone Number</th>
                    <th className="py-3 px-4 font-medium text-gray-400">Status</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-400">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-gray-800">
                  {loading && (
                    <TableSkeletonRows rows={5} cols={6} />
                  )}
                  {!loading && loadError && (
                    <tr><td colSpan={6} className="py-12 text-center text-rose-600 text-sm">{loadError}</td></tr>
                  )}
                  {!loading && !loadError && filteredOrganizers.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">No organizers found.</td></tr>
                  )}
                  {filteredOrganizers.map((org, idx) => {
                    const isSelected = selectedIds.includes(org.id);
                    const isActionOpen = activeActionId === org.id;
                    const shouldOpenUpwards = idx > 2 && idx >= filteredOrganizers.length - 2;

                    return (
                      <tr key={org.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-4 px-4">
                          <button
                            type="button"
                            onClick={() => toggleSelectRow(org.id)}
                            className={`w-4 h-4 rounded-sm flex items-center justify-center transition-colors border cursor-pointer ${
                              isSelected ? "bg-[#10B981] border-[#10B981] text-white" : "bg-white border-gray-300 hover:border-gray-400"
                            }`}
                          >
                            {isSelected && (
                              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        </td>

                        {/* Organizer Name with link to details */}
                        <td className="py-4 px-4 font-medium text-gray-900">
                          <Link
                            href={`/event-organizer/${org.id}`}
                            className="hover:text-[#FF5B22] transition-colors cursor-pointer"
                          >
                            {org.name}
                            <span className="block text-xs font-normal text-gray-500">Account: {org.accountName}</span>
                          </Link>
                        </td>

                        <td className="py-4 px-4 text-gray-600">{org.email}</td>
                        <td className="py-4 px-4 text-gray-600">{org.phone}</td>

                        {/* Status Badge */}
                        <td className="py-4 px-4">
                          {org.status === "Active" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                              Active
                            </span>
                          )}
                          {org.status === "In Active" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-600">
                              In Active
                            </span>
                          )}
                          {org.status === "Deactivate" && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-orange-100 text-orange-700">
                              Deactivate
                            </span>
                          )}
                        </td>

                        {/* Action Column */}
                        <td className="py-4 px-4 text-right">
                          <div className="relative inline-block text-left">
                            <button
                              onClick={() => setActiveActionId(isActionOpen ? null : org.id)}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 10a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z" />
                              </svg>
                            </button>

                            {isActionOpen && (
                              <div className={`absolute right-0 ${shouldOpenUpwards ? "bottom-full mb-1" : "top-full mt-1"} z-50 bg-[#1E232A] text-white text-xs font-medium py-1.5 px-3 rounded-md shadow-2xl border border-gray-700 animate-menu flex flex-col gap-1 min-w-[110px] text-left`}>
                                <button
                                  onClick={() => router.push(`/event-organizer/${org.id}`)}
                                  className="py-1 hover:text-[#FF5B22] text-left transition-colors cursor-pointer"
                                >
                                  View Details
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-gray-200 flex items-center justify-start gap-1 text-xs">
              <button className="w-8 h-8 rounded border border-gray-200 bg-gray-100 text-gray-400 flex items-center justify-center cursor-not-allowed">
                &lt;
              </button>
              <button className="w-8 h-8 rounded border border-[#FF5B22] text-[#FF5B22] font-bold flex items-center justify-center">
                1
              </button>
              <button className="w-8 h-8 rounded border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50">
                2
              </button>
              <span className="px-1 text-gray-400">...</span>
              <button className="w-8 h-8 rounded border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50">
                9
              </button>
              <button className="w-8 h-8 rounded border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50">
                10
              </button>
              <button className="w-8 h-8 rounded border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50">
                &gt;
              </button>
            </div>
          </div>
        </main>
    </div>
  );
}
