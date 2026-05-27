"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolStatCard,
  ToolTextarea,
} from "../tool-ui/ToolUI";

export default function WordCounterTool() {
  const [text, setText] = useState("");

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, "").length;
  const paragraphs = text.trim()
    ? text.split(/\n+/).filter((paragraph) => paragraph.trim()).length
    : 0;

  return (
    <ToolPanel>
      <ToolTextarea
        value={text}
        onChange={setText}
        placeholder="Enter or paste your text..."
        rows={10}
      />

      <div className="mt-5 grid gap-4 md:grid-cols-4">
        <ToolStatCard label="Words" value={words} />
        <ToolStatCard label="Characters" value={characters} />
        <ToolStatCard label="No Spaces" value={charactersNoSpaces} />
        <ToolStatCard label="Paragraphs" value={paragraphs} />
      </div>

      <ToolButtonRow>
        <ToolButton onClick={() => setText("")} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>
    </ToolPanel>
  );
}