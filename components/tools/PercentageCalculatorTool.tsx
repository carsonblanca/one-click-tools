"use client";

import { useEffect, useState } from "react";
import {
  getProcessingTimeBucket,
  trackModeChange,
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
  ToolInput,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
  ToolStatCard,
} from "../tool-ui/ToolUI";

type PercentageMode = "percentOf" | "whatPercent" | "change";

const analyticsBase = {
  tool_slug: "percentage-calculator",
  tool_category: "Calculator",
  tool_type: "calculator",
  locale: "en",
} satisfies ToolEventParams;

const modes: Array<{
  key: PercentageMode;
  label: string;
  firstLabel: string;
  secondLabel: string;
}> = [
  {
    key: "percentOf",
    label: "What is X% of Y?",
    firstLabel: "X percent",
    secondLabel: "Y value",
  },
  {
    key: "whatPercent",
    label: "X is what percent of Y?",
    firstLabel: "X value",
    secondLabel: "Y value",
  },
  {
    key: "change",
    label: "Increase/decrease from X to Y",
    firstLabel: "Start value",
    secondLabel: "End value",
  },
];

function parseNumber(value: string, label: string) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`Enter a valid ${label}.`);
  }

  return numberValue;
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 6,
  });
}

function calculatePercentage(mode: PercentageMode, first: number, second: number) {
  if (mode === "percentOf") {
    return `${formatNumber((first / 100) * second)}`;
  }

  if (mode === "whatPercent") {
    if (second === 0) throw new Error("Y value cannot be zero.");
    return `${formatNumber((first / second) * 100)}%`;
  }

  if (first === 0) throw new Error("Start value cannot be zero.");

  const change = ((second - first) / Math.abs(first)) * 100;
  return `${formatNumber(change)}% ${change >= 0 ? "increase" : "decrease"}`;
}

export default function PercentageCalculatorTool() {
  const [mode, setMode] = useState<PercentageMode>("percentOf");
  const [firstValue, setFirstValue] = useState("");
  const [secondValue, setSecondValue] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const activeMode = modes.find((item) => item.key === mode) || modes[0];

  useEffect(() => {
    trackToolView(analyticsBase);
  }, []);

  const calculate = () => {
    const startedAt = performance.now();
    trackToolStart(analyticsBase);
    trackProcessStart({
      ...analyticsBase,
      input_type: "number",
      output_type: "number",
      mode,
      source_context: "calculate",
    });

    try {
      setResult(
        calculatePercentage(
          mode,
          parseNumber(firstValue, activeMode.firstLabel.toLowerCase()),
          parseNumber(secondValue, activeMode.secondLabel.toLowerCase()),
        ),
      );
      setError("");
      trackProcessSuccess({
        ...analyticsBase,
        input_type: "number",
        output_type: "number",
        result_type: "percentage_result",
        mode,
        source_context: "calculate",
        processing_time_bucket: getProcessingTimeBucket(performance.now() - startedAt),
      });
    } catch (caught) {
      setResult("");
      setError(caught instanceof Error ? caught.message : "Invalid numbers.");
      trackProcessError({
        ...analyticsBase,
        error_code: "invalid_input",
        mode,
        source_context: "calculate",
        processing_time_bucket: getProcessingTimeBucket(performance.now() - startedAt),
      });
    }
  };

  const clear = () => {
    setFirstValue("");
    setSecondValue("");
    setResult("");
    setError("");
  };

  return (
    <ToolPanel>
      <ToolLabel>Calculation type</ToolLabel>
      <ToolButtonRow>
        {modes.map((item) => (
          <ToolButton
            key={item.key}
            onClick={() => {
              trackToolStart(analyticsBase);
              trackModeChange({
                ...analyticsBase,
                mode: item.key,
                previous_mode: mode,
                source_context: "calculation_type",
              });
              setMode(item.key);
              setResult("");
              setError("");
            }}
            variant={mode === item.key ? "primary" : "secondary"}
          >
            {item.label}
          </ToolButton>
        ))}
      </ToolButtonRow>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div>
          <ToolLabel>{activeMode.firstLabel}</ToolLabel>
          <ToolInput value={firstValue} onChange={setFirstValue} type="number" />
        </div>

        <div>
          <ToolLabel>{activeMode.secondLabel}</ToolLabel>
          <ToolInput value={secondValue} onChange={setSecondValue} type="number" />
        </div>
      </div>

      <ToolButtonRow>
        <ToolButton onClick={calculate}>Calculate</ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      {error ? (
        <ToolResultBox>{error}</ToolResultBox>
      ) : result ? (
        <div className="mt-5">
          <ToolStatCard label="Result" value={result} />
        </div>
      ) : (
        <ToolResultBox muted>Percentage result will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
