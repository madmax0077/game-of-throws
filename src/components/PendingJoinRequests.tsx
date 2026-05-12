"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type JoinRequestItem = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  message: string | null;
  createdAt: string;
  player: {
    id: string;
    name: string;
    role: string;
    battingHand: string;
    bowlingArm: string | null;
    jerseyNo: number | null;
    avatarUrl: string | null;
  };
};

export function PendingJoinRequests({
  requests
}: {
  requests: JoinRequestItem[];
}) {
  const pending = requests.filter((r) => r.status === "PENDING");

  if (pending.length === 0) {
    return (
      <div className="card p-6">
        <h2 className="font-display text-lg font-bold">Join requests</h2>
        <p className="mt-2 text-sm text-ink-500">
          No pending join requests for this team.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Join requests</h2>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
          {pending.length} pending
        </span>
      </div>
      <ul className="mt-4 divide-y divide-ink-100 rounded-xl border border-ink-100">
        {pending.map((r) => (
          <RequestRow key={r.id} request={r} />
        ))}
      </ul>
    </div>
  );
}

function RequestRow({ request }: { request: JoinRequestItem }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resolve(status: "APPROVED" | "REJECTED") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/join-requests/${request.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status })
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not update request.");
      return;
    }
    router.refresh();
  }

  return (
    <li className="flex flex-wrap items-center gap-3 p-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-700 text-sm font-bold text-white">
        {request.player.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={request.player.avatarUrl}
            alt={request.player.name}
            className="h-full w-full object-cover"
          />
        ) : (
          request.player.name[0]?.toUpperCase() ?? "P"
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold">{request.player.name}</p>
        <p className="text-xs text-ink-500">
          {prettyRole(request.player.role)} •{" "}
          {request.player.battingHand === "LEFT" ? "LH" : "RH"} bat
          {request.player.bowlingArm
            ? ` • ${request.player.bowlingArm === "LEFT" ? "LH" : "RH"} bowl`
            : ""}
          {request.player.jerseyNo != null
            ? ` • #${request.player.jerseyNo}`
            : ""}
        </p>
        {request.message && (
          <p className="mt-1 text-xs italic text-ink-600">
            &ldquo;{request.message}&rdquo;
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => resolve("APPROVED")}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => resolve("REJECTED")}
          className="rounded-md bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
      {error && (
        <p className="w-full text-xs text-rose-700">{error}</p>
      )}
    </li>
  );
}

function prettyRole(r: string) {
  if (r === "ALL_ROUNDER") return "All-rounder";
  if (r === "WICKETKEEPER") return "Wicket-keeper";
  return r.charAt(0) + r.slice(1).toLowerCase();
}
