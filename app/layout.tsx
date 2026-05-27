import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
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

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}