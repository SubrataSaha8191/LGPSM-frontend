"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { DietarySelection, invitationService, PublicInvitationData } from "@/services/invitationService";
import { usePageTitle } from "@/context/PageTitleContext";
import BrandLoader from "@/components/common/BrandLoader";
import CustomDropdown from "@/components/common/CustomDropdown";

interface DietaryPrompt {
  title: string;
  options: string[];
}

function getDietaryPrompts(preference?: PublicInvitationData["event"]["dietaryPreference"]): DietaryPrompt[] {
  if (!preference?.enabled || !Array.isArray(preference.options)) return [];
  const groups = preference.options.filter((option): option is { title?: string; options?: unknown[] } =>
    !!option && typeof option === "object" && !Array.isArray(option)
  );
  if (groups.length) {
    return groups
      .map((group) => ({ title: group.title?.trim() || preference.title?.trim() || "Dietary Preference", options: Array.isArray(group.options) ? group.options.map(String).map((value) => value.trim()).filter(Boolean) : [] }))
      .filter((group) => group.options.length > 0);
  }
  const options = preference.options.map(String).map((value) => value.trim()).filter(Boolean);
  return options.length ? [{ title: preference.title?.trim() || "Dietary Preference", options }] : [];
}

function restoreDietaryChoices(prompts: DietaryPrompt[], selections?: DietarySelection[], legacyValue?: string): Record<string, string> {
  if (selections?.length) {
    return Object.fromEntries(prompts.flatMap((prompt, index) => {
      const saved = selections.find((selection) => selection.title === prompt.title && prompt.options.includes(selection.value));
      return saved ? [[String(index), saved.value]] : [];
    }));
  }
  if (!legacyValue) return {};
  if (prompts.length === 1 && prompts[0].options.includes(legacyValue)) return { "0": legacyValue };
  const pieces = legacyValue.split(" · ");
  return Object.fromEntries(prompts.flatMap((prompt, index) => {
    const prefix = `${prompt.title}: `;
    const piece = pieces.find((part) => part.startsWith(prefix));
    const value = piece?.slice(prefix.length);
    return value && prompt.options.includes(value) ? [[String(index), value]] : [];
  }));
}

