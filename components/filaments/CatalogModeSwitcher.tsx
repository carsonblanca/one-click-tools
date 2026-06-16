"use client";

import { useTheme } from "@/components/ThemeProvider";

export type BrowseMode = "material" | "brand" | "color";

const MODES: { key: BrowseMode; zh: string; en: string }[] = [
  { key: "material", zh: "按材料", en: "Material" },
  { key: "brand",    zh: "按品牌", en: "Brand" },
  { key: "color",    zh: "按颜色", en: "Color" },
];

export default function CatalogModeSwitcher({
  mode, onChange,
}: {
  mode: BrowseMode;
  onChange: (mode: BrowseMode) => void;
}) {
  const { isDark } = useTheme();

  return (
    <div
      className={`inline-flex rounded-2xl border p-1 ${
        isDark ? "border-white/10 bg-black/30" : "border-[#E5DED0] bg-[#F5F2EA]"
      }`}
    >
      {MODES.map((m) => {
        const active = mode === m.key;
        return (
          <button
            key={m.key}
            onClick={() => onChange(m.key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              active
                ? isDark
                  ? "bg-lime-300 text-black"
                  : "bg-white text-[#18181B] shadow-sm"
                : isDark
                  ? "text-white/50 hover:text-white/80"
                  : "text-[#6B665D] hover:text-[#18181B]"
            }`}
          >
            {m.zh}
          </button>
        );
      })}
    </div>
  );
}
