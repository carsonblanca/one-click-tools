"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolCheckbox,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

function sortLines(value: string, direction: "asc" | "desc", removeEmpty: boolean) {
  const lines = value.split(/\r?\n/);
  const filtered = removeEmpty ? lines.filter((line) => line.trim()) : lines;
  const sorted = [...filtered].sort((a, b) => a.localeCompare(b));

  return (direction === "asc" ? sorted : sorted.reverse()).join("\n");
}

export default function SortLinesTool() {
  const [text, setText] = useState("");
  const [result, setResult] = useState("");
  const [removeEmptyLines, setRemoveEmptyLines] = useState(false);

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
        placeholder="Paste lines to sort..."
        rows={10}
      />

      <div className="mt-5">
        <ToolCheckbox checked={removeEmptyLines} onChange={setRemoveEmptyLines}>
          Remove empty lines
        </ToolCheckbox>
      </div>

      <ToolButtonRow>
        <ToolButton onClick={() => setResult(sortLines(text, "asc", removeEmptyLines))}>
          Sort A-Z
        </ToolButton>
        <ToolButton
          onClick={() => setResult(sortLines(text, "desc", removeEmptyLines))}
          variant="secondary"
        >
          Sort Z-A
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
          "Sorted lines will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
