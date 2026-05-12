"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Player = {
  id: string;
  name: string;
  role: string;
  battingHand: string;
};

const ROLE_OPTIONS = [
  { value: "BATTER", label: "Batter" },
  { value: "BOWLER", label: "Bowler" },
  { value: "ALL_ROUNDER", label: "All-rounder" },
  { value: "WICKETKEEPER", label: "Wicketkeeper" }
];

export function SquadEditor({
  teamId,
  players
}: {
  teamId: string;
  players: Player[];
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add-player form state
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("BATTER");
  const [battingHand, setBattingHand] = useState("RIGHT");

  async function addPlayer(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body: Record<string, unknown> = {
      name: name.trim(),
      role,
      battingHand
    };

    const res = await fetch(`/api/teams/${teamId}/players`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not add player.");
      return;
    }
    setName("");
    setRole("BATTER");
    setBattingHand("RIGHT");
    router.refresh();
  }

  async function savePlayer(
    id: string,
    data: { name: string; role: string; battingHand: string }
  ) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/players/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data)
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not save.");
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function deletePlayer(id: string, playerName: string) {
    if (!confirm(`Remove ${playerName} from the squad?`)) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/players/${id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not delete.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">
          Squad ({players.length})
        </h2>
        {!addOpen && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="btn-primary"
          >
            + Add player
          </button>
        )}
      </div>

      {addOpen && (
        <form
          onSubmit={addPlayer}
          className="rounded-xl border border-brand-200 bg-brand-50/40 p-4"
        >
          <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <label className="label" htmlFor="p-name">Player name</label>
              <input
                id="p-name"
                required
                minLength={1}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="e.g. Rohit Sharma"
              />
            </div>
            <div>
              <label className="label" htmlFor="p-role">Role</label>
              <select
                id="p-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="input"
              >
                {ROLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="p-bat">Batting</label>
              <select
                id="p-bat"
                value={battingHand}
                onChange={(e) => setBattingHand(e.target.value)}
                className="input"
              >
                <option value="RIGHT">Right-hand</option>
                <option value="LEFT">Left-hand</option>
              </select>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Adding..." : "Add to squad"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAddOpen(false);
                setError(null);
              }}
              className="btn-ghost"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
          {error}
        </div>
      )}

      {players.length === 0 ? (
        <p className="text-sm text-ink-500">
          No players yet. Click <b>+ Add player</b> to build the squad.
        </p>
      ) : (
        <ul className="divide-y divide-ink-100 rounded-xl border border-ink-100">
          {players.map((p) =>
            editingId === p.id ? (
              <EditRow
                key={p.id}
                player={p}
                busy={busy}
                onCancel={() => setEditingId(null)}
                onSave={(d) => savePlayer(p.id, d)}
              />
            ) : (
              <li
                key={p.id}
                className="flex items-center gap-4 p-3 hover:bg-ink-50/60"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-xs font-bold text-white">
                  {p.name[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold">{p.name}</p>
                  <p className="text-xs text-ink-500">
                    {ROLE_OPTIONS.find((r) => r.value === p.role)?.label ?? p.role}{" "}
                    • {p.battingHand === "LEFT" ? "LH" : "RH"} bat
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingId(p.id)}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-ink-600 hover:bg-ink-100"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => deletePlayer(p.id, p.name)}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
                >
                  Remove
                </button>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

function EditRow({
  player,
  busy,
  onCancel,
  onSave
}: {
  player: Player;
  busy: boolean;
  onCancel: () => void;
  onSave: (d: {
    name: string;
    role: string;
    battingHand: string;
  }) => void;
}) {
  const [name, setName] = useState(player.name);
  const [role, setRole] = useState(player.role);
  const [battingHand, setBattingHand] = useState(player.battingHand);

  return (
    <li className="bg-brand-50/40 p-3">
      <div className="grid gap-2 sm:grid-cols-[1.5fr_1fr_1fr_auto]">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          placeholder="Player name"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="input"
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={battingHand}
          onChange={(e) => setBattingHand(e.target.value)}
          className="input"
        >
          <option value="RIGHT">Right-hand</option>
          <option value="LEFT">Left-hand</option>
        </select>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={busy || name.trim().length === 0}
            onClick={() =>
              onSave({
                name: name.trim(),
                role,
                battingHand
              })
            }
            className="btn-primary px-3 py-2 text-sm"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="btn-ghost px-3 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </li>
  );
}
