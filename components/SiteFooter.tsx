"use client";

import Link from "next/link";
import { useTheme } from "./ThemeProvider";

export default function SiteFooter() {
  const { isDark } = useTheme();

  return (
    <footer
      className={`relative z-10 border-t py-10 text-sm ${
        isDark
          ? "border-white/10 text-white/40"
          : "border-[#E5DED0] text-[#6B665D]"
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 px-6 md:flex-row md:justify-between">
        <div>© 2026 OneClick Tools</div>

        <div className="flex gap-5">
          <Link href="/site-map" className="hover:opacity-70">
            Site Map
          </Link>

          <a href="/sitemap.xml" className="hover:opacity-70">
            XML Sitemap
          </a>
        </div>
      </div>
    </footer>
  );
}