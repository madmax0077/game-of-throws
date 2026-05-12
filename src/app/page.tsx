import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Roles } from "@/components/landing/Roles";

export default function LandingPage() {
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
