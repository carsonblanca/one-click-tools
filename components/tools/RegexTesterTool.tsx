"use client";

import { useMemo, useState } from "react";
import {
  ToolCheckbox,
  ToolInput,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
  ToolStatCard,
  ToolTextarea,
  ToolButton,
  ToolButtonRow,
} from "../tool-ui/ToolUI";

type RegexResult = {
  error: string;
  matches: string[];
};

export default function RegexTesterTool() {
  const [pattern, setPattern] = useState("");
  const [testText, setTestText] = useState("");
  const [global, setGlobal] = useState(true);
  const [caseInsensitive, setCaseInsensitive] = useState(false);
  const [multiline, setMultiline] = useState(false);

  const result = useMemo<RegexResult>(() => {
    if (!pattern) {
      return { error: "", matches: [] };
    }

    const flags = `${global ? "g" : ""}${caseInsensitive ? "i" : ""}${
      multiline ? "m" : ""
    }`;

    try {
      const regex = new RegExp(pattern, flags);

      if (global) {
        return {
          error: "",
          matches: Array.from(testText.matchAll(regex), (match) => match[0]),
        };
      }

      const match = testText.match(regex);
      return { error: "", matches: match ? [match[0]] : [] };
    } catch {
      return { error: "Invalid regular expression.", matches: [] };
    }
  }, [caseInsensitive, global, multiline, pattern, testText]);

  const clear = () => {
    setPattern("");
    setTestText("");
  };

  return (
    <ToolPanel>
      <div>
        <ToolLabel>Regex pattern</ToolLabel>
        <ToolInput
          value={pattern}
          onChange={setPattern}
          placeholder="\\b\\w+@\\w+\\.com\\b"
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <ToolCheckbox checked={global} onChange={setGlobal}>
          Global
        </ToolCheckbox>
        <ToolCheckbox
          checked={caseInsensitive}
          onChange={setCaseInsensitive}
        >
          Case insensitive
        </ToolCheckbox>
        <ToolCheckbox checked={multiline} onChange={setMultiline}>
          Multiline
        </ToolCheckbox>
      </div>

      <div className="mt-5">
        <ToolLabel>Test text</ToolLabel>
        <ToolTextarea
          value={testText}
          onChange={setTestText}
          placeholder="Enter text to test..."
          rows={8}
        />
      </div>

      <ToolButtonRow>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ToolStatCard label="Matches" value={result.matches.length} />
        <ToolStatCard
          label="Flags"
          value={`${global ? "g" : ""}${caseInsensitive ? "i" : ""}${
            multiline ? "m" : ""
          }`}
        />
      </div>

      <ToolResultBox muted={!result.error && result.matches.length === 0}>
        {result.error
          ? result.error
          : result.matches.length > 0
            ? result.matches.map((match, index) => (
                <div key={`${match}-${index}`}>{match}</div>
              ))
            : "Matches will appear here."}
      </ToolResultBox>
    </ToolPanel>
  );
}
