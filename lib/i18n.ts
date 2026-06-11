export type Locale = "en" | "zh-cn" | "zh-tw";

export const defaultLocale: Locale = "en";

export const languageStorageKey = "oneclick-language-choice";

export const locales: Array<{
  code: Locale;
  label: string;
  prefix: string;
}> = [
  { code: "en", label: "English", prefix: "" },
  { code: "zh-cn", label: "简体中文", prefix: "/zh-cn" },
  { code: "zh-tw", label: "繁體中文", prefix: "/zh-tw" },
];

export function isLocale(value: string): value is Locale {
  return value === "en" || value === "zh-cn" || value === "zh-tw";
}

export function getLocaleFromPath(pathname: string): Locale {
  if (pathname === "/zh-cn" || pathname.startsWith("/zh-cn/")) {
    return "zh-cn";
  }

  if (pathname === "/zh-tw" || pathname.startsWith("/zh-tw/")) {
    return "zh-tw";
  }

  return defaultLocale;
}

export function stripLocalePrefix(pathname: string) {
  if (pathname === "/zh-cn" || pathname === "/zh-tw") {
    return "/";
  }

  if (pathname.startsWith("/zh-cn/")) {
    return pathname.slice("/zh-cn".length) || "/";
  }

  if (pathname.startsWith("/zh-tw/")) {
    return pathname.slice("/zh-tw".length) || "/";
  }

  return pathname || "/";
}

export function getLocalizedPath(pathname: string, targetLocale: Locale) {
  const basePath = stripLocalePrefix(pathname);

  if (targetLocale === "en") {
    return basePath;
  }

  return basePath === "/" ? `/${targetLocale}` : `/${targetLocale}${basePath}`;
}

export function detectBrowserLocale(languages: readonly string[]): Locale {
  const normalized = languages.map((language) => language.toLowerCase());

  if (
    normalized.some(
      (language) =>
        language === "zh-tw" ||
        language === "zh-hk" ||
        language === "zh-mo" ||
        language.includes("hant"),
    )
  ) {
    return "zh-tw";
  }

  if (
    normalized.some(
      (language) =>
        language === "zh-cn" ||
        language === "zh-sg" ||
        language.includes("hans"),
    )
  ) {
    return "zh-cn";
  }

  return "en";
}
