"use client";

import { useState, useMemo } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { resolveColorFamily, approximateColorDistance } from "@/lib/filaments/catalog/color-search";
import { DECLARED_COLORS } from "@/lib/filaments/catalog/mock-catalog-ext";

export default function ColorCodeSearchPanel({
  onSelect,
}: {
  onSelect?: (hex: string, colorNameZh: string) => void;
}) {
  const { isDark } = useTheme();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"name" | "hex" | "rgb">("name");
  const [result, setResult] = useState<{ hex: string; nameZh: string; nameEn: string; family: string; distance: number }[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = () => {
    const q = query.trim();
    if (!q) { setResult([]); setSearched(false); return; }

    if (mode === "name") {
      const family = resolveColorFamily(q);
      if (family) {
        const matched = DECLARED_COLORS
          .filter((c) => c.colorFamily === family)
          .map((c) => ({
            hex: c.hex,
            nameZh: c.colorNameZh,
            nameEn: c.colorNameEn,
            family: c.colorFamily,
            distance: 0,
          }));
        setResult(matched);
      } else {
        setResult([]);
      }
    } else if (mode === "hex") {
      const cleanHex = q.replace(/^#/, "");
      if (/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
        const ref = `#${cleanHex.toUpperCase()}`;
        const sorted = DECLARED_COLORS
          .map((c) => ({
            hex: c.hex,
            nameZh: c.colorNameZh,
            nameEn: c.colorNameEn,
            family: c.colorFamily,
            distance: approximateColorDistance(ref, c.hex),
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 10);
        setResult(sorted);
      } else {
        setResult([]);
      }
    } else if (mode === "rgb") {
      const parts = q.match(/\d+/g);
      if (parts && parts.length >= 3) {
        const r = Math.min(255, Math.max(0, parseInt(parts[0])));
        const g = Math.min(255, Math.max(0, parseInt(parts[1])));
        const b = Math.min(255, Math.max(0, parseInt(parts[2])));
        const refHex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
        const sorted = DECLARED_COLORS
          .map((c) => ({
            hex: c.hex,
            nameZh: c.colorNameZh,
            nameEn: c.colorNameEn,
            family: c.colorFamily,
            distance: approximateColorDistance(refHex, c.hex),
          }))
          .sort((a, b) => a.distance - b.distance)
          .slice(0, 10);
        setResult(sorted);
      } else {
        setResult([]);
      }
    }
    setSearched(true);
  };

  const MODES = [
    { key: "name" as const, zh: "颜色名" },
    { key: "hex" as const, zh: "HEX" },
    { key: "rgb" as const, zh: "RGB" },
  ];

  return (
    <div
      className={`rounded-[20px] border p-4 ${
        isDark ? "border-white/10 bg-black/20" : "border-[#E5DED0] bg-[#FFFDF7]"
      }`}
    >
      <div className={`mb-3 text-sm font-medium ${isDark ? "text-white/60" : "text-[#8A8173]"}`}>
        颜色搜索
      </div>

      <div className="mb-3 flex gap-1">
        {MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => { setMode(m.key); setResult([]); setSearched(false); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              mode === m.key
                ? isDark
                  ? "bg-lime-300/20 text-lime-200"
                  : "bg-[#2563EB]/10 text-[#2563EB]"
                : isDark
                  ? "text-white/40 hover:text-white/70"
                  : "text-[#8A8173] hover:text-[#6B665D]"
            }`}
          >
            {m.zh}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
          placeholder={
            mode === "name" ? "输入颜色名（中文/英文）" :
            mode === "hex" ? "输入 HEX 值（如 FF0000）" :
            "输入 RGB 值（如 255 0 0）"
          }
          className={`flex-1 rounded-2xl border px-4 py-3 text-sm outline-none transition ${
            isDark
              ? "border-white/10 bg-black/30 text-white placeholder:text-white/30 focus:border-lime-300/40"
              : "border-[#E5DED0] bg-[#F5F2EA] text-[#18181B] placeholder:text-[#8A8173] focus:border-[#2563EB]/40"
          }`}
        />
        <button
          onClick={handleSearch}
          className={`rounded-2xl px-5 py-3 text-sm font-medium transition ${
            isDark ? "bg-lime-300 text-black hover:bg-lime-200" : "bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
          }`}
        >
          搜索
        </button>
      </div>

      {searched && result.length === 0 && (
        <div className={`mt-3 text-xs ${isDark ? "text-white/40" : "text-[#8A8173]"}`}>
          未匹配到颜色
        </div>
      )}

      {result.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {result.map((r) => (
            <button
              key={r.hex}
              onClick={() => onSelect?.(r.hex, r.nameZh)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                isDark ? "hover:bg-white/[0.05]" : "hover:bg-[#F5F2EA]"
              }`}
            >
              <div
                className="h-5 w-5 shrink-0 rounded-full border border-white/20"
                style={{ backgroundColor: r.hex }}
              />
              <span className={"min-w-0 " + (isDark ? "text-white/80" : "text-[#18181B]")}>
                {r.nameZh}
              </span>
              <span className={`text-[11px] ${isDark ? "text-white/30" : "text-[#8A8173]"}`}>
                {r.hex}
              </span>
              {mode !== "name" && (
                <span className={`ml-auto shrink-0 text-[11px] ${isDark ? "text-white/30" : "text-[#8A8173]"}`}>
                  ΔE≈{r.distance.toFixed(0)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
