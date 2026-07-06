import "../globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "管理后台 | OneClick Tools",
    template: "%s | OneClick Tools 管理后台",
  },
  description: "OneClick Tools 内部管理与审核入口。",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-[#F4F6F8] text-[#18202A] antialiased">
        {children}
      </body>
    </html>
  );
}
