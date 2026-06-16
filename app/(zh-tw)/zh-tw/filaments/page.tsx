import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import BambuFilamentCatalogExperience from "@/components/filaments/BambuFilamentCatalogExperience";

export const metadata: Metadata = {
  title: "3D 列印耗材庫 | OneClick Tools",
  description:
    "依材料、品牌或色系瀏覽 3D 列印線材。搜尋顏色名稱、HEX 或 RGB，比較規格，下載 Bambu Studio 預設。",
  alternates: {
    canonical: "https://one-click-tools.com/zh-tw/filaments",
  },
};

export default function TraditionalChineseFilamentPage() {
  return (
    <PageShell>
      <SiteHeader />
      <BambuFilamentCatalogExperience locale="zh-tw" />
      <SiteFooter />
    </PageShell>
  );
}
