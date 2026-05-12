import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-ink-950 text-white">
      <div className="absolute inset-0 bg-hero-grid [background-size:24px_24px] opacity-50" />
      <div className="absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-brand-700/40 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-brand-700/20 blur-3xl" />

      <div className="container-page relative grid items-center gap-12 py-20 md:grid-cols-2 lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-ink-200 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
            World&apos;s largest cricket network
          </span>

          <h1 className="mt-6 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Score live.{" "}
            <span className="text-brand-500">Run tournaments.</span>{" "}
            Build your cricket legacy.
          </h1>

          <p className="mt-6 max-w-xl text-lg text-ink-200">
            Game of Throws is the home of cricket — used by millions of players,
            organizers and fans to score matches ball-by-ball, manage
            tournaments, track stats and connect with cricketers worldwide.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary">
              Get started — it&apos;s free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14m0 0-6-6m6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <Link href="/tournaments" className="btn border border-white/20 bg-white/5 text-white hover:bg-white/10">
              Explore tournaments
            </Link>
          </div>

          <div className="mt-10 flex items-center gap-6 text-sm text-ink-300">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-9 w-9 rounded-full border-2 border-ink-950 bg-gradient-to-br from-brand-500 to-brand-800"
                />
              ))}
            </div>
            <span>Trusted by <b className="text-white">12M+</b> cricketers</span>
          </div>
        </div>

        {/* Phone mockup */}
        <div className="relative mx-auto">
          <div className="relative h-[560px] w-[280px] rounded-[40px] border-[10px] border-ink-900 bg-ink-900 shadow-2xl">
            <div className="absolute left-1/2 top-2 -translate-x-1/2 h-5 w-24 rounded-full bg-ink-950" />
            <div className="relative h-full w-full overflow-hidden rounded-[30px] bg-gradient-to-b from-brand-700 to-brand-900 p-5 text-white">
              <div className="flex items-center justify-between text-xs">
                <span>9:41</span>
                <span>LIVE</span>
              </div>
              <p className="mt-6 text-xs uppercase tracking-wider opacity-80">
                T20 • Wankhede Stadium
              </p>
              <h3 className="mt-1 font-display text-lg font-bold">
                Throws Premier League
              </h3>

              <div className="mt-6 rounded-2xl bg-white/10 p-4 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs opacity-80">Mumbai Mavericks</p>
                    <p className="font-display text-3xl font-bold">186/4</p>
                    <p className="text-xs opacity-80">19.2 ov • RR 9.61</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs opacity-80">Chennai</p>
                    <p className="font-display text-3xl font-bold">—</p>
                    <p className="text-xs opacity-80">to bat</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-white/10 p-4">
                <p className="text-xs uppercase opacity-80">This over</p>
                <div className="mt-2 flex gap-1.5">
                  {["1", "4", "•", "6", "W", "2"].map((b, i) => (
                    <div
                      key={i}
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        b === "W"
                          ? "bg-ink-950 text-white"
                          : b === "6"
                          ? "bg-emerald-400 text-ink-950"
                          : b === "4"
                          ? "bg-amber-300 text-ink-950"
                          : "bg-white/20"
                      }`}
                    >
                      {b}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-white/10 p-4 text-sm">
                <div className="flex justify-between">
                  <span>Sharma *</span>
                  <span>74 (42)</span>
                </div>
                <div className="mt-1 flex justify-between opacity-80">
                  <span>Kohli</span>
                  <span>56 (38)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
