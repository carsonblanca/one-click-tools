"use client";

import { useState } from "react";

export default function CaseConverterTool() {
  const [text, setText] = useState("");

  const toTitleCase = (value: string) => {
    return value.replace(/\w\S*/g, (word) => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
  };

  return (
    <div className="mt-8">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text..."
        className="w-full rounded-xl bg-black/30 p-4 border border-white/10"
        rows={10}
      />

      <div className="mt-4 flex flex-wrap gap-4">
        <button
          onClick={() => setText(text.toUpperCase())}
          className="rounded-xl bg-purple-600 px-5 py-3"
        >
          UPPERCASE
        </button>

        <button
          onClick={() => setText(text.toLowerCase())}
          className="rounded-xl bg-white/10 px-5 py-3"
        >
          lowercase
        </button>

        <button
          onClick={() => setText(toTitleCase(text))}
          className="rounded-xl bg-white/10 px-5 py-3"
        >
          Title Case
        </button>

        <button
          onClick={() => setText("")}
          className="rounded-xl bg-red-500/20 px-5 py-3 text-red-300"
        >
          Clear
        </button>
      </div>
    </div>
  );
}