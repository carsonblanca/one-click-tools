"use client";

import { useTheme } from "./ThemeProvider";
import type { Locale } from "@/lib/i18n";

const themeLabels: Record<Locale, { dark: string; light: string }> = {
  en: { dark: "☾ Dark", light: "☀︎ Light" },
  "zh-cn": { dark: "☾ 深色", light: "☀︎ 浅色" },
  "zh-tw": { dark: "☾ 深色", light: "☀︎ 淺色" },
};

export default function ThemeToggle({ locale = "en" }: { locale?: Locale }) {
  const { theme, setTheme, isDark } = useTheme();
  const labels = themeLabels[locale];

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={`rounded-full border px-4 py-2 text-sm transition ${
        isDark
          ? "border-white/10 bg-white/[0.05] text-white/60 hover:bg-white/[0.08] hover:text-white"
          : "border-[#E5DED0] bg-white text-[#6B665D] hover:border-[#2563EB]/30 hover:text-[#18181B]"
      }`}
    >
      {isDark ? labels.dark : labels.light}
    </button>
  );
}