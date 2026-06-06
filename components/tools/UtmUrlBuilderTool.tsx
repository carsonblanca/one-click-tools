"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolInput,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
} from "../tool-ui/ToolUI";

type UtmFields = {
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
};

function buildUtmUrl(baseUrl: string, fields: UtmFields) {
  if (!baseUrl.trim()) {
    throw new Error("Enter a base URL first.");
  }

  const url = new URL(baseUrl.trim());
  const mappings: Array<[keyof UtmFields, string]> = [
    ["source", "utm_source"],
    ["medium", "utm_medium"],
    ["campaign", "utm_campaign"],
    ["term", "utm_term"],
    ["content", "utm_content"],
  ];

  mappings.forEach(([field, parameter]) => {
    const value = fields[field].trim();

    if (value) {
      url.searchParams.set(parameter, value);
    } else {
      url.searchParams.delete(parameter);
    }
  });

  return url.toString();
}

export default function UtmUrlBuilderTool() {
  const [baseUrl, setBaseUrl] = useState("");
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [term, setTerm] = useState("");
  const [content, setContent] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const generate = () => {
    try {
      setOutput(
        buildUtmUrl(baseUrl, {
          source,
          medium,
          campaign,
          term,
          content,
        }),
      );
      setError("");
    } catch (caught) {
      setOutput("");
      setError(caught instanceof Error ? caught.message : "Invalid URL.");
    }
  };

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
  };

  const clear = () => {
    setBaseUrl("");
    setSource("");
    setMedium("");
    setCampaign("");
    setTerm("");
    setContent("");
    setOutput("");
    setError("");
  };

  return (
    <ToolPanel>
      <div>
        <ToolLabel>Base URL</ToolLabel>
        <ToolInput
          value={baseUrl}
          onChange={setBaseUrl}
          placeholder="https://example.com/page?existing=value"
        />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <ToolLabel>Source</ToolLabel>
          <ToolInput value={source} onChange={setSource} placeholder="google" />
        </div>

        <div>
          <ToolLabel>Medium</ToolLabel>
          <ToolInput value={medium} onChange={setMedium} placeholder="cpc" />
        </div>

        <div>
          <ToolLabel>Campaign</ToolLabel>
          <ToolInput
            value={campaign}
            onChange={setCampaign}
            placeholder="spring_sale"
          />
        </div>

        <div>
          <ToolLabel>Term</ToolLabel>
          <ToolInput value={term} onChange={setTerm} placeholder="running shoes" />
        </div>

        <div>
          <ToolLabel>Content</ToolLabel>
          <ToolInput
            value={content}
            onChange={setContent}
            placeholder="blue_button"
          />
        </div>
      </div>

      <ToolButtonRow>
        <ToolButton onClick={generate}>Generate</ToolButton>
        <ToolButton onClick={copy} variant="secondary">
          Copy
        </ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox muted={!output && !error}>
        {error || output || "Generated UTM URL will appear here."}
      </ToolResultBox>
    </ToolPanel>
  );
}
