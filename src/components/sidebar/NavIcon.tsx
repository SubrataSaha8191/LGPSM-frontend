import React from "react";
import Icon from "@/components/icons/Icon";

// A nav icon drawn inline (no request, no pop-in) and tinted with the current text colour, so active items turn orange.
// The icons are the Figma exports, each already padded inside its own slot (24×24, Help 20×20), so the SVG fills the
// container exactly as the design draws it.
export default function NavIcon({ name, className = "size-6" }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center ${className}`}>
      <Icon name={`nav/${name}`} width="100%" height="100%" />
    </span>
  );
}
