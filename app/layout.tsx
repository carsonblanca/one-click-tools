import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OneClick AI Tools",
  description:
    "Free online AI tools, image tools, developer tools and productivity utilities.",

  verification: {
    google:
      "OPJSUI9zewuMidmtCZ1Zuo009SX3JPhaFAW91HBQiwY",
  },

  openGraph: {
    title: "OneClick AI Tools",
    description:
      "Free online AI tools and utilities.",
    url: "https://one-click-tools.com",
    siteName: "OneClick AI Tools",
    locale: "en_US",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "OneClick AI Tools",
    description:
      "Free online AI tools and utilities.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}