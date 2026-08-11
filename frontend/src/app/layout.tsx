import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AdSync — Unified Ad Campaign Management",
  description:
    "Create, launch, and manage ad campaigns across Google Ads, Meta Ads, and TikTok Ads from one unified dashboard.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        {/* Google Fonts: Inter — the single approved typeface */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-background font-sans text-neutral-900">
        {children}
      </body>
    </html>
  );
}
