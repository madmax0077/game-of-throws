"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Polls the current Server Component every `intervalMs` ms by calling
 * router.refresh(). React reconciles the new server-rendered tree with the
 * existing one, so the scoreboard updates in place without a full reload.
 *
 * Renders a small "Live · updated 4s ago" pill in the corner.
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

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      router.refresh();
      setLastUpdated(Date.now());
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs, paused]);

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
