"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

const NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M3 12 12 4l9 8M5 10v10h14V10" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    href: "/tournaments",
    label: "Tournaments",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M8 21h8M12 17v4M5 4h14v9a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5V4Z" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  },
  {
    href: "/teams",
    label: "Teams",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="2" />
        <circle cx="17" cy="11" r="2.5" stroke="currentColor" strokeWidth="2" />
        <path d="M3 19a6 6 0 0 1 12 0M14 19a5 5 0 0 1 8 0" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  },
  {
    href: "/players",
    label: "Players",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
        <path d="M4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  },
  {
    href: "/matches",
    label: "Live matches",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M5 12c3-3 11-3 14 0M5 12c3 3 11 3 14 0" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }
];

export function AppShellNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="hidden md:flex md:flex-col w-64 shrink-0 border-r border-ink-100 bg-white">
      <div className="px-5 py-5 border-b border-ink-100">
        <Logo />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-ink-700 hover:bg-ink-50"
              )}
            >
              <span className={active ? "text-brand-700" : "text-ink-500"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-ink-100 p-4">
        <div className="flex items-center gap-3 rounded-lg p-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">
            {session?.user?.name?.[0]?.toUpperCase() ?? "G"}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-semibold">
              {session?.user?.name ?? "Guest"}
            </p>
            <p className="truncate text-xs text-ink-500">
              {session?.user?.email ?? ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm text-ink-600 hover:bg-ink-50"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
