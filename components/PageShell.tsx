"use client";

import type { ReactNode } from "react";
import { useTheme } from "./ThemeProvider";

export default function PageShell({
  children,
}: {
  children: ReactNode;
}) {
  const { isDark } = useTheme();

  return (
    <main
      className={`relative min-h-screen overflow-hidden transition-colors duration-300 ${
        isDark ? "bg-[#08080a] text-white" : "bg-[#F5F2EA] text-[#18181B]"
      }`}
    >
      <div
        className={`pointer-events-none absolute inset-0 ${
          isDark
            ? "bg-[radial-gradient(circle_at_20%_0%,rgba(125,211,252,0.16),transparent_32%),radial-gradient(circle_at_80%_10%,rgba(190,242,100,0.10),transparent_28%),linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:auto,auto,48px_48px,48px_48px]"
            : "bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.10),transparent_30%),radial-gradient(circle_at_82%_8%,rgba(184,107,59,0.08),transparent_30%),linear-gradient(rgba(24,24,27,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(24,24,27,0.04)_1px,transparent_1px)] bg-[size:auto,auto,48px_48px,48px_48px]"
        }`}
      />

      {children}
    </main>
  );
}