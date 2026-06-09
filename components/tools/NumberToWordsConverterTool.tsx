"use client";

import { useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolInput,
  ToolLabel,
  ToolPanel,
  ToolResultBox,
} from "../tool-ui/ToolUI";

const ones = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];

const tens = [
  "",
  "",
  "twenty",
  "thirty",
  "forty",
  "fifty",
  "sixty",
  "seventy",
  "eighty",
  "ninety",
];

const scales = [
  { value: 1_000_000_000_000, label: "trillion" },
  { value: 1_000_000_000, label: "billion" },
  { value: 1_000_000, label: "million" },
  { value: 1_000, label: "thousand" },
];

function underThousandToWords(value: number): string {
  const parts: string[] = [];
  let remaining = value;

  if (remaining >= 100) {
    parts.push(`${ones[Math.floor(remaining / 100)]} hundred`);
    remaining %= 100;
  }

  if (remaining >= 20) {
    const ten = Math.floor(remaining / 10);
    const one = remaining % 10;
    parts.push(one ? `${tens[ten]}-${ones[one]}` : tens[ten]);
  } else if (remaining > 0 || parts.length === 0) {
    parts.push(ones[remaining]);
  }

  return parts.join(" ");
}

function integerToWords(value: number): string {
  if (value === 0) return "zero";

  const parts: string[] = [];
  let remaining = value;

  scales.forEach((scale) => {
    if (remaining >= scale.value) {
      const chunk = Math.floor(remaining / scale.value);
      parts.push(`${underThousandToWords(chunk)} ${scale.label}`);
      remaining %= scale.value;
    }
  });

  if (remaining > 0) {
    parts.push(underThousandToWords(remaining));
  }

  return parts.join(" ");
}

function normalizeInput(value: string) {
  return value.trim().replace(/,/g, "");
}

function numberToWords(value: string) {
  const normalized = normalizeInput(value);

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Enter a valid number.");
  }

  const negative = normalized.startsWith("-");
  const absolute = negative ? normalized.slice(1) : normalized;
  const [integerPart, decimalPart] = absolute.split(".");
  const integerNumber = Number(integerPart);

  if (!Number.isSafeInteger(integerNumber) || integerNumber > 999_999_999_999_999) {
    throw new Error("Enter a number up to 999,999,999,999,999.");
  }

  const words = [integerToWords(integerNumber)];

  if (decimalPart) {
    words.push("point");
    words.push(
      decimalPart
        .split("")
        .map((digit) => ones[Number(digit)])
        .join(" "),
    );
  }

  return `${negative ? "negative " : ""}${words.join(" ")}`;
}

export default function NumberToWordsConverterTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const convert = () => {
    try {
      setResult(numberToWords(input));
      setError("");
    } catch (caught) {
      setResult("");
      setError(caught instanceof Error ? caught.message : "Could not convert number.");
    }
  };

  const copy = () => {
    if (result) {
      navigator.clipboard?.writeText(result);
    }
  };

  const clear = () => {
    setInput("");
    setResult("");
    setError("");
  };

  return (
    <ToolPanel>
      <ToolLabel>Number</ToolLabel>
      <ToolInput value={input} onChange={setInput} type="text" placeholder="-1234.56" />

      <ToolButtonRow>
        <ToolButton onClick={convert}>Convert</ToolButton>
        <ToolButton onClick={copy} variant="secondary">
          Copy
        </ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      {error ? (
        <ToolResultBox>{error}</ToolResultBox>
      ) : result ? (
        <ToolResultBox>{result}</ToolResultBox>
      ) : (
        <ToolResultBox muted>Number words will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
