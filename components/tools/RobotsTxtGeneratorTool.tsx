"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolInput,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

type RobotsMode = "allow" | "block" | "custom";

function buildRobotsTxt({
  mode,
  customRules,
  sitemapUrl,
}: {
  mode: RobotsMode;
  customRules: string;
  sitemapUrl: string;
}) {
  const lines: string[] = [];

  if (mode === "allow") {
    lines.push("User-agent: *", "Allow: /");
  } else if (mode === "block") {
    lines.push("User-agent: *", "Disallow: /");
  } else {
    lines.push(customRules.trim() || "User-agent: *\nDisallow:");
  }

  if (sitemapUrl.trim()) {
    lines.push("", `Sitemap: ${sitemapUrl.trim()}`);
  }

  return lines.join("\n");
}

export default function RobotsTxtGeneratorTool() {
  const [mode, setMode] = useState<RobotsMode>("allow");
  const [customRules, setCustomRules] = useState(
    "User-agent: *\nAllow: /\n\nUser-agent: BadBot\nDisallow: /",
  );
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [output, setOutput] = useState("");

  const generate = () => {
    setOutput(buildRobotsTxt({ mode, customRules, sitemapUrl }));
  };

  const copy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
  };

  const clear = () => {
    setMode("allow");
    setCustomRules("");
    setSitemapUrl("");
    setOutput("");
  };

  return (
    <ToolPanel>
      <ToolLabel>Rule mode</ToolLabel>
      <ToolButtonRow>
        <ToolButton
          onClick={() => setMode("allow")}
          variant={mode === "allow" ? "primary" : "secondary"}
        >
          Allow all
        </ToolButton>
        <ToolButton
          onClick={() => setMode("block")}
          variant={mode === "block" ? "primary" : "secondary"}
        >
          Block all
        </ToolButton>
        <ToolButton
          onClick={() => setMode("custom")}
          variant={mode === "custom" ? "primary" : "secondary"}
        >
          Custom rules
        </ToolButton>
      </ToolButtonRow>

      {mode === "custom" ? (
        <div className="mt-5">
          <ToolLabel>Custom user-agent rules</ToolLabel>
          <ToolTextarea
            value={customRules}
            onChange={setCustomRules}
            placeholder={"User-agent: *\nDisallow: /private/"}
            rows={7}
          />
        </div>
      ) : null}

      <div className="mt-5">
        <ToolLabel>Sitemap URL</ToolLabel>
        <ToolInput
          value={sitemapUrl}
          onChange={setSitemapUrl}
          placeholder="https://example.com/sitemap.xml"
        />
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

      <ToolResultBox muted={!output}>
        {output ? (
          <pre className="overflow-x-auto whitespace-pre-wrap">{output}</pre>
        ) : (
          "Generated robots.txt content will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
