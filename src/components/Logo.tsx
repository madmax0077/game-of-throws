import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Game of Throws — brand badge.
 *
 * A premium IPL-style cricket badge, but elevated for our brand:
 *   - shield silhouette in our brand red gradient
 *   - gold royal crown at the top (nod to "Throws"/"Thrones")
 *   - crossed cricket bats with a cricket ball at the centre
 *   - inner gold border ring for a championship feel
 *
 * The wordmark beside the badge is "Game of Throws" with "Throws" in the
 * brand red to keep the same look as the existing site.
 */
export function Logo({
  className,
  variant = "dark",
  badgeOnly = false,
  badgeSize = 36
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

function Badge({ size = 36 }: { size?: number }) {
  // Unique IDs so multiple instances on the page don't share gradients.
  // (SVG `defs` ids are document-global.)
  const uid = "got-logo";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Game of Throws"
      role="img"
      className="drop-shadow-sm"
    >
      <defs>
        <linearGradient id={`${uid}-red`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e51d1d" />
          <stop offset="55%" stopColor="#c1272d" />
          <stop offset="100%" stopColor="#7a1418" />
        </linearGradient>
        <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff0b8" />
          <stop offset="45%" stopColor="#f5b73c" />
          <stop offset="100%" stopColor="#a66c1c" />
        </linearGradient>
        <radialGradient
          id={`${uid}-glow`}
          cx="50%"
          cy="38%"
          r="60%"
          fx="50%"
          fy="38%"
        >
          <stop offset="0%" stopColor="#ff8a8a" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Shield body */}
      <path
        d="M32 4 L57 11 L57 31 C57 47 47 56 32 60 C17 56 7 47 7 31 L7 11 Z"
        fill={`url(#${uid}-red)`}
      />
      {/* Subtle inner highlight to give the shield depth */}
      <path
        d="M32 4 L57 11 L57 31 C57 47 47 56 32 60 C17 56 7 47 7 31 L7 11 Z"
        fill={`url(#${uid}-glow)`}
      />
      {/* Gold border ring */}
      <path
        d="M32 4 L57 11 L57 31 C57 47 47 56 32 60 C17 56 7 47 7 31 L7 11 Z"
        fill="none"
        stroke={`url(#${uid}-gold)`}
        strokeWidth="1.6"
      />
      {/* Inner thin outline for the championship feel */}
      <path
        d="M32 8 L53 14 L53 31 C53 44 45 52 32 56 C19 52 11 44 11 31 L11 14 Z"
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="0.8"
      />

      {/* Royal crown at the top — the "Throws/Thrones" nod */}
      <g transform="translate(32 9)">
        <path
          d="M-8 0 L-5 -4 L-2 1 L0 -6 L2 1 L5 -4 L8 0 L8 3 L-8 3 Z"
          fill={`url(#${uid}-gold)`}
          stroke="#6b3f10"
          strokeWidth="0.4"
          strokeLinejoin="round"
        />
        <circle cx="-5" cy="-4" r="0.9" fill="#fff" />
        <circle cx="0" cy="-6" r="1.1" fill="#fff" />
        <circle cx="5" cy="-4" r="0.9" fill="#fff" />
      </g>

      {/* Crossed cricket bats, X pattern, centred below the crown */}
      <g transform="translate(32 36)">
        <g transform="rotate(-32)">
          <rect
            x="-2.2"
            y="-14"
            width="4.4"
            height="22"
            rx="1.6"
            fill={`url(#${uid}-gold)`}
            stroke="#5b3a10"
            strokeWidth="0.3"
          />
          {/* Bat handle */}
          <rect
            x="-1.1"
            y="-18"
            width="2.2"
            height="6"
            rx="1"
            fill="#1a1108"
          />
          {/* Handle grip stripe */}
          <rect x="-1.1" y="-15.5" width="2.2" height="0.6" fill="#3b2812" />
        </g>
        <g transform="rotate(32)">
          <rect
            x="-2.2"
            y="-14"
            width="4.4"
            height="22"
            rx="1.6"
            fill={`url(#${uid}-gold)`}
            stroke="#5b3a10"
            strokeWidth="0.3"
          />
          <rect
            x="-1.1"
            y="-18"
            width="2.2"
            height="6"
            rx="1"
            fill="#1a1108"
          />
          <rect x="-1.1" y="-15.5" width="2.2" height="0.6" fill="#3b2812" />
        </g>
      </g>

      {/* Cricket ball at the centre */}
      <g transform="translate(32 36)">
        <circle r="5" fill="#ffffff" />
        <circle r="5" fill="none" stroke={`url(#${uid}-gold)`} strokeWidth="0.6" />
        {/* Seam (two arcs) */}
        <path
          d="M-3.6 0 Q0 -2.4 3.6 0"
          stroke="#c1272d"
          strokeWidth="0.7"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M-3.6 0 Q0 2.4 3.6 0"
          stroke="#c1272d"
          strokeWidth="0.7"
          fill="none"
          strokeLinecap="round"
        />
        {/* Stitches */}
        <g stroke="#c1272d" strokeWidth="0.4" strokeLinecap="round">
          <path d="M-2.6 -1.2 L-2.6 -1.8" />
          <path d="M-1.2 -1.8 L-1.2 -2.4" />
          <path d="M0 -2 L0 -2.6" />
          <path d="M1.2 -1.8 L1.2 -2.4" />
          <path d="M2.6 -1.2 L2.6 -1.8" />
          <path d="M-2.6 1.2 L-2.6 1.8" />
          <path d="M-1.2 1.8 L-1.2 2.4" />
          <path d="M0 2 L0 2.6" />
          <path d="M1.2 1.8 L1.2 2.4" />
          <path d="M2.6 1.2 L2.6 1.8" />
        </g>
      </g>

      {/* Premium three-star pip row at the bottom of the shield */}
      <g fill={`url(#${uid}-gold)`}>
        <Star cx={24} cy={52} r={1.6} />
        <Star cx={32} cy={53.5} r={2} />
        <Star cx={40} cy={52} r={1.6} />
      </g>
    </svg>
  );
}

function Star({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  // 5-pointed star centred at (cx,cy). Outer radius r, inner radius r/2.5
  const pts: string[] = [];
  const outer = r;
  const inner = r / 2.5;
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 === 0 ? outer : inner;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return <polygon points={pts.join(" ")} />;
}
