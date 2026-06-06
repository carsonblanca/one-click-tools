"use client";

import { useState } from "react";
import { useTheme } from "../ThemeProvider";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

type YamlValue =
  | null
  | string
  | number
  | boolean
  | YamlValue[]
  | { [key: string]: YamlValue };

type YamlLine = {
  indent: number;
  number: number;
  text: string;
};

function readLines(input: string) {
  return input
    .split(/\r?\n/)
    .map<YamlLine | null>((line, index) => {
      if (/^\s*$/.test(line) || /^\s*#/.test(line)) return null;

      const indentMatch = line.match(/^\s*/);
      const indentText = indentMatch?.[0] || "";

      if (indentText.includes("\t")) {
        throw new Error(`Line ${index + 1}: tabs are not supported.`);
      }

      return {
        indent: indentText.length,
        number: index + 1,
        text: line.trim(),
      };
    })
    .filter((line): line is YamlLine => line !== null);
}

function parseScalar(value: string): YamlValue {
  const trimmed = value.trim();

  if (trimmed === "null" || trimmed === "~") return null;
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "[]") return [];
  if (trimmed === "{}") return {};

  if (
    /^[-+]?(?:\d+|\d*\.\d+)(?:e[-+]?\d+)?$/i.test(trimmed) &&
    trimmed !== ""
  ) {
    return Number(trimmed);
  }

  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    const inner = trimmed.slice(1, -1);

    if (trimmed.startsWith("'")) {
      return inner.replace(/''/g, "'");
    }

    return inner
      .replace(/\\"/g, "\"")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\\\/g, "\\");
  }

  return trimmed;
}

function splitKeyValue(text: string, lineNumber: number) {
  const colonIndex = text.indexOf(":");

  if (colonIndex <= 0) {
    throw new Error(`Line ${lineNumber}: expected a key/value pair.`);
  }

  const key = text.slice(0, colonIndex).trim();
  const value = text.slice(colonIndex + 1).trim();

  if (!key) {
    throw new Error(`Line ${lineNumber}: key cannot be empty.`);
  }

  return { key, value };
}

function looksLikeInlinePair(text: string) {
  return /^[^"'[\]{}#,\s][^:]*:(?:\s|$)/.test(text);
}

function parseBlock(
  lines: YamlLine[],
  index: number,
  indent: number,
): [YamlValue, number] {
  const line = lines[index];

  if (!line || line.indent !== indent) {
    throw new Error(`Line ${line?.number || index + 1}: unexpected indentation.`);
  }

  return line.text.startsWith("- ")
    ? parseArray(lines, index, indent)
    : parseObject(lines, index, indent);
}

function parseObject(
  lines: YamlLine[],
  index: number,
  indent: number,
): [{ [key: string]: YamlValue }, number] {
  const result: { [key: string]: YamlValue } = {};
  let cursor = index;

  while (cursor < lines.length) {
    const line = lines[cursor];

    if (line.indent < indent) break;
    if (line.indent > indent) {
      throw new Error(`Line ${line.number}: unexpected indentation.`);
    }
    if (line.text.startsWith("- ")) break;

    const { key, value } = splitKeyValue(line.text, line.number);
    cursor += 1;

    if (value) {
      result[key] = parseScalar(value);
      continue;
    }

    if (cursor < lines.length && lines[cursor].indent > indent) {
      const [nestedValue, nextCursor] = parseBlock(
        lines,
        cursor,
        lines[cursor].indent,
      );
      result[key] = nestedValue;
      cursor = nextCursor;
    } else {
      result[key] = null;
    }
  }

  return [result, cursor];
}

function parseArray(
  lines: YamlLine[],
  index: number,
  indent: number,
): [YamlValue[], number] {
  const result: YamlValue[] = [];
  let cursor = index;

  while (cursor < lines.length) {
    const line = lines[cursor];

    if (line.indent < indent) break;
    if (line.indent > indent) {
      throw new Error(`Line ${line.number}: unexpected indentation.`);
    }
    if (!line.text.startsWith("- ")) break;

    const itemText = line.text.slice(2).trim();
    cursor += 1;

    if (!itemText) {
      if (cursor < lines.length && lines[cursor].indent > indent) {
        const [nestedValue, nextCursor] = parseBlock(
          lines,
          cursor,
          lines[cursor].indent,
        );
        result.push(nestedValue);
        cursor = nextCursor;
      } else {
        result.push(null);
      }

      continue;
    }

    if (looksLikeInlinePair(itemText)) {
      const item: { [key: string]: YamlValue } = {};
      const { key, value } = splitKeyValue(itemText, line.number);

      if (value) {
        item[key] = parseScalar(value);
      } else if (cursor < lines.length && lines[cursor].indent > indent) {
        const [nestedValue, nextCursor] = parseBlock(
          lines,
          cursor,
          lines[cursor].indent,
        );
        item[key] = nestedValue;
        cursor = nextCursor;
      } else {
        item[key] = null;
      }

      if (cursor < lines.length && lines[cursor].indent > indent) {
        const [extraFields, nextCursor] = parseObject(
          lines,
          cursor,
          lines[cursor].indent,
        );
        Object.assign(item, extraFields);
        cursor = nextCursor;
      }

      result.push(item);
      continue;
    }

    result.push(parseScalar(itemText));

    if (cursor < lines.length && lines[cursor].indent > indent) {
      throw new Error(`Line ${lines[cursor].number}: unexpected indentation.`);
    }
  }

  return [result, cursor];
}

function parseYaml(input: string) {
  const lines = readLines(input);

  if (lines.length === 0) {
    return {};
  }

  const [value, cursor] = parseBlock(lines, 0, lines[0].indent);

  if (cursor !== lines.length) {
    throw new Error(`Line ${lines[cursor].number}: could not parse this line.`);
  }

  return value;
}

export default function YamlToJsonConverterTool() {
  const { isDark } = useTheme();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  const convert = () => {
    try {
      setOutput(JSON.stringify(parseYaml(input), null, 2));
      setError("");
    } catch (caught) {
      setOutput("");
      setError(caught instanceof Error ? caught.message : "Invalid YAML.");
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
        placeholder={"name: Ada\nskills:\n  - math\n  - programming"}
        rows={8}
      />

      <div className={isDark ? "mt-3 text-sm text-white/45" : "mt-3 text-sm text-[#6B665D]"}>
        Supports simple key/value pairs, nested objects, and arrays. Complex
        YAML features may not be supported.
      </div>

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
