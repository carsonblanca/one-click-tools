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

const TYPE_OPTIONS = ["website", "article", "product", "profile"];

function escapeAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function tag(property: string, content: string, prefix = "property") {
  if (!content.trim()) return "";
  return `<meta ${prefix}="${property}" content="${escapeAttribute(
    content.trim(),
  )}" />`;
}

function buildOpenGraphTags({
  title,
  description,
  url,
  imageUrl,
  siteName,
  type,
}: {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  siteName: string;
  type: string;
}) {
  return [
    tag("og:title", title),
    tag("og:description", description),
    tag("og:url", url),
    tag("og:image", imageUrl),
    tag("og:site_name", siteName),
    tag("og:type", type),
    tag("twitter:card", imageUrl.trim() ? "summary_large_image" : "summary", "name"),
    tag("twitter:title", title, "name"),
    tag("twitter:description", description, "name"),
    tag("twitter:image", imageUrl, "name"),
  ]
    .filter(Boolean)
    .join("\n");
}

export default function OpenGraphTagGeneratorTool() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [siteName, setSiteName] = useState("");
  const [type, setType] = useState(TYPE_OPTIONS[0]);
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const generate = () => {
    const nextOutput = buildOpenGraphTags({
      title,
      description,
      url,
      imageUrl,
      siteName,
      type,
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
    setUrl("");
    setImageUrl("");
    setSiteName("");
    setType(TYPE_OPTIONS[0]);
    setOutput("");
    setError("");
  };

  return (
    <ToolPanel>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <ToolLabel>Title</ToolLabel>
          <ToolInput
            value={title}
            onChange={setTitle}
            placeholder="Share-worthy page title"
          />
        </div>

        <div>
          <ToolLabel>URL</ToolLabel>
          <ToolInput
            value={url}
            onChange={setUrl}
            placeholder="https://example.com/page"
          />
        </div>

        <div>
          <ToolLabel>Image URL</ToolLabel>
          <ToolInput
            value={imageUrl}
            onChange={setImageUrl}
            placeholder="https://example.com/social-image.jpg"
          />
        </div>

        <div>
          <ToolLabel>Site name</ToolLabel>
          <ToolInput
            value={siteName}
            onChange={setSiteName}
            placeholder="Example Site"
          />
        </div>
      </div>

      <div className="mt-5">
        <ToolLabel>Description</ToolLabel>
        <ToolTextarea
          value={description}
          onChange={setDescription}
          placeholder="Describe the page for social previews..."
          rows={4}
        />
      </div>

      <div className="mt-5">
        <ToolLabel>Type</ToolLabel>
        <ToolButtonRow>
          {TYPE_OPTIONS.map((option) => (
            <ToolButton
              key={option}
              onClick={() => setType(option)}
              variant={type === option ? "primary" : "secondary"}
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
          "Generated Open Graph tags will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
