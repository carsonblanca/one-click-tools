"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

type QueryEntry = {
  key: string;
  value: string;
};

function getQueryString(input: string) {
  const trimmed = input.trim();

  if (!trimmed) return "";

  try {
    return new URL(trimmed).search;
  } catch {
    const questionIndex = trimmed.indexOf("?");
    const query = questionIndex >= 0 ? trimmed.slice(questionIndex + 1) : trimmed;
    return query.startsWith("?") ? query.slice(1) : query;
  }
}

function entriesToJson(entries: QueryEntry[]) {
  return entries.reduce<Record<string, string | string[]>>((acc, entry) => {
    const current = acc[entry.key];

    if (Array.isArray(current)) {
      current.push(entry.value);
    } else if (typeof current === "string") {
      acc[entry.key] = [current, entry.value];
    } else {
      acc[entry.key] = entry.value;
    }

    return acc;
  }, {});
}

export default function QueryStringParserTool() {
  const [input, setInput] = useState("");
  const [entries, setEntries] = useState<QueryEntry[]>([]);
  const [error, setError] = useState("");

  const parse = () => {
    const query = getQueryString(input);
    const params = new URLSearchParams(query);
    const nextEntries = Array.from(params.entries(), ([key, value]) => ({
      key,
      value,
    }));

    setEntries(nextEntries);
    setError(nextEntries.length === 0 ? "No query parameters found." : "");
  };

  const copyJson = async () => {
    if (entries.length === 0) return;
    await navigator.clipboard.writeText(
      JSON.stringify(entriesToJson(entries), null, 2),
    );
  };

  const clear = () => {
    setInput("");
    setEntries([]);
    setError("");
  };

  return (
    <ToolPanel>
      <ToolTextarea
        value={input}
        onChange={setInput}
        placeholder="https://example.com/search?q=tools&page=1"
        rows={6}
      />

      <ToolButtonRow>
        <ToolButton onClick={parse}>Parse</ToolButton>
        <ToolButton onClick={copyJson} variant="secondary">
          Copy JSON
        </ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox muted={entries.length === 0 && !error}>
        {error || entries.length > 0 ? (
          error || (
            <div className="space-y-2">
              {entries.map((entry, index) => (
                <div key={`${entry.key}-${index}`}>
                  <span className="font-medium">{entry.key}: </span>
                  <span>{entry.value}</span>
                </div>
              ))}
            </div>
          )
        ) : (
          "Parsed query parameters will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
