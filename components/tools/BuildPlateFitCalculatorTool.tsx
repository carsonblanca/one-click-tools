"use client";

import { useEffect, useState } from "react";
import {
  getProcessingTimeBucket,
  trackParameterChange,
  trackProcessError,
  trackProcessStart,
  trackProcessSuccess,
  trackToolStart,
  trackToolView,
  type ToolEventParams,
  type ToolLocale,
} from "@/lib/analytics/tool-events";
import {
  ToolButton,
  ToolButtonRow,
  ToolCheckbox,
  ToolInput,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
  ToolStatCard,
} from "../tool-ui/ToolUI";

const analyticsBase = {
  tool_slug: "build-plate-fit-calculator",
  tool_category: "3D Printing",
  tool_type: "professional_workflow",
} satisfies Pick<ToolEventParams, "tool_slug" | "tool_category" | "tool_type">;

type PrinterPreset = {
  name: string;
  x: number;
  y: number;
  z: number;
};

type FitResult = {
  fitsNormally: boolean;
  fitsRotated: boolean;
  maxScale: number;
  suggestedScale: number;
};

const printerPresets: PrinterPreset[] = [
  { name: "Bambu Lab A1 mini", x: 180, y: 180, z: 180 },
  { name: "Bambu Lab A1", x: 256, y: 256, z: 256 },
  { name: "Bambu Lab P1S/X1C", x: 256, y: 256, z: 256 },
  { name: "Bambu Lab H2D/H2S", x: 350, y: 320, z: 325 },
  { name: "Custom", x: 300, y: 300, z: 300 },
];

function parsePositive(value: string, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Enter a valid ${label} greater than zero.`);
  }

  return parsed;
}

function parseMargin(value: string) {
  if (!value.trim()) {
    return 0;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error("Enter a valid clearance margin of zero or more.");
  }

  return parsed;
}

function formatPercent(value: number) {
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`;
}

function getAnalyticsLocale(locale: string): ToolLocale {
  if (locale === "zh-cn" || locale === "zh-tw") {
    return locale;
  }

  return "en";
}

