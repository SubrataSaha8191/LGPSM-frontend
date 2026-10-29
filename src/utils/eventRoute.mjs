// The event id segment of an /events/... path, or null when the segment is not an event (e.g. "add", "select").
// Event ids are MongoDB ObjectIds, so anything else is a route name and must not be fetched as an event.
export function eventIdFromPath(pathname) {
  const m = /^\/events\/([^/?#]+)/.exec(pathname || "");
  return m && /^[0-9a-f]{24}$/i.test(m[1]) ? m[1] : null;
}
