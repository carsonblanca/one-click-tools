"use client";

import { useState } from "react";
import { useTheme } from "../ThemeProvider";
import {
  ToolButton,
  ToolButtonRow,
  ToolInput,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
  ToolStatCard,
} from "../tool-ui/ToolUI";

const TIME_ZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

type ConversionResult = {
  source: string;
  target: string;
  utc: string;
};

function parseDateTime(value: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );

  if (!match) {
    throw new Error("Enter a valid date and time.");
  }

  const [, year, month, day, hour, minute, second = "0"] = match;

  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
  };
}

function getTimeZoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour === 24 ? 0 : values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function getTimeZoneOffset(date: Date, timeZone: string) {
  const parts = getTimeZoneParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return asUtc - date.getTime();
}

function zonedTimeToUtc(value: string, timeZone: string) {
  const parts = parseDateTime(value);
  const guess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  const firstOffset = getTimeZoneOffset(new Date(guess), timeZone);
  const firstUtc = guess - firstOffset;
  const secondOffset = getTimeZoneOffset(new Date(firstUtc), timeZone);

  return new Date(guess - secondOffset);
}

function formatInTimeZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(date);
}

function TimeZoneSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { isDark } = useTheme();

  return (
    <div>
      <ToolLabel>{label}</ToolLabel>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-2xl border px-4 py-4 outline-none transition ${
          isDark
            ? "border-white/10 bg-[#141419] text-white focus:border-lime-300/40"
            : "border-[#E5DED0] bg-[#F5F2EA] text-[#18181B] focus:border-[#2563EB]/40"
        }`}
      >
        {TIME_ZONES.map((timeZone) => (
          <option key={timeZone} value={timeZone}>
            {timeZone}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function TimeZoneConverterTool() {
  const [dateTime, setDateTime] = useState("");
  const [sourceTimeZone, setSourceTimeZone] = useState("UTC");
  const [targetTimeZone, setTargetTimeZone] = useState("Asia/Shanghai");
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState("");

  const convert = () => {
    try {
      const utcDate = zonedTimeToUtc(dateTime, sourceTimeZone);

      setResult({
        source: formatInTimeZone(utcDate, sourceTimeZone),
        target: formatInTimeZone(utcDate, targetTimeZone),
        utc: utcDate.toISOString(),
      });
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Invalid date/time.");
    }
  };

  const clear = () => {
    setDateTime("");
    setSourceTimeZone("UTC");
    setTargetTimeZone("Asia/Shanghai");
    setResult(null);
    setError("");
  };

  return (
    <ToolPanel>
      <div>
        <ToolLabel>Date and time</ToolLabel>
        <ToolInput value={dateTime} onChange={setDateTime} type="datetime-local" />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <TimeZoneSelect
          label="Source time zone"
          value={sourceTimeZone}
          onChange={setSourceTimeZone}
        />
        <TimeZoneSelect
          label="Target time zone"
          value={targetTimeZone}
          onChange={setTargetTimeZone}
        />
      </div>

      <ToolButtonRow>
        <ToolButton onClick={convert}>Convert</ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      {error ? (
        <ToolResultBox>{error}</ToolResultBox>
      ) : result ? (
        <div className="mt-5 grid gap-3">
          <ToolStatCard label="Source time" value={result.source} />
          <ToolStatCard label="Target time" value={result.target} />
          <ToolStatCard label="UTC instant" value={result.utc} />
        </div>
      ) : (
        <ToolResultBox muted>Converted time will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
