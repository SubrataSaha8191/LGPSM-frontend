"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { reportService } from "@/services/reportService";
import { inviteeService } from "@/services/inviteeService";
import { sessionService } from "@/services/sessionService";
import { eventService } from "@/services/eventService";
import { assignmentService } from "@/services/assignmentService";
import PageHeader from "@/components/common/PageHeader";
import { addHours, formatCompactDateTime, formatDateTime, formatTime, isAfter, nextWholeHourIso } from "@/utils/dateTime";

const sameDay = (a?: string, b?: string) => !!a && !!b && new Date(a).toDateString() === new Date(b).toDateString();
import { downloadInviteeTemplate } from "@/utils/inviteeTemplate";
import DateTimePickerModal from "@/components/add-event/modals/DateTimePickerModal";
import EventSubNav from "@/components/EventSubNav";

import CustomDropdown from "@/components/common/CustomDropdown";

const ACCESS_LABELS: Record<string, string> = { NO_RESTRICTION: "No Restrictions", ONLY_ONCE: "Only Once" };

export default function EventSessionsPage() {
  const params = useParams();
  const eventId = (params?.id as string) || "";
  const { user } = useAuth();

  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [assignedUsers, setAssignedUsers] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // DatePicker Modal State
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [activeDateField, setActiveDateField] = useState<"start" | "end">("start");

  const fetchSessions = async () => {
    if (!eventId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [res, reportRes, assignRes] = await Promise.all([
        sessionService.getSessions(eventId),
        reportService.getEventReport(eventId),
        assignmentService.getEventAssignments(eventId),
      ]);
      // "System Users" column (Figma 217:22014): staff assigned to each session
      const assignments = assignRes.success && Array.isArray(assignRes.data) ? assignRes.data : [];
      setAssignedUsers(assignments.length);
      const staffBySession = new Map<string, number>();
      assignments.forEach((a) => a.sessionIds.forEach((sid) => {
        const key = String(typeof sid === "object" ? sid._id : sid);
        staffBySession.set(key, (staffBySession.get(key) ?? 0) + 1);
      }));
      // Invited counts per session come from the event report (sessionAccess-aware)
      const invitedBySession = new Map<string, number>(
        (reportRes.success && reportRes.data ? reportRes.data.sessionReports : []).map((r) => [String(r.sessionId), r.invitedCount ?? 0])
      );
      if (res?.success && Array.isArray(res.data)) {
        const mapped = res.data.map((s: any, idx: number) => {
          const id = s._id || s.id;
          const startVal = s.schedule?.start || s.startTime;
          const endVal = s.schedule?.end || s.endTime;

          return {
            _id: id,
            id: id,
            name: s.name || `Session ${idx + 1}`,
            // Figma 217:22014: "5/1/2026  10:30 AM to 03:00 PM" — the end date only when the session runs into another day
            startTime: formatCompactDateTime(startVal, "N/A"),
            endTime: endVal ? (sameDay(startVal, endVal) ? formatTime(endVal) : formatCompactDateTime(endVal)) : "",
            accessControl: ACCESS_LABELS[s.accessControl] || "No Restrictions",
            systemUsers: assignRes.success ? staffBySession.get(String(id)) ?? 0 : null,
            invitesCount: invitedBySession.get(String(id)) ?? 0,
            validateAgainstOtherSessions: s.validateAgainstOtherSessions || false,
          };
        });
        setSessions(mapped);
      } else {
        setSessions([]);
        setLoadError(res?.message || "Failed to load sessions.");
      }
    } catch (error) {
      console.error("Failed to fetch sessions from backend API:", error);
      setSessions([]);
      setLoadError("Could not reach the server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [eventId]);

  // Form State for Add Session Modal
  const [sessionName, setSessionName] = useState("");
  // ISO values; default to the event's own window once it is known
  const [startTime, setStartTime] = useState<string>(() => nextWholeHourIso());
  const [endTime, setEndTime] = useState<string>(() => addHours(nextWholeHourIso(), 4));
  const [accessControl, setAccessControl] = useState<"NO_RESTRICTION" | "ONLY_ONCE">("NO_RESTRICTION");
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!eventId) return;
    eventService.getEvent(eventId).then((res) => {
      const schedule = res.success ? (res.data as any)?.schedule : null;
      if (schedule?.start && schedule?.end) {
        setStartTime(schedule.start);
        setEndTime(schedule.end);
      }
    });
  }, [eventId]);

  const handleOpenDatePicker = (field: "start" | "end") => {
    setActiveDateField(field);
    setIsDatePickerOpen(true);
  };

  const handleSaveDatePicker = (val: string) => {
    if (activeDateField === "start") {
      setStartTime(val);
    } else {
      setEndTime(val);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedFileName(e.target.files[0].name);
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName.trim()) return;
    setFormError(null);
    if (!isAfter(endTime, startTime)) {
      setFormError("Session end must be after its start.");
      return;
    }

    try {
      const res = await sessionService.createSession(eventId, {
        name: sessionName.trim(),
        schedule: { start: startTime, end: endTime },
        accessControl,
      });

      if (res.success) {
        // Invitees from the uploaded sheet are imported into this event through the backend
        if (uploadedFile) {
          const importRes = await inviteeService.importExcel(eventId, uploadedFile);
          if (!importRes.success) {
            alert(`Session created, but the invitee file could not be imported: ${importRes.message || "unknown error"}`);
          } else if (importRes.data && importRes.data.rejected > 0) {
            alert(`Session created. ${importRes.data.imported} invitee(s) imported, ${importRes.data.rejected} row(s) rejected.`);
          }
        }
        setSessionName("");
        setUploadedFileName("");
        setUploadedFile(null);
        setIsAddModalOpen(false);
        await fetchSessions();
      } else {
        setFormError(res.message || "Failed to create session on server.");
      }
    } catch (error: any) {
      alert(error.message || "Error creating session.");
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const res = await sessionService.deleteSession(sessionId);
      if (res.success) {
        await fetchSessions();
      } else {
        alert(res.message || "Failed to delete session.");
      }
    } catch (e: any) {
      alert(e.message || "Failed to delete session.");
    }
  };

  const filteredSessions = sessions.filter((s) =>
    (s.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full min-h-full bg-white text-gray-900 font-sans">
      {/* Organiser frame 217:22014 says "Event Sessions"; the Super Admin frame 2114:5996 keeps "Event" */}
      <PageHeader title={user?.role === "ADMIN" ? "Event" : "Event Sessions"} />

      {/* Page Content - Directly on page background without card container */}
      <div className="px-4 sm:px-6 pt-[30px] pb-24 w-full space-y-8 bg-white">
          {/* Sub-Navigation Tabs Bar */}
          <EventSubNav
            eventId={eventId}
            activeTab="sessions"
            sessionsCount={isLoading ? undefined : sessions.length}
            assignmentsCount={isLoading ? undefined : assignedUsers}
          />

          {/* Controls (Figma 217:22091): "Sessions" label + search, Add Session */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 lg:gap-[139px]">
            <div className="flex flex-1 items-center gap-2.5 min-w-0">
              <label htmlFor="session-search" className="text-[17px] font-medium text-black shrink-0">Sessions</label>
              <div className="relative flex-1 min-w-0">
                <Image src="/icons/events/search.svg" alt="" width={18} height={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-60" />
                <input
                  id="session-search"
                  type="search"
                  placeholder="Search sessions"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-[47px] pl-12 pr-4 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs font-medium text-gray-900 placeholder:text-[#828282] focus:outline-none focus:border-[#FF651D]"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-[11px] bg-[#FF651D] hover:bg-[#E5520F] text-white text-base font-semibold rounded-lg cursor-pointer shrink-0 w-fit"
            >
              <Image src="/icons/events/add-white.svg" alt="" width={24} height={24} />
              Add Session
            </button>
          </div>

          {/* Sessions Data Table matching Image 2 */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-medium whitespace-nowrap">
              <thead>
                <tr className="border-b border-[#D3D3D3] text-[#828282]">
                  <th className="h-[46px] p-2.5 w-[43px] font-medium">#</th>
                  <th className="h-[46px] p-2.5 w-[270px] font-medium">Session Title</th>
                  <th className="h-[46px] p-2.5 w-[348px] font-medium">Date & Time</th>
                  <th className="h-[46px] p-2.5 w-[143px] font-medium">Total Invitees</th>
                  <th className="h-[46px] p-2.5 w-[145px] font-medium">System Users</th>
                  <th className="h-[46px] p-2.5 font-medium">Access Control</th>
                  <th className="h-[46px] p-2.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D3D3D3] text-[#4B4F52] border-b border-[#D3D3D3]">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : loadError ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-rose-600 break-words">
                      {loadError}
                    </td>
                  </tr>
                ) : filteredSessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No sessions found. Add a session to get started.
                    </td>
                  </tr>
                ) : (
                  filteredSessions.map((sess, index) => (
                    <tr key={sess._id || index} className="hover:bg-gray-50/80 transition-colors">
                      <td className="h-[46px] p-2.5">{String(index + 1).padStart(2, "0")}</td>
                      <td className="h-[46px] p-2.5">{sess.name}</td>
                      <td className="h-[46px] p-2.5">
                        {sess.startTime} {sess.endTime ? `to ${sess.endTime}` : ''}
                      </td>
                      <td className="h-[46px] p-2.5">
                        {sess.invitesCount ?? sess.totalInvitees ?? sess.maxAttendees ?? 0}
                      </td>
                      <td className="h-[46px] p-2.5">{sess.systemUsers === null || sess.systemUsers === undefined ? "—" : String(sess.systemUsers).padStart(2, "0")}</td>
                      <td className="h-[46px] p-2.5">{sess.accessControl || "No Restriction"}</td>
                      <td className="h-[46px] p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteSession(sess._id || sess.id)}
                          className="text-rose-500 hover:text-rose-700 font-semibold cursor-pointer text-sm"
                          title="Delete Session"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* Add Session Modal matching Image 1 */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsAddModalOpen(false)}
          />

          <div className="relative bg-white rounded-md shadow-2xl max-w-lg w-full p-6 space-y-5 z-10">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-200">
              <h3 className="text-sm font-bold text-gray-900">Add Session</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateSession} className="space-y-4 text-xs">
              <div>
                <label className="flex items-center justify-between text-xs font-semibold text-gray-800 mb-1">
                  <span>
                    Session Name<span className="text-[#FF5B22] ml-0.5">*</span>
                  </span>
                  <span className="text-gray-400 text-[10px]" title="Enter session name">ⓘ</span>
                </label>
                <input
                  type="text"
                  placeholder="Entry Session"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  required
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-md text-gray-800 focus:outline-none focus:border-[#FF5B22]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="flex items-center justify-between text-[11px] font-semibold text-gray-800 mb-1">
                    <span>Start Time<span className="text-[#FF5B22] ml-0.5">*</span></span>
                    <span className="text-gray-400 text-[10px]">ⓘ</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatDateTime(startTime)}
                      readOnly
                      onClick={() => handleOpenDatePicker("start")}
                      className="w-full p-2 pr-7 border border-gray-200 rounded-md text-gray-800 text-[11px] focus:outline-none focus:border-[#FF5B22] cursor-pointer"
                    />
                    <svg
                      onClick={() => handleOpenDatePicker("start")}
                      className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer hover:text-[#FF5B22]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>

                <div>
                  <label className="flex items-center justify-between text-[11px] font-semibold text-gray-800 mb-1">
                    <span>End Time<span className="text-[#FF5B22] ml-0.5">*</span></span>
                    <span className="text-gray-400 text-[10px]">ⓘ</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formatDateTime(endTime)}
                      readOnly
                      onClick={() => handleOpenDatePicker("end")}
                      className="w-full p-2 pr-7 border border-gray-200 rounded-md text-gray-800 text-[11px] focus:outline-none focus:border-[#FF5B22] cursor-pointer"
                    />
                    <svg
                      onClick={() => handleOpenDatePicker("end")}
                      className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer hover:text-[#FF5B22]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>

                <div>
                  <label className="flex items-center justify-between text-[11px] font-semibold text-gray-800 mb-1">
                    <span>Access Control</span>
                    <span className="text-gray-400 text-[10px]">ⓘ</span>
                  </label>
                  <CustomDropdown
                    value={accessControl}
                    onChange={(val) => setAccessControl(val as "NO_RESTRICTION" | "ONLY_ONCE")}
                    options={[
                      { value: "NO_RESTRICTION", label: "No Restrictions" },
                      { value: "ONLY_ONCE", label: "Only Once" },
                    ]}
                    placeholder="Access Control"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-800 mb-1">
                  Add Invitees List
                </label>
                <div className="border border-gray-200 rounded-md p-2.5 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-3">
                    <label className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded cursor-pointer transition-colors">
                      Choose File
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-xs text-gray-500 truncate">
                      {uploadedFileName || "No file chosen"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 mt-2 text-xs">
                  <div className="w-4 h-4 rounded bg-emerald-600 text-white font-bold flex items-center justify-center text-[9px]">
                    X
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadInviteeTemplate()}
                    className="text-gray-800 font-semibold underline hover:text-[#FF5B22]"
                  >
                    Download Excel Sample
                  </button>
                  <span className="text-gray-400 text-[10px]">ⓘ</span>
                </div>
              </div>

              {formError && (
                <p role="alert" className="text-xs font-medium text-rose-600 break-words">{formError}</p>
              )}

              {/* Submit button: Orange outlined button + Add Session matching Image 1 */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 border border-[#FF5B22] text-[#FF5B22] hover:bg-[#FF5B22]/5 text-xs font-semibold rounded-md transition-colors cursor-pointer inline-flex items-center gap-1.5 bg-white"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Session</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DateTime Picker Modal */}
      <DateTimePickerModal
        key={isDatePickerOpen ? `picker-${activeDateField}-${activeDateField === "start" ? startTime : endTime}` : "picker-closed"}
        isOpen={isDatePickerOpen}
        onClose={() => setIsDatePickerOpen(false)}
        onSave={handleSaveDatePicker}
        value={activeDateField === "start" ? startTime : endTime}
        title={activeDateField === "start" ? "Session start" : "Session end"}
      />
    </div>
  );
}
