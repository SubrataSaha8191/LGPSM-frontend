/** How long someone can be away before the app starts again from the dashboard instead of the page they left. */
export const AWAY_LIMIT_MS = 60 * 60 * 1000;

/** Was the person last seen more than the limit ago? Nothing stamped yet (a fresh sign-in) is never "away". */
export function awayTooLong(lastSeen: number | null, now: number = Date.now(), limit: number = AWAY_LIMIT_MS): boolean {
  return lastSeen !== null && now - lastSeen > limit;
}
