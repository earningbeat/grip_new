import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Valuation Re-rating Tracker | Gap Ratio Analysis",
  description: "실시간 밸류에이션 리레이팅 후보 종목 추적. Gap Ratio 기반으로 미래 이익 성장이 가파른 종목을 빠르게 포착합니다.",
  keywords: ["valuation", "rerating", "P/E ratio", "gap ratio", "stock screening", "fundamental analysis"],
  authors: [{ name: "Re-rating Tracker" }],
  openGraph: {
    title: "Valuation Re-rating Tracker",
    description: "Gap Ratio 기반 밸류에이션 리레이팅 후보 추적",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-slate-950 text-slate-100 min-h-screen`}
        suppressHydrationWarning
      >
        {/* Background gradient */}
        <div className="fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),transparent)]" />

        {children}
      </body>
    </html>
  );
}
