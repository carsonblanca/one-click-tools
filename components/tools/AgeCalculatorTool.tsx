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

type AgeResult = {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  nextBirthdayDays: number;
};

function parseDateInput(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    throw new Error("Enter a valid birth date.");
  }

  return new Date(year, month - 1, day);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysInPreviousMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 0).getDate();
}

function calculateAge(birthDate: Date): AgeResult {
  const today = startOfDay(new Date());

  if (birthDate > today) {
    throw new Error("Birth date cannot be in the future.");
  }

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  if (days < 0) {
    months -= 1;
    days += daysInPreviousMonth(today);
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const totalDays = Math.floor(
    (today.getTime() - startOfDay(birthDate).getTime()) / 86400000,
  );
  let nextBirthday = new Date(
    today.getFullYear(),
    birthDate.getMonth(),
    birthDate.getDate(),
  );

  if (nextBirthday < today) {
    nextBirthday = new Date(
      today.getFullYear() + 1,
      birthDate.getMonth(),
      birthDate.getDate(),
    );
  }

  return {
    years,
    months,
    days,
    totalDays,
    nextBirthdayDays: Math.ceil(
      (nextBirthday.getTime() - today.getTime()) / 86400000,
    ),
  };
}

export default function AgeCalculatorTool() {
  const [birthDate, setBirthDate] = useState("");
  const [result, setResult] = useState<AgeResult | null>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    try {
      setResult(calculateAge(parseDateInput(birthDate)));
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Invalid date.");
    }
  };

  const clear = () => {
    setBirthDate("");
    setResult(null);
    setError("");
  };

  return (
    <ToolPanel>
      <div>
        <ToolLabel>Birth date</ToolLabel>
        <ToolInput value={birthDate} onChange={setBirthDate} type="date" />
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
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <ToolStatCard label="Years" value={result.years} />
            <ToolStatCard label="Months" value={result.months} />
            <ToolStatCard label="Days" value={result.days} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ToolStatCard label="Total days lived" value={result.totalDays} />
            <ToolStatCard
              label="Days until next birthday"
              value={result.nextBirthdayDays}
            />
          </div>
        </>
      ) : (
        <ToolResultBox muted>Age details will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
