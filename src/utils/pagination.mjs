// Page numbers to show for `current` of `total` pages: always the first and last, the neighbours of the current page,
// and "..." where pages are skipped. e.g. (5, 10) -> [1, "...", 4, 5, 6, "...", 10]
export function pageWindow(current, total) {
  if (total <= 1) return total === 1 ? [1] : [];
  const pages = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  const out = [];
  for (const p of sorted) {
    const prev = out[out.length - 1];
    if (typeof prev === "number" && p - prev === 2) out.push(prev + 1);
    else if (typeof prev === "number" && p - prev > 2) out.push("...");
    out.push(p);
  }
  return out;
}

/** The slice of `items` on `page` (1-based), with the page clamped into range. */
export function paginate(items, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  return { current, totalPages, rows: items.slice((current - 1) * pageSize, current * pageSize) };
}
