"use client";

import { useState } from "react";

export default function UUIDTool() {
  const [uuid, setUuid] = useState("");

  return (
    <div className="mt-8">
      <div className="rounded-xl border border-white/10 bg-black/30 p-6 text-lg break-all">
        {uuid || "Click generate UUID"}
      </div>

      <button
        onClick={() => setUuid(crypto.randomUUID())}
        className="mt-4 rounded-xl bg-purple-600 px-5 py-3"
      >
        Generate UUID
      </button>
    </div>
  );
}