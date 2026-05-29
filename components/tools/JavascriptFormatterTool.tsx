"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

function formatJavascript(value: string) {
  let depth = 0;
  let output = "";
  let quote = "";
  let escaped = false;

  value.split("").forEach((character) => {
    if (quote) {
      output += character;
      escaped = character === "\\" && !escaped;

      if (character === quote && !escaped) {
        quote = "";
      }

      if (character !== "\\") {
        escaped = false;
      }

      return;
    }

    if (character === "\"" || character === "'" || character === "`") {
      quote = character;
      output += character;
      return;
    }

    if (character === "{") {
      depth += 1;
      output += " {\n" + "  ".repeat(depth);
      return;
    }

    if (character === "}") {
      depth = Math.max(depth - 1, 0);
      output = output.trimEnd();
      output += "\n" + "  ".repeat(depth) + "}";
      return;
    }

    if (character === ";") {
      output += ";\n" + "  ".repeat(depth);
      return;
    }

    output += character;
  });

  return output
    .replace(/\n\s*\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function minifyJavascript(value: string) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/[^\n\r]*/g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}();,:=+\-*/<>])\s*/g, "$1")
    .trim();
}

export default function JavascriptFormatterTool() {
  const [javascript, setJavascript] = useState("");

  const copy = async () => {
    if (!javascript) return;
    await navigator.clipboard.writeText(javascript);
  };

  return (
    <ToolPanel>
      <ToolTextarea
        value={javascript}
        onChange={setJavascript}
        placeholder="Paste JavaScript..."
        rows={12}
      />

      <ToolButtonRow>
        <ToolButton onClick={() => setJavascript(formatJavascript(javascript))}>
          Format
        </ToolButton>
        <ToolButton
          onClick={() => setJavascript(minifyJavascript(javascript))}
          variant="secondary"
        >
          Minify
        </ToolButton>
        <ToolButton onClick={copy} variant="secondary">
          Copy
        </ToolButton>
        <ToolButton onClick={() => setJavascript("")} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox muted={!javascript}>
        {javascript
          ? "Formatted JavaScript stays in the editor above and is never executed."
          : "Paste JavaScript to begin."}
      </ToolResultBox>
    </ToolPanel>
  );
}
