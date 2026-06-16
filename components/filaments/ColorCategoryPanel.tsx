"use client";

import { useState, useMemo } from "react";
import { useTheme } from "@/components/ThemeProvider";
import {
  COLOR_FAMILY_LABELS, type ColorFamily,
} from "@/lib/filaments/catalog/mock-colors";
import { getRecordsByColorFamily } from "@/lib/filaments/catalog/mock-catalog-ext";

const FAMILIES = Object.entries(COLOR_FAMILY_LABELS) as [ColorFamily, { zh: string; en: string }][];

const FAMILY_PALETTE: Record<ColorFamily, string> = {
  red:         "#EF4444",
  orange:      "#F97316",
  yellow:      "#EAB308",
  green:       "#22C55E",
  cyan:        "#06B6D4",
  blue:        "#3B82F6",
  purple:      "#8B5CF6",
  pink:        "#EC4899",
  brown:       "#A16207",
  black:       "#1A1A1A",
  white:       "#F0EDE0",
  gray:        "#9CA3AF",
  metallic:    "#B0B0B0",
  transparent: "#D4E8E0",
  fluorescent: "#A3E635",
  multi:       "linear-gradient(90deg, #EF4444, #F97316, #EAB308, #22C55E, #3B82F6, #8B5CF6)",
};

export default function ColorCategoryPanel({
  activeFamily, onSelect,
}: {
  activeFamily: ColorFamily | null;
  onSelect: (family: ColorFamily) => void;
}) {
  const { isDark } = useTheme();

  const items = useMemo(
    () =>
      FAMILIES.map(([key, labels]) => ({
        key,
        labels,
        count: getRecordsByColorFamily(key).length,
        palette: FAMILY_PALETTE[key],
      })),
    [],
  );

  return (
    <div
      className={`rounded-[20px] border p-4 ${
        isDark ? "border-white/10 bg-black/20" : "border-[#E5DED0] bg-[#FFFDF7]"
      }`}
    >
      <div className={`mb-3 text-sm font-medium ${isDark ? "text-white/60" : "text-[#8A8173]"}`}>
        颜色分类
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map(({ key, labels, count, palette }) => {
          const active = activeFamily === key;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              className={`flex items-center gap-3 rounded-xl p-2.5 text-left text-sm transition ${
                active
                  ? isDark
                    ? "bg-lime-300/20 text-lime-200"
                    : "bg-[#2563EB]/10 text-[#2563EB] font-medium"
                  : isDark
                    ? "text-white/70 hover:bg-white/[0.05]"
                    : "text-[#6B665D] hover:bg-[#F5F2EA]"
              }`}
            >
              <div
                className="h-5 w-5 shrink-0 rounded-full border border-white/20"
                style={{
                  background: palette.startsWith("linear-gradient")
                    ? palette
                    : palette,
                }}
              />
              <span className="truncate">{labels.zh}</span>
              {count > 0 && (
                <span className={`ml-auto shrink-0 text-[11px] ${isDark ? "text-white/30" : "text-[#8A8173]"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
