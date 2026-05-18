"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Team = { id: string; name: string; shortName: string };

export function ScheduleMatchForm({
  tournamentId,
  teams,
  defaultOvers
}: {
  tournamentId: string;
  teams: Team[];
  defaultOvers: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [overs, setOvers] = useState<number>(defaultOvers);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/tournaments/${tournamentId}/matches`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        homeTeamId,
        awayTeamId,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        overs
      })
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not schedule match.");
      return;
    }
    const m = await res.json();
    router.push(`/matches/${m.id}/score`);
  }

  if (teams.length < 2) {
    return (
      <p className="text-sm text-ink-500">
        Add at least 2 teams to schedule a match.
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-primary">
        + Schedule match
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card grid gap-4 p-5 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="home">Home team</label>
        <select
          id="home"
          required
          value={homeTeamId}
          onChange={(e) => setHomeTeamId(e.target.value)}
          className="input"
        >
          <option value="">Select…</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="away">Away team</label>
        <select
          id="away"
          required
          value={awayTeamId}
          onChange={(e) => setAwayTeamId(e.target.value)}
          className="input"
        >
          <option value="">Select…</option>
          {teams
            .filter((t) => t.id !== homeTeamId)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="overs">Overs per innings</label>
        <select
          id="overs"
          value={overs}
          onChange={(e) => setOvers(Number(e.target.value))}
          className="input"
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "over" : "overs"}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="label" htmlFor="when">
          Scheduled at <span className="font-normal text-ink-500">(optional — leave blank to start now)</span>
        </label>
        <input
          id="when"
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="input"
        />
        <p className="mt-1.5 text-xs text-ink-500">
          You can start scoring immediately even before the scheduled time.
        </p>
      </div>

      {error && (
        <p className="sm:col-span-2 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
          {error}
        </p>
      )}

      <div className="flex gap-2 sm:col-span-2">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Creating..." : "Create match & start scoring"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="btn-ghost"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
