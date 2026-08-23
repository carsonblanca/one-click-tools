import type { Metadata } from "next";
import PageShell from "@/components/PageShell";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import FilamentComparePage from "@/components/filaments/FilamentComparePage";

export const metadata: Metadata = {
  title: "耗材对比 | OneClick Tools",
  description: "并排比较 2 到 4 款 3D 打印耗材的材料、打印参数和验证信息。",
  alternates: {
    canonical: "https://one-click-tools.com/zh-cn/filaments/compare",
    languages: {
      en: "https://one-click-tools.com/filaments/compare",
      "zh-CN": "https://one-click-tools.com/zh-cn/filaments/compare",
    },
  },
};

export default async function SimplifiedChineseFilamentComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const params = await searchParams;
  const ids = typeof params.ids === "string"
    ? params.ids.split(",").map((id) => id.trim()).filter(Boolean)
    : [];

  return (
    <PageShell>
      <SiteHeader locale="zh-cn" />
      <FilamentComparePage ids={ids} locale="zh-cn" />
      <SiteFooter locale="zh-cn" />
    </PageShell>
  );
}
