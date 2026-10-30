// Plain-language lines for the cancellation dialog and the notices panel. They only restate numbers the server computed;
// nothing here estimates who will be reached or promises delivery.

import type { CancellationNotices, CancellationPreview, NoticeCounts } from "@/services/eventService";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function previewLines(p: CancellationPreview): string[] {
  const lines: string[] = [];
  if (p.invitedGuests === 0) {
    lines.push("No invitation has been sent for this event, so nobody will be notified.");
  } else {
    const channels = [
      p.byChannel.email ? `${p.byChannel.email} by email` : "",
      p.byChannel.whatsapp ? `${p.byChannel.whatsapp} by WhatsApp` : "",
    ].filter(Boolean).join(", ");
    lines.push(`${plural(p.invitedGuests, "guest was", "guests were")} sent an invitation and will be notified${channels ? ` (${channels})` : ""}, whatever their RSVP.`);
  }
  if (p.byChannel.unknownChannel > 0) {
    lines.push(`${plural(p.byChannel.unknownChannel, "guest has", "guests have")} an older invitation record that does not say how it was sent, so they cannot be notified automatically.`);
  }
  if (p.byChannel.whatsapp > 0 && !p.whatsappNoticesAvailable) {
    lines.push("WhatsApp cancellation messages are not set up on this server yet. Guests invited by WhatsApp will be listed as not notified.");
  }
  if (p.notInvited > 0) lines.push(`${plural(p.notInvited, "guest", "guests")} on your list never received an invitation and will not be contacted.`);
  return lines;
}

const total = (c: NoticeCounts) => c.PENDING + c.SENDING + c.SENT + c.FAILED + c.UNAVAILABLE;

/** "3 sent to the provider, 1 failed ..." - "sent" means the provider accepted it, which is all the app can know */
export function channelLine(label: string, c: NoticeCounts): string | null {
  if (total(c) === 0) return null;
  const parts = [
    c.SENT ? `${c.SENT} accepted by the provider` : "",
    c.PENDING + c.SENDING ? `${c.PENDING + c.SENDING} waiting` : "",
    c.FAILED ? `${c.FAILED} failed` : "",
    c.UNAVAILABLE ? `${c.UNAVAILABLE} not sent (channel unavailable)` : "",
  ].filter(Boolean);
  return `${label}: ${parts.join(", ")}`;
}

export function needsAttention(n: Pick<CancellationNotices, "channels">): boolean {
  return [n.channels.email, n.channels.whatsapp].some((c) => c.FAILED + c.UNAVAILABLE > 0);
}
