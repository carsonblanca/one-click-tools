"use client";

import Link from "next/link";
import ToolClient from "./tool-client";
import ToolSeoContent from "../../../components/ToolSeoContent";
import SiteHeader from "../../../components/SiteHeader";
import SiteFooter from "../../../components/SiteFooter";
import PageShell from "../../../components/PageShell";
import { useTheme } from "../../../components/ThemeProvider";

type Tool = {
  name: string;
  slug: string;
  tag: string;
  category?: string;
  categorySlug?: string;
  desc: string;
  description: string;
};

export default function ToolPageContent({
  tool,
  relatedTools,
}: {
  tool: Tool;
  relatedTools: Tool[];
}) {
  const { isDark } = useTheme();
  const toolCategory = tool.category || tool.tag;

  return (
    <PageShell>
      <SiteHeader />

      <section className="relative z-10 mx-auto max-w-5xl px-6 py-16">
        <div className="mb-10">
          <div
            className={`mb-4 inline-block rounded-full border px-3 py-1 text-xs ${
              isDark
                ? "border-white/10 bg-white/[0.05] text-white/55"
                : "border-[#E5DED0] bg-[#FFFDF7] text-[#6B665D]"
            }`}
          >
            {toolCategory}
          </div>

          <h1 className="text-5xl font-semibold tracking-[-0.05em]">
            {tool.name}
          </h1>

          <p
            className={`mt-6 max-w-3xl text-lg leading-8 ${
              isDark ? "text-white/60" : "text-[#6B665D]"
            }`}
          >
            {tool.description || tool.desc}
          </p>
        </div>

        <div
          className={`rounded-[32px] border p-6 ${
            isDark
              ? "border-white/10 bg-[#101014]/80"
              : "border-[#E5DED0] bg-[#FFFDF7]/90"
          }`}
        >
          <ToolClient slug={tool.slug} />
        </div>

        <ToolSeoContent tool={tool} relatedTools={relatedTools} />

        <div className="mt-16">
          <Link
            href="/#tools"
            className={`inline-flex rounded-2xl border px-6 py-4 ${
              isDark
                ? "border-white/10 bg-white/[0.04] text-white/70"
                : "border-[#E5DED0] bg-[#FFFDF7] text-[#6B665D]"
            }`}
          >
            ← Back to tools
          </Link>
        </div>
      </section>

      <SiteFooter />
    </PageShell>
  );
}
