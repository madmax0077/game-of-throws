"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Two-click delete: first click puts the button into a "Confirm?" state,
 * second click actually fires the DELETE. Prevents accidental deletes
 * while still being faster than a modal dialog.
 */
export function DeleteTournamentButton({
  tournamentId,
  tournamentName,
  size = "md"
}: {
  tournamentId: string;
  tournamentName: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (!armed) {
      setArmed(true);
      setError(null);
      // Auto-disarm after 5s so a stale "Confirm?" doesn't sit around.
      setTimeout(() => setArmed(false), 5000);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tournaments/${tournamentId}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Failed to delete tournament.");
        setBusy(false);
        setArmed(false);
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || pending;
  const padding = size === "sm" ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={armed ? `Click again to permanently delete "${tournamentName}"` : `Delete "${tournamentName}"`}
        className={
          armed
            ? `rounded-md bg-rose-600 ${padding} font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60`
            : `rounded-md border border-rose-300 bg-white ${padding} font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60`
        }
      >
        {busy
          ? "Deleting…"
          : armed
          ? "Click again to confirm"
          : "Delete"}
      </button>
      {error && (
        <p className="text-[11px] font-semibold text-rose-700">{error}</p>
      )}
    </div>
  );
}
