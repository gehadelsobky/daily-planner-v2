import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { TopNav } from "@/components/layout/top-nav";
import { Footer } from "@/components/layout/footer";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Daily Planner",
  description: "Daily planner with scoring, habits and gamification",
  icons: {
    icon: "/brand-favicon.ico?v=20260218c",
    shortcut: "/brand-favicon.ico?v=20260218c",
    apple: "/brand-favicon.ico?v=20260218c"
  }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/app-fallback.css" />
      </head>
      <body className="min-h-screen">
        <Providers>
          <div className="flex min-h-screen flex-col">
            <TopNav loggedIn={Boolean(user)} />
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
