"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

const sampleMarkdown = `# Markdown Preview

Write **bold text**, *italic text*, and \`inline code\`.

> Preview basic Markdown safely in your browser.

- Headings
- Lists
- Links like [OneClick Tools](https://one-click-tools.com)

\`\`\`
const safe = "Rendered as text, not raw HTML";
\`\`\``;

type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { type: "paragraph"; text: string }
  | { type: "blockquote"; text: string }
  | { type: "list"; items: string[] }
  | { type: "code"; code: string; language?: string };

const headingClasses = {
  1: "text-3xl font-semibold leading-tight",
  2: "text-2xl font-semibold leading-tight",
  3: "text-xl font-semibold leading-tight",
  4: "text-lg font-semibold leading-tight",
  5: "text-base font-semibold leading-tight",
  6: "text-sm font-semibold uppercase tracking-wide",
};

function safeHref(value: string) {
  const href = value.trim();
  const normalized = href.toLowerCase();

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("mailto:")
  ) {
    return href;
  }

  return null;
}

function parseInline(value: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let index = 0;

  const pushText = (text: string) => {
    if (text) {
      nodes.push(text);
    }
  };

  while (index < value.length) {
    if (value[index] === "`") {
      const end = value.indexOf("`", index + 1);

      if (end > index + 1) {
        nodes.push(
          <code
            key={`${keyPrefix}-code-${index}`}
            className="rounded border border-current/10 px-1.5 py-0.5 font-mono text-[0.9em]"
          >
            {value.slice(index + 1, end)}
          </code>,
        );
        index = end + 1;
        continue;
      }
    }

    if (value.startsWith("**", index)) {
      const end = value.indexOf("**", index + 2);

      if (end > index + 2) {
        nodes.push(
          <strong key={`${keyPrefix}-strong-${index}`} className="font-semibold">
            {parseInline(value.slice(index + 2, end), `${keyPrefix}-strong-${index}`)}
          </strong>,
        );
        index = end + 2;
        continue;
      }
    }

    if (value[index] === "*") {
      const end = value.indexOf("*", index + 1);

      if (end > index + 1) {
        nodes.push(
          <em key={`${keyPrefix}-em-${index}`}>
            {parseInline(value.slice(index + 1, end), `${keyPrefix}-em-${index}`)}
          </em>,
        );
        index = end + 1;
        continue;
      }
    }

    if (value[index] === "[") {
      const labelEnd = value.indexOf("](", index + 1);
      const hrefEnd = labelEnd === -1 ? -1 : value.indexOf(")", labelEnd + 2);

      if (labelEnd > index + 1 && hrefEnd > labelEnd + 2) {
        const label = value.slice(index + 1, labelEnd);
        const href = value.slice(labelEnd + 2, hrefEnd);
        const allowedHref = safeHref(href);

        if (allowedHref) {
          nodes.push(
            <a
              key={`${keyPrefix}-link-${index}`}
              href={allowedHref}
              target={allowedHref.toLowerCase().startsWith("mailto:") ? undefined : "_blank"}
              rel={allowedHref.toLowerCase().startsWith("mailto:") ? undefined : "noreferrer"}
              className="font-medium underline underline-offset-2 hover:opacity-80"
            >
              {parseInline(label, `${keyPrefix}-link-${index}`)}
            </a>,
          );
        } else {
          pushText(label);
        }

        index = hrefEnd + 1;
        continue;
      }
    }

    const nextSpecial = [
      value.indexOf("`", index + 1),
      value.indexOf("*", index + 1),
      value.indexOf("[", index + 1),
    ]
      .filter((position) => position !== -1)
      .sort((a, b) => a - b)[0];
    const nextIndex = nextSpecial ?? value.length;

    pushText(value.slice(index, nextIndex));
    index = nextIndex;
  }

  return nodes;
}

