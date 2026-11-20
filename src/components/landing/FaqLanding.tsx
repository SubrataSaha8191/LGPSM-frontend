"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Container, Headline } from "./ui";
import Reveal from "./Reveal";

// Figma node 66:7062. The first answer is the design's own wording; the others are written from how the product works.
const FAQS = [
  { q: "How do my guests receive their invitation?", a: "Each guest receives their invitation by email and WhatsApp, using the email address and mobile number in your guest list. Every invitation carries a unique QR code for that guest." },
  { q: "Do guests need to download an app?", a: "No. Guests open their invitation from the email or WhatsApp message and show the QR code at the entrance. Only your staff use the EventQRapp mobile app to scan guests in." },
  { q: "Can I use my own card design?", a: "Yes. Pick a ready template, or upload your own design as a JPG, PNG or WEBP image (9:16 portrait, up to 5 MB). You see a live phone preview before anything is sent." },
  { q: "What is a session?", a: "A session is one part of your event, such as Entry, Lunch or the VIP dinner. Each session has its own time, guest list and entry rule, so only the people you choose get through each door." },
  { q: "What does \"Only Once\" access mean?", a: "With Only Once, a guest's QR code can be used a single time for that session. With No Restrictions, the same guest can be scanned in as often as they like." },
  { q: "How do I add my guest list?", a: "Download the sample Excel sheet, fill in names, emails and mobile numbers, and upload it. You can preview and fix any row before saving, and add more guests to any session later." },
  { q: "How much does it cost?", a: "There is no subscription. You pay per invitee when you send, and you see the exact total, including GST, before any invitation goes out." },
  { q: "Can I edit the event after sending invitations?", a: "You get a clear warning before invitations go out, because the event locks once they are sent so nothing changes under your guests." },
  { q: "What if some invitations fail to deliver?", a: "You can see the delivery status for every guest: sent, received or failed. Resend to the failed ones, or to selected guests, in one click without starting over." },
  { q: "Who scans guests at the gate?", a: "Your own staff. Add them as system users, assign them to the events and sessions they manage, and they scan guests in with the EventQRapp mobile app." },
];

// Scroll distance (px) given to each question: while the section is pinned, every question gets this much scrolling before the next opens
const STEP = 64;
const NAV = 69;

export default function FaqLanding() {
  const [open, setOpen] = useState(0);
  // large screens: the section stays pinned while the questions open one after another as you scroll; small or short screens, and people
  // who ask for less motion, get the plain click-to-open list
  const [pinned, setPinned] = useState(false);
  const outer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (min-height: 780px) and (prefers-reduced-motion: no-preference)");
    const sync = () => setPinned(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!pinned) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = outer.current;
      if (!el) return;
      const runway = el.offsetHeight - (window.innerHeight - NAV);
      const start = el.getBoundingClientRect().top + window.scrollY - NAV;
      const progress = runway > 0 ? (window.scrollY - start) / runway : 0;
      // the question in view follows the scroll: it opens as you reach it, and the one you left closes
      setOpen(Math.min(FAQS.length - 1, Math.max(0, Math.floor(progress * FAQS.length))));
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (frame) cancelAnimationFrame(frame); };
  }, [pinned]);

  return (
    <section id="faq" className="scroll-mt-[69px] bg-white">
      <div ref={outer} style={pinned ? { height: `calc(100svh - ${NAV}px + ${(FAQS.length - 1) * STEP}px)` } : undefined}>
        <div className={pinned ? "sticky" : "py-14 sm:py-20"} style={pinned ? { top: NAV } : undefined}>
          <Container className={`grid grid-cols-1 gap-8 lg:grid-cols-[360px_1fr] lg:gap-16 ${pinned ? "pt-16" : ""}`}>
            <Reveal variant="left" className="flex flex-col gap-4">
              <Headline className="text-[#000B2C]">Questions, answered</Headline>
              <p className="text-[15px] leading-[1.6] text-[#4A5470]">Can&apos;t find what you need? <Link href="/contact" className="font-semibold text-[#1F65FF] hover:underline">Write to us</Link> and we&apos;ll reply within a working day.</p>
            </Reveal>
            <Reveal variant="right" delay={100} className="border-b border-[#E1EAF8]">
              {FAQS.map((f, i) => {
                const isOpen = open === i;
                return (
                  <div key={f.q} className="border-t border-[#E1EAF8]">
                    <h3>
                      <button type="button" aria-expanded={isOpen} aria-controls={`faq-a-${i}`} onClick={() => setOpen(isOpen ? -1 : i)} className="flex w-full items-center justify-between gap-4 py-4 text-left">
                        <span className={`text-[15px] font-semibold transition-colors duration-300 ${isOpen ? "text-[#1F65FF]" : "text-[#000B2C]"}`}>{f.q}</span>
                        <span aria-hidden className={`flex size-6 shrink-0 items-center justify-center rounded-full text-lg leading-none transition-colors duration-300 ${isOpen ? "bg-[#EAF1FF] text-[#1F65FF]" : "text-[#000B2C]"}`}>{isOpen ? "−" : "+"}</span>
                      </button>
                    </h3>
                    {/* the answer opens by growing, so the list eases rather than jumps */}
                    <div id={`faq-a-${i}`} role="region" className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                      <div className="overflow-hidden"><p className="pb-5 text-[15px] leading-[1.6] text-[#4A5470]">{f.a}</p></div>
                    </div>
                  </div>
                );
              })}
            </Reveal>
          </Container>
        </div>
      </div>
    </section>
  );
}
