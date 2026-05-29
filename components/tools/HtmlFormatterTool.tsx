"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

const voidTags = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function getTagName(token: string) {
  return token.match(/^<\/?\s*([a-zA-Z0-9-]+)/)?.[1].toLowerCase() || "";
}

function isOpeningTag(token: string) {
  const tagName = getTagName(token);
  return (
    token.startsWith("<") &&
    !token.startsWith("</") &&
    !token.startsWith("<!") &&
    !token.endsWith("/>") &&
    !voidTags.has(tagName)
  );
}

function formatHtml(value: string) {
  const tokens = value
    .replace(/>\s+</g, "><")
    .match(/<[^>]+>|[^<]+/g);

  if (!tokens) return "";

  let depth = 0;
  const lines: string[] = [];

  tokens.forEach((token) => {
    const trimmed = token.trim();
    if (!trimmed) return;

    if (trimmed.startsWith("</")) {
      depth = Math.max(depth - 1, 0);
    }

    lines.push(`${"  ".repeat(depth)}${trimmed}`);

    if (isOpeningTag(trimmed)) {
      depth += 1;
    }
  });

  return lines.join("\n");
}

function minifyHtml(value: string) {
  return value
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export default function HtmlFormatterTool() {
  const [html, setHtml] = useState("");

  const copy = async () => {
    if (!html) return;
    await navigator.clipboard.writeText(html);
  };

  return (
    <ToolPanel>
      <ToolTextarea
        value={html}
        onChange={setHtml}
        placeholder="Paste HTML..."
        rows={12}
      />

      <ToolButtonRow>
        <ToolButton onClick={() => setHtml(formatHtml(html))}>Format</ToolButton>
        <ToolButton onClick={() => setHtml(minifyHtml(html))} variant="secondary">
          Minify
        </ToolButton>
        <ToolButton onClick={copy} variant="secondary">
          Copy
        </ToolButton>
        <ToolButton onClick={() => setHtml("")} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox muted={!html}>
        {html ? "Formatted HTML stays in the editor above." : "Paste HTML to begin."}
      </ToolResultBox>
    </ToolPanel>
  );
}
