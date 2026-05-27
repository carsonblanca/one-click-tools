"use client";

import { useState } from "react";

export default function Base64Tool() {
  const [text, setText] = useState("");

  return (
    <div className="mt-8">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter text..."
        className="w-full rounded-xl bg-black/30 p-4 border border-white/10"
        rows={8}
      />

      <div className="mt-4 flex gap-4">
        <button
          onClick={() => setText(btoa(text))}
          className="rounded-xl bg-purple-600 px-5 py-3"
        >
          Encode
        </button>

        <button
          onClick={() => setText(atob(text))}
          className="rounded-xl bg-white/10 px-5 py-3"
        >
          Decode
        </button>
      </div>
    </div>
  );
}