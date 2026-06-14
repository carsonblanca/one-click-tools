"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  detectBrowserLocale,
  getLocaleFromPath,
  getLocalizedPath,
  languageStorageKey,
  type Locale,
} from "../lib/i18n";
import { useTheme } from "./ThemeProvider";

const suggestionCopy: Record<"zh-cn" | "zh-tw", {
  message: string;
  switchLabel: string;
  continueLabel: string;
}> = {
  "zh-cn": {
    message: "Your browser language looks like Simplified Chinese. Switch?",
    switchLabel: "Switch to Simplified Chinese",
    continueLabel: "Stay in English",
  },
  "zh-tw": {
    message: "Your browser language looks like Traditional Chinese. Switch?",
    switchLabel: "Switch to Traditional Chinese",
    continueLabel: "Stay in English",
  },
};

export default function LanguageSuggestion() {
  const pathname = usePathname();
  const router = useRouter();
  const { isDark } = useTheme();
  const [suggestedLocale, setSuggestedLocale] = useState<"zh-cn" | "zh-tw" | null>(null);

  useEffect(() => {
    const currentLocale = getLocaleFromPath(pathname || "/");

    if (currentLocale !== "en" || pathname !== "/") {
      return;
    }

    if (localStorage.getItem(languageStorageKey)) {
      return;
    }

    const detected = detectBrowserLocale(navigator.languages?.length ? navigator.languages : [navigator.language]);

    if (detected !== "zh-cn" && detected !== "zh-tw") {
      return;
    }

    const timer = window.setTimeout(() => {
      setSuggestedLocale(detected);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pathname]);

  const rememberChoice = (locale: Locale) => {
    localStorage.setItem(languageStorageKey, locale);
  };

  const switchToSuggested = () => {
    if (!suggestedLocale) {
      return;
    }

    rememberChoice(suggestedLocale);
    router.push(getLocalizedPath(pathname || "/", suggestedLocale));
    setSuggestedLocale(null);
  };

  const continueEnglish = () => {
    rememberChoice("en");
    setSuggestedLocale(null);
  };

  if (!suggestedLocale) {
    return null;
  }

  const copy = suggestionCopy[suggestedLocale];

  return (
    <div
      className={`fixed right-4 bottom-40 z-40 max-w-[calc(100vw-2rem)] rounded-2xl border p-4 shadow-xl sm:right-6 sm:max-w-md ${
        isDark
          ? "border-white/10 bg-[#101418] text-white shadow-black/35"
          : "border-[#E5DED0] bg-[#FFFDF7] text-[#18181B] shadow-[#18181B]/15"
      }`}
      role="status"
      aria-live="polite"
    >
      <p className={isDark ? "text-sm leading-6 text-white/70" : "text-sm leading-6 text-[#6B665D]"}>
        {copy.message}
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={switchToSuggested}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            isDark
              ? "bg-lime-300 text-black hover:bg-lime-200"
              : "bg-[#18181B] text-white hover:bg-[#2D2D32]"
          }`}
        >
          {copy.switchLabel}
        </button>
        <button
          type="button"
          onClick={continueEnglish}
          className={`rounded-full border px-4 py-2 text-sm transition ${
            isDark
              ? "border-white/10 bg-white/[0.04] text-white/65 hover:bg-white/[0.08] hover:text-white"
              : "border-[#E5DED0] bg-[#F5F2EA] text-[#6B665D] hover:text-[#18181B]"
          }`}
        >
          {copy.continueLabel}
        </button>
      </div>
    </div>
  );
}
