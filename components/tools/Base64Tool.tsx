"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolTextarea,
} from "../tool-ui/ToolUI";

export default function Base64Tool() {
  const [text, setText] = useState("");

  const encode = () => {
    try {
      setText(btoa(unescape(encodeURIComponent(text))));
    } catch {
      alert("Unable to encode this text.");
    }
  };

  const decode = () => {
    try {
      setText(decodeURIComponent(escape(atob(text))));
    } catch {
      alert("Invalid Base64 input.");
    }
  };

  return (
    <ToolPanel>
      <ToolTextarea
        value={text}
        onChange={setText}
        placeholder="Enter text or Base64..."
        rows={8}
      />

      <ToolButtonRow>
        <ToolButton onClick={encode}>Encode</ToolButton>
        <ToolButton onClick={decode} variant="secondary">
          Decode
        </ToolButton>
        <ToolButton onClick={() => setText("")} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>
    </ToolPanel>
  );
}