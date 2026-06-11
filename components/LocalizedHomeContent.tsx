"use client";

import Link from "next/link";
import { localizedHome, getLocalized3dTools, type ChineseLocale } from "../lib/localizedContent";
import { useTheme } from "./ThemeProvider";

export default function LocalizedHomeContent({ locale }: { locale: ChineseLocale }) {
  const { isDark } = useTheme();
  const copy = localizedHome[locale];
  const tools = getLocalized3dTools(locale);

  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 py-16 md:py-24">
      <div className="max-w-4xl">
        <div
          className={`mb-5 inline-flex rounded-full border px-4 py-2 text-sm ${
            isDark
              ? "border-white/10 bg-white/[0.05] text-white/55"
              : "border-[#E5DED0] bg-[#FFFDF7] text-[#6B665D]"
          }`}
        >
          OneClick Tools
        </div>
        <h1 className="text-5xl font-semibold tracking-[-0.05em] md:text-7xl">
          {copy.heroTitle}
        </h1>
        <p
          className={`mt-6 max-w-3xl text-lg leading-8 md:text-xl ${
            isDark ? "text-white/60" : "text-[#6B665D]"
          }`}
        >
          {copy.heroSubtitle}
        </p>
      </div>

      <div className="mt-14">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-semibold">{copy.sectionTitle}</h2>
            <p className={`mt-3 max-w-3xl leading-7 ${isDark ? "text-white/55" : "text-[#6B665D]"}`}>
              {copy.sectionDescription}
            </p>
          </div>
          <Link
            href="/"
            className={`inline-flex rounded-2xl border px-5 py-3 text-sm ${
              isDark
                ? "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
                : "border-[#E5DED0] bg-[#FFFDF7] text-[#6B665D] hover:text-[#18181B]"
            }`}
          >
            {copy.backToEnglish}
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <Link
              key={tool.slug}
              href={`/${locale}/tools/${tool.slug}`}
              className={`group rounded-[24px] border p-5 transition ${
                isDark
                  ? "border-white/10 bg-[#101014]/80 hover:border-lime-300/35"
                  : "border-[#E5DED0] bg-[#FFFDF7]/90 hover:border-[#2563EB]/35"
              }`}
            >
              <div className={isDark ? "text-sm text-white/45" : "text-sm text-[#8A8173]"}>
                {tool.category}
              </div>
              <h3 className="mt-3 text-xl font-semibold">{tool.name}</h3>
              <p className={`mt-3 leading-7 ${isDark ? "text-white/55" : "text-[#6B665D]"}`}>
                {tool.desc}
              </p>
              <span
                className={`mt-5 inline-flex text-sm font-medium ${
                  isDark ? "text-lime-200" : "text-[#2563EB]"
                }`}
              >
                {copy.openTool}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
