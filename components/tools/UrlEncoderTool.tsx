"use client";

import { useState } from "react";

export default function UrlEncoderTool() {
  const [text, setText] = useState("");

  return (
    <div className="mt-8">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter URL or text..."
        className="w-full rounded-xl bg-black/30 p-4 border border-white/10"
        rows={8}
      />

      <div className="mt-4 flex flex-wrap gap-4">
        <button
          onClick={() => setText(encodeURIComponent(text))}
          className="rounded-xl bg-purple-600 px-5 py-3"
        >
          Encode URL
        </button>

        <button
          onClick={() => {
            try {
              setText(decodeURIComponent(text));
            } catch {
              alert("Invalid encoded URL");
            }
          }}
          className="rounded-xl bg-white/10 px-5 py-3"
        >
          Decode URL
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