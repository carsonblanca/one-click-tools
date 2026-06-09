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
  ToolTextarea,
} from "../tool-ui/ToolUI";

type ReadingResult = {
  words: number;
  minutes: number;
  display: string;
};

function countWords(text: string) {
  return (text.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g) || []).length;
}

function formatReadingTime(minutes: number) {
  if (minutes < 1) {
    return "Less than 1 minute";
  }

  const wholeMinutes = Math.floor(minutes);
  const seconds = Math.round((minutes - wholeMinutes) * 60);

  if (wholeMinutes === 0) {
    return `${seconds} seconds`;
  }

  if (seconds === 0) {
    return `${wholeMinutes} minute${wholeMinutes === 1 ? "" : "s"}`;
  }

  return `${wholeMinutes} minute${wholeMinutes === 1 ? "" : "s"} ${seconds} seconds`;
}

export default function ReadingTimeCalculatorTool() {
  const [text, setText] = useState("");
  const [wpm, setWpm] = useState("200");
  const [result, setResult] = useState<ReadingResult | null>(null);
  const [error, setError] = useState("");

  const calculate = () => {
    const wordsPerMinute = Number(wpm);

    if (!Number.isFinite(wordsPerMinute) || wordsPerMinute <= 0) {
      setResult(null);
      setError("Enter a valid words-per-minute value greater than zero.");
      return;
    }

    const words = countWords(text);
    const minutes = words / wordsPerMinute;

    setResult({
      words,
      minutes,
      display: formatReadingTime(minutes),
    });
    setError("");
  };

  const clear = () => {
    setText("");
    setWpm("200");
    setResult(null);
    setError("");
  };

  return (
    <ToolPanel>
      <ToolTextarea
        value={text}
        onChange={setText}
        placeholder="Paste text to estimate reading time..."
        rows={10}
      />

      <div className="mt-5 max-w-sm">
        <ToolLabel>Words per minute</ToolLabel>
        <ToolInput value={wpm} onChange={setWpm} type="number" placeholder="200" />
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
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <ToolStatCard label="Words" value={result.words} />
            <ToolStatCard label="Reading time" value={result.display} />
            <ToolStatCard label="WPM" value={wpm} />
          </div>
          <ToolResultBox muted>
            Reading time is an estimate based on the words-per-minute value you choose.
          </ToolResultBox>
        </>
      ) : (
        <ToolResultBox muted>Reading time estimate will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
