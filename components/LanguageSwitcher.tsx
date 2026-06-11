"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  getLocaleFromPath,
  getLocalizedPath,
  languageStorageKey,
  locales,
  type Locale,
} from "../lib/i18n";
import { useTheme } from "./ThemeProvider";

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const { isDark } = useTheme();
  const currentLocale = getLocaleFromPath(pathname || "/");

  const switchLanguage = (nextLocale: Locale) => {
    localStorage.setItem(languageStorageKey, nextLocale);
    router.push(getLocalizedPath(pathname || "/", nextLocale));
  };

  return (
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
            {locale.label}
          </option>
        ))}
      </select>
    </label>
  );
}
