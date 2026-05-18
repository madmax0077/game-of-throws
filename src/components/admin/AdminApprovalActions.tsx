"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ActionState =
  | { kind: "idle" }
  | { kind: "rejecting" }
  | { kind: "error"; message: string };

export function AdminApprovalActions({
  tournamentId,
  currentStatus
}: {
  tournamentId: string;
  currentStatus: "PENDING" | "APPROVED" | "REJECTED";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [state, setState] = useState<ActionState>({ kind: "idle" });
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function approve() {
    setBusy("approve");
    setState({ kind: "idle" });
    try {
      const res = await fetch(
        `/api/admin/tournaments/${tournamentId}/approve`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setState({
          kind: "error",
          message: data?.error || "Failed to approve tournament."
        });
        setBusy(null);
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    setBusy("reject");
    setState({ kind: "idle" });
    try {
      const res = await fetch(
        `/api/admin/tournaments/${tournamentId}/reject`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ reason: reason.trim() || undefined })
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setState({
          kind: "error",
          message: data?.error || "Failed to reject tournament."
        });
        setBusy(null);
        return;
      }
      setReasonOpen(false);
      setReason("");
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  const disabled = busy !== null || pending;

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        {currentStatus !== "APPROVED" && (
          <button
            type="button"
            onClick={approve}
            disabled={disabled}
            className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy === "approve" ? "Approving…" : "Approve"}
          </button>
        )}
        {currentStatus !== "REJECTED" && (
          <button
            type="button"
            onClick={() => setReasonOpen((v) => !v)}
            disabled={disabled}
            className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
          >
            Reject…
          </button>
        )}
      </div>

      {reasonOpen && (
        <div className="w-full rounded-lg border border-rose-200 bg-rose-50/60 p-3 sm:max-w-sm">
          <label
            htmlFor={`reason-${tournamentId}`}
            className="block text-xs font-semibold text-rose-800"
          >
            Reason (optional — shown to the organizer)
          </label>
          <textarea
            id={`reason-${tournamentId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            maxLength={280}
            placeholder="e.g. Missing tournament name or duplicate entry."
            className="mt-1 w-full rounded-md border border-rose-200 bg-white px-2 py-1.5 text-xs text-ink-800 focus:border-rose-400 focus:outline-none focus:ring-1 focus:ring-rose-300"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setReasonOpen(false);
                setReason("");
              }}
              disabled={disabled}
              className="rounded-md px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={reject}
              disabled={disabled}
              className="rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {busy === "reject" ? "Rejecting…" : "Confirm reject"}
            </button>
          </div>
        </div>
      )}

      {state.kind === "error" && (
        <p className="text-xs font-semibold text-rose-700">{state.message}</p>
      )}
    </div>
  );
}
