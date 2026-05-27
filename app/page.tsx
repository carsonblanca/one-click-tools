"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import tools from "../data/tools.json";
import categories from "../data/categories.json";
import ToolsBrowser from "../components/ToolsBrowser";
import ThemeToggle from "../components/ThemeToggle";

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

export default function Home() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem("oneclick-theme");

    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }
  }, []);

  const changeTheme = (nextTheme: Theme) => {
    setTheme(nextTheme);
    localStorage.setItem("oneclick-theme", nextTheme);
  };

  const isDark = theme === "dark";

  const toolList = tools as Tool[];
  const categoryList = categories as Category[];

  const imageCount = toolList.filter(
    (tool) => tool.categorySlug === "image"
  ).length;

  const developerCount = toolList.filter(
    (tool) => tool.categorySlug === "developer"
  ).length;

  const textCount = toolList.filter(
    (tool) => tool.categorySlug === "text"
  ).length;

  return (
    <main
      className={`relative min-h-screen overflow-hidden transition-colors duration-300 ${
        isDark ? "bg-[#08080a] text-white" : "bg-[#F5F2EA] text-[#18181B]"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 ${
          isDark
            ? "bg-[radial-gradient(circle_at_20%_0%,rgba(125,211,252,0.16),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(190,242,100,0.10),transparent_28%),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:auto,auto,48px_48px,48px_48px]"
            : "bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.12),transparent_30%),radial-gradient(circle_at_80%_5%,rgba(184,107,59,0.10),transparent_28%),linear-gradient(rgba(24,24,27,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(24,24,27,0.045)_1px,transparent_1px)] bg-[size:auto,auto,48px_48px,48px_48px]"
        }`}
      />

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

          <nav
            className={`hidden items-center gap-6 text-sm md:flex ${
              isDark ? "text-white/55" : "text-[#6B665D]"
            }`}
          >
            <a href="#tools" className="hover:opacity-100">
              Tools
            </a>

            <Link href="/site-map" className="hover:opacity-100">
              Site Map
            </Link>

            <ThemeToggle theme={theme} setTheme={changeTheme} />
          </nav>
        </div>
      </header>

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
                  <div className={isDark ? "text-sm text-white/35" : "text-sm text-[#8A8173]"}>
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
                      <span className={isDark ? "text-white/55" : "text-[#6B665D]"}>
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
                  {toolList.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ToolsBrowser
        tools={toolList}
        categories={categoryList}
        theme={theme}
      />

      <footer
        className={`relative z-10 border-t py-10 text-sm ${
          isDark
            ? "border-white/10 text-white/40"
            : "border-[#E5DED0] text-[#6B665D]"
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 px-6 md:flex-row md:justify-between">
          <div>© 2026 OneClick Tools</div>

          <div className="flex gap-5">
            <Link href="/site-map" className="hover:opacity-70">
              Site Map
            </Link>

            <a href="/sitemap.xml" className="hover:opacity-70">
              XML Sitemap
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}