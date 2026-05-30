"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

const encodeMap: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#39;",
  "©": "&copy;",
  "®": "&reg;",
  "™": "&trade;",
  "€": "&euro;",
  "£": "&pound;",
  "¥": "&yen;",
};

const decodeMap = Object.fromEntries(
  Object.entries(encodeMap).map(([key, value]) => [value, key]),
);

function encodeEntities(value: string) {
  return value.replace(/[&<>"'©®™€£¥]/g, (character) => encodeMap[character]);
}

function decodeEntities(value: string) {
  return value.replace(
    /&(?:amp|lt|gt|quot|copy|reg|trade|euro|pound|yen);|&#39;|&#x27;/g,
    (entity) => {
      if (entity === "&#x27;") return "'";
      return decodeMap[entity] || entity;
    },
  );
}

export default function HtmlEntityEncoderDecoderTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

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
        placeholder="Enter text or HTML entities..."
        rows={8}
      />

      <ToolButtonRow>
        <ToolButton onClick={() => setOutput(encodeEntities(input))}>
          Encode
        </ToolButton>
        <ToolButton
          onClick={() => setOutput(decodeEntities(input))}
          variant="secondary"
        >
          Decode
        </ToolButton>
        <ToolButton onClick={copy} variant="secondary">
          Copy
        </ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox muted={!output}>
        {output || "Encoded or decoded text will appear here."}
      </ToolResultBox>
    </ToolPanel>
  );
}
