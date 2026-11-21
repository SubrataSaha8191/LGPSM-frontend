/** One Excel upload holds up to this many invitees; more than that is arranged through the contact page. (The server enforces the same limit.) */
export const MAX_UPLOAD_GUESTS = 5000;
/** An upload is stored as lists of at most this many guests: 1200 invitees become three lists (500, 500, 200). */
export const LIST_SIZE = 500;
/** After a successful upload, another one waits this long (the server enforces the same pause). */
export const UPLOAD_COOLDOWN_MS = 15_000;

export const isTooLarge = (count: number): boolean => count > MAX_UPLOAD_GUESTS;

/** How many lists an upload of this many invitees is stored as */
export const listsFor = (count: number): number => (count <= 0 ? 0 : Math.ceil(count / LIST_SIZE));

/** The wording used when a successful upload was split into several lists */
export function splitNote(count: number): string {
  const lists = listsFor(count);
  return lists > 1 ? ` It was saved as ${lists} lists of up to ${LIST_SIZE} invitees each.` : "";
}

/** Whole seconds left until `until` (a time in ms); 0 when it has passed */
export const secondsLeft = (until: number, now: number = Date.now()): number => Math.max(0, Math.ceil((until - now) / 1000));
