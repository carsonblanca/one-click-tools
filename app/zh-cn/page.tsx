import type { Metadata } from "next";
import BasicPageContent from "../../components/BasicPageContent";
import PageShell from "../../components/PageShell";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

export const metadata: Metadata = {
  title: "OneClick Tools 简体中文 | 本地化准备中",
  description:
    "OneClick Tools 正在准备简体中文版本。当前阶段只提供语言切换基础系统，不批量上线未经人工审核的翻译。",
};

export default function SimplifiedChineseHomePage() {
  return (
    <PageShell>
      <SiteHeader />

      <BasicPageContent
        eyebrow="简体中文"
        title="简体中文版本正在准备中。"
        intro="我们已经建立语言切换基础，但不会把未经人工审核的机器翻译直接上线。中文内容会逐步根据术语表、使用场景和人工校对发布。"
        sections={[
          {
            title: "当前状态",
            paragraphs: [
              "英文版工具和页面仍保持原路径不变。简体中文页面会在后续版本逐步补充。",
              "如果某个中文工具页暂时还没有正式内容，你会看到这个占位说明，而不是低质量的自动翻译。",
            ],
          },
          {
            title: "翻译原则",
            paragraphs: [
              "OneClick Tools 会优先保证语言质量、术语准确和自然表达。技术词汇会参考站内术语表，并结合中文用户真实使用习惯。",
              "3D 打印、开发者工具、图片工具等页面会分批处理，完成审核后再开放索引。",
            ],
          },
        ]}
        backHref="/"
        backLabel="返回 English 首页"
      />

      <SiteFooter />
    </PageShell>
  );
}
