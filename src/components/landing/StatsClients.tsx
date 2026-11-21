import Image from "next/image";
import Reveal from "./Reveal";
import { Container } from "./ui";

// Figma node 66:192 — headline numbers and the clients strip
const STATS = [
  { value: "500k", label: "Events hosted" },
  { value: "1,00,000+", label: "QR invitations delivered" },
  { value: "5 sec", label: "Average guest check-in time" },
  { value: "1 QR", label: "Unique entry code for every guest" },
];
// The clients shown in the strip. `w` and `h` are the file's own size; `show` is the height it is drawn at, chosen so the four look evenly weighted.
const LOGOS = [
  { src: "/icons/PFA/iconic.png", alt: "Iconic Event Planner", w: 287, h: 211, show: 66 },
  { src: "/icons/PFA/RotaryMBS-Simple_RGB.png", alt: "Rotary", w: 300, h: 113, show: 50 },
  { src: "/icons/PFA/TCLG_Logo.png", alt: "TCLG: Events, Sports, Travel", w: 118, h: 56, show: 56 },
  { src: "/icons/PFA/Tillotama.png", alt: "Tillotama", w: 72, h: 20, show: 30 },
];

export default function StatsClients() {
  return (
    <section id="clients" className="scroll-mt-[69px] bg-white py-14 sm:py-20">
      <Container className="flex flex-col gap-11">
        <dl className="grid grid-cols-2 gap-6 text-center sm:gap-6 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} variant="up" delay={i * 80} className="flex flex-col gap-1.5">
              <dd className="order-1 font-[family-name:var(--font-dm-sans)] text-[32px] font-medium leading-[1.2] text-black sm:text-[42px]">{s.value}</dd>
              <dt className="order-2 text-[14px] text-[#4A5470] sm:text-[15px]">{s.label}</dt>
            </Reveal>
          ))}
        </dl>
        <Reveal variant="up" delay={120} className="flex flex-col items-center gap-5 border-t border-[#E1E7F2] pt-8">
          <p className="text-center text-[15px] text-[#4A5470] sm:text-[17px]">Trusted by event planners, agencies and families</p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-5">
            {LOGOS.map((l) => (
              <Image key={l.src} src={l.src} alt={l.alt} width={l.w} height={l.h} style={{ height: l.show, width: "auto" }} className="object-contain" />
            ))}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
