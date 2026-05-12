"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
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
      body: JSON.stringify({ name, email, password })
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
    else router.push("/dashboard");
  }

  return (
    <div className="card p-8">
      <h1 className="font-display text-2xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-ink-500">
        Join 12M+ cricketers on Game of Throws.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input
            id="name"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Sachin Tendulkar"
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
          {loading ? "Creating..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-600">
        Already a member?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
