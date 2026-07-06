import "../globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import FloatingFeedback from "@/components/FloatingFeedback";
import LanguageSuggestion from "@/components/LanguageSuggestion";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "OneClick Tools 简体中文",
  description:
    "常用计算、转换、文本处理、开发者工具和 3D 打印工具，打开网页就能用。",
  verification: {
    google: "OPJSUI9zewuMidmtCZ1Zuo009SX3JPhaFAW91HBQiwY",
  },
  openGraph: {
    title: "OneClick Tools 简体中文",
    description:
      "常用计算、转换、文本处理、开发者工具和 3D 打印工具，打开网页就能用。",
    url: "https://one-click-tools.com/zh-cn",
    siteName: "OneClick Tools",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OneClick Tools 简体中文",
    description:
      "常用计算、转换、文本处理、开发者工具和 3D 打印工具，打开网页就能用。",
  },
};

export default function SimplifiedChineseRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth">
      <body>
        <ThemeProvider>
          {children}
          <LanguageSuggestion />
          <FloatingFeedback locale="zh-cn" />
        </ThemeProvider>
      </body>
    </html>
  );
}
