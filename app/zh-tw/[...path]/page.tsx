import type { Metadata } from "next";
import BasicPageContent from "../../../components/BasicPageContent";
import PageShell from "../../../components/PageShell";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";

export const metadata: Metadata = {
  title: "繁體中文頁面準備中 | OneClick Tools",
  description:
    "這個 OneClick Tools 繁體中文頁面正在準備中。請先使用英文版頁面。",
};

export default async function TraditionalChinesePlaceholderPage({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  const englishPath = `/${path.join("/")}`;

  return (
    <PageShell>
      <SiteHeader />

      <BasicPageContent
        eyebrow="繁體中文"
        title="這個頁面的繁體中文版本正在準備中。"
        intro="為了避免生硬或錯誤的翻譯，我們不會批量自動翻譯工具內容。你可以先打開對應英文頁面繼續使用工具。"
        sections={[
          {
            title: "為什麼不是直接翻譯？",
            paragraphs: [
              "工具類頁面需要準確的技術術語、清楚的按鈕文案，以及符合繁體中文使用者習慣的說明。我們會逐步完成翻譯和審核。",
            ],
          },
          {
            title: "目前頁面",
            paragraphs: [`對應英文路徑：${englishPath}`],
          },
        ]}
        backHref={englishPath}
        backLabel="打開 English 頁面"
      />

      <SiteFooter />
    </PageShell>
  );
}
