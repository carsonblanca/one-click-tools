import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import BambuFilamentCatalogExperience from "@/components/filaments/BambuFilamentCatalogExperience";
import { getVisibleCatalogRecords } from "@/lib/filaments/catalog/published-catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "3D 打印耗材库 | OneClick Tools",
  description:
    "按材料、品牌或颜色浏览 3D 打印耗材。搜索颜色名称、HEX 或 RGB，对比规格，下载 Bambu Studio 预设。",
  alternates: {
    canonical: "https://one-click-tools.com/zh-cn/filaments",
  },
};

export default async function SimplifiedChineseFilamentPage() {
  const records = await getVisibleCatalogRecords();
  return (
    <PageShell>
      <SiteHeader />
      <BambuFilamentCatalogExperience locale="zh-cn" catalogRecords={records} />
      <SiteFooter />
    </PageShell>
  );
}
