import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant-face",
});

export const metadata: Metadata = {
  title: "Vita — Your AI Fitness Coach",
  description: "Personalised AI coaching to help you reach your body and lifestyle goals.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Vita" },
};

export const viewport: Viewport = {
  themeColor: "#080C14",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${cormorant.variable} dark h-full antialiased`} style={{ fontFamily: "var(--font-geist-sans)" }}>
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
