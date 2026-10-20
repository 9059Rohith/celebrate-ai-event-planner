import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import Script from "next/script";
import "./globals.css";
import { Header } from "@/components/common/Header";
import { ClientRuntime } from "@/components/common/ClientRuntime";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ||
      "https://celebrate-ai-event-planner.vercel.app",
  ),
  title: {
    default: "Celebrate AI — Make room for the memories",
    template: "%s | Celebrate AI",
  },
  description:
    "Your thoughtful event planning companion. Create personalized budgets, timelines and ideas for weddings, birthdays and community events.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "Celebrate AI — Beautifully planned",
    description:
      "Thoughtful budgets, timelines and ideas. Your people. Your way.",
    type: "website",
  },
  robots: { index: true, follow: true },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Link prefetch={false} className="skip" href="#main-content">
          Skip to content
        </Link>
        <ClientRuntime />
        <Header />
        <main id="main-content">{children}</main>
        <footer>
          <Link prefetch={false} className="brand" href="/">
            ✳ celebrate<span>ai</span>
          </Link>
          <p>Made for the moments that bring us together.</p>
          <Link prefetch={false} href="/privacy">
            Privacy &amp; your data
          </Link>
          <span>Private by design. Yours to keep.</span>
        </footer>
        {process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === "true" && (
          <Script
            src="/_vercel/insights/script.js"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
