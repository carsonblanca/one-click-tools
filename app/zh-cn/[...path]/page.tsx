import type { Metadata } from "next";
import BasicPageContent from "../../../components/BasicPageContent";
import PageShell from "../../../components/PageShell";
import SiteFooter from "../../../components/SiteFooter";
import SiteHeader from "../../../components/SiteHeader";

export const metadata: Metadata = {
  title: "简体中文页面准备中 | OneClick Tools",
  description:
    "这个 OneClick Tools 简体中文页面正在准备中。请先使用英文版页面。",
};

export default async function SimplifiedChinesePlaceholderPage({
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
        eyebrow="简体中文"
        title="这个页面的简体中文版本正在准备中。"
        intro="为了避免生硬或错误的翻译，我们不会批量自动翻译工具内容。你可以先打开对应英文页面继续使用工具。"
        sections={[
          {
            title: "为什么不是直接翻译？",
            paragraphs: [
              "工具类页面需要准确的技术术语、清晰的按钮文案和符合中文用户习惯的说明。我们会逐步完成翻译和审核。",
            ],
          },
          {
            title: "当前页面",
            paragraphs: [`对应英文路径：${englishPath}`],
          },
        ]}
        backHref={englishPath}
        backLabel="打开 English 页面"
      />

      <SiteFooter />
    </PageShell>
  );
}
