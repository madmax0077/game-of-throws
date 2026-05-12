import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

// This app is fully auth-gated and reads live data from Postgres on every
// request, so we never want static pre-rendering. Forcing dynamic rendering
// at the root cascades to every page and avoids "Export encountered errors"
// build failures from pages that depend on cookies/session/searchParams.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Game of Throws — World's Largest Cricket Network",
  description:
    "Game of Throws is the home of cricket — score matches live, run tournaments, build your player profile, track stats and connect with cricketers worldwide.",
  keywords: [
    "cricket",
    "live scoring",
    "tournament management",
    "cricket app",
    "Game of Throws"
  ],
  openGraph: {
    title: "Game of Throws — World's Largest Cricket Network",
    description:
      "Score matches live, run tournaments, and build your cricket legacy.",
    type: "website"
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Poppins:wght@500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
