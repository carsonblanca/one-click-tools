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

export default function HotTools({
  tools,
  locale,
}: {
  tools: Tool[];
  locale?: string;
}) {
  const { isDark } = useTheme();

  const filamentTool = tools.find(
    (t) => t.slug === "bambu-filament-preset-generator"
  );
  if (!filamentTool) return null;

  const href = locale
    ? `/${locale}/tools/${filamentTool.slug}`
    : `/tools/${filamentTool.slug}`;

  const filamentHref = locale ? `/${locale}/filaments` : "/filaments";

  return (
    <section className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
      <Link
        href={filamentHref}
        className={`group block rounded-[22px] border p-5 transition md:p-6 ${
          isDark
            ? "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
            : "border-[#E2DACB] bg-[#FFFDF8] hover:border-[#2563EB]/30 hover:shadow-sm"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div
              className={`text-xs font-medium uppercase tracking-wider ${
                isDark ? "text-lime-300" : "text-[#2563EB]"
              }`}
            >
              {locale === "zh-cn"
                ? "3D 打印"
                : locale === "zh-tw"
                ? "3D 列印"
                : "3D Printing"}
            </div>
            <h2
              className={`mt-1 text-lg font-semibold md:text-xl ${
                isDark ? "text-white" : "text-[#18181B]"
              }`}
            >
              {locale === "zh-cn"
                ? "3D 打印耗材库"
                : locale === "zh-tw"
                ? "3D 列印耗材庫"
                : "3D Printing Filament Library"}
            </h2>
            <p
              className={`mt-1 max-w-2xl text-sm leading-relaxed ${
                isDark ? "text-white/55" : "text-[#6B665D]"
              }`}
            >
              {filamentTool.desc}
            </p>
          </div>
          <span
            className={`mt-1 shrink-0 text-lg transition-transform group-hover:translate-x-1 ${
              isDark ? "text-white/40" : "text-[#8A8173]"
            }`}
          >
            →
          </span>
        </div>
      </Link>
    </section>
  );
}
