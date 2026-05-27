"use client";

import { useState } from "react";

export default function JsonFormatterTool() {
  const [jsonText, setJsonText] = useState("");

  return (
    <div className="mt-8">
      <textarea
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
        placeholder="Paste JSON here..."
        className="w-full rounded-xl bg-black/30 p-4 border border-white/10"
        rows={12}
      />

      <button
        onClick={() => {
          try {
            const formatted = JSON.stringify(
              JSON.parse(jsonText),
              null,
              2
            );

            setJsonText(formatted);
          } catch {
            alert("Invalid JSON");
          }
        }}
        className="mt-4 rounded-xl bg-purple-600 px-5 py-3"
      >
        Format JSON
      </button>
    </div>
  );
}