"use client";

type Theme = "dark" | "light";

export default function ThemeToggle({
  theme,
  setTheme,
}: {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}) {
  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`rounded-full border px-4 py-2 text-sm transition ${
        isDark
          ? "border-white/10 bg-white/[0.05] text-white/60 hover:bg-white/[0.08] hover:text-white"
          : "border-[#E5DED0] bg-white text-[#6B665D] hover:border-[#2563EB]/30 hover:text-[#18181B]"
      }`}
    >
      {isDark ? "☾ Dark" : "☀︎ Light"}
    </button>
  );
}