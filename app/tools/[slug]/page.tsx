import Link from "next/link";
import tools from "../../../data/tools.json";
import ToolClient from "./tool-client";

type Tool = {
  slug: string;
  name: string;
  desc: string;
  tag: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const tool = (tools as Tool[]).find(
    (t) => t.slug === slug
  );

  if (!tool) {
    return {
      title: "Tool Not Found",
    };
  }

  return {
    title: `${tool.name} Free Online Tool | OneClick Tools`,
    description: tool.desc,
    keywords: [
      tool.name,
      `${tool.name} online`,
      `${tool.name} free`,
      `${tool.name} tool`,
    ],

    openGraph: {
      title: `${tool.name} | OneClick Tools`,
      description: tool.desc,
      type: "website",
    },

    twitter: {
      card: "summary_large_image",
      title: `${tool.name} | OneClick Tools`,
      description: tool.desc,
    },
  };
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const tool = (tools as Tool[]).find(
    (t) => t.slug === slug
  );

  if (!tool) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-5xl font-bold">
            Tool Not Found
          </h1>

          <Link
            href="/"
            className="mt-8 inline-block text-purple-400"
          >
            ← Back Home
          </Link>
        </div>
      </main>
    );
  }

  return <ToolClient tool={tool} />;
}