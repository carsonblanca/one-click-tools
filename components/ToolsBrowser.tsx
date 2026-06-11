"use client";

import { useMemo, useState } from "react";
import ToolCard from "./ToolCard";
import { useTheme } from "./ThemeProvider";
import {
  getLocalized3dTool,
  localizedCategoryNames,
  localizedHome,
  type ChineseLocale,
} from "../lib/localizedContent";

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

export default function ToolsBrowser({
  tools,
  categories,
  locale = "en",
}: {
  tools: Tool[];
  categories: Category[];
  locale?: "en" | ChineseLocale;
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const { isDark } = useTheme();
  const isLocalized = locale === "zh-cn" || locale === "zh-tw";
  const localizedCopy = isLocalized ? localizedHome[locale] : null;

  const getCategoryLabel = (categoryName: string) =>
    isLocalized ? localizedCategoryNames[locale][categoryName] || categoryName : categoryName;

  const getDisplayTool = (tool: Tool) => {
    const localizedTool = isLocalized ? getLocalized3dTool(locale, tool.slug) : null;
    const categoryName = tool.category || tool.tag;

    return {
      name: localizedTool?.name || tool.name,
      desc: localizedTool?.desc || tool.desc || tool.description,
      category: localizedTool?.category || getCategoryLabel(categoryName),
      href: localizedTool ? `/${locale}/tools/${tool.slug}` : `/tools/${tool.slug}`,
    };
  };

  const categoriesWithTools = categories.filter((category) =>
    tools.some((tool) => tool.categorySlug === category.slug)
  );

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const keyword = search.toLowerCase().trim();
      const displayTool = getDisplayTool(tool);

      const matchesSearch =
        keyword === "" ||
        tool.name.toLowerCase().includes(keyword) ||
        tool.slug.toLowerCase().includes(keyword) ||
        tool.desc.toLowerCase().includes(keyword) ||
        tool.category.toLowerCase().includes(keyword) ||
        displayTool.name.toLowerCase().includes(keyword) ||
        displayTool.desc.toLowerCase().includes(keyword) ||
        displayTool.category.toLowerCase().includes(keyword);

      const matchesCategory =
        activeCategory === "all" || tool.categorySlug === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [tools, search, activeCategory, locale]);

  return (
    <section
      id="tools"
      className="relative z-10 mx-auto max-w-7xl px-4 pb-16 sm:px-6 md:pb-24"
    >
      <div className="mb-4 flex flex-col justify-between gap-3 md:mb-6 md:flex-row md:items-end">
        <div>
          <p
            className={`mb-2 text-xs uppercase tracking-[0.24em] md:text-sm md:tracking-[0.3em] ${
              isDark ? "text-white/35" : "text-[#8A8173]"
            }`}
          >
            {localizedCopy ? "OneClick Tools" : "Tool Library"}
          </p>

          <h2
            className={`text-3xl font-semibold tracking-tight md:text-4xl ${
              isDark ? "text-white" : "text-[#18181B]"
            }`}
          >
            {localizedCopy?.toolLibrary || "Pick a drawer."}
          </h2>

          <p
            className={`mt-2 max-w-2xl text-sm leading-6 md:text-base ${
              isDark ? "text-white/50" : "text-[#6B665D]"
            }`}
          >
            {localizedCopy?.toolLibraryIntro ||
              "Search, filter, and open lightweight tools built for quick everyday work."}
          </p>
        </div>

        <div
          className={`w-fit rounded-full border px-3 py-1.5 text-xs md:px-4 md:py-2 md:text-sm ${
            isDark
              ? "border-white/10 bg-white/[0.04] text-white/50"
              : "border-[#E5DED0] bg-[#FFFDF7] text-[#6B665D]"
          }`}
        >
          {localizedCopy?.toolsOnline.replace("{count}", String(tools.length)) ||
            `${tools.length} tools online`}
        </div>
      </div>

      <div
        className={`mb-4 rounded-2xl border p-3 shadow-xl backdrop-blur md:mb-5 md:rounded-[24px] md:p-4 ${
          isDark
            ? "border-white/10 bg-[#0f0f13]/80 shadow-black/20"
            : "border-[#E5DED0] bg-[#FFFDF7]/90 shadow-[#18181B]/5"
        }`}
      >
        <div className="grid gap-2 md:grid-cols-[1fr_auto] md:gap-3">
          <div className="relative">
            <div
              className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm ${
                isDark ? "text-white/30" : "text-[#8A8173]"
              }`}
            >
              ⌕
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={localizedCopy?.searchPlaceholder || "Search tools, e.g. image, json, base64..."}
              className={`w-full rounded-xl border px-10 py-3 text-sm outline-none transition md:rounded-2xl md:py-3.5 ${
                isDark
                  ? "border-white/10 bg-black/30 text-white placeholder:text-white/30 focus:border-white/25"
                  : "border-[#E5DED0] bg-[#F5F2EA] text-[#18181B] placeholder:text-[#8A8173] focus:border-[#2563EB]/40"
              }`}
            />
          </div>

          <button
            onClick={() => {
              setSearch("");
              setActiveCategory("all");
            }}
            className={`rounded-xl border px-4 py-3 text-sm transition md:rounded-2xl ${
              isDark
                ? "border-white/10 bg-white/[0.05] text-white/60 hover:bg-white/[0.08] hover:text-white"
                : "border-[#E5DED0] bg-white text-[#6B665D] hover:border-[#2563EB]/30 hover:text-[#18181B]"
            }`}
          >
            {localizedCopy?.reset || "Reset"}
          </button>
        </div>

        <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
          <button
            onClick={() => setActiveCategory("all")}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition md:text-sm ${
              activeCategory === "all"
                ? isDark
                  ? "bg-lime-300 text-black"
                  : "bg-[#2563EB] text-white"
                : isDark
                ? "bg-white/8 text-white/55 hover:bg-white/12 hover:text-white"
                : "bg-[#F5F2EA] text-[#6B665D] hover:bg-[#EEF0FF] hover:text-[#18181B]"
            }`}
          >
            {localizedCopy?.allTools || "All"} · {tools.length}
          </button>

          {categoriesWithTools.map((category) => {
            const count = tools.filter(
              (tool) => tool.categorySlug === category.slug
            ).length;

            const isActive = activeCategory === category.slug;

            return (
              <button
                key={category.slug}
                onClick={() => setActiveCategory(category.slug)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition md:text-sm ${
                  isActive
                    ? isDark
                      ? "bg-lime-300 text-black"
                      : "bg-[#2563EB] text-white"
                    : isDark
                    ? "bg-white/8 text-white/55 hover:bg-white/12 hover:text-white"
                    : "bg-[#F5F2EA] text-[#6B665D] hover:bg-[#EEF0FF] hover:text-[#18181B]"
                }`}
              >
                {getCategoryLabel(category.name)} · {count}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`mb-3 flex items-center justify-between text-xs md:mb-4 md:text-sm ${
          isDark ? "text-white/35" : "text-[#8A8173]"
        }`}
      >
        <span>
          {localizedCopy?.showingTools
            .replace("{shown}", String(filteredTools.length))
            .replace("{total}", String(tools.length)) ||
            `Showing ${filteredTools.length} of ${tools.length} tools`}
        </span>

        <span>{localizedCopy?.noLoginRequired || "No login required"}</span>
      </div>

      {filteredTools.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
          {filteredTools.map((tool) => {
            const displayTool = getDisplayTool(tool);
            const categoryName = tool.category || tool.tag;

            return (
              <ToolCard
                key={tool.slug}
                name={displayTool.name}
                slug={tool.slug}
                tag={displayTool.category}
                desc={displayTool.desc}
                href={displayTool.href}
                openLabel={localizedCopy?.openTool || "Open"}
                utilityLabel={localizedCopy?.oneClickUtility || "One click utility"}
                styleKey={categoryName}
              />
            );
          })}
        </div>
      ) : (
        <div
          className={`rounded-[32px] border p-12 text-center ${
            isDark
              ? "border-white/10 bg-white/[0.03]"
              : "border-[#E5DED0] bg-[#FFFDF7]"
          }`}
        >
          <div className="text-5xl">⌕</div>

          <h3
            className={`mt-5 text-2xl font-semibold ${
              isDark ? "text-white" : "text-[#18181B]"
            }`}
          >
            {localizedCopy?.noToolsFound || "No tools found"}
          </h3>

          <p className={isDark ? "mt-3 text-white/45" : "mt-3 text-[#6B665D]"}>
            {localizedCopy?.noToolsHint || "Try another keyword or choose a different category."}
          </p>
        </div>
      )}
    </section>
  );
}
