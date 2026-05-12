import Link from "next/link";

export function CTA() {
  return (
    <section id="app" className="relative overflow-hidden bg-brand-700 py-20 text-white">
      <div className="absolute inset-0 bg-hero-grid [background-size:24px_24px] opacity-30" />
      <div className="container-page relative grid items-center gap-10 md:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            Ready to play?
            <br />
            Join the Game of Throws community.
          </h2>
          <p className="mt-4 max-w-lg text-lg text-white/90">
            Create your free player profile in 60 seconds. Score your first
            match today.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn bg-white text-brand-700 hover:bg-ink-100">
              Get started
            </Link>
            <Link href="/login" className="btn border border-white/30 bg-white/5 text-white hover:bg-white/10">
              Sign in
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
            <p className="text-xs uppercase tracking-wider opacity-80">Download for</p>
            <p className="mt-2 font-display text-2xl font-bold">iOS</p>
            <p className="mt-1 text-sm opacity-80">App Store</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">
            <p className="text-xs uppercase tracking-wider opacity-80">Download for</p>
            <p className="mt-2 font-display text-2xl font-bold">Android</p>
            <p className="mt-1 text-sm opacity-80">Google Play</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-5 backdrop-blur col-span-2">
            <p className="text-xs uppercase tracking-wider opacity-80">Or use it on</p>
            <p className="mt-2 font-display text-2xl font-bold">Web</p>
            <p className="mt-1 text-sm opacity-80">Open in any browser — no install needed.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
