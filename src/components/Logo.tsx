import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Game of Throws — brand badge.
 *
 * Uses the real cricketer artwork (`/logo-base.jpg`) untouched as the base
 * layer, and only overlays the minimum bits needed to fit our brand:
 *
 *   - a small dark-navy crossguard + pointed tip on the bat (in the same blue
 *     as the silhouette) → turns the bat into a sword
 *
 * Everything else from the original image is preserved exactly.
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

/**
 * The base image is a 184x184 PNG. The overlay coordinates below were
 * picked by sampling the image, so all positions are in the same 184x184
 * pixel space. Do not change them without re-checking.
 */
function Badge({ size = 40 }: { size?: number }) {
  // Silhouette navy sampled from the image at (90,90) ≈ rgb(25,54,146).
  const silhouetteBlue = "#19388e";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 184 184"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Game of Throws"
      role="img"
    >
      {/* === ORIGINAL ARTWORK (untouched) === */}
      <image href="/logo-base.jpg" x="0" y="0" width="184" height="184" />

      {/* === SWORD DETAILS — added in the same navy as the silhouette so
              they read as part of the figure (turn the bat into a sword) === */}
      <g fill={silhouetteBlue}>
        {/* Pointed blade tip — small triangle extending the bat's tip leftward */}
        <polygon points="42,33  28,36  42,40" />
        {/* Crossguard — perpendicular bar at the blade/handle boundary */}
        <rect x="77" y="20" width="7" height="22" rx="1.5" />
      </g>
    </svg>
  );
}
