"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { Logo } from "./Logo";

const NAV_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/#community", label: "Community" },
  { href: "/#app", label: "Get the App" },
  { href: "/#about", label: "About" }
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  // If a signed-in user somehow ends up on the landing page (e.g. server
  // redirect raced their click), we still want the navbar to reflect
  // their session so the page doesn't look like they were logged out.
  const { status } = useSession();
  const isAuthed = status === "authenticated";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-ink-100 bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Logo />

        <nav className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-ink-700 hover:text-brand-700 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthed ? (
            <Link href="/dashboard" className="btn-primary">
              Open dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Sign in
              </Link>
              <Link href="/signup" className="btn-primary">
                Get started
              </Link>
            </>
          )}
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-ink-200"
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-ink-100 bg-white">
          <div className="container-page py-4 flex flex-col gap-3">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-2 text-sm font-medium text-ink-700"
              >
                {l.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2">
              {isAuthed ? (
                <Link
                  href="/dashboard"
                  className="btn-primary flex-1"
                  onClick={() => setOpen(false)}
                >
                  Open dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="btn-outline flex-1"
                    onClick={() => setOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    href="/signup"
                    className="btn-primary flex-1"
                    onClick={() => setOpen(false)}
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
