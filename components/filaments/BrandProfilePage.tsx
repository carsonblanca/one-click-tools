"use client";

import Link from "next/link";
import { useTheme } from "@/components/ThemeProvider";
import {
  type BrandProfile,
  type OfficialChannel,
  type SourceType,
} from "@/lib/filaments/catalog/mock-filament-catalog";
import { getRecordsByBrand } from "@/lib/filaments/catalog/mock-catalog-ext";
import type { CatalogRecord } from "@/lib/filaments/catalog/mock-catalog-ext";
import BrandLogo from "./BrandLogo";
import type { Locale } from "@/lib/i18n";

const BRAND_LABELS: Record<Locale, Record<string, string>> = {
  en: {
    unknown: "No reliable public evidence found yet",
    back: "← Back to Filament Library",
    officialChannel: "Official channel",
    pendingChannel: "Pending verification",
    unknownSource: "Unknown source",
    manufacturerProvided: "Manufacturer provided",
    publicVerified: "Publicly verified",
    communityVerified: "Community verified",
    marketplaceAggregated: "Marketplace aggregated",
    openPage: "Open page",
    overview: "Manufacturer overview",
    legalEntity: "Legal entity",
    countryRegion: "Brand country / region",
    headquarters: "Headquarters",
    productionLocation: "Actual production location",
    factoryStatus: "Factory status",
    catalogFilaments: "Filaments in this prototype",
    rating: "Score",
    website: "Official website",
    stores: "Official stores",
    social: "Official social accounts",
    sources: "Information sources",
    crossVerified: "Cross verified",
    lastVerified: "Last verified",
    yes: "Yes",
    no: "No",
    noDirectLink: "No direct web link. Use the official QR-code entry on the brand site.",
  },
  "zh-cn": {
    unknown: "暂未获得可靠公开证据",
    back: "← 返回 3D 打印耗材库",
    officialChannel: "官方渠道",
    pendingChannel: "待核验",
    unknownSource: "来源未知",
    manufacturerProvided: "厂商提供",
    publicVerified: "公开验证",
    communityVerified: "社区验证",
    marketplaceAggregated: "市场聚合",
    openPage: "打开页面",
    overview: "厂商概况",
    legalEntity: "公司主体",
    countryRegion: "品牌所属国家/地区",
    headquarters: "总部所在地",
    productionLocation: "实际生产地",
    factoryStatus: "工厂状态",
    catalogFilaments: "原型中的耗材",
    rating: "评分",
    website: "官方网站",
    stores: "官方旗舰店",
    social: "官方社交账号",
    sources: "信息来源",
    crossVerified: "交叉验证",
    lastVerified: "最后核验",
    yes: "是",
    no: "否",
    noDirectLink: "无直接网页链接，请使用品牌官网上的二维码入口。",
  },
  "zh-tw": {
    unknown: "暫未取得可靠公開證據",
    back: "← 返回 3D 列印耗材庫",
    officialChannel: "官方渠道",
    pendingChannel: "待核驗",
    unknownSource: "來源未知",
    manufacturerProvided: "廠商提供",
    publicVerified: "公開核驗",
    communityVerified: "社群核驗",
    marketplaceAggregated: "市場彙整",
    openPage: "開啟頁面",
    overview: "廠商概況",
    legalEntity: "公司主體",
    countryRegion: "品牌所屬國家/地區",
    headquarters: "總部所在地",
    productionLocation: "實際生產地",
    factoryStatus: "工廠狀態",
    catalogFilaments: "原型中的線材",
    rating: "評分",
    website: "官方網站",
    stores: "官方旗艦店",
    social: "官方社群帳號",
    sources: "資訊來源",
    crossVerified: "交叉核驗",
    lastVerified: "最後核驗",
    yes: "是",
    no: "否",
    noDirectLink: "無直接網頁連結，請使用品牌官網上的 QR code 入口。",
  },
};

