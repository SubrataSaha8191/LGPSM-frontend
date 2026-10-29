import React from "react";
import { ICONS } from "./iconData.generated";

export type IconName = keyof typeof ICONS | (string & {});

// A small decorative icon drawn inline from public/icons (see scripts/build-icons.mjs): it is part of the page HTML, so it never
// waits on a separate request and never pops in late. Colour is the SVG's own, except nav/* icons which follow the text colour.
export default function Icon({ name, width, height, className }: { name: IconName; width?: number | string; height?: number | string; className?: string }) {
  const icon = ICONS[name];
  if (!icon) return null;
  return (
    <svg
      aria-hidden
      focusable="false"
      width={width ?? icon.w}
      height={height ?? icon.h}
      viewBox={icon.viewBox}
      preserveAspectRatio="none"
      fill="none"
      className={`block shrink-0 ${className ?? ""}`}
      // static markup generated from our own files at build time, never user input
      dangerouslySetInnerHTML={{ __html: icon.body }}
    />
  );
}
