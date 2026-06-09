"use client";

import { useMemo, useState } from "react";
import {
  ToolButton,
  ToolButtonRow,
  ToolCheckbox,
  ToolPanel,
  ToolResultBox,
  ToolStatCard,
  ToolTextarea,
} from "../tool-ui/ToolUI";

const stopWords = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "he",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "was",
  "were",
  "will",
  "with",
]);

type FrequencyRow = {
  word: string;
  count: number;
};

type Analysis = {
  totalWords: number;
  uniqueWords: number;
  characters: number;
  sentences: number;
  frequencies: FrequencyRow[];
};

function extractWords(text: string, ignoreCase: boolean) {
  const matches = text.match(/[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?/g) || [];
  return matches.map((word) => (ignoreCase ? word.toLowerCase() : word));
}

function analyzeText(text: string, ignoreCase: boolean, ignoreStopWords: boolean): Analysis {
  const words = extractWords(text, ignoreCase);
  const countedWords = ignoreStopWords
    ? words.filter((word) => !stopWords.has(word.toLowerCase()))
    : words;
  const counts = new Map<string, number>();

  countedWords.forEach((word) => {
    counts.set(word, (counts.get(word) || 0) + 1);
  });

  const frequencies = Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((first, second) => second.count - first.count || first.word.localeCompare(second.word));

  return {
    totalWords: words.length,
    uniqueWords: counts.size,
    characters: text.length,
    sentences: (text.match(/[.!?]+(?=\s|$)/g) || []).length,
    frequencies,
  };
}

export default function WordFrequencyCounterTool() {
  const [text, setText] = useState("");
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [ignoreStopWords, setIgnoreStopWords] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState("");

  const resultText = useMemo(() => {
    if (!analysis) return "";

    return [
      `Total words: ${analysis.totalWords}`,
      `Unique words: ${analysis.uniqueWords}`,
      `Characters: ${analysis.characters}`,
      `Sentences: ${analysis.sentences}`,
      "",
      ...analysis.frequencies.map((row) => `${row.word}: ${row.count}`),
    ].join("\n");
  }, [analysis]);

  const analyze = () => {
    if (!text.trim()) {
      setAnalysis(null);
      setError("Paste text to analyze.");
      return;
    }

    setAnalysis(analyzeText(text, ignoreCase, ignoreStopWords));
    setError("");
  };

  const copy = () => {
    if (resultText) {
      navigator.clipboard?.writeText(resultText);
    }
  };

  const clear = () => {
    setText("");
    setAnalysis(null);
    setError("");
  };

  return (
    <ToolPanel>
      <ToolTextarea
        value={text}
        onChange={setText}
        placeholder="Paste text to analyze word frequency..."
        rows={10}
      />

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <ToolCheckbox checked={ignoreCase} onChange={setIgnoreCase}>
          Ignore case
        </ToolCheckbox>
        <ToolCheckbox checked={ignoreStopWords} onChange={setIgnoreStopWords}>
          Ignore common stop words
        </ToolCheckbox>
      </div>

      <ToolButtonRow>
        <ToolButton onClick={analyze}>Analyze</ToolButton>
        <ToolButton onClick={copy} variant="secondary">
          Copy results
        </ToolButton>
        <ToolButton onClick={clear} variant="danger">
          Clear
        </ToolButton>
      </ToolButtonRow>

      {error ? (
        <ToolResultBox>{error}</ToolResultBox>
      ) : analysis ? (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <ToolStatCard label="Total words" value={analysis.totalWords} />
            <ToolStatCard label="Unique words" value={analysis.uniqueWords} />
            <ToolStatCard label="Characters" value={analysis.characters} />
            <ToolStatCard label="Sentences" value={analysis.sentences} />
          </div>

          <ToolResultBox>
            {analysis.frequencies.length ? (
              <div className="max-h-96 overflow-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-current/10">
                      <th className="pb-2 pr-4 font-semibold">Word</th>
                      <th className="pb-2 font-semibold">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.frequencies.map((row) => (
                      <tr key={row.word} className="border-b border-current/5">
                        <td className="py-2 pr-4">{row.word}</td>
                        <td className="py-2">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              "No countable words after filters."
            )}
          </ToolResultBox>
        </>
      ) : (
        <ToolResultBox muted>Word frequency results will appear here.</ToolResultBox>
      )}
    </ToolPanel>
  );
}
