import type { Metadata } from "next";
import LocalizedHomeContent from "@/components/LocalizedHomeContent";
import HotTools from "@/components/HotTools";
import ToolsBrowser from "@/components/ToolsBrowser";
import HomeSeoText from "@/components/HomeSeoText";
import PageShell from "@/components/PageShell";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import categories from "@/data/categories.json";
import tools from "@/data/tools.json";
import { localizedHome } from "@/lib/localizedContent";

type Tool = {
  name: string;
  slug: string;
  tag: string;
  category: string;
  categorySlug: string;
  desc: string;
  description: string;
};

type ToolSource = Tool & {
  keywords?: string[] | string;
};

type Category = {
  name: string;
  slug: string;
  description: string;
};

export const metadata: Metadata = {
  title: localizedHome["zh-cn"].metadataTitle,
  description: localizedHome["zh-cn"].metadataDescription,
  alternates: {
    canonical: "https://one-click-tools.com/zh-cn",
    languages: {
      en: "https://one-click-tools.com",
      "zh-CN": "https://one-click-tools.com/zh-cn",
      "zh-TW": "https://one-click-tools.com/zh-tw",
      "x-default": "https://one-click-tools.com",
    },
  },
};

export default function SimplifiedChineseHomePage() {
  const toolList = (tools as ToolSource[]).map((tool) => ({
    name: tool.name,
    slug: tool.slug,
    tag: tool.tag,
    category: tool.category,
    categorySlug: tool.categorySlug,
    desc: tool.desc,
    description: tool.description,
  }));

  return (
    <PageShell>
      <SiteHeader />

      <LocalizedHomeContent locale="zh-cn" />
      <HotTools locale="zh-cn" tools={toolList} />
      <ToolsBrowser tools={toolList} categories={categories as Category[]} locale="zh-cn" />
      <HomeSeoText locale="zh-cn" />

      <SiteFooter />
    </PageShell>
  );
}
