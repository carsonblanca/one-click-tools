"use client";

import Link from "next/link";
import { useTheme } from "./ThemeProvider";
import { localizedHome, type ChineseLocale } from "../lib/localizedContent";

export default function LocalizedHomeContent({
  locale,
}: {
  locale: ChineseLocale;
}) {
  const { isDark } = useTheme();
  const copy = localizedHome[locale];

  const filamentHref = `/${locale}/filaments`;

  return (
    <section className="relative z-10 mx-auto max-w-7xl px-4 pt-8 pb-2 sm:px-6 md:pt-12 md:pb-4">
      <div
        className={`rounded-[22px] border p-6 transition md:p-8 ${
          isDark ? "border-white/10 bg-white/[0.03]" : "border-[#E2DACB] bg-[#FFFDF8]"
        }`}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className={`text-3xl font-semibold tracking-tight md:text-4xl ${isDark ? "text-white" : "text-[#18181B]"}`}>
              {copy.heroTitle}
            </h1>
            <p className={`mt-2 max-w-2xl text-sm leading-relaxed md:text-base ${isDark ? "text-white/50" : "text-[#6B665D]"}`}>
              {copy.heroSubtitle}
            </p>
          </div>
          <Link
            href={filamentHref}
            className={`shrink-0 rounded-2xl px-5 py-3 text-center text-sm font-medium transition ${
              isDark
                ? "bg-lime-300 text-black hover:bg-lime-200"
                : "bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
            }`}
          >
            {locale === "zh-cn" ? "3D 打印耗材库" : "3D 列印耗材庫"}
          </Link>
        </div>
      </div>
    </section>
  );
}
