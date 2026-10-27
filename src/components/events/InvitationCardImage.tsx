"use client";

import React from "react";

interface InvitationCardImageProps {
  src: string;
  alt: string;
  imageClassName?: string;
}

/** Displays the card exactly as rendered by the selected template, including its own event-date layout. */
export default function InvitationCardImage({ src, alt, imageClassName = "" }: InvitationCardImageProps) {
  return (
    <div className="absolute inset-0 flex justify-center">
      <div className="relative h-full max-w-full aspect-[393/682]">
        {/* eslint-disable-next-line @next/next/no-img-element -- invitation card is a blob URL rendered by the API */}
        <img src={src} alt={alt} className={`absolute inset-0 w-full h-full object-contain ${imageClassName}`} />
      </div>
    </div>
  );
}
