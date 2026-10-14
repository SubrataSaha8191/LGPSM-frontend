"use client";

import React, { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { inviteeService, CreateInviteePayload } from "@/services/inviteeService";

interface AddInviteeManualModalProps {
  isOpen: boolean;
  eventId: string;
  showCompany?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  "w-full px-3.5 py-2.5 bg-[#FAFAFA] border border-[#E0E0E0] rounded-md text-sm focus:outline-none focus:border-[#FF651D] transition-colors";

const labelClass = "block text-sm font-medium text-gray-900 mb-1";

const DIETARY_OPTIONS = [
  "None",
  "Vegetarian",
  "Vegan",
  "Gluten Free",
  "Halal",
  "Kosher",
  "Nut Free",
  "Dairy Free",
];

export default function AddInviteeManualModal({
  isOpen,
  eventId,
  showCompany = false,
  onClose,
  onSaved,
}: AddInviteeManualModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [designation, setDesignation] = useState("");
  const [dietaryPreference, setDietaryPreference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setName("");
      setEmail("");
      setMobile("");
      setCompanyName("");
      setDesignation("");
      setDietaryPreference("");
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && overlayRef.current && modalRef.current) {
      const ctx = gsap.context(() => {
        gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.22 });
        gsap.fromTo(
          modalRef.current,
          { scale: 0.85, opacity: 0, y: 16 },
          { scale: 1, opacity: 1, y: 0, duration: 0.32, ease: "back.out(1.2)" }
        );
      });
      return () => ctx.revert();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    if (!email.trim() && !mobile.trim()) {
      setError("Please provide at least an email address or a mobile number.");
      return;
    }

    const payload: CreateInviteePayload = {
      name: trimmed,
      ...(email.trim() && { email: email.trim() }),
      ...(mobile.trim() && { mobile: mobile.trim() }),
      ...(companyName.trim() && { companyName: companyName.trim() }),
      ...(designation.trim() && { designation: designation.trim() }),
      ...(dietaryPreference && { dietaryPreference }),
    };

    setSubmitting(true);
    const res = await inviteeService.createInvitee(eventId, payload);
    setSubmitting(false);

    if (!res.success) {
      setError(res.message || "Failed to add invitee. Please try again.");
      return;
    }

    onSaved();
    onClose();
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-sans"
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-lg border border-gray-200 shadow-2xl w-full max-w-md overflow-hidden my-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-invitee-manual-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id="add-invitee-manual-title" className="text-base font-bold text-gray-900">
            Add Invitee
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="px-6 py-5 space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="ai-name" className={labelClass}>
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="ai-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                className={inputClass}
                autoComplete="off"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="ai-email" className={labelClass}>
                Email Address
                <span className="text-[#828282] font-normal text-xs ml-1">(required if no mobile)</span>
              </label>
              <input
                id="ai-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. priya@example.com"
                className={inputClass}
                autoComplete="off"
              />
            </div>

            {/* Mobile */}
            <div>
              <label htmlFor="ai-mobile" className={labelClass}>
                Mobile Number
                <span className="text-[#828282] font-normal text-xs ml-1">(required if no email)</span>
              </label>
              <input
                id="ai-mobile"
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className={inputClass}
                autoComplete="off"
              />
            </div>

            {/* Company – shown for corporate events or always as optional */}
            {showCompany && (
              <div>
                <label htmlFor="ai-company" className={labelClass}>
                  Company Name
                </label>
                <input
                  id="ai-company"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className={inputClass}
                  autoComplete="off"
                />
              </div>
            )}

            {/* Designation */}
            <div>
              <label htmlFor="ai-designation" className={labelClass}>
                Designation <span className="text-[#828282] font-normal text-xs">(optional)</span>
              </label>
              <input
                id="ai-designation"
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Product Manager"
                className={inputClass}
                autoComplete="off"
              />
            </div>

            {/* Dietary Preference */}
            <div>
              <label htmlFor="ai-dietary" className={labelClass}>
                Dietary Preference <span className="text-[#828282] font-normal text-xs">(optional)</span>
              </label>
              <select
                id="ai-dietary"
                value={dietaryPreference}
                onChange={(e) => setDietaryPreference(e.target.value)}
                className={`${inputClass} cursor-pointer`}
              >
                <option value="">Select preference</option>
                {DIETARY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt === "None" ? "" : opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Error */}
            {error && (
              <div role="alert" className="px-3.5 py-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium border border-[#E0E0E0] text-gray-700 rounded-md hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-medium bg-[#FF651D] hover:bg-[#E5520F] text-white rounded-md transition-colors cursor-pointer disabled:opacity-60 min-w-[80px]"
            >
              {submitting ? (
                <span className="flex items-center gap-2 justify-center">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Adding...
                </span>
              ) : (
                "Add Invitee"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
