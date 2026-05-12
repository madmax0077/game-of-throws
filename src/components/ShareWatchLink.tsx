"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * "Share live link" controls. Builds the absolute /watch/<matchId> URL from
 * the current origin so it works locally AND on Vercel without configuration.
 *
 * Buttons:
 *   - Open live view (new tab)
 *   - Copy share link (clipboard)
 *   - WhatsApp share (wa.me link with pre-filled text)
 *   - Native share (Web Share API — only shown if the browser supports it,
 *     so on mobile you get the iOS/Android share sheet directly).
 */
export function ShareWatchLink({
  matchId,
  matchTitle
}: {
  matchId: string;
  matchTitle?: string;
}) {
  const [url, setUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setUrl(`${window.location.origin}/watch/${matchId}`);
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function"
    );
  }, [matchId]);

  const shareText = matchTitle
    ? `Live cricket score: ${matchTitle}`
    : "Watch this match live on Game of Throws";
  const waHref = url
    ? `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${url}`)}`
    : "#";

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // older browsers / file:// — quietly do nothing
    }
  }

  async function nativeShare() {
    if (!url || !navigator.share) return;
    try {
      await navigator.share({ title: shareText, text: shareText, url });
    } catch {
      // user dismissed the share sheet — ignore
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={`/watch/${matchId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-outline"
      >
        Open live view ↗
      </Link>

      <button
        type="button"
        onClick={copy}
        disabled={!url}
        className="btn bg-ink-900 text-white hover:bg-ink-800 disabled:opacity-50"
      >
        {copied ? "Link copied ✓" : "Copy link"}
      </button>

      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className={`btn inline-flex items-center gap-1.5 bg-[#25D366] text-white hover:bg-[#1DA851] ${
          url ? "" : "pointer-events-none opacity-50"
        }`}
        aria-label="Share on WhatsApp"
      >
        <WhatsAppIcon />
        WhatsApp
      </a>

      {canNativeShare && (
        <button
          type="button"
          onClick={nativeShare}
          className="btn border border-ink-200 bg-white text-ink-700 hover:border-brand-200 hover:text-brand-700"
        >
          Share…
        </button>
      )}
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.34 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.52-.075-.149-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
    </svg>
  );
}
