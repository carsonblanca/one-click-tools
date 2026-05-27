"use client";

import { useMemo, useState } from "react";
import ToolCard from "./ToolCard";

type Theme = "dark" | "light";

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
  theme = "dark",
}: {
  tools: Tool[];
  categories: Category[];
  theme?: Theme;
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const isDark = theme === "dark";

  const categoriesWithTools = categories.filter((category) =>
    tools.some((tool) => tool.categorySlug === category.slug)
  );

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const keyword = search.toLowerCase().trim();

      const matchesSearch =
        keyword === "" ||
        tool.name.toLowerCase().includes(keyword) ||
        tool.slug.toLowerCase().includes(keyword) ||
        tool.desc.toLowerCase().includes(keyword) ||
        tool.category.toLowerCase().includes(keyword);

      const matchesCategory =
        activeCategory === "all" || tool.categorySlug === activeCategory;

      return matchesSearch && matchesCategory;
    });
  }, [tools, search, activeCategory]);

  return (
    <section
      id="tools"
      className="relative z-10 mx-auto max-w-7xl px-6 pb-28"
    >
      <div className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p
            className={`mb-3 text-sm uppercase tracking-[0.3em] ${
              isDark ? "text-white/35" : "text-[#8A8173]"
            }`}
          >
            Tool Library
          </p>

          <h2
            className={`text-4xl font-semibold tracking-tight md:text-5xl ${
              isDark ? "text-white" : "text-[#18181B]"
            }`}
          >
            Pick a drawer.
          </h2>

          <p
            className={`mt-4 max-w-2xl leading-7 ${
              isDark ? "text-white/50" : "text-[#6B665D]"
            }`}
          >
            Search, filter, and open lightweight tools built for quick everyday
            work.
          </p>
        </div>

        <div
          className={`rounded-full border px-5 py-3 text-sm ${
            isDark
              ? "border-white/10 bg-white/[0.04] text-white/50"
              : "border-[#E5DED0] bg-[#FFFDF7] text-[#6B665D]"
          }`}
        >
          {tools.length} tools online
        </div>
      </div>

      <div
        className={`mb-8 rounded-[32px] border p-4 shadow-2xl backdrop-blur ${
          isDark
            ? "border-white/10 bg-[#0f0f13]/80 shadow-black/20"
            : "border-[#E5DED0] bg-[#FFFDF7]/90 shadow-[#18181B]/5"
        }`}
      >
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <div
              className={`pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 ${
                isDark ? "text-white/30" : "text-[#8A8173]"
              }`}
            >
              ⌕
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tools, e.g. image, json, base64..."
              className={`w-full rounded-2xl border px-12 py-4 outline-none transition ${
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
            className={`rounded-2xl border px-5 py-4 text-sm transition ${
              isDark
                ? "border-white/10 bg-white/[0.05] text-white/60 hover:bg-white/[0.08] hover:text-white"
                : "border-[#E5DED0] bg-white text-[#6B665D] hover:border-[#2563EB]/30 hover:text-[#18181B]"
            }`}
          >
            Reset
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={() => setActiveCategory("all")}
            className={`rounded-full px-4 py-2 text-sm transition ${
              activeCategory === "all"
                ? isDark
                  ? "bg-lime-300 text-black"
                  : "bg-[#2563EB] text-white"
                : isDark
                ? "bg-white/8 text-white/55 hover:bg-white/12 hover:text-white"
                : "bg-[#F5F2EA] text-[#6B665D] hover:bg-[#EEF0FF] hover:text-[#18181B]"
            }`}
          >
            All · {tools.length}
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
                className={`rounded-full px-4 py-2 text-sm transition ${
                  isActive
                    ? isDark
                      ? "bg-lime-300 text-black"
                      : "bg-[#2563EB] text-white"
                    : isDark
                    ? "bg-white/8 text-white/55 hover:bg-white/12 hover:text-white"
                    : "bg-[#F5F2EA] text-[#6B665D] hover:bg-[#EEF0FF] hover:text-[#18181B]"
                }`}
              >
                {category.name} · {count}
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={`mb-6 flex items-center justify-between text-sm ${
          isDark ? "text-white/35" : "text-[#8A8173]"
        }`}
      >
        <span>
          Showing {filteredTools.length} of {tools.length} tools
        </span>

        <span>No login required</span>
      </div>

      {filteredTools.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredTools.map((tool) => (
            <ToolCard
              key={tool.slug}
              name={tool.name}
              slug={tool.slug}
              tag={tool.category || tool.tag}
              desc={tool.desc || tool.description}
              theme={theme}
            />
          ))}
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
            No tools found
          </h3>

          <p className={isDark ? "mt-3 text-white/45" : "mt-3 text-[#6B665D]"}>
            Try another keyword or choose a different category.
          </p>
        </div>
      )}
    </section>
  );
}