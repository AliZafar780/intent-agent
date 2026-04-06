import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@/lib/components/ToastProvider";
import "./globals.css";

const sans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Intent Agent",
  description: "Intent-driven AI operations with explicit permission mapping and secure execution via Auth0 Token Vault.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isDemo = process.env.DEMO_MODE === "true";

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sans.variable} ${mono.variable} min-h-screen antialiased`} suppressHydrationWarning>
        {isDemo && (
          <div className="bg-orange-500/20 border-b border-orange-500/50 px-4 py-2 text-center text-orange-200 text-sm font-medium z-50 relative">
            <span className="font-bold mr-2">🚀 DEMO MODE ACTIVE:</span>
            Auth0 login is bypassed. Live API execution uses dummy data. To test real capabilities, turn off Demo Mode in Vercel env and configure Auth0.
          </div>
        )}
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
