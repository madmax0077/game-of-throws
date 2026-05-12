"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NewTournamentPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    city: "",
    overs: 6,
    startDate: "",
    endDate: ""
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/tournaments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form)
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Failed to create tournament.");
      setSubmitting(false);
      return;
    }
    const created = await res.json();
    router.push(`/tournaments/${created.id}`);
  }

  return (
    <div className="max-w-2xl">
      <Link href="/tournaments" className="text-sm text-brand-700 hover:underline">
        ← Back to tournaments
      </Link>
      <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
        Create a tournament
      </h1>
      <p className="mt-1 text-ink-600">
        Set the basics. You can add teams and schedule matches right after creating.
      </p>

      <form onSubmit={onSubmit} className="card mt-6 space-y-5 p-6">
        <div>
          <label className="label" htmlFor="name">Tournament name</label>
          <input
            id="name"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="input"
            placeholder="Throws Premier League 2026"
          />
        </div>
        <div>
          <label className="label" htmlFor="city">City</label>
          <input
            id="city"
            required
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            className="input"
            placeholder="Mumbai"
          />
        </div>
        <div>
          <label className="label" htmlFor="overs">Overs per innings</label>
          <select
            id="overs"
            value={form.overs}
            onChange={(e) => update("overs", Number(e.target.value))}
            className="input"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "over" : "overs"}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-ink-500">
            All matches in this tournament will be {form.overs}{" "}
            {form.overs === 1 ? "over" : "overs"} a side by default.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="startDate">Start date</label>
            <input
              id="startDate"
              type="date"
              required
              value={form.startDate}
              onChange={(e) => update("startDate", e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="endDate">End date</label>
            <input
              id="endDate"
              type="date"
              required
              value={form.endDate}
              onChange={(e) => update("endDate", e.target.value)}
              className="input"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Creating..." : "Create tournament"}
          </button>
          <Link href="/tournaments" className="btn-outline">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
