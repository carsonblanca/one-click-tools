"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolStatCard,
  ToolTextarea,
} from "../tool-ui/ToolUI";

function removeHtmlComments(value: string) {
  return value.replace(/<!--[\s\S]*?-->/g, "");
}

function collapseWhitespaceOutsideQuotes(value: string) {
  let result = "";
  let quote: string | null = null;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];

    if (quote) {
      result += character;

      if (character === quote) {
        quote = null;
      }

      continue;
    }

    if (character === "\"" || character === "'") {
      quote = character;
      result += character;
      continue;
    }

    if (/\s/.test(character)) {
      const previous = result[result.length - 1];

      if (previous && !/\s/.test(previous)) {
        result += " ";
      }

      continue;
    }

    result += character;
  }

  return result;
}

function minifyHtml(input: string) {
  return collapseWhitespaceOutsideQuotes(removeHtmlComments(input))
    .replace(/>\s+</g, "><")
    .trim();
}

export default function HtmlMinifierTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const minify = () => {
    setOutput(minifyHtml(input));
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
        placeholder={"<section>\n  <!-- comment -->\n  <h1 class=\"title large\">Hello world</h1>\n</section>"}
        rows={9}
      />

      <ToolButtonRow>
        <ToolButton onClick={minify}>Minify</ToolButton>
        <ToolButton onClick={copy} variant="secondary">
          Copy
        </ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ToolStatCard label="Original length" value={input.length || "-"} />
        <ToolStatCard label="Minified length" value={output.length || "-"} />
      </div>

      <ToolResultBox muted={!output}>
        {output || "Minified HTML will appear here."}
      </ToolResultBox>
    </ToolPanel>
  );
}
