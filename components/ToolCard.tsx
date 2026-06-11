"use client";

import Link from "next/link";
import { useTheme } from "./ThemeProvider";

type ToolCardProps = {
  name: string;
  slug: string;
  desc: string;
  tag: string;
};

const darkCategoryStyles: Record<string, string> = {
  Image: "bg-sky-400/10 text-sky-200 border-sky-300/20",
  Text: "bg-lime-400/10 text-lime-200 border-lime-300/20",
  Developer: "bg-violet-400/10 text-violet-200 border-violet-300/20",
  Utility: "bg-amber-400/10 text-amber-200 border-amber-300/20",
  SEO: "bg-rose-400/10 text-rose-200 border-rose-300/20",
  Color: "bg-fuchsia-400/10 text-fuchsia-200 border-fuchsia-300/20",
  "Date Time": "bg-cyan-400/10 text-cyan-200 border-cyan-300/20",
  Security: "bg-emerald-400/10 text-emerald-200 border-emerald-300/20",
  Unit: "bg-orange-400/10 text-orange-200 border-orange-300/20",
  File: "bg-blue-400/10 text-blue-200 border-blue-300/20",
  AI: "bg-purple-400/10 text-purple-200 border-purple-300/20",
  Finance: "bg-green-400/10 text-green-200 border-green-300/20",
};

const lightCategoryStyles: Record<string, string> = {
  Image: "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]",
  Text: "bg-[#F2F5E8] text-[#5C6F1D] border-[#DDE8AE]",
  Developer: "bg-[#F1EFFF] text-[#6D5DFB] border-[#D8D2FF]",
  Utility: "bg-[#FFF0E5] text-[#B86B3B] border-[#F2D1B8]",
  SEO: "bg-[#FFF1F2] text-[#BE123C] border-[#FFE4E6]",
  Color: "bg-[#FDF2F8] text-[#BE185D] border-[#FBCFE8]",
  "Date Time": "bg-[#ECFEFF] text-[#0E7490] border-[#CFFAFE]",
  Security: "bg-[#ECFDF5] text-[#047857] border-[#BBF7D0]",
  Unit: "bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA]",
  File: "bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]",
  AI: "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]",
  Finance: "bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]",
};

export default function ToolCard({
  name,
  slug,
  desc,
  tag,
}: ToolCardProps) {
  const { isDark } = useTheme();

  const style = isDark
    ? darkCategoryStyles[tag] ||
      "bg-white/10 text-white/70 border-white/10"
    : lightCategoryStyles[tag] ||
      "bg-[#F4F1EA] text-[#6B665D] border-[#E5DED0]";

  return (
    <Link
      href={`/tools/${slug}`}
      className={`group relative flex min-h-[154px] flex-col overflow-hidden rounded-[20px] border p-4 transition duration-300 hover:-translate-y-0.5 md:min-h-[176px] md:rounded-[22px] md:p-5 ${
        isDark
          ? "border-white/10 bg-[#101014]/80 shadow-[0_0_0_1px_rgba(255,255,255,0.02)] hover:border-white/20 hover:bg-[#15151b]"
          : "border-[#E5DED0] bg-[#FFFDF7] shadow-[0_20px_60px_rgba(24,24,27,0.06)] hover:border-[#2563EB]/30 hover:bg-white"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent to-transparent opacity-0 transition group-hover:opacity-100 ${
          isDark ? "via-lime-300/50" : "via-[#2563EB]/40"
        }`}
      />

      <div className="mb-3 flex items-start justify-between gap-3 md:mb-4">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl border text-xs font-semibold md:h-10 md:w-10 ${
            isDark
              ? "border-white/10 bg-white/[0.04] text-white"
              : "border-[#E5DED0] bg-[#F5F2EA] text-[#18181B]"
          }`}
        >
          {name.charAt(0)}
        </div>

        <span className={`rounded-full border px-2.5 py-1 text-[11px] leading-none md:text-xs ${style}`}>
          {tag}
        </span>
      </div>

      <h3
        className={`text-lg font-semibold tracking-tight md:text-xl ${
          isDark ? "text-white" : "text-[#18181B]"
        }`}
      >
        {name}
      </h3>

      <p
        className={`mt-2 overflow-hidden text-sm leading-6 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] ${
          isDark ? "text-white/55" : "text-[#6B665D]"
        }`}
      >
        {desc}
      </p>

      <div
        className={`mt-auto flex items-center justify-between pt-4 text-xs md:text-sm ${
          isDark ? "border-white/10" : "border-[#E5DED0]"
        }`}
      >
        <span className={isDark ? "text-white/35" : "text-[#8A8173]"}>
          One click utility
        </span>

        <span
          className={`transition group-hover:translate-x-1 ${
            isDark ? "text-white" : "text-[#2563EB]"
          }`}
        >
          Open →
        </span>
      </div>
    </Link>
  );
}