function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  const paragraphs: string[] = [];
  let listItems: string[] = [];
  let quoteLines: string[] = [];
  let codeLines: string[] | null = null;
  let codeLanguage = "";

  const flushParagraph = () => {
    if (paragraphs.length > 0) {
      blocks.push({ type: "paragraph", text: paragraphs.join(" ") });
      paragraphs.length = 0;
    }
  };

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: "list", items: listItems });
      listItems = [];
    }
  };

  const flushQuote = () => {
    if (quoteLines.length > 0) {
      blocks.push({ type: "blockquote", text: quoteLines.join(" ") });
      quoteLines = [];
    }
  };

  const flushTextBlocks = () => {
    flushParagraph();
    flushList();
    flushQuote();
  };

  for (const line of lines) {
    const fenceMatch = line.match(/^```([A-Za-z0-9_-]*)\s*$/);

    if (codeLines !== null) {
      if (fenceMatch) {
        blocks.push({
          type: "code",
          code: codeLines.join("\n"),
          language: codeLanguage || undefined,
        });
        codeLines = null;
        codeLanguage = "";
      } else {
        codeLines.push(line);
      }
      continue;
    }

    if (fenceMatch) {
      flushTextBlocks();
      codeLines = [];
      codeLanguage = fenceMatch[1] || "";
      continue;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      flushTextBlocks();
      continue;
    }

    const listMatch = trimmed.match(/^[-*]\s+(.+)$/);

    if (listMatch) {
      flushParagraph();
      flushQuote();
      listItems.push(listMatch[1]);
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.+)$/);

    if (quoteMatch) {
      flushParagraph();
      flushList();
      quoteLines.push(quoteMatch[1]);
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      flushTextBlocks();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6,
        text: headingMatch[2],
      });
      continue;
    }

    flushList();
    flushQuote();
    paragraphs.push(trimmed);
  }

  if (codeLines !== null) {
    blocks.push({
      type: "code",
      code: codeLines.join("\n"),
      language: codeLanguage || undefined,
    });
  }

  flushTextBlocks();

  return blocks;
}

function MarkdownBlockView({
  block,
  blockIndex,
}: {
  block: MarkdownBlock;
  blockIndex: number;
}) {
  if (block.type === "heading") {
    const content = parseInline(block.text, `heading-${blockIndex}`);

    if (block.level === 1) {
      return <h1 className={headingClasses[1]}>{content}</h1>;
    }
    if (block.level === 2) {
      return <h2 className={headingClasses[2]}>{content}</h2>;
    }
    if (block.level === 3) {
      return <h3 className={headingClasses[3]}>{content}</h3>;
    }
    if (block.level === 4) {
      return <h4 className={headingClasses[4]}>{content}</h4>;
    }
    if (block.level === 5) {
      return <h5 className={headingClasses[5]}>{content}</h5>;
    }

    return <h6 className={headingClasses[6]}>{content}</h6>;
  }

  if (block.type === "list") {
    return (
      <ul className="list-disc space-y-2 pl-5">
        {block.items.map((item, itemIndex) => (
          <li key={`${blockIndex}-${itemIndex}`}>
            {parseInline(item, `list-${blockIndex}-${itemIndex}`)}
          </li>
        ))}
      </ul>
    );
  }

  if (block.type === "blockquote") {
    return (
      <blockquote className="border-l-4 border-current/20 pl-4 italic opacity-90">
        {parseInline(block.text, `quote-${blockIndex}`)}
      </blockquote>
    );
  }

  if (block.type === "code") {
    return (
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl border border-current/10 p-4 font-mono text-sm leading-6">
        <code>{block.code}</code>
      </pre>
    );
  }

  return (
    <p className="leading-7">
      {parseInline(block.text, `paragraph-${blockIndex}`)}
    </p>
  );
}

export default function MarkdownPreviewerTool() {
  const [markdown, setMarkdown] = useState(sampleMarkdown);
  const previewBlocks = useMemo(() => parseMarkdown(markdown), [markdown]);

  return (
    <ToolPanel>
      <ToolTextarea
        value={markdown}
        onChange={setMarkdown}
        placeholder="Enter Markdown..."
        rows={10}
      />

      <ToolButtonRow>
        <ToolButton onClick={() => setMarkdown(sampleMarkdown)} variant="secondary">
          Sample
        </ToolButton>
        <ToolButton onClick={() => setMarkdown("")} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox muted={!markdown}>
        {markdown ? (
          <div className="space-y-4">
            {previewBlocks.map((block, blockIndex) => (
              <MarkdownBlockView
                key={`${block.type}-${blockIndex}`}
                block={block}
                blockIndex={blockIndex}
              />
            ))}
          </div>
        ) : (
          "Markdown preview will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
