"use client";

import ToolCard from "./ToolCard";
import { useTheme } from "./ThemeProvider";

type Tool = {
  name: string;
  slug: string;
  tag: string;
  category?: string;
  categorySlug?: string;
  desc: string;
  description: string;
};

type UseCaseGroup = {
  categoryNames: string[];
  useCases: string[];
};

const useCaseGroups: UseCaseGroup[] = [
  {
    categoryNames: ["Developer"],
    useCases: [
      "Format or clean code and structured data before sharing it.",
      "Convert data between common developer-friendly formats.",
      "Validate input while debugging web or API workflows.",
      "Check generated output before pasting it into a project.",
    ],
  },
  {
    categoryNames: ["Image"],
    useCases: [
      "Resize, convert, inspect, or edit images before publishing.",
      "Prepare lightweight image assets for websites and documents.",
      "Check local image details without uploading files to a server.",
      "Create quick browser-based image outputs for everyday work.",
    ],
  },
  {
    categoryNames: ["Text"],
    useCases: [
      "Clean pasted text before using it in documents or apps.",
      "Rewrite, sort, compare, or normalize content quickly.",
      "Prepare lists, notes, and snippets for consistent formatting.",
      "Handle repetitive text cleanup without opening a larger editor.",
    ],
  },
  {
    categoryNames: ["SEO"],
    useCases: [
      "Prepare metadata and search snippets for web pages.",
      "Check indexing helpers and canonical URL details.",
      "Build campaign URLs and social sharing tags.",
      "Review page-level SEO details before publishing.",
    ],
  },
  {
    categoryNames: ["Security"],
    useCases: [
      "Generate passwords or random strings for safer workflows.",
      "Create hashes for checksums and content comparison.",
      "Inspect tokens and encoded security-related values.",
      "Handle security utilities locally in the browser where possible.",
    ],
  },
  {
    categoryNames: ["Utility"],
    useCases: [
      "Complete quick everyday calculations or conversions.",
      "Generate small outputs without installing extra software.",
      "Handle practical browser tasks without creating an account.",
      "Save time on repeated web and productivity chores.",
    ],
  },
  {
    categoryNames: ["Color"],
    useCases: [
      "Convert color values for design and UI implementation.",
      "Compare color formats used in CSS and design tools.",
      "Prepare consistent color values for frontend work.",
      "Document color choices for design handoff.",
    ],
  },
  {
    categoryNames: ["Date Time"],
    useCases: [
      "Convert timestamps into readable dates.",
      "Check values used in logs, APIs, and scheduled tasks.",
      "Compare date and time formats during debugging.",
      "Prepare time-related values for documentation or testing.",
    ],
  },
  {
    categoryNames: ["Marketing"],
    useCases: [
      "Build campaign URLs for tracking traffic sources.",
      "Prepare links for newsletters, ads, and social posts.",
      "Keep campaign parameters consistent across channels.",
      "Review marketing URLs before sharing them.",
    ],
  },
];

const fallbackUseCases = [
  "Finish common web tasks faster without a heavy app.",
  "Prepare content before publishing, sharing, or testing.",
  "Check browser-generated results before using them elsewhere.",
  "Handle quick productivity workflows without creating an account.",
];

const howToSteps = [
  "Enter or upload your content.",
  "Choose any available options.",
  "Run the tool.",
  "Copy or download the result.",
  "Clear the input when finished.",
];

const faqs = [
  {
    question: "Is this tool free?",
    answer: "Yes. This tool is free to use on OneClick Tools.",
  },
  {
    question: "Does this tool require login?",
    answer: "No. You can use this tool without creating an account.",
  },
  {
    question: "Is my data uploaded?",
    answer:
      "This tool is designed to run locally in the browser where possible. Browser-only tools do not intentionally upload user content to OneClick Tools servers.",
  },
];

function getToolCategory(tool: Tool) {
  return tool.category || tool.tag || "Utility";
}

function getUseCases(category: string) {
  const group = useCaseGroups.find((item) =>
    item.categoryNames.includes(category),
  );

  return group?.useCases || fallbackUseCases;
}

export default function ToolSeoContent({
  tool,
  relatedTools,
}: {
  tool: Tool;
  relatedTools: Tool[];
}) {
  const { isDark } = useTheme();
  const category = getToolCategory(tool);
  const description = tool.description || tool.desc;
  const useCases = getUseCases(category);

  const cardClass = isDark
    ? "border-white/10 bg-white/[0.03]"
    : "border-[#E5DED0] bg-[#FFFDF7]";
  const mutedTextClass = isDark ? "text-white/60" : "text-[#6B665D]";
  const subtleTextClass = isDark ? "text-white/45" : "text-[#8A8173]";

  return (
    <section className="mt-20 space-y-20">
      <section>
        <h2 className="text-3xl font-semibold">What is this tool?</h2>

        <p className={`mt-5 leading-8 ${mutedTextClass}`}>
          {tool.name} is a browser-friendly {category.toLowerCase()} tool for{" "}
          {description.charAt(0).toLowerCase() + description.slice(1)} It is
          built for quick, focused work without requiring a login.
        </p>
      </section>

      <section>
        <h2 className="text-3xl font-semibold">How to use it</h2>

        <ol className="mt-6 grid gap-4">
          {howToSteps.map((step, index) => (
            <li
              key={step}
              className={`flex gap-4 rounded-2xl border p-5 ${cardClass}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                  isDark ? "bg-lime-300 text-black" : "bg-[#2563EB] text-white"
                }`}
              >
                {index + 1}
              </span>

              <span className={`leading-7 ${mutedTextClass}`}>{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-3xl font-semibold">Privacy note</h2>

        <div className={`mt-5 rounded-2xl border p-6 ${cardClass}`}>
          <p className={`leading-8 ${mutedTextClass}`}>
            {tool.name} is designed to run in your browser when possible. For
            browser-only tools, user content is not intentionally uploaded to
            OneClick Tools servers. Some pages may still use normal hosting,
            analytics, search indexing, or advertising infrastructure.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-3xl font-semibold">Common use cases</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {useCases.map((useCase) => (
            <div key={useCase} className={`rounded-2xl border p-5 ${cardClass}`}>
              <p className={`leading-7 ${mutedTextClass}`}>{useCase}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <h2 className="text-3xl font-semibold">Related tools</h2>
            <p className={`mt-3 ${subtleTextClass}`}>
              More tools from the same area of OneClick Tools.
            </p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {relatedTools.map((item) => (
            <ToolCard
              key={item.slug}
              name={item.name}
              slug={item.slug}
              tag={item.category || item.tag}
              desc={item.desc || item.description}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-3xl font-semibold">FAQ</h2>

        <div className="mt-8 grid gap-5">
          {faqs.map((item) => (
            <div key={item.question} className={`rounded-2xl border p-6 ${cardClass}`}>
              <h3 className="text-xl font-semibold">{item.question}</h3>

              <p className={`mt-3 leading-7 ${mutedTextClass}`}>
                {item.answer}
              </p>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
