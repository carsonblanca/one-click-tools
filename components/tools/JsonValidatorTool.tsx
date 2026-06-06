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

export default function JsonValidatorTool() {
  const [input, setInput] = useState("");
  const [formatted, setFormatted] = useState("");
  const [status, setStatus] = useState("Not checked");
  const [error, setError] = useState("");

  const validate = () => {
    try {
      const parsed: unknown = JSON.parse(input);
      setFormatted(JSON.stringify(parsed, null, 2));
      setStatus("Valid");
      setError("");
    } catch (caught) {
      setFormatted("");
      setStatus("Invalid");
      setError(caught instanceof Error ? caught.message : "Invalid JSON.");
    }
  };

  const copyFormatted = async () => {
    if (!formatted) return;
    await navigator.clipboard.writeText(formatted);
  };

  const clear = () => {
    setInput("");
    setFormatted("");
    setStatus("Not checked");
    setError("");
  };

  return (
    <ToolPanel>
      <ToolTextarea
        value={input}
        onChange={setInput}
        placeholder={'{"name":"Ada","active":true}'}
        rows={9}
      />

      <ToolButtonRow>
        <ToolButton onClick={validate}>Validate</ToolButton>
        <ToolButton onClick={copyFormatted} variant="secondary">
          Copy Formatted
        </ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ToolStatCard label="State" value={status} />
        <ToolStatCard
          label="Formatted length"
          value={formatted ? formatted.length : "-"}
        />
      </div>

      <ToolResultBox muted={!formatted && !error}>
        {error || formatted ? (
          <pre className="overflow-x-auto whitespace-pre-wrap">
            {error || formatted}
          </pre>
        ) : (
          "Validation result will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
