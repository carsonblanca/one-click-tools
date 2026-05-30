"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolInput,
  ToolPanel,
  ToolResultBox,
} from "../tool-ui/ToolUI";

type ParsedUrl = {
  protocol: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  origin: string;
};

const emptyResult: ParsedUrl = {
  protocol: "",
  hostname: "",
  port: "",
  pathname: "",
  search: "",
  hash: "",
  origin: "",
};

export default function UrlParserTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ParsedUrl>(emptyResult);
  const [error, setError] = useState("");

  const parseUrl = () => {
    try {
      const parsed = new URL(input.trim());
      setResult({
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || "-",
        pathname: parsed.pathname,
        search: parsed.search || "-",
        hash: parsed.hash || "-",
        origin: parsed.origin,
      });
      setError("");
    } catch {
      setResult(emptyResult);
      setError("Enter a valid absolute URL, including the protocol.");
    }
  };

  const copyResult = async () => {
    if (!result.origin) return;
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
  };

  const clear = () => {
    setInput("");
    setResult(emptyResult);
    setError("");
  };

  return (
    <ToolPanel>
      <ToolInput
        value={input}
        onChange={setInput}
        placeholder="https://example.com:443/path?name=value#section"
      />

      <ToolButtonRow>
        <ToolButton onClick={parseUrl}>Parse</ToolButton>
        <ToolButton onClick={copyResult} variant="secondary">
          Copy Result
        </ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox muted={!result.origin && !error}>
        {error || result.origin ? (
          error || (
            <div className="space-y-2">
              {Object.entries(result).map(([key, value]) => (
                <div key={key}>
                  <span className="font-medium">{key}: </span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
          )
        ) : (
          "Parsed URL parts will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
