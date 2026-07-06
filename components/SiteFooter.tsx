"use client";

import Link from "next/link";
import { useTheme } from "./ThemeProvider";
import type { Locale } from "@/lib/i18n";

const footerLinks: Record<Locale, { about: string; privacy: string; terms: string; contact: string; siteMap: string; xml: string }> = {
  en: { about: "About", privacy: "Privacy", terms: "Terms", contact: "Contact", siteMap: "Site Map", xml: "XML Sitemap" },
  "zh-cn": { about: "关于", privacy: "隐私", terms: "使用条款", contact: "联系", siteMap: "站点地图", xml: "XML 地图" },
  "zh-tw": { about: "關於", privacy: "隱私", terms: "使用條款", contact: "聯絡", siteMap: "網站地圖", xml: "XML 地圖" },
};

function localizedHref(locale: Locale, path: string) {
  return locale === "en" ? path : `/${locale}${path}`;
}

export default function SiteFooter({ locale = "en" }: { locale?: Locale }) {
  const { isDark } = useTheme();
  const labels = footerLinks[locale];

  return (
    <footer
      className={`relative z-10 border-t py-10 text-sm ${
        isDark
          ? "border-white/10 text-white/40"
          : "border-[#E5DED0] text-[#6B665D]"
      }`}
    >
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-3 px-6 md:flex-row md:justify-between">
        <div>© 2026 OneClick Tools</div>

        <div className="flex flex-wrap justify-center gap-5">
          <Link href={localizedHref(locale, "/about")} className="hover:opacity-70">
            {labels.about}
          </Link>

          <Link href={localizedHref(locale, "/privacy")} className="hover:opacity-70">
            {labels.privacy}
          </Link>

          <Link href={localizedHref(locale, "/terms")} className="hover:opacity-70">
            {labels.terms}
          </Link>

          <Link href={localizedHref(locale, "/contact")} className="hover:opacity-70">
            {labels.contact}
          </Link>

          <Link href="/site-map" className="hover:opacity-70">
            {labels.siteMap}
          </Link>

          <a href="/sitemap.xml" className="hover:opacity-70">
            {labels.xml}
          </a>
        </div>
      </div>
    </footer>
  );
}
