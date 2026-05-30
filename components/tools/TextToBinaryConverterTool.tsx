"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

function textToBinary(value: string) {
  return Array.from(new TextEncoder().encode(value), (byte) =>
    byte.toString(2).padStart(8, "0"),
  ).join(" ");
}

export default function TextToBinaryConverterTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const convert = () => {
    setOutput(textToBinary(input));
  };

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
  };

  const clear = () => {
    setInput("");
    setOutput("");
  };

  return (
    <ToolPanel>
      <ToolTextarea
        value={input}
        onChange={setInput}
        placeholder="Enter text..."
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

      <ToolResultBox muted={!output}>
        {output || "Binary output will appear here."}
      </ToolResultBox>
    </ToolPanel>
  );
}
