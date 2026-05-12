const ROLES = [
  {
    title: "Players",
    desc: "Track every run, every wicket. Build your career stats and get discovered.",
    color: "from-brand-600 to-brand-800"
  },
  {
    title: "Organizers",
    desc: "Run any tournament — local league or national event — end to end.",
    color: "from-amber-500 to-amber-700"
  },
  {
    title: "Scorers",
    desc: "The fastest mobile scoring experience built for the gully and the stadium.",
    color: "from-emerald-500 to-emerald-700"
  },
  {
    title: "Umpires",
    desc: "Manage tosses, decisions, fair-play & over rates — all on your phone.",
    color: "from-sky-500 to-sky-700"
  },
  {
    title: "Fans",
    desc: "Follow your favourite teams and players. Get instant alerts.",
    color: "from-fuchsia-500 to-fuchsia-700"
  }
];

export function Roles() {
  return (
    <section id="community" className="bg-white py-20">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
              Built for everyone in cricket
            </p>
            <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              One platform. Every role on the pitch.
            </h2>
          </div>
          <p className="max-w-md text-ink-600">
            Whether you bowl yorkers, score the match or just love the game,
            there&apos;s a home for you on Game of Throws.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {ROLES.map((r) => (
            <div
              key={r.title}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${r.color} p-6 text-white shadow-card transition hover:-translate-y-1`}
            >
              <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10 transition group-hover:scale-150" />
              <h3 className="relative font-display text-xl font-bold">
                {r.title}
              </h3>
              <p className="relative mt-2 text-sm text-white/90">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
