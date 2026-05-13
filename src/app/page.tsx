import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Roles } from "@/components/landing/Roles";

export default async function LandingPage() {
  // The logo (and any "/" link) bring users back here. For an already
  // signed-in user the marketing page would look like a signed-out
  // experience and feel like a logout. Send them to their dashboard
  // instead.
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main>
      <Navbar />
      <Hero />
      <Features />
      <Roles />
      <Footer />
    </main>
  );
}
