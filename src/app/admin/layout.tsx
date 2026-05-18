import Link from "next/link";
import { Logo } from "@/components/Logo";

/**
 * Standalone shell for the /admin URL. We deliberately keep this OUTSIDE the
 * (app) route group so that anonymous visitors are NOT auto-redirected to
 * /login — instead they see the admin sign-in form rendered by /admin/page.
 */
export default function AdminLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 text-ink-900">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 text-white">
        <Logo variant="light" />
        <Link
          href="/"
          className="text-sm font-semibold text-white/80 hover:text-white"
        >
          ← Back to site
        </Link>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-12">
        <div className="rounded-3xl bg-white p-4 shadow-2xl sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
