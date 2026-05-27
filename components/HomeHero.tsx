"use client";

import Link from "next/link";
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

export default function HomeHero({ tools }: { tools: Tool[] }) {
  const { isDark } = useTheme();

  const imageCount = tools.filter(
    (tool) => tool.categorySlug === "image"
  ).length;

  const developerCount = tools.filter(
    (tool) => tool.categorySlug === "developer"
  ).length;

  const textCount = tools.filter(
    (tool) => tool.categorySlug === "text"
  ).length;

  return (
    <section className="relative z-10 mx-auto max-w-7xl px-6 pt-20 pb-16 md:pt-28 md:pb-24">
      <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div>
          <div
            className={`mb-6 inline-flex items-center gap-3 rounded-full border px-4 py-2 text-sm ${
              isDark
                ? "border-white/10 bg-white/[0.05] text-white/55"
                : "border-[#E5DED0] bg-[#FFFDF7] text-[#6B665D]"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isDark ? "bg-lime-300" : "bg-[#2563EB]"
              }`}
            />
            Free browser tools, no account required
          </div>

          <h1 className="max-w-4xl text-5xl font-semibold tracking-[-0.06em] md:text-7xl">
            A tidy drawer for everyday web work.
          </h1>

          <p
            className={`mt-7 max-w-2xl text-lg leading-8 ${
              isDark ? "text-white/55" : "text-[#6B665D]"
            }`}
          >
            Convert images, format developer data, count words, resize files,
            and handle small tasks without opening a bloated app.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="#tools"
              className={`rounded-2xl px-6 py-4 text-center font-medium transition ${
                isDark
                  ? "bg-lime-300 text-black hover:bg-lime-200"
                  : "bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
              }`}
            >
              Browse tools
            </a>

            <Link
              href="/site-map"
              className={`rounded-2xl border px-6 py-4 text-center font-medium transition ${
                isDark
                  ? "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white"
                  : "border-[#E5DED0] bg-[#FFFDF7] text-[#6B665D] hover:border-[#2563EB]/30 hover:text-[#18181B]"
              }`}
            >
              View categories
            </Link>
          </div>
        </div>

        <div className="relative">
          <div
            className={`rounded-[36px] border p-5 shadow-2xl backdrop-blur ${
              isDark
                ? "border-white/10 bg-[#101014]/80 shadow-black/30"
                : "border-[#E5DED0] bg-[#FFFDF7]/90 shadow-[#18181B]/10"
            }`}
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <div
                  className={
                    isDark ? "text-sm text-white/35" : "text-sm text-[#8A8173]"
                  }
                >
                  Current shelf
                </div>

                <div className="mt-1 text-2xl font-semibold">
                  Tool Index
                </div>
              </div>

              <div
                className={`rounded-full border px-3 py-1 text-sm ${
                  isDark
                    ? "border-white/10 bg-white/[0.05] text-white/45"
                    : "border-[#E5DED0] bg-[#F5F2EA] text-[#6B665D]"
                }`}
              >
                live
              </div>
            </div>

            <div className="grid gap-3">
              {[
                ["Image tools", imageCount],
                ["Developer tools", developerCount],
                ["Text tools", textCount],
              ].map(([label, count]) => (
                <div
                  key={label}
                  className={`rounded-3xl border p-5 ${
                    isDark
                      ? "border-white/10 bg-white/[0.04]"
                      : "border-[#E5DED0] bg-[#F5F2EA]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={isDark ? "text-white/55" : "text-[#6B665D]"}
                    >
                      {label}
                    </span>

                    <span className="text-3xl font-semibold">
                      {count}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div
              className={`mt-5 rounded-3xl p-5 ${
                isDark ? "bg-lime-300 text-black" : "bg-[#2563EB] text-white"
              }`}
            >
              <div className="text-sm font-medium opacity-70">
                Total tools
              </div>

              <div className="mt-1 text-5xl font-semibold">
                {tools.length}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}