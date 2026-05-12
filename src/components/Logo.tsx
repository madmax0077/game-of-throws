import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  variant = "dark"
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  const textColor = variant === "light" ? "text-white" : "text-ink-900";

  return (
    <Link href="/" className={cn("flex items-center gap-2", className)}>
      <svg
        width="36"
        height="36"
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <rect width="40" height="40" rx="10" fill="#c1272d" />
        {/* stylised cricket ball with seam */}
        <circle cx="20" cy="20" r="9" fill="#fff" />
        <path
          d="M14 20 Q20 16 26 20"
          stroke="#c1272d"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M14 20 Q20 24 26 20"
          stroke="#c1272d"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
        {/* stitches */}
        <path
          d="M15.5 18.5 L15.5 17.7 M17.5 17.5 L17.5 16.7 M19.5 17 L19.5 16.2 M21.5 17.2 L21.5 16.4 M23.5 17.8 L23.5 17 M15.5 21.5 L15.5 22.3 M17.5 22.5 L17.5 23.3 M19.5 23 L19.5 23.8 M21.5 22.8 L21.5 23.6 M23.5 22.2 L23.5 23"
          stroke="#c1272d"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
      <span className={cn("font-display text-lg font-extrabold tracking-tight", textColor)}>
        Game of <span className="text-brand-700">Throws</span>
      </span>
    </Link>
  );
}
