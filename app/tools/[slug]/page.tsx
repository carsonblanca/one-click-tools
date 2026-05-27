import Link from "next/link";
import tools from "../../../data/tools.json";
import ToolPageContent from "./ToolPageContent";

type Tool = {
  name: string;
  slug: string;
  tag: string;
  category?: string;
  categorySlug?: string;
  desc: string;
  description: string;
};

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

  return {
    title: `${tool.name} Free Online Tool | OneClick Tools`,
    description: tool.description || tool.desc,
    openGraph: {
      title: `${tool.name} Free Online Tool | OneClick Tools`,
      description: tool.description || tool.desc,
      url: `https://one-click-tools.com/tools/${tool.slug}`,
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
      tool={tool}
      relatedTools={finalRelatedTools}
    />
  );
}