function sourceLabel(type: SourceType, t: Record<string, string>) {
  return {
    manufacturerProvided: t.manufacturerProvided,
    publicVerified: t.publicVerified,
    communityVerified: t.communityVerified,
    marketplaceAggregated: t.marketplaceAggregated,
    unknown: t.unknownSource,
  }[type] || t.unknownSource;
}

function channelBadge(channel: OfficialChannel, t: Record<string, string>) {
  if (channel.verificationStatus === "official") return t.officialChannel;
  if (channel.verificationStatus === "pending") return t.pendingChannel;
  return t.unknownSource;
}

function brandLocaleContent(brand: BrandProfile, locale: Locale) {
  return brand.localized?.[locale] ?? (locale === "en" ? brand.localized?.en : undefined);
}

function localizeChannel(
  channel: OfficialChannel,
  content: ReturnType<typeof brandLocaleContent>,
): OfficialChannel {
  const override = channel.id ? content?.channels?.[channel.id] : undefined;
  return override ? { ...channel, ...override } : channel;
}

function localizedSourceLabel(brand: BrandProfile, locale: Locale, sourceId: string, fallback: string) {
  return brandLocaleContent(brand, locale)?.sourceLabels?.[sourceId] ?? fallback;
}

function localizedField<T>(localizedValue: T | undefined, fallback: T) {
  return localizedValue === undefined ? fallback : localizedValue;
}

