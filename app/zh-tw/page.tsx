import type { Metadata } from "next";
import BasicPageContent from "../../components/BasicPageContent";
import PageShell from "../../components/PageShell";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

export const metadata: Metadata = {
  title: "OneClick Tools 繁體中文 | 在地化準備中",
  description:
    "OneClick Tools 正在準備繁體中文版本。目前只提供語言切換基礎系統，不批量上線未經人工審核的翻譯。",
};

export default function TraditionalChineseHomePage() {
  return (
    <PageShell>
      <SiteHeader />

      <BasicPageContent
        eyebrow="繁體中文"
        title="繁體中文版本正在準備中。"
        intro="我們已經建立語言切換基礎，但不會把未經人工審核的機器翻譯直接上線。繁體中文內容會逐步根據術語表、使用情境和人工校對發布。"
        sections={[
          {
            title: "目前狀態",
            paragraphs: [
              "英文版工具與頁面仍維持原路徑不變。繁體中文頁面會在後續版本逐步補充。",
              "如果某個繁體中文工具頁暫時還沒有正式內容，你會看到這個占位說明，而不是低品質的自動翻譯。",
            ],
          },
          {
            title: "翻譯原則",
            paragraphs: [
              "OneClick Tools 會優先確保語言品質、術語準確和自然表達。技術詞彙會參考站內術語表，並依繁體中文使用者的實際習慣調整。",
              "3D 列印、開發者工具、圖片工具等頁面會分批處理，完成審核後再開放索引。",
            ],
          },
        ]}
        backHref="/"
        backLabel="返回 English 首頁"
      />

      <SiteFooter />
    </PageShell>
  );
}
