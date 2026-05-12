"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false
    });
    setLoading(false);
    if (res?.error) setError("Invalid email or password.");
    else router.push(callbackUrl);
  }

  return (
    <div className="card p-8">
      <h1 className="font-display text-2xl font-bold">Welcome back</h1>
      <p className="mt-1 text-sm text-ink-500">
        Sign in to score live and manage your cricket.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-600">
        New to Game of Throws?{" "}
        <Link href="/signup" className="font-semibold text-brand-700 hover:underline">
          Create account
        </Link>
      </p>

      <p className="mt-4 rounded-lg bg-ink-50 px-3 py-2 text-center text-xs text-ink-500">
        Demo login: <b>demo@gameofthrows.com</b> / <b>password123</b>
      </p>
    </div>
  );
}
