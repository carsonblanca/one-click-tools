"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

function convertTimestampLine(line: string) {
  const trimmed = line.trim();

  if (!trimmed) return "";

  const value = Number(trimmed);

  if (!Number.isFinite(value)) {
    return `${trimmed} | Invalid timestamp`;
  }

  const milliseconds = Math.abs(value) >= 1000000000000 ? value : value * 1000;
  const date = new Date(milliseconds);

  if (Number.isNaN(date.getTime())) {
    return `${trimmed} | Invalid timestamp`;
  }

  const detectedUnit = Math.abs(value) >= 1000000000000 ? "milliseconds" : "seconds";

  return [
    trimmed,
    detectedUnit,
    date.toLocaleString(),
    date.toISOString(),
  ].join(" | ");
}

export default function UnixTimestampBatchConverterTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const convert = () => {
    const lines = input.split(/\r?\n/).map(convertTimestampLine).filter(Boolean);
    setOutput(
      lines.length > 0
        ? ["Timestamp | Unit | Local time | UTC time", ...lines].join("\n")
        : "",
    );
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
        placeholder={"1717200000\n1717200000000"}
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
        {output ? (
          <pre className="overflow-x-auto whitespace-pre-wrap">{output}</pre>
        ) : (
          "Converted timestamps will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