function ChannelList({ channels, t }: { channels: OfficialChannel[]; t: Record<string, string> }) {
  if (channels.length === 0) {
    return <p className="text-sm opacity-65">{t.unknown}</p>;
  }
  return (
    <div className="space-y-3">
      {channels.map((channel) => (
        <div key={channel.id || `${channel.platform}-${channel.displayName}`} className="rounded-2xl border border-current/10 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <strong>{channel.displayName}</strong>
            <span className="rounded-full border border-current/15 px-2 py-1 text-xs opacity-75">
              {channelBadge(channel, t)}
            </span>
          </div>
          <p className="mt-1 text-sm opacity-70">{channel.platform} · {sourceLabel(channel.sourceType, t)} · {t.lastVerified}: {channel.verifiedAt || t.unknown}</p>
          {channel.url ? (
            <a href={channel.url} rel="noreferrer" target="_blank" className="mt-2 inline-block text-sm underline underline-offset-4">
              {t.openPage}
            </a>
          ) : (
            <p className="mt-2 text-sm opacity-65">{t.noDirectLink}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function BrandProfilePage({
  brand,
  locale = "en",
  catalogRecords,
}: {
  brand: BrandProfile;
  locale?: Locale;
  catalogRecords?: CatalogRecord[];
}) {
  const { isDark } = useTheme();
  const t = BRAND_LABELS[locale] || BRAND_LABELS.en;
  const content = brandLocaleContent(brand, locale);
  const filaments = catalogRecords || getRecordsByBrand(brand.name);
  const panelClass = `rounded-2xl border p-5 ${isDark ? "border-white/10 bg-white/[0.04]" : "border-[#E5DED0] bg-[#FFFDF7]"}`;
  const backHref = locale === "en" ? "/tools/bambu-filament-preset-generator" : `/${locale}/tools/bambu-filament-preset-generator`;
  const summary = content?.summary ?? brand.summary;
  const legalEntity = localizedField(content?.legalEntity, brand.legalEntity);
  const countryOrRegion = localizedField(content?.countryOrRegion, brand.countryOrRegion);
  const headquarters = localizedField(content?.headquarters, brand.headquarters);
  const productionLocations = localizedField(content?.productionLocations, brand.productionLocations);
  const productionLocationLabel = content?.productionLocationLabel ?? t.productionLocation;
  const factoryStatus = content?.factoryStatusLabel ?? (brand.factoryStatus === "unknown" ? t.unknown : brand.factoryStatus);
  const website = brand.website ? localizeChannel(brand.website, content) : null;
  const officialStores = brand.officialStores.map((channel) => localizeChannel(channel, content));

  return (
    <section className="relative mx-auto max-w-7xl px-6 py-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <BrandLogo brand={brand.name} size={36} />
            <h1 className="text-4xl font-semibold tracking-tight">{brand.name}</h1>
          </div>
          <p className={isDark ? "mt-3 max-w-3xl text-white/60" : "mt-3 max-w-3xl text-[#6B665D]"}>
            {summary}
          </p>
        </div>
        <Link
          href={backHref}
          className={`rounded-2xl px-5 py-3 text-sm font-medium whitespace-nowrap ${
            isDark ? "border border-white/10 text-white/70" : "border border-[#E5DED0] text-[#6B665D]"
          }`}
        >
          {t.back}
        </Link>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className={panelClass}>
          <h2 className="text-xl font-semibold">{t.overview}</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm opacity-60">{t.legalEntity}</dt>
              <dd className="mt-1 font-medium">{legalEntity || t.unknown}</dd>
            </div>
            <div>
              <dt className="text-sm opacity-60">{t.countryRegion}</dt>
              <dd className="mt-1 font-medium">{countryOrRegion || t.unknown}</dd>
            </div>
            <div>
              <dt className="text-sm opacity-60">{t.headquarters}</dt>
              <dd className="mt-1 font-medium">{headquarters || t.unknown}</dd>
            </div>
            <div>
              <dt className="text-sm opacity-60">{productionLocationLabel}</dt>
              <dd className="mt-1 font-medium">
                {productionLocations.length > 0 ? productionLocations.join(", ") : t.unknown}
              </dd>
            </div>
            <div>
              <dt className="text-sm opacity-60">{t.factoryStatus}</dt>
              <dd className="mt-1 font-medium">{factoryStatus}</dd>
            </div>
          </dl>
        </div>

        <div className={panelClass}>
          <h2 className="text-xl font-semibold">{t.catalogFilaments}</h2>
          <div className="mt-4 space-y-3">
            {filaments.length > 0 ? filaments.map((item) => (
              <Link
                key={item.id}
                href={`${locale === "en" ? "" : `/${locale}`}/filaments/${item.id}`}
                className="block rounded-2xl border border-current/10 p-4 transition hover:opacity-80"
              >
                <strong>{item.productLine}</strong>
                <p className="mt-1 text-sm opacity-70">{item.materialType} · {item.variant} · {t.rating} {Math.round(item.rating * 20)}/100</p>
              </Link>
            )) : <p className="text-sm opacity-65">{t.unknown}</p>}
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className={panelClass}>
          <h2 className="text-xl font-semibold">{t.website}</h2>
          <div className="mt-4">
            {website ? <ChannelList channels={[website]} t={t} /> : <p className="text-sm opacity-65">{t.unknown}</p>}
          </div>
        </div>
        <div className={panelClass}>
          <h2 className="text-xl font-semibold">{t.stores}</h2>
          <div className="mt-4"><ChannelList channels={officialStores} t={t} /></div>
        </div>
      </div>

      <div className={`${panelClass} mt-5`}>
        <h2 className="text-xl font-semibold">{t.sources}</h2>
        {content?.sourceSummary ? (
          <p className="mt-3 max-w-5xl text-sm leading-6 opacity-70">{content.sourceSummary}</p>
        ) : null}
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {brand.sources.map((source) => (
            <div key={source.id} className="rounded-2xl border border-current/10 p-4">
              <strong>{localizedSourceLabel(brand, locale, source.id, source.label)}</strong>
              <p className="mt-1 text-sm opacity-70">
                {sourceLabel(source.sourceType, t)} · {t.crossVerified}: {source.crossVerified ? t.yes : t.no} · {t.lastVerified}: {source.lastVerifiedAt || t.unknown}
              </p>
              {source.url ? (
                <a href={source.url} rel="noreferrer" target="_blank" className="mt-2 inline-block text-sm underline underline-offset-4">
                  {t.openPage}
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
