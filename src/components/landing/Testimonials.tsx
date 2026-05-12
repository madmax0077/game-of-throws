const TESTIMONIALS = [
  {
    quote:
      "Game of Throws changed how we run our city league. Fixtures, points table, live scoring — everything in one place.",
    name: "Rohan Mehta",
    title: "Tournament organizer, Mumbai"
  },
  {
    quote:
      "I tracked every match of my college season here. The stats page got me into the state academy.",
    name: "Aditi Sharma",
    title: "All-rounder, U-22"
  },
  {
    quote:
      "Scoring on a phone in the sun is hard. This app gets out of the way and just works.",
    name: "Vikram Iyer",
    title: "Scorer, 200+ matches"
  }
];

export function Testimonials() {
  return (
    <section className="bg-ink-50 py-20">
      <div className="container-page">
        <h2 className="text-center font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Loved by cricketers everywhere
        </h2>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="card p-6">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-brand-700">
                <path d="M7 7h3a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3H7v4l-3-3H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3Zm10 0h3a3 3 0 0 1 3 3v0a3 3 0 0 1-3 3h-3v4l-3-3h0a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3Z" fill="currentColor" opacity=".15"/>
                <path d="M9 11H6a2 2 0 0 1-2-2 5 5 0 0 1 5-5M19 11h-3a2 2 0 0 1-2-2 5 5 0 0 1 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <blockquote className="mt-4 text-base leading-relaxed text-ink-800">
                “{t.quote}”
              </blockquote>
              <figcaption className="mt-5 border-t border-ink-100 pt-4">
                <p className="font-semibold">{t.name}</p>
                <p className="text-sm text-ink-500">{t.title}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
