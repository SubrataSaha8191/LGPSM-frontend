"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import InviteesPreviewModal from "@/components/add-event/modals/InviteesPreviewModal";
import EditInviteeModal from "@/components/add-event/modals/EditInviteeModal";
import DeleteInviteeModal from "@/components/add-event/modals/DeleteInviteeModal";
import AddInviteeChooserModal from "@/components/add-event/modals/AddInviteeChooserModal";
import AddInviteeManualModal from "@/components/add-event/modals/AddInviteeManualModal";
import CardPreviewModal from "@/components/invitees/CardPreviewModal";
import SendWarningModal from "@/components/invitees/SendWarningModal";
import PageHeader from "@/components/common/PageHeader";
import ButtonIcon from "@/components/common/ButtonIcons";
import CustomDropdown from "@/components/common/CustomDropdown";
import EventSubNav, { notifyDbUpdate } from "@/components/EventSubNav";
import { eventService } from "@/services/eventService";
import { sessionService, SessionData } from "@/services/sessionService";
import { inviteeService } from "@/services/inviteeService";
import { invitationService, InvitationData } from "@/services/invitationService";
import { useAlert } from "@/context/AlertContext";
import { formatPhoneNumber } from "@/utils/eventUtils";
import { formatDateTime } from "@/utils/dateTime";
import { downloadInviteeTemplate } from "@/utils/inviteeTemplate";
import { InviteeSheetRow, parseInviteeSheet, rowsToSheetFile } from "@/utils/inviteeSheet";
import { mergeInviteeImport } from "@/utils/mergeInviteeImport.mjs";
import { summarizeDelivery, type DeliveryOutcome } from "@/utils/deliverySummary.mjs";
import { TableSkeleton } from "@/components/common/Skeleton";

interface Invitee {
  _id: string;
  name: string;
  email?: string;
  mobile?: string;
  companyName?: string;
  company?: string;
  dietaryPreference?: string;
  invitationStatus: "PENDING" | "SENT" | "FAILED";
  rsvpStatus: "PENDING" | "ACCEPTED" | "DECLINED";
  sessionAccess?: { sessionId: string; allowed: boolean }[];
}

const INVITEE_PAGE_SIZE = 50;

type Channel = "EMAIL" | "WHATSAPP" | "BOTH";
type Feedback = { type: "success" | "error" | "info"; message: string; details?: string[] } | null;

const pill = (cls: string, text: string) => <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>{text}</span>;

// Access follows the source session for sessions that keep another session's invitees
function allowedIn(inv: Invitee, session: SessionData): boolean {
  if (!inv.sessionAccess || inv.sessionAccess.length === 0) return true;
  const target = session.inviteeSource === "COPY_SESSION" && session.sourceSessionId ? session.sourceSessionId : session._id;
  const entry = inv.sessionAccess.find((a) => String(a.sessionId) === String(target));
  return !!entry && entry.allowed !== false;
}

// Status column (Figma 217:20587): delivery state, or the guest's answer once they have replied
function InviteeStatusPill({ invitationStatus, rsvpStatus }: { invitationStatus: Invitee["invitationStatus"]; rsvpStatus: Invitee["rsvpStatus"] }) {
  if (invitationStatus === "FAILED") return pill("bg-[#FFE3D7] text-[#FF651D]", "Sending Failed");
  if (invitationStatus === "PENDING") return pill("bg-[#EDEDED] text-[#6E6E6E]", "Not Yet Sent");
  if (rsvpStatus === "ACCEPTED") return pill("bg-[#CCD2FF] text-[#2C2EB5]", "Accepted");
  if (rsvpStatus === "DECLINED") return pill("bg-[#FFE9C0] text-[#9E8C00]", "Declined");
  return pill("bg-[#C0FFD5] text-[#1A9242]", "Successfully Sent");
}

