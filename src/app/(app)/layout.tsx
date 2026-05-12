import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { AppShellNav } from "@/components/AppShellNav";
import { Logo } from "@/components/Logo";
import Link from "next/link";

export default async function AppLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-ink-50 flex">
      <AppShellNav />

      <div className="flex flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between border-b border-ink-100 bg-white px-4 py-3">
          <Logo />
          <Link href="/dashboard" className="text-sm font-semibold text-brand-700">
            Dashboard
          </Link>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
