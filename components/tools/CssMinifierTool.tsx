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

function removeCssComments(value: string) {
  let result = "";
  let quote: string | null = null;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const nextCharacter = value[index + 1];

    if (quote) {
      result += character;

      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }

      continue;
    }

    if (character === "\"" || character === "'") {
      quote = character;
      result += character;
      continue;
    }

    if (character === "/" && nextCharacter === "*") {
      index += 2;

      while (
        index < value.length &&
        !(value[index] === "*" && value[index + 1] === "/")
      ) {
        index += 1;
      }

      index += 1;
      continue;
    }

    result += character;
  }

  return result;
}

function minifyCss(input: string) {
  const withoutComments = removeCssComments(input);
  const punctuation = "{}:;,>+~[]";
  let result = "";
  let quote: string | null = null;
  let escaped = false;

  for (let index = 0; index < withoutComments.length; index += 1) {
    const character = withoutComments[index];

    if (quote) {
      result += character;

      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === quote) {
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
      let cursor = index + 1;

      while (cursor < withoutComments.length && /\s/.test(withoutComments[cursor])) {
        cursor += 1;
      }

      const next = withoutComments[cursor];

      if (
        previous &&
        next &&
        !punctuation.includes(previous) &&
        !punctuation.includes(next)
      ) {
        result += " ";
      }

      index = cursor - 1;
      continue;
    }

    if (punctuation.includes(character)) {
      result = result.trimEnd();
      result += character;
      continue;
    }

    result += character;
  }

  return result.trim().replace(/;}/g, "}");
}

export default function CssMinifierTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");

  const minify = () => {
    setOutput(minifyCss(input));
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
        placeholder={"body {\n  color: #111;\n  content: \"hello world\";\n}"}
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
        {output || "Minified CSS will appear here."}
      </ToolResultBox>
    </ToolPanel>
  );
}
