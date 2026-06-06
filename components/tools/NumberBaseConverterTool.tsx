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

type NumberBase = {
  label: string;
  name: string;
  radix: number;
};

const BASES: NumberBase[] = [
  { label: "Binary", name: "binary", radix: 2 },
  { label: "Octal", name: "octal", radix: 8 },
  { label: "Decimal", name: "decimal", radix: 10 },
  { label: "Hexadecimal", name: "hexadecimal", radix: 16 },
];

function stripPrefix(value: string, radix: number) {
  if (radix === 2 && /^0b/i.test(value)) return value.slice(2);
  if (radix === 8 && /^0o/i.test(value)) return value.slice(2);
  if (radix === 16 && /^0x/i.test(value)) return value.slice(2);
  return value;
}

function digitValue(character: string) {
  const normalized = character.toLowerCase();

  if (normalized >= "0" && normalized <= "9") {
    return normalized.charCodeAt(0) - "0".charCodeAt(0);
  }

  if (normalized >= "a" && normalized <= "f") {
    return normalized.charCodeAt(0) - "a".charCodeAt(0) + 10;
  }

  return -1;
}

function parseInteger(value: string, radix: number) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("Enter a number to convert.");
  }

  const sign = trimmed.startsWith("-") ? -1 : 1;
  const withoutSign =
    trimmed.startsWith("-") || trimmed.startsWith("+")
      ? trimmed.slice(1)
      : trimmed;
  const digits = stripPrefix(withoutSign, radix).replace(/_/g, "");

  if (!digits) {
    throw new Error("Enter digits after the base prefix.");
  }

  let result = BigInt(0);
  const bigRadix = BigInt(radix);

  for (const character of digits) {
    const digit = digitValue(character);

    if (digit < 0 || digit >= radix) {
      throw new Error(`Invalid ${BASES.find((base) => base.radix === radix)?.name} digit.`);
    }

    result = result * bigRadix + BigInt(digit);
  }

  return sign < 0 ? -result : result;
}

function convertValue(value: string, radix: number) {
  const parsed = parseInteger(value, radix);

  return {
    binary: parsed.toString(2),
    octal: parsed.toString(8),
    decimal: parsed.toString(10),
    hexadecimal: parsed.toString(16).toUpperCase(),
  };
}

export default function NumberBaseConverterTool() {
  const [input, setInput] = useState("");
  const [inputBase, setInputBase] = useState(BASES[2]);
  const [result, setResult] = useState<ReturnType<typeof convertValue> | null>(
    null,
  );
  const [error, setError] = useState("");

  const convert = () => {
    try {
      setResult(convertValue(input, inputBase.radix));
      setError("");
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Invalid number.");
    }
  };

  const clear = () => {
    setInput("");
    setResult(null);
    setError("");
  };

  return (
    <ToolPanel>
      <div>
        <ToolLabel>Number</ToolLabel>
        <ToolInput value={input} onChange={setInput} placeholder="255" />
      </div>

      <div className="mt-5">
        <ToolLabel>Input base</ToolLabel>
        <ToolButtonRow>
          {BASES.map((base) => (
            <ToolButton
              key={base.radix}
              onClick={() => {
                setInputBase(base);
                setResult(null);
                setError("");
              }}
              variant={inputBase.radix === base.radix ? "primary" : "secondary"}
            >
              {base.label}
            </ToolButton>
          ))}
        </ToolButtonRow>
      </div>

      <ToolButtonRow>
        <ToolButton onClick={convert}>Convert</ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      {error ? (
        <ToolResultBox>{error}</ToolResultBox>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <ToolStatCard label="Binary" value={result?.binary || "-"} />
          <ToolStatCard label="Octal" value={result?.octal || "-"} />
          <ToolStatCard label="Decimal" value={result?.decimal || "-"} />
          <ToolStatCard label="Hexadecimal" value={result?.hexadecimal || "-"} />
        </div>
      )}
    </ToolPanel>
  );
}
