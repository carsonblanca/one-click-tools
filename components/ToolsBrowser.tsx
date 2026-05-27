"use client";

import { useMemo, useState } from "react";
import ToolCard from "./ToolCard";

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
}: {
  tools: Tool[];
  categories: Category[];
}) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

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
      className="relative z-10 mx-auto max-w-7xl px-6 pb-24"
    >
      <div className="mb-10">
        <h2 className="text-3xl font-bold">All Tools</h2>

        <p className="mt-3 text-white/50">
          Search and browse tools by category.
        </p>
      </div>

      <div className="mb-8 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tools, e.g. image, json, base64..."
          className="w-full rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-white outline-none placeholder:text-white/30"
        />

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={() => setActiveCategory("all")}
            className={`rounded-full px-4 py-2 text-sm transition ${
              activeCategory === "all"
                ? "bg-purple-600 text-white"
                : "bg-white/10 text-white/60 hover:bg-white/15 hover:text-white"
            }`}
          >
            All ({tools.length})
          </button>

          {categoriesWithTools.map((category) => {
            const count = tools.filter(
              (tool) => tool.categorySlug === category.slug
            ).length;

            return (
              <button
                key={category.slug}
                onClick={() => setActiveCategory(category.slug)}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  activeCategory === category.slug
                    ? "bg-purple-600 text-white"
                    : "bg-white/10 text-white/60 hover:bg-white/15 hover:text-white"
                }`}
              >
                {category.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      <div className="mb-6 text-sm text-white/40">
        Showing {filteredTools.length} of {tools.length} tools
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
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center text-white/50">
          No tools found. Try a different keyword or category.
        </div>
      )}
    </section>
  );
}