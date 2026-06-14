import "../globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import FloatingFeedback from "@/components/FloatingFeedback";
import LanguageSuggestion from "@/components/LanguageSuggestion";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "OneClick Tools 繁體中文",
  description:
    "常用計算、轉換、文字處理、開發者工具和 3D 列印工具，打開網頁就能用。",
  verification: {
    google: "OPJSUI9zewuMidmtCZ1Zuo009SX3JPhaFAW91HBQiwY",
  },
  openGraph: {
    title: "OneClick Tools 繁體中文",
    description:
      "常用計算、轉換、文字處理、開發者工具和 3D 列印工具，打開網頁就能用。",
    url: "https://one-click-tools.com/zh-tw",
    siteName: "OneClick Tools",
    locale: "zh_TW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OneClick Tools 繁體中文",
    description:
      "常用計算、轉換、文字處理、開發者工具和 3D 列印工具，打開網頁就能用。",
  },
};

export default function TraditionalChineseRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="zh-TW" data-scroll-behavior="smooth">
      <body>
        <ThemeProvider>
          {children}
          <LanguageSuggestion />
          <FloatingFeedback />
        </ThemeProvider>
      </body>
    </html>
  );
}
