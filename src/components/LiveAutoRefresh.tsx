"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls the current Server Component every `intervalMs` ms by calling
 * router.refresh(). React reconciles the new server-rendered tree with the
 * existing one, so the scoreboard updates in place without a full reload.
 *
 * On top of the interval we also force a refresh when:
 *   - the tab regains visibility (browsers throttle setInterval in the
 *     background, so coming back to the tab would otherwise show a stale
 *     score until the next tick),
 *   - the window regains focus (covers e.g. alt-tab on desktop),
 *   - the browser fires an `online` event (after a flaky network).
 *
 * Renders a small "Live · updated 3s ago" pill in the corner.
 */
export function LiveAutoRefresh({
  intervalMs = 4000
}: {
  intervalMs?: number;
}) {
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);

  // Stable ref so the visibility/focus listeners always see the latest
  // `paused` state without having to re-bind.
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const doRefresh = useCallback(() => {
    if (pausedRef.current) return;
    router.refresh();
    setLastUpdated(Date.now());
  }, [router]);

  // Regular interval polling.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(doRefresh, intervalMs);
    return () => clearInterval(id);
  }, [doRefresh, intervalMs, paused]);

  // Refresh as soon as the tab becomes visible / focused / reconnects.
  useEffect(() => {
    const onVisible = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        doRefresh();
      }
    };
    const onFocus = () => doRefresh();
    const onOnline = () => doRefresh();

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
    };
  }, [doRefresh]);

  // Re-render every second so the "x seconds ago" label stays accurate.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const secondsAgo = Math.max(0, Math.floor((Date.now() - lastUpdated) / 1000));

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2">
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        className="inline-flex items-center gap-2 rounded-full bg-ink-900/90 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur hover:bg-ink-800"
        aria-label={paused ? "Resume live updates" : "Pause live updates"}
      >
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            paused ? "bg-ink-400" : "bg-emerald-400 animate-pulse"
          }`}
        />
        {paused ? "Paused" : `Live · updated ${secondsAgo}s ago`}
      </button>
      {/* invisible span so React keeps re-rendering on `tick` */}
      <span hidden>{tick}</span>
    </div>
  );
}
