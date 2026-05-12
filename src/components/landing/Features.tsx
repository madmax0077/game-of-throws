const FEATURES = [
  {
    title: "Ball-by-ball live scoring",
    desc: "Score every ball with one tap. Auto-calculated strike rates, run rates, partnerships, fall of wickets, Manhattan, Worm and more.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
        <path d="M5 12c3-3 11-3 14 0M5 12c3 3 11 3 14 0" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  },
  {
    title: "Tournament management",
    desc: "Create T20, ODI, Test, T10 or sixes tournaments. Auto-generate fixtures, points tables, knockouts and groups.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M8 21h8M12 17v4M5 4h14v9a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5V4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M5 7H2v2a3 3 0 0 0 3 3M19 7h3v2a3 3 0 0 1-3 3" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  },
  {
    title: "Player profile & stats",
    desc: "Career stats, batting and bowling averages, recent form, milestones — your full cricket CV in one place.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
        <path d="M4 21a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  },
  {
    title: "Live streaming",
    desc: "Stream your matches with one camera. Auto-overlays for score, batsmen, bowler and run rate built in.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="6" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="m22 8-6 4 6 4V8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    title: "Highlights & shareable cards",
    desc: "Auto-generated highlight cards for fifties, hundreds, hat-tricks, MVPs — share instantly to socials.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 2 9.4 8.6 2.5 9.3l5.3 4.6L6.2 21 12 17.3 17.8 21l-1.6-7.1 5.3-4.6-6.9-.7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  },
  {
    title: "Community & talent scout",
    desc: "Connect with cricketers near you, join clubs, find tournaments. Scouts and selectors can find rising talent.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="2" />
        <circle cx="17" cy="11" r="2.5" stroke="currentColor" strokeWidth="2" />
        <path d="M3 19a6 6 0 0 1 12 0M14 19a5 5 0 0 1 8 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
];

export function Features() {
  return (
    <section id="features" className="bg-ink-50 py-20">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
            For every cricketer
          </p>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Everything you need to live cricket — in one app
          </h2>
          <p className="mt-4 text-lg text-ink-600">
            From your first gully match to a national-level tournament — Game of
            Throws scales with you.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="card p-6 transition hover:shadow-glow hover:-translate-y-0.5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                {f.icon}
              </div>
              <h3 className="mt-5 font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
