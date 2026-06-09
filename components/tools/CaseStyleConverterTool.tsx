"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

const styleLabels = [
  "camelCase",
  "PascalCase",
  "snake_case",
  "kebab-case",
  "CONSTANT_CASE",
  "Title Case",
  "sentence case",
] as const;

type StyleLabel = (typeof styleLabels)[number];

function splitWords(value: string) {
  return (
    value
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .match(/[A-Za-z0-9]+/g) || []
  ).map((word) => word.toLowerCase());
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function convertCase(value: string, style: StyleLabel) {
  const words = splitWords(value);

  if (!words.length) return "";

  if (style === "camelCase") {
    return words[0] + words.slice(1).map(capitalize).join("");
  }

  if (style === "PascalCase") {
    return words.map(capitalize).join("");
  }

  if (style === "snake_case") {
    return words.join("_");
  }

  if (style === "kebab-case") {
    return words.join("-");
  }

  if (style === "CONSTANT_CASE") {
    return words.join("_").toUpperCase();
  }

  if (style === "Title Case") {
    return words.map(capitalize).join(" ");
  }

  return capitalize(words.join(" "));
}

export default function CaseStyleConverterTool() {
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const convert = (style: StyleLabel) => {
    const converted = convertCase(text, style);

    if (!converted) {
      setResult("");
      setError("Enter text to convert.");
      return;
    }

    setResult(converted);
    setError("");
  };

  const copy = () => {
    if (result) {
      navigator.clipboard?.writeText(result);
    }
  };

  const clear = () => {
    setText("");
    setResult("");
    setError("");
  };

  return (
    <ToolPanel>
      <ToolTextarea value={text} onChange={setText} placeholder="Enter text or identifier..." rows={6} />

      <ToolButtonRow>
        {styleLabels.map((style) => (
          <ToolButton key={style} onClick={() => convert(style)} variant="secondary">
            {style}
          </ToolButton>
        ))}
      </ToolButtonRow>

      <ToolButtonRow>
        <ToolButton onClick={() => convert("camelCase")}>Convert</ToolButton>
        <ToolButton onClick={copy} variant="secondary">
          Copy
        </ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      {error ? (
        <ToolResultBox>{error}</ToolResultBox>
      ) : result ? (
        <ToolResultBox>{result}</ToolResultBox>
      ) : (
        <ToolResultBox muted>Converted case style will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
