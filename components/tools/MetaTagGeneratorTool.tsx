"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolInput,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

const ROBOTS_OPTIONS = [
  "index, follow",
  "noindex, follow",
  "index, nofollow",
  "noindex, nofollow",
];

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildMetaTags({
  title,
  description,
  keywords,
  author,
  robots,
  canonicalUrl,
}: {
  title: string;
  description: string;
  keywords: string;
  author: string;
  robots: string;
  canonicalUrl: string;
}) {
  const lines: string[] = [];

  if (title.trim()) {
    lines.push(`<title>${escapeAttribute(title.trim())}</title>`);
    lines.push(
      `<meta name="title" content="${escapeAttribute(title.trim())}" />`,
    );
  }

  if (description.trim()) {
    lines.push(
      `<meta name="description" content="${escapeAttribute(
        description.trim(),
      )}" />`,
    );
  }

  if (keywords.trim()) {
    lines.push(
      `<meta name="keywords" content="${escapeAttribute(keywords.trim())}" />`,
    );
  }

  if (author.trim()) {
    lines.push(
      `<meta name="author" content="${escapeAttribute(author.trim())}" />`,
    );
  }

  if (robots.trim()) {
    lines.push(
      `<meta name="robots" content="${escapeAttribute(robots.trim())}" />`,
    );
  }

  if (canonicalUrl.trim()) {
    lines.push(
      `<link rel="canonical" href="${escapeAttribute(
        canonicalUrl.trim(),
      )}" />`,
    );
  }

  return lines.join("\n");
}

export default function MetaTagGeneratorTool() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [author, setAuthor] = useState("");
  const [robots, setRobots] = useState(ROBOTS_OPTIONS[0]);
  const [canonicalUrl, setCanonicalUrl] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const generate = () => {
    const nextOutput = buildMetaTags({
      title,
      description,
      keywords,
      author,
      robots,
      canonicalUrl,
    });

    setOutput(nextOutput);
    setError(nextOutput ? "" : "Enter at least one field to generate tags.");
  };

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
  };

  const clear = () => {
    setTitle("");
    setDescription("");
    setKeywords("");
    setAuthor("");
    setRobots(ROBOTS_OPTIONS[0]);
    setCanonicalUrl("");
    setOutput("");
    setError("");
  };

  return (
    <ToolPanel>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <ToolLabel>Page title</ToolLabel>
          <ToolInput
            value={title}
            onChange={setTitle}
            placeholder="Useful Page Title"
          />
        </div>

        <div>
          <ToolLabel>Canonical URL</ToolLabel>
          <ToolInput
            value={canonicalUrl}
            onChange={setCanonicalUrl}
            placeholder="https://example.com/page"
          />
        </div>

        <div>
          <ToolLabel>Keywords</ToolLabel>
          <ToolInput
            value={keywords}
            onChange={setKeywords}
            placeholder="seo, tools, metadata"
          />
        </div>

        <div>
          <ToolLabel>Author</ToolLabel>
          <ToolInput
            value={author}
            onChange={setAuthor}
            placeholder="Site or author name"
          />
        </div>
      </div>

      <div className="mt-5">
        <ToolLabel>Description</ToolLabel>
        <ToolTextarea
          value={description}
          onChange={setDescription}
          placeholder="Write a concise search result description..."
          rows={4}
        />
      </div>

      <div className="mt-5">
        <ToolLabel>Robots option</ToolLabel>
        <ToolButtonRow>
          {ROBOTS_OPTIONS.map((option) => (
            <ToolButton
              key={option}
              onClick={() => setRobots(option)}
              variant={robots === option ? "primary" : "secondary"}
            >
              {option}
            </ToolButton>
          ))}
        </ToolButtonRow>
      </div>

      <ToolButtonRow>
        <ToolButton onClick={generate}>Generate</ToolButton>
        <ToolButton onClick={copy} variant="secondary">
          Copy
        </ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox muted={!output && !error}>
        {error || output ? (
          <pre className="overflow-x-auto whitespace-pre-wrap">
            {error || output}
          </pre>
        ) : (
          "Generated meta tags will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
