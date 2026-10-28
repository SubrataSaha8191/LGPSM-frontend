"use client";

import React, { useEffect, useId, useRef, useState } from "react";

interface InfoTipProps {
  /** The tooltip copy */
  text: string;
  /** Accessible name of the icon button, e.g. "About access control" */
  label?: string;
  /** Which edge of the icon the tooltip lines up with; use "right" for icons near the right edge of a panel */
  align?: "left" | "right";
  className?: string;
}

// The "information" icon + dark tooltip used across the Figma add/edit event flow (e.g. 217:29330, 2744:1799):
// a 16px grey info mark that opens a #15191C card on hover, keyboard focus or tap. Escape or a tap elsewhere closes it.
export default function InfoTip({ text, label = "More information", align = "right", className = "" }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onDown = (e: MouseEvent | TouchEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  return (
    <span
      ref={root}
      className={`relative inline-flex align-middle ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex size-4 items-center justify-center rounded-full cursor-help focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF651D]"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
          <circle cx="8" cy="8" r="8" fill="#A5A5A5" />
          <rect x="7.1" y="7" width="1.8" height="5" rx="0.9" fill="#fff" />
          <circle cx="8" cy="4.6" r="1.05" fill="#fff" />
        </svg>
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className={`absolute top-full z-40 mt-2 w-[229px] max-w-[calc(100vw-2rem)] rounded bg-[#15191C] p-3 text-left text-xs font-normal leading-4 text-white shadow-lg whitespace-normal ${align === "right" ? "right-[-6px]" : "left-[-6px]"}`}
        >
          {/* the pointer from the icon to the card */}
          <span aria-hidden className={`absolute -top-1 size-2 rotate-45 bg-[#15191C] ${align === "right" ? "right-[10px]" : "left-[10px]"}`} />
          {text}
        </span>
      )}
    </span>
  );
}
