import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Game of Throws — brand badge ("Royal Striker").
 *
 * Inspired by the bold one-colour silhouette + arc treatment used by the
 * IPL mark, but reimagined for our brand:
 *
 *   - dynamic batsman silhouette in rich gold (mid pull-shot)
 *   - SWORD raised overhead instead of a cricket bat (Game of THROWS / Thrones)
 *   - GOLD CROWN sitting on the striker's head, ruby jewel at the centre
 *   - sweeping gold arc behind, curving around the back of the figure
 *
 * The gold gradient (light at the top, deep amber at the bottom) gives the
 * silhouette enough internal contrast to stay readable on both the brand-red
 * application surfaces and plain white pages — no extra outline needed.
 */
export function Logo({
  className,
  variant = "dark",
  badgeOnly = false,
  badgeSize = 40
}: {
  className?: string;
  variant?: "dark" | "light";
  badgeOnly?: boolean;
  badgeSize?: number;
}) {
  const textColor = variant === "light" ? "text-white" : "text-ink-900";
  const accentColor = variant === "light" ? "text-amber-300" : "text-brand-700";

  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)}>
      <Badge size={badgeSize} />
      {!badgeOnly && (
        <span
          className={cn(
            "font-display text-lg font-extrabold tracking-tight leading-none",
            textColor
          )}
        >
          Game of <span className={accentColor}>Throws</span>
        </span>
      )}
    </Link>
  );
}

function Badge({ size = 40 }: { size?: number }) {
  const uid = "got-striker";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Game of Throws"
      role="img"
      className="drop-shadow-[0_2px_5px_rgba(0,0,0,0.25)]"
    >
      <defs>
        {/* Rich gold gradient — light at top, deep amber at bottom so the
            silhouette stays visible on white pages too. */}
        <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe27a" />
          <stop offset="40%" stopColor="#f5b73c" />
          <stop offset="100%" stopColor="#a05a0e" />
        </linearGradient>
      </defs>

      {/* === ARC behind the player (the IPL-style swoosh) === */}
      <path
        d="M 82 14 Q 100 42 88 68 Q 76 88 52 88 Q 28 86 14 64"
        fill="none"
        stroke={`url(#${uid}-gold)`}
        strokeWidth="7"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* === PLAYER SILHOUETTE — bold single-colour gold === */}
      <g fill={`url(#${uid}-gold)`}>
        {/* Head (helmet shape) */}
        <ellipse cx="42" cy="32" rx="6" ry="6.5" />
        {/* Neck */}
        <rect x="40" y="36" width="4" height="2" />
        {/* Torso — twisted dynamically toward the camera */}
        <path
          d="M 35 38
             Q 31 46 33 54
             L 51 54
             Q 54 46 50 38
             Q 45 35 35 38 Z"
        />
        {/* Back leg — driven back / planted */}
        <path
          d="M 36 52
             L 28 66
             L 22 80
             L 27 82
             L 33 76
             L 39 64
             L 42 54 Z"
        />
        {/* Front leg — extended forward */}
        <path
          d="M 46 52
             L 54 62
             L 60 78
             L 56 84
             L 50 82
             L 48 70
             L 44 56 Z"
        />
        {/* Lead arm — fully extended up holding the top of the grip */}
        <path
          d="M 50 38
             Q 58 32 64 24
             Q 68 22 70 26
             Q 66 32 60 36
             Q 54 40 50 40 Z"
        />
        {/* Bottom arm — bent, holding lower grip */}
        <path
          d="M 36 38
             Q 36 44 42 46
             Q 50 46 50 42
             L 45 38 Z"
        />
      </g>

      {/* === CROWN on top of the player's head === */}
      <g transform="translate(42 26)">
        {/* Five-point crown */}
        <path
          d="M -8 0
             L -5 -6
             L -2 1
             L 0 -8
             L 2 1
             L 5 -6
             L 8 0
             L 8 3
             L -8 3 Z"
          fill={`url(#${uid}-gold)`}
          stroke="#3a2008"
          strokeWidth="0.6"
          strokeLinejoin="round"
        />
        {/* Base band */}
        <rect
          x="-8"
          y="3"
          width="16"
          height="2.6"
          rx="0.3"
          fill={`url(#${uid}-gold)`}
          stroke="#3a2008"
          strokeWidth="0.5"
        />
        {/* Pearls on outer spires */}
        <circle
          cx="-5"
          cy="-6"
          r="1"
          fill="#fff7d4"
          stroke="#3a2008"
          strokeWidth="0.3"
        />
        <circle
          cx="5"
          cy="-6"
          r="1"
          fill="#fff7d4"
          stroke="#3a2008"
          strokeWidth="0.3"
        />
        {/* Ruby on the tallest spire */}
        <circle
          cx="0"
          cy="-8"
          r="1.5"
          fill="#e51d1d"
          stroke="#3a2008"
          strokeWidth="0.4"
        />
        <circle cx="-0.5" cy="-8.5" r="0.5" fill="#ffd8d8" opacity="0.85" />
        {/* Centre gem on the band */}
        <circle
          cx="0"
          cy="4.2"
          r="1.1"
          fill="#e51d1d"
          stroke="#3a2008"
          strokeWidth="0.3"
        />
      </g>

      {/* === SWORD held high, raised back over the head === */}
      <g transform="translate(67 24) rotate(38)">
        {/* Blade — long, narrow, pointed tip */}
        <path
          d="M -2.8 -32 L 0 -36 L 2.8 -32 L 2.8 -2 L -2.8 -2 Z"
          fill={`url(#${uid}-gold)`}
          stroke="#3a2008"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
        {/* Centre fuller / shine line on the blade */}
        <line
          x1="0"
          y1="-34"
          x2="0"
          y2="-4"
          stroke="#fff4c8"
          strokeWidth="0.8"
          opacity="0.75"
        />
        {/* Crossguard */}
        <rect
          x="-7"
          y="-2"
          width="14"
          height="3"
          rx="0.4"
          fill={`url(#${uid}-gold)`}
          stroke="#3a2008"
          strokeWidth="0.5"
        />
        {/* Grip (dark — held between the two hands) */}
        <rect x="-1.6" y="1" width="3.2" height="7" fill="#21130a" />
        <line
          x1="-1.6"
          y1="3"
          x2="1.6"
          y2="3"
          stroke="#5b3a10"
          strokeWidth="0.35"
        />
        <line
          x1="-1.6"
          y1="5.5"
          x2="1.6"
          y2="5.5"
          stroke="#5b3a10"
          strokeWidth="0.35"
        />
        {/* Pommel */}
        <circle
          cx="0"
          cy="9.5"
          r="2"
          fill={`url(#${uid}-gold)`}
          stroke="#3a2008"
          strokeWidth="0.4"
        />
        <circle cx="0" cy="9.5" r="0.7" fill="#e51d1d" />
      </g>
    </svg>
  );
}
