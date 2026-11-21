"use client";

import { useEffect, useRef } from "react";

// Refreshing screens is what most of the traffic to the server is made of, so it is kept polite:
//  - two refreshes are never closer than MIN_GAP_MS (a tab regaining focus, becoming visible and a timer all firing together count once);
//  - after IDLE_AFTER_MS with no mouse, key or touch activity the timer slows to every IDLE_FACTOR x the normal time;
//  - nothing runs while the tab is hidden or the device is offline;
//  - a change made on this screen (the "lgpsm-db-update" notice) refreshes at once, because the person is waiting to see it.
const MIN_GAP_MS = 5_000;
const IDLE_AFTER_MS = 5 * 60_000;
const IDLE_FACTOR = 4;

/**
 * Keeps a screen current without anyone pressing refresh: `refresh` runs every `everyMs` while the tab is visible, as soon as the tab
 * is shown again or the window regains focus, and when another part of the app announces a change (`lgpsm-db-update`). Nothing runs
 * while the tab is hidden, and a refresh that is still running is never started twice. `refresh` should update quietly (no skeleton).
 */
export function useLiveRefresh(refresh: () => void | Promise<unknown>, everyMs = 20_000, enabled = true) {
  const latest = useRef(refresh);
  useEffect(() => { latest.current = refresh; });
  useEffect(() => {
    if (!enabled) return;
    let running = false;
    let lastRun = 0;
    let lastActive = Date.now();
    const run = async (urgent = false) => {
      if (running || document.hidden || navigator.onLine === false) return;
      const now = Date.now();
      if (!urgent && now - lastRun < MIN_GAP_MS) return;
      running = true;
      lastRun = now;
      try { await latest.current(); } catch { /* the next tick tries again */ } finally { running = false; }
    };
    const onTick = () => {
      // someone who has not touched the page for a while does not need it kept as fresh
      if (Date.now() - lastActive > IDLE_AFTER_MS && Date.now() - lastRun < everyMs * IDLE_FACTOR) return;
      void run();
    };
    const onActivity = () => { lastActive = Date.now(); };
    const timer = window.setInterval(onTick, everyMs);
    const onVisible = () => { if (!document.hidden) void run(); };
    const onOwnChange = () => { lastActive = Date.now(); void run(true); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    window.addEventListener("online", onVisible);
    window.addEventListener("lgpsm-db-update", onOwnChange);
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      window.removeEventListener("online", onVisible);
      window.removeEventListener("lgpsm-db-update", onOwnChange);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [everyMs, enabled]);
}
