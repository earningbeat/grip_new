import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
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
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased bg-white text-slate-900 min-h-screen`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
