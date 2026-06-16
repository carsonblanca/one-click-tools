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

export const localized3dToolSlugs = [
  "filament-cost-calculator",
  "print-time-cost-calculator",
  "filament-length-calculator",
  "3d-print-weight-calculator",
  "scale-percentage-calculator",
  "nozzle-flow-rate-calculator",
  "filament-price-comparison-calculator",
  "3d-model-search-aggregator",
  "3d-print-time-filament-estimator",
  "support-material-cost-calculator",
  "filament-spool-remaining-calculator",
  "build-plate-fit-calculator",
  "pixel-knock-board-generator",
];

const localizedBasePaths = new Set([
  "/",
  "/about",
  "/privacy",
  "/terms",
  "/contact",
  "/filaments",
  "/filaments/compare",
  ...localized3dToolSlugs.map((slug) => `/tools/${slug}`),
]);

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
  return getLanguageSwitchTarget(pathname, targetLocale).path;
}

export function getLanguageSwitchTarget(pathname: string, targetLocale: Locale) {
  const currentPath = pathname || "/";
  const basePath = stripLocalePrefix(currentPath);

  if (targetLocale === "en") {
    return {
      path: basePath,
      available: true,
    };
  }

  if (!localizedBasePaths.has(basePath)) {
    return {
      path: currentPath,
      available: false,
    };
  }

  return {
    path: basePath === "/" ? `/${targetLocale}` : `/${targetLocale}${basePath}`,
    available: true,
  };
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
