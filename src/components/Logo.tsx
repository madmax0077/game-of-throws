import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Game of Throws — brand badge ("Royal Crest" edition).
 *
 * A bold heraldic crest designed to sit confidently on the brand-red app
 * backgrounds:
 *
 *   - deep onyx-navy shield (massive contrast against red & white)
 *   - thick gold border + thin gold inner railing for a championship coin feel
 *   - dominant gold royal crown with cream pearls and a red ruby jewel
 *   - vertical gold cricket bat down the centre (the "scepter")
 *   - ivory cricket ball at the foot with brand-red stitching
 *   - flanking gold stars + a fanned gold ribbon for a regal accent
 *
 * The wordmark beside the badge keeps the existing site styling: "Game of"
 * in ink, "Throws" in brand red (or amber when on dark/red surfaces).
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
  // Stable, unique gradient ids so multiple badges on a page don't collide.
  const uid = "got-crest";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Game of Throws"
      role="img"
      className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)]"
    >
      <defs>
        {/* Deep onyx-navy shield gradient — sits beautifully on red AND white */}
        <linearGradient id={`${uid}-onyx`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22244a" />
          <stop offset="55%" stopColor="#0d0e25" />
          <stop offset="100%" stopColor="#03030c" />
        </linearGradient>
        {/* Rich gold gradient — high-shine, three-stop for depth */}
        <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff2b2" />
          <stop offset="35%" stopColor="#f6c64a" />
          <stop offset="65%" stopColor="#d28e1e" />
          <stop offset="100%" stopColor="#8a5410" />
        </linearGradient>
        {/* Subtle highlight that gives the shield a 3D feel */}
        <radialGradient
          id={`${uid}-shine`}
          cx="50%"
          cy="32%"
          r="55%"
          fx="50%"
          fy="32%"
        >
          <stop offset="0%" stopColor="#7a7eb5" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* === SHIELD === */}
      <path
        d="M40 4 L71 12 L71 36 C71 56 58 70 40 76 C22 70 9 56 9 36 L9 12 Z"
        fill={`url(#${uid}-onyx)`}
      />
      <path
        d="M40 4 L71 12 L71 36 C71 56 58 70 40 76 C22 70 9 56 9 36 L9 12 Z"
        fill={`url(#${uid}-shine)`}
      />
      {/* Thick gold border */}
      <path
        d="M40 4 L71 12 L71 36 C71 56 58 70 40 76 C22 70 9 56 9 36 L9 12 Z"
        fill="none"
        stroke={`url(#${uid}-gold)`}
        strokeWidth="2.2"
      />
      {/* Thin inner railing */}
      <path
        d="M40 8 L67 15 L67 36 C67 53 56 65 40 71 C24 65 13 53 13 36 L13 15 Z"
        fill="none"
        stroke={`url(#${uid}-gold)`}
        strokeWidth="0.7"
        opacity="0.7"
      />

      {/* === CROWN — the dominant element === */}
      <g transform="translate(40 26)">
        {/* Crown body — five tall points */}
        <path
          d="M-15 2 L-11 -8 L-7 0 L-3 -12 L0 0 L3 -12 L7 0 L11 -8 L15 2 Z"
          fill={`url(#${uid}-gold)`}
          stroke="#4b2c08"
          strokeWidth="0.5"
          strokeLinejoin="round"
        />
        {/* Base band */}
        <rect
          x="-15"
          y="2"
          width="30"
          height="5.5"
          rx="0.8"
          fill={`url(#${uid}-gold)`}
          stroke="#4b2c08"
          strokeWidth="0.5"
        />
        {/* Band decoration line */}
        <rect
          x="-13.5"
          y="4.2"
          width="27"
          height="0.8"
          fill="#4b2c08"
          opacity="0.6"
        />
        {/* Pearl on each outer point */}
        <circle
          cx="-11"
          cy="-8"
          r="1.5"
          fill="#fff8e3"
          stroke="#4b2c08"
          strokeWidth="0.4"
        />
        <circle
          cx="11"
          cy="-8"
          r="1.5"
          fill="#fff8e3"
          stroke="#4b2c08"
          strokeWidth="0.4"
        />
        {/* Pearl on each inner peak */}
        <circle
          cx="-7"
          cy="0"
          r="1.1"
          fill="#fff8e3"
          stroke="#4b2c08"
          strokeWidth="0.3"
        />
        <circle
          cx="7"
          cy="0"
          r="1.1"
          fill="#fff8e3"
          stroke="#4b2c08"
          strokeWidth="0.3"
        />
        {/* Centre ruby on the tallest point */}
        <circle
          cx="0"
          cy="-12"
          r="2"
          fill="#e51d1d"
          stroke="#4b2c08"
          strokeWidth="0.4"
        />
        <circle cx="-0.6" cy="-12.6" r="0.6" fill="#ffd0d0" opacity="0.8" />
        {/* Centre gem in the band */}
        <circle
          cx="0"
          cy="5"
          r="1.4"
          fill="#e51d1d"
          stroke="#4b2c08"
          strokeWidth="0.3"
        />
      </g>

      {/* === SCEPTER / CRICKET BAT down the centre === */}
      <g transform="translate(40 50)">
        {/* Blade */}
        <rect
          x="-3"
          y="-10"
          width="6"
          height="20"
          rx="2"
          fill={`url(#${uid}-gold)`}
          stroke="#4b2c08"
          strokeWidth="0.5"
        />
        {/* Highlight stripe on blade */}
        <rect
          x="-2.4"
          y="-9"
          width="1.2"
          height="17"
          rx="0.6"
          fill="#fff4c8"
          opacity="0.55"
        />
        {/* Grip / handle */}
        <rect
          x="-1.4"
          y="-14"
          width="2.8"
          height="5.5"
          rx="0.8"
          fill="#1a0f04"
        />
        {/* Grip rings */}
        <rect x="-1.4" y="-12.5" width="2.8" height="0.4" fill="#5b3a10" />
        <rect x="-1.4" y="-11" width="2.8" height="0.4" fill="#5b3a10" />
        {/* Pommel */}
        <circle cx="0" cy="-15" r="1.1" fill={`url(#${uid}-gold)`} stroke="#4b2c08" strokeWidth="0.3" />
      </g>

      {/* === CRICKET BALL at the foot, brand-red seam === */}
      <g transform="translate(40 62)">
        <circle r="4.2" fill="#fdf6e3" />
        <circle
          r="4.2"
          fill="none"
          stroke={`url(#${uid}-gold)`}
          strokeWidth="0.6"
        />
        <path
          d="M-3 0 Q0 -2 3 0"
          stroke="#c1272d"
          strokeWidth="0.7"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M-3 0 Q0 2 3 0"
          stroke="#c1272d"
          strokeWidth="0.7"
          fill="none"
          strokeLinecap="round"
        />
        {/* A pair of stitch ticks for fidelity */}
        <g stroke="#c1272d" strokeWidth="0.4" strokeLinecap="round">
          <path d="M-1.4 -1.3 L-1.4 -1.9" />
          <path d="M0 -1.7 L0 -2.3" />
          <path d="M1.4 -1.3 L1.4 -1.9" />
          <path d="M-1.4 1.3 L-1.4 1.9" />
          <path d="M0 1.7 L0 2.3" />
          <path d="M1.4 1.3 L1.4 1.9" />
        </g>
      </g>

      {/* === Flanking gold stars beside the crown === */}
      <g fill={`url(#${uid}-gold)`}>
        <Star cx={18} cy={28} r={1.8} />
        <Star cx={62} cy={28} r={1.8} />
      </g>

      {/* === Ribbon hint at the foot (regal accent) === */}
      <path
        d="M28 70 L40 68 L52 70 L48 73 L40 71 L32 73 Z"
        fill={`url(#${uid}-gold)`}
        stroke="#4b2c08"
        strokeWidth="0.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Star({ cx, cy, r }: { cx: number; cy: number; r: number }) {
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
