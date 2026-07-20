"use client";

import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { ColorCard as ColorCardType } from "@/lib/filaments/catalog/catalog-view-model";

type ColorCardProps = {
  card: ColorCardType;
  locale?: Locale;
};

function localizedHref(path: string, locale: Locale) {
  return locale === "en" ? path : `/${locale}${path}`;
}

function noImageLabel(locale: Locale) {
  if (locale === "zh-cn") return "暂无实物图";
  if (locale === "zh-tw") return "暫無實物圖";
  return "No image";
}

export default function ColorCard({ card, locale = "en" }: ColorCardProps) {
  const [hovered, setHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const imageUrl = card.imageUrl || card.fallbackImageUrl;
  const hasImage = Boolean(imageUrl) && !imageError;
  const safeImageUrl = imageUrl || undefined;
  const placeholder = noImageLabel(locale);

  return (
    <Link
      href={localizedHref(card.detailUrl, locale)}
      className="group relative block min-w-0 rounded-[22px] border p-4 shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 border-slate-200 bg-[#FFFDF8] shadow-[#D8CCB8]/20 hover:border-[#2563EB]/30 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.07]"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <div className="flex items-start gap-3">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-current/10">
          {hasImage ? (
            <img
              src={safeImageUrl}
              alt={card.colorNameZh}
              className="h-full w-full object-cover object-[50%_60%] transition-transform duration-300 group-hover:scale-105"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-[10px] text-slate-400 dark:bg-white/5 dark:text-white/30">
              {placeholder}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-[#18181B] dark:text-white">
            {card.productLineName}
          </h3>
          <p className="mt-0.5 text-sm text-[#6B665D] dark:text-white/60">
            {card.colorNameZh}
          </p>
          <p className="mt-0.5 text-xs text-[#8A8173] dark:text-white/50">
            {locale === "zh-cn" ? "厂家编码" : locale === "zh-tw" ? "廠家編碼" : "Mfg. code"}: {card.officialColorCode || "—"}
          </p>
          <p className="mt-1 text-xs text-[#8A8173] dark:text-white/40">
            {card.brand} · {card.materialType} {card.variant}
          </p>
        </div>
      </div>

      {hovered && hasImage ? (
        <div className="absolute left-4 top-full z-20 mt-2 hidden h-64 w-64 overflow-hidden rounded-2xl border bg-white p-2 shadow-xl sm:block dark:border-white/10 dark:bg-[#101114]">
          <img
            src={safeImageUrl}
            alt={card.colorNameZh}
            className="h-full w-full object-contain"
          />
        </div>
      ) : null}
    </Link>
  );
}
