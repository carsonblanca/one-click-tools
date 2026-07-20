import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import BrandProfilePage from "@/components/filaments/BrandProfilePage";
import { filamentBrandProfiles, getBrandProfile } from "@/lib/filaments/catalog/mock-filament-catalog";
import { getVisibleCatalogRecordsByBrand } from "@/lib/filaments/catalog/published-catalog";

const baseUrl = "https://one-click-tools.com";
export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return filamentBrandProfiles.map((brand) => ({ brandId: brand.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brandId: string }>;
}): Promise<Metadata> {
  const { brandId } = await params;
  const brand = getBrandProfile(brandId);

  if (!brand) {
    return { title: "品牌未找到 | OneClick Tools" };
  }

  const localized = brand.localized?.["zh-cn"];
  const description = localized?.summary || `${brand.name} 的 3D 打印耗材品牌档案。`;

  return {
    title: `${brand.name} 品牌档案 | OneClick Tools`,
    description,
    alternates: {
      canonical: `${baseUrl}/zh-cn/filaments/brands/${brand.id}`,
      languages: {
        en: `${baseUrl}/filaments/brands/${brand.id}`,
        "zh-CN": `${baseUrl}/zh-cn/filaments/brands/${brand.id}`,
      },
    },
  };
}

export default async function SimplifiedChineseBrandPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const brand = getBrandProfile(brandId);
  const records = brand ? await getVisibleCatalogRecordsByBrand(brand.name) : [];

  if (!brand) {
    return (
      <PageShell>
        <SiteHeader locale="zh-cn" />
        <section className="relative mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="text-4xl font-semibold">品牌未找到</h1>
          <Link href="/zh-cn/tools/bambu-filament-preset-generator" className="mt-6 inline-block underline underline-offset-4">
            ← 返回 3D 打印耗材库
          </Link>
        </section>
        <SiteFooter locale="zh-cn" />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <SiteHeader locale="zh-cn" />
      <BrandProfilePage brand={brand} locale="zh-cn" catalogRecords={records} />
      <SiteFooter locale="zh-cn" />
    </PageShell>
  );
}
