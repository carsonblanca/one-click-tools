"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolTextarea,
} from "../tool-ui/ToolUI";

export default function UrlEncoderTool() {
  const [text, setText] = useState("");

  const encode = () => {
    setText(encodeURIComponent(text));
  };

  const decode = () => {
    try {
      setText(decodeURIComponent(text));
    } catch {
      alert("Invalid encoded URL.");
    }
  };

  return (
    <ToolPanel>
      <ToolTextarea
        value={text}
        onChange={setText}
        placeholder="Enter URL or text..."
        rows={8}
      />

      <ToolButtonRow>
        <ToolButton onClick={encode}>Encode URL</ToolButton>
        <ToolButton onClick={decode} variant="secondary">
          Decode URL
        </ToolButton>
        <ToolButton onClick={() => setText("")} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>
    </ToolPanel>
  );
}