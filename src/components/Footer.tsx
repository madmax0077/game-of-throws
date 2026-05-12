import Link from "next/link";
import { Logo } from "./Logo";

const COLS = [
  {
    title: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/tournaments", label: "Tournaments" },
      { href: "/#community", label: "Community" },
      { href: "/#app", label: "Mobile App" }
    ]
  },
  {
    title: "For",
    links: [
      { href: "/#players", label: "Players" },
      { href: "/#organizers", label: "Organizers" },
      { href: "/#scorers", label: "Scorers" },
      { href: "/#umpires", label: "Umpires" },
      { href: "/#fans", label: "Fans" }
    ]
  },
  {
    title: "Company",
    links: [
      { href: "/#about", label: "About" },
      { href: "/#careers", label: "Careers" },
      { href: "/#contact", label: "Contact" },
      { href: "/#blog", label: "Blog" }
    ]
  },
  {
    title: "Legal",
    links: [
      { href: "/#privacy", label: "Privacy" },
      { href: "/#terms", label: "Terms" },
      { href: "/#cookies", label: "Cookies" }
    ]
  }
];

export function Footer() {
  return (
    <footer className="bg-ink-950 text-ink-200">
      <div className="container-page py-14">
        <div className="grid gap-10 md:grid-cols-6">
          <div className="md:col-span-2">
            <Logo variant="light" />
            <p className="mt-4 text-sm leading-relaxed text-ink-300 max-w-xs">
              The world&apos;s largest cricket network. Score live, run
              tournaments, build your player profile, connect with cricketers
              everywhere.
            </p>
            <div className="mt-6 flex gap-3">
              <a href="#" className="rounded-lg bg-ink-900 px-3 py-2 text-xs font-semibold hover:bg-ink-800">
                App Store
              </a>
              <a href="#" className="rounded-lg bg-ink-900 px-3 py-2 text-xs font-semibold hover:bg-ink-800">
                Google Play
              </a>
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-white">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-ink-300 hover:text-white transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col justify-between gap-4 border-t border-ink-800 pt-6 md:flex-row md:items-center">
          <p className="text-xs text-ink-400">
            © {new Date().getFullYear()} Game of Throws. All rights reserved.
          </p>
          <p className="text-xs text-ink-400">
            Made with ❤ for cricketers everywhere.
          </p>
        </div>
      </div>
    </footer>
  );
}
