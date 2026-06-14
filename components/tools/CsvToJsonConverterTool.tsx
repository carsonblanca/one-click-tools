"use client";

import { useEffect, useState } from "react";
import {
  getProcessingTimeBucket,
  trackProcessError,
  trackProcessStart,
  trackProcessSuccess,
  trackResultCopy,
  trackToolStart,
  trackToolView,
  type ToolEventParams,
} from "@/lib/analytics/tool-events";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolResultBox,
  ToolTextarea,
} from "../tool-ui/ToolUI";

const analyticsBase = {
  tool_slug: "csv-to-json-converter",
  tool_category: "Developer",
  tool_type: "file_conversion",
  locale: "en",
} satisfies ToolEventParams;

function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const nextCharacter = input[index + 1];

    if (inQuotes) {
      if (character === "\"" && nextCharacter === "\"") {
        field += "\"";
        index += 1;
      } else if (character === "\"") {
        inQuotes = false;
      } else {
        field += character;
      }

      continue;
    }

    if (character === "\"") {
      inQuotes = true;
      continue;
    }

    if (character === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (character === "\n") {
      row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += character;
  }

  if (inQuotes) {
    throw new Error("CSV has an unterminated quoted field.");
  }

  row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
  rows.push(row);

  return rows.filter((csvRow) =>
    csvRow.some((cell) => cell.trim().length > 0),
  );
}

function normalizeHeaders(headers: string[]) {
  const counts = new Map<string, number>();

  return headers.map((header, index) => {
    const base = header.trim() || `column_${index + 1}`;
    const count = counts.get(base) || 0;
    counts.set(base, count + 1);

    return count === 0 ? base : `${base}_${count + 1}`;
  });
}

function csvToJson(input: string) {
  const rows = parseCsv(input);

  if (rows.length === 0) {
    throw new Error("Paste CSV with a header row first.");
  }

  const headers = normalizeHeaders(rows[0]);

  if (headers.length === 0) {
    throw new Error("The first row must contain headers.");
  }

  const dataRows = rows.slice(1);
  const records = dataRows.map((csvRow) =>
    headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = csvRow[index] ?? "";
      return record;
    }, {}),
  );

  return JSON.stringify(records, null, 2);
}

export default function CsvToJsonConverterTool() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    trackToolView(analyticsBase);
  }, []);

  const convert = () => {
    const startedAt = performance.now();
    trackToolStart(analyticsBase);
    trackProcessStart({
      ...analyticsBase,
      input_type: "csv",
      output_type: "json",
      source_context: "convert",
    });

    try {
      setOutput(csvToJson(input));
      setError("");
      trackProcessSuccess({
        ...analyticsBase,
        input_type: "csv",
        output_type: "json",
        result_type: "converted_json",
        source_context: "convert",
        processing_time_bucket: getProcessingTimeBucket(performance.now() - startedAt),
      });
    } catch (caught) {
      setOutput("");
      setError(caught instanceof Error ? caught.message : "Invalid CSV.");
      trackProcessError({
        ...analyticsBase,
        error_code: "parse_error",
        source_context: "convert",
        processing_time_bucket: getProcessingTimeBucket(performance.now() - startedAt),
      });
    }
  };

  const copy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      trackResultCopy({
        ...analyticsBase,
        output_type: "json",
        result_type: "converted_json",
      });
    } catch {
      trackProcessError({
        ...analyticsBase,
        error_code: "clipboard_error",
        source_context: "copy_json",
      });
    }
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
        placeholder={"name,email\nAda,ada@example.com\nGrace,\"grace,team@example.com\""}
        rows={8}
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
