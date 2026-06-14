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
  ToolStatCard,
  ToolTextarea,
} from "../tool-ui/ToolUI";

const analyticsBase = {
  tool_slug: "json-validator",
  tool_category: "Developer",
  tool_type: "developer_validation",
  locale: "en",
} satisfies ToolEventParams;

export default function JsonValidatorTool() {
  const [input, setInput] = useState("");
  const [formatted, setFormatted] = useState("");
  const [status, setStatus] = useState("Not checked");
  const [error, setError] = useState("");

  useEffect(() => {
    trackToolView(analyticsBase);
  }, []);

  const validate = () => {
    const startedAt = performance.now();
    trackToolStart(analyticsBase);
    trackProcessStart({
      ...analyticsBase,
      input_type: "json",
      output_type: "json",
      source_context: "validate",
    });

    try {
      const parsed: unknown = JSON.parse(input);
      setFormatted(JSON.stringify(parsed, null, 2));
      setStatus("Valid");
      setError("");
      trackProcessSuccess({
        ...analyticsBase,
        input_type: "json",
        output_type: "json",
        result_type: "validated_json",
        source_context: "validate",
        processing_time_bucket: getProcessingTimeBucket(performance.now() - startedAt),
      });
    } catch (caught) {
      setFormatted("");
      setStatus("Invalid");
      setError(caught instanceof Error ? caught.message : "Invalid JSON.");
      trackProcessError({
        ...analyticsBase,
        error_code: "parse_error",
        source_context: "validate",
        processing_time_bucket: getProcessingTimeBucket(performance.now() - startedAt),
      });
    }
  };

  const copyFormatted = async () => {
    if (!formatted) return;
    try {
      await navigator.clipboard.writeText(formatted);
      trackResultCopy({
        ...analyticsBase,
        output_type: "json",
        result_type: "formatted_json",
      });
    } catch {
      trackProcessError({
        ...analyticsBase,
        error_code: "clipboard_error",
        source_context: "copy_formatted",
      });
    }
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
