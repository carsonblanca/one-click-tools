"use client";

import ToolsBrowser from "./ToolsBrowser";
import { localizedHome, type ChineseLocale } from "../lib/localizedContent";
import { useTheme } from "./ThemeProvider";

type Tool = {
  name: string;
  slug: string;
  tag: string;
  category: string;
  categorySlug: string;
  desc: string;
  description: string;
};

type Category = {
  name: string;
  slug: string;
  description: string;
};

export default function LocalizedHomeContent({
  locale,
  tools,
  categories,
}: {
  locale: ChineseLocale;
  tools: Tool[];
  categories: Category[];
}) {
  const { isDark } = useTheme();
  const copy = localizedHome[locale];

  return (
    <>
      <section className="relative z-10 mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 md:pt-24 md:pb-16">
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
      </section>

      <ToolsBrowser tools={tools} categories={categories} locale={locale} />
    </>
  );
}
