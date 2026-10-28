export interface PlaceMatch {
  /** Full address as the map service writes it */
  label: string;
  lat: number;
  lng: number;
}

// OpenStreetMap's public geocoder. It is only called when the organizer presses Verify (never while typing), which keeps
// within its usage policy of at most one request a second; the browser sends this site as the referrer.
const SEARCH_URL = "https://nominatim.openstreetmap.org/search";

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceMatch[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url = `${SEARCH_URL}?${new URLSearchParams({ q, format: "jsonv2", limit: "5", "accept-language": "en" })}`;
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Address search failed (${res.status})`);
  const rows: unknown = await res.json();
  if (!Array.isArray(rows)) return [];
  return rows
    .map((r: { display_name?: unknown; lat?: unknown; lon?: unknown }) => ({ label: String(r.display_name ?? ""), lat: Number(r.lat), lng: Number(r.lon) }))
    .filter((m) => m.label && Number.isFinite(m.lat) && Number.isFinite(m.lng));
}