export default function PublicInvitationPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<PublicInvitationData | null>(null);
  const [cardImageFailed, setCardImageFailed] = useState(false);

  const eventTitle = invitationData?.event?.title;
  const rsvpEnabled = invitationData?.event?.rsvp?.enabled !== false;
  usePageTitle(eventTitle ? `Invitation: ${eventTitle}` : "Event Invitation");

  const [selectedRsvp, setSelectedRsvp] = useState<"ACCEPTED" | "DECLINED" | null>(null);
  const [dietaryChoices, setDietaryChoices] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setCardImageFailed(false);
    if (!token) {
      setError("Invitation token is missing.");
      setLoading(false);
      return;
    }

    async function fetchInvitation() {
      try {
        setLoading(true);
        const res = await invitationService.getPublicInvitation(token);
        
        let data: PublicInvitationData | null = null;
        if (res?.data && (res.data as any).event) {
          data = res.data as PublicInvitationData;
        } else if ((res as any)?.event) {
          data = res as unknown as PublicInvitationData;
        }

        if (data && data.event && data.invitee) {
          setInvitationData(data);
          setSelectedRsvp(data.invitee.rsvpStatus === "ACCEPTED" || data.invitee.rsvpStatus === "DECLINED" ? data.invitee.rsvpStatus : null);
          setDietaryChoices(restoreDietaryChoices(getDietaryPrompts(data.event.dietaryPreference), data.invitee.dietarySelections, data.invitee.dietaryPreference));
        } else {
          setError(res.message || "Invitation not found or link is invalid.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load invitation.");
      } finally {
        setLoading(false);
      }
    }

    fetchInvitation();
  }, [token]);

  const handleSubmitRsvp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    if (!selectedRsvp) {
      setError("Choose Accept or Decline before submitting your response.");
      return;
    }

    const prompts = getDietaryPrompts(invitationData?.event.dietaryPreference);
    const selections: DietarySelection[] = selectedRsvp === "ACCEPTED"
      ? prompts.flatMap((prompt, index) => dietaryChoices[String(index)] ? [{ title: prompt.title, value: dietaryChoices[String(index)] }] : [])
      : [];

    try {
      setSubmitting(true);
      setSubmitSuccessMsg(null);
      setError(null);

      const res = await invitationService.submitRsvp(token, {
        rsvpStatus: selectedRsvp,
        dietarySelections: selections,
      });

      if (res.success || (res as any).data?.message) {
        setSubmitSuccessMsg("Thank you! Your RSVP has been saved.");
        try {
          const updated = await invitationService.getPublicInvitation(token);
          const updatedData = (updated?.data && (updated.data as any).event)
            ? (updated.data as PublicInvitationData)
            : (updated as unknown as PublicInvitationData);
          if (updatedData?.invitee) {
            setInvitationData(updatedData);
            setSelectedRsvp(updatedData.invitee.rsvpStatus === "ACCEPTED" || updatedData.invitee.rsvpStatus === "DECLINED" ? updatedData.invitee.rsvpStatus : null);
            setDietaryChoices(restoreDietaryChoices(getDietaryPrompts(updatedData.event.dietaryPreference), updatedData.invitee.dietarySelections, updatedData.invitee.dietaryPreference));
          }
        } catch {
          // The RSVP has already been saved; a refresh failure must not report the submission as failed.
        }
      } else {
        setError(res.message || "Failed to submit RSVP. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit RSVP.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <BrandLoader label="Loading invitation" />;

  if (error && !invitationData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-xl border border-slate-100 text-center space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800">Invitation Not Found</h2>
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  const { event, invitee } = invitationData!;
  const locationText = event.format === "VIRTUAL"
    ? "Online event"
    : typeof event.location === "string" ? event.location : event.location?.address || "";
  const dietaryPrompts = getDietaryPrompts(event.dietaryPreference);
  const closesAt = event.rsvp?.closesAt ? new Date(event.rsvp.closesAt) : null;
  const rsvpClosed = !!closesAt && !Number.isNaN(closesAt.getTime()) && closesAt.getTime() < Date.now();
  const eventCancelled = event.status?.toUpperCase() === "CANCELLED";
  const canRespond = rsvpEnabled && !rsvpClosed && !eventCancelled;
  const startDate = event.schedule?.start ? new Date(event.schedule.start) : null;
  const endDate = event.schedule?.end ? new Date(event.schedule.end) : null;
  const formatDateTime = (d: Date | null) =>
    d && !isNaN(d.getTime())
      ? d.toLocaleString([], { dateStyle: "medium", timeStyle: "short", timeZone: event.timeZone })
      : "TBD";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-[#FF5B22] to-[#ff7b4d] px-7 py-6 text-white text-center relative">
          <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
            Event Invitation
          </span>
          <h1 className="mx-auto max-w-[24rem] min-w-0 px-2 text-xl sm:text-2xl font-extrabold leading-tight tracking-tight text-balance [overflow-wrap:anywhere]">{event.title}</h1>
          {event.format && (
            <p className="text-xs text-white/90 font-medium mt-1 uppercase tracking-wide">
              {event.format === "VIRTUAL" ? "Online event" : "In person"}
            </p>
          )}
        </div>

        {/* Card Content */}
        <div className="p-6 space-y-6">
          {!cardImageFailed && (
            <figure className="mx-auto flex max-w-[220px] flex-col items-center gap-2">
              <img
                src={invitationService.publicInvitationCardUrl(token)}
                alt={`${event.title} digital access pass for ${invitee.name}`}
                onError={() => setCardImageFailed(true)}
                className="block w-full rounded-xl border border-slate-200 bg-white object-contain shadow-lg"
              />
              <figcaption className="text-[11px] font-medium tracking-wide text-slate-500">DIGITAL ACCESS PASS</figcaption>
            </figure>
          )}

          {/* Invitee Welcome */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-slate-500 font-medium">Invited Guest</p>
              <h2 className="text-base font-bold text-slate-800 break-words">{invitee.name}</h2>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium mb-0.5">RSVP Status</p>
              {!rsvpEnabled ? (
                // RSVP not set up for this event: the same "--" placeholder used for an empty dietary preference
                <span className="text-xs font-semibold text-slate-400" aria-label="RSVP not requested">--</span>
              ) : invitee.rsvpStatus === "ACCEPTED" ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                  ACCEPTED
                </span>
              ) : invitee.rsvpStatus === "DECLINED" ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700">
                  DECLINED
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                  PENDING
                </span>
              )}
            </div>
          </div>

          {/* Event Details */}
          <div className="space-y-3">
            {event.description && (
              <p className="text-xs text-slate-600 leading-relaxed break-words whitespace-pre-line">{event.description}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs">
              {event.organizerName && (
                <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <svg className="w-4 h-4 text-[#FF5B22] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
                  </svg>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-700">Hosted by</p>
                    <p className="text-slate-500 break-words">{event.organizerName}</p>
                  </div>
                </div>
              )}

              {locationText && (
                <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <svg className="w-4 h-4 text-[#FF5B22] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-700">Location</p>
                    {event.format === "VIRTUAL" ? (
                      <p className="text-slate-500 break-words">{locationText}</p>
                    ) : (
                      <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationText)}`} target="_blank" rel="noreferrer" className="text-slate-500 break-words underline decoration-slate-300 underline-offset-2 hover:text-[#FF5B22]">
                        {locationText}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {event.schedule && (
                <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <svg className="w-4 h-4 text-[#FF5B22] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-700">Date & Time</p>
                    <p className="text-slate-500 break-words">
                      {formatDateTime(startDate)}
                      {endDate && !isNaN(endDate.getTime()) ? ` – ${formatDateTime(endDate)}` : ""}
                    </p>
                    {event.timeZone && <p className="mt-0.5 text-[10px] text-slate-400">Times shown in {event.timeZone}</p>}
                  </div>
                </div>
              )}

              {event.contactNumber && (
                <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <svg className="w-4 h-4 text-[#FF5B22] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.95.68l1.2 3.6a1 1 0 01-.5 1.2l-2.1 1.05a11.04 11.04 0 005.12 5.12l1.05-2.1a1 1 0 011.2-.5l3.6 1.2a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.16 21 3 14.84 3 7V5z" />
                  </svg>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-700">Event contact</p>
                    <a href={`tel:${event.contactNumber.replace(/[^+\d]/g, "")}`} className="text-slate-500 break-words hover:text-[#FF5B22]">{event.contactNumber}</a>
                  </div>
                </div>
              )}
            </div>

            {!!event.sessions?.length && (
              <section aria-labelledby="invitation-sessions-title" className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <h3 id="invitation-sessions-title" className="text-xs font-semibold text-slate-700">Your event sessions</h3>
                <ul className="mt-2 divide-y divide-slate-200">
                  {event.sessions.map((session, index) => (
                    <li key={`${session.name}-${session.start || index}`} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0 text-xs">
                      <span className="font-medium text-slate-700 break-words">{session.name}</span>
                      <span className="text-slate-500">
                        {session.start ? formatDateTime(new Date(session.start)) : "Time TBD"}
                        {session.end ? ` – ${formatDateTime(new Date(session.end))}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <hr className="border-slate-100" />

          {/* RSVP Form — only when the organiser asked guests to respond (the API refuses answers otherwise) */}
          {canRespond ? (
          <form onSubmit={handleSubmitRsvp} className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Respond to Invitation</h3>
              <p className="mt-1 text-xs text-slate-500">Choose whether you can attend, then submit your response.</p>
            </div>

            {error && (
              <div role="alert" aria-live="assertive" className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-600">
                {error}
              </div>
            )}

            {submitSuccessMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-medium">
                {submitSuccessMsg}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                aria-pressed={selectedRsvp === "ACCEPTED"}
                onClick={() => { setSelectedRsvp("ACCEPTED"); setError(null); }}
                className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  selectedRsvp === "ACCEPTED"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:border-emerald-300"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Accept</span>
              </button>

              <button
                type="button"
                aria-pressed={selectedRsvp === "DECLINED"}
                onClick={() => { setSelectedRsvp("DECLINED"); setDietaryChoices({}); setError(null); }}
                className={`py-3 px-4 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  selectedRsvp === "DECLINED"
                    ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:border-rose-300"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>Decline</span>
              </button>
            </div>

            {dietaryPrompts.length > 0 && (
              <fieldset className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
                <legend className="px-1 text-xs font-semibold text-slate-700">Event preferences <span className="font-normal text-slate-500">(optional)</span></legend>
                {dietaryPrompts.map((prompt, index) => (
                  <div key={`${index}-${prompt.title}`} className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700">{prompt.title}</label>
                    <CustomDropdown
                      value={dietaryChoices[String(index)] || ""}
                      onChange={(value) => setDietaryChoices((current) => ({ ...current, [String(index)]: value }))}
                      options={prompt.options.map((value) => ({ value, label: value }))}
                      placeholder="Choose an option (optional)"
                      ariaLabel={prompt.title}
                    />
                  </div>
                ))}
              </fieldset>
            )}

            {event.dietaryPreference?.enabled && dietaryPrompts.length === 0 && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                Dietary preference is enabled, but the organizer has not configured any options yet.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !selectedRsvp}
              className="w-full py-3 px-4 bg-[#FF5B22] hover:bg-[#E04B16] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving RSVP...</span>
                </>
              ) : (
                <span>Submit Response</span>
              )}
            </button>
          </form>
          ) : (
            <div role="status" className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              {!rsvpEnabled ? "RSVP is not required for this event." : eventCancelled ? "This event has been cancelled." : "The response deadline for this invitation has passed."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
