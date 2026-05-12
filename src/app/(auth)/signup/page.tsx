import Link from "next/link";

export default function SignupChoicePage() {
  return (
    <div className="card p-8">
      <h1 className="font-display text-2xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-ink-500">
        Choose how you&apos;ll use Game of Throws.
      </p>

      <div className="mt-6 space-y-3">
        <Link
          href="/signup/organizer"
          className="group block rounded-2xl border border-ink-200 p-5 transition hover:border-brand-300 hover:bg-brand-50/30"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path
                  d="M8 21h8M12 17v4M5 4h14v9a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5V4Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-display text-base font-bold text-ink-900">
                I&apos;m an Organizer
              </p>
              <p className="mt-0.5 text-sm text-ink-600">
                Schedule tournaments, build squads, score matches ball-by-ball,
                publish live links.
              </p>
            </div>
            <span className="text-brand-700 transition group-hover:translate-x-0.5">
              →
            </span>
          </div>
        </Link>

        <Link
          href="/signup/player"
          className="group block rounded-2xl border border-ink-200 p-5 transition hover:border-brand-300 hover:bg-brand-50/30"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                <path d="M4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-display text-base font-bold text-ink-900">
                I&apos;m a Player
              </p>
              <p className="mt-0.5 text-sm text-ink-600">
                Build your cricket profile, watch live scores, join teams in
                tournaments near you.
              </p>
            </div>
            <span className="text-brand-700 transition group-hover:translate-x-0.5">
              →
            </span>
          </div>
        </Link>
      </div>

      <p className="mt-6 text-center text-sm text-ink-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
