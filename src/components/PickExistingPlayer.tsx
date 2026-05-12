"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type AvailablePlayer = {
  id: string;
  name: string;
  role: string;
  battingHand: string;
  bowlingArm: string | null;
  jerseyNo: number | null;
  avatarUrl: string | null;
};

/**
 * Lets the organizer directly add an existing player profile (one that was
 * created when a player signed up) into the current team.
 */
export function PickExistingPlayer({
  teamId,
  players
}: {
  teamId: string;
  players: AvailablePlayer[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return players;
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        prettyRole(p.role).toLowerCase().includes(needle)
    );
  }, [q, players]);

  async function pick(playerId: string) {
    setBusyId(playerId);
    setError(null);
    const res = await fetch(`/api/teams/${teamId}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ playerId })
    });
    setBusyId(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not add player.");
      return;
    }
    router.refresh();
  }

  if (players.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 p-4 text-center text-sm text-ink-500">
        No registered player profiles available right now. New profiles appear
        here when players sign up at <code>/signup/player</code>.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink-100 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display text-sm font-bold">
            Pick from existing player profiles
          </p>
          <p className="text-xs text-ink-500">
            {players.length} player{players.length === 1 ? "" : "s"} signed up
            and available.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="btn-outline text-xs"
        >
          {open ? "Hide list" : "Browse profiles"}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or role..."
            className="input"
          />
          {error && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-800">
              {error}
            </div>
          )}
          <ul className="max-h-80 overflow-y-auto divide-y divide-ink-100 rounded-xl border border-ink-100">
            {filtered.length === 0 ? (
              <li className="p-3 text-center text-sm text-ink-500">
                No matches.
              </li>
            ) : (
              filtered.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 p-3 hover:bg-ink-50/60"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-100 text-xs font-bold text-ink-700">
                    {p.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.avatarUrl}
                        alt={p.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      p.name[0]?.toUpperCase() ?? "?"
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold">{p.name}</p>
                    <p className="text-xs text-ink-500">
                      {prettyRole(p.role)} •{" "}
                      {p.battingHand === "LEFT" ? "LH" : "RH"} bat
                      {p.bowlingArm
                        ? ` • ${p.bowlingArm === "LEFT" ? "LH" : "RH"} bowl`
                        : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => pick(p.id)}
                    className="btn-primary px-3 py-1.5 text-xs"
                  >
                    {busyId === p.id ? "Adding..." : "Add to team"}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function prettyRole(r: string) {
  if (r === "ALL_ROUNDER") return "All-rounder";
  if (r === "WICKETKEEPER") return "Wicket-keeper";
  return r.charAt(0) + r.slice(1).toLowerCase();
}
