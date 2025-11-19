import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FRED Dashboard",
  description: "Interactive FRED time-series dashboard with notes and PNG export.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-100 text-slate-900`}
      >
        <div className="min-h-screen">
          <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <div className="relative h-9 w-9 rounded-md bg-slate-100 ring-1 ring-slate-200">
                  <Image
                    src="/images/logo.png"
                    alt="Dashboard logo"
                    fill
                    sizes="36px"
                    className="rounded-md object-contain p-1.5"
                    priority
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold tracking-tight text-slate-900">
                    TLG Macro Dashboard
                  </span>
                </div>
              </div>
              <span className="hidden text-xs text-slate-400 sm:inline">
                Data via FRED® (Federal Reserve Economic Data)
              </span>
            </div>
          </header>
          <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
