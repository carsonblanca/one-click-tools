"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

function bytesToHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export default function HashGeneratorTool() {
  const [text, setText] = useState("");
  const [hash, setHash] = useState("");

  const generateHash = async () => {
    const encoded = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    setHash(bytesToHex(digest));
  };

  const copyHash = async () => {
    if (!hash) return;
    await navigator.clipboard.writeText(hash);
  };

  const clear = () => {
    setText("");
    setHash("");
  };

  return (
    <ToolPanel>
      <ToolTextarea
        value={text}
        onChange={setText}
        placeholder="Enter text to hash..."
        rows={8}
      />

      <ToolButtonRow>
        <ToolButton onClick={generateHash}>Generate SHA-256</ToolButton>
        <ToolButton onClick={copyHash} variant="secondary">
          Copy
        </ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox muted={!hash}>
        {hash || "SHA-256 hash will appear here."}
      </ToolResultBox>
    </ToolPanel>
  );
}
