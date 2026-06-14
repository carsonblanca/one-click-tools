import type { Metadata } from "next";
import LocalizedHomeContent from "@/components/LocalizedHomeContent";
import PageShell from "@/components/PageShell";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import categories from "@/data/categories.json";
import tools from "@/data/tools.json";
import { localizedHome } from "@/lib/localizedContent";

export const metadata: Metadata = {
  title: localizedHome["zh-tw"].metadataTitle,
  description: localizedHome["zh-tw"].metadataDescription,
  alternates: {
    canonical: "https://one-click-tools.com/zh-tw",
    languages: {
      en: "https://one-click-tools.com",
      "zh-CN": "https://one-click-tools.com/zh-cn",
      "zh-TW": "https://one-click-tools.com/zh-tw",
      "x-default": "https://one-click-tools.com",
    },
  },
};

export default function TraditionalChineseHomePage() {
  return (
    <PageShell>
      <SiteHeader />

      <LocalizedHomeContent locale="zh-tw" tools={tools} categories={categories} />

      <SiteFooter />
    </PageShell>
  );
}
