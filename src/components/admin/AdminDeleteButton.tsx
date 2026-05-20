"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Two-click delete for admin actions: first click arms, second confirms.
 */
export function AdminDeleteButton({
  deleteUrl,
  itemName,
  label = "Delete",
  size = "md",
  disabled = false,
  disabledReason
}: {
  deleteUrl: string;
  itemName: string;
  label?: string;
  size?: "sm" | "md";
  disabled?: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (disabled) return;
    if (!armed) {
      setArmed(true);
      setError(null);
      setTimeout(() => setArmed(false), 5000);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(deleteUrl, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error || "Failed to delete.");
        setBusy(false);
        setArmed(false);
        return;
      }
      setArmed(false);
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  const isDisabled = disabled || busy || pending;
  const padding = size === "sm" ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs";

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={isDisabled}
        title={
          disabled && disabledReason
            ? disabledReason
            : armed
            ? `Click again to permanently delete "${itemName}"`
            : `Delete "${itemName}"`
        }
        className={
          disabled
            ? `cursor-not-allowed rounded-md border border-ink-200 bg-ink-50 ${padding} font-semibold text-ink-400`
            : armed
            ? `rounded-md bg-rose-600 ${padding} font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60`
            : `rounded-md border border-rose-300 bg-white ${padding} font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60`
        }
      >
        {busy
          ? "Deleting…"
          : armed
          ? "Click again to confirm"
          : label}
      </button>
      {disabled && disabledReason && (
        <p className="max-w-[14rem] text-right text-[10px] text-ink-500">
          {disabledReason}
        </p>
      )}
      {error && (
        <p className="max-w-[14rem] text-right text-[11px] font-semibold text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
