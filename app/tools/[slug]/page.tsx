import Link from "next/link";
import tools from "../../../data/tools.json";
import ToolClient from "./tool-client";
import ToolCard from "../../../components/ToolCard";

type Tool = {
  name: string;
  slug: string;
  tag: string;
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

  const relatedTools = toolList
    .filter((item) => item.slug !== tool.slug)
    .filter((item) => item.tag === tool.tag)
    .slice(0, 3);

  const fallbackTools = toolList
    .filter((item) => item.slug !== tool.slug)
    .slice(0, 3);

  const finalRelatedTools =
    relatedTools.length > 0 ? relatedTools : fallbackTools;

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-xl font-semibold">
            OneClick Tools
          </Link>

          <Link href="/" className="text-sm text-white/60 hover:text-white">
            ← Back Home
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-10">
          <div className="mb-4 inline-block rounded-full bg-purple-500/10 px-3 py-1 text-xs text-purple-300">
            {tool.tag}
          </div>

          <h1 className="text-5xl font-bold tracking-tight">
            {tool.name}
          </h1>

          <p className="mt-6 text-lg text-white/60">
            {tool.description || tool.desc}
          </p>
        </div>

        <ToolClient slug={tool.slug} />

        <section className="mt-20">
          <h2 className="text-3xl font-bold">
            How to use {tool.name}
          </h2>

          <p className="mt-5 leading-8 text-white/60">
            Use this free online tool directly in your browser. Enter your
            content, run the tool, and get the result instantly. No login is
            required.
          </p>
        </section>

        <section className="mt-20">
          <h2 className="text-3xl font-bold">
            Frequently Asked Questions
          </h2>

          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="text-xl font-semibold">
                Is {tool.name} free?
              </h3>
              <p className="mt-3 text-white/60">
                Yes. This tool is free to use online.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="text-xl font-semibold">
                Do I need to create an account?
              </h3>
              <p className="mt-3 text-white/60">
                No. You can use this tool without registration.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              <h3 className="text-xl font-semibold">
                Does it work on mobile?
              </h3>
              <p className="mt-3 text-white/60">
                Yes. The tool is designed to work on desktop and mobile browsers.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-20">
          <h2 className="text-3xl font-bold">
            Related Tools
          </h2>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {finalRelatedTools.map((item) => (
              <ToolCard
                key={item.slug}
                name={item.name}
                slug={item.slug}
                tag={item.tag}
                desc={item.desc || item.description}
              />
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}