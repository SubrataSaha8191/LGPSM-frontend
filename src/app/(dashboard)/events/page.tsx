"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import PopupMessage from "@/components/common/PopupMessage";
import { openDatePicker } from "@/utils/openDatePicker";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EventCleanupModal from "@/components/events/EventCleanupModal";
import { useAlert } from "@/context/AlertContext";
import EventCancelModal from "@/components/events/EventCancelModal";
import { eventService } from "@/services/eventService";
import { sessionService } from "@/services/sessionService";
import { useCategories } from "@/hooks/useCategories";
import { eventDisplayStatus } from "@/utils/eventUtils";
import { formatEventId } from "@/utils/formatId";
import { formatCompactDateTime } from "@/utils/dateTime";
import PageHeader from "@/components/common/PageHeader";
import EventCardThumbnail from "@/components/events/EventCardThumbnail";
import { useAuth } from "@/context/AuthContext";
import { Skeleton, SkeletonRegion, TableSkeletonRows } from "@/components/common/Skeleton";
import CustomDropdown from "@/components/common/CustomDropdown";
import Icon from "@/components/icons/Icon";
import { userService } from "@/services/userService";
import { matchesEventFilters } from "@/utils/eventFilters";

type RowStatus = "Upcoming" | "Ongoing" | "Past" | "Invitation not sent" | "Cancelled";

interface EventRow {
  id: string;
  displayId: string;
  name: string;
  organizer: string;
  categoryId: string;
  category: string;
  createdAt?: string;
  start?: string;
  end?: string;
  status: RowStatus;
  sessionsCount?: number;
  sessionNames: string[];
  inviteesCount?: number;
  canEdit: boolean;
  /** its end time has passed: offered "Delete Event" instead of "Cancel Event" */
  ended: boolean;
  /** where the event is in time (or Cancelled), shown on the organizer's cards */
  phase: "Upcoming" | "Ongoing" | "Past" | "Cancelled";
}

const STATUS_STYLE: Record<RowStatus, string> = {
  Upcoming: "bg-[#C0FFD5] text-[#0F7A33]",
  Ongoing: "bg-[#CCD2FF] text-[#2C2EB5]",
  Past: "bg-[#FFE3D7] text-[#A83800]",
  "Invitation not sent": "bg-[#FFE9C0] text-[#6F5600]",
  Cancelled: "bg-gray-200 text-gray-700",
};

// An event's card or row hovers in its status colour (the same tint as its status pill)
const STATUS_HOVER: Record<RowStatus, string> = {
  Upcoming: "hover:bg-[#C0FFD5]/50",
  Ongoing: "hover:bg-[#CCD2FF]/50",
  Past: "hover:bg-[#FFE3D7]/60",
  "Invitation not sent": "hover:bg-[#FFE9C0]/60",
  Cancelled: "hover:bg-gray-200/60",
};

// `compact` is the organiser filter drawer style (Figma 217:22781): 12px medium text, 16px padding
function FilterSelect({ value, onChange, ariaLabel, options, compact = false }: { value: string; onChange: (value: string) => void; ariaLabel: string; options: { value: string; label: string }[]; compact?: boolean }) {
  return <CustomDropdown value={value} onChange={onChange} options={options} ariaLabel={ariaLabel} compact={compact} placeholder={options[0]?.label} />;
}

interface RawEvent {
  _id?: string;
  id?: string;
  title?: string;
  status?: string;
  createdAt?: string;
  schedule?: { start?: string; end?: string };
  categoryId?: { _id?: string; name?: string } | string;
  organizerId?: { fullName?: string; profile?: { organizationName?: string } } | string;
  invitationsSent?: number;
  sessionCount?: number;
  sessionsCount?: number;
  sessions?: unknown[];
  sessionNames?: string[];
  inviteesCount?: number;
}

