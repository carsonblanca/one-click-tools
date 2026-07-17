import type { Metadata } from "next";
import { redirect } from "next/navigation";
import PageShell from "@/components/PageShell";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import FilamentDetailPageContent from "@/components/filaments/FilamentDetailPageContent";
import { getVisibleCatalogRecord } from "@/lib/filaments/catalog/published-visible-record";
import { getLocalizedFilamentColorName } from "@/lib/filaments/catalog/localization";

const baseUrl = "https://one-click-tools.com";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ filamentId: string }> }): Promise<Metadata> {
  const { filamentId } = await params;
  const record = await getVisibleCatalogRecord(filamentId);
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
  const record = await getVisibleCatalogRecord(filamentId);
  if (!record) redirect("/zh-cn/filaments");

  return (
    <PageShell>
      <SiteHeader locale="zh-cn" />
      <FilamentDetailPageContent filamentId={filamentId} initialRecord={record} locale="zh-cn" />
      <SiteFooter locale="zh-cn" />
    </PageShell>
  );
}
