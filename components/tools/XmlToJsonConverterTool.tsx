"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

type XmlJsonValue = string | { [key: string]: XmlJsonValue | XmlJsonValue[] };
type XmlJsonObject = { [key: string]: XmlJsonValue | XmlJsonValue[] };

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

function addValue(target: XmlJsonObject, key: string, value: XmlJsonValue) {
  const current = target[key];

  if (Array.isArray(current)) {
    current.push(value);
  } else if (current !== undefined) {
    target[key] = [current, value];
  } else {
    target[key] = value;
  }
}

function elementToJson(element: Element): XmlJsonValue {
  const result: XmlJsonObject = {};
  const attributes = Array.from(element.attributes).reduce<XmlJsonObject>(
    (acc, attribute) => {
      acc[attribute.name] = attribute.value;
      return acc;
    },
    {},
  );
  const elementChildren = Array.from(element.children);
  const text = Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent?.trim() || "")
    .filter(Boolean)
    .join(" ");

  if (Object.keys(attributes).length > 0) {
    result["@attributes"] = attributes;
  }

  elementChildren.forEach((child) => {
    addValue(result, child.nodeName, elementToJson(child));
  });

  if (text) {
    if (Object.keys(result).length === 0) {
      return text;
    }

    result["#text"] = text;
  }

  return result;
}

function xmlToJson(input: string) {
  const document = parseXml(input);
  const root = document.documentElement;

  return JSON.stringify({ [root.nodeName]: elementToJson(root) }, null, 2);
}

export default function XmlToJsonConverterTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const convert = () => {
    try {
      setOutput(xmlToJson(input));
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
        placeholder={"<book id=\"1\"><title>Example</title></book>"}
        rows={9}
      />

      <ToolButtonRow>
        <ToolButton onClick={convert}>Convert</ToolButton>
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
          "Converted JSON will appear here."
        )}
      </ToolResultBox>
    </ToolPanel>
  );
}
