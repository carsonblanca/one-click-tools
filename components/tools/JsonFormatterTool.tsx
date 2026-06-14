"use client";

import { useEffect, useState } from "react";
import {
  getProcessingTimeBucket,
  trackProcessError,
  trackProcessStart,
  trackProcessSuccess,
  trackToolStart,
  trackToolView,
  type ToolEventParams,
} from "@/lib/analytics/tool-events";
import {
  ToolButton,
  ToolButtonRow,
  ToolPanel,
  ToolTextarea,
} from "../tool-ui/ToolUI";

const analyticsBase = {
  tool_slug: "json-formatter",
  tool_category: "Developer",
  tool_type: "developer_validation",
  locale: "en",
} satisfies ToolEventParams;

export default function JsonFormatterTool() {
  const [jsonText, setJsonText] = useState("");

  useEffect(() => {
    trackToolView(analyticsBase);
  }, []);

  const formatJson = () => {
    const startedAt = performance.now();
    trackToolStart(analyticsBase);
    trackProcessStart({
      ...analyticsBase,
      input_type: "json",
      output_type: "json",
      source_context: "format",
    });

    try {
      const formatted = JSON.stringify(JSON.parse(jsonText), null, 2);
      setJsonText(formatted);
      trackProcessSuccess({
        ...analyticsBase,
        input_type: "json",
        output_type: "json",
        result_type: "formatted_json",
        source_context: "format",
        processing_time_bucket: getProcessingTimeBucket(performance.now() - startedAt),
      });
    } catch {
      trackProcessError({
        ...analyticsBase,
        error_code: "parse_error",
        source_context: "format",
        processing_time_bucket: getProcessingTimeBucket(performance.now() - startedAt),
      });
      alert("Invalid JSON.");
    }
  };

  const minifyJson = () => {
    const startedAt = performance.now();
    trackToolStart(analyticsBase);
    trackProcessStart({
      ...analyticsBase,
      input_type: "json",
      output_type: "json",
      source_context: "minify",
    });

    try {
      const minified = JSON.stringify(JSON.parse(jsonText));
      setJsonText(minified);
      trackProcessSuccess({
        ...analyticsBase,
        input_type: "json",
        output_type: "json",
        result_type: "minified_json",
        source_context: "minify",
        processing_time_bucket: getProcessingTimeBucket(performance.now() - startedAt),
      });
    } catch {
      trackProcessError({
        ...analyticsBase,
        error_code: "parse_error",
        source_context: "minify",
        processing_time_bucket: getProcessingTimeBucket(performance.now() - startedAt),
      });
      alert("Invalid JSON.");
    }
  };

  return (
    <ToolPanel>
      <ToolTextarea
        value={jsonText}
        onChange={setJsonText}
        placeholder="Paste JSON here..."
        rows={12}
      />

      <ToolButtonRow>
        <ToolButton onClick={formatJson}>Format JSON</ToolButton>
        <ToolButton onClick={minifyJson} variant="secondary">
          Minify
        </ToolButton>
        <ToolButton onClick={() => setJsonText("")} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>
    </ToolPanel>
  );
}
