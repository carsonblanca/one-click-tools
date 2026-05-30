"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

function binaryToText(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "";
  }

  if (!parts.every((part) => /^[01]{8}$/.test(part))) {
    throw new Error("Enter 8-bit binary values separated by spaces.");
  }

  const bytes = Uint8Array.from(parts, (part) => Number.parseInt(part, 2));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export default function BinaryToTextConverterTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const convert = () => {
    try {
      setOutput(binaryToText(input));
      setError("");
    } catch (caught) {
      setOutput("");
      setError(caught instanceof Error ? caught.message : "Invalid binary input.");
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
        placeholder="01001000 01100101 01101100 01101100 01101111"
        rows={8}
      />

      <ToolButtonRow>
        <ToolButton onClick={convert}>Convert</ToolButton>
        <ToolButton onClick={copy} variant="secondary">
          Copy
        </ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox muted={!output && !error}>
        {error || output || "Converted text will appear here."}
      </ToolResultBox>
    </ToolPanel>
  );
}
