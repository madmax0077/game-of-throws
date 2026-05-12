"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  teamId: string;
  name: string;
  shortName: string;
  homeCity: string | null;
};

export function TeamNameEditor({ teamId, name, shortName, homeCity }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [n, setN] = useState(name);
  const [s, setS] = useState(shortName);
  const [c, setC] = useState(homeCity ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/teams/${teamId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: n.trim(),
        shortName: s.trim().toUpperCase(),
        homeCity: c.trim() || null
      })
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Could not save.");
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-700 text-xl font-bold">
          {shortName}
        </div>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold">{name}</h1>
          <p className="mt-1 text-white/70">{homeCity ?? "—"}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg border border-white/30 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/20"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-white/10 p-4 backdrop-blur">
      <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/70">
            Team name
          </label>
          <input
            value={n}
            onChange={(e) => setN(e.target.value)}
            className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
            placeholder="Mumbai Mavericks"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/70">
            Short
          </label>
          <input
            value={s}
            maxLength={5}
            onChange={(e) => setS(e.target.value.toUpperCase())}
            className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 uppercase text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
            placeholder="MUM"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/70">
            Home city
          </label>
          <input
            value={c}
            onChange={(e) => setC(e.target.value)}
            className="w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
            placeholder="Mumbai"
          />
        </div>
      </div>

      {error && (
        <p className="mt-3 rounded-md bg-white/15 px-3 py-2 text-sm">{error}</p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy || n.length < 2 || s.length < 2}
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-ink-100 disabled:opacity-50"
        >
          {busy ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
            setN(name);
            setS(shortName);
            setC(homeCity ?? "");
          }}
          className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
