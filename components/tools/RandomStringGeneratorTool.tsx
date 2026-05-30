"use client";

import { useState } from "react";
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

const UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWERCASE = "abcdefghijklmnopqrstuvwxyz";
const NUMBERS = "0123456789";
const SYMBOLS = "!@#$%^&*()_+-=[]{}|;:,.<>?";

function getRandomIndex(max: number) {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / max) * max;

    do {
      globalThis.crypto.getRandomValues(values);
    } while (values[0] >= limit);

    return values[0] % max;
  }

  return Math.floor(Math.random() * max);
}

function pick(characters: string) {
  return characters[getRandomIndex(characters.length)];
}

export default function RandomStringGeneratorTool() {
  const [length, setLength] = useState("32");
  const [uppercase, setUppercase] = useState(true);
  const [lowercase, setLowercase] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [symbols, setSymbols] = useState(false);
  const [result, setResult] = useState("");

  const selectedSets = [
    uppercase ? UPPERCASE : "",
    lowercase ? LOWERCASE : "",
    numbers ? NUMBERS : "",
    symbols ? SYMBOLS : "",
  ].filter(Boolean);

  const generate = () => {
    const requestedLength = Number(length);

    if (
      !Number.isInteger(requestedLength) ||
      requestedLength < 1 ||
      requestedLength > 512
    ) {
      alert("Choose a length from 1 to 512.");
      return;
    }

    if (selectedSets.length === 0) {
      alert("Select at least one character type.");
      return;
    }

    const characters = selectedSets.join("");
    setResult(
      Array.from({ length: requestedLength }, () => pick(characters)).join(""),
    );
  };

  const copy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
  };

  return (
    <ToolPanel>
      <div>
        <ToolLabel>Length</ToolLabel>
        <ToolInput
          type="number"
          value={length}
          onChange={setLength}
          placeholder="32"
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ToolCheckbox checked={uppercase} onChange={setUppercase}>
          Uppercase
        </ToolCheckbox>
        <ToolCheckbox checked={lowercase} onChange={setLowercase}>
          Lowercase
        </ToolCheckbox>
        <ToolCheckbox checked={numbers} onChange={setNumbers}>
          Numbers
        </ToolCheckbox>
        <ToolCheckbox checked={symbols} onChange={setSymbols}>
          Symbols
        </ToolCheckbox>
      </div>

      <ToolButtonRow>
        <ToolButton onClick={generate}>Generate</ToolButton>
        <ToolButton onClick={copy} variant="secondary">
          Copy
        </ToolButton>
        <ToolButton onClick={() => setResult("")} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      <ToolResultBox muted={!result}>
        {result || "Generated random string will appear here."}
      </ToolResultBox>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ToolStatCard label="Length" value={result.length || "-"} />
        <ToolStatCard label="Character sets" value={selectedSets.length} />
      </div>
    </ToolPanel>
  );
}
