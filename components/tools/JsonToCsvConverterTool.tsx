"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) return "";

  const stringValue =
    typeof value === "object" ? JSON.stringify(value) : String(value);

  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }

  return stringValue;
}

function jsonToCsv(input: string) {
  const parsed: unknown = JSON.parse(input);

  if (!Array.isArray(parsed)) {
    throw new Error("Paste a JSON array of objects.");
  }

  if (!parsed.every(isRecord)) {
    throw new Error("Every item in the JSON array must be an object.");
  }

  const headers = Array.from(
    parsed.reduce<Set<string>>((set, record) => {
      Object.keys(record).forEach((key) => set.add(key));
      return set;
    }, new Set()),
  );

  if (headers.length === 0) {
    return "";
  }

  const lines = [
    headers.map(escapeCsvValue).join(","),
    ...parsed.map((record) =>
      headers.map((header) => escapeCsvValue(record[header])).join(","),
    ),
  ];

  return lines.join("\n");
}

export default function JsonToCsvConverterTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const convert = () => {
    try {
      setOutput(jsonToCsv(input));
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
        placeholder={'[{"name":"Ada","email":"ada@example.com"}]'}
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
          "Converted CSV will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