export default function BuildPlateFitCalculatorTool({ locale = "en" }: { locale?: string }) {
  const [modelX, setModelX] = useState("");
  const [modelY, setModelY] = useState("");
  const [modelZ, setModelZ] = useState("");
  const [buildX, setBuildX] = useState("256");
  const [buildY, setBuildY] = useState("256");
  const [buildZ, setBuildZ] = useState("256");
  const [allowRotation, setAllowRotation] = useState(true);
  const [clearanceMargin, setClearanceMargin] = useState("");
  const [result, setResult] = useState<FitResult | null>(null);
  const [error, setError] = useState("");
  const toolAnalytics = {
    ...analyticsBase,
    locale: getAnalyticsLocale(locale),
  } satisfies ToolEventParams;

  useEffect(() => {
    trackToolView(toolAnalytics);
  }, [toolAnalytics]);

  const applyPreset = (preset: PrinterPreset) => {
    trackToolStart(toolAnalytics);
    trackParameterChange({
      ...toolAnalytics,
      parameter_name: "printer_preset",
      source_context: "common_printer_presets",
    });
    setBuildX(String(preset.x));
    setBuildY(String(preset.y));
    setBuildZ(String(preset.z));
    setResult(null);
    setError("");
  };

  const calculate = () => {
    const startedAt = performance.now();
    trackToolStart(toolAnalytics);
    trackProcessStart({
      ...toolAnalytics,
      input_type: "dimensions",
      output_type: "fit_result",
      source_context: "calculate",
    });

    try {
      const x = parsePositive(modelX, "model X dimension");
      const y = parsePositive(modelY, "model Y dimension");
      const z = parsePositive(modelZ, "model Z dimension");
      const margin = parseMargin(clearanceMargin);
      const availableX = parsePositive(buildX, "build volume X") - margin * 2;
      const availableY = parsePositive(buildY, "build volume Y") - margin * 2;
      const availableZ = parsePositive(buildZ, "build volume Z") - margin * 2;

      if (availableX <= 0 || availableY <= 0 || availableZ <= 0) {
        throw new Error("Clearance margin is too large for the selected build volume.");
      }

      const fitsNormally = x <= availableX && y <= availableY && z <= availableZ;
      const fitsRotated = allowRotation && y <= availableX && x <= availableY && z <= availableZ;
      const normalScale = Math.min(availableX / x, availableY / y, availableZ / z) * 100;
      const rotatedScale = allowRotation ? Math.min(availableX / y, availableY / x, availableZ / z) * 100 : 0;
      const maxScale = Math.max(normalScale, rotatedScale);

      setResult({
        fitsNormally,
        fitsRotated,
        maxScale,
        suggestedScale: Math.min(100, maxScale),
      });
      setError("");
      trackProcessSuccess({
        ...toolAnalytics,
        input_type: "dimensions",
        output_type: "fit_result",
        result_type: "build_plate_fit",
        source_context: "calculate",
        processing_time_bucket: getProcessingTimeBucket(performance.now() - startedAt),
      });
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Could not calculate build plate fit.");
      trackProcessError({
        ...toolAnalytics,
        error_code: "invalid_input",
        source_context: "calculate",
        processing_time_bucket: getProcessingTimeBucket(performance.now() - startedAt),
      });
    }
  };

  const clear = () => {
    setModelX("");
    setModelY("");
    setModelZ("");
    setBuildX("256");
    setBuildY("256");
    setBuildZ("256");
    setAllowRotation(true);
    setClearanceMargin("");
    setResult(null);
    setError("");
  };

  return (
    <ToolPanel>
      <div className="grid gap-5 md:grid-cols-3">
        <div>
          <ToolLabel>Model X (mm)</ToolLabel>
          <ToolInput value={modelX} onChange={setModelX} type="number" placeholder="120" />
        </div>
        <div>
          <ToolLabel>Model Y (mm)</ToolLabel>
          <ToolInput value={modelY} onChange={setModelY} type="number" placeholder="90" />
        </div>
        <div>
          <ToolLabel>Model Z (mm)</ToolLabel>
          <ToolInput value={modelZ} onChange={setModelZ} type="number" placeholder="80" />
        </div>
        <div>
          <ToolLabel>Build volume X (mm)</ToolLabel>
          <ToolInput value={buildX} onChange={setBuildX} type="number" placeholder="256" />
        </div>
        <div>
          <ToolLabel>Build volume Y (mm)</ToolLabel>
          <ToolInput value={buildY} onChange={setBuildY} type="number" placeholder="256" />
        </div>
        <div>
          <ToolLabel>Build volume Z (mm)</ToolLabel>
          <ToolInput value={buildZ} onChange={setBuildZ} type="number" placeholder="256" />
        </div>
        <div>
          <ToolLabel>Clearance margin optional (mm)</ToolLabel>
          <ToolInput value={clearanceMargin} onChange={setClearanceMargin} type="number" placeholder="5" />
        </div>
      </div>

      <div className="mt-5">
        <ToolLabel>Common printer presets</ToolLabel>
        <ToolButtonRow>
          {printerPresets.map((preset) => (
            <ToolButton key={preset.name} onClick={() => applyPreset(preset)} variant="secondary">
              {preset.name}
            </ToolButton>
          ))}
        </ToolButtonRow>
      </div>

      <div className="mt-5">
        <ToolCheckbox
          checked={allowRotation}
          onChange={(checked) => {
            trackToolStart(toolAnalytics);
            trackParameterChange({
              ...toolAnalytics,
              parameter_name: "allow_rotation",
              mode: checked ? "enabled" : "disabled",
              source_context: "fit_options",
            });
            setAllowRotation(checked);
          }}
        >
          Allow XY rotation
        </ToolCheckbox>
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
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <ToolStatCard label="Fits normally" value={result.fitsNormally ? "Yes" : "No"} />
            <ToolStatCard label="Fits if rotated" value={result.fitsRotated ? "Yes" : "No"} />
            <ToolStatCard label="Max uniform scale" value={formatPercent(result.maxScale)} />
            <ToolStatCard label="Suggested scale" value={formatPercent(result.suggestedScale)} />
          </div>
          <ToolResultBox muted>
            This estimates bounding-box fit. Real placement may depend on brim, supports, orientation, purge areas, printer keep-out zones, and slicer clearance.
          </ToolResultBox>
        </>
      ) : (
        <ToolResultBox muted>Build plate fit results will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