function toRow(e: RawEvent): EventRow {
  const id = String(e._id || e.id);
  const shown = eventDisplayStatus(e);
  const timeStatus: RowStatus = shown === "Completed" ? "Past" : (shown as RowStatus);
  const status: RowStatus = e.status === "CANCELLED" ? "Cancelled" : timeStatus === "Upcoming" && !e.invitationsSent ? "Invitation not sent" : timeStatus;
  const endAt = e.schedule?.end ? new Date(e.schedule.end).getTime() : NaN;
  const ended = e.status === "COMPLETED" || (!Number.isNaN(endAt) && endAt < Date.now());
  const cat = typeof e.categoryId === "object" ? e.categoryId : null;
  const org = typeof e.organizerId === "object" ? e.organizerId : null;
  return {
    id,
    displayId: formatEventId(id),
    name: e.title || "Untitled event",
    organizer: org?.profile?.organizationName || "Organisation not set",
    categoryId: cat?._id || (typeof e.categoryId === "string" ? e.categoryId : ""),
    category: cat?.name || "—",
    createdAt: e.createdAt,
    start: e.schedule?.start,
    end: e.schedule?.end,
    status,
    sessionsCount: e.sessionsCount ?? e.sessionCount ?? e.sessions?.length ?? e.sessionNames?.length,
    sessionNames: e.sessionNames || [],
    inviteesCount: e.inviteesCount,
    canEdit: !(e.invitationsSent && e.invitationsSent > 0),
    ended,
    phase: e.status === "CANCELLED" ? "Cancelled" : (timeStatus === "Past" || timeStatus === "Ongoing" ? timeStatus : "Upcoming"),
  };
}

// Event Status filter: where the event is in time (what its card badge says), plus "Invitation not sent" for events still to come
const STATUS_FILTERS: RowStatus[] = ["Upcoming", "Ongoing", "Past", "Invitation not sent", "Cancelled"];

function RowActions({ row, onDelete }: { row: EventRow; onDelete: (row: EventRow) => void }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!buttonRef.current?.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const toggle = () => {
    if (open) { setOpen(false); return; }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuItems = 1 + (row.canEdit && !row.ended ? 1 : 0) + (row.ended || row.status !== "Cancelled" ? 1 : 0);
    const menuHeight = menuItems * 36 + 8;
    const top = rect.bottom + menuHeight + 8 > window.innerHeight ? Math.max(8, rect.top - menuHeight - 4) : rect.bottom + 4;
    setPosition({ top, left: Math.max(8, Math.min(rect.right - 150, window.innerWidth - 158)) });
    setOpen(true);
  };
  const item = "w-full text-left px-3 py-2 text-sm hover:bg-white/10 flex items-center gap-2";
  return (
    <div className="inline-block">
      <button ref={buttonRef} type="button" onClick={toggle} aria-label={`Actions for ${row.name}`} aria-expanded={open} className="inline-flex h-6 min-w-6 items-center justify-center p-1.5 rounded text-[#6B6B6B] hover:text-gray-900 hover:bg-gray-100 cursor-pointer">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M6 10a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z" /></svg>
      </button>
      {open && position && createPortal(
        <div ref={menuRef} onClick={(e) => e.stopPropagation()} style={{ position: "fixed", ...position }} className="z-[9999] min-w-[150px] rounded-md bg-[#1E232A] text-white py-1 shadow-xl">
          <Link href={`/events/${row.id}`} className={item}>View Event</Link>
          {row.status !== "Cancelled" && !row.ended && row.canEdit && <Link href={`/events/${row.id}/edit`} className={item}>Edit Event</Link>}
          {/* a past event can only be deleted; one still to come can be cancelled */}
          {(row.ended || row.status !== "Cancelled") && (
            <button type="button" onClick={() => { setOpen(false); onDelete(row); }} className={`${item} text-rose-300 cursor-pointer`}>
              {row.ended ? "Delete Event" : "Cancel Event"}
            </button>
          )}
        </div>, document.body
      )}
    </div>
  );
}

