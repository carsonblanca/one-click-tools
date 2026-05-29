"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

function formatCss(value: string) {
  let depth = 0;
  let output = "";

  value.split("").forEach((character) => {
    if (character === "{") {
      depth += 1;
      output += " {\n" + "  ".repeat(depth);
      return;
    }

    if (character === "}") {
      depth = Math.max(depth - 1, 0);
      output = output.trimEnd();
      output += "\n" + "  ".repeat(depth) + "}\n" + "  ".repeat(depth);
      return;
    }

    if (character === ";") {
      output += ";\n" + "  ".repeat(depth);
      return;
    }

    output += character;
  });

  return output
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line, index, lines) => line || index === lines.length - 1)
    .join("\n")
    .trim();
}

function minifyCss(value: string) {
  return value
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>+~])\s*/g, "$1")
    .trim();
}

export default function CssFormatterTool() {
  const [css, setCss] = useState("");

  const copy = async () => {
    if (!css) return;
    await navigator.clipboard.writeText(css);
  };

  return (
    <ToolPanel>
      <ToolTextarea
        value={css}
        onChange={setCss}
        placeholder="Paste CSS..."
        rows={12}
      />

      <ToolButtonRow>
        <ToolButton onClick={() => setCss(formatCss(css))}>Format</ToolButton>
        <ToolButton onClick={() => setCss(minifyCss(css))} variant="secondary">
          Minify
        </ToolButton>
        <ToolButton onClick={copy} variant="secondary">
          Copy
        </ToolButton>
        <ToolButton onClick={() => setCss("")} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox muted={!css}>
        {css ? "Formatted CSS stays in the editor above." : "Paste CSS to begin."}
      </ToolResultBox>
    </ToolPanel>
  );
}
