import type { Metadata, Viewport } from "next";
import { Fraunces, Geist } from "next/font/google";
import "./globals.css";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { Toaster } from "@/components/ui/sonner";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces-face",
  display: "swap",
  axes: ["opsz"],
});

const geist = Geist({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-geist-sans",
  display: "swap",
});

const SHARE_TITLE = "Vita — A private trainer who remembers you";
const SHARE_DESCRIPTION =
  "Vita is your AI personal trainer for fitness, lifestyle, and longevity goals — with personalized plans built from your own data to help you reach them with precision.";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://fitness-app-production-2ef2.up.railway.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SHARE_TITLE,
  description: SHARE_DESCRIPTION,
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Vita" },
  icons: {
    icon: [
      { url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" }],
  },
  openGraph: {
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    siteName: "Vita",
    type: "website",
    images: [{ url: "/icons/icon-512.svg", width: 512, height: 512, alt: "Vita" }],
  },
  twitter: {
    card: "summary",
    title: SHARE_TITLE,
    description: SHARE_DESCRIPTION,
    images: ["/icons/icon-512.svg"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0D12",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${geist.variable} dark h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <PostHogProvider>
          {children}
          <Toaster richColors position="bottom-right" />
        </PostHogProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js');
    });
  }
  // Sync browser timezone to server (best-effort, once per session)
  try {
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && !sessionStorage.getItem('tz_synced')) {
      fetch('/api/user/timezone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: tz }),
        credentials: 'same-origin',
      }).then(function() { sessionStorage.setItem('tz_synced', '1'); }).catch(function(){});
    }
  } catch(e) {}
`,
          }}
        />
      </body>
    </html>
  );
}