// Organiser card menu (Figma 217:22642): dark rounded panel with a pointer, Edit and Send Invitation. Delete stays
// available as before; Edit only while no invitations have gone out (the event is locked after sending).
function OrganizerCardMenu({ row, onDelete }: { row: EventRow; onDelete: (row: EventRow) => void }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!buttonRef.current?.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) { setOpen(false); return; }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    // The 155px panel is centred under the dots, its pointer touching the button
    setPosition({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left + rect.width / 2 - 77.5, window.innerWidth - 163)) });
    setOpen(true);
  };
  const item = "flex items-center gap-1.5 py-1 text-sm font-medium text-white hover:text-[#FFB08A] cursor-pointer";
  const active = row.status !== "Cancelled" && !row.ended;
  return (
    <>
      <button ref={buttonRef} type="button" onClick={toggle} aria-label={`Actions for ${row.name}`} aria-expanded={open} className="inline-flex min-h-6 min-w-6 shrink-0 items-center justify-center -mr-2 -mt-1 px-2 py-1 rounded cursor-pointer hover:bg-gray-100">
        <Icon name="events/kebab" width={4} height={16} />
      </button>
      {open && position && createPortal(
        <div ref={menuRef} onClick={(e) => e.stopPropagation()} style={{ position: "fixed", ...position }} className="z-[9999] w-[155px] flex flex-col items-center">
          <Icon name="events/menu-arrow" width={16} height={8} />
          <div className="w-full bg-[#15191C] rounded-xl px-4 py-3 flex flex-col gap-[3px]">
            {active && row.canEdit && (
              <Link href={`/events/${row.id}/edit`} className={item}>
                <Icon name="events/edit" width={16} height={16} />
                Edit
              </Link>
            )}
            {active && (
              <Link href={`/events/${row.id}/invitees`} className={item}>
                <Icon name="events/send" width={16} height={16} />
                Send Invitation
              </Link>
            )}
            {active && (
              <button type="button" onClick={() => { setOpen(false); onDelete(row); }} className={`${item} text-rose-300`}>
                <Icon name="events/trash" width={16} height={16} />
                Cancel Event
              </button>
            )}
            {row.ended && (
              <button type="button" onClick={() => { setOpen(false); onDelete(row); }} className={`${item} text-rose-300`}>
                <Icon name="events/trash" width={16} height={16} />
                Delete Event
              </button>
            )}
            {!active && !row.ended && <span className="py-1 text-sm text-[#BDBDBD]">Event cancelled</span>}
          </div>
        </div>, document.body
      )}
    </>
  );
}

// Organiser event card (Figma 217:22621): 56px card thumbnail, category tag, title, start/end, invite count, sessions
function OrganizerEventCard({ row, onOpen, onDelete }: { row: EventRow; onOpen: () => void; onDelete: (row: EventRow) => void }) {
  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`Open ${row.name}`}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}
      className={`bg-white border border-[#E2E2E2] rounded-lg p-6 flex gap-6 items-start drop-shadow-[0_4px_2px_rgba(0,0,0,0.08)] cursor-pointer ${STATUS_HOVER[row.phase]} focus-visible:outline focus-visible:outline-2 focus-visible:outline-black min-w-0`}
    >
      <EventCardThumbnail eventId={row.id} label={row.name} />
      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="flex flex-col gap-1.5 items-start">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-[3px] border border-[#FF651D] rounded-[3px] text-xs font-medium text-[#C44200]">{row.category === "—" ? "Event" : `${row.category} Event`}</span>
            <span className={`px-2.5 py-[3px] rounded-full text-xs font-medium ${STATUS_STYLE[row.phase]}`}>{row.phase}</span>
          </div>
          <h2 className="text-base font-medium text-[#15191C] break-words">{row.name}</h2>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-[#6B6B6B]">
            <span><span className="font-bold text-[#15191C]">Start: </span>{formatCompactDateTime(row.start, "—")}</span>
            <span aria-hidden className="w-px h-4 bg-[#969696]" />
            <span><span className="font-bold text-[#15191C]">End: </span>{formatCompactDateTime(row.end, "—")}</span>
          </div>
        </div>
        <p className="text-xs font-medium text-[#15191C]"># of invites: {row.inviteesCount ?? "—"}</p>
        <p className="flex gap-2 text-xs font-medium min-w-0">
          <span className="text-[#6B6B6B] shrink-0">Sessions:</span>
          <span className="text-[#15191C] truncate">{row.sessionNames.length ? row.sessionNames.join(", ") : "None yet"}</span>
        </p>
      </div>
      <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
        <OrganizerCardMenu row={row} onDelete={onDelete} />
      </div>
    </div>
  );
}

