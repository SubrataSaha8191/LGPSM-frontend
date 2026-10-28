import React from "react";

// Renders a nav icon tinted with the current text colour (active items turn orange).
// The icons are the Figma exports, each already padded inside its own slot (24×24, Help 20×20),
// so the mask fills the container exactly as the design draws it.
export default function NavIcon({ name, className = "size-6" }: { name: string; className?: string }) {
  const url = `url(/icons/nav/${name}.svg)`;
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
    >
      <span
        className="block bg-current"
        style={{
          width: "100%", height: "100%",
          maskImage: url, WebkitMaskImage: url,
          maskSize: "100% 100%", WebkitMaskSize: "100% 100%",
          maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat",
          maskPosition: "center", WebkitMaskPosition: "center",
        }}
      />
    </span>
  );
}
