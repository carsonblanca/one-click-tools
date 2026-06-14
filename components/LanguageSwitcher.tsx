"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getLocaleFromPath,
  getLanguageSwitchTarget,
  languageStorageKey,
  locales,
  type Locale,
} from "../lib/i18n";
import { useTheme } from "./ThemeProvider";

const localeLabels: Record<Locale, Record<Locale, string>> = {
  en: {
    en: "English",
    "zh-cn": "Simplified Chinese",
    "zh-tw": "Traditional Chinese",
  },
  "zh-cn": {
    en: "English",
    "zh-cn": "简体中文",
    "zh-tw": "繁體中文",
  },
  "zh-tw": {
    en: "English",
    "zh-cn": "简体中文",
    "zh-tw": "繁體中文",
  },
};

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const { isDark } = useTheme();
  const [notice, setNotice] = useState("");
  const currentLocale = getLocaleFromPath(pathname || "/");

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timer = window.setTimeout(() => setNotice(""), 3200);

    return () => window.clearTimeout(timer);
  }, [notice]);

  const switchLanguage = (nextLocale: Locale) => {
    localStorage.setItem(languageStorageKey, nextLocale);
    setNotice("");

    const target = getLanguageSwitchTarget(pathname || "/", nextLocale);

    if (!target.available) {
      setNotice(
        currentLocale === "en"
          ? `The ${
              nextLocale === "zh-tw" ? "Traditional Chinese" : "Simplified Chinese"
            } version of this tool is not ready yet.`
          : nextLocale === "zh-tw"
            ? "這個工具的繁體中文版本正在完善中。"
            : "这个工具的简体中文版本正在完善中。",
      );
      return;
    }

    if (target.path !== pathname) {
      router.push(target.path);
    }
  };

  return (
    <div className="relative flex items-center">
      <label className="flex items-center">
        <span className="sr-only">Language</span>
        <select
          aria-label="Select language"
          value={currentLocale}
          onChange={(event) => switchLanguage(event.target.value as Locale)}
          className={`h-10 rounded-full border px-3 text-sm outline-none transition sm:px-4 ${
            isDark
              ? "border-white/10 bg-[#111418] text-white/70 hover:bg-white/[0.06] focus:border-lime-300/40"
              : "border-[#E5DED0] bg-white text-[#6B665D] hover:border-[#2563EB]/30 focus:border-[#2563EB]/40"
          }`}
        >
          {locales.map((locale) => (
            <option key={locale.code} value={locale.code}>
              {localeLabels[currentLocale][locale.code]}
            </option>
          ))}
        </select>
      </label>

      {notice ? (
        <div
          role="status"
          aria-live="polite"
          className={`absolute right-0 top-12 z-50 w-64 rounded-2xl border p-3 text-sm leading-6 shadow-xl ${
            isDark
              ? "border-white/10 bg-[#101418] text-white/70 shadow-black/35"
              : "border-[#E5DED0] bg-[#FFFDF7] text-[#6B665D] shadow-[#18181B]/15"
          }`}
        >
          {notice}
        </div>
      ) : null}
    </div>
  );
}
