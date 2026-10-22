"use client";

import React, { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/common/PageHeader";
import CustomDropdown from "@/components/common/CustomDropdown";
import TemplateThumb from "@/components/settings/TemplateThumb";
import { useCategories } from "@/hooks/useCategories";
import { templateService, Template } from "@/services/templateService";
import { eventService, EventData } from "@/services/eventService";
import { useAlert } from "@/context/AlertContext";

interface TemplateCard {
  id: string;
  name: string;
  categoryId: string;
  subcategoryId: string;
  imageKey: string | null;
  isDraft: boolean;
  /** AI-generated (drawn from a stored design) */
  isCustom: boolean;
  kind: "INVITATION" | "POSTER";
  /** made by the signed-in user: they can publish, unpublish and delete it */
  isMine: boolean;
}

// Browse templates; organizers see published ones (backend-enforced), admins also see drafts
export default function TemplatesPage() {
  return (
    <Suspense fallback={<p className="py-16 text-center text-sm text-[#828282]">Loading templates...</p>}>
      <TemplatesPageContent />
    </Suspense>
  );
}

function TemplatesPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const { showAlert, confirm } = useAlert();
  const categories = useCategories();
  const [result, setResult] = useState<{ key: string; templates: TemplateCard[]; error: string | null } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategory, setSelectedSubcategory] = useState("");
  const [preview, setPreview] = useState<TemplateCard | null>(null);
  // "My templates" is a link target (the AI studio sends people there after saving)
  const [view, setView] = useState<"all" | "mine">(searchParams.get("view") === "mine" ? "mine" : "all");
  const [reload, setReload] = useState(0);
  const requestKey = `${view}:${reload}:${user?._id || ""}`;
  const loading = result?.key !== requestKey;
  const templates = result?.templates ?? [];
  const loadError = result?.key === requestKey ? result.error : null;

  useEffect(() => {
    let cancelled = false;
    const toCard = (mine: boolean) => (t: Template): TemplateCard => ({
      id: t._id || t.id || "",
      name: t.name,
      categoryId: typeof t.categoryId === "object" && t.categoryId ? t.categoryId._id : t.categoryId || "",
      subcategoryId: t.subcategoryId || "",
      imageKey: t.previewImageKey || null,
      isDraft: t.isPublished === false,
      isCustom: t.cardDesign === "CUSTOM",
      kind: t.kind === "POSTER" ? "POSTER" : "INVITATION",
      isMine: mine || (!!user?._id && t.ownerId === user._id),
    });
    templateService.getTemplates(undefined, view === "mine" ? { scope: "mine" } : {}).then((res) => {
      if (cancelled) return;
      setResult(
        res.success && Array.isArray(res.data)
          ? {
              key: requestKey,
              templates: res.data
                .filter((t: Template) => view !== "mine" || (t.cardDesign === "CUSTOM" && !!user?._id && t.ownerId === user._id))
                .map(toCard(view === "mine")),
              error: null,
            }
          : { key: requestKey, templates: [], error: res.message || "Failed to load templates." }
      );
    });
    return () => {
      cancelled = true;
    };
    // requestKey is derived from the three values below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, reload, user?._id]);

  const togglePublish = async (t: TemplateCard) => {
    const res = await templateService.updateTemplate(t.id, { isPublished: t.isDraft });
    if (res.success) {
      setPreview(null);
      setReload((n) => n + 1);
    } else {
      showAlert(res.message || "The template could not be updated.", "error");
    }
  };

  const removeTemplate = async (t: TemplateCard) => {
    if (!(await confirm({ title: "Delete template", message: `Delete "${t.name}"? Events already using it will switch to the default design for their type.`, confirmText: "Delete", tone: "danger" }))) return;
    const res = await templateService.deleteTemplate(t.id);
    if (res.success) {
      setPreview(null);
      setReload((n) => n + 1);
    } else {
      showAlert(res.message || "The template could not be deleted.", "error");
    }
  };

  const visible = templates.filter(
    (t) => (!selectedCategory || t.categoryId === selectedCategory) && (!selectedSubcategory || t.subcategoryId === selectedSubcategory)
  );
  const labelFor = (t: TemplateCard) =>
    [categories.categoryName(t.categoryId), categories.subcategoryName(t.categoryId, t.subcategoryId)].filter(Boolean).join(" · ") || "Uncategorized";

  return (
    <div className="w-full min-h-full bg-white">
      <PageHeader title="Templates" actions={<Link href="/templates/ai" className="mr-2 inline-flex items-center gap-1.5 rounded-md bg-[#FF651D] px-3 py-2 text-xs sm:text-sm font-medium text-white hover:bg-[#E5520F]"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>Design with AI</Link>} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>} />
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 pb-24">
        <div role="tablist" aria-label="Template list" className="inline-flex rounded-md bg-[#F4F5F8] p-1 text-sm">
          {([["all", "All templates"], ["mine", "My AI templates"]] as const).map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={view === key} onClick={() => { setView(key); setPreview(null); }} className={`rounded px-4 py-1.5 cursor-pointer ${view === key ? "bg-white shadow-sm font-medium text-gray-900" : "text-gray-600"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">Event Category</label>
            <CustomDropdown
              value={selectedCategory}
              onChange={(v) => {
                setSelectedCategory(v);
                setSelectedSubcategory("");
              }}
              options={[{ value: "", label: "All Categories" }, ...categories.categoryOptions]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">Event Subcategory</label>
            <CustomDropdown
              value={selectedSubcategory}
              onChange={setSelectedSubcategory}
              disabled={!selectedCategory}
              placeholder={selectedCategory ? "All Subcategories" : "Select a category first"}
              options={selectedCategory ? [{ value: "", label: "All Subcategories" }, ...categories.subcategoryOptionsFor(selectedCategory)] : []}
            />
          </div>
        </div>

        {loading ? (
          <p className="py-16 text-center text-sm text-[#828282]">Loading templates...</p>
        ) : loadError ? (
          <p role="alert" className="py-16 text-center text-sm text-rose-600 break-words">{loadError}</p>
        ) : visible.length === 0 ? (
          <p className="py-16 text-center text-sm text-[#828282]">
            {templates.length === 0
              ? view === "mine"
                ? "You haven't saved any AI templates yet."
                : "No templates are available yet."
              : "No templates match the selected category."}
            {templates.length === 0 && view === "mine" && (
              <>
                {" "}
                <Link href="/templates/ai" className="text-[#FF651D] underline">Design one with AI</Link>
              </>
            )}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {visible.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPreview(t)}
                className="text-left bg-white border border-[#E0E0E0] rounded-md overflow-hidden hover:border-[#FF651D] transition-colors cursor-pointer"
              >
                <div className="relative">
                  <TemplateThumb imageKey={t.imageKey} name={t.name} />
                  {t.isDraft && <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-white/95 border border-gray-200 text-xs text-gray-700">Draft</span>}
                  {(t.isCustom || t.kind === "POSTER") && <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/70 text-xs text-white">{t.kind === "POSTER" ? "Poster" : "AI"}</span>}
                </div>
                <div className="px-2.5 py-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                  <p className="text-xs text-[#828282] truncate">{labelFor(t)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="template-preview-title">
          <div className="bg-white rounded-lg shadow-2xl max-w-3xl w-full my-auto">
            <div className="px-6 py-4 border-b border-[#E5E5E5] flex items-center justify-between">
              <h3 id="template-preview-title" className="text-base font-medium text-gray-900">Template Preview</h3>
              <button type="button" onClick={() => setPreview(null)} aria-label="Close" className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              <TemplateThumb imageKey={preview.imageKey} name={preview.name} className="rounded-md border border-[#E0E0E0]" />
              <div className="space-y-4 min-w-0">
                <div>
                  <h4 className="text-xl font-medium text-gray-900 break-words">{preview.name}</h4>
                  <p className="text-sm text-[#4B4F52] mt-1">{labelFor(preview)}</p>
                </div>
                <p className="text-sm text-gray-800 bg-[#FEF9C3] border border-[#FEF08A] rounded-md p-3">
                  Create an event with this template to preview it with your event details.
                </p>
                {preview.isDraft ? (
                  <p className="text-sm text-[#828282]">
                    {preview.isMine ? "This template is a draft. Publish it to use it for your events." : "This template is a draft. Publish it from Template Settings before organizers can use it."}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  {!preview.isDraft && preview.kind === "INVITATION" && (
                    <Link href={`/events/add?template=${preview.id}`} className="px-5 py-2.5 bg-[#FF651D] hover:bg-[#E5520F] text-white text-sm font-medium rounded-md">
                      Create an Event
                    </Link>
                  )}
                  {preview.isMine && preview.isCustom && (
                    <button type="button" onClick={() => togglePublish(preview)} className="px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-800 text-sm font-medium rounded-md cursor-pointer">
                      {preview.isDraft ? "Publish" : "Unpublish"}
                    </button>
                  )}
                  {preview.isMine && preview.isCustom && (
                    <button type="button" onClick={() => removeTemplate(preview)} className="px-5 py-2.5 text-rose-700 hover:bg-rose-50 text-sm font-medium rounded-md cursor-pointer">
                      Delete
                    </button>
                  )}
                  {user?.role === "ADMIN" && !preview.isMine && (
                    <Link href="/settings/template" className="px-5 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-800 text-sm font-medium rounded-md">
                      Manage Templates
                    </Link>
                  )}
                </div>
                {preview.isCustom && <EventRenderPanel template={preview} />}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// Draws an AI template with a real event's details for download (posters get a registration QR when a link is given)
function EventRenderPanel({ template }: { template: TemplateCard }) {
  const [events, setEvents] = useState<EventData[]>([]);
  const [eventId, setEventId] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState<"png" | "jpeg" | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);

  useEffect(() => {
    eventService.getEvents({ limit: 100 }).then((res) => {
      if (res.success && res.data?.events) setEvents(res.data.events);
    });
  }, []);

  const download = async (format: "png" | "jpeg") => {
    if (!eventId) return;
    setBusy(format);
    setMessage(null);
    const res = await templateService.renderForEvent(template.id, { eventId, format, ...(template.kind === "POSTER" && link.trim() ? { registrationUrl: link.trim() } : {}) });
    setBusy(null);
    if (!res.ok) return setMessage({ tone: "error", text: res.message });
    const url = URL.createObjectURL(res.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.name.replace(/[^\w-]+/g, "-").toLowerCase() || "template"}.${format === "jpeg" ? "jpg" : "png"}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    if (res.qr === "NONE") setMessage({ tone: "info", text: "Downloaded without a QR code: add a registration link to include one." });
    else if (res.qr === "SAMPLE") setMessage({ tone: "info", text: "The QR code on this image is a sample. Each guest's own code is added when you send invitations." });
  };

  return (
    <div className="border-t border-[#E5E5E5] pt-4 space-y-3">
      <h5 className="text-sm font-medium text-gray-900">{template.kind === "POSTER" ? "Download a poster for an event" : "Preview with a real event"}</h5>
      <label className="block text-xs text-[#4B4F52]" htmlFor="render-event">Event</label>
      <select id="render-event" value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-full rounded-md border border-[#D9D9D9] bg-white px-3 py-2 text-sm">
        <option value="">Choose an event…</option>
        {events.map((ev) => (
          <option key={ev._id || ev.id} value={ev._id || ev.id}>{ev.title}</option>
        ))}
      </select>
      {template.kind === "POSTER" && (
        <>
          <label className="block text-xs text-[#4B4F52]" htmlFor="render-link">Registration link for the QR code (https)</label>
          <input id="render-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" inputMode="url" className="w-full rounded-md border border-[#D9D9D9] bg-white px-3 py-2 text-sm" />
        </>
      )}
      <div className="flex gap-2">
        {(["png", "jpeg"] as const).map((f) => (
          <button key={f} type="button" disabled={!eventId || busy !== null} onClick={() => download(f)} className="px-4 py-2 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 text-sm rounded-md cursor-pointer">
            {busy === f ? "Preparing…" : f === "png" ? "Download PNG" : "Download JPG"}
          </button>
        ))}
      </div>
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-xs ${message.tone === "error" ? "text-rose-600" : "text-[#4B4F52]"}`}>{message.text}</p>}
    </div>
  );
}
