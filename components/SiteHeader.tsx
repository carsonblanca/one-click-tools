"use client";

import Link from "next/link";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeToggle from "./ThemeToggle";
import { useTheme } from "./ThemeProvider";

export default function SiteHeader() {
  const { isDark } = useTheme();

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
              Tiny utilities, neatly packed
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
              Tools
            </Link>

            <Link href="/site-map" className="hover:opacity-100">
              Site Map
            </Link>
          </nav>

          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
