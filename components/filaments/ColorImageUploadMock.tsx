"use client";

import { useState, useRef } from "react";
import { useTheme } from "@/components/ThemeProvider";

type UploadStatus = "idle" | "preview" | "analyzing" | "done" | "error";

type AnalysisResult = {
  dominantColor: string;
  colorNameZh: string;
  colorFamily: string;
  matchCandidates: { hex: string; nameZh: string; similarity: number }[];
};

const MOCK_RESULTS: Record<string, AnalysisResult> = {
  default: {
    dominantColor: "#CC2936",
    colorNameZh: "中国红",
    colorFamily: "红色",
    matchCandidates: [
      { hex: "#CC2936", nameZh: "中国红", similarity: 0.96 },
      { hex: "#DC2626", nameZh: "亮红",   similarity: 0.87 },
      { hex: "#B91C1C", nameZh: "深红",   similarity: 0.82 },
    ],
  },
};

function createMockResultForHex(hex: string): AnalysisResult {
  const r = parseInt(hex.substring(1, 3), 16);
  const g = parseInt(hex.substring(3, 5), 16);
  const b = parseInt(hex.substring(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const family = brightness > 200 ? "白色" : brightness < 60 ? "黑色" : "灰色";
  const nameZh = brightness > 200 ? "浅色" : brightness < 60 ? "深色" : "灰色";
  return {
    dominantColor: hex,
    colorNameZh: nameZh,
    colorFamily: family,
    matchCandidates: [
      { hex,            nameZh: `近似色 ${hex}`, similarity: 0.98 },
      { hex: "#9CA3AF", nameZh: "中灰",          similarity: 0.72 },
      { hex: "#D1D5DB", nameZh: "浅灰",          similarity: 0.65 },
    ],
  };
}

export default function ColorImageUploadMock({
  onColorSelect,
}: {
  onColorSelect?: (hex: string, nameZh: string) => void;
}) {
  const { isDark } = useTheme();
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreviewUrl(dataUrl);
      setStatus("preview");
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleAnalyze = () => {
    setStatus("analyzing");
    setTimeout(() => {
      const mockHex = ["#CC2936", "#1B2A4A", "#4A7C59", "#8B5CF6", "#F5D742"][Math.floor(Math.random() * 5)];
      const res = MOCK_RESULTS["default"];
      res.dominantColor = mockHex;
      res.colorNameZh = createMockResultForHex(mockHex).colorNameZh;
      setResult(mockHex === "#CC2936" ? MOCK_RESULTS.default : createMockResultForHex(mockHex));
      setStatus("done");
    }, 1500);
  };

  const handleReset = () => {
    setStatus("idle");
    setPreviewUrl(null);
    setResult(null);
  };

  return (
    <div
      className={`rounded-[20px] border p-4 ${
        isDark ? "border-white/10 bg-black/20" : "border-[#E5DED0] bg-[#FFFDF7]"
      }`}
    >
      <div className={`mb-3 text-sm font-medium ${isDark ? "text-white/60" : "text-[#8A8173]"}`}>
        图片上传模拟
      </div>

      {status === "idle" && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed py-12 transition ${
            dragOver
              ? isDark ? "border-lime-300/50 bg-lime-300/10" : "border-[#2563EB]/50 bg-[#2563EB]/5"
              : isDark ? "border-white/10 hover:border-white/20" : "border-[#E5DED0] hover:border-[#2563EB]/30"
          }`}
        >
          <div className={`text-3xl mb-2 ${isDark ? "text-white/30" : "text-[#8A8173]"}`}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div className={`text-sm ${isDark ? "text-white/50" : "text-[#6B665D]"}`}>
            点击或拖拽上传图片
          </div>
          <div className={`mt-1 text-xs ${isDark ? "text-white/30" : "text-[#8A8173]"}`}>
            仅模拟演示，图片不会上传至服务器
          </div>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleInputChange} />
        </div>
      )}

      {(status === "preview" || status === "analyzing" || status === "done") && previewUrl && (
        <div>
          <div className="relative mb-3 overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="预览"
              className="max-h-48 w-full object-contain"
            />
          </div>

          {status === "preview" && (
            <div className="flex gap-2">
              <button
                onClick={handleAnalyze}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  isDark ? "bg-lime-300 text-black hover:bg-lime-200" : "bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
                }`}
              >
                分析颜色
              </button>
              <button
                onClick={handleReset}
                className={`rounded-2xl px-4 py-3 text-sm transition ${
                  isDark
                    ? "border border-white/10 text-white/50 hover:text-white/80"
                    : "border border-[#E5DED0] text-[#8A8173] hover:text-[#6B665D]"
                }`}
              >
                重新选择
              </button>
            </div>
          )}

          {status === "analyzing" && (
            <div className="flex items-center justify-center py-6">
              <div className={`text-sm ${isDark ? "text-white/50" : "text-[#6B665D]"}`}>
                分析中...
              </div>
            </div>
          )}

          {status === "done" && result && (
            <div>
              <div
                className={`rounded-2xl p-4 ${
                  isDark ? "bg-white/[0.04]" : "bg-[#F5F2EA]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full border border-white/20"
                    style={{ backgroundColor: result.dominantColor }}
                  />
                  <div>
                    <div className={`text-sm font-medium ${isDark ? "text-white" : "text-[#18181B]"}`}>
                      {result.colorNameZh}
                    </div>
                    <div className={`text-xs ${isDark ? "text-white/40" : "text-[#8A8173]"}`}>
                      主色调 · {result.colorFamily}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-2 space-y-1">
                {result.matchCandidates.map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => onColorSelect?.(c.hex, c.nameZh)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                      isDark ? "hover:bg-white/[0.05]" : "hover:bg-[#F5F2EA]"
                    }`}
                  >
                    <div className="h-4 w-4 shrink-0 rounded-full border border-white/20" style={{ backgroundColor: c.hex }} />
                    <span className={isDark ? "text-white/70" : "text-[#6B665D]"}>
                      {c.nameZh}
                    </span>
                    <span className={`ml-auto text-[11px] ${isDark ? "text-white/30" : "text-[#8A8173]"}`}>
                      {(c.similarity * 100).toFixed(0)}%
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleAnalyze}
                  className={`flex-1 rounded-2xl px-4 py-2.5 text-sm transition ${
                    isDark
                      ? "border border-white/10 text-white/70 hover:bg-white/[0.05]"
                      : "border border-[#E5DED0] text-[#6B665D] hover:bg-[#F5F2EA]"
                  }`}
                >
                  重新分析
                </button>
                <button
                  onClick={handleReset}
                  className={`flex-1 rounded-2xl px-4 py-2.5 text-sm transition ${
                    isDark
                      ? "border border-white/10 text-white/70 hover:bg-white/[0.05]"
                      : "border border-[#E5DED0] text-[#6B665D] hover:bg-[#F5F2EA]"
                  }`}
                >
                  上传新图
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
