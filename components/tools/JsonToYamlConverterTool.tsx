"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

type JsonValue =
  | null
  | string
  | number
  | boolean
  | JsonValue[]
  | { [key: string]: JsonValue };

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }

  return false;
}

function formatScalar(value: null | string | number | boolean) {
  if (value === null) return "null";
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (value === "") return "\"\"";

  const needsQuotes =
    /^\s|\s$/.test(value) ||
    /[\n\r#]/.test(value) ||
    /:\s/.test(value) ||
    /^[-?:,[\]{}&*!|>'"%@`]/.test(value);

  if (!needsQuotes) return value;

  return `"${value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "\\\"")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")}"`;
}

function formatKey(key: string) {
  return /^[A-Za-z0-9_-]+$/.test(key) ? key : formatScalar(key);
}

function isScalar(
  value: JsonValue,
): value is null | string | number | boolean {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function toYaml(value: JsonValue, indent = 0): string {
  const padding = " ".repeat(indent);

  if (isScalar(value)) {
    return `${padding}${formatScalar(value)}`;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return `${padding}[]`;

    return value
      .map((item) => {
        if (isScalar(item)) {
          return `${padding}- ${formatScalar(item)}`;
        }

        return `${padding}-\n${toYaml(item, indent + 2)}`;
      })
      .join("\n");
  }

  const entries = Object.entries(value);

  if (entries.length === 0) return `${padding}{}`;

  return entries
    .map(([key, item]) => {
      if (isScalar(item)) {
        return `${padding}${formatKey(key)}: ${formatScalar(item)}`;
      }

      return `${padding}${formatKey(key)}:\n${toYaml(item, indent + 2)}`;
    })
    .join("\n");
}

export default function JsonToYamlConverterTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const convert = () => {
    try {
      const parsed: unknown = JSON.parse(input);

      if (!isJsonValue(parsed)) {
        throw new Error("JSON contains unsupported values.");
      }

      setOutput(toYaml(parsed));
      setError("");
    } catch (caught) {
      setOutput("");
      setError(caught instanceof Error ? caught.message : "Invalid JSON.");
    }
  };

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
  };

  const clear = () => {
    setInput("");
    setOutput("");
    setError("");
  };

  return (
    <ToolPanel>
      <ToolTextarea
        value={input}
        onChange={setInput}
        placeholder={'{"name":"Ada","skills":["math","programming"]}'}
        rows={8}
      />

      <ToolButtonRow>
        <ToolButton onClick={convert}>Convert</ToolButton>
        <ToolButton onClick={copy} variant="secondary">
          Copy
        </ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox muted={!output && !error}>
        {error || output ? (
          <pre className="overflow-x-auto whitespace-pre-wrap">
            {error || output}
          </pre>
        ) : (
          "Converted YAML will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
