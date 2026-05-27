"use client";

import { useState } from "react";

export default function WordCounterTool() {
  const [text, setText] = useState("");

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, "").length;
  const paragraphs = text.trim()
    ? text.split(/\n+/).filter((p) => p.trim()).length
    : 0;

  return (
    <div className="mt-8">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter or paste your text..."
        className="w-full rounded-xl bg-black/30 p-4 border border-white/10"
        rows={10}
      />

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-xl bg-white/5 p-4">
          <div className="text-sm text-white/50">Words</div>
          <div className="mt-2 text-2xl font-bold">{words}</div>
        </div>

        <div className="rounded-xl bg-white/5 p-4">
          <div className="text-sm text-white/50">Characters</div>
          <div className="mt-2 text-2xl font-bold">{characters}</div>
        </div>

        <div className="rounded-xl bg-white/5 p-4">
          <div className="text-sm text-white/50">No Spaces</div>
          <div className="mt-2 text-2xl font-bold">{charactersNoSpaces}</div>
        </div>

        <div className="rounded-xl bg-white/5 p-4">
          <div className="text-sm text-white/50">Paragraphs</div>
          <div className="mt-2 text-2xl font-bold">{paragraphs}</div>
        </div>
      </div>
    </div>
  );
}