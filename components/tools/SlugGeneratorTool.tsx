"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

function createSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function SlugGeneratorTool() {
  const [text, setText] = useState("");
  const [slug, setSlug] = useState("");

  const copy = async () => {
    if (!slug) return;
    await navigator.clipboard.writeText(slug);
  };

  const clear = () => {
    setText("");
    setSlug("");
  };

  return (
    <ToolPanel>
      <ToolTextarea
        value={text}
        onChange={setText}
        placeholder="Enter text to turn into a slug..."
        rows={6}
      />

      <ToolButtonRow>
        <ToolButton onClick={() => setSlug(createSlug(text))}>Generate</ToolButton>
        <ToolButton onClick={copy} variant="secondary">
          Copy
        </ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox muted={!slug}>
        {slug || "Generated slug will appear here."}
      </ToolResultBox>
    </ToolPanel>
  );
}
