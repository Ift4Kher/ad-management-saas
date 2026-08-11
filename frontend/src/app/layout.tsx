import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://adsync.app"),
  title: {
    default: "AdSync — Unified Multi-Platform Ad Campaign Management SaaS",
    template: "%s | AdSync",
  },
  description:
    "AdSync is an enterprise-grade SaaS platform to create, launch, automate, and track performance across Google Ads, Meta Ads, and TikTok Ads from one unified dashboard.",
  keywords: [
    "Ad Management",
    "Multi-Platform Ads",
    "Google Ads Automation",
    "Meta Ads Manager",
    "TikTok Ads SaaS",
    "Ad Campaign Optimizer",
    "Digital Marketing Dashboard",
    "Bangladeshi SaaS",
    "AI Ad Copy Generator",
  ],
  authors: [{ name: "AdSync Team" }],
  creator: "AdSync",
  publisher: "AdSync Inc.",
  formatDetection: {
    email: false,
    telephone: false,
  },
  openGraph: {
    title: "AdSync — Unified Multi-Platform Ad Campaign Management",
    description:
      "Manage Google Ads, Meta Ads, and TikTok Ads from one high-performance dashboard with automated budget pacing and AI ad copy generation.",
    url: "https://adsync.app",
    siteName: "AdSync SaaS",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AdSync Dashboard Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AdSync — Unified Ad Campaign Management",
    description: "Manage Google Ads, Meta Ads, and TikTok Ads from one unified dashboard.",
    creator: "@adsync_app",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "AdSync",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "3200",
      priceCurrency: "BDT",
    },
    description:
      "Unified multi-platform ad campaign management SaaS for Google Ads, Meta Ads, and TikTok Ads.",
  };

  return (
    <html lang="en" className={`h-full antialiased ${inter.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background font-sans text-neutral-900">
        {children}
      </body>
    </html>
  );
}
