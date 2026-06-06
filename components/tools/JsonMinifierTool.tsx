"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolStatCard,
  ToolTextarea,
} from "../tool-ui/ToolUI";

export default function JsonMinifierTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const minify = () => {
    try {
      const parsed: unknown = JSON.parse(input);
      setOutput(JSON.stringify(parsed));
      setError("");
    } catch (caught) {
      setOutput("");
      setError(caught instanceof Error ? caught.message : "Invalid JSON.");
    }
  };

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
  };

  const clear = () => {
    setInput("");
    setOutput("");
    setError("");
  };

  return (
    <ToolPanel>
      <ToolTextarea
        value={input}
        onChange={setInput}
        placeholder={'{\n  "name": "Ada",\n  "active": true\n}'}
        rows={9}
      />

      <ToolButtonRow>
        <ToolButton onClick={minify}>Minify</ToolButton>
        <ToolButton onClick={copy} variant="secondary">
          Copy
        </ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ToolStatCard label="Original length" value={input.length || "-"} />
        <ToolStatCard label="Minified length" value={output.length || "-"} />
      </div>

      <ToolResultBox muted={!output && !error}>
        {error || output || "Minified JSON will appear here."}
      </ToolResultBox>
    </ToolPanel>
  );
}
