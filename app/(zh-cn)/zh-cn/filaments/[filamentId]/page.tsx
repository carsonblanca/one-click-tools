import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import FilamentDetailPageContent from "@/components/filaments/FilamentDetailPageContent";
import { CATALOG_RECORDS, getCatalogRecord } from "@/lib/filaments/catalog";
import { getLocalizedFilamentColorName } from "@/lib/filaments/catalog/localization";
import {
  listLocalPreviewKexcelledProducts,
  listPublishedKexcelledProducts,
  toPublicCatalogRecords,
} from "@/lib/filaments/catalog/published-kexcelled";

const baseUrl = "https://one-click-tools.com";

export const dynamic = "force-dynamic";

async function resolveCatalogRecord(filamentId: string) {
  const staticRecord = getCatalogRecord(filamentId);
  if (staticRecord) return staticRecord;

  try {
    const products = process.env.NODE_ENV === "production"
      ? await listPublishedKexcelledProducts()
      : await listLocalPreviewKexcelledProducts();
    return toPublicCatalogRecords(products).find((record) => record.id === filamentId);
  } catch {
    return undefined;
  }
}

async function resolveRelatedRecords(filamentId: string) {
  const staticRecord = getCatalogRecord(filamentId);
  if (staticRecord) return CATALOG_RECORDS;
  try {
    const products = process.env.NODE_ENV === "production"
      ? await listPublishedKexcelledProducts()
      : await listLocalPreviewKexcelledProducts();
    return toPublicCatalogRecords(products);
  } catch {
    return [];
  }
}

export function generateStaticParams() {
  return CATALOG_RECORDS.map((record) => ({ filamentId: record.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ filamentId: string }> }): Promise<Metadata> {
  const { filamentId } = await params;
  const record = await resolveCatalogRecord(filamentId);
  if (!record) return { title: "耗材未找到 | OneClick Tools" };

  const colorName = getLocalizedFilamentColorName(record.color, "zh-cn");
  return {
    title: `${record.brand} ${record.productLine} ${colorName} | OneClick Tools`,
    description: `${record.brand} ${record.productLine} ${record.materialType} 耗材详情，颜色：${colorName}。`,
    alternates: {
      canonical: `${baseUrl}/zh-cn/filaments/${record.id}`,
      languages: {
        en: `${baseUrl}/filaments/${record.id}`,
        "zh-CN": `${baseUrl}/zh-cn/filaments/${record.id}`,
      },
    },
  };
}

export default async function SimplifiedChineseFilamentDetailPage({ params }: { params: Promise<{ filamentId: string }> }) {
  const { filamentId } = await params;
  const record = await resolveCatalogRecord(filamentId);
  if (!record) redirect("/zh-cn/filaments");
  const relatedRecords = await resolveRelatedRecords(filamentId);

  return (
    <PageShell>
      <SiteHeader locale="zh-cn" />
      <FilamentDetailPageContent filamentId={filamentId} record={record} relatedRecords={relatedRecords} locale="zh-cn" />
      <SiteFooter locale="zh-cn" />
    </PageShell>
  );
}
