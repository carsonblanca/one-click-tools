import Link from "next/link";
import tools from "@/data/tools.json";
import { localized3dToolSlugs } from "@/lib/i18n";
import ToolPageContent from "./ToolPageContent";

type Tool = {
  name: string;
  slug: string;
  tag: string;
  category?: string;
  categorySlug?: string;
  desc: string;
  description: string;
  whatIsThis?: string | { en?: string; zh?: string };
  howTo?: string[] | { en?: string[]; zh?: string[] };
};

export function generateStaticParams() {
  return (tools as Tool[]).map((tool) => ({ slug: tool.slug }));
}

function getEnglishText(content: Tool["whatIsThis"]) {
  if (!content) {
    return undefined;
  }

  if (typeof content === "string") {
    return content;
  }

  return content.en;
}

function getEnglishList(content: Tool["howTo"]) {
  if (!content) {
    return undefined;
  }

  if (Array.isArray(content)) {
    return content;
  }

  return content.en;
}

function getEnglishTool(tool: Tool): Tool {
  const englishTool: Tool = {
    name: tool.name,
    slug: tool.slug,
    tag: tool.tag,
    category: tool.category,
    categorySlug: tool.categorySlug,
    desc: tool.desc,
    description: tool.description,
  };

  const whatIsThis = getEnglishText(tool.whatIsThis);
  const howTo = getEnglishList(tool.howTo);

  if (whatIsThis) {
    englishTool.whatIsThis = whatIsThis;
  }

  if (howTo) {
    englishTool.howTo = howTo;
  }

  return englishTool;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const tool = (tools as Tool[]).find((t) => t.slug === slug);

  if (!tool) {
    return {
      title: "Tool Not Found | OneClick Tools",
    };
  }

  const canonical = `https://one-click-tools.com/tools/${tool.slug}`;
  const languages: Record<string, string> = {
    en: canonical,
  };

  if (localized3dToolSlugs.includes(tool.slug)) {
    languages["zh-CN"] = `https://one-click-tools.com/zh-cn/tools/${tool.slug}`;
    languages["zh-TW"] = `https://one-click-tools.com/zh-tw/tools/${tool.slug}`;
  }

  return {
    title: `${tool.name} Free Online Tool | OneClick Tools`,
    description: tool.description || tool.desc,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title: `${tool.name} Free Online Tool | OneClick Tools`,
      description: tool.description || tool.desc,
      url: canonical,
      siteName: "OneClick Tools",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${tool.name} Free Online Tool | OneClick Tools`,
      description: tool.description || tool.desc,
    },
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const toolList = tools as Tool[];
  const tool = toolList.find((t) => t.slug === slug);

  if (!tool) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-5xl font-bold">Tool Not Found</h1>

          <Link href="/" className="mt-8 inline-block text-purple-400">
            ← Back Home
          </Link>
        </div>
      </main>
    );
  }

  const toolCategory = tool.category || tool.tag;

  const relatedTools = toolList
    .filter((item) => item.slug !== tool.slug)
    .filter((item) => (item.category || item.tag) === toolCategory)
    .slice(0, 3);

  const fallbackTools = toolList
    .filter((item) => item.slug !== tool.slug)
    .slice(0, 3);

  const finalRelatedTools =
    relatedTools.length > 0 ? relatedTools : fallbackTools;

  return (
    <ToolPageContent
      tool={getEnglishTool(tool)}
      relatedTools={finalRelatedTools.map(getEnglishTool)}
    />
  );
}