export default function EventListingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isOrganizer = user?.role === "ORGANIZER";
  const categories = useCategories();
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [organizerOptions, setOrganizerOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedOrganizerId, setSelectedOrganizerId] = useState("");
  const [organizerError, setOrganizerError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ name: "", organizer: "", category: "", sessions: "", status: "", from: "", to: "" });
  const [draftFilters, setDraftFilters] = useState(filters);
  const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({});
  const [applyingFilters, setApplyingFilters] = useState(false);
  const [filterApplyError, setFilterApplyError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<EventRow | null>(null);
  const { showAlert } = useAlert();

  // The skeleton is for the first load; a refresh after cancelling or editing an event keeps the list on screen
  const loadedOnce = useRef(false);
  const loadOrganizers = useCallback(async () => {
    setOrganizerError(null);
    try {
      const res = await userService.getUsers("ORGANIZER");
      if (!res.success || !Array.isArray(res.data)) {
        setOrganizerError(res.message || "Failed to load organizers.");
        return;
      }
      setOrganizerOptions(
        res.data
          .filter((organizer) => organizer.role === "ORGANIZER")
          .map((organizer) => ({
            value: organizer._id,
            label: `${organizer.profile?.organizationName || organizer.fullName || organizer.email}${organizer.profile?.organizationName && organizer.fullName ? ` · ${organizer.fullName}` : ""}`,
          }))
      );
    } catch (error) {
      setOrganizerError(error instanceof Error ? error.message : "Failed to load organizers.");
    }
  }, []);

  useEffect(() => {
    if (isOrganizer) return;
    const timeoutId = window.setTimeout(() => {
      void loadOrganizers();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isOrganizer, loadOrganizers]);

  const quietRef = useRef(false);
  const load = useCallback(async () => {
    const quiet = quietRef.current;
    quietRef.current = false;
    if (!loadedOnce.current) setLoading(true);
    if (!quiet) setLoadError(null);
    const res = await eventService.getEvents(selectedOrganizerId ? { organizerId: selectedOrganizerId } : undefined);
    const list = Array.isArray(res.data) ? (res.data as unknown as RawEvent[]) : [];
    if (res.success) { setRows(list.map(toRow)); loadedOnce.current = true; }
    else if (!quiet) setLoadError(res.message || "Failed to load events.");
    setLoading(false);
  }, [selectedOrganizerId]);
  // statuses, invitee counts and invitation state follow changes made elsewhere
  useLiveRefresh(() => { quietRef.current = true; return load(); }, 30_000);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  const selectOrganizer = (organizerId: string) => {
    setSelectedOrganizerId(organizerId);
    setFilters((current) => ({ ...current, organizer: "" }));
    setDraftFilters((current) => ({ ...current, organizer: "" }));
  };

  const term = search.trim().toLowerCase();
  const visible = rows.filter((r) => matchesEventFilters(r, filters, term, sessionCounts[r.id]));
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const applyFilters = async () => {
    setFilterApplyError(null);
    if (draftFilters.sessions) {
      const candidates = rows.filter((r) => matchesEventFilters(r, { ...draftFilters, sessions: "" }, term));
      const missing = candidates.filter((r) => r.sessionsCount === undefined && sessionCounts[r.id] === undefined);
      if (missing.length) {
        setApplyingFilters(true);
        const counts: Record<string, number> = {};
        const failures: string[] = [];
        let cursor = 0;
        const workers = Array.from({ length: Math.min(6, missing.length) }, async () => {
          while (cursor < missing.length) {
            const row = missing[cursor++];
            try {
              const res = await sessionService.getSessions(row.id);
              if (res.success && Array.isArray(res.data)) counts[row.id] = res.data.length;
              else failures.push(row.name);
            } catch {
              failures.push(row.name);
            }
          }
        });
        await Promise.all(workers);
        setSessionCounts((prev) => ({ ...prev, ...counts }));
        setApplyingFilters(false);
        if (failures.length) {
          setFilterApplyError(`Could not load session totals for ${failures.length} event${failures.length === 1 ? "" : "s"}. Try Apply again.`);
          return;
        }
      }
    }
    setFilters(draftFilters);
    setFilterOpen(false);
  };

  const deleteDialog = deleting && (deleting.ended ? (
        <EventCleanupModal
          isOpen
          mode="delete"
          onClose={() => setDeleting(null)}
          eventId={deleting.id}
          eventTitle={deleting.name}
          onCleanupSuccess={async () => { setDeleting(null); showAlert(`"${deleting.name}" was deleted.`, "success"); await load(); }}
        />
      ) : (
        <EventCancelModal
          isOpen
          onClose={() => setDeleting(null)}
          eventId={deleting.id}
          eventTitle={deleting.name}
          onCancelled={async () => { setDeleting(null); await load(); }}
        />
      ));

  const clearFilters = () => {
    const empty = { name: "", organizer: "", category: "", sessions: "", status: "", from: "", to: "" };
    setDraftFilters(empty);
    setFilters(empty);
    setFilterOpen(false);
  };
  const drawerField = "w-full h-[47px] px-4 bg-white border border-[#E0E0E0] rounded-md text-xs font-medium text-[#15191C] focus:outline-none focus:border-black";

  // Filter drawer (Organiser 217:22772, Super Admin 422:12324): same panel, each role's own fields
  const filterDrawer = filterOpen && (
          <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="filter-title">
            <div className="absolute inset-0 bg-black/40" onClick={() => setFilterOpen(false)} />
            <div className="relative w-full max-w-[279px] bg-white h-full px-6 pt-[19.5px] pb-6 flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between">
                <h2 id="filter-title" className="flex items-center gap-2 text-base font-medium text-[#15191C]">
                  <Icon name="events/filter-dark" width={20} height={20} />
                  Filter
                </h2>
                <button type="button" onClick={() => setFilterOpen(false)} aria-label="Close filters" className="cursor-pointer">
                  <Icon name="events/close" width={16} height={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pt-8 flex flex-col gap-[13px]">
                <div className="flex flex-col gap-2">
                  {!isOrganizer && (
                    <>
                      <input aria-label="Event Name" type="text" value={draftFilters.name} onChange={(e) => setDraftFilters((f) => ({ ...f, name: e.target.value }))} placeholder="Event Name" className={`${drawerField} placeholder:text-[#6B6B6B]`} />
                      <input aria-label="Event Organizer" type="text" value={draftFilters.organizer} onChange={(e) => setDraftFilters((f) => ({ ...f, organizer: e.target.value }))} placeholder="Event Organizer" className={`${drawerField} placeholder:text-[#6B6B6B]`} />
                    </>
                  )}
                  <FilterSelect value={draftFilters.category} onChange={(v) => setDraftFilters((f) => ({ ...f, category: v }))} options={[{ value: "", label: isOrganizer ? "Event Type" : "Event Category" }, ...categories.categoryOptions]} ariaLabel={isOrganizer ? "Event Type" : "Event Category"} compact />
                  {!isOrganizer && (
                    <FilterSelect value={draftFilters.sessions} onChange={(v) => setDraftFilters((f) => ({ ...f, sessions: v }))} options={[{ value: "", label: "No. of Sessions" }, { value: "0", label: "0 sessions" }, { value: "1", label: "1 session" }, { value: "2-5", label: "2–5 sessions" }, { value: "6+", label: "6+ sessions" }]} ariaLabel="No. of Sessions" compact />
                  )}
                  <FilterSelect
                    value={draftFilters.status}
                    onChange={(v) => setDraftFilters((f) => ({ ...f, status: v }))}
                    options={[{ value: "", label: "Event Status" }, ...STATUS_FILTERS.map((st) => ({ value: st, label: st }))]}
                    ariaLabel="Event Status"
                    compact
                  />
                </div>
                <fieldset className="flex flex-col gap-[13px]">
                  <legend className="text-base font-medium text-[#15191C] mb-[13px]">Date range</legend>
                  <div className="flex flex-col gap-2">
                    {/* Shows the Figma "From" / "To" placeholder until focused, then the native date picker */}
                    {(["from", "to"] as const).map((key) => (
                      <div key={key} className="relative">
                      {/* always a date field (switching its type while it has focus made the value impossible to clear); the
                          "From" / "To" label stands in for the empty mm/dd/yyyy until the field is used */}
                      <input
                        type="date" onClick={openDatePicker}
                        value={draftFilters[key]}
                        onChange={(e) => setDraftFilters((f) => ({ ...f, [key]: e.target.value }))}
                        aria-label={key === "from" ? "From" : "To"}
                        className={`peer ${drawerField} pr-14 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-12 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer ${draftFilters[key] ? "" : "!text-transparent focus:!text-[#15191C]"}`}
                      />
                      {!draftFilters[key] && <span aria-hidden className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-medium text-[#6B6B6B] peer-focus:hidden">{key === "from" ? "From" : "To"}</span>}
                      {draftFilters[key] ? (
                        <button type="button" onClick={() => setDraftFilters((f) => ({ ...f, [key]: "" }))} aria-label={`Clear ${key === "from" ? "From" : "To"} date`} className="absolute right-11 top-1/2 -translate-y-1/2 size-5 flex items-center justify-center rounded-full text-[#4B4F52] hover:bg-gray-200 cursor-pointer">
                          <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      ) : null}
                      <Icon name="events/calendar" width={20} height={21} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
                      </div>
                    ))}
                  </div>
                </fieldset>
                <PopupMessage message={filterApplyError} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={clearFilters} className="flex-1 py-1.5 px-6 bg-white border border-[#DDD] rounded text-[13px] font-semibold text-black hover:bg-gray-50 cursor-pointer">
                  Cancel
                </button>
                <button type="button" disabled={applyingFilters} onClick={applyFilters} className="flex-1 py-1.5 px-6 bg-[#C65318] hover:bg-[#A83800] rounded text-[13px] font-semibold text-white cursor-pointer disabled:opacity-60 disabled:cursor-wait">
                  {applyingFilters ? "Loading…" : "Apply"}
                </button>
              </div>
            </div>
          </div>
        );

  // Organiser shell (Figma 217:22527 list, 217:22656 filter): "Events" search row, filter + Add, a grid of event cards
  if (isOrganizer) {
    return (
      <div className="w-full min-h-full bg-white">
        <PageHeader title="Event Management" />
        <div className="px-4 sm:px-6 pt-[30px] pb-24 w-full space-y-9">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 lg:gap-[139px]">
            <div className="flex flex-1 items-center gap-2.5 min-w-0">
              <label htmlFor="event-search" className="text-[17px] font-medium text-black shrink-0">Events</label>
              <div className="relative flex-1 min-w-0">
                <Icon name="events/search" width={18} height={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-60" />
                <input
                  id="event-search"
                  type="search"
                  placeholder="Search event names ... "
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-[47px] pl-12 pr-4 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs font-medium text-gray-900 placeholder:text-[#6B6B6B] focus:outline-none focus:border-black"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 w-fit">
              <button
                type="button"
                onClick={() => { setDraftFilters(filters); setFilterOpen(true); }}
                aria-label={`Filter events${activeFilterCount ? ` (${activeFilterCount} active)` : ""}`}
                className="relative h-[47px] p-4 rounded-md hover:bg-gray-100 cursor-pointer"
              >
                <Icon name="events/filter" width={20} height={20} />
                {activeFilterCount > 0 && <span className="absolute top-1.5 right-1.5 size-4 rounded-full bg-[#C65318] text-white text-[10px] flex items-center justify-center">{activeFilterCount}</span>}
              </button>
              <Link href="/events/add" className="inline-flex items-center gap-2 px-6 py-[11px] bg-[#C65318] hover:bg-[#A83800] text-white text-base font-semibold rounded-lg">
                <Icon name="events/add-white" width={24} height={24} />
                Add
              </Link>
            </div>
          </div>

          <PopupMessage message={loadError} action={{ label: "Try again", onClick: load }} onClose={() => setLoadError(null)} />

          {loading ? (
            <SkeletonRegion label="Loading events" className="grid grid-cols-1 lg:grid-cols-2 min-[1500px]:grid-cols-3 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} aria-hidden className="border border-[#E0E0E0] rounded-lg p-4 flex gap-4">
                  <Skeleton className="w-[60px] h-[104px] shrink-0" />
                  <div className="flex-1 space-y-3"><Skeleton className="h-3.5 w-24" /><Skeleton className="h-5 w-2/3" /><Skeleton className="h-3.5 w-full" /><Skeleton className="h-3.5 w-1/2" /></div>
                </div>
              ))}
            </SkeletonRegion>
          ) : visible.length === 0 ? (
            // a failed load is not "no events": the error banner above says what happened
            loadError && rows.length === 0 ? null : <p className="py-12 text-center text-sm text-[#6B6B6B]">
              {rows.length === 0 ? (
                <>No events yet. <Link href="/events/add" className="text-[#C44200] font-medium underline">Create your first event</Link></>
              ) : (
                "No events match your search or filters."
              )}
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 min-[1500px]:grid-cols-3 gap-6">
              {visible.map((r) => (
                <OrganizerEventCard key={r.id} row={r} onOpen={() => router.push(`/events/${r.id}`)} onDelete={setDeleting} />
              ))}
            </div>
          )}
        </div>

        {deleteDialog}

        {filterDrawer}
      </div>
    );
  }

  return (
    <div className="w-full min-h-full bg-white">
      <PageHeader title="Event" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
      <div className="p-4 sm:p-6 lg:px-9 lg:py-6 w-full space-y-4 pb-24">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <label htmlFor="event-search" className="text-base font-medium text-black shrink-0">Search</label>
          <div className="relative flex-1">
            <svg className="w-5 h-5 text-[#6B6B6B] absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="event-search"
              type="search"
              placeholder="Search event.."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-[47px] pl-11 pr-4 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-sm text-gray-900 placeholder:text-[#6B6B6B] focus:outline-none focus:border-black"
            />
          </div>
          <div className="flex items-center gap-3 shrink-0 w-fit">
            <div className="w-52">
              <CustomDropdown
                value={selectedOrganizerId}
                onChange={selectOrganizer}
                options={[{ value: "", label: "All Events" }, ...organizerOptions]}
                ariaLabel="Filter events by organizer"
                placeholder="All Events"
              />
            </div>
            <button
              type="button"
              onClick={() => { setDraftFilters(filters); setFilterOpen(true); }}
              aria-label={`Filter events${activeFilterCount ? ` (${activeFilterCount} active)` : ""}`}
              className="relative h-[47px] px-4 rounded-md text-[#6B6B6B] hover:bg-gray-100 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden><path d="M3 5h18l-7 8.5V19l-4 2v-7.5L3 5z" /></svg>
              {activeFilterCount > 0 && <span className="absolute top-2 right-2 size-4 rounded-full bg-[#C65318] text-white text-[10px] flex items-center justify-center">{activeFilterCount}</span>}
            </button>
            <Link href="/events/add" className="inline-flex items-center gap-2 px-4 py-[11px] bg-[#C65318] hover:bg-[#A83800] text-white text-base font-semibold rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Add Event
            </Link>
          </div>
        </div>

        <PopupMessage message={loadError} action={{ label: "Try again", onClick: load }} onClose={() => setLoadError(null)} />
        <PopupMessage message={organizerError} action={{ label: "Try again", onClick: loadOrganizers }} onClose={() => setOrganizerError(null)} />

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-[#D3D3D3] text-[#6B6B6B]">
                {["Event ID", "Event Name", "Organizer", "Created on", "Category", "Event Start Date", "Event End Date", "Status"].map((h) => (
                  <th key={h} className="h-[46px] px-2.5 font-medium whitespace-nowrap">{h}</th>
                ))}
                <th className="h-[46px] px-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-[#4B4F52]">
              {loading ? (
                <TableSkeletonRows rows={6} cols={9} />
              ) : visible.length === 0 ? (
                loadError && rows.length === 0 ? null : <tr>
                  <td colSpan={9} className="py-12 text-center text-[#6B6B6B]">
                    {rows.length === 0 ? (
                      <>No events yet. <Link href="/events/add" className="text-[#C44200] font-medium underline">Create your first event</Link></>
                    ) : (
                      "No events match your search or filters."
                    )}
                  </td>
                </tr>
              ) : (
                visible.map((r) => (
                  <tr key={r.id} onClick={() => router.push(`/events/${r.id}`)} onKeyDown={(e) => { if (e.key === "Enter") router.push(`/events/${r.id}`); }} tabIndex={0} role="link" aria-label={`Open ${r.name}`} className={`border-b border-[#D3D3D3] ${STATUS_HOVER[r.status]} focus-visible:outline focus-visible:outline-2 focus-visible:outline-black cursor-pointer`}>
                    <td className="h-[46px] px-2.5 font-medium whitespace-nowrap"><Link href={`/events/${r.id}`} className="inline-block min-h-6 leading-6 align-middle hover:text-[#A83800]">{r.displayId}</Link></td>
                    <td className="px-2.5 max-w-[240px]"><Link href={`/events/${r.id}`} title={r.name} className="block min-h-6 leading-6 text-gray-900 hover:text-[#A83800] truncate">{r.name}</Link></td>
                    <td className="px-2.5 max-w-[180px] truncate" title={r.organizer}>{r.organizer}</td>
                    <td className="px-2.5 whitespace-nowrap">{formatCompactDateTime(r.createdAt, "—")}</td>
                    <td className="px-2.5 whitespace-nowrap">{r.category}</td>
                    <td className="px-2.5 whitespace-nowrap">{formatCompactDateTime(r.start, "—")}</td>
                    <td className="px-2.5 whitespace-nowrap">{formatCompactDateTime(r.end, "—")}</td>
                    <td className="px-2.5"><span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_STYLE[r.status]}`}>{r.status}</span></td>
                    <td className="px-2.5 text-right" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}><RowActions row={r} onDelete={setDeleting} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteDialog}

      {filterDrawer}
    </div>
  );
}
