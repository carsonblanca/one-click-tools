"use client";

import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import type { BrowseMode } from "./CatalogModeSwitcher";

export type MobileFilters = {
  mode: BrowseMode;
  onlyRefillable: boolean;
  onlyCardboard: boolean;
  amsCompatibleOnly: boolean;
  minRating: number;
};

export default function MobileCatalogFilters({
  open, onClose, filters, onChange,
}: {
  open: boolean;
  onClose: () => void;
  filters: MobileFilters;
  onChange: (filters: MobileFilters) => void;
}) {
  const { isDark } = useTheme();
  const [local, setLocal] = useState<MobileFilters>(filters);

  const update = <K extends keyof MobileFilters>(key: K, value: MobileFilters[K]) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />

          <div
            className={`relative w-full rounded-t-[28px] border px-5 pb-8 pt-5 ${
              isDark ? "border-white/10 bg-[#1A1A1A]" : "border-[#E5DED0] bg-[#FFFDF7]"
            }`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className={`text-base font-semibold ${isDark ? "text-white" : "text-[#18181B]"}`}>
                筛选
              </div>
              <button
                onClick={() => { onChange(local); onClose(); }}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  isDark ? "bg-lime-300 text-black" : "bg-[#2563EB] text-white"
                }`}
              >
                应用
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <div className={`mb-2 text-sm font-medium ${isDark ? "text-white/60" : "text-[#8A8173]"}`}>
                  评分筛选
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {[0, 3, 3.5, 4, 4.5].map((v) => (
                    <button
                      key={v}
                      onClick={() => update("minRating", v)}
                      className={`shrink-0 rounded-xl px-4 py-2 text-sm transition ${
                        local.minRating === v
                          ? isDark
                            ? "bg-lime-300/20 text-lime-200"
                            : "bg-[#2563EB]/10 text-[#2563EB]"
                          : isDark
                            ? "border border-white/10 text-white/50"
                            : "border border-[#E5DED0] text-[#8A8173]"
                      }`}
                    >
                      {v === 0 ? "不限" : `${v}+`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {[
                  { key: "onlyRefillable" as const,    label: "仅显示可续料" },
                  { key: "onlyCardboard" as const,     label: "纸盘规格" },
                  { key: "amsCompatibleOnly" as const, label: "仅 AMS 兼容" },
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                      isDark
                        ? "border-white/10 bg-white/[0.04] text-white/70"
                        : "border-[#E5DED0] bg-[#F5F2EA] text-[#6B665D]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={local[key]}
                      onChange={(e) => update(key, e.target.checked)}
                      className={isDark ? "accent-lime-300" : "accent-[#2563EB]"}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  const cleared: MobileFilters = { mode: "material", onlyRefillable: false, onlyCardboard: false, amsCompatibleOnly: false, minRating: 0 };
                  setLocal(cleared);
                  onChange(cleared);
                }}
                className={`flex-1 rounded-2xl py-3 text-sm transition ${
                  isDark
                    ? "border border-white/10 text-white/50"
                    : "border border-[#E5DED0] text-[#8A8173]"
                }`}
              >
                清除筛选
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
