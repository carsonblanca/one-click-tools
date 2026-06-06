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

type DiffLine = {
  type: "added" | "removed" | "unchanged";
  value: string;
};

function compareLines(original: string, changed: string) {
  const originalLines = original.split(/\r?\n/);
  const changedLines = changed.split(/\r?\n/);
  const maxLength = Math.max(originalLines.length, changedLines.length);
  const diff: DiffLine[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    const originalLine = originalLines[index];
    const changedLine = changedLines[index];

    if (originalLine === changedLine && originalLine !== undefined) {
      diff.push({ type: "unchanged", value: originalLine });
      continue;
    }

    if (originalLine !== undefined) {
      diff.push({ type: "removed", value: originalLine });
    }

    if (changedLine !== undefined) {
      diff.push({ type: "added", value: changedLine });
    }
  }

  return diff;
}

function countType(diff: DiffLine[], type: DiffLine["type"]) {
  return diff.filter((line) => line.type === type).length;
}

export default function TextDiffCheckerTool() {
  const [original, setOriginal] = useState("");
  const [changed, setChanged] = useState("");
  const [diff, setDiff] = useState<DiffLine[]>([]);

  const clear = () => {
    setOriginal("");
    setChanged("");
    setDiff([]);
  };

  return (
    <ToolPanel>
      <div className="grid gap-4 md:grid-cols-2">
        <ToolTextarea
          value={original}
          onChange={setOriginal}
          placeholder="Original text..."
          rows={10}
        />
        <ToolTextarea
          value={changed}
          onChange={setChanged}
          placeholder="Changed text..."
          rows={10}
        />
      </div>

      <ToolButtonRow>
        <ToolButton onClick={() => setDiff(compareLines(original, changed))}>
          Compare
        </ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <ToolStatCard label="Added" value={countType(diff, "added")} />
        <ToolStatCard label="Removed" value={countType(diff, "removed")} />
        <ToolStatCard label="Unchanged" value={countType(diff, "unchanged")} />
      </div>

      <ToolResultBox muted={diff.length === 0}>
        {diff.length > 0 ? (
          <div className="space-y-1 font-mono text-sm">
            {diff.map((line, index) => (
              <div key={`${line.type}-${index}`} className="whitespace-pre-wrap">
                <span className="font-semibold">
                  {line.type === "added" ? "+ " : line.type === "removed" ? "- " : "  "}
                </span>
                {line.value || " "}
              </div>
            ))}
          </div>
        ) : (
          "Line-by-line diff will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
