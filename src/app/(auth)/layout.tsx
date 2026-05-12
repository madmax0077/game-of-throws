import { Logo } from "@/components/Logo";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-ink-50 flex flex-col">
      <header className="container-page py-5">
        <Logo />
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </div>

      <footer className="container-page py-5 text-center text-xs text-ink-500">
        <Link href="/" className="hover:text-brand-700">
          ← Back to home
        </Link>
      </footer>
    </main>
  );
}
