import "./globals.css";
import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import FloatingFeedback from "../components/FloatingFeedback";
import LanguageSuggestion from "../components/LanguageSuggestion";
import { ThemeProvider } from "../components/ThemeProvider";

export const metadata: Metadata = {
  title: "OneClick Tools",
  description:
    "Free online tools for images, text, developers and everyday web work.",
  verification: {
    google: "OPJSUI9zewuMidmtCZ1Zuo009SX3JPhaFAW91HBQiwY",
  },
  openGraph: {
    title: "OneClick Tools",
    description:
      "Free online tools for images, text, developers and everyday web work.",
    url: "https://one-click-tools.com",
    siteName: "OneClick Tools",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OneClick Tools",
    description:
      "Free online tools for images, text, developers and everyday web work.",
  },
};

function getDocumentLanguage(localeHeader: string | null) {
  if (localeHeader === "zh-CN" || localeHeader === "zh-TW") {
    return localeHeader;
  }

  return "en";
}

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const requestHeaders = await headers();
  const documentLanguage = getDocumentLanguage(
    requestHeaders.get("x-oneclick-locale"),
  );

  return (
    <html lang={documentLanguage} data-scroll-behavior="smooth">
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
