"use client";

import { useState } from "react";

export default function CalculatorTool() {
  const [input, setInput] = useState("");

  return (
    <div className="mt-8">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter calculation..."
        className="w-full rounded-xl bg-black/30 p-4 border border-white/10"
      />

      <button
        onClick={() => {
          try {
            // eslint-disable-next-line no-eval
            setInput(eval(input).toString());
          } catch {
            alert("Invalid calculation");
          }
        }}
        className="mt-4 rounded-xl bg-purple-600 px-5 py-3"
      >
        Calculate
      </button>
    </div>
  );
}