"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

export default function TextReverserTool() {
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
        placeholder="Enter text to reverse..."
        rows={8}
      />

      <ToolButtonRow>
        <ToolButton onClick={() => setResult(Array.from(text).reverse().join(""))}>
          Reverse Characters
        </ToolButton>
        <ToolButton
          onClick={() => setResult(text.split(/(\s+)/).reverse().join(""))}
          variant="secondary"
        >
          Reverse Words
        </ToolButton>
        <ToolButton
          onClick={() => setResult(text.split(/\r?\n/).reverse().join("\n"))}
          variant="secondary"
        >
          Reverse Lines
        </ToolButton>
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
          "Reversed text will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
