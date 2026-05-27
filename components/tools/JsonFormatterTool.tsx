"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolTextarea,
} from "../tool-ui/ToolUI";

export default function JsonFormatterTool() {
  const [jsonText, setJsonText] = useState("");

  const formatJson = () => {
    try {
      const formatted = JSON.stringify(JSON.parse(jsonText), null, 2);
      setJsonText(formatted);
    } catch {
      alert("Invalid JSON.");
    }
  };

  const minifyJson = () => {
    try {
      const minified = JSON.stringify(JSON.parse(jsonText));
      setJsonText(minified);
    } catch {
      alert("Invalid JSON.");
    }
  };

  return (
    <ToolPanel>
      <ToolTextarea
        value={jsonText}
        onChange={setJsonText}
        placeholder="Paste JSON here..."
        rows={12}
      />

      <ToolButtonRow>
        <ToolButton onClick={formatJson}>Format JSON</ToolButton>
        <ToolButton onClick={minifyJson} variant="secondary">
          Minify
        </ToolButton>
        <ToolButton onClick={() => setJsonText("")} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>
    </ToolPanel>
  );
}