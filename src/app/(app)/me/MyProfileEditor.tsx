"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Initial = {
  name: string;
  avatarUrl: string | null;
  role: string;
  battingHand: string;
  bowlingArm: string | null;
  bowlingType: string | null;
};

export function MyProfileEditor({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl ?? "");
  const [role, setRole] = useState(initial.role);
  const [battingHand, setBattingHand] = useState(initial.battingHand);
  const [bowlingArm, setBowlingArm] = useState(initial.bowlingArm ?? "");
  const [bowlingType, setBowlingType] = useState(initial.bowlingType ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        avatarUrl: avatarUrl.trim() || null,
        role,
        battingHand,
        bowlingArm: bowlingArm || null,
        bowlingType: bowlingType || null
      })
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not save profile.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-5">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-brand-700 text-2xl font-bold text-white">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={name}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            name[0]?.toUpperCase() ?? "P"
          )}
        </div>
        <div className="flex-1">
          <label className="label" htmlFor="avatarUrl">
            Photo URL <span className="text-ink-400">(optional)</span>
          </label>
          <input
            id="avatarUrl"
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="input"
            placeholder="https://..."
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="name">
          Display name
        </label>
        <input
          id="name"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="role">
            Primary role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="input"
          >
            <option value="BATTER">Batter</option>
            <option value="BOWLER">Bowler</option>
            <option value="ALL_ROUNDER">All-rounder</option>
            <option value="WICKETKEEPER">Wicket-keeper</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="battingHand">
            Batting hand
          </label>
          <select
            id="battingHand"
            value={battingHand}
            onChange={(e) => setBattingHand(e.target.value)}
            className="input"
          >
            <option value="RIGHT">Right</option>
            <option value="LEFT">Left</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="bowlingArm">
            Bowling arm
          </label>
          <select
            id="bowlingArm"
            value={bowlingArm}
            onChange={(e) => setBowlingArm(e.target.value)}
            className="input"
          >
            <option value="">— Doesn&apos;t bowl —</option>
            <option value="RIGHT">Right</option>
            <option value="LEFT">Left</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="bowlingType">
            Bowling type
          </label>
          <select
            id="bowlingType"
            value={bowlingType}
            onChange={(e) => setBowlingType(e.target.value)}
            className="input"
          >
            <option value="">—</option>
            <option value="FAST">Fast</option>
            <option value="MEDIUM">Medium</option>
            <option value="SPIN">Spin</option>
            <option value="OFF_SPIN">Off-spin</option>
            <option value="LEG_SPIN">Leg-spin</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Profile saved ✓
        </div>
      )}

      <div className="flex gap-3">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "Saving..." : "Save profile"}
        </button>
      </div>
    </form>
  );
}
