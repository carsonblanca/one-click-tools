import { useTheme } from "@/components/ThemeProvider";
import {
  getLocalizedColorFamilyLabel,
  getLocalizedFilamentColorName,
  getLocalizedFinishLabel,
  getLocalizedTransparencyLabel,
  getLocalizedVariantEffectLabel,
} from "@/lib/filaments/catalog/localization";
import type { CatalogRecord } from "@/lib/filaments/catalog/mock-catalog-ext";
import type { Locale } from "@/lib/i18n";

type CardSize = "small" | "medium" | "large";

function SwatchCircle({ hex, size = 32 }: { hex: string; size?: number }) {
  return (
    <div
      className="shrink-0 rounded-full border border-white/20"
      style={{ width: size, height: size, backgroundColor: hex }}
    />
  );
}

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
  const stars = Math.round(rating);
  const items: string[] = [];
  for (let i = 0; i < max; i++) items.push(i < stars ? "★" : "☆");
  return <span className="tracking-[0.1em] text-yellow-400 text-sm">{items.join("")}</span>;
}

export default function FilamentCatalogCard({
  record,
  size = "medium",
  onClick,
  locale = "en",
}: {
  record: CatalogRecord;
  size?: CardSize;
  onClick?: () => void;
  locale?: Locale;
}) {
  const { isDark } = useTheme();
  const c = record.color;
  const familyLabel = getLocalizedColorFamilyLabel(c.colorFamily, locale);
  const finishLabel = getLocalizedFinishLabel(c.finish, locale);

  const sizeClasses: Record<CardSize, { panel: string; title: string; subtitle: string }> = {
    small:  { panel: "p-3", title: "text-xs", subtitle: "text-[11px]" },
    medium: { panel: "p-4", title: "text-sm", subtitle: "text-xs" },
    large:  { panel: "p-5", title: "text-base", subtitle: "text-sm" },
  };
  const sz = sizeClasses[size];

  return (
    <div
      onClick={onClick}
      className={`rounded-[20px] border transition cursor-pointer ${
        isDark
          ? "border-white/10 bg-white/[0.04] hover:border-lime-300/30 hover:bg-white/[0.07]"
          : "border-[#E5DED0] bg-[#FFFDF7] hover:border-[#2563EB]/30 hover:shadow-sm"
      } ${sz.panel} ${onClick ? "select-none" : ""}`}
    >
      <div className="flex items-start gap-4">
        <SwatchCircle hex={c.hex} size={size === "large" ? 48 : 36} />
        <div className="min-w-0 flex-1">
          <div className={`font-semibold truncate ${sz.title}`}>
            {getLocalizedFilamentColorName(record.color, locale)}
          </div>
          <div className={isDark ? "text-white/50" : "text-[#6B665D]"}>
            <div className={`${sz.subtitle}`}>
              {record.brand} · {record.materialType} {getLocalizedVariantEffectLabel(record.variant, locale)}
            </div>
            <div className={`mt-1 ${sz.subtitle}`}>
              <span className={isDark ? "text-white/40" : "text-[#8A8173]"}>
                {familyLabel} · {finishLabel}
              </span>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs">
            <StarRating rating={record.rating} />
            <span className={isDark ? "text-white/40" : "text-[#8A8173]"}>
              ({record.reviewCount})
            </span>
          </div>
          <div className={`mt-2 flex flex-wrap gap-2 text-[11px] ${isDark ? "text-white/40" : "text-[#8A8173]"}`}>
            <span>{getLocalizedTransparencyLabel(c.transparency, locale)}</span>
            {record.spool.cardboardSpool && <span>{locale === "en" ? "Cardboard spool" : locale === "zh-tw" ? "紙盤" : "纸盘"}</span>}
            <span>AMS: {record.spool.amsFit === "yes" ? (locale === "en" ? "Compatible" : locale === "zh-tw" ? "相容" : "兼容") : record.spool.amsFit === "conditional" ? (locale === "en" ? "Conditional" : locale === "zh-tw" ? "需適配" : "需适配") : (locale === "en" ? "Not compatible" : locale === "zh-tw" ? "不相容" : "不兼容")}</span>
            <span>{record.spool.netFilamentWeight}g</span>
          </div>
        </div>
      </div>
    </div>
  );
}
