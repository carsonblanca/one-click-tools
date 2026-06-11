import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LocalizedToolPageContent from "../../../../components/LocalizedToolPageContent";
import { getLocalized3dTool } from "../../../../lib/localizedContent";
import { localized3dToolSlugs } from "../../../../lib/i18n";

const baseUrl = "https://one-click-tools.com";

export function generateStaticParams() {
  return localized3dToolSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tool = getLocalized3dTool("zh-tw", slug);

  if (!tool) {
    return {
      title: "OneClick Tools 繁體中文",
    };
  }

  return {
    title: `${tool.name} | OneClick Tools`,
    description: tool.description || tool.desc,
    alternates: {
      canonical: `${baseUrl}/zh-tw/tools/${tool.slug}`,
      languages: {
        en: `${baseUrl}/tools/${tool.slug}`,
        "zh-CN": `${baseUrl}/zh-cn/tools/${tool.slug}`,
        "zh-TW": `${baseUrl}/zh-tw/tools/${tool.slug}`,
      },
    },
  };
}

export default async function TraditionalChineseToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getLocalized3dTool("zh-tw", slug);

  if (!tool) {
    redirect("/zh-tw");
  }

  return <LocalizedToolPageContent locale="zh-tw" tool={tool} />;
}
