"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

function getXmlParserError(document: Document) {
  const parserError = document.getElementsByTagName("parsererror")[0];
  return parserError?.textContent?.trim() || "";
}

function parseXml(input: string) {
  if (!input.trim()) {
    throw new Error("Paste XML first.");
  }

  const document = new DOMParser().parseFromString(input, "application/xml");
  const parserError = getXmlParserError(document);

  if (parserError) {
    throw new Error(`Invalid XML: ${parserError}`);
  }

  return document;
}

function minifyXml(input: string) {
  const document = parseXml(input);
  return new XMLSerializer()
    .serializeToString(document)
    .replace(/>\s+</g, "><")
    .trim();
}

function formatXmlString(xml: string) {
  const compact = xml.replace(/>\s+</g, "><").trim();
  const tokens = compact
    .replace(/</g, "\n<")
    .replace(/>/g, ">\n")
    .split("\n")
    .map((token) => token.trim())
    .filter(Boolean);
  let level = 0;

  return tokens
    .map((token) => {
      const isClosingTag = /^<\//.test(token);
      const isOpeningTag =
        /^<[^!?/][^>]*[^/]?>$/.test(token) && !/^<[^>]+><\/[^>]+>$/.test(token);

      if (isClosingTag) {
        level = Math.max(level - 1, 0);
      }

      const line = `${"  ".repeat(level)}${token}`;

      if (isOpeningTag) {
        level += 1;
      }

      return line;
    })
    .join("\n");
}

export default function XmlFormatterTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const format = () => {
    try {
      setOutput(formatXmlString(minifyXml(input)));
      setError("");
    } catch (caught) {
      setOutput("");
      setError(caught instanceof Error ? caught.message : "Invalid XML.");
    }
  };

  const minify = () => {
    try {
      setOutput(minifyXml(input));
      setError("");
    } catch (caught) {
      setOutput("");
      setError(caught instanceof Error ? caught.message : "Invalid XML.");
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
        placeholder={"<root><item id=\"1\">Value</item></root>"}
        rows={9}
      />

      <ToolButtonRow>
        <ToolButton onClick={format}>Format</ToolButton>
        <ToolButton onClick={minify} variant="secondary">
          Minify
        </ToolButton>
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
          "Formatted or minified XML will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
