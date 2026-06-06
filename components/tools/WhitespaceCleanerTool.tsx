"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

function cleanWhitespace(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/[ \t]+/g, " "))
    .filter(Boolean)
    .join("\n");
}

export default function WhitespaceCleanerTool() {
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
        placeholder="Paste text with extra whitespace..."
        rows={10}
      />

      <ToolButtonRow>
        <ToolButton onClick={() => setResult(cleanWhitespace(text))}>Clean</ToolButton>
        <ToolButton onClick={copy} variant="secondary">
          Copy
        </ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox muted={!result}>
        {result ? (
          <div className="whitespace-pre-wrap">{result}</div>
        ) : (
          "Cleaned text will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
