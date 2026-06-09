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

type Mode = "numberToRoman" | "romanToNumber";

const romanPairs = [
  { value: 1000, symbol: "M" },
  { value: 900, symbol: "CM" },
  { value: 500, symbol: "D" },
  { value: 400, symbol: "CD" },
  { value: 100, symbol: "C" },
  { value: 90, symbol: "XC" },
  { value: 50, symbol: "L" },
  { value: 40, symbol: "XL" },
  { value: 10, symbol: "X" },
  { value: 9, symbol: "IX" },
  { value: 5, symbol: "V" },
  { value: 4, symbol: "IV" },
  { value: 1, symbol: "I" },
];

const romanPattern = /^M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

function numberToRoman(value: number) {
  let remaining = value;
  let output = "";

  romanPairs.forEach((pair) => {
    while (remaining >= pair.value) {
      output += pair.symbol;
      remaining -= pair.value;
    }
  });

  return output;
}

function romanToNumber(value: string) {
  const normalized = value.trim().toUpperCase();

  if (!normalized || !romanPattern.test(normalized)) {
    throw new Error("Enter a valid Roman numeral from I to MMMCMXCIX.");
  }

  let total = 0;
  let index = 0;

  romanPairs.forEach((pair) => {
    while (normalized.startsWith(pair.symbol, index)) {
      total += pair.value;
      index += pair.symbol.length;
    }
  });

  if (numberToRoman(total) !== normalized) {
    throw new Error("Enter a valid Roman numeral using standard notation.");
  }

  return total;
}

export default function RomanNumeralConverterTool() {
  const [mode, setMode] = useState<Mode>("numberToRoman");
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  const convert = () => {
    try {
      if (mode === "numberToRoman") {
        const parsed = Number(input);

        if (!Number.isInteger(parsed) || parsed < 1 || parsed > 3999) {
          throw new Error("Enter a whole number from 1 to 3999.");
        }

        setResult(numberToRoman(parsed));
      } else {
        setResult(String(romanToNumber(input)));
      }

      setError("");
    } catch (caught) {
      setResult("");
      setError(caught instanceof Error ? caught.message : "Could not convert value.");
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
      <ToolLabel>Conversion direction</ToolLabel>
      <ToolButtonRow>
        <ToolButton
          onClick={() => {
            setMode("numberToRoman");
            setResult("");
            setError("");
          }}
          variant={mode === "numberToRoman" ? "primary" : "secondary"}
        >
          Number to Roman
        </ToolButton>
        <ToolButton
          onClick={() => {
            setMode("romanToNumber");
            setResult("");
            setError("");
          }}
          variant={mode === "romanToNumber" ? "primary" : "secondary"}
        >
          Roman to Number
        </ToolButton>
      </ToolButtonRow>

      <div className="mt-5">
        <ToolLabel>{mode === "numberToRoman" ? "Number" : "Roman numeral"}</ToolLabel>
        <ToolInput
          value={input}
          onChange={setInput}
          type={mode === "numberToRoman" ? "number" : "text"}
          placeholder={mode === "numberToRoman" ? "1999" : "MCMXCIX"}
        />
      </div>

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
        <div className="mt-5">
          <ToolStatCard label="Result" value={result} />
        </div>
      ) : (
        <ToolResultBox muted>Converted value will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
