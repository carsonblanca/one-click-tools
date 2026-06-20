"use client";

import Link from "next/link";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "./ThemeProvider";
import type { Locale } from "@/lib/i18n";

const headerLabels: Record<Locale, { tagline: string; tools: string; siteMap: string }> = {
  en: { tagline: "Tiny utilities, neatly packed", tools: "Tools", siteMap: "Site Map" },
  "zh-cn": { tagline: "常用工具，打开即用", tools: "工具", siteMap: "站点地图" },
  "zh-tw": { tagline: "常用工具，打開即用", tools: "工具", siteMap: "網站地圖" },
};

export default function SiteHeader({ locale = "en" }: { locale?: Locale }) {
  const { isDark } = useTheme();
  const labels = headerLabels[locale];

  return (
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-xl ${
        isDark
          ? "border-white/10 bg-[#08080a]/80"
          : "border-[#E5DED0] bg-[#F5F2EA]/85"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-2xl border text-sm font-bold ${
              isDark
                ? "border-white/10 bg-white text-black"
                : "border-[#E5DED0] bg-[#18181B] text-white"
            }`}
          >
            OC
          </div>

          <div>
            <div className="text-lg font-semibold leading-none">
              OneClick Tools
            </div>

            <div
              className={`mt-1 hidden text-xs sm:block ${
                isDark ? "text-white/35" : "text-[#6B665D]"
              }`}
            >
              {labels.tagline}
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <nav
            className={`hidden items-center gap-6 text-sm md:flex ${
              isDark ? "text-white/55" : "text-[#6B665D]"
            }`}
          >
            <Link href="/#tools" className="hover:opacity-100">
              {labels.tools}
            </Link>

            <Link href="/site-map" className="hover:opacity-100">
              {labels.siteMap}
            </Link>
          </nav>

          <LanguageSwitcher />
          <ThemeToggle locale={locale} />
        </div>
      </div>
    </header>
  );
}
