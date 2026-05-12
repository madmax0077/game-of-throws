"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddTeamForm({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/tournaments/${tournamentId}/teams`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, shortName: shortName.toUpperCase() })
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not add team.");
      return;
    }
    setName("");
    setShortName("");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline">
        + Add team
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card flex flex-wrap items-end gap-3 p-4">
      <div className="flex-1 min-w-[180px]">
        <label className="label" htmlFor="team-name">Team name</label>
        <input
          id="team-name"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
          placeholder="Mumbai Mavericks"
        />
      </div>
      <div className="w-28">
        <label className="label" htmlFor="team-short">Short</label>
        <input
          id="team-short"
          required
          minLength={2}
          maxLength={5}
          value={shortName}
          onChange={(e) => setShortName(e.target.value.toUpperCase())}
          className="input uppercase"
          placeholder="MUM"
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? "Adding..." : "Add team"}
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
      {error && <p className="basis-full text-sm text-brand-700">{error}</p>}
      <p className="basis-full text-xs text-ink-500">
        Team starts empty — you&apos;ll add players to the squad on the team page.
      </p>
    </form>
  );
}
