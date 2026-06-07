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

type DateDifference = {
  days: number;
  weeks: string;
  months: string;
  years: string;
  reversed: boolean;
};

function parseDateInput(value: string, label: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error(`Enter a valid ${label}.`);
  }

  return new Date(year, month - 1, day);
}

function calculateDifference(startDate: Date, endDate: Date): DateDifference {
  const reversed = startDate > endDate;
  const first = reversed ? endDate : startDate;
  const second = reversed ? startDate : endDate;
  const days = Math.round((second.getTime() - first.getTime()) / 86400000);

  return {
    days,
    weeks: (days / 7).toFixed(2),
    months: (days / 30.436875).toFixed(2),
    years: (days / 365.2425).toFixed(2),
    reversed,
  };
}

export default function DateDifferenceCalculatorTool() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [result, setResult] = useState<DateDifference | null>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    try {
      setResult(
        calculateDifference(
          parseDateInput(startDate, "start date"),
          parseDateInput(endDate, "end date"),
        ),
      );
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Invalid dates.");
    }
  };

  const clear = () => {
    setStartDate("");
    setEndDate("");
    setResult(null);
    setError("");
  };

  return (
    <ToolPanel>
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <ToolLabel>Start date</ToolLabel>
          <ToolInput value={startDate} onChange={setStartDate} type="date" />
        </div>

        <div>
          <ToolLabel>End date</ToolLabel>
          <ToolInput value={endDate} onChange={setEndDate} type="date" />
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
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ToolStatCard label="Days" value={result.days} />
            <ToolStatCard label="Weeks" value={result.weeks} />
            <ToolStatCard label="Months" value={result.months} />
            <ToolStatCard label="Years" value={result.years} />
          </div>

          <ToolResultBox muted={!result.reversed}>
            {result.reversed
              ? "Dates were entered in reverse order, so the absolute difference is shown."
              : "Difference calculated from start date to end date."}
          </ToolResultBox>
        </>
      ) : (
        <ToolResultBox muted>Date difference will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
