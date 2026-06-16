"use client";

import { useTheme } from "@/components/ThemeProvider";

type MatchResult = {
  matchedHex: string;
  matchedNameZh: string;
  matchedNameEn: string;
  similarity: number;
  brand: string;
  material: string;
};

const DEMO_RESULTS: MatchResult[] = [
  { matchedHex: "#CC2936", matchedNameZh: "中国红",    matchedNameEn: "Chinese Red",    similarity: 0.96, brand: "JAYO",   material: "PLA High Speed" },
  { matchedHex: "#DC2626", matchedNameZh: "亮红",       matchedNameEn: "Bright Red",     similarity: 0.87, brand: "SUNLU",  material: "PLA Matte" },
  { matchedHex: "#B91C1C", matchedNameZh: "深红",       matchedNameEn: "Deep Red",       similarity: 0.82, brand: "eSUN",   material: "PETG Basic" },
  { matchedHex: "#7F1D1D", matchedNameZh: "酒红",       matchedNameEn: "Wine Red",       similarity: 0.74, brand: "Bambu Lab", material: "PLA Basic" },
];

export default function ColorMatchResultCard({
  sourceHex,
  results = DEMO_RESULTS,
  onSelect,
}: {
  sourceHex: string;
  results?: MatchResult[];
  onSelect?: (hex: string) => void;
}) {
  const { isDark } = useTheme();

  return (
    <div
      className={`rounded-[20px] border p-4 ${
        isDark ? "border-white/10 bg-black/20" : "border-[#E5DED0] bg-[#FFFDF7]"
      }`}
    >
      <div className="mb-3 flex items-center gap-3">
        <div
          className="h-8 w-8 shrink-0 rounded-full border border-white/20"
          style={{ backgroundColor: sourceHex }}
        />
        <div>
          <div className={`text-xs ${isDark ? "text-white/50" : "text-[#8A8173]"}`}>
            源颜色
          </div>
          <div className={`text-sm font-mono ${isDark ? "text-white/70" : "text-[#6B665D]"}`}>
            {sourceHex}
          </div>
        </div>
      </div>

      <div className={`mb-2 text-xs font-medium ${isDark ? "text-white/50" : "text-[#8A8173]"}`}>
        匹配结果（按相似度排序）
      </div>

      <div className="space-y-2">
        {results.map((r) => (
          <div
            key={`${r.matchedHex}-${r.brand}`}
            onClick={() => onSelect?.(r.matchedHex)}
            className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition cursor-pointer ${
              isDark ? "hover:bg-white/[0.05]" : "hover:bg-[#F5F2EA]"
            }`}
          >
            <div
              className="h-6 w-6 shrink-0 rounded-full border border-white/20"
              style={{ backgroundColor: r.matchedHex }}
            />
            <div className="min-w-0 flex-1">
              <div className={`text-sm ${isDark ? "text-white/80" : "text-[#18181B]"}`}>
                {r.matchedNameZh}
                <span className={`ml-2 text-[11px] ${isDark ? "text-white/30" : "text-[#8A8173]"}`}>
                  {r.brand} · {r.material}
                </span>
              </div>
            </div>
            <div className={`shrink-0 text-sm font-mono ${
              r.similarity > 0.9
                ? "text-green-500"
                : r.similarity > 0.8
                ? "text-yellow-500"
                : isDark ? "text-white/40" : "text-[#8A8173]"
            }`}>
              {(r.similarity * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>

      <div className={`mt-3 border-t pt-3 text-center text-[11px] ${
        isDark ? "border-white/5 text-white/25" : "border-[#E5DED0] text-[#A0988A]"
      }`}>
        * 此为模拟匹配演示，非真实颜色测量
      </div>
    </div>
  );
}
