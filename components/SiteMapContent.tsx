"use client";

import Link from "next/link";
import ToolCard from "./ToolCard";
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

export default function SiteMapContent({
  tools,
  categories,
}: {
  tools: Tool[];
  categories: Category[];
}) {
  const { isDark } = useTheme();

  const categoriesWithTools = categories.filter((category) =>
    tools.some((tool) => tool.categorySlug === category.slug)
  );

  return (
    <>
      <section className="relative z-10 mx-auto max-w-7xl px-6 pt-20 pb-16">
        <div
          className={`mb-6 inline-flex rounded-full border px-4 py-2 text-sm ${
            isDark
              ? "border-white/10 bg-white/[0.05] text-white/55"
              : "border-[#E5DED0] bg-[#FFFDF7] text-[#6B665D]"
          }`}
        >
          Human-Friendly Site Map
        </div>

        <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.06em] md:text-7xl">
          Browse all tools.
        </h1>

        <p
          className={`mt-6 max-w-2xl text-lg leading-8 ${
            isDark ? "text-white/55" : "text-[#6B665D]"
          }`}
        >
          Explore every free online tool on OneClick Tools, grouped by category
          for easier browsing.
        </p>

        <div
          className={`mt-8 rounded-2xl border p-5 text-sm ${
            isDark
              ? "border-white/10 bg-white/[0.03] text-white/50"
              : "border-[#E5DED0] bg-[#FFFDF7] text-[#6B665D]"
          }`}
        >
          Looking for the XML sitemap for search engines?{" "}
          <a
            href="/sitemap.xml"
            className={isDark ? "text-lime-200" : "text-[#2563EB]"}
          >
            Open sitemap.xml
          </a>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-24">
        <div className="space-y-14">
          {categoriesWithTools.map((category) => {
            const categoryTools = tools.filter(
              (tool) => tool.categorySlug === category.slug
            );

            return (
              <section key={category.slug}>
                <div
                  className={`mb-6 flex items-end justify-between gap-4 border-b pb-4 ${
                    isDark ? "border-white/10" : "border-[#E5DED0]"
                  }`}
                >
                  <div>
                    <h2 className="text-3xl font-semibold">
                      {category.name} Tools
                    </h2>

                    <p
                      className={`mt-2 ${
                        isDark ? "text-white/50" : "text-[#6B665D]"
                      }`}
                    >
                      {category.description}
                    </p>
                  </div>

                  <div
                    className={`hidden rounded-full px-4 py-2 text-sm md:block ${
                      isDark
                        ? "bg-white/10 text-white/50"
                        : "bg-[#FFFDF7] text-[#6B665D]"
                    }`}
                  >
                    {categoryTools.length} tools
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {categoryTools.map((tool) => (
                    <ToolCard
                      key={tool.slug}
                      name={tool.name}
                      slug={tool.slug}
                      tag={tool.category || tool.tag}
                      desc={tool.desc || tool.description}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-16">
          <Link
            href="/"
            className={`inline-flex rounded-2xl border px-6 py-4 ${
              isDark
                ? "border-white/10 bg-white/[0.04] text-white/70"
                : "border-[#E5DED0] bg-[#FFFDF7] text-[#6B665D]"
            }`}
          >
            ← Back Home
          </Link>
        </div>
      </section>
    </>
  );
}