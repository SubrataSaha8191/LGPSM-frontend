import React from "react";

// Small stroke icons for text buttons. They inherit the button's text colour (currentColor), are sized
// to sit beside 14px text, and are hidden from screen readers because the button already has a label.
type IconName = "plus" | "download" | "eye" | "send" | "resend" | "history" | "trash" | "spinner";

const PATHS: Record<Exclude<IconName, "spinner">, string> = {
  plus: "M12 5v14M5 12h14",
  download: "M12 4v11m0 0l-4-4m4 4l4-4M5 19h14",
  eye: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zm10 3a3 3 0 100-6 3 3 0 000 6z",
  send: "M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z",
  resend: "M4 4v5h5M20 20v-5h-5M5.6 15a8 8 0 0013.4 2.5M18.4 9A8 8 0 005 6.5",
  history: "M12 7v5l3 2m6-2a9 9 0 11-3-6.7M21 4v5h-5",
  trash: "M4 7h16M10 11v6m4-6v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3",
};

export default function ButtonIcon({ name, className = "w-4 h-4" }: { name: IconName; className?: string }) {
  if (name === "spinner") {
    return (
      <svg className={`${className} shrink-0 animate-spin`} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
      </svg>
    );
  }
  return (
    <svg className={`${className} shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[name]} />
    </svg>
  );
}
