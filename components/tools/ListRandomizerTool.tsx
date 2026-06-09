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

function shuffleItems(items: string[]) {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function uniqueItems(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.trim().toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export default function ListRandomizerTool() {
  const [input, setInput] = useState("");
  const [removeEmpty, setRemoveEmpty] = useState(true);
  const [removeDuplicates, setRemoveDuplicates] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const randomize = () => {
    let items = input.split(/\r?\n/);

    if (removeEmpty) {
      items = items.filter((item) => item.trim());
    }

    if (removeDuplicates) {
      items = uniqueItems(items);
    }

    if (!items.length) {
      setResult("");
      setError("Enter at least one list item.");
      return;
    }

    setResult(shuffleItems(items).join("\n"));
    setError("");
  };

  const copy = () => {
    if (result) {
      navigator.clipboard?.writeText(result);
    }
  };

  const clear = () => {
    setInput("");
    setResult("");
    setError("");
  };

  return (
    <ToolPanel>
      <ToolTextarea
        value={input}
        onChange={setInput}
        placeholder="Paste list items, one per line..."
        rows={10}
      />

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <ToolCheckbox checked={removeEmpty} onChange={setRemoveEmpty}>
          Remove empty lines
        </ToolCheckbox>
        <ToolCheckbox checked={removeDuplicates} onChange={setRemoveDuplicates}>
          Remove duplicates
        </ToolCheckbox>
      </div>

      <ToolButtonRow>
        <ToolButton onClick={randomize}>Randomize</ToolButton>
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
        <ToolResultBox>
          <pre className="whitespace-pre-wrap font-mono text-sm">{result}</pre>
        </ToolResultBox>
      ) : (
        <ToolResultBox muted>Randomized list will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
