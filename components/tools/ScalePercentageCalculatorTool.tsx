"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolInput,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
  ToolStatCard,
} from "../tool-ui/ToolUI";

type ScaleResult = {
  uniform: number | null;
  x: number | null;
  y: number | null;
  z: number | null;
};

function parseOptionalPositive(value: string, label: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Enter a valid ${label} greater than zero.`);
  }

  return parsed;
}

function scalePercent(original: number | null, target: number | null) {
  if (original === null || target === null) {
    return null;
  }

  return (target / original) * 100;
}

function formatPercent(value: number | null) {
  return value === null ? "Not provided" : `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
}

export default function ScalePercentageCalculatorTool() {
  const [originalSize, setOriginalSize] = useState("");
  const [targetSize, setTargetSize] = useState("");
  const [originalX, setOriginalX] = useState("");
  const [originalY, setOriginalY] = useState("");
  const [originalZ, setOriginalZ] = useState("");
  const [targetX, setTargetX] = useState("");
  const [targetY, setTargetY] = useState("");
  const [targetZ, setTargetZ] = useState("");
  const [result, setResult] = useState<ScaleResult | null>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    try {
      const uniform = scalePercent(
        parseOptionalPositive(originalSize, "original size"),
        parseOptionalPositive(targetSize, "target size"),
      );
      const x = scalePercent(
        parseOptionalPositive(originalX, "original X"),
        parseOptionalPositive(targetX, "target X"),
      );
      const y = scalePercent(
        parseOptionalPositive(originalY, "original Y"),
        parseOptionalPositive(targetY, "target Y"),
      );
      const z = scalePercent(
        parseOptionalPositive(originalZ, "original Z"),
        parseOptionalPositive(targetZ, "target Z"),
      );

      if (uniform === null && x === null && y === null && z === null) {
        throw new Error("Enter either original/target size or at least one X/Y/Z pair.");
      }

      setResult({ uniform, x, y, z });
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Could not calculate scale percentage.");
    }
  };

  const clear = () => {
    setOriginalSize("");
    setTargetSize("");
    setOriginalX("");
    setOriginalY("");
    setOriginalZ("");
    setTargetX("");
    setTargetY("");
    setTargetZ("");
    setResult(null);
    setError("");
  };

  return (
    <ToolPanel>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <ToolLabel>Original size</ToolLabel>
          <ToolInput value={originalSize} onChange={setOriginalSize} type="number" placeholder="80" />
        </div>
        <div>
          <ToolLabel>Target size</ToolLabel>
          <ToolInput value={targetSize} onChange={setTargetSize} type="number" placeholder="120" />
        </div>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-3">
        <div>
          <ToolLabel>Original X optional</ToolLabel>
          <ToolInput value={originalX} onChange={setOriginalX} type="number" placeholder="80" />
        </div>
        <div>
          <ToolLabel>Original Y optional</ToolLabel>
          <ToolInput value={originalY} onChange={setOriginalY} type="number" placeholder="40" />
        </div>
        <div>
          <ToolLabel>Original Z optional</ToolLabel>
          <ToolInput value={originalZ} onChange={setOriginalZ} type="number" placeholder="25" />
        </div>
        <div>
          <ToolLabel>Target X optional</ToolLabel>
          <ToolInput value={targetX} onChange={setTargetX} type="number" placeholder="120" />
        </div>
        <div>
          <ToolLabel>Target Y optional</ToolLabel>
          <ToolInput value={targetY} onChange={setTargetY} type="number" placeholder="60" />
        </div>
        <div>
          <ToolLabel>Target Z optional</ToolLabel>
          <ToolInput value={targetZ} onChange={setTargetZ} type="number" placeholder="37.5" />
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
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <ToolStatCard label="Uniform scale" value={formatPercent(result.uniform)} />
            <ToolStatCard label="X scale" value={formatPercent(result.x)} />
            <ToolStatCard label="Y scale" value={formatPercent(result.y)} />
            <ToolStatCard label="Z scale" value={formatPercent(result.z)} />
          </div>
          <ToolResultBox muted>
            Most slicers treat 100% as the original model size. Values above 100% enlarge the model; values below 100% shrink it.
          </ToolResultBox>
        </>
      ) : (
        <ToolResultBox muted>Scale percentages will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
