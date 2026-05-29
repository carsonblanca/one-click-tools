"use client";

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
- Links like [OneClick Tools](https://one-click-tools.com)`;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInline(value: string) {
  return value
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
    );
}

function renderMarkdown(markdown: string) {
  const lines = escapeHtml(markdown).split(/\r?\n/);
  const blocks: string[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push(`<ul>${listItems.join("")}</ul>`);
      listItems = [];
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    const listMatch = trimmed.match(/^[-*]\s+(.+)$/);

    if (listMatch) {
      listItems.push(`<li>${formatInline(listMatch[1])}</li>`);
      return;
    }

    flushList();

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);

    if (headingMatch) {
      const level = headingMatch[1].length;
      blocks.push(`<h${level}>${formatInline(headingMatch[2])}</h${level}>`);
      return;
    }

    const quoteMatch = trimmed.match(/^>\s?(.+)$/);

    if (quoteMatch) {
      blocks.push(`<blockquote>${formatInline(quoteMatch[1])}</blockquote>`);
      return;
    }

    blocks.push(`<p>${formatInline(trimmed)}</p>`);
  });

  flushList();

  return blocks.join("");
}

export default function MarkdownPreviewerTool() {
  const [markdown, setMarkdown] = useState(sampleMarkdown);
  const preview = useMemo(() => renderMarkdown(markdown), [markdown]);

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
          <div
            className="space-y-3 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_code]:rounded [&_code]:px-1.5 [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        ) : (
          "Markdown preview will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
