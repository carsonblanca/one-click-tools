import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/PageShell";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import BrandProfilePage from "@/components/filaments/BrandProfilePage";
import { filamentBrandProfiles, getBrandProfile } from "@/lib/filaments/catalog/mock-filament-catalog";
import { getVisibleCatalogRecordsByBrand } from "@/lib/filaments/catalog/published-catalog";

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
    return { title: "Brand Not Found | OneClick Tools" };
  }

  return {
    title: `${brand.name} Filament Brand Profile | OneClick Tools`,
    description: brand.summary || `Verified brand profile for ${brand.name}.`,
    alternates: {
      canonical: `https://one-click-tools.com/filaments/brands/${brand.id}`,
      languages: {
        en: `https://one-click-tools.com/filaments/brands/${brand.id}`,
        "zh-CN": `https://one-click-tools.com/zh-cn/filaments/brands/${brand.id}`,
      },
    },
  };
}

export default async function BrandPage({
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
        <SiteHeader />
        <section className="relative mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="text-4xl font-semibold">Brand not found</h1>
          <Link href="/tools/bambu-filament-preset-generator" className="mt-6 inline-block underline underline-offset-4">
            ← Back to Filament Library
          </Link>
        </section>
        <SiteFooter />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <SiteHeader />
      <BrandProfilePage brand={brand} locale="en" catalogRecords={records} />
      <SiteFooter />
    </PageShell>
  );
}
