"use client";

import { useState } from "react";

export default function TimestampConverterTool() {
  const [timestamp, setTimestamp] = useState("");

  const numberValue = Number(timestamp);
  const isValid = timestamp.trim() !== "" && !Number.isNaN(numberValue);

  const date = isValid
    ? new Date(numberValue.toString().length === 10 ? numberValue * 1000 : numberValue)
    : null;

  const currentUnix = Math.floor(Date.now() / 1000);

  return (
    <div className="mt-8">
      <input
        value={timestamp}
        onChange={(e) => setTimestamp(e.target.value)}
        placeholder="Enter Unix timestamp, e.g. 1710000000"
        className="w-full rounded-xl bg-black/30 p-4 border border-white/10"
      />

      <button
        onClick={() => setTimestamp(String(currentUnix))}
        className="mt-4 rounded-xl bg-purple-600 px-5 py-3"
      >
        Use Current Timestamp
      </button>

      <div className="mt-6 rounded-xl bg-white/5 p-6">
        {date ? (
          <div className="space-y-3">
            <div>
              <span className="text-white/50">Local Time: </span>
              {date.toString()}
            </div>

            <div>
              <span className="text-white/50">UTC: </span>
              {date.toUTCString()}
            </div>

            <div>
              <span className="text-white/50">ISO: </span>
              {date.toISOString()}
            </div>
          </div>
        ) : (
          <div className="text-white/50">Enter a valid timestamp.</div>
        )}
      </div>
    </div>
  );
}