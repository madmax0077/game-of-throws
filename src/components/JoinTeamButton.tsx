"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ExistingState =
  | { kind: "ALREADY_IN_TEAM"; teamName: string }
  | { kind: "REQUESTED"; status: "PENDING" | "APPROVED" | "REJECTED" }
  | { kind: "CAN_REQUEST" }
  | { kind: "PROFILE_MISSING" };

export function JoinTeamButton({
  teamId,
  state,
  small
}: {
  teamId: string;
  state: ExistingState;
  small?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state.kind === "ALREADY_IN_TEAM") {
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
        In team: {state.teamName}
      </span>
    );
  }
  if (state.kind === "REQUESTED" && state.status === "PENDING") {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
        Request pending
      </span>
    );
  }
  if (state.kind === "REQUESTED" && state.status === "APPROVED") {
    return (
      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
        Approved ✓
      </span>
    );
  }
  if (state.kind === "PROFILE_MISSING") {
    return (
      <a
        href="/me"
        className={`btn-outline ${small ? "px-2 py-1 text-xs" : ""}`}
      >
        Complete profile to join
      </a>
    );
  }

  async function send() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/teams/${teamId}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not send request.");
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
        Request pending
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={send}
        disabled={busy}
        className={`btn-primary ${small ? "px-2 py-1 text-xs" : ""}`}
      >
        {busy ? "Sending..." : "Request to join"}
      </button>
      {error && <span className="text-xs text-rose-700">{error}</span>}
    </div>
  );
}
