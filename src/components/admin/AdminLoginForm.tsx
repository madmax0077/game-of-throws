"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function AdminLoginForm({ defaultEmail }: { defaultEmail: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false
    });
    setBusy(false);
    if (!res || res.error) {
      setError("Wrong admin email or password.");
      return;
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="card mx-auto w-full max-w-md space-y-4 p-6"
    >
      <div className="text-center">
        <span className="inline-flex items-center rounded-full bg-brand-700/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-700">
          Admin only
        </span>
        <h1 className="mt-2 font-display text-2xl font-extrabold">
          Admin sign in
        </h1>
        <p className="mt-1 text-sm text-ink-600">
          Sign in with the admin account to review and approve tournaments.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="admin-email">
          Admin email
        </label>
        <input
          id="admin-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="admin-password">
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          required
          minLength={4}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
      </div>

      {error && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      <button type="submit" className="btn-primary w-full" disabled={busy}>
        {busy ? "Signing in…" : "Sign in as admin"}
      </button>

      <p className="text-center text-xs text-ink-500">
        This page is only for the admin account. Organizers and players
        should sign in at <span className="font-semibold">/login</span>.
      </p>
    </form>
  );
}
