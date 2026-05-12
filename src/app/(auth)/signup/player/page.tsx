"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PlayerSignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password, role: "PLAYER" })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not create account.");
      setLoading(false);
      return;
    }

    const signed = await signIn("credentials", {
      email,
      password,
      redirect: false
    });
    setLoading(false);
    if (signed?.error) setError("Account created but sign-in failed.");
    else router.push("/me?welcome=1");
  }

  return (
    <div className="card p-8">
      <Link
        href="/signup"
        className="mb-3 inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700"
      >
        ← Back
      </Link>
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-800">
          PLAYER
        </span>
      </div>
      <h1 className="mt-2 font-display text-2xl font-bold">
        Create your player profile
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        Watch live tournaments, build your cricket CV, get picked for teams.
      </p>

      {/* Continue-with-Google placeholder. Wired up but disabled until
          GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET are set on Vercel. */}
      <button
        type="button"
        disabled
        title="Coming soon: ask the admin to add Google OAuth credentials in Vercel."
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-ink-200 bg-white px-4 py-2.5 text-sm font-semibold text-ink-700 opacity-60"
      >
        <GoogleIcon />
        Continue with Google
        <span className="ml-1 rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-500">
          Coming soon
        </span>
      </button>

      <div className="my-5 flex items-center gap-3 text-xs text-ink-400">
        <span className="h-px flex-1 bg-ink-100" />
        OR USE EMAIL
        <span className="h-px flex-1 bg-ink-100" />
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">Your name</label>
          <input
            id="name"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Virat Kohli"
          />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="Min. 8 characters"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Creating..." : "Create player profile"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-600">
        Are you an organizer?{" "}
        <Link
          href="/signup/organizer"
          className="font-semibold text-brand-700 hover:underline"
        >
          Sign up as organizer
        </Link>
      </p>
      <p className="mt-2 text-center text-sm text-ink-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.2 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.2 29.4 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.3 0 10.1-2 13.7-5.4l-6.3-5.2C29.3 35.2 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.6 39.6 16.3 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.2 5.5l6.3 5.2C40.7 35.8 44 30.4 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
