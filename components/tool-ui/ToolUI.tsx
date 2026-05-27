"use client";

import type { ReactNode } from "react";
import { useTheme } from "../ThemeProvider";

type ButtonVariant = "primary" | "secondary" | "danger";

export function ToolPanel({ children }: { children: ReactNode }) {
  const { isDark } = useTheme();

  return (
    <div
      className={`rounded-[28px] border p-5 ${
        isDark
          ? "border-white/10 bg-black/20"
          : "border-[#E5DED0] bg-[#FFFDF7]"
      }`}
    >
      {children}
    </div>
  );
}

export function ToolLabel({ children }: { children: ReactNode }) {
  const { isDark } = useTheme();

  return (
    <label
      className={`mb-2 block text-sm ${
        isDark ? "text-white/50" : "text-[#6B665D]"
      }`}
    >
      {children}
    </label>
  );
}

export function ToolInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  const { isDark } = useTheme();

  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-2xl border px-4 py-4 outline-none transition ${
        isDark
          ? "border-white/10 bg-black/30 text-white placeholder:text-white/30 focus:border-lime-300/40"
          : "border-[#E5DED0] bg-[#F5F2EA] text-[#18181B] placeholder:text-[#8A8173] focus:border-[#2563EB]/40"
      }`}
    />
  );
}

export function ToolTextarea({
  value,
  onChange,
  placeholder,
  rows = 8,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const { isDark } = useTheme();

  return (
    <textarea
      value={value}
      rows={rows}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={`w-full resize-y rounded-2xl border px-4 py-4 outline-none transition ${
        isDark
          ? "border-white/10 bg-black/30 text-white placeholder:text-white/30 focus:border-lime-300/40"
          : "border-[#E5DED0] bg-[#F5F2EA] text-[#18181B] placeholder:text-[#8A8173] focus:border-[#2563EB]/40"
      }`}
    />
  );
}

export function ToolCheckbox({
  checked,
  children,
  onChange,
}: {
  checked: boolean;
  children: ReactNode;
  onChange: (checked: boolean) => void;
}) {
  const { isDark } = useTheme();

  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
        isDark
          ? "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.07]"
          : "border-[#E5DED0] bg-[#F5F2EA] text-[#6B665D] hover:border-[#2563EB]/30"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={isDark ? "accent-lime-300" : "accent-[#2563EB]"}
      />
      <span>{children}</span>
    </label>
  );
}

export function ToolButton({
  children,
  onClick,
  variant = "primary",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
}) {
  const { isDark } = useTheme();

  const classes = {
    primary: isDark
      ? "bg-lime-300 text-black hover:bg-lime-200"
      : "bg-[#2563EB] text-white hover:bg-[#1D4ED8]",
    secondary: isDark
      ? "border border-white/10 bg-white/[0.05] text-white/70 hover:bg-white/[0.08] hover:text-white"
      : "border border-[#E5DED0] bg-white text-[#6B665D] hover:border-[#2563EB]/30 hover:text-[#18181B]",
    danger: isDark
      ? "border border-red-400/20 bg-red-400/10 text-red-200 hover:bg-red-400/15"
      : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  };

  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-5 py-3 text-sm font-medium transition ${classes[variant]}`}
    >
      {children}
    </button>
  );
}

export function ToolButtonRow({ children }: { children: ReactNode }) {
  return <div className="mt-4 flex flex-wrap gap-3">{children}</div>;
}

export function ToolResultBox({
  children,
  muted = false,
}: {
  children: ReactNode;
  muted?: boolean;
}) {
  const { isDark } = useTheme();

  return (
    <div
      className={`mt-5 rounded-2xl border p-5 break-words ${
        isDark
          ? "border-white/10 bg-white/[0.04]"
          : "border-[#E5DED0] bg-[#F5F2EA]"
      } ${muted ? (isDark ? "text-white/45" : "text-[#8A8173]") : ""}`}
    >
      {children}
    </div>
  );
}

export function ToolStatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  const { isDark } = useTheme();

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isDark
          ? "border-white/10 bg-white/[0.04]"
          : "border-[#E5DED0] bg-[#F5F2EA]"
      }`}
    >
      <div className={isDark ? "text-sm text-white/45" : "text-sm text-[#8A8173]"}>
        {label}
      </div>

      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
