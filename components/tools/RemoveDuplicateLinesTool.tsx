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

function removeDuplicateLines(value: string) {
  const seen = new Set<string>();

  return value
    .split(/\r?\n/)
    .filter((line) => {
      if (seen.has(line)) return false;
      seen.add(line);
      return true;
    })
    .join("\n");
}

function countLines(value: string) {
  if (!value) return 0;
  return value.split(/\r?\n/).length;
}

export default function RemoveDuplicateLinesTool() {
  const [text, setText] = useState("");
  const [result, setResult] = useState("");

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
  };

  const clear = () => {
    setText("");
    setResult("");
  };

  return (
    <ToolPanel>
      <ToolTextarea
        value={text}
        onChange={setText}
        placeholder="Paste lines..."
        rows={10}
      />

      <ToolButtonRow>
        <ToolButton onClick={() => setResult(removeDuplicateLines(text))}>
          Remove
        </ToolButton>
        <ToolButton onClick={copy} variant="secondary">
          Copy
        </ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ToolStatCard label="Original lines" value={countLines(text)} />
        <ToolStatCard label="Result lines" value={countLines(result)} />
      </div>

      <ToolResultBox muted={!result}>
        {result ? (
          <div className="whitespace-pre-wrap">{result}</div>
        ) : (
          "Deduplicated lines will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
