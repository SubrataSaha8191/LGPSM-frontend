"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { sessionService } from "@/services/sessionService";
import { userService } from "@/services/userService";
import { assignmentService, AssignmentData } from "@/services/assignmentService";
import { eventService } from "@/services/eventService";
import EventSubNav, { notifyDbUpdate } from "@/components/EventSubNav";
import SessionScopePicker from "@/components/common/SessionScopePicker";
import PageHeader from "@/components/common/PageHeader";
import { getAssignedCountText, SystemUserRow } from "@/app/(dashboard)/user-management/assign/page";
import { useAlert } from "@/context/AlertContext";
import { TableSkeleton } from "@/components/common/Skeleton";
import CustomDropdown from "@/components/common/CustomDropdown";

export default function EventAssignUsersPage() {
  const { confirm } = useAlert();
  const params = useParams();
  const eventId = (params?.id as string);
  const { user } = useAuth();

  const [users, setUsers] = useState<SystemUserRow[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [expandedUserIds, setExpandedUserIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAllSystemUsers, setShowAllSystemUsers] = useState(false);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isAssignSuccessModalOpen, setIsAssignSuccessModalOpen] = useState(false);
  // null = all sessions of this event
  const [sessionScope, setSessionScope] = useState<string[] | null>(null);
  const [submittingAssign, setSubmittingAssign] = useState(false);

  const fetchAssignmentsAndSessions = async () => {
    try {
      setIsLoading(true);
      setErrorFeedback(null);

      // These resources are independent; load them together instead of serializing four network round trips.
      const [sessionsRes, eventRes, usersRes, assignRes] = await Promise.all([
        sessionService.getSessions(eventId),
        eventService.getEvent(eventId),
        userService.getUsers("SYSTEM_USER"),
        assignmentService.getAssignmentsByEvent(eventId),
      ]);
      const sessionList = Array.isArray(sessionsRes?.data) ? sessionsRes.data : [];
      setSessions(sessionList);
      if (eventRes.success && eventRes.data) setEventTitle(eventRes.data.title || "");

      // System users only (role === SYSTEM_USER)
      if (!usersRes.success) throw new Error(usersRes.message || "Failed to load system users.");
      const rawUsers = Array.isArray(usersRes?.data) ? usersRes.data : [];
      const systemUsersOnly = rawUsers.filter(u => u.role === "SYSTEM_USER");

      // Assignments for this event
      if (!assignRes.success) throw new Error(assignRes.message || "Failed to load assignments.");
      const assignmentsList: AssignmentData[] = Array.isArray(assignRes?.data) ? assignRes.data : [];

      const userAssignmentsMap: Record<string, SystemUserRow["assignments"]> = {};

      assignmentsList.forEach((asn) => {
        const userId = typeof asn.userId === "object" ? asn.userId?._id : asn.userId;
        if (!userId) return;

        if (!userAssignmentsMap[userId]) {
          userAssignmentsMap[userId] = [];
        }

        const sessItems = (asn.sessionIds || []).map((s: any) => ({
          id: typeof s === "object" ? s._id : s,
          name: typeof s === "object" ? (s.name || "Session") : "Session",
          time: typeof s === "object" && s.schedule?.startTime ? `${s.schedule.startTime}` : undefined,
        }));

        const eventObj = typeof asn.eventId === "object" ? asn.eventId : null;
        const eventTitle = eventObj?.title || "Event";

        const assignedByObj = typeof asn.assignedBy === "object" ? asn.assignedBy : null;
        const assignedByName = assignedByObj?.fullName || assignedByObj?.email || "Organizer";

        userAssignmentsMap[userId].push({
          assignmentId: asn._id,
          eventId: eventId,
          eventName: eventTitle,
          assignedBy: assignedByName,
          assignedAt: asn.createdAt ? new Date(asn.createdAt).toLocaleDateString() : undefined,
          sessions: sessItems,
        });
      });

      const formattedUserRows: SystemUserRow[] = systemUsersOnly.map((u: any) => ({
        id: u._id || u.id,
        name: u.fullName || u.name || "System User",
        email: u.email || "",
        phone: u.phone || u.contactNo || "--",
        role: u.role,
        assignments: userAssignmentsMap[u._id || u.id] || [],
      }));

      setUsers(formattedUserRows);
    } catch (err: any) {
      console.error("Error fetching event system user assignments:", err);
      setErrorFeedback(err.message || "Failed to load system user assignments.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchAssignmentsAndSessions();
    }
  }, [eventId]);

  // Opening the popup starts from the selected user's current sessions (or "All sessions")
  const openAssignModal = () => {
    setErrorFeedback(null);
    const only = selectedUserIds.length === 1 ? users.find((u) => u.id === selectedUserIds[0]) : undefined;
    const current = only?.assignments.find((a) => a.eventId === eventId);
    setSessionScope(current && current.sessions.length > 0 ? current.sessions.map((s) => s.id) : null);
    setIsAssignModalOpen(true);
  };

  const toggleExpand = (id: string) => {
    if (expandedUserIds.includes(id)) {
      setExpandedUserIds(expandedUserIds.filter((i) => i !== id));
    } else {
      setExpandedUserIds([...expandedUserIds, id]);
    }
  };

  const toggleSelectUser = (id: string) => {
    if (selectedUserIds.includes(id)) {
      setSelectedUserIds(selectedUserIds.filter((i) => i !== id));
    } else {
      setSelectedUserIds([...selectedUserIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedUserIds.length === filteredUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredUsers.map((u) => u.id));
    }
  };

  // Handle unassigning via DELETE /api/v1/assignments/:assignmentId
  const handleUnassignAssignment = async (assignmentId: string) => {
    if (!(await confirm({ title: "Remove assignment?", message: "This system user will no longer be assigned to this event.", confirmText: "Remove", tone: "danger" }))) return;

    try {
      setErrorFeedback(null);
      const res = await assignmentService.deleteAssignment(assignmentId);
      if (res.success || (res as any).data?.deleted) {
        await fetchAssignmentsAndSessions();
        notifyDbUpdate();
      } else {
        setErrorFeedback(res.message || "Failed to unassign system user.");
      }
    } catch (err: any) {
      setErrorFeedback(err.message || "Error unassigning system user.");
    }
  };

  // Handle assign submission via POST /api/v1/events/:eventId/assignments
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUserIds.length === 0) {
      setErrorFeedback("Please select at least one system user.");
      return;
    }
    if (sessionScope !== null && sessionScope.length === 0) {
      setErrorFeedback("Select at least one session, or choose \"All sessions\".");
      return;
    }

    try {
      setSubmittingAssign(true);
      setErrorFeedback(null);

      const errors: string[] = [];

      for (const targetUserId of selectedUserIds) {
        const existing = users
          .find((u) => u.id === targetUserId)
          ?.assignments.find((a) => a.eventId === eventId);
        const res = await assignmentService.saveAssignment(eventId, targetUserId, sessionScope ?? [], existing?.assignmentId);

        if (!res.success) {
          errors.push(res.message || "Assignment failed.");
        }
      }

      if (errors.length > 0) {
        setErrorFeedback(errors.join(". "));
      }

      // Only confirm success when at least one assignment was actually saved
      setIsAssignModalOpen(false);
      // Never carry a previous selection or session scope into the next assignment
      setSelectedUserIds([]);
      setSessionScope(null);
      if (errors.length < selectedUserIds.length) {
        setIsAssignSuccessModalOpen(true);
      }
      await fetchAssignmentsAndSessions();
      notifyDbUpdate();
    } catch (err: any) {
      setErrorFeedback(err.message || "Error saving assignment.");
    } finally {
      setSubmittingAssign(false);
    }
  };

  const eventUsers = showAllSystemUsers ? users : users.filter((u) => u.assignments.some((assignment) => assignment.eventId === eventId));
  const filteredUsers = eventUsers.filter((u) => {
    return (
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.phone.includes(searchQuery)
    );
  });

  const isAllSelected = selectedUserIds.length === filteredUsers.length && filteredUsers.length > 0;
  // Figma 217:19768 shows only the empty state (no select-all row or table headers) when nobody is assigned yet
  const showEmptyAssigned = !isLoading && users.length > 0 && filteredUsers.length === 0 && !showAllSystemUsers && !searchQuery.trim();

  return (
    <div className="w-full min-h-full bg-white text-gray-900 font-sans select-none">
      <PageHeader title={user?.role === "ORGANIZER" ? "Event Management" : "Event"} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />

      {/* Page Content */}
      <div className="px-4 sm:px-6 pt-[30px] pb-24 w-full space-y-6 relative bg-white">
        {/* Sub-Navigation Tabs Bar */}
        <EventSubNav
          eventId={eventId}
          activeTab="assign-users"
          // Users assigned to this event (not to any event), once the list has loaded
          assignmentsCount={isLoading ? undefined : users.filter((u) => u.assignments.some((a) => a.eventId === eventId)).length}
          sessionsCount={isLoading ? undefined : sessions.length}
        />

        {/* Error Notification Banner */}
        {errorFeedback && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
            <span>{errorFeedback}</span>
            <button
              onClick={() => setErrorFeedback(null)}
              className="font-bold text-rose-600 hover:text-rose-800 ml-4 cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Controls (Figma 217:19779): "System Users" + search, assigned/all filter, Add User. Assigning starts from
            the selected rows (bottom "Assign N users"), so the separate top "Assign Users" button is gone (organiser feedback). */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <div className="flex flex-1 items-center gap-2.5 min-w-0">
            <label htmlFor="system-user-search" className="text-[17px] font-medium text-black shrink-0">System Users</label>
            <div className="relative flex-1 min-w-0">
              <Image src="/icons/events/search.svg" alt="" width={18} height={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-60" />
              <input
                id="system-user-search"
                type="search"
                placeholder="Search system user"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-[47px] pl-12 pr-4 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs font-medium text-gray-900 placeholder:text-[#828282] focus:outline-none focus:border-[#FF651D]"
              />
            </div>
          </div>
          <div className="flex items-center shrink-0 w-fit">
            <CustomDropdown
              variant="plain"
              ariaLabel="Which system users to show"
              value={showAllSystemUsers ? "all" : "assigned"}
              onChange={(v) => { setShowAllSystemUsers(v === "all"); setSelectedUserIds([]); }}
              options={[{ value: "assigned", label: "Assigned to this event" }, { value: "all", label: "All" }]}
            />
            <Link href="/user-management/add?new=1" className="inline-flex items-center gap-2 px-6 py-[11px] bg-[#FF651D] hover:bg-[#E5520F] text-white text-base font-semibold rounded-lg">
              <Image src="/icons/events/add-white.svg" alt="" width={24} height={24} />
              Add User
            </Link>
          </div>
        </div>

        {/* Select All Row */}
        <div className={`${showEmptyAssigned ? "hidden" : "flex"} items-center gap-2.5 text-sm text-[#4B4F52] font-medium pt-2 pb-2`}>
          <input
            type="checkbox"
            id="selectAll"
            checked={isAllSelected}
            onChange={handleSelectAll}
            className="rounded border-gray-300 text-[#FF5B22] focus:ring-[#FF5B22] cursor-pointer"
          />
          <label htmlFor="selectAll" className="cursor-pointer">
            Select All ({selectedUserIds.length} selected)
          </label>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className={showEmptyAssigned ? "hidden" : undefined}>
              <tr className="border-b border-[#D3D3D3] text-[#828282] font-medium text-sm">
                <th className="py-3 px-4 w-10"></th>
                <th className="py-3 px-4 font-medium">User Name</th>
                <th className="py-3 px-4 font-medium">Assigned Event Sessions</th>
                <th className="py-3 px-4 font-medium">Email</th>
                <th className="py-3 px-4 font-medium">Phone Number</th>
                <th className="py-3 px-4 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-0"><TableSkeleton rows={5} cols={5} label="Loading system users" /></td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500 text-sm">
                    {users.length === 0 ? (
                      <span>No SYSTEM_USER accounts found. <Link href="/user-management/add?new=1" className="font-semibold text-[#E5520F] underline">Add User</Link>.</span>
                    ) : !showAllSystemUsers && !searchQuery.trim() ? (
                      // Figma 217:19798 empty state; "Assign User" lists every system user to pick from
                      <div className="flex flex-col items-center gap-[26px] py-16 max-w-[344px] mx-auto whitespace-normal">
                        <Image src="/icons/events/users-empty.svg" alt="" width={80} height={67} />
                        <p className="text-lg font-medium text-black/50">No system users assigned yet. Assign system users to your event now.</p>
                        <button type="button" onClick={() => setShowAllSystemUsers(true)} className="px-6 py-[11px] bg-[#F3F3F3] hover:bg-[#EAEAEA] rounded-lg text-base font-semibold text-[#FF651D] cursor-pointer">
                          Assign User
                        </button>
                      </div>
                    ) : (
                      "No system users match your search."
                    )}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSelected = selectedUserIds.includes(u.id);
                  const isExpanded = expandedUserIds.includes(u.id);
                  const isActionActive = activeActionId === u.id;
                  const countText = getAssignedCountText(u.assignments);

                  return (
                    <tr key={u.id} className="hover:bg-gray-50/80 transition-colors align-top">
                      <td className="py-4 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectUser(u.id)}
                          className="rounded border-gray-300 text-[#FF5B22] focus:ring-[#FF5B22] cursor-pointer mt-0.5"
                        />
                      </td>

                      <td className="py-4 px-4 font-medium text-gray-900">
                        <div>{u.name}</div>
                        <span className="text-[10px] font-mono text-[#FF5B22] bg-[#FF5B22]/10 px-1.5 py-0.5 rounded">
                          SYSTEM_USER
                        </span>
                      </td>

                      {/* Assigned Sessions */}
                      <td className="py-4 px-4">
                        <button
                          type="button"
                          onClick={() => toggleExpand(u.id)}
                          className="flex items-center gap-2 font-bold text-gray-800 hover:text-[#FF5B22] transition-colors cursor-pointer"
                        >
                          <svg
                            className={`w-3.5 h-3.5 text-gray-700 transform transition-transform duration-200 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          <span>{countText}</span>
                        </button>

                        {/* Expanded Cards View */}
                        {isExpanded && u.assignments && u.assignments.length > 0 && (
                          <div className="mt-3 space-y-3 max-w-sm text-left">
                            {u.assignments.map((asn) => (
                              <div
                                key={asn.assignmentId}
                                className="bg-white border border-gray-200 rounded-md p-3 shadow-2xs space-y-2 whitespace-normal"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="text-xs font-semibold text-gray-800">
                                    {asn.eventName}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleUnassignAssignment(asn.assignmentId)}
                                    className="text-rose-600 underline text-xs font-semibold hover:text-rose-800 cursor-pointer"
                                  >
                                    Unassign
                                  </button>
                                </div>

                                {asn.assignedBy && (
                                  <div className="text-[10px] text-gray-500">
                                    Assigned by: <span className="font-medium text-gray-700">{asn.assignedBy}</span>
                                    {asn.assignedAt ? ` on ${asn.assignedAt}` : ""}
                                  </div>
                                )}

                                <div className="space-y-1.5 pt-1">
                                  {asn.sessions.map((sess) => (
                                    <div key={sess.id} className="flex items-center gap-2 flex-wrap">
                                      <div className="inline-flex items-center bg-[#FF5B22] text-white px-2.5 py-1 rounded-md text-[10px] font-bold tracking-tight uppercase">
                                        • {sess.name} {sess.time ? `| ${sess.time}` : ""}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 text-gray-600">{u.email}</td>
                      <td className="py-4 px-4 text-gray-600">{u.phone}</td>

                      <td className="py-4 px-4 text-right relative">
                        <button
                          type="button"
                          onClick={() => setActiveActionId(isActionActive ? null : u.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 10a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Control Bar */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1 text-xs">
            <button className="w-8 h-8 rounded border border-[#FF5B22] text-[#FF5B22] font-bold flex items-center justify-center">
              1
            </button>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
            <button
              type="button"
              onClick={openAssignModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-[#FF5B22] text-[#FF5B22] hover:bg-[#FF5B22] hover:text-white font-bold text-xs rounded-md transition-colors cursor-pointer"
            >
              <span>Assign {selectedUserIds.length} users</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Assign Sessions Modal ── */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-overlay">
          <div className="bg-white rounded-md border border-gray-200 shadow-2xl max-w-md w-full overflow-hidden space-y-6 animate-modal">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900">Assign Sessions to Selected System Users</h3>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAssignSubmit} className="px-6 space-y-5">
              <SessionScopePicker
                sessions={sessions.map((sess, idx) => ({ id: String(sess._id || sess.id), name: sess.name || `Session ${idx + 1}` }))}
                value={sessionScope}
                onChange={setSessionScope}
              />

              {errorFeedback && (
                <p role="alert" className="text-xs font-medium text-rose-600 break-words">{errorFeedback}</p>
              )}

              <div className="pt-2 pb-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAssign}
                  className="px-6 py-2 bg-[#FF5B22] hover:bg-[#E04B16] text-white text-xs font-semibold rounded-md transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submittingAssign ? "Saving..." : "Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {isAssignSuccessModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-overlay">
          <div className="bg-white rounded-md border border-gray-200 shadow-2xl max-w-sm w-full p-8 text-center space-y-6 animate-modal">
            <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h3 className="text-lg font-bold text-gray-900">Assigned Successfully!</h3>

            <button
              onClick={() => setIsAssignSuccessModalOpen(false)}
              className="w-full py-2.5 bg-[#FF5B22] hover:bg-[#E04B16] text-white font-bold text-xs rounded-md transition-colors cursor-pointer shadow-xs"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