// "⋯" row menu (Figma 217:20587: dark panel with a pointer). Edit and Resend as designed; card preview and remove kept.
function InviteeRowMenu({ name, onPreview, onEdit, onResend, onRemove }: { name: string; onPreview: () => void; onEdit: () => void; onResend?: () => void; onRemove: () => void }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!position) return;
    const close = (e: MouseEvent) => {
      if (!buttonRef.current?.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node)) setPosition(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [position]);
  const toggle = () => {
    if (position) { setPosition(null); return; }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const height = 8 + 24 + (onResend ? 4 : 3) * 28;
    const below = rect.bottom + height + 8 <= window.innerHeight;
    setPosition({ top: below ? rect.bottom + 4 : Math.max(8, rect.top - height - 4), left: Math.max(8, Math.min(rect.left + rect.width / 2 - 52, window.innerWidth - 120)) });
  };
  const run = (action: () => void) => () => { setPosition(null); action(); };
  const base = "flex items-center gap-1.5 py-1 text-sm font-medium cursor-pointer text-left";
  const item = `${base} text-white hover:text-[#FFB08A]`;
  return (
    <>
      <button ref={buttonRef} type="button" onClick={toggle} aria-label={`Actions for ${name}`} aria-expanded={!!position} className="px-2 py-1 rounded hover:bg-gray-100 cursor-pointer">
        <span aria-hidden className="text-[10px] text-[#3B3B3B] tracking-[1px]">●●●</span>
      </button>
      {position && createPortal(
        <div ref={menuRef} style={{ position: "fixed", ...position }} className="z-[9999] w-[104px] flex flex-col items-center">
          <Image src="/icons/events/menu-arrow.svg" alt="" width={16} height={8} />
          <div className="w-full bg-[#15191C] rounded-xl px-4 py-3 flex flex-col gap-[3px]">
            <button type="button" onClick={run(onEdit)} className={item}><Image src="/icons/events/edit.svg" alt="" width={16} height={16} />Edit</button>
            {onResend && <button type="button" onClick={run(onResend)} className={item}><Image src="/icons/events/send.svg" alt="" width={16} height={16} />Resend</button>}
            <button type="button" onClick={run(onPreview)} className={item}>Card</button>
            <button type="button" onClick={run(onRemove)} className={`${base} text-rose-300 hover:text-rose-200`}>Remove</button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// Borderless picker from Figma 217:21076 ("Product Launch Event 2026 ▾", "All Session ▾"): 12px medium grey text
function PlainSelect({ value, onChange, options, ariaLabel, placeholder, disabled }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; ariaLabel: string; placeholder?: string; disabled?: boolean }) {
  return <CustomDropdown variant="plain" value={value} onChange={onChange} options={options} ariaLabel={ariaLabel} placeholder={placeholder} disabled={disabled} />;
}

export default function InviteesManagementPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeId = (params?.id as string) || "";
  // The sidebar "Add Invitees" flow lives under /events/select/invitees and keeps its own context
  const sidebarFlow = routeId === "select";
  const eventId = sidebarFlow ? searchParams.get("event") || "" : routeId;
  const { showAlert, confirm } = useAlert();
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [eventsOptions, setEventsOptions] = useState<{ value: string; label: string }[]>([]);
  const [event, setEvent] = useState<{ title?: string; schedule?: { start?: string; end?: string }; categoryId?: { name?: string } | string; dietaryPreference?: { enabled?: boolean } } | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [history, setHistory] = useState<InvitationData[]>([]);
  const [loading, setLoading] = useState(!!eventId);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inviteePage, setInviteePage] = useState(1);
  const [search, setSearch] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [channel, setChannel] = useState<Channel>("BOTH");
  const [busy, setBusy] = useState<null | "send" | "resend" | "import" | "access" | "clear">(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [upload, setUpload] = useState<{ file: File; rows: InviteeSheetRow[] } | null>(null);
  const [showListPreview, setShowListPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [cardFor, setCardFor] = useState<Invitee | null>(null);
  const [editing, setEditing] = useState<{ id: string; name: string; email: string; phone: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showChooser, setShowChooser] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [confirmFirstSend, setConfirmFirstSend] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const sendInFlight = useRef(false);
  const resendInFlight = useRef(false);
  const importInFlight = useRef(false);

  // Figma 217:21076 has an event picker beside the search in both the sidebar flow and an event's own tab
  useEffect(() => {
    eventService.getEvents().then((res) => {
      const list = Array.isArray(res.data) ? res.data : [];
      setEventsOptions(list.filter((e) => e.status !== "CANCELLED").map((e) => ({ value: e._id || e.id || "", label: e.title || "Untitled event" })));
    });
  }, []);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setLoadError(null);
    const [evtRes, sessRes, invRes, histRes] = await Promise.all([
      eventService.getEvent(eventId),
      sessionService.getSessions(eventId),
      inviteeService.getInvitees(eventId),
      invitationService.getInvitations(eventId),
    ]);
    if (!evtRes.success || !evtRes.data) {
      setLoadError(evtRes.message || "Event not found or you do not have access to it.");
      setLoading(false);
      return;
    }
    setEvent(evtRes.data as never);
    setSessions(sessRes.success && Array.isArray(sessRes.data) ? sessRes.data : []);
    if (invRes.success && Array.isArray(invRes.data)) setInvitees(invRes.data as unknown as Invitee[]);
    else setLoadError(invRes.message || "Failed to load invitees.");
    const h = histRes.success && histRes.data ? (Array.isArray(histRes.data) ? histRes.data : (histRes.data as { invitations?: InvitationData[] }).invitations || []) : [];
    setHistory(h);
    setSelectedIds((prev) => prev.filter((id) => (invRes.data as unknown as Invitee[] | undefined)?.some((i) => i._id === id)));
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  // Super Admin frame 2114:6535 shows RSVP as its own column; "--" when the event does not ask guests to respond
  const rsvpEnabled = (event as { rsvp?: { enabled?: boolean } } | null)?.rsvp?.enabled !== false;
  const categoryName = event && typeof event.categoryId === "object" ? event.categoryId?.name || "" : "";
  const isCorporate = /corporate/i.test(categoryName);
  // The invitation lifecycle has started once any guest was sent (or attempted) an invitation
  const lifecycleStarted = invitees.some((i) => i.invitationStatus !== "PENDING") || history.length > 0;
  // Cleared entries stay in `history` (Resend needs their ids) but are not shown in the delivery history
  const visibleHistory = history.filter((h) => !h.clearedAt);
  const notInvited = invitees.filter((i) => i.invitationStatus === "PENDING");
  // The list is newest-first, so keep the first record seen per guest: the latest delivery is the one to resend
  // and the one whose failure reason is shown
  const historyByInvitee = new Map<string, InvitationData>();
  for (const h of history) {
    const key = String(typeof h.inviteeId === "object" ? h.inviteeId?._id : h.inviteeId);
    if (!historyByInvitee.has(key)) historyByInvitee.set(key, h);
  }
  const selected = invitees.filter((i) => selectedIds.includes(i._id));
  const resendTargets = selected.map((i) => historyByInvitee.get(i._id)).filter((h): h is InvitationData => !!h?._id);
  const ownListSessions = sessions.filter((s) => s.inviteeSource !== "COPY_SESSION");

  const filterSession = sessions.find((s) => s._id === sessionFilter);
  const term = search.trim().toLowerCase();
  const filteredInvitees = invitees.filter(
    (i) =>
      (!term || [i.name, i.email, i.mobile, i.companyName].some((v) => (v || "").toLowerCase().includes(term))) &&
      (!filterSession || allowedIn(i, filterSession))
  );
  const inviteePageCount = Math.max(1, Math.ceil(filteredInvitees.length / INVITEE_PAGE_SIZE));
  const visible = filteredInvitees.slice((inviteePage - 1) * INVITEE_PAGE_SIZE, inviteePage * INVITEE_PAGE_SIZE);
  const allVisibleSelected = visible.length > 0 && visible.every((i) => selectedIds.includes(i._id));

  useEffect(() => {
    setInviteePage(1);
  }, [term, sessionFilter]);

  useEffect(() => {
    if (inviteePage > inviteePageCount) setInviteePage(inviteePageCount);
  }, [inviteePage, inviteePageCount]);

  const summarize = (results: DeliveryOutcome[], verb: string): Feedback => summarizeDelivery(results, verb, channel);

  const handleSend = async () => {
    if (sendInFlight.current) return;
    // Selected guests who were never invited, or every not-yet-invited guest when nothing is selected
    const targets = (selected.length ? selected : notInvited).filter((i) => i.invitationStatus === "PENDING");
    if (targets.length === 0) {
      showAlert(selected.length ? "The selected guests were already invited. Use Resend Invitation." : "Everyone on the list has been invited.", "info");
      return;
    }
    setBusy("send");
    sendInFlight.current = true;
    setFeedback(null);
    try {
      const res = await invitationService.sendInvitations(eventId, { inviteeIds: targets.map((t) => t._id), channel });
      const results = (res.data?.results || (res as { results?: { status: string; failureReason?: string; emailStatus?: string; whatsappStatus?: string }[] }).results || []) as { status: string; failureReason?: string; emailStatus?: string; whatsappStatus?: string }[];
      setFeedback(res.success || results.length ? summarize(results, "sent") : { type: "error", message: res.message || "Invitations could not be sent." });
      if (res.success || results.length) setSelectedIds([]);
      await load();
      notifyDbUpdate();
    } catch {
      setFeedback({ type: "error", message: "The invitation request could not reach the server. Your selections are kept; please retry." });
    } finally {
      sendInFlight.current = false;
      setBusy(null);
    }
  };

  // The first send locks the event, so it goes through the Figma warning (2001:2443); later sends go straight out
  const requestSend = () => {
    if (lifecycleStarted) handleSend();
    else setConfirmFirstSend(true);
  };

  const handleResend = async (targets: InvitationData[] = resendTargets) => {
    if (targets.length === 0 || resendInFlight.current) return;
    setBusy("resend");
    resendInFlight.current = true;
    setFeedback(null);
    try {
      const res = await invitationService.resendInvitations(eventId, { invitationIds: targets.map((h) => h._id), channel });
      const results = (res.data?.results || (res as { results?: { status: string; failureReason?: string; emailStatus?: string; whatsappStatus?: string }[] }).results || []) as { status: string; failureReason?: string; emailStatus?: string; whatsappStatus?: string }[];
      setFeedback(res.success || results.length ? summarize(results, "resent") : { type: "error", message: res.message || "Invitations could not be resent." });
      if (res.success || results.length) setSelectedIds([]);
      await load();
    } catch {
      setFeedback({ type: "error", message: "The resend request could not reach the server. Your selections are kept; please retry." });
    } finally {
      resendInFlight.current = false;
      setBusy(null);
    }
  };

  const handleClearHistory = async () => {
    const confirmed = await confirm({
      title: "Clear delivery history?",
      message: "This only clears the history list. Invitations already sent stay valid and you can still resend them. New deliveries will appear here again.",
      confirmText: "Clear history",
      tone: "danger",
    });
    if (!confirmed) return;
    setBusy("clear");
    const res = await invitationService.clearHistory(eventId);
    setBusy(null);
    if (!res.success) {
      showAlert(res.message || "The history could not be cleared. Please try again.", "error");
      return;
    }
    // Mark the local copy as cleared instead of refetching: the records stay (Resend needs their ids)
    const now = new Date().toISOString();
    setHistory((prev) => prev.map((h) => (h.clearedAt ? h : { ...h, clearedAt: now })));
    setShowHistory(false);
    showAlert("Delivery history cleared.", "success");
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = await parseInviteeSheet(file, ownListSessions.map((session) => session.name));
      if (parsed.rows.length === 0) {
        setFeedback({ type: "error", message: "The sheet has no invitee rows." });
        return;
      }
      setUpload({ file, rows: parsed.rows });
    } catch {
      setFeedback({ type: "error", message: "The file could not be read. Upload an .xlsx or .xls sheet." });
    }
  };

  const handleImport = async (rows: InviteeSheetRow[]) => {
    if (!upload || importInFlight.current) return;
    const merge = mergeInviteeImport(
      rows,
      invitees,
      ownListSessions.map((session) => ({ id: String(session._id), name: session.name }))
    );
    if (merge.rows.length > 1000) {
      setFeedback({ type: "error", message: "The combined invitee list exceeds the 1,000 row import limit. Remove some new rows or split the upload." });
      return;
    }
    setBusy("import");
    importInFlight.current = true;
    setFeedback(null);
    let res: Awaited<ReturnType<typeof inviteeService.importExcel>>;
    try {
      res = await inviteeService.importExcel(eventId, rowsToSheetFile(merge.rows, upload.file.name, ownListSessions.map((session) => session.name)));
    } catch {
      setFeedback({ type: "error", message: "The import request could not reach the server. Existing invitees are unchanged; please retry." });
      return;
    } finally {
      importInFlight.current = false;
      setBusy(null);
    }
    setUpload(null);
    if (!res.success || !res.data) {
      setFeedback({ type: "error", message: res.message || "The invitee list could not be imported." });
      return;
    }
    const d = res.data;
    const parts = [`${d.imported} added`, `${d.updated ?? 0} kept or updated`, `${merge.retained} existing pending retained`];
    if (merge.matchedExisting) parts.push(`${merge.matchedExisting} uploaded row(s) matched existing invitees`);
    if (merge.duplicateInUpload) parts.push(`${merge.duplicateInUpload} duplicate row(s) in the upload skipped`);
    if (merge.conflicts) parts.push(`${merge.conflicts} conflicting contact row(s) skipped`);
    if (merge.invalidRows) parts.push(`${merge.invalidRows} row(s) need a valid name and contact`);
    if (d.removed) parts.push(`${d.removed} removed (not in the new file)`);
    if (d.rejected) parts.push(`${d.rejected} rejected`);
    setFeedback({
      type: d.rejected ? "error" : "success",
      message: `Invitee list imported: ${parts.join(", ")}.`,
      // Row-level summary: rejected rows first, then rows whose existing guest details were kept
      details: [...(d.errors || []).map((e) => `Row ${e.row}: ${e.error}`), ...(d.notices || []).map((n) => `Row ${n.row}: ${n.message}`)].slice(0, 10),
    });
    await load();
    notifyDbUpdate();
  };

  const handleGrantAccess = async () => {
    if (!filterSession || selectedIds.length === 0) return;
    setBusy("access");
    const res = await inviteeService.bulkUpdateSessionAccess(eventId, { inviteeIds: selectedIds, sessionAccess: [{ sessionId: filterSession._id!, allowed: true }] });
    setBusy(null);
    if (res.success) {
      setFeedback({ type: "success", message: `${selectedIds.length} guest(s) can now access ${filterSession.name}.` });
      setSelectedIds([]);
      await load();
    } else {
      setFeedback({ type: "error", message: res.message || "Session access could not be updated." });
    }
  };

  const saveEdit = async (row: { id: string; name: string; email: string; phone: string }) => {
    const res = await inviteeService.updateInvitee(row.id, { name: row.name, email: row.email, mobile: row.phone });
    if (!res.success) {
      showAlert(res.message || "Failed to update invitee.", "error");
      return;
    }
    showAlert("Invitee updated.", "success");
    await load();
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    const res = await inviteeService.deleteInvitee(deletingId);
    setDeletingId(null);
    if (!res.success) {
      showAlert(res.message || "Failed to remove invitee.", "error");
      return;
    }
    showAlert("Invitee removed.", "success");
    await load();
    notifyDbUpdate();
  };

  const btn = "inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";
  // Figma send button: outlined orange, 16px semibold, washed out until something can be sent
  const primaryOutline = "inline-flex items-center gap-2 px-6 py-[11px] border border-[#FF651D] text-[#FF651D] bg-white hover:bg-orange-50 text-base font-semibold rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
  const showCompany = isCorporate;
  const showDietary = lifecycleStarted && !!event?.dietaryPreference?.enabled;

  return (
    <div className="w-full min-h-full bg-white">
      <PageHeader title={user?.role === "ORGANIZER" ? "Invitees Management" : sidebarFlow ? "Add Invitees" : "Event"} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-5 pb-24">
        {!sidebarFlow && eventId && <EventSubNav eventId={eventId} activeTab="invitees" inviteesCount={invitees.length} />}

        {feedback && (
          <div role={feedback.type === "error" ? "alert" : "status"} className={`p-3.5 rounded-md border text-sm flex items-start justify-between gap-3 ${feedback.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : feedback.type === "info" ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-rose-50 border-rose-200 text-rose-800"}`}>
            <div className="min-w-0">
              <p className="font-medium break-words">{feedback.message}</p>
              {feedback.details && feedback.details.length > 0 && (
                <ul className="list-disc pl-5 mt-1 text-xs space-y-0.5">
                  {feedback.details.map((d, i) => <li key={i} className="break-words">{d}</li>)}
                </ul>
              )}
            </div>
            <button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss" className="shrink-0 cursor-pointer opacity-70 hover:opacity-100">✕</button>
          </div>
        )}

        {!eventId ? (
          // Figma 431:550 (Add Invitation step 1): the toolbar with nothing chosen yet, then the "No invitees yet" state
          <>
            <div className="flex flex-col xl:flex-row xl:items-center gap-3">
              <div className="flex flex-1 items-center gap-2.5 min-w-0">
                <label htmlFor="invitee-search-empty" className="text-[17px] font-medium text-black shrink-0">Invitees</label>
                <div className="relative flex-1 min-w-0">
                  <Image src="/icons/events/search.svg" alt="" width={18} height={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-60" />
                  <input id="invitee-search-empty" type="search" value="" readOnly disabled placeholder="Search invitees" className="w-full h-[47px] pl-12 pr-4 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs font-medium placeholder:text-[#828282] cursor-not-allowed" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <PlainSelect
                  ariaLabel="Select event"
                  value=""
                  placeholder="Select Event"
                  onChange={(v) => router.replace(`/events/select/invitees?from=sidebar${v ? `&event=${v}` : ""}`)}
                  options={eventsOptions}
                />
                <PlainSelect ariaLabel="Select session" value="" placeholder="Select Session" onChange={() => {}} options={[]} disabled />
                <button type="button" onClick={() => showAlert("Select an event first, then add its invitees.", "info")} className="inline-flex items-center gap-2 px-6 py-[11px] bg-[#FF651D] hover:bg-[#E5520F] text-white text-base font-semibold rounded-lg cursor-pointer">
                  <Image src="/icons/events/add-white.svg" alt="" width={24} height={24} />
                  Add Invitees
                </button>
                <button type="button" disabled className={primaryOutline}>
                  <ButtonIcon name="send" />
                  Send Invitation
                </button>
              </div>
            </div>
            <div className="py-[110px] flex flex-col items-center text-center gap-4">
              <svg className="w-20 h-20 text-[#BDBDBD]" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
              </svg>
              <p className="max-w-[300px] text-base text-[#4B4F52]">No invitees yet. Add invitees to your event to get started.</p>
              <button type="button" onClick={() => showAlert("Select an event first, then add its invitees.", "info")} className="px-6 py-2 rounded-md bg-[#F6F6F6] hover:bg-gray-200 text-base font-medium text-[#FF651D] cursor-pointer">Add Invitees</button>
            </div>
          </>
        ) : loadError ? (
          <div role="alert" className="py-12 text-center space-y-3">
            <p className="text-sm text-rose-600 break-words">{loadError}</p>
            <button type="button" onClick={load} className="text-sm font-medium underline cursor-pointer">Retry</button>
          </div>
        ) : (
          <>
            {/* Controls (Figma 217:21076 / 217:20587): Invitees + search, event, session, Add Invitees, then Send — or Resend
                once everyone has been invited */}
            <div className="flex flex-col xl:flex-row xl:items-center gap-3">
              <div className="flex flex-1 items-center gap-2.5 min-w-0">
                <label htmlFor="invitee-search" className="text-[17px] font-medium text-black shrink-0">Invitees</label>
                <div className="relative flex-1 min-w-0">
                  <Image src="/icons/events/search.svg" alt="" width={18} height={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-60" />
                  <input
                    id="invitee-search"
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search invitees"
                    className="w-full h-[47px] pl-12 pr-4 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-xs font-medium text-gray-900 placeholder:text-[#828282] focus:outline-none focus:border-[#FF651D]"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* The Super Admin frame (2114:6535) has no event picker on an event's own tab */}
                {sidebarFlow && eventsOptions.length > 0 && (
                  <PlainSelect
                    ariaLabel="Event"
                    value={eventId}
                    onChange={(v) => router.replace(`/events/select/invitees?from=sidebar${v ? `&event=${v}` : ""}`)}
                    options={eventsOptions}
                  />
                )}
                {!sidebarFlow && !isAdmin && eventsOptions.length > 0 && (
                  <PlainSelect
                    ariaLabel="Event"
                    value={eventId}
                    onChange={(v) => router.push(`/events/${v}/invitees`)}
                    options={eventsOptions.some((o) => o.value === eventId) ? eventsOptions : [{ value: eventId, label: event?.title || "This event" }, ...eventsOptions]}
                  />
                )}
                <PlainSelect ariaLabel="Filter by session" value={sessionFilter} onChange={setSessionFilter} options={[{ value: "", label: "All Session" }, ...sessions.map((s) => ({ value: s._id!, label: s.name }))]} />
                <button type="button" onClick={() => setShowChooser(true)} disabled={busy !== null} className="inline-flex items-center gap-2 px-6 py-[11px] bg-[#FF651D] hover:bg-[#E5520F] text-white text-base font-semibold rounded-lg cursor-pointer disabled:opacity-50">
                  <Image src="/icons/events/add-white.svg" alt="" width={24} height={24} />
                  Add Invitees
                </button>
                {notInvited.length > 0 || !lifecycleStarted ? (
                  <button type="button" onClick={requestSend} disabled={busy !== null || notInvited.length === 0} className={`${primaryOutline}`}>
                    <ButtonIcon name={busy === "send" ? "spinner" : "send"} />
                    {busy === "send" ? "Sending..." : selected.some((i) => i.invitationStatus === "PENDING") ? `Send Invitation (${selected.filter((i) => i.invitationStatus === "PENDING").length})` : "Send Invitation"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleResend()}
                    disabled={busy !== null || resendTargets.length === 0}
                    title={resendTargets.length ? undefined : "Select guests to resend to"}
                    className={`${primaryOutline}`}
                  >
                    <ButtonIcon name={busy === "resend" ? "spinner" : "resend"} />
                    {busy === "resend" ? "Resending..." : `Resend Invitation${resendTargets.length ? ` (${resendTargets.length})` : ""}`}
                  </button>
                )}
              </div>
            </div>

            {/* Working tools the frames do not show are kept in a secondary row */}
            <div className="flex flex-wrap items-center gap-2.5">
              <input ref={fileInput} type="file" accept=".xlsx,.xls" className="sr-only" onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
              <div className="w-[230px]">
                <CustomDropdown
                  value={channel}
                  onChange={(v) => setChannel(v as Channel)}
                  ariaLabel="Delivery channel"
                    options={[
                      {
                        value: "EMAIL", label: "Email",
                        icon: (
                          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden>
                            <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-.01 0-.02.002-.03l6.966 5.226.001.001 4.397 3.297 4.397-3.297.001-.001L22 5.427c.001.01.002.02.002.03z" fill="#EA4335"/>
                            <path d="M23.927 5L12 13.5.073 5C.494 4.382 1.21 4 2 4h20c.79 0 1.506.382 1.927 1z" fill="#FBBC04"/>
                          </svg>
                        ),
                      },
                      {
                        value: "WHATSAPP", label: "WhatsApp",
                        icon: (
                          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden fill="#25D366">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        ),
                      },
                      { value: "BOTH", label: "All (Email + WhatsApp)" },
                    ]}
                />
              </div>
              <button type="button" onClick={() => downloadInviteeTemplate()} className={`${btn} border border-[#E0E0E0] text-gray-800 hover:bg-gray-50`}>
                <ButtonIcon name="download" />
                Download Excel Sample
              </button>
              <button type="button" onClick={() => setShowListPreview(true)} disabled={invitees.length === 0} className={`${btn} border border-[#E0E0E0] text-gray-800 hover:bg-gray-50`}>
                <ButtonIcon name="eye" />
                Preview List
              </button>
              {(notInvited.length > 0 || !lifecycleStarted) && (
                <button
                  type="button"
                  onClick={() => handleResend()}
                  disabled={busy !== null || resendTargets.length === 0}
                  title={lifecycleStarted ? (resendTargets.length ? undefined : "Select guests who were already invited") : "Available after invitations have been sent"}
                  className={`${btn} border border-[#E0E0E0] text-gray-800 hover:bg-gray-50`}
                >
                  <ButtonIcon name={busy === "resend" ? "spinner" : "resend"} />
                  {busy === "resend" ? "Resending..." : `Resend Invitation${resendTargets.length ? ` (${resendTargets.length})` : ""}`}
                </button>
              )}
              <button type="button" onClick={() => setShowHistory(true)} disabled={visibleHistory.length === 0} className={`${btn} border border-[#E0E0E0] text-gray-800 hover:bg-gray-50`}>
                <ButtonIcon name="history" />
                History
              </button>
            </div>

            {invitees.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#4B4F52]">
                <label className="inline-flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    aria-label="Select all visible invitees"
                    checked={allVisibleSelected}
                    onChange={(e) => setSelectedIds(e.target.checked ? [...new Set([...selectedIds, ...visible.map((i) => i._id)])] : selectedIds.filter((id) => !visible.some((v) => v._id === id)))}
                    className="size-4 accent-[#FF651D] cursor-pointer"
                  />
                  Select All
                </label>
                <span>
              {invitees.length} invitee{invitees.length === 1 ? "" : "s"}
              {lifecycleStarted && <> · {invitees.length - notInvited.length} invited · {notInvited.length} not yet invited</>}
              {selectedIds.length > 0 && <> · {selectedIds.length} selected</>}
            </span>
              </div>
            )}

            {filterSession && selectedIds.length > 0 && ownListSessions.some((s) => s._id === filterSession._id) && (
              <button type="button" onClick={handleGrantAccess} disabled={busy !== null} className={`${btn} bg-[#262A2D] text-white hover:bg-black`}>
                Give selected access to {filterSession.name}
              </button>
            )}

            {loading ? (
              <TableSkeleton rows={6} cols={7} label="Loading invitees" />
            ) : invitees.length === 0 ? (
              // Figma 217:17674: grey people mark, 16px message and a light "Add Invitees" button, centred in the page
              <div className="py-[120px] flex flex-col items-center text-center gap-4">
                <svg className="w-20 h-20 text-[#BDBDBD]" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
                <p className="max-w-[300px] text-base text-[#4B4F52]">No invitees yet. Add invitees manually or upload an Excel sheet to get started.</p>
                <button type="button" onClick={() => setShowChooser(true)} className="px-6 py-2 rounded-md bg-[#F6F6F6] hover:bg-gray-200 text-base font-medium text-[#FF651D] cursor-pointer">Add Invitees</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Figma 217:20587: one Status pill (delivery, or the guest's RSVP once given), Dietary, a ✓/✗ column per
                    session and a "⋯" menu */}
                <table className="w-full text-left text-sm min-w-[760px]">
                  <thead className="text-[#828282] border-b border-[#D3D3D3]">
                    <tr>
                      <th className="h-[46px] px-2.5 w-10" aria-label="Selection" />
                      <th className="h-[46px] px-2.5 font-medium">Name</th>
                      <th className="h-[46px] px-2.5 font-medium">Email</th>
                      <th className="h-[46px] px-2.5 font-medium">Phone Number</th>
                      {showCompany && <th className="h-[46px] px-2.5 font-medium">Company Name</th>}
                      <th className="h-[46px] px-2.5 font-medium">Status</th>
                      {isAdmin && <th className="h-[46px] px-2.5 font-medium whitespace-nowrap">RSVP Status</th>}
                      {showDietary && <th className="h-[46px] px-2.5 font-medium">Dietary Preference</th>}
                      {sessions.map((sess) => <th key={sess._id} className="h-[46px] px-2.5 font-medium whitespace-nowrap">{sess.name.replace(/\s+session$/i, "")}</th>)}
                      <th className="h-[46px] px-2.5 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D3D3D3] text-[#15191C] border-b border-[#D3D3D3]">
                    {visible.map((i) => {
                      const failure = historyByInvitee.get(i._id)?.failureReason;
                      const sentRecord = historyByInvitee.get(i._id);
                      return (
                        <tr key={i._id} className="hover:bg-gray-50/70">
                          <td className="py-3 px-2.5">
                            <input
                              type="checkbox"
                              aria-label={`Select ${i.name}`}
                              checked={selectedIds.includes(i._id)}
                              onChange={() => setSelectedIds((p) => (p.includes(i._id) ? p.filter((x) => x !== i._id) : [...p, i._id]))}
                              className="size-4 accent-[#FF651D] cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-2.5 break-words max-w-[200px]">{i.name}</td>
                          <td className="py-3 px-2.5 break-all max-w-[240px]">{i.email || "—"}</td>
                          <td className="py-3 px-2.5 whitespace-nowrap">{formatPhoneNumber(i.mobile) || "—"}</td>
                          {showCompany && <td className="py-3 px-2.5 break-words">{i.companyName || i.company || "—"}</td>}
                          <td className="py-3 px-2.5">
                            <span className="flex flex-col gap-0.5 items-start">
                              <InviteeStatusPill invitationStatus={i.invitationStatus} rsvpStatus={isAdmin ? "PENDING" : i.rsvpStatus} />
                              {/* One line keeps the row height steady; the full reason is on hover */}
                              {i.invitationStatus === "FAILED" && failure && <span title={failure} className="text-xs text-rose-600 truncate max-w-[200px]">{failure}</span>}
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="py-3 px-2.5">
                              {!rsvpEnabled ? <span className="text-[#828282]" aria-label="RSVP not requested">--</span>
                                : i.rsvpStatus === "ACCEPTED" ? pill("bg-[#CCD2FF] text-[#2C2EB5]", "Accepted")
                                : i.rsvpStatus === "DECLINED" ? pill("bg-[#FFE9C0] text-[#9E8C00]", "Declined")
                                : pill("bg-[#FFF3C4] text-[#B38A00]", "Pending")}
                            </td>
                          )}
                          {showDietary && (
                            <td className="py-3 px-2.5 text-center">
                              {i.dietaryPreference ? <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 border border-[#D3D3D3] rounded-full text-xs"><span className="size-1 rounded-full bg-[#15191C]" />{i.dietaryPreference}</span> : "--"}
                            </td>
                          )}
                          {sessions.map((sess) => (
                            <td key={sess._id} className="py-3 px-2.5">
                              {allowedIn(i, sess)
                                ? <span role="img" aria-label={`Has access to ${sess.name}`} className="text-[#1A9242] font-bold">✓</span>
                                : <span role="img" aria-label={`No access to ${sess.name}`} className="text-[#FF651D] font-bold">✕</span>}
                            </td>
                          ))}
                          <td className="py-3 px-2.5 text-right">
                            <InviteeRowMenu
                              name={i.name}
                              onPreview={() => setCardFor(i)}
                              onEdit={() => setEditing({ id: i._id, name: i.name, email: i.email || "", phone: i.mobile || "" })}
                              onResend={sentRecord?._id && i.invitationStatus !== "PENDING" ? () => handleResend([sentRecord]) : undefined}
                              onRemove={() => setDeletingId(i._id)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                    {visible.length === 0 && (
                      <tr><td colSpan={9 + sessions.length} className="py-10 text-center text-[#828282]">No invitees match the current filters.</td></tr>
                    )}
                  </tbody>
                </table>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E0E0E0] px-3 py-2.5 text-xs text-[#4B4F52]">
                  <span>
                    {filteredInvitees.length === 0 ? "No matching invitees" : `Showing ${(inviteePage - 1) * INVITEE_PAGE_SIZE + 1}–${Math.min(inviteePage * INVITEE_PAGE_SIZE, filteredInvitees.length)} of ${filteredInvitees.length}`}
                  </span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setInviteePage((page) => Math.max(1, page - 1))} disabled={inviteePage <= 1} className="rounded border border-[#E0E0E0] px-2.5 py-1.5 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
                    <span>Page {inviteePage} of {inviteePageCount}</span>
                    <button type="button" onClick={() => setInviteePage((page) => Math.min(inviteePageCount, page + 1))} disabled={inviteePage >= inviteePageCount} className="rounded border border-[#E0E0E0] px-2.5 py-1.5 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {upload && (
        <InviteesPreviewModal
          title="Invitees List Preview"
          subtitle={`${upload.file.name} · Existing pending invitees are retained; only new contacts are added.`}
          rows={upload.rows}
          showCompany={isCorporate || upload.rows.some((r) => r.company)}
          onClose={() => setUpload(null)}
          onSave={handleImport}
        />
      )}
      {showListPreview && (
        <InviteesPreviewModal
          title="Invitees List"
          subtitle={event?.title}
          rows={invitees.map((i, idx) => ({ id: String(idx + 1), name: i.name, email: i.email || "", phone: i.mobile || "", company: i.companyName || i.company || "" }))}
          showCompany={showCompany}
          onClose={() => setShowListPreview(false)}
        />
      )}
      {confirmFirstSend && (
        <SendWarningModal
          eventId={eventId}
          eventTitle={event?.title || "this event"}
          onCancel={() => setConfirmFirstSend(false)}
          onConfirm={() => { setConfirmFirstSend(false); handleSend(); }}
        />
      )}
      {cardFor && <CardPreviewModal eventId={eventId} inviteeId={cardFor._id} inviteeName={cardFor.name} onClose={() => setCardFor(null)} />}
      <EditInviteeModal isOpen={!!editing} onClose={() => setEditing(null)} invitee={editing} onSave={saveEdit} />
      <DeleteInviteeModal isOpen={!!deletingId} onClose={() => setDeletingId(null)} onConfirm={confirmDelete} />
      <AddInviteeChooserModal
        isOpen={showChooser}
        onClose={() => setShowChooser(false)}
        onChooseExcel={() => { setShowChooser(false); fileInput.current?.click(); }}
        onChooseManual={() => { setShowChooser(false); setShowManualAdd(true); }}
      />
      <AddInviteeManualModal
        isOpen={showManualAdd}
        eventId={eventId}
        existingInvitees={invitees}
        showCompany={showCompany}
        onClose={() => setShowManualAdd(false)}
        onSaved={async () => { await load(); notifyDbUpdate(); }}
      />

      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="history-title">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
              <h2 id="history-title" className="text-base font-medium text-gray-900">Invitation Delivery History</h2>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClearHistory}
                  disabled={busy !== null || visibleHistory.length === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ButtonIcon name={busy === "clear" ? "spinner" : "trash"} className="w-3.5 h-3.5" />
                  {busy === "clear" ? "Clearing..." : "Clear history"}
                </button>
                <button type="button" onClick={() => setShowHistory(false)} aria-label="Close" className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
              </div>
            </div>
            <div className="p-6 overflow-auto flex-1">
              <table className="w-full text-left text-sm min-w-[560px]">
                <thead className="text-[#828282] border-b border-[#D3D3D3]">
                  <tr><th className="py-2 pr-3 font-medium">Invitee</th><th className="py-2 pr-3 font-medium">Channel</th><th className="py-2 pr-3 font-medium">Status</th><th className="py-2 pr-3 font-medium">Reason</th><th className="py-2 font-medium">When</th></tr>
                </thead>
                <tbody className="divide-y divide-[#EEEEEE] text-[#4B4F52]">
                  {visibleHistory.map((h) => (
                    <tr key={h._id}>
                      <td className="py-2.5 pr-3 text-gray-900">{typeof h.inviteeId === "object" && h.inviteeId ? h.inviteeId.name : "—"}</td>
                      <td className="py-2.5 pr-3">{h.channel}</td>
                      <td className="py-2.5 pr-3">{h.status === "SENT" ? pill("bg-[#C0FFD5] text-[#1A9242]", "Sent") : h.status === "FAILED" ? pill("bg-rose-100 text-rose-700", "Failed") : pill("bg-gray-100 text-gray-700", h.status)}</td>
                      <td className="py-2.5 pr-3 text-rose-600 text-xs break-words max-w-[220px]">{h.failureReason || "—"}</td>
                      <td className="py-2.5 text-xs whitespace-nowrap">{formatDateTime(h.sentAt || h.createdAt, "—")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
