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
      <body className={`${sans.variable} ${mono.variable} min-h-screen antialiased flex flex-col`} suppressHydrationWarning>
        <div className="bg-violet-900/40 border-b border-violet-500/30 text-violet-100 px-4 py-2 text-xs text-center flex flex-col sm:flex-row items-center justify-center gap-2 z-50 shrink-0">
          <span className="font-semibold flex items-center gap-1.5 whitespace-nowrap">
            <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            Hackathon Judging Mode
          </span>
          <span className="opacity-90">Live Auth0 login is active, but OAuth integrations are <b>bypassed</b> for seamless testing.</span>
          <span className="opacity-75 hidden sm:inline">Powered by Groq. Tools return simulated realistic data.</span>
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          <ToastProvider>
            {children}
          </ToastProvider>
        </div>
      </body>
    </html>
  );
}
