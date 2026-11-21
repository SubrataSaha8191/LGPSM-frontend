"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { awayTooLong } from "@/utils/awayLimit";

export const LAST_SEEN_KEY = "lgpsm_last_seen";

const read = (): number | null => {
  try {
    const n = Number(localStorage.getItem(LAST_SEEN_KEY));
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
};
const stamp = () => {
  try { localStorage.setItem(LAST_SEEN_KEY, String(Date.now())); } catch { /* storage unavailable: the page still works, it just never resets */ }
};

/**
 * After an hour away (the tab or the browser closed, the screen locked, the computer asleep) coming back opens the dashboard rather than
 * the page that was open. The time is counted from when the person was last seen on a signed-in page; it is stamped as long as the page is
 * in use, so someone working for hours is never sent away. Signing out forgets the stamp (see tokenStorage), so a fresh sign-in never
 * counts as "away".
 */
export function useReturnToDashboard(enabled: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  const where = useRef(pathname);
  useEffect(() => { where.current = pathname; }, [pathname]);

  useEffect(() => {
    if (!enabled) return;
    // Returning after too long: go to the dashboard (unless already there). Otherwise just note that the person is here.
    const check = () => {
      const last = read();
      const away = awayTooLong(last);
      stamp();
      if (away && where.current !== "/dashboard") router.replace("/dashboard");
    };
    check();

    const onVisibility = () => { if (document.visibilityState === "visible") check(); else stamp(); };
    const onPageShow = (e: PageTransitionEvent) => { if (e.persisted) check(); };
    let lastActivity = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivity > 30_000) { lastActivity = now; stamp(); }
    };
    // a computer that slept does not always report coming back: the gap shows up when this next runs
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") check(); }, 60_000);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("focus", check);
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("focus", check);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [enabled, router]);
}